import React, { useState, useEffect } from "react";
import { Sparkles, Image as ImageIcon, Video as VideoIcon, Download, Loader2, Play, Plus, RefreshCw, Eye, Save, Smile, Layers, Film, FileText, BookOpen, MessageSquare, Trash2, Shield, CornerDownRight } from "lucide-react";
import { User, SavedDocument } from "../types";
import { VeoVideoEngine, PetAdventureEngine, VectorArtMaker } from "./AICreativeWidgets";
import ChurchVideoStudio from "./ChurchVideoStudio";
import { invokeGeminiAction, secureApiFetch } from "../lib/aiClient";

interface AIMediaProps {
  currentUser: User | null;
  onAddNewDocument?: (doc: SavedDocument) => void;
  books?: any[];
  savedDocuments?: any[];
}

export default function AIMedia({ currentUser, onAddNewDocument, books = [], savedDocuments = [] }: AIMediaProps) {
  const [activeTab, setActiveTab] = useState<"image" | "video" | "veo-video" | "pet-adventure" | "vector-art" | "church-video">("church-video");

  // Media Comments States
  const [mediaComments, setMediaComments] = useState<any[]>([]);
  const [mediaCommentText, setMediaCommentText] = useState("");
  const [mediaReplyTarget, setMediaReplyTarget] = useState<string | null>(null);
  const [mediaReplyText, setMediaReplyText] = useState("");

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("WAFULA_MEDIA_COMMENTS");
    if (saved) {
      try {
        setMediaComments(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse media comments:", e);
      }
    } else {
      const presets = [
        {
          id: "m_com_1",
          targetId: "media_general",
          userId: "director@ziondigital.app",
          userName: "Kelvin Opara Wafula",
          text: "Welcome to the Zion Creative Media Studio discussion board. Share production notes or worship video ideas here.",
          date: new Date().toISOString().split("T")[0]
        }
      ];
      setMediaComments(presets);
      localStorage.setItem("WAFULA_MEDIA_COMMENTS", JSON.stringify(presets));
    }
  }, []);

  const handlePostMediaComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      alert("Please sign in or authenticate to post comments!");
      return;
    }
    if (!mediaCommentText.trim()) return;

    const newComment = {
      id: "m_com_" + Date.now(),
      targetId: "media_general",
      userId: currentUser.email,
      userName: currentUser.name || currentUser.email.split("@")[0],
      text: mediaCommentText.trim(),
      date: new Date().toISOString().split("T")[0]
    };

    const next = [newComment, ...mediaComments];
    setMediaComments(next);
    localStorage.setItem("WAFULA_MEDIA_COMMENTS", JSON.stringify(next));
    setMediaCommentText("");
  };

  const handlePostMediaReply = (parentId: string) => {
    if (!currentUser) {
      alert("Please sign in or authenticate to reply to comments!");
      return;
    }
    if (!mediaReplyText.trim()) return;

    const newReply = {
      id: "m_com_rep_" + Date.now(),
      targetId: "media_general",
      userId: currentUser.email,
      userName: currentUser.name || currentUser.email.split("@")[0],
      text: mediaReplyText.trim(),
      parentId,
      date: new Date().toISOString().split("T")[0]
    };

    const next = [...mediaComments, newReply];
    setMediaComments(next);
    localStorage.setItem("WAFULA_MEDIA_COMMENTS", JSON.stringify(next));
    setMediaReplyText("");
    setMediaReplyTarget(null);
  };

  const handleDeleteMediaComment = (commentId: string) => {
    const next = mediaComments.filter(c => c.id !== commentId && c.parentId !== commentId);
    setMediaComments(next);
    localStorage.setItem("WAFULA_MEDIA_COMMENTS", JSON.stringify(next));
  };

  const handleModerateMediaComment = (commentId: string) => {
    const next = mediaComments.map(c => {
      if (c.id === commentId) {
        const currentlyModerated = !c.isModerated;
        return {
          ...c,
          isModerated: currentlyModerated,
          originalText: currentlyModerated ? (c.originalText || c.text) : undefined,
          text: currentlyModerated ? "[This comment has been hidden by an administrator due to moderation guidelines.]" : (c.originalText || c.text),
        };
      }
      return c;
    });
    setMediaComments(next);
    localStorage.setItem("WAFULA_MEDIA_COMMENTS", JSON.stringify(next));
  };

  // Image states
  const [imagePrompt, setImagePrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [hdMode, setHdMode] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generatedImagesHistory, setGeneratedImagesHistory] = useState<
    { prompt: string; url: string; date: string }[]
  >([]);

  // Video states
  const [videoPrompt, setVideoPrompt] = useState("");
  const [videoAspect, setVideoAspect] = useState("16:9");
  const [videoRes, setVideoRes] = useState("720p");
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoStatus, setVideoStatus] = useState<string>("");
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [operationName, setOperationName] = useState<string | null>(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const [generatedVideosHistory, setGeneratedVideosHistory] = useState<
    { prompt: string; url: string; date: string }[]
  >([]);

  // Source Material state variables
  const [selectedMaterialType, setSelectedMaterialType] = useState<"none" | "book" | "document">("none");
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>("");
  const [selectedMaterialTitle, setSelectedMaterialTitle] = useState<string>("");

  const visualProgressMessages = [
    "Spinning quantum seeds...",
    "Injecting Bungoma design filters...",
    "Assembling keyframes with Veo 3.5 AI...",
    "Running neural frame interpolation...",
    "Compressing high-definition video assets...",
    "Finalizing cinematic sound sync...",
    "Ready to stream!"
  ];

  const handleGenerateImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePrompt.trim()) return;

    setIsGeneratingImage(true);
    setGeneratedImageUrl(null);

    try {
      const resData = await invokeGeminiAction(
        "generate-image",
        "/api/ai/generate-image",
        {
          prompt: imagePrompt,
          aspectRatio,
          hdMode
        }
      );
      if (resData.success && resData.imageUrl) {
        setGeneratedImageUrl(resData.imageUrl);
        setGeneratedImagesHistory((prev) => [
          {
            prompt: imagePrompt,
            url: resData.imageUrl,
            date: new Date().toLocaleTimeString()
          },
          ...prev
        ]);
        alert("Image successfully generated with Advanced AI 3.5!");
      } else {
        alert("Generation Error: " + (resData.error || "Failed to generate image."));
      }
    } catch (error: any) {
      console.error(error);
      alert("Error: Server became unresponsive during rendering.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleGenerateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoPrompt.trim()) return;

    setIsGeneratingVideo(true);
    setGeneratedVideoUrl(null);
    setVideoStatus("Initiating video render process on Cloud Run...");
    setVideoProgress(10);

    try {
      const response = await secureApiFetch("/api/ai/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: videoPrompt,
          aspectRatio: videoAspect,
          resolution: videoRes,
          materialType: selectedMaterialType,
          materialId: selectedMaterialId,
          materialTitle: selectedMaterialTitle
        })
      });

      const resData = await response.json();
      if (resData.success && resData.operationName) {
        setOperationName(resData.operationName);
        setVideoProgress(30);
        setVideoStatus("Operation logged successfully. Composing frame structures...");
      } else {
        alert("Failed to queue rendering operation: " + (resData.error || "Server issue"));
        setIsGeneratingVideo(false);
      }
    } catch (e: any) {
      console.error(e);
      alert("Internal Connection Error starting operation.");
      setIsGeneratingVideo(false);
    }
  };

  // Video Polling Loop
  useEffect(() => {
    if (!operationName) return;

    let timer: NodeJS.Timeout;
    let index = 0;

    const pollStatus = async () => {
      try {
        const response = await secureApiFetch("/api/ai/video-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operationName })
        });

        const data = await response.json();

        // Stagger visual messages to keep user fully reassured
        if (index < visualProgressMessages.length - 1) {
          index++;
          setVideoStatus(visualProgressMessages[index]);
          setVideoProgress((p) => Math.min(p + 12, 90));
        }

        if (data.success && data.done) {
          setVideoProgress(98);
          setVideoStatus("Streaming completed output file back with x-goog-api-key headers...");
          
          // Download/resolve streaming URL
          setGeneratedVideoUrl(`/api/ai/video-download?operationName=${encodeURIComponent(operationName)}`);
          setGeneratedVideosHistory((prev) => [
            {
              prompt: videoPrompt,
              url: `/api/ai/video-download?operationName=${encodeURIComponent(operationName)}`,
              date: new Date().toLocaleTimeString()
            },
            ...prev
          ]);
          setVideoProgress(100);
          setOperationName(null);
          setIsGeneratingVideo(false);
          alert("Cinematic video compiled successfully!");
        } else {
          // Poll again after 3 seconds
          timer = setTimeout(pollStatus, 3000);
        }
      } catch (err) {
        console.error("Polling error: ", err);
        timer = setTimeout(pollStatus, 3000);
      }
    };

    timer = setTimeout(pollStatus, 3000);
    return () => clearTimeout(timer);
  }, [operationName]);

  const saveToDocuments = (url: string, type: "photo" | "video") => {
    if (!onAddNewDocument) return;
    const promptRef = type === "photo" ? imagePrompt : videoPrompt;
    onAddNewDocument({
      id: "ai_doc_" + Date.now(),
      userId: currentUser?.email || "anonymous",
      title: `${type === "photo" ? "Image" : "Video"}: ${promptRef.slice(0, 30)}...`,
      content: `URL Link: ${url}\n\nGenerated with Gemini Advanced AI 3.5 Engine.\nPrompt Query: "${promptRef}"`,
      type: type,
      folder: "AI Creative Studio",
      date: new Date().toISOString().split("T")[0],
      fileSize: "5.2 MB",
      downloadUrl: url
    });
    alert("Media record stored in your personal Doc Studio vault under 'AI Creative Studio' folder!");
  };

  return (
    <div id="ai_creative_media_hub" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-8 select-none text-left">
      {/* Decorative Editorial Studio Header */}
      <div className="rounded-2xl bg-[#2C241E] dark:bg-[#1E1A17] text-[#FAF8F4] p-6 sm:p-8 text-left shadow-sm border border-[#E7E1D8]/20 relative overflow-hidden">
        <div className="relative z-10 space-y-2.5">
          <span className="inline-block bg-[#A8421B]/30 text-[#F5D6C6] border border-[#A8421B]/50 font-mono text-[10px] font-bold uppercase tracking-[0.18em] px-2.5 py-1 rounded-full">
            ZION CREATIVE MEDIA STUDIO
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight font-serif">
            Sermon, Cover & Motion Studio
          </h2>
          <p className="text-xs text-[#E7E1D8]/85 max-w-2xl leading-relaxed">
            Design custom book covers, ministry graphics, illustrations, and worship or teaching videos directly within your studio workspace.
          </p>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-stone-200 space-x-6 overflow-x-auto pr-2 scrollbar-thin">
        <button
          onClick={() => setActiveTab("church-video")}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 transition border-b-2 shrink-0 ${
            activeTab === "church-video"
              ? "text-rose-600 border-rose-600"
              : "text-stone-450 border-transparent hover:text-stone-800"
          }`}
        >
          <Film className="h-4.5 w-4.5 text-rose-500 animate-pulse" />
          <span className="font-extrabold text-stone-900">Gospel & Church Video Studio</span>
        </button>
        <button
          onClick={() => setActiveTab("image")}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 transition border-b-2 shrink-0 ${
            activeTab === "image"
              ? "text-indigo-600 border-indigo-600"
              : "text-stone-450 border-transparent hover:text-stone-800"
          }`}
        >
          <ImageIcon className="h-4.5 w-4.5" />
          <span>Unlimited Image Architect</span>
        </button>
        <button
          onClick={() => setActiveTab("video")}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 transition border-b-2 shrink-0 ${
            activeTab === "video"
              ? "text-indigo-600 border-indigo-600"
              : "text-stone-450 border-transparent hover:text-stone-800"
          }`}
        >
          <VideoIcon className="h-4.5 w-4.5" />
          <span>Unlimited Video (Veo 3.5)</span>
        </button>
        <button
          onClick={() => setActiveTab("veo-video")}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 transition border-b-2 shrink-0 ${
            activeTab === "veo-video"
              ? "text-indigo-600 border-indigo-600"
              : "text-stone-450 border-transparent hover:text-stone-800"
          }`}
        >
          <Film className="h-4.5 w-4.5" />
          <span>Veo 3.1 Text-to-Video Engine</span>
        </button>
        <button
          onClick={() => setActiveTab("pet-adventure")}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 transition border-b-2 shrink-0 ${
            activeTab === "pet-adventure"
              ? "text-indigo-600 border-indigo-600"
              : "text-stone-450 border-transparent hover:text-stone-800"
          }`}
        >
          <Smile className="h-4.5 w-4.5" />
          <span>Pet Global Adventure</span>
        </button>
        <button
          onClick={() => setActiveTab("vector-art")}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 transition border-b-2 shrink-0 ${
            activeTab === "vector-art"
              ? "text-indigo-600 border-indigo-600"
              : "text-stone-450 border-transparent hover:text-stone-800"
          }`}
        >
          <Layers className="h-4.5 w-4.5" />
          <span>SVG Vector Art Maker</span>
        </button>
      </div>

      {activeTab === "church-video" && <div className="mt-6 animate-in fade-in duration-200"><ChurchVideoStudio /></div>}
      {activeTab === "veo-video" && <div className="mt-6"><VeoVideoEngine /></div>}
      {activeTab === "pet-adventure" && <div className="mt-6"><PetAdventureEngine /></div>}
      {activeTab === "vector-art" && <div className="mt-6"><VectorArtMaker /></div>}

      {(activeTab === "image" || activeTab === "video") && (
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Control Panel Form */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-stone-200 p-6 shadow-sm h-fit space-y-5">
          {activeTab === "image" ? (
            <form onSubmit={handleGenerateImage} className="space-y-4">
              <h3 className="text-sm font-bold text-stone-900 border-b pb-2 flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-indigo-505 text-indigo-600 animate-spin" />
                <span>Configure Image Blueprint</span>
              </h3>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-stone-550">
                  Descriptive Prompt
                </label>
                <textarea
                  required
                  rows={4}
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="e.g. A serene African mountain sunrise at golden hour with soft misty trees, realistic photorealistic cover graphic, warm tones..."
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 p-3 outline-none text-xs text-stone-900 focus:bg-white focus:border-indigo-550"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-stone-550">
                  Aspect Crop Factor
                </label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 p-2.5 outline-none font-semibold text-xs text-stone-800"
                >
                  <option value="1:1">1:1 Square (Profile Art)</option>
                  <option value="3:4">3:4 Portrait (Digital Book Cover)</option>
                  <option value="4:3">4:3 Landscape (Card Thumbnail)</option>
                  <option value="16:9">16:9 Cinematic (Web Slideshow Banner)</option>
                  <option value="9:16">9:16 Portrait (Mobile Stories)</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 py-1">
                <input
                  type="checkbox"
                  id="hd_toggle"
                  checked={hdMode}
                  onChange={(e) => setHdMode(e.target.checked)}
                  className="rounded text-indigo-605 h-4 w-4"
                />
                <label htmlFor="hd_toggle" className="text-xs font-bold text-stone-700 cursor-pointer">
                  Activate 1K High-Definition Render
                </label>
              </div>

              <button
                type="submit"
                disabled={isGeneratingImage}
                className="w-full rounded-xl bg-indigo-650 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 text-xs flex items-center justify-center space-x-2 shadow-md transition-all active:scale-98 disabled:opacity-50"
              >
                {isGeneratingImage ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Rendering Frame...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Generate Artwork</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleGenerateVideo} className="space-y-4">
              <h3 className="text-sm font-bold text-stone-900 border-b pb-2 flex items-center space-x-2">
                <VideoIcon className="h-4 w-4 text-indigo-505 text-indigo-600" />
                <span>Configure Veo 3.5 Timeline</span>
              </h3>

              {/* Source Material (Book or Document Selection) */}
              <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-stone-650">
                    Source Material (Book / Document)
                  </label>
                  {selectedMaterialType !== "none" && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMaterialType("none");
                        setSelectedMaterialId("");
                        setSelectedMaterialTitle("");
                        setVideoPrompt("");
                      }}
                      className="text-[9px] text-red-650 hover:underline font-mono uppercase font-black cursor-pointer bg-transparent border-0"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMaterialType(selectedMaterialType === "book" ? "none" : "book");
                      setSelectedMaterialId("");
                      setSelectedMaterialTitle("");
                    }}
                    className={`flex items-center gap-1.5 p-2 rounded-xl border text-[10.5px] font-extrabold justify-center transition cursor-pointer select-none ${
                      selectedMaterialType === "book"
                        ? "bg-violet-50 text-violet-800 border-violet-300"
                        : "bg-white text-stone-600 border-stone-150 hover:bg-stone-100"
                    }`}
                  >
                    <BookOpen className="h-3.5 w-3.5 text-violet-600" />
                    <span>Choose Book</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMaterialType(selectedMaterialType === "document" ? "none" : "document");
                      setSelectedMaterialId("");
                      setSelectedMaterialTitle("");
                    }}
                    className={`flex items-center gap-1.5 p-2 rounded-xl border text-[10.5px] font-extrabold justify-center transition cursor-pointer select-none ${
                      selectedMaterialType === "document"
                        ? "bg-amber-50 text-amber-800 border-amber-300"
                        : "bg-white text-stone-600 border-stone-150 hover:bg-stone-100"
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5 text-amber-600" />
                    <span>Choose Doc</span>
                  </button>
                </div>

                {/* Sublist based on selection type */}
                {selectedMaterialType === "book" && books.length > 0 && (
                  <div className="space-y-1 mt-1 animate-fade-in">
                    <label className="block text-[9px] font-mono text-stone-450 font-bold uppercase">
                      Select Target Published Book
                    </label>
                    <select
                      value={selectedMaterialId}
                      onChange={(e) => {
                        const bId = e.target.value;
                        setSelectedMaterialId(bId);
                        const found = books.find(b => b.id === bId);
                        if (found) {
                          const title = found.title;
                          setSelectedMaterialTitle(title);
                          setVideoPrompt(`Educational clean clip summary of the scholarly book titled "${title}". Highlight the core academic principles, chapter summaries, and informational milestones with clean motion graphics, textbook layouts, and a professional narrative vibe.`);
                        }
                      }}
                      className="w-full rounded-lg border border-stone-250 bg-white p-2 outline-none font-semibold text-xs text-stone-850"
                    >
                      <option value="">-- Choose a local/published book --</option>
                      {books.map((b) => (
                        <option key={b.id} value={b.id}>
                          📖 {b.title} (by {b.author || "Unknown"})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedMaterialType === "book" && books.length === 0 && (
                  <div className="mt-1 text-[9.5px] text-stone-500 bg-white border border-stone-100 p-2 rounded-lg text-center font-medium">
                    No books loaded inside local catalogue. Go to the Studio section or Store to acquire books!
                  </div>
                )}

                {selectedMaterialType === "document" && savedDocuments.length > 0 && (
                  <div className="space-y-1 mt-1 animate-fade-in">
                    <label className="block text-[9px] font-mono text-stone-450 font-bold uppercase">
                      Select Target Document Material
                    </label>
                    <select
                      value={selectedMaterialId}
                      onChange={(e) => {
                        const dId = e.target.value;
                        setSelectedMaterialId(dId);
                        const found = savedDocuments.find(d => d.id === dId || String(d.id) === String(dId));
                        if (found) {
                          const title = found.title;
                          setSelectedMaterialTitle(title);
                          setVideoPrompt(`Educational infographic cinematic summary based on the document "${title}". Bring key facts, reference annotations, and educational charts to life on a neat, high-contrast scholastic outline.`);
                        }
                      }}
                      className="w-full rounded-lg border border-stone-250 bg-white p-2 outline-none font-semibold text-xs text-stone-850"
                    >
                      <option value="">-- Choose a saved document --</option>
                      {savedDocuments.map((d) => (
                        <option key={d.id} value={d.id}>
                          📄 {d.title} ({d.category || "General"})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedMaterialType === "document" && savedDocuments.length === 0 && (
                  <div className="mt-1 text-[9.5px] text-stone-500 bg-white border border-stone-100 p-2 rounded-lg text-center font-medium">
                    No saved documents in your vault cache. Upload files or prepare research notes in the workspace!
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-stone-550">
                  Animation Prompt Guide
                </label>
                <textarea
                  required
                  rows={4}
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                  placeholder="e.g. A neon hologram of a scholar reading an ancient tablet at high speeds, 4k digital graphic, vibrant lights, cinematic sweep..."
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 p-3 outline-none text-xs text-stone-900 focus:bg-white focus:border-indigo-550"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-stone-550">
                  Video Aspect Ratio
                </label>
                <select
                  value={videoAspect}
                  onChange={(e) => setVideoAspect(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 p-2.5 outline-none font-semibold text-xs text-stone-800"
                >
                  <option value="16:9">16:9 Landscape Wide Screen</option>
                  <option value="9:16">9:16 Vertical Reel Screen</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-stone-550">
                  Target Resolution Spec
                </label>
                <select
                  value={videoRes}
                  onChange={(e) => setVideoRes(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 p-2.5 outline-none font-semibold text-xs text-stone-800"
                >
                  <option value="720p">720p Standard Internet Grade</option>
                  <option value="1080p">1080p Full High Definition Video</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isGeneratingVideo}
                className="w-full rounded-xl bg-violet-650 bg-violet-600 hover:bg-violet-700 text-white font-extrabold py-3 text-xs flex items-center justify-center space-x-2 shadow-md transition-all active:scale-98 disabled:opacity-50"
              >
                {isGeneratingVideo ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Rendering Video...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    <span>Render Cinematic Clip</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Tips block */}
          <div className="rounded-xl bg-indigo-50/60 p-4 border border-indigo-100 text-[11px] text-indigo-905 text-left leading-normal space-y-1.5">
            <strong className="block text-[#1e1b4b]">💡 Pro Tip: Custom Creative Designs</strong>
            <p className="text-stone-650">
              You can formulate specific prompts to design custom templates. For book covers, append <code className="bg-white px-1.5 py-0.5 rounded border">"editorial digital book cover mockup, high contrast graphic layout"</code> to output high usability files!
            </p>
          </div>
        </div>

        {/* Right Preview/Output Frame */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-200 p-6 shadow-sm flex flex-col min-h-[400px]">
          <h3 className="text-sm font-bold text-stone-900 border-b pb-2 flex items-center justify-between">
            <span>Visual Workspace Preview</span>
            <span className="font-mono text-[10px] text-stone-450 uppercase">Active Sandbox</span>
          </h3>

          <div className="flex-grow flex flex-col justify-center items-center py-6">
            {activeTab === "image" ? (
              generatedImageUrl ? (
                <div className="space-y-4 w-full text-center">
                  <div className="mx-auto rounded-xl overflow-hidden border border-stone-150 inline-block shadow-lg max-w-full max-h-[350px]">
                    <img
                      src={generatedImageUrl}
                      alt="Neural Masterpiece"
                      referrerPolicy="no-referrer"
                      className="max-h-[355px] object-contain"
                    />
                  </div>
                  <div className="flex justify-center gap-3">
                    <a
                      href={generatedImageUrl}
                      download={`ai_cover_${Date.now()}.png`}
                      className="rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold px-4 py-2 text-xs flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download File</span>
                    </a>
                    {onAddNewDocument && (
                      <button
                        onClick={() => saveToDocuments(generatedImageUrl, "photo")}
                        className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 text-xs flex items-center space-x-1.5"
                      >
                        <Save className="h-3.5 w-3.5" />
                        <span>Save to Doc Studio</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : isGeneratingImage ? (
                <div className="text-center space-y-3">
                  <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mx-auto" />
                  <p className="font-bold text-xs text-stone-600">Advanced AI 3.5 is assembling textures...</p>
                  <p className="text-[10px] text-stone-400 max-w-[200px] leading-tight">
                    Generating stunning canvas results using smart deep graphics layers. Please wait.
                  </p>
                </div>
              ) : (
                <div className="text-center space-y-2 text-stone-400 py-12">
                  <ImageIcon className="h-12 w-12 mx-auto stroke-[1.2]" />
                  <h4 className="font-bold text-[11px] uppercase tracking-wider text-stone-605">Ready to Generate</h4>
                  <p className="text-[10px] text-stone-400 max-w-[200px]">
                    Enter your fantasy or cover script guidelines on the left and dispatch the neural render request.
                  </p>
                </div>
              )
            ) : generatedVideoUrl ? (
              <div className="space-y-4 w-full text-center">
                <div className="mx-auto rounded-xl overflow-hidden border inline-block shadow-lg max-w-full">
                  <video
                    src={generatedVideoUrl}
                    controls
                    className="max-h-[300px] object-contain bg-slate-950"
                  />
                </div>
                <div className="flex justify-center gap-3">
                  <a
                    href={generatedVideoUrl}
                    download={`ai_clip_${Date.now()}.mp4`}
                    className="rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold px-4 py-2 text-xs flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download MP4 File</span>
                  </a>
                  {onAddNewDocument && (
                    <button
                      onClick={() => saveToDocuments(generatedVideoUrl, "video")}
                      className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 text-xs flex items-center space-x-1.5"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>Save to Doc Studio</span>
                    </button>
                  )}
                </div>
              </div>
            ) : isGeneratingVideo ? (
              <div className="text-center space-y-4 w-full max-w-sm">
                <Loader2 className="h-10 w-10 text-violet-600 animate-spin mx-auto" />
                <div className="space-y-1">
                  <p className="font-bold text-xs text-stone-700">{videoStatus}</p>
                  <div className="w-full bg-stone-100 rounded-full h-2">
                    <div
                      className="bg-violet-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${videoProgress}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-stone-400 block pt-0.5">Render completion: {videoProgress}%</span>
                </div>
                <p className="text-[10px] text-stone-400 leading-tight">
                  Video generation utilizes extreme multi-tier computing pipelines. Do not close this panel.
                </p>
              </div>
            ) : (
              <div className="text-center space-y-2 text-stone-400 py-12">
                <VideoIcon className="h-12 w-12 mx-auto stroke-[1.2]" />
                <h4 className="font-bold text-[11px] uppercase tracking-wider text-stone-605">Animation Panel Idle</h4>
                <p className="text-[10px] text-stone-400 max-w-[200px]">
                  Instruct the timeline with key terms and click Render to assemble spectacular digital videos.
                </p>
              </div>
            )}
          </div>

          {/* History Lists */}
          {activeTab === "image" && generatedImagesHistory.length > 0 && (
            <div className="border-t pt-4">
              <span className="text-[10px] font-bold text-stone-400 uppercase font-mono block tracking-wider mb-2 text-left">
                Session Generated Gallery ({generatedImagesHistory.length})
              </span>
              <div className="grid grid-cols-4 gap-2 max-h-[90px] overflow-y-auto">
                {generatedImagesHistory.map((item, id) => (
                  <div
                    key={id}
                    onClick={() => setGeneratedImageUrl(item.url)}
                    className="aspect-square rounded-lg overflow-hidden border cursor-pointer hover:border-indigo-505 hover:border-indigo-600 bg-stone-50 group relative"
                  >
                    <img
                      src={item.url}
                      alt={item.prompt}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <Eye className="h-4 w-4 text-white" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "video" && generatedVideosHistory.length > 0 && (
            <div className="border-t pt-4">
              <span className="text-[10px] font-bold text-stone-400 uppercase font-mono block tracking-wider mb-2 text-left">
                Session Generated Clips ({generatedVideosHistory.length})
              </span>
              <div className="grid grid-cols-4 gap-2 max-h-[90px] overflow-y-auto">
                {generatedVideosHistory.map((item, id) => (
                  <div
                    key={id}
                    onClick={() => setGeneratedVideoUrl(item.url)}
                    className="aspect-video bg-neutral-900 rounded-lg flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-indigo-600 text-white font-black text-xs group relative"
                  >
                    <Play className="h-5 w-5 fill-white text-white opacity-80 group-hover:opacity-100 transition" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* MEDIA AND CREATIVE DISCUSSION BOARD */}
      <div id="media_comments_board" className="mt-8 bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-6">
        <div className="border-b pb-4 space-y-1">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-indigo-600 animate-pulse" />
            <h3 className="text-lg font-bold text-stone-900 font-display">
              Artistic Studio Discussion Board
            </h3>
          </div>
          <p className="text-xs text-stone-500">
            Discuss prompt engineering, share generated visual designs, and coordinate creative projects with active members.
          </p>
        </div>

        {/* Comment Form */}
        {currentUser ? (
          <form onSubmit={handlePostMediaComment} className="flex gap-2">
            <input
              type="text"
              required
              value={mediaCommentText}
              onChange={(e) => setMediaCommentText(e.target.value)}
              placeholder="Share a prompt guideline, request feedback, or start a topic..."
              className="flex-1 rounded-xl border border-stone-200 bg-neutral-50 px-4 py-2.5 text-xs outline-none focus:bg-white focus:border-indigo-600"
            />
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 text-white font-bold px-5 py-2.5 text-xs hover:bg-slate-900 transition active:scale-95 cursor-pointer"
            >
              Post Comment
            </button>
          </form>
        ) : (
          <div className="rounded-xl bg-amber-50/50 border border-amber-200/60 p-3.5 text-center text-xs text-stone-650 flex items-center justify-center gap-1.5 font-bold">
            <span>⚠️</span>
            <span>You must be authenticated to post new comments or reply on this board.</span>
          </div>
        )}

        {/* Comments Listing */}
        <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 scrollbar-thin">
          {mediaComments.filter(c => !c.parentId).length === 0 ? (
            <p className="text-stone-400 italic text-xs text-center py-6">
              No active discussions yet. Share your creative insights first!
            </p>
          ) : (
            mediaComments
              .filter(c => !c.parentId)
              .map((c) => {
                const childReplies = mediaComments.filter(rep => rep.parentId === c.id);
                const isAdmin = Boolean(
                  currentUser &&
                    (["main_admin", "admin"].includes(currentUser.role) ||
                      (currentUser.role === "sub_admin" && currentUser.permissions?.allowModeration))
                );
                const isCommentOwner = Boolean(
                  currentUser && currentUser.email?.toLowerCase() === String(c.userId || "").toLowerCase()
                );

                return (
                  <div key={c.id} className="rounded-xl bg-[#FAF8F4] border border-[#E7E1D8] p-4 space-y-3 relative text-left">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-[#1F1B18]">{c.userName}</span>
                        {c.isModerated && (
                          <span className="bg-amber-100 text-amber-800 text-[9px] px-2 py-0.5 rounded-full font-bold">
                            Moderated
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-[#6E655E] font-mono">{c.date}</span>
                    </div>

                    {/* Content view */}
                    {c.isModerated && !isAdmin ? (
                      <p className="text-[#6E655E] italic text-[11px] bg-[#ECE7DF] p-2.5 rounded-lg border border-dashed border-[#E7E1D8]">
                        {c.text}
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {c.isModerated && isAdmin && (
                          <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded block font-mono">
                            Moderator view (Original comment):
                          </span>
                        )}
                        <p className="text-[#1F1B18] text-xs leading-relaxed">
                          "{c.isModerated && isAdmin ? c.originalText : c.text}"
                        </p>
                      </div>
                    )}

                    {/* Actions and replies */}
                    <div className="flex items-center gap-3 pt-1 text-[10px]">
                      {currentUser && !c.isModerated && (
                        <button
                          type="button"
                          onClick={() => setMediaReplyTarget(mediaReplyTarget === c.id ? null : c.id)}
                          className="text-[#A8421B] hover:underline font-bold cursor-pointer"
                        >
                          Reply
                        </button>
                      )}

                      {isAdmin && (
                        <>
                          {currentUser && !c.isModerated && <span className="text-[#E7E1D8]">|</span>}
                          <button
                            type="button"
                            onClick={() => handleModerateMediaComment(c.id)}
                            className="text-amber-700 font-bold hover:underline cursor-pointer"
                          >
                            {c.isModerated ? "Restore" : "Moderate"}
                          </button>
                        </>
                      )}

                      {(isAdmin || isCommentOwner) && (
                        <>
                          <span className="text-[#E7E1D8]">|</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm("Delete this discussion thread?")) {
                                handleDeleteMediaComment(c.id);
                              }
                            }}
                            className="text-rose-700 font-bold hover:underline cursor-pointer"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>

                    {/* Nested replies list */}
                    {childReplies.length > 0 && (
                      <div className="border-l-2 border-stone-250 pl-4 space-y-2.5 mt-2 bg-stone-100/30 p-2.5 rounded-r-lg">
                        {childReplies.map((rep) => {
                          const isRepModerated = rep.isModerated;
                          return (
                            <div key={rep.id} className="text-[11px] space-y-1 border-b border-dashed border-stone-100 last:border-b-0 pb-2 last:pb-0">
                              <div className="flex justify-between items-center text-[10px] text-stone-550">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <CornerDownRight className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                                  <span className="font-bold text-stone-700">{rep.userName}</span>
                                  {isRepModerated && (
                                    <span className="bg-amber-100 text-amber-800 text-[8px] px-1.5 py-0.2 rounded font-mono font-bold">
                                      Moderated
                                    </span>
                                  )}
                                </div>
                                <span className="font-mono">{rep.date}</span>
                              </div>

                              {isRepModerated && !isAdmin ? (
                                <p className="text-stone-400 italic text-[11px] bg-stone-105 p-1.5 rounded ml-5">
                                  {rep.text}
                                </p>
                              ) : (
                                <div className="space-y-0.5 ml-5">
                                  {isRepModerated && isAdmin && (
                                    <span className="text-[9px] text-amber-770 text-amber-700 bg-amber-50 px-1 py-0.2 rounded block font-mono">
                                      Admin viewpoint (Original reply):
                                    </span>
                                  )}
                                  <p className="text-stone-605">
                                    "{isRepModerated && isAdmin ? rep.originalText : rep.text}"
                                  </p>
                                </div>
                              )}

                              {/* Reply Admin Controls */}
                              {isAdmin && (
                                <div className="flex gap-2 text-[9px] font-bold text-stone-400 pt-0.5 ml-5">
                                  <button
                                    type="button"
                                    onClick={() => handleModerateMediaComment(rep.id)}
                                    className="text-amber-705 hover:underline"
                                  >
                                    {isRepModerated ? "Unmoderate Reply" : "Moderate Reply"}
                                  </button>
                                  <span className="text-stone-300">|</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm("Delete this reply?")) {
                                        handleDeleteMediaComment(rep.id);
                                      }
                                    }}
                                    className="text-red-650 hover:underline"
                                  >
                                    Delete Reply
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Inline reply writer */}
                    {mediaReplyTarget === c.id && (
                      <div className="flex gap-2 pt-2 text-xs pl-3">
                        <CornerDownRight className="h-4 w-4 text-stone-400 mt-2.5 shrink-0" />
                        <input
                          type="text"
                          required
                          value={mediaReplyText}
                          onChange={(e) => setMediaReplyText(e.target.value)}
                          placeholder={`Reply to ${c.userName}...`}
                          className="flex-1 rounded border p-1 text-xs outline-none bg-white focus:border-indigo-650"
                        />
                        <button
                          type="button"
                          onClick={() => handlePostMediaReply(c.id)}
                          className="rounded bg-indigo-600 px-3 py-1 text-white text-[10px] font-bold active:scale-95 cursor-pointer"
                        >
                          Post Reply
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMediaReplyTarget(null);
                            setMediaReplyText("");
                          }}
                          className="text-stone-400 text-[10px] hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
          )}
        </div>
      </div>
    </div>
  );
}
