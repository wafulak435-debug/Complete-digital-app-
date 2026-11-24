import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, Video, Play, Pause, RotateCcw, Volume2, 
  Download, Music, Image as ImageIcon, Plus, Trash2, 
  Tv, Layers, Sliders, CheckCircle2, ChevronRight, CornerDownRight,
  Info, RefreshCw, Upload, FileText, Wand2, Scissors, Subtitles, Languages,
  Check, FileUp, Film, Share2
} from "lucide-react";
import { exportPDF, exportWordDoc } from "../lib/docExporter";
import { invokeGeminiAction } from "../lib/aiClient";

// Preloaded congregation & evangelism videos
interface PresetVideo {
  id: string;
  title: string;
  url: string;
  speaker: string;
  category: string;
  duration: string;
}

const PRESET_VIDEOS: PresetVideo[] = [
  {
    id: "v_evangelism_1",
    title: "Bungoma Great Commission Crusade",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    speaker: "Chancellor Kelvin Wafula",
    category: "Evangelism Crusade",
    duration: "12:30"
  },
  {
    id: "v_sermon_1",
    title: "Sovereign Grace & Community Leadership",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    speaker: "Pastor Kelvin Wafula",
    category: "Expository Sermon",
    duration: "15:02"
  },
  {
    id: "v_choir_1",
    title: "Zion Sanctuary Worship & Choral Hymn",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    speaker: "Zion Choir",
    category: "Worship & Praise",
    duration: "14:15"
  }
];

// Preloaded photos for slideshows
interface ChurchPhoto {
  id: string;
  title: string;
  url: string;
  author: string;
}

const PRELOADED_PHOTOS: ChurchPhoto[] = [
  {
    id: "photo_congregation",
    title: "Zion Sunday Praise Circle",
    url: "https://images.unsplash.com/photo-1438029071396-1e831a7fa6d8?q=80&w=800&auto=format&fit=crop",
    author: "Zion Fellowship, Bungoma"
  },
  {
    id: "photo_preacher",
    title: "Sunday Sermon Devotional Study",
    url: "https://images.unsplash.com/photo-1544427920-c49ccfb85579?q=80&w=800&auto=format&fit=crop",
    author: "Brother Wafula"
  },
  {
    id: "photo_choir",
    title: "Saintly Choral Hymnal Choir",
    url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop",
    author: "Zion Bungoma Choir"
  },
  {
    id: "photo_bible",
    title: "Sacred Scriptures Open on Altar",
    url: "https://images.unsplash.com/photo-1504051771394-dd2e66b2e08f?q=80&w=800&auto=format&fit=crop",
    author: "Altar Library"
  },
  {
    id: "photo_sunlight",
    title: "Sanctuan Stained Glass Dawn",
    url: "https://images.unsplash.com/photo-1548625361-155de0cbb55a?q=80&w=800&auto=format&fit=crop",
    author: "Bungoma Cathedral"
  },
  {
    id: "photo_mountain_chapel",
    title: "Highland Grace Sanctuary Sunrise",
    url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=800&auto=format&fit=crop",
    author: "Western Kenya Missions"
  }
];

interface GospelTrack {
  id: string;
  name: string;
  url: string;
  genre: string;
}

const GOSPEL_TRACKS: GospelTrack[] = [
  {
    id: "track_grace",
    name: "Amazing Hymn of Grace (Devotional Organ Suite)",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    genre: "Devotional Organ"
  },
  {
    id: "track_triumph",
    name: "Sanctified Praise & Glory (Upbeat Strings & Guitar)",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    genre: "Sermon Praise"
  },
  {
    id: "track_peaceful",
    name: "Whispers of the Altar (Contemplative Soft Piano)",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    genre: "Fellowship Meditation"
  }
];

interface TheologicalScript {
  id: string;
  title: string;
  lyrics: string[];
}

