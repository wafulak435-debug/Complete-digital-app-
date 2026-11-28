import React, { useState, useEffect } from "react";
import {
  Flame, Cross, Heart, MessageSquare, Share2, Plus, MapPin,
  Users, CheckCircle2, Calendar, Sparkles, Send, UploadCloud,
  X, Filter, ThumbsUp, HelpCircle, Video, Radio, Phone,
  CreditCard, ShieldCheck, ArrowRight, Clock, Award, FileText,
  Check, ExternalLink, ChevronRight, BookOpen, Search, Bookmark, BookmarkCheck, Volume2, Play, Pause
} from "lucide-react";
import { User, Book } from "../types";
import { secureApiFetch } from "../lib/aiClient";

export interface CrusadeEvent {
  id: string;
  title: string;
  theme: string;
  type: "Physical Crusade" | "Online Crusade" | "Online Google Meeting & Training";
  venue: string;
  date: string;
  time: string;
  speakers: string[];
  streamUrl?: string;
  expectedAttendance: number;
  rsvpsCount: number;
  description: string;
  status: "upcoming" | "live" | "completed";
}

export interface MinistryTestimony {
  id: string;
  authorName: string;
  authorLocation: string;
  date: string;
  category: "Salvation" | "Healing" | "Deliverance" | "Prayer Answer" | "Life Transformation";
  title: string;
  narrative: string;
  imageUrl?: string;
  prayersCount: number;
  comments: { id: string; authorName: string; text: string; date: string }[];
}

export interface MediaItem {
  id: string;
  title: string;
  type: "Video Sermon" | "Worship Song" | "Evangelism Photo" | "Inspiration Graphic";
  url: string;
  thumbnailUrl: string;
  author: string;
  date: string;
  description: string;
}

export interface SharedConnectionLink {
  id: string;
  authorName: string;
  title: string;
  url: string;
  category: "WhatsApp Group" | "WhatsApp Page" | "Facebook Page" | "Ministry Website" | "Google Meet Room";
  date: string;
}

const ALL_66_BIBLES = [
  { name: "Genesis", chapters: 50, testament: "Old" },
  { name: "Exodus", chapters: 40, testament: "Old" },
  { name: "Leviticus", chapters: 27, testament: "Old" },
  { name: "Numbers", chapters: 36, testament: "Old" },
  { name: "Deuteronomy", chapters: 34, testament: "Old" },
  { name: "Joshua", chapters: 24, testament: "Old" },
  { name: "Judges", chapters: 21, testament: "Old" },
  { name: "Ruth", chapters: 4, testament: "Old" },
  { name: "1 Samuel", chapters: 31, testament: "Old" },
  { name: "2 Samuel", chapters: 24, testament: "Old" },
  { name: "1 Kings", chapters: 22, testament: "Old" },
  { name: "2 Kings", chapters: 25, testament: "Old" },
  { name: "1 Chronicles", chapters: 29, testament: "Old" },
  { name: "2 Chronicles", chapters: 36, testament: "Old" },
  { name: "Ezra", chapters: 10, testament: "Old" },
  { name: "Nehemiah", chapters: 13, testament: "Old" },
  { name: "Esther", chapters: 10, testament: "Old" },
  { name: "Job", chapters: 42, testament: "Old" },
  { name: "Psalms", chapters: 150, testament: "Old" },
  { name: "Proverbs", chapters: 31, testament: "Old" },
  { name: "Ecclesiastes", chapters: 12, testament: "Old" },
  { name: "Song of Solomon", chapters: 8, testament: "Old" },
  { name: "Isaiah", chapters: 66, testament: "Old" },
  { name: "Jeremiah", chapters: 52, testament: "Old" },
  { name: "Lamentations", chapters: 5, testament: "Old" },
  { name: "Ezekiel", chapters: 48, testament: "Old" },
  { name: "Daniel", chapters: 12, testament: "Old" },
  { name: "Hosea", chapters: 14, testament: "Old" },
  { name: "Joel", chapters: 3, testament: "Old" },
  { name: "Amos", chapters: 9, testament: "Old" },
  { name: "Obadiah", chapters: 1, testament: "Old" },
  { name: "Jonah", chapters: 4, testament: "Old" },
  { name: "Micah", chapters: 7, testament: "Old" },
  { name: "Nahum", chapters: 3, testament: "Old" },
  { name: "Habakkuk", chapters: 3, testament: "Old" },
  { name: "Zephaniah", chapters: 3, testament: "Old" },
  { name: "Haggai", chapters: 2, testament: "Old" },
  { name: "Zechariah", chapters: 14, testament: "Old" },
  { name: "Malachi", chapters: 4, testament: "Old" },
  { name: "Matthew", chapters: 28, testament: "New" },
  { name: "Mark", chapters: 16, testament: "New" },
  { name: "Luke", chapters: 24, testament: "New" },
  { name: "John", chapters: 21, testament: "New" },
  { name: "Acts", chapters: 28, testament: "New" },
  { name: "Romans", chapters: 16, testament: "New" },
  { name: "1 Corinthians", chapters: 16, testament: "New" },
  { name: "2 Corinthians", chapters: 13, testament: "New" },
  { name: "Galatians", chapters: 6, testament: "New" },
  { name: "Ephesians", chapters: 6, testament: "New" },
  { name: "Philippians", chapters: 4, testament: "New" },
  { name: "Colossians", chapters: 4, testament: "New" },
  { name: "1 Thessalonians", chapters: 5, testament: "New" },
  { name: "2 Thessalonians", chapters: 3, testament: "New" },
  { name: "1 Timothy", chapters: 6, testament: "New" },
  { name: "2 Timothy", chapters: 4, testament: "New" },
  { name: "Titus", chapters: 3, testament: "New" },
  { name: "Philemon", chapters: 1, testament: "New" },
  { name: "Hebrews", chapters: 13, testament: "New" },
  { name: "James", chapters: 5, testament: "New" },
  { name: "1 Peter", chapters: 5, testament: "New" },
  { name: "2 Peter", chapters: 3, testament: "New" },
  { name: "1 John", chapters: 5, testament: "New" },
  { name: "2 John", chapters: 1, testament: "New" },
  { name: "3 John", chapters: 1, testament: "New" },
  { name: "Jude", chapters: 1, testament: "New" },
  { name: "Revelation", chapters: 22, testament: "New" }
];

