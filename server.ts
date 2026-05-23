import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type, GenerateVideosOperation } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Enable verbose JSON payloads for direct base64 uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Lazy-initialize Gemini SDK to safeguard against missing keys during cold starts
let genAIClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genAIClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("⚠️ GEMINI_API_KEY is not defined. AI calls will fall back to smart offline templates.");
    }
    genAIClient = new GoogleGenAI({
      apiKey: key || "MOCK_KEY",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAIClient;
}

// REST APIs
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", mode: process.env.NODE_ENV || "development" });
});

// 1. AI ASSISTANT / CHAT (Complex Problem Solver)
app.post("/api/ai/assistant", async (req, res) => {
  const { prompt, voiceInput, image, history, category } = req.body;
  
  try {
    const aiClient = getGenAI();
    let contents: any[] = [];
    
    // Add context based on category
    let systemInstruction = "You are Wafula Digital's premium AI Companion. You reside in Bungoma, Kenya, and you are an expert leader, scholar, publisher, and STEM educator.";
    
    if (category === "Problem Solver") {
      systemInstruction += " You are an expert STEM, Coding, and Mathematics Problem Solver. Solve complex formulas step-by-step with ultra-readable layouts.";
    } else if (category === "Project Plan") {
      systemInstruction += " You are an expert project planner. Generate detailed professional project blueprints, timelines, and milestones.";
    } else if (category === "Book Publisher") {
      systemInstruction += " You are a high-speed book publishing machine that creates formatted books. Output highly structured chapter segments.";
    }

    // Assemble image parts if uploaded
    if (image && image.startsWith("data:")) {
      const semiMatch = image.match(/data:([^;]+);base64,(.*)/);
      if (semiMatch) {
         const mimeType = semiMatch[1];
         const base64Data = semiMatch[2];
         contents.push({
           inlineData: {
             mimeType: mimeType,
             data: base64Data
           }
         });
      }
    }

    // Include recent history for context continuity
    if (history && history.length > 0) {
      const recentHistory = history.slice(-6); // grab last 6 messages
      recentHistory.forEach((h: any) => {
        contents.push({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.text }]
        });
      });
    }

    // Append the primary user prompt text
    contents.push({
      role: "user",
      parts: [{ text: prompt || (voiceInput ? `Interpret and transcribe/solve this query: ${voiceInput}` : "Hello! Introduce yourself.") }]
    });

    if (process.env.GEMINI_API_KEY) {
      const modelToUse = (category === "Problem Solver") ? "gemini-3.1-pro-preview" : "gemini-3.5-flash";
      const response = await aiClient.models.generateContent({
        model: modelToUse,
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      const reply = response.text || "I processed your request, but wasn't able to extract any clean text.";
      res.json({ success: true, text: reply, model: modelToUse });
    } else {
      // Offline fallback simulations (for elegant offline usability)
      let reply = "";
      if (category === "Problem Solver") {
        reply = `### [OFFLINE MODE] Bungoma STEM Offline Solve:\n\n**Query:** "${prompt}"\n\n1. **Formula Hook**: Let $f(x) = \\int_{-\\infty}^{\\infty} e^{-x^2} dx$.\n2. **Breakdown**: $I = \\sqrt{\\pi}$. Let's divide by local parameters.\n3. **Bungoma Constant**: Perfect alignment completed.\n\n*Connecting to local DB to prevent data loss. Everything is stored instantly!*`;
      } else {
        reply = `### [OFFLINE MODE] Wafula Digital AI Companion:\n\n"**${prompt}**"\n\nWelcome back! You are currently using WafulaSeller off-the-grid engine. All your message files, search histories, and linked items are safely backed up in Browser LocalStorage. Once connected, your records remain beautifully in sync across screens. Let me know how I can guide your learning in leadership and business!`;
      }
      res.json({ success: true, text: reply, offline: true });
    }
  } catch (error: any) {
    console.error("AI Assistant error:", error);
    res.status(500).json({ success: false, error: error.message || "An error occurred with Gemini." });
  }
});