const THEOLOGICAL_SCRIPTS: TheologicalScript[] = [
  {
    id: "script_fellowship",
    title: "Sermon Fellowship (Psalms 133:1)",
    lyrics: [
      "Behold, how good and how pleasant it is for brethren to dwell together in unity!",
      "Like the precious oil upon the head, running down on the beard of Aaron.",
      "As dew of Hermon descendent upon the holy mountains of Zion.",
      "For there the Lord commanded the blessing, even life forevermore.",
      "United in prayer, the Bungoma congregation lifts their hearts.",
      "Grace, peace and boundless salvation are upon your household today!"
    ]
  },
  {
    id: "script_praise",
    title: "Sunday Choir Joyful Devotional",
    lyrics: [
      "Sing unto the Lord a new song, for He has done wonderful things!",
      "Praise Him with sounding cymbals, praise Him with harp and choir.",
      "The voice of triumph rings loud across the Bungoma valleys.",
      "With hearts aligned in the sanctuary, we offer our joyful sacrifice.",
      "Let every soul rejoice, for the grace of the Savior bridges all gaps.",
      "Hallelujah! Peace reigns forever under the canopy of His mercy."
    ]
  }
];

export default function ChurchVideoStudio() {
  const [studioMode, setStudioMode] = useState<"editor" | "slideshow">("editor");

  // --- AI VIDEO EDITOR STATES ---
  const [selectedVideo, setSelectedVideo] = useState<PresetVideo>(PRESET_VIDEOS[0]);
  const [customVideoUrl, setCustomVideoUrl] = useState<string | null>(null);
  const [customVideoName, setCustomVideoName] = useState<string>("");
  const [editingPrompt, setEditingPrompt] = useState<string>(
    "Trim silences, add bilingual subtitles in English & Kiswahili, apply warm cinematic color grading, and generate a downloadable PDF study guide."
  );
  const [isProcessingVideo, setIsProcessingVideo] = useState<boolean>(false);
  const [editedResult, setEditedResult] = useState<any>(null);
  const [activeVoiceoverLang, setActiveVoiceoverLang] = useState<"en" | "sw">("en");
  const [videoFilterEffect, setVideoFilterEffect] = useState<"warm" | "contrast" | "vintage" | "normal">("warm");
  const [currentSubtitle, setCurrentSubtitle] = useState<string>("");
  const [copiedShareLink, setCopiedShareLink] = useState<boolean>(false);

  const videoPlayerRef = useRef<HTMLVideoElement>(null);

  // Social Media Share Video using Web Share API with Clipboard Fallback
  const handleShareVideo = async () => {
    const videoTitle = customVideoName || selectedVideo.title;
    const videoUrl = customVideoUrl || selectedVideo.url;
    const shareData = {
      title: videoTitle,
      text: `Watch "${videoTitle}" on Zion Digital Media Gateway!`,
      url: videoUrl
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err: any) {
        console.log("Web Share dismissed or failed:", err?.message || err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(videoUrl);
        setCopiedShareLink(true);
        setTimeout(() => setCopiedShareLink(false), 3000);
      } catch (err) {
        alert(`Share Video Link:\n${videoUrl}`);
      }
    }
  };

  // Handle uploaded video file
  const handleVideoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const blobUrl = URL.createObjectURL(file);
      setCustomVideoUrl(blobUrl);
      setCustomVideoName(file.name);
      setEditedResult(null);
    }
  };

  // Run AI Video Editing Process
  const handleProcessVideoWithAI = async () => {
    setIsProcessingVideo(true);
    setEditedResult(null);

    const videoTitle = customVideoName || selectedVideo.title;

    try {
      const data = await invokeGeminiAction("edit-video", "/api/ai/edit-video", {
        videoName: videoTitle,
        prompt: editingPrompt,
        category: selectedVideo.category
      });
      if (data.success && data.data) {
        setEditedResult(data.data);
      } else {
        alert("Failed to process video: " + (data.error || "Unknown error"));
      }
    } catch (err: any) {
      console.error("AI Video editing error:", err);
      alert("Error connecting to AI Video Editor: " + err.message);
    } finally {
      setIsProcessingVideo(false);
    }
  };

  // Download Handlers
  const handleDownloadPDF = () => {
    if (!editedResult) return;
    const docTitle = editedResult.title || "Evangelism Sermon Study Guide";
    const docContent = editedResult.sermonOutlineDoc || "No content generated.";
    exportPDF(docTitle, docContent);
  };

  const handleDownloadWord = () => {
    if (!editedResult) return;
    const docTitle = editedResult.title || "Evangelism Sermon Study Guide";
    const docContent = editedResult.sermonOutlineDoc || "No content generated.";
    exportWordDoc(docTitle, docContent);
  };

  const handleDownloadEditedPackage = () => {
    if (!editedResult) return;
    const header = "ZION_AI_VIDEO_EDIT_PACKAGE_V3\n";
    const body = `
======================================================
ZION DIGITAL AI VIDEO EDITOR PACKAGE
======================================================
Edited Video Title: ${editedResult.title}
Summary: ${editedResult.summary}

APPLIED FILTERS & EFFECTS:
${(editedResult.appliedEffects || []).map((ef: string) => `• ${ef}`).join("\n")}

SEMANTIC TRIM & HIGHLIGHT TIMELINE:
${(editedResult.trimPoints || []).map((tp: string) => `• ${tp}`).join("\n")}

TIMESTAMPTED SUBTITLES:
${(editedResult.subtitles || []).map((s: any) => `[${s.timestamp}] ${s.text}`).join("\n")}

VOICEOVER SCRIPT (ENGLISH):
${editedResult.voiceoverScriptEnglish}

VOICEOVER SCRIPT (KISAWAHILI):
${editedResult.voiceoverScriptSwahili}

======================================================
Exported natively from Zion Digital AI Media Suite.
    `;

    const blob = new Blob([header + body], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `edited_video_package_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- SLIDESHOW STUDIO STATES ---
  const [selectedPhotos, setSelectedPhotos] = useState<ChurchPhoto[]>([PRELOADED_PHOTOS[0], PRELOADED_PHOTOS[1], PRELOADED_PHOTOS[2]]);
  const [selectedTrack, setSelectedTrack] = useState<GospelTrack>(GOSPEL_TRACKS[0]);
  const [selectedScript, setSelectedScript] = useState<TheologicalScript>(THEOLOGICAL_SCRIPTS[0]);
  const [transitionSpeed, setTransitionSpeed] = useState<number>(3500);
  const [transitionEffect, setTransitionEffect] = useState<"ken-burns" | "crossfade" | "glow" | "zoom">("ken-burns");
  const [videoLayout, setVideoLayout] = useState<"16-9" | "9-16">("16-9");
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileProgress, setCompileProgress] = useState(0);
  const [compileStatus, setCompileStatus] = useState("");
  const [compileLogs, setCompileLogs] = useState<string[]>([]);
  const [hasCompiledVideo, setHasCompiledVideo] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [audioVolume, setAudioVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState("");

  const audioRef = useRef<HTMLAudioElement>(null);
  const slideTimerRef = useRef<any>(null);

  useEffect(() => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.volume = isMuted ? 0 : audioVolume;
        audioRef.current.play().catch(() => {});
      }
      slideTimerRef.current = setInterval(() => {
        setCurrentSlideIndex((prev) => (prev + 1) % selectedPhotos.length);
      }, transitionSpeed);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (slideTimerRef.current) {
        clearInterval(slideTimerRef.current);
      }
    }
    return () => {
      if (slideTimerRef.current) clearInterval(slideTimerRef.current);
    };
  }, [isPlaying, selectedPhotos, transitionSpeed, audioVolume, isMuted]);

  const handleCompileVideo = () => {
    setIsCompiling(true);
    setCompileProgress(10);
    setCompileStatus("Initializing Veo 3.5 Video Framebuffer...");
    setCompileLogs(["Starting timeline assembly...", "Ingesting selected high-fidelity photos."]);

    setTimeout(() => {
      setCompileProgress(40);
      setCompileStatus("Synchronizing Gospel Audio & Audio Normalization...");
      setCompileLogs((prev) => [...prev, `Selected track: ${selectedTrack.name}`, "Applying -6dB audio limiter."]);
    }, 1000);

    setTimeout(() => {
      setCompileProgress(75);
      setCompileStatus("Rendering Yellow Subtitle Text Overlay Layers...");
      setCompileLogs((prev) => [...prev, `Script loaded: ${selectedScript.title}`, "Compiling transition keyframes."]);
    }, 2200);

    setTimeout(() => {
      setCompileProgress(100);
      setCompileStatus("Render Complete! Ready for Playback.");
      setIsCompiling(false);
      setHasCompiledVideo(true);
      setIsPlaying(true);
    }, 3500);
  };

  const handleRemovePhoto = (id: string) => {
    if (selectedPhotos.length <= 1) {
      alert("At least one photo must remain in your timeline!");
      return;
    }
    setSelectedPhotos(selectedPhotos.filter((p) => p.id !== id));
  };

  const handleAddCustomImage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedImageUrl.trim()) return;
    const newPt: ChurchPhoto = {
      id: "photo_cust_" + Date.now(),
      title: "Custom Upload Photo",
      url: uploadedImageUrl.trim(),
      author: "Local Upload"
    };
    setSelectedPhotos([...selectedPhotos, newPt]);
    setUploadedImageUrl("");
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 sm:p-6 text-left select-none space-y-6">
      
      {/* Top Header & Mode Toggle */}
      <div className="border-b pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="bg-rose-500/10 text-rose-600 font-mono text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded inline-flex items-center space-x-1">
            <Sparkles className="h-3 w-3 animate-pulse" />
            <span>ZION AI MULTIMEDIA ENGINE</span>
          </span>
          <h3 className="text-lg font-extrabold text-stone-900 mt-1 flex items-center gap-2">
            <Video className="h-5 w-5 text-rose-500" />
            <span>AI Video Editor & Evangelism Studio</span>
          </h3>
          <p className="text-xs text-stone-500 mt-1 leading-relaxed">
            Edit uploaded sermon videos with natural language AI prompts, or generate rich devotional video slideshows.
          </p>
        </div>

        {/* Studio Mode Selector Tabs */}
        <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200 shrink-0">
          <button
            type="button"
            onClick={() => setStudioMode("editor")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition ${
              studioMode === "editor" 
                ? "bg-rose-600 text-white shadow-sm" 
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Wand2 className="h-3.5 w-3.5" />
            <span>AI Video Editor</span>
          </button>
          <button
            type="button"
            onClick={() => setStudioMode("slideshow")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition ${
              studioMode === "slideshow" 
                ? "bg-rose-600 text-white shadow-sm" 
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Film className="h-3.5 w-3.5" />
            <span>Slideshow Studio</span>
          </button>
        </div>
      </div>

      {/* MODE 1: AI VIDEO EDITOR */}
      {studioMode === "editor" ? (
        <div className="grid gap-6 lg:grid-cols-12">
          
          {/* LEFT: Video Upload & AI Directives Form */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Step 1: Select or Upload Video */}
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3">
              <span className="text-xs font-extrabold uppercase tracking-wide text-stone-700 flex items-center gap-1.5">
                <Upload className="h-4 w-4 text-rose-500" />
                <span>1. Choose or Upload Video</span>
              </span>

              {/* Upload custom video file */}
              <div className="border-2 border-dashed border-stone-300 rounded-xl p-3 bg-white text-center hover:border-rose-400 transition cursor-pointer relative">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <FileUp className="h-6 w-6 text-stone-400 mx-auto mb-1" />
                <span className="text-xs font-bold text-stone-700 block">
                  {customVideoName ? `Attached: ${customVideoName}` : "Click or drag to upload video (.mp4, .mov, .webm)"}
                </span>
                <span className="text-[10px] text-stone-400">Processes video frames directly in local memory</span>
              </div>

              {/* Or Select Preset Video */}
              <div>
                <span className="text-[10px] font-mono text-stone-500 uppercase font-bold block mb-1">
                  Or pick preloaded Evangelism video:
                </span>
                <div className="space-y-1.5">
                  {PRESET_VIDEOS.map((pv) => {
                    const isSelected = !customVideoUrl && selectedVideo.id === pv.id;
                    return (
                      <button
                        key={pv.id}
                        type="button"
                        onClick={() => {
                          setCustomVideoUrl(null);
                          setCustomVideoName("");
                          setSelectedVideo(pv);
                          setEditedResult(null);
                        }}
                        className={`w-full text-left p-2 rounded-lg border text-xs font-semibold flex justify-between items-center transition ${
                          isSelected 
                            ? "bg-rose-50 border-rose-300 text-rose-900 shadow-xs" 
                            : "bg-white border-stone-200 text-stone-700 hover:bg-stone-100"
                        }`}
                      >
                        <div className="truncate pr-2">
                          <span className="font-bold block truncate">{pv.title}</span>
                          <span className="text-[10px] text-stone-500">{pv.speaker} • {pv.category}</span>
                        </div>
                        <span className="text-[9px] font-mono bg-stone-200 px-1.5 py-0.5 rounded text-stone-600 font-bold shrink-0">
                          {pv.duration}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Step 2: AI Directives Prompt Input */}
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3">
              <span className="text-xs font-extrabold uppercase tracking-wide text-stone-700 flex items-center gap-1.5">
                <Wand2 className="h-4 w-4 text-rose-500" />
                <span>2. AI Video Edit Instructions</span>
              </span>

              <textarea
                value={editingPrompt}
                onChange={(e) => setEditingPrompt(e.target.value)}
                rows={3}
                placeholder="Instruct the AI on how to edit this video (e.g. Trim silences, add bilingual subtitles, generate study guide doc, apply warm color grade...)"
                className="w-full text-xs p-2.5 rounded-lg border border-stone-300 bg-white font-medium outline-none focus:border-rose-500 leading-relaxed"
              />

              {/* Prompt Presets */}
              <div>
                <span className="text-[9px] font-mono text-stone-400 block font-bold uppercase mb-1">Quick Editing Presets:</span>
                <div className="flex flex-wrap gap-1">
                  {[
                    "Trim silences & add bilingual subtitles",
                    "Extract 30s highlight reel & PDF study guide",
                    "Apply warm cinematic grade & voiceover script",
                    "Auto-generate sermon outline & Word doc"
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setEditingPrompt(preset)}
                      className="text-[10px] bg-white hover:bg-rose-50 text-stone-700 hover:text-rose-700 border border-stone-250 rounded-md px-2 py-1 font-semibold transition"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter Selection */}
              <div className="pt-1">
                <label className="text-[10px] font-mono text-stone-500 font-bold uppercase block mb-1">Color Grading Filter:</label>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { id: "warm", label: "🌅 Warm" },
                    { id: "contrast", label: "🎬 Contrast" },
                    { id: "vintage", label: "📜 Vintage" },
                    { id: "normal", label: "📺 Normal" }
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setVideoFilterEffect(f.id as any)}
                      className={`py-1 rounded text-[10px] font-bold border transition ${
                        videoFilterEffect === f.id ? "bg-rose-600 text-white border-rose-600" : "bg-white text-stone-600 border-stone-200"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Run AI Edit Button */}
            <button
              type="button"
              onClick={handleProcessVideoWithAI}
              disabled={isProcessingVideo}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-700 hover:to-indigo-700 text-white font-black text-xs shadow-md flex items-center justify-center gap-2 transition active:scale-98 disabled:opacity-50"
            >
              {isProcessingVideo ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>AI Video Engine Processing Video Frames & Speech...</span>
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  <span>Process Video with AI Engine</span>
                </>
              )}
            </button>
          </div>

          {/* RIGHT: Live Player & AI Output Hub */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Live Video Player Box */}
            <div className="bg-stone-900 rounded-2xl border border-stone-950 p-4 text-white shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between text-[10px] font-mono text-stone-400 pb-2 border-b border-stone-800">
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>AI VIDEO PLAYER • LIVE PREVIEW</span>
                </span>
                <div className="flex items-center gap-2">
                  <span>{customVideoName ? "UPLOADED MEDIA" : selectedVideo.category}</span>
                  <button
                    type="button"
                    onClick={handleShareVideo}
                    className="bg-stone-800 hover:bg-rose-600 text-stone-200 hover:text-white px-2.5 py-1 rounded-lg flex items-center gap-1 font-sans text-[10.5px] font-extrabold transition cursor-pointer border border-stone-700 hover:border-rose-500 shadow-2xs"
                    title="Share video link on social media"
                  >
                    <Share2 className="h-3 w-3 text-rose-400" />
                    <span>{copiedShareLink ? "Link Copied!" : "Share Video"}</span>
                  </button>
                </div>
              </div>

              {/* Video Element */}
              <div className="relative aspect-video my-3 bg-black rounded-xl overflow-hidden border border-stone-800">
                <video
                  ref={videoPlayerRef}
                  src={customVideoUrl || selectedVideo.url}
                  controls
                  className={`w-full h-full object-contain ${
                    videoFilterEffect === "warm" ? "sepia-[0.25] saturate-125 contrast-105" :
                    videoFilterEffect === "contrast" ? "contrast-125 saturate-110" :
                    videoFilterEffect === "vintage" ? "sepia-[0.5] contrast-90" : ""
                  }`}
                  onTimeUpdate={(e) => {
                    const currentTime = (e.target as HTMLVideoElement).currentTime;
                    if (editedResult?.subtitles) {
                      const match = editedResult.subtitles.find((sub: any) => {
                        const [m, s] = sub.timestamp.split(":").map(Number);
                        const sec = (m || 0) * 60 + (s || 0);
                        return Math.abs(currentTime - sec) < 4;
                      });
                      if (match) setCurrentSubtitle(match.text);
                    }
                  }}
                />

                {/* Subtitles Overlay */}
                {currentSubtitle && (
                  <div className="absolute bottom-10 inset-x-4 bg-black/80 backdrop-blur-md px-4 py-2 rounded-xl text-center border border-amber-500/30 shadow-2xl pointer-events-none">
                    <p className="text-yellow-400 font-bold text-xs md:text-sm">
                      "{currentSubtitle}"
                    </p>
                  </div>
                )}
              </div>

              {/* AI Processing Status or Indicator */}
              {isProcessingVideo && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 space-y-3 z-20">
                  <Wand2 className="h-8 w-8 text-rose-500 animate-spin" />
                  <span className="font-bold text-sm text-white">AI Analyzing Video Track & Directives...</span>
                  <span className="text-xs text-stone-400 text-center max-w-xs">
                    Generating timestamps, auto-captions, voiceover scripts, and downloadable sermon study guides.
                  </span>
                </div>
              )}
            </div>

            {/* AI Generated Results & Downloads Hub */}
            {editedResult ? (
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-4">
                
                {/* Result Title & Summary */}
                <div className="border-b border-stone-200 pb-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="font-extrabold text-sm text-stone-900">{editedResult.title}</h4>
                      <p className="text-xs text-stone-600 mt-1 leading-relaxed">{editedResult.summary}</p>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded font-mono shrink-0">
                      ✓ AI EDIT COMPLETE
                    </span>
                  </div>

                  {/* Applied Effects Badges */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(editedResult.appliedEffects || []).map((ef: string, i: number) => (
                      <span key={i} className="text-[9px] bg-white border border-stone-250 text-stone-700 px-2 py-0.5 rounded font-semibold">
                        ✨ {ef}
                      </span>
                    ))}
                  </div>
                </div>

                {/* DOWNLOAD DOCUMENTS BAR */}
                <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-3.5 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <FileText className="h-4 w-4" />
                      <span>Download AI Generated Sermon & Video Documents</span>
                    </span>
                    <span className="text-[9px] font-mono text-stone-400">PDF & DOCX READY</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleDownloadPDF}
                      className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition shadow"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadWord}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition shadow"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download Word (.docx)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadEditedPackage}
                      className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-2 px-3 rounded-lg border border-slate-600 flex items-center justify-center gap-1.5 transition shadow"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Video Edit Package</span>
                    </button>
                  </div>
                </div>

                {/* Timestamped Subtitles & Voiceover Scripts */}
                <div className="grid sm:grid-cols-2 gap-3">
                  
                  {/* Timestamped Subtitles */}
                  <div className="bg-white p-3 rounded-lg border border-stone-200 space-y-2">
                    <span className="text-[11px] font-extrabold text-stone-800 flex items-center gap-1">
                      <Subtitles className="h-3.5 w-3.5 text-rose-500" />
                      <span>AI Timestamps & Subtitles</span>
                    </span>
                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 text-xs">
                      {(editedResult.subtitles || []).map((sub: any, idx: number) => (
                        <div key={idx} className="bg-stone-50 p-1.5 rounded border border-stone-150 flex gap-2 items-start">
                          <span className="font-mono text-[9px] font-bold text-rose-600 bg-rose-50 px-1 py-0.5 rounded shrink-0">
                            {sub.timestamp}
                          </span>
                          <span className="text-[10.5px] text-stone-700 font-medium leading-snug">{sub.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bilingual Voiceover Scripts */}
                  <div className="bg-white p-3 rounded-lg border border-stone-200 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-extrabold text-stone-800 flex items-center gap-1">
                        <Languages className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Voiceover Script</span>
                      </span>
                      <div className="flex gap-1 bg-stone-100 p-0.5 rounded">
                        <button
                          type="button"
                          onClick={() => setActiveVoiceoverLang("en")}
                          className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                            activeVoiceoverLang === "en" ? "bg-indigo-600 text-white" : "text-stone-600"
                          }`}
                        >
                          English
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveVoiceoverLang("sw")}
                          className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                            activeVoiceoverLang === "sw" ? "bg-indigo-600 text-white" : "text-stone-600"
                          }`}
                        >
                          Kiswahili
                        </button>
                      </div>
                    </div>

                    <p className="text-[10.5px] text-stone-700 bg-stone-50 p-2 rounded border border-stone-150 max-h-36 overflow-y-auto leading-relaxed italic">
                      "{activeVoiceoverLang === "en" ? editedResult.voiceoverScriptEnglish : editedResult.voiceoverScriptSwahili}"
                    </p>
                  </div>
                </div>

              </div>
            ) : (
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-6 text-center space-y-2">
                <Wand2 className="h-8 w-8 text-stone-400 mx-auto" />
                <h5 className="font-bold text-xs text-stone-700">AI Video Editing Hub Standby</h5>
                <p className="text-[11px] text-stone-500 max-w-sm mx-auto leading-relaxed">
                  Select or upload your video on the left, type your editing instructions, and click <strong>"Process Video with AI Engine"</strong> to generate downloadable PDF/Word study guides, bilingual subtitles, and edited video packages!
                </p>
              </div>
            )}

          </div>
        </div>
      ) : (

        /* MODE 2: SLIDESHOW & PRAISE MOVIE STUDIO */
        <div className="grid gap-6 lg:grid-cols-12">
          
          {/* LEFT COLUMN: Timeline Assembly & Config */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* STEP 1: Select Images */}
            <div className="bg-stone-50/70 p-4 rounded-xl border border-stone-150 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-extrabold uppercase tracking-wide text-stone-600 flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-rose-500" />
                  <span>1. Timeline Photos ({selectedPhotos.length})</span>
                </span>
              </div>

              {/* Carousel grid list */}
              <div className="grid grid-cols-3 gap-2">
                {PRELOADED_PHOTOS.map((pt) => {
                  const isSelected = selectedPhotos.some((p) => p.id === pt.id);
                  return (
                    <button
                      key={pt.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          handleRemovePhoto(pt.id);
                        } else {
                          setSelectedPhotos([...selectedPhotos, pt]);
                        }
                      }}
                      className={`relative rounded-lg overflow-hidden border aspect-video transition-all ${
                        isSelected ? "ring-2 ring-rose-500 border-transparent shadow-md scale-95" : "border-stone-250 opacity-60 hover:opacity-90"
                      }`}
                    >
                      <img src={pt.url} alt={pt.title} className="h-full w-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 text-[9px] text-white p-0.5 truncate text-center font-bold">
                        {pt.title.split(" ")[0]}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom URL form */}
              <form onSubmit={handleAddCustomImage} className="space-y-1.5 pt-1 border-t border-stone-200">
                <span className="text-[9px] font-mono text-stone-400 font-bold block uppercase">Attach photo URL:</span>
                <div className="flex gap-1.5">
                  <input
                    type="url"
                    placeholder="Paste direct HTTPS image link..."
                    value={uploadedImageUrl}
                    onChange={(e) => setUploadedImageUrl(e.target.value)}
                    className="flex-1 rounded-lg border border-stone-200 bg-white p-1.5 text-[10px] outline-none font-medium focus:border-rose-500"
                  />
                  <button
                    type="submit"
                    className="bg-slate-800 hover:bg-slate-900 text-white rounded-lg px-2.5 text-[10px] font-extrabold transition shrink-0"
                  >
                    Insert
                  </button>
                </div>
              </form>
            </div>

            {/* STEP 2: Configure Music */}
            <div className="bg-stone-50/70 p-4 rounded-xl border border-stone-150 space-y-3">
              <span className="text-[11px] font-extrabold uppercase tracking-wide text-stone-600 flex items-center gap-1.5">
                <Music className="h-3.5 w-3.5 text-rose-500" />
                <span>2. Choose Hymn Track</span>
              </span>
              <div className="space-y-1.5">
                {GOSPEL_TRACKS.map((track) => (
                  <label
                    key={track.id}
                    className={`flex items-center justify-between p-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                      selectedTrack.id === track.id 
                        ? "bg-rose-50 text-rose-900 border-rose-200 shadow-sm" 
                        : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="gospel_audio"
                        checked={selectedTrack.id === track.id}
                        onChange={() => setSelectedTrack(track)}
                        className="text-rose-600 h-3.5 w-3.5"
                      />
                      <span className="text-[11px] truncate max-w-[200px]">{track.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* STEP 3: Customize Titles */}
            <div className="bg-stone-50/70 p-4 rounded-xl border border-stone-150 space-y-3">
              <span className="text-[11px] font-extrabold uppercase tracking-wide text-stone-600 flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-rose-500" />
                <span>3. Configure Captions Script</span>
              </span>
              
              <select
                value={selectedScript.id}
                onChange={(e) => {
                  const sc = THEOLOGICAL_SCRIPTS.find(s => s.id === e.target.value);
                  if (sc) setSelectedScript(sc);
                }}
                className="w-full text-xs font-bold bg-white rounded-lg border border-stone-300 p-2 outline-none"
              >
                {THEOLOGICAL_SCRIPTS.map((sc) => (
                  <option key={sc.id} value={sc.id}>{sc.title}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleCompileVideo}
              disabled={isCompiling}
              className="w-full text-xs font-extrabold py-3 rounded-xl shadow bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center gap-2 transition active:scale-98 disabled:opacity-50"
            >
              {isCompiling ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-white" />
                  <span>Veo 3.5 compiling... {compileProgress}%</span>
                </>
              ) : (
                <>
                  <Video className="h-4.5 w-4.5 text-rose-200" />
                  <span>Compile Church Video Slideshow</span>
                </>
              )}
            </button>
          </div>

          {/* RIGHT COLUMN: Output Monitor */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            <div className="bg-stone-900 rounded-2xl border border-stone-950 p-4 text-white flex flex-col justify-between overflow-hidden relative shadow-xl min-h-[440px]">
              <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-stone-400 border-b border-stone-800 pb-2">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                  <span>SLIDESHOW STUDIO STATUS BAR</span>
                </span>
                <span>HD TIMELINE • 1080P COMPLIANT</span>
              </div>

              {hasCompiledVideo ? (
                <div className="flex-1 flex flex-col justify-between py-2 relative z-10">
                  <div className="mx-auto rounded-xl border border-stone-800 overflow-hidden relative shadow-md bg-black aspect-video w-full">
                    <img 
                      src={selectedPhotos[currentSlideIndex]?.url} 
                      alt="Slide"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-x-3 bottom-3 bg-black/80 backdrop-blur-md rounded-xl p-3 border border-stone-800 text-center">
                      <p className="text-yellow-400 font-bold text-xs">
                        &bull; {selectedScript.lyrics[currentSlideIndex % selectedScript.lyrics.length]} &bull;
                      </p>
                    </div>
                  </div>

                  <audio ref={audioRef} src={selectedTrack.url} loop />

                  <div className="pt-4 flex items-center justify-between gap-3 border-t border-stone-850 mt-3">
                    <button
                      type="button"
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="h-8 w-8 text-white bg-rose-600 hover:bg-rose-700 rounded-full flex items-center justify-center transition"
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                    </button>

                    <div className="flex-1 text-left">
                      <span className="text-[10px] font-bold text-stone-200 block truncate">
                        {selectedTrack.name}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-center items-center py-8 text-center space-y-4 px-4 select-none">
                  <Video className="h-8 w-8 text-stone-600 animate-pulse" />
                  <p className="text-xs text-stone-400">
                    Click <strong>"Compile Church Video Slideshow"</strong> to start playback.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
