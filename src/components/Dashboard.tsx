import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { User, Book, Badge, SavedDocument, MemberUploadRequest, CommunityMessage } from "../types";
import { BADGES } from "../data";
import { Trophy, Compass, Star, Bookmark, Calendar, CheckSquare, Zap, Clock, BookOpen, Trash2, ShieldCheck, Download, Eye } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import SecureBookReader from "./SecureBookReader";

interface DashboardProps {
  currentUser: User | null;
  onLogIn: () => void;
  books: Book[];
  purchasedBookIds: string[];
  wishlistBookIds: string[];
  unlockedBadgeIds: string[];
  savedDocuments: SavedDocument[];
  uploadRequests: MemberUploadRequest[];
  communityMessages: CommunityMessage[];
  onRemoveWishlist: (id: string) => void;
  onAddNewDocument?: (doc: SavedDocument) => void;
}

const getBookProgress = (bookId: string, totalPages: number) => {
  const saved = localStorage.getItem(`wafula_bookmark_${bookId}`);
  if (saved) {
    const pageNum = parseInt(saved, 10);
    if (!isNaN(pageNum) && pageNum > 0 && totalPages > 0) {
      return Math.min(100, Math.round((pageNum / totalPages) * 100));
    }
  }
  return 0; // Not started
};

const getBookLastReadPage = (bookId: string) => {
  const saved = localStorage.getItem(`wafula_bookmark_${bookId}`);
  if (saved) {
    return parseInt(saved, 10) || 1;
  }
  return 1;
};

