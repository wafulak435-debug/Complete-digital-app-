import React, { useState, useEffect } from "react";
import { GameScore } from "../types";
import { Trophy, RefreshCw, Star, Play, HelpCircle, Flame, CheckCircle2, XCircle } from "lucide-react";
import { NeonSnakeGame, WebcamBubbleShooter, RetroSynthwaveRunner, ZionTerrainDriverGame, ZionPrecisionCarParkerGame, BungomaSoccerChallengeGame } from "./ZionAdventureGames";
import EndlessTempleRunGame from "./EndlessTempleRun";

interface GamesProps {
  onUnlockBadge: (badgeId: string) => void;
}

export default function Games({ onUnlockBadge }: GamesProps) {
  const [scores, setScores] = useState<GameScore[]>([]);
  const [activeGame, setActiveGame] = useState<string | null>(null);

  // Load scores on start
  useEffect(() => {
    const savedScores = localStorage.getItem("WAFULA_GAME_SCORES");
    if (savedScores) {
      const parsed: GameScore[] = JSON.parse(savedScores);
      setScores(parsed);
    } else {
      const initialScores: GameScore[] = [
        { gameId: "trivia", highScore: 0, streak: 0, playedCount: 0 },
        { gameId: "scramble", highScore: 0, streak: 0, playedCount: 0 },
        { gameId: "memory", highScore: 0, streak: 0, playedCount: 0 },
        { gameId: "hangman", highScore: 0, streak: 0, playedCount: 0 },
        { gameId: "math", highScore: 0, streak: 0, playedCount: 0 },
        { gameId: "bible", highScore: 0, streak: 0, playedCount: 0 },
        { gameId: "maze", highScore: 0, streak: 0, playedCount: 0 },
        { gameId: "neon-snake", highScore: 0, streak: 0, playedCount: 0 },
        { gameId: "synthwave-runner", highScore: 0, streak: 0, playedCount: 0 },
        { gameId: "terrain-driver", highScore: 0, streak: 0, playedCount: 0 },
        { gameId: "car-parking", highScore: 0, streak: 0, playedCount: 0 },
        { gameId: "soccer-challenge", highScore: 0, streak: 0, playedCount: 0 },
        { gameId: "temple-run", highScore: 0, streak: 0, playedCount: 0 }
      ];
      setScores(initialScores);
      localStorage.setItem("WAFULA_GAME_SCORES", JSON.stringify(initialScores));
    }
  }, []);

  const updateScore = (gameId: string, value: number) => {
    setScores((prevScores) => {
      const updated = prevScores.map((s) => {
        if (s.gameId === gameId) {
          const isNewHigh = value > s.highScore;
          return {
            ...s,
            playedCount: s.playedCount + 1,
            highScore: isNewHigh ? value : s.highScore,
            streak: s.streak + 1
          };
        }
        return s;
      });
      localStorage.setItem("WAFULA_GAME_SCORES", JSON.stringify(updated));
      return updated;
    });
    // Triggers general badging criteria
    onUnlockBadge("badge_4");
  };

  return (
    <div id="games_dashboard" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <h2 className="font-display text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
          The <span className="text-red-700">Fun Zone</span>
        </h2>
        <p className="mt-2 text-sm text-neutral-600">
          Refine your memory, speed, leadership, and knowledge. Complete milestones to push your streak and unlock beautiful achievements.
        </p>
      </div>

      {activeGame ? (
        <div id="active_game_viewport" className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm relative">
          <button
            onClick={() => setActiveGame(null)}
            className="absolute top-4 right-4 text-xs font-semibold text-stone-500 hover:text-stone-900 border border-stone-200 bg-neutral-50 rounded px-2.5 py-1.5"
          >
            ← Back to Games Menu
          </button>

          {activeGame === "trivia" && <BookTriviaGame onCompleted={(points) => updateScore("trivia", points)} />}
          {activeGame === "scramble" && <WordScrambleGame onCompleted={(points) => updateScore("scramble", points)} />}
          {activeGame === "speed" && <SpeedMathGame onCompleted={(points) => updateScore("speed", points)} />}
          {activeGame === "hangman" && <HangmanGame onCompleted={(points) => updateScore("hangman", points)} />}
          {activeGame === "bible" && <BibleQuizGame onCompleted={(points) => updateScore("bible", points)} />}
          {activeGame === "maze" && <LeadershipMazeGame onCompleted={(points) => updateScore("maze", points)} />}
          {activeGame === "memory" && <MemoryMatchGame onCompleted={(points) => updateScore("memory", points)} />}
          {activeGame === "driving" && <BungomaHighwayDrivingGame onCompleted={(points) => updateScore("driving", points)} />}
          {activeGame === "neon-snake" && <NeonSnakeGame onCompleted={(points) => updateScore("neon-snake", points)} />}
          {activeGame === "bubble-shooter" && <WebcamBubbleShooter />}
          {activeGame === "synthwave-runner" && <RetroSynthwaveRunner onCompleted={(points) => updateScore("synthwave-runner", points)} />}
          {activeGame === "terrain-driver" && <ZionTerrainDriverGame onCompleted={(points) => updateScore("terrain-driver", points)} />}
          {activeGame === "car-parking" && <ZionPrecisionCarParkerGame onCompleted={(points) => updateScore("car-parking", points)} />}
          {activeGame === "soccer-challenge" && <BungomaSoccerChallengeGame onCompleted={(points) => updateScore("soccer-challenge", points)} />}
          {activeGame === "temple-run" && <EndlessTempleRunGame onCompleted={(points) => updateScore("temple-run", points)} />}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* 1. Trivia Game */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col justify-between">
            <div>
              <span className="text-3xl">📚</span>
              <h3 className="font-display text-lg font-bold text-stone-900 mt-2">Book Trivia</h3>
              <p className="text-xs text-neutral-500 mt-1">Test your high-level knowledge of books, authors, and Kenya's leadership history.</p>
            </div>
            <div className="border-t border-stone-100 pt-3 mt-4 flex items-center justify-between">
              <span className="text-xs text-stone-500 font-mono">High Score: {scores.find((s) => s.gameId === "trivia")?.highScore || 0} pts</span>
              <button onClick={() => setActiveGame("trivia")} className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-800">Play Now</button>
            </div>
          </div>

          {/* 2. Word Scramble */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col justify-between">
            <div>
              <span className="text-3xl">🔤</span>
              <h3 className="font-display text-lg font-bold text-stone-900 mt-2">Word Scramble</h3>
              <p className="text-xs text-neutral-500 mt-1">Unscramble leadership and popular literary keywords as fast as you can.</p>
            </div>
            <div className="border-t border-stone-100 pt-3 mt-4 flex items-center justify-between">
              <span className="text-xs text-stone-500 font-mono">High Score: {scores.find((s) => s.gameId === "scramble")?.highScore || 0} pts</span>
              <button onClick={() => setActiveGame("scramble")} className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-800">Play Now</button>
            </div>
          </div>

          {/* 3. Speed Math */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col justify-between">
            <div>
              <span className="text-3xl">🧮</span>
              <h3 className="font-display text-lg font-bold text-stone-900 mt-2">Speed Math</h3>
              <p className="text-xs text-neutral-500 mt-1">Solve mathematical problem equations in a high-speed countdown simulation.</p>
            </div>
            <div className="border-t border-stone-100 pt-3 mt-4 flex items-center justify-between">
              <span className="text-xs text-stone-500 font-mono">High Score: {scores.find((s) => s.gameId === "speed")?.highScore || 0} pts</span>
              <button onClick={() => setActiveGame("speed")} className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-800">Play Now</button>
            </div>
          </div>

          {/* 4. Hangman */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col justify-between">
            <div>
              <span className="text-3xl">🎯</span>
              <h3 className="font-display text-lg font-bold text-stone-900 mt-2">Hangman</h3>
              <p className="text-xs text-neutral-500 mt-1">Guess hidden literature characters, cities, and concepts letter by letter.</p>
            </div>
            <div className="border-t border-stone-100 pt-3 mt-4 flex items-center justify-between">
              <span className="text-xs text-stone-500 font-mono">High Score: {scores.find((s) => s.gameId === "hangman")?.highScore || 0} pts</span>
              <button onClick={() => setActiveGame("hangman")} className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-800">Play Now</button>
            </div>
          </div>

          {/* 5. Bible Quiz */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col justify-between">
            <div>
              <span className="text-3xl">✝️</span>
              <h3 className="font-display text-lg font-bold text-stone-900 mt-2">Bible Scholar Quiz</h3>
              <p className="text-xs text-neutral-500 mt-1">Deepen your study of scriptures, devotional versions, and historical accounts.</p>
            </div>
            <div className="border-t border-stone-100 pt-3 mt-4 flex items-center justify-between">
              <span className="text-xs text-stone-500 font-mono">High Score: {scores.find((s) => s.gameId === "bible")?.highScore || 0} pts</span>
              <button onClick={() => setActiveGame("bible")} className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-800">Play Now</button>
            </div>
          </div>

          {/* 6. Leadership Maze */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col justify-between">
            <div>
              <span className="text-3xl">🧗</span>
              <h3 className="font-display text-lg font-bold text-stone-900 mt-2">Bungoma Leadership Safari</h3>
              <p className="text-xs text-neutral-500 mt-1">Manage limited assets and take core choices to lead your caravan to success.</p>
            </div>
            <div className="border-t border-stone-100 pt-3 mt-4 flex items-center justify-between">
              <span className="text-xs text-stone-500 font-mono">High Score: {scores.find((s) => s.gameId === "maze")?.highScore || 0} pts</span>
              <button onClick={() => setActiveGame("maze")} className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-800">Play Now</button>
            </div>
          </div>

          {/* 7. Memory Match */}
          <div className="rounded-2xl border border-[#e4dfd7] bg-[#f9f8f6] p-5 flex flex-col justify-between">
            <div>
              <span className="text-3xl">🃏</span>
              <h3 className="font-display text-lg font-bold text-stone-900 mt-2">Book Match</h3>
              <p className="text-xs text-neutral-500 mt-1">Pick and flip emoji-labeled cards to match corresponding literary genres.</p>
            </div>
            <div className="border-t border-[#e4dfd7] pt-3 mt-4 flex items-center justify-between">
              <span className="text-xs text-stone-500 font-mono">High Score: {scores.find((s) => s.gameId === "memory")?.highScore || 0} pts</span>
              <button onClick={() => setActiveGame("memory")} className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-stone-950">Play Now</button>
            </div>
          </div>

          {/* 8. Highway Driving Simulator */}
          <div className="rounded-2xl border border-red-200 bg-red-50/5 p-5 flex flex-col justify-between">
            <div>
              <span className="text-3xl">3️⃣</span>
              <h3 className="font-display text-lg font-bold text-stone-900 mt-2">Bungoma Highway Driving</h3>
              <p className="text-xs text-neutral-500 mt-1">Drive a Bicycle, Car, or Motorbike on the highway! Dodge obstacles and collect scores.</p>
            </div>
            <div className="border-t border-red-200 pt-3 mt-4 flex items-center justify-between">
              <span className="text-xs text-stone-500 font-mono">High Score: {scores.find((s) => s.gameId === "driving")?.highScore || 0} pts</span>
              <button onClick={() => setActiveGame("driving")} className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-800">Play Now</button>
            </div>
          </div>

          {/* 9. Neon Snake Game */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/5 p-5 flex flex-col justify-between">
            <div>
              <span className="text-3xl">🐍</span>
              <h3 className="font-display text-lg font-bold text-stone-900 mt-2">Neon Snake Arena</h3>
              <p className="text-xs text-neutral-500 mt-1">Collect glowing energy orbs to dominate the neon grid against AI opponents in real-time.</p>
            </div>
            <div className="border-t border-emerald-200 pt-3 mt-4 flex items-center justify-between">
              <span className="text-xs text-stone-500 font-mono">High Score: {scores.find((s) => s.gameId === "neon-snake")?.highScore || 0} pts</span>
              <button onClick={() => setActiveGame("neon-snake")} className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800">Play Now</button>
            </div>
          </div>

          {/* 10. Webcam Bubble Shooter with Gemini Co-Pilot */}
          <div className="rounded-2xl border border-sky-200 bg-sky-50/5 p-5 flex flex-col justify-between">
            <div>
              <span className="text-3xl">📸</span>
              <h3 className="font-display text-lg font-bold text-stone-900 mt-2">Webcam Bubble Shooter</h3>
              <p className="text-xs text-neutral-500 mt-1">Activate your webcam and let Gemini analyze the board vectors to suggest high-impact bouncing shots.</p>
            </div>
            <div className="border-t border-sky-200 pt-3 mt-4 flex items-center justify-between">
              <span className="text-xs text-stone-500 font-mono">Strategic AI co-pilot</span>
              <button onClick={() => setActiveGame("bubble-shooter")} className="rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-800">Boot Shooter</button>
            </div>
          </div>

          {/* 12. Retro Cosmic Space Runner */}
          <div className="rounded-2xl border border-purple-200 bg-purple-50/5 p-5 flex flex-col justify-between">
            <div>
              <span className="text-3xl">🚀</span>
              <h3 className="font-display text-lg font-bold text-stone-900 mt-2">Synthwave Space Runner</h3>
              <p className="text-xs text-neutral-500 mt-1">Dash through a neon cosmos corridor at breakneck speeds, dodging asteroids and capturing fuel prisms.</p>
            </div>
            <div className="border-t border-purple-200 pt-3 mt-4 flex items-center justify-between">
              <span className="text-xs text-stone-500 font-mono">High Score: {scores.find((s) => s.gameId === "synthwave-runner")?.highScore || 0} pts</span>
              <button onClick={() => setActiveGame("synthwave-runner")} className="rounded-lg bg-purple-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-900">Blast Off</button>
            </div>
          </div>

          {/* 13. Multi-Terrain highway Driver */}
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/5 p-5 flex flex-col justify-between">
            <div>
              <span className="text-3xl">🏜️</span>
              <h3 className="font-display text-lg font-bold text-stone-900 mt-2">Zion Highway Driver</h3>
              <p className="text-xs text-neutral-500 mt-1">Drive through Urban City Streets, Rural Bush Tracks or Plain Savanna Highlands on diverse engines!</p>
            </div>
            <div className="border-t border-indigo-200 pt-3 mt-4 flex items-center justify-between">
              <span className="text-xs text-stone-500 font-mono">High Score: {scores.find((s) => s.gameId === "terrain-driver")?.highScore || 0} pts</span>
              <button onClick={() => setActiveGame("terrain-driver")} className="rounded-lg bg-indigo-650 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700">Go Drive</button>
            </div>
          </div>

          {/* 14. Precision Car Parker */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/5 p-5 flex flex-col justify-between">
            <div>
              <span className="text-3xl">🅿️</span>
              <h3 className="font-display text-lg font-bold text-stone-900 mt-2">Valet Parking Challenge</h3>
              <p className="text-xs text-neutral-500 mt-1">Maneuver, steer, and parallel park in narrow valet spots through infinite levels of blockades.</p>
            </div>
            <div className="border-t border-amber-200 pt-3 mt-4 flex items-center justify-between">
              <span className="text-xs text-stone-500 font-mono">High Score: {scores.find((s) => s.gameId === "car-parking")?.highScore || 0} pts</span>
              <button onClick={() => setActiveGame("car-parking")} className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-800">Start Parking</button>
            </div>
          </div>

          {/* 15. Bungoma Soccer Cup */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/5 p-5 flex flex-col justify-between">
            <div>
              <span className="text-3xl">⚽</span>
              <h3 className="font-display text-lg font-bold text-stone-900 mt-2">Bungoma Soccer Cup</h3>
              <p className="text-xs text-neutral-500 mt-1">Dribble bypass sliding defense lines, aim, and execute penalty strikes to score goalposts!</p>
            </div>
            <div className="border-t border-emerald-200 pt-3 mt-4 flex items-center justify-between">
              <span className="text-xs text-stone-500 font-mono">High Score: {scores.find((s) => s.gameId === "soccer-challenge")?.highScore || 0} pts</span>
              <button onClick={() => setActiveGame("soccer-challenge")} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">Kickoff Match</button>
            </div>
          </div>

          {/* 16. Endless Temple Run */}
          <div className="rounded-2xl border border-orange-200 bg-orange-50/5 p-5 flex flex-col justify-between">
            <div>
              <span className="text-3xl">🏃‍♂️</span>
              <h3 className="font-display text-lg font-bold text-stone-900 mt-2">Endless Temple Run</h3>
              <p className="text-xs text-neutral-500 mt-1">Sprint infinitely through Auburn Canyons or Rural Green Jungles, jumping, sliding, and dodging wild boulders!</p>
            </div>
            <div className="border-t border-orange-200 pt-3 mt-4 flex items-center justify-between">
              <span className="text-xs text-stone-500 font-mono">High Score: {scores.find((s) => s.gameId === "temple-run")?.highScore || 0} pts</span>
              <button onClick={() => setActiveGame("temple-run")} className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700">Enter Temple</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-Game 1: Book Trivia
function BookTriviaGame({ onCompleted }: { onCompleted: (points: number) => void }) {
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answerState, setAnswerState] = useState<{ isCorrect: boolean; isDone: boolean; text: string } | null>(null);

  const questions = [
    { q: "Who wrote 'Children are parents' investment'?", opts: ["James Clear", "Grace Atieno", "Kelvin Opara Wafula", "Dr. Faith Njoki"], c: 2 },
    { q: "What is the capital and location focal point of Wafula Digital?", opts: ["Nairobi, Kenya", "Bungoma, Kenya", "Mombasa, Kenya", "Kisumu, Kenya"], c: 1 },
    { q: "What was Cal Newport's core theme inside his book 'Deep Work'?", opts: ["Unfocused social multi-tasking", "Focused professional success without distractions", "Renting cheap office spaces", "Reading science fiction textbooks"], c: 1 }
  ];

  const handleSelect = (idx: number) => {
    const isCorrect = idx === questions[qIndex].c;
    const addition = isCorrect ? 10 : 0;
    setScore((s) => s + addition);
    setAnswerState({
      isCorrect,
      isDone: true,
      text: isCorrect ? "Perfectly correct! +10 pts" : `Incorrect. The correct answer was: ${questions[qIndex].opts[questions[qIndex].c]}`
    });
  };

  const handleNext = () => {
    setAnswerState(null);
    if (qIndex + 1 < questions.length) {
      setQIndex(qIndex + 1);
    } else {
      onCompleted(score);
      setQIndex(-1); // Finished screen
    }
  };

  if (qIndex === -1) {
    return (
      <div className="text-center py-6">
        <h4 className="font-display text-xl font-bold text-neutral-900">Quiz Completed!</h4>
        <p className="text-xs text-stone-500 mt-1">You accumulated: {score} out of 30 pts</p>
        <button onClick={() => { setQIndex(0); setScore(0); }} className="mt-4 rounded bg-red-700 px-4 py-2 text-xs font-bold text-white">Restart Game</button>
      </div>
    );
  }

  return (
    <div className="py-4 space-y-4">
      <div className="flex justify-between text-xs font-mono font-bold text-stone-400">
        <span>QUESTION {qIndex + 1} OF 3</span>
        <span>SCORE: {score} PTS</span>
      </div>

      <h4 className="font-display font-bold text-neutral-900 text-lg">{questions[qIndex].q}</h4>

      <div className="grid gap-2 sm:grid-cols-2">
        {questions[qIndex].opts.map((opt, idx) => (
          <button
            key={idx}
            disabled={answerState?.isDone}
            onClick={() => handleSelect(idx)}
            className="rounded-xl border border-stone-200 bg-neutral-50 p-4 text-xs font-medium text-left text-neutral-800 hover:bg-neutral-100 transition"
          >
            {opt}
          </button>
        ))}
      </div>

      {answerState && (
        <div className={`p-4 rounded-xl text-xs space-y-2 ${answerState.isCorrect ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
          <p>{answerState.text}</p>
          <button onClick={handleNext} className="rounded bg-stone-900 text-white px-3 py-1.5 text-xs font-bold">Continue</button>
        </div>
      )}
    </div>
  );
}

// Sub-Game 2: Word Scramble
function WordScrambleGame({ onCompleted }: { onCompleted: (points: number) => void }) {
  const scrambledList = [
    { original: "WAFULA", scrambled: "ALUFAW", tip: "Our core author's family surname name badge" },
    { original: "LEADER", scrambled: "REEDAL", tip: "Your transformational goal in leadership school" },
    { original: "BUNGOMA", scrambled: "MAUBNGO", tip: "Kenya location headquarters of this initiative" },
    { original: "PUBLISH", scrambled: "ILPSUBH", tip: "A machine that converts Word notes to formatted books" }
  ];

  const [idx, setIdx] = useState(0);
  const [guess, setGuess] = useState("");
  const [score, setScore] = useState(0);
  const [msg, setMsg] = useState("");

  const handleGuess = () => {
    if (guess.toUpperCase().trim() === scrambledList[idx].original) {
      setScore((s) => s + 15);
      setMsg("✅ That is correct! Crucial word unlocked.");
      setTimeout(() => {
        setGuess("");
        setMsg("");
        if (idx + 1 < scrambledList.length) {
          setIdx(idx + 1);
        } else {
          onCompleted(score + 15);
          setIdx(-1);
        }
      }, 1500);
    } else {
      setMsg("❌ Not quite. Double-check your character placement!");
    }
  };

  if (idx === -1) {
    return (
      <div className="text-center py-6">
        <h4 className="font-display text-xl font-bold text-neutral-900">Word Scramble Mastered!</h4>
        <p className="text-xs text-stone-500 mt-1">Total score: {score} pts</p>
        <button onClick={() => { setIdx(0); setScore(0); setGuess(""); }} className="mt-4 rounded bg-red-700 px-4 py-2 text-xs font-bold text-white">Restart</button>
      </div>
    );
  }

  return (
    <div className="py-4 space-y-4 max-w-md mx-auto">
      <div className="text-center">
        <span className="font-mono text-xs font-bold uppercase text-stone-400">GUESS THE HIDDEN KEYWORD</span>
        <h1 className="font-display text-3xl font-extrabold tracking-widest text-red-700 mt-2">{scrambledList[idx].scrambled}</h1>
        <p className="text-xs text-stone-500 italic mt-1 font-mono">Tip: {scrambledList[idx].tip}</p>
      </div>

      <div className="space-y-3">
        <input
          type="text"
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          className="w-full text-center tracking-widest text-lg border rounded-lg py-2 capitalize font-bold outline-none border-stone-200"
          placeholder="your transcription guess"
        />
        <button onClick={handleGuess} className="w-full rounded bg-red-700 py-2.5 text-xs text-white font-bold">Submit Guess</button>
      </div>

      {msg && <p className="text-center text-xs font-bold text-red-700 mt-2">{msg}</p>}
    </div>
  );
}

// Sub-Game 3: Speed Math
function SpeedMathGame({ onCompleted }: { onCompleted: (points: number) => void }) {
  const [left, setLeft] = useState(0);
  const [right, setRight] = useState(0);
  const [answer, setAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(25);
  const [score, setScore] = useState(0);
  const [active, setActive] = useState(false);

  useEffect(() => {
    let timer: any;
    if (active && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0 && active) {
      setActive(false);
      onCompleted(score);
    }
    return () => clearTimeout(timer);
  }, [timeLeft, active]);

  const generateEquation = () => {
    setLeft(Math.floor(Math.random() * 12) + 3);
    setRight(Math.floor(Math.random() * 9) + 2);
    setAnswer("");
  };

  const handleStart = () => {
    setScore(0);
    setTimeLeft(25);
    setActive(true);
    generateEquation();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correct = left * right;
    if (parseInt(answer) === correct) {
      setScore((s) => s + 10);
      generateEquation();
    } else {
      setAnswer("");
    }
  };

  if (!active) {
    return (
      <div className="text-center py-10 space-y-4">
        <h4 className="font-display text-xl font-bold text-neutral-900">Speed Math Expedition</h4>
        <p className="text-xs text-stone-500 max-w-sm mx-auto">Multiply numbers as quickly as you can in 25 seconds. Solves are rewarded instantly in high-scores.</p>
        <p className="font-mono font-bold text-xs text-stone-500">Your Last Score: {score} pts</p>
        <button onClick={handleStart} className="rounded bg-red-700 text-white px-5 py-2.5 text-xs font-bold">Start Speedrun</button>
      </div>
    );
  }

  return (
    <div className="py-4 space-y-4 max-w-xs mx-auto text-center">
      <div className="flex justify-between font-mono text-xs font-bold">
        <span className="text-stone-400">SECONDS LEFT: <span className="text-red-700">{timeLeft}s</span></span>
        <span className="text-neutral-800">SCORE: {score}</span>
      </div>

      <div className="text-4xl font-display font-medium text-neutral-900">
        {left} × {right} = ?
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="number"
          required
          autoFocus
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="w-full text-center border rounded py-2 text-md"
          placeholder="your response"
        />
        <button type="submit" className="w-full rounded bg-stone-900 py-2.5 text-xs text-white font-bold">Enter</button>
      </form>
    </div>
  );
}

// Sub-Game 4: Hangman Game
function HangmanGame({ onCompleted }: { onCompleted: (points: number) => void }) {
  const SECRETS = ["WAFULA", "BUNGOMA", "LEADER", "BIBLE", "STRATEGY"];
  const [word, setWord] = useState("");
  const [guessed, setGuessed] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);

  useEffect(() => {
    setWord(SECRETS[Math.floor(Math.random() * SECRETS.length)]);
  }, []);

  const handleChar = (char: string) => {
    if (guessed.includes(char)) return;
    setGuessed([...guessed, char]);
    if (!word.includes(char)) {
      setMistakes((m) => m + 1);
    }
  };

  const isWon = word && word.split("").every((letter) => guessed.includes(letter));
  const isLost = mistakes >= 6;

  useEffect(() => {
    if (isWon) onCompleted(40);
  }, [isWon]);

  const handleReset = () => {
    setWord(SECRETS[Math.floor(Math.random() * SECRETS.length)]);
    setGuessed([]);
    setMistakes(0);
  };

  const renderHidden = () => {
    if (!word) return "";
    return word.split("").map((char) => (guessed.includes(char) ? char : "_")).join(" ");
  };

  return (
    <div className="py-4 max-w-md mx-auto text-center space-y-4">
      <div className="flex justify-between text-xs font-mono text-stone-400">
        <span>GUESS HIDDEN CHARACTERS</span>
        <span>MISTAKES: {mistakes} / 6</span>
      </div>

      <h1 className="font-display text-4xl font-extrabold tracking-widest text-[#1c1917] mt-4">{renderHidden()}</h1>

      {isWon && (
        <div className="rounded-xl bg-green-50 p-4 text-xs font-bold text-green-800">
          🎉 Incredible! You guessed the keyword "{word}" perfectly. Earned +40 pts!
          <button onClick={handleReset} className="block mx-auto mt-2 rounded bg-green-600 px-3 py-1 text-white">Play Again</button>
        </div>
      )}

      {isLost && (
        <div className="rounded-xl bg-red-50 p-4 text-xs font-bold text-red-800">
          💀 Game Over! The hidden keyword was "{word}".
          <button onClick={handleReset} className="block mx-auto mt-2 rounded bg-red-600 px-3 py-1 text-white">Restart Game</button>
        </div>
      )}

      {!isWon && !isLost && (
        <div className="grid grid-cols-6 gap-1 md:grid-cols-7 pt-4">
          {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((c) => (
            <button
              key={c}
              onClick={() => handleChar(c)}
              disabled={guessed.includes(c)}
              className={`rounded py-2 text-xs font-bold transition ${
                guessed.includes(c) ? "bg-stone-100 text-stone-300" : "bg-neutral-100 hover:bg-neutral-200"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Sub-Game 5: Bible Quiz
function BibleQuizGame({ onCompleted }: { onCompleted: (points: number) => void }) {
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);

  const bibleQuestions = [
    { q: "How many books are in the standard King James Version (KJV) Bible?", opts: ["66 books", "73 books", "59 books", "80 books"], c: 0, ex: "The KJV Protestant standard contains exactly 66 books, divided into 39 Old Testament and 27 New Testament sections." },
    { q: "What was the very first command God uttered in Genesis 1?", opts: ["Let there be a firmament", "Let there be light", "Multiply and fill the earth", "Divide the dry land"], c: 1, ex: "Genesis 1:3: 'And God said, Let there be light: and there was light.'" },
    { q: "According to Psalm 23, what follows 'all the days of my life'?", opts: ["Still waters and green pastures", "Surely goodness and mercy", "Paths of righteousness", "Shadow of death"], c: 1, ex: "Psalm 23:6: 'Surely goodness and mercy shall follow me all the days of my life...'" }
  ];

  const handleNext = () => {
    setSelected(null);
    setChecked(false);
    if (qIndex + 1 < bibleQuestions.length) {
      setQIndex(qIndex + 1);
    } else {
      onCompleted(score);
      setQIndex(-1);
    }
  };

  const handleCheck = () => {
    if (selected === bibleQuestions[qIndex].c) {
      setScore((s) => s + 15);
    }
    setChecked(true);
  };

  if (qIndex === -1) {
    return (
      <div className="text-center py-6">
        <h4 className="font-display text-xl font-bold text-neutral-900">Bible Quiz Mastery!</h4>
        <p className="text-xs text-stone-500 mt-1">Faithful score: {score} out of 45 pts</p>
        <button onClick={() => { setQIndex(0); setScore(0); }} className="mt-4 rounded bg-red-700 px-4 py-2 text-xs font-bold text-white">Unlock Again</button>
      </div>
    );
  }

  return (
    <div className="py-4 space-y-4 max-w-lg mx-auto">
      <h3 className="text-center font-display font-bold text-amber-800 text-xs tracking-wider uppercase">✝️ SCRIPTURAL DEBIT ASSIGNMENT</h3>
      <h4 className="font-display text-lg font-bold text-neutral-900">{bibleQuestions[qIndex].q}</h4>

      <div className="space-y-1.5">
        {bibleQuestions[qIndex].opts.map((opt, idx) => (
          <button
            key={idx}
            disabled={checked}
            onClick={() => setSelected(idx)}
            className={`flex w-full items-center justify-between rounded-lg p-3 text-left border transition text-xs ${
              selected === idx ? "border-amber-500 bg-amber-50 text-amber-900 font-semibold" : "border-stone-100 bg-neutral-50"
            }`}
          >
            <span>{opt}</span>
          </button>
        ))}
      </div>

      {checked ? (
        <div className="p-4 rounded-xl text-xs space-y-2 bg-amber-50 text-amber-900">
          <p>{selected === bibleQuestions[qIndex].c ? "✨ Blessings! Correct answer." : "Incorrect. Let's study again."}</p>
          <p className="opacity-80 leading-relaxed italic">{bibleQuestions[qIndex].ex}</p>
          <button onClick={handleNext} className="rounded bg-amber-800 text-white px-3 py-1 text-xs">Proceed</button>
        </div>
      ) : (
        <button onClick={handleCheck} disabled={selected === null} className="w-full rounded bg-amber-800 text-white py-2 text-xs font-bold disabled:opacity-50">Confirm Guess</button>
      )}
    </div>
  );
}

// Sub-Game 6: Leadership Journey Maze
function LeadershipMazeGame({ onCompleted }: { onCompleted: (points: number) => void }) {
  const [step, setStep] = useState(1);
  const [resources, setResources] = useState({ gold: 120, water: 100, morale: 100 });
  const [log, setLog] = useState("Your leadership caravan leaves Bungoma to cross the Great Savannah. Manage resources wisely!");

  const takeAction = (goldDiff: number, waterDiff: number, moraleDiff: number, nextStep: number, actionLog: string) => {
    setResources((prev) => ({
      gold: Math.max(0, prev.gold + goldDiff),
      water: Math.max(0, prev.water + waterDiff),
      morale: Math.max(0, prev.morale + moraleDiff)
    }));
    setLog(actionLog);
    setStep(nextStep);
  };

  const isWin = step === 5;
  const isLoss = resources.water <= 0 || resources.morale <= 0;

  useEffect(() => {
    if (isWin) onCompleted(50);
  }, [isWin]);

  const handleReset = () => {
    setStep(1);
    setResources({ gold: 120, water: 100, morale: 100 });
    setLog("Caravan reset safely. Welcome to Bungoma!");
  };

  if (isLoss) {
    return (
      <div className="text-center py-6 space-y-3">
        <h4 className="font-display text-xl font-bold text-red-700">Caravan Dispersed!</h4>
        <p className="text-xs text-stone-500 max-w-sm mx-auto">Your water dried up or team morale fell through the ground. Remember: high-performance leaders protect their caravan cushions!</p>
        <button onClick={handleReset} className="rounded bg-stone-900 px-4 py-2 text-xs text-white">Restart Safari</button>
      </div>
    );
  }

  if (isWin) {
    return (
      <div className="text-center py-6 space-y-3">
        <h4 className="font-display text-xl font-bold text-green-700">Safely Arrived in Bungoma! 🎉</h4>
        <p className="text-xs text-stone-500">Your caravan reached home safely. Final Gold: {resources.gold}. Earned Master Badge! +50 pts</p>
        <button onClick={handleReset} className="rounded bg-red-700 px-4 py-1.5 text-xs text-white">Play Again</button>
      </div>
    );
  }

  return (
    <div className="py-4 space-y-4 max-w-md mx-auto">
      <h3 className="text-center text-xs font-mono font-bold uppercase tracking-wider text-stone-400">⛺ LEADERSHIP SAFARI ADVENTURE</h3>

      {/* Resource bar */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
        <div className="rounded-lg bg-yellow-50 p-2 text-yellow-700">💰 Gold: {resources.gold}</div>
        <div className="rounded-lg bg-blue-50 p-2 text-blue-700 font-bold">💧 Water: {resources.water}%</div>
        <div className="rounded-lg bg-red-50 p-2 text-red-700">❤️ Morale: {resources.morale}%</div>
      </div>

      <div className="rounded-xl border border-stone-200/80 bg-stone-50 p-4 text-xs leading-relaxed text-stone-700">
        {log}
      </div>

      <div className="space-y-2 pt-2">
        {step === 1 && (
          <>
            <button onClick={() => takeAction(-20, -10, 20, 2, "You buy premium leadership manuals. Team morale boosts (+20), but you pay some gold.")} className="w-full text-left rounded-lg p-3 border bg-white text-xs hover:bg-neutral-50">
              💵 Option A: Invest in manuals (Cost: 20 Gold)
            </button>
            <button onClick={() => takeAction(0, -30, -10, 2, "You rush through the hot sands. Water drops significantly (-30) and team is tired.")} className="w-full text-left rounded-lg p-3 border bg-white text-xs hover:bg-neutral-50">
              🏜️ Option B: Push double-speed through dry deserts (Zero Gold)
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <button onClick={() => takeAction(-10, 40, 10, 3, "You trade gold for water in a local well. Water rises (+40).")} className="w-full text-left rounded-lg p-3 border bg-white text-xs hover:bg-neutral-50">
              🌊 Option A: Pay well-keeper to top up supplies (Cost: 10 Gold)
            </button>
            <button onClick={() => takeAction(30, -10, -30, 3, "You salvage a broken merchant wagon. You gain gold, but team morale dropped due to looting worries.")} className="w-full text-left rounded-lg p-3 border bg-white text-xs hover:bg-neutral-50">
              🛠️ Option B: Loot scrap wagon (Gain +30 Gold, Morale drops)
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <button onClick={() => takeAction(0, -20, 30, 4, "You halt the caravan, camp out, and review Wafula Slogans. Morale increases (+30).")} className="w-full text-left rounded-lg p-3 border bg-white text-xs hover:bg-neutral-50">
              ⛺ Option A: Perform review camp & rest (Cost: 20 Water)
            </button>
            <button onClick={() => takeAction(-50, 0, -25, 4, "A wild storm sweeps your camps. Resources take a heavy beating!")} className="w-full text-left rounded-lg p-3 border bg-white text-xs hover:bg-neutral-50">
              ⛈️ Option B: March through high-winds in faith (-50 Gold)
            </button>
          </>
        )}

        {step === 4 && (
          <>
            <button onClick={() => takeAction(0, -20, 20, 5, "You climb the final Bungoma ridges and sight the school gates! Safe!")} className="w-full text-left rounded-lg p-3 border bg-white text-xs hover:bg-neutral-50">
              🚩 Option A: Final steady march home (-20 Water)
            </button>
            <button onClick={() => takeAction(-40, 10, -40, 5, "You hire guides. Safe, but gold is spent.")} className="w-full text-left rounded-lg p-3 border bg-white text-xs hover:bg-neutral-50">
              📍 Option B: Pay local scouts for secure bypass (-40 Gold)
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Sub-Game 7: Memory Match
function MemoryMatchGame({ onCompleted }: { onCompleted: (points: number) => void }) {
  const INITIAL_EMOJIS = ["📚", "✍️", "📖", "🎖️", "⛪", "🗺️", "📚", "✍️", "📖", "🎖️", "⛪", "🗺️"];
  const [cards, setCards] = useState<string[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);

  useEffect(() => {
    // Shuffle cards
    setCards([...INITIAL_EMOJIS].sort(() => Math.random() - 0.5));
  }, []);

  const handleCardClick = (idx: number) => {
    if (flipped.length === 2 || matched.includes(idx) || flipped.includes(idx)) return;
    const newFlipped = [...flipped, idx];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      if (cards[newFlipped[0]] === cards[newFlipped[1]]) {
        setMatched([...matched, ...newFlipped]);
        setFlipped([]);
      } else {
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  };

  const isWon = matched.length === INITIAL_EMOJIS.length;

  useEffect(() => {
    if (isWon) onCompleted(30);
  }, [isWon]);

  const handleReset = () => {
    setCards([...INITIAL_EMOJIS].sort(() => Math.random() - 0.5));
    setFlipped([]);
    setMatched([]);
  };

  return (
    <div className="py-4 max-w-sm mx-auto text-center space-y-4">
      <div className="flex justify-between font-mono text-xs text-stone-400">
        <span>GENRE MEMORY PAIRS</span>
        <span>MATCHED: {matched.length / 2} / 6</span>
      </div>

      <div className="grid grid-cols-4 gap-2.5 pt-2">
        {cards.map((card, idx) => {
          const isOpen = flipped.includes(idx) || matched.includes(idx);
          return (
            <button
              key={idx}
              onClick={() => handleCardClick(idx)}
              className={`flex h-16 items-center justify-center rounded-xl text-2xl font-bold transition duration-300 shadow-sm ${
                isOpen ? "bg-red-50 text-red-800 scale-95 border border-red-200" : "bg-stone-900 text-transparent hover:bg-stone-850 cursor-pointer"
              }`}
            >
              {isOpen ? card : "?"}
            </button>
          );
        })}
      </div>

      {isWon && (
        <div className="rounded-xl bg-green-50 p-4 text-xs font-bold text-green-800">
          🏆 Victory! You matched all pairs beautifully. +30 pts scored securely!
          <button onClick={handleReset} className="block mx-auto mt-2 rounded bg-green-600 px-3 py-1 text-white text-xs">Play Again</button>
        </div>
      )}
    </div>
  );
}

// Sub-Game 8: Highway Driving Simulator (Bicycle, Car, Motorbike)
function BungomaHighwayDrivingGame({ onCompleted }: { onCompleted: (points: number) => void }) {
  const [vehicle, setVehicle] = useState<"bicycle" | "car" | "motorbike" | null>(null);
  const [playerLane, setPlayerLane] = useState<number>(1); // 0 = Left, 1 = Middle, 2 = Right
  const [hearts, setHearts] = useState<number>(3);
  const [distance, setDistance] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [gameState, setGameState] = useState<"menu" | "playing" | "gameover" | "win">("menu");
  const [obstacles, setObstacles] = useState<{ id: number; lane: number; y: number; type: string }[]>([]);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);

  // Stats config based on selected vehicle
  const vehicleStats = {
    bicycle: { label: "Civic Bicycle 🚴", speed: 25, labelColor: "text-blue-600", maxObstacleInterval: 1200 },
    car: { label: "Safari Turbo Car 🚗", speed: 85, labelColor: "text-indigo-600", maxObstacleInterval: 800 },
    motorbike: { label: "Agile Trail Motorbike 🏍️", speed: 140, labelColor: "text-rose-600", maxObstacleInterval: 600 }
  };

  useEffect(() => {
    if (gameState !== "playing" || !vehicle) return;

    // Tick Interval to progress path
    const interval = setInterval(() => {
      const activeStats = vehicleStats[vehicle];
      const speedValue = activeStats.speed * speedMultiplier;
      
      setDistance((d) => {
        const nextDist = d + Math.round(speedValue * 0.1);
        if (nextDist >= 1000) {
          setGameState("win");
          onCompleted(score + 100);
          return 1000;
        }
        return nextDist;
      });

      setScore((s) => s + Math.round(5 * speedMultiplier));

      // Update obstacle positions
      setObstacles((prev) => {
        const moved = prev.map((o) => ({ ...o, y: o.y + (vehicle === "motorbike" ? 18 : vehicle === "car" ? 14 : 9) }));
        
        // Detect collisions
        const expired = moved.filter((o) => o.y >= 100);
        const collisions = expired.filter((o) => o.lane === playerLane);

        if (collisions.length > 0) {
          setHearts((h) => {
            const nextHearts = h - 1;
            if (nextHearts <= 0) {
              setGameState("gameover");
              onCompleted(score);
            }
            return nextHearts;
          });
          // Visual shake alert
          const beepElement = document.getElementById("driving_canvas_box");
          if (beepElement) {
            beepElement.classList.add("bg-red-105", "animate-pulse");
            setTimeout(() => beepElement.classList.remove("bg-red-105", "animate-pulse"), 350);
          }
        }

        return moved.filter((o) => o.y < 100);
      });
    }, 150);

    return () => clearInterval(interval);
  }, [gameState, vehicle, playerLane, score, speedMultiplier]);

  // Spawn obstacles logic
  useEffect(() => {
    if (gameState !== "playing" || !vehicle) return;

    const spawnTimer = setInterval(() => {
      const activeStats = vehicleStats[vehicle];
      const randomLane = Math.floor(Math.random() * 3);
      const obstacleTypes = ["🪨 Rock", "🪵 Log", "🚗 Slow Vehicle", "🚧 Barrier"];
      const randomType = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];

      setObstacles((prev) => [...prev, { id: Date.now(), lane: randomLane, y: 0, type: randomType }]);
    }, vehicleStats[vehicle].maxObstacleInterval);

    return () => clearInterval(spawnTimer);
  }, [gameState, vehicle]);

  const handleStartGame = (type: "bicycle" | "car" | "motorbike") => {
    setVehicle(type);
    setPlayerLane(1);
    setHearts(3);
    setDistance(0);
    setScore(0);
    setObstacles([]);
    setSpeedMultiplier(1);
    setGameState("playing");
  };

  const handleSteerLeft = () => {
    if (playerLane > 0) setPlayerLane(playerLane - 1);
  };

  const handleSteerRight = () => {
    if (playerLane < 2) setPlayerLane(playerLane + 1);
  };

  const toggleBoost = () => {
    setSpeedMultiplier((m) => (m === 1 ? 2 : 1));
  };

  if (gameState === "menu") {
    return (
      <div className="py-6 max-w-lg mx-auto text-left space-y-5 select-none">
        <div className="text-center space-y-1">
          <span className="text-4xl animate-bounce inline-block">🚦</span>
          <h3 className="font-display text-xl font-bold text-neutral-900">Bungoma Highway Driving</h3>
          <p className="text-xs text-stone-500">Pick your vehicle, steer along 3 lanes, and avoid rocks, barricades, and logs to log points!</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 pt-2">
          {/* Bicycle */}
          <button
            onClick={() => handleStartGame("bicycle")}
            className="rounded-2xl border border-blue-200 bg-blue-50/20 hover:bg-blue-50 p-4 font-medium transition duration-150 flex flex-col items-center text-center space-y-2 lg:h-36"
          >
            <span className="text-3xl">🚴</span>
            <div>
              <strong className="text-xs text-blue-900 block">Civic Bicycle</strong>
              <span className="text-[10px] text-slate-505 block">Speed: 25 km/h</span>
              <span className="text-[9px] text-blue-700 font-bold block mt-1">EASY HANDLING</span>
            </div>
          </button>

          {/* Car */}
          <button
            onClick={() => handleStartGame("car")}
            className="rounded-2xl border border-indigo-200 bg-indigo-50/20 hover:bg-indigo-50 p-4 font-medium transition duration-150 flex flex-col items-center text-center space-y-2 lg:h-36"
          >
            <span className="text-3xl">🚗</span>
            <div>
              <strong className="text-xs text-indigo-900 block font-bold">Safari Turbo Car</strong>
              <span className="text-[10px] text-slate-505 block">Speed: 85 km/h</span>
              <span className="text-[9px] text-indigo-700 font-bold block mt-1">HIGH SPEED</span>
            </div>
          </button>

          {/* Motorbike */}
          <button
            onClick={() => handleStartGame("motorbike")}
            className="rounded-2xl border border-rose-200 bg-rose-50/20 hover:bg-rose-50 p-4 font-medium transition duration-150 flex flex-col items-center text-center space-y-2 lg:h-36"
          >
            <span className="text-3xl">🏍️</span>
            <div>
              <strong className="text-xs text-rose-900 block font-bold font-sans">Trail Motorbike</strong>
              <span className="text-[10px] text-slate-550 block">Speed: 140 km/h</span>
              <span className="text-[9px] text-rose-600 font-bold block mt-1">EXTREME REFLEX</span>
            </div>
          </button>
        </div>
      </div>
    );
  }

  const activeStats = vehicle ? vehicleStats[vehicle] : { label: "Vehicle", speed: 0, labelColor: "text-slate-800" };

  return (
    <div className="py-4 max-w-md mx-auto space-y-4 select-none">
      {/* HUD Stats */}
      <div className="flex justify-between items-center text-xs font-mono bg-neutral-50 p-3 rounded-xl border border-stone-200">
        <div>
          <span className="text-stone-400">VEHICLE</span>
          <p className={`font-bold ${activeStats.labelColor} uppercase`}>{activeStats.label}</p>
        </div>
        <div className="text-center">
          <span className="text-stone-400">DISTANCE</span>
          <p className="font-bold text-stone-900 text-sm">{distance}m / 1000m</p>
        </div>
        <div className="text-center">
          <span className="text-stone-400">SCORE</span>
          <p className="font-bold text-emerald-705">{score} pts</p>
        </div>
        <div className="text-right">
          <span className="text-stone-400">HEARTS</span>
          <p className="font-bold text-red-600 tracking-wider">
            {Array.from({ length: 3 }).map((_, idx) => (idx < hearts ? "❤️" : "🖤"))}
          </p>
        </div>
      </div>

      {gameState === "playing" ? (
        <div className="space-y-4 text-center">
          {/* Animated Road Track Visualizer Container */}
          <div
            id="driving_canvas_box"
            className="relative w-full h-80 bg-neutral-850 rounded-2xl border-4 border-neutral-700 overflow-hidden shadow-inner flex"
          >
            {/* Lane dividing lines */}
            <div className="absolute inset-y-0 left-1/3 w-1 border-r-2 border-dashed border-gray-500" />
            <div className="absolute inset-y-0 left-2/3 w-1 border-r-2 border-dashed border-gray-500" />

            {/* Lane indicators overlays */}
            <div className="absolute bottom-2 left-0 right-0 grid grid-cols-3 text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider pointer-events-none">
              <span>Lane 1</span>
              <span>Lane 2</span>
              <span>Lane 3</span>
            </div>

            {/* Spawning obstacle nodes */}
            {obstacles.map((o) => (
              <div
                key={o.id}
                className="absolute transition-all duration-150 transform -translate-x-1/2 -translate-y-1/2 text-2xl"
                style={{
                  left: `${(o.lane * 33.3) + 16.6}%`,
                  top: `${o.y}%`
                }}
              >
                {o.type.split(" ")[0]}
              </div>
            ))}

            {/* Steered Driving Vehicle node */}
            <div
              className="absolute bottom-6 transition-all duration-150 transform -translate-x-1/2 text-3xl"
              style={{
                left: `${(playerLane * 33.3) + 16.6}%`
              }}
            >
              {vehicle === "motorbike" ? "🏍️" : vehicle === "car" ? "🚗" : "🚴"}
            </div>
          </div>

          {/* Steer Control Dashboard */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleSteerLeft}
              className="rounded-xl border bg-slate-900 hover:bg-slate-950 font-extrabold text-white py-3 text-xs active:scale-95 transition"
            >
              ◀ Move Left
            </button>
            <button
              onClick={toggleBoost}
              className={`rounded-xl border font-extrabold py-3 text-xs active:scale-95 transition ${
                speedMultiplier > 1 ? "bg-red-700 text-white animate-pulse" : "bg-neutral-100 text-stone-700 hover:bg-neutral-200"
              }`}
            >
              ⚡ {speedMultiplier > 1 ? "TURBO ON" : "DRIVE TURBO"}
            </button>
            <button
              onClick={handleSteerRight}
              className="rounded-xl border bg-slate-900 hover:bg-slate-950 font-extrabold text-white py-3 text-xs active:scale-95 transition"
            >
              Move Right ▶
            </button>
          </div>

          <p className="text-[10px] text-stone-400 font-mono">
            Control vehicle with screen buttons or press arrow keys to steer between lanes! Avoid rocks to survive.
          </p>
        </div>
      ) : gameState === "win" ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center space-y-3">
          <span className="text-4xl">🏁</span>
          <h4 className="font-display text-lg font-bold text-green-900">Arrived in Great Speed!</h4>
          <p className="text-xs text-stone-605">Congratulations! You traversed 1000m on the Bungoma highway safely. +100 Winning Bonus applied!</p>
          <p className="text-xs text-green-800 font-mono font-bold">Total Scored: {score + 100} Points</p>
          <button
            onClick={() => setGameState("menu")}
            className="rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 text-xs"
          >
            Restart Driving Safari
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center space-y-3">
          <span className="text-4xl">💥</span>
          <h4 className="font-display text-lg font-bold text-red-950 font-sans">Accident Collision!</h4>
          <p className="text-xs text-stone-605">Your vehicle sustained extreme damage on the highway. Drive with maximum focus!</p>
          <p className="text-xs text-red-800 font-mono font-bold">Final Scored: {score} Points</p>
          <button
            onClick={() => setGameState("menu")}
            className="rounded-lg bg-red-700 hover:bg-red-800 text-white font-bold px-4 py-2 text-xs"
          >
            Re-ignition Engine
          </button>
        </div>
      )}
    </div>
  );
}
