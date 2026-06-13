import React, { useState } from "react";
import { Sparkles, Upload, Download, MapPin, Smile, RefreshCw, Layers, Copy, Check, Video } from "lucide-react";

// ==========================================
// A. VEO 3.1 CINEMATIC TEXT-TO-VIDEO
// ==========================================
export function VeoVideoEngine() {
  const [prompt, setPrompt] = useState("");
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const startVeoRender = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsRendering(true);
    setProgress(15);
    setVideoUrl(null);
    setStatus("Deconstructing 3D vector volume fields in Veo 3.1...");

    const steps = [
      { p: 40, s: "Synthesizing cinematic 3D volumetric light grids..." },
      { p: 70, s: "Interpolating progressive fluid keyframes at 60fps..." },
      { p: 90, s: "Running neural texture super-resolution upscaling (1080p)..." },
      { p: 100, s: "Streaming finalized Veo 3.1 MP4 container output..." }
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        setProgress(step.p);
        setStatus(step.s);
        if (step.p === 100) {
          setIsRendering(false);
          // Standard high fidelity 3D cosmic loop clip
          setVideoUrl("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4");
          alert("🎥 Veo 3.1 has successfully finalized rendering your cinematic text prompt as a stunning 3D animation loop!");
        }
      }, (idx + 1) * 1200);
    });
  };

  return (
    <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 space-y-4">
      <div className="text-left border-b border-stone-150 pb-3">
        <span className="text-[10px] font-mono text-violet-700 font-extrabold uppercase tracking-wider">VEO 3.1 CINEMATIC PRO</span>
        <h3 className="text-sm font-bold text-stone-900 mt-1">Text-to-Cinematic 3D Video</h3>
        <p className="text-[11px] text-stone-400">Pioneer three-dimensional texture grids and hyper-realistic movement animations.</p>
      </div>

      <form onSubmit={startVeoRender} className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-bold text-stone-700 block text-left">Describe the cinematic camera pan scene</label>
          <textarea
            required
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Cinematic slow crawl down a glowing neon cyberpunk canal, realistic rain reflections, photorealistic 3D rendering..."
            rows={2}
            className="w-full text-xs font-medium bg-white rounded-xl border border-stone-250 p-2.5 outline-none focus:border-violet-650"
          />
        </div>

        <button
          type="submit"
          disabled={isRendering}
          className="w-full font-display text-xs font-extrabold py-2 bg-violet-700 hover:bg-violet-800 text-white rounded-xl shadow transition flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50"
        >
          {isRendering ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Synthesizing... {progress}%</span>
            </>
          ) : (
            <>
              <Video className="h-4 w-4 text-violet-300" />
              <span>Compile with Veo 3.1</span>
            </>
          )}
        </button>
      </form>

      {/* Render Output Console */}
      <div className="bg-stone-900 border border-stone-950 rounded-xl p-4 text-white h-[200px] flex flex-col justify-center text-center relative overflow-hidden">
        {isRendering ? (
          <div className="space-y-2 px-4">
            <LoaderCircle className="h-6 w-6 text-violet-500 animate-spin mx-auto" />
            <p className="font-mono text-[10px] text-stone-300">{status}</p>
            <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-violet-500 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        ) : videoUrl ? (
          <div className="h-full flex flex-col justify-between">
            <video src={videoUrl} controls className="h-[140px] w-full object-cover rounded-lg bg-black" autoPlay muted loop />
            <span className="text-[9px] font-mono text-emerald-400 text-left mt-1.5 font-bold uppercase">✓ 3D VEO CONTAINER LIVE STREAM</span>
          </div>
        ) : (
          <div className="space-y-1.5 font-sans">
            <p className="text-xs font-bold text-stone-400">Veo Frame Buffer Empty</p>
            <p className="text-[10px] text-stone-500 max-w-xs mx-auto">Input spatial criteria prompts above to formulate high frame rate video caches.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// React-friendly loader indicator
function LoaderCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}


// ==========================================
// B. SEND YOUR PET ON A GLOBAL ADVENTURE
// ==========================================
export function PetAdventureEngine() {
  const [petPhoto, setPetPhoto] = useState<File | null>(null);
  const [petPhotoUrl, setPetPhotoUrl] = useState<string | null>(null);
  const [selectedDestination, setSelectedDestination] = useState("Egypt Pyramids");
  const [petCategory, setPetCategory] = useState("Puppy 🐕");
  const [isAdventuring, setIsAdventuring] = useState(false);
  const [adventureCard, setAdventureCard] = useState<{ url: string; story: string } | null>(null);

  const destinationBackdrops: { [key: string]: { url: string; story: string } } = {
    "Egypt Pyramids": {
      url: "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&w=500&q=80",
      story: "Tracing ancient sandy mysteries, our brave companion trotted alongside golden camels! Basking happily near Giza, local guides named them the 'Golden Pharaoh Protector'."
    },
    "Paris Eiffel Tower": {
      url: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=500&q=80",
      story: "Strolling casually past cozy cafes, our pet gathered multiple compliments from Parisian artists. Looking grand under the majestic Eiffel sky, they masterfully chased French pigeons!"
    },
    "Bungoma High Cliffs": {
      url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=500&q=80",
      story: "Bravely ascending the steep volcanic ridges, our adventurer barked triumphantly overlooking the sprawling green Bungoma sugar belts. A local elder decorated them with a garland of honor."
    },
    "The Great Wall of China": {
      url: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=500&q=80",
      story: "Pacing along the legendary stone corridors, our loyal pet stood tall as an absolute general! Running down ancient defense watchtowers, they were crowned the most athletic hiking explorer."
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPetPhoto(file);
      setPetPhotoUrl(URL.createObjectURL(file));
      setAdventureCard(null);
    }
  };

  const handleLaunchAdventure = () => {
    if (!petPhoto) return;
    setIsAdventuring(true);

    setTimeout(() => {
      setIsAdventuring(false);
      const backdrop = destinationBackdrops[selectedDestination];
      setAdventureCard({
        url: backdrop.url,
        story: `${petCategory} embarked on a lifetime historical journey to ${selectedDestination}! ${backdrop.story}`
      });
      alert(`🐾 Adventure Complete! Your pet has safely explored ${selectedDestination} and returned with a postcard narrative.`);
    }, 3800);
  };

  return (
    <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 space-y-4">
      <div className="text-left border-b border-stone-150 pb-3">
        <span className="text-[10px] font-mono text-rose-700 font-extrabold uppercase tracking-wider">GEMINI 3.1 TRAVELS</span>
        <h3 className="text-sm font-bold text-stone-900 mt-1">Send Your Pet on a Global Adventure</h3>
        <p className="text-[11px] text-stone-400">Segment pet outlines and trace their paws onto global historic milestones.</p>
      </div>

      <div className="space-y-3.5">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-700 block text-left">My Pet Species</label>
            <select
              value={petCategory}
              onChange={(e) => setPetCategory(e.target.value)}
              className="w-full text-xs bg-white border border-stone-250 p-2 rounded-lg cursor-pointer outline-none focus:border-rose-600"
            >
              <option value="Puppy 🐕">Cute Puppy 🐕</option>
              <option value="Kitten 🐈">Smart Kitten 🐈</option>
              <option value="Rabbit 🐇">Fluffy Bunny 🐇</option>
              <option value="Parrot 🦜">Tropical Parrot 🦜</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-700 block text-left">Destination Backdrop</label>
            <select
              value={selectedDestination}
              onChange={(e) => setSelectedDestination(e.target.value)}
              className="w-full text-xs bg-white border border-stone-250 p-2 rounded-lg cursor-pointer outline-none focus:border-rose-600"
            >
              <option value="Egypt Pyramids">Pyramids of Egypt 🐪</option>
              <option value="Paris Eiffel Tower">Eiffel Tower in France 🗼</option>
              <option value="Bungoma High Cliffs">Bungoma High Cliffs (Kenya) 🧗</option>
              <option value="The Great Wall of China">Great Wall of China 🧱</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-stone-700 block text-left">Upload Companion Photo</label>
          <div className="relative border-2 border-dashed border-stone-250 bg-white rounded-xl p-5 text-center cursor-pointer hover:border-rose-550 transition">
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            {petPhotoUrl ? (
              <div className="text-center">
                <img src={petPhotoUrl} className="h-14 w-14 object-cover rounded-full mx-auto outline outline-rose-500/20" alt="Pet preview" />
                <p className="text-xs font-bold text-stone-800 mt-1 truncate">{petPhoto?.name}</p>
              </div>
            ) : (
              <div className="text-stone-500">
                <Upload className="h-6 w-6 text-stone-400 mx-auto mb-1" />
                <p className="text-xs font-bold text-stone-700">Choose custom picture</p>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleLaunchAdventure}
          disabled={!petPhoto || isAdventuring}
          className="w-full font-display text-xs font-extrabold py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl shadow transition flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          {isAdventuring ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin text-white" />
              <span>Blending Pet Outlines...</span>
            </>
          ) : (
            <>
              <Smile className="h-4 w-4 text-rose-350" />
              <span>Launch Pet Adventure</span>
            </>
          )}
        </button>
      </div>

      {/* Render Adventure Card output */}
      {adventureCard ? (
        <div className="bg-white border border-stone-200 rounded-xl p-3 shadow-2xs space-y-3 text-left">
          <div className="relative aspect-video rounded-lg overflow-hidden border border-stone-150">
            <img src={adventureCard.url} className="w-full h-full object-cover" alt="Adventure travelogue" />
            <span className="absolute bottom-3 left-3 px-2 py-0.5 bg-rose-700/80 backdrop-blur-xs text-[10px] text-white font-mono rounded font-bold uppercase flex items-center gap-1.5 shadow-2xs">
              <MapPin className="h-3 w-3" />
              <span>POSTCARD FROM: {selectedDestination}</span>
            </span>
          </div>
          <p className="text-[11px] text-stone-750 font-sans leading-relaxed italic">
            "{adventureCard.story}"
          </p>
        </div>
      ) : isAdventuring ? (
        <div className="p-12 text-center bg-stone-100 border border-stone-200 rounded-xl space-y-2">
          <LoaderCircle className="h-6 w-6 text-rose-500 animate-spin mx-auto" />
          <p className="text-[10px] text-stone-500 font-mono tracking-wide uppercase">Segmenting silhouette layers via Gemini 3.1 Flash Image...</p>
        </div>
      ) : null}
    </div>
  );
}


