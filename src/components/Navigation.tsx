import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BookOpen, User as UserIcon, Menu, X, ArrowUp, ArrowDown, ArrowLeft, Home, Compass, MessageSquare, Trophy, ShieldCheck, HelpCircle, FileText, UploadCloud, Search, Sparkles, Mail, Smartphone, Sun, Moon, Wifi, CreditCard, Megaphone, Monitor, GraduationCap, Settings, HardDrive, Trash2, Database, Video, Crown, Briefcase, Flame, Heart, KeyRound, FolderOpen } from "lucide-react";
import { User, Book, SavedDocument, CommunityMessage, AppSettings, SectionKey } from "../types";
import { getCookie, setCookie } from "../utils/cookies";
import { saveAppSettingsToFirestore } from "../lib/firestoreUtils";
import { isSuperAdmin as checkSuperAdmin, isManager as checkManager, canAccessSection } from "../lib/zionRbac";

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

  // Collapsible navigational folders inside the right drawer
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    "Books, Sermons & Media": true,
    "Leadership & Bible School": true,
    "Evangelism & Missions": true,
    "AI Study & Publishing": true,
    "Fellowship & Campus": true,
    "Services & Hubs": true,
  });

  const toggleSection = (cat: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  const isAdmin = checkSuperAdmin(currentUser);
  const isManager = checkManager(currentUser);
  const isStrictManagerOnly = isManager && !isAdmin;
  const userAssignedSections: SectionKey[] = Array.isArray(currentUser?.assigned_sections)
    ? currentUser!.assigned_sections!
    : [];

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

  // States for unified Settings Panel (Appearance, Account, Offline Cache & Branding)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<"general" | "account" | "offline" | "branding">("general");
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
      alert("Book blob cleared from local offline cache.");
      loadOfflineSettingsData();
    }
  };

  const handlePruneAllLocalCache = async () => {
    if (window.confirm("WARNING: This will wipe all offline cached book PDF documents to recover local storage space. Users will need to re-download books to read offline. Proceed?")) {
      const { getAllOfflinePdfs, deletePdfFromOfflineDb } = await import("../utils/pdfDb");
      const offlineMap = await getAllOfflinePdfs();
      const keys = Array.from(offlineMap.keys());
      for (const k of keys) {
        await deletePdfFromOfflineDb(k);
      }
      alert("All local offline book blobs purged and IndexedDB storage reclaimed.");
      loadOfflineSettingsData();
    }
  };

  const handleClearAnnotations = async () => {
    if (window.confirm("WARNING: This will delete all your local annotations, highlighted text, and reading notes. This action is irreversible. Proceed?")) {
      if (typeof window !== "undefined" && window.indexedDB) {
        const req = window.indexedDB.open("WafulaReadsDB", 1);
        req.onsuccess = (e) => {
          const dbObj = (e.target as IDBOpenDBRequest).result;
          if (dbObj.objectStoreNames.contains("offline_annotations")) {
            const tx = dbObj.transaction("offline_annotations", "readwrite");
            const store = tx.objectStore("offline_annotations");
            const clearReq = store.clear();
            clearReq.onsuccess = () => {
              alert("All local annotations and notes deleted.");
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
      alert("Admin Certification Required: Check the confirmation checkbox to apply changes.");
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
      alert("Zion Enterprise Icon updated and synchronized globally.");
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


  // Grouped navigation dynamically filtered by RBAC role and assigned_sections
  const rawGroupedNavigation: Array<{
    category: string;
    section?: SectionKey;
    items: Array<{ id: string; label: string; icon: React.ReactNode; section?: SectionKey }>;
  }> = [
    {
      category: "Bookstore & Media",
      section: "bookstore",
      items: [
        { id: "store", label: "Digital Bookstore", icon: <BookOpen className="h-4 w-4 text-[#818CF8]" />, section: "bookstore" },
        { id: "threed-loft", label: "3D Bookstore Loft", icon: <Compass className="h-4 w-4 text-[#2DD4BF]" />, section: "bookstore" },
        { id: "dashboard", label: "My Library Dashboard", icon: <Trophy className="h-4 w-4 text-amber-400" /> },
      ],
    },
    {
      category:
        isStrictManagerOnly && userAssignedSections.includes("school_1") && userAssignedSections.includes("school_2")
          ? "School 1 & School 2 (Combined)"
          : "Leadership & Bible Schools",
      items: [
        { id: "school", label: "School 1: Leadership Academy", icon: <Compass className="h-4 w-4 text-[#60A5FA]" />, section: "school_1" },
        { id: "bible-school", label: "School 2: Bible Seminary", icon: <Flame className="h-4 w-4 text-[#F5B82E]" />, section: "school_2" },
        { id: "devotional", label: "Devotional Bible (NIV)", icon: <HelpCircle className="h-4 w-4 text-[#34D399]" />, section: "school_2" },
        { id: "offline-dictionary", label: "Theological Dictionary", icon: <BookOpen className="h-4 w-4 text-[#818CF8]" />, section: "school_2" },
      ],
    },
    {
      category: "AI Study & Publishing",
      items: [
        { id: "ai-tutor", label: "Zion AI Tutor (Hydrogen 4)", icon: <Sparkles className="h-4 w-4 text-[#F5B82E]" />, section: "school_1" },
        { id: "companion", label: "Study Assistant Chat", icon: <MessageSquare className="h-4 w-4 text-emerald-400" /> },
        { id: "studio", label: "Doc Studio & Publishing", icon: <FileText className="h-4 w-4 text-slate-300" /> },
      ],
    },
    {
      category: "Evangelism & Mission",
      section: "mission",
      items: [
        { id: "evangelism-missions", label: "Evangelism & Missions Centre", icon: <Heart className="h-4 w-4 text-[#F87171]" />, section: "mission" },
        { id: "sermons-motivation", label: "Sermons & Worship Media", icon: <Video className="h-4 w-4 text-amber-400" />, section: "mission" },
      ],
    },
    {
      category: "Fellowship & Campus",
      items: [
        { id: "community", label: "Zion Connect & Messages", icon: <MessageSquare className="h-4 w-4 text-[#34D399]" /> },
        { id: "professional", label: "Zion Professional", icon: <Briefcase className="h-4 w-4 text-[#F5B82E]" /> },
        { id: "announcements", label: "Campus Announcements", icon: <Megaphone className="h-4 w-4 text-[#F87171]" /> },
        { id: "3d-campus", label: "3D Sanctuary & Campus", icon: <Compass className="h-4 w-4 text-[#60A5FA]" /> },
        { id: "contact", label: "Contact & Campus Tour", icon: <HelpCircle className="h-4 w-4 text-[#38BDF8]" /> },
      ],
    },
    {
      category: "Workspace Hub",
      items: [
        { id: "gmail", label: "Google Workspace Hub", icon: <Mail className="h-4 w-4 text-[#F87171]" /> },
      ],
    },
  ];

  const groupedNavigation = rawGroupedNavigation
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!item.section) return true;
        return canAccessSection(currentUser, item.section);
      }),
    }))
    .filter((group) => group.items.length > 0);

  const handleItemClick = (id: string) => {
    onNavigate(id);
    setIsSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  return (
    <>
      {/* 1. UNIFIED RESPONSIVE TOP HEADER BAR */}
      <header
        id="app_top_header"
        className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0B172A]/95 backdrop-blur-md h-16 safe-area-top flex items-center justify-between gap-3 px-3 sm:px-6 lg:px-8 transition-colors"
      >
        {/* Left Zone: Back Button & Brand Wordmark */}
        <div id="top_header_left_area" className="flex items-center gap-2.5 shrink-0">
          {canGoBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1 min-h-[44px] px-3 rounded-xl text-xs font-bold text-[#0B254D] dark:text-slate-100 bg-slate-50 dark:bg-slate-800 hover:border-[#155EEF] border border-slate-200 dark:border-slate-700 transition cursor-pointer select-none shrink-0 whitespace-nowrap"
              title="Return to previous screen"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Back</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleItemClick("store")}
            className="flex items-center gap-2 min-h-[44px] text-left cursor-pointer shrink-0"
          >
            <img
              src={globalSettings?.customLogoUrl || appLogo}
              alt="Zion Digital"
              className="h-8 w-8 object-cover rounded-full border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-base sm:text-lg font-bold tracking-tight text-[#0B254D] dark:text-white whitespace-nowrap shrink-0">
                Zion
              </span>
              <span className="font-mono text-[9px] sm:text-[10px] tracking-[0.22em] uppercase text-[#155EEF] dark:text-blue-400 font-semibold whitespace-nowrap shrink-0">
                DIGITAL
              </span>
            </div>
          </button>
        </div>

        {/* Center Zone: Primary Top-Bar Navigation Links (Desktop) */}
        <nav aria-label="Primary Navigation" className="hidden lg:flex items-center gap-1 xl:gap-2 min-w-0">
          {([
            { id: "store", label: "Bookstore", section: "bookstore" as SectionKey },
            { id: "school", label: "School 1", section: "school_1" as SectionKey },
            { id: "bible-school", label: "School 2", section: "school_2" as SectionKey },
            { id: "evangelism-missions", label: "Mission", section: "mission" as SectionKey },
            { id: "dashboard", label: "My Library" },
            { id: "community", label: "Zion Connect" },
          ] as Array<{ id: string; label: string; section?: SectionKey }>)
            .filter((link) => !link.section || canAccessSection(currentUser, link.section))
            .map((link) => {
              const isActive = currentView === link.id;
              return (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => handleItemClick(link.id)}
                  className={`min-h-[44px] px-3 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition cursor-pointer ${
                    isActive
                      ? "bg-[#EFF6FF] dark:bg-blue-950/60 text-[#155EEF] dark:text-blue-300 font-bold"
                      : "text-slate-600 dark:text-slate-300 hover:text-[#0B254D] dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60"
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
        </nav>

        {/* Right Zone: Search, Settings, User Profile & Primary Right Navigation Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {broadcastAnnouncement && isBannerClosed && (
            <button
              type="button"
              onClick={() => onRestoreBanner?.()}
              title="View campus updates"
              className="hidden xl:flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl text-[11px] font-bold bg-[#EFF6FF] text-[#155EEF] border border-blue-200 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Megaphone className="h-3.5 w-3.5 shrink-0" />
              <span>Updates</span>
            </button>
          )}

          {/* Global Search Trigger */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] sm:px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F4F7FC] dark:bg-slate-900 text-[#0B254D] dark:text-slate-100 hover:border-[#155EEF] transition cursor-pointer shrink-0 whitespace-nowrap"
            title="Search books, courses, and discussions (Ctrl+K)"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="hidden xl:inline text-xs font-medium text-slate-500 dark:text-slate-400">Search</span>
          </button>

          {/* Settings & Account Trigger */}
          <button
            type="button"
            onClick={() => {
              setActiveSettingsTab("general");
              setIsSettingsModalOpen(true);
            }}
            className="hidden sm:flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0B254D] dark:text-slate-100 hover:border-[#155EEF] transition cursor-pointer shrink-0"
            title="Zion Digital Settings"
          >
            <Settings className="h-4 w-4 shrink-0" />
          </button>

          {/* User Profile / Sign In */}
          {currentUser && currentUser.role !== "guest" ? (
            <button
              type="button"
              onClick={() => handleItemClick("dashboard")}
              title="Open My Library & Profile"
              className="flex items-center gap-2 min-h-[44px] px-2.5 sm:px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0B254D] dark:text-slate-100 hover:border-[#155EEF] transition cursor-pointer shrink-0 whitespace-nowrap"
            >
              <span className="h-6 w-6 rounded-full bg-[#155EEF] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                {currentUser.name?.[0]?.toUpperCase() || <UserIcon className="h-3.5 w-3.5" />}
              </span>
              <span className="hidden md:inline text-xs font-semibold max-w-[100px] truncate">
                {currentUser.name.split(" ")[0]}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onLogIn}
              className="min-h-[44px] px-3.5 rounded-xl bg-[#155EEF] hover:bg-[#0F49C7] text-white text-xs font-bold transition cursor-pointer shrink-0 whitespace-nowrap"
            >
              Sign In
            </button>
          )}

          {/* Primary Top-Right Navigation Drawer Trigger */}
          <button
            id="top_right_menu_trigger"
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-expanded={isSidebarOpen}
            aria-controls="mobile_sidebar_content"
            className="flex items-center gap-2 min-h-[44px] px-3 sm:px-3.5 rounded-xl bg-[#0B254D] dark:bg-[#155EEF] hover:bg-[#123368] dark:hover:bg-[#0F49C7] text-white text-xs font-bold transition cursor-pointer shrink-0 whitespace-nowrap shadow-xs"
            title="Open full navigation menu"
          >
            {isSidebarOpen ? <X className="h-4 w-4 shrink-0" /> : <Menu className="h-4 w-4 shrink-0" />}
            <span>Menu</span>
          </button>
        </div>
      </header>

      {/* 2. SUB-HEADER QUICK BAR */}
      {currentView !== "store" && (
        <div id="quick_back_navigation_bar" className="w-full bg-[#F4F7FC] dark:bg-[#0F1E36] border-b border-slate-200 dark:border-slate-800 py-1.5 text-left">
          <div className="mx-auto max-w-7xl flex items-center justify-between px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => handleItemClick("store")}
              className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-[#155EEF] transition cursor-pointer"
            >
              <Home className="h-3.5 w-3.5" />
              <span>Back to Home</span>
            </button>

            <div className="flex items-center gap-2">
              {onOpenUpgrade && currentUser && currentUser.role !== "guest" && (
                <button
                  type="button"
                  onClick={onOpenUpgrade}
                  className="text-[11px] font-semibold text-[#155EEF] dark:text-blue-400 hover:underline cursor-pointer tabular-nums"
                >
                  {currentUser.credits ?? 20} credits · Top Up (KES)
                </button>
              )}
              {canGoBack && (
                <button
                  onClick={onBack}
                  className="flex items-center space-x-1 text-xs font-semibold text-[#0B254D] dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 cursor-pointer transition"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. UNIFIED RIGHT SLIDE-OVER NAVIGATION DRAWER */}
      <AnimatePresence>
        {isSidebarOpen && (
          <div id="mobile_sidebar_backdrop" className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#0B254D]/35 backdrop-blur-[1px] transition-opacity cursor-pointer"
              onClick={() => setIsSidebarOpen(false)}
            />
            <motion.aside
              id="mobile_sidebar_content"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              style={{ position: "fixed", right: 0, top: 0, width: "72vw", maxWidth: "300px" }}
              className="relative flex flex-col bg-[#0B254D] dark:bg-[#07142B] text-white p-3 sm:p-4 safe-area-top safe-area-bottom shadow-2xl h-full text-left border-l border-white/10 z-10 overflow-hidden"
            >
              {/* Compact Brand Header */}
              <div className="border-b border-white/10 pb-2 mb-2 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <div
                    onClick={() => handleItemClick("store")}
                    className="flex items-center space-x-2 cursor-pointer min-w-0"
                  >
                    <img
                      src={globalSettings?.customLogoUrl || appLogo}
                      alt="Zion Digital"
                      className="h-7 w-7 rounded-full object-cover border border-[#F5B82E]/70 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <div className="flex items-baseline space-x-1">
                        <span className="font-display font-bold text-white text-xs sm:text-sm truncate">Zion</span>
                        <span className="font-mono text-[8.5px] tracking-[0.18em] uppercase text-[#F5B82E] font-semibold">DIGITAL</span>
                      </div>
                      <div className="flex items-center space-x-1 text-[9px] font-mono text-blue-200/80">
                        <span className={isOnline ? "text-emerald-300 font-semibold" : "text-amber-300 font-semibold"}>
                          {isOnline ? "Live" : "Offline"}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">Menu</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSidebarOpen(false)}
                    className="rounded-full h-11 w-11 border border-white/20 flex items-center justify-center text-blue-100 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
                    title="Close navigation menu"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Compact 2-Column Categorized Navigation */}
              <nav className="flex-grow space-y-1.5 overflow-y-auto pr-0.5 custom-scrollbar">
                {groupedNavigation.map((sec) => (
                  <div key={sec.category} className="pb-1.5 border-b border-white/10 last:border-0 last:pb-0">
                    <div className="px-1 pb-0.5 text-[8.5px] uppercase tracking-wider text-blue-200/75 font-bold font-mono truncate">
                      {sec.category}
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {sec.items.map((item) => {
                        const isActive = currentView === item.id;
                        return (
                          <button
                            key={`${item.id}-${item.label}`}
                            type="button"
                            onClick={() => handleItemClick(item.id)}
                            className={`w-full flex items-center space-x-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                              isActive
                                ? "bg-[#155EEF] text-white shadow-xs font-bold"
                                : "text-blue-100/90 hover:text-white hover:bg-white/10"
                            }`}
                          >
                            {item.icon && (
                              <span className={`flex shrink-0 items-center justify-center ${isActive ? "[&_svg]:text-white" : ""}`}>
                                {item.icon}
                              </span>
                            )}
                            <span className="text-left leading-tight line-clamp-2">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {isManager && (
                  <div className="pt-2 border-t border-white/10 space-y-1.5">
                    {isStrictManagerOnly && (
                      <div className="px-2 py-1 rounded bg-white/5 text-[9.5px] font-mono text-blue-200">
                        Assigned: {userAssignedSections.length > 0 ? userAssignedSections.join(", ") : "None"}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => handleItemClick("manager-portal")}
                        className={`w-full flex items-center space-x-1.5 px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          currentView === "manager-portal"
                            ? "bg-[#155EEF] text-white shadow-xs"
                            : "text-[#F5B82E] hover:bg-white/10"
                        }`}
                      >
                        <Crown className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">Manager Portal</span>
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleItemClick("admin")}
                          className={`w-full flex items-center space-x-1.5 px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            currentView === "admin"
                              ? "bg-[#F5B82E] text-[#0B254D] shadow-xs"
                              : "text-blue-100 hover:bg-white/10"
                          }`}
                        >
                          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#F5B82E]" />
                          <span className="truncate">Super Admin</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </nav>

              {/* Single Umbrella Settings Trigger */}
              <div className="border-t border-white/10 pt-2 mt-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setActiveSettingsTab("general");
                    setIsSettingsModalOpen(true);
                    setIsSidebarOpen(false);
                  }}
                  className="w-full bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-bold rounded-xl py-2 px-3 flex items-center justify-between transition cursor-pointer"
                >
                  <span className="flex items-center space-x-2">
                    <Settings className="h-4 w-4 text-[#F5B82E] shrink-0" />
                    <span>Settings</span>
                  </span>
                  <span className="text-[10px] font-mono text-blue-200/80 truncate max-w-[110px]">
                    Theme · Font · Account
                  </span>
                </button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

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
                  <div className="mx-auto w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[#155EEF]">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <h4 className="font-display font-black text-slate-850 dark:text-slate-200 text-sm">Zion Knowledge Search</h4>
                  <p className="text-stone-400 dark:text-slate-500 max-w-sm mx-auto leading-relaxed text-[11px]">
                    Type keywords above to scan and filter through books in the Digital Store, outlines saved in your Doc Studio, and community discussions.
                  </p>
                </div>
              ) : (searchResults.books.length === 0 &&
                   searchResults.savedDocuments.length === 0 &&
                   searchResults.communityMessages.length === 0) ? (
                <div className="text-center py-12 space-y-1.5">
                  <div className="mx-auto w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                    <Search className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">No matches found</h4>
                  <p className="text-[11px] text-stone-400 dark:text-slate-500">We could not locate documents or discussions matching "{searchQuery}"</p>
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
            <div className="bg-gradient-to-r from-[#0B254D] to-[#155EEF] text-white p-6 relative">
              <button 
                onClick={() => setShowHowToInstallModal(false)}
                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="space-y-1 text-left">
                <span className="text-[9px] font-mono select-none text-[#F5B82E] font-bold inline-block uppercase tracking-wider">
                  Progressive Web App (PWA)
                </span>
                <h3 className="text-lg font-extrabold tracking-tight font-display">Install Zion Digital</h3>
                <p className="text-xs text-blue-100 leading-relaxed font-medium">
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

      {/* Compact Mobile Bottom Navigation Bar */}
      <nav
        id="mobile_bottom_nav"
        aria-label="Mobile quick navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 h-14 bg-[#0B254D] dark:bg-[#07142B] text-white border-t border-white/10 grid grid-cols-5 safe-area-bottom no-print"
      >
        {[
          { id: "store", label: "Books", icon: BookOpen },
          { id: "school", label: "School", icon: GraduationCap },
          { id: "community", label: "Connect", icon: MessageSquare },
          { id: "professional", label: "Pro", icon: Briefcase },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = currentView === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleItemClick(tab.id)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition cursor-pointer ${
                active ? "text-[#F5B82E]" : "text-blue-100/80 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-blue-100/80 hover:text-white transition cursor-pointer"
        >
          <Menu className="h-4 w-4 shrink-0" />
          <span>Menu</span>
        </button>
      </nav>

      {/* Floating Scroll Controls Dock (Top & Bottom) */}
      <div 
        id="quick_scroll_controls_dock" 
        className="fixed bottom-20 lg:bottom-6 right-3 sm:right-6 z-40 flex flex-col gap-2 select-none no-print"
      >
        {/* Scroll To Top button */}
        {showBackToTop && (
          <button
            onClick={handleBackToTop}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#155EEF] text-white shadow-xl hover:bg-[#0F49C7] hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer animate-fade-in"
            title="Scroll back to top"
          >
            <ArrowUp className="h-4 w-4 font-black" />
          </button>
        )}

        {/* Scroll To Bottom button */}
        <button
          onClick={handleScrollToBottom}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0B254D] border border-[#123368] text-white shadow-xl hover:bg-[#155EEF] hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer"
          title="Scroll to bottom"
        >
          <ArrowDown className="h-4 w-4 font-black" />
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
            <div className="flex overflow-x-auto border-b border-slate-850 bg-slate-950/60 px-3 custom-scrollbar">
              <button
                type="button"
                onClick={() => setActiveSettingsTab("general")}
                className={`px-3 py-3 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                  activeSettingsTab === "general"
                    ? "border-amber-500 text-amber-500"
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                <Sun className="h-3.5 w-3.5 shrink-0" />
                <span>Display &amp; Font</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSettingsTab("account")}
                className={`px-3 py-3 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                  activeSettingsTab === "account"
                    ? "border-amber-500 text-amber-500"
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                <UserIcon className="h-3.5 w-3.5 shrink-0" />
                <span>Account &amp; Actions</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSettingsTab("offline")}
                className={`px-3 py-3 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                  activeSettingsTab === "offline" 
                    ? "border-amber-500 text-amber-500" 
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                <HardDrive className="h-3.5 w-3.5 shrink-0" />
                <span>Storage</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSettingsTab("branding")}
                className={`px-3 py-3 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                  activeSettingsTab === "branding" 
                    ? "border-amber-500 text-amber-500" 
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                <Database className="h-3.5 w-3.5 shrink-0" />
                <span>Branding</span>
              </button>
            </div>

            {/* General Display, Theme, Font & Sync Tab */}
            {activeSettingsTab === "general" && (
              <div className="p-5 sm:p-6 space-y-4 max-h-[58vh] overflow-y-auto custom-scrollbar text-slate-200">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                    Reading Font Family
                  </label>
                  <select
                    value={selectedFont}
                    onChange={(e) => setSelectedFont(e.target.value)}
                    aria-label="Reading Font"
                    className="w-full bg-slate-950 text-white border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                    <option value="Playfair Display">Playfair Display (Editorial)</option>
                    <option value="JetBrains Mono">JetBrains Mono</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={toggleDarkMode}
                    className="bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-white text-xs font-bold rounded-xl py-3 px-4 flex items-center justify-between transition cursor-pointer"
                  >
                    <span className="flex items-center space-x-2">
                      {isDarkMode ? <Sun className="h-4 w-4 text-[#F5B82E]" /> : <Moon className="h-4 w-4 text-blue-300" />}
                      <span>Theme Mode</span>
                    </span>
                    <span className="text-[11px] font-mono text-amber-400 uppercase">
                      {isDarkMode ? "Dark · Switch Light" : "Light · Switch Dark"}
                    </span>
                  </button>

                  {onToggleSleekMode && (
                    <button
                      type="button"
                      onClick={onToggleSleekMode}
                      className={`border text-xs font-bold rounded-xl py-3 px-4 flex items-center justify-between transition cursor-pointer ${
                        sleekMode
                          ? "bg-[#F5B82E] text-[#0B254D] border-[#F5B82E]"
                          : "bg-slate-950/80 hover:bg-slate-800 text-white border-slate-800"
                      }`}
                    >
                      <span className="flex items-center space-x-2">
                        <Sparkles className="h-4 w-4 shrink-0" />
                        <span>Sleek Compact Layout</span>
                      </span>
                      <span className="text-[11px] font-mono uppercase">{sleekMode ? "On" : "Off"}</span>
                    </button>
                  )}
                </div>

                {onToggleOfflineMode && (
                  <button
                    type="button"
                    onClick={onToggleOfflineMode}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      offlineMode
                        ? "bg-[#F5B82E]/20 text-[#F5B82E] border-[#F5B82E]/50"
                        : "bg-slate-950/80 text-blue-100 border-slate-800 hover:border-[#155EEF]"
                    }`}
                  >
                    <span className="flex items-center space-x-2">
                      <Wifi className="h-4 w-4 shrink-0" />
                      <span>{offlineMode ? "Offline Study Mode Active" : "Cloud Sync Mode (Firebase)"}</span>
                    </span>
                    <span className="text-[10px] font-mono uppercase">{offlineMode ? "On" : "Auto"}</span>
                  </button>
                )}

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>Scripture · Knowledge · Fellowship</span>
                  <span className="text-[#F5B82E] font-bold">READ · LEAD · TRANSFORM</span>
                </div>
              </div>
            )}

            {/* Account, Billing, Install & Logout Tab */}
            {activeSettingsTab === "account" && (
              <div className="p-5 sm:p-6 space-y-3.5 max-h-[58vh] overflow-y-auto custom-scrollbar text-slate-200">
                {currentUser && currentUser.role !== "guest" ? (
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-[#155EEF] flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {currentUser.name?.[0]?.toUpperCase() || "U"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono uppercase px-2 py-1 rounded bg-blue-950 text-blue-300 border border-blue-800 shrink-0">
                      {currentUser.role}
                    </span>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
                    Sign in with Google or email to sync your reading library, enrollments, and notes to Cloud Firestore.
                  </div>
                )}

                <div className="space-y-2.5">
                  {onOpenUpgrade && currentUser && currentUser.role !== "guest" && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsModalOpen(false);
                        onOpenUpgrade();
                      }}
                      className="flex w-full items-center justify-center space-x-2 rounded-xl bg-[#155EEF] hover:bg-[#0F49C7] py-3 text-xs font-bold text-white cursor-pointer"
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>M-Pesa / Card Top-Up (KES)</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleInstallApp}
                    className="w-full bg-[#155EEF] hover:bg-[#0F49C7] text-white text-xs font-bold rounded-xl py-3 flex items-center justify-center space-x-2 transition cursor-pointer"
                  >
                    <Smartphone className="h-4 w-4 shrink-0" />
                    <span>Install App (Android / PC)</span>
                  </button>

                  {currentUser && currentUser.role !== "guest" ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsModalOpen(false);
                        onLogOut();
                      }}
                      className="flex w-full justify-center rounded-xl bg-[#F5B82E] hover:bg-[#E5A91E] py-3 text-xs font-bold text-[#0B254D] cursor-pointer"
                    >
                      Logout
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsModalOpen(false);
                        onLogIn();
                      }}
                      className="flex w-full justify-center rounded-xl bg-[#F5B82E] hover:bg-[#E5A91E] py-3 text-xs font-bold text-[#0B254D] cursor-pointer"
                    >
                      Sign In to Zion Digital
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Offline Tab Content */}
            {activeSettingsTab === "offline" && (
              <div className="p-6 space-y-4 max-h-[55vh] overflow-y-auto custom-scrollbar text-slate-200">
                <div className="bg-amber-950/20 border border-amber-900/30 p-3.5 rounded-xl text-amber-300 flex items-start space-x-3 text-[11px] leading-relaxed">
                  <HardDrive className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold block">Offline-First Synchronization active.</span>
                    Use this system panel to audit client-side IndexedDB databases. Pruning large cached document files frees up storage on your workstation, phone, or laptop.
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
                        <FolderOpen className="h-6 w-6 mx-auto text-slate-400" />
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
                      ? "bg-[#155EEF] hover:bg-[#0F49C7] shadow-md cursor-pointer"
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

      {/* 5. MOBILE BOTTOM NAVIGATION BAR */}
      <nav id="mobile_bottom_nav" className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white/95 dark:bg-[#07142B]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 py-2 px-3 flex items-center justify-around text-center shadow-lg safe-area-bottom select-none">
        <button
          type="button"
          onClick={() => handleItemClick("store")}
          className={`flex flex-col items-center space-y-1 py-1 px-2 rounded-xl transition cursor-pointer ${
            currentView === "store" ? "text-[#155EEF] font-bold" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
          }`}
        >
          <BookOpen className="h-5 w-5" />
          <span className="text-[10px] leading-none">Store</span>
        </button>

        <button
          type="button"
          onClick={() => handleItemClick("school")}
          className={`flex flex-col items-center space-y-1 py-1 px-2 rounded-xl transition cursor-pointer ${
            currentView === "school" ? "text-[#155EEF] font-bold" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
          }`}
        >
          <Compass className="h-5 w-5" />
          <span className="text-[10px] leading-none">School</span>
        </button>

        <button
          type="button"
          onClick={() => handleItemClick("community")}
          className={`flex flex-col items-center space-y-1 py-1 px-2 rounded-xl transition cursor-pointer ${
            currentView === "community" ? "text-[#155EEF] font-bold" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
          }`}
        >
          <MessageSquare className="h-5 w-5" />
          <span className="text-[10px] leading-none">Connect</span>
        </button>

        <button
          type="button"
          onClick={() => handleItemClick("companion")}
          className={`flex flex-col items-center space-y-1 py-1 px-2 rounded-xl transition cursor-pointer ${
            currentView === "companion" ? "text-[#155EEF] font-bold" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
          }`}
        >
          <Sparkles className="h-5 w-5" />
          <span className="text-[10px] leading-none">AI Chat</span>
        </button>

        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          className="flex flex-col items-center space-y-1 py-1 px-2 rounded-xl transition cursor-pointer text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] leading-none">Menu</span>
        </button>
      </nav>

    </>
  );
}
