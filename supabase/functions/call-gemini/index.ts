// Supabase Edge Function: call-gemini
// Deploy: supabase functions deploy call-gemini
// Set Secret: supabase secrets set GEMINI_API_KEY=your_key_here

import { withSupabase } from "npm:@supabase/server@1";

const AI_MINUTE_LIMIT = 15;
const AI_DAILY_LIMIT_MEMBER = 100;
const AI_DAILY_LIMIT_ADMIN = 500;
const localRateLimiter = new Map<string, { minuteStart: number; count: number }>();

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status });
}

function stripAnswerKeys(questions: any[]): any[] {
  if (!Array.isArray(questions)) return [];
  return questions.map((q: any) => ({
    question: String(q?.question || ""),
    options: Array.isArray(q?.options) ? q.options.map((o: any) => String(o)) : [],
  }));
}

async function callGeminiRest(
  apiKey: string,
  model: string,
  requestBody: Record<string, unknown>
) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const resp = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(`Upstream AI request failed (${resp.status})`);
  }
  return data;
}

function extractText(geminiResponse: any): string {
  const parts = geminiResponse?.candidates?.[0]?.content?.parts || [];
  return parts
    .map((p: any) => (typeof p?.text === "string" ? p.text : ""))
    .join("")
    .trim();
}

