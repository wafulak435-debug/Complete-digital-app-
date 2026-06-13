import React, { useState, useRef, useEffect } from "react";
import { 
  Compass, RotateCw, ZoomIn, ZoomOut, Maximize2, Minimize2, 
  Layers, Sun, Sparkles, Moon, Award, Info, BookOpen, ChevronLeft, ChevronRight, Play, Pause, RefreshCcw, Eye, Contrast
} from "lucide-react";
import { Book } from "../types";
import { INITIAL_BOOKS } from "../data";

interface BookThreedViewerProps {
  books?: Book[];
  onSelectBook?: (book: Book) => void;
}

type LightPreset = "daylight" | "sunset" | "cyberpunk" | "candlelight";
type ShapePreset = "book" | "cube" | "canvas" | "cylinder";

export default function BookThreedViewer({ books = INITIAL_BOOKS }: BookThreedViewerProps) {
  // Navigation & books data
  const [selectedBook, setSelectedBook] = useState<Book>(books[0] || INITIAL_BOOKS[0]);
  
  // Keep selectedBook synchronized dynamically with incoming books array
  useEffect(() => {
    if (books && books.length > 0) {
      if (!selectedBook || !books.some((b) => b.id === selectedBook.id)) {
        setSelectedBook(books[0]);
      }
    } else {
      setSelectedBook(null as any);
    }
  }, [books]);

  // 3D parameters
  const [rotateX, setRotateX] = useState<number>(-12);
  const [rotateY, setRotateY] = useState<number>(25);
  const [rotateZ, setRotateZ] = useState<number>(0);
  const [perspective, setPerspective] = useState<number>(1000);
  const [bookThickness, setBookThickness] = useState<number>(45); // Thick paperback look
  const [bookScale, setBookScale] = useState<number>(1.0);
  const [isOpen, setIsOpen] = useState<boolean>(false); // Open book/split pages fold anim
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [autoRotateSpeed, setAutoRotateSpeed] = useState<number>(1); // Speed index
  
  // Custom texture settings
  const [lightPreset, setLightPreset] = useState<LightPreset>("daylight");
  const [activeShape, setActiveShape] = useState<ShapePreset>("book");
  
  // Custom image texture upload url (allows wrapping arbitrary assets in 3D!)
  const [customAssetUrl, setCustomAssetUrl] = useState<string>("");
  const [useCustomAsset, setUseCustomAsset] = useState<boolean>(false);

  // High-Contrast and Ambient-Soft studio lighting toggle state
  const [highContrastMode, setHighContrastMode] = useState<boolean>(false);

  // Custom Cover Generator with Advanced AI 3.5 states
  const [wrapMode, setWrapMode] = useState<"url" | "ai">("ai"); // Default to Advanced AI as user emphasized
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [aiStyle, setAiStyle] = useState<string>("photorealistic");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Mouse drag capture refs
  const isDragging = useRef<boolean>(false);
  const previousX = useRef<number>(0);
  const previousY = useRef<number>(0);
  const autoRotateTimer = useRef<number | null>(null);

  // Auto rotation engine loops
  useEffect(() => {
    if (autoRotate && !isDragging.current) {
      const interval = setInterval(() => {
        setRotateY((y) => (y + 0.4 * autoRotateSpeed) % 360);
      }, 16);
      return () => clearInterval(interval);
    }
  }, [autoRotate, autoRotateSpeed]);

  // Drag interaction handlers
  const handleStartDrag = (clientX: number, clientY: number) => {
    isDragging.current = true;
    previousX.current = clientX;
    previousY.current = clientY;
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging.current) return;
    const deltaX = clientX - previousX.current;
    const deltaY = clientY - previousY.current;

    setRotateY((y) => y + deltaX * 0.5);
    setRotateX((x) => Math.max(-60, Math.min(60, x - deltaY * 0.5)));

    previousX.current = clientX;
    previousY.current = clientY;
  };

  const handleEndDrag = () => {
    isDragging.current = false;
  };

  // Mouse event wrappers
  const onMouseDown = (e: React.MouseEvent) => {
    handleStartDrag(e.clientX, e.clientY);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    handleDragMove(e.clientX, e.clientY);
  };

  const onMouseUpOrLeave = () => {
    handleEndDrag();
  };

  // Touch event wrappers (for mobile support)
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      handleStartDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const onTouchEnd = () => {
    handleEndDrag();
  };

  // Light theme mappings (returns CSS classes and styled visual overlays)
  const getLightingStyles = () => {
    let base = {
      roomBg: "bg-gradient-to-tr from-slate-100 via-stone-50 to-slate-200",
      cardFilter: "from-white/40 via-white/10 to-transparent",
      boxShadow: "rgba(0,0,0,0.18) 0px 25px 50px -12px, rgba(0,0,0,0.08) 0px 10px 15px -3px",
      lightingGlow: "bg-white/60 blur-2xl radial-gradient-sun",
      ambientColor: "rgba(255, 255, 255, 0.45)",
      description: "Studio Soft Light: Simulates beautiful overhead warm gallery ambient sun. Produces realistic white page edges and subtle back card diffusion."
    };

    switch (lightPreset) {
      case "daylight":
        base = {
          roomBg: "bg-gradient-to-tr from-slate-100 via-stone-100 to-slate-200",
          cardFilter: "from-white/40 via-white/10 to-transparent",
          boxShadow: "rgba(0,0,0,0.18) 0px 25px 50px -12px, rgba(0,0,0,0.08) 0px 10px 15px -3px",
          lightingGlow: "bg-white/60 blur-2xl radial-gradient-sun",
          ambientColor: "rgba(255, 255, 255, 0.45)",
          description: "Studio Soft Light: Simulates beautiful overhead warm gallery ambient sun. Produces realistic white page edges and subtle back card diffusion."
        };
        break;
      case "sunset":
        base = {
          roomBg: "bg-gradient-to-tr from-orange-100/40 via-amber-50 to-amber-100",
          cardFilter: "from-amber-500/30 via-amber-300/10 to-transparent",
          boxShadow: "rgba(217,119,6,0.2) 0px 20px 40px, rgba(0,0,0,0.1) 0px 10px 15px",
          lightingGlow: "bg-amber-400/25 blur-3xl opacity-80",
          ambientColor: "rgba(251, 191, 36, 0.25)",
          description: "Golden Hour Glow: Casts warm amber daylight streams from the side. Highlights gold tones on spines and accentuates book height ridges."
        };
        break;
      case "cyberpunk":
        base = {
          roomBg: "bg-gradient-to-tr from-[#0b0c1b] via-[#02020e] to-[#120e23]",
          cardFilter: "from-fuchsia-500/30 via-cyan-500/10 to-transparent",
          boxShadow: "rgba(240,46,170,0.3) 0px 15px 35px -5px, rgba(0,243,255,0.2) 0px 10px 20px -2px",
          lightingGlow: "bg-purple-605/45 blur-3xl",
          ambientColor: "rgba(240, 46, 170, 0.15)",
          description: "Cyberpunk Matrix: Projects immersive fluorescent purple and neon cyan spotlights. Outstanding for sci-fi covers and glowing digital covers."
        };
        break;
      case "candlelight":
        base = {
          roomBg: "bg-gradient-to-tr from-stone-900 via-stone-950 to-neutral-900",
          cardFilter: "from-yellow-600/25 via-yellow-905/10 to-transparent",
          boxShadow: "0 25px 60px -15px rgba(217,119,6,0.15)",
          lightingGlow: "bg-yellow-600/10 blur-3xl",
          ambientColor: "rgba(245, 158, 11, 0.08)",
          description: "Scholar Study Candle: Low-intensity, hyper-focused warm torch. Elegant shadows build mysterious aesthetic depths suitable for old scriptures."
        };
        break;
    }

    if (highContrastMode) {
      return {
        ...base,
        cardFilter: "from-white/70 via-white/30 to-transparent",
        imgStyle: { filter: "contrast(1.35) brightness(1.1) saturate(1.2)" },
        roomBg: "bg-gradient-to-tr from-stone-950 via-neutral-900 to-stone-900",
        lightingGlow: "bg-indigo-400/20 blur-2xl",
        description: `High-Contrast Mode: Sharp, ultra-defined detail highlights enabled (${base.description.split(":")[0]} preset). Outlines spine and texture structure clearly.`
      };
    } else {
      return {
        ...base,
        imgStyle: { filter: "contrast(1.0) brightness(1.0) saturate(1.0)" },
        description: `Ambient-Soft Mode: ${base.description}`
      };
    }
  };

  const currentLighting = getLightingStyles();
  const currentAssetImage = useCustomAsset && customAssetUrl ? customAssetUrl : selectedBook?.coverImage;

  // Custom text handler
  const handleAssetUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customAssetUrl.trim().startsWith("http") || customAssetUrl.trim().startsWith("data:")) {
      setUseCustomAsset(true);
      alert("Successfully applied custom external visual asset texture!");
    } else {
      alert("Must configure a valid URL (starting with http://, https://, or data: base64!)");
    }
  };

  // Generate Custom Cover with Advanced AI 3.5 Engine
  const handleGenerateAICover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) {
      alert("Please provide an AI prompt to generate a custom book cover.");
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      // Build high-end professional descriptive modifier to ensure quality photos/vectors and absolutely deny emojis
      const optimizedPrompt = `A premium, professional book cover, high resolution, dramatic lighting, award-winning illustration style, no cartoony look, no emojis: "${aiPrompt.trim()}"`;

      const response = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: optimizedPrompt,
          aspectRatio: "3:4" // portrait book format
        })
      });

      const data = await response.json();
      if (data.success && data.imageUrl) {
        setCustomAssetUrl(data.imageUrl);
        setUseCustomAsset(true);
        alert("🎨 Successfully synthesized and wrapped custom cover with Advanced AI 3.5!");
      } else {
        throw new Error(data.error || "No valid cover image visual returned from AI server.");
      }
    } catch (err: any) {
      console.error(err);
      setGenerationError(err.message || "Synthesizing failure.");
      alert(`Advanced AI 3.5 Synthesis Failed: ${err.message || "Offline mood default."}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResetDimensions = () => {
    setRotateX(-12);
    setRotateY(25);
    setRotateZ(0);
    setPerspective(1000);
    setBookThickness(45);
    setBookScale(1.0);
    setIsOpen(false);
    setAutoRotate(true);
  };

  if (!selectedBook) {
    return (
      <div id="ai_3d_asset_room_container" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8 select-none text-left">
        <div className="rounded-2xl bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 text-left shadow-2xl relative overflow-hidden">
          <div className="relative z-10 space-y-3">
            <span className="bg-teal-500/20 text-teal-200 border border-teal-400/30 font-mono text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
              INTERACTIVE WEBGL & CSS3D ROOM
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight font-display">
              3D Interactive Book Loft
            </h2>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center p-12 text-center text-stone-500 font-mono space-y-3 py-24 bg-stone-55 rounded-2xl border border-dashed border-stone-200 shadow-xs">
          <BookOpen className="h-10 w-10 text-stone-300 mx-auto animate-pulse" />
          <h4 className="font-bold text-stone-800 text-xs uppercase text-slate-950">No catalog books available in store</h4>
          <p className="text-[11px] max-w-sm mx-auto text-stone-450 leading-relaxed">
            Please navigate to the Admin Console to upload custom books onto the digital library.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="ai_3d_asset_room_container" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8 select-none text-left">
      
      {/* Dynamic Immersive Header */}
      <div className="rounded-2xl bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 text-left shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 h-40 w-40 transform translate-x-12 -translate-y-12 opacity-15 rounded-full border-[20px] border-teal-400 animate-spin duration-1000" />
        <div className="relative z-10 space-y-3">
          <span className="bg-teal-500/20 text-teal-200 border border-teal-400/30 font-mono text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
            INTERACTIVE WEBGL & CSS3D ROOM
          </span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight font-display">
            3D Interactive Book Loft
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Manipulate digital books and synthesized AI cover assets in dynamic, hardware-accelerated 3D space. Drag the mouse or touch to rotate 360°, open pages, and adjust ambient studio lights.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        
        {/* LEFT COLUMN: ACTIVE CONTROL & TEXTURE SETUP PANEL */}
        <div className="lg:col-span-5 flex flex-col space-y-5">
          
          {/* 3D Catalog Selector */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5 border-b pb-2">
              <BookOpen className="h-4 w-4 text-teal-600" />
              <span>Select Cover Texture ({books.length})</span>
            </h3>

            <div className="grid grid-cols-5 gap-2 max-h-[160px] overflow-y-auto pr-1">
              {books.map((b) => {
                const isCurrent = !useCustomAsset && selectedBook.id === b.id;
                return (
                  <button
                    key={b.id}
                    title={b.title}
                    onClick={() => {
                      setSelectedBook(b);
                      setUseCustomAsset(false);
                      setIsOpen(false);
                    }}
                    className={`aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all relative group ${
                      isCurrent ? "border-teal-505 border-teal-650 border-teal-650 scale-95 shadow-md ring-2 ring-teal-500/20" : "border-stone-150 hover:border-slate-400"
                    }`}
                  >
                    <img 
                      src={b.coverImage} 
                      alt={b.title} 
                      className="w-full h-full object-contain bg-stone-50"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                      <span className="text-[10px] text-white font-black font-mono">LOAD</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Cover Customization Engine: URL Wrapper & Advanced AI 3.5 Generator */}
            <div className="pt-3 border-t space-y-3 text-left">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wide">
                  Cover Creation & Custom wrapping
                </label>
                <select
                  value={wrapMode}
                  onChange={(e) => setWrapMode(e.target.value as "url" | "ai")}
                  className="w-full text-xs font-bold text-stone-700 bg-stone-50 rounded-lg border border-stone-200 p-2 outline-none focus:border-teal-500 transition"
                >
                  <option value="ai">Generate Custom Cover with Advanced AI 3.5</option>
                  <option value="url">Wrap with Custom Photo URL</option>
                </select>
              </div>

              {wrapMode === "url" ? (
                <form onSubmit={handleAssetUrlSubmit} className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customAssetUrl}
                      onChange={(e) => setCustomAssetUrl(e.target.value)}
                      placeholder="Paste Unsplash link or image link..."
                      className="w-full rounded-lg border border-stone-200 bg-stone-50 p-2 outline-none text-xs text-stone-850"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-3.5 transition shrink-0"
                    >
                      Wrap URL
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleGenerateAICover} className="space-y-2.5">
                  <div className="space-y-1">
                    <textarea
                      rows={2}
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Input cover concepts: 'An ancient golden bible on a dark rich background, hyperrealistic'"
                      className="w-full rounded-lg border border-stone-200 bg-stone-50 p-2 outline-none text-xs text-stone-850 placeholder:text-stone-400 leading-normal"
                    />
                  </div>
                  
                  <div className="flex gap-2 items-center">
                    <div className="flex-1 space-y-0.5">
                      <span className="text-[9px] uppercase tracking-widest font-mono text-stone-500 block">Cover Preset Style</span>
                      <select
                        value={aiStyle}
                        onChange={(e) => setAiStyle(e.target.value)}
                        className="w-full text-[11px] font-semibold text-stone-600 bg-stone-100 rounded-md border border-stone-200 p-1 outline-none"
                      >
                        <option value="photorealistic">Photorealistic Studio (Default)</option>
                        <option value="digital vector graphic">Minimalist Vector (Clean lineart)</option>
                        <option value="classic oil painting">Hand-painted Oil (Retro elegance)</option>
                        <option value="dramatic futuristic neon">Futuristic Glow (Ultra high-contrast)</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={isGenerating}
                      className="rounded-lg bg-purple-700 hover:bg-purple-800 disabled:bg-stone-300 text-white text-xs font-black px-4 py-2 mt-3.5 flex items-center gap-1 transition self-end h-[34px] shrink-0 font-mono"
                    >
                      {isGenerating ? (
                        <span className="animate-pulse">Synthesizing...</span>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3 animate-pulse" />
                          <span>Generate</span>
                        </>
                      )}
                    </button>
                  </div>

                  {generationError && (
                    <p className="text-[10px] text-red-600 font-semibold bg-red-50 p-1.5 rounded">{generationError}</p>
                  )}
                </form>
              )}

              {useCustomAsset && (
                <div className="flex justify-between items-center text-[10px] bg-teal-50 text-teal-800 p-2 rounded-lg border border-teal-100 transition">
                  <span className="font-semibold">Using custom synthesized cover image</span>
                  <button 
                    type="button" 
                    onClick={() => {
                      setUseCustomAsset(false);
                      setCustomAssetUrl("");
                    }}
                    className="underline text-stone-500 font-bold hover:text-red-700 transition"
                  >
                    Reset Cover
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Setup controls */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex justify-between items-center border-b pb-2">
              <span>Model & Dimension Mechanics</span>
              <button 
                onClick={handleResetDimensions}
                className="text-[9px] font-bold tracking-widest text-[#2563eb] font-mono hover:underline flex items-center space-x-1"
                title="Reset Rotation & values"
              >
                <RefreshCcw className="h-3 w-3" />
                <span>Default</span>
              </button>
            </h3>

            {/* Shape Selectors */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wide text-stone-550">
                Active 3D Shape Primitive
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(["book", "cube", "canvas", "cylinder"] as ShapePreset[]).map((shape) => (
                  <button
                    key={shape}
                    onClick={() => {
                      setActiveShape(shape);
                      setIsOpen(false);
                    }}
                    className={`rounded-lg py-1.5 text-[10px] font-bold uppercase tracking-wide transition-all border ${
                      activeShape === shape
                        ? "bg-teal-600 border-teal-600 text-white font-black"
                        : "bg-stone-50 border-stone-200 text-stone-550 hover:bg-stone-100 hover:text-stone-800"
                    }`}
                  >
                    {shape}
                  </button>
                ))}
              </div>
            </div>

            {/* Thickness and Dimensions */}
            <div className="space-y-3.5 pt-1">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-stone-500 font-mono">
                  <span>DEPTH / THICKNESS</span>
                  <span>{bookThickness}px</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="120"
                  value={bookThickness}
                  onChange={(e) => setBookThickness(parseInt(e.target.value))}
                  className="w-full h-1 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-teal-600"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-stone-500 font-mono">
                  <span>SCALE FACTOR</span>
                  <span>{bookScale.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={bookScale}
                  onChange={(e) => setBookScale(parseFloat(e.target.value))}
                  className="w-full h-1 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-teal-600"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-stone-500 font-mono">
                  <span>PERSPECTIVE DISTANCE</span>
                  <span>{perspective}px</span>
                </div>
                <input
                  type="range"
                  min="400"
                  max="2000"
                  value={perspective}
                  onChange={(e) => setPerspective(parseInt(e.target.value))}
                  className="w-full h-1 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-teal-600"
                />
              </div>
            </div>

            {/* Animation Options */}
            <div className="pt-2 border-t grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAutoRotate(!autoRotate)}
                className={`flex items-center justify-center space-x-1.5 rounded-lg py-2.5 text-xs font-bold border transition ${
                  autoRotate
                    ? "bg-indigo-50 border-indigo-200 text-indigo-705 text-indigo-700"
                    : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
              >
                {autoRotate ? (
                  <>
                    <Pause className="h-3.5 w-3.5" />
                    <span>Stop Auto-Spin</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" />
                    <span>Run Orbit-Spin</span>
                  </>
                )}
              </button>

              {activeShape === "book" && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(!isOpen);
                    setAutoRotate(false);
                  }}
                  className={`flex items-center justify-center space-x-1.5 rounded-lg py-2.5 text-xs font-bold border transition ${
                    isOpen
                      ? "bg-[#ecfdf5] border-emerald-200 text-emerald-805 text-emerald-700"
                      : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>{isOpen ? "Close Pages" : "Flap / Open Book"}</span>
                </button>
              )}
            </div>

            {/* Auto orbit control slider */}
            {autoRotate && (
              <div className="space-y-1 bg-stone-50/50 p-2 rounded border border-stone-150 text-left">
                <div className="flex justify-between text-[9px] font-extrabold uppercase text-stone-400 font-mono">
                  <span>Orbit Speed Multiplier</span>
                  <span>{autoRotateSpeed}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.5"
                  value={autoRotateSpeed}
                  onChange={(e) => setAutoRotateSpeed(parseFloat(e.target.value))}
                  className="w-full h-1 cursor-pointer accent-indigo-600"
                />
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: THE DYNAMIC 3D CANVAS LAB & LIGHT SETTINGS */}
        <div className="lg:col-span-12 xl:col-span-7 flex flex-col space-y-4">
          
          {/* Light presets selector */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm flex flex-col md:flex-row gap-4 md:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center space-x-1 shrink-0">
                <Sun className="h-4 w-4 text-amber-500" />
                <span>Studio Lighting Rig Preset</span>
              </span>
              
              <div className="flex flex-wrap gap-1">
                {(["daylight", "sunset", "cyberpunk", "candlelight"] as LightPreset[]).map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setLightPreset(preset)}
                    className={`capitalize px-2.5 py-1.5 text-[11px] font-bold rounded-lg border transition ${
                      lightPreset === preset
                        ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                        : "bg-stone-50 border-stone-150 text-stone-500 hover:bg-stone-100 hover:text-slate-800"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* High-Contrast vs Ambient-Soft Toggle switch */}
            <div className="flex items-center space-x-2 border-t md:border-t-0 pt-2.5 md:pt-0 shrink-0 select-none">
              <span className="text-[10px] uppercase font-bold text-stone-400 font-mono">Contrast Preset</span>
              
              <div className="flex items-center rounded-xl bg-stone-100 p-1 border">
                <button
                  onClick={() => setHighContrastMode(false)}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all flex items-center space-x-1 ${
                    !highContrastMode
                      ? "bg-white text-teal-700 shadow-xs ring-1 ring-black/5 font-extrabold"
                      : "text-stone-500 hover:text-stone-800"
                  }`}
                  title="Soft ambient shadows"
                >
                  <Eye className="h-3 w-3" />
                  <span>Ambient-Soft</span>
                </button>
                <button
                  onClick={() => setHighContrastMode(true)}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all flex items-center space-x-1 ${
                    highContrastMode
                      ? "bg-indigo-600 text-white shadow-xs font-extrabold"
                      : "text-stone-500 hover:text-stone-850"
                  }`}
                  title="Intense highlights on spine & cover details"
                >
                  <Contrast className="h-3 w-3" />
                  <span>High-Contrast</span>
                </button>
              </div>
            </div>
          </div>

          {/* THE 3D INTERACTIVE ROOM VIEWPORT */}
          <div 
            id="the_3d_render_viewport"
            className={`rounded-3xl border border-stone-250 min-h-[460px] relative overflow-hidden transition-all duration-700 flex flex-col justify-center items-center shadow-lg cursor-grab active:cursor-grabbing ${currentLighting.roomBg}`}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUpOrLeave}
            onMouseLeave={onMouseUpOrLeave}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{
              perspective: `${perspective}px`
            }}
          >
            {/* Ambient Background Light Vignette */}
            <div 
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-80 rounded-full transition-all duration-750 pointer-events-none ${currentLighting.lightingGlow}`} 
            />

            {/* Controls Info overlay text */}
            <div className="absolute top-4 left-4 z-10 text-left space-y-1 bg-stone-900/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/20 select-nonepointer-events-none max-w-xs sm:max-w-sm">
              <span className="text-[9px] font-black uppercase text-[#1e293b] font-mono tracking-widest block">Active Specs</span>
              <p className="text-[10px] text-slate-800 font-extrabold truncate">
                {useCustomAsset ? "Custom Custom Wrapped Asset File" : selectedBook.title}
              </p>
              <p className="text-[9px] text-stone-600 font-semibold leading-normal">
                {currentLighting.description}
              </p>
            </div>

            {/* Spatial compass label */}
            <div className="absolute bottom-4 left-4 text-xs font-mono font-black text-slate-500 pointer-events-none select-none">
              ROT_X: {rotateX.toFixed(0)}° &nbsp; ROT_Y: {rotateY.toFixed(0)}°
            </div>

            {/* Instruction bubble */}
            <div className="absolute bottom-4 right-4 text-[9px] font-bold bg-white/70 backdrop-blur-md border px-2.5 py-1 rounded-full text-slate-500 pointer-events-none select-none flex items-center gap-1">
              <Compass className="h-3 w-3 text-slate-400" />
              <span>Drag or swipe to rotate model in 3D</span>
            </div>

            {/* 3D CORE OBJECT STAGE */}
            <div
              id="the_3d_mesh"
              className="transition-transform duration-100 ease-out"
              style={{
                transformStyle: "preserve-3d",
                transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale(${bookScale})`,
                width: "210px",
                height: "295px"
              }}
            >
              {/* RENDER SHAPE 1: THE REALISTIC BOOK MODEL */}
              {activeShape === "book" && (
                <div 
                  className="w-full h-full relative"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  
                  {/* Spine Face (Thickness left border) */}
                  <div
                    className="absolute top-0 left-0 h-full border-r border-[#1e293b]/20 flex flex-col items-center justify-center text-white"
                    style={{
                      width: `${bookThickness}px`,
                      backgroundColor: "#1e293b",
                      transformStyle: "preserve-3d",
                      transform: `rotateY(-90deg) translateZ(${bookThickness / 2}px)`,
                      boxShadow: "inset -5px 0 25px rgba(0,0,0,0.4)",
                      backgroundImage: `linear-gradient(90deg, #0f172a 0%, #1e293b 85%, #334155 100%)`
                    }}
                  >
                    {/* Spine writing */}
                    <div 
                      className="font-mono text-[7px] font-black uppercase tracking-widest leading-none rotate-90 truncate max-w-[210px]"
                      style={{ backfaceVisibility: "hidden" }}
                    >
                      {useCustomAsset ? "CREATIVE AI WRAPPED" : selectedBook.title.toUpperCase()} • {selectedBook.author.toUpperCase()}
                    </div>
                  </div>

                  {/* Inside left sheet wrapper (only visible when book flips open!) */}
                  {isOpen && (
                    <div
                      className="absolute inset-0 bg-stone-100 p-5 border border-stone-200 text-slate-800 outline-none text-left"
                      style={{
                        transform: `rotateY(-140deg)`,
                        transformOrigin: "left center",
                        boxShadow: "inset 0 0 35px rgba(0,0,0,0.08)",
                        borderRadius: "3px 0 0 3px",
                        backfaceVisibility: "visible",
                        transition: "transform 1.1s cubic-bezier(0.2, 0.8, 0.2, 1)"
                      }}
                    >
                      <div className="space-y-4">
                        <span className="font-mono text-[8px] text-teal-700 font-extrabold uppercase bg-teal-50 px-2 py-0.5 rounded border">
                          Study Materials Highlights
                        </span>
                        <h4 className="text-xs font-bold leading-tight font-display text-slate-900 border-b pb-1">
                          {selectedBook.title}
                        </h4>
                        <p className="text-[9px] text-stone-605 leading-relaxed italic pr-4">
                          "Inspiration fuels wisdom in modern scholarship. Let this serve as a foundational pillar for regional empowerment and digital literacy."
                        </p>
                        <div className="text-[8px] font-mono text-stone-400">
                          ISBN: 978-BUNGOMA-2026<br />
                          Pages count: {selectedBook.pages || 140}<br />
                          Publisher: Kelvin Opara Wafula
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Front Cover page Face (Transforms beautifully if open) */}
                  <div
                    className="absolute inset-0 rounded-r overflow-hidden shadow-2xl relative"
                    style={{
                      transformOrigin: "left center",
                      transform: isOpen ? `rotateY(-25deg)` : `translateZ(${bookThickness / 2}px)`,
                      backfaceVisibility: "visible",
                      transition: "transform 1.1s cubic-bezier(0.2, 0.8, 0.2, 1)"
                    }}
                  >
                    {/* Cover Texture */}
                    <img
                      src={currentAssetImage}
                      alt={selectedBook.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      style={currentLighting.imgStyle}
                    />

                    {/* Gradient sheen overlay depending on perspective light */}
                    <div 
                      className={`absolute inset-0 bg-gradient-to-tr mix-blend-overlay ${currentLighting.cardFilter}`} 
                    />

                    {/* Left book binding thick hinge shadow */}
                    <div className="absolute top-0 left-0 w-3 h-full bg-black/25 blur-[1px]" />
                    <div className="absolute top-0 left-3 w-1.5 h-full bg-white/10" />

                    {/* Little Gold Medal Seal Badge for professional looks */}
                    {selectedBook.isFeatured && (
                      <div className="absolute top-3 right-3 bg-amber-500/90 text-amber-950 px-2 py-1 rounded border border-amber-300 shadow flex items-center space-x-0.5 select-none scale-85">
                        <Award className="h-3 w-3 animate-pulse" />
                        <span className="font-mono text-[7px] font-extrabold">PREMIUM STOCK</span>
                      </div>
                    )}
                  </div>

                  {/* Back Cover page Face */}
                  <div
                    className="absolute inset-0 rounded-l overflow-hidden bg-slate-900 text-slate-100 flex flex-col justify-between p-4 outline-none border-l bg-linear-to-b from-[#1e293b] to-[#0f172a]"
                    style={{
                      transform: `rotateY(180deg) translateZ(${bookThickness / 2}px)`,
                      boxShadow: "-10px 0 25px rgba(0,0,0,0.3)"
                    }}
                  >
                    <div className="space-y-3.5 text-left pt-2">
                      <span className="bg-slate-800 text-slate-350 p-1 rounded font-mono text-[7px] font-extrabold uppercase tracking-widest">
                        DIGITAL BACKSTAGE
                      </span>
                      <h4 className="text-[10px] font-bold tracking-tight text-white leading-tight">
                        {useCustomAsset ? "Interactive Poster Spec" : selectedBook.title}
                      </h4>
                      <p className="text-[8px] text-slate-400 leading-normal line-clamp-6">
                        {selectedBook.description}
                      </p>
                    </div>

                    <div className="flex justify-between items-center border-t border-slate-800 pt-2 text-[7px] font-mono text-slate-500">
                      <span>PRICE: KES {selectedBook.price}</span>
                      <span>WAFULA PUBLISHING</span>
                    </div>
                  </div>

                  {/* Page leaf blocks (Right side thick paper margins) */}
                  <div
                    className="absolute top-1 right-0 h-[98%]"
                    style={{
                      width: `${bookThickness - 2}px`,
                      backgroundColor: "#f4f4f0",
                      transform: `rotateY(90deg) translateZ(105px)`,
                      transformStyle: "preserve-3d",
                      backgroundImage: `repeating-linear-gradient(90deg, #f4f4f0, #e7e7e2 2px, #f4f4f0 4px)`
                    }}
                  />

                  {/* Top page leaf block (Thin paper top thickness margins) */}
                  <div
                    className="absolute top-0 left-1 w-[98%]"
                    style={{
                      height: `${bookThickness - 2}px`,
                      backgroundColor: "#f4f4f0",
                      transform: `rotateX(90deg) translateZ(5px)`,
                      transformStyle: "preserve-3d",
                      backgroundImage: `repeating-linear-gradient(90deg, #f4f4f0, #e7e7e2 2px, #f4f4f0 4px)`
                    }}
                  />

                  {/* Bottom page leaf block (Thin paper bottom thickness margins) */}
                  <div
                    className="absolute bottom-0 left-1 w-[98%]"
                    style={{
                      height: `${bookThickness - 2}px`,
                      backgroundColor: "#f4f4f0",
                      transform: `rotateX(-90deg) translateZ(285px)`,
                      transformStyle: "preserve-3d",
                      backgroundImage: `repeating-linear-gradient(90deg, #f4f4f0, #e7e7e2 2px, #f4f4f0 4px)`
                    }}
                  />
                </div>
              )}

              {/* RENDER SHAPE 2: THE 3D ISOMETRIC CUBE BOX */}
              {activeShape === "cube" && (
                <div 
                  className="w-full h-full relative"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {/* Front */}
                  <div
                    className="absolute inset-0 bg-slate-800 rounded"
                    style={{
                      transform: `translateZ(${bookThickness}px)`,
                      backfaceVisibility: "visible"
                    }}
                  >
                    <img src={currentAssetImage} className="w-full h-full object-cover" style={currentLighting.imgStyle} />
                  </div>

                  {/* Back */}
                  <div
                    className="absolute inset-0 bg-stone-900 border text-slate-300 flex items-center justify-center font-mono font-bold text-xs"
                    style={{
                      transform: `rotateY(180deg) translateZ(${bookThickness}px)`
                    }}
                  >
                    <img src={currentAssetImage} className="w-full h-full object-cover opacity-50 blur-[1px]" />
                    <div className="absolute bg-black/60 p-2 text-center rounded text-white text-[9px] max-w-[160px] leading-tight">
                      {selectedBook.title}
                    </div>
                  </div>

                  {/* Right Face */}
                  <div
                    className="absolute top-0 right-0 h-full bg-slate-950 text-white"
                    style={{
                      width: `${bookThickness * 2}px`,
                      transform: `rotateY(90deg) translateZ(${bookThickness}px)`
                    }}
                  >
                    <img src={currentAssetImage} className="h-full w-full object-cover saturate-50 brightness-40" />
                  </div>

                  {/* Left Face */}
                  <div
                    className="absolute top-0 left-0 h-full bg-slate-950 text-white font-mono"
                    style={{
                      width: `${bookThickness * 2}px`,
                      transform: `rotateY(-90deg) translateZ(${bookThickness}px)`
                    }}
                  >
                    <img src={currentAssetImage} className="h-full w-full object-cover saturate-50 brightness-34" />
                  </div>

                  {/* Top Face */}
                  <div
                    className="absolute top-0 left-0 w-full bg-slate-950 text-white"
                    style={{
                      height: `${bookThickness * 2}px`,
                      transform: `rotateX(90deg) translateZ(${bookThickness}px)`
                    }}
                  >
                    <div className="w-full h-full bg-gradient-to-b from-teal-500/25 to-transparent" />
                  </div>

                  {/* Bottom Face */}
                  <div
                    className="absolute bottom-0 left-0 w-full bg-slate-950 text-white"
                    style={{
                      height: `${bookThickness * 2}px`,
                      transform: `rotateX(-90deg) translateZ(${bookThickness}px)`
                    }}
                  >
                    <div className="w-full h-full bg-black/60" />
                  </div>
                </div>
              )}

              {/* RENDER SHAPE 3: FLAT CANVAS ARTWORK FRAME */}
              {activeShape === "canvas" && (
                <div 
                  className="w-full h-full relative"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {/* Outer shadow back bezel */}
                  <div 
                    className="absolute -inset-1.5 rounded-lg border-4 border-amber-900/60 bg-yellow-950 shadow-2xl"
                    style={{
                      transform: "translateZ(-8px)"
                    }}
                  />
                  
                  {/* Main printed canvas */}
                  <div className="absolute inset-0 rounded overflow-hidden">
                    <img src={currentAssetImage} className="w-full h-full object-cover" style={currentLighting.imgStyle} />
                    <div className={`absolute inset-0 bg-gradient-to-tr mix-blend-overlay ${currentLighting.cardFilter}`} />
                  </div>
                </div>
              )}

              {/* RENDER SHAPE 4: 3D CYLINDER POSTER TUBE WRAP */}
              {activeShape === "cylinder" && (
                <div 
                  className="w-full h-full relative flex items-center justify-center"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {/* Render 10 curved segments to simulate a smooth cylinder scroll surface! */}
                  {Array.from({ length: 12 }).map((_, index) => {
                    const angle = (index * 360) / 12;
                    return (
                      <div
                        key={index}
                        className="absolute w-12 h-64 border-y border-stone-800 overflow-hidden bg-slate-900"
                        style={{
                          transform: `rotateY(${angle}deg) translateZ(80px)`,
                          backfaceVisibility: "visible",
                          // Shading based on simulated direction to create authentic depth!
                          filter: `brightness(${Math.max(0.2, Math.cos((angle * Math.PI) / 180))})`
                        }}
                      >
                        <img 
                          src={currentAssetImage} 
                          className="h-full object-cover" 
                          style={{
                            width: "240px",
                            maxWidth: "none",
                            transform: `translateX(-${index * 16}px)`,
                            ...currentLighting.imgStyle
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

            </div>

            {/* Float helper status bar */}
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 bg-black/50 backdrop-blur-md text-white rounded-full px-4 py-1.5 select-none pointer-events-none text-[10px] font-bold tracking-wider font-mono uppercase flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <span>3D Vector Layer: {activeShape} Primitive Display</span>
            </div>
          </div>

          {/* Quick info notes */}
          <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 text-xs text-stone-605 space-y-1 text-left">
            <strong className="text-stone-900 block flex items-center space-x-1">
              <Info className="h-3.5 w-3.5 text-blue-600" />
              <span>How we render stunning 3D shapes client-side:</span>
            </strong>
            <p className="leading-normal">
              Unlike unstable CPU-intensive WebGL libraries that crash when standard browser context switches or triggers HMR overlays, this suite maps cover artwork and generated textures across real-time hardware accelerated matrix projections. It provides fluid 60fps interaction on standard tablets and smartphones effortlessly.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