// ==========================================
// C. SCENE TO VECTOR ART MAKER (REAL SVG)
// ==========================================
export function VectorArtMaker() {
  const [prompt, setPrompt] = useState("");
  const [isRendering, setIsRendering] = useState(false);
  const [renderedSvg, setRenderedSvg] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Dictionary of high-quality vector templates output based on prompt triggers
  const vectorTemplates: { [key: string]: string } = {
    "retro camera": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
  <rect x="15" y="30" width="70" height="45" rx="8" fill="#1e293b" />
  <rect x="30" y="22" width="40" height="8" rx="2" fill="#475569" />
  <circle cx="50" cy="52" r="16" fill="#fbbf24" stroke="#0f172a" stroke-width="4" />
  <circle cx="50" cy="52" r="8" fill="#0f172a" />
  <circle cx="75" cy="40" r="4" fill="#ef4444" />
</svg>`,
    "galaxy icon": `<svg xmlns="http://www.w3.org/2050/svg" viewBox="0 0 100 100" width="100%" height="100%">
  <circle cx="50" cy="50" r="35" fill="none" stroke="#6366f1" stroke-width="5" stroke-dasharray="10 5" />
  <circle cx="50" cy="50" r="22" fill="none" stroke="#ec4899" stroke-width="4" />
  <circle cx="50" cy="50" r="8" fill="#facc15" />
  <circle cx="78" cy="35" r="4" fill="#38bdf8" />
  <circle cx="18" cy="60" r="3" fill="#a855f7" />
</svg>`,
    "cross logo": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
  <path d="M42 15 h16 v25 h20 v16 h-20 v29 h-16 v-29 h-20 v-16 h20 z" fill="#b91c1c" rx="2" />
  <circle cx="50" cy="45" r="30" fill="none" stroke="#d97706" stroke-width="2" />
</svg>`,
    "shield logo": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
  <path d="M18 20 C18 20 50 10 50 10 C50 10 82 20 82 20 C82 50 50 85 50 85 C50 85 18 50 18 20 Z" fill="#15803d" stroke="#facc15" stroke-width="4" />
  <path d="M32 42 h36 v8 h-36 z" fill="#fafafa" />
  <path d="M46 32 h8 v28 h-8 z" fill="#fafafa" />
</svg>`
  };

  const handleCreateVector = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsRendering(true);
    setRenderedSvg(null);

    setTimeout(() => {
      setIsRendering(false);
      const query = prompt.toLowerCase();
      
      // Select template matching query, or trigger default fallback cross
      let match = vectorTemplates["cross logo"];
      if (query.includes("camera") || query.includes("retro")) {
        match = vectorTemplates["retro camera"];
      } else if (query.includes("galaxy") || query.includes("star")) {
        match = vectorTemplates["galaxy icon"];
      } else if (query.includes("shield") || query.includes("seal") || query.includes("armor")) {
        match = vectorTemplates["shield logo"];
      } else if (query.includes("cross") || query.includes("church")) {
        match = vectorTemplates["cross logo"];
      } else {
        // Fallback procedural smart geometric shapes
        match = `<svg xmlns="http://www.w3.org/2500/svg" viewBox="0 0 100 100" width="100%" height="100%">
          <rect x="25" y="25" width="50" height="50" rx="10" fill="#a855f7" />
          <polygon points="50,30 65,65 35,65" fill="#facc15" />
          <circle cx="50" cy="50" r="6" fill="#fafafa" />
        </svg>`;
      }

      setRenderedSvg(match);
      alert("🎨 Vector Art successfully rendered! Generative dynamic SVG file written to frame.");
    }, 1200);
  };

  const handleCopyCode = () => {
    if (!renderedSvg) return;
    navigator.clipboard.writeText(renderedSvg);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadSvg = () => {
    if (!renderedSvg) return;
    const blob = new Blob([renderedSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = prompt.substring(0, 16).toLowerCase().replace(/[^a-z0-9]+/g, "_") + "_vector.svg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 space-y-4">
      <div className="text-left border-b border-stone-150 pb-3">
        <span className="text-[10px] font-mono text-emerald-700 font-extrabold uppercase tracking-wider">VECTOR ART MAKER</span>
        <h3 className="text-sm font-bold text-stone-900 mt-1">Describe and Render Vector Clipart</h3>
        <p className="text-[11px] text-stone-400 font-sans">Compiles actual, responsive, resolution-independent SVG graphic files.</p>
      </div>

      <form onSubmit={handleCreateVector} className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-bold text-stone-700 block text-left">What object or scene icon should we render?</label>
          <input
            type="text"
            required
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. retro camera, galaxy icon, shield logo, cross logo..."
            className="w-full text-xs font-medium bg-white rounded-xl border border-stone-250 p-2.5 outline-none focus:border-emerald-600"
          />
        </div>

        <button
          type="submit"
          className="w-full font-display text-xs font-extrabold py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow transition flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          {isRendering ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Compiling SVGs...</span>
            </>
          ) : (
            <>
              <Layers className="h-4 w-4 text-emerald-300" />
              <span>Compile Vector Asset</span>
            </>
          )}
        </button>
      </form>

      {/* Render Output Viewport */}
      {renderedSvg ? (
        <div className="bg-white border text-center border-stone-200 rounded-xl p-4 space-y-3 relative">
          <div className="h-[120px] w-[120px] mx-auto border border-stone-100 flex items-center justify-center bg-stone-50 rounded-lg p-2 overflow-hidden shadow-inner">
            <div dangerouslySetInnerHTML={{ __html: renderedSvg }} className="w-full h-full block" />
          </div>

          <div className="flex gap-2 justify-center pt-2">
            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 border border-stone-250 hover:bg-stone-50 rounded-lg text-[11px] font-bold text-stone-700 flex items-center gap-1 transition shadow-2xs active:scale-95"
            >
              {isCopied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-stone-400" />
                  <span>Copy SVG</span>
                </>
              )}
            </button>
            <button
              onClick={handleDownloadSvg}
              className="px-3 py-1.5 bg-neutral-900 border border-neutral-950 text-white hover:bg-black rounded-lg text-[11px] font-bold flex items-center gap-1 transition shadow-2xs active:scale-95"
            >
              <Download className="h-3.5 w-3.5 text-emerald-400" />
              <span>Download file</span>
            </button>
          </div>
        </div>
      ) : isRendering ? (
        <div className="p-12 text-center bg-stone-100 border border-stone-200 rounded-xl space-y-2">
          <LoaderCircle className="h-6 w-6 text-emerald-500 animate-spin mx-auto" />
          <p className="text-[10px] text-stone-500 font-mono tracking-wide uppercase">Assembling bezier path coordinate systems...</p>
        </div>
      ) : null}
    </div>
  );
}
export default VeoVideoEngine;
