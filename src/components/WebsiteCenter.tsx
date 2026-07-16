import React, { useState, useEffect } from "react";
import { 
  Globe, Search, ExternalLink, Plus, Trash2, Bookmark, Compass, 
  RefreshCw, Laptop, Play, HelpCircle, ShieldAlert, ArrowLeft, 
  ArrowRight, Home, LayoutGrid, CheckCircle2, BookmarkPlus
} from "lucide-react";
import GoogleSimView from "./GoogleSimView";

interface WebApp {
  id: string;
  name: string;
  url: string;
  category: "all" | "media" | "social" | "browsers" | "utilities" | "custom";
  description: string;
  iconBg: string;
  textColor: string;
  accentColor: string;
}

const PRESET_APPS: WebApp[] = [
  {
    id: "youtube",
    name: "YouTube",
    url: "https://www.youtube.com",
    category: "media",
    description: "Watch and stream educational lectures, sermons, and public forums seamlessly.",
    iconBg: "bg-red-50 dark:bg-red-950/20",
    textColor: "text-red-650 dark:text-red-400",
    accentColor: "border-red-150 dark:border-red-900",
  },
  {
    id: "tiktok",
    name: "TikTok",
    url: "https://www.tiktok.com",
    category: "media",
    description: "Browse trending micro-videos, local educational channels, and creative arts.",
    iconBg: "bg-stone-50 dark:bg-stone-900/20",
    textColor: "text-stone-900 dark:text-stone-300",
    accentColor: "border-stone-200 dark:border-stone-800",
  },
  {
    id: "lite_opera",
    name: "Opera Lite / Mini",
    url: "https://mini.opera.com",
    category: "browsers",
    description: "Ultra data-saving web browser engineered specifically for light internet speeds.",
    iconBg: "bg-red-50 dark:bg-red-950/25",
    textColor: "text-red-700 dark:text-red-400",
    accentColor: "border-red-200 dark:border-red-900/40",
  },
  {
    id: "vidmate",
    name: "Vidmate Web Hub",
    url: "https://www.vidmateapp.com",
    category: "media",
    description: "Powerful direct video and audio content collector hub suitable for offline caching.",
    iconBg: "bg-orange-50 dark:bg-orange-950/20",
    textColor: "text-orange-600 dark:text-orange-400",
    accentColor: "border-orange-150 dark:border-orange-920",
  },
  {
    id: "twitter",
    name: "X / Twitter",
    url: "https://www.x.com",
    category: "social",
    description: "Scan immediate international developments, leadership bulletins, and civic news.",
    iconBg: "bg-slate-50 dark:bg-slate-900/40",
    textColor: "text-slate-900 dark:text-slate-100",
    accentColor: "border-slate-200 dark:border-slate-800",
  },
  {
    id: "chrome_google",
    name: "Google Chrome Services",
    url: "https://chrome.google.com",
    category: "browsers",
    description: "The world's standard high speed internet navigation engine and online toolkit.",
    iconBg: "bg-blue-50 dark:bg-blue-950/20",
    textColor: "text-blue-600 dark:text-blue-400",
    accentColor: "border-blue-150 dark:border-blue-900",
  },
  {
    id: "microsoft_edge",
    name: "Microsoft Edge Workspace",
    url: "https://www.microsoft.com/edge",
    category: "browsers",
    description: "Fast dual-core browser integrated with artificial intelligence productivity helpers.",
    iconBg: "bg-teal-50 dark:bg-teal-950/20",
    textColor: "text-teal-650 dark:text-teal-400",
    accentColor: "border-teal-150 dark:border-teal-900",
  },
  {
    id: "google_search",
    name: "Google Search Engine",
    url: "https://www.google.com",
    category: "utilities",
    description: "Retrieve any fact, textbook paper, theological commentary, or public archives.",
    iconBg: "bg-amber-55 bg-amber-50 dark:bg-amber-950/20",
    textColor: "text-amber-700 dark:text-amber-400",
    accentColor: "border-amber-100 dark:border-amber-900/45",
  },
  {
    id: "wikipedia",
    name: "Wikipedia Encyclopedia",
    url: "https://www.wikipedia.org",
    category: "utilities",
    description: "Exhaustive peer-reviewed references for academic, geographic, and historical research.",
    iconBg: "bg-neutral-100 dark:bg-stone-850",
    textColor: "text-stone-800 dark:text-stone-200",
    accentColor: "border-stone-300 dark:border-stone-700",
  },
  {
    id: "gmail_web",
    name: "Gmail Console Client",
    url: "https://mail.google.com",
    category: "utilities",
    description: "Compose professional emails, manage student reports, and contact civic leaders.",
    iconBg: "bg-rose-50 dark:bg-rose-950/20",
    textColor: "text-rose-600 dark:text-rose-450",
    accentColor: "border-rose-150 dark:border-rose-900",
  },
  {
    id: "facebook",
    name: "Facebook Social",
    url: "https://www.facebook.com",
    category: "social",
    description: "Connect with Bungoma civic study circles, community updates, and friends.",
    iconBg: "bg-blue-50 dark:bg-blue-950/35",
    textColor: "text-blue-700 dark:text-blue-400",
    accentColor: "border-blue-200 dark:border-blue-900/60",
  },
  {
    id: "duckduckgo",
    name: "DuckDuckGo Privacy Search",
    url: "https://duckduckgo.com",
    category: "utilities",
    description: "Browse securely without cookie tracking, diagnostic profiling, or unwanted advertisement.",
    iconBg: "bg-orange-50 dark:bg-orange-950/15",
    textColor: "text-orange-650 dark:text-orange-400",
    accentColor: "border-orange-100 dark:border-orange-900/50",
  }
];

