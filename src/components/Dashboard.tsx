import React, { useState, useEffect } from "react";
import { User, Book, Badge, SavedDocument, MemberUploadRequest, CommunityMessage } from "../types";
import { BADGES } from "../data";
import { Trophy, Compass, Star, Bookmark, Calendar, CheckSquare, Zap, Clock, BookOpen, Trash2, ShieldCheck, Download, Eye } from "lucide-react";
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
}

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
  onRemoveWishlist
}: DashboardProps) {
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(30);
  const [userStreak, setUserStreak] = useState(5);
  const [loggedMinutes, setLoggedMinutes] = useState(15);
  const [readingBook, setReadingBook] = useState<Book | null>(null);

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
  };

  const handleResetMinutes = () => {
    setLoggedMinutes(0);
    localStorage.setItem("WAFULA_LOGGED_MINUTES_TODAY", "0");
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
        <div className="rounded-2xl border border-stone-200 bg-white p-5 flex items-center space-x-4">
          <div className="rounded-full bg-red-50 p-4 text-red-750">
            <Zap className="h-6 w-6 animate-pulse fill-red-600" />
          </div>
          <div className="text-left">
            <span className="text-stone-400 text-[10px] font-mono font-bold uppercase block">STREAK GOAL</span>
            <strong className="text-neutral-900 text-lg font-extrabold">{userStreak} Days Active</strong>
            <span className="text-[10px] text-green-700 font-bold block mt-0.5">🔥 High Performance</span>
          </div>
        </div>

        {/* Ebooks owned */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 flex items-center space-x-4">
          <div className="rounded-full bg-stone-50 p-4 text-stone-750">
            <BookOpen className="h-6 w-6" />
          </div>
          <div className="text-left">
            <span className="text-stone-400 text-[10px] font-mono font-bold uppercase block">LIBRARY EXPEDITION</span>
            <strong className="text-neutral-900 text-lg font-extrabold">{myPurchasedBooks.length} E-Books</strong>
            <span className="text-[10px] text-stone-500 block mt-0.5">Purchased & Authorized</span>
          </div>
        </div>

        {/* Badges unlocked */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 flex items-center space-x-4">
          <div className="rounded-full bg-amber-50 p-4 text-amber-705">
            <Trophy className="h-6 w-6 fill-amber-400" />
          </div>
          <div className="text-left">
            <span className="text-stone-400 text-[10px] font-mono font-bold uppercase block">ACHIEVEMENTS</span>
            <strong className="text-neutral-900 text-lg font-extrabold">{unlockedBadgeIds.length} / 5 Badges</strong>
            <span className="text-[10px] text-amber-700 font-bold block mt-0.5">Unleashed and saved</span>
          </div>
        </div>

        {/* Dynamic minute slider tracker */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 text-left flex flex-col justify-between md:col-span-1 shadow-sm">
          <div>
            <div className="flex justify-between items-center text-[10px] font-mono font-bold text-stone-500 uppercase">
              <span>Goal Calibration</span>
              <span className="text-red-700 font-extrabold text-sm">{dailyGoalMinutes} min</span>
            </div>
            
            <input
              type="range"
              min="10"
              max="120"
              step="5"
              value={dailyGoalMinutes}
              onChange={(e) => handleUpdateGoal(parseInt(e.target.value))}
              className="w-full h-1.5 bg-neutral-150 rounded-lg accent-blue-600 cursor-pointer mt-3"
            />
            <span className="text-[9px] text-stone-400 block mt-2 font-mono leading-tight">Drag to calibrate your target reading minutes today.</span>
          </div>

          <div className="border-t pt-3.5 mt-3 space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 font-mono uppercase block">Logged Today:</span>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-black font-mono text-slate-900">{loggedMinutes}</span>
              <span className="text-[11px] text-slate-400 font-semibold font-mono">minutes total</span>
            </div>
          </div>
        </div>

        {/* Beautiful high-contrast visual progress bar card spanning wider layouts */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 text-left flex flex-col justify-between md:col-span-1 shadow-sm">
          <div>
            <div className="flex justify-between items-center text-[10px] font-mono font-bold text-stone-500 uppercase mb-2">
              <span>Progress Status</span>
              <span className="text-blue-600 font-black font-mono text-xs">{Math.min(100, Math.round((loggedMinutes / dailyGoalMinutes) * 100))}%</span>
            </div>

            {/* Visual progress bar with filling gradient */}
            <div className="w-full h-5 bg-slate-100 rounded-lg overflow-hidden border border-slate-250 relative">
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
            <div className="mt-3 text-[10px] text-slate-500 leading-normal font-sans italic">
              {loggedMinutes === 0 && "🌱 Starting your daily study! Log some minutes below."}
              {loggedMinutes > 0 && loggedMinutes < dailyGoalMinutes * 0.5 && "📖 You've made standard starts! Keep the momentum heading high."}
              {loggedMinutes >= dailyGoalMinutes * 0.5 && loggedMinutes < dailyGoalMinutes && "🚀 Over the halfway milestone! Almost there."}
              {loggedMinutes >= dailyGoalMinutes && "🏆 Target achieved! Exceptional study discipline today. Streak protected!"}
            </div>
          </div>

          <div className="border-t pt-3 mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleLogMinutes(10)}
                className="bg-stone-50 hover:bg-stone-100 text-stone-800 text-[10px] font-black px-2.5 py-1 rounded-lg border border-stone-200 transition"
              >
                +10 min
              </button>
              <button
                type="button"
                onClick={() => handleLogMinutes(25)}
                className="bg-stone-50 hover:bg-stone-100 text-stone-800 text-[10px] font-black px-2.5 py-1 rounded-lg border border-stone-200 transition"
              >
                +25 min
              </button>
              <button
                type="button"
                onClick={() => handleLogMinutes(50)}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-black px-2.5 py-1 rounded-lg border border-blue-200 transition"
              >
                +50 min
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetMinutes}
              className="text-red-600 hover:text-red-750 text-[9px] font-bold py-1 hover:underline font-mono"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

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
                  <div key={b.id} className="rounded-xl border border-stone-150 p-3.5 flex items-start space-x-3.5 bg-neutral-50">
                    <img src={b.coverImage} className="w-16 h-20 rounded object-cover shadow border shrink-0" alt="Cover" />
                    
                    <div className="flex-1 min-w-0 text-left space-y-1">
                      <h4 className="font-bold text-stone-850 truncate">{b.title}</h4>
                      <p className="text-[10px] text-stone-400 font-mono">Author: {b.author}</p>
                      
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
        />
      )}

    </div>
  );
}
