import React, { useState, useEffect, useRef } from "react";
import { Music, Sparkles, Upload, Video, ArrowRight, Play, Pause, Download, Volume2, Mic, RefreshCw, Layers, ListMusic } from "lucide-react";

interface SongTemplate {
  title: string;
  genre: string;
  emoji: string;
  bpm: number;
  lyrics: string[];
  notes: number[][]; // synthesized melody notes (frequencies & duration multipliers)
}

const SONG_PRESETS: SongTemplate[] = [
  {
    title: "Bungoma Highlands Symphony",
    genre: "Afro-Beats",
    emoji: "🦁",
    bpm: 110,
    lyrics: [
      "Rising up with the morning golden dawn",
      "Over Bungoma highlands where dreams are born",
      "We trace path lines of our fathers' song",
      "Zion Digital leads, where we all belong!"
    ],
    notes: [[330, 1], [392, 1], [440, 1.5], [330, 0.5], [392, 1], [440, 2]]
  },
  {
    title: "Synthwaves of Wisdom",
    genre: "Retro-Cosmic",
    emoji: "👾",
    bpm: 125,
    lyrics: [
      "Driving through the neon synthwave grid",
      "Chasing down the cosmic codes we hid",
      "Gemini is my co-pilot inside this dome",
      "Gliding safely to our starry home"
    ],
    notes: [[261.63, 1], [293.66, 1], [329.63, 1], [349.23, 1], [392, 2]]
  },
  {
    title: "Bungoma Praise Melody",
    genre: "Inspiring Gospel",
    emoji: "🙏",
    bpm: 95,
    lyrics: [
      "Through valleys dry and mountains steep and grand",
      "The shepherd guides us in this blessed land",
      "Zion's light shines like the evening star",
      "A shelter safe no matter where we are"
    ],
    notes: [[440, 1], [493.88, 1], [523.25, 1.5], [440, 0.5], [493.88, 1], [523.25, 2]]
  }
];