// 2. TEXT EXTRACTION AI (Reads photos and formats downloadable PDFs)
app.post("/api/ai/extract", async (req, res) => {
  const { imageBase64, docTitle } = req.body;
  
  try {
    const aiClient = getGenAI();
    if (!imageBase64) {
      return res.status(400).json({ success: false, error: "Image base64 data is required." });
    }

    const title = docTitle || "Extracted Content";
    let textResult = "";

    if (process.env.GEMINI_API_KEY) {
      const semiMatch = imageBase64.match(/data:([^;]+);base64,(.*)/);
      if (semiMatch) {
        const mimeType = semiMatch[1];
        const data = semiMatch[2];
        
        const response = await aiClient.models.generateContent({
          model: "gemini-3.5-flash",
          contents: [
            {
              inlineData: { mimeType, data }
            },
            {
              text: "Extract all visible text from this image. If it contains mathematical equations, handwritten notes, tables, or structural documents, transcribe them perfectly. Present it beautifully using clean Markdown."
            }
          ],
          config: {
            systemInstruction: "You are an expert OCR and doc transcriber based in Bungoma. Transcribe all text accurately without leaving anything out."
          }
        });
        
        textResult = response.text || "No text could be extracted.";
      } else {
        throw new Error("Invalid base64 string format.");
      }
    } else {
      textResult = `### [OFFLINE EXTRACTION] ${title}

We detected offline mode! Below is a simulated extraction representing what our high-capacity OCR performs online:
- **Detected Section 1**: WAFULA DIGITAL BOOKS - LEADERSHIP LESSONS
- **Extracted Paragraph**: "Empowering every African with knowledge that unlocks their God-given potential. Read. Lead. Transform."
- **Notes**: Bungoma, Kenya, 2026. This data has been saved to your local offline Files workspace. Download as PDF is fully active!`;
    }

    res.json({
      success: true,
      title,
      text: textResult,
      fileSize: `${((textResult.length * 2) / 1024).toFixed(1)} KB`
    });
  } catch (error: any) {
    console.error("OCR Extraction error:", error);
    res.status(500).json({ success: false, error: error.message || "Extraction failed." });
  }
});

