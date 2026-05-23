import React, { useState, useEffect } from "react";
import { BookOpen, User as UserIcon, Menu, X, ArrowUp, ArrowLeft, Home, Compass, MessageSquare, Trophy, ShieldCheck, HelpCircle, FileText, UploadCloud, Gamepad2, Search, Sparkles, Mail, Smartphone, Sun, Moon } from "lucide-react";
import { User, Book, SavedDocument, CommunityMessage } from "../types";

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
  communityMessages = []
}: NavigationProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

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
    const savedTheme = localStorage.getItem("theme");
    const inheritsDark = savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (inheritsDark) {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
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

  // Polished list of sidebar navigation items synced perfectly to view strings
  const navItems = [
    { id: "dashboard", label: "My Library", icon: <Trophy className="h-4 w-4" /> },
    { id: "store", label: "Digital Store", icon: <BookOpen className="h-4 w-4" /> },
    { id: "gmail", label: "Google Workspace Hub", icon: <Mail className="h-4 w-4 text-rose-500" /> },
    { id: "school", label: "Leadership School", icon: <Compass className="h-4 w-4" /> },
    { id: "studio", label: "Doc Studio", icon: <FileText className="h-4 w-4" /> },
    { id: "devotional", label: "Devotional Bible", icon: <HelpCircle className="h-4 w-4" /> },
    { id: "companion", label: "AI Companion", icon: <Sparkles className="h-4 w-4 text-blue-400" /> },
    { id: "ai-media", label: "Advanced AI 3.5 Media Hub", icon: <Sparkles className="h-4 w-4 text-purple-500 animate-pulse" /> },
    { id: "threed-loft", label: "3D Bookstore Loft", icon: <Compass className="h-4 w-4 text-teal-500" /> },
    { id: "playstore-hub", label: "Android Play Store Hub", icon: <Smartphone className="h-4 w-4 text-emerald-400 animate-pulse" /> },
    { id: "community", label: "Community Forum", icon: <MessageSquare className="h-4 w-4" /> },
    { id: "games", label: "Fun Zone & Games", icon: <Gamepad2 className="h-4 w-4" /> },
    { id: "upload", label: "Member Uploads", icon: <UploadCloud className="h-4 w-4" /> },
    { id: "contact", label: "Contact Us", icon: <HelpCircle className="h-4 w-4" /> },
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
        className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 bg-slate-950 text-white flex-col h-full border-r border-slate-900 select-none text-left"
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-900">
          <button 
            onClick={() => handleItemClick("store")} 
            className="flex items-center space-x-3 text-left hover:opacity-90"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xl">
              <BookOpen className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white font-display leading-tight">
                Wafula <span className="text-blue-500">Digital</span>
              </h1>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">Bungoma, Kenya</p>
            </div>
          </button>
        </div>

        {/* Sidebar Navigation Options */}
        <nav className="flex-grow py-4 px-3 overflow-y-auto space-y-1">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                  isActive 
                    ? "bg-blue-600 text-white shadow-md shadow-blue-900/40" 
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <span className="flex shrink-0 items-center justify-center">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Admin Panel Specific Block */}
          {currentUser?.role === "admin" && (
            <div className="pt-4 mt-4 border-t border-slate-900 space-y-2">
              <span className="px-4 text-[9px] uppercase tracking-wider text-slate-500 font-bold block mb-1">
                Administrative Suite
              </span>
              <button
                onClick={() => handleItemClick("admin")}
                className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  currentView === "admin"
                    ? "bg-red-700 text-white shadow-md shadow-rose-950"
                    : "text-red-400 hover:text-red-300 hover:bg-slate-900"
                }`}
              >
                <ShieldCheck className="h-4 w-4 text-red-500" />
                <span>📊 Admin Console</span>
              </button>
            </div>
          )}
        </nav>

        {/* Permanent Sidebar Dark Mode Switch */}
        <div className="p-4 bg-slate-950 border-t border-slate-900 text-left space-y-2 select-none">
          <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 font-bold block">
            AESTHETIC PREFERENCE
          </span>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">Low-Light Themes:</span>
            <button
              type="button"
              onClick={toggleDarkMode}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-850 hover:text-white text-slate-300 transition select-none cursor-pointer text-[10.5px] font-semibold"
              title="Switch Low-light Display theme"
            >
              {isDarkMode ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-amber-550 fill-amber-500/25" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-slate-400" />
                  <span>Dark Theme</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Brand Mission & Slogan footer */}
        <div className="p-5 bg-slate-900 border-t border-slate-900 text-left space-y-1">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider leading-none">
            VISION
          </p>
          <p className="text-[9px] text-slate-500 italic font-medium">
            Empowering Bungoma through Digital Literacy and transformational guides.
          </p>
          <div className="pt-2">
            <span className="text-[9px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded font-bold">
              KNOWLEDGE WITHOUT BORDERS
            </span>
          </div>
        </div>
      </aside>

      {/* 2. RESPONSIVE TOP HEADER BAR */}
      <header 
        id="app_top_header" 
        className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md lg:pl-64 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8"
      >
        {/* Decorative Desktop Search Container (Fits visual theme requirements) */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="hidden md:flex items-center justify-between bg-slate-150/50 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 px-4 py-2 rounded-full w-96 text-slate-500 hover:text-slate-850 dark:text-slate-405 dark:hover:text-slate-200 select-none text-left cursor-pointer transition shadow-xs"
        >
          <div className="flex items-center space-x-3">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="text-xs font-semibold">Search e-books, drafts, forums...</span>
          </div>
          <kbd className="hidden lg:inline-block font-mono text-[9px] font-black bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 px-1.5 py-0.5 rounded text-slate-500 shadow-xs leading-none shrink-0 select-none">
            Ctrl+K
          </kbd>
        </button>

        {/* Mobile Logo Brand */}
        <button 
          onClick={() => handleItemClick("store")} 
          className="flex lg:hidden items-center space-x-2 text-left hover:opacity-85"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
            <BookOpen className="h-4 w-4" />
          </span>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-neutral-900 leading-tight">
              Wafula <span className="text-blue-600">Digital</span>
            </h1>
          </div>
        </button>

        {/* User context information and indicators */}
        <div className="flex items-center space-x-4">
          
          {/* Mobile Search Icon Button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex md:hidden items-center justify-center h-8 w-8 rounded-full border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition cursor-pointer shrink-0"
            title="Search database"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Global Dark Mode Switch */}
          <button
            type="button"
            onClick={toggleDarkMode}
            className="flex items-center justify-center h-8 w-8 rounded-full border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition cursor-pointer shrink-0 animate-pulse"
            title={isDarkMode ? "Switch to Light Mode ☀️" : "Switch to Dark Mode 🌙"}
          >
            {isDarkMode ? (
              <Sun className="h-4 w-4 text-amber-500" />
            ) : (
              <Moon className="h-4 w-4 text-stone-600" />
            )}
          </button>

          {/* Status Indicator */}
          <div className="hidden sm:flex items-center space-x-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white dark:border-slate-900 animate-pulse" />
            <span className="font-medium">Offline Mode Ready</span>
          </div>

          {/* Streak indicator badge */}
          {streakDays ? (
            <div 
              title="Active study days streak"
              onClick={() => handleItemClick("dashboard")}
              className="flex items-center space-x-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-600 border border-amber-100 cursor-pointer animate-pulse select-none"
            >
              <span>🔥</span>
              <span>{streakDays} Days</span>
            </div>
          ) : null}

          {/* User Sign In and profile container */}
          {currentUser ? (
            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => handleItemClick("dashboard")}
                title="Open user dashboard"
                className="flex items-center space-x-2.5 rounded-full border border-slate-200 bg-slate-50 p-1 pr-3 hover:bg-slate-100 transition"
              >
                <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  {currentUser.name[0].toUpperCase()}
                </div>
                <div className="hidden md:block text-left">
                  <span className="text-xs font-bold text-slate-800 block leading-tight truncate max-w-[90px]">
                    {currentUser.name.split(" ")[0]}
                  </span>
                  <span className="text-[9px] text-slate-400 block font-mono capitalize">
                    {currentUser.role}
                  </span>
                </div>
              </button>

              <button
                onClick={onLogOut}
                className="text-[10px] font-mono uppercase bg-slate-100 font-bold hover:bg-slate-200 px-2.5 py-1 rounded text-red-700 transition"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={onLogIn}
              className="flex items-center space-x-1.5 rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm transition"
            >
              <UserIcon className="h-3.5 w-3.5" />
              <span>Authenticate Me</span>
            </button>
          )}

          {/* Mobile hamburger navigation drawer trigger */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="rounded-lg p-2 text-neutral-700 hover:bg-neutral-100 lg:hidden"
            title="Open side menu drawer"
          >
            {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {/* 3. DYNAMIC SUB-HEADER BACK ACTION helpers */}
      {currentView !== "store" && (
        <div id="quick_back_navigation_bar" className="w-full bg-slate-100 border-b border-slate-200 py-1.5 lg:pl-64 text-left">
          <div className="max-w-7xl flex items-center justify-between px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => handleItemClick("store")}
              className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition"
            >
              <Home className="h-3.5 w-3.5 text-slate-400" />
              <span>Digital Store</span>
            </button>

            {canGoBack && (
              <button
                onClick={onBack}
                className="flex items-center space-x-1 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-lg px-2.5 py-1 shadow-sm transition"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-slate-400" />
                <span>Go Back</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. MOBILE DRAWER OVERLAY SIDEBAR */}
      {isSidebarOpen && (
        <div id="mobile_sidebar_backdrop" className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setIsSidebarOpen(false)} />
          <aside id="mobile_sidebar_content" className="relative flex w-80 max-w-[85vw] flex-col bg-white p-6 shadow-2xl h-full text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center space-x-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold">W</span>
                <span className="font-display font-bold text-slate-950">Wafula Digital</span>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-grow space-y-1 overflow-y-auto pr-2">
              {navItems.map((item) => {
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className={`flex w-full items-center space-x-3 rounded-lg px-4 py-2.5 text-xs font-semibold transition-all ${
                      isActive 
                        ? "bg-blue-600 text-white shadow-sm" 
                        : "text-slate-650 hover:bg-slate-100"
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}

              {currentUser?.role === "admin" && (
                <button
                  onClick={() => handleItemClick("admin")}
                  className={`flex w-full items-center space-x-3 rounded-lg px-4 py-2.5 text-xs font-bold mt-4 border-t border-slate-100 pt-4 transition-all ${
                    currentView === "admin" 
                      ? "bg-red-700 text-white" 
                      : "text-red-700 hover:bg-rose-50"
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>📊 Admin Console</span>
                </button>
              )}
            </nav>

            {/* Dark Mode Toggle for Mobile View */}
            <div className="border-t border-slate-100 pt-3 flex items-center justify-between px-2 text-xs font-semibold text-slate-700">
              <span className="flex items-center space-x-2">
                {isDarkMode ? <Moon className="h-4 w-4 text-indigo-500" /> : <Sun className="h-4 w-4 text-amber-500" />}
                <span>{isDarkMode ? "Dark Theme active" : "Light Theme active"}</span>
              </span>
              <button 
                type="button"
                onClick={toggleDarkMode}
                className="px-3 py-1 rounded bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700 text-[11px] font-bold"
              >
                Toggle
              </button>
            </div>

            <div className="border-t border-slate-100 pt-4 mt-1 space-y-3">
              {currentUser ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-3 px-2">
                    <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow">
                      {currentUser.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onLogOut();
                      setIsSidebarOpen(false);
                    }}
                    className="flex w-full justify-center rounded-lg border border-slate-200 py-2.5 text-xs font-bold text-neutral-700 hover:bg-slate-50"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    onLogIn();
                    setIsSidebarOpen(false);
                  }}
                  className="flex w-full justify-center rounded-lg bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 shadow"
                >
                  Authenticate Me
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
                      <span className="text-[10px] uppercase font-mono tracking-widest text-blue-500 font-black block">
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
                            className="p-3 border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900 bg-slate-50 dark:bg-slate-850 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 rounded-xl transition cursor-pointer flex items-center justify-between text-left"
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
                            <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold px-2.5 py-1 rounded-md shrink-0 uppercase tracking-wide">
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
              <span>© Wafula Global Digital Hub</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Back To Top button */}
      {showBackToTop && (
        <button
          id="back_to_top_floating_btn"
          onClick={handleBackToTop}
          className="scroll-top-btn flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl hover:bg-blue-700 transition transform hover:-translate-y-1 active:translate-y-0 active:scale-95 animate-bounce"
          title="Scroll back to top"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </>
  );
}