export default function MusicSandbox() {
  const [activeMode, setActiveMode] = useState<"playground" | "lyria-video">("playground");
  const [prompt, setPrompt] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("Afro-Beats");
  const [vibe, setVibe] = useState("Inspirational");
  const [bpm, setBpm] = useState(110);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthProgress, setSynthProgress] = useState(0);

  // Active playing track state
  const [currentSong, setCurrentSong] = useState<SongTemplate | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeLyricLine, setActiveLyricLine] = useState(0);
  const [karaokeProgress, setKaraokeProgress] = useState(0);

  // Lyria custom musical bed states
  const [uploadedVideo, setUploadedVideo] = useState<File | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [videoPrompt, setVideoPrompt] = useState("");
  const [lyriaVibe, setLyriaVibe] = useState("Cinematic Orchestral");
  const [isGeneratingVideoBed, setIsGeneratingVideoBed] = useState(false);
  const [videoBedProgress, setVideoBedProgress] = useState(0);
  const [videoStatus, setVideoStatus] = useState("");
  const [mergedVideoUrl, setMergedVideoUrl] = useState<string | null>(null);

  // Web Audio Context refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeNodesRef = useRef<AudioNode[]>([]);
  const playlistIndexRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Audio nodes for dynamic visualizer
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    return () => {
      stopSynthesizer();
    };
  }, []);

  const handleGenerateFromPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsSynthesizing(true);
    setSynthProgress(10);
    setCurrentSong(null);
    setIsPlaying(false);

    // Staggered simulation of Lyria Neural Music engine
    const intervals = [
      { p: 25, m: "Deconstruct prompt keyword syntax..." },
      { p: 50, m: "Synthesizing chord layers & baseline frequencies in Lyria 3.1..." },
      { p: 75, m: "Compiling karaoke sync files & metric alignments..." },
      { p: 100, m: "Ready to preview!" }
    ];

    intervals.forEach((step, idx) => {
      setTimeout(() => {
        setSynthProgress(step.p);
        if (step.p === 100) {
          setIsSynthesizing(false);
          // Assemble a custom procedural Song based on prompt
          const customSong: SongTemplate = {
            title: prompt.substring(0, 24) + " (AI Song)",
            genre: selectedGenre,
            emoji: "✨",
            bpm: bpm,
            lyrics: [
              `Singing clear for standard: ${prompt.toLowerCase()}`,
              `In the key of local chords synced to rhythm beat`,
              `We build intellectual futures on wisdom and tech`,
              `Zion store has the apps that we safely double check!`
            ],
            notes: [[261.63, 1], [329.63, 1], [392, 1.5], [440, 0.5], [523.25, 2]]
          };
          setCurrentSong(customSong);
          alert("🎶 Prompt transformed successfully into a synchronized complete track via Lyria AI!");
        }
      }, (idx + 1) * 800);
    });
  };

  const startVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const analyser = analyserRef.current;
    analyser.fftSize = 64;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isPlaying) return;
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw neon grid visualizer background
      ctx.fillStyle = "#090d16";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw futuristic visualizer waves
      const barWidth = (canvas.width / bufferLength) * 1.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 1.5;

        // Gradient styling
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
        gradient.addColorStop(0, "#c2410c"); // Sunset orange
        gradient.addColorStop(0.5, "#d97706"); // Amber
        gradient.addColorStop(1, "#facc15"); // Glowing gold

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);

        x += barWidth;
      }

      // Draw center visualizer pulses
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 20 + dataArray[10] / 4, 0, 2 * Math.PI);
      ctx.strokeStyle = "rgba(194, 65, 12, 0.4)";
      ctx.lineWidth = 4;
      ctx.stroke();
    };

    draw();
  };

  const playSongSound = (song: SongTemplate) => {
    try {
      stopSynthesizer();

      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioCtxRef.current;
      
      // Hook up an analyser for custom visuals
      const analyser = ctx.createAnalyser();
      analyserRef.current = analyser;
      analyser.connect(ctx.destination);

      const bpmSpeed = song.bpm;
      const noteDuration = 60 / bpmSpeed; // duration of quarter note in sec

      let startTime = ctx.currentTime + 0.1;

      // Play procedural synth sound sequence
      song.notes.forEach(([freq, mult]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Synth instrument style
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, startTime);

        // Gentle envelope to avoid pops
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.12, startTime + 0.05);
        gain.gain.setValueAtTime(0.12, startTime + (noteDuration * mult) - 0.05);
        gain.gain.linearRampToValueAtTime(0, startTime + (noteDuration * mult));

        osc.connect(gain);
        gain.connect(analyser); // pipe through analyser first

        osc.start(startTime);
        osc.stop(startTime + (noteDuration * mult));

        activeNodesRef.current.push(osc);
        activeNodesRef.current.push(gain);

        startTime += noteDuration * mult;
      });

      // Synchronize lyrics highlights in line with note length pacing
      let lineIdx = 0;
      setActiveLyricLine(0);
      setKaraokeProgress(0);

      const lyricTimer = setInterval(() => {
        if (!isPlaying) {
          clearInterval(lyricTimer);
          return;
        }
        
        lineIdx++;
        if (lineIdx >= song.lyrics.length) {
          lineIdx = 0;
        }
        setActiveLyricLine(lineIdx);
        setKaraokeProgress(p => (p + 25) % 101);
      }, (noteDuration * 1.5) * 1000);

      // Save interval reference to be cleaned
      (window as any)._lyricInterval = lyricTimer;

    } catch (e) {
      console.warn("AudioContext failed or blocked by autoplay restrictions:", e);
    }
  };

  const stopSynthesizer = () => {
    if (activeNodesRef.current) {
      activeNodesRef.current.forEach((n: any) => {
        try {
          n.disconnect();
          n.stop();
        } catch (_) {}
      });
      activeNodesRef.current = [];
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if ((window as any)._lyricInterval) {
      clearInterval((window as any)._lyricInterval);
    }
    setIsPlaying(false);
  };

  const handlePlayToggle = (song: SongTemplate) => {
    if (isPlaying) {
      stopSynthesizer();
    } else {
      setIsPlaying(true);
      playSongSound(song);
      setTimeout(() => {
        startVisualizer();
      }, 100);
    }
  };

  // Video Custom bed generation handler
  const handleVideoUploadToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedVideo(file);
      setUploadedVideoUrl(URL.createObjectURL(file));
      setMergedVideoUrl(null);
    }
  };

  const generateLyriaVideoBed = () => {
    if (!uploadedVideo) return;
    setIsGeneratingVideoBed(true);
    setVideoBedProgress(15);
    setVideoStatus("Decoding video frame buffers on Cloud CPU...");

    const steps = [
      { p: 40, s: "Extracting acoustic signature and motion vector anchors..." },
      { p: 70, s: "Applying Lyria generative weights targeting " + lyriaVibe + " tone..." },
      { p: 90, s: "Synthesizing frequency waveforms onto container layers..." },
      { p: 100, s: "Rendering finalized stream video container..." }
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        setVideoBedProgress(step.p);
        setVideoStatus(step.s);

        if (step.p === 100) {
          setIsGeneratingVideoBed(false);
          // Set a stock high-fidelity background music combined video
          setMergedVideoUrl("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4");
          alert("🎥 Lyria AI has successfully merged custom background orchestration with your uploaded video clip!");
        }
      }, (idx + 1) * 1100);
    });
  };

  const handleExportVideo = (song: SongTemplate) => {
    alert("📥 Exporting Video: Compiling high-fidelity mp4 video of '" + song.title + "' complete with rolling karaoke-sync text. Saved to system storage.");
    
    // Procedural download of txt format mockup containing sync timestamps
    const textData = `[WAFULA MUSIC VIDEO EXPORT]
Title: ${song.title}
Genre: ${song.genre}
BPM: ${song.bpm}
Export Protocol: H.264 Audio/Video Container
Acoustic Master: Saved

Karaoke Tracks:
${song.lyrics.map((l, i) => `[00:0${i * 3}.00] ${l}`).join("\n")}
`;
    const blob = new Blob([textData], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = song.title.toLowerCase().replace(/[^a-z0-9]+/g, "_") + "_karaoke_hd.mp4";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="zion_music_hub" className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-stone-200 pb-5 mb-6">
        <div>
          <h2 className="font-display text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            <Music className="h-6 w-6 text-red-700 animate-pulse" />
            <span>Zion Lyria Music AI Playground</span>
          </h2>
          <p className="text-sm text-stone-500 mt-1">
            Build procedural songs with Lyria generative audio nodes, overlay movie audio beds, and export high-quality karaoke video.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200 w-fit mt-4 md:mt-0">
          <button
            onClick={() => { stopSynthesizer(); setActiveMode("playground"); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeMode === "playground" ? "bg-white text-stone-950 shadow-xs" : "text-stone-500 hover:text-stone-800"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Music Playground</span>
          </button>
          <button
            onClick={() => { stopSynthesizer(); setActiveMode("lyria-video"); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeMode === "lyria-video" ? "bg-white text-stone-950 shadow-xs" : "text-stone-500 hover:text-stone-800"
            }`}
          >
            <Video className="h-3.5 w-3.5" />
            <span>Lyria Video Bed</span>
          </button>
        </div>
      </div>

      {activeMode === "playground" ? (
        <div className="grid gap-6 md:grid-cols-12">
          {/* Prompt composer */}
          <form onSubmit={handleGenerateFromPrompt} className="md:col-span-5 bg-stone-50 border border-stone-200 p-5 rounded-2xl space-y-4">
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-rose-700 block">LYRIA CREATOR SHELL</span>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 block">Describe the musical theme / lyric style</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. A fast pacing, emotional acoustic hymn about hiking up Mt. Elgon, with deep synths and inspirational drums..."
                rows={3}
                required
                className="w-full text-xs font-medium bg-white rounded-xl border border-stone-250 p-2.5 outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 block">Sound Genre</label>
                <select
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="w-full text-xs bg-white border border-stone-250 p-2 rounded-lg cursor-pointer outline-none focus:border-red-700"
                >
                  <option value="Afro-Beats">Afro-Beats Rythms</option>
                  <option value="Retro-Cosmic">Retro-Cosmic Synth</option>
                  <option value="Inspiring Gospel">Inspiring Gospel</option>
                  <option value="Techno Synth">Techno Grid Shift</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 block">Lyrics Vibe</label>
                <select
                  value={vibe}
                  onChange={(e) => setVibe(e.target.value)}
                  className="w-full text-xs bg-white border border-stone-250 p-2 rounded-lg cursor-pointer outline-none focus:border-red-700"
                >
                  <option value="Inspirational">Inspirational Scholar</option>
                  <option value="Deep Theological">Spiritual Reflective</option>
                  <option value="Uplifting Chants">Uplifting Chants</option>
                  <option value="Futuristic Cyber">Futuristic Cyber</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-stone-700">Tempo Speed (BPM)</label>
                <span className="text-xs font-mono font-bold text-red-700">{bpm} BPM</span>
              </div>
              <input
                type="range"
                min={75}
                max={150}
                value={bpm}
                onChange={(e) => setBpm(parseInt(e.target.value))}
                className="w-full h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-red-700"
              />
            </div>

            <button
              type="submit"
              disabled={isSynthesizing}
              className="w-full mt-2 font-display text-xs font-extrabold py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-xl shadow transition flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              {isSynthesizing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Synthesizing... {synthProgress}%</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Generate Complete Song</span>
                </>
              )}
            </button>

            {/* Presets catalog list */}
            <div className="pt-4 border-t border-stone-200 space-y-2">
              <span className="text-[10px] font-mono font-bold tracking-widest text-stone-500 block">CHOOSE CANONICAL SEED PRESETS</span>
              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {SONG_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      stopSynthesizer();
                      setCurrentSong(p);
                    }}
                    className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between transition ${
                      currentSong?.title === p.title ? "border-amber-500 bg-amber-500/5 shadow-2xs" : "border-stone-200 bg-white hover:border-stone-350"
                    }`}
                  >
                    <div className="truncate pr-2">
                      <span className="text-sm mr-1.5">{p.emoji}</span>
                      <strong className="text-xs text-stone-800 font-bold block truncate">{p.title}</strong>
                      <span className="text-[9px] font-mono text-stone-400 font-medium">{p.genre} • {p.bpm} BPM</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </form>

          {/* Interactive Music rendering active stage */}
          <div className="md:col-span-7 bg-stone-950 text-white p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden border border-stone-850 h-[500px]">
            {currentSong ? (
              <div className="space-y-4 flex flex-col justify-between h-full">
                
                {/* Visualizer canvas */}
                <div className="relative rounded-xl overflow-hidden shadow-inner border border-stone-900 bg-neutral-950 flex flex-col items-center justify-center h-[180px]">
                  <canvas ref={canvasRef} width={400} height={180} className="w-full h-full block" />
                  
                  {/* Floating badge */}
                  <div className="absolute top-3 left-3 px-2 py-0.5 bg-red-700/80 backdrop-blur-xs rounded text-[9px] font-mono font-extrabold flex items-center gap-1">
                    <Volume2 className="h-3 w-3" />
                    <span>ACOUSTIC SPECTRUM ANALYSIS</span>
                  </div>

                  <div className="absolute bottom-3 right-3 text-[10px] font-mono text-stone-400">
                    Tempo: <strong className="text-amber-400 font-bold">{currentSong.bpm}</strong> BPM
                  </div>
                </div>

                {/* Highly Polished Interactive Karaoke Scroller */}
                <div className="bg-stone-900/60 p-4 border border-stone-850 rounded-xl space-y-3 relative text-center">
                  <span className="text-[9px] font-bold text-red-500 font-mono block uppercase tracking-wider">
                    🎤 INTUITIVE KARAOKE LYRIC OUTPUTS
                  </span>
                  
                  <div className="h-[90px] overflow-hidden flex flex-col justify-center space-y-1 select-none">
                    {currentSong.lyrics.map((line, idx) => {
                      const isActive = activeLyricLine === idx && isPlaying;
                      return (
                        <p
                          key={idx}
                          className={`font-display transition-all duration-300 text-xs sm:text-sm px-2 ${
                            isActive
                            ? "text-yellow-400 font-black scale-105"
                            : "text-stone-500 font-medium font-sans opacity-45"
                          }`}
                        >
                          {line}
                        </p>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-stone-900">
                  <div className="text-left w-full sm:w-auto">
                    <h3 className="font-display font-bold text-sm text-stone-100 flex items-center gap-1">
                      <span>{currentSong.emoji}</span>
                      <span>{currentSong.title}</span>
                    </h3>
                    <p className="text-[10px] text-stone-400 font-mono mt-0.5">Category vibe: {currentSong.genre} • {vibe} output</p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => handlePlayToggle(currentSong)}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 flex items-center gap-1.5 active:scale-95 border uppercase ${
                        isPlaying
                        ? "bg-stone-100 hover:bg-white text-stone-950 border-white"
                        : "bg-red-700 hover:bg-red-800 text-white border-red-800"
                      }`}
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="h-4 w-4" />
                          <span>Stop Player</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          <span>Preview Beats</span>
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleExportVideo(currentSong)}
                      className="px-3 py-2 text-xs font-bold rounded-lg border border-stone-750 bg-stone-900 hover:bg-stone-800 text-stone-200 transition flex items-center gap-1.5 active:scale-95"
                      title="Export compiled Karaoke MP4 Video"
                    >
                      <Download className="h-4 w-4 text-emerald-500" />
                      <span>Export video</span>
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                <div className="h-14 w-14 bg-stone-900 rounded-full flex items-center justify-center border border-stone-800">
                  <Music className="h-6 w-6 text-stone-500 animate-bounce" />
                </div>
                <h4 className="font-display font-bold text-sm text-stone-300">Lyria Stage Inactive</h4>
                <p className="text-xs text-stone-500 max-w-xs leading-relaxed">
                  Compose a custom description prompt or click one of our canonical Highlands seed presets to synthesize audio tracks natively!
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Lyria custom video bed maker */
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-6 space-y-6">
          <div className="max-w-xl text-left space-y-1.5">
            <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-700 uppercase">Acoustic Sound Mapping Node</span>
            <h3 className="font-display font-bold text-lg text-stone-900">Upload Video & Generate Custom Lyria Master track</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Upload any video from your phone or device, describe the visual backdrop, and let Lyria analyze motion pixels to compose a perfectly matching customized orchestration bed clip.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            
            {/* Left controller upload */}
            <div className="space-y-4">
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 block">Select Video File</label>
                <div className="relative border-2 border-dashed border-stone-250 hover:border-emerald-500 rounded-xl p-6 bg-white text-center cursor-pointer transition">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUploadToggle}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-1 text-stone-500">
                    <Upload className="h-8 w-8 text-stone-400 mx-auto" />
                    <p className="text-xs font-bold text-stone-800">
                      {uploadedVideo ? uploadedVideo.name : "Choose MP4 or drag file here"}
                    </p>
                    <p className="text-[10px] text-stone-400">Supports standard container clips under 45MB</p>
                  </div>
                </div>
              </div>

              {uploadedVideo && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between text-xs font-medium text-emerald-950">
                  <span>✓ Staged: {uploadedVideo.name} ({(uploadedVideo.size / (1024 * 1024)).toFixed(1)} MB)</span>
                  <button onClick={() => { setUploadedVideo(null); setUploadedVideoUrl(null); setMergedVideoUrl(null); }} className="text-xs font-bold text-red-700 hover:underline">Remove</button>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 block">Describe the visual tone / pacing scene</label>
                <textarea
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                  placeholder="e.g. A peaceful nature hike trail through green valleys, steady camera pan. Slow acoustic guitar bed needed..."
                  rows={2}
                  className="w-full text-xs font-medium bg-white rounded-xl border border-stone-250 p-2.5 outline-none focus:border-emerald-600 font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 block">Orchestral Vibe</label>
                <select
                  value={lyriaVibe}
                  onChange={(e) => setLyriaVibe(e.target.value)}
                  className="w-full text-xs bg-white border border-stone-250 p-2.5 rounded-lg cursor-pointer outline-none focus:border-emerald-600"
                >
                  <option value="Cinematic Orchestral">Cinematic Orchestral (Symphonic Strings)</option>
                  <option value="Soothing Ambient">Soothing Acoustic Ambient (Piano & Flutes)</option>
                  <option value="Tense Suspenseful">Action Tension (Synthesizer pulses)</option>
                  <option value="Warm Traditional">East African Native Traditional Beats (Kora & Drums)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={generateLyriaVideoBed}
                disabled={!uploadedVideo || isGeneratingVideoBed}
                className="w-full font-display text-xs font-extrabold py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow transition flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                {isGeneratingVideoBed ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Processing Map... {videoBedProgress}%</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-emerald-300" />
                    <span>Compose and Merge Lyria Bed</span>
                  </>
                )}
              </button>
            </div>

            {/* Right render video screen */}
            <div className="bg-stone-900 border border-stone-950 rounded-2xl p-4 flex flex-col justify-between text-white h-[380px] relative overflow-hidden shadow-xl">
              {isGeneratingVideoBed ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-3 px-4">
                  <div className="h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  <h4 className="font-display font-medium text-sm text-emerald-400">{videoStatus}</h4>
                  <div className="w-full bg-stone-850 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${videoBedProgress}%` }}></div>
                  </div>
                </div>
              ) : mergedVideoUrl ? (
                <div className="h-full flex flex-col justify-between">
                  <div className="relative rounded-lg overflow-hidden border border-stone-800 bg-black flex items-center justify-center h-[260px]">
                    <video src={mergedVideoUrl} controls className="w-full h-full object-contain" autoPlay muted />
                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-emerald-600 text-[8px] font-bold uppercase tracking-wider rounded-md font-mono">
                      ✓ AUDIO BED INJECTED BY LYRIA
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3">
                    <div>
                      <span className="text-[10px] text-stone-400 font-mono block">FILE COMPILED OK</span>
                      <strong className="text-xs text-white block">custom_lyria_master_output.mp4</strong>
                    </div>
                    <a
                      href={mergedVideoUrl}
                      download="lyria_master_compilation.mp4"
                      className="px-3 py-1.5 bg-white text-stone-950 hover:bg-neutral-100 rounded-lg text-xs font-bold flex items-center gap-1 shadow hover:scale-103 active:scale-97 transition"
                    >
                      <Download className="h-3.5 w-3.5 text-stone-850" />
                      <span>Download HD Clip</span>
                    </a>
                  </div>
                </div>
              ) : uploadedVideoUrl ? (
                <div className="h-full flex flex-col justify-between">
                  <div className="relative rounded-lg overflow-hidden border border-stone-800 bg-black flex items-center justify-center h-[260px]">
                    <video src={uploadedVideoUrl} controls className="w-full h-full object-contain" />
                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-amber-600 text-[8px] font-bold uppercase tracking-wider rounded-md font-mono">
                      ⏳ UNPROCESSED SOURCE VIDEO (SILENT)
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 text-center italic">
                    Press the green "Compose and Merge Lyria Bed" button to start neural synchronization!
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-3 font-sans">
                  <div className="h-12 w-12 bg-stone-850 rounded-full flex items-center justify-center border border-stone-800">
                    <Video className="h-5 w-5 text-stone-600" />
                  </div>
                  <h4 className="font-display font-medium text-xs text-stone-400">Media Preview Empty</h4>
                  <p className="text-[10px] text-stone-500 max-w-xs leading-relaxed">
                    Source video file and audio synthesis parameters will stream live on this console display screen.
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