export default function WebsiteCenter() {
  const [apps, setApps] = useState<WebApp[]>(PRESET_APPS);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Custom bookmark addition state
  const [showAddModal, setShowAddModal] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [customCat, setCustomCat] = useState<"media" | "social" | "browsers" | "utilities">("utilities");

  // Simulated browser states
  const [iframeUrl, setIframeUrl] = useState("https://www.google.com");
  const [browserAddress, setBrowserAddress] = useState("https://www.google.com");
  const [browserHistory, setBrowserHistory] = useState<string[]>(["https://www.google.com"]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showIframeWarning, setShowIframeWarning] = useState(false);
  const [activeIframeTab, setActiveIframeTab] = useState<"directory" | "browser">("directory");

  // Load custom bookmarks on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("WAFULA_CUSTOM_WEBSITES");
      if (stored) {
        const parsed: WebApp[] = JSON.parse(stored);
        setApps([...PRESET_APPS, ...parsed]);
      }
    } catch (e) {
      console.error("Failed to load custom bookmarks", e);
    }
  }, []);

  // Check if standard site is known to block nesting via Frame Protections
  const checkIfFrameBlocked = (url: string): boolean => {
    const blockedKeywords = ["google.com", "youtube.com", "facebook.com", "tiktok.com", "x.com", "twitter.com", "mail.google.com", "microsoft.com", "instagram.com", "spotify.com"];
    const lowercaseUrl = url.toLowerCase();
    return blockedKeywords.some(keyword => lowercaseUrl.includes(keyword));
  };

  const handleLaunchInBrowser = (url: string) => {
    let formattedUrl = url.trim();
    if (!formattedUrl) return;

    // Detect if input is a search query rather than a pure domain/URL
    // e.g., if it contains space characters, doesn't match a dot suffix, or is a plain keyword
    const isUrlPattern = /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(formattedUrl) || 
                         /^https?:\/\//i.test(formattedUrl) ||
                         /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/.test(formattedUrl);

    if (!isUrlPattern || formattedUrl.includes(" ")) {
      // Treat as a search term! Launch simulated Google Search query
      const encoded = encodeURIComponent(formattedUrl);
      formattedUrl = `https://www.google.com/search?q=${encoded}`;
    } else {
      if (!/^https?:\/\//i.test(formattedUrl)) {
        if (formattedUrl.toLowerCase() === "google.com" || formattedUrl.toLowerCase() === "www.google.com") {
          formattedUrl = "https://www.google.com";
        } else {
          formattedUrl = `https://${formattedUrl}`;
        }
      }
    }

    setIframeUrl(formattedUrl);
    setBrowserAddress(formattedUrl);
    
    // Check security warnings (Exclude local Google simulation from block warnings as it integrates locally!)
    const isBlocked = checkIfFrameBlocked(formattedUrl) && !formattedUrl.startsWith("https://www.google.com");
    setShowIframeWarning(isBlocked);

    // Update history
    const nextHistory = [...browserHistory.slice(0, historyIndex + 1), formattedUrl];
    setBrowserHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);

    setActiveIframeTab("browser");
  };

  const handleBrowserAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!browserAddress.trim()) return;
    handleLaunchInBrowser(browserAddress);
  };

  const handleBrowserGoBack = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      const prevUrl = browserHistory[prevIndex];
      setIframeUrl(prevUrl);
      setBrowserAddress(prevUrl);
      setShowIframeWarning(checkIfFrameBlocked(prevUrl));
    }
  };

  const handleBrowserGoForward = () => {
    if (historyIndex < browserHistory.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      const nextUrl = browserHistory[nextIndex];
      setIframeUrl(nextUrl);
      setBrowserAddress(nextUrl);
      setShowIframeWarning(checkIfFrameBlocked(nextUrl));
    }
  };

  const handleBrowserReload = () => {
    const current = iframeUrl;
    setIframeUrl("");
    setTimeout(() => {
      setIframeUrl(current);
    }, 50);
  };

  const handleAddBookmark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customUrl.trim()) {
      alert("Please fill in the Name and URL parameters!");
      return;
    }

    // Format URL
    let urlToSave = customUrl.trim();
    if (!/^https?:\/\//i.test(urlToSave)) {
      urlToSave = `https://${urlToSave}`;
    }

    const newApp: WebApp = {
      id: "custom_" + Date.now(),
      name: customName.trim(),
      url: urlToSave,
      category: "custom",
      description: customDesc.trim() || "User bookmarked customized virtual application link.",
      iconBg: "bg-indigo-50 dark:bg-indigo-950/20",
      textColor: "text-indigo-650 dark:text-indigo-400",
      accentColor: "border-indigo-150 dark:border-indigo-900"
    };

    try {
      const stored = localStorage.getItem("WAFULA_CUSTOM_WEBSITES");
      const currentList: WebApp[] = stored ? JSON.parse(stored) : [];
      const updatedList = [...currentList, newApp];
      localStorage.setItem("WAFULA_CUSTOM_WEBSITES", JSON.stringify(updatedList));

      setApps([...PRESET_APPS, ...updatedList]);
      
      // Reset State
      setCustomName("");
      setCustomUrl("");
      setCustomDesc("");
      setShowAddModal(false);
    } catch (err) {
      alert("Could not append custom bookmark!");
    }
  };

  const handleDeleteBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to remove this bookmark from your launch directory?")) {
      return;
    }

    try {
      const stored = localStorage.getItem("WAFULA_CUSTOM_WEBSITES");
      if (stored) {
        const currentList: WebApp[] = JSON.parse(stored);
        const filteredList = currentList.filter(app => app.id !== id);
        localStorage.setItem("WAFULA_CUSTOM_WEBSITES", JSON.stringify(filteredList));
        setApps([...PRESET_APPS, ...filteredList]);
      }
    } catch (_) {}
  };

  // Filter apps
  const filteredApps = apps.filter(app => {
    const matchesCategory = selectedCategory === "all" || app.category === selectedCategory;
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          app.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          app.url.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8 select-none text-left">
      
      {/* Dynamic Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-red-950 via-stone-900 to-indigo-950 text-white p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 rounded-full bg-red-700/10 blur-3xl animate-pulse" />
        <div className="absolute left-1/4 bottom-0 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center space-x-2 bg-red-500/20 text-red-300 px-3 py-1 rounded-full text-xs font-semibold">
              <Compass className="h-3.5 w-3.5 shrink-0 animate-spin-slow" />
              <span>Universal Desktop Web Directory</span>
            </div>
            <h2 className="text-3xl font-black tracking-tight font-display">
              Global Website & Portal Center
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
              Access lightweight versions of popular networks, media clients, and custom search engines optimized for low-bandwidth. Build shortcuts, simulate browsing, or launch external apps instantly in a single tab.
            </p>
          </div>

          <div className="flex flex-row gap-3 shrink-0">
            <button
              onClick={() => setActiveIframeTab(activeIframeTab === "directory" ? "browser" : "directory")}
              className="flex items-center space-x-2 py-2.5 px-4 bg-white/10 hover:bg-white/15 text-white text-xs font-bold rounded-xl border border-white/20 transition-all"
            >
              {activeIframeTab === "directory" ? (
                <>
                  <Laptop className="h-4 w-4 text-rose-400" />
                  <span>Open Browser Hub</span>
                </>
              ) : (
                <>
                  <LayoutGrid className="h-4 w-4 text-emerald-400" />
                  <span>Back to App Directory</span>
                </>
              )}
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-2 py-2.5 px-4 bg-red-700 hover:bg-red-800 text-white text-xs font-black rounded-xl shadow-lg shadow-red-950/20 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Add Custom App</span>
            </button>
          </div>
        </div>
      </div>

      {activeIframeTab === "directory" ? (
        <div className="space-y-6">
          
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
            
            {/* Nav tabs */}
            <div className="flex items-center overflow-x-auto gap-1 pb-1 md:pb-0 scrollbar-thin">
              {[
                { id: "all", label: "All Apps" },
                { id: "media", label: "Media & Streaming" },
                { id: "social", label: "Social Networks" },
                { id: "browsers", label: "Web Browsers" },
                { id: "utilities", label: "Search & Reference" },
                { id: "custom", label: "My Bookmarks" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    selectedCategory === tab.id
                      ? "bg-red-700 text-white shadow-xs"
                      : "bg-slate-50 dark:bg-slate-850 text-stone-600 dark:text-stone-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {tab.label}
                  {tab.id === "custom" && apps.filter(a => a.category === "custom").length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-indigo-600 text-[9px] text-white rounded-full">
                      {apps.filter(a => a.category === "custom").length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Filter Search */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search web apps & links..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-stone-200 dark:border-slate-800 rounded-xl bg-stone-50 dark:bg-slate-850 text-xs font-bold text-stone-850 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-red-550 focus:border-transparent dark:focus:ring-red-900/40"
              />
            </div>
          </div>

          {/* Apps Cards Grid */}
          {filteredApps.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-3">
              <div className="h-14 w-14 rounded-full bg-slate-100 dark:bg-slate-850 flex items-center justify-center mx-auto text-stone-400">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="font-display font-black text-slate-850 dark:text-slate-200">No Web Applications Located</h3>
              <p className="text-xs text-stone-400 dark:text-slate-500 max-w-sm mx-auto leading-relaxed">
                We couldn't spot any bookmarks matching "{searchQuery}" in this category. Reset filters or create a custom app shortcut.
              </p>
              <button
                onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-xs font-bold rounded-xl"
              >
                Reset Searches
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredApps.map((app) => {
                const isBlocked = checkIfFrameBlocked(app.url);
                return (
                  <div
                    key={app.id}
                    onClick={() => handleLaunchInBrowser(app.url)}
                    className="group bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl p-5 hover:border-red-300 dark:hover:border-red-900/60 shadow-xs hover:shadow-md transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      
                      {/* App Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${app.iconBg} border border-stone-150 dark:border-slate-800 shrink-0`}>
                            <Globe className={`h-5 w-5 ${app.textColor}`} />
                          </div>
                          <div>
                            <h4 className="font-display font-black text-sm text-stone-950 dark:text-neutral-100 flex items-center gap-1.5">
                              <span>{app.name}</span>
                              {app.category === "custom" && (
                                <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/40">
                                  User App
                                </span>
                              )}
                            </h4>
                            <p className="text-[10px] text-stone-400 dark:text-slate-550 break-all truncate max-w-[180px] text-left">
                              {app.url}
                            </p>
                          </div>
                        </div>

                        {app.category === "custom" ? (
                          <button
                            onClick={(e) => handleDeleteBookmark(app.id, e)}
                            className="p-1.5 rounded-lg bg-stone-50 dark:bg-slate-850 text-stone-400 hover:text-red-650 dark:hover:text-red-400 transition"
                            title="Remove app shortcut"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <span className="text-[9px] uppercase tracking-wider font-mono text-stone-450 dark:text-slate-500 font-bold bg-neutral-50 dark:bg-slate-850 px-2 py-0.5 rounded border border-stone-100 dark:border-slate-800">
                            {app.category}
                          </span>
                        )}
                      </div>

                      {/* App Description */}
                      <p className="text-xs text-stone-500 dark:text-slate-400 leading-relaxed font-sans text-left min-h-[48px]">
                        {app.description}
                      </p>
                    </div>

                    {/* Launch Action elements */}
                    <div className="mt-4 pt-4 border-t border-stone-100 dark:border-slate-850 flex items-center justify-between text-[11px] font-bold">
                      <div className="flex items-center space-x-1 text-stone-400 dark:text-slate-500">
                        {isBlocked ? (
                          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-500 text-[10px]">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            <span>External tab recommended</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-500 text-[10px]">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Embeddable in browser</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Direct New Tab anchor to make it bulletproof! */}
                        <a
                          href={app.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-xl bg-stone-50 dark:bg-slate-850 hover:bg-stone-105 border text-stone-500 hover:text-stone-800 dark:hover:bg-slate-800 dark:hover:text-white transition flex items-center justify-center shrink-0"
                          title="Open directly in a security-free new tab"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <button
                          type="button"
                          className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white text-[10px] font-extrabold rounded-xl transition flex items-center space-x-1"
                        >
                          <Play className="h-2.5 w-2.5 shrink-0" />
                          <span>Launch Frame</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick Informational Tip */}
          <div className="bg-yellow-50/55 dark:bg-slate-900 border border-yellow-200/50 dark:border-slate-800 rounded-2xl p-4 text-xs font-semibold text-amber-900 dark:text-amber-400 flex items-start space-x-3 leading-relaxed">
            <ShieldAlert className="h-4.5 w-4.5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-display font-black text-amber-955 dark:text-amber-300 block">Security & iFrame Nesting Limitations Notice:</span>
              <p className="text-amber-800 dark:text-amber-400 text-[11px] font-medium leading-normal">
                Due to standard HTTP security protocols (such as <strong className="font-bold">X-Frame-Options</strong> and <strong className="font-bold">Content Security Policy</strong> configured by corporate servers), websites like YouTube, Google Search, and Facebook restrict rendering inside embedded iframes. If a site fails to load inside the Browser tab, simply click the <strong className="font-bold">Square-Arrow icon (External Tab)</strong> to open it directly in a bulletproof, unrestricted browser window!
              </p>
            </div>
          </div>
        </div>
      ) : (
        
        /* 2. SIMULATED BROWSER DESKTOP COMPONENT */
        <div className="border border-stone-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden h-[640px]">
          
          {/* Chrome-Styled Top Browser Bar */}
          <div className="bg-slate-100 dark:bg-slate-950 px-4 py-3 border-b border-stone-200 dark:border-slate-800 flex items-center justify-between gap-4">
            
            {/* Control buttons */}
            <div className="flex items-center space-x-1.5">
              <button
                onClick={handleBrowserGoBack}
                disabled={historyIndex === 0}
                className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-200/75 dark:hover:bg-slate-850 disabled:opacity-35 transition"
                title="Go back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                onClick={handleBrowserGoForward}
                disabled={historyIndex >= browserHistory.length - 1}
                className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-200/75 dark:hover:bg-slate-850 disabled:opacity-35 transition"
                title="Go forward"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={handleBrowserReload}
                className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-200/75 dark:hover:bg-slate-850 transition"
                title="Reload page"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setIframeUrl("https://www.google.com");
                  setBrowserAddress("https://www.google.com");
                  setShowIframeWarning(false);
                }}
                className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-200/75 dark:hover:bg-slate-850 transition"
                title="Home (Google Search)"
              >
                <Home className="h-4 w-4" />
              </button>
            </div>

            {/* Address Bar */}
            <form onSubmit={handleBrowserAddressSubmit} className="flex-1 max-w-2xl relative">
              <Globe className="absolute left-3 top-2 h-4 w-4 text-stone-400" />
              <input
                type="text"
                value={browserAddress}
                onChange={(e) => setBrowserAddress(e.target.value)}
                placeholder="Enter complete web address (e.g., wikipedia.org, Opera)..."
                className="w-full bg-white dark:bg-slate-900 pl-9 pr-24 py-1.5 border border-stone-300 dark:border-slate-800 rounded-xl text-xs font-mono font-medium text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <div className="absolute right-2 top-1.5 flex items-center space-x-1">
                <button
                  type="submit"
                  className="px-2.5 py-0.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-[10px] font-bold rounded-lg transition"
                >
                  GO
                </button>
              </div>
            </form>

            {/* Quick Actions */}
            <div className="flex items-center space-x-2">
              <a
                href={iframeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white text-[10px] font-black rounded-lg transition flex items-center space-x-1 shrink-0"
              >
                <span>Launch in Tab</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
              <button
                onClick={() => setActiveIframeTab("directory")}
                className="px-2.5 py-1.5 bg-stone-200 hover:bg-stone-250 dark:bg-slate-800 dark:hover:bg-slate-750 text-stone-800 dark:text-stone-200 text-[10px] font-bold rounded-lg transition"
              >
                Directory
              </button>
            </div>
          </div>

          {/* Simulated Iframe / Viewport Web Container */}
          <div className="flex-1 bg-neutral-50 dark:bg-slate-950 relative overflow-hidden">
            
            {showIframeWarning && (
              <div className="absolute top-0 inset-x-0 bg-amber-50 dark:bg-slate-900 border-b border-amber-200 dark:border-slate-800 px-4 py-2.5 z-10 flex items-center justify-between text-xs font-semibold text-amber-900 dark:text-amber-400 font-sans shadow-sm leading-relaxed">
                <div className="flex items-center space-x-2">
                  <ShieldAlert className="h-4.5 w-4.5 text-amber-600 dark:text-amber-500 shrink-0" />
                  <p className="text-[11px] font-medium">
                    This website (<strong className="font-bold">{new URL(iframeUrl).hostname}</strong>) enforces <strong className="font-bold">X-Frame-Options PROTECTION</strong> and may block embedded frames. If the screen remains blank, click here:
                  </p>
                </div>
                <a
                  href={iframeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold rounded-lg transition shrink-0"
                >
                  Direct New Tab Launch
                </a>
              </div>
            )}

            {iframeUrl ? (
              iframeUrl.startsWith("https://www.google.com") ? (
                <GoogleSimView iframeUrl={iframeUrl} onNavigate={handleLaunchInBrowser} />
              ) : (
                <iframe
                  id="interactive_browser_viewport"
                  src={iframeUrl}
                  className="w-full h-full border-none bg-white select-text"
                  title="Wafula Desktop Web Viewport"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  referrerPolicy="no-referrer"
                />
              )
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 font-bold text-xs">
                Loading browser connection...
              </div>
            )}
          </div>

          {/* Browser footer info bar */}
          <div className="bg-slate-50 dark:bg-slate-950 border-t border-stone-200 dark:border-slate-800 px-4 py-2 flex items-center justify-between font-mono text-[9px] text-stone-400 dark:text-slate-500 tracking-wide select-none">
            <span className="flex items-center gap-1.5 truncate max-w-md">
              <Globe className="h-3 w-3 text-emerald-500 animate-spin-slow" />
              <span>Viewport connected: {iframeUrl}</span>
            </span>
            <span>Wafula Secure Proxy Sandboxed Hub</span>
          </div>
        </div>
      )}

      {/* 3. ADD CUSTOM APPS BOOKMARK DIALOG OVERLAY */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-955/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="fixed inset-0 cursor-default" onClick={() => setShowAddModal(false)} />
          
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="bg-red-750 bg-red-800 text-white px-6 py-5 relative select-none">
              <h3 className="font-display text-lg font-black tracking-tight">Add Custom Web App</h3>
              <p className="text-xs text-red-155 opacity-90 leading-relaxed font-semibold">
                Scribble custom school tools, news dashboards or personal links. Adds them directly to your local launch deck!
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleAddBookmark} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 font-mono block">Website Title*</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Bungoma County Official Portal"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-stone-200 dark:border-slate-850 rounded-xl bg-stone-50 dark:bg-slate-900 text-xs font-bold text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-red-550"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 font-mono block">Web Link URL Address*</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., bungoma.go.ke or https://..."
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="w-full px-3.5 py-2 border border-stone-200 dark:border-slate-850 rounded-xl bg-stone-50 dark:bg-slate-900 text-xs font-mono text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-red-550"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 font-mono block">Category Placement</label>
                <select
                  value={customCat}
                  onChange={(e) => setCustomCat(e.target.value as any)}
                  className="w-full px-3.5 py-2 border border-stone-200 dark:border-slate-850 rounded-xl bg-stone-50 dark:bg-slate-900 text-xs font-bold text-stone-750 dark:text-stone-200 outline-none"
                >
                  <option value="utilities">Search & Reference Tool</option>
                  <option value="media">Multimedia (Streaming/Music)</option>
                  <option value="social">Social Connection Forums</option>
                  <option value="browsers">Web Layout Sandboxes</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 font-mono block">Short Descriptive Tag (Optional)</label>
                <textarea
                  rows={2}
                  maxLength={160}
                  placeholder="e.g., County governance board reports, tenders, agricultural planning outlines and news bulletins."
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  className="w-full px-3.5 py-2 border border-stone-200 dark:border-slate-850 rounded-xl bg-stone-50 dark:bg-slate-900 text-xs font-bold text-stone-800 dark:text-stone-100 outline-none focus:ring-2 focus:ring-red-550 resize-none font-sans"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-755 text-stone-700 dark:text-stone-250 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-black rounded-xl shadow-md transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <BookmarkPlus className="h-4 w-4 shrink-0" />
                  <span>Pin App</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
