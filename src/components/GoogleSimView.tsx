import React, { useState, useEffect, useRef } from "react";
import { 
  Search, Mic, Camera, Globe, Sparkles, BookOpen, Play, 
  ExternalLink, Grid, Compass, HelpCircle, CheckCircle2, 
  Bookmark, MapPin, TrendingUp, History, User, Image, AlertCircle, X,
  FileText, ArrowRight, ArrowLeft, RefreshCw
} from "lucide-react";

interface GoogleSimViewProps {
  iframeUrl: string;
  onNavigate: (url: string) => void;
}

export default function GoogleSimView({ iframeUrl, onNavigate }: GoogleSimViewProps) {
  // Extract search query from url if we are in search results page
  // url format e.g: https://www.google.com/search?q=query_string
  const getSearchQueryFromUrl = (url: string): string => {
    try {
      if (url.includes("/search")) {
        const urlObj = new URL(url);
        return urlObj.searchParams.get("q") || "";
      }
    } catch (e) {
      // Fallback manual parse for safety inside sandboxes
      const match = url.match(/[?&]q=([^&]+)/);
      if (match) return decodeURIComponent(match[1].replace(/\+/g, " "));
    }
    return "";
  };

  const queryParam = getSearchQueryFromUrl(iframeUrl);
  const isSearchMode = iframeUrl.includes("/search") && queryParam !== "";

  const [inputVal, setInputVal] = useState(queryParam);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "images" | "videos" | "maps">("all");
  
  // Voice Command Sim
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceSiriStage, setVoiceSiriStage] = useState(0); // 0: listening, 1: processing, 2: completing
  const [voiceSpokenText, setVoiceSpokenText] = useState("");

  // Lens Image Sim
  const [showLensModal, setShowLensModal] = useState(false);
  const [lensImageUrl, setLensImageUrl] = useState<string | null>(null);
  const [lensAnalyzing, setLensAnalyzing] = useState(false);
  const [lensResult, setLensResult] = useState<string | null>(null);

  // Sync input value if url query changes
  useEffect(() => {
    setInputVal(queryParam);
  }, [queryParam]);

  // Suggestions list based on text input
  const suggestions = [
    "Bungoma County western Kenya developments",
    "Agribusiness wealth bookkeeping template",
    "Faith & leadership theological curriculum",
    "Swahili vocabulary list for East Africa",
    "Academic books and technical journals Wafula",
    "Holy scriptures biblic concordance index",
    "Zion Vocational School IT exams",
    "How to improve scholastic writing style"
  ].filter(s => s.toLowerCase().includes(inputVal.toLowerCase()) && inputVal.trim() !== "");

  const handleSearchSubmit = (text: string) => {
    if (!text.trim()) return;
    setShowSuggestions(false);
    const encoded = encodeURIComponent(text.trim());
    onNavigate(`https://www.google.com/search?q=${encoded}`);
  };

  // Trigger simulated speech recognition
  const triggerVoiceSim = () => {
    setShowVoiceModal(true);
    setVoiceSiriStage(0);
    setVoiceSpokenText("");
    
    // Step 1: Simulated wave pulse
    setTimeout(() => {
      setVoiceSiriStage(1);
      setVoiceSpokenText("Searching for Bungoma...");
    }, 2000);

    // Step 2: Query formulation
    setTimeout(() => {
      setVoiceSiriStage(2);
    }, 3800);

    // Step 3: Trigger search!
    setTimeout(() => {
      setShowVoiceModal(false);
      handleSearchSubmit("Bungoma");
    }, 4800);
  };

  // Trigger simulated google lens analysis
  const handleLensImageSelect = (imgUrl: string) => {
    setLensImageUrl(imgUrl);
    setLensAnalyzing(true);
    setLensResult(null);

    setTimeout(() => {
      setLensAnalyzing(false);
      if (imgUrl.includes("maize") || imgUrl.includes("photo-1500937386664")) {
        setLensResult("🔍 Visual Match: Kenyan Maize Crop & Agribusiness Farming Sector (Bungoma County). Found multiple research journals!");
      } else if (imgUrl.includes("book") || imgUrl.includes("photo-1544716278")) {
        setLensResult("🔍 Visual Match: Scholarly Leadership Literature. Related academic ebook: Vocational Leadership by Wafula.");
      } else {
        setLensResult("🔍 Visual Match: High-Speed Digital Knowledge Node & Advanced Learning Resources.");
      }
    }, 2200);
  };

  // Generate responsive high-fidelity search items for query matching
  const generateSearchResults = (searchQuery: string) => {
    const q = searchQuery.toLowerCase();
    
    const results = [];

    // Result 1: Standard definition box / Wikipedia
    if (q.includes("bungoma") || q.includes("kenya") || q.includes("map") || q.includes("safari")) {
      results.push({
        title: "Bungoma County - Wikipedia, the free encyclopedia",
        url: "https://en.wikipedia.org/wiki/Bungoma",
        domain: "en.wikipedia.org › wiki › Bungoma",
        snippet: "Bungoma is a county in the former Western Province of Kenya. It is a vital region for agricultural development and academic institutions. Named landmarks include Mount Elgon and traditional cultural libraries under local digital leadership models.",
        isWiki: true
      });
      results.push({
        title: "Agribusiness Farming Solutions in Bungoma West - Scholarly Review",
        url: "https://www.google.com",
        domain: "wafula-agribusiness.ke › insights › western-kenya",
        snippet: "Discover how advanced bookkeeping, soil health, and maize cultivation are empowering rural farmers. View practical guides to self-reliance and church-led agriculture.",
        isStore: true
      });
    } else if (q.includes("faith") || q.includes("bible") || q.includes("church") || q.includes("scripture") || q.includes("jesus") || q.includes("god")) {
      results.push({
        title: "Galatians 2:20 Concordance - Bible Reference & Theological Interpretations",
        url: "devotional",
        domain: "bible-zion.org › study › concordance › galatians",
        snippet: "Galatians 2:20 is a cornerstone of Christian literature: 'I am crucified with Christ: nevertheless I live; yet not I, but Christ...' Read full cross references, Kiswahili translation copies, and daily devotionals.",
        isBible: true
      });
      results.push({
        title: "Zion Leadership Institute: Theological Classes and Vocational Credentials",
        url: "school",
        domain: "zion.org › academy › leadership-courses",
        snippet: "Engage in theological studies, Hermeneutics certification, and digital IT curricula structured for professional ministerial success. Enroll in course work offline.",
        isSchool: true
      });
    } else if (q.includes("book") || q.includes("store") || q.includes("read") || q.includes("leadership") || q.includes("management") || q.includes("literature")) {
      results.push({
        title: "Vocational Leadership Guide by Wafula Opara - Academic Book Store",
        url: "store",
        domain: "zion-books.ke › catalog › leadership-wafula",
        snippet: "Access the absolute standard handbook for sustainable administration, theological ethics, and modern agritech bookkeeping. Available instantly in full reading layout.",
        isStoreLink: true
      });
      results.push({
        title: "Study Journal & Scholarly Notepad - Wafula Digital OS Wallet",
        url: "https://www.google.com",
        domain: "scholarly-system › utilities › journal-storage",
        snippet: "Write summary descriptions, persistent book reviews, and academic study plans directly inside your secure offline vault.",
        isNotes: true
      });
    } else if (q.includes("swahili") || q.includes("language") || q.includes("teacher") || q.includes("translate")) {
      results.push({
        title: "Swahili Language Tutor - East African Conjugation and Grammar Guide",
        url: "language-teacher",
        domain: "swahili-tutor.org › basic-vocabulary-drills",
        snippet: "Expand Swahili greetings (Karibu), agricultural terms (Biashara ya kilimo), and theological quotes (Mungu akubariki). Fully optimized interactive worksheets.",
        isTeacher: true
      });
    } else {
      // General customized search index
      results.push({
        title: `Comprehensive Academic Study of ${searchQuery} - Digital Archive`,
        url: "store",
        domain: "zion-books.ke › search-archive › " + searchQuery.replace(/\s+/g, "-"),
        snippet: `Access fully indexed research documents, theological perspectives, and agritech spreadsheets detailing ${searchQuery}. Read instant offline reports formulated via digital OS hubs.`,
        isStore: true
      });
      results.push({
        title: `${searchQuery} Definition, Etymology & Scientific Notes`,
        url: "https://en.wikipedia.org/wiki/" + searchQuery.replace(/\s+/g, "_"),
        domain: "en.wikipedia.org › wiki › " + searchQuery.replace(/\s+/g, "_"),
        snippet: `Read historical references, peer-reviewed textbook analysis, and structural definitions of ${searchQuery} compiled globally.`,
        isWiki: true
      });
    }

    return results;
  };

  const results = generateSearchResults(queryParam);

  // Local shortcuts for Google Homepage
  const shortcuts = [
    { title: "Books Store", icon: <BookOpen className="h-5 w-5 text-red-500" />, viewUrl: "store" },
    { title: "Bible Study", icon: <Compass className="h-5 w-5 text-amber-500" />, viewUrl: "devotional" },
    { title: "Zion Class", icon: <Grid className="h-5 w-5 text-purple-500" />, viewUrl: "school" },
    { title: "Language Tutor", icon: <Globe className="h-5 w-5 text-emerald-500" />, viewUrl: "language-teacher" },
    { title: "PDF Docs", icon: <FileText className="h-5 w-5 text-blue-500" />, viewUrl: "studio" },
    { title: "Bungoma Map", icon: <MapPin className="h-5 w-5 text-teal-500" />, viewUrl: "maps" }
  ];

  return (
    <div className="w-full h-full min-h-[460px] bg-white text-stone-800 font-sans flex flex-col relative select-text" id="google-simulated-browser">
      
      {/* 1. HOMEPAGE MODE */}
      {!isSearchMode && (
        <div className="flex-1 flex flex-col justify-between py-6 px-4 sm:px-8">
          
          {/* Header Utilities */}
          <div className="flex justify-end items-center space-x-3.5 text-xs text-stone-600 font-medium select-none mb-4">
            <span className="hover:underline cursor-pointer" onClick={() => onNavigate("https://mail.google.com")}>Gmail</span>
            <span className="hover:underline cursor-pointer" onClick={() => onNavigate("store")}>Academic Books</span>
            <button className="p-1.5 hover:bg-stone-100 rounded-full transition" title="Google Workspace Apps">
              <Grid className="h-4 w-4 text-stone-600" />
            </button>
            <div className="h-7 w-7 rounded-full bg-red-700 text-white font-extrabold flex items-center justify-center text-xs shadow-md border border-red-800" title="Wafula Scholar System Profile">
              W
            </div>
          </div>

          {/* Centered Main Area */}
          <div className="max-w-2xl mx-auto w-full text-center my-auto flex flex-col items-center space-y-6">
            
            {/* Beautiful Multi-Colored Google Logo */}
            <div className="flex items-center space-x-1 hover:scale-105 transition duration-300 font-sans select-none tracking-tight py-4">
              <span className="text-5xl sm:text-6xl font-extrabold text-blue-600">G</span>
              <span className="text-5xl sm:text-6xl font-extrabold text-red-500">o</span>
              <span className="text-5xl sm:text-6xl font-extrabold text-yellow-500">o</span>
              <span className="text-5xl sm:text-6xl font-extrabold text-blue-600">g</span>
              <span className="text-5xl sm:text-6xl font-extrabold text-green-500">l</span>
              <span className="text-5xl sm:text-6xl font-extrabold text-red-500">e</span>
              <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-[10px] font-black text-blue-700 uppercase rounded-md tracking-wider">Kenya</span>
            </div>

            {/* Simulated Search input */}
            <div className="w-full relative max-w-xl">
              <form onSubmit={(e) => { e.preventDefault(); handleSearchSubmit(inputVal); }} className="relative">
                <Search className="absolute left-4 top-3.5 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => { setInputVal(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Search Google index or enter Wafula systems URL..."
                  className="w-full px-11 py-3 border border-stone-200 hover:shadow-md focus:shadow-md outline-none rounded-full text-sm font-semibold transition"
                />
                
                <div className="absolute right-4 top-3 flex items-center space-x-2 text-stone-500">
                  <button 
                    type="button" 
                    onClick={triggerVoiceSim} 
                    className="p-1 hover:bg-stone-150 rounded-full transition" 
                    title="Search by Voice (Simulation)"
                  >
                    <Mic className="h-4.5 w-4.5 text-blue-500 hover:text-blue-700 hover:scale-110" />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowLensModal(true)} 
                    className="p-1 hover:bg-stone-150 rounded-full transition" 
                    title="Search by Google Lens (Simulate AI Camera)"
                  >
                    <Camera className="h-4.5 w-4.5 text-red-500 hover:text-red-700 hover:scale-110" />
                  </button>
                </div>
              </form>

              {/* Suggestions Popup Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-12 left-0 right-0 bg-white border border-stone-200 rounded-2xl shadow-xl z-30 text-left overflow-hidden py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                  {suggestions.map((sug, i) => (
                    <div
                      key={i}
                      onClick={() => { setInputVal(sug); handleSearchSubmit(sug); }}
                      className="px-4.5 py-2.5 hover:bg-stone-50 cursor-pointer flex items-center space-x-3 text-xs font-semibold text-stone-700 transition"
                    >
                      <History className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                      <span className="truncate">{sug}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center items-center space-x-3 text-xs py-1.5 font-bold">
              <button
                type="button"
                onClick={() => handleSearchSubmit(inputVal || "Bungoma County")}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-150 hover:shadow border border-stone-100 text-stone-700 rounded-lg transition"
              >
                Google Search
              </button>
              <button
                type="button"
                onClick={() => handleSearchSubmit("Agribusiness Wealth")}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-150 hover:shadow border border-stone-100 text-stone-700 rounded-lg transition"
              >
                I'm Feeling Lucky
              </button>
            </div>

            {/* Local Language Offered */}
            <div className="text-[11px] text-stone-500 py-1 font-medium">
              Google in: <span className="text-blue-600 hover:underline cursor-pointer">Kiswahili</span>, <span className="text-blue-600 hover:underline cursor-pointer">English</span>, <span className="text-blue-600 hover:underline cursor-pointer">Bukusu</span>
            </div>

            {/* Quick Home Shortcuts */}
            <div className="w-full max-w-lg mt-6 pt-6 border-t border-stone-100 text-left">
              <span className="block text-[10px] font-black uppercase text-stone-400 tracking-wider font-mono mb-3">⚡ Quick Portal Shortcuts</span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {shortcuts.map((sc, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onNavigate(sc.viewUrl)}
                    className="flex flex-col items-center space-y-1.5 p-2 rounded-xl hover:bg-stone-50 border border-transparent hover:border-stone-200 transition text-center shrink-0 cursor-pointer"
                  >
                    <div className="h-9 w-9 rounded-full bg-stone-50 flex items-center justify-center shadow-xs">
                      {sc.icon}
                    </div>
                    <span className="text-[10px] font-black text-stone-605 truncate w-full">{sc.title}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Footer Area */}
          <div className="border-t border-stone-100 pt-3 flex flex-col sm:flex-row items-center justify-between text-[11px] text-stone-400/90 font-medium select-none mt-6">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-stone-400 shrink-0" />
              <span>Bungoma County, Western Kenya</span>
            </span>
            <div className="flex space-x-4 items-center mt-2 sm:mt-0 font-bold text-stone-500">
              <span className="hover:underline cursor-pointer">About</span>
              <span className="hover:underline cursor-pointer">Privacy</span>
              <span className="hover:underline cursor-pointer">Study Terms</span>
            </div>
          </div>

        </div>
      )}

      {/* 2. RESULTS MODE */}
      {isSearchMode && (
        <div className="flex-1 flex flex-col h-full bg-[#f8f9fa] dark:bg-stone-900">
          
          {/* SERP Search Box Top Banner */}
          <div className="bg-white border-b border-stone-200 p-4 sticky top-0 z-20 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              {/* Logo icon */}
              <div 
                onClick={() => onNavigate("https://www.google.com")} 
                className="cursor-pointer font-sans select-none tracking-tight flex items-center space-x-0.5 shrink-0"
              >
                <span className="text-lg font-black text-blue-600">G</span>
                <span className="text-lg font-black text-red-500">o</span>
                <span className="text-lg font-black text-yellow-500">o</span>
                <span className="text-lg font-black text-blue-600">g</span>
                <span className="text-lg font-black text-green-500">l</span>
                <span className="text-lg font-black text-red-500">e</span>
              </div>

              {/* Input field */}
              <div className="w-full max-w-lg relative">
                <form onSubmit={(e) => { e.preventDefault(); handleSearchSubmit(inputVal); }} className="relative">
                  <input
                    type="text"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    className="w-full pl-4 pr-12 py-1.5 border border-stone-200 shadow-sm focus:shadow-md outline-none rounded-full text-xs font-semibold text-stone-850"
                  />
                  <button type="submit" className="absolute right-3 top-2 text-blue-600 hover:text-blue-800">
                    <Search className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            </div>

            {/* Quick user avatar */}
            <div className="flex items-center space-x-3 text-xs select-none">
              <div className="h-7 w-7 rounded-full bg-indigo-650 text-white font-extrabold flex items-center justify-center text-[11px] shadow">
                W
              </div>
            </div>
          </div>

          {/* Navigation Categories Tabs Bar */}
          <div className="bg-white border-b border-stone-150 px-4 py-1.5 flex items-center space-x-4 text-[11px] font-black text-stone-500 select-none overflow-x-auto">
            <button 
              onClick={() => setActiveTab("all")} 
              className={`pb-1 px-1 border-b-2 transition ${activeTab === "all" ? "border-blue-650 text-blue-650" : "border-transparent hover:text-stone-800"}`}
            >
              All Results
            </button>
            <button 
              onClick={() => setActiveTab("images")} 
              className={`pb-1 px-1 border-b-2 transition ${activeTab === "images" ? "border-blue-650 text-blue-650" : "border-transparent hover:text-stone-800"}`}
            >
              Images
            </button>
            <button 
              onClick={() => setActiveTab("videos")} 
              className={`pb-1 px-1 border-b-2 transition ${activeTab === "videos" ? "border-blue-650 text-blue-650" : "border-transparent hover:text-stone-800"}`}
            >
              Videos
            </button>
            <button 
              onClick={() => {
                const encoded = encodeURIComponent(queryParam);
                onNavigate(`maps`);
              }} 
              className="pb-1 px-1 border-b-2 border-transparent hover:text-stone-800"
            >
              Maps Location
            </button>
          </div>

          {/* Search Statistics */}
          <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-2.5 text-[11px] text-stone-400 font-medium">
            About 4,280 results (0.28 seconds) for: <strong className="text-stone-600 font-bold">"{queryParam}"</strong>
          </div>

          {/* RESULTS CONTENT VIEW */}
          <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 flex flex-col md:flex-row gap-6 pb-12">
            
            {/* Left side standard listings */}
            <div className="flex-1 space-y-5.5 min-w-0">
              
              {/* IMAGE SEARCH MODE ONLY */}
              {activeTab === "images" ? (
                <div className="bg-white rounded-2xl p-4.5 border border-stone-200 shadow-xs">
                  <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest font-mono mb-4">📷 Google Image Results</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&q=80&w=300",
                      "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=300",
                      "https://images.unsplash.com/photo-1464226184884-fa280b87c3e9?auto=format&fit=crop&q=80&w=300",
                      "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80&w=300",
                      "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&q=80&w=300",
                      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=300"
                    ].map((imgSrc, idx) => (
                      <div key={idx} className="group aspect-video rounded-xl border border-stone-200 overflow-hidden relative cursor-zoom-in">
                        <img src={imgSrc} className="w-full h-full object-cover group-hover:scale-[1.05] transition duration-305" alt="Visual" referrerPolicy="no-referrer" />
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[9px] p-1 truncate font-mono text-center">Unsplash Standard</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : activeTab === "videos" ? (
                /* VIDEO SEARCH MODE ONLY */
                <div className="space-y-4">
                  {[
                    { title: "Bungoma County Growth & Agribusiness Systems", videoId: "fA8HhA9vIms", desc: "Discover primary growth indicators, agricultural centers, and training schools established to scale self-reliance." },
                    { title: "Theological Leadership Principles - Wafula Digital", videoId: "_jXW-eB3cQ8", desc: "A practical study course analyzing church stewardship, digital administration tools, and pastoral records." }
                  ].map((v, i) => (
                    <div key={i} className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-3">
                      <div>
                        <div className="text-[10px] text-red-650 font-bold uppercase tracking-wider font-mono">🎥 YouTube Direct Stream</div>
                        <h4 className="text-xs font-black text-blue-800 hover:underline cursor-pointer">{v.title}</h4>
                      </div>
                      <div className="aspect-video max-w-md rounded-lg overflow-hidden border border-stone-200 bg-black">
                        <iframe
                          src={`https://www.youtube.com/embed/${v.videoId}`}
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                          allowFullScreen
                          title="Search result video"
                        />
                      </div>
                      <p className="text-[11px] text-stone-500 leading-normal">{v.desc}</p>
                    </div>
                  ))}
                </div>
              ) : (
                /* CLASSIC ALL SEARCH LISTINGS */
                <>
                  {/* Google Featured Snippet */}
                  <div className="bg-white rounded-2xl p-4.5 border border-blue-150 shadow-sm relative overflow-hidden space-y-3">
                    <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-16 h-16 rounded-full bg-blue-500/5" />
                    <div className="flex items-center space-x-1.5 text-[10px] font-black text-blue-600 uppercase tracking-widest font-mono">
                      <Sparkles className="h-3 w-3 animate-pulse" />
                      <span>Featured Snippet Result</span>
                    </div>

                    <p className="text-[11.5px] font-sans font-medium text-stone-850 leading-relaxed">
                      Based on global reference libraries, <strong className="font-extrabold text-[#111827]">"{queryParam}"</strong> is fully supported offline inside the specialized Wafula learning suite. System components provide quick links, theological scriptures database indexes, and cash balance calculators designed for East African development.
                    </p>

                    <div className="border-t border-stone-100 pt-2 flex items-center justify-between text-[11px]">
                      <span className="text-stone-400 font-medium">Was this automatic summary helpful?</span>
                      <span className="text-blue-600 hover:underline font-bold cursor-pointer" onClick={() => onNavigate("store")}>
                        Read More Books ➜
                      </span>
                    </div>
                  </div>

                  {/* Organic Listings */}
                  {results.map((res, idx) => (
                    <div key={idx} className="bg-white rounded-2xl p-4.5 border border-stone-200 shadow-xs hover:border-blue-400 transition space-y-1.5 text-left">
                      <span className="text-[10px] text-stone-400 block truncate font-mono">{res.domain}</span>
                      
                      {/* URL navigation mapping */}
                      <h4 
                        onClick={() => onNavigate(res.url)}
                        className="text-xs sm:text-[13px] font-bold text-blue-700 hover:underline cursor-pointer hover:text-blue-950 font-sans tracking-tight"
                      >
                        {res.title}
                      </h4>

                      <p className="text-[11px] text-stone-500 leading-relaxed font-sans">{res.snippet}</p>
                      
                      <div className="pt-1 select-none">
                        {res.isWiki && (
                          <span className="inline-flex items-center space-x-1 bg-stone-105 border border-stone-200 text-stone-600 text-[9px] px-2 py-0.5 rounded-full font-bold">
                            📖 Opens Wikipedia Reader
                          </span>
                        )}
                        {res.isBible && (
                          <span className="inline-flex items-center space-x-1 bg-amber-50 border border-amber-200 text-amber-700 text-[9px] px-2 py-0.5 rounded-full font-bold">
                            🕊️ Opens Study Concordance
                          </span>
                        )}
                        {res.isSchool && (
                          <span className="inline-flex items-center space-x-1 bg-purple-50 border border-purple-200 text-purple-700 text-[9px] px-2 py-0.5 rounded-full font-bold">
                            🎓 Opens Theological Classes
                          </span>
                        )}
                        {res.isStoreLink && (
                          <span className="inline-flex items-center space-x-1 bg-red-50 border border-red-200 text-red-700 text-[9px] px-2 py-0.5 rounded-full font-bold">
                            📚 Reads eBook Inside Reader
                          </span>
                        )}
                        {res.isTeacher && (
                          <span className="inline-flex items-center space-x-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] px-2 py-0.5 rounded-full font-bold">
                            🗣️ Launches Vocabulary Tutor
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Google Related Search Links */}
                  <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs mt-4">
                    <span className="block text-[10px] font-black uppercase text-stone-400 tracking-wider font-mono mb-2.5">🔍 Related Searches</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-blue-700 font-bold font-sans">
                      {["Agribusiness in Kenya pdf", "Study notes hermeneutics free", "Swahili conjugations cheat sheet", "Bungoma County libraries maps"].map((rel, k) => (
                        <div 
                          key={k} 
                          onClick={() => { setInputVal(rel); handleSearchSubmit(rel); }}
                          className="hover:underline cursor-pointer flex items-center space-x-2 p-1.5 hover:bg-stone-50 rounded-lg transition"
                        >
                          <Search className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                          <span className="truncate">{rel}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

            </div>

            {/* Right side Google Knowledge Graph Card */}
            <div className="w-full md:w-80 shrink-0 space-y-4">
              
              <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden text-left">
                <div className="aspect-video w-full bg-stone-100 relative">
                  <img 
                    src={
                      queryParam.toLowerCase().includes("bungoma")
                        ? "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&q=80&w=350"
                        : queryParam.toLowerCase().includes("faith")
                        ? "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&q=80&w=350"
                        : "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=350"
                    } 
                    className="w-full h-full object-cover" 
                    alt="Knowledge Graph Thumbnail"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-transparent text-white p-3.5 flex items-end">
                    <div>
                      <span className="text-[9px] font-mono uppercase bg-red-700/80 px-1.5 py-0.5 rounded text-white block w-fit mb-0.5">Google Knowledge Graph</span>
                      <h4 className="text-sm font-black tracking-tight">{queryParam} - Topic Overview</h4>
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-3.5 text-xs text-stone-650 leading-relaxed font-sans">
                  <p className="text-[11px]">
                    {queryParam.toLowerCase().includes("bungoma") 
                      ? "Bungoma County is a regional powerhouse of agriculture, sugar milling, and maize supply situated in Western Kenya. It plays a significant academic and vocational training role."
                      : "A central focus in Wafula study guides, managing resources and high-fidelity local tracking coordinates safely."}
                  </p>

                  <div className="border-t border-stone-150 pt-3 space-y-2 font-medium">
                    <div className="flex justify-between">
                      <span className="text-stone-400">Headquarters / Location:</span>
                      <strong className="text-stone-800 font-bold">Western Province, KE</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">Host Services:</span>
                      <strong className="text-stone-800 font-bold">Wafula Secure Proxy</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">Encryption Standard:</span>
                      <strong className="text-stone-800 font-bold text-emerald-600 font-mono">SHA256 Client-Side</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onNavigate("store")}
                    className="w-full py-2 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl text-[10.5px] font-black text-center text-stone-800 uppercase tracking-wider transition"
                  >
                    📖 Read Reference eBooks
                  </button>
                </div>
              </div>

              {/* Secure sandbox warning */}
              <div className="bg-amber-50 rounded-2xl p-3.5 border border-amber-200 flex items-start gap-2.5 text-amber-900 leading-relaxed text-[10.5px]">
                <AlertCircle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-extrabold block">Did you know?</strong>
                  Some corporate servers configure strict frame headers blocking iframe embedding. Our unified Google Search engine resolves this by parsing results dynamically so you never see blank error screens!
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* 3. SIMULATED DICTATION VOICE MODAL */}
      {showVoiceModal && (
        <div className="fixed inset-0 z-[120] bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl border border-stone-200 scale-100 animate-in zoom-in-95 duration-200">
            <h4 className="text-xs font-black uppercase text-stone-400 tracking-wider font-mono">Google Voice Search Sim</h4>
            
            <div className="my-8 flex justify-center items-center">
              {voiceSiriStage === 0 ? (
                <div className="flex space-x-1 items-center h-10 select-none">
                  <div className="w-2.5 bg-blue-500 rounded-full animate-bounce h-8" />
                  <div className="w-2.5 bg-red-500 rounded-full animate-bounce h-5 [animation-delay:0.15s]" />
                  <div className="w-2.5 bg-yellow-500 rounded-full animate-bounce h-9 [animation-delay:0.3s]" />
                  <div className="w-2.5 bg-green-500 rounded-full animate-bounce h-6 [animation-delay:0.45s]" />
                </div>
              ) : (
                <div className="h-10 text-xs font-black text-blue-650 animate-pulse font-mono uppercase tracking-widest leading-none">
                  Processing Command...
                </div>
              )}
            </div>

            <p className="text-xs font-bold text-stone-705 h-8">
              {voiceSiriStage === 0 ? "🎤 Listening for query command..." : `🗣️ "${voiceSpokenText}"`}
            </p>

            <button
              onClick={() => setShowVoiceModal(false)}
              className="mt-4 px-4 py-1.5 bg-stone-100 font-bold hover:bg-stone-200 text-stone-500 rounded-lg text-[10px] uppercase cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 4. SIMULATED GOOGLE LENS IMAGE MODAL */}
      {showLensModal && (
        <div className="fixed inset-0 z-[120] bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full text-center shadow-2xl border border-stone-200 select-none">
            <div className="flex justify-between items-center pb-3 border-b border-stone-100 mb-4 text-left">
              <div className="flex items-center space-x-2">
                <Camera className="h-4.5 w-4.5 text-blue-600" />
                <h4 className="text-xs font-black uppercase text-stone-800 tracking-widest font-mono">Google Lens - Crop & Analyze</h4>
              </div>
              <button onClick={() => { setShowLensModal(false); setLensImageUrl(null); }} className="text-stone-400 hover:text-stone-650 p-1">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-[11px] text-stone-500 mb-4 leading-normal text-left">
              Simulate Google Lens image recognition! Select one of the preset visual clips to let Google AI analyze, classify, and match textbook contents.
            </p>

            {/* Presets Grid */}
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              {[
                { label: "Agribusiness Maize Crop", url: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=200" },
                { label: "Scholastic Literature Cover", url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=200" }
              ].map((p, idx) => (
                <div 
                  key={idx} 
                  onClick={() => handleLensImageSelect(p.url)}
                  className={`border p-1.5 rounded-xl text-center cursor-pointer hover:border-blue-500 transition-all ${lensImageUrl === p.url ? "border-blue-500 bg-blue-50/20" : "border-stone-150"}`}
                >
                  <img src={p.url} className="h-16 w-full object-cover rounded-lg mb-1" alt="" referrerPolicy="no-referrer" />
                  <span className="text-[9.5px] font-black text-stone-600 truncate block w-full">{p.label}</span>
                </div>
              ))}
            </div>

            {/* Analysis frame status */}
            {lensImageUrl && (
              <div className="bg-stone-50 rounded-xl p-3 border border-stone-150 text-left">
                {lensAnalyzing ? (
                  <div className="flex items-center space-x-2 text-xs font-bold text-blue-650 font-mono animate-pulse">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-500" />
                    <span>Analyzing Image vectors...</span>
                  </div>
                ) : (
                  <p className="text-[10.5px] text-stone-700 leading-normal font-sans font-medium">
                    {lensResult}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end space-x-2 mt-4 select-none">
              <button
                onClick={() => { setShowLensModal(false); setLensImageUrl(null); }}
                className="px-3.5 py-1.5 bg-stone-105 hover:bg-stone-150 text-stone-500 rounded-lg text-[10px] font-bold uppercase transition"
              >
                Close Lens
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
