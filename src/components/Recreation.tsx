import React, { useState } from "react";
import { Play, Sparkles, Compass, Youtube, Search, Check, FileText, BookOpen, Volume2, Film, RefreshCw, Layers } from "lucide-react";

interface RecreationProps {
  currentUser: any;
  onUnlockBadge: (id: string) => void;
}

export default function Recreation({ currentUser, onUnlockBadge }: RecreationProps) {
  const [activeTab, setActiveTab] = useState<"videos" | "novel">("videos");
  const [videoSearch, setVideoSearch] = useState("");
  const [videoCategory, setVideoCategory] = useState("All");

  // Novel generator states
  const [suggestedTopic, setSuggestedTopic] = useState("");
  const [userCustomTopic, setUserCustomTopic] = useState("");
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [selectedLength, setSelectedLength] = useState<"short" | "long">("short");
  const [generatedStory, setGeneratedStory] = useState<{
    title: string;
    topic: string;
    content: string;
  } | null>(null);

  // 20 pre-populated visual categories for story generation
  const topicPresets = [
    { title: "Sailing Through Africa", category: "Adventure", icon: "⛵" },
    { title: "The Future of Solar Energy", category: "Engineering", icon: "☀️" },
    { title: "Bungoma Legacy of Faith", category: "Inspirational", icon: "⛪" },
    { title: "Quantum Physics for Children", category: "Science", icon: "⚛️" },
    { title: "The Swimming Champion of Lake Victoria", category: "Sports", icon: "🏊" },
    { title: "How to Build a Football Stadium", category: "Engineering", icon: "⚽" },
    { title: "Secret of the Forgotten Library", category: "Mystery", icon: "📚" },
    { title: "Grace Under Fire: Leadership", category: "Inspirational", icon: "🔥" },
    { title: "A Journey into Deep Robotics", category: "Science", icon: "🤖" },
    { title: "The Great Savannah Bike Rally", category: "Sports", icon: "🚴" },
    { title: "Under the African Sky: A novel", category: "Romance", icon: "🌌" },
    { title: "Mastery of Civil Construction", category: "Engineering", icon: "🏗️" },
    { title: "Echoes of Bungoma High School", category: "Drama", icon: "🏫" },
    { title: "Mindfulness and Breathing Daily", category: "Health", icon: "🧘" },
    { title: "The Digital Publishing Odyssey", category: "Technology", icon: "💻" },
    { title: "Wisdom of our Forefathers", category: "History", icon: "👴" },
    { title: "The Motorbike Mechanic's Dream", category: "Adventure", icon: "🏍️" },
    { title: "Sermon on the Mountain Peaks", category: "Religion", icon: "🧗" },
    { title: "Baking of Kenya Bread Crafts", category: "Artisan", icon: "🍞" },
    { title: "The Girl Who Talked to Stars", category: "Fiction", icon: "✨" }
  ];

  // YouTube mock items
  const videosList = [
    {
      id: "v1",
      title: "Swimming Masterclass: Perfecting the Butterfly Stroke",
      category: "Swimming",
      duration: "14:20",
      channel: "Swim Elite Global",
      views: "1.2M views",
      embedId: "swimming_class",
      thumbnail: "https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?q=80&w=400&auto=format&fit=crop"
    },
    {
      id: "v2",
      title: "Bungoma Green Stadium Construction & Engineering Tour",
      category: "Engineering",
      duration: "25:40",
      channel: "Civil Pro Kenya",
      views: "240k views",
      embedId: "bungoma_stadium",
      thumbnail: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=400&auto=format&fit=crop"
    },
    {
      id: "v3",
      title: "Tactics of World-Class Football Champions Explained",
      category: "Football",
      duration: "18:15",
      channel: "Tactics Lounge",
      views: "850k views",
      embedId: "football_tactics",
      thumbnail: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=400&auto=format&fit=crop"
    },
    {
      id: "v4",
      title: "How to Read a Book a Day: Executive Reading Formula",
      category: "Reading Books",
      duration: "12:05",
      channel: "Smart Literacy Hub",
      views: "3.1M views",
      embedId: "reading_daily",
      thumbnail: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=400&auto=format&fit=crop"
    },
    {
      id: "v5",
      title: "Modern Bridge Engineering and Deep Pillar Technology",
      category: "Engineering",
      duration: "30:12",
      channel: "MegaStructures Intl",
      views: "1.5M views",
      embedId: "mega_bridge",
      thumbnail: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=400&auto=format&fit=crop"
    },
    {
      id: "v6",
      title: "Kenya Premier League Highlights & Stadium Atmospheres",
      category: "Football",
      duration: "10:44",
      channel: "KPL Sports News",
      views: "180k views",
      embedId: "kpl_football",
      thumbnail: "https://images.unsplash.com/photo-1518063319789-7217e6706b04?q=80&w=400&auto=format&fit=crop"
    }
  ];

  const handleSelectTopic = (title: string) => {
    setSuggestedTopic(title);
    setUserCustomTopic("");
  };

  const handleGenerateStory = () => {
    const finalTopic = userCustomTopic.trim() || suggestedTopic;
    if (!finalTopic) {
      alert("Please select one of the 20 pre-populated topics or type your own first.");
      return;
    }

    setIsGeneratingStory(true);
    setGeneratedStory(null);

    setTimeout(() => {
      // High quality generated novel stories
      let content = "";
      if (selectedLength === "short") {
        content = `The morning sun broke gently across the landscape, casting long, elegant shadows over the rolling savannah ridges. For years, the topic of ${finalTopic} had been debated in small library circles, but today, a tangible shift was felt. 

People converged near the main study arch, holding hand-written drafts and digital devices alike. "This is not just an idea," whispered a young regional coordinator, staring at the blueprints. "This is the blueprint for our tomorrow." 

With deep courage and dedication, Kelvin raised his hands to prompt the circle. They didn't just understand the mechanics; they embraced the vision. Every milestone reached that afternoon cemented the truth that digital literacy fused with deep spiritual conviction could conquer any structural border. By sunset, as the warm African trade winds whispered through the acacia trees, the first chapter of their greatest story was officially authored.`;
      } else {
        content = `CHAPTER ONE: THE SACRED BLUEPRINT
The horizon glowed like molten copper. Standing at the peak, Kelvin looked down upon the community below. The challenge of ${finalTopic} had occupied his thoughts during endless sleepless nights. Inside his leather notebook, schematic diagrams of solar nodes were intertwined with inspiring theological verses.

Chapter 1 was clear: "Empowerment belongs to those who prepare." Far beyond regional boundaries, people from every corner of the world had begun downloading the digital hub. They sought not cookies-and-cream entertainment, but raw, unfiltered instruction. Modern engineering, the mechanics of structural steel, and the profound depth of strategic logic.

CHAPTER TWO: THE COMMUNITY GATHERS
By mid-day, the workspace was filled. Multiple files—images of civil structures, audio recordings of local devotional songs, and complex legal documents—had been uploaded directly into the AI compiler. The server arrays processed data with stunning accuracy.

"We are building a bridge," Kelvin announced, his voice carrying the weight of generational determination. "This bridge is built with books, codes, and strategic action. No minor admin, no physical lock, and no payment limitation will ever slow our progress. The core AI will remain completely unlocked, freely accessible, and offline-compatible for all."

CHAPTER THREE: AN UNSTOPPABLE FUTURE
The story of their victory was not written in boardrooms, but in the sweat of active builders. As the sun set, the system completed its compile. A quiet beep confirmed that the new digital books were pinned securely onto the main bookstore wall, notifying thousands of global learners. Their world was now permanently joined.`;
      }

      setGeneratedStory({
        title: finalTopic,
        topic: finalTopic,
        content
      });

      setIsGeneratingStory(false);
      onUnlockBadge("badge_6"); // Unlock Creator Companion Badge
    }, 1500);
  };

  const filteredVideos = videosList.filter((v) => {
    const matchesSearch = v.title.toLowerCase().includes(videoSearch.toLowerCase()) ||
                          v.channel.toLowerCase().includes(videoSearch.toLowerCase());
    const matchesCat = videoCategory === "All" || v.category === videoCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div id="recreation_site_hub" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8 select-none">
      
      {/* Recreation Site Header */}
      <div className="rounded-2xl bg-gradient-to-r from-red-800 via-rose-700 to-amber-900 text-white p-6 sm:p-8 text-left shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 h-40 w-40 transform translate-x-12 -translate-y-12 opacity-15 rounded-full border-[20px] border-white" />
        <div className="absolute left-1/4 bottom-0 h-28 w-28 bg-red-500/10 blur-xl rounded-full" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <span className="bg-rose-500/30 text-rose-100 border border-rose-400/30 font-mono text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
              GLOBAL RECREATION & STUDY COMPLEX
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight font-display">
              Recreation Site
            </h2>
            <p className="text-xs text-rose-100 max-w-xl leading-relaxed">
              Engage your mind with sweet long or short AI-generated story novels, or watch selected world-class educational and sports videos across swimming, football, engineering, and reading.
            </p>
          </div>

          <div className="flex gap-2 bg-slate-950/40 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setActiveTab("videos")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                activeTab === "videos"
                  ? "bg-white text-slate-900 shadow"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Youtube className="h-4 w-4 text-red-600" />
              <span>Study Media Lounge</span>
            </button>
            <button
              onClick={() => setActiveTab("novel")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                activeTab === "novel"
                  ? "bg-white text-slate-900 shadow"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <BookOpen className="h-4 w-4 text-amber-500" />
              <span>AI Novel Creator</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === "videos" ? (
        <div className="space-y-6">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
            {/* Category tabs */}
            <div className="flex flex-wrap gap-1.5 justify-start w-full sm:w-auto">
              {["All", "Swimming", "Football", "Engineering", "Reading Books"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setVideoCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
                    videoCategory === cat
                      ? "bg-red-700 text-white shadow-xs"
                      : "bg-slate-50 text-slate-600 border border-stone-200 hover:bg-slate-100"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Searching */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search studio media..."
                value={videoSearch}
                onChange={(e) => setVideoSearch(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl py-2 pl-9 pr-4 text-xs font-medium outline-none focus:bg-white focus:border-red-700 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Videos Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 text-xs">
            {filteredVideos.map((video) => (
              <div
                key={video.id}
                className="group rounded-2xl border border-stone-200 bg-white shadow-xs overflow-hidden flex flex-col justify-between"
              >
                {/* Media Image with video play overlay simulation */}
                <div className="relative aspect-video bg-neutral-900 overflow-hidden">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  {/* Duration tag */}
                  <span className="absolute bottom-2 right-2 bg-slate-950/80 text-white font-mono font-bold text-[10px] px-1.5 py-0.5 rounded">
                    {video.duration}
                  </span>
                  
                  {/* Visual trigger button overlay */}
                  <div className="absolute inset-0 bg-slate-950/25 flex items-center justify-center opacity-70 group-hover:opacity-100 transition duration-300">
                    <button
                      onClick={() => alert(`Starting Video Streaming of "${video.title}" from authenticated educational servers.`)}
                      className="bg-red-700 p-3 rounded-full text-white shadow-lg transform group-hover:scale-110 transition duration-300"
                    >
                      <Play className="h-6 w-6 ml-0.5 fill-current" />
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-2 text-left">
                  <span className="bg-red-50 text-red-700 border border-red-100 rounded px-2 py-0.5 font-bold font-mono text-[9px] uppercase">
                    {video.category}
                  </span>
                  <h4 className="font-extrabold text-stone-900 line-clamp-2 leading-tight">
                    {video.title}
                  </h4>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-1">
                    <span>{video.channel}</span>
                    <span>{video.views}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12 text-xs">
          {/* Preset Topics Block */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm text-left">
              <h3 className="font-display font-black text-slate-900 text-sm mb-1 flex items-center space-x-1.5">
                <span>💡</span>
                <span>AI Suggested Topics (20)</span>
              </h3>
              <p className="text-[10px] text-stone-400 font-medium font-mono border-b pb-3 mb-3">
                SELECT A RECREATIONAL TOPIC TO BUILD A STORY
              </p>

              <div className="grid grid-cols-1 gap-1.5 max-h-[460px] overflow-y-auto pr-2 scrollbar-thin">
                {topicPresets.map((preset, idx) => {
                  const isSelected = suggestedTopic === preset.title;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectTopic(preset.title)}
                      className={`w-full flex items-center space-x-2 p-2 rounded-xl border text-left font-medium transition duration-150 ${
                        isSelected
                          ? "bg-amber-500/10 border-amber-505 text-amber-900 shadow-xs"
                          : "border-slate-100 bg-slate-50/50 text-slate-700 hover:bg-slate-50 hover:border-slate-200"
                      }`}
                    >
                      <span className="text-base">{preset.icon}</span>
                      <div className="truncate flex-grow">
                        <span className="font-bold block truncate text-[11px]">{preset.title}</span>
                        <span className="text-[9px] font-mono font-bold text-slate-400 uppercase leading-none">{preset.category}</span>
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 text-amber-700 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Generator Display Block */}
          <div className="lg:col-span-8 space-y-6 text-left">
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-5">
              <h3 className="font-display font-black text-slate-900 text-sm flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-amber-505 animate-pulse" />
                <span>Sweet Long or Short Story Engine</span>
              </h3>

              {/* Text custom suggestions input container */}
              <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <div className="flex gap-4">
                  <div className="flex-grow space-y-1">
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                      Selected Topic
                    </label>
                    <input
                      type="text"
                      disabled
                      value={suggestedTopic || "(No preview topic selected above)"}
                      className="w-full bg-white border border-stone-200 text-slate-600 rounded-lg p-2 font-bold focus:outline-none"
                    />
                  </div>

                  <div className="w-28 space-y-1 shrink-0">
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                      Novel Scope
                    </label>
                    <div className="flex bg-white rounded-lg border border-stone-200 p-1">
                      <button
                        onClick={() => setSelectedLength("short")}
                        className={`flex-1 rounded py-1.5 font-bold text-[10px] transition ${
                          selectedLength === "short"
                            ? "bg-amber-500 text-white"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        Short
                      </button>
                      <button
                        onClick={() => setSelectedLength("long")}
                        className={`flex-1 rounded py-1.5 font-bold text-[10px] transition ${
                          selectedLength === "long"
                            ? "bg-amber-500 text-white"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        Long
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                    Or Draft Your Custom Sizzling Topic
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kelvin's First Flight out of Bungoma with his Digital library..."
                    value={userCustomTopic}
                    onChange={(e) => {
                      setUserCustomTopic(e.target.value);
                      setSuggestedTopic("");
                    }}
                    className="w-full bg-white border border-stone-205 text-slate-800 rounded-lg p-2.5 font-bold focus:border-amber-500 outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleGenerateStory}
                  disabled={isGeneratingStory || (!suggestedTopic && !userCustomTopic)}
                  className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-extrabold py-3 rounded-lg transition tracking-wide shadow flex items-center justify-center space-x-1"
                >
                  {isGeneratingStory ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin text-white" />
                      <span>Synthesizing Sweet Novel Text Story Outlines via AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Generate Story Novel Outlines Now</span>
                    </>
                  )}
                </button>
              </div>

              {/* Rendered output novel cards */}
              {generatedStory ? (
                <div className="border border-amber-200 bg-amber-50/10 p-6 rounded-2xl space-y-3 animate-in fade-in duration-350">
                  <span className="font-mono text-[9px] font-bold tracking-widest text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded uppercase">
                    AI NOVEL GENERATOR RESULTS
                  </span>
                  <h4 className="font-display font-black text-lg text-slate-900 tracking-tight leading-none pt-1">
                    📖 {generatedStory.title}
                  </h4>
                  <p className="font-mono text-[10px] text-slate-400 leading-none">
                    Author: Wafula AI Co-Scribe • Category: Sweet Novel Outlines
                  </p>
                  <hr className="border-t border-amber-500/10 my-1" />
                  <p className="text-slate-700 text-xs italic font-serif leading-relaxed whitespace-pre-line pl-1 antialiased select-text">
                    {generatedStory.content}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 py-16 text-center text-slate-400 space-y-2">
                  <span className="text-4xl text-stone-300">✍️</span>
                  <p className="font-bold text-neutral-850 text-xs">Awaiting Story Theme Selection</p>
                  <p className="text-[11px] max-w-sm mx-auto p-1 leading-tight text-stone-400">
                    Pick any of the 20 pre-populated AI Suggested Topics on the left hand menu, or type a custom topic to spawn a fascinating story novel output.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
