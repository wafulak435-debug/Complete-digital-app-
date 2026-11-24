import React, { useState, useEffect } from "react";
import { BookOpen, User as UserIcon, Menu, X, ArrowUp, ArrowDown, ArrowLeft, Home, Compass, MessageSquare, Trophy, ShieldCheck, HelpCircle, FileText, UploadCloud, Gamepad2, Search, Sparkles, Mail, Smartphone, Sun, Moon, Globe, Wifi, CreditCard, Megaphone, Monitor, GraduationCap, Settings, HardDrive, Trash2, Database, Video, Crown, MapPin } from "lucide-react";
import { User, Book, SavedDocument, CommunityMessage, AppSettings } from "../types";
import { getCookie, setCookie } from "../utils/cookies";
import { saveAppSettingsToFirestore } from "../lib/firestoreUtils";

import appLogo from "../assets/images/zion_digital_logo_1781070536038.png";

const ZION_POST_DRAFT_PRESETS = [
  {
    name: "Zion Royal Blue Shield (Default Master)",
    description: "Deep slate background with golden shield emblem representing safety & stewardship.",
    svgData: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%230f172a"/><path d="M50 20 L80 35 V60 C80 75 50 85 50 85 C50 85 20 75 20 60 V35 Z" fill="%23f59e0b" stroke="%23fef08a" stroke-width="4"/><text x="50" y="60" font-family="'Inter', sans-serif" font-weight="900" font-size="28" fill="%23ffffff" text-anchor="middle">Z</text></svg>`
  },
  {
    name: "Golden Torch of Theological Wisdom",
    description: "Deep indigo background with glowing orange-red flame representing spiritual learning.",
    svgData: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%23312e81"/><path d="M50 15 C55 30 70 35 60 55 C53 65 47 65 40 55 C30 35 45 30 50 15 Z" fill="%23ef4444"/><path d="M50 25 C53 35 63 38 56 50 C51 55 49 55 44 50 C38 35 47 32 50 25 Z" fill="%23f59e0b"/><rect x="42" y="65" width="16" height="18" rx="4" fill="%23d97706"/></svg>`
  },
  {
    name: "Open Theological Scripture Scroll",
    description: "Deep royal blue ground with open historic scriptures for leadership guidance.",
    svgData: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%231e3a8a"/><path d="M22 25 H48 V75 H22 C22 75 32 72 32 68 V28 C32 28 22 25 22 25 Z" fill="%23fef08a"/><path d="M78 25 H52 V75 H78 C78 75 68 72 68 68 V28 C68 28 78 25 78 25 Z" fill="%23fef08a" stroke="%23ca8a04" stroke-width="1"/><line x1="28" y1="38" x2="42" y2="38" stroke="%23854d0e" stroke-width="3"/><line x1="28" y1="48" x2="42" y2="48" stroke="%23854d0e" stroke-width="3"/><line x1="58" y1="38" x2="72" y2="38" stroke="%23854d0e" stroke-width="3"/><line x1="58" y1="48" x2="72" y2="48" stroke="%23854d0e" stroke-width="3"/></svg>`
  },
  {
    name: "Zion Compass of Spiritual Alignment",
    description: "Emerald-green background with routing compass of pure future alignments.",
    svgData: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%23064e3b"/><circle cx="50" cy="50" r="30" fill="none" stroke="%2310b981" stroke-width="4"/><path d="M50 20 L56 44 L80 50 L56 56 L50 80 L44 56 L20 50 L44 44 Z" fill="%2334d399"/><polygon points="50,20 50,50 56,44" fill="%23f59e0b"/><polygon points="80,50 50,50 56,56" fill="%23f59e0b"/></svg>`
  }
];

interface NavigationProps {
  currentView: string;
  onNavigate: (view: string) => void;
  currentUser: User | null;
  onLogOut: () => void;
  onLogIn: () => void;
  streakDays?: number;
  onBack: () => void;
  canGoBack: boolean;
  books?: Book[];
  savedDocuments?: SavedDocument[];
  communityMessages?: CommunityMessage[];
  globalSettings?: AppSettings;
  onUpdateSettings?: (settings: AppSettings) => void;
  isOnline?: boolean;
  broadcastAnnouncement?: string | null;
  isBannerClosed?: boolean;
  onRestoreBanner?: () => void;
  offlineMode?: boolean;
  onToggleOfflineMode?: () => void;
  sleekMode?: boolean;
  onToggleSleekMode?: () => void;
  onOpenUpgrade?: () => void;
}