// 3. AI PUBLISHING MACHINE (Converts files, outlines, or text into a polished eBook)
app.post("/api/ai/publish", async (req, res) => {
  const { originalContent, requestedTitle, targetCategory, authorName } = req.body;
  
  try {
    const aiClient = getGenAI();
    const title = requestedTitle || "Untitled Published Book";
    const author = authorName || "Kelvin Opara Wafula";
    const category = targetCategory || "Leadership";
    
    let compiledBook = "";

    if (process.env.GEMINI_API_KEY) {
      const response = await aiClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Create a fully structured, multi-chapter eBook. Title: "${title}", Category: "${category}", Author: "${author}". Use the following source notes/file content: "${originalContent}". Elaborate, expand, structure nicely (Chapter 1, Chapter 2, Chapter 3 with elegant themes), and generate introductory and concluding sections with a professional design. Make it extensive, inspiring, and fully formatted.`,
        config: {
          systemInstruction: "You are a master digital publisher machine. You write comprehensive, inspirational African digital books that look professional and structured."
        }
      });
      compiledBook = response.text || "Publishing generation failed.";
    } else {
      compiledBook = `# ${title}
*By ${author} | Published through Wafula AI Digital Publishers, Bungoma*
*Category: ${category}*

## Introduction
This book serves as a timeless document synthesized by our smart local publishing engine. It builds on Kenyan wisdom, leadership values, and modern intellectual resources.

## Chapter 1: The Core Foundation
Leadership is not about positions; it is about transformative action. By empowering every reader with premium, accessible knowledge, we elevate local and global spheres of impact.

## Chapter 2: Vision into Reality
"Read. Lead. Transform." is the fundamental slogan. It requires precision of thought, diligent state building, and active study.

## Conclusion
A finalized work crafted to be accessed offline or online anywhere across East Africa. Download the PDF and share the message.`;
    }

    res.json({
      success: true,
      title,
      author,
      category,
      content: compiledBook,
      fileSize: `${((compiledBook.length * 2) / 1024).toFixed(1)} KB`
    });
  } catch (error: any) {
    console.error("AI Publisher error:", error);
    res.status(500).json({ success: false, error: error.message || "Publishing machine failed." });
  }
});

// 4. LANGUAGE LEARNING TUTOR
app.post("/api/ai/language-translate", async (req, res) => {
  const { text, targetLang, mode } = req.body; // mode can be 'translate', 'lesson', or 'practice'
  try {
    const aiClient = getGenAI();
    let prompt = "";
    let systemInstruction = "You are a friendly multilingual foreign language teacher from Wafula Language Academy.";
    
    if (mode === "translate") {
      prompt = `Translate the following English term into ${targetLang}. Give the translation, phonetic pronunciation, and 3 conversational examples with translations: "${text}"`;
    } else if (mode === "lesson") {
      prompt = `Generate a modern 5-minute interactive lesson for beginners to learn ${targetLang} centered on the theme: "${text || 'Everyday greetings & leadership vocabulary'}". Include vocabulary list with English meanings, pronunciation tips, and a mini 3-question quiz with answers.`;
    } else {
      prompt = `Act as a conversational buddy speaking in ${targetLang}. Reply to the user's input: "${text || 'Habari! Hello!'}" in both ${targetLang} and English translation, and suggest an easy reply prompt for them.`;
    }

    if (process.env.GEMINI_API_KEY) {
      const response = await aiClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: { systemInstruction }
      });
      res.json({ success: true, text: response.text });
    } else {
      // Offline fallback templates
      let mockReply = "";
      if (mode === "translate") {
        mockReply = `### ${targetLang} Translation for: "${text}"\n\n- **Translation**: [Offline Match]\n- **Pronunciation**: /wa-fu-la/ \n- **Context**: "Habari ya asubuhi, rafiki!" (Good morning, friend!). Ready to download.`;
      } else if (mode === "lesson") {
        mockReply = `### lesson: ${targetLang} Basics\n\n1. **Lead** in ${targetLang}: *Kiongozi* (Pronounced: kee-on-go-zee).\n2. **Book** in ${targetLang}: *Kitabu* (Pronounced: kee-tah-boo).\n\n**Mini Quiz**:\nWhat does *Kitabu* mean?\n*Answer: Book. Good job!*`;
      } else {
        mockReply = `### ${targetLang} Chat:\n\n"Jambo! Habari yako?" (How are you doing?)\n\n*English Translation*: Jambo! How is everything with you? \n\n*Try replying with*: "Salama kabisa" (I am very peaceful).`;
      }
      res.json({ success: true, text: mockReply, offline: true });
    }
  } catch (error: any) {
    console.error("Language API error:", error);
    res.status(500).json({ success: false, error: error.message || "Language API failed." });
  }
});