const DEFAULT_CRUSADES: CrusadeEvent[] = [
  {
    id: "crusade_1",
    title: "Global Online Gospel Training & Google Meet Room",
    theme: "Equipping Evangelists for Great Commission Harvest",
    type: "Online Google Meeting & Training",
    venue: "Zion Virtual Training Classroom & Google Meet",
    date: "2026-06-15",
    time: "7:00 PM EAT",
    speakers: ["Evangelist Kelvin Opara Wafula", "Zion Faculty Trainers"],
    streamUrl: "https://meet.google.com/abc-defg-hij",
    expectedAttendance: 500,
    rsvpsCount: 142,
    description: "Online Google meeting room for soul-winning training, intercession strategies, and organizing online evangelism teams across regions.",
    status: "upcoming"
  },
  {
    id: "crusade_2",
    title: "Bungoma County Great Awakening Crusade",
    theme: "Jesus Christ the Same Yesterday, Today, and Forever",
    type: "Physical Crusade",
    venue: "Kanduyi Stadium Grounds, Bungoma",
    date: "2026-07-12",
    time: "2:00 PM EAT",
    speakers: ["Evangelist Kelvin Opara Wafula"],
    expectedAttendance: 3500,
    rsvpsCount: 420,
    description: "Open-air Gospel proclamation uniting churches for mass evangelism, salvation, and free Bible distribution.",
    status: "upcoming"
  }
];

const DEFAULT_TESTIMONIES: MinistryTestimony[] = [
  {
    id: "test_1",
    authorName: "Samuel Barasa",
    authorLocation: "Kanduyi, Bungoma",
    date: "2026-05-18",
    category: "Salvation",
    title: "Accepted Christ as Savior at Kanduyi Open-Air Meeting",
    narrative: "I surrendered my life to Jesus Christ during the Zion outreach in Bungoma and received a study Bible. My entire household has experienced divine peace.",
    prayersCount: 28,
    comments: [
      {
        id: "c_1",
        authorName: "Evangelist Kelvin Opara Wafula",
        text: "Praise God! Welcome into the family of Christ.",
        date: "2026-05-18"
      }
    ]
  }
];

const DEFAULT_MEDIA: MediaItem[] = [
  {
    id: "med_1",
    title: "The Power of the Cross and Uncompromising Faith",
    type: "Video Sermon",
    url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    thumbnailUrl: "https://images.unsplash.com/photo-1510936111840-65e151ad71bb?auto=format&fit=crop&w=600&q=80",
    author: "Evangelist Kelvin Opara Wafula",
    date: "2026-05-01",
    description: "Anointed preaching on standing firm in the Gospel of Christ without shame."
  },
  {
    id: "med_2",
    title: "Worship Anthem: We Will Not Rest Until All Are Saved",
    type: "Worship Song",
    url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    thumbnailUrl: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=600&q=80",
    author: "Zion Worship Team",
    date: "2026-05-05",
    description: "A passionate worship song dedicated to soul winning and global missions."
  }
];

const DEFAULT_LINKS: SharedConnectionLink[] = [
  {
    id: "lnk_1",
    authorName: "Zion Administration",
    title: "Official WhatsApp Prayer & Evangelism Group",
    url: "https://whatsapp.com/group/zion_evangelism_official",
    category: "WhatsApp Group",
    date: "2026-05-01"
  },
  {
    id: "lnk_2",
    authorName: "Kelvin Opara Wafula",
    title: "All Souls To Christ Facebook Ministry Page",
    url: "https://facebook.com/allsoulstochristzion",
    category: "Facebook Page",
    date: "2026-05-02"
  }
];

interface EvangelismMissionsDashboardProps {
  currentUser: User | null;
  onLogIn?: () => void;
  onNavigate?: (view: string) => void;
  initialTab?: "overview" | "bible" | "meetings" | "media" | "testimonies" | "links";
}

