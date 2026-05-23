import React, { useState, useEffect } from "react";
import { BookOpen, Search, Bookmark, Sun, Play, Pause, Volume2, Settings, HelpCircle, Sparkles } from "lucide-react";
import { BIBLE_DATA, DEVOTIONALS } from "../data";

interface BibleProps {
  onUnlockBadge: (badgeId: string) => void;
}

export default function Bible({ onUnlockBadge }: BibleProps) {
  const [activeTab, setActiveTab] = useState<"read" | "devotional" | "saved">("read");
  const [selectedVersion, setSelectedVersion] = useState("KJV");
  const [selectedBook, setSelectedBook] = useState("John");
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [query, setQuery] = useState("");
  const [savedVerses, setSavedVerses] = useState<string[]>([]);

  // Text to Speech States
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1.0); // 0.5 to 2.0
  const [pitch, setPitch] = useState(1.0); // 0.5 to 1.5
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Load synthesizers
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const loadVoices = () => {
        const list = window.speechSynthesis.getVoices();
        setVoices(list);
        if (list.length > 0 && !selectedVoice) {
          // Select a professional sounding default English voice
          const defaultVoice = list.find(v => v.lang.includes("en")) || list[0];
          setSelectedVoice(defaultVoice);
        }
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Sync saved verses on launch
  useEffect(() => {
    const saved = localStorage.getItem("WAFULA_SAVED_VERSES");
    if (saved) {
      setSavedVerses(JSON.parse(saved));
    }
  }, []);

  const handleToggleSave = (refStr: string) => {
    setSavedVerses((prev) => {
      const next = prev.includes(refStr) ? prev.filter((v) => v !== refStr) : [...prev, refStr];
      localStorage.setItem("WAFULA_SAVED_VERSES", JSON.stringify(next));
      return next;
    });
  };

  // Speaks verses text via standard SpeechSynthesis
  const handleSpeak = (textToSpeak: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Voice speech synthesis is not supported in this browser.");
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    const cleanedText = textToSpeak.replace(/^\d+/, ""); // strip index markers
    const utterance = new SpeechSynthesisUtterance(cleanedText);
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    // Config controls
    utterance.rate = speed;
    utterance.pitch = pitch;

    utterance.onend = () => {
      setIsPlaying(false);
    };

    utterance.onerror = (err) => {
      console.error("SpeechSynthesis error:", err);
      setIsPlaying(false);
    };

    setIsPlaying(true);
    window.speechSynthesis.speak(utterance);
    // Triggers devotion badge unlocking
    onUnlockBadge("badge_2");
  };

  const handleStopSpeech = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
  };

  const currentVerses = BIBLE_DATA[selectedBook]?.[selectedChapter] || [
    "Select an active Bible Book and Chapter to populate scriptures."
  ];

  // Simulated Version translations in real time for variety!
  const translateVerse = (txt: string, version: string) => {
    if (version === "KJV") return txt;
    // Fast mock transformer representing different standard text alignments
    let next = txt;
    if (version === "NIV") {
      next = next
        .replace("Word was God", "Word was fully divine")
        .replace("shineth in darkness", "shines in the dark times")
        .replace("The same was", "He was present");
    } else if (version === "ESV") {
      next = next
        .replace("In the beginning", "At the very start")
        .replace("Word was God", "Word was God himself");
    } else if (version === "ASV") {
      next = next
        .replace("All things were made by him", "All things came into existence through him");
    }
    return next;
  };

  return (
    <div id="bible_reader_panel" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-stone-200 pb-5 mb-6">
        <div>
          <h2 className="font-display text-3xl font-extrabold pb-1">Bible <span className="text-red-700">Reader</span></h2>
          <p className="text-xs text-neutral-500">Read scriptures, explore daily devotions, and listen in hands-free with adjustable playback audio.</p>
        </div>

        {/* Dynamic tabs */}
        <div className="flex border border-stone-200 rounded-xl overflow-hidden mt-4 md:mt-0 max-w-xs self-start">
          <button
            onClick={() => setActiveTab("read")}
            className={`flex-1 px-4 py-2 text-xs font-semibold ${
              activeTab === "read" ? "bg-red-700 text-white" : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            Read
          </button>
          <button
            onClick={() => setActiveTab("devotional")}
            className={`flex-1 px-4 py-2 text-xs font-semibold ${
              activeTab === "devotional" ? "bg-red-700 text-white" : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            Devotional
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`flex-1 px-4 py-2 text-xs font-semibold ${
              activeTab === "saved" ? "bg-red-700 text-white" : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            Saved ({savedVerses.length})
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Control Column (Version, Book, Settings, Speech) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Version and Book Chooser */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wide text-stone-500 mb-4 font-mono">Book Calibration</h3>
            
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-stone-500 mb-1 font-semibold">Active Translation</label>
                <select
                  value={selectedVersion}
                  onChange={(e) => setSelectedVersion(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 bg-neutral-50 p-2 font-bold outline-none"
                >
                  <option value="KJV">King James Version (KJV)</option>
                  <option value="NIV">New International Version (NIV)</option>
                  <option value="ESV">English Standard Version (ESV)</option>
                  <option value="ASV">American Standard Version (ASV)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-stone-500 mb-1 font-semibold">Book</label>
                  <select
                    value={selectedBook}
                    onChange={(e) => {
                      setSelectedBook(e.target.value);
                      setSelectedChapter(1);
                    }}
                    className="w-full rounded-lg border border-stone-200 bg-neutral-50 p-2 font-bold outline-none"
                  >
                    {Object.keys(BIBLE_DATA).map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-500 mb-1 font-semibold">Chapter</label>
                  <select
                    value={selectedChapter}
                    onChange={(e) => setSelectedChapter(parseInt(e.target.value))}
                    className="w-full rounded-lg border border-stone-200 bg-neutral-50 p-2 font-bold outline-none"
                  >
                    {Object.keys(BIBLE_DATA[selectedBook] || {}).map((ch) => (
                      <option key={ch} value={ch}>Chapter {ch}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Integrated Speech Controller (Text-to-Speech Engine) */}
          <div className="rounded-2xl border border-stone-200 bg-stone-900 text-white p-5 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 text-amber-400">
              <Volume2 className="h-4 w-4 animate-bounce" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider">AUDIO TTS ENGINE</span>
            </div>

            <p className="text-[11px] text-stone-400 leading-relaxed">
              Listen to the current chapter read aloud dynamically. Set specific voice tone pitch and speed controllers using your client-side synthesizer.
            </p>

            <div className="space-y-3 text-xs">
              {/* Playback rate */}
              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Playback Speed</span>
                  <span className="text-amber-400 font-mono">{speed}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.10"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Pitch */}
              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Voice Pitch / Tone</span>
                  <span className="text-amber-400 font-mono">{pitch === 0.5 ? "Low" : pitch === 1.5 ? "High" : "Normal"}</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.10"
                  value={pitch}
                  onChange={(e) => setPitch(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Voice selector */}
              {voices.length > 0 && (
                <div>
                  <label className="block text-stone-400 mb-1 font-semibold">Select Voice Tone</label>
                  <select
                    value={selectedVoice?.name || ""}
                    onChange={(e) => {
                      const v = voices.find(vc => vc.name === e.target.value);
                      if (v) setSelectedVoice(v);
                    }}
                    className="w-full rounded bg-stone-800 text-white p-1 text-[11px] border border-stone-700 outline-none"
                  >
                    {voices.filter(vc => vc.lang.includes("en") || vc.lang.includes("sw")).map((vc) => (
                      <option key={vc.name} value={vc.name}>{vc.name} ({vc.lang})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1.5">
              <button
                onClick={() => handleSpeak(currentVerses.join(" "))}
                className="flex items-center justify-center space-x-1.5 rounded-lg bg-amber-500 text-stone-950 font-bold py-2.5 text-xs hover:bg-amber-400 transition"
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                <span>{isPlaying ? "Pause Speech" : "Speak Chapter"}</span>
              </button>

              <button
                onClick={handleStopSpeech}
                className="rounded-lg border border-stone-700 hover:bg-stone-800 py-2.5 text-xs text-stone-300 font-bold"
              >
                Reset Engine
              </button>
            </div>
          </div>
        </div>

        {/* Right Scripture / Content Column */}
        <div className="lg:col-span-8">
          {activeTab === "read" && (
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h3 className="font-display text-xl font-bold text-neutral-900">
                  {selectedBook} {selectedChapter}
                </h3>
                <span className="font-mono text-xs font-bold text-red-700 tracking-wider uppercase bg-red-50 px-2 py-1 rounded">
                  {selectedVersion} Translation
                </span>
              </div>

              <div id="scripture_body_content" className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {currentVerses.map((vText, idx) => {
                  const verseNum = idx + 1;
                  const refStr = `${selectedBook} ${selectedChapter}:${verseNum}`;
                  const isSaved = savedVerses.includes(refStr);
                  const renderedText = translateVerse(vText, selectedVersion);

                  return (
                    <div key={idx} className="group relative rounded-lg p-3 hover:bg-neutral-50 transition border-l-2 border-transparent hover:border-red-650 flex items-start space-x-3.5">
                      <span className="font-mono text-xs font-bold text-red-750 select-none pt-0.5">{verseNum}</span>
                      <p className="text-xs text-neutral-800 leading-relaxed flex-1">
                        {renderedText}
                      </p>
                      
                      {/* Save bookmarks */}
                      <button
                        onClick={() => handleToggleSave(refStr)}
                        className={`text-stone-300 hover:text-red-700 transition lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100 ${
                          isSaved ? "!opacity-100 !text-red-700" : ""
                        }`}
                        title={isSaved ? "Saved to favorites" : "Bookmark this verse"}
                      >
                        <Bookmark className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "devotional" && (
            <div className="space-y-5">
              {DEVOTIONALS.map((d) => (
                <div key={d.id} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 h-20 w-20 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
                  <div className="flex items-center space-x-2 text-amber-800 font-mono text-[10px] font-bold uppercase tracking-wider">
                    <Sun className="h-3.5 w-3.5 text-amber-600 animate-spin" />
                    <span>DAILY COVENANT STUDY • {d.date}</span>
                  </div>

                  <h3 className="font-display text-lg font-bold text-stone-900">{d.title}</h3>
                  <div className="rounded-xl bg-neutral-50 border border-stone-100 p-3.5 font-bold font-mono text-xs text-red-800">
                    📖 Key Verse: {d.verse}
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed">{d.reflection}</p>

                  <div className="border-t border-stone-100 pt-3 text-xs text-stone-700 leading-relaxed">
                    <strong className="text-stone-900 block mb-1">Prayer Point:</strong>
                    "{d.prayer}"
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      onClick={() => handleSpeak(`${d.title}. Verse is ${d.verse}. Reflection is: ${d.reflection}. Prayer: ${d.prayer}`)}
                      className="flex items-center space-x-1 border border-stone-200 bg-neutral-50 px-3 py-1.5 text-xs text-stone-600 font-bold hover:bg-neutral-100 rounded-lg"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                      <span>{isPlaying ? "Pause Text" : "Listen to Devotion"}</span>
                    </button>

                    <div className="text-[10px] text-stone-400 font-mono">Curated by Wafula Digital Publications</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "saved" && (
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
              <h3 className="font-display text-lg font-bold text-neutral-950 mb-4">Bookmarked Verses</h3>
              
              {savedVerses.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center justify-center">
                  <span className="text-3xl">🔖</span>
                  <p className="text-xs text-stone-500 mt-2">No bookmarked verses yet. Keep bookmarks clicking the ribbon next to verses while studying!</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {savedVerses.map((refStr, vIdx) => {
                    const parts = refStr.match(/([^0-9]+)\s(\d+):(\d+)/);
                    let displayBook = "John";
                    let displayCh = 1;
                    let displayV = 1;
                    if (parts) {
                      displayBook = parts[1].trim();
                      displayCh = parseInt(parts[2]);
                      displayV = parseInt(parts[3]);
                    }
                    const storedTexts = BIBLE_DATA[displayBook]?.[displayCh];
                    const verseTxt = storedTexts ? storedTexts[displayV - 1] : "Scripture reference synchronized offline.";

                    return (
                      <div key={vIdx} className="rounded-lg border border-stone-150 p-3.5 hover:bg-stone-50 transition space-y-2 relative">
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-xs font-bold text-red-800">{refStr}</span>
                          <button
                            onClick={() => handleToggleSave(refStr)}
                            className="text-stone-400 hover:text-red-700 text-xs font-bold"
                          >
                            Remove
                          </button>
                        </div>
                        <p className="text-xs text-neutral-800 italic leading-relaxed">"{verseTxt}"</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
