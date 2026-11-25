import { Router, Response } from "express";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import {
  AuthenticatedRequest,
  enforceAiRateLimit,
  persistSecurityState,
  recordAuditLog,
  requireAuth,
  securityState,
} from "./security";

export const connectRouter = Router();

function getServerGenAI(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function isSafeMediaUrl(url: string): boolean {
  const trimmed = String(url || "").trim();
  if (!trimmed) return true;
  if (/^javascript:/i.test(trimmed) || /^data:text\/html/i.test(trimmed)) return false;
  return (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("/") ||
    /^data:(image|video|audio|application\/pdf)\//i.test(trimmed)
  );
}

function makeDmPairId(emailA: string, emailB: string): string {
  const sorted = [emailA.toLowerCase().trim(), emailB.toLowerCase().trim()].sort();
  const hash = crypto.createHash("sha256").update(sorted.join("::")).digest("hex").slice(0, 16);
  return `dm_${hash}`;
}

function isUserBlockedBetween(emailA: string, emailB: string): boolean {
  const a = emailA.toLowerCase();
  const b = emailB.toLowerCase();
  const blockedByA = securityState.blockedUsers[a] || [];
  const blockedByB = securityState.blockedUsers[b] || [];
  return blockedByA.includes(b) || blockedByB.includes(a);
}

// ============================================================================
// 1. PARTICIPANT-LOCKED PRIVATE 1-TO-1 MESSAGING (/api/dm/*)
// Strict invariant: NEVER allow main_admin, sub_admin, or moderators to access
// private conversations or messages they are not a direct participant of.
// ============================================================================
connectRouter.get("/dm/conversations", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const me = req.identity!.email.toLowerCase();
  const list = Object.values(securityState.privateConversations)
    .filter((c) => c.participants.map((p) => p.toLowerCase()).includes(me))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return res.json({ success: true, conversations: list });
});

connectRouter.post("/dm/conversations", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const me = req.identity!.email.toLowerCase();
  const peerEmail = String(req.body?.peerEmail || "").trim().toLowerCase();
  const peerName = String(req.body?.peerName || "").trim();

  if (!peerEmail || !peerEmail.includes("@")) {
    return res.status(400).json({ success: false, error: "A valid recipient email address is required." });
  }
  if (peerEmail === me) {
    return res.status(400).json({ success: false, error: "Choose another person to start a private conversation." });
  }
  if (isUserBlockedBetween(me, peerEmail)) {
    return res.status(403).json({ success: false, error: "Messaging is blocked between these users." });
  }

  const convId = makeDmPairId(me, peerEmail);
  let conv = securityState.privateConversations[convId];
  if (!conv) {
    conv = {
      id: convId,
      participants: [me, peerEmail].sort(),
      disappearingTimer: "off",
      archivedBy: [],
      mutedBy: [],
      updatedAt: new Date().toISOString(),
    };
    securityState.privateConversations[convId] = conv;
  }

  if (peerName && !securityState.socialProfiles[peerEmail]) {
    securityState.socialProfiles[peerEmail] = {
      email: peerEmail,
      name: peerName,
      onlineStatusVisible: true,
      updatedAt: new Date().toISOString(),
    };
  }
  persistSecurityState();
  return res.status(201).json({ success: true, conversation: conv });
});

connectRouter.patch("/dm/conversations/:id/settings", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const me = req.identity!.email.toLowerCase();
  const conv = securityState.privateConversations[req.params.id];
  if (!conv) return res.status(404).json({ success: false, error: "Conversation not found." });
  if (!conv.participants.map((p) => p.toLowerCase()).includes(me)) {
    return res.status(403).json({ success: false, error: "Only conversation participants may view or change this chat." });
  }

  const timer = req.body?.disappearingTimer;
  if (timer === "off" || timer === "24h" || timer === "7d") {
    conv.disappearingTimer = timer;
  }
  if (typeof req.body?.archived === "boolean") {
    conv.archivedBy = req.body.archived
      ? Array.from(new Set([...conv.archivedBy, me]))
      : conv.archivedBy.filter((e) => e !== me);
  }
  if (typeof req.body?.muted === "boolean") {
    conv.mutedBy = req.body.muted
      ? Array.from(new Set([...conv.mutedBy, me]))
      : conv.mutedBy.filter((e) => e !== me);
  }
  conv.updatedAt = new Date().toISOString();
  persistSecurityState();
  return res.json({ success: true, conversation: conv });
});