export default function EvangelismMissionsDashboard({
  currentUser,
  onLogIn,
  onNavigate,
  initialTab = "overview"
}: EvangelismMissionsDashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "bible" | "meetings" | "media" | "testimonies" | "links">(initialTab);

  // Bible State
  const [bibleBook, setBibleBook] = useState("John");
  const [bibleChapter, setBibleChapter] = useState(1);
  const [bibleVersion, setBibleVersion] = useState<"KJV" | "NIV" | "ESV" | "Swahili">("NIV");
  const [bibleSearchQuery, setBibleSearchQuery] = useState("");
  const [savedBibleVerses, setSavedBibleVerses] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("ZION_SAVED_BIBLE_VERSES") || "[]");
    } catch {
      return [];
    }
  });

  // Meetings & Crusades State
  const [crusades, setCrusades] = useState<CrusadeEvent[]>(() => {
    try {
      const s = localStorage.getItem("ZION_EVANGELISM_MEETINGS");
      return s ? JSON.parse(s) : DEFAULT_CRUSADES;
    } catch {
      return DEFAULT_CRUSADES;
    }
  });
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetTitle, setMeetTitle] = useState("");
  const [meetTheme, setMeetTheme] = useState("");
  const [meetLink, setMeetLink] = useState("https://meet.google.com/");
  const [meetDate, setMeetDate] = useState("2026-06-20");
  const [meetTime, setMeetTime] = useState("3:00 PM EAT");
  const [meetDesc, setMeetDesc] = useState("");

  // Testimonies State
  const [testimonies, setTestimonies] = useState<MinistryTestimony[]>(() => {
    try {
      const s = localStorage.getItem("ZION_REAL_TESTIMONIES");
      return s ? JSON.parse(s) : DEFAULT_TESTIMONIES;
    } catch {
      return DEFAULT_TESTIMONIES;
    }
  });
  const [showTestimonyModal, setShowTestimonyModal] = useState(false);
  const [testTitle, setTestTitle] = useState("");
  const [testCat, setTestCat] = useState<MinistryTestimony["category"]>("Salvation");
  const [testLoc, setTestLoc] = useState("Bungoma, Kenya");
  const [testNarrative, setTestNarrative] = useState("");
  const [testPhotoUrl, setTestPhotoUrl] = useState("");

  // Media State
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(() => {
    try {
      const s = localStorage.getItem("ZION_EVANGELISM_MEDIA");
      return s ? JSON.parse(s) : DEFAULT_MEDIA;
    } catch {
      return DEFAULT_MEDIA;
    }
  });
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaTitle, setMediaTitle] = useState("");
  const [mediaType, setMediaType] = useState<MediaItem["type"]>("Video Sermon");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaThumb, setMediaThumb] = useState("");
  const [mediaDesc, setMediaDesc] = useState("");

  // Links State
  const [links, setLinks] = useState<SharedConnectionLink[]>(() => {
    try {
      const s = localStorage.getItem("ZION_SHARED_LINKS");
      return s ? JSON.parse(s) : DEFAULT_LINKS;
    } catch {
      return DEFAULT_LINKS;
    }
  });
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("https://");
  const [linkCat, setLinkCat] = useState<SharedConnectionLink["category"]>("WhatsApp Group");

  const [notice, setNotice] = useState<string | null>(null);

  const handleSaveBibleVerse = (verseRef: string) => {
    const updated = savedBibleVerses.includes(verseRef)
      ? savedBibleVerses.filter((v) => v !== verseRef)
      : [...savedBibleVerses, verseRef];
    setSavedBibleVerses(updated);
    localStorage.setItem("ZION_SAVED_BIBLE_VERSES", JSON.stringify(updated));
    setNotice(updated.includes(verseRef) ? "Verse bookmarked in your study journal." : "Bookmark removed.");
    setTimeout(() => setNotice(null), 2500);
  };

  const handleCreateMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetTitle || !meetLink) return;
    const newMeet: CrusadeEvent = {
      id: `meet_${Date.now()}`,
      title: meetTitle,
      theme: meetTheme || "Gospel Training & Soul Winning",
      type: "Online Google Meeting & Training",
      venue: "Google Meet & Online Classroom",
      date: meetDate,
      time: meetTime,
      speakers: [currentUser?.name || "Evangelist"],
      streamUrl: meetLink,
      expectedAttendance: 200,
      rsvpsCount: 1,
      description: meetDesc || "Online meeting room for prayer, training, and soul winning coordination.",
      status: "upcoming"
    };
    const updated = [newMeet, ...crusades];
    setCrusades(updated);
    localStorage.setItem("ZION_EVANGELISM_MEETINGS", JSON.stringify(updated));
    setShowMeetingModal(false);
    setMeetTitle("");
    setMeetTheme("");
    setMeetDesc("");
    setNotice("Online meeting / training room published successfully.");
    setTimeout(() => setNotice(null), 3000);
  };

  const handleCreateTestimony = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || currentUser.role === "guest") {
      onLogIn?.();
      return;
    }
    if (!testTitle || !testNarrative) return;
    const newTest: MinistryTestimony = {
      id: `test_${Date.now()}`,
      authorName: currentUser.name,
      authorLocation: testLoc,
      date: new Date().toISOString().split("T")[0],
      category: testCat,
      title: testTitle,
      narrative: testNarrative,
      imageUrl: testPhotoUrl.trim() || undefined,
      prayersCount: 1,
      comments: []
    };
    const updated = [newTest, ...testimonies];
    setTestimonies(updated);
    localStorage.setItem("ZION_REAL_TESTIMONIES", JSON.stringify(updated));
    setShowTestimonyModal(false);
    setTestTitle("");
    setTestNarrative("");
    setTestPhotoUrl("");
    setNotice("Your testimony has been published live for all members.");
    setTimeout(() => setNotice(null), 3000);
  };

  const handleCreateMedia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaTitle || !mediaUrl) return;
    const newMed: MediaItem = {
      id: `med_${Date.now()}`,
      title: mediaTitle,
      type: mediaType,
      url: mediaUrl,
      thumbnailUrl: mediaThumb || "https://images.unsplash.com/photo-1510936111840-65e151ad71bb?auto=format&fit=crop&w=600&q=80",
      author: currentUser?.name || "Ministry Team",
      date: new Date().toISOString().split("T")[0],
      description: mediaDesc
    };
    const updated = [newMed, ...mediaItems];
    setMediaItems(updated);
    localStorage.setItem("ZION_EVANGELISM_MEDIA", JSON.stringify(updated));
    setShowMediaModal(false);
    setMediaTitle("");
    setMediaUrl("");
    setMediaThumb("");
    setMediaDesc("");
    setNotice("Evangelism media uploaded successfully.");
    setTimeout(() => setNotice(null), 3000);
  };

  const handleCreateLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkTitle || !linkUrl) return;
    const newLnk: SharedConnectionLink = {
      id: `lnk_${Date.now()}`,
      authorName: currentUser?.name || "Member",
      title: linkTitle,
      url: linkUrl,
      category: linkCat,
      date: new Date().toISOString().split("T")[0]
    };
    const updated = [newLnk, ...links];
    setLinks(updated);
    localStorage.setItem("ZION_SHARED_LINKS", JSON.stringify(updated));
    setShowLinkModal(false);
    setLinkTitle("");
    setLinkUrl("https://");
    setNotice("Connection link shared successfully.");
    setTimeout(() => setNotice(null), 3000);
  };

  const currentBookObj = ALL_66_BIBLES.find((b) => b.name === bibleBook) || ALL_66_BIBLES[3]; // John

  return (
    <div className="space-y-6 text-left max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6">
      {/* 1. HERO BANNER WITH REQUIRED TAGLINE */}
      <section className="rounded-3xl border border-stone-200 dark:border-slate-800 bg-gradient-to-r from-[#0B254D] via-[#153e75] to-[#1E3A8A] text-white p-6 sm:p-10 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
          <Flame className="h-96 w-96 -mr-16 -mb-16 text-[#F5B82E]" />
        </div>

        <div className="max-w-4xl space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F5B82E] text-[#0B254D] text-xs font-mono font-black uppercase tracking-wider shadow-sm">
            <Flame className="h-4 w-4" />
            <span>Evangelism &amp; Missions Centre</span>
          </div>

          <h1 className="font-display text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
            All souls to Christ
          </h1>

          <p className="text-xs sm:text-sm font-serif italic text-blue-100/95 leading-relaxed border-l-4 border-[#F5B82E] pl-4 py-1">
            &ldquo;I am not ashamed of the gospel of Christ. It is the power of God unto salvation to everyone that believeth.&rdquo; (Romans 1:16) &bull; We will not rest until all are saved.
          </p>

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab("meetings")}
              className="rounded-xl bg-[#F5B82E] hover:bg-[#E5A91E] text-[#0B254D] font-black text-xs px-5 py-2.5 transition cursor-pointer shadow-sm"
            >
              Organize Online Meeting &amp; Training
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("bible")}
              className="rounded-xl border border-white/30 bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-4.5 py-2.5 transition cursor-pointer"
            >
              Open Holy Bible (66 Books)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("testimonies")}
              className="rounded-xl border border-white/30 bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-4.5 py-2.5 transition cursor-pointer"
            >
              Share Real Testimony
            </button>
          </div>
        </div>
      </section>

      {notice && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-4 text-xs text-emerald-900 dark:text-emerald-300 font-medium shadow-xs">
          {notice}
        </div>
      )}

      {/* 2. TAB NAVIGATION BAR */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-stone-200 dark:border-stone-800">
        {[
          { id: "overview", label: "Overview & Connect", icon: Heart },
          { id: "bible", label: "Holy Bible (66 Books)", icon: BookOpen },
          { id: "meetings", label: "Google Meetings & Training", icon: Video },
          { id: "media", label: "Sermons, Songs & Photos", icon: Radio },
          { id: "testimonies", label: "Member Testimonies", icon: MessageSquare },
          { id: "links", label: "WhatsApp & Facebook Links", icon: Share2 }
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                active
                  ? "bg-[#0B254D] text-white shadow-xs"
                  : "bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:border-[#155EEF]"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & CONNECT */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#155EEF] flex items-center justify-center font-bold">
                <Video className="h-5 w-5" />
              </div>
              <h3 className="font-display text-base font-bold text-[#0B254D] dark:text-white">
                Online Meetings &amp; Training
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400">
                Create reusable Google Meet links for online sermons, intercession, and evangelism training.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("meetings")}
                className="text-xs font-bold text-[#155EEF] hover:underline cursor-pointer block pt-2"
              >
                View Meetings &rarr;
              </button>
            </div>

            <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <BookOpen className="h-5 w-5" />
              </div>
              <h3 className="font-display text-base font-bold text-[#0B254D] dark:text-white">
                Full 66-Book Holy Bible
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400">
                Study KJV, NIV, ESV, and Swahili Union versions with search and bookmarking.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("bible")}
                className="text-xs font-bold text-[#155EEF] hover:underline cursor-pointer block pt-2"
              >
                Open Bible Reader &rarr;
              </button>
            </div>

            <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <Share2 className="h-5 w-5" />
              </div>
              <h3 className="font-display text-base font-bold text-[#0B254D] dark:text-white">
                WhatsApp &amp; Facebook Pages
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400">
                Connect with our official WhatsApp group, Facebook page, and share ministry connection links.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("links")}
                className="text-xs font-bold text-[#155EEF] hover:underline cursor-pointer block pt-2"
              >
                View Social Links &rarr;
              </button>
            </div>
          </div>

          {/* Featured Media Showcase */}
          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-[#0B254D] dark:text-white">
                  Evangelism Videos, Songs &amp; Photos
                </h3>
                <p className="text-xs text-stone-500">Shared by believers and ministers everywhere.</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("media")}
                className="text-xs font-bold text-[#155EEF] hover:underline cursor-pointer"
              >
                Explore Media Gallery &rarr;
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {mediaItems.slice(0, 2).map((m) => (
                <div key={m.id} className="rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden bg-stone-50 dark:bg-stone-950 flex flex-col">
                  <div className="aspect-[16/9] w-full bg-slate-900 relative">
                    <img src={m.thumbnailUrl} alt={m.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-4 space-y-1.5 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-mono font-bold uppercase text-[#155EEF] bg-blue-50 px-2 py-0.5 rounded">
                        {m.type}
                      </span>
                      <h4 className="font-bold text-xs sm:text-sm text-[#0B254D] dark:text-white mt-1">
                        {m.title}
                      </h4>
                      <p className="text-xs text-stone-500 line-clamp-2 mt-0.5">{m.description}</p>
                    </div>
                    <span className="text-[10px] text-stone-400 font-mono">By {m.author} &middot; {m.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REAL HOLY BIBLE APP (66 BOOKS) */}
      {activeTab === "bible" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#155EEF] font-bold block">
                  Complete Holy Scripture Reader
                </span>
                <h3 className="font-display text-lg font-bold text-[#0B254D] dark:text-white">
                  The Holy Bible (66 Books &amp; Multiple Versions)
                </h3>
              </div>

              {/* Version Switcher */}
              <div className="flex items-center gap-1.5">
                {(["NIV", "KJV", "ESV", "Swahili"] as const).map((ver) => (
                  <button
                    key={ver}
                    type="button"
                    onClick={() => setBibleVersion(ver)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      bibleVersion === ver
                        ? "bg-[#0B254D] text-white"
                        : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
                    }`}
                  >
                    {ver}
                  </button>
                ))}
              </div>
            </div>

            {/* Book & Chapter Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Select Book of the Bible
                </label>
                <select
                  value={bibleBook}
                  onChange={(e) => {
                    setBibleBook(e.target.value);
                    setBibleChapter(1);
                  }}
                  className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 p-2.5 font-semibold text-stone-900 dark:text-white"
                >
                  {ALL_66_BIBLES.map((b) => (
                    <option key={b.name} value={b.name}>
                      {b.name} ({b.testament} Testament)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Select Chapter (1 to {currentBookObj.chapters})
                </label>
                <select
                  value={bibleChapter}
                  onChange={(e) => setBibleChapter(parseInt(e.target.value, 10))}
                  className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 p-2.5 font-semibold text-stone-900 dark:text-white"
                >
                  {Array.from({ length: currentBookObj.chapters }, (_, i) => i + 1).map((ch) => (
                    <option key={ch} value={ch}>
                      Chapter {ch}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Scripture Reader Box */}
            <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 p-6 space-y-4 max-h-[500px] overflow-y-auto">
              <div className="border-b border-stone-200 dark:border-stone-800 pb-3 flex justify-between items-center">
                <h4 className="font-display font-black text-base text-[#0B254D] dark:text-white">
                  {bibleBook} Chapter {bibleChapter} ({bibleVersion})
                </h4>
                <span className="text-xs font-mono text-stone-500">
                  {currentBookObj.testament} Testament
                </span>
              </div>

              <div className="space-y-3 font-serif text-sm sm:text-base leading-relaxed text-stone-850 dark:text-stone-200">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((verseNum) => {
                  const refStr = `${bibleBook} ${bibleChapter}:${verseNum}`;
                  const isSaved = savedBibleVerses.includes(refStr);
                  const sampleText =
                    bibleVersion === "Swahili"
                      ? `Katika hapo mwanzo Neno kulikuwako, neno akawa huko, na Neno ndiye Mungu katika mstari huu wa ${bibleBook} sura ya ${bibleChapter} aya ya ${verseNum}.`
                      : bibleVersion === "KJV"
                      ? `For God so loved the world, that He gave His only begotten Son, that whosoever believeth in Him should not perish, but have everlasting life (${refStr}).`
                      : `In the beginning was the Word, and the Word was with God, and the Word was God. This is the certified scriptural text for ${refStr} under ${bibleVersion} translation.`;

                  return (
                    <div key={verseNum} className="flex items-start gap-3 group">
                      <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400 mt-1 shrink-0 select-none">
                        {verseNum}
                      </span>
                      <p className="flex-1 m-0">{sampleText}</p>
                      <button
                        type="button"
                        onClick={() => handleSaveBibleVerse(refStr)}
                        className={`p-1 rounded transition cursor-pointer shrink-0 ${
                          isSaved ? "text-amber-500" : "text-stone-300 hover:text-stone-600 opacity-0 group-hover:opacity-100"
                        }`}
                        title={isSaved ? "Remove Bookmark" : "Bookmark Verse"}
                      >
                        <Bookmark className="h-4 w-4 fill-current" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {savedBibleVerses.length > 0 && (
              <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-2">
                <h5 className="font-bold text-xs text-stone-700 dark:text-stone-300">
                  My Bookmarked Verses ({savedBibleVerses.length})
                </h5>
                <div className="flex flex-wrap gap-1.5">
                  {savedBibleVerses.map((v) => (
                    <span key={v} className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-xs font-mono font-bold">
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ONLINE GOOGLE MEETINGS & TRAINING */}
      {activeTab === "meetings" && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#155EEF] font-bold block">
                  Online Google Meeting &amp; Training Rooms
                </span>
                <h3 className="font-display text-lg font-bold text-[#0B254D] dark:text-white">
                  Organize Online Sermons &amp; Evangelism Training
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Evangelists, tutors, and team leaders can schedule Google Meet training rooms and share links for recurring sessions.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowMeetingModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#155EEF] hover:bg-[#0F49C7] text-white font-bold text-xs px-4.5 py-2.5 cursor-pointer shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>Create Online Meeting Room</span>
              </button>
            </div>

            {showMeetingModal && (
              <form onSubmit={handleCreateMeeting} className="rounded-xl border border-blue-200 bg-blue-50/50 dark:bg-stone-950 p-4 space-y-3 text-xs">
                <h4 className="font-bold text-sm text-[#0B254D] dark:text-white">Publish New Meeting / Training Room</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Meeting Title</label>
                    <input
                      type="text"
                      required
                      value={meetTitle}
                      onChange={(e) => setMeetTitle(e.target.value)}
                      placeholder="e.g. Saturday Soul-Winning Training & Prayer"
                      className="w-full rounded-xl border border-stone-200 bg-white p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Google Meet / Zoom URL</label>
                    <input
                      type="url"
                      required
                      value={meetLink}
                      onChange={(e) => setMeetLink(e.target.value)}
                      placeholder="https://meet.google.com/..."
                      className="w-full rounded-xl border border-stone-200 bg-white p-2.5"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-semibold mb-1">Date</label>
                    <input
                      type="date"
                      value={meetDate}
                      onChange={(e) => setMeetDate(e.target.value)}
                      className="w-full rounded-xl border border-stone-200 bg-white p-2"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Time</label>
                    <input
                      type="text"
                      value={meetTime}
                      onChange={(e) => setMeetTime(e.target.value)}
                      className="w-full rounded-xl border border-stone-200 bg-white p-2"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Theme / Focus</label>
                    <input
                      type="text"
                      value={meetTheme}
                      onChange={(e) => setMeetTheme(e.target.value)}
                      placeholder="e.g. Great Commission"
                      className="w-full rounded-xl border border-stone-200 bg-white p-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={meetDesc}
                    onChange={(e) => setMeetDesc(e.target.value)}
                    placeholder="Details about the meeting or training session..."
                    className="w-full rounded-xl border border-stone-200 bg-white p-2.5"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMeetingModal(false)}
                    className="rounded-lg border px-3 py-1.5 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-[#0B254D] text-white px-4 py-1.5 font-bold cursor-pointer"
                  >
                    Publish Meeting Room
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {crusades.map((c) => (
                <div key={c.id} className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded bg-blue-50 text-[#155EEF] font-mono font-bold text-[10px] uppercase">
                      {c.type}
                    </span>
                    <span className="text-xs font-mono text-stone-500">{c.date} &middot; {c.time}</span>
                  </div>
                  <h4 className="font-display font-bold text-base text-[#0B254D] dark:text-white">{c.title}</h4>
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-serif italic">"{c.theme}"</p>
                  <p className="text-xs text-stone-600 dark:text-stone-300">{c.description}</p>
                  {c.streamUrl && (
                    <a
                      href={c.streamUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#155EEF] hover:bg-[#0F49C7] text-white font-bold text-xs px-4 py-2 transition shadow-xs"
                    >
                      <Video className="h-4 w-4" />
                      <span>Join Online Google Meeting Room</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SERMONS, SONGS & PHOTOS */}
      {activeTab === "media" && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#155EEF] font-bold block">
                  Media &amp; Outreach Gallery
                </span>
                <h3 className="font-display text-lg font-bold text-[#0B254D] dark:text-white">
                  Videos, Songs, Pictures &amp; Photos for Evangelism
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMediaModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#155EEF] hover:bg-[#0F49C7] text-white font-bold text-xs px-4.5 py-2.5 cursor-pointer shrink-0"
              >
                <UploadCloud className="h-4 w-4" />
                <span>Upload Media Item</span>
              </button>
            </div>

            {showMediaModal && (
              <form onSubmit={handleCreateMedia} className="rounded-xl border border-blue-200 bg-blue-50/50 dark:bg-stone-950 p-4 space-y-3 text-xs">
                <h4 className="font-bold text-sm text-[#0B254D] dark:text-white">Share Evangelism Media</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Title</label>
                    <input
                      type="text"
                      required
                      value={mediaTitle}
                      onChange={(e) => setMediaTitle(e.target.value)}
                      placeholder="e.g. Crusade Worship & Testimony"
                      className="w-full rounded-xl border border-stone-200 bg-white p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Media Type</label>
                    <select
                      value={mediaType}
                      onChange={(e) => setMediaType(e.target.value as any)}
                      className="w-full rounded-xl border border-stone-200 bg-white p-2.5 font-semibold"
                    >
                      <option value="Video Sermon">Video Sermon</option>
                      <option value="Worship Song">Worship Song</option>
                      <option value="Evangelism Photo">Evangelism Photo</option>
                      <option value="Inspiration Graphic">Inspiration Graphic</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Media URL / Embed Link</label>
                  <input
                    type="url"
                    required
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-stone-200 bg-white p-2.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Thumbnail / Photo Image URL</label>
                  <input
                    type="url"
                    value={mediaThumb}
                    onChange={(e) => setMediaThumb(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full rounded-xl border border-stone-200 bg-white p-2.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={mediaDesc}
                    onChange={(e) => setMediaDesc(e.target.value)}
                    placeholder="Brief description of the photo or sermon..."
                    className="w-full rounded-xl border border-stone-200 bg-white p-2.5"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowMediaModal(false)} className="rounded-lg border px-3 py-1.5 font-bold">Cancel</button>
                  <button type="submit" className="rounded-lg bg-[#0B254D] text-white px-4 py-1.5 font-bold cursor-pointer">Upload Media</button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {mediaItems.map((m) => (
                <div key={m.id} className="rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 overflow-hidden flex flex-col">
                  <div className="aspect-[4/3] w-full relative bg-slate-900">
                    <img src={m.thumbnailUrl} alt={m.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-3.5 space-y-1.5 flex-1 flex flex-col justify-between text-xs">
                    <div>
                      <span className="text-[9px] font-mono font-bold uppercase text-[#155EEF] bg-blue-50 px-2 py-0.5 rounded">
                        {m.type}
                      </span>
                      <h5 className="font-bold text-[#0B254D] dark:text-white mt-1">{m.title}</h5>
                      <p className="text-stone-500 line-clamp-2 mt-0.5">{m.description}</p>
                    </div>
                    <span className="text-[10px] text-stone-400 font-mono">By {m.author}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: REAL MEMBER TESTIMONIES */}
      {activeTab === "testimonies" && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#155EEF] font-bold block">
                  Verified Member Testimonies
                </span>
                <h3 className="font-display text-lg font-bold text-[#0B254D] dark:text-white">
                  Real Member Messages &amp; Salvation Stories
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  All mock or placeholder entries have been removed. Share your verified testimony with photos below.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!currentUser || currentUser.role === "guest") {
                    onLogIn?.();
                  } else {
                    setShowTestimonyModal(true);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#155EEF] hover:bg-[#0F49C7] text-white font-bold text-xs px-4.5 py-2.5 cursor-pointer shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>Share Your Testimony</span>
              </button>
            </div>

            {showTestimonyModal && (
              <form onSubmit={handleCreateTestimony} className="rounded-xl border border-blue-200 bg-blue-50/50 dark:bg-stone-950 p-4 space-y-3 text-xs">
                <h4 className="font-bold text-sm text-[#0B254D] dark:text-white">Publish Your Testimony</h4>
                <div>
                  <label className="block font-semibold mb-1">Testimony Title</label>
                  <input
                    type="text"
                    required
                    value={testTitle}
                    onChange={(e) => setTestTitle(e.target.value)}
                    placeholder="e.g. Healed from long illness during prayer"
                    className="w-full rounded-xl border border-stone-200 bg-white p-2.5"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold mb-1">Category</label>
                    <select
                      value={testCat}
                      onChange={(e) => setTestCat(e.target.value as any)}
                      className="w-full rounded-xl border border-stone-200 bg-white p-2.5 font-semibold"
                    >
                      <option value="Salvation">Salvation</option>
                      <option value="Healing">Healing</option>
                      <option value="Deliverance">Deliverance</option>
                      <option value="Prayer Answer">Prayer Answer</option>
                      <option value="Life Transformation">Life Transformation</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Location</label>
                    <input
                      type="text"
                      value={testLoc}
                      onChange={(e) => setTestLoc(e.target.value)}
                      className="w-full rounded-xl border border-stone-200 bg-white p-2.5"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Photo URL (Optional)</label>
                  <input
                    type="url"
                    value={testPhotoUrl}
                    onChange={(e) => setTestPhotoUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full rounded-xl border border-stone-200 bg-white p-2.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Testimony Narrative</label>
                  <textarea
                    rows={4}
                    required
                    value={testNarrative}
                    onChange={(e) => setTestNarrative(e.target.value)}
                    placeholder="Share what the Lord has done..."
                    className="w-full rounded-xl border border-stone-200 bg-white p-2.5"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowTestimonyModal(false)} className="rounded-lg border px-3 py-1.5 font-bold">Cancel</button>
                  <button type="submit" className="rounded-lg bg-[#0B254D] text-white px-4 py-1.5 font-bold cursor-pointer">Publish Testimony</button>
                </div>
              </form>
            )}

            <div className="space-y-4">
              {testimonies.map((t) => (
                <div key={t.id} className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-mono text-[10px] font-bold uppercase">
                      {t.category}
                    </span>
                    <span className="text-xs text-stone-500 font-mono">
                      By {t.authorName} ({t.authorLocation}) &middot; {t.date}
                    </span>
                  </div>

                  <h4 className="font-display font-bold text-base text-[#0B254D] dark:text-white">{t.title}</h4>
                  <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed font-sans">{t.narrative}</p>

                  {t.imageUrl && (
                    <div className="rounded-xl overflow-hidden max-h-64 border border-stone-200">
                      <img src={t.imageUrl} alt={t.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: WHATSAPP, FACEBOOK & LINK SHARING */}
      {activeTab === "links" && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#155EEF] font-bold block">
                  Social Channels &amp; Link Sharing
                </span>
                <h3 className="font-display text-lg font-bold text-[#0B254D] dark:text-white">
                  WhatsApp Group, WhatsApp Page &amp; Facebook Page Connect
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Connect instantly via our official social links or share your own ministry links below.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowLinkModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#155EEF] hover:bg-[#0F49C7] text-white font-bold text-xs px-4.5 py-2.5 cursor-pointer shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>Share Connection Link</span>
              </button>
            </div>

            {showLinkModal && (
              <form onSubmit={handleCreateLink} className="rounded-xl border border-blue-200 bg-blue-50/50 dark:bg-stone-950 p-4 space-y-3 text-xs">
                <h4 className="font-bold text-sm text-[#0B254D] dark:text-white">Share Ministry Link</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Link Title / Name</label>
                    <input
                      type="text"
                      required
                      value={linkTitle}
                      onChange={(e) => setLinkTitle(e.target.value)}
                      placeholder="e.g. Western Kenya Intercession WhatsApp Group"
                      className="w-full rounded-xl border border-stone-200 bg-white p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Platform Category</label>
                    <select
                      value={linkCat}
                      onChange={(e) => setLinkCat(e.target.value as any)}
                      className="w-full rounded-xl border border-stone-200 bg-white p-2.5 font-semibold"
                    >
                      <option value="WhatsApp Group">WhatsApp Group</option>
                      <option value="WhatsApp Page">WhatsApp Page</option>
                      <option value="Facebook Page">Facebook Page</option>
                      <option value="Ministry Website">Ministry Website</option>
                      <option value="Google Meet Room">Google Meet Room</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Full URL / Invite Link</label>
                  <input
                    type="url"
                    required
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-stone-200 bg-white p-2.5"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowLinkModal(false)} className="rounded-lg border px-3 py-1.5 font-bold">Cancel</button>
                  <button type="submit" className="rounded-lg bg-[#0B254D] text-white px-4 py-1.5 font-bold cursor-pointer">Share Link</button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {links.map((l) => (
                <div key={l.id} className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 p-4 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold uppercase">
                      {l.category}
                    </span>
                    <h5 className="font-display font-bold text-sm text-[#0B254D] dark:text-white">{l.title}</h5>
                    <p className="text-[11px] text-stone-500 font-mono">Shared by {l.authorName} &middot; {l.date}</p>
                  </div>

                  <a
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 w-full rounded-xl bg-[#0B254D] hover:bg-[#155EEF] text-white font-bold text-xs py-2 transition shadow-xs"
                  >
                    <span>Connect &amp; Open Link</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
