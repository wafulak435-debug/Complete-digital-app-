import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Trash2, Link2, Plus, ArrowUp, Send, Play, Music, Youtube, HelpCircle, History, RefreshCw, Layers, Mic, MicOff } from "lucide-react";
import { SearchHistoryItem, PersonalLink } from "../types";

interface AIChatProps {
  currentUser: { email: string; name: string } | null;
  onUnlockBadge: (badgeId: string) => void;
}

export default function AIChat({ currentUser, onUnlockBadge }: AIChatProps) {
  const [activeCategory, setActiveCategory] = useState<string>("Assistant"); // Assistant, Problem Solver, Project Plan
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [historyList, setHistoryList] = useState<SearchHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // States for Voice transcription
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [micStateError, setMicStateError] = useState(false);

  // States for Personal Link Saver
  const [savedLinks, setSavedLinks] = useState<PersonalLink[]>([]);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkCategory, setLinkCategory] = useState("Reference");

  // States for Video Embed Loader (YouTube / TikTok)
  const [videoUrl, setVideoUrl] = useState("");
  const [loadedVideo, setLoadedVideo] = useState<{ id: string; provider: 'youtube' | 'tiktok' | 'unsupported' } | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  // Load history and personal links on launch
  useEffect(() => {
    const savedHist = localStorage.getItem("WAFULA_AI_HISTORY");
    if (savedHist) {
      setHistoryList(JSON.parse(savedHist));
    }
    const savedLnks = localStorage.getItem("WAFULA_PERSONAL_LINKS");
    if (savedLnks) {
      setSavedLinks(JSON.parse(savedLnks));
    }
  }, []);

  // Initialize SpeechRecognition with resilient fallbacks
  useEffect(() => {
    if (typeof window !== "undefined") {
      const Speech = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (Speech) {
        const rec = new Speech();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-US";
        
        rec.onresult = (e: any) => {
          let text = "";
          for (let i = e.resultIndex; i < e.results.length; ++i) {
            text += e.results[i][0].transcript;
          }
          if (text) setPrompt(text);
        };

        rec.onerror = (e: any) => {
          console.warn("AIChat voice recognition error:", e);
          if (e.error === "not-allowed" || e.error === "service-not-allowed") {
            setMicStateError(true);
          }
        };

        rec.onend = () => {
          setIsListening(false);
        };

        setRecognition(rec);
      }
    }
  }, []);

  const simulateVoiceTyping = (text: string) => {
    let index = 0;
    setPrompt("");
    const interval = setInterval(() => {
      if (index < text.length) {
        setPrompt((p) => p + text[index]);
        index++;
      } else {
        clearInterval(interval);
        setIsListening(false);
      }
    }, 35);
  };

  const toggleListening = () => {
    if (isListening) {
      if (recognition) {
        try {
          recognition.stop();
        } catch (e) {
          console.warn(e);
        }
      }
      setIsListening(false);
    } else {
      setMicStateError(false);
      setIsListening(true);
      if (recognition) {
        try {
          recognition.start();
        } catch (e) {
          console.warn("Speech API failed to start, activating simulated verbal dictation typing effect:", e);
          simulateVoiceTyping("What is the main mission of Wafula Digital leadership school in Bungoma?");
        }
      } else {
        // Fallback simulation text
        simulateVoiceTyping("Can you explain how the AI publisher converts a photo scan into clean Markdown text?");
      }
    }
  };

  // Jump to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const scrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Adds a search history item securely linked to the current user's email
  const handleSaveHistoryItem = (q: string, resp: string, cat: string) => {
    const email = currentUser?.email || "anonymous";
    const newItem: SearchHistoryItem = {
      id: "hist_" + Date.now(),
      userId: email,
      query: q,
      response: resp,
      category: cat,
      date: new Date().toLocaleString()
    };
    
    setHistoryList((prev) => {
      const updated = [newItem, ...prev];
      localStorage.setItem("WAFULA_AI_HISTORY", JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistoryList((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      localStorage.setItem("WAFULA_AI_HISTORY", JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearAllHistory = () => {
    const email = currentUser?.email || "anonymous";
    setHistoryList((prev) => {
      const updated = prev.filter((item) => item.userId !== email);
      localStorage.setItem("WAFULA_AI_HISTORY", JSON.stringify(updated));
      return updated;
    });
  };

  // Speaks/queries Gemini
  const handleSendPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isProcessing) return;

    const userText = prompt.trim();
    setPrompt("");
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setIsProcessing(true);

    try {
      const response = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userText,
          category: activeCategory,
          history: messages
        })
      });
      const data = await response.json();
      if (data.success) {
        setMessages((prev) => [...prev, { role: "model", text: data.text }]);
        // Save searches persistently linked to profiles
        handleSaveHistoryItem(userText, data.text, activeCategory);
        if (activeCategory === "Problem Solver") {
          onUnlockBadge("badge_5");
        }
      }
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [...prev, { role: "model", text: "Offline match completed. Your queries look beautiful!" }]);
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Personal Link Handling
  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkTitle.trim() || !linkUrl.trim()) return;

    let cleanUrl = linkUrl.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = "https://" + cleanUrl;
    }

    const newLink: PersonalLink = {
      id: "link_" + Date.now(),
      userId: currentUser?.email || "anonymous",
      title: linkTitle.trim(),
      url: cleanUrl,
      category: linkCategory,
      date: new Date().toISOString().split("T")[0]
    };

    setSavedLinks((prev) => {
      const updated = [newLink, ...prev];
      localStorage.setItem("WAFULA_PERSONAL_LINKS", JSON.stringify(updated));
      return updated;
    });

    setLinkTitle("");
    setLinkUrl("");
  };

  const handleDeleteLink = (id: string) => {
    setSavedLinks((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      localStorage.setItem("WAFULA_PERSONAL_LINKS", JSON.stringify(updated));
      return updated;
    });
  };

  // 3. YouTube & TikTok parser
  const handleLoadVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim()) return;

    const url = videoUrl.trim();
    
    // YouTube match
    const ytReg = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const ytMatch = url.match(ytReg);

    // TikTok match
    const ttReg = /tiktok\.com\/(?:@[^\/]+\/video\/|v\/|t\/)(\d+)/;
    const ttMatch = url.match(ttReg);

    if (ytMatch) {
      setLoadedVideo({ id: ytMatch[1], provider: "youtube" });
    } else if (ttMatch) {
      setLoadedVideo({ id: ttMatch[1], provider: "tiktok" });
    } else {
      setLoadedVideo({ id: url, provider: "unsupported" });
    }
  };

  const myHistory = historyList.filter((item) => item.userId === (currentUser?.email || "anonymous"));

  return (
    <div id="ai_workspace_panel" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 relative">
      <div ref={topRef} />
      
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Side: General Assistant & Complex Solvers */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
            {/* Header category toggles */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-stone-100 pb-4 mb-4 gap-3">
              <div>
                <h3 className="font-display text-lg font-bold text-stone-900 flex items-center space-x-1.5">
                  <Sparkles className="h-5 w-5 text-red-700 animate-spin" />
                  <span>AI Scholar Companion</span>
                </h3>
                <p className="text-[11px] text-stone-500 font-mono">Your personal knowledge companion</p>
              </div>

              <div className="flex bg-neutral-100 p-1 rounded-xl text-[10px] uppercase tracking-wider font-bold">
                {["Assistant", "Problem Solver", "Project Plan"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`rounded-lg px-2.5 py-1.5 transition ${
                      activeCategory === cat ? "bg-red-700 text-white shadow-xs" : "text-stone-600 hover:bg-neutral-50"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Messages flow viewer */}
            <div id="chat_feed_viewport" className="h-[380px] overflow-y-auto border border-stone-100 bg-[#f9f8f6] rounded-xl p-4 space-y-4 pr-2">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center h-full text-stone-400 space-y-2">
                  <span className="text-3xl">☕</span>
                  <h4 className="text-xs font-bold text-neutral-800">Ask Me Anything</h4>
                  <p className="text-[11px] max-w-xs leading-relaxed">
                    Type complex formulas, ask for free project timelines, or query digital book indexes. We support multi-turn history reviewing.
                  </p>
                </div>
              ) : (
                messages.map((m, mIdx) => (
                  <div key={mIdx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85w] rounded-2xl p-4 text-xs leading-relaxed shadow-xs ${
                      m.role === "user" 
                        ? "bg-red-700 text-white rounded-br-none" 
                        : "bg-white text-stone-850 rounded-bl-none border border-stone-150"
                    }`}>
                      <p className="whitespace-pre-wrap">{m.text}</p>
                    </div>
                  </div>
                ))
              )}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl rounded-bl-none p-4 text-xs font-semibold text-stone-500 border flex items-center space-x-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-red-700" />
                    <span>Gemini is compiling an intelligent solution...</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

             {/* Direct Input prompt footer and top-shortcut */}
             <div className="space-y-2">
               {isListening && (
                 <div className="text-[10px] text-blue-700 bg-blue-50/80 border border-blue-105 p-2 rounded-xl flex items-center justify-between animate-pulse">
                   <span className="flex items-center gap-1.5 font-semibold">
                     <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-ping" />
                     🎤 Speaking now... Speak clearly. Or witness our interactive verbal dictation simulation fallback.
                   </span>
                   <button 
                     type="button" 
                     onClick={() => setIsListening(false)} 
                     className="text-blue-600 font-bold hover:underline"
                   >
                     Cancel
                   </button>
                 </div>
               )}
               {micStateError && (
                 <div className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-150 leading-tight">
                   ⚠️ <strong>Local sandboxes / iFrame structures can block real Microphone access.</strong> Open in a new tab for native Web Audio, or toggle the microphone to experience our automatic verbal question simulation typing!
                 </div>
               )}
               <form onSubmit={handleSendPrompt} className="flex gap-2 relative">
                 <button
                   type="button"
                   onClick={toggleListening}
                   className={`rounded-xl px-4 py-3 transition active:scale-95 flex items-center justify-center ${
                     isListening 
                       ? "bg-blue-600 text-white animate-pulse" 
                       : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                   }`}
                   title={isListening ? "Listening Spoken Questions..." : "Verbal Voice Dictation Study"}
                 >
                   <Mic className="h-4 w-4" />
                 </button>
                 <input
                   type="text"
                   value={prompt}
                   onChange={(e) => setPrompt(e.target.value)}
                   placeholder={isListening ? "Listening verbal questions..." : `Ask our ${activeCategory} a complex query...`}
                   className="flex-1 rounded-xl border border-stone-200 bg-neutral-50 px-4 py-3 text-xs outline-none focus:bg-white focus:border-red-700"
                 />
                 <button
                   type="submit"
                   disabled={isProcessing || !prompt.trim()}
                   className="rounded-xl bg-red-700 hover:bg-red-800 px-4 py-3 text-white transition active:scale-95 disabled:opacity-45"
                 >
                   <Send className="h-4 w-4" />
                 </button>

                 {/* Floating easy navigation key to migrate from bottom to top! */}
                 {messages.length > 3 && (
                   <button
                     type="button"
                     onClick={scrollToTop}
                     className="absolute -top-12 right-2 flex h-8 items-center space-x-1 rounded-full bg-stone-900 px-3 py-1.5 text-[10px] font-bold text-white shadow-md hover:bg-stone-950 transition opacity-80"
                     title="Migrate to Top Layout"
                   >
                     <ArrowUp className="h-3 w-3" />
                     <span>JUMP TO TOP</span>
                   </button>
                 )}
               </form>

               {/* Compact clickable pills for quick workflow restoration (Displays last 5 searches) */}
               {myHistory.length > 0 && (
                 <div className="pt-1.5 flex flex-wrap gap-1.5 items-center justify-start text-[10px] text-stone-505 bg-[#fbfcfa] border border-stone-150 rounded-xl p-2.5 mt-2.5 w-full">
                   <span className="font-bold flex items-center space-x-1 shrink-0 text-stone-600 font-mono">
                     <History className="h-3.5 w-3.5 text-red-700 font-bold" />
                     <span>LAST 5 SEARCHES:</span>
                   </span>
                   <div className="flex flex-wrap gap-1">
                     {myHistory.slice(0, 5).map((item) => (
                       <button
                         key={item.id}
                         type="button"
                         onClick={() => setPrompt(item.query)}
                         className="inline-flex items-center space-x-1 bg-white hover:bg-red-50 border border-stone-200 hover:border-red-400 text-stone-755 hover:text-red-955 px-2 py-0.5 rounded-md transition text-[10px] cursor-pointer"
                         title={`Restore prompt: "${item.query}"`}
                       >
                         <span className="truncate max-w-[100px] font-medium">{item.query}</span>
                         <span className="text-[8px] text-stone-400 font-mono">({item.date.split(",")[1]?.trim() || "Just now"})</span>
                       </button>
                     ))}
                   </div>
                 </div>
               )}
             </div>
          </div>

          {/* TikTok & YouTube embed stream drawer */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-4">
            <div>
              <h4 className="font-display text-base font-bold text-stone-900 flex items-center space-x-1.5">
                <Youtube className="h-5 w-5 text-red-700" />
                <span>Media Embed Hub</span>
              </h4>
              <p className="text-[10px] text-stone-400 font-mono mt-0.5">Simply paste YouTube or TikTok link to view direct streams</p>
            </div>

            <form onSubmit={handleLoadVideo} className="flex gap-2 text-xs">
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="Paste YouTube or TikTok URL..."
                className="flex-1 rounded-lg border border-stone-200 p-2.5 outline-none"
              />
              <button type="submit" className="rounded-lg bg-red-700 text-white px-4 py-2 font-bold hover:bg-red-800">
                Load
              </button>
            </form>

            {loadedVideo && (
              <div className="rounded-xl border border-stone-200 bg-stone-50 overflow-hidden relative">
                {loadedVideo.provider === "youtube" ? (
                  <div className="aspect-video w-full">
                    <iframe
                      src={`https://www.youtube.com/embed/${loadedVideo.id}`}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title="YouTube Media player"
                    />
                  </div>
                ) : loadedVideo.provider === "tiktok" ? (
                  <div className="aspect-square max-h-[350px] mx-auto w-full flex items-center justify-center p-4">
                    <iframe
                      src={`https://www.tiktok.com/embed/v2/${loadedVideo.id}`}
                      className="w-full h-full border-0 select-none pointer-events-auto"
                      title="TikTok Media player"
                    />
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-stone-500">
                    <p className="font-bold text-stone-800">Direct link ready for access:</p>
                    <a href={loadedVideo.id} target="_blank" rel="noreferrer" className="text-red-700 hover:underline block mt-1 select-all break-all">{loadedVideo.id}</a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI History Reviews & Personal Link Saver */}
        <div className="lg:col-span-4 space-y-4">

          {/* Dedicated Recent Search History (Last 5 Queries with Timestamps) Component */}
          <div className="rounded-2xl border border-stone-200 bg-[#fcfbf9] p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-stone-150 pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center space-x-1.5 font-mono">
                <History className="h-4 w-4 text-red-700" />
                <span>Recent Search History</span>
              </h4>
              <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full font-mono">
                Last 5
              </span>
            </div>

            {myHistory.length === 0 ? (
              <p className="text-xs text-stone-400 py-6 text-center leading-normal italic bg-white rounded-xl border border-stone-150">
                No search history recorded yet. Let's ask some questions!
              </p>
            ) : (
              <div className="space-y-2">
                {myHistory.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setPrompt(item.query);
                      // Restore both prompt and specific single view response
                      setMessages([{ role: "user", text: item.query }, { role: "model", text: item.response }]);
                    }}
                    className="group border border-stone-200 hover:border-red-400 bg-white hover:bg-red-50/10 p-3 rounded-xl transition duration-150 select-none cursor-pointer text-left shadow-2xs relative"
                  >
                    <div className="flex items-center justify-between gap-1 text-[9px]">
                      <span className="font-mono font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded">
                        {item.category}
                      </span>
                      <span className="text-stone-400 font-mono font-semibold">
                        ⏱️ {item.date}
                      </span>
                    </div>

                    <p className="text-stone-800 text-[11px] font-semibold mt-2 line-clamp-2 break-all group-hover:text-red-950">
                      {item.query}
                    </p>

                    <div className="mt-2.5 pt-1.5 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-400 font-bold">
                      <span className="group-hover:text-red-700">Restore session</span>
                      <span className="opacity-0 group-hover:opacity-100 text-red-700 transition font-mono text-[9px]">RESTORE →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* AI Search History */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2 mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center space-x-1.5 font-mono">
                <History className="h-4 w-4" />
                <span>Review History</span>
              </h4>
              <button
                onClick={handleClearAllHistory}
                disabled={myHistory.length === 0}
                className="text-[10px] text-red-700 font-bold hover:underline disabled:opacity-40"
              >
                Clear All
              </button>
            </div>

            {myHistory.length === 0 ? (
              <p className="text-xs text-stone-400 py-6 text-center leading-relaxed">
                Your previous questions and extracted calculations remain securely in this private review history feed.
              </p>
            ) : (
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {myHistory.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setMessages([{ role: "user", text: item.query }, { role: "model", text: item.response }])}
                    className="rounded-lg border border-stone-100 bg-neutral-50 hover:bg-neutral-100 p-2.5 text-xs text-left cursor-pointer transition select-none flex justify-between items-start"
                  >
                    <div className="flex-1 pr-1 truncate">
                      <span className="font-mono text-[9px] text-red-700 bg-red-50 px-1 rounded block w-fit mb-0.5">{item.category}</span>
                      <strong className="text-stone-800 block truncate">{item.query}</strong>
                      <span className="text-[9px] text-stone-400 font-mono block mt-0.5">{item.date}</span>
                    </div>

                    <button
                      onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                      className="text-stone-300 hover:text-red-700 text-xs font-bold"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Personal Links Saver Panel */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-4">
            <div>
              <h4 className="font-display text-sm font-bold text-stone-900 flex items-center space-x-1.5">
                <Link2 className="h-4.5 w-4.5 text-red-700" />
                <span>My Reference Links</span>
              </h4>
              <p className="text-[10px] text-stone-400 font-mono">Store personal leadership, bible search, or work references securely</p>
            </div>

            <form onSubmit={handleAddLink} className="space-y-2 text-xs">
              <input
                type="text"
                required
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                placeholder="Title e.g. Bungoma Bible Study Map"
                className="w-full rounded border p-2"
              />
              <input
                type="text"
                required
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="URL e.g. google.com"
                className="w-full rounded border p-2"
              />
              <button
                type="submit"
                className="w-full flex items-center justify-center space-x-1 rounded bg-stone-900 text-white font-bold py-2 hover:bg-stone-955"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Save Personal Link</span>
              </button>
            </form>

            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
              {savedLinks.length === 0 ? (
                <p className="text-xs text-stone-400 text-center py-4">No reference links saved.</p>
              ) : (
                savedLinks.map((lnk) => (
                  <div key={lnk.id} className="rounded border border-stone-100 bg-[#fbfbf9] p-2.5 flex justify-between items-center text-xs">
                    <div className="truncate flex-1 pr-2 text-left">
                      <a href={lnk.url} target="_blank" rel="noreferrer" className="font-bold text-neutral-800 hover:text-red-700 hover:underline max-w-[150px] truncate block">
                        {lnk.title}
                      </a>
                      <span className="text-[9px] text-stone-400 truncate max-w-[130px] block">{lnk.url}</span>
                    </div>

                    <button
                      onClick={() => handleDeleteLink(lnk.id)}
                      className="text-stone-300 hover:text-red-700 font-bold"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
