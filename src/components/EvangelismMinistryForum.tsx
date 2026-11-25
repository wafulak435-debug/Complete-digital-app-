import React, { useState, useEffect } from "react";
import {
  Flame, Cross, Heart, MessageSquare, Share2, Plus, MapPin,
  Users, CheckCircle2, Calendar, Sparkles, Send, UploadCloud,
  X, Filter, ThumbsUp, HelpCircle
} from "lucide-react";
import { User } from "../types";

interface EvangelismReport {
  id: string;
  authorName: string;
  authorRole: string;
  authorEmail: string;
  location: string;
  date: string;
  category: "Outreach Crusade" | "Testimony" | "Prayer Request" | "Mission Trip" | "Discipleship";
  title: string;
  narrative: string;
  soulsWonCount?: number;
  imageUrl?: string;
  prayersCount: number;
  comments: { id: string; authorName: string; text: string; date: string }[];
}

const DEFAULT_EVANGELISM_REPORTS: EvangelismReport[] = [
  {
    id: "evang_1",
    authorName: "Evangelist Kelvin Opara Wafula",
    authorRole: "Principal Evangelist & Founder",
    authorEmail: "wafulak435@gmail.com",
    location: "Kanduyi Market & Bungoma Town Center",
    date: "2026-03-12",
    category: "Outreach Crusade",
    title: "Open-Air Gospel Outreach in Bungoma: 48 Decisions for Christ",
    narrative: "Praise God! The Zion Digital leadership and ministry team held a powerful open-air Gospel proclamation in Kanduyi. Many youths gave their lives to Jesus Christ and were enrolled into the local discipleship cohort and Bible reading plans.",
    soulsWonCount: 48,
    imageUrl: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=80",
    prayersCount: 34,
    comments: [
      {
        id: "c_1",
        authorName: "Pastor Samuel Barasa",
        text: "Hallelujah! The harvest in Western Kenya is ripe. We are following up with the new converts in Kanduyi.",
        date: "2026-03-12",
      },
    ],
  },
  {
    id: "evang_2",
    authorName: "Sister Grace Achieng",
    authorRole: "Evangelism Fellow",
    authorEmail: "grace.achieng@ziondigital.co.ke",
    location: "Webuye Regional Hospital Outreach",
    date: "2026-03-10",
    category: "Testimony",
    title: "Healing Testimony & Hospital Ward Ministry",
    narrative: "During our hospital ministry visitation, we prayed for 14 patients. Three mothers experiencing chronic pain testified of immediate peace and received Christ as their Lord and Savior. God is moving in Webuye!",
    soulsWonCount: 7,
    imageUrl: "https://images.unsplash.com/photo-1543807535-eceef0bc6599?auto=format&fit=crop&w=1200&q=80",
    prayersCount: 22,
    comments: [],
  },
  {
    id: "evang_3",
    authorName: "Bro. John Wekesa",
    authorRole: "Youth Ministry Coordinator",
    authorEmail: "john.wekesa@ziondigital.co.ke",
    location: "Chwele High Schools Outreach",
    date: "2026-03-08",
    category: "Mission Trip",
    title: "Upcoming High School Christian Union Mission & Mentorship",
    narrative: "We are organizing a 3-day mission trip to high schools in Chwele to distribute 500 free Christian leadership and devotional books. We invite volunteers, intercessors, and student evangelists to join.",
    soulsWonCount: 0,
    prayersCount: 19,
    comments: [],
  },
];

interface EvangelismMinistryForumProps {
  currentUser: User | null;
  onLogIn?: () => void;
  onNavigate?: (view: string) => void;
}

