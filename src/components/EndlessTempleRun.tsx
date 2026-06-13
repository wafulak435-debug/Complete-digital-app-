import React, { useState, useEffect, useRef } from "react";
import { Play, RotateCcw, Trophy, Sparkles, Compass, Flame, Volume2, Shield, Heart } from "lucide-react";

interface EndlessTempleRunProps {
  onCompleted: (points: number) => void;
}

type Environment = "auburn" | "rural";

interface Obstacle {
  id: number;
  lane: number; // 0 = Left, 1 = Middle, 2 = Right
  y: number; // 0 (horizon) to 360 (bottom)
  type: "low-rock" | "high-arch"; // rock = jump over, arch = slide under
  passed: boolean;
}

interface Coin {
  id: number;
  lane: number;
  y: number;
  collected: boolean;
}

export default function EndlessTempleRunGame({ onCompleted }: { onCompleted: (pts: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [theme, setTheme] = useState<Environment>("rural");
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [distance, setDistance] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Character State
  const [playerLane, setPlayerLane] = useState<number>(1); // Current target lane (0, 1, 2)
  const playerLaneVisualRef = useRef<number>(1); // Eased visual X position (0 to 2)
  const [playerState, setPlayerState] = useState<"running" | "jumping" | "sliding">("running");
  const playerStateRef = useRef<"running" | "jumping" | "sliding">("running");
  const jumpTimerRef = useRef<number>(0);
  const slideTimerRef = useRef<number>(0);

  // Entities
  const obstaclesRef = useRef<Obstacle[]>([]);
  const coinsRef = useRef<Coin[]>([]);
  const obstacleIdCounter = useRef(0);
  const coinIdCounter = useRef(0);
  const gameSpeedRef = useRef(4);

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem("WAFULA_TEMPLE_RUN_HIGH_SCORE");
    if (saved) {
      setBestScore(parseInt(saved, 10));
    }
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || gameOver) return;
      
      const key = e.key.toLowerCase();
      if (key === "arrowleft" || key === "a") {
        setPlayerLane((prev) => Math.max(0, prev - 1));
      } else if (key === "arrowright" || key === "d") {
        setPlayerLane((prev) => Math.min(2, prev + 1));
      } else if ((key === "arrowup" || key === "w" || e.key === " ") && playerStateRef.current === "running") {
        e.preventDefault();
        setPlayerState("jumping");
        playerStateRef.current = "jumping";
        jumpTimerRef.current = 18; // ticks duration
      } else if ((key === "arrowdown" || key === "s") && playerStateRef.current === "running") {
        e.preventDefault();
        setPlayerState("sliding");
        playerStateRef.current = "sliding";
        slideTimerRef.current = 18; // ticks duration
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, gameOver]);

  // Main Game Tick Loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    obstaclesRef.current = [];
    coinsRef.current = [];
    gameSpeedRef.current = 4;
    let localScore = 0;
    let localCoins = 0;
    let localDistance = 0;
    let spawnTimer = 0;

    const tick = setInterval(() => {
      // 1. Smoothly ease visual lane coordinates towards targeted lane
      const diff = playerLane - playerLaneVisualRef.current;
      playerLaneVisualRef.current += diff * 0.25;

      // 2. Game parameters escalation
      localDistance += 1;
      const calculatedScore = Math.floor(localDistance * 0.2) + localCoins * 55;
      localScore = calculatedScore;
      setScore(calculatedScore);
      setDistance(Math.floor(localDistance * 0.1));
      
      // Gradually speed up
      gameSpeedRef.current = 4 + (localDistance / 1200);

      // Handle jumps and slides cooldown timer
      if (playerStateRef.current === "jumping") {
        jumpTimerRef.current -= 1;
        if (jumpTimerRef.current <= 0) {
          setPlayerState("running");
          playerStateRef.current = "running";
        }
      } else if (playerStateRef.current === "sliding") {
        slideTimerRef.current -= 1;
        if (slideTimerRef.current <= 0) {
          setPlayerState("running");
          playerStateRef.current = "running";
        }
      }

      // 3. Spawning Logic
      spawnTimer++;
      if (spawnTimer >= Math.max(35, 65 - gameSpeedRef.current * 3)) {
        spawnTimer = 0;
        const targetLane = Math.floor(Math.random() * 3);
        
        // Spawn obstacle or coin chain
        if (Math.random() < 0.6) {
          const type = Math.random() < 0.5 ? "low-rock" : "high-arch";
          obstacleIdCounter.current++;
          obstaclesRef.current.push({
            id: obstacleIdCounter.current,
            lane: targetLane,
            y: 40,
            type,
            passed: false,
          });
        } else {
          // Spawn coin sequence in a specific lane
          coinIdCounter.current++;
          coinsRef.current.push({
            id: coinIdCounter.current,
            lane: targetLane,
            y: 40,
            collected: false,
          });
        }
      }

      // 4. Update Obstacles and Coins position & collisions
      const currentLane = playerLane;
      const currentCharState = playerStateRef.current;

      // Obstacles
      obstaclesRef.current = obstaclesRef.current.map((obs) => {
        const nextY = obs.y + gameSpeedRef.current;
        
        // Dynamic collision check at the threshold representing player presence (y around 290 - 325)
        if (nextY >= 285 && nextY <= 325 && obs.lane === currentLane && !obs.passed) {
          if (obs.type === "low-rock" && currentCharState !== "jumping") {
            // CRASH!
            triggerCrash();
          } else if (obs.type === "high-arch" && currentCharState !== "sliding") {
            // CRASH!
            triggerCrash();
          }
        }

        if (nextY > 325) {
          obs.passed = true;
        }

        return { ...obs, y: nextY };
      }).filter((o) => o.y < 360);

      // Coins
      coinsRef.current = coinsRef.current.map((coin) => {
        const nextY = coin.y + gameSpeedRef.current;

        // Collision check
        if (nextY >= 280 && nextY <= 325 && coin.lane === currentLane && !coin.collected) {
          coin.collected = true;
          localCoins += 1;
          setCoins(localCoins);
          triggerFeedback("✨ Coin Collected! +55 pts");
        }

        return { ...coin, y: nextY };
      }).filter((c) => c.y < 360 && !c.collected);

      // 5. Draw Canvas Scene
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Sky & Environment Background
      if (theme === "auburn") {
        // Canyon Clay/Sunset
        const grad = ctx.createLinearGradient(0, 0, 0, 140);
        grad.addColorStop(0, "#450a0a"); // dark burgundy
        grad.addColorStop(0.6, "#7c2d12"); // clay orange
        grad.addColorStop(1, "#c2410c"); // bright auburn rust
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, 140);

        // Sun
        ctx.fillStyle = "#fef08a";
        ctx.shadowColor = "#ea580c";
        ctx.shadowBlur = 35;
        ctx.beginPath();
        ctx.arc(canvas.width / 2, 85, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      } else {
        // Jungle Emerald
        const grad = ctx.createLinearGradient(0, 0, 0, 140);
        grad.addColorStop(0, "#022c22"); // deep forest
        grad.addColorStop(0.7, "#064e3b"); // rich pine green
        grad.addColorStop(1, "#0f766e"); // misty teal
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, 140);

        // Glowing Moon
        ctx.fillStyle = "#f0fdf4";
        ctx.shadowColor = "#10b981";
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(canvas.width / 2, 80, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Draw Ground borders (Canyon Cliffs vs Dense foliage)
      ctx.fillStyle = theme === "auburn" ? "#2f0a05" : "#021d15";
      ctx.fillRect(0, 140, canvas.width, canvas.height - 140);

      // Draw Scenic details (Canyon spires / Tall forest trunks)
      if (theme === "auburn") {
        ctx.fillStyle = "#451a03";
        // Left Spires
        ctx.beginPath();
        ctx.moveTo(0, 140);
        ctx.lineTo(40, 120);
        ctx.lineTo(55, 140);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(30, 200);
        ctx.lineTo(65, 160);
        ctx.lineTo(80, 240);
        ctx.closePath();
        ctx.fill();

        // Right Spires
        ctx.beginPath();
        ctx.moveTo(canvas.width, 140);
        ctx.lineTo(canvas.width - 45, 115);
        ctx.lineTo(canvas.width - 60, 140);
        ctx.closePath();
        ctx.fill();
      } else {
        // Pine Trees
        ctx.fillStyle = "#064e3b";
        // Left Tree
        ctx.beginPath();
        ctx.moveTo(25, 140);
        ctx.lineTo(45, 100);
        ctx.lineTo(65, 140);
        ctx.closePath();
        ctx.fill();

        // Right Tree
        ctx.beginPath();
        ctx.moveTo(canvas.width - 65, 140);
        ctx.lineTo(canvas.width - 45, 95);
        ctx.lineTo(canvas.width - 25, 140);
        ctx.closePath();
        ctx.fill();
      }

      // Draw the Running Road (Perspective Trapezoid)
      // Horizon points: x1 = 135, x2 = 205 at y = 140
      // Bottom points: x1 = 15, x2 = 325 at y = 360
      ctx.fillStyle = theme === "auburn" ? "#7c2d12" : "#374151"; // road color
      ctx.beginPath();
      ctx.moveTo(135, 140);
      ctx.lineTo(205, 140);
      ctx.lineTo(325, 360);
      ctx.lineTo(15, 360);
      ctx.closePath();
      ctx.fill();

      // Road side boundaries/cobblestones
      ctx.strokeStyle = theme === "auburn" ? "#b45309" : "#10b981";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(135, 140);
      ctx.lineTo(15, 360);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(205, 140);
      ctx.lineTo(325, 360);
      ctx.stroke();

      // Draw perspective lane division lines (dashed lines moving down)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 12]);
      
      // Lane line 1 (one-third road width)
      ctx.beginPath();
      ctx.moveTo(158, 140);
      ctx.lineTo(118, 360);
      ctx.stroke();

      // Lane line 2 (two-thirds road width)
      ctx.beginPath();
      ctx.moveTo(182, 140);
      ctx.lineTo(222, 360);
      ctx.stroke();

      ctx.setLineDash([]); // reset

      // Utility to calculate visual coordinates based on 3D perspective
      // Given lane (0, 1, 2) and projection coordinate Y (140 to 360)
      const getPerspectiveX = (lane: number, currentY: number) => {
        // Interpolate road width at this Y
        const progression = (currentY - 140) / 220; // 0 to 1
        const leftLimit = 135 - (135 - 15) * progression;
        const rightLimit = 205 + (325 - 205) * progression;
        const roadWidth = rightLimit - leftLimit;
        
        // Each lane centers at 1/6th, 3/6th, 5/6th of road width
        const fraction = (lane * 2 + 1) / 6;
        return leftLimit + roadWidth * fraction;
      };

      // 6. DRAW COINS
      coinsRef.current.forEach((coin) => {
        const cx = getPerspectiveX(coin.lane, coin.y);
        const progressVal = (coin.y - 140) / 220;
        const radius = Math.max(2, 10 * progressVal);

        ctx.shadowColor = "#facc15";
        ctx.shadowBlur = Math.max(1, 12 * progressVal);
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.arc(cx, coin.y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner coin detail
        ctx.strokeStyle = "#ca8a04";
        ctx.lineWidth = Math.max(0.7, 2 * progressVal);
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // 7. DRAW OBSTACLES
      obstaclesRef.current.forEach((obs) => {
        const ox = getPerspectiveX(obs.lane, obs.y);
        const progressVal = (obs.y - 140) / 220;
        const ow = Math.max(5, 52 * progressVal);
        const oh = Math.max(5, 34 * progressVal);

        ctx.save();
        ctx.translate(ox, obs.y);

        if (obs.type === "low-rock") {
          // Low boulder/broken log on lane
          ctx.fillStyle = theme === "auburn" ? "#ea580c" : "#78716c";
          ctx.strokeStyle = theme === "auburn" ? "#7c2d12" : "#292524";
          ctx.lineWidth = Math.max(1, 3.5 * progressVal);
          
          // Draw boulder path
          ctx.beginPath();
          ctx.moveTo(-ow/2, 0);
          ctx.lineTo(-ow/3, -oh);
          ctx.lineTo(ow/3, -oh);
          ctx.lineTo(ow/2, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Obstacle symbol/glow details
          ctx.font = `bold ${Math.max(6, 11 * progressVal)}px monospace`;
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          ctx.fillText("🪵", 0, -oh/4);
        } else {
          // Tall structural arch or hanging branches
          ctx.strokeStyle = theme === "auburn" ? "#fcd34d" : "#34d399";
          ctx.lineWidth = Math.max(1.5, 5.5 * progressVal);
          
          ctx.beginPath();
          // Arch pillars outside road limits but we render inside lane as archway
          ctx.arc(0, 0, ow/2, Math.PI, 0, false);
          ctx.stroke();

          // Hanging warning warning
          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.arc(0, -oh, Math.max(1.5, ow/6), 0, Math.PI * 2);
          ctx.fill();

          ctx.font = `bold ${Math.max(5, 10 * progressVal)}px sans-serif`;
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          ctx.fillText("⚠️", 0, -oh * 0.4);
        }

        ctx.restore();
      });

      // 8. DRAW PLAYER CHARACTER (Eased smoothly across visual positions)
      const px = getPerspectiveX(playerLaneVisualRef.current, 305);
      
      ctx.save();
      ctx.translate(px, 305);

      // Character dynamic shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.beginPath();
      ctx.ellipse(0, 5, 14, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Action modifiers
      let verticalOffset = 0;
      let frameScaleY = 1;

      if (currentCharState === "jumping") {
        // High jump movement arc
        const jumpProgress = jumpTimerRef.current / 18; // 1 down to 0
        verticalOffset = -Math.sin(jumpProgress * Math.PI) * 45;
      } else if (currentCharState === "sliding") {
        // Flatten character frame
        frameScaleY = 0.45;
        verticalOffset = 6;
      }

      ctx.translate(0, verticalOffset);
      ctx.scale(1, frameScaleY);

      // Runner Torso/Suit
      ctx.fillStyle = theme === "auburn" ? "#fbbf24" : "#10b981"; // golden or bright green runner suit
      ctx.shadowColor = theme === "auburn" ? "#d97706" : "#059669";
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.arc(0, -15, 9, 0, Math.PI * 2); // Head/helmet
      ctx.fill();

      ctx.fillStyle = "#1e293b"; // vest colors
      ctx.fillRect(-6, -6, 12, 12); // body chest

      // Running shoes/boots
      ctx.fillStyle = "#f43f5e";
      ctx.fillRect(-6, 6, 4, 3);
      ctx.fillRect(2, 6, 4, 3);

      // Headlamp/glasses visor
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(-5, -17, 10, 3);

      ctx.restore();
      ctx.shadowBlur = 0; // reset

    }, 30);

    const triggerCrash = () => {
      clearInterval(tick);
      setIsPlaying(false);
      setGameOver(true);
      // Evaluate new high scores
      if (localScore > bestScore) {
        setBestScore(localScore);
        localStorage.setItem("WAFULA_TEMPLE_RUN_HIGH_SCORE", localScore.toString());
      }
      onCompleted(localScore);
    };

    return () => clearInterval(tick);
  }, [isPlaying, gameOver, playerLane, theme]);

  const triggerFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 1800);
  };

  const startNewRun = (chosenTheme: Environment) => {
    setTheme(chosenTheme);
    setGameOver(false);
    setScore(0);
    setCoins(0);
    setDistance(0);
    setPlayerLane(1);
    playerLaneVisualRef.current = 1;
    setPlayerState("running");
    playerStateRef.current = "running";
    obstaclesRef.current = [];
    coinsRef.current = [];
    setIsPlaying(true);
  };

  return (
    <div className="space-y-4">
      {/* HUD Bar */}
      <div className={`flex justify-between items-center border p-3 rounded-xl text-left transition-colors duration-300 ${
        theme === "auburn" ? "bg-amber-50/50 border-amber-200" : "bg-emerald-50/50 border-emerald-200"
      }`}>
        <div>
          <span className={`text-[10px] font-mono font-bold uppercase tracking-wider block ${
            theme === "auburn" ? "text-amber-700" : "text-emerald-700"
          }`}>
            ENDLESS TEMPLE RUN
          </span>
          <h3 className="text-sm font-bold text-stone-900 leading-snug">
            {theme === "auburn" ? "Auburn Canyon Gorge" : "Rural Green Bush Jungle"}
          </h3>
        </div>
        <div className="flex gap-4 items-center text-right font-mono text-xs">
          <div>
            <span className="text-stone-400 block text-[9px]">DISTANCE</span>
            <span className="font-extrabold text-stone-850 text-sm">{distance}m</span>
          </div>
          <div>
            <span className="text-stone-400 block text-[9px]">COINS</span>
            <span className="font-bold text-amber-600 text-sm">🪙 {coins}</span>
          </div>
          <div>
            <span className="text-stone-400 block text-[9px]">RUN POINTS</span>
            <span className={`font-black text-sm ${
              theme === "auburn" ? "text-amber-700" : "text-emerald-700"
            }`}>
              {score} PTS
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {/* Core Canvas Arena */}
        <div className={`md:col-span-3 flex flex-col items-center justify-center p-3.5 rounded-2xl border shadow-inner relative transition-colors duration-300 ${
          theme === "auburn" ? "bg-amber-950/20 border-amber-800/30" : "bg-emerald-950/20 border-emerald-800/30"
        }`}>
          <canvas 
            ref={canvasRef} 
            width={340} 
            height={360} 
            className="block border border-stone-800 rounded-xl max-w-full shadow-2xl bg-stone-950" 
          />

          {/* Toast feedback */}
          {feedback && (
            <div className="absolute top-10 mx-auto text-center z-10 animate-fade-in-down">
              <span className="bg-black/85 text-amber-300 rounded-full px-3 py-1 text-[10px] font-bold shadow border border-amber-500/25">
                {feedback}
              </span>
            </div>
          )}

          {/* Game Over Screen */}
          {gameOver && (
            <div className="absolute inset-0 bg-stone-950/95 backdrop-blur-md flex flex-col items-center justify-center text-center space-y-4 rounded-2xl p-4">
              <span className="text-4xl animate-bounce">💀</span>
              <h4 className="font-display font-black text-sm text-red-500">YOU CRASHED ON TEMPLE OBSTACLES!</h4>
              <div className="p-3 bg-stone-900 border border-stone-800 rounded-xl space-y-1 w-full max-w-xs text-xs font-mono">
                <p className="text-stone-400">Total Run Points: <strong className="text-white font-bold">{score} pts</strong></p>
                <p className="text-stone-400">Coins Gained: <strong className="text-amber-400">🪙 {coins} coins</strong></p>
                <p className="text-stone-400">Distance run: <strong className="text-stone-200">{distance} meters</strong></p>
              </div>

              <div className="flex gap-2 w-full max-w-xs">
                <button
                  onClick={() => startNewRun("auburn")}
                  className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition"
                >
                  Run Auburn 🏜️
                </button>
                <button
                  onClick={() => startNewRun("rural")}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition"
                >
                  Run Rural 🌲
                </button>
              </div>
            </div>
          )}

          {/* Start Screen */}
          {!isPlaying && !gameOver && (
            <div className="absolute inset-0 bg-stone-950/90 backdrop-blur-md flex flex-col items-center justify-center text-center space-y-4 rounded-2xl p-4">
              <span className="text-4xl">🏃‍♂️</span>
              <h4 className="font-display font-black text-white text-md tracking-tight">Endless Temple Explorer</h4>
              <p className="text-xs text-stone-300 max-w-xs leading-relaxed">
                Step inside the sacred temples. Navigate lanes to avoid boulders and arches. Sprint infinitely to compile historical honors!
              </p>

              <div className="p-3.5 bg-neutral-900/80 border border-neutral-800 rounded-2xl text-[10.5px] text-stone-300 max-w-xs space-y-1 pb-1.5 text-left">
                <p className="font-bold text-[#fbbf24] uppercase font-mono tracking-wider text-[9px] mb-1">🎮 Survival Guide:</p>
                <p>• Avoid low rocks / logs by <strong className="text-emerald-400">JUMPING</strong></p>
                <p>• Avoid high arches / vines by <strong className="text-emerald-400">SLIDING</strong></p>
                <p>• Steer lanes to grab sparkling <strong className="text-amber-400">Gold Coins</strong></p>
              </div>

              <div className="flex flex-col gap-2 w-full max-w-xs pt-1">
                <button
                  onClick={() => startNewRun("auburn")}
                  className="w-full py-2.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-black rounded-xl uppercase tracking-wider shadow transition"
                >
                  Explore Auburn Canyon 🏜️
                </button>
                <button
                  onClick={() => startNewRun("rural")}
                  className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black rounded-xl uppercase tracking-wider shadow transition"
                >
                  Explore Rural Jungle 🌲
                </button>
              </div>

              {bestScore > 0 && (
                <div className="flex items-center gap-1.5 text-stone-400 text-xs font-mono">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  <span>Personal Best: <strong>{bestScore} pts</strong></span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Lane Steering & Actions D-Pad */}
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-left flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-stone-850 text-xs mb-1">Navigational System</h4>
            <p className="text-[10px] text-stone-500 leading-snug">
              Steer lanes dynamically to bypass temple obstacles and grab shiny gold tokens!
            </p>
          </div>

          {isPlaying && (
            <div className="my-3 space-y-4 select-none">
              <div className="flex flex-col items-center bg-stone-100 p-2.5 rounded-xl border border-stone-200/50">
                <span className="text-[9px] font-bold text-stone-400 font-mono uppercase tracking-wider mb-2">Move Lanes</span>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setPlayerLane((prev) => Math.max(0, prev - 1))}
                    className="flex-1 py-2.5 bg-stone-800 text-white hover:bg-black rounded-lg text-xs font-bold cursor-pointer text-center text-white"
                  >
                    ◀ Left Lane
                  </button>
                  <button
                    onClick={() => setPlayerLane((prev) => Math.min(2, prev + 1))}
                    className="flex-1 py-2.5 bg-stone-800 text-white hover:bg-black rounded-lg text-xs font-bold cursor-pointer text-center text-white"
                  >
                    Right Lane ▶
                  </button>
                </div>
              </div>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    if (playerStateRef.current === "running") {
                      setPlayerState("jumping");
                      playerStateRef.current = "jumping";
                      jumpTimerRef.current = 18;
                    }
                  }}
                  className="flex-1 py-3 bg-blue-600 active:bg-blue-700 text-white font-extrabold text-xs rounded-xl uppercase hover:bg-blue-650 transition text-center"
                >
                  🦘 Action JUMP
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (playerStateRef.current === "running") {
                      setPlayerState("sliding");
                      playerStateRef.current = "sliding";
                      slideTimerRef.current = 18;
                    }
                  }}
                  className="flex-1 py-3 bg-indigo-600 active:bg-indigo-700 text-white font-extrabold text-xs rounded-xl uppercase hover:bg-indigo-650 transition text-center"
                >
                  🛹 Action SLIDE
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-stone-200 text-[10px] text-stone-500 font-mono">
            <div>
              <span>LANES:</span> Use <strong className="text-stone-700">A / D</strong> keys or Left/Right arrows.
            </div>
            <div>
              <span>JUMP:</span> Use <strong className="text-stone-700">W</strong> or ArrowUp or Spacebar.
            </div>
            <div>
              <span>SLIDE:</span> Use <strong className="text-stone-700">S</strong> or ArrowDown.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