export default function Dashboard({
  currentUser,
  onLogIn,
  books,
  purchasedBookIds,
  wishlistBookIds,
  unlockedBadgeIds,
  savedDocuments,
  uploadRequests,
  communityMessages,
  onRemoveWishlist,
  onAddNewDocument
}: DashboardProps) {
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(30);
  const [userStreak, setUserStreak] = useState(5);
  const [loggedMinutes, setLoggedMinutes] = useState(15);
  const [readingBook, setReadingBook] = useState<Book | null>(null);

  const [monthlyLogs, setMonthlyLogs] = useState<{ dateStr: string; label: string; minutes: number }[]>([]);
  const [syllabusProgress, setSyllabusProgress] = useState<any[]>([]);

  useEffect(() => {
    const userMail = currentUser?.email || "guest@wafula.com";
    const gradesKey = `WAFULA_STUDENT_GRADES_${userMail}`;
    const gradesStr = localStorage.getItem(gradesKey);
    let grades: Record<string, any> = {};
    if (gradesStr) {
      try {
        grades = JSON.parse(gradesStr);
      } catch (_) {}
    }

    const defaultTopics = [
      { id: "visionary_leadership", name: "Visionary Leadership" },
      { id: "effective_communication", name: "Effective Communication" },
      { id: "project_finance", name: "Project Finance & Audit" },
      { id: "conflict_resolution", name: "Conflict Resolution" },
      { id: "it_infrastructure", name: "IT Infrastructure" },
      { id: "software_engineering", name: "Software Engineering" }
    ];

    const customList = Object.keys(grades)
      .filter(id => id.startsWith("ai_class_"))
      .map(id => ({
        id,
        name: grades[id].topic
      }));

    const allSyllabusTopics = [...defaultTopics, ...customList];

    const chartData = allSyllabusTopics.map(topic => {
      const record = grades[topic.id];
      return {
        name: topic.name.split(" ").slice(0, 2).join(" "),
        fullName: topic.name,
        Score: record ? record.score : 0,
        Completed: record ? 100 : 0
      };
    });

    setSyllabusProgress(chartData);
  }, [currentUser]);

  // Generate date list for past 30 days
  const generatePast30Days = () => {
    const list = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      list.push({ dateStr, label, minutes: 0 });
    }
    return list;
  };

  useEffect(() => {
    const baseDays = generatePast30Days();
    const stored = localStorage.getItem("WAFULA_MONTHLY_READS_LOG");
    let logsMap: Record<string, number> = {};
    
    if (stored) {
      try {
        logsMap = JSON.parse(stored);
      } catch (e) {
        console.warn("Could not parse WAFULA_MONTHLY_READS_LOG, initializing", e);
      }
    } else {
      const seeded: Record<string, number> = {};
      baseDays.forEach((day, idx) => {
        if (idx === baseDays.length - 1) {
          seeded[day.dateStr] = loggedMinutes;
        } else {
          const randSeed = (idx * 11) % 13;
          seeded[day.dateStr] = randSeed === 0 ? 0 : Math.round(10 + randSeed * 3);
        }
      });
      localStorage.setItem("WAFULA_MONTHLY_READS_LOG", JSON.stringify(seeded));
      logsMap = seeded;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    logsMap[todayStr] = loggedMinutes;

    const merged = baseDays.map(day => ({
      ...day,
      minutes: typeof logsMap[day.dateStr] === 'number' ? logsMap[day.dateStr] : 0
    }));

    setMonthlyLogs(merged);
  }, [loggedMinutes]);

  const updateMonthlyLog = (additionalMins: number) => {
    try {
      const stored = localStorage.getItem("WAFULA_MONTHLY_READS_LOG") || "{}";
      const logsMap: Record<string, number> = JSON.parse(stored);
      const todayStr = new Date().toISOString().split("T")[0];
      const todayMins = logsMap[todayStr] || 0;
      logsMap[todayStr] = Math.max(0, todayMins + additionalMins);
      localStorage.setItem("WAFULA_MONTHLY_READS_LOG", JSON.stringify(logsMap));
    } catch (e) {
      console.warn("Failed to update monthly logs in localStorage:", e);
    }
  };

  const resetTodayMonthlyLog = () => {
    try {
      const stored = localStorage.getItem("WAFULA_MONTHLY_READS_LOG") || "{}";
      const logsMap: Record<string, number> = JSON.parse(stored);
      const todayStr = new Date().toISOString().split("T")[0];
      logsMap[todayStr] = 0;
      localStorage.setItem("WAFULA_MONTHLY_READS_LOG", JSON.stringify(logsMap));
    } catch (e) {
      console.warn("Failed to reset monthly log entry:", e);
    }
  };

  const mockWeekData = [
    { name: "Mon", MinutesRead: 25, Goal: 30 },
    { name: "Tue", MinutesRead: 40, Goal: 30 },
    { name: "Wed", MinutesRead: 15, Goal: 35 },
    { name: "Thu", MinutesRead: 35, Goal: 35 },
    { name: "Fri", MinutesRead: 55, Goal: 40 },
    { name: "Sat", MinutesRead: 20, Goal: 40 },
    { name: "Today", MinutesRead: loggedMinutes, Goal: dailyGoalMinutes }
  ];

  // Resume Reading bookmark states
  const [lastReadBook, setLastReadBook] = useState<Book | null>(null);
  const [lastReadPage, setLastReadPage] = useState<number>(1);

  useEffect(() => {
    const bookId = localStorage.getItem("wafula_last_read_book_id");
    if (bookId) {
      const match = books.find((b) => b.id === bookId);
      if (match) {
        setLastReadBook(match);
        const savedPage = localStorage.getItem(`wafula_bookmark_${bookId}`);
        if (savedPage) {
          setLastReadPage(parseInt(savedPage, 10) || 1);
        }
      }
    } else {
      setLastReadBook(null);
    }
  }, [books, readingBook]);

  // Automated Inactivity Tracker (Prompt after 15 minutes of silence)
  const [inactiveSeconds, setInactiveSeconds] = useState(0);
  const [showInactivityPrompt, setShowInactivityPrompt] = useState(false);
  const [hasPrompted, setHasPrompted] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    // Reset inactivity tracker on user activity
    const resetTime = () => {
      setInactiveSeconds(0);
    };

    window.addEventListener("mousemove", resetTime);
    window.addEventListener("keydown", resetTime);
    window.addEventListener("click", resetTime);
    window.addEventListener("scroll", resetTime);
    window.addEventListener("touchstart", resetTime);

    const interval = setInterval(() => {
      setInactiveSeconds((prev) => {
        const nextVal = prev + 1;
        // 15 minutes = 15 * 60 = 900 seconds
        if (nextVal >= 900 && !showInactivityPrompt && !hasPrompted) {
          setShowInactivityPrompt(true);
          setHasPrompted(true);
        }
        return nextVal;
      });
    }, 1000);

    return () => {
      window.removeEventListener("mousemove", resetTime);
      window.removeEventListener("keydown", resetTime);
      window.removeEventListener("click", resetTime);
      window.removeEventListener("scroll", resetTime);
      window.removeEventListener("touchstart", resetTime);
      clearInterval(interval);
    };
  }, [currentUser, showInactivityPrompt, hasPrompted]);

  // Load set goal and logged minutes on start
  useEffect(() => {
    const savedGoal = localStorage.getItem("WAFULA_DAILY_GOAL");
    if (savedGoal) {
      setDailyGoalMinutes(parseInt(savedGoal));
    }
    const savedLogged = localStorage.getItem("WAFULA_LOGGED_MINUTES_TODAY");
    if (savedLogged) {
      setLoggedMinutes(parseInt(savedLogged));
    }
    if (currentUser?.readingStreak) {
      setUserStreak(currentUser.readingStreak);
    }
  }, [currentUser]);

  const handleUpdateGoal = (minVal: number) => {
    setDailyGoalMinutes(minVal);
    localStorage.setItem("WAFULA_DAILY_GOAL", minVal.toString());
  };

  const handleLogMinutes = (mins: number) => {
    const updated = Math.max(0, loggedMinutes + mins);
    setLoggedMinutes(updated);
    localStorage.setItem("WAFULA_LOGGED_MINUTES_TODAY", updated.toString());
    updateMonthlyLog(mins);
  };

  const handleResetMinutes = () => {
    setLoggedMinutes(0);
    localStorage.setItem("WAFULA_LOGGED_MINUTES_TODAY", "0");
    resetTodayMonthlyLog();
  };

  const myPurchasedBooks = books.filter((b) => purchasedBookIds.includes(b.id));
  const myWishlistedBooks = books.filter((b) => wishlistBookIds.includes(b.id));
  const myUploads = uploadRequests.filter((u) => u.userId === (currentUser?.email || "anonymous"));
  const myMessagesCount = communityMessages.filter((m) => m.userId === (currentUser?.email || "anonymous")).length;

  if (!currentUser) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 text-center text-xs text-stone-500">
        <Trophy className="h-12 w-12 text-red-700 mx-auto mb-4 animate-pulse" />
        <h3 className="font-display text-lg font-bold text-stone-900">Sign In Required</h3>
        <p className="max-w-xs mx-auto mt-2">Sign into your Wafula Digital account to load your study statistics, streak, wishlists, and purchase histories.</p>
        <button onClick={onLogIn} className="mt-4 rounded bg-red-700 hover:bg-red-850 px-4 py-2 text-white font-bold">Authenticate Member</button>
      </div>
    );
  }

  return (
    <div id="user_dashboard" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
      
      {/* Automated Inactivity Session Tracker Status Panel */}
      <div className="bg-slate-50 dark:bg-stone-900 border border-slate-200 dark:border-stone-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 select-none animate-in fade-in slide-in-from-top-3 duration-250">
        <div className="flex items-center space-x-3 text-left">
          <div className="h-9 w-9 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
            <Clock className="h-5 w-5 animate-spin" style={{ animationDuration: '8s' }} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">Automated Reading Session Timer</h4>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              <span className="text-[10.5px] font-mono text-slate-500 dark:text-slate-400 font-bold">
                Inactivity Checked: {Math.floor(inactiveSeconds / 60)}m {inactiveSeconds % 60}s
              </span>
              <span className="text-[10px] text-stone-400">•</span>
              <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">Automatic pausing & log prompt at 15m (900s) inactivity</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* Accelerator trigger */}
          <button
            type="button"
            onClick={() => {
              setInactiveSeconds(900);
              setShowInactivityPrompt(true);
            }}
            className="text-[10px] uppercase font-mono font-bold bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-400 rounded px-3 py-1.5 transition cursor-pointer"
            title="Accelerate inactivity value to 15m instantly to test prompt dialog."
          >
            🧪 Simulate Inactivity Trigger
          </button>
        </div>
      </div>

      {/* INACTIVITY SESSION MINUTES LOGGER MODAL */}
      {showInactivityPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs select-none">
          <div className="w-full max-w-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-red-700/5 border-b border-red-200/40 dark:border-red-900/30 p-5 flex items-center space-x-3 text-red-800 dark:text-red-400">
              <Clock className="h-6 w-6 stroke-[2.5]" />
              <h3 className="font-display font-black text-sm uppercase tracking-wide">Automated Study Rest Reminder</h3>
            </div>
            
            <div className="p-6 text-left space-y-4">
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                We observed <strong>15 minutes of inactivity</strong> on your account. Your active reading session has been paused automatically to optimize study logs.
              </p>
              
              <div className="rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-250 dark:border-stone-850 p-4">
                <span className="text-[10px] uppercase font-mono font-bold text-stone-400 block mb-1">Session minutes waiting to be logged</span>
                <strong className="text-2xl font-black font-mono text-zinc-950 dark:text-white text-left block">15 MINUTES</strong>
                <p className="text-[9px] text-zinc-500 dark:text-zinc-400 font-mono mt-1">This will update your daily completion rate and solidify user statistics.</p>
              </div>
            </div>

            <div className="bg-stone-50 dark:bg-stone-850 border-t border-stone-200 dark:border-stone-805 p-4 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowInactivityPrompt(false);
                  setInactiveSeconds(0);
                  setHasPrompted(false);
                }}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 px-4 py-2 text-xs font-bold text-slate-705 dark:text-slate-300 transition"
              >
                Dismiss & Reset
              </button>
              <button
                type="button"
                onClick={() => {
                  handleLogMinutes(15);
                  setShowInactivityPrompt(false);
                  setInactiveSeconds(0);
                  setHasPrompted(false);
                }}
                className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition"
              >
                Log 15 Minutes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resume Reading Bookmark Hero Banner */}
      {lastReadBook && (
        <div className="bg-gradient-to-r from-red-950 to-[#291415] dark:from-red-950 dark:to-stone-900 border border-red-900/35 p-5 rounded-2xl text-left text-white shadow-lg space-y-4 select-none relative overflow-hidden animate-in fade-in duration-300">
          <div className="absolute right-0 bottom-0 top-0 opacity-[0.14] pointer-events-none select-none">
            <Bookmark className="h-64 w-64 text-white -mr-16 -mb-16 stroke-[1]" />
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1.5 max-w-xl">
              <span className="bg-amber-400 text-stone-900 uppercase font-mono font-black text-[9px] px-2.5 py-0.5 rounded tracking-widest inline-flex items-center space-x-1">
                <Bookmark className="h-2.5 w-2.5 fill-current" />
                <span>ACTIVE BOOKMARK DETECTED</span>
              </span>
              
              <h3 className="font-display font-black text-base text-white">
                Resume Reading: {lastReadBook.title}
              </h3>
              
              <p className="text-[11px] text-stone-300 leading-relaxed font-sans mt-1">
                You were studying Kelvin Opara Wafula's handbook. Click the button below to resume from <strong>Page {lastReadPage}</strong> or download offline verified logs.
              </p>
            </div>

            <button
              onClick={() => {
                setReadingBook(lastReadBook);
              }}
              className="px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-stone-950 hover:scale-102 transform font-extrabold text-xs transition duration-200 shadow-md cursor-pointer flex items-center space-x-1.5 self-start sm:self-center uppercase tracking-wide shrink-0 font-display"
            >
              <Eye className="h-4 w-4 fill-stone-950" />
              <span>Resume Reading [p. {lastReadPage}]</span>
            </button>
          </div>
        </div>
      )}

      {/* 1. Header Streaks & Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4 select-none">
        
        {/* Streak indicator */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/60 p-5 flex items-center space-x-4 shadow-xs"
        >
          <div className="rounded-full bg-red-50 dark:bg-red-955/35 p-4 text-red-750 shrink-0">
            <Zap className="h-6 w-6 animate-pulse fill-red-600 dark:fill-red-500" />
          </div>
          <div className="text-left">
            <span className="text-stone-400 dark:text-stone-550 text-[10px] font-mono font-bold uppercase block">STREAK GOAL</span>
            <strong className="text-neutral-900 dark:text-white text-lg font-extrabold">{userStreak} Days Active</strong>
            <span className="text-[10px] text-green-700 dark:text-green-400 font-bold block mt-0.5">🔥 High Performance</span>
          </div>
        </motion.div>

        {/* Ebooks owned */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/60 p-5 flex items-center space-x-4 shadow-xs"
        >
          <div className="rounded-full bg-stone-50 dark:bg-stone-800 p-4 text-stone-750 dark:text-stone-300 shrink-0">
            <BookOpen className="h-6 w-6" />
          </div>
          <div className="text-left">
            <span className="text-stone-400 dark:text-stone-550 text-[10px] font-mono font-bold uppercase block">LIBRARY EXPEDITION</span>
            <strong className="text-neutral-900 dark:text-white text-lg font-extrabold">{myPurchasedBooks.length} E-Books</strong>
            <span className="text-[10px] text-stone-500 dark:text-stone-405 block mt-0.5">Purchased & Authorized</span>
          </div>
        </motion.div>

        {/* Badges unlocked */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/60 p-5 flex items-center space-x-4 shadow-xs"
        >
          <div className="rounded-full bg-amber-50 dark:bg-amber-955/30 p-4 text-amber-705 dark:text-amber-300 shrink-0">
            <Trophy className="h-6 w-6 fill-amber-400 dark:fill-amber-550" />
          </div>
          <div className="text-left">
            <span className="text-stone-400 dark:text-stone-550 text-[10px] font-mono font-bold uppercase block">ACHIEVEMENTS</span>
            <strong className="text-neutral-900 dark:text-white text-lg font-extrabold">{unlockedBadgeIds.length} / 5 Badges</strong>
            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold block mt-0.5">Unleashed and saved</span>
          </div>
        </motion.div>

        {/* Dynamic minute slider tracker */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/60 p-5 text-left flex flex-col justify-between md:col-span-1 shadow-sm"
        >
          <div>
            <div className="flex justify-between items-center text-[10px] font-mono font-bold text-stone-500 dark:text-stone-400 uppercase">
              <span>Goal Calibration</span>
              <span className="text-red-700 dark:text-red-400 font-extrabold text-sm">{dailyGoalMinutes} min</span>
            </div>
            
            <input
              type="range"
              min="10"
              max="120"
              step="5"
              value={dailyGoalMinutes}
              onChange={(e) => handleUpdateGoal(parseInt(e.target.value))}
              className="w-full h-1.5 bg-neutral-150 dark:bg-stone-800 rounded-lg accent-blue-600 cursor-pointer mt-3"
            />
            <span className="text-[9px] text-stone-400 dark:text-stone-500 block mt-2 font-mono leading-tight">Drag to calibrate your target reading minutes today.</span>
          </div>

          <div className="border-t border-stone-150 dark:border-stone-800 pt-3.5 mt-3 space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono uppercase block">Logged Today:</span>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">{loggedMinutes}</span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold font-mono">minutes total</span>
            </div>
          </div>
        </motion.div>

        {/* Beautiful high-contrast visual progress bar card spanning wider layouts */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/60 p-5 text-left flex flex-col justify-between md:col-span-1 shadow-sm"
        >
          <div>
            <div className="flex justify-between items-center text-[10px] font-mono font-bold text-stone-500 dark:text-stone-405 uppercase mb-2">
              <span>Progress Status</span>
              <span className="text-blue-600 dark:text-blue-400 font-black font-mono text-xs">{Math.min(100, Math.round((loggedMinutes / dailyGoalMinutes) * 100))}%</span>
            </div>

            {/* Visual progress bar with filling gradient */}
            <div className="w-full h-5 bg-slate-100 dark:bg-stone-950 rounded-lg overflow-hidden border border-slate-250 dark:border-stone-800 relative">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-500 ease-out flex items-center justify-end pr-2 text-[9px] font-bold text-white font-mono"
                style={{ width: `${Math.min(100, Math.round((loggedMinutes / dailyGoalMinutes) * 100))}%` }}
              >
                {Math.round((loggedMinutes / dailyGoalMinutes) * 100) >= 12 && (
                  <span>{loggedMinutes}m / {dailyGoalMinutes}m</span>
                )}
              </div>
            </div>

            {/* Dynamic context motivator statement block */}
            <div className="mt-3 text-[10px] text-slate-500 dark:text-stone-400 leading-normal font-sans italic">
              {loggedMinutes === 0 && "🌱 Starting your daily study! Log some minutes below."}
              {loggedMinutes > 0 && loggedMinutes < dailyGoalMinutes * 0.5 && "📖 You've made standard starts! Keep the momentum heading high."}
              {loggedMinutes >= dailyGoalMinutes * 0.5 && loggedMinutes < dailyGoalMinutes && "🚀 Over the halfway milestone! Almost there."}
              {loggedMinutes >= dailyGoalMinutes && "🏆 Target achieved! Exceptional study discipline today. Streak protected!"}
            </div>
          </div>

          <div className="border-t border-stone-150 dark:border-stone-800 pt-3 mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleLogMinutes(10)}
                className="bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-[10px] font-black px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 transition cursor-pointer"
              >
                +10 min
              </button>
              <button
                type="button"
                onClick={() => handleLogMinutes(25)}
                className="bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-[10px] font-black px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 transition cursor-pointer"
              >
                +25 min
              </button>
              <button
                type="button"
                onClick={() => handleLogMinutes(50)}
                className="bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 text-[10px] font-black px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 transition cursor-pointer"
              >
                +50 min
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetMinutes}
              className="text-red-600 hover:text-red-750 dark:text-red-400 dark:hover:text-red-300 text-[9px] font-bold py-1 hover:underline font-mono cursor-pointer"
            >
              Reset
            </button>
          </div>
        </motion.div>
      </div>

      {/* Week Progress Recharts Analysis Section */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.3 }}
        className="rounded-2xl border border-stone-205 dark:border-stone-800 bg-white dark:bg-stone-900/60 p-6 text-left shadow-sm space-y-4"
      >
        <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-stone-100 dark:border-stone-850 pb-3 gap-2">
          <div>
            <h3 className="font-display text-xs font-black text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>Weekly Reading Performance Monitor</span>
            </h3>
            <p className="text-[10px] text-stone-400 font-mono mt-0.5">Analytic visualizer: minutes achieved vs daily goal</p>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono font-bold">
            <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
              <span className="h-2 w-2 rounded-full bg-indigo-650" />
              Minutes Achieved
            </span>
            <span className="flex items-center gap-1 text-red-500">
              <span className="h-2 w-2 rounded-full bg-red-550" />
              Daily target Goal
            </span>
          </div>
        </div>

        <div className="h-64 sm:h-72 w-full pr-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={mockWeekData}
              margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#4b5563', fontSize: 10, fontWeight: 700 }} 
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <YAxis 
                tick={{ fill: '#4b5563', fontSize: 10, fontWeight: 700 }} 
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  borderRadius: '12px', 
                  border: '1px solid #e2e8f0',
                  color: '#1e293b',
                  fontSize: '11px',
                  fontWeight: 700
                }}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 700 }} />
              <Bar dataKey="MinutesRead" name="Minutes Achieved" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Goal" name="Goal target" fill="#ef4444" radius={[4, 4, 0, 0]} opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Academy Academic Progress & Topic Exam Scores Recharts Section */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.32 }}
        className="rounded-2xl border border-stone-205 dark:border-stone-800 bg-white dark:bg-stone-900/60 p-6 text-left shadow-sm space-y-4"
        id="academy_scores_recharts_section"
      >
        <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-stone-100 dark:border-stone-850 pb-3 gap-2">
          <div>
            <h3 className="font-display text-xs font-black text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-amber-500 animate-pulse" />
              <span>Syllabus Completion & Exam Scores Monitor</span>
            </h3>
            <p className="text-[10px] text-stone-400 font-mono mt-0.5">Academic tracking: syllabus completion vs exam achievements</p>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono font-bold">
            <span className="flex items-center gap-1 text-[#10b981] dark:text-[#34d399]">
              <span className="h-2 w-2 rounded-full bg-[#10b981]" />
              Syllabus Completed (%)
            </span>
            <span className="flex items-center gap-1 text-[#b91c1c] dark:text-rose-450">
              <span className="h-2 w-2 rounded-full bg-[#b91c1c]" />
              Exam Score (%)
            </span>
          </div>
        </div>

        <div className="h-68 sm:h-76 w-full pr-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={syllabusProgress}
              margin={{ top: 15, right: 10, left: -20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#4b5563', fontSize: 9, fontWeight: 700 }} 
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <YAxis 
                tick={{ fill: '#4b5563', fontSize: 10, fontWeight: 700 }} 
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  borderRadius: '12px', 
                  border: '1px solid #e2e8f0',
                  color: '#1e293b',
                  fontSize: '11px',
                  fontWeight: 700
                }}
                formatter={(value: any, name: any, props: any) => {
                  return [`${value}%`, name === "Score" ? "Highest Score" : "Topic Completed"];
                }}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 700 }} />
              <Bar dataKey="Completed" name="Syllabus Progress" fill="#10b981" radius={[4, 4, 0, 0]} opacity={0.7} />
              <Bar dataKey="Score" name="Exam Scores" fill="#b91c1c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Past Month Recharts Line Analysis Section */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.35 }}
        className="rounded-2xl border border-stone-205 dark:border-stone-800 bg-white dark:bg-stone-900/60 p-6 text-left shadow-sm space-y-4"
        id="monthly_reading_performance_section"
      >
        <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-stone-100 dark:border-stone-850 pb-3 gap-2">
          <div>
            <h3 className="font-display text-xs font-black text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
              <Compass className="h-4 w-4 text-emerald-600 dark:text-emerald-450" />
              <span>Zion Digital • Monthly Reading Monitor</span>
            </h3>
            <p className="text-[10px] text-stone-400 font-mono mt-0.5">Line analysis: daily logged reading minutes over the past 30 days</p>
          </div>
          <div className="flex items-center gap-4 text-[10.5px] font-mono font-bold">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Logged Reading Minutes
            </span>
            <span className="text-[10px] text-stone-300">|</span>
            <span className="text-stone-500 dark:text-stone-400 font-bold bg-neutral-100 dark:bg-stone-800 px-2 py-0.5 rounded">
              30-Day Period
            </span>
          </div>
        </div>

        <div className="h-64 sm:h-72 w-full pr-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={monthlyLogs}
              margin={{ top: 15, right: 15, left: -20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} vertical={false} />
              <XAxis 
                dataKey="label" 
                tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }} 
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <YAxis 
                tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }} 
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  borderRadius: '12px', 
                  border: '1px solid #e2e8f0',
                  color: '#0f172a',
                  fontSize: '11px',
                  fontWeight: 700,
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
                labelStyle={{ fontWeight: 'bold', color: '#10b981' }}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 700, display: 'none' }} />
              <Line 
                type="monotone" 
                dataKey="minutes" 
                name="Minutes Read" 
                stroke="#10b981" 
                strokeWidth={3} 
                dot={{ r: 2, fill: '#10b981', strokeWidth: 1 }} 
                activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-12 text-xs">
        {/* Left Library Purchases Area */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Purchased Books */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
            <div className="border-b border-stone-100 pb-3 flex justify-between items-center text-left">
              <div>
                <h3 className="font-display text-lg font-bold text-stone-900">My Purchased Library</h3>
                <p className="text-[10px] text-stone-400 font-mono">Download bought publications anytime</p>
              </div>
              <span className="rounded-full bg-stone-100 text-stone-850 font-bold px-2.5 py-0.5 text-[10px] uppercase font-mono">
                {myPurchasedBooks.length} Purchases
              </span>
            </div>

            {myPurchasedBooks.length === 0 ? (
              <div className="py-12 text-center rounded-xl bg-neutral-50 border border-stone-100 flex flex-col items-center justify-center">
                <span className="text-3xl">📚</span>
                <p className="text-xs text-stone-500 mt-2 font-bold">No books purchased yet</p>
                <p className="text-[10.5px] text-stone-400 mt-1 max-w-xs leading-relaxed">
                  Browse Kelvin Opara Wafula's active store shelf to enroll and buy premium literature books!
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {myPurchasedBooks.map((b) => (
                  <div key={b.id} className="rounded-xl border border-stone-150 dark:border-stone-800 p-3.5 flex items-start space-x-3.5 bg-neutral-50 dark:bg-stone-900/40">
                    <div className="w-16 h-20 rounded shadow border shrink-0 overflow-hidden bg-white flex items-center justify-center">
                      <img src={b.coverImage} className="w-full h-full object-contain" alt="Cover" />
                    </div>
                    
                    <div className="flex-1 min-w-0 text-left space-y-1">
                      <h4 className="font-bold text-stone-850 dark:text-stone-100 truncate">{b.title}</h4>
                      <p className="text-[10px] text-stone-400 dark:text-stone-500 font-mono">Author: {b.author}</p>
                      
                      {/* Visual Progress Indicator */}
                      {(() => {
                        const progress = getBookProgress(b.id, b.pages);
                        const lastPage = getBookLastReadPage(b.id);
                        return (
                          <div className="py-1">
                            <div className="flex justify-between items-center text-[9px] font-mono leading-none mb-1">
                              <span className="text-stone-400 dark:text-stone-500 font-bold">Progress</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{progress}% (P. {lastPage}/{b.pages})</span>
                            </div>
                            <div className="w-full h-1.5 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300" 
                                style={{ width: `${progress || 4}%` }}
                              />
                            </div>
                          </div>
                        );
                      })()}
                      
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          onClick={() => {
                            const fileTitle = b.title.toLowerCase().replace(/\s+/g, "_");
                            const fakeContent = `Wafula Digital Books Library\nTitle: ${b.title}\nAuthor: ${b.author}\nDRM Verified License: ${currentUser?.email || "Licensed Member"}\n\nEnjoy offline reading values!`;
                            const element = document.createElement("a");
                            const file = new Blob([fakeContent], { type: 'text/plain' });
                            element.href = URL.createObjectURL(file);
                            element.download = `${b.pdfUrl ? "Uploaded_Book_" : ""}${fileTitle}.pdf`;
                            document.body.appendChild(element);
                            element.click();
                            document.body.removeChild(element);
                            alert(`🎉 Success! Downloading "${b.title}.pdf" (${b.fileSize}) securely to your device.`);
                          }}
                          className="rounded bg-red-700 hover:bg-red-800 text-white font-semibold py-1.5 px-3 text-[10px] transition flex items-center space-x-1 cursor-pointer"
                        >
                          <Download className="h-3 w-3" />
                          <span>Download PDF ({b.fileSize})</span>
                        </button>

                        <button
                          onClick={() => setReadingBook(b)}
                          className="rounded border border-stone-300 text-stone-700 bg-white font-semibold py-1.5 px-3 text-[10px] hover:bg-stone-50 transition flex items-center space-x-1 cursor-pointer"
                        >
                          <Eye className="h-3 w-3 text-red-700 shrink-0" />
                          <span>Read Online</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Wishlists */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
            <h3 className="font-display text-base font-bold text-neutral-950 border-b pb-2 text-left">My Active Wishlist</h3>

            {myWishlistedBooks.length === 0 ? (
              <p className="text-stone-400 py-4 text-center italic">No items marked on your wishlist yet.</p>
            ) : (
              <div className="space-y-2.5">
                {myWishlistedBooks.map((b) => (
                  <div key={b.id} className="rounded-lg border border-stone-100 p-3 flex justify-between items-center bg-stone-50 text-left">
                    <div className="flex items-center space-x-2.5">
                      <span className="text-2xl">📖</span>
                      <div>
                        <strong className="text-stone-800 font-bold block text-xs">{b.title}</strong>
                        <span className="text-[10px] text-stone-450 font-mono">By {b.author} • KES {b.price.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => onRemoveWishlist(b.id)}
                        className="text-[11px] font-bold text-stone-405 hover:text-red-700 transition"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Gamification Badge list and Stats Ledger */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* BADGES METRICS SYSTEM */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="font-display text-base font-bold text-neutral-900 border-b pb-2 text-left flex items-center space-x-1.5">
              <Trophy className="h-5 w-5 text-amber-500 fill-amber-100" />
              <span>Unlocked Milestones</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {BADGES.map((bd) => {
                const isUnlocked = unlockedBadgeIds.includes(bd.id);
                return (
                  <div
                    key={bd.id}
                    title={bd.description}
                    className={`rounded-xl border p-3.5 flex flex-col items-center justify-center text-center transition ${
                      isUnlocked 
                        ? "border-amber-400 bg-amber-50 text-amber-950" 
                        : "border-stone-100 bg-[#fafafa]/80 opacity-55 saturate-50"
                    }`}
                  >
                    <span className="text-3xl mb-1.5">{bd.icon}</span>
                    <strong className="font-bold text-[10.5px] block truncate leading-tight w-full">{bd.name}</strong>
                    <span className="text-[9px] text-stone-400 block mt-0.5 font-mono">{isUnlocked ? "Unlocked" : "Locked"}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Core Member portfolio overview indexes */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs text-xs space-y-3.5 text-left">
            <h3 className="font-display font-bold text-neutral-950">Active Stats Ledger</h3>
            
            <div className="space-y-2 font-mono text-[10px] text-stone-500">
              <div className="flex justify-between">
                <span>Total Uploads:</span>
                <strong className="text-neutral-800">{myUploads.length}</strong>
              </div>
              <div className="flex justify-between">
                <span>Saved Documents:</span>
                <strong className="text-neutral-800">{savedDocuments.length}</strong>
              </div>
              <div className="flex justify-between">
                <span>Community Posts:</span>
                <strong className="text-neutral-800">{myMessagesCount}</strong>
              </div>
              <div className="flex justify-between">
                <span>User Role:</span>
                <strong className="text-neutral-800 capitalize">{currentUser.role}</strong>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* SECURE ONLINE BOOK DRM READER */}
      {readingBook && (
        <SecureBookReader
          book={readingBook}
          currentUser={currentUser}
          hasPaid={purchasedBookIds.includes(readingBook.id)}
          isAdmin={currentUser?.role === "admin"}
          onClose={() => setReadingBook(null)}
          onAddNewDocument={onAddNewDocument}
        />
      )}

    </div>
  );
}