export default function EvangelismMinistryForum({
  currentUser,
  onLogIn,
  onNavigate,
}: EvangelismMinistryForumProps) {
  const [reports, setReports] = useState<EvangelismReport[]>(() => {
    try {
      const raw = localStorage.getItem("ZION_EVANGELISM_REPORTS");
      return raw ? JSON.parse(raw) : DEFAULT_EVANGELISM_REPORTS;
    } catch {
      return DEFAULT_EVANGELISM_REPORTS;
    }
  });

  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);

  // Form states
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<EvangelismReport["category"]>("Outreach Crusade");
  const [formLocation, setFormLocation] = useState("Bungoma County, Western Kenya");
  const [formNarrative, setFormNarrative] = useState("");
  const [formSoulsWon, setFormSoulsWon] = useState("0");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const saveReports = (newList: EvangelismReport[]) => {
    setReports(newList);
    localStorage.setItem("ZION_EVANGELISM_REPORTS", JSON.stringify(newList));
  };

  const handlePrayForReport = (id: string) => {
    const updated = reports.map((r) => {
      if (r.id === id) {
        return { ...r, prayersCount: r.prayersCount + 1 };
      }
      return r;
    });
    saveReports(updated);
  };

  const handleAddComment = (reportId: string, e: React.FormEvent) => {
    e.preventDefault();
    const text = (commentInputs[reportId] || "").trim();
    if (!text) return;

    const newComment = {
      id: `c_${Date.now()}`,
      authorName: currentUser?.name || currentUser?.email?.split("@")[0] || "Fellow Believer",
      text,
      date: new Date().toLocaleDateString(),
    };

    const updated = reports.map((r) => {
      if (r.id === reportId) {
        return { ...r, comments: [...r.comments, newComment] };
      }
      return r;
    });
    saveReports(updated);
    setCommentInputs((prev) => ({ ...prev, [reportId]: "" }));
  };

  const handleCreateReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formNarrative) return;

    const newReport: EvangelismReport = {
      id: `evang_${Date.now()}`,
      authorName: currentUser?.name || currentUser?.email?.split("@")[0] || "Evangelist Member",
      authorRole: currentUser?.role === "admin" || currentUser?.role === "main_admin" ? "Principal Leader" : "Ministry Member",
      authorEmail: currentUser?.email || "member@ziondigital.co.ke",
      location: formLocation,
      date: new Date().toISOString().slice(0, 10),
      category: formCategory,
      title: formTitle,
      narrative: formNarrative,
      soulsWonCount: parseInt(formSoulsWon, 10) || 0,
      imageUrl: formImageUrl || undefined,
      prayersCount: 1,
      comments: [],
    };

    saveReports([newReport, ...reports]);
    setIsPostModalOpen(false);
    setFormTitle("");
    setFormNarrative("");
    setFormImageUrl("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setFormImageUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredReports = filterCategory === "All"
    ? reports
    : reports.filter((r) => r.category === filterCategory);

  const totalSoulsWon = reports.reduce((acc, r) => acc + (r.soulsWonCount || 0), 0);

  return (
    <div className="space-y-6 text-left">
      {/* 1. Header Banner */}
      <section className="rounded-3xl border border-stone-200 dark:border-slate-800 bg-gradient-to-r from-[#0B254D] via-[#851E3E] to-[#C53030] text-white p-6 sm:p-8 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5B82E] text-[#0B254D] text-xs font-mono font-bold uppercase tracking-wider shadow-xs">
              <Flame className="h-3.5 w-3.5" />
              <span>Zion Evangelism &amp; Ministry Forum &middot; The Great Commission</span>
            </div>

            <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
              Gospel Outreaches, Testimonies &amp; Missions
            </h2>

            <p className="text-xs sm:text-sm text-rose-100/90 leading-relaxed">
              Connect with fellow evangelists, pastors, and Christian leaders across Bungoma and Kenya. Publish field mission reports, celebrate souls saved, share testimonies, and rally intercessory prayer.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-mono">
              <span className="px-3 py-1 rounded-lg bg-white/10 border border-white/15 text-[#F5B82E] font-bold">
                🔥 {totalSoulsWon} Souls Recorded for Christ
              </span>
              <span className="px-3 py-1 rounded-lg bg-white/10 border border-white/15 text-white">
                {reports.length} Active Field Reports
              </span>
            </div>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setIsPostModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#F5B82E] hover:bg-[#E5A91E] text-[#0B254D] font-bold text-xs transition cursor-pointer shadow-md active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Share Testimony / Report</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Filter Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-stone-200 dark:border-slate-800 pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {["All", "Outreach Crusade", "Testimony", "Prayer Request", "Mission Trip"].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                filterCategory === cat
                  ? "bg-[#0B254D] text-white shadow-xs font-bold"
                  : "bg-stone-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-500 font-mono">
          Showing {filteredReports.length} reports
        </span>
      </div>

      {/* 3. Reports Feed */}
      <div className="space-y-5">
        {filteredReports.map((report) => (
          <article
            key={report.id}
            className="rounded-3xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-7 space-y-4 shadow-sm"
          >
            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-[#0B254D] to-[#155EEF] text-white font-bold flex items-center justify-center text-sm shadow-xs">
                  {report.authorName[0]}
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-[#0B254D] dark:text-white">
                    {report.authorName}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {report.authorRole} &middot; {report.date}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[10px] font-bold font-mono border border-rose-200 dark:border-rose-900/40 uppercase">
                  {report.category}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                  <MapPin className="h-3.5 w-3.5 text-[#F5B82E]" />
                  <span>{report.location}</span>
                </span>
              </div>
            </div>

            {/* Title & Narrative */}
            <div className="space-y-2">
              <h3 className="font-display text-lg sm:text-xl font-bold text-[#0B254D] dark:text-white leading-tight">
                {report.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {report.narrative}
              </p>
            </div>

            {/* Souls won highlight */}
            {report.soulsWonCount && report.soulsWonCount > 0 ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 text-xs font-bold font-mono">
                <Flame className="h-4 w-4 text-rose-600" />
                <span>{report.soulsWonCount} Souls Committed to Jesus Christ</span>
              </div>
            ) : null}

            {/* Attached Photo */}
            {report.imageUrl && (
              <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-slate-950 border border-stone-200 dark:border-slate-800 shadow-inner">
                <img
                  src={report.imageUrl}
                  alt={report.title}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            {/* Actions: Pray for this / Praise God */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-100 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => handlePrayForReport(report.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 font-bold transition cursor-pointer border border-rose-200 dark:border-rose-900/40 active:scale-95"
              >
                <Heart className="h-4 w-4 fill-current text-rose-600" />
                <span>Prayed &amp; Supported ({report.prayersCount})</span>
              </button>

              <span className="text-slate-400 font-mono text-[11px]">
                {report.comments.length} Discussion replies
              </span>
            </div>

            {/* Comments thread */}
            {report.comments.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-slate-800">
                {report.comments.map((c) => (
                  <div key={c.id} className="p-2.5 rounded-xl bg-stone-50 dark:bg-slate-800/60 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className="font-bold text-[#0B254D] dark:text-white">{c.authorName}</span>
                      <span>{c.date}</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300">{c.text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Add comment input */}
            <form onSubmit={(e) => handleAddComment(report.id, e)} className="flex gap-2 pt-2">
              <input
                type="text"
                value={commentInputs[report.id] || ""}
                onChange={(e) =>
                  setCommentInputs((prev) => ({ ...prev, [report.id]: e.target.value }))
                }
                placeholder="Share an encouraging comment or fellowship note..."
                className="flex-1 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-white outline-none focus:border-[#155EEF]"
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-xl bg-[#0B254D] hover:bg-[#155EEF] text-white text-xs font-bold transition cursor-pointer"
              >
                Reply
              </button>
            </form>
          </article>
        ))}
      </div>

      {/* 4. Create Report Modal */}
      {isPostModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="relative max-w-xl w-full bg-white dark:bg-[#07142B] border border-stone-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 bg-stone-50 dark:bg-slate-900 border-b border-stone-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-[#0B254D] dark:text-white flex items-center gap-2">
                  <Flame className="h-5 w-5 text-rose-600" />
                  <span>Publish Field Report / Testimony</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Share kingdom progress, missions, and crusade testimonies with the community.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPostModalOpen(false)}
                className="h-8 w-8 rounded-full bg-stone-200 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-white hover:bg-red-700 hover:text-white transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateReport} className="p-6 space-y-4 overflow-y-auto text-xs">
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                  Testimony / Outreach Title *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Kanduyi Youth Crusade: 25 Decisions for Christ"
                  className="w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e: any) => setFormCategory(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 px-3 py-2 text-xs"
                  >
                    <option value="Outreach Crusade">Outreach Crusade</option>
                    <option value="Testimony">Testimony</option>
                    <option value="Prayer Request">Prayer Request</option>
                    <option value="Mission Trip">Mission Trip</option>
                    <option value="Discipleship">Discipleship</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                    Location / Region
                  </label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g. Kanduyi Hub, Bungoma"
                    className="w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                    Souls Committed to Christ (if applicable)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formSoulsWon}
                    onChange={(e) => setFormSoulsWon(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 px-3 py-2 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                    Attach Photo (URL or File)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      placeholder="https://..."
                      className="flex-1 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 px-3 py-2 text-xs"
                    />
                    <label className="px-3 py-2 rounded-xl bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 text-xs font-semibold cursor-pointer inline-flex items-center gap-1 shrink-0">
                      <UploadCloud className="h-4 w-4 text-rose-600" />
                      <span>Upload</span>
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                  Ministry Narrative &amp; Details *
                </label>
                <textarea
                  rows={4}
                  required
                  value={formNarrative}
                  onChange={(e) => setFormNarrative(e.target.value)}
                  placeholder="Share what happened during the outreach, how lives were transformed, and prayer points..."
                  className="w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 px-3 py-2 text-xs leading-relaxed"
                />
              </div>

              <div className="pt-3 border-t border-stone-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPostModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 dark:border-slate-700 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  Publish Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
