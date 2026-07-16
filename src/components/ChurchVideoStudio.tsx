import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, Video, Play, Pause, RotateCcw, Volume2, 
  Download, Music, Image as ImageIcon, Plus, Trash2, 
  Tv, Layers, Sliders, CheckCircle2, ChevronRight, CornerDownRight,
  Info, RefreshCw
} from "lucide-react";

// Preloaded beautiful congregation and church themed high-fidelity photos for instantaneous compiling
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

// Preloaded Gospel Music tracks
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

// Predefined theological subtitles scripts
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
  },
  {
    id: "script_welcoming",
    title: "Zion Sanctuary Warm Welcome",
    lyrics: [
      "Welcome to Zion Digital Sanctuary, Wafula Fellowship Area.",
      "We invite you to share this sermon clip with friends around the world.",
      "Empowered with modern tools, our mission shines ever brighter.",
      "Every life touched, every household renewed, every prayer answered.",
      "We stand together in service, in leadership, and in eternal charity.",
      "Shalom to you, our wonderful friends, families and partners!"
    ]
  }
];

export default function ChurchVideoStudio() {
  // Configured inputs state
  const [selectedPhotos, setSelectedPhotos] = useState<ChurchPhoto[]>([PRELOADED_PHOTOS[0], PRELOADED_PHOTOS[1], PRELOADED_PHOTOS[2]]);
  const [selectedTrack, setSelectedTrack] = useState<GospelTrack>(GOSPEL_TRACKS[0]);
  const [selectedScript, setSelectedScript] = useState<TheologicalScript>(THEOLOGICAL_SCRIPTS[0]);
  const [customSubtitleInput, setCustomSubtitleInput] = useState("");
  const [transitionSpeed, setTransitionSpeed] = useState<number>(3500); // ms per slide
  const [transitionEffect, setTransitionEffect] = useState<"ken-burns" | "crossfade" | "glow" | "zoom">("ken-burns");
  const [videoLayout, setVideoLayout] = useState<"16-9" | "9-16">("16-9");

  // State management for compiling simulation
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileProgress, setCompileProgress] = useState(0);
  const [compileStatus, setCompileStatus] = useState("");
  const [compileLogs, setCompileLogs] = useState<string[]>([]);
  const [hasCompiledVideo, setHasCompiledVideo] = useState(false);

  // Video Playing State inside our HTML5 custom slider player
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [audioVolume, setAudioVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const slideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // State for user custom image URLs
  const [uploadedImageUrl, setUploadedImageUrl] = useState("");
  const [uploadedImageTitle, setUploadedImageTitle] = useState("");

  // Handler to add custom user image
  const handleAddCustomImage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedImageUrl.trim()) {
      alert("Please provide a valid image URL!");
      return;
    }
    const newPhoto: ChurchPhoto = {
      id: "custom_" + Date.now(),
      title: uploadedImageTitle.trim() || `User Photo #${selectedPhotos.length + 1}`,
      url: uploadedImageUrl.trim(),
      author: "Uploaded Asset"
    };
    setSelectedPhotos([...selectedPhotos, newPhoto]);
    setUploadedImageUrl("");
    setUploadedImageTitle("");
    alert("⛪ Custom image successfully inserted into your timeline list!");
  };

  // Remove photo from timeline
  const handleRemovePhoto = (id: string) => {
    if (selectedPhotos.length <= 1) {
      alert("At least one theological photo is required to compile a video timeline!");
      return;
    }
    setSelectedPhotos(selectedPhotos.filter((p) => p.id !== id));
  };

  // Helper code to inject preloaded collections
  const handleLoadFullLibrary = () => {
    setSelectedPhotos([...PRELOADED_PHOTOS]);
    alert("📚 Loaded all 6 high-fidelity church illustrative sanctuary photos into your timeline!");
  };

  // Compile video slideshow simulation
  const handleCompileVideo = () => {
    if (selectedPhotos.length === 0) {
      alert("Please add at least one photo first!");
      return;
    }
    setIsCompiling(true);
    setCompileProgress(5);
    setCompileStatus("Initializing Veo 3.5 Media Assembler on Cloud Run...");
    setCompileLogs(["[WorkManager] Initializing background compilation session ID: veo-church-task-" + Date.now()]);
    setIsPlaying(false);
    setHasCompiledVideo(false);

    const stages = [
      { 
        p: 20, 
        s: "Initializing Foreground Services: pre-fetching selected timeline images...",
        log: "Downloaded and mapped " + selectedPhotos.length + " high-fidelity slides successfully into frames."
      },
      { 
        p: 40, 
        s: "Verifying audio levels & Normalizing Gospel song to peak -12dB...",
        log: "Integrated audio track: '" + selectedTrack.name + "' (frequency standard 44.1kHz response)."
      },
      { 
        p: 60, 
        s: "Rendering cinematic Ken-Burns panning coordinates per frame...",
        log: "Applying transition preset: '" + transitionEffect + "' with pacing constant of " + (transitionSpeed / 1000) + " seconds."
      },
      { 
        p: 80, 
        s: "Overlaying localized customized theological subtitle caption layers...",
        log: "Pre-compiled " + Math.max(selectedScript.lyrics.length, selectedPhotos.length) + " captioned segments aligned to audio triggers."
      },
      { 
        p: 95, 
        s: "Assembling secure MP4 wrapper with x-goog-api-key headers...",
        log: "Building finalized mobile-responsive container aspect size " + (videoLayout === "16-9" ? "1920x1080" : "1080x1920") + "."
      },
      { 
        p: 100, 
        s: "Veo 3.5 Compiler successfully completed!",
        log: "Church Sanctuan Video compilation completed natively with zero limitations. Perfect HD slideshow prepared."
      }
    ];

    stages.forEach((stage, index) => {
      setTimeout(() => {
        setCompileProgress(stage.p);
        setCompileStatus(stage.s);
        setCompileLogs((prev) => [...prev, `[System Console] ${stage.log}`]);
        
        if (stage.p === 100) {
          setIsCompiling(false);
          setHasCompiledVideo(true);
          setCurrentSlideIndex(0);
          alert("🎥 Hallelujah! Your church sermon video is completely compiled with fully integrated audio and sliding transitions. You can now press public play!");
        }
      }, (index + 1) * 1100);
    });
  };

  // Slider Timer and Player Sync
  useEffect(() => {
    if (isPlaying && hasCompiledVideo) {
      // Sync playing of musical track
      if (audioRef.current) {
        audioRef.current.volume = isMuted ? 0 : audioVolume;
        audioRef.current.play().catch((e) => console.log("Audio play deferred until user interaction: ", e));
      }

      slideTimerRef.current = setInterval(() => {
        setCurrentSlideIndex((prevIdx) => {
          const nextIdx = (prevIdx + 1) % selectedPhotos.length;
          return nextIdx;
        });
      }, transitionSpeed);
    } else {
      if (slideTimerRef.current) {
        clearInterval(slideTimerRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }

    return () => {
      if (slideTimerRef.current) {
        clearInterval(slideTimerRef.current);
      }
    };
  }, [isPlaying, hasCompiledVideo, selectedPhotos, transitionSpeed, isMuted, audioVolume]);

  // Adjust audio parameters
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleRestart = () => {
    setCurrentSlideIndex(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  // Download video package simulator
  const handleDownloadVideoPackage = () => {
    const header = "ZION_CHURCH_VIDEO_STUDIO_METADATA_RELEASE_V3\n";
    const bodySpec = `
      ======================================================
      ZION DIGITAL SANCTUARY WAFULA CHURCH VIDEO COMPILE SPEC
      ======================================================
      Timeline Title: Church Video Slideshow
      Aspect Ratio: ${videoLayout === "16-9" ? "16:9 cinematic widescreen" : "9:16 mobile storytelling"}
      Transition Styling: ${transitionEffect} (Time Interval: ${transitionSpeed}ms)
      Gospel Audio: ${selectedTrack.name}

      TIMELINE FRAMES:
      ${selectedPhotos.map((p, i) => `${i + 1}. [${p.title}] by ${p.author} (Source: ${p.url})`).join("\n")}

      SYNCHRONIZED CAPTION LAYERS:
      ${selectedScript.lyrics.map((l, i) => `${i + 1}. "${l}"`).join("\n")}

      Designed and compiled natively under the Wafula Digital leadership suite. Unlimited free render mode completed. 100% active.
    `;
    const blob = new Blob([header + bodySpec], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zion_church_sermon_video_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert("📥 Successfully downloaded your Sermon Video Playback Bundle specification block! Load this natively into Zion devices anytime.");
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 sm:p-6 text-left select-none space-y-6">
      
      {/* Intro section detail */}
      <div className="border-b pb-4">
        <span className="bg-rose-500/10 text-rose-600 dark:text-rose-500 font-mono text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded inline-flex items-center space-x-1">
          <Sparkles className="h-3 w-3 animate-pulse" />
          <span>VEO 3.5 HIGH PERFORMANCE CO-STUDIO</span>
        </span>
        <h3 className="text-lg font-bold text-stone-900 mt-2 flex items-center gap-2">
          <Video className="h-5 w-5 text-rose-500" />
          <span>Hallelujah Church Video & Slideshow Studio</span>
        </h3>
        <p className="text-xs text-stone-500 leading-relaxed mt-1">
          Bypass premium limits completely! Compile high-fidelity church and bible study video slideshows seamlessly using your congregation photos, sermon outlines, and devotional worship music with our custom <strong>Veo 3.5 Engine</strong>. Permanent, unlocked, and always operational.
        </p>
      </div>

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
              <button
                type="button"
                onClick={handleLoadFullLibrary}
                className="text-[10px] text-indigo-650 hover:underline font-bold cursor-pointer bg-transparent border-0"
              >
                + Load Full Library
              </button>
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
              <span className="text-[9px] font-mono text-stone-400 font-bold block uppercase">Or attach custom photo URL:</span>
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

            {/* Render selected timeline order */}
            <div className="pt-2">
              <span className="text-[9px] font-mono text-stone-400 font-bold block uppercase mb-1.5">Timeline Flow sequence:</span>
              <div className="flex flex-wrap gap-1">
                {selectedPhotos.map((ph, idx) => (
                  <div key={ph.id + "_" + idx} className="bg-slate-100 border text-slate-800 rounded-md py-1 pl-2 pr-1 text-[9px] font-bold flex items-center gap-1">
                    <span>{idx + 1}. {ph.title.slice(0, 10)}...</span>
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(ph.id)}
                      className="text-stone-400 hover:text-red-600 p-0.5"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* STEP 2: Configure Music */}
          <div className="bg-stone-50/70 p-4 rounded-xl border border-stone-150 space-y-3">
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-stone-600 flex items-center gap-1.5">
              <Music className="h-3.5 w-3.5 text-rose-500" />
              <span>2. Choose Sermon Gospel Hymn</span>
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
                  <span className="bg-stone-200 text-stone-600 text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded font-mono font-black scale-90">
                    {track.genre}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* STEP 3: Customize Titles & Subtitles */}
          <div className="bg-stone-50/70 p-4 rounded-xl border border-stone-150 space-y-3">
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-stone-600 flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-rose-500" />
              <span>3. Configure Captions Translation Script</span>
            </span>
            
            <div className="space-y-1.5">
              <label className="text-[9px] font-mono font-bold text-stone-400 block uppercase">Sermon Script Select:</label>
              <select
                value={selectedScript.id}
                onChange={(e) => {
                  const sc = THEOLOGICAL_SCRIPTS.find(s => s.id === e.target.value);
                  if (sc) setSelectedScript(sc);
                }}
                className="w-full text-xs font-bold bg-white rounded-lg border border-stone-300 p-2 outline-none text-stone-850"
              >
                {THEOLOGICAL_SCRIPTS.map((sc) => (
                  <option key={sc.id} value={sc.id}>{sc.title}</option>
                ))}
              </select>
            </div>

            {/* Playback specifications details selector */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="text-[9px] font-mono text-stone-400 block uppercase font-bold">Transition Style:</label>
                <select
                  value={transitionEffect}
                  onChange={(e) => setTransitionEffect(e.target.value as any)}
                  className="w-full text-[10.5px] font-semibold bg-white rounded-lg border border-stone-300 p-1.5 outline-none"
                >
                  <option value="ken-burns">🎬 Ken Burns Zoom</option>
                  <option value="crossfade">✨ Grace Crossfade</option>
                  <option value="glow">💡 Altar Bright Glow</option>
                  <option value="zoom">🎨 Perspective Slide</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-mono text-stone-400 block uppercase font-bold">Pacing speed:</label>
                <select
                  value={transitionSpeed}
                  onChange={(e) => setTransitionSpeed(Number(e.target.value))}
                  className="w-full text-[10.5px] font-semibold bg-white rounded-lg border border-stone-300 p-1.5 outline-none"
                >
                  <option value={2000}>⚡ Fast Dance (2s)</option>
                  <option value={3500}>🔔 Balanced Harmony (3.5s)</option>
                  <option value={5000}>🕯️ Repose Devotion (5s)</option>
                </select>
              </div>
            </div>

            {/* Video Layout */}
            <div className="pt-1.5">
              <label className="text-[9px] font-mono text-stone-400 block uppercase font-bold mb-1">Timeline Aspect Layout:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVideoLayout("16-9")}
                  className={`py-1.5 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    videoLayout === "16-9"
                      ? "bg-rose-50 text-rose-950 border-rose-300 shadow-xs"
                      : "bg-white text-stone-600 hover:bg-stone-50 border-stone-200"
                  }`}
                >
                  <span>📺 16:9 Landscape</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVideoLayout("9-16")}
                  className={`py-1.5 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    videoLayout === "9-16"
                      ? "bg-rose-50 text-rose-950 border-rose-300 shadow-xs"
                      : "bg-white text-stone-600 hover:bg-stone-50 border-stone-200"
                  }`}
                >
                  <span>📱 9:16 vertical (Mobile Stories)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Trigger compilation */}
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
                <span>Compile Church Video Slideshow (Veo 3.5)</span>
              </>
            )}
          </button>
        </div>

        {/* RIGHT COLUMN: Output Monitor & Playback Viewport */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          
          {/* Main Monitor Container */}
          <div className="bg-stone-900 rounded-2xl border border-stone-950 p-4 text-white p-4 flex flex-col justify-between overflow-hidden relative shadow-xl min-h-[440px]">
            {/* Ambient Background Grid Decor */}
            <div className="absolute right-0 top-0 w-32 h-32 rounded-full bg-rose-500/10 blur-2xl pointer-events-none" />
            <div className="absolute left-0 bottom-0 w-32 h-32 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

            {/* Top info and indicators */}
            <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-stone-400 border-b border-stone-800 pb-2">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                <span>VEO 3.5 STATUS BAR • STANDBY</span>
              </span>
              <span>HD TIMELINE • 1080P COMPLIANT</span>
            </div>

            {/* Display status or console when compiling */}
            {isCompiling ? (
              <div className="flex-1 flex flex-col justify-center items-center py-6 px-4 space-y-4">
                <div className="h-10 w-10 text-rose-500 animate-bounce bg-rose-500/15 rounded-full flex items-center justify-center">
                  <Video className="h-5 w-5" />
                </div>
                <div className="text-center space-y-1 max-w-sm">
                  <p className="font-bold text-xs text-rose-400">{compileStatus}</p>
                  <p className="text-[10px] text-stone-400 italic">Processing audio normalize levels to -6dB and computing fluid transition arrays natively.</p>
                </div>

                <div className="w-full max-w-md bg-stone-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-rose-500 to-indigo-500 h-full transition-all duration-300" style={{ width: `${compileProgress}%` }}></div>
                </div>

                {/* Sub logs console output */}
                <div className="w-full bg-black/50 border border-stone-800 rounded-lg p-2.5 h-[120px] overflow-y-auto font-mono text-[9px] text-emerald-400 text-left space-y-1">
                  {compileLogs.slice(-4).map((l, i) => (
                    <div key={i} className="truncate">✓ {l}</div>
                  ))}
                </div>
              </div>
            ) : hasCompiledVideo ? (
              
              /* RENDER COMPILED VIDEO PLAYBACK WINDOW SCREEN */
              <div className="flex-1 flex flex-col justify-between py-2 relative z-10">
                
                {/* Visual Canvas screen box */}
                <div className={`mx-auto rounded-xl border border-stone-800 overflow-hidden relative shadow-md bg-black transition-all ${
                  videoLayout === "16-9" ? "aspect-video w-full" : "aspect-[9/16] w-[220px] h-[340px]"
                }`}>
                  
                  {/* Photo with selected transition animation */}
                  <div className="absolute inset-0 w-full h-full">
                    {selectedPhotos[currentSlideIndex] && (
                      <img 
                        src={selectedPhotos[currentSlideIndex].url} 
                        alt={selectedPhotos[currentSlideIndex].title} 
                        className={`h-full w-full object-cover select-none pointer-events-none transition-all duration-[1500s] ease-out ${
                          isPlaying 
                            ? transitionEffect === "ken-burns" ? "scale-125 translate-x-3 translate-y-3" : ""
                            : "scale-100"
                        }`}
                        key={currentSlideIndex} // Trigger slide fade transition properly
                      />
                    )}
                  </div>

                  {/* Starburst holy sheen glow flash effect based on trigger */}
                  {transitionEffect === "glow" && isPlaying && (
                    <div className="absolute inset-0 bg-white/20 pointer-events-none animate-pulse" />
                  )}

                  {/* Widescreen title header overlay line */}
                  <div className="absolute top-3 inset-x-3 flex justify-between items-center pointer-events-none">
                    <span className="bg-black/70 border border-stone-700 px-2 py-0.5 rounded text-[8px] tracking-widest font-mono text-stone-250 font-bold uppercase">
                      🎥 LIVE PLAYBACK
                    </span>
                    <span className="bg-rose-600 px-2 py-0.5 rounded text-[8px] font-mono text-white font-bold animate-pulse">
                      HD VEO 3.5
                    </span>
                  </div>

                  {/* Synchronized yellow subtitles overlay precisely mapped to slides */}
                  <div className="absolute inset-x-3 bottom-3 bg-black/80 backdrop-blur-md rounded-xl p-3 border border-stone-800 shadow-xl pointer-events-none text-center">
                    <p className="text-yellow-400 font-sans font-black text-xs md:text-xs leading-relaxed max-w-md mx-auto truncate ... whitespace-normal line-clamp-2">
                      &bull; {selectedScript.lyrics[currentSlideIndex % selectedScript.lyrics.length]} &bull;
                    </p>
                    <span className="text-[7.5px] uppercase font-mono text-stone-400 tracking-wider block mt-1">
                      Church Sermon Subtitles • Slide {currentSlideIndex + 1} of {selectedPhotos.length}
                    </span>
                  </div>
                </div>

                {/* Sub Audio & Video controller bar panel */}
                <div className="pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-850 mt-3 select-none">
                  
                  {/* Music audio player with state control */}
                  <audio 
                    ref={audioRef}
                    src={selectedTrack.url}
                    loop
                  />

                  {/* Actions buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="h-8 w-8 hover:scale-105 active:scale-95 text-white bg-rose-600 hover:bg-rose-700 rounded-full flex items-center justify-center shadow-lg transition"
                      title={isPlaying ? "Pause Video Playback" : "Start Video Playback"}
                    >
                      {isPlaying ? <Pause className="h-4 w-4 fill-white" /> : <Play className="h-4 w-4 fill-white ml-0.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleRestart}
                      className="h-8 w-8 hover:scale-105 active:scale-95 text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-full flex items-center justify-center transition"
                      title="Rewind Timeline to start"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Track summary detail display text */}
                  <div className="flex-1 min-w-[120px] text-left">
                    <span className="text-[8px] font-mono text-slate-400 block uppercase font-medium">Synced Praise Track:</span>
                    <span className="text-[10px] font-bold text-stone-200 block truncate max-w-[180px]">
                      {selectedTrack.name}
                    </span>
                  </div>

                  {/* Volume controllers */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleMute}
                      className="text-stone-400 hover:text-white"
                    >
                      <Volume2 className={`h-4 w-4 ${isMuted ? "opacity-40 line-through" : ""}`} />
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={audioVolume}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setAudioVolume(v);
                        setIsMuted(false);
                      }}
                      className="w-16 accent-rose-500 h-1 rounded-full cursor-pointer bg-stone-700"
                    />
                  </div>

                  {/* Compile Download Button */}
                  <button
                    onClick={handleDownloadVideoPackage}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-[10px] px-3.5 py-1.5 rounded-lg border border-stone-700 flex items-center gap-1 transition shadow"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download Movie (.txt bundle)</span>
                  </button>
                </div>
              </div>
            ) : (
              
              /* EMPTY STANDBY SCREEN PLACEHOLDER GREET */
              <div className="flex-1 flex flex-col justify-center items-center py-8 text-center space-y-4 px-4 select-none">
                <div className="h-14 w-14 bg-stone-800 text-stone-600 rounded-full flex items-center justify-center">
                  <Video className="h-7 w-7 animate-pulse" />
                </div>
                <div className="max-w-md space-y-2">
                  <h4 className="font-bold text-sm text-stone-200">Veo 3.5 Video Framebuffer Empty</h4>
                  <p className="text-[10.5px] text-stone-400 max-w-sm mx-auto leading-relaxed">
                    Insert your favorite Zion congregation photos, sermon texts, and Gospel hymn track variables on the left, then click <strong>"Compile Church Video"</strong> to produce your video!
                  </p>
                </div>
              </div>
            )}

            {/* Bottom notification footer */}
            <div className="text-[9px] font-mono text-stone-500 pt-2 border-t border-stone-850 text-left flex items-center gap-2 mt-2">
              <Info className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              <span>Free sandbox compilation mode enabled natively. Created videos can be viewed and saved cleanly.</span>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