function extractGroundingSources(geminiResponse: any) {
  const chunks = geminiResponse?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  return chunks
    .map((chunk: any) => ({
      title: chunk.web?.title || chunk.title || "Grounded Resource",
      uri: chunk.web?.uri || chunk.uri || "#",
    }))
    .filter((s: any) => s.title && s.uri);
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req: Request, ctx) => {
    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    try {
      const userId = ctx.userClaims?.id;
      if (!userId) {
        return jsonResponse({ success: false, error: "Unauthorized: Invalid or expired session." }, 401);
      }

      const geminiApiKey = Deno.env.get("GEMINI_API_KEY") ?? "";
      if (!geminiApiKey) {
        return jsonResponse({ success: false, error: "AI service secret is not configured on the server." }, 503);
      }

      const body = await req.json();
      const action = String(body.action || "assistant");
      const defaultTextModel = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";

      const dbClient = ctx.supabaseAdmin;
      const { data: profileRow } = await dbClient
        .from("profiles")
        .select("role, is_suspended")
        .eq("id", userId)
        .maybeSingle();

      if (profileRow?.is_suspended) {
        return jsonResponse({ success: false, error: "Account is suspended." }, 403);
      }

      const userRole = String(profileRow?.role || "member");
      const isPrivilegedExaminer = ["main_admin", "admin", "sub_admin", "manager", "tutor"].includes(userRole);
      const isAdminUser = ["main_admin", "admin", "sub_admin"].includes(userRole);

      // Per-user quota & rate limit enforcement
      const now = Date.now();
      const curBucket = localRateLimiter.get(userId) || { minuteStart: now, count: 0 };
      if (now - curBucket.minuteStart > 60_000) {
        curBucket.minuteStart = now;
        curBucket.count = 0;
      }
      if (curBucket.count >= AI_MINUTE_LIMIT) {
        return jsonResponse(
          {
            success: false,
            error: "Rate limit exceeded. Please wait one minute before making more AI requests.",
          },
          429
        );
      }
      curBucket.count += 1;
      localRateLimiter.set(userId, curBucket);

      const minuteAgo = new Date(now - 60_000).toISOString();
      const dayAgo = new Date(now - 86_400_000).toISOString();
      const dailyCap = isAdminUser ? AI_DAILY_LIMIT_ADMIN : AI_DAILY_LIMIT_MEMBER;

      const [{ count: minuteCount }, { count: dayCount }] = await Promise.all([
        dbClient.from("ai_usage_logs").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", minuteAgo),
        dbClient.from("ai_usage_logs").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", dayAgo),
      ]);

      if ((minuteCount ?? 0) >= AI_MINUTE_LIMIT || (dayCount ?? 0) >= dailyCap) {
        return jsonResponse(
          {
            success: false,
            error: "AI request quota limit reached. Please try again later.",
          },
          429
        );
      }

      await dbClient.from("ai_usage_logs").insert({ user_id: userId, action });

    // 1. IMAGE GENERATION ACTION
    if (action === "generate-image") {
      const prompt = String(body.prompt || "").trim();
      if (!prompt) return jsonResponse({ success: false, error: "Prompt is required." }, 400);

      const aspectRatio = String(body.aspectRatio || "1:1");
      const imageModel = "gemini-2.5-flash-image";
      const result = await callGeminiRest(geminiApiKey, imageModel, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
          imageConfig: { aspectRatio },
        },
      });

      const parts = result?.candidates?.[0]?.content?.parts || [];
      const imgPart = parts.find((p: any) => p?.inlineData?.data);
      if (!imgPart?.inlineData?.data) {
        return jsonResponse({ success: false, error: "No image returned from AI generator." }, 502);
      }

      const mimeType = imgPart.inlineData.mimeType || "image/png";
      return jsonResponse({
        success: true,
        imageUrl: `data:${mimeType};base64,${imgPart.inlineData.data}`,
      });
    }

    // 2. LANGUAGE TRANSLATION / TEACHER ACTION
    if (action === "language-translate") {
      const text = String(body.text || "").trim();
      const targetLang = String(body.targetLang || body.targetLanguage || "Swahili");
      const mode = String(body.mode || "translate");

      const sysPrompt =
        mode === "lesson"
          ? `You are Mwalimu AI, a distinguished East African & global language professor teaching ${targetLang}.`
          : `You are an accurate ${targetLang} translator. Return only the clean translated text.`;

      const result = await callGeminiRest(geminiApiKey, defaultTextModel, {
        systemInstruction: { parts: [{ text: sysPrompt }] },
        contents: [{ role: "user", parts: [{ text }] }],
      });

      const output = extractText(result);
      return jsonResponse({
        success: true,
        text: output,
        translatedText: output,
      });
    }

    // 3. SCHOOL CLASS GENERATOR (Strips answer keys for students)
    if (action === "generate-class") {
      const topic = String(body.topic || "").trim();
      const schoolType = String(body.schoolType || "leadership");
      if (!topic) return jsonResponse({ success: false, error: "Topic is required." }, 400);

      const prompt = `Generate a structured academic syllabus class for topic "${topic}" (track: "${schoolType}").
Return valid JSON ONLY (no markdown fences) matching:
{
  "topic": "${topic}",
  "slogan": "short inspiring slogan",
  "intro": "clear academic introduction",
  "points": ["5 detailed 150-word modules"],
  "illustrationPrompt": "photorealistic illustration prompt",
  "selfAssessment": [
    {
      "question": "question text",
      "options": ["option A", "option B", "option C", "option D"],
      "correctIndex": 0,
      "explanation": "detailed explanation"
    }
  ]
}`;

      const result = await callGeminiRest(geminiApiKey, defaultTextModel, {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      });

      const rawText = extractText(result).replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(rawText);
      const rawQuestions = Array.isArray(parsed.selfAssessment) ? parsed.selfAssessment : [];
      const examId = `ai_class_${schoolType}_${Date.now()}`;

      if (dbClient && rawQuestions.length > 0) {
        await dbClient.from("exams").upsert({
          id: examId,
          course_track: schoolType,
          title: topic,
          questions: stripAnswerKeys(rawQuestions),
          is_published: true,
          results_released: false,
          created_by: userId,
        });
        await dbClient.from("exam_answer_keys").upsert({
          exam_id: examId,
          course_track: schoolType,
          answer_key: rawQuestions.map((q: any) => ({
            correctIndex: Number(q?.correctIndex || 0),
            explanation: String(q?.explanation || ""),
          })),
          updated_by: userId,
        });
      }

      const safeData = isPrivilegedExaminer
        ? { ...parsed, examId }
        : { ...parsed, examId, selfAssessment: stripAnswerKeys(rawQuestions) };

      return jsonResponse({ success: true, data: safeData });
    }

    // 4. QUIZ / LECTURE QUESTIONS GENERATOR (Strips answer keys for students)
    if (action === "generate-quiz" || action === "compile-lecture-questions") {
      const topic = String(body.topic || body.subtopic || "General Topic");
      const schoolType = String(body.schoolType || "leadership");
      const content = String(body.notes || body.content || "");
      const count = Number(body.count || (action === "compile-lecture-questions" ? 3 : 10));

      const prompt = `Create ${count} rigorous multiple-choice questions for "${topic}" based on:
${content.slice(0, 12000)}

Return valid JSON ONLY:
{
  "questions": [
    {
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "..."
    }
  ]
}`;

      const result = await callGeminiRest(geminiApiKey, defaultTextModel, {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      });

      const rawText = extractText(result).replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(rawText);
      const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : Array.isArray(parsed) ? parsed : [];
      const examId = `ai_quiz_${schoolType}_${Date.now()}`;

      if (dbClient && rawQuestions.length > 0) {
        await dbClient.from("exams").upsert({
          id: examId,
          course_track: schoolType,
          title: topic,
          questions: stripAnswerKeys(rawQuestions),
          is_published: true,
          results_released: false,
          created_by: userId,
        });
        await dbClient.from("exam_answer_keys").upsert({
          exam_id: examId,
          course_track: schoolType,
          answer_key: rawQuestions.map((q: any) => ({
            correctIndex: Number(q?.correctIndex || 0),
            explanation: String(q?.explanation || ""),
          })),
          updated_by: userId,
        });
      }

      return jsonResponse({
        success: true,
        examId,
        questions: isPrivilegedExaminer ? rawQuestions : stripAnswerKeys(rawQuestions),
      });
    }

    // 5. DOCUMENT EXTRACTION / PUBLISHING / CURRICULUM / NOTES / VIDEO EDIT
    if (
      action === "extract" ||
      action === "publish" ||
      action === "publish-document" ||
      action === "generate-notes" ||
      action === "generate-section-notes" ||
      action === "generate-curriculum" ||
      action === "edit-video" ||
      action === "batch-classify"
    ) {
      const userPrompt =
        body.prompt ||
        body.originalContent ||
        (body.subject
          ? `Generate comprehensive academic curriculum notes for "${body.subject}" with 10 topics and 5 subtopics each.`
          : body.topic
          ? `Generate detailed scholarly study notes for "${body.topic}" (${body.sectionTitle || "Full Guide"}).`
          : body.videoName
          ? `Return JSON video editing plan for "${body.videoName}" with keys: title, summary, trimPoints, subtitles, voiceoverScriptEnglish, voiceoverScriptSwahili, sermonOutlineDoc, appliedEffects, highlightClipTitle. Directives: ${body.prompt || ""}`
          : body.books
          ? `Classify these books into categories (Fiction, Non-Fiction, Business, Technology, Self-Help, Education, Health, Science, Religion, Leadership) and write a 2-sentence description each. Return JSON {"books": [...]}. Input: ${JSON.stringify(body.books)}`
          : `Extract and summarize cleanly the attached file "${body.fileName || body.requestedTitle || "Document"}".`);

      const parts: any[] = [{ text: String(userPrompt) }];
      if (typeof body.fileBase64 === "string" && body.fileBase64.startsWith("data:")) {
        const m = body.fileBase64.match(/^data:([^;]+);base64,(.*)$/);
        if (m && !m[1].includes("wordprocessingml")) {
          parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
        }
      }

      const isJsonAction = action === "edit-video" || action === "batch-classify";
      const result = await callGeminiRest(geminiApiKey, defaultTextModel, {
        contents: [{ role: "user", parts }],
        ...(isJsonAction
          ? { generationConfig: { responseMimeType: "application/json" } }
          : {}),
      });

      const text = extractText(result);
      if (action === "edit-video") {
        const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
        return jsonResponse({ success: true, data: parsed });
      }
      if (action === "batch-classify") {
        const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
        return jsonResponse({ success: true, books: parsed.books || [] });
      }
      return jsonResponse({
        success: true,
        text,
        content: text,
        notes: text,
        subject: body.subject,
        title: body.requestedTitle || body.title || "Published Document",
        author: body.authorName || body.author || "Zion Scholar",
      });
    }

    // 6. GENERAL ASSISTANT / ADMIN AI / PROBLEM SOLVER
    const prompt = String(body.prompt || body.message || "Hello!");
    const category = String(body.category || "Assistant");
    const history = Array.isArray(body.history) ? body.history.slice(-16) : [];
    const images = Array.isArray(body.images) ? body.images : [];
    const enableGoogleSearch = Boolean(body.enableGoogleSearch);

    const systemInstruction =
      category === "Problem Solver"
        ? "You are an expert STEM, Coding, and Mathematics Scholar for Zion Digital in Bungoma, Kenya. Provide clear, formal, step-by-step solutions without markdown '#' hash headers."
        : "You are Zion Digital's official AI Companion in Bungoma, Kenya. Write clearly, accurately, and professionally without markdown '#' hash headers.";

    const contents: any[] = [];
    for (const h of history) {
      const role = h.role === "user" ? "user" : "model";
      const txt = String(h.text || "").trim();
      if (!txt) continue;
      if (contents.length > 0 && contents[contents.length - 1].role === role) {
        contents[contents.length - 1].parts[0].text += `\n\n${txt}`;
      } else {
        contents.push({ role, parts: [{ text: txt }] });
      }
    }

    const userParts: any[] = [{ text: prompt }];
    for (const img of images) {
      if (typeof img === "string" && img.startsWith("data:")) {
        const m = img.match(/^data:([^;]+);base64,(.*)$/);
        if (m) {
          userParts.push({ inlineData: { mimeType: m[1], data: m[2] } });
        }
      }
    }

    if (contents.length > 0 && contents[contents.length - 1].role === "user") {
      contents[contents.length - 1].parts.push(...userParts);
    } else {
      contents.push({ role: "user", parts: userParts });
    }

    const geminiPayload: Record<string, unknown> = {
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents,
    };
    if (enableGoogleSearch) {
      geminiPayload.tools = [{ googleSearch: {} }];
    }

    const result = await callGeminiRest(geminiApiKey, defaultTextModel, geminiPayload);
    const replyText = extractText(result) || "No response text returned.";
    const groundingSources = extractGroundingSources(result);

    return jsonResponse({
      success: true,
      text: replyText,
      data: replyText,
      model: defaultTextModel,
      groundingSources,
      userId,
    });
  } catch (err) {
    console.error("call-gemini Edge Function error:", err instanceof Error ? err.message : "unknown");
    return jsonResponse(
      { success: false, error: "AI request could not be completed safely." },
      500
    );
  }
  }),
};