// 5. BATCH CLASSIFICATION OF BOOKS
app.post("/api/ai/batch-classify", async (req, res) => {
  const { books } = req.body; // array of { title, author, description, base64Image, generateCoverPrompt }
  
  if (!books || !Array.isArray(books)) {
    return res.status(400).json({ success: false, error: "An array of books is required." });
  }

  try {
    const aiClient = getGenAI();
    const results = [];

    for (let i = 0; i < books.length; i++) {
      const book = books[i];
      let finalCategory = "Non-Fiction";
      let finalIntroduction = book.description || "";
      let finalCoverImage = book.base64Image || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=350";

      // If online, run Gemini analysis to detect category and generate description expansion
      if (process.env.GEMINI_API_KEY) {
        try {
          const schema = {
            type: Type.OBJECT,
            properties: {
              category: {
                type: Type.STRING,
                description: "Must be exactly one of: 'Fiction', 'Non-Fiction', 'Business', 'Technology', 'Self-Help', 'Education', 'Health', 'Science', 'Religion'. Choose the closest fit.",
              },
              introduction: {
                type: Type.STRING,
                description: "An elegant, inspiring 2-sentence summary/introduction of the book.",
              }
            },
            required: ["category", "introduction"]
          };

          const prompt = `Analyze this digital book for classification and synopsis.
Title: "${book.title}"
Author: "${book.author || 'Kelvin Opara Wafula'}"
Initial Notes: "${book.description || ''}"`;

          const response = await aiClient.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
            config: {
              systemInstruction: "You are a master digital publisher. Classify books into standard categories accurately.",
              responseMimeType: "application/json",
              responseSchema: schema,
            }
          });

          if (response.text) {
            const parsed = JSON.parse(response.text.trim());
            if (parsed.category) finalCategory = parsed.category;
            if (parsed.introduction) finalIntroduction = parsed.introduction;
          }
        } catch (e) {
          console.error("Single book classification failed, using defaults:", e);
        }

        // If and only if the admin requests AI image cover generation (no uploaded photo)
        if (book.generateCoverPrompt && !book.base64Image) {
          try {
            const imageResponse = await aiClient.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: {
                parts: [{ text: `A beautiful professional book cover design for a book titled "${book.title}" in the genre "${finalCategory}". Prompt: ${book.generateCoverPrompt}, photorealistic, elegant vector graphics` }]
              },
              config: {
                imageConfig: { aspectRatio: '3:4' }
              }
            });

            if (imageResponse?.candidates?.[0]?.content?.parts) {
              const part = imageResponse.candidates[0].content.parts.find((p: any) => p.inlineData);
              if (part?.inlineData?.data) {
                finalCoverImage = `data:image/png;base64,${part.inlineData.data}`;
              }
            }
          } catch (imgError) {
            console.error("Cover image generation failed:", imgError);
          }
        }
      } else {
        // Offline fallback simulation of category checking based on keywords
        const textToAnalyze = `${book.title} ${book.description}`.toLowerCase();
        if (textToAnalyze.includes("jesus") || textToAnalyze.includes("faith") || textToAnalyze.includes("god") || textToAnalyze.includes("church") || textToAnalyze.includes("bible")) {
          finalCategory = "Religion";
        } else if (textToAnalyze.includes("business") || textToAnalyze.includes("finance") || textToAnalyze.includes("money") || textToAnalyze.includes("capital")) {
          finalCategory = "Business";
        } else if (textToAnalyze.includes("code") || textToAnalyze.includes("programming") || textToAnalyze.includes("ai") || textToAnalyze.includes("software") || textToAnalyze.includes("computer")) {
          finalCategory = "Technology";
        } else if (textToAnalyze.includes("learn") || textToAnalyze.includes("school") || textToAnalyze.includes("study") || textToAnalyze.includes("teacher")) {
          finalCategory = "Education";
        } else if (textToAnalyze.includes("novel") || textToAnalyze.includes("story") || textToAnalyze.includes("love")) {
          finalCategory = "Fiction";
        } else {
          finalCategory = "Non-Fiction";
        }

        if (!finalIntroduction) {
          finalIntroduction = `An inspiring guide written to elevate perspectives about "${book.title}" in the ${finalCategory} spectrum. Perfect for modern Bungoma scholars.`;
        }

        // If offline and cover image generation was requested but there is no photo
        if (book.generateCoverPrompt && !book.base64Image) {
          finalCoverImage = `https://picsum.photos/seed/${encodeURIComponent(book.title)}/350/500`;
        }
      }

      results.push({
        id: "book_ai_" + Date.now() + "_" + i,
        title: book.title,
        author: book.author || "Kelvin Opara Wafula",
        price: parseFloat(book.price) || 350,
        category: finalCategory,
        description: finalIntroduction,
        coverImage: finalCoverImage,
        fileSize: `${(Math.random() * 5 + 2).toFixed(1)}MB`,
        pages: Math.floor(Math.random() * 120) + 100,
        publishedDate: new Date().toISOString().split("T")[0],
        isFeatured: false,
        status: "active",
        rating: 5,
        reviewsCount: 1
      });
    }

    res.json({ success: true, books: results });
  } catch (error: any) {
    console.error("Batch classification failed:", error);
    res.status(500).json({ success: false, error: error.message || "Batch process failed." });
  }
});

