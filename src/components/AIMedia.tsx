import React, { useState, useEffect } from "react";
import { Sparkles, Image as ImageIcon, Video as VideoIcon, Download, Loader2, Play, Plus, RefreshCw, Eye, Save } from "lucide-react";
import { User, SavedDocument } from "../types";

interface AIMediaProps {
  currentUser: User | null;
  onAddNewDocument?: (doc: SavedDocument) => void;
}

export default function AIMedia({ currentUser, onAddNewDocument }: AIMediaProps) {
  const [activeTab, setActiveTab] = useState<"image" | "video">("image");

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
      const response = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: imagePrompt,
          aspectRatio,
          hdMode
        })
      });

      const resData = await response.json();
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
      const response = await fetch("/api/ai/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: videoPrompt,
          aspectRatio: videoAspect,
          resolution: videoRes
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
        const response = await fetch("/api/ai/video-status", {
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
    <div id="ai_creative_media_hub" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8 select-none text-left">
      {/* Decorative Header */}
      <div className="rounded-2xl bg-gradient-to-r from-violet-900 via-indigo-950 to-slate-950 text-white p-6 sm:p-8 text-left shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 h-40 w-40 transform translate-x-12 -translate-y-12 opacity-15 rounded-full border-[20px] border-indigo-500 animate-pulse" />
        <div className="relative z-10 space-y-3">
          <span className="bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 font-mono text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
            ADVANCED AI 3.5 ENGINE
          </span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight font-display">
            Creative AI Studio
          </h2>
          <p className="text-xs text-indigo-200/80 max-w-2xl leading-relaxed">
            Generate unlimited custom graphic cover pages, illustrations, vectors, and realistic video outlines using our high-speed neural models. Keep study and marketing materials visually breathtaking.
          </p>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-stone-200 space-x-6">
        <button
          onClick={() => setActiveTab("image")}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 transition border-b-2 ${
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
          className={`pb-3 text-sm font-bold flex items-center space-x-2 transition border-b-2 ${
            activeTab === "video"
              ? "text-indigo-600 border-indigo-600"
              : "text-stone-450 border-transparent hover:text-stone-800"
          }`}
        >
          <VideoIcon className="h-4.5 w-4.5" />
          <span>Unlimited Video Animator (Veo 3.5)</span>
        </button>
      </div>

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
    </div>
  );
}
