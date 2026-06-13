import React, { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Megaphone, Trash2, ShieldCheck, Send, Calendar, Clock, Pin, Sparkles, CheckCircle } from "lucide-react";
import { User } from "../types";

interface AnnouncementsProps {
  currentUser: User | null;
  onUpdateBroadcastAnnouncement: (msg: string) => void;
  isOnline: boolean;
}

interface AnnouncementItem {
  id: string;
  text: string;
  title?: string;
  date: string;
  time: string;
  author: string;
  category?: "academic" | "financial" | "technical" | "general" | "important";
  isSticky?: boolean;
}

export default function Announcements({
  currentUser,
  onUpdateBroadcastAnnouncement,
  isOnline
}: AnnouncementsProps) {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [category, setCategory] = useState<"academic" | "financial" | "technical" | "general" | "important">("general");
  const [pinAsBanner, setPinAsBanner] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = !!(currentUser && (
    currentUser.role === 'admin' || 
    currentUser.email?.toLowerCase()?.trim() === 'wafulak435@gmail.com' || 
    currentUser.email?.toLowerCase()?.trim() === 'wafula435@gmail.com'
  ));

  // Sync announcements from Firestore in real-time
  useEffect(() => {
    // Attempt local storage cache restoration
    const cached = localStorage.getItem("WAFULA_ANNOUNCEMENTS_FEED");
    if (cached) {
      try {
        setAnnouncements(JSON.parse(cached));
        setLoading(false);
      } catch (_) {}
    }

    if (!isOnline) {
      setLoading(false);
      return;
    }

    try {
      const q = query(collection(db, "announcements"), orderBy("timestamp", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items: AnnouncementItem[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() } as AnnouncementItem);
        });
        setAnnouncements(items);
        localStorage.setItem("WAFULA_ANNOUNCEMENTS_FEED", JSON.stringify(items));
        setLoading(false);
      }, (err) => {
        console.warn("Announcements Firestore permission issue or offline.");
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Failed initializing announcements listener:", e);
      setLoading(false);
    }
  }, [isOnline]);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      alert("Please provide the announcement message content!");
      return;
    }

    setSubmitting(true);
    const dateObj = new Date();
    const formattedDate = dateObj.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const formattedTime = dateObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

    const newAnnouncement = {
      title: title.trim() || `${category.toUpperCase()} Notice`,
      text: text.trim(),
      category,
      date: formattedDate,
      time: formattedTime,
      author: currentUser?.name || "Chancellor Kelvin Wafula",
      isSticky: pinAsBanner,
      timestamp: dateObj.toISOString()
    };

    try {
      if (isOnline) {
        await addDoc(collection(db, "announcements"), newAnnouncement);
      } else {
        // Mock offline fallback insertion
        const dummyId = "ann_" + Date.now();
        const updated = [{ id: dummyId, ...newAnnouncement }, ...announcements];
        setAnnouncements(updated);
        localStorage.setItem("WAFULA_ANNOUNCEMENTS_FEED", JSON.stringify(updated));
      }

      // If pin as banner is checked, update the site-wide broadcast banner instantly
      if (pinAsBanner) {
        onUpdateBroadcastAnnouncement(text.trim());
      }

      // Reset form variables
      setTitle("");
      setText("");
      setCategory("general");
      alert("✅ Announcement published successfully and synced to all active users!");
    } catch (err: any) {
      alert("Failed publishing announcement: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;

    try {
      if (isOnline) {
        await deleteDoc(doc(db, "announcements", id));
      } else {
        const updated = announcements.filter(a => a.id !== id);
        setAnnouncements(updated);
        localStorage.setItem("WAFULA_ANNOUNCEMENTS_FEED", JSON.stringify(updated));
      }
      alert("Announcement deleted successfully.");
    } catch (err: any) {
      alert("Could not remove document: " + err.message);
    }
  };

  const getCategoryColor = (cat?: string) => {
    switch (cat) {
      case "academic": return "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900";
      case "financial": return "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900";
      case "technical": return "bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900";
      case "important": return "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900 animate-pulse";
      default: return "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 text-left selection:bg-rose-100">
      
      {/* HEADER ACTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-stone-200 dark:border-stone-800 gap-4">
        <div className="space-y-1">
          <h2 className="text-xl md:text-2xl font-display font-black text-stone-900 dark:text-white flex items-center space-x-2.5">
            <Megaphone className="h-6 w-6 text-rose-600 animate-pulse shrink-0" />
            <span>Chancellery Announcements & Notices</span>
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 font-sans leading-relaxed">
            Stay aligned with campus programs, spiritual circulars, theological schedules, and bookstore advisories.
          </p>
        </div>
        <div className="flex items-center space-x-2.5 text-xs font-semibold text-stone-505 shrink-0 select-none">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`} />
          <span className="text-stone-700 dark:text-stone-300">
            {isOnline ? "Broadcasting Real-time Sync" : "Cached Offline Mode"}
          </span>
        </div>
      </div>

      {/* COMPOSER FORM FOR THE ADMINISTRATOR */}
      {isAdmin && (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/15 dark:bg-rose-950/5 p-5 md:p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-rose-150 dark:border-rose-900/20 pb-3">
            <ShieldCheck className="h-5 w-5 text-rose-600 shrink-0" />
            <h3 className="font-display text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Publish Official Advisory (Admin Workspace)
            </h3>
          </div>

          <form onSubmit={handlePublish} className="grid gap-4 sm:grid-cols-2 text-xs">
            <div className="space-y-1 sm:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 font-mono">Bulletin Heading / Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Cohort-V Theological Seminar Timetable"
                className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 px-3.5 py-2.5 font-bold outline-none text-stone-900 dark:text-white focus:border-rose-500 transition"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 font-mono">Notice Classification Area</label>
              <select
                value={category}
                onChange={(e: any) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 px-3 py-2.5 outline-none font-sans font-bold text-stone-800 dark:text-stone-200 cursor-pointer focus:border-rose-500"
              >
                <option value="general">📢 General Bulletin</option>
                <option value="important">🚨 Important Advisory</option>
                <option value="academic">🎓 Academic Curriculum</option>
                <option value="financial">💰 Financial & Book Store</option>
                <option value="technical">💻 Server & System Core</option>
              </select>
            </div>

            <div className="flex items-center pt-5 pl-1.5 select-none">
              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pinAsBanner}
                  onChange={(e) => setPinAsBanner(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-stone-300 text-rose-700 focus:ring-rose-500 cursor-pointer"
                />
                <span className="font-bold text-stone-800 dark:text-stone-200">Pin as primary Site-Wide Sticky Warning Banner</span>
              </label>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 font-mono">Notice Body Narrative</label>
              <textarea
                required
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Compose full theological warnings, seminar circulars, or high-speed system maintenance schedules here..."
                className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 p-3.5 font-medium outline-none text-stone-900 dark:text-white focus:border-rose-500 transition leading-relaxed"
              />
            </div>

            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-mono font-black uppercase text-[10px] tracking-wider px-5 py-3 shadow transition-all active:scale-95 flex items-center space-x-2 border border-rose-600 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{submitting ? "Publishing Notice..." : "Publish Official Notice"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FEED SECTIONS */}
      <main className="space-y-4">
        {loading ? (
          <div className="text-center py-12 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-900 rounded-2xl flex flex-col items-center justify-center">
            <span className="h-8 w-8 rounded-full border-4 border-rose-200 border-t-rose-700 animate-spin block mb-3" />
            <p className="text-xs font-mono font-bold text-stone-500">Retrieving official campus directives list...</p>
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-900 rounded-2xl">
            <span className="text-3xl">📭</span>
            <h4 className="font-display font-black text-stone-800 dark:text-stone-200 mt-2 text-sm uppercase tracking-wide">No Announcements Active</h4>
            <p className="text-xs text-stone-405 dark:text-stone-500 max-w-sm mx-auto leading-relaxed mt-1">
              There are currently no circulars or notices released by Chancellor Kelvin Wafula on this bulletin at this moment. Let's check back soon!
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {announcements.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-stone-200 dark:border-stone-850 bg-white dark:bg-stone-950 p-5 shadow-xs hover:shadow transition duration-200 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Category Badge header */}
                  <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-900 pb-2.5">
                    <span className={`text-[8.5px] font-mono font-black uppercase tracking-widest px-2.5 py-1 rounded border ${getCategoryColor(item.category)}`}>
                      {item.category || "general"} Notice
                    </span>
                    <div className="flex items-center space-x-1 text-[10px] text-stone-400 font-mono font-bold">
                      <Calendar className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                      <span>{item.date}</span>
                    </div>
                  </div>

                  {/* Message Title */}
                  <div className="space-y-1">
                    <h4 className="font-display text-sm font-black text-slate-900 dark:text-white flex items-center space-x-1.5">
                      {item.isSticky && (
                        <Pin className="h-3.5 w-3.5 text-rose-600 rotate-45 shrink-0" title="Sticky Live Warning Banner" />
                      )}
                      <span>{item.title || "Campus Bulletin Notice"}</span>
                    </h4>
                    <p className="text-xs text-stone-705 dark:text-stone-305 font-sans leading-relaxed whitespace-pre-wrap">
                      {item.text}
                    </p>
                  </div>
                </div>

                {/* Footer credit information card */}
                <div className="flex items-center justify-between pt-4 border-t border-stone-100 dark:border-stone-900 mt-4 select-none">
                  <div className="flex items-center space-x-1.5 text-[9px] text-stone-400 font-mono font-bold">
                    <Clock className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                    <span>{item.time || "12:00 AM"} • By {item.author.split(" ")[0]}</span>
                  </div>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="text-stone-450 hover:text-red-700 bg-stone-50 dark:bg-stone-900 hover:bg-rose-50 dark:hover:bg-rose-950/20 px-2 py-1 rounded-md text-[9px] font-bold border border-stone-200 dark:border-stone-800 hover:border-rose-200 dark:hover:border-rose-900 transition flex items-center space-x-1 cursor-pointer"
                      title="Permanently remove notification"
                    >
                      <Trash2 className="h-3 w-3 text-red-500 shrink-0" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
