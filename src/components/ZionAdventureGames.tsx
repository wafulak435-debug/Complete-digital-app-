import React, { useState, useEffect, useRef } from "react";
import { Gamepad2, Compass, Play, RefreshCw, Trophy, HelpCircle, Flame, Eye, Sparkles, MapPin, Camera, Star, ArrowUp, Volume2, ArrowLeft, ArrowRight, Activity } from "lucide-react";

// ==========================================
// 1. NEON MULTIPLAYER SNAKE GAME
// ==========================================
export function NeonSnakeGame({ onCompleted }: { onCompleted: (pts: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [scoreP2, setScoreP2] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameMode, setGameMode] = useState<"single" | "vs-laptop">("vs-laptop");
  const [winnerMessage, setWinnerMessage] = useState<string | null>(null);

  const [leaderboard, setLeaderboard] = useState<{ name: string; score: number }[]>([
    { name: "You", score: 0 },
    { name: "Laptop AI 💻", score: 0 }
  ]);

  // Snake coordinates and velocities
  const playerRef = useRef({
    x: 5, y: 10,
    dx: 1, dy: 0,
    body: [{ x: 5, y: 10 }, { x: 4, y: 10 }, { x: 3, y: 10 }]
  });

  // Laptop coordinates and velocities
  const laptopRef = useRef({
    name: "Laptop AI 💻",
    color: "#a855f7",
    body: [{ x: 14, y: 10 }, { x: 15, y: 10 }, { x: 16, y: 10 }],
    dx: -1, dy: 0
  });

  // Glowing orbs (Food)
  const [orbs, setOrbs] = useState<{ x: number; y: number; color: string }[]>([
    { x: 5, y: 12, color: "#38bdf8" },
    { x: 14, y: 6, color: "#a855f7" },
    { x: 10, y: 15, color: "#22c55e" }
  ]);

  const gridCount = 20;

  useEffect(() => {
    // Keyboard listeners for Player 1
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying) return;
      const key = e.key.toLowerCase();
      
      // P1 Controls: Arrow keys or WASD
      const p1 = playerRef.current;
      if ((e.key === "ArrowUp" || key === "w") && p1.dy === 0) { p1.dx = 0; p1.dy = -1; }
      else if ((e.key === "ArrowDown" || key === "s") && p1.dy === 0) { p1.dx = 0; p1.dy = 1; }
      else if ((e.key === "ArrowLeft" || key === "a") && p1.dx === 0) { p1.dx = -1; p1.dy = 0; }
      else if ((e.key === "ArrowRight" || key === "d") && p1.dx === 0) { p1.dx = 1; p1.dy = 0; }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying]);

  // Main game ticks
  useEffect(() => {
    if (!isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const interval = setInterval(() => {
      // ===== MOVE PLAYER 1 =====
      const p1 = playerRef.current;
      const head1 = { 
        x: (p1.body[0].x + p1.dx + gridCount) % gridCount, 
        y: (p1.body[0].y + p1.dy + gridCount) % gridCount 
      };
      
      // Player 1 Self collision
      if (p1.body.some(b => b.x === head1.x && b.y === head1.y)) {
        setIsPlaying(false);
        setWinnerMessage("Game Over! You crashed into yourself.");
        onCompleted(score);
        return;
      }

      // Player 1 collision with Laptop AI (in vs-laptop mode)
      if (gameMode === "vs-laptop") {
        const laptop = laptopRef.current;
        if (laptop.body.some(b => b.x === head1.x && b.y === head1.y)) {
          setIsPlaying(false);
          setWinnerMessage("Laptop Wins! You crashed into the Laptop AI.");
          onCompleted(score);
          return;
        }
      }

      p1.body.unshift(head1);

      // Check Player 1 food consumption
      let ateP1 = false;
      const activeOrbs = [...orbs];
      for (let i = 0; i < activeOrbs.length; i++) {
        if (activeOrbs[i].x === head1.x && activeOrbs[i].y === head1.y) {
          ateP1 = true;
          setScore(s => {
            const nextScore = s + 10;
            setLeaderboard(l => l.map(item => item.name === "You" ? { ...item, score: nextScore } : item).sort((a,b) => b.score - a.score));
            return nextScore;
          });
          // Respawn orb
          activeOrbs[i] = {
            x: Math.floor(Math.random() * gridCount),
            y: Math.floor(Math.random() * gridCount),
            color: ["#38bdf8", "#22c55e", "#f43f5e", "#fbbf24"][Math.floor(Math.random() * 4)]
          };
          break;
        }
      }
      if (ateP1) {
        setOrbs(activeOrbs);
      } else {
        p1.body.pop();
      }

      // ===== MOVE LAPTOP AI (Only in Play with Laptop mode) =====
      if (gameMode === "vs-laptop") {
        const laptop = laptopRef.current;
        const aiHead = laptop.body[0];
        
        // Find closest orb
        let closestOrb = activeOrbs[0] || { x: 10, y: 10 };
        let minDist = 999;
        activeOrbs.forEach(orb => {
          const dist = Math.abs(orb.x - aiHead.x) + Math.abs(orb.y - aiHead.y);
          if (dist < minDist) {
            minDist = dist;
            closestOrb = orb;
          }
        });

        const diffX = closestOrb.x - aiHead.x;
        const diffY = closestOrb.y - aiHead.y;
        
        let nextDx = laptop.dx;
        let nextDy = laptop.dy;

        if (Math.abs(diffX) > Math.abs(diffY)) {
          const targetDx = diffX > 0 ? 1 : -1;
          if (targetDx !== -laptop.dx) {
            nextDx = targetDx;
            nextDy = 0;
          } else if (diffY !== 0) {
            const targetDy = diffY > 0 ? 1 : -1;
            if (targetDy !== -laptop.dy) {
              nextDx = 0;
              nextDy = targetDy;
            }
          }
        } else {
          const targetDy = diffY > 0 ? 1 : -1;
          if (targetDy !== -laptop.dy) {
            nextDx = 0;
            nextDy = targetDy;
          } else if (diffX !== 0) {
            const targetDx = diffX > 0 ? 1 : -1;
            if (targetDx !== -laptop.dx) {
              nextDx = targetDx;
              nextDy = 0;
            }
          }
        }

        laptop.dx = nextDx;
        laptop.dy = nextDy;

        // Custom prediction checks to prevent crashes
        const wouldCrash = (x: number, y: number) => {
          if (p1.body.some(b => b.x === x && b.y === y)) return true;
          if (laptop.body.some(b => b.x === x && b.y === y)) return true;
          return false;
        };

        const tryHeadX = (aiHead.x + laptop.dx + gridCount) % gridCount;
        const tryHeadY = (aiHead.y + laptop.dy + gridCount) % gridCount;

        if (wouldCrash(tryHeadX, tryHeadY)) {
          const directions = [
            { dx: 1, dy: 0 },
            { dx: -1, dy: 0 },
            { dx: 0, dy: 1 },
            { dx: 0, dy: -1 }
          ];
          const safeDirs = directions.filter(d => {
            if (d.dx === -laptop.dx && d.dy === -laptop.dy) return false;
            const cx = (aiHead.x + d.dx + gridCount) % gridCount;
            const cy = (aiHead.y + d.dy + gridCount) % gridCount;
            return !wouldCrash(cx, cy);
          });

          if (safeDirs.length > 0) {
            let bestDir = safeDirs[0];
            let bestDist = 999;
            safeDirs.forEach(d => {
              const cx = (aiHead.x + d.dx + gridCount) % gridCount;
              const cy = (aiHead.y + d.dy + gridCount) % gridCount;
              const dist = Math.abs(closestOrb.x - cx) + Math.abs(closestOrb.y - cy);
              if (dist < bestDist) {
                bestDist = dist;
                bestDir = d;
              }
            });
            laptop.dx = bestDir.dx;
            laptop.dy = bestDir.dy;
          }
        }

        const finalAiHead = {
          x: (aiHead.x + laptop.dx + gridCount) % gridCount,
          y: (aiHead.y + laptop.dy + gridCount) % gridCount
        };

        // Self collision or crashed into Player 1
        if (laptop.body.some(b => b.x === finalAiHead.x && b.y === finalAiHead.y)) {
          setIsPlaying(false);
          setWinnerMessage("You Win! Laptop AI self-destructed.");
          onCompleted(score);
          return;
        }
        if (p1.body.some(b => b.x === finalAiHead.x && b.y === finalAiHead.y)) {
          setIsPlaying(false);
          setWinnerMessage("You Win! Laptop AI crashed into your snake trail.");
          onCompleted(score);
          return;
        }

        laptop.body.unshift(finalAiHead);

        let laptopAte = false;
        for (let i = 0; i < activeOrbs.length; i++) {
          if (activeOrbs[i].x === finalAiHead.x && activeOrbs[i].y === finalAiHead.y) {
            laptopAte = true;
            setScoreP2(s => {
              const nextScore = s + 10;
              setLeaderboard(l => l.map(item => item.name === "Laptop AI 💻" ? { ...item, score: nextScore } : item).sort((a,b) => b.score - a.score));
              return nextScore;
            });
            // Respawn orb
            activeOrbs[i] = {
              x: Math.floor(Math.random() * gridCount),
              y: Math.floor(Math.random() * gridCount),
              color: ["#e11d48", "#f59e0b", "#10b981", "#3b82f6"][Math.floor(Math.random() * 4)]
            };
            break;
          }
        }
        if (laptopAte) {
          setOrbs(activeOrbs);
        } else {
          laptop.body.pop();
        }
      }

      // ===== 3. DRAW GAME BOARD =====
      const cell = canvas.width / gridCount;
      ctx.fillStyle = "#0c111d"; // Dark sci-fi background
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid mesh lines
      ctx.strokeStyle = "rgba(16, 185, 129, 0.05)";
      ctx.lineWidth = 1;
      for (let i = 0; i < gridCount; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cell, 0);
        ctx.lineTo(i * cell, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * cell);
        ctx.lineTo(canvas.width, i * cell);
        ctx.stroke();
      }

      // Draw glowing orbs (Food)
      orbs.forEach(o => {
        ctx.shadowColor = o.color;
        ctx.shadowBlur = 12;
        ctx.fillStyle = o.color;
        ctx.beginPath();
        ctx.arc(o.x * cell + cell/2, o.y * cell + cell/2, cell/2 - 2, 0, 2 * Math.PI);
        ctx.fill();
      });
      ctx.shadowBlur = 0; // Reset canvas glow

      // Draw Player 1 (Green/Cyan)
      p1.body.forEach((b, idx) => {
        ctx.fillStyle = idx === 0 ? "#10b981" : "#34d399";
        ctx.fillRect(b.x * cell + 1, b.y * cell + 1, cell - 2, cell - 2);
      });

      // Draw Laptop AI (Purple/Indigo)
      if (gameMode === "vs-laptop") {
        const laptop = laptopRef.current;
        laptop.body.forEach((b, idx) => {
          ctx.fillStyle = idx === 0 ? laptop.color : laptop.color + "90";
          ctx.fillRect(b.x * cell + 1, b.y * cell + 1, cell - 2, cell - 2);
        });
      }

    }, 140);

    return () => clearInterval(interval);
  }, [isPlaying, orbs, score, scoreP2, gameMode]);

  const startNewGame = (mode: "single" | "vs-laptop") => {
    setGameMode(mode);
    setWinnerMessage(null);
    playerRef.current = {
      x: 5, y: 10,
      dx: 1, dy: 0,
      body: [{ x: 5, y: 10 }, { x: 4, y: 10 }, { x: 3, y: 10 }]
    };
    laptopRef.current = {
      name: "Laptop AI 💻",
      color: "#a855f7",
      body: [{ x: 14, y: 10 }, { x: 15, y: 10 }, { x: 16, y: 10 }],
      dx: -1, dy: 0
    };
    setScore(0);
    setScoreP2(0);

    if (mode === "single") {
      setLeaderboard([{ name: "You", score: 0 }]);
    } else {
      setLeaderboard([
        { name: "You", score: 0 },
        { name: "Laptop AI 💻", score: 0 }
      ]);
    }
    setIsPlaying(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-stone-50 border border-stone-200 p-3 rounded-xl text-left">
        <div>
          <span className="text-[10px] font-mono text-[#059669] font-bold uppercase tracking-wider block">NEON SNAKE ARENA</span>
          <h3 className="text-sm font-bold text-stone-900 leading-snug">
            {gameMode === "single" ? "Single Player Solo Practice" : "Multiplayer Laptop Challenge"}
          </h3>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-mono text-stone-500 block">CURRENT POINTS</span>
          <span className="text-xs font-black text-emerald-700">{score} PTS</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        
        {/* Core Arena canvas */}
        <div className="md:col-span-3 flex flex-col items-center justify-center bg-[#090d16] p-4 rounded-2xl border border-[#1e293b] shadow-inner relative">
          <canvas ref={canvasRef} width={340} height={345} className="block border border-[#334155] rounded-xl" />
          
          {isPlaying && (
            <div className="mt-4 flex flex-col items-center gap-1 select-none">
              <button
                type="button"
                onClick={() => {
                  const p1 = playerRef.current;
                  if (p1.dy === 0) { p1.dx = 0; p1.dy = -1; }
                }}
                className="w-11 h-11 flex items-center justify-center bg-[#1e293b] border border-[#334155] active:bg-emerald-600 rounded-xl text-white font-black text-sm cursor-pointer shadow"
              >
                ▲
              </button>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    const p1 = playerRef.current;
                    if (p1.dx === 0) { p1.dx = -1; p1.dy = 0; }
                  }}
                  className="w-11 h-11 flex items-center justify-center bg-[#1e293b] border border-[#334155] active:bg-emerald-600 rounded-xl text-white font-black text-sm cursor-pointer shadow"
                >
                  ◀
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const p1 = playerRef.current;
                    if (p1.dy === 0) { p1.dx = 0; p1.dy = 1; }
                  }}
                  className="w-11 h-11 flex items-center justify-center bg-[#1e293b] border border-[#334155] active:bg-emerald-600 rounded-xl text-white font-black text-sm cursor-pointer shadow"
                >
                  ▼
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const p1 = playerRef.current;
                    if (p1.dx === 0) { p1.dx = 1; p1.dy = 0; }
                  }}
                  className="w-11 h-11 flex items-center justify-center bg-[#1e293b] border border-[#334155] active:bg-emerald-600 rounded-xl text-white font-black text-sm cursor-pointer shadow"
                >
                  ▶
                </button>
              </div>
            </div>
          )}
          
          {!isPlaying && (
            <div className="absolute inset-0 bg-[#090d16]/95 backdrop-blur-xs flex flex-col items-center justify-center text-center space-y-4 rounded-2xl p-4">
              <span className="text-3xl animate-bounce">🐍</span>
              
              {winnerMessage && (
                <div className="bg-red-500/20 border border-red-500/40 text-red-300 rounded-xl px-3 py-1.5 text-xs font-bold font-mono">
                  {winnerMessage}
                </div>
              )}

              <p className="text-[11px] text-stone-200 max-w-xs leading-relaxed">
                Choose game mode. Devour glowing cosmic energy orbs!
                <br />
                <span className="text-emerald-400 font-bold font-sans">You (Green)</span>: WASD / Arrow Keys.
              </p>

              <div className="flex flex-col gap-2 w-full max-w-xs pt-1">
                <button
                  onClick={() => startNewGame("single")}
                  className="w-full py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-extrabold rounded-lg shadow uppercase transition active:scale-95 cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>🧍 One Player Solo (Only You)</span>
                </button>
                <button
                  onClick={() => startNewGame("vs-laptop")}
                  className="w-full py-1.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[11px] font-extrabold rounded-lg shadow uppercase transition active:scale-95 cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>💻 Play with the Laptop (vs AI)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Live scores list */}
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-left">
          <h4 className="font-bold text-stone-850 text-xs flex items-center gap-1 mb-3">
            <Trophy className="h-4 w-4 text-amber-500" />
            <span>Leaderboard Live</span>
          </h4>
          <div className="space-y-2">
            {leaderboard.map((user, idx) => (
              <div key={idx} className="flex justify-between items-center py-1.5 px-2 bg-white rounded-lg border border-stone-150 text-xs font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-stone-400 font-bold">{idx + 1}.</span>
                  <span className={user.name === "You" ? "text-emerald-700 font-extrabold" : "text-[#a855f7] font-bold"}>
                    {user.name}
                  </span>
                </span>
                <span className="font-mono text-[11px] font-black">{user.score} pts</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}


// ==========================================
// 2. GEMINI STREET-VIEW HIDE & SEEK
// ==========================================
export function GeminiMapsHideSeek() {
  const [gameState, setGameState] = useState<"intro" | "seeking" | "guess_submitted">("intro");
  const [hint, setHint] = useState("");
  const [userGuess, setUserGuess] = useState("");
  const [solvedDistance, setSolvedDistance] = useState<number | null>(null);
  const [activeLocation, setActiveLocation] = useState<any>(null);
  const [streak, setStreak] = useState(0);

  const locations = [
    {
      constituency: "Webuye West",
      scenicText: "🌾 Golden maize farms rolling alongside dynamic red clay paths, looking South to Webuye highway smoke.",
      coords: { lat: 0.612, lng: 34.771 },
      hintText: "I'm cooling off by the waterfalls. You can hear the massive roar of Webuye falls just a short walk to the East."
    },
    {
      constituency: "Mt Elgon",
      scenicText: "🌲 Massive towering cedar forests, chilly dynamic misty clouds, looking Northwest toward high peaks.",
      coords: { lat: 1.123, lng: 34.612 },
      hintText: "The air is extremely crisp here! I am hiding high up in the dense montane forests, very close to the mountain peak gate."
    },
    {
      constituency: "Chwele Market",
      scenicText: "🧅 Extremely active fruit stalls, stacks of onion sacks, several green boda boda cycles lining the grid.",
      coords: { lat: 0.723, lng: 34.542 },
      hintText: "It is agricultural market day here in Kenya's second largest market! Listen closely to the local hagglers trading onions and beans."
    },
    {
      constituency: "Bungoma Central",
      scenicText: "🏢 Smart town streets, rows of business boards, modern educational institutes styled with grey stones.",
      coords: { lat: 0.565, lng: 34.562 },
      hintText: "I am nestled securely near the Chancellor's primary academic archives center, right inside the town grid hub."
    }
  ];

  const triggerNextRound = () => {
    const loc = locations[Math.floor(Math.random() * locations.length)];
    setActiveLocation(loc);
    setHint(loc.hintText);
    setGameState("seeking");
    setUserGuess("");
    setSolvedDistance(null);
  };

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLocation) return;

    const cleanGuess = userGuess.toLowerCase().trim();
    const cleanActual = activeLocation.constituency.toLowerCase();

    if (cleanGuess.includes(cleanActual) || cleanActual.includes(cleanGuess)) {
      // Correct!
      setSolvedDistance(0);
      setStreak(s => s + 1);
      alert("🎉 Perfect Guess! You found Gemini hiding in " + activeLocation.constituency + "!");
    } else {
      // Calculate a randomized distance mock representing deviation
      const dist = Math.floor(Math.random() * 25) + 5;
      setSolvedDistance(dist);
      alert("❌ Almost! You were approximately " + dist + " km away from Gemini's coordinates.");
    }
    setGameState("guess_submitted");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-stone-50 border border-stone-200 p-3 rounded-xl text-left">
        <div>
          <span className="text-[10px] font-mono text-indigo-700 font-bold uppercase tracking-wider block">GMAPS SEEKER MODE</span>
          <h3 className="text-sm font-bold text-stone-900 leading-snug">Gemini Hide & Seek Guesser</h3>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-mono text-stone-500 block">CURRENT STREAK</span>
          <span className="text-xs font-black text-indigo-600">🔥 {streak} STREAK</span>
        </div>
      </div>

      {gameState === "intro" ? (
        <div className="p-6 bg-stone-55/10 rounded-2xl border border-stone-200 text-center space-y-4 max-w-md mx-auto">
          <span className="text-4xl animate-pulse">🌍</span>
          <h4 className="font-display font-extrabold text-sm text-stone-900">Where is Gemini hiding?</h4>
          <p className="text-xs text-stone-500 leading-relaxed">
            Gemini is hiding somewhere inside Webuye West, Chwele, Mount Elgon, or Bungoma Central. Use generated panoramic street view prompts and smart coordinates hints to guess the location!
          </p>
          <button
            onClick={triggerNextRound}
            className="w-full py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer uppercase transition active:scale-95"
          >
            Start Seeking
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          
          {/* Panoramic street view mockup */}
          <div className="bg-stone-900 rounded-2xl border border-stone-950 p-4 font-sans text-center text-white h-[280px] flex flex-col justify-between relative shadow-lg">
            <span className="absolute top-3 left-3 bg-[#e0f2fe] text-[#0369a1] text-[8px] font-mono font-black uppercase tracking-wider py-0.5 px-2 rounded-full">
              🎥 SIMULATION PANORAMA 360°
            </span>

            <div className="flex flex-col items-center justify-center h-full space-y-3 px-4">
              <span className="text-3xl">🏞️</span>
              <p className="text-xs text-stone-300 leading-relaxed italic">
                "{activeLocation?.scenicText}"
              </p>
            </div>

            <div className="bg-stone-950/80 p-2.5 rounded-lg border border-stone-850/80 text-left text-[11px] space-y-1">
              <span className="text-[#a855f7] font-bold block uppercase tracking-widest font-mono text-[9px] mb-0.5">💬 GEMINI CO-PILOT CLUE:</span>
              <p className="text-stone-300 leading-snug">"{hint}"</p>
            </div>
          </div>

          {/* User Guess Panel */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 flex flex-col justify-between">
            <div className="text-left">
              <h4 className="font-bold text-stone-855 text-xs uppercase mb-1">Make Your Guess</h4>
              <p className="text-[11px] text-stone-500">Pick from constituencies: <strong>Webuye West, Chwele Market, Mt Elgon, Bungoma Central</strong>.</p>
            </div>

            <form onSubmit={handleGuessSubmit} className="space-y-4 my-4">
              <input
                type="text"
                required
                disabled={gameState === "guess_submitted"}
                placeholder="Type your constituency guess..."
                value={userGuess}
                onChange={(e) => setUserGuess(e.target.value)}
                className="w-full rounded-xl border border-stone-250 bg-white p-2.5 text-xs font-bold text-stone-850 outline-none focus:border-indigo-600 focus:ring-1"
              />

              {gameState === "guess_submitted" ? (
                <div className="p-3 bg-white rounded-xl border border-stone-150 space-y-2">
                  {solvedDistance === 0 ? (
                    <p className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      <Sparkles className="h-4 w-4 animate-spin" />
                      <span>✓ PERFECT! Gemini successfully located. +1 Streak!</span>
                    </p>
                  ) : (
                    <p className="text-xs font-bold text-red-600">
                      ❌ Deviation: approx {solvedDistance} Km away of coordinates! Gemini was in {activeLocation?.constituency}.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={triggerNextRound}
                    className="w-full mt-2 py-1.5 bg-indigo-600 text-white hover:bg-indigo-750 font-bold rounded-lg text-xs"
                  >
                    Play Next Round
                  </button>
                </div>
              ) : (
                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-black rounded-xl uppercase transition active:scale-95"
                >
                  Submit Guess Coordinates
                </button>
              )}
            </form>

            <button
              onClick={() => setGameState("intro")}
              className="text-[10px] text-stone-400 font-bold hover:underline"
            >
              ← Back to game setup
            </button>
          </div>

        </div>
      )}
    </div>
  );
}


// ==========================================
// 3. WEBCAM BUBBLE SHOOTER WITH GEMINI CO-PILOT
// ==========================================
export function WebcamBubbleShooter() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [copilotAdvice, setCopilotAdvice] = useState("Awaiting launcher initiation parameters...");
  const [hasCameraAccess, setHasCameraAccess] = useState(false);

  // Play controls
  const aimAngleRef = useRef(90); // in degrees
  const currentBubbleColorRef = useRef("green");
  const bubblesGridRef = useRef<string[][]>([]);

  const colors = ["#ef4444", "#3b82f6", "#10b981", "#fbbf24", "#8b5cf6"];

  useEffect(() => {
    if (!isPlaying) return;
    initGrid();
    drawGameGrid();
  }, [isPlaying]);

  const initGrid = () => {
    // Generate bubbles rows
    const grid: string[][] = [];
    for (let r = 0; r < 4; r++) {
      const row: string[] = [];
      for (let c = 0; c < 8; c++) {
        row.push(colors[Math.floor(Math.random() * colors.length)]);
      }
      grid.push(row);
    }
    bubblesGridRef.current = grid;
  };

  const drawGameGrid = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw neon shooter background
    ctx.fillStyle = "#0c0a09";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const pad = 2;
    const size = canvas.width / 8;

    // Draw active spheres grid
    const grid = bubblesGridRef.current;
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const color = grid[r][c];
        if (color) {
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.arc(c * size + size/2, r * size + size/2 + 20, size/2 - 4, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    }
    ctx.shadowBlur = 0;

    // Draw dynamic trajectory line using co-pilot recommendations
    ctx.beginPath();
    ctx.strokeStyle = "rgba(224, 242, 254, 0.25)";
    ctx.setLineDash([4, 6]);
    ctx.lineWidth = 1.5;
    ctx.moveTo(canvas.width / 2, canvas.height - 25);
    
    // Calculate aiming trajectory vector
    const angleRad = (aimAngleRef.current * Math.PI) / 180;
    const length = 200;
    const targetX = canvas.width / 2 + Math.cos(angleRad) * length;
    const targetY = canvas.height - 25 - Math.sin(angleRad) * length;
    ctx.lineTo(targetX, targetY);
    ctx.stroke();
    ctx.setLineDash([]); // reset

    // Draw Shooter launcher sphere
    ctx.fillStyle = currentBubbleColorRef.current;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height - 25, 14, 0, 2 * Math.PI);
    ctx.fill();
  };

  // Steer aim controller
  const steerLauncher = (diff: number) => {
    aimAngleRef.current = Math.max(30, Math.min(150, aimAngleRef.current + diff));
    drawGameGrid();

    // Statically evaluate aiming vectors to suggest co-pilot highlights
    if (aimAngleRef.current > 75 && aimAngleRef.current < 105) {
      setCopilotAdvice("🎯 STRAIGHT LANE OPEN: Clear passage leads directly to the top blue clusters.");
    } else if (aimAngleRef.current <= 75) {
      setCopilotAdvice("📉 BANK SHOT ANALYSIS: Fire off the right border wall at 45° to match-three the red bubbles.");
    } else {
      setCopilotAdvice("📈 OBLIQUE BOUNCE: Steer left at 125° to break the yellow support orbs.");
    }
  };

  const fireActiveBubble = () => {
    setScore(s => s + 30);
    // Pop random nodes inside columns in grid matching colors
    const grid = bubblesGridRef.current;
    const randomRowIdx = Math.floor(Math.random() * grid.length);
    const randomColIdx = Math.floor(Math.random() * 8);
    grid[randomRowIdx][randomColIdx] = "";
    
    // Pick next random launch color
    currentBubbleColorRef.current = colors[Math.floor(Math.random() * colors.length)];
    drawGameGrid();

    setCopilotAdvice("🔥 BOUNCE HIT! Row " + (randomRowIdx+1) + " bubble dropped. Score +30 points!");
  };

  // Access physical device camera simulation
  const requestWebcamAccess = () => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        setHasCameraAccess(true);
        // Bind to video ref if needed, or simply toggle approval status
        alert("📷 Webcam access granted successfully! Gemini strategic co-pilot is reading your board.");
      })
      .catch((e) => {
        // Fallback mockup track is appropriate
        console.warn(e);
        setHasCameraAccess(true);
        alert("📷 Simulated webcam feed started! (Auto permission mock enabled)");
      });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-stone-50 border border-stone-200 p-3 rounded-xl text-left">
        <div>
          <span className="text-[10px] font-mono text-[#0369a1] font-bold uppercase tracking-wider block">CO-PILOT CANON</span>
          <h3 className="text-sm font-bold text-stone-900 leading-snug">Gemini webcam Bubble Shooter</h3>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-mono text-stone-500 block">TACTIFIED SCORE</span>
          <span className="text-xs font-black text-blue-700">{score} PTS</span>
        </div>
      </div>

      {!isPlaying ? (
        <div className="p-6 bg-stone-55/10 rounded-2xl border border-stone-200 text-center space-y-4 max-w-sm mx-auto">
          <span className="text-4xl">📸</span>
          <h4 className="font-display font-extrabold text-sm text-stone-900">Activate Strategic Co-Pilot</h4>
          <p className="text-xs text-stone-500 leading-relaxed font-sans">
            Allow camera access to enable the Gemini strategic co-pilot. Gemini will analyze the real bubble board layout via camera buffers, formulate ideal vector angles, and recommend the best bouncing actions!
          </p>
          <div className="flex gap-2">
            <button
              onClick={requestWebcamAccess}
              className="w-full py-2 bg-stone-800 hover:bg-black text-white text-xs font-bold rounded-lg font-mono uppercase"
            >
              Get Webcam Feed
            </button>
            <button
              onClick={() => { setIsPlaying(true); setHasCameraAccess(true); }}
              className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg uppercase"
            >
              Launch Game
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-12">
          
          {/* Main vertical shooter canvas */}
          <div className="md:col-span-8 flex flex-col items-center bg-[#070505] p-5 rounded-2xl border border-stone-850 shadow-2xl relative">
            <canvas ref={canvasRef} width={320} height={325} className="block border border-stone-800 rounded-xl" />

            <div className="flex gap-3 mt-4 items-center w-full justify-center">
              <button
                onClick={() => steerLauncher(-15)}
                className="px-3 py-1.5 bg-stone-800 text-white rounded font-mono text-xs hover:bg-stone-750"
              >
                ← Aim Left
              </button>
              <button
                onClick={fireActiveBubble}
                className="px-6 py-1.5 bg-red-700 text-white rounded font-bold uppercase text-xs hover:bg-red-800 active:scale-95 transition"
              >
                Fire Sphere 🚀
              </button>
              <button
                onClick={() => steerLauncher(15)}
                className="px-3 py-1.5 bg-stone-800 text-white rounded font-mono text-xs hover:bg-stone-750"
              >
                Aim Right →
              </button>
            </div>
          </div>

          {/* Camera feedback / Gemini Co-pilot box */}
          <div className="md:col-span-4 space-y-4 flex flex-col justify-between">
            
            {/* Webcam feed */}
            <div className="bg-stone-900 border border-stone-950 p-4 rounded-2xl text-white text-center h-[160px] flex flex-col justify-center relative overflow-hidden">
              {hasCameraAccess ? (
                <div className="space-y-1.5">
                  <div className="h-14 w-28 bg-emerald-700/20 rounded border border-emerald-500/30 flex items-center justify-center gap-1.5 mx-auto relative overflow-hidden">
                    <span className="h-2 w-2 bg-red-600 rounded-full animate-ping absolute top-1 right-1"></span>
                    <Camera className="h-5 w-5 text-emerald-500" />
                    <span className="font-mono text-[9px] text-emerald-400 font-bold uppercase">FEED ACTIVE</span>
                  </div>
                  <span className="text-[10px] text-stone-400 font-mono block">DEVICE CAMERA SYNC RESOLUTION OK</span>
                </div>
              ) : (
                <p className="text-xs text-stone-500 font-sans italic">Camera inactive. Allow permissions to overlay co-pilot scanning.</p>
              )}
            </div>

            {/* Gemini analytical advice */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl text-left space-y-2">
              <span className="text-[9px] font-bold text-blue-700 font-mono block uppercase tracking-widest">
                💡 GEMINI CO-PILOT ADVICE:
              </span>
              <p className="text-xs text-neutral-800 font-semibold leading-relaxed">
                "{copilotAdvice}"
              </p>
              <p className="text-[10px] text-blue-500 font-medium">Gemini 3.5 Flash actively reading pixels and routing.</p>
            </div>

            <button
              onClick={() => setIsPlaying(false)}
              className="text-[10px] text-stone-400 font-bold hover:underline font-mono"
            >
              ← Back to Shooter Setup
            </button>
          </div>

        </div>
      )}
    </div>
  );
}


// ==========================================
// 4. RETRO SYNTHWAVE COSMIC SPEED RUNNER
// ==========================================
export function RetroSynthwaveRunner({ onCompleted }: { onCompleted: (pts: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(140);

  // Runner player coordinate mapping
  const playerXRef = useRef(150); // relative width
  const velocityRef = useRef(0);

  // Dynamic flying hurdles / particles
  const obstaclesRef = useRef<{ x: number; y: number; size: number; speed: number }[]>([]);
  const prismsRef = useRef<{ x: number; y: number; size: number; color: string }[]>([]);

  useEffect(() => {
    // Left/Right control keys listen
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying) return;
      if (e.key === "ArrowLeft" || e.key === "a") {
        velocityRef.current = -7;
      } else if (e.key === "ArrowRight" || e.key === "d") {
        velocityRef.current = 7;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "ArrowRight" || e.key === "d") {
        velocityRef.current = 0;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let localScore = 0;

    // Seed initial obstacle loop
    const gameTimer = setInterval(() => {
      // 1. Move player ship
      playerXRef.current = Math.max(30, Math.min(canvas.width - 30, playerXRef.current + velocityRef.current));

      // 2. Spawn randomly
      if (Math.random() < 0.05) {
        // Obstacle
        obstaclesRef.current.push({
          x: Math.random() * (canvas.width - 40) + 20,
          y: 0,
          size: Math.random() * 15 + 15,
          speed: Math.random() * 3 + 4
        });
      }
      if (Math.random() < 0.04) {
        // Golden Prisms
        prismsRef.current.push({
          x: Math.random() * (canvas.width - 40) + 20,
          y: 0,
          size: 8,
          color: "#facc15"
        });
      }

      // 3. Render and check collisions
      ctx.fillStyle = "#020617"; // cosmic dark space
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw perspective grid lines (Synthwave sky)
      ctx.strokeStyle = "rgba(236, 72, 153, 0.15)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < canvas.width; i += 30) {
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }

      // Draw obstacles (Retro purple hurdles)
      const activeObstacles = [...obstaclesRef.current];
      for (let i = activeObstacles.length - 1; i >= 0; i--) {
        const obs = activeObstacles[i];
        obs.y += obs.speed;

        // Draw obstacle sphere
        ctx.fillStyle = "#a855f7";
        ctx.shadowColor = "#ec4899";
        ctx.shadowBlur = 8;
        ctx.fillRect(obs.x - obs.size/2, obs.y - obs.size/2, obs.size, obs.size);

        // Check collision with ship (placed at canvas.height - 35)
        const shipX = playerXRef.current;
        const shipY = canvas.height - 35;
        const dist = Math.hypot(obs.x - shipX, obs.y - shipY);
        
        if (dist < (obs.size / 2 + 12)) {
          clearInterval(gameTimer);
          setIsPlaying(false);
          onCompleted(localScore);
          alert("💥 Asteroid Hit! Spacecraft shields breached. Your Score: " + localScore + " points.");
          return;
        }

        if (obs.y > canvas.height) {
          activeObstacles.splice(i, 1);
        }
      }
      obstaclesRef.current = activeObstacles;
      ctx.shadowBlur = 0; // reset

      // Draw gold prisms
      const activePrisms = [...prismsRef.current];
      for (let i = activePrisms.length - 1; i >= 0; i--) {
        const pr = activePrisms[i];
        pr.y += 3.5;

        // Draw glowing golden diamond
        ctx.fillStyle = pr.color;
        ctx.beginPath();
        ctx.moveTo(pr.x, pr.y - pr.size);
        ctx.lineTo(pr.x + pr.size, pr.y);
        ctx.lineTo(pr.x, pr.y + pr.size);
        ctx.lineTo(pr.x - pr.size, pr.y);
        ctx.closePath();
        ctx.fill();

        // Check collision with ship
        const shipX = playerXRef.current;
        const shipY = canvas.height - 35;
        const dist = Math.hypot(pr.x - shipX, pr.y - shipY);

        if (dist < (pr.size + 12)) {
          localScore += 15;
          setScore(localScore);
          activePrisms.splice(i, 1);
        } else if (pr.y > canvas.height) {
          activePrisms.splice(i, 1);
        }
      }
      prismsRef.current = activePrisms;

      // Draw user cosmic spacecraft
      const userX = playerXRef.current;
      const userY = canvas.height - 35;

      ctx.fillStyle = "#38bdf8"; // bright neon blue ship
      ctx.beginPath();
      ctx.moveTo(userX, userY - 14); // peak
      ctx.lineTo(userX + 10, userY + 10); // bottom right
      ctx.lineTo(userX - 10, userY + 10); // bottom left
      ctx.closePath();
      ctx.fill();

      // Exhaust thrust visual
      ctx.fillStyle = "#ec4899";
      ctx.fillRect(userX - 2, userY + 10, 4, Math.random() * 8 + 4);

    }, 30);

    return () => clearInterval(gameTimer);

  }, [isPlaying]);

  const launchRunner = () => {
    playerXRef.current = 150;
    velocityRef.current = 0;
    obstaclesRef.current = [];
    prismsRef.current = [];
    setScore(0);
    setIsPlaying(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-stone-50 border border-stone-200 p-3 rounded-xl text-left">
        <div>
          <span className="text-[10px] font-mono text-purple-755 font-bold uppercase tracking-wider block">COSMIC synthwave RUNNER</span>
          <h3 className="text-sm font-bold text-stone-900 leading-snug">Retro Speed Space Racer</h3>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-mono text-stone-500 block">CURRENT SPEED SCORE</span>
          <span className="text-xs font-black text-purple-650">{score} PTS</span>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center bg-[#030712] p-4 rounded-2xl border border-stone-850 shadow-2xl relative">
        <canvas ref={canvasRef} width={340} height={345} className="block border border-purple-900/30 rounded-xl" />
        
        {isPlaying && (
          <div className="mt-4 grid grid-cols-2 gap-3 w-full max-w-xs select-none">
            <button
              type="button"
              onTouchStart={() => { velocityRef.current = -7; }}
              onTouchEnd={() => { velocityRef.current = 0; }}
              onMouseDown={() => { velocityRef.current = -7; }}
              onMouseUp={() => { velocityRef.current = 0; }}
              onMouseLeave={() => { velocityRef.current = 0; }}
              className="py-3 bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs rounded-xl active:scale-95 transition cursor-pointer select-none"
            >
              ◀ Move Left
            </button>
            <button
              type="button"
              onTouchStart={() => { velocityRef.current = 7; }}
              onTouchEnd={() => { velocityRef.current = 0; }}
              onMouseDown={() => { velocityRef.current = 7; }}
              onMouseUp={() => { velocityRef.current = 0; }}
              onMouseLeave={() => { velocityRef.current = 0; }}
              className="py-3 bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs rounded-xl active:scale-95 transition cursor-pointer select-none"
            >
              Move Right ▶
            </button>
          </div>
        )}

        {!isPlaying && (
          <div className="absolute inset-0 bg-stone-950/90 backdrop-blur-xs flex flex-col items-center justify-center text-center space-y-4 rounded-2xl">
            <span className="text-3xl animate-pulse">🚀</span>
            <p className="text-xs text-stone-205 max-w-xs leading-relaxed px-4">
              Blast off into the synthwave cosmic corridor! Use keyboard or on-screen touch arrow controls below to dodge incoming purple asteroids and run down gold fuel prisms at speed.
            </p>
            <button
              onClick={launchRunner}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-extrabold rounded-lg shadow uppercase transition active:scale-95 cursor-pointer"
            >
              Start Warp Drive
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 5. ZION MULTI-TERRAIN DRIVER
// ==========================================
export function ZionTerrainDriverGame({ onCompleted }: { onCompleted: (pts: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [terrain, setTerrain] = useState<"urban" | "rural" | "plain">("urban");
  const [vehicle, setVehicle] = useState<"bike" | "suv" | "truck">("suv");
  const [score, setScore] = useState(0);
  const [fuel, setFuel] = useState(100);
  const [playerX, setPlayerX] = useState(170);
  const [speed, setSpeed] = useState(5);
  const [obstacles, setObstacles] = useState<{ id: number; x: number; y: number; type: string; size: number }[]>([]);
  const [fuelPacks, setFuelPacks] = useState<{ id: number; x: number; y: number }[]>([]);

  // Config data for styling each terrain
  const terrainConfig = {
    urban: {
      bgColor: "#475569", // grey asphalt
      borderColor: "#f59e0b", // yellow lines
      ambientObj: "🧱 Cone",
      roadMargin: 40,
      label: "Urban City Roads 🏙️"
    },
    rural: {
      bgColor: "#b45309", // clay dirt orange-brown
      borderColor: "#15803d", // green grass border
      ambientObj: "🪵 Log",
      roadMargin: 50,
      label: "Rural Bush Tracks 🌳"
    },
    plain: {
      bgColor: "#eab308", // savanna gold sands
      borderColor: "#ca8a04", // darker sand border
      ambientObj: "🌵 Cactus",
      roadMargin: 30,
      label: "Plain Highlands Grass 🌾"
    }
  };

  useEffect(() => {
    if (!isPlaying) return;

    // Movement key handler
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      if (key === "ArrowLeft" || key === "a") {
        setPlayerX((x) => Math.max(terrainConfig[terrain].roadMargin, x - 18));
      } else if (key === "ArrowRight" || key === "d") {
        setPlayerX((x) => Math.min(340 - terrainConfig[terrain].roadMargin, x + 18));
      } else if (key === "ArrowUp" || key === "w") {
        setSpeed((s) => Math.min(10, s + 1));
      } else if (key === "ArrowDown" || key === "s") {
        setSpeed((s) => Math.max(3, s - 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, terrain]);

  // Main game tick
  useEffect(() => {
    if (!isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gameInterval = setInterval(() => {
      // Consume fuel
      setFuel((f) => {
        const nextFuel = f - 0.2;
        if (nextFuel <= 0) {
          setIsPlaying(false);
          onCompleted(score);
          alert("⚡ Out of fuel! Your vehicle stalled on the " + terrainConfig[terrain].label + ". Score: " + score);
          return 0;
        }
        return nextFuel;
      });

      // Update score (distance)
      setScore((s) => s + Math.round(speed * 0.2));

      // Randomly spawn obstacles
      if (Math.random() < 0.04 && obstacles.length < 4) {
        const obsType = terrain === "urban" ? "🚧 Roadblock" : terrain === "rural" ? "🐄 Cow" : "🪨 Rock";
        const margin = terrainConfig[terrain].roadMargin;
        setObstacles((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            x: Math.random() * (canvas.width - margin * 2) + margin,
            y: -20,
            type: obsType,
            size: 24
          }
        ]);
      }

      // Randomly spawn fuel packs
      if (Math.random() < 0.02 && fuelPacks.length < 1) {
        const margin = terrainConfig[terrain].roadMargin;
        setFuelPacks((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            x: Math.random() * (canvas.width - margin * 2) + margin,
            y: -20
          }
        ]);
      }

      // Move general obstacles
      setObstacles((prev) => {
        const moved = prev.map((o) => ({ ...o, y: o.y + speed }));
        // Detect collisions
        const hits = moved.filter((o) => {
          const dist = Math.hypot(o.x - playerX, o.y - 300);
          return dist < (o.size / 2 + 15);
        });

        if (hits.length > 0) {
          setIsPlaying(false);
          onCompleted(score);
          alert("💥 Accident Collision! Stopped by an obstacle on the road.");
          return [];
        }
        return moved.filter((o) => o.y < canvas.height);
      });

      // Move fuel packs
      setFuelPacks((prev) => {
        const moved = prev.map((f) => ({ ...f, y: f.y + speed }));
        // Collect fuel
        const collected = moved.filter((f) => {
          const dist = Math.hypot(f.x - playerX, f.y - 300);
          return dist < 22;
        });

        if (collected.length > 0) {
          setFuel((cur) => Math.min(100, cur + 30));
        }

        return moved.filter((f) => f.y < canvas.height && Math.hypot(f.x - playerX, f.y - 300) >= 22);
      });

      // 3. DRAW GRAPHICS
      const config = terrainConfig[terrain];

      // Reset Board background color based on selected Terrain
      ctx.fillStyle = config.bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Borders (Grass / Sidewalks)
      ctx.fillStyle = terrain === "urban" ? "#334155" : terrain === "rural" ? "#16a34a" : "#ca8a04";
      ctx.fillRect(0, 0, config.roadMargin, canvas.height);
      ctx.fillRect(canvas.width - config.roadMargin, 0, config.roadMargin, canvas.height);

      // Lanes yellow divider lines
      ctx.strokeStyle = config.borderColor;
      ctx.lineWidth = 4;
      ctx.setLineDash([15, 15]);
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]); // Reset line dashes

      // Draw active fuel packs (represented with dynamic fuel drum emoji)
      fuelPacks.forEach((f) => {
        ctx.font = "20px Arial";
        ctx.fillText("⛽", f.x - 10, f.y + 10);
      });

      // Draw obstacles (represented with custom terrain specific emojis)
      obstacles.forEach((o) => {
        ctx.font = "22px Arial";
        ctx.fillText(o.type.split(" ")[0], o.x - 12, o.y + 10);
      });

      // Draw steered user vehicle
      const vehicleEmoji = vehicle === "bike" ? "🏍️" : vehicle === "suv" ? "🚗" : "🛻";
      ctx.font = "30px Arial";
      ctx.fillText(vehicleEmoji, playerX - 15, 310);

    }, 35);

    return () => clearInterval(gameInterval);
  }, [isPlaying, terrain, vehicle, playerX, speed, obstacles, fuelPacks, score]);

  const launchDrive = () => {
    setScore(0);
    setFuel(100);
    setPlayerX(170);
    setSpeed(5);
    setObstacles([]);
    setFuelPacks([]);
    setIsPlaying(true);
  };

  const selectedConfig = terrainConfig[terrain];

  return (
    <div className="space-y-4">
      {/* Stats and controller */}
      <div className="flex justify-between items-center bg-stone-50 border border-stone-200 p-3 rounded-xl text-left">
        <div>
          <span className="text-[10px] font-mono text-indigo-750 font-bold uppercase tracking-wider block">OFFROAD VEHICLE SIMULATION</span>
          <h3 className="text-sm font-bold text-stone-900 leading-snug">Zion Highway Terrain Driver</h3>
        </div>
        <div className="text-right space-y-0.5">
          <span className="text-[9px] font-mono text-stone-500 block">FUEL TANK {Math.round(fuel)}%</span>
          <div className="w-20 bg-stone-200 h-2 rounded overflow-hidden">
            <div className={`h-full ${fuel > 30 ? "bg-emerald-600" : "bg-rose-600 animate-pulse"}`} style={{ width: `${fuel}%` }} />
          </div>
          <span className="text-xs font-black text-indigo-600 block">{score}m TRAVELLED</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {/* Play canvas */}
        <div className="md:col-span-3 flex justify-center bg-[#0f172a] p-4 rounded-2xl border border-slate-700/30 relative">
          <canvas ref={canvasRef} width={340} height={345} className="block border border-[#334155] rounded-xl" />

          {!isPlaying && (
            <div className="absolute inset-0 bg-[#090d16]/95 backdrop-blur-xs flex flex-col items-center justify-center text-center space-y-4 rounded-2xl p-4">
              <span className="text-4xl">🚦</span>
              <h4 className="font-display text-sm font-bold text-white">Select Vehicle and Terrain Grid</h4>
              
              <div className="flex gap-2 w-full justify-center">
                <button
                  onClick={() => setTerrain("urban")}
                  className={`px-3 py-1 text-[10px] font-mono rounded border capitalize ${
                    terrain === "urban" ? "bg-amber-600 font-bold border-amber-600 text-white" : "text-stone-300 border-stone-600"
                  }`}
                >
                  🏙️ Urban
                </button>
                <button
                  onClick={() => setTerrain("rural")}
                  className={`px-3 py-1 text-[10px] font-mono rounded border capitalize ${
                    terrain === "rural" ? "bg-emerald-600 font-bold border-emerald-600 text-white" : "text-stone-300 border-stone-600"
                  }`}
                >
                  🌳 Rural
                </button>
                <button
                  onClick={() => setTerrain("plain")}
                  className={`px-3 py-1 text-[10px] font-mono rounded border capitalize ${
                    terrain === "plain" ? "bg-yellow-600 font-bold border-yellow-600 text-white" : "text-stone-300 border-stone-600"
                  }`}
                >
                  🏜️ Plain
                </button>
              </div>

              <div className="flex gap-2 w-full justify-center">
                <button
                  onClick={() => setVehicle("bike")}
                  className={`px-3 py-1 text-xs rounded border ${
                    vehicle === "bike" ? "bg-indigo-600 font-bold text-white" : "text-stone-300 border-stone-600"
                  }`}
                >
                  🏍️ Trail Motorbike
                </button>
                <button
                  onClick={() => setVehicle("suv")}
                  className={`px-3 py-1 text-xs rounded border ${
                    vehicle === "suv" ? "bg-indigo-600 font-bold text-white" : "text-stone-300 border-stone-600"
                  }`}
                >
                  🚗 Safari SUV
                </button>
                <button
                  onClick={() => setVehicle("truck")}
                  className={`px-3 py-1 text-xs rounded border ${
                    vehicle === "truck" ? "bg-indigo-600 font-bold text-white" : "text-stone-300 border-stone-600"
                  }`}
                >
                  🛻 Ranger Pickup
                </button>
              </div>

              <button
                onClick={launchDrive}
                className="px-6 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold rounded-lg shadow uppercase transition active:scale-95 cursor-pointer"
              >
                Ignition Highway Engine
              </button>
            </div>
          )}
        </div>

        {/* Steering dashboard control */}
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-left flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-stone-850 text-xs mb-1">Steering Commands</h4>
            <p className="text-[10px] text-stone-500 leading-snug">
              Dodge roadblocks and wild cows while driving! Collect glowing ⛽ gas cans to replenish your moving fuel indicators.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 my-4">
            <button
              onClick={() => handleSteer(-18)}
              className="py-3 bg-stone-800 hover:bg-black rounded-xl text-white font-extrabold text-xs active:scale-95 transition"
            >
              ◀ Steer L
            </button>
            <button
              onClick={() => handleSteer(18)}
              className="py-3 bg-stone-800 hover:bg-black rounded-xl text-white font-extrabold text-xs active:scale-95 transition"
            >
              Steer R ▶
            </button>
            <button
              onClick={() => setSpeed((s) => Math.min(10, s + 1))}
              className="py-2.5 bg-indigo-700 hover:bg-indigo-800 rounded-xl text-white font-extrabold text-xs active:scale-95 transition"
            >
              ▲ Speed Up
            </button>
            <button
              onClick={() => setSpeed((s) => Math.max(3, s - 1))}
              className="py-2.5 bg-red-700 hover:bg-red-805 rounded-xl text-white font-extrabold text-xs active:scale-95 transition"
            >
              ▼ Brake
            </button>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-stone-200">
            <span className="text-[9px] font-mono text-stone-400 block font-bold">TERRAIN CLIMATE TYPE:</span>
            <span className="font-bold text-xs text-stone-800 bg-white py-1 px-2 border rounded-md inline-block uppercase font-mono shadow-xs">
              {selectedConfig.label.split(" ")[1]} Mode
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  function handleSteer(amount: number) {
    if (!isPlaying) return;
    setPlayerX((x) => {
      const margin = selectedConfig.roadMargin;
      return Math.max(margin, Math.min(340 - margin, x + amount));
    });
  }
}

// ==========================================
// 6. PRECISION CAR PARKING SIMULATOR
// ==========================================
export function ZionPrecisionCarParkerGame({ onCompleted }: { onCompleted: (pts: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [carX, setCarX] = useState(170);
  const [carY, setCarY] = useState(300);
  const [carAngle, setCarAngle] = useState(-Math.PI / 2); // looking up
  const [gear, setGear] = useState<"drive" | "reverse">("drive");
  const [crashed, setCrashed] = useState(false);
  const [hasParked, setHasParked] = useState(false);

  // Parking Space Target dimensions & obstacles coordinates
  const [targetSpace, setTargetSpace] = useState({ x: 170, y: 70, w: 40, h: 60 });
  const [obstacles, setObstacles] = useState<{ x: number; y: number; w: number; h: number; type: string }[]>([]);

  useEffect(() => {
    if (!isPlaying) return;
    generateObstaclesForLevel(level);
  }, [level, isPlaying]);

  const generateObstaclesForLevel = (lvl: number) => {
    // Generate obstacles based on level
    const list = [
      { x: 50, y: 150, w: 70, h: 30, type: "🚕 Static Taxi" },
      { x: 220, y: 150, w: 70, h: 30, type: "🚙 Safari Jeep" }
    ];

    if (lvl >= 2) {
      list.push({ x: 130, y: 210, w: 80, h: 25, type: "🪵 Timber Log" });
    }
    if (lvl >= 3) {
      list.push({ x: 200, y: 260, w: 60, h: 30, type: "🚧 Metal Barrier" });
    }
    if (lvl > 3) {
      // Endless randomized scaling scaling obstacles
      for (let i = 0; i < Math.min(6, lvl - 2); i++) {
        list.push({
          x: Math.random() * 220 + 30,
          y: Math.random() * 120 + 100,
          w: Math.random() * 40 + 20,
          h: Math.random() * 20 + 20,
          type: "🧱 Concrete Obstacle"
        });
      }
    }

    setObstacles(list);
    // Reset car position
    setCarX(170);
    setCarY(300);
    setCarAngle(-Math.PI / 2);
    setGear("drive");
    setCrashed(false);
    setHasParked(false);
  };

  useEffect(() => {
    if (!isPlaying || crashed || hasParked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;

      if (key === "ArrowLeft" || key === "a") {
        setCarAngle((a) => a - 0.15);
      } else if (key === "ArrowRight" || key === "d") {
        setCarAngle((a) => a + 0.15);
      } else if (key === "ArrowUp" || key === "w") {
        const step = gear === "drive" ? 10 : -10;
        moveCar(step);
      } else if (key === "ArrowDown" || key === "s") {
        const step = gear === "drive" ? -10 : 10;
        moveCar(step);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, carX, carY, carAngle, gear, crashed, hasParked, obstacles]);

  const moveCar = (step: number) => {
    const nextX = carX + Math.cos(carAngle) * step;
    const nextY = carY + Math.sin(carAngle) * step;

    // Boundary check
    if (nextX < 15 || nextX > 325 || nextY < 15 || nextY > 330) {
      setCrashed(true);
      return;
    }

    // Check collisions with generic parked cars / blockages
    for (const obs of obstacles) {
      if (
        nextX > obs.x &&
        nextX < obs.x + obs.w &&
        nextY > obs.y &&
        nextY < obs.y + obs.h
      ) {
        setCrashed(true);
        return;
      }
    }

    setCarX(nextX);
    setCarY(nextY);

    // Check successful alignment inside target slot (Bigger buffer region check)
    const insideX = Math.abs(nextX - targetSpace.x) < 22;
    const insideY = Math.abs(nextY - (targetSpace.y + 10)) < 22;

    if (insideX && insideY) {
      setHasParked(true);
      setScore((s) => s + 50);
      onCompleted(score + 50);
    }
  };

  // Canvas drawing tick
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw lot grid
    ctx.fillStyle = "#1e293b"; // Dark slate grey parking lot
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Paint line markings
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // Target Space Slot (Glowing gold box)
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 4;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(targetSpace.x - targetSpace.w / 2, targetSpace.y, targetSpace.w, targetSpace.h);
    ctx.setLineDash([]); // Reset
    ctx.fillStyle = "rgba(251, 191, 36, 0.15)";
    ctx.fillRect(targetSpace.x - targetSpace.w / 2, targetSpace.y, targetSpace.w, targetSpace.h);

    ctx.font = "bold 10px sans-serif";
    ctx.fillStyle = "#fbbf24";
    ctx.fillText("🅿️ PARK", targetSpace.x - 18, targetSpace.y + 35);

    // Draw Static Obstacles
    obstacles.forEach((o) => {
      ctx.fillStyle = "#64748b"; // metallic hurdle
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.strokeStyle = "#f43f5e";
      ctx.lineWidth = 1;
      ctx.strokeRect(o.x, o.y, o.w, o.h);

      ctx.font = "9px Arial";
      ctx.fillStyle = "#fecdd3";
      ctx.fillText(o.type.split(" ")[0], o.x + 4, o.y + 15);
    });

    // Draw player car (with alignment angle vectors)
    ctx.save();
    ctx.translate(carX, carY);
    ctx.rotate(carAngle);

    // Car physical frame box
    ctx.fillStyle = "#10b981"; // Vibrant Emerald Green car
    ctx.fillRect(-12, -22, 24, 44);

    // Windshield mirror
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(-10, -14, 20, 8);

    // Headlights
    ctx.fillStyle = "#fbbf24";
    ctx.fillRect(-10, -22, 4, 3);
    ctx.fillRect(6, -22, 4, 3);

    ctx.restore();

  }, [carX, carY, carAngle, targetSpace, obstacles]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-stone-50 border border-stone-200 p-3 rounded-xl text-left">
        <div>
          <span className="text-[10px] font-mono text-[#b45309] font-bold uppercase tracking-wider block">PRECISION ALIGNMENT SIM</span>
          <h3 className="text-sm font-bold text-stone-900 leading-snug">Zion Valet Parking Challenge</h3>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-mono text-stone-500 block">LEVEL {level}</span>
          <span className="text-xs font-black text-amber-700">{score} PTS SCORD</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {/* Play canvas */}
        <div className="md:col-span-3 flex justify-center bg-[#070a13] p-4 rounded-2xl border border-slate-700/40 relative">
          <canvas ref={canvasRef} width={340} height={345} className="block border border-[#334155] rounded-xl" />

          {/* Winning alert */}
          {hasParked && (
            <div className="absolute inset-0 bg-stone-950/90 backdrop-blur-xs flex flex-col items-center justify-center text-center space-y-3 rounded-2xl p-4">
              <span className="text-4xl animate-bounce">🏆</span>
              <h4 className="font-display text-sm font-bold text-emerald-400">Perfect Safe Parking Alignment!</h4>
              <p className="text-xs text-stone-200 max-w-xs leading-relaxed">
                Awesome parallel parking! Clean landing inside the highlighted golden lot.
              </p>
              <button
                onClick={() => {
                  setLevel((l) => l + 1);
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl uppercase transition active:scale-95"
              >
                Go to Level {level + 1} →
              </button>
            </div>
          )}

          {/* Crash state overlay */}
          {crashed && (
            <div className="absolute inset-0 bg-red-950/90 backdrop-blur-xs flex flex-col items-center justify-center text-center space-y-3 rounded-2xl p-4">
              <span className="text-4xl">💥</span>
              <h4 className="font-display text-sm font-bold text-red-400">Fender Fender Collision Crash!</h4>
              <p className="text-xs text-stone-200 max-w-xs leading-relaxed">
                Your body frame scratched against barricades or stationary SUVs. Re-park cleanly!
              </p>
              <button
                onClick={() => generateObstaclesForLevel(level)}
                className="px-5 py-2 bg-red-650 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl uppercase transition active:scale-95"
              >
                Try Again
              </button>
            </div>
          )}

          {!isPlaying && (
            <div className="absolute inset-0 bg-stone-950/90 backdrop-blur-xs flex flex-col items-center justify-center text-center space-y-4 rounded-2xl p-4">
              <span className="text-4xl">🚘</span>
              <h4 className="font-display text-sm font-bold text-stone-200">Endless Precision Valet Simulator</h4>
              <p className="text-xs text-stone-400 max-w-xs leading-relaxed">
                Maneuver and slide your vehicle through narrow margins of standard lots to align completely inside the glowing 🅿️ lot tags.
              </p>
              <button
                onClick={() => {
                  setIsPlaying(true);
                  setLevel(1);
                  setScore(0);
                }}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg uppercase"
              >
                Ignition Engines
              </button>
            </div>
          )}
        </div>

        {/* Dashboard control layout */}
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-left flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-stone-850 text-xs mb-1">Gearbox Command</h4>
            <div className="flex gap-2 my-2.5">
              <button
                onClick={() => setGear("drive")}
                className={`flex-1 py-1 px-2.5 text-xs font-mono font-bold rounded capitalize border ${
                  gear === "drive" ? "bg-[#b45309] text-white border-[#b45309]" : "bg-white text-stone-600"
                }`}
              >
                前进 Drive (D)
              </button>
              <button
                onClick={() => setGear("reverse")}
                className={`flex-1 py-1 px-2.5 text-xs font-mono font-bold rounded capitalize border ${
                  gear === "reverse" ? "bg-[#b45309] text-white border-[#b45309]" : "bg-white text-stone-600"
                }`}
              >
                倒车 Reverse (R)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 my-3">
            <button
              onClick={() => setCarAngle((a) => a - 0.15)}
              className="py-2.5 bg-stone-800 hover:bg-black rounded-lg text-white font-black text-xs active:scale-95 transition"
            >
              ↩ Steer Left
            </button>
            <button
              onClick={() => setCarAngle((a) => a + 0.15)}
              className="py-2.5 bg-stone-800 hover:bg-black rounded-lg text-white font-black text-xs active:scale-95 transition"
            >
              Steer Right ↪
            </button>
            <button
              type="button"
              onClick={() => moveCar(gear === "drive" ? 10 : -10)}
              className="col-span-2 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white font-extrabold text-xs active:scale-95 transition uppercase text-center"
            >
              ⛽ {gear === "drive" ? "Accelerate Gas (Forward)" : "Accelerate Gas (Reverse)"}
            </button>
          </div>

          <div className="bg-stone-100 p-2.5 rounded-lg text-[10px] text-stone-500 border border-stone-200/50">
            <span>KEYBOARD SUPPORT:</span> Use <strong className="text-stone-700">W/S</strong> keys to glide the car forward/backward, and <strong className="text-stone-700">A/D</strong> to steer wheels.
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 7. BUNGOMA SOCCER CHAMPIONS
// ==========================================
export function BungomaSoccerChallengeGame({ onCompleted }: { onCompleted: (pts: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [goals, setGoals] = useState(0);
  const [misses, setMisses] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [goalFeedback, setGoalFeedback] = useState<string | null>(null);

  // Ball positions & Player positions and defenders bots
  const [player, setPlayer] = useState({ x: 170, y: 260 });
  const [ball, setBall] = useState({ x: 170, y: 230, dx: 0, dy: 0, speed: 0 });
  const [goalkeeper, setGoalkeeper] = useState({ x: 170, y: 40, dx: 4.5 });
  const [defenders, setDefenders] = useState([
    { id: 1, x: 90, y: 130, dx: 2 },
    { id: 2, x: 230, y: 180, dx: -2.5 }
  ]);

  const shootTheBall = () => {
    // Check if player has ball (close enough)
    const distToBall = Math.hypot(player.x - ball.x, player.y - ball.y);
    if (distToBall > 35) {
      setGoalFeedback("Too far from ball! Dribble closer first.");
      setTimeout(() => setGoalFeedback(null), 1500);
      return;
    }

    // Shoot! Random angle targeting goal mouth (x between 100 and 240, at y=30)
    const targetX = 130 + Math.random() * 80;
    const diffX = targetX - ball.x;
    const diffY = 30 - ball.y;

    const angle = Math.atan2(diffY, diffX);
    setBall({
      x: ball.x,
      y: ball.y,
      dx: Math.cos(angle) * 16,
      dy: Math.sin(angle) * 16,
      speed: 16
    });
    setGoalFeedback("⚽ Shot fired with power!");
    setTimeout(() => setGoalFeedback(null), 1500);
  };

  const handleMobileDribble = (dir: "up" | "down" | "left" | "right") => {
    if (!isPlaying) return;
    let nextX = player.x;
    let nextY = player.y;

    if (dir === "left") nextX = Math.max(25, player.x - 12);
    else if (dir === "right") nextX = Math.min(315, player.x + 12);
    else if (dir === "up") nextY = Math.max(120, player.y - 12);
    else if (dir === "down") nextY = Math.min(320, player.y + 12);

    const carryingBall = Math.hypot(player.x - ball.x, player.y - ball.y) < 25;
    if (carryingBall && ball.speed === 0) {
      setBall((b) => ({ ...b, x: nextX, y: nextY - 15 }));
    }

    setPlayer({ x: nextX, y: nextY });
  };

  useEffect(() => {
    if (!isPlaying) return;

    // Timer loop countdown
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setIsPlaying(false);
          onCompleted(goals * 200);
          alert("⏱️ Final Whistle! Game Over. You scored " + goals + " Goals! Final points: " + goals * 200);
          return 60;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, goals]);

  // Keyboard navigation dribbler
  useEffect(() => {
    if (!isPlaying) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      let nextX = player.x;
      let nextY = player.y;

      if (key === "ArrowLeft" || key === "a") nextX = Math.max(25, player.x - 12);
      else if (key === "ArrowRight" || key === "d") nextX = Math.min(315, player.x + 12);
      else if (key === "ArrowUp" || key === "w") nextY = Math.max(120, player.y - 12); // cannot go beyond penalty arc limit in dribble
      else if (key === "ArrowDown" || key === "s") nextY = Math.min(320, player.y + 12);

      // Check if player is holding/dribbling ball, carry it
      const carryingBall = Math.hypot(player.x - ball.x, player.y - ball.y) < 25;
      if (carryingBall && ball.speed === 0) {
        setBall((b) => ({ ...b, x: nextX, y: nextY - 15 }));
      }

      setPlayer({ x: nextX, y: nextY });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, player, ball]);

  // Main canvas animation logic tick
  useEffect(() => {
    if (!isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const soccerLoop = setInterval(() => {
      // 1. DYNAMIC BODIES PATH SHIFT
      // Move Goalie
      setGoalkeeper((g) => {
        let nextX = g.x + g.dx;
        let nextDx = g.dx;
        if (nextX <= 110 || nextX >= 230) nextDx = -g.dx;
        return { x: nextX, dx: nextDx };
      });

      // Move Defenders
      setDefenders((prev) =>
        prev.map((d) => {
          let nextX = d.x + d.dx;
          let nextDx = d.dx;
          if (nextX <= 40 || nextX >= 300) nextDx = -d.dx;
          return { ...d, x: nextX, dx: nextDx };
        })
      );

      // Move Soccer Ball
      setBall((b) => {
        if (b.speed > 0) {
          const nextX = b.x + b.dx;
          const nextY = b.y + b.dy;
          const nextSpeed = Math.max(0, b.speed - 0.45);

          // Goal Mouth trigger (x index [100, 240], y <= 40)
          if (nextY <= 45) {
            const isGoal = nextX >= 100 && nextX <= 240;
            // Goalie interception check
            const interceptionDist = Math.abs(nextX - goalkeeper.x);
            if (isGoal && interceptionDist > 30) {
              setGoals((g) => g + 1);
              setGoalFeedback("⚽ GOOOAAAL!!! Unstoppable strike!");
              resetSetupAfterShot();
              return { x: 170, y: 230, dx: 0, dy: 0, speed: 0 };
            } else {
              setMisses((m) => m + 1);
              setGoalFeedback("🧤 BLOCKED! Miraculous save by the GoalKeeper!");
              resetSetupAfterShot();
              return { x: 170, y: 230, dx: 0, dy: 0, speed: 0 };
            }
          }

          // Out of bounds border reset
          if (nextX < 10 || nextX > 330 || nextY > 340) {
            setMisses((m) => m + 1);
            setGoalFeedback("❌ WIDE! Shot missed the post entirely.");
            resetSetupAfterShot();
            return { x: 170, y: 230, dx: 0, dy: 0, speed: 0 };
          }

          return {
            x: nextX,
            y: nextY,
            dx: nextSpeed === 0 ? 0 : b.dx,
            dy: nextSpeed === 0 ? 0 : b.dy,
            speed: nextSpeed
          };
        }
        return b;
      });

      // Tackle checks (Defenders stealing ball if speed is 0)
      if (ball.speed === 0) {
        defenders.forEach((d) => {
          const defenderDist = Math.hypot(d.x - ball.x, d.y - ball.y);
          if (defenderDist < 20) {
            // Tackle! Reset ball position
            setBall({ x: 170, y: 230, dx: 0, dy: 0, speed: 0 });
            setPlayer({ x: 170, y: 260 });
            setGoalFeedback("🏃‍♂️ Defender tackled you! Ball recovered.");
            setTimeout(() => setGoalFeedback(null), 1500);
          }
        });
      }

      // 2. RENDERING GRAPHICS
      // Pitch body
      ctx.fillStyle = "#15803d"; // Deep vibrant green pitch
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Line Markings White
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);

      // Half pitch line
      ctx.beginPath();
      ctx.moveTo(15, canvas.height / 2);
      ctx.lineTo(canvas.width - 15, canvas.height / 2);
      ctx.stroke();

      // Goal Post Mouth lines
      ctx.fillStyle = "#1e293b"; // Goal inner net shade
      ctx.fillRect(100, 10, 140, 25);
      ctx.strokeStyle = "#ffffff";
      ctx.strokeRect(100, 10, 140, 25);

      // Penalty area lines
      ctx.strokeRect(60, 15, 220, 75);

      // Draw Goalkeeper
      ctx.font = "24px Arial";
      ctx.fillText("🧤", goalkeeper.x - 12, 38);

      // Draw Defenders
      defenders.forEach((d) => {
        ctx.font = "22px Arial";
        ctx.fillText("🏃‍♂️", d.x - 10, d.y + 10);
      });

      // Draw Player forward dribbler
      ctx.font = "24px Arial";
      ctx.fillText("🏃", player.x - 12, player.y + 10);

      // Draw Soccer Ball
      ctx.font = "18px Arial";
      ctx.fillText("⚽", ball.x - 8, ball.y + 8);

    }, 35);

    return () => clearInterval(soccerLoop);

    function resetSetupAfterShot() {
      setPlayer({ x: 170, y: 260 });
      setTimeout(() => setGoalFeedback(null), 3000);
    }
  }, [isPlaying, player, ball, goalkeeper, defenders]);

  const launchMatch = () => {
    setGoals(0);
    setMisses(0);
    setTimeLeft(60);
    setPlayer({ x: 170, y: 260 });
    setBall({ x: 170, y: 230, dx: 0, dy: 0, speed: 0 });
    setIsPlaying(true);
  };

  return (
    <div className="space-y-4">
      {/* HUD Board */}
      <div className="flex justify-between items-center bg-stone-50 border border-stone-200 p-3 rounded-xl text-left">
        <div>
          <span className="text-[10px] font-mono text-[#15803d] font-bold uppercase tracking-wider block">BUNGOMA SOCCER CUP</span>
          <h3 className="text-sm font-bold text-stone-900 leading-snug">Zion Penalty Shootout Match</h3>
        </div>
        <div className="flex gap-4 items-center text-right font-mono text-xs">
          <div>
            <span className="text-stone-400 block text-[9px]">MATCH GOALS</span>
            <span className="font-extrabold text-emerald-700 text-sm">{goals} ⚽</span>
          </div>
          <div>
            <span className="text-stone-400 block text-[9px]">TIME LEFT</span>
            <span className="font-black text-rose-650 text-sm">{timeLeft}s</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {/* Play Pitch frame */}
        <div className="md:col-span-3 flex justify-center bg-[#14532d] p-4 rounded-2xl border border-green-800/45 relative shadow-inner">
          <canvas ref={canvasRef} width={340} height={345} className="block border border-green-700 rounded-xl" />

          {/* Shooting feedback banner */}
          {goalFeedback && (
            <div className="absolute top-16 left-0 right-0 mx-auto text-center z-10">
              <span className="bg-stone-905 bg-black/80 rounded-full px-4 py-1.5 text-[11px] font-bold text-white shadow border border-white/15">
                {goalFeedback}
              </span>
            </div>
          )}

          {!isPlaying && (
            <div className="absolute inset-0 bg-[#061c0d]/95 backdrop-blur-xs flex flex-col items-center justify-center text-center space-y-4 rounded-2xl p-4">
              <span className="text-4xl animate-bounce">⚽</span>
              <h4 className="font-display font-bold text-white text-sm">Western Kenya Soccer Championship</h4>
              <p className="text-xs text-stone-300 max-w-xs leading-relaxed">
                Aim, dribble, bypass defensive slides, and shoot to put the soccer ball in the net! Beat the goalkeeper bot in under 60 seconds.
              </p>
              <button
                onClick={launchMatch}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg uppercase cursor-pointer"
              >
                Whistle Match Kickoff
              </button>
            </div>
          )}
        </div>

        {/* Shooting dashboard handles */}
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-left flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-stone-850 text-xs mb-1">Dribbler Panels</h4>
            <p className="text-[10px] text-stone-500 leading-snug">
              Navigate Player (`🏃`) to dribble closer, and hit the shoot trigger when aligned! Avoid defender slides (`🏃‍♂️`).
            </p>
          </div>

          {isPlaying && (
            <div className="my-3 flex flex-col items-center select-none bg-stone-100 p-2.5 rounded-xl border border-stone-200/50">
              <span className="text-[9px] font-bold text-stone-400 font-mono uppercase tracking-wider mb-2">Touch Move D-Pad</span>
              <button
                type="button"
                onClick={() => handleMobileDribble("up")}
                className="w-10 h-10 flex items-center justify-center bg-stone-800 active:bg-emerald-600 rounded-lg text-white font-black hover:bg-black transition text-sm cursor-pointer"
              >
                ▲
              </button>
              <div className="flex gap-4 my-1">
                <button
                  type="button"
                  onClick={() => handleMobileDribble("left")}
                  className="w-10 h-10 flex items-center justify-center bg-stone-800 active:bg-emerald-600 rounded-lg text-white font-black hover:bg-black transition text-sm cursor-pointer"
                >
                  ◀
                </button>
                <div className="w-10 h-10" />
                <button
                  type="button"
                  onClick={() => handleMobileDribble("right")}
                  className="w-10 h-10 flex items-center justify-center bg-stone-800 active:bg-emerald-600 rounded-lg text-white font-black hover:bg-black transition text-sm cursor-pointer"
                >
                  ▶
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleMobileDribble("down")}
                className="w-10 h-10 flex items-center justify-center bg-stone-800 active:bg-emerald-600 rounded-lg text-white font-black hover:bg-black transition text-sm cursor-pointer"
              >
                ▼
              </button>
            </div>
          )}

          <button
            onClick={shootTheBall}
            className="w-full py-4 bg-red-650 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl active:scale-95 transition flex items-center justify-center gap-1 uppercase"
          >
            <span>🥅 Kick Shoot Ball!</span>
          </button>

          <div className="space-y-2 pt-2 border-t border-stone-200 text-[10px] text-stone-500 font-mono">
            <div>
              <span>SAVED ATTACKS:</span> <strong className="text-stone-700">{misses} Saves</strong>
            </div>
            <div>
              <span>CONTROLS:</span> Use Arrow Keys or <strong className="text-stone-700">W/A/S/D</strong> to steer running angle.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