export default function Navigation({
  currentView,
  onNavigate,
  currentUser,
  onLogOut,
  onLogIn,
  streakDays,
  onBack,
  canGoBack,
  books = [],
  savedDocuments = [],
  communityMessages = [],
  globalSettings,
  onUpdateSettings,
  isOnline = true,
  broadcastAnnouncement = null,
  isBannerClosed = false,
  onRestoreBanner,
  offlineMode = false,
  onToggleOfflineMode,
  sleekMode = false,
  onToggleSleekMode,
  onOpenUpgrade
}: NavigationProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Collapsible navigational folders to optimize space on laptop and phone screens
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    "📖 BOOKS, SERMONS & WORSHIP MEDIA": true,
    "🎓 LEADERSHIP & BIBLE SCHOOL": true,
    "💡 AI STUDY & PUBLISHING": false,
    "🤝 FELLOWSHIP & CAMPUS": false,
    "🌐 SERVICES & ADMIN": false,
  });

  const toggleSection = (cat: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  const isAdmin = Boolean(
    currentUser && ["main_admin", "admin", "sub_admin"].includes(currentUser.role)
  );
  const isManager = Boolean(
    currentUser && (isAdmin || currentUser.role === "manager")
  );

  // Dynamic user font selector preference state lookup
  const [selectedFont, setSelectedFont] = useState<string>(() => {
    return localStorage.getItem("WAFULA_FONT_FAMILY") || "Plus Jakarta Sans";
  });

  useEffect(() => {
    let fontValue = '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif';
    if (selectedFont === "Playfair Display") {
      fontValue = '"Playfair Display", Georgia, serif';
    } else if (selectedFont === "JetBrains Mono") {
      fontValue = '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace';
    }
    document.documentElement.style.setProperty("--font-current", fontValue);
    localStorage.setItem("WAFULA_FONT_FAMILY", selectedFont);
  }, [selectedFont]);

  // States for Zion Custom Icon Customizer (Strict Mode - Presets Only & Admin Verified)
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(null);
  const [adminCheckedConfirmation, setAdminCheckedConfirmation] = useState(false);
  const [isUpdatingIcon, setIsUpdatingIcon] = useState(false);

  // States for unified Settings Panel (including Offline Cache & Media Management)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<"offline" | "branding">("offline");
  const [offlineCaches, setOfflineCaches] = useState<{bookId: string; size: number; title: string; author: string; category: string}[]>([]);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [storageEstimate, setStorageEstimate] = useState<{usage: number; quota: number} | null>(null);
  const [annotationCount, setAnnotationCount] = useState(0);
  const [settingsSearchQuery, setSettingsSearchQuery] = useState("");

  const loadOfflineSettingsData = async () => {
    setCacheLoading(true);
    try {
      const { getAllOfflinePdfs } = await import("../utils/pdfDb");
      const offlineMap = await getAllOfflinePdfs();
      const data: any[] = [];
      offlineMap.forEach((blob, bookId) => {
        const matchedBook = books?.find(b => b.id === bookId);
        data.push({
          bookId,
          size: blob.size,
          title: matchedBook ? matchedBook.title : "Unknown Uploaded Book",
          author: matchedBook ? matchedBook.author : "Unknown Contributor",
          category: matchedBook ? matchedBook.category : "PDF Document",
        });
      });
      setOfflineCaches(data);

      if (navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        setStorageEstimate({
          usage: est.usage || 0,
          quota: est.quota || 0
        });
      }

      if (typeof window !== "undefined" && window.indexedDB) {
        const req = window.indexedDB.open("WafulaReadsDB", 1);
        req.onsuccess = (e) => {
          const dbObj = (e.target as IDBOpenDBRequest).result;
          if (dbObj.objectStoreNames.contains("offline_annotations")) {
            const tx = dbObj.transaction("offline_annotations", "readonly");
            const store = tx.objectStore("offline_annotations");
            const countReq = store.count();
            countReq.onsuccess = () => {
              setAnnotationCount(countReq.result);
            };
          }
        };
      }
    } catch (err) {
      console.error("Failed to load IndexedDB offline settings data:", err);
    } finally {
      setCacheLoading(false);
    }
  };

  useEffect(() => {
    if (isSettingsModalOpen) {
      loadOfflineSettingsData();
    }
  }, [isSettingsModalOpen, activeSettingsTab]);

  const handlePruneCacheItem = async (bookId: string) => {
    if (window.confirm("Are you sure you want to delete this cached book PDF blob from local offline cache storage?")) {
      const { deletePdfFromOfflineDb } = await import("../utils/pdfDb");
      await deletePdfFromOfflineDb(bookId);
      alert("✅ Book blob successfully cleared from local offline cache.");
      loadOfflineSettingsData();
    }
  };

  const handlePruneAllLocalCache = async () => {
    if (window.confirm("⚠️ WARNING: This will completely wipe all offline cached book PDF documents to recover maximum local storage space. Users will need to re-download/cache books to read offline. Proceed?")) {
      const { getAllOfflinePdfs, deletePdfFromOfflineDb } = await import("../utils/pdfDb");
      const offlineMap = await getAllOfflinePdfs();
      const keys = Array.from(offlineMap.keys());
      for (const k of keys) {
        await deletePdfFromOfflineDb(k);
      }
      alert("✅ All local offline book blobs successfully purged and IndexedDB storage reclaimed.");
      loadOfflineSettingsData();
    }
  };

  const handleClearAnnotations = async () => {
    if (window.confirm("⚠️ WARNING: This will delete all your local annotations, highlighted text and reading notes. This action is irreversible. Proceed?")) {
      if (typeof window !== "undefined" && window.indexedDB) {
        const req = window.indexedDB.open("WafulaReadsDB", 1);
        req.onsuccess = (e) => {
          const dbObj = (e.target as IDBOpenDBRequest).result;
          if (dbObj.objectStoreNames.contains("offline_annotations")) {
            const tx = dbObj.transaction("offline_annotations", "readwrite");
            const store = tx.objectStore("offline_annotations");
            const clearReq = store.clear();
            clearReq.onsuccess = () => {
              alert("✅ All local annotations and notes deleted successfully.");
              loadOfflineSettingsData();
            };
          }
        };
      }
    }
  };

  const handleApplyPresetIcon = async () => {
    const canUpdateBrand = Boolean(
      currentUser &&
        (["main_admin", "admin"].includes(currentUser.role) ||
          (currentUser.role === "sub_admin" && currentUser.permissions?.allowBroadcast))
    );

    if (!canUpdateBrand) {
      alert("Authorization Denied: Only authorized Executive Administrators may update the Zion Digital emblem.");
      return;
    }

    if (selectedPresetIndex === null) {
      alert("Please select one of the certified Zion Graphic Presets first.");
      return;
    }
    if (!adminCheckedConfirmation) {
      alert("❌ Admin Certification Required: You must check the confirmation checkbox to apply changes.");
      return;
    }

    setIsUpdatingIcon(true);
    const chosenSvg = ZION_POST_DRAFT_PRESETS[selectedPresetIndex].svgData;
    const updatedSettings = {
      primaryColor: globalSettings?.primaryColor || "#3B82F6",
      fontSizeMultiplier: globalSettings?.fontSizeMultiplier || 1.0,
      customLogoUrl: chosenSvg
    };

    try {
      await saveAppSettingsToFirestore(updatedSettings);
      if (onUpdateSettings) {
        onUpdateSettings(updatedSettings);
      }
      alert("✅ Zion Enterprise Icon successfully updated and synchronized globally! The updated emblem is now active.");
      setIsLogoModalOpen(false);
      setSelectedPresetIndex(null);
      setAdminCheckedConfirmation(false);
    } catch (err: any) {
      alert("Could not persist Zion logo: " + err.message);
    } finally {
      setIsUpdatingIcon(false);
    }
  };

  // Native PWA Install states & helper triggers for PC, Android, iPhone and Macs
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showHowToInstallModal, setShowHowToInstallModal] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User prompt choice outcomes: ${outcome}`);
      setDeferredPrompt(null);
      setIsInstallable(false);
    } else {
      setShowHowToInstallModal(true);
    }
  };

  // Universal real-time search states
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    books: Book[];
    savedDocuments: SavedDocument[];
    communityMessages: CommunityMessage[];
  }>({ books: [], savedDocuments: [], communityMessages: [] });

  // Real-time query mechanism
  useEffect(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      setSearchResults({ books: [], savedDocuments: [], communityMessages: [] });
      return;
    }

    const matchedBooks = books.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q)
    );

    const matchedDocs = savedDocuments.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.content.toLowerCase().includes(q) ||
        d.folder.toLowerCase().includes(q)
    );

    const matchedMsgs = communityMessages.filter(
      (m) =>
        m.text.toLowerCase().includes(q) ||
        m.userName.toLowerCase().includes(q)
    );

    setSearchResults({
      books: matchedBooks,
      savedDocuments: matchedDocs,
      communityMessages: matchedMsgs,
    });
  }, [searchQuery, books, savedDocuments, communityMessages]);

  // Bind Ctrl+K and Esc to toggle Search Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if (e.key === "Escape") {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Synchronize global theme styles
  useEffect(() => {
    const savedTheme = localStorage.getItem("WAFULA_THEME");
    if (savedTheme === "dark") {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("WAFULA_THEME", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("WAFULA_THEME", "light");
      }
      return next;
    });
  };

  // Monitors page scroll to display floating Back to Top button
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleBackToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleScrollToBottom = () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  };

  // Polished list of sidebar navigation items
  const navItems = [
    { id: "dashboard", label: "My Library", icon: <Trophy className="h-4 w-4" /> },
    { id: "store", label: "Digital Bookstore", icon: <BookOpen className="h-4 w-4" /> },
    { id: "sermons-motivation", label: "Sermons, Motivation & Worship", icon: <Video className="h-4 w-4" /> },
    { id: "school", label: "Leadership & Bible School", icon: <Compass className="h-4 w-4 text-blue-400" /> },
    { id: "devotional", label: "Devotional Bible", icon: <HelpCircle className="h-4 w-4" /> },
    { id: "offline-dictionary", label: "Bible Dictionary", icon: <BookOpen className="h-4 w-4 text-indigo-400" /> },
    { id: "companion", label: "Study Assistant Chat", icon: <MessageSquare className="h-4 w-4" /> },
    { id: "studio", label: "Doc Studio Editor", icon: <FileText className="h-4 w-4" /> },
    { id: "threed-loft", label: "3D Bookstore Loft", icon: <Compass className="h-4 w-4 text-teal-500" /> },
    { id: "community", label: "Community Forum", icon: <MessageSquare className="h-4 w-4" /> },
    { id: "announcements", label: "Campus Announcements", icon: <Megaphone className="h-4 w-4" /> },
    { id: "website-center", label: "Website Center", icon: <Globe className="h-4 w-4 text-rose-500" /> },
    { id: "playstore-hub", label: "Android Play Store Hub", icon: <Smartphone className="h-4 w-4 text-emerald-400" /> },
    { id: "campuses-map", label: "Campuses & Map Locator", icon: <MapPin className="h-4 w-4 text-[#FB923C]" /> },
    { id: "contact", label: "Contact Us", icon: <HelpCircle className="h-4 w-4" /> },
  ];

  // Grouped navigation for sidebar
  const groupedNavigation = [
    {
      category: "📖 BOOKS, SERMONS & WORSHIP MEDIA",
      items: [
        { id: "store", label: "Digital Bookstore", icon: <BookOpen className="h-4 w-4 text-[#818CF8]" /> },
        { id: "sermons-motivation", label: "Sermons, Motivation & Worship", icon: <Video className="h-4 w-4 text-amber-500" /> },
        { id: "dashboard", label: "My Library Dashboard", icon: <Trophy className="h-4 w-4 text-amber-500" /> },
        { id: "threed-loft", label: "3D Bookstore Loft", icon: <Compass className="h-4 w-4 text-[#2DD4BF]" /> },
      ]
    },
    {
      category: "🎓 LEADERSHIP & BIBLE SCHOOL",
      items: [
        { id: "school", label: "Leadership & Bible School", icon: <Compass className="h-4 w-4 text-[#60A5FA]" /> },
        { id: "devotional", label: "Devotional Bible", icon: <HelpCircle className="h-4 w-4 text-[#34D399]" /> },
        { id: "offline-dictionary", label: "Bible & Theological Dictionary", icon: <BookOpen className="h-4 w-4 text-[#818CF8]" /> },
      ]
    },
    {
      category: "💡 AI STUDY & PUBLISHING",
      items: [
        { id: "companion", label: "Study Assistant Chat", icon: <MessageSquare className="h-4 w-4 text-emerald-400" /> },
        { id: "studio", label: "Doc Studio & Publishing", icon: <FileText className="h-4 w-4 text-slate-400" /> },
      ]
    },
    {
      category: "🤝 FELLOWSHIP & CAMPUS",
      items: [
        { id: "community", label: "Community Forum", icon: <MessageSquare className="h-4 w-4 text-[#34D399]" /> },
        { id: "announcements", label: "Campus Announcements", icon: <Megaphone className="h-4 w-4 text-[#F87171]" /> },
        { id: "campuses-map", label: "Campuses & Map Locator", icon: <MapPin className="h-4 w-4 text-[#FB923C]" /> },
        { id: "contact", label: "Contact Us", icon: <HelpCircle className="h-4 w-4 text-[#38BDF8]" /> },
      ]
    },
    {
      category: "🌐 SERVICES & ADMIN",
      items: [
        { id: "mpesa-api", label: "Safaricom M-Pesa Console", icon: <CreditCard className="h-4 w-4 text-[#34D399]" /> },
        { id: "gmail", label: "Google Workspace Hub", icon: <Mail className="h-4 w-4 text-[#F87171]" /> },
        { id: "website-center", label: "Website Center", icon: <Globe className="h-4 w-4 text-[#60A5FA]" /> },
        { id: "playstore-hub", label: "Android Play Store Hub", icon: <Smartphone className="h-4 w-4 text-emerald-400" /> },
      ]
    }
  ];

  const handleItemClick = (id: string) => {
    onNavigate(id);
    setIsSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  return (
    <>
      {/* 1. DESKTOP PERMANENT LEFT SIDEBAR */}
      <aside 
        id="desktop_left_sidebar" 
        className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-52 bg-[#FAF8F4] dark:bg-[#141210] text-[#1F1B18] dark:text-[#F5F1EB] flex-col h-full border-r border-[#E7E1D8] dark:border-[#332C26] select-none text-left transition-colors"
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-[#E7E1D8] dark:border-[#332C26]">
          <div className="flex items-center space-x-3 text-left">
            <div className="relative shrink-0">
              <img
                src={globalSettings?.customLogoUrl || appLogo}
                alt="Zion Digital"
                className="h-9 w-9 rounded-full object-cover border border-[#E7E1D8] dark:border-[#332C26] shadow-xs"
              />
            </div>
             <div 
               onClick={() => handleItemClick("store")} 
               className="text-left hover:opacity-90 flex-grow cursor-pointer"
             >
               <h1 className="text-base font-bold tracking-tight text-[#1F1B18] dark:text-[#F5F1EB] font-serif leading-tight">
                 Zion <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-[#6E655E] dark:text-[#B6ABA0] font-semibold">DIGITAL</span>
               </h1>
               <div className="flex flex-col space-y-1 mt-0.5 text-left">
                 <div className="flex items-center space-x-1.5">
                   <p className="text-[9px] text-[#6E655E] dark:text-[#B6ABA0] uppercase tracking-widest font-mono">Bungoma, Kenya</p>
                   <span className={`inline-block h-1.5 w-1.5 rounded-full ${isOnline ? "bg-emerald-600" : "bg-amber-600"}`} />
                 </div>
                 {onToggleOfflineMode && (
                   <button
                     type="button"
                     onClick={(e) => { e.stopPropagation(); onToggleOfflineMode(); }}
                     className={`mt-1 flex items-center justify-between px-2 py-1 rounded border text-[8.5px] font-mono font-bold tracking-wider transition cursor-pointer select-none leading-none ${
                       offlineMode
                         ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                         : "bg-white dark:bg-[#1E1A17] text-[#6E655E] dark:text-[#B6ABA0] border-[#E7E1D8] dark:border-[#332C26] hover:border-[#A8421B]"
                     }`}
                   >
                     <span>{offlineMode ? "Offline Study Active" : "Sync Mode"}</span>
                   </button>
                 )}
               </div>
             </div>
          </div>
        </div>

        {/* Sidebar Navigation Options */}
        <nav className="flex-grow py-4 px-3 overflow-y-auto space-y-4 custom-scrollbar">
          {groupedNavigation.map((sec, idx) => {
            return (
              <div key={idx} className="pb-2.5 border-b border-[#E7E1D8]/70 dark:border-[#332C26] last:border-0 last:pb-0">
                {sec.category && (
                  <div className="w-full flex items-center justify-between px-3 py-1 text-[9px] uppercase tracking-wider text-[#6E655E] dark:text-[#B6ABA0] font-bold mb-1 font-mono select-none">
                    <span>{sec.category}</span>
                  </div>
                )}
                <div className="space-y-0.5">
                  {sec.items.map((item) => {
                    const isActive = currentView === item.id;
                    return (
                      <button
                        key={`${item.id}-${item.label}`}
                        onClick={() => handleItemClick(item.id)}
                        className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          isActive 
                            ? "bg-[#A8421B] text-white shadow-xs font-bold" 
                            : "text-[#1F1B18]/80 dark:text-[#F5F1EB]/80 hover:text-[#1F1B18] dark:hover:text-white hover:bg-[#EFECE6] dark:hover:bg-[#1E1A17]"
                        }`}
                      >
                        {item.icon && (
                          <span className={`flex shrink-0 items-center justify-center ${isActive ? "[&_svg]:text-white" : ""}`}>
                            {item.icon}
                          </span>
                        )}
                        <span className="text-left whitespace-normal break-words leading-tight py-0.5">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {isManager && (
            <div className="pt-2 mt-2 border-t border-[#E7E1D8] dark:border-[#332C26] space-y-1">
              <button
                onClick={() => handleItemClick("manager-portal")}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentView === "manager-portal"
                    ? "bg-[#A8421B] text-white shadow-xs"
                    : "text-[#A8421B] dark:text-[#E5865E] hover:bg-[#A8421B]/10"
                }`}
              >
                <Crown className="h-4 w-4 shrink-0" />
                <span>Manager Portal</span>
              </button>
              {isAdmin && (
                <button
                  onClick={() => handleItemClick("admin")}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    currentView === "admin"
                      ? "bg-[#1F1B18] dark:bg-[#D96B3E] text-white shadow-xs"
                      : "text-[#1F1B18] dark:text-[#F5F1EB] hover:bg-[#EFECE6] dark:hover:bg-[#1E1A17]"
                  }`}
                >
                  <ShieldCheck className="h-4 w-4 shrink-0 text-[#A8421B] dark:text-[#D96B3E]" />
                  <span>Admin Panel</span>
                </button>
              )}
            </div>
          )}
        </nav>

        {/* Display Preferences */}
        <div className="p-4 bg-[#F7F4EE] dark:bg-[#1E1A17] border-t border-[#E7E1D8] dark:border-[#332C26] text-left space-y-3 select-none">
          <span className="text-[9px] font-mono uppercase tracking-wider text-[#6E655E] dark:text-[#B6ABA0] font-bold block">
            Reading Preferences
          </span>

          <div className="space-y-1">
            <select
              value={selectedFont}
              onChange={(e) => setSelectedFont(e.target.value)}
              className="w-full bg-white dark:bg-[#141210] text-[#1F1B18] dark:text-[#F5F1EB] border border-[#E7E1D8] dark:border-[#332C26] rounded-lg px-2.5 py-1.5 text-[11px] font-semibold focus:outline-none focus:border-[#A8421B] cursor-pointer"
            >
              <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
              <option value="Playfair Display">Playfair Display (Editorial)</option>
              <option value="JetBrains Mono">JetBrains Mono</option>
            </select>
          </div>

          <button
            type="button"
            onClick={toggleDarkMode}
            className="w-full bg-white dark:bg-[#141210] hover:bg-[#FAF8F4] dark:hover:bg-[#26211D] text-[#1F1B18] dark:text-[#F5F1EB] border border-[#E7E1D8] dark:border-[#332C26] rounded-lg px-2.5 py-1.5 text-[11px] font-semibold flex items-center justify-between cursor-pointer transition"
          >
            <span className="flex items-center space-x-2">
              {isDarkMode ? <Sun className="h-3.5 w-3.5 text-amber-500 shrink-0" /> : <Moon className="h-3.5 w-3.5 text-[#6E655E] shrink-0" />}
              <span>{isDarkMode ? "Dark Mode" : "Warm Paper"}</span>
            </span>
            <span className="text-[9px] font-mono uppercase text-[#A8421B] dark:text-[#D96B3E] font-bold">Switch</span>
          </button>
        </div>

        {/* Vision Slogan footer */}
        <div className="p-4 bg-[#FAF8F4] dark:bg-[#141210] border-t border-[#E7E1D8] dark:border-[#332C26] text-left space-y-1">
          <p className="text-[9px] text-[#6E655E] dark:text-[#B6ABA0] font-bold uppercase tracking-wider">
            Our Promise
          </p>
          <p className="text-[10px] text-[#6E655E] dark:text-[#B6ABA0] italic font-serif leading-relaxed">
            Empowering leaders through scripture, knowledge, and fellowship.
          </p>
          <span className="inline-block text-[9px] font-mono text-[#A8421B] dark:text-[#D96B3E] bg-[#A8421B]/10 px-2 py-0.5 rounded font-bold mt-1">
            READ. LEAD. TRANSFORM.
          </span>
        </div>
      </aside>

      {/* 2. RESPONSIVE TOP HEADER BAR (Matches Warm Editorial Brand Header) */}
      <header 
        id="app_top_header" 
        className="sticky top-0 z-40 w-full border-b border-[#E7E1D8] dark:border-[#332C26] bg-[#FAF8F4]/95 dark:bg-[#141210]/95 backdrop-blur-md lg:pl-52 h-16 safe-area-top flex items-center justify-between px-3 sm:px-6 lg:px-8 transition-colors"
      >
        {/* Left Area: Adaptive Back Button & Mobile Logo Brand */}
        <div id="top_header_left_area" className="flex items-center space-x-2.5 shrink-0">
          {canGoBack && (
            <button
              onClick={onBack}
              className="flex items-center space-x-1 text-[11px] font-bold text-[#1F1B18] dark:text-[#F5F1EB] bg-white dark:bg-[#1E1A17] hover:border-[#A8421B] px-2.5 py-1.5 rounded-lg border border-[#E7E1D8] dark:border-[#332C26] transition cursor-pointer select-none shrink-0"
              title="Return to previous screen"
            >
              <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Back</span>
            </button>
          )}

          {/* Brand Mark */}
          <button 
            type="button"
            onClick={() => handleItemClick("store")} 
            className="flex items-center space-x-2 text-left cursor-pointer group"
          >
            <img 
              src={globalSettings?.customLogoUrl || appLogo} 
              alt="Zion Digital" 
              className="h-8 w-8 object-cover rounded-full border border-[#E7E1D8] dark:border-[#332C26] lg:hidden shadow-2xs" 
              referrerPolicy="no-referrer"
            />
            <div className="flex items-baseline space-x-1.5">
              <span className="font-serif text-base sm:text-lg font-bold tracking-tight text-[#1F1B18] dark:text-[#F5F1EB]">
                Zion
              </span>
              <span className="font-mono text-[9px] sm:text-[10px] tracking-[0.22em] uppercase text-[#6E655E] dark:text-[#B6ABA0] font-semibold">
                DIGITAL
              </span>
            </div>
          </button>
        </div>

        {/* Center Search Trigger (Desktop) */}
        <div className="hidden md:flex items-center bg-white dark:bg-[#1E1A17] border border-[#E7E1D8] dark:border-[#332C26] px-3 py-1.5 rounded-full w-72 lg:w-80 text-[#6E655E] dark:text-[#B6ABA0] focus-within:border-[#A8421B] transition">
          <Search className="h-3.5 w-3.5 shrink-0 mr-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!isSearchOpen && e.target.value.trim().length > 0) {
                setIsSearchOpen(true);
              }
            }}
            placeholder="Search books, courses, discussions..."
            className="w-full bg-transparent text-xs font-medium outline-none text-[#1F1B18] dark:text-[#F5F1EB] placeholder-[#6E655E]/70 mr-1 cursor-text"
          />
          {searchQuery && (
            <button 
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-[10px] text-[#6E655E] hover:text-[#1F1B18] mr-1.5 cursor-pointer font-bold"
            >
              Clear
            </button>
          )}
        </div>

        {/* Right Controls (Matches Screenshot Header Actions) */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5">
          {broadcastAnnouncement && isBannerClosed && (
            <button
              type="button"
              onClick={() => onRestoreBanner?.()}
              title="View campus updates"
              className="hidden sm:flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#A8421B]/10 text-[#A8421B] border border-[#A8421B]/30 cursor-pointer"
            >
              <Megaphone className="h-3 w-3" />
              <span>Updates</span>
            </button>
          )}

          {/* Quick Search Icon */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="flex md:hidden items-center justify-center h-8 w-8 rounded-full text-[#1F1B18] dark:text-[#F5F1EB] hover:bg-[#EFECE6] dark:hover:bg-[#1E1A17] transition cursor-pointer shrink-0"
            title="Search library"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Wishlist Shortcut */}
          <button
            type="button"
            onClick={() => handleItemClick("dashboard")}
            className="flex items-center justify-center h-8 w-8 rounded-full text-[#1F1B18] dark:text-[#F5F1EB] hover:bg-[#EFECE6] dark:hover:bg-[#1E1A17] transition cursor-pointer shrink-0"
            title="Saved books & library"
          >
            <BookOpen className="h-4 w-4" />
          </button>

          {/* Profile / Auth Button */}
          {currentUser && currentUser.role !== "guest" ? (
            <button
              type="button"
              onClick={() => handleItemClick("dashboard")}
              title="Open My Library & Profile"
              className="flex items-center justify-center h-8 w-8 rounded-full border border-[#E7E1D8] dark:border-[#332C26] bg-white dark:bg-[#1E1A17] text-[#1F1B18] dark:text-[#F5F1EB] hover:border-[#A8421B] transition cursor-pointer shrink-0"
            >
              <UserIcon className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onLogIn}
              className="px-3 py-1 rounded-full bg-[#A8421B] hover:bg-[#8F3614] text-white text-[11px] font-bold transition cursor-pointer shrink-0"
            >
              Sign In
            </button>
          )}

          {/* Green-tinted WhatsApp / Community Channel pill */}
          <button
            type="button"
            onClick={() => handleItemClick("community")}
            title="Open Community Rooms"
            className="hidden xs:flex sm:flex items-center px-2.5 py-1 rounded-lg border border-emerald-600/25 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition cursor-pointer shrink-0"
          >
            WhatsApp
          </button>

          {/* Manager Portal pill for authorized staff */}
          {isManager && (
            <button
              type="button"
              onClick={() => handleItemClick("manager-portal")}
              className={`flex items-center px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer shrink-0 ${
                currentView === "manager-portal"
                  ? "bg-[#A8421B] text-white border-[#A8421B]"
                  : "bg-white dark:bg-[#1E1A17] text-[#1F1B18] dark:text-[#F5F1EB] border-[#E7E1D8] dark:border-[#332C26] hover:border-[#A8421B]"
              }`}
            >
              Manager Portal
            </button>
          )}

          {/* Sleek Mode Quick Toggle (Desktop) */}
          {onToggleSleekMode && (
            <button
              type="button"
              onClick={onToggleSleekMode}
              title={sleekMode ? "Sleek Mode active" : "Switch to Sleek Mode"}
              className={`hidden xl:flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10.5px] font-semibold border transition cursor-pointer shrink-0 ${
                sleekMode
                  ? "bg-[#A8421B] text-white border-[#A8421B]"
                  : "bg-white dark:bg-[#1E1A17] text-[#6E655E] dark:text-[#B6ABA0] border-[#E7E1D8] dark:border-[#332C26] hover:text-[#1F1B18]"
              }`}
            >
              <Sparkles className="h-3 w-3 shrink-0" />
              <span>Sleek</span>
            </button>
          )}

          {/* Menu Drawer Trigger (Accessible on all screen sizes like Screenshot 1) */}
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="rounded-lg p-1.5 text-[#1F1B18] dark:text-[#F5F1EB] hover:bg-[#EFECE6] dark:hover:bg-[#1E1A17] transition cursor-pointer shrink-0"
            title="Open navigation menu"
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* 3. SUB-HEADER QUICK BAR */}
      {currentView !== "store" && (
        <div id="quick_back_navigation_bar" className="w-full bg-[#F7F4EE] dark:bg-[#1E1A17] border-b border-[#E7E1D8] dark:border-[#332C26] py-1.5 lg:pl-52 text-left">
          <div className="mr-auto ml-0 max-w-6xl flex items-center justify-between px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => handleItemClick("store")}
              className="flex items-center space-x-1.5 text-xs font-semibold text-[#6E655E] dark:text-[#B6ABA0] hover:text-[#A8421B] transition cursor-pointer"
            >
              <Home className="h-3.5 w-3.5" />
              <span>Back to Home</span>
            </button>

            <div className="flex items-center gap-2">
              {onOpenUpgrade && currentUser && currentUser.role !== "guest" && (
                <button
                  type="button"
                  onClick={onOpenUpgrade}
                  className="text-[11px] font-semibold text-[#A8421B] dark:text-[#D96B3E] hover:underline cursor-pointer"
                >
                  {currentUser.credits ?? 20} credits • Top Up (KES)
                </button>
              )}
              {canGoBack && (
                <button
                  onClick={onBack}
                  className="flex items-center space-x-1 text-xs font-semibold text-[#1F1B18] dark:text-[#F5F1EB] bg-white dark:bg-[#141210] border border-[#E7E1D8] dark:border-[#332C26] rounded-lg px-2.5 py-1 cursor-pointer transition"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. RIGHT EDITORIAL SLIDE-OVER MENU DRAWER (Matches Screenshot 1) */}
      {isSidebarOpen && (
        <div id="mobile_sidebar_backdrop" className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-[#1F1B18]/45 backdrop-blur-xs" onClick={() => setIsSidebarOpen(false)} />
          <aside id="mobile_sidebar_content" className="relative flex w-80 max-w-[85vw] flex-col bg-[#FAF8F4] dark:bg-[#141210] p-6 safe-area-top safe-area-bottom shadow-2xl h-full text-left border-l border-[#E7E1D8] dark:border-[#332C26]">
            <div className="flex items-center justify-between border-b border-[#E7E1D8] dark:border-[#332C26] pb-4 mb-4">
              <div className="flex items-center space-x-2.5">
                <img
                  src={globalSettings?.customLogoUrl || appLogo}
                  alt="Zion Digital"
                  className="h-7 w-7 rounded-full object-cover border border-[#E7E1D8] dark:border-[#332C26]"
                />
                <span className="font-serif font-bold text-[#1F1B18] dark:text-[#F5F1EB] text-sm">Zion Digital</span>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="rounded-full h-8 w-8 border border-[#E7E1D8] dark:border-[#332C26] flex items-center justify-center text-[#6E655E] hover:text-[#1F1B18] dark:text-[#B6ABA0] dark:hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="flex-grow space-y-1 overflow-y-auto pr-1 custom-scrollbar">
              {[
                { id: "store", label: "Store" },
                { id: "community", label: "Community" },
                { id: "announcements", label: "Social & Notices" },
                { id: "school", label: "Leadership School" },
                { id: "companion", label: "AI Study Chat" },
                { id: "devotional", label: "Holy Bible (NIV)" },
                { id: "offline-dictionary", label: "Bible Dictionary" },
                { id: "sermons-motivation", label: "Sermons & Media" },
                { id: "threed-loft", label: "3D Bookstore Loft" },
                { id: "studio", label: "Doc Studio" },
                { id: "dashboard", label: "My Library" },
                { id: "campuses-map", label: "Campuses & Map" },
                { id: "contact", label: "Contact" },
                { id: "website-center", label: "Website & App Hub" },
                { id: "playstore-hub", label: "Android & Windows Apps" },
              ].map((item) => {
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                      isActive
                        ? "bg-[#A8421B]/10 text-[#A8421B] dark:text-[#D96B3E] font-bold"
                        : "text-[#1F1B18] dark:text-[#F5F1EB] hover:bg-[#EFECE6] dark:hover:bg-[#1E1A17]"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}

              {isManager && (
                <button
                  onClick={() => handleItemClick("manager-portal")}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm font-bold text-[#A8421B] dark:text-[#D96B3E] hover:bg-[#A8421B]/10 transition cursor-pointer mt-2"
                >
                  Manager Portal
                </button>
              )}

              {isAdmin && (
                <button
                  onClick={() => handleItemClick("admin")}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm font-bold text-[#1F1B18] dark:text-[#F5F1EB] hover:bg-[#EFECE6] dark:hover:bg-[#1E1A17] transition cursor-pointer"
                >
                  Admin Panel
                </button>
              )}
            </nav>

            {/* Drawer Display Controls */}
            <div className="border-t border-[#E7E1D8] dark:border-[#332C26] pt-3 space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={toggleDarkMode}
                  className="bg-white dark:bg-[#1E1A17] border border-[#E7E1D8] dark:border-[#332C26] text-[#1F1B18] dark:text-[#F5F1EB] text-[11px] font-semibold rounded-lg py-2 flex items-center justify-center space-x-1.5 transition cursor-pointer"
                >
                  {isDarkMode ? <Sun className="h-3.5 w-3.5 text-amber-500 shrink-0" /> : <Moon className="h-3.5 w-3.5 text-[#6E655E] shrink-0" />}
                  <span>{isDarkMode ? "Light" : "Dark"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsModalOpen(true);
                    setIsSidebarOpen(false);
                  }}
                  className="bg-white dark:bg-[#1E1A17] border border-[#E7E1D8] dark:border-[#332C26] text-[#1F1B18] dark:text-[#F5F1EB] text-[11px] font-semibold rounded-lg py-2 flex items-center justify-center space-x-1.5 transition cursor-pointer"
                >
                  <Settings className="h-3.5 w-3.5 shrink-0" />
                  <span>Storage</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleInstallApp}
                className="w-full bg-[#1F1B18] dark:bg-[#D96B3E] hover:opacity-90 text-white text-xs font-bold rounded-lg py-2 flex items-center justify-center space-x-1.5 transition cursor-pointer"
              >
                <Smartphone className="h-3.5 w-3.5 shrink-0" />
                <span>Install App (Android / PC)</span>
              </button>

              {currentUser && currentUser.role !== "guest" ? (
                <div className="space-y-2 pt-2 border-t border-[#E7E1D8] dark:border-[#332C26]">
                  <div className="flex items-center space-x-2.5">
                    <div className="h-8 w-8 rounded-full bg-[#A8421B] flex items-center justify-center text-white font-bold text-xs">
                      {currentUser.name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#1F1B18] dark:text-[#F5F1EB] truncate">{currentUser.name}</p>
                      <p className="text-[10px] text-[#6E655E] dark:text-[#B6ABA0] truncate">{currentUser.email}</p>
                    </div>
                  </div>
                  {onOpenUpgrade && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenUpgrade();
                        setIsSidebarOpen(false);
                      }}
                      className="flex w-full items-center justify-center space-x-2 rounded-lg bg-[#A8421B] hover:bg-[#8F3614] py-2 text-xs font-bold text-white cursor-pointer"
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                      <span>M-Pesa / Card Top-Up (KES)</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      onLogOut();
                      setIsSidebarOpen(false);
                    }}
                    className="flex w-full justify-center rounded-lg border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 py-2 text-xs font-bold text-rose-700 dark:text-rose-300 cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    onLogIn();
                    setIsSidebarOpen(false);
                  }}
                  className="flex w-full justify-center rounded-lg bg-[#A8421B] py-2.5 text-xs font-bold text-white hover:bg-[#8F3614] cursor-pointer"
                >
                  Sign In to Zion Digital
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Real-time Global Search Overlay Modal (Fulfills Ctrl+K shortcut & search requirements) */}
      {isSearchOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] flex items-start justify-center p-4 pt-16 sm:pt-28">
          {/* Backdrop click handlers */}
          <div className="fixed inset-0 cursor-default" onClick={() => setIsSearchOpen(false)} />

          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[70vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-xs">
            {/* Search input header */}
            <div className="flex items-center space-x-3 p-4 border-b border-slate-100 dark:border-slate-800">
              <Search className="h-5 w-5 text-slate-400 shrink-0" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type title, author, drafts, folders, keywords or forum posts..."
                className="w-full bg-transparent text-sm font-semibold outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400"
              />
              <button
                onClick={() => setIsSearchOpen(false)}
                className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-mono font-bold text-slate-500 hover:text-slate-700 text-[10px] leading-none transition"
              >
                ESC
              </button>
            </div>

            {/* Matching Results Section */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {!searchQuery.trim() ? (
                <div className="text-center py-10 space-y-2">
                  <span className="text-3xl">🔑</span>
                  <h4 className="font-display font-black text-slate-850 dark:text-slate-200 text-sm">Wafula Knowledge Search</h4>
                  <p className="text-stone-400 dark:text-slate-500 max-w-sm mx-auto leading-relaxed text-[11px]">
                    Type keywords above to scan and filter through books in the Digital Store, outlines saved in your Doc Studio, and community discussions.
                  </p>
                </div>
              ) : (searchResults.books.length === 0 &&
                   searchResults.savedDocuments.length === 0 &&
                   searchResults.communityMessages.length === 0) ? (
                <div className="text-center py-12 space-y-1.5">
                  <span className="text-3xl">🔭</span>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">No matches found</h4>
                  <p className="text-[11px] text-stone-400 dark:text-slate-500">We couldn't locate documents or discussions matching "{searchQuery}"</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Category 1: Books */}
                  {searchResults.books.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-mono tracking-widest text-orange-700 font-black block">
                        Books & Literature ({searchResults.books.length})
                      </span>
                      <div className="grid gap-2">
                        {searchResults.books.map((book) => (
                          <div
                            key={book.id}
                            onClick={() => {
                              onNavigate("store");
                              setIsSearchOpen(false);
                            }}
                            className="p-3 border border-slate-100 dark:border-slate-800 hover:border-orange-200 bg-slate-50 hover:bg-orange-50/20 rounded-xl transition cursor-pointer flex items-center justify-between text-left"
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              <div className="h-10 w-8 bg-slate-200 dark:bg-slate-700 rounded-sm overflow-hidden shrink-0 shadow-xs">
                                <img src={book.coverImage} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-slate-850 dark:text-slate-200 truncate">{book.title}</h4>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium font-mono text-left">
                                  by {book.author} • {book.category}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] bg-orange-100 text-orange-700 font-bold px-2.5 py-1 rounded-md shrink-0 uppercase tracking-wide">
                              View Store
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category 2: Drafts & Saved Documents */}
                  {searchResults.savedDocuments.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="text-[10px] uppercase font-mono tracking-widest text-red-500 font-black block">
                        Doc Studio Drafts ({searchResults.savedDocuments.length})
                      </span>
                      <div className="grid gap-2">
                        {searchResults.savedDocuments.map((doc) => (
                          <div
                            key={doc.id}
                            onClick={() => {
                              onNavigate("studio");
                              setIsSearchOpen(false);
                            }}
                            className="p-3 border border-slate-100 dark:border-slate-800 hover:border-red-200 dark:hover:border-red-900 bg-slate-50 dark:bg-slate-850 hover:bg-rose-50/20 dark:hover:bg-rose-950/20 rounded-xl transition cursor-pointer flex items-center justify-between text-left"
                          >
                            <div className="min-w-0 flex-1 pr-3">
                              <h4 className="font-bold text-slate-850 dark:text-slate-200 truncate">{doc.title}</h4>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium font-mono">
                                Folder: {doc.folder} • Modified: {doc.date}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 italic mt-1 font-mono">
                                "{doc.content}"
                              </p>
                            </div>
                            <span className="text-[10px] bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-bold px-2.5 py-1 rounded-md shrink-0 uppercase tracking-wide">
                              Edit Draft
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category 3: Conversations & Topics */}
                  {searchResults.communityMessages.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-500 font-black block">
                        Community Discussions ({searchResults.communityMessages.length})
                      </span>
                      <div className="grid gap-2">
                        {searchResults.communityMessages.map((msg) => (
                          <div
                            key={msg.id}
                            onClick={() => {
                              onNavigate("community");
                              setIsSearchOpen(false);
                            }}
                            className="p-3 border border-slate-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-900 bg-slate-50 dark:bg-slate-850 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 rounded-xl transition cursor-pointer flex items-center justify-between text-left"
                          >
                            <div className="min-w-0 flex-1 pr-3">
                              <div className="flex items-center space-x-1.5 mb-1">
                                <span className="font-bold text-slate-800 dark:text-slate-200">{msg.userName}</span>
                                <span className="text-[10px] text-slate-400 font-mono font-medium">in {msg.channel}</span>
                              </div>
                              <p className="text-[11px] text-slate-600 dark:text-slate-450 line-clamp-1 leading-relaxed">
                                "{msg.text}"
                              </p>
                              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                                Posted: {msg.date} at {msg.time}
                              </p>
                            </div>
                            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold px-2.5 py-1 rounded-md shrink-0 uppercase tracking-wide">
                              Jump To forum
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Hint Footer bar */}
            <div className="bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between font-mono text-[9px] text-slate-400 dark:text-slate-500 tracking-wide">
              <span>Navigate results with ease • Press Esc to cancel</span>
              <span>© Zion Global Digital Hub</span>
            </div>
          </div>
        </div>
      )}

      {/* 5. DOWNLOAD APP STEP-BY-STEP MODAL GUIDE */}
      {showHowToInstallModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="fixed inset-0 cursor-default" onClick={() => setShowHowToInstallModal(false)} />
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-250 select-text">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-600 to-red-800 text-white p-6 relative">
              <button 
                onClick={() => setShowHowToInstallModal(false)}
                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="space-y-1 text-left">
                <span className="text-[9px] font-mono select-none px-2 py-0.5 rounded bg-white/20 text-white font-bold inline-block uppercase tracking-wider">
                  Progressive Web App (PWA)
                </span>
                <h3 className="text-lg font-extrabold tracking-tight font-display">Install Wafula Digital</h3>
                <p className="text-xs text-orange-100 leading-relaxed font-medium">
                  Add the workspace platform straight to your desktop docks, PC app drawer, or smartphone home screen. Instantly sync articles, documents, and books offline!
                </p>
              </div>
            </div>

            {/* Guides Section */}
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar text-left text-xs text-slate-700 dark:text-slate-300">
              
              <div className="grid gap-4 sm:grid-cols-2">
                
                {/* PC/Mac card */}
                <div className="p-3 border border-slate-100 dark:border-slate-850 bg-slate-50 dark:bg-slate-850 rounded-xl space-y-1">
                  <h4 className="font-bold text-slate-800 dark:text-slate-150">Windows, Mac & PC</h4>
                  <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                    Look at the browser URL address bar. Click the <strong>Install</strong> symbol (monitor with arrow or ⊕ icon) right on the right end of the bar, then confirm installation!
                  </p>
                </div>

                {/* iPhone card */}
                <div className="p-3 border border-slate-100 dark:border-slate-850 bg-slate-50 dark:bg-slate-850 rounded-xl space-y-1">
                  <h4 className="font-bold text-slate-800 dark:text-slate-150">iPhone / iPad (Apple)</h4>
                  <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                    Open this app in <strong>Safari</strong> browser. Tap the <strong>Share</strong> button at the bottom, swipe down, and tap <strong>Add to Home Screen</strong>.
                  </p>
                </div>

                {/* Android card */}
                <div className="p-3 border border-slate-100 dark:border-slate-850 bg-slate-50 dark:bg-slate-850 rounded-xl space-y-1">
                  <h4 className="font-bold text-slate-800 dark:text-slate-150">Android Phones</h4>
                  <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                    Open in Chrome or Edge. Select the option menu (three dots <strong>⋮</strong>) in the top-right corner, and tap <strong>Install App</strong> or <strong>Add to Home Screen</strong>.
                  </p>
                </div>

                {/* Enterprise scaling */}
                <div className="p-3 border border-slate-200 dark:border-slate-800 bg-orange-50/40 dark:bg-blue-950/20 rounded-xl space-y-1">
                  <h4 className="font-bold text-orange-700 dark:text-blue-400">Global Cloud Scale</h4>
                  <p className="text-[11px] leading-relaxed text-stone-700/80 dark:text-slate-300">
                    Supports 200,000+ members database capacity with auto-background app cache synchronization over Cloud Firestore!
                  </p>
                </div>

              </div>

              {/* Install trigger alert if browser does prompt */}
              {isInstallable && (
                <div className="p-3 rounded-lg bg-green-50 dark:bg-emerald-950/30 border border-green-200 dark:border-emerald-900/40 text-[11px] text-green-800 dark:text-green-400 font-medium flex items-center justify-between">
                  <span>Your browser supports instant standalone setup right now!</span>
                  <button
                    onClick={() => {
                      setShowHowToInstallModal(false);
                      handleInstallApp();
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1 rounded transition whitespace-nowrap"
                  >
                    Install Now
                  </button>
                </div>
              )}

              {/* App Stores Links and Badges */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2.5">
                <span className="block text-slate-500 font-bold uppercase tracking-wide text-[10px]">
                  Official Native Markets & Stores
                </span>
                <div className="flex flex-wrap gap-2.5">
                  <a
                    href="https://play.google.com/store"
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 min-w-[130px] flex items-center space-x-2 bg-slate-900 border border-slate-850 hover:bg-black text-white p-2.5 rounded-lg transition-all"
                  >
                    <Smartphone className="h-5 w-5 text-emerald-400" />
                    <div className="text-left font-sans">
                      <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider leading-tight">Get it on</p>
                      <p className="text-xs font-extrabold leading-tight">Google Play</p>
                    </div>
                  </a>
                  <a
                    href="https://www.apple.com/app-store"
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 min-w-[130px] flex items-center space-x-2 bg-slate-900 border border-slate-850 hover:bg-black text-white p-2.5 rounded-lg transition-all"
                  >
                    <Smartphone className="h-5 w-5 text-amber-400" />
                    <div className="text-left font-sans">
                      <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider leading-tight">Download on the</p>
                      <p className="text-xs font-extrabold leading-tight">App Store</p>
                    </div>
                  </a>
                  <a
                    href="https://apps.microsoft.com"
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 min-w-[130px] flex items-center space-x-2 bg-slate-900 border border-slate-850 hover:bg-black text-white p-2.5 rounded-lg transition-all"
                  >
                    <Monitor className="h-5 w-5 text-blue-400" />
                    <div className="text-left font-sans">
                      <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider leading-tight">Get it from</p>
                      <p className="text-xs font-extrabold leading-tight">Microsoft Store</p>
                    </div>
                  </a>
                </div>
              </div>

            </div>

            {/* Hint footer and Close */}
            <div className="bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 p-4 flex justify-between items-center text-[10px] text-slate-400 select-none">
              <span>Fast & Data Efficient • Standalone Mode</span>
              <button
                onClick={() => setShowHowToInstallModal(false)}
                className="bg-slate-900 hover:bg-slate-850 dark:bg-slate-800 dark:hover:bg-slate-750 text-white font-bold px-4 py-2 rounded-lg transition text-xs font-sans cursor-pointer"
              >
                Close Window
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Floating Scroll Controls Dock (Top & Bottom) */}
      <div 
        id="quick_scroll_controls_dock" 
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 select-none"
      >
        {/* Scroll To Top button */}
        {showBackToTop && (
          <button
            onClick={handleBackToTop}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-700 text-white shadow-xl hover:bg-orange-850 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer animate-fade-in"
            title="Scroll back to top"
          >
            <ArrowUp className="h-5 w-5 font-black" />
          </button>
        )}

        {/* Scroll To Bottom button */}
        <button
          onClick={handleScrollToBottom}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 border border-slate-800 text-white shadow-xl hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer"
          title="Scroll to bottom"
        >
          <ArrowDown className="h-5 w-5 font-black" />
        </button>
      </div>

      {/* 5. ZION UNIFIED SETTINGS PANEL & OFFLINE MANAGER */}
      {isSettingsModalOpen && (
        <div id="zion_unified_settings_modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md font-sans">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-left">
            
            {/* Header */}
            <div className="p-5 bg-slate-950 border-b border-slate-850 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-mono select-none px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 font-bold inline-block uppercase tracking-wider mb-1">
                  System Settings Manager
                </span>
                <h3 className="text-base font-extrabold text-white tracking-tight">Zion Digital Settings</h3>
              </div>
              <button 
                onClick={() => {
                  setIsSettingsModalOpen(false);
                  setSelectedPresetIndex(null);
                  setAdminCheckedConfirmation(false);
                }}
                className="h-8 w-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs List */}
            <div className="flex border-b border-slate-850 bg-slate-950/60 px-4">
              <button
                type="button"
                onClick={() => setActiveSettingsTab("offline")}
                className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center space-x-2 ${
                  activeSettingsTab === "offline" 
                    ? "border-amber-500 text-amber-500" 
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                <HardDrive className="h-3.5 w-3.5 shrink-0" />
                <span>Offline Cache & Media</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSettingsTab("branding")}
                className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center space-x-2 ${
                  activeSettingsTab === "branding" 
                    ? "border-amber-500 text-amber-500" 
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                <Database className="h-3.5 w-3.5 shrink-0" />
                <span>Branding Presets</span>
              </button>
            </div>

            {/* Offline Tab Content */}
            {activeSettingsTab === "offline" && (
              <div className="p-6 space-y-4 max-h-[55vh] overflow-y-auto custom-scrollbar text-slate-200">
                <div className="bg-amber-950/20 border border-amber-900/30 p-3.5 rounded-xl text-amber-300 flex items-start space-x-3 text-[11px] leading-relaxed">
                  <span className="text-sm mt-0.5">💾</span>
                  <div>
                    <span className="font-bold block">Offline-First Synchronization active.</span>
                    Use this system panel to audit client-side IndexedDB databases. Pruning large cached document files free up storage on your workstation, phone, or laptop.
                  </div>
                </div>

                {/* Estimate panel */}
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850/70 space-y-1">
                    <span className="text-[9px] uppercase font-mono tracking-wider text-slate-400 font-bold block">Estimated Storage Usage</span>
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-2xl font-black text-white">
                        {storageEstimate 
                          ? `${(storageEstimate.usage / (1024 * 1024)).toFixed(2)} MB` 
                          : `${(offlineCaches.reduce((acc, c) => acc + c.size, 0) / (1024 * 1024)).toFixed(2)} MB`}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">used</span>
                    </div>
                    {storageEstimate && (
                      <div className="w-full bg-slate-850 h-1.5 rounded-full overflow-hidden mt-1.5">
                        <div 
                          className="bg-amber-500 h-full transition-all duration-300" 
                          style={{ width: `${Math.min(100, (storageEstimate.usage / storageEstimate.quota) * 100 || 1)}%` }} 
                        />
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850/70 space-y-1">
                    <span className="text-[9px] uppercase font-mono tracking-wider text-slate-400 font-bold block">Reader Notes & Highlights</span>
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-2xl font-black text-white">{annotationCount}</span>
                      <span className="text-[10px] text-slate-500 font-mono">active records</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearAnnotations}
                      disabled={annotationCount === 0}
                      className="text-[10.5px] text-red-400 hover:text-red-300 font-bold underline transition disabled:opacity-50 text-left mt-2 block bg-transparent"
                    >
                      Clear Reader Notes
                    </button>
                  </div>
                </div>

                {/* Action Row */}
                <div className="flex justify-between items-center bg-slate-950/50 p-3 rounded-xl border border-slate-800/60">
                  <span className="text-[11px] font-bold text-slate-350">IndexedDB Cache Management:</span>
                  <button
                    type="button"
                    onClick={handlePruneAllLocalCache}
                    disabled={offlineCaches.length === 0}
                    className="text-[10.5px] bg-red-950/40 hover:bg-red-950/70 text-red-400 hover:text-red-300 border border-red-900/60 font-bold px-3 py-1.5 rounded-lg transition disabled:opacity-40 cursor-pointer"
                  >
                    Purge All Cached Files
                  </button>
                </div>

                {/* Cached Items list */}
                <div className="space-y-3">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-mono block">
                    Cached Documents Inventory ({offlineCaches.length})
                  </label>
                  
                  <div className="flex items-center bg-slate-950/80 border border-slate-850 rounded-xl px-3 py-2 text-slate-400">
                    <Search className="h-4 w-4 mr-2 shrink-0 text-slate-500" />
                    <input
                      type="text"
                      value={settingsSearchQuery}
                      onChange={(e) => setSettingsSearchQuery(e.target.value)}
                      placeholder="Filter cached documents by title..."
                      className="bg-transparent text-xs outline-none w-full text-white placeholder-slate-600"
                    />
                  </div>

                  <div className="space-y-2">
                    {cacheLoading ? (
                      <div className="text-center py-6 text-xs text-slate-500 flex items-center justify-center space-x-2">
                        <span className="inline-block h-3.5 w-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        <span>Scanning IndexedDB inventory...</span>
                      </div>
                    ) : offlineCaches.filter(c => c.title.toLowerCase().includes(settingsSearchQuery.toLowerCase())).length === 0 ? (
                      <div className="text-center py-8 bg-slate-950/30 border border-slate-850/60 rounded-2xl space-y-1.5">
                        <span className="text-2xl block">📂</span>
                        <p className="text-xs font-bold text-slate-400">No cached documents found</p>
                        <p className="text-[10px] text-slate-500 leading-normal max-w-xs mx-auto">
                          Documents and media files will automatically cache locally in IndexedDB once opened in the eBook Reader.
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-2 max-h-[220px] overflow-y-auto custom-scrollbar">
                        {offlineCaches.filter(c => c.title.toLowerCase().includes(settingsSearchQuery.toLowerCase())).map((item) => (
                          <div key={item.bookId} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-850/80 hover:border-slate-800 transition">
                            <div className="min-w-0 flex-1 pr-3">
                              <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                              <p className="text-[10px] text-slate-400 font-mono leading-tight mt-0.5">
                                Author: {item.author} • <span className="text-amber-400 font-semibold">{(item.size / (1024 * 1024)).toFixed(2)} MB</span>
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handlePruneCacheItem(item.bookId)}
                              title="Clear document cache"
                              className="p-1.5 rounded-lg hover:bg-red-950/40 text-red-400 hover:text-red-300 transition cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Branding Tab Content */}
            {activeSettingsTab === "branding" && (
              <div className="p-6 space-y-4 max-h-[55vh] overflow-y-auto custom-scrollbar">
                <div className="bg-amber-950/40 border border-amber-900/40 p-3.5 rounded-xl text-amber-350 text-[11px] leading-relaxed">
                  <span className="font-bold">Security Directive Enforced:</span> In accordance with the Admin Council protocols, uploading arbitrary image assets is restricted to prevent memory bloat and offline cache degradation. System logos must be selected from the certified vector graphic presets below.
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                    Select Official Branding Emblem:
                  </label>
                  
                  <div className="grid gap-3 sm:grid-cols-2">
                    {ZION_POST_DRAFT_PRESETS.map((preset, index) => {
                      const isSelected = selectedPresetIndex === index;
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setSelectedPresetIndex(index)}
                          className={`p-3 rounded-xl border text-left flex items-start space-x-3 transition-all cursor-pointer ${
                            isSelected 
                              ? "bg-slate-850/80 border-blue-500 shadow-lg shadow-blue-950/50" 
                              : "bg-slate-950/40 border-slate-850 hover:bg-slate-850/70"
                          }`}
                        >
                          <img 
                            src={preset.svgData} 
                            alt={preset.name} 
                            className="h-10 w-10 shrink-0 rounded-lg shadow-md bg-slate-900"
                            referrerPolicy="no-referrer"
                          />
                          <div className="space-y-0.5 overflow-hidden">
                            <h4 className="text-[11px] font-bold text-white leading-tight truncate">{preset.name}</h4>
                            <p className="text-[9px] text-slate-400 leading-normal line-clamp-2">{preset.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-4 border-t border-slate-850/60 space-y-3">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                      Administrator Certification:
                    </label>
                    
                    <label className="flex items-start space-x-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-850 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={adminCheckedConfirmation}
                        onChange={(e) => setAdminCheckedConfirmation(e.target.checked)}
                        className="mt-0.5 rounded border-slate-800 text-blue-600 bg-slate-900 focus:ring-0 focus:ring-offset-0 shrink-0 h-4 w-4 cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-bold text-slate-150 leading-tight block text-left">
                          I explicitly authorize this system logo modification
                        </span>
                        <span className="text-[9px] text-slate-400 block leading-normal text-left">
                          Confirming that this branding icon update conforms to Zion Digital Council safety standards and approves synchronizing this across all active devices in Kenya.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Footer with actions */}
            <div className="p-4 bg-slate-950 border-t border-slate-850/60 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setIsSettingsModalOpen(false);
                  setSelectedPresetIndex(null);
                  setAdminCheckedConfirmation(false);
                }}
                className="px-4 py-2 rounded-lg border border-slate-800 hover:bg-slate-900 text-xs font-bold text-slate-400 transition cursor-pointer"
              >
                Close Settings
              </button>
              {activeSettingsTab === "branding" && (
                <button
                  type="button"
                  onClick={handleApplyPresetIcon}
                  disabled={isUpdatingIcon}
                  className={`px-5 py-2 rounded-lg text-xs font-black transition text-white ${
                    selectedPresetIndex !== null && adminCheckedConfirmation
                      ? "bg-orange-700 hover:bg-orange-850 shadow-md shadow-orange-950/30 cursor-pointer"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  {isUpdatingIcon ? "Syncing..." : "Apply Emblem"}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </>
  );
}