connectRouter.get("/dm/conversations/:id/messages", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const me = req.identity!.email.toLowerCase();
  const conv = securityState.privateConversations[req.params.id];
  if (!conv) return res.status(404).json({ success: false, error: "Conversation not found." });
  if (!conv.participants.map((p) => p.toLowerCase()).includes(me)) {
    return res.status(403).json({ success: false, error: "Forbidden: Private conversation restricted to direct participants." });
  }

  const nowMs = Date.now();
  let mutated = false;
  const messages = Object.values(securityState.privateMessages)
    .filter((m) => {
      if (m.conversationId !== conv.id) return false;
      if (m.expiresAt && new Date(m.expiresAt).getTime() <= nowMs) {
        delete securityState.privateMessages[m.id];
        mutated = true;
        return false;
      }
      return !m.deleted;
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((m) => {
      if (!m.readBy.includes(me)) {
        m.readBy.push(me);
        mutated = true;
      }
      return m;
    });

  if (mutated) persistSecurityState();
  return res.json({ success: true, conversation: conv, messages });
});

connectRouter.post("/dm/conversations/:id/messages", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const me = actor.email.toLowerCase();
  const conv = securityState.privateConversations[req.params.id];
  if (!conv) return res.status(404).json({ success: false, error: "Conversation not found." });
  if (!conv.participants.map((p) => p.toLowerCase()).includes(me)) {
    return res.status(403).json({ success: false, error: "Forbidden: Only participants may message in this private chat." });
  }

  const other = conv.participants.find((p) => p.toLowerCase() !== me) || "";
  if (other && isUserBlockedBetween(me, other)) {
    return res.status(403).json({ success: false, error: "Messaging is blocked between participants." });
  }

  const text = String(req.body?.text || "").trim().slice(0, 4000);
  const rawAtts = Array.isArray(req.body?.attachments) ? req.body.attachments.slice(0, 4) : [];
  const attachments = rawAtts
    .map((att: any, idx: number) => ({
      id: `att_${Date.now()}_${idx}`,
      kind: (["image", "video", "audio", "document"].includes(att?.kind) ? att.kind : "document") as
        | "image"
        | "video"
        | "audio"
        | "document",
      name: String(att?.name || "attachment").slice(0, 120),
      mimeType: String(att?.mimeType || "application/octet-stream").slice(0, 80),
      dataUrl: isSafeMediaUrl(String(att?.dataUrl || "")) ? String(att?.dataUrl || "").slice(0, 2_500_000) : "",
      sizeBytes: Number(att?.sizeBytes || 0),
    }))
    .filter((a: any) => Boolean(a.dataUrl));

  if (!text && attachments.length === 0) {
    return res.status(400).json({ success: false, error: "Message text or attachment is required." });
  }

  const now = new Date();
  let expiresAt: string | undefined;
  if (conv.disappearingTimer === "24h") {
    expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  } else if (conv.disappearingTimer === "7d") {
    expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  }

  const msgId = `pm_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  const msg = {
    id: msgId,
    conversationId: conv.id,
    senderEmail: me,
    senderName: actor.name,
    text,
    replyToId: req.body?.replyToId ? String(req.body.replyToId) : undefined,
    attachments: attachments.length > 0 ? attachments : undefined,
    reactions: {},
    readBy: [me],
    expiresAt,
    createdAt: now.toISOString(),
  };

  securityState.privateMessages[msgId] = msg;
  conv.updatedAt = now.toISOString();
  conv.lastMessagePreview = text || `[${attachments[0]?.kind || "Attachment"}]`;
  persistSecurityState();
  return res.status(201).json({ success: true, message: msg });
});

connectRouter.put("/dm/messages/:id", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const me = req.identity!.email.toLowerCase();
  const msg = securityState.privateMessages[req.params.id];
  if (!msg || msg.deleted) return res.status(404).json({ success: false, error: "Message not found." });
  const conv = securityState.privateConversations[msg.conversationId];
  if (!conv || !conv.participants.map((p) => p.toLowerCase()).includes(me) || msg.senderEmail.toLowerCase() !== me) {
    return res.status(403).json({ success: false, error: "Forbidden: Only the message sender may edit this private message." });
  }
  const nextText = String(req.body?.text || "").trim().slice(0, 4000);
  if (!nextText) return res.status(400).json({ success: false, error: "Updated message text is required." });
  msg.text = nextText;
  msg.edited = true;
  persistSecurityState();
  return res.json({ success: true, message: msg });
});

connectRouter.delete("/dm/messages/:id", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const me = req.identity!.email.toLowerCase();
  const msg = securityState.privateMessages[req.params.id];
  if (!msg) return res.status(404).json({ success: false, error: "Message not found." });
  const conv = securityState.privateConversations[msg.conversationId];
  if (!conv || !conv.participants.map((p) => p.toLowerCase()).includes(me) || msg.senderEmail.toLowerCase() !== me) {
    return res.status(403).json({ success: false, error: "Forbidden: Only the message sender may delete this private message." });
  }
  msg.deleted = true;
  delete securityState.privateMessages[msg.id];
  persistSecurityState();
  return res.json({ success: true });
});

connectRouter.post("/dm/messages/:id/react", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const me = req.identity!.email.toLowerCase();
  const msg = securityState.privateMessages[req.params.id];
  if (!msg || msg.deleted) return res.status(404).json({ success: false, error: "Message not found." });
  const conv = securityState.privateConversations[msg.conversationId];
  if (!conv || !conv.participants.map((p) => p.toLowerCase()).includes(me)) {
    return res.status(403).json({ success: false, error: "Forbidden: Not a participant of this conversation." });
  }
  const emoji = String(req.body?.emoji || "🙏").trim().slice(0, 12);
  msg.reactions = msg.reactions || {};
  const list = msg.reactions[emoji] || [];
  if (list.includes(me)) {
    msg.reactions[emoji] = list.filter((e) => e !== me);
  } else {
    msg.reactions[emoji] = [...list, me];
  }
  persistSecurityState();
  return res.json({ success: true, reactions: msg.reactions });
});

connectRouter.post("/dm/call-signal", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const me = req.identity!.email.toLowerCase();
  const conversationId = String(req.body?.conversationId || "").trim();
  const conv = securityState.privateConversations[conversationId];
  if (!conv) return res.status(404).json({ success: false, error: "Conversation not found." });
  if (!conv.participants.map((p) => p.toLowerCase()).includes(me)) {
    return res.status(403).json({ success: false, error: "Forbidden: Call signaling is restricted to participants." });
  }
  const toEmail = conv.participants.find((p) => p.toLowerCase() !== me) || me;
  const callType: "audio" | "video" = req.body?.callType === "video" ? "video" : "audio";
  const rawSig = String(req.body?.signalType || "offer");
  const signalType: "offer" | "answer" | "candidate" | "end" =
    rawSig === "answer" || rawSig === "candidate" || rawSig === "end" ? rawSig : "offer";

  const frame = {
    id: `sig_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`,
    conversationId,
    fromEmail: me,
    toEmail,
    callType,
    signalType,
    payload: req.body?.payload || null,
    createdAt: new Date().toISOString(),
  };
  const existing = securityState.callSignals[conversationId] || [];
  securityState.callSignals[conversationId] = [...existing.slice(-24), frame];
  persistSecurityState();
  return res.status(201).json({ success: true, signal: frame });
});

connectRouter.get("/dm/call-signal/:conversationId", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const me = req.identity!.email.toLowerCase();
  const conv = securityState.privateConversations[req.params.conversationId];
  if (!conv) return res.status(404).json({ success: false, error: "Conversation not found." });
  if (!conv.participants.map((p) => p.toLowerCase()).includes(me)) {
    return res.status(403).json({ success: false, error: "Forbidden: Call signaling is restricted to participants." });
  }
  const signals = (securityState.callSignals[conv.id] || []).filter((s) => s.toEmail === me || s.fromEmail === me);
  return res.json({ success: true, signals });
});

// ============================================================================
// 2. SOCIAL PROFILES, FOLLOW, BLOCK, REPORT & ZION CONNECT AI ASSISTANT
// ============================================================================
connectRouter.get("/connect/profiles", (req: AuthenticatedRequest, res: Response) => {
  const me = req.identity?.email.toLowerCase();
  const profiles = Object.values(securityState.socialProfiles);
  const following = me ? securityState.userFollows[me] || [] : [];
  const blocked = me ? securityState.blockedUsers[me] || [] : [];
  return res.json({ success: true, profiles, following, blocked });
});

connectRouter.put("/connect/profile", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const me = actor.email.toLowerCase();
  const avatar = String(req.body?.avatar || "").slice(0, 1_500_000);
  const coverImage = String(req.body?.coverImage || "").slice(0, 1_500_000);
  if (!isSafeMediaUrl(avatar) || !isSafeMediaUrl(coverImage)) {
    return res.status(400).json({ success: false, error: "Unsupported media URL format." });
  }
  const existing = securityState.socialProfiles[me];
  securityState.socialProfiles[me] = {
    email: me,
    name: String(req.body?.name || existing?.name || actor.name).trim().slice(0, 80),
    headline: String(req.body?.headline ?? existing?.headline ?? "").trim().slice(0, 160),
    bio: String(req.body?.bio ?? existing?.bio ?? "").trim().slice(0, 500),
    location: String(req.body?.location ?? existing?.location ?? "Bungoma, Kenya").trim().slice(0, 100),
    avatar: avatar || existing?.avatar || "",
    coverImage: coverImage || existing?.coverImage || "",
    onlineStatusVisible:
      typeof req.body?.onlineStatusVisible === "boolean"
        ? req.body.onlineStatusVisible
        : existing?.onlineStatusVisible ?? true,
    lastSeenAt: new Date().toISOString(),
    skills: Array.isArray(req.body?.skills)
      ? req.body.skills.slice(0, 12).map((s: any) => String(s).trim().slice(0, 40)).filter(Boolean)
      : existing?.skills || [],
    updatedAt: new Date().toISOString(),
  };
  persistSecurityState();
  return res.json({ success: true, profile: securityState.socialProfiles[me] });
});

connectRouter.post("/connect/follow", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const me = req.identity!.email.toLowerCase();
  const target = String(req.body?.target || "").trim().toLowerCase();
  if (!target) return res.status(400).json({ success: false, error: "Target user is required." });
  const list = securityState.userFollows[me] || [];
  const exists = list.includes(target);
  securityState.userFollows[me] = exists ? list.filter((x) => x !== target) : [...list, target];
  persistSecurityState();
  return res.json({ success: true, following: securityState.userFollows[me], isFollowing: !exists });
});

connectRouter.post("/connect/block", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const me = req.identity!.email.toLowerCase();
  const targetEmail = String(req.body?.targetEmail || "").trim().toLowerCase();
  if (!targetEmail || targetEmail === me) {
    return res.status(400).json({ success: false, error: "Valid target email is required." });
  }
  const list = securityState.blockedUsers[me] || [];
  const exists = list.includes(targetEmail);
  securityState.blockedUsers[me] = exists ? list.filter((x) => x !== targetEmail) : [...list, targetEmail];
  persistSecurityState();
  return res.json({ success: true, blocked: securityState.blockedUsers[me], isBlocked: !exists });
});

connectRouter.post("/connect/report", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const targetType = String(req.body?.targetType || "post").slice(0, 40);
  const targetId = String(req.body?.targetId || "").slice(0, 120);
  const reason = String(req.body?.reason || "Inappropriate content").trim().slice(0, 400);
  if (!targetId) return res.status(400).json({ success: false, error: "Target ID is required." });

  const report = {
    id: `rep_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`,
    targetType,
    targetId,
    reason,
    reportedBy: actor.email.toLowerCase(),
    createdAt: new Date().toISOString(),
    status: "open",
  };
  securityState.moderationReports.unshift(report);
  recordAuditLog({
    actor,
    category: "ADMIN_ACTION",
    action: "MODERATION_REPORT_FILED",
    targetType,
    targetId,
    details: reason,
  });
  persistSecurityState();
  return res.status(201).json({ success: true, report });
});

connectRouter.get("/ai/usage", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const me = actor.email.toLowerCase();
  const dayKey = new Date().toISOString().slice(0, 10);
  const rec = securityState.aiUsage[me];
  const dayLimit = actor.isMainAdmin ? 500 : 100;
  return res.json({
    success: true,
    usage: {
      minuteCount: rec && Date.now() - rec.minuteStart <= 60_000 ? rec.minuteCount : 0,
      minuteLimit: 15,
      dayCount: rec && rec.dayKey === dayKey ? rec.dayCount : 0,
      dayLimit,
      totalCount: rec?.totalCount || 0,
    },
  });
});

connectRouter.post("/connect/ai", requireAuth, enforceAiRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  const prompt = String(req.body?.prompt || "").trim();
  const mode = String(req.body?.mode || "fellowship").trim();
  const history = Array.isArray(req.body?.history) ? req.body.history.slice(-8) : [];

  if (!prompt) {
    return res.status(400).json({ success: false, error: "Prompt is required." });
  }

  const aiClient = getServerGenAI();
  if (!aiClient) {
    return res.status(503).json({
      success: false,
      error: "AI assistant unavailable: GEMINI_API_KEY is not configured on the server.",
    });
  }

  const systemInstruction =
    mode === "caption"
      ? "You are Zion Connect Creative Assistant. Draft uplifting Christian & academic social captions with relevant hashtags. Keep replies concise and warm."
      : mode === "summarize"
      ? "You are Zion Connect Study Summarizer. Summarize discussions, sermons, or notes into clear, bulleted takeaways."
      : "You are Zion Connect AI Assistant for Zion Digital (Bungoma, Kenya). Assist with Bible study Q&A, short prayers, devotionals, study tips, and respectful Christian community fellowship. Keep answers clear, scripture-grounded, and helpful.";

  const conversationTranscript = history
    .map((h: any) => `${h?.role === "assistant" ? "Assistant" : "User"}: ${String(h?.text || "").slice(0, 800)}`)
    .join("\n");

  const fullContents = conversationTranscript
    ? `${conversationTranscript}\nUser: ${prompt.slice(0, 4000)}`
    : prompt.slice(0, 4000);

  try {
    const response = await aiClient.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: fullContents,
      config: {
        systemInstruction,
      },
    });
    const reply = (response.text || "").trim();
    if (!reply) {
      return res.status(502).json({ success: false, error: "Empty response received from Gemini." });
    }
    return res.json({ success: true, reply });
  } catch (err: any) {
    const msg = String(err?.message || "AI request failed.");
    return res.status(502).json({
      success: false,
      error: msg.includes("403") || msg.includes("API_KEY")
        ? "Gemini API authentication failed. Please check GEMINI_API_KEY in Settings > Secrets."
        : "Unable to complete AI request right now.",
    });
  }
});

// ============================================================================
// 3. SHORT VIDEOS & CHRISTIAN REELS + PLAYLISTS (/api/reels/*)
// ============================================================================
connectRouter.get("/reels", (_req, res: Response) => {
  const reels = Object.values(securityState.reels).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return res.json({ success: true, reels });
});

connectRouter.post("/reels", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const title = String(req.body?.title || "").trim().slice(0, 120);
  const description = String(req.body?.description || "").trim().slice(0, 500);
  const videoUrl = String(req.body?.videoUrl || "").trim().slice(0, 3_000_000);
  const thumbnailUrl = String(req.body?.thumbnailUrl || "").trim().slice(0, 1_500_000);
  if (!title) return res.status(400).json({ success: false, error: "Reel title is required." });
  if (!isSafeMediaUrl(videoUrl) || !isSafeMediaUrl(thumbnailUrl)) {
    return res.status(400).json({ success: false, error: "Invalid reel media URL." });
  }
  const hashtags = Array.isArray(req.body?.hashtags)
    ? req.body.hashtags.slice(0, 8).map((h: any) => String(h).trim().slice(0, 30)).filter(Boolean)
    : ["#ZionConnect"];

  const id = `reel_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`;
  const reel = {
    id,
    title,
    authorName: actor.name,
    authorEmail: actor.email.toLowerCase(),
    description,
    hashtags,
    videoUrl,
    thumbnailUrl,
    duration: String(req.body?.duration || "0:45").slice(0, 12),
    views: 1,
    likes: [],
    comments: [],
    createdAt: new Date().toISOString(),
  };
  securityState.reels[id] = reel;
  persistSecurityState();
  return res.status(201).json({ success: true, reel });
});

connectRouter.post("/reels/:id/like", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const me = req.identity!.email.toLowerCase();
  const reel = securityState.reels[req.params.id];
  if (!reel) return res.status(404).json({ success: false, error: "Reel not found." });
  reel.likes = reel.likes.includes(me) ? reel.likes.filter((e) => e !== me) : [...reel.likes, me];
  persistSecurityState();
  return res.json({ success: true, reel });
});

connectRouter.post("/reels/:id/comment", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const reel = securityState.reels[req.params.id];
  if (!reel) return res.status(404).json({ success: false, error: "Reel not found." });
  const text = String(req.body?.text || "").trim().slice(0, 500);
  if (!text) return res.status(400).json({ success: false, error: "Comment text is required." });
  reel.comments.push({
    id: `rc_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`,
    userName: actor.name,
    userEmail: actor.email.toLowerCase(),
    text,
    createdAt: new Date().toISOString(),
  });
  persistSecurityState();
  return res.status(201).json({ success: true, reel });
});

connectRouter.post("/reels/:id/view", (req, res: Response) => {
  const reel = securityState.reels[req.params.id];
  if (!reel) return res.status(404).json({ success: false, error: "Reel not found." });
  reel.views += 1;
  persistSecurityState();
  return res.json({ success: true, views: reel.views });
});

connectRouter.get("/reels/playlists", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const me = req.identity!.email.toLowerCase();
  const playlists = Object.values(securityState.reelPlaylists).filter((p) => p.ownerEmail === me);
  return res.json({ success: true, playlists });
});

connectRouter.post("/reels/playlists", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const me = req.identity!.email.toLowerCase();
  const name = String(req.body?.name || "Saved Christian Reels").trim().slice(0, 80);
  const reelId = req.body?.reelId ? String(req.body.reelId).trim() : "";

  let pl = Object.values(securityState.reelPlaylists).find(
    (p) => p.ownerEmail === me && p.name.toLowerCase() === name.toLowerCase()
  );
  if (!pl) {
    const id = `pl_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`;
    pl = { id, ownerEmail: me, name, reelIds: [], updatedAt: new Date().toISOString() };
    securityState.reelPlaylists[id] = pl;
  }
  if (reelId) {
    pl.reelIds = pl.reelIds.includes(reelId) ? pl.reelIds.filter((r) => r !== reelId) : [...pl.reelIds, reelId];
  }
  pl.updatedAt = new Date().toISOString();
  persistSecurityState();
  return res.json({ success: true, playlist: pl });
});

// ============================================================================
// 4. COMMUNITY GROUPS, MODERATORS & EVENTS (/api/groups/*)
// ============================================================================
connectRouter.get("/groups", (req: AuthenticatedRequest, res: Response) => {
  const me = req.identity?.email.toLowerCase() || "";
  const isStaff = Boolean(req.identity && (req.identity.isMainAdmin || req.identity.role === "sub_admin"));
  const groups = Object.values(securityState.communityGroups).filter(
    (g) =>
      g.privacy === "public" ||
      isStaff ||
      (me && (g.members.includes(me) || g.admins.includes(me) || g.invitedEmails.includes(me)))
  );
  return res.json({ success: true, groups });
});

connectRouter.post("/groups", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const me = req.identity!.email.toLowerCase();
  const name = String(req.body?.name || "").trim().slice(0, 100);
  const category = String(req.body?.category || "Fellowship").trim().slice(0, 50);
  const description = String(req.body?.description || "").trim().slice(0, 500);
  const privacy = req.body?.privacy === "private" ? "private" : "public";
  if (!name) return res.status(400).json({ success: false, error: "Group name is required." });

  const id = `grp_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`;
  const group = {
    id,
    name,
    category,
    description,
    privacy: privacy as "public" | "private",
    coverUrl: "",
    creatorEmail: me,
    admins: [me],
    moderators: [],
    members: [me],
    invitedEmails: [],
    events: [],
    discussions: [],
    createdAt: new Date().toISOString(),
  };
  securityState.communityGroups[id] = group;
  persistSecurityState();
  return res.status(201).json({ success: true, group });
});

connectRouter.post("/groups/:id/join", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const me = req.identity!.email.toLowerCase();
  const group = securityState.communityGroups[req.params.id];
  if (!group) return res.status(404).json({ success: false, error: "Group not found." });
  if (group.privacy === "private" && !group.members.includes(me) && !group.invitedEmails.includes(me) && !group.admins.includes(me)) {
    return res.status(403).json({ success: false, error: "This group is private. Ask a group admin for an invite." });
  }
  const joined = group.members.includes(me);
  if (joined) {
    if (group.creatorEmail !== me) {
      group.members = group.members.filter((m) => m !== me);
    }
  } else {
    group.members.push(me);
    group.invitedEmails = group.invitedEmails.filter((m) => m !== me);
  }
  persistSecurityState();
  return res.json({ success: true, group });
});

connectRouter.post("/groups/:id/invite", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const me = req.identity!.email.toLowerCase();
  const group = securityState.communityGroups[req.params.id];
  if (!group) return res.status(404).json({ success: false, error: "Group not found." });
  if (!group.admins.includes(me) && !group.moderators.includes(me)) {
    return res.status(403).json({ success: false, error: "Only group admins or moderators can invite members." });
  }
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) return res.status(400).json({ success: false, error: "Valid email required." });
  if (!group.invitedEmails.includes(email) && !group.members.includes(email)) {
    group.invitedEmails.push(email);
  }
  persistSecurityState();
  return res.json({ success: true, group });
});

connectRouter.post("/groups/:id/moderators", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const me = req.identity!.email.toLowerCase();
  const group = securityState.communityGroups[req.params.id];
  if (!group) return res.status(404).json({ success: false, error: "Group not found." });
  if (!group.admins.includes(me) && !req.identity!.isMainAdmin) {
    return res.status(403).json({ success: false, error: "Only group admins can assign moderators." });
  }
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!email) return res.status(400).json({ success: false, error: "Moderator email is required." });
  if (!group.members.includes(email)) group.members.push(email);
  group.moderators = group.moderators.includes(email)
    ? group.moderators.filter((m) => m !== email)
    : [...group.moderators, email];
  persistSecurityState();
  return res.json({ success: true, group });
});

connectRouter.post("/groups/:id/events", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const me = req.identity!.email.toLowerCase();
  const group = securityState.communityGroups[req.params.id];
  if (!group) return res.status(404).json({ success: false, error: "Group not found." });
  if (!group.members.includes(me) && !group.admins.includes(me)) {
    return res.status(403).json({ success: false, error: "Join this group before creating an event." });
  }
  const title = String(req.body?.title || "").trim().slice(0, 120);
  const date = String(req.body?.date || "").trim().slice(0, 60);
  const location = String(req.body?.location || "Online Fellowship").trim().slice(0, 120);
  if (!title || !date) return res.status(400).json({ success: false, error: "Event title and date are required." });

  group.events.unshift({
    id: `gevt_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`,
    title,
    date,
    location,
    rsvps: [me],
  });
  persistSecurityState();
  return res.status(201).json({ success: true, group });
});

connectRouter.post("/groups/:id/events/:eventId/rsvp", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const me = req.identity!.email.toLowerCase();
  const group = securityState.communityGroups[req.params.id];
  if (!group) return res.status(404).json({ success: false, error: "Group not found." });
  const ev = group.events.find((e) => e.id === req.params.eventId);
  if (!ev) return res.status(404).json({ success: false, error: "Group event not found." });
  ev.rsvps = ev.rsvps.includes(me) ? ev.rsvps.filter((e) => e !== me) : [...ev.rsvps, me];
  persistSecurityState();
  return res.json({ success: true, group });
});

connectRouter.post("/groups/:id/discussions", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const me = actor.email.toLowerCase();
  const group = securityState.communityGroups[req.params.id];
  if (!group) return res.status(404).json({ success: false, error: "Group not found." });
  if (!group.members.includes(me) && !group.admins.includes(me)) {
    return res.status(403).json({ success: false, error: "Join the group to post in group discussions." });
  }
  const text = String(req.body?.text || "").trim().slice(0, 1500);
  if (!text) return res.status(400).json({ success: false, error: "Discussion message is required." });
  group.discussions.push({
    id: `gdisc_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`,
    userName: actor.name,
    userEmail: me,
    text,
    createdAt: new Date().toISOString(),
  });
  persistSecurityState();
  return res.status(201).json({ success: true, group });
});

// ============================================================================
// 5. ZION PROFESSIONAL HUB (/api/professional/*)
// ============================================================================
connectRouter.get("/professional/overview", (req: AuthenticatedRequest, res: Response) => {
  const me = req.identity?.email.toLowerCase() || "";
  const isAdmin = Boolean(req.identity?.isMainAdmin);
  const profiles = Object.values(securityState.professionalProfiles).map((p) => ({
    ...p,
    cvDataUrl: p.email === me ? p.cvDataUrl : undefined,
  }));
  const jobs = Object.values(securityState.professionalJobs)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((j) => ({
      ...j,
      applicantsCount: j.applicants.length,
      appliedByMe: me ? j.applicants.some((a) => a.email === me) : false,
      applicants: isAdmin || j.postedBy === me ? j.applicants : [],
    }));
  const orgs = Object.values(securityState.professionalOrgs);
  const articles = Object.values(securityState.professionalArticles).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
  return res.json({ success: true, profiles, jobs, orgs, articles });
});

connectRouter.put("/professional/profile", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const me = actor.email.toLowerCase();
  const cvDataUrl = String(req.body?.cvDataUrl || "").slice(0, 2_500_000);
  if (cvDataUrl && !isSafeMediaUrl(cvDataUrl)) {
    return res.status(400).json({ success: false, error: "Unsupported CV attachment format." });
  }
  const existing = securityState.professionalProfiles[me];
  const skillsRaw = Array.isArray(req.body?.skills) ? req.body.skills : [];
  const nextSkills = skillsRaw
    .slice(0, 20)
    .map((s: any) => {
      const name = String(typeof s === "string" ? s : s?.name || "").trim().slice(0, 40);
      if (!name) return null;
      const prev = existing?.skills.find((k) => k.name.toLowerCase() === name.toLowerCase());
      return { name, endorsedBy: prev?.endorsedBy || [] };
    })
    .filter(Boolean) as { name: string; endorsedBy: string[] }[];

  const experience = Array.isArray(req.body?.experience)
    ? req.body.experience.slice(0, 12).map((e: any) => ({
        role: String(e?.role || "").trim().slice(0, 80),
        org: String(e?.org || "").trim().slice(0, 80),
        period: String(e?.period || "").trim().slice(0, 40),
      })).filter((e: any) => e.role && e.org)
    : existing?.experience || [];

  securityState.professionalProfiles[me] = {
    email: me,
    name: String(req.body?.name || existing?.name || actor.name).trim().slice(0, 80),
    headline: String(req.body?.headline || existing?.headline || "Zion Digital Member").trim().slice(0, 160),
    summary: String(req.body?.summary || existing?.summary || "").trim().slice(0, 1200),
    location: String(req.body?.location || existing?.location || "Kenya").trim().slice(0, 100),
    cvName: req.body?.cvName ? String(req.body.cvName).slice(0, 120) : existing?.cvName,
    cvDataUrl: cvDataUrl || existing?.cvDataUrl,
    skills: nextSkills.length > 0 ? nextSkills : existing?.skills || [],
    experience,
    updatedAt: new Date().toISOString(),
  };
  persistSecurityState();
  return res.json({ success: true, profile: securityState.professionalProfiles[me] });
});

connectRouter.post("/professional/endorse", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const me = req.identity!.email.toLowerCase();
  const targetEmail = String(req.body?.targetEmail || "").trim().toLowerCase();
  const skillName = String(req.body?.skillName || "").trim();
  const prof = securityState.professionalProfiles[targetEmail];
  if (!prof) return res.status(404).json({ success: false, error: "Professional profile not found." });
  const sk = prof.skills.find((s) => s.name.toLowerCase() === skillName.toLowerCase());
  if (!sk) return res.status(404).json({ success: false, error: "Skill not listed on profile." });
  if (targetEmail !== me && !sk.endorsedBy.includes(me)) {
    sk.endorsedBy.push(me);
    persistSecurityState();
  }
  return res.json({ success: true, profile: prof });
});

connectRouter.post("/professional/jobs", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const me = req.identity!.email.toLowerCase();
  const title = String(req.body?.title || "").trim().slice(0, 120);
  const orgName = String(req.body?.orgName || "").trim().slice(0, 120);
  const location = String(req.body?.location || "Kenya / Remote").trim().slice(0, 80);
  const jobType = String(req.body?.jobType || "Full-Time").trim().slice(0, 40);
  const salaryRange = String(req.body?.salaryRange || "Competitive").trim().slice(0, 60);
  const description = String(req.body?.description || "").trim().slice(0, 2000);
  if (!title || !orgName || !description) {
    return res.status(400).json({ success: false, error: "Job title, organization, and description are required." });
  }
  const id = `job_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`;
  securityState.professionalJobs[id] = {
    id,
    title,
    orgName,
    location,
    jobType,
    salaryRange,
    description,
    postedBy: me,
    applicants: [],
    createdAt: new Date().toISOString(),
  };
  persistSecurityState();
  return res.status(201).json({ success: true, job: securityState.professionalJobs[id] });
});

connectRouter.post("/professional/jobs/:id/apply", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const me = actor.email.toLowerCase();
  const job = securityState.professionalJobs[req.params.id];
  if (!job) return res.status(404).json({ success: false, error: "Job listing not found." });
  if (job.applicants.some((a) => a.email === me)) {
    return res.status(400).json({ success: false, error: "You have already applied to this position." });
  }
  const note = String(req.body?.note || "").trim().slice(0, 1200);
  const cvName = req.body?.cvName ? String(req.body.cvName).slice(0, 120) : securityState.professionalProfiles[me]?.cvName;
  job.applicants.push({
    email: me,
    name: actor.name,
    note,
    cvName,
    appliedAt: new Date().toISOString(),
  });
  persistSecurityState();
  return res.status(201).json({ success: true, applied: true });
});

connectRouter.post("/professional/orgs", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const me = req.identity!.email.toLowerCase();
  const name = String(req.body?.name || "").trim().slice(0, 120);
  const sector = String(req.body?.sector || "Ministry & Education").trim().slice(0, 80);
  const location = String(req.body?.location || "Kenya").trim().slice(0, 80);
  const description = String(req.body?.description || "").trim().slice(0, 600);
  if (!name) return res.status(400).json({ success: false, error: "Organization name is required." });
  const id = `org_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`;
  securityState.professionalOrgs[id] = {
    id,
    name,
    sector,
    location,
    description,
    website: String(req.body?.website || "").trim().slice(0, 160),
    followers: [me],
    createdBy: me,
    createdAt: new Date().toISOString(),
  };
  persistSecurityState();
  return res.status(201).json({ success: true, org: securityState.professionalOrgs[id] });
});

connectRouter.post("/professional/orgs/:id/follow", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const me = req.identity!.email.toLowerCase();
  const org = securityState.professionalOrgs[req.params.id];
  if (!org) return res.status(404).json({ success: false, error: "Organization not found." });
  org.followers = org.followers.includes(me) ? org.followers.filter((e) => e !== me) : [...org.followers, me];
  persistSecurityState();
  return res.json({ success: true, org });
});

connectRouter.post("/professional/articles", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const title = String(req.body?.title || "").trim().slice(0, 140);
  const summary = String(req.body?.summary || "").trim().slice(0, 300);
  const body = String(req.body?.body || "").trim().slice(0, 8000);
  const category = String(req.body?.category || "Leadership").trim().slice(0, 60);
  if (!title || !body) return res.status(400).json({ success: false, error: "Article title and body are required." });

  const id = `art_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`;
  securityState.professionalArticles[id] = {
    id,
    title,
    summary: summary || body.slice(0, 160),
    body,
    authorName: actor.name,
    authorEmail: actor.email.toLowerCase(),
    category,
    likes: [],
    createdAt: new Date().toISOString(),
  };
  persistSecurityState();
  return res.status(201).json({ success: true, article: securityState.professionalArticles[id] });
});

connectRouter.post("/professional/articles/:id/like", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const me = req.identity!.email.toLowerCase();
  const art = securityState.professionalArticles[req.params.id];
  if (!art) return res.status(404).json({ success: false, error: "Article not found." });
  art.likes = art.likes.includes(me) ? art.likes.filter((e) => e !== me) : [...art.likes, me];
  persistSecurityState();
  return res.json({ success: true, article: art });
});

// ============================================================================
// 6. STUDIO DRAFTS & SCHEDULED SOCIAL POSTS (/api/studio/scheduled-posts)
// ============================================================================
connectRouter.get("/studio/scheduled-posts", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const me = req.identity!.email.toLowerCase();
  const isAdmin = req.identity!.isMainAdmin;
  const posts = Object.values(securityState.scheduledPosts)
    .filter((p) => isAdmin || p.ownerEmail === me)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return res.json({ success: true, posts });
});

connectRouter.post("/studio/scheduled-posts", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const title = String(req.body?.title || "Untitled Campaign").trim().slice(0, 140);
  const content = String(req.body?.content || "").trim().slice(0, 4000);
  const posterImageUrl = String(req.body?.posterImageUrl || "").slice(0, 2_000_000);
  if (!content && !posterImageUrl) {
    return res.status(400).json({ success: false, error: "Content or poster image is required." });
  }
  if (!isSafeMediaUrl(posterImageUrl)) {
    return res.status(400).json({ success: false, error: "Invalid poster image URL." });
  }
  const targetPlatform = (["Zion Connect", "WhatsApp", "Facebook"].includes(req.body?.targetPlatform)
    ? req.body.targetPlatform
    : "Zion Connect") as "Zion Connect" | "WhatsApp" | "Facebook";
  const scheduledFor = String(req.body?.scheduledFor || new Date().toISOString().slice(0, 16)).slice(0, 40);
  const status = (["draft", "scheduled", "published"].includes(req.body?.status)
    ? req.body.status
    : "scheduled") as "draft" | "scheduled" | "published";

  const id = `sp_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`;
  const item = {
    id,
    ownerEmail: actor.email.toLowerCase(),
    ownerName: actor.name,
    title,
    content,
    posterImageUrl: posterImageUrl || undefined,
    targetPlatform,
    scheduledFor,
    status,
    createdAt: new Date().toISOString(),
  };
  securityState.scheduledPosts[id] = item;
  persistSecurityState();
  return res.status(201).json({ success: true, post: item });
});

connectRouter.delete("/studio/scheduled-posts/:id", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const me = req.identity!.email.toLowerCase();
  const item = securityState.scheduledPosts[req.params.id];
  if (!item) return res.status(404).json({ success: false, error: "Scheduled post not found." });
  if (item.ownerEmail !== me && !req.identity!.isMainAdmin) {
    return res.status(403).json({ success: false, error: "Only the post creator may delete this draft." });
  }
  delete securityState.scheduledPosts[item.id];
  persistSecurityState();
  return res.json({ success: true });
});

connectRouter.post("/studio/scheduled-posts/:id/publish", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const me = actor.email.toLowerCase();
  const item = securityState.scheduledPosts[req.params.id];
  if (!item) return res.status(404).json({ success: false, error: "Scheduled post not found." });
  if (item.ownerEmail !== me && !actor.isMainAdmin) {
    return res.status(403).json({ success: false, error: "Only the post creator may publish this post." });
  }
  item.status = "published";
  const socialId = `post_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`;
  securityState.socialPosts[socialId] = {
    id: socialId,
    targetId: "general",
    kind: "post",
    userId: actor.uid,
    userEmail: me,
    userName: actor.name,
    text: `${item.title ? item.title + "\n" : ""}${item.content}`.slice(0, 4000),
    date: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString(),
  };
  persistSecurityState();
  return res.json({ success: true, post: item, socialPost: securityState.socialPosts[socialId] });
});