// 6. CREATIVE AI IMAGE GENERATION
app.post("/api/ai/generate-image", async (req, res) => {
  const { prompt, aspectRatio, hdMode } = req.body;
  if (!prompt) {
    return res.status(400).json({ success: false, error: "Prompt is required." });
  }

  try {
    const aiClient = getGenAI();
    let imageBase64 = "";

    if (process.env.GEMINI_API_KEY) {
      const model = hdMode ? 'gemini-3.1-flash-image-preview' : 'gemini-2.5-flash-image';
      
      const response = await aiClient.models.generateContent({
        model,
        contents: {
          parts: [{ text: prompt }]
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio || "1:1",
            imageSize: hdMode ? "1K" : undefined
          }
        }
      });

      if (response?.candidates?.[0]?.content?.parts) {
        const part = response.candidates[0].content.parts.find((p: any) => p.inlineData);
        if (part?.inlineData?.data) {
          imageBase64 = `data:image/png;base64,${part.inlineData.data}`;
        }
      }

      if (!imageBase64) {
        throw new Error("No image data returned from Gemini.");
      }
    } else {
      imageBase64 = `https://picsum.photos/seed/${encodeURIComponent(prompt)}/800/800`;
    }

    res.json({ success: true, imageUrl: imageBase64 });
  } catch (error: any) {
    console.error("Creative Image Generator failed:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to generate image." });
  }
});

// 7. CREATIVE AI VIDEO GENERATION (VEO START)
app.post("/api/ai/generate-video", async (req, res) => {
  const { prompt, aspectRatio, resolution } = req.body;
  if (!prompt) {
    return res.status(400).json({ success: false, error: "Prompt is required." });
  }

  try {
    const aiClient = getGenAI();

    if (process.env.GEMINI_API_KEY) {
      const operation = await aiClient.models.generateVideos({
        model: 'veo-3.1-lite-generate-preview',
        prompt: prompt,
        config: {
          numberOfVideos: 1,
          resolution: resolution || '720p',
          aspectRatio: aspectRatio || '16:9'
        }
      });

      res.json({ success: true, operationName: operation.name });
    } else {
      res.json({ success: true, operationName: "mock-operations/veo-video-" + Date.now(), offline: true });
    }
  } catch (error: any) {
    console.error("Creative Video Generator failed:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to start video operation." });
  }
});

// 8. CREATIVE AI VIDEO STATUS (VEO POLL)
app.post("/api/ai/video-status", async (req, res) => {
  const { operationName } = req.body;
  if (!operationName) {
    return res.status(400).json({ success: false, error: "Operation name is required." });
  }

  try {
    if (operationName.startsWith("mock-operations/")) {
      const elapsed = Date.now() - parseInt(operationName.split("-")[1]);
      const done = elapsed > 4000;
      return res.json({ success: true, done, offline: true });
    }

    const aiClient = getGenAI();
    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await aiClient.operations.getVideosOperation({ operation: op });
    
    res.json({ success: true, done: updated.done });
  } catch (error: any) {
    console.error("Video Operation status error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to poll video status." });
  }
});

// 9. CREATIVE AI VIDEO DOWNLOAD & PIPING (VEO FETCH)
app.post("/api/ai/video-download", async (req, res) => {
  const { operationName } = req.body;
  if (!operationName) {
    return res.status(400).json({ success: false, error: "Operation name is required." });
  }

  try {
    if (operationName.startsWith("mock-operations/")) {
      return res.redirect("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4");
    }

    const aiClient = getGenAI();
    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await aiClient.operations.getVideosOperation({ operation: op });
    
    const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
    if (!uri) {
      return res.status(404).json({ success: false, error: "Video URI not found or video not compiled yet." });
    }

    const key = process.env.GEMINI_API_KEY;
    const videoRes = await fetch(uri, {
      headers: { 'x-goog-api-key': key || "" },
    });
    
    res.setHeader('Content-Type', 'video/mp4');
    
    if (videoRes.body) {
      const nodeStream = (videoRes.body as any);
      if (typeof nodeStream.pipe === "function") {
        nodeStream.pipe(res);
      } else {
        const reader = videoRes.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(Buffer.from(value));
        }
        res.end();
      }
    } else {
      res.redirect(uri);
    }
  } catch (error: any) {
    console.error("Video Download error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to download video file." });
  }
});

// Capture all assets through Vite for full SPA execution
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Wafula Full-Stack server booted successfully on http://0.0.0.0:${PORT}`);
  });
}

startServer();
