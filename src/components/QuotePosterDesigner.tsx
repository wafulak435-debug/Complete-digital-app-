import React, { useEffect, useRef, useState, useCallback } from "react";
import { Download, Send, Calendar, Trash2, Share2, Sparkles, CheckCircle2 } from "lucide-react";
import { secureApiFetch } from "../lib/aiClient";
import { ScheduledStudioPost } from "../types";

interface QuotePosterDesignerProps {
  currentUser: { email: string; name: string; role?: string } | null;
}

const TEMPLATES = [
  { id: "navy", label: "Royal Navy & Gold", bg: "#0B254D", accent: "#F5B82E", text: "#FFFFFF" },
  { id: "royal", label: "Azure Fellowship", bg: "#155EEF", accent: "#FDE047", text: "#FFFFFF" },
  { id: "cream", label: "Editorial Ivory", bg: "#FAF8F4", accent: "#0B254D", text: "#0B254D" },
  { id: "midnight", label: "Midnight Sanctuary", bg: "#07142B", accent: "#38BDF8", text: "#F8FAFC" },
] as const;

export default function QuotePosterDesigner({ currentUser }: QuotePosterDesignerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [templateId, setTemplateId] = useState<(typeof TEMPLATES)[number]["id"]>("navy");
  const [quoteText, setQuoteText] = useState(
    "Commit to the Lord whatever you do, and He will establish your plans."
  );
  const [referenceText, setReferenceText] = useState("Proverbs 16:3 · Zion Digital Devotional");
  const [campaignTitle, setCampaignTitle] = useState("Morning Scripture Reflection");
  const [platform, setPlatform] = useState<"Zion Connect" | "WhatsApp" | "Facebook">("Zion Connect");
  const [scheduleTime, setScheduleTime] = useState(() => new Date().toISOString().slice(0, 16));
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledStudioPost[]>([]);
  const [notice, setNotice] = useState("");

  const activeTpl = TEMPLATES.find((t) => t.id === templateId) || TEMPLATES[0];

  const drawPoster = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = activeTpl.bg;
    ctx.fillRect(0, 0, w, h);

    // Subtle border frame
    ctx.strokeStyle = activeTpl.accent;
    ctx.lineWidth = 4;
    ctx.strokeRect(24, 24, w - 48, h - 48);

    // Header badge
    ctx.fillStyle = activeTpl.accent;
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ZION DIGITAL · WORD & WISDOM", w / 2, 72);

    // Wrapped quote text
    ctx.fillStyle = activeTpl.text;
    ctx.font = "bold 28px Georgia, serif";
    const words = quoteText.split(/\s+/);
    const lines: string[] = [];
    let currentLine = "";
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width > w - 120) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    const startY = Math.max(150, h / 2 - (lines.length * 38) / 2);
    lines.forEach((line, idx) => {
      ctx.fillText(line, w / 2, startY + idx * 40);
    });

    // Reference & Footer
    ctx.fillStyle = activeTpl.accent;
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(referenceText, w / 2, h - 92);

    ctx.fillStyle = activeTpl.text;
    ctx.globalAlpha = 0.75;
    ctx.font = "13px monospace";
    ctx.fillText("Read. Lead. Transform. · Bungoma, Kenya", w / 2, h - 52);
    ctx.globalAlpha = 1;
  }, [activeTpl, quoteText, referenceText]);

  useEffect(() => {
    drawPoster();
  }, [drawPoster]);

  const loadScheduled = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await secureApiFetch("/api/studio/scheduled-posts");
      const data = await res.json();
      if (data.success) setScheduledPosts(data.posts || []);
    } catch {
      // ignore offline
    }
  }, [currentUser]);

  useEffect(() => {
    loadScheduled();
  }, [loadScheduled]);

  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${campaignTitle.replace(/[^a-z0-9]+/gi, "_").toLowerCase() || "zion_poster"}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleSaveSchedule = async (status: "draft" | "scheduled") => {
    if (!currentUser) {
      setNotice("Sign in to save or schedule studio posts.");
      return;
    }
    const posterImageUrl = canvasRef.current?.toDataURL("image/png") || "";
    const res = await secureApiFetch("/api/studio/scheduled-posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: campaignTitle,
        content: `${quoteText}\n— ${referenceText}`,
        posterImageUrl,
        targetPlatform: platform,
        scheduledFor: scheduleTime,
        status,
      }),
    });
    const data = await res.json();
    if (data.success) {
      setNotice(status === "scheduled" ? "Post scheduled cleanly!" : "Saved to drafts.");
      loadScheduled();
    } else {
      setNotice(data.error || "Could not save draft.");
    }
  };

  const handlePublishNow = async (id: string) => {
    const res = await secureApiFetch(`/api/studio/scheduled-posts/${encodeURIComponent(id)}/publish`, {
      method: "POST",
    });
    const data = await res.json();
    if (data.success) {
      setNotice("Published to Zion Connect feed!");
      loadScheduled();
    }
  };

  const shareMessage = encodeURIComponent(`${campaignTitle}\n"${quoteText}"\n— ${referenceText}`);

  return (
    <div className="space-y-6 text-left">
      {notice && (
        <div className="rounded-xl bg-[#0B254D] text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")} className="underline cursor-pointer">
            Close
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Controls */}
        <div className="lg:col-span-6 space-y-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#F5B82E]" />
            <h3 className="font-display text-base font-bold text-[#0B254D] dark:text-white">
              Graphic Quote &amp; Scripture Poster Designer
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplateId(t.id)}
                className={`rounded-xl p-2 text-[11px] font-semibold border cursor-pointer transition ${
                  templateId === t.id
                    ? "border-[#155EEF] ring-2 ring-[#155EEF]/30"
                    : "border-slate-200 dark:border-slate-700"
                }`}
                style={{ backgroundColor: t.bg, color: t.text }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <input
            value={campaignTitle}
            onChange={(e) => setCampaignTitle(e.target.value)}
            placeholder="Campaign / Poster Title"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
          />

          <textarea
            rows={3}
            value={quoteText}
            onChange={(e) => setQuoteText(e.target.value)}
            placeholder="Enter scripture verse or inspirational quote..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
          />

          <input
            value={referenceText}
            onChange={(e) => setReferenceText(e.target.value)}
            placeholder="Verse reference or speaker name"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as any)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
            >
              <option>Zion Connect</option>
              <option>WhatsApp</option>
              <option>Facebook</option>
            </select>
            <input
              type="datetime-local"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={handleDownloadPng}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0B254D] text-white px-3.5 py-2 text-xs font-bold cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              Download PNG
            </button>
            <button
              type="button"
              onClick={() => handleSaveSchedule("scheduled")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#155EEF] text-white px-3.5 py-2 text-xs font-bold cursor-pointer"
            >
              <Calendar className="h-3.5 w-3.5" />
              Schedule Post
            </button>
            <button
              type="button"
              onClick={() => handleSaveSchedule("draft")}
              className="rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold cursor-pointer"
            >
              Save Draft
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <a
              href={`https://wa.me/?text=${shareMessage}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 text-white px-3 py-1.5 font-semibold"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share to WhatsApp
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}&quote=${shareMessage}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 text-white px-3 py-1.5 font-semibold"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share to Facebook
            </a>
          </div>
        </div>

        {/* Live Poster Canvas */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 p-4 flex flex-col items-center justify-center">
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="w-full max-w-md rounded-xl shadow-md"
          />
        </div>
      </div>

      {/* Drafts & Scheduled Posts Queue */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
        <h4 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">
          Drafts &amp; Scheduled Social Queue ({scheduledPosts.length})
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {scheduledPosts.map((sp) => (
            <div
              key={sp.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 flex items-start justify-between gap-3 text-xs"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#0B254D] dark:text-white truncate">{sp.title}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                      sp.status === "published"
                        ? "bg-emerald-50 text-emerald-700"
                        : sp.status === "scheduled"
                        ? "bg-blue-50 text-[#155EEF]"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {sp.status}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 line-clamp-2">{sp.content}</p>
                <p className="text-[10px] text-slate-400">
                  {sp.targetPlatform} · {sp.scheduledFor.replace("T", " ")}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {sp.status !== "published" && (
                  <button
                    type="button"
                    onClick={() => handlePublishNow(sp.id)}
                    className="rounded-lg bg-[#155EEF] text-white px-2.5 py-1.5 font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Send className="h-3 w-3" />
                    Publish
                  </button>
                )}
                {sp.status === "published" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                <button
                  type="button"
                  onClick={async () => {
                    await secureApiFetch(`/api/studio/scheduled-posts/${encodeURIComponent(sp.id)}`, {
                      method: "DELETE",
                    });
                    loadScheduled();
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                  title="Delete draft"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {scheduledPosts.length === 0 && (
            <p className="text-xs text-slate-400 col-span-2 py-4 text-center">
              No drafts or scheduled social campaigns yet. Use the Poster Designer above to create one!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
