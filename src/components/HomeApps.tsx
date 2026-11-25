import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Smartphone, Search, X, Minimize2, Maximize2, RefreshCw, 
  Map, Calculator, BookOpen, Compass, Shield, Grid, HelpCircle,
  FileText, Calendar, Plus, Trash2, CheckSquare, Play, Sparkles,
  Pin, Folder, Activity, Volume2, VolumeX, Battery, BatteryCharging, GripVertical, History
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import GoogleSimView from "./GoogleSimView";
import seminarImg from "../assets/images/slide_leadership_seminar_1795421934895.jpg";
import bibleImg from "../assets/images/slide_bible_school_1795421934851.jpg";
import sermonImg from "../assets/images/slide_sermon_media_1795421934360.jpg";
import bookstoreImg from "../assets/images/slide_bookstore_volumes_1795421934714.jpg";
import academyImg from "../assets/images/slide_computer_academy_1795421934691.jpg";

interface PhoneApp {
  id: string;
  name: string;
  category: "Utilities" | "Scholary" | "Entertainment" | "Maps";
  icon: React.ReactNode;
  color: string;
  description: string;
  embedUrl?: string; // If actual web embed available
}

const apps: PhoneApp[] = [
  {
    id: "calculator",
    name: "Smart Calculator",
    category: "Utilities",
    icon: <Calculator className="h-6 w-6" />,
    color: "bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-700",
    description: "Perform quick calculations and algebraic operations for agribusiness book balances."
  },
  {
    id: "notepad",
    name: "Study Journal",
    category: "Scholary",
    icon: <FileText className="h-6 w-6" />,
    color: "bg-blue-100 hover:bg-blue-200 border-blue-300 text-blue-700",
    description: "Write and persist scholastic thoughts, summaries, and book reviews offline."
  },
  {
    id: "planner",
    name: "Daily Planner",
    category: "Utilities",
    icon: <CheckSquare className="h-6 w-6" />,
    color: "bg-emerald-100 hover:bg-emerald-200 border-emerald-300 text-emerald-700",
    description: "Organize pending reads, book study hours, and academic goals."
  },
  {
    id: "browser",
    name: "Google Web Browser",
    category: "Scholary",
    icon: <Compass className="h-6 w-6" />,
    color: "bg-indigo-100 hover:bg-indigo-200 border-indigo-300 text-indigo-705 text-indigo-700",
    description: "Explore the global web index. Browse Google Search, view visual matches, and open secure educational portals."
  },
  {
    id: "maps",
    name: "Bungoma Map View",
    category: "Maps",
    icon: <Map className="h-6 w-6" />,
    color: "bg-teal-100 hover:bg-teal-200 border-teal-300 text-teal-700",
    description: "Visual navigation of libraries and educational centers around Western Kenya."
  },
  {
    id: "store",
    name: "Academic Books Store",
    category: "Scholary",
    icon: <BookOpen className="h-6 w-6" />,
    color: "bg-red-100 hover:bg-red-200 border-red-300 text-red-750",
    description: "Browse and study premium books, leadership books and technical manuals.",
    embedUrl: "store"
  },
  {
    id: "devotional",
    name: "Holy Bible & Devotions",
    category: "Scholary",
    icon: <BookOpen className="h-6 w-6" />,
    color: "bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700",
    description: "Study Holy scriptures, highlights, bookmarks and write daily devotionals.",
    embedUrl: "devotional"
  },
  {
    id: "school",
    name: "Zion Leadership School",
    category: "Scholary",
    icon: <Grid className="h-6 w-6" />,
    color: "bg-purple-100 hover:bg-purple-200 border-purple-300 text-purple-700",
    description: "Enter theological classes, vocational IT curriculums and take AI tests.",
    embedUrl: "school"
  },
  {
    id: "companion",
    name: "AI Scholar Companion",
    category: "Scholary",
    icon: <Sparkles className="h-6 w-6" />,
    color: "bg-emerald-100 hover:bg-emerald-200 border-emerald-300 text-emerald-700",
    description: "A free, super fast expert smart model assistant working offline.",
    embedUrl: "companion"
  },
  {
    id: "studio",
    name: "Document Creator Studio",
    category: "Utilities",
    icon: <FileText className="h-6 w-6" />,
    color: "bg-sky-100 hover:bg-sky-200 border-sky-300 text-sky-700",
    description: "Draft critical publications, certificates and homework notes.",
    embedUrl: "studio"
  },
  {
    id: "gmail",
    name: "Gmail Console Client",
    category: "Utilities",
    icon: <Compass className="h-6 w-6" />,
    color: "bg-rose-100 hover:bg-rose-200 border-rose-300 text-rose-750",
    description: "Draft secure professional emails for schools and churches.",
    embedUrl: "gmail"
  },
  {
    id: "language-teacher",
    name: "Swahili Language Tutor",
    category: "Scholary",
    icon: <Compass className="h-6 w-6" />,
    color: "bg-green-50 hover:bg-green-100 border-green-200 text-green-700",
    description: "Translate verbs, nouns and speech tags for East African Swahili.",
    embedUrl: "language-teacher"
  },
  {
    id: "offline-dictionary",
    name: "Academic Lexicon",
    category: "Scholary",
    icon: <BookOpen className="h-6 w-6" />,
    color: "bg-orange-100 hover:bg-orange-200 border-orange-300 text-orange-750",
    description: "A fast, compiled dictionary covering technical terms.",
    embedUrl: "offline-dictionary"
  },
  {
    id: "youtube_app",
    name: "YouTube Hub",
    category: "Entertainment",
    icon: <Play className="h-6 w-6" />,
    color: "bg-red-50 hover:bg-red-105 border-red-200 text-red-650",
    description: "Instant sermon streaming, video tutorials and public bulletins.",
    embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
  },
  {
    id: "tiktok_app",
    name: "TikTok Creativity Core",
    category: "Entertainment",
    icon: <Activity className="h-6 w-6" />,
    color: "bg-neutral-100 hover:bg-neutral-200 border-stone-300 text-stone-850",
    description: "Browse education summaries, micro lessons and cultural guides.",
    embedUrl: "https://www.tiktok.com"
  },
  {
    id: "wikipedia_app",
    name: "Wikipedia World Free",
    category: "Scholary",
    icon: <Compass className="h-6 w-6" />,
    color: "bg-stone-50 hover:bg-stone-100 border-stone-250 text-stone-750",
    description: "The free online encyclopedia for academic resource verification.",
    embedUrl: "https://www.wikipedia.org"
  },
  {
    id: "opera_app",
    name: "Opera Mini Satellite",
    category: "Utilities",
    icon: <Compass className="h-6 w-6" />,
    color: "bg-red-50 hover:bg-red-100 border-red-200 text-red-600",
    description: "Ultra lightweight browser simulation for lightning fast search.",
    embedUrl: "https://mini.opera.com"
  }
];

export default function HomeApps({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeAppId, setActiveAppId] = useState<string | null>(null);
  
  // Recent Searches state
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  // Custom switch state tracking whether to always launch native full apps directly
  const [forceNativeLaunch, setForceNativeLaunch] = useState<boolean>(() => {
    const saved = localStorage.getItem("WAFULA_LAUNCHER_FORCE_NATIVE_v3");
    return saved !== "false";
  });

  const handleAddNewSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 8);
      localStorage.setItem("WAFULA_LAUNCHER_RECENT_SEARCHES", JSON.stringify(updated));
      return updated;
    });
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleAddNewSearch(searchQuery);
    }
  };

  const handleSearchBlur = () => {
    handleAddNewSearch(searchQuery);
  };
  
  // App specific states: Tracking & Pinning
  const [appUsage, setAppUsage] = useState<Record<string, number>>({});
  const [pinnedAppIds, setPinnedAppIds] = useState<string[]>([]);
  const [drawerTab, setDrawerTab] = useState<"all" | "smart_folders">("all");
  const [activeFolder, setActiveFolder] = useState<string | null>("Education");

  // Folder Customizations
  const [folderCustomizations, setFolderCustomizations] = useState<Record<string, { name: string; color: string }>>(() => {
    const saved = localStorage.getItem("WAFULA_LAUNCHER_FOLDERS_v3");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      "Education": { name: "Education", color: "#6366f1" },
      "Media": { name: "Media", color: "#f43f5e" },
      "Utilities": { name: "Utilities", color: "#10b981" },
    };
  });

  const [editingFolderKey, setEditingFolderKey] = useState<string | null>(null);
  const [tempFolderName, setTempFolderName] = useState("");
  const [tempFolderColor, setTempFolderColor] = useState("");
  const [longPressTimer, setLongPressTimer] = useState<any>(null);

  // Category usage analytics states
  const [categoryTimeSpent, setCategoryTimeSpent] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem("WAFULA_LAUNCHER_TIME_SPENT_v3");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      "Utilities": 45,
      "Scholary": 85,
      "Maps": 25,
      "Entertainment": 15
    };
  });

  // Track active app session duration and dynamically update metrics
  useEffect(() => {
    if (!activeAppId) return;
    const app = apps.find((a) => a.id === activeAppId);
    if (!app) return;

    const interval = setInterval(() => {
      setCategoryTimeSpent((prev) => {
        const cat = app.category || "Utilities";
        const updated = {
          ...prev,
          [cat]: (prev[cat] || 0) + 1
        };
        localStorage.setItem("WAFULA_LAUNCHER_TIME_SPENT_v3", JSON.stringify(updated));
        return updated;
      });
    }, 5000); // Record progress increment every 5 seconds of active app study session

    return () => clearInterval(interval);
  }, [activeAppId]);

  const startLongPress = (key: string) => {
    const timer = setTimeout(() => {
      triggerFolderEdit(key);
    }, 600);
    setLongPressTimer(timer);
  };

  const cancelLongPress = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const triggerFolderEdit = (originalKey: string) => {
    setEditingFolderKey(originalKey);
    const current = folderCustomizations[originalKey] || { name: originalKey, color: "#6366f1" };
    setTempFolderName(current.name);
    setTempFolderColor(current.color);
  };

  const saveFolderCustomization = () => {
    if (!editingFolderKey) return;
    setFolderCustomizations((prev) => {
      const updated = {
        ...prev,
        [editingFolderKey]: {
          name: tempFolderName.trim() || editingFolderKey,
          color: tempFolderColor,
        }
      };
      localStorage.setItem("WAFULA_LAUNCHER_FOLDERS_v3", JSON.stringify(updated));
      return updated;
    });
    setEditingFolderKey(null);
  };

  const getOriginalKey = (customName: string): string => {
    const entry = Object.entries(folderCustomizations as Record<string, { name: string; color: string }>).find(([_, info]) => info.name === customName);
    return entry ? entry[0] : customName;
  };

  const chartData = React.useMemo(() => {
    return [
      { name: "Scholary", minutes: categoryTimeSpent["Scholary"] || 0, color: "#6366f1" },
      { name: "Utilities", minutes: categoryTimeSpent["Utilities"] || 0, color: "#10b981" },
      { name: "Maps", minutes: categoryTimeSpent["Maps"] || 0, color: "#14b8a6" },
      { name: "Entertainment", minutes: categoryTimeSpent["Entertainment"] || 0, color: "#f43f5e" }
    ];
  }, [categoryTimeSpent]);

  // Drag and Drop ordering state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Volume level state (0 to 100)
  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem("WAFULA_LAUNCHER_VOLUME");
    return saved ? Number(saved) : 80;
  });

  // Battery Level and Charging state
  const [batteryLevel, setBatteryLevel] = useState<number>(85);
  const [isCharging, setIsCharging] = useState<boolean>(true);

  // Audio tone generator for real volume change feedback
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    localStorage.setItem("WAFULA_LAUNCHER_VOLUME", String(newVol));
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(512, ctx.currentTime);
        gain.gain.setValueAtTime((newVol / 100) * 0.03, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      }
    } catch (e) {
      // Ignored if AudioContext blocked inside iframe
    }
  };

  // Drag and drop event handlers
  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDraggedIndex(idx);
    e.dataTransfer.effectAllowed = "move";
    // For general compatibility
    e.dataTransfer.setData("text/plain", String(idx));
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragOverIndex !== idx) {
      setDragOverIndex(idx);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    setPinnedAppIds((prev) => {
      const updated = [...prev];
      const [movedItem] = updated.splice(draggedIndex, 1);
      updated.splice(targetIndex, 0, movedItem);
      localStorage.setItem("WAFULA_LAUNCHER_PINNED", JSON.stringify(updated));
      return updated;
    });
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // App specific states: Calculator
  const [calcInput, setCalcInput] = useState("");
  const [calcResult, setCalcResult] = useState("");

  // App specific states: Notepad
  const [notes, setNotes] = useState<string[]>([]);
  const [newNote, setNewNote] = useState("");

  // App specific states: Daily Planner
  const [tasks, setTasks] = useState<{ id: string; text: string; done: boolean }[]>([]);
  const [newTask, setNewTask] = useState("");

  // App specific states: Browser Sim
  const [browserUrl, setBrowserUrl] = useState("https://www.google.com");
  const [browserSearch, setBrowserSearch] = useState("Bungoma");
  const [browserSearchMode, setBrowserSearchMode] = useState<"ai_smart" | "legacy_wiki">("ai_smart");
  const [hasSearched, setHasSearched] = useState(true);
  const [aiResult, setAiResult] = useState({
    title: "Bungoma County, Western Kenya",
    description: "Bungoma is a county in the former Western Province of Kenya. It bordering Uganda and features scenic valleys, scholastic institutions, and vast agricultural potential. Home of the Bukusu ethnic community, it acts as a central node for education and trade under Wafula Digital leadership models.",
    images: [
      seminarImg,
      bookstoreImg,
      academyImg
    ],
    videos: [
      {
        title: "Bungoma County Dev & Culture Guide",
        url: "https://www.youtube.com/embed/fA8HhA9vIms"
      },
      {
        title: "Agribusiness and Farming in Western Province",
        url: "https://www.youtube.com/embed/_jXW-eB3cQ8"
      }
    ]
  });

  useEffect(() => {
    // Load persisted launcher states
    const savedNotes = localStorage.getItem("WAFULA_LAUNCHER_NOTES");
    if (savedNotes) {
      try { setNotes(JSON.parse(savedNotes)); } catch (e) {}
    }
    const savedTasks = localStorage.getItem("WAFULA_LAUNCHER_TASKS");
    if (savedTasks) {
      try { setTasks(JSON.parse(savedTasks)); } catch (e) {}
    }
    const savedUsage = localStorage.getItem("WAFULA_LAUNCHER_USAGE");
    if (savedUsage) {
      try { setAppUsage(JSON.parse(savedUsage)); } catch (e) {}
    }
    const savedPinned = localStorage.getItem("WAFULA_LAUNCHER_PINNED");
    if (savedPinned) {
      try { setPinnedAppIds(JSON.parse(savedPinned)); } catch (e) {}
    }
    const savedRecentSearches = localStorage.getItem("WAFULA_LAUNCHER_RECENT_SEARCHES");
    if (savedRecentSearches) {
      try { setRecentSearches(JSON.parse(savedRecentSearches)); } catch (e) {}
    }

    // Battery Monitor Initialization
    let batteryMonitor: any = null;
    const updateBattery = (bat: any) => {
      setBatteryLevel(Math.round(bat.level * 100));
      setIsCharging(bat.charging);
    };

    if (typeof navigator !== "undefined" && (navigator as any).getBattery) {
      (navigator as any).getBattery()
        .then((bat: any) => {
          batteryMonitor = bat;
          updateBattery(bat);
          bat.addEventListener("levelchange", () => updateBattery(bat));
          bat.addEventListener("chargingchange", () => updateBattery(bat));
        })
        .catch(() => {
          // Secure fallback if blocked inside sandboxed iframe
          setBatteryLevel(92);
          setIsCharging(false);
        });
    } else {
      setBatteryLevel(92);
      setIsCharging(false);
    }

    return () => {
      if (batteryMonitor) {
        batteryMonitor.removeEventListener("levelchange", () => {});
        batteryMonitor.removeEventListener("chargingchange", () => {});
      }
    };
  }, []);

  const persistNotes = (updated: string[]) => {
    setNotes(updated);
    localStorage.setItem("WAFULA_LAUNCHER_NOTES", JSON.stringify(updated));
  };

  const persistTasks = (updated: any[]) => {
    setTasks(updated);
    localStorage.setItem("WAFULA_LAUNCHER_TASKS", JSON.stringify(updated));
  };

  const launchApp = (id: string) => {
    const app = apps.find((a) => a.id === id);
    
    // First, always record app usage statistics
    setAppUsage((prev) => {
       const updated = { ...prev, [id]: (prev[id] || 0) + 1 };
       localStorage.setItem("WAFULA_LAUNCHER_USAGE", JSON.stringify(updated));
       return updated;
    });

    // If forceNativeLaunch option is checked, and we have matching permanent views, navigate to them natively
    if (forceNativeLaunch && app?.embedUrl && onNavigate) {
      if (!app.embedUrl.startsWith("http")) {
        onNavigate(app.embedUrl);
        return;
      }
    }

    // Default launcher micro-simulator load
    setActiveAppId(id);
  };

  const togglePinApp = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedAppIds((prev) => {
      const updated = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem("WAFULA_LAUNCHER_PINNED", JSON.stringify(updated));
      return updated;
    });
  };

  const getSmartFolder = (app: PhoneApp): string => {
    const searchStr = (app.name + " " + app.description + " " + app.category).toLowerCase();
    if (searchStr.includes("video") || searchStr.includes("media") || searchStr.includes("browser") || searchStr.includes("search")) {
      return "Media";
    }
    if (searchStr.includes("calculator") || searchStr.includes("planner") || searchStr.includes("task") || searchStr.includes("utility")) {
      return "Utilities";
    }
    return "Education";
  };

  const handleCalcClick = (val: string) => {
    if (val === "C") {
      setCalcInput("");
      setCalcResult("");
    } else if (val === "=") {
      try {
        // Safe evaluation without eval
        const res = Function(`"use strict"; return (${calcInput})`)();
        setCalcResult(String(res));
      } catch (e) {
        setCalcResult("Error");
      }
    } else {
      setCalcInput((prev) => prev + val);
    }
  };

  // Add notes
  const handleAddNewNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    const list = [newNote.trim(), ...notes];
    persistNotes(list);
    setNewNote("");
  };

  const handleDeleteNote = (idx: number) => {
    const list = notes.filter((_, i) => i !== idx);
    persistNotes(list);
  };

  // Planner
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    const list = [...tasks, { id: "t_" + Date.now(), text: newTask.trim(), done: false }];
    persistTasks(list);
    setNewTask("");
  };

  const handleToggleTask = (id: string) => {
    const list = tasks.map((t) => t.id === id ? { ...t, done: !t.done } : t);
    persistTasks(list);
  };

  const handleDeleteTask = (id: string) => {
    const list = tasks.filter((t) => t.id !== id);
    persistTasks(list);
  };

  // Search Engine simulated Wikipedia fetcher & AI content generator
  const handleSearchWikiSim = (e: React.FormEvent) => {
    e.preventDefault();
    const query = browserSearch.trim();
    if (!query) return;

    // 1. Wikipedia URL fallback
    const formatted = query.replace(/\s+/g, "_");
    setBrowserUrl(`https://en.wikipedia.org/wiki/${formatted}`);
    setHasSearched(true);

    // 2. Custom AI synthesis with high-res media (Videos & Images)
    const lowerQuery = query.toLowerCase();
    
    // Predetermined categorizations to maintain pristine quality content
    if (lowerQuery.includes("faith") || lowerQuery.includes("christian") || lowerQuery.includes("god") || lowerQuery.includes("bible") || lowerQuery.includes("jesus")) {
      setAiResult({
        title: `Grace & Biblical Faith in Modern Literature`,
        description: `Faith is defined as an intrinsic trust and confidence in spiritual truth, biblical tenets, and eternal principles. It guides ethical living, community cohesion, and academic focus. Advanced research studies suggest active spiritual practice enhances core leadership capabilities, personal resilience, and community harmony under Wafula teachings.`,
        images: [
          bibleImg,
          sermonImg,
          bookstoreImg
        ],
        videos: [
          {
            title: "Biblical Stewardship and High-Integrity Leadership",
            url: "https://www.youtube.com/embed/dQw4w9WgXcQ"
          },
          {
            title: "Exploring Ancient Devotional Manuscripts",
            url: "https://www.youtube.com/embed/XmGvCg0bM0A"
          }
        ]
      });
    } else if (lowerQuery.includes("bungoma") || lowerQuery.includes("county") || lowerQuery.includes("kenya") || lowerQuery.includes("safari")) {
      setAiResult({
        title: "Bungoma County & Western Kenya Tourism",
        description: "Bungoma County is a beautiful agricultural and cultural hub nestled in the Western province of Kenya. Notable landmarks include Mt. Elgon, the scenic Sang'alo Hills, and a highly active community of agrarian scholarship and leadership. Digital advancement is driving educational equity in Bungoma.",
        images: [
          seminarImg,
          bookstoreImg,
          academyImg
        ],
        videos: [
          {
            title: "Amazing Bungoma County Scenic Guide & Cultural Tours",
            url: "https://www.youtube.com/embed/fA8HhA9vIms"
          },
          {
            title: "Kenyan Agro-tech Ecosystem & Sustainable Farming",
            url: "https://www.youtube.com/embed/_jXW-eB3cQ8"
          }
        ]
      });
    } else if (lowerQuery.includes("leadership") || lowerQuery.includes("manager") || lowerQuery.includes("academic") || lowerQuery.includes("education")) {
      setAiResult({
        title: "Advanced Scholarly Leadership & Management",
        description: "Leadership is the art of motivating a group of people to act toward achieving a common goal. Modern academic theory stresses that digital platforms, strict self-management, and high ethical standards are vital when guiding organizations in the 21st century. It requires consistent study of literature, books, and technological media.",
        images: [
          seminarImg,
          academyImg,
          bibleImg
        ],
        videos: [
          {
            title: "Harvard Innovation Lab: Effective Leadership Models",
            url: "https://www.youtube.com/embed/V9LAtbbyR-4"
          },
          {
            title: "Keys to High-Performance Team Coordination",
            url: "https://www.youtube.com/embed/dQw4w9WgXcQ"
          }
        ]
      });
    } else if (lowerQuery.includes("agribusiness") || lowerQuery.includes("money") || lowerQuery.includes("farm") || lowerQuery.includes("business") || lowerQuery.includes("finance")) {
      setAiResult({
        title: "Agribusiness & Sustainable Wealth Generation",
        description: "Agribusiness combines agricultural production with modern business concepts. In Bungoma and broader Western Kenya, it represents the primary engine of development, allowing families to scale crops, maize, and organic products effectively using high-speed digital accounting software and offline cashbooks.",
        images: [
          bookstoreImg,
          seminarImg,
          academyImg
        ],
        videos: [
          {
            title: "Successful Agri-Entrepreneurship in East Africa",
            url: "https://www.youtube.com/embed/_jXW-eB3cQ8"
          },
          {
            title: "Farming Tech & Fertilizer Optimization Guide",
            url: "https://www.youtube.com/embed/fA8HhA9vIms"
          }
        ]
      });
    } else {
      // General fall-back dynamic generation
      const capitalized = query.charAt(0).toUpperCase() + query.slice(1);
      setAiResult({
        title: `${capitalized} - Global AI Search Dossier`,
        description: `This is a highly responsive AI-synthesized research report for '${capitalized}' organized by the Wafula Ingestion system. Our cognitive engine explores library cross-references, academic publications, and multimedia archives to provide real-time definition models, actionable paradigms, and high-fidelity insights.`,
        images: [
          academyImg,
          bookstoreImg,
          seminarImg
        ],
        videos: [
          {
            title: `Intellectual Introduction to ${capitalized}`,
            url: "https://www.youtube.com/embed/dQw4w9WgXcQ"
          },
          {
            title: `Expanding knowledge frameworks of ${capitalized}`,
            url: "https://www.youtube.com/embed/XmGvCg0bM0A"
          }
        ]
      });
    }
  };

  const filteredApps = apps.filter((app) => 
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const mostUsedApps = React.useMemo(() => {
    return [...apps]
      .filter((app) => (appUsage[app.id] || 0) > 0)
      .sort((a, b) => (appUsage[b.id] || 0) - (appUsage[a.id] || 0))
      .slice(0, 3);
  }, [appUsage, apps]);

  const folderGroupings = React.useMemo(() => {
    const defaultGroups: Record<string, PhoneApp[]> = {
      "Education": [],
      "Media": [],
      "Utilities": []
    };
    
    filteredApps.forEach((app) => {
      const folder = getSmartFolder(app);
      if (!defaultGroups[folder]) {
        defaultGroups[folder] = [];
      }
      defaultGroups[folder].push(app);
    });
    
    const groups: Record<string, PhoneApp[]> = {};
    Object.entries(defaultGroups).forEach(([key, list]) => {
      const customName = folderCustomizations[key]?.name || key;
      groups[customName] = list;
    });
    
    return groups;
  }, [filteredApps, folderCustomizations]);

  const folderChartData = React.useMemo(() => {
    return (Object.entries(folderGroupings) as [string, PhoneApp[]][]).map(([folderName, folderApps]) => {
      const originalKey = getOriginalKey(folderName);
      const color = folderCustomizations[originalKey]?.color || "#6366f1";
      return {
        name: folderName,
        count: folderApps.length,
        color: color,
      };
    });
  }, [folderGroupings, folderCustomizations]);

  return (
    <div id="home_apps_dashboard" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6 select-none text-left">
      
      {/* Dynamic Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-stone-200 pb-5">
        <div>
          <h2 className="font-display text-3xl font-black pb-1 flex items-center gap-2">
            <Smartphone className="h-7 w-7 text-indigo-600 animate-pulse" />
            <span>Home <span className="text-indigo-600">Launcher</span></span>
          </h2>
          <p className="text-xs text-neutral-500 font-medium">
            Seamlessly launch custom applications and device utility assets within the Wafula sandbox space.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-3">
            <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 font-mono">Launch Preference:</span>
            <div className="inline-flex bg-stone-100 p-0.5 rounded-lg border border-stone-200 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => {
                  setForceNativeLaunch(true);
                  localStorage.setItem("WAFULA_LAUNCHER_FORCE_NATIVE_v3", "true");
                }}
                className={`px-2.5 py-1 rounded transition flex items-center gap-1 cursor-pointer ${
                  forceNativeLaunch 
                    ? "bg-indigo-600 text-white shadow-xs" 
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <span>⚡ Native (Always Recommended)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setForceNativeLaunch(false);
                  localStorage.setItem("WAFULA_LAUNCHER_FORCE_NATIVE_v3", "false");
                }}
                className={`px-2.5 py-1 rounded transition flex items-center gap-1 cursor-pointer ${
                  !forceNativeLaunch 
                    ? "bg-slate-700 text-white shadow-xs" 
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                <span>📱 Simulator</span>
              </button>
            </div>
            <p className="text-[10px] text-stone-500 italic">
              {forceNativeLaunch 
                ? "Clicking icons launches our permanent, fully-functional local Zion Apps." 
                : "Opens smaller simulated views in the mock phone box."}
            </p>
          </div>
        </div>
 
        {/* Global Tab Search Bar */}
        <div className="relative mt-4 md:mt-0 max-w-xs w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            onBlur={handleSearchBlur}
            placeholder="Search system apps..."
            className="w-full text-xs font-semibold pl-8 pr-16 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:border-indigo-600 focus:bg-white outline-none transition duration-200"
          />
          <Search className="absolute left-2.5 top-3 h-4 w-4 text-stone-400" />
          
          {searchQuery && (
            <div className="absolute right-2 top-1.5 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="p-1 text-stone-400 hover:text-stone-600 rounded-md transition cursor-pointer"
                title="Clear input"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleAddNewSearch(searchQuery)}
                className="px-1.5 py-1 text-[9px] font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-755 border border-indigo-150 rounded-lg transition shrink-0 cursor-pointer"
                title="Save search to history"
              >
                Save
              </button>
            </div>
          )}
        </div>
      </div>
 
      {/* Main Container */}
      <div className="grid gap-6 lg:grid-cols-12">
        
        {/* APP DRAWER SECTION */}
        <div className="lg:col-span-4 space-y-5 bg-stone-100/55 border border-stone-200 p-5 rounded-2xl flex flex-col justify-between">
          <div className="space-y-4">
            
            {/* VIEW MODE SWITCHER TABS */}
            <div className="flex p-1 bg-stone-200/60 rounded-xl">
              <button
                type="button"
                onClick={() => setDrawerTab("all")}
                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition text-center cursor-pointer ${
                  drawerTab === "all"
                    ? "bg-white text-indigo-600 shadow-xs"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                All Apps
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab("smart_folders")}
                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition text-center cursor-pointer ${
                  drawerTab === "smart_folders"
                    ? "bg-white text-indigo-600 shadow-xs"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                Smart Folders
              </button>
            </div>

            {/* MOST USED DYNAMIC LIST SECTION */}
            {mostUsedApps.length > 0 && (
              <div className="bg-white border border-indigo-50/80 p-3 rounded-xl space-y-1.5 shadow-xs">
                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1">
                  <Activity className="h-3 w-3 text-indigo-500" />
                  <span>Most Used Tools</span>
                </span>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {mostUsedApps.map((app) => (
                    <button
                      key={`most-used-${app.id}`}
                      type="button"
                      onClick={() => launchApp(app.id)}
                      className="px-2 py-1 rounded-lg border border-indigo-100 bg-indigo-50/70 hover:bg-indigo-50 text-[10px] font-bold text-indigo-700 flex items-center space-x-1.5 transition active:scale-95 cursor-pointer max-w-full"
                    >
                      <span className="shrink-0 scale-75">{app.icon}</span>
                      <span className="truncate">{app.name}</span>
                      <span className="text-[8px] bg-indigo-100 text-indigo-800 px-1 rounded-xs">
                        {appUsage[app.id]}×
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* RECENT SEARCHES PANEL */}
            {recentSearches.length > 0 && (
              <div className="bg-white border border-stone-150 p-3 rounded-xl space-y-2 shadow-xs">
                <div className="flex items-center justify-between pointer-events-auto">
                  <span className="text-[9px] font-black text-stone-600 uppercase tracking-widest flex items-center gap-1 font-sans">
                    <History className="h-3 w-3 text-stone-500 animate-spin-reverse" />
                    <span>Recent Searches</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setRecentSearches([]);
                      localStorage.removeItem("WAFULA_LAUNCHER_RECENT_SEARCHES");
                    }}
                    className="text-[9px] font-black text-rose-500 hover:text-rose-700 uppercase tracking-wider transition cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-0.5 pointer-events-auto">
                  {recentSearches.map((query, sIdx) => (
                    <button
                      key={`recent-search-${sIdx}`}
                      type="button"
                      onClick={() => {
                        setSearchQuery(query);
                      }}
                      className={`px-2 py-1 rounded-lg border text-[10px] font-semibold flex items-center space-x-1.5 transition active:scale-95 cursor-pointer max-w-full ${
                        searchQuery.toLowerCase() === query.toLowerCase()
                          ? "border-indigo-200 bg-indigo-50 text-indigo-700 font-bold"
                          : "border-stone-150 bg-stone-50/50 hover:bg-stone-50 text-stone-600"
                      }`}
                      title={`Jump back to search: "${query}"`}
                    >
                      <Search className="h-2.5 w-2.5 opacity-65 text-stone-400 shrink-0" />
                      <span className="truncate max-w-[120px]">{query}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest font-mono">
                {drawerTab === "all" ? `Installed Sandbox Apps (${filteredApps.length})` : "Automated Folders"}
              </span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>

            {drawerTab === "all" ? (
              <div className="grid gap-4 sm:grid-cols-1">
                {filteredApps.map((app, index) => (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut", delay: Math.min(index * 0.04, 0.4) }}
                    onClick={() => launchApp(app.id)}
                    className={`p-3.5 rounded-xl border flex items-start space-x-3 transition-all cursor-pointer text-left relative group ${
                      activeAppId === app.id
                        ? "border-indigo-500 bg-indigo-600 text-white shadow-md transform translate-x-1"
                        : "border-stone-150 bg-white hover:bg-slate-50 text-slate-805"
                    }`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${app.color}`}>
                      {app.icon}
                    </div>
                    <div className="pr-6">
                      <strong className="text-xs font-bold block">{app.name}</strong>
                      <p className={`text-[10px] mt-0.5 line-clamp-2 leading-relaxed ${
                        activeAppId === app.id ? "text-indigo-100" : "text-stone-500"
                      }`}>
                        {app.description}
                      </p>
                    </div>

                    {/* PIN BUTTON SHORTCUT */}
                    <button
                      type="button"
                      onClick={(e) => togglePinApp(app.id, e)}
                      className={`absolute right-2.5 top-2.5 p-1 rounded-md transition ${
                        pinnedAppIds.includes(app.id)
                          ? activeAppId === app.id ? "text-indigo-200 hover:text-white" : "text-indigo-600 hover:text-indigo-800 bg-indigo-50"
                          : "text-stone-300 hover:text-stone-500 bg-transparent opacity-0 group-hover:opacity-100"
                      }`}
                      title={pinnedAppIds.includes(app.id) ? "Remove from Pinned & Favorites" : "Pin as Favorite to Dashboard"}
                    >
                      <Pin className={`h-3 w-3 ${pinnedAppIds.includes(app.id) ? "fill-current" : ""}`} />
                    </button>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="space-y-2 mt-1">
                {(Object.entries(folderGroupings) as [string, PhoneApp[]][]).map(([folderName, folderApps]) => {
                  const isExpanded = activeFolder === folderName;
                  if (folderApps.length === 0) return null;
                  
                  const originalKey = getOriginalKey(folderName);
                  const customization = folderCustomizations[originalKey] || { name: folderName, color: "#6366f1" };

                  return (
                    <div 
                      key={folderName} 
                      className="border border-stone-200 bg-white rounded-xl overflow-hidden transition-all duration-200"
                      style={{ borderLeft: `4px solid ${customization.color}` }}
                    >
                      <button
                        type="button"
                        onMouseDown={() => startLongPress(originalKey)}
                        onMouseUp={cancelLongPress}
                        onMouseLeave={cancelLongPress}
                        onTouchStart={() => startLongPress(originalKey)}
                        onTouchEnd={cancelLongPress}
                        onClick={() => setActiveFolder(isExpanded ? null : folderName)}
                        className="w-full p-2.5 flex items-center justify-between text-left font-bold text-xs bg-stone-50 hover:bg-stone-100/50 cursor-pointer text-stone-700 transition"
                        title="Long-press or click gears to customize folder title or theme color"
                      >
                        <div className="flex items-center space-x-2">
                          <Folder className="h-4 w-4 shrink-0 transition" style={{ color: customization.color, fill: `${customization.color}1e` }} />
                          <span className="font-extrabold" style={{ color: customization.color }}>{folderName} Folder</span>
                          <span className="text-[10px] text-stone-400 font-mono">({folderApps.length})</span>
                        </div>
                        <div className="flex items-center space-x-2.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => triggerFolderEdit(originalKey)}
                            className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 transition cursor-pointer"
                            title="Rename or recolor"
                          >
                            <Sparkles className="h-3.5 w-3.5" style={{ color: customization.color }} />
                          </button>
                          <span className="text-[10px] text-stone-400 font-mono">
                            {isExpanded ? "Collapse ▲" : "Expand ▼"}
                          </span>
                        </div>
                      </button>
                      
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <div className="p-2 bg-stone-50/20 border-t border-stone-100 grid gap-2.5">
                              {folderApps.map((app, appIdx) => (
                                <motion.div
                                  key={app.id}
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.2, ease: "easeOut", delay: Math.min(appIdx * 0.04, 0.3) }}
                                  onClick={() => launchApp(app.id)}
                                  className={`p-2.5 rounded-lg border text-left flex items-start space-x-2 transition cursor-pointer relative group ${
                                    activeAppId === app.id
                                      ? "border-indigo-500 bg-indigo-600 text-white shadow-xs"
                                      : "border-stone-100 bg-white hover:bg-slate-50 text-slate-805"
                                  }`}
                                >
                                  <div className={`p-1 rounded text-xs shrink-0 ${app.color}`}>
                                    {app.icon}
                                  </div>
                                  <div className="truncate min-w-0 flex-grow pr-5">
                                    <strong className="text-[11px] font-bold block truncate">{app.name}</strong>
                                    <span className={`text-[9px] block truncate leading-normal ${
                                      activeAppId === app.id ? "text-indigo-150" : "text-stone-400"
                                    }`}>
                                      {app.description}
                                    </span>
                                  </div>

                                  {/* PIN BUTTON SHORTCUT */}
                                  <button
                                    type="button"
                                    onClick={(e) => togglePinApp(app.id, e)}
                                    className={`absolute right-2 top-2 p-0.5 rounded transition ${
                                      pinnedAppIds.includes(app.id)
                                        ? activeAppId === app.id ? "text-indigo-200 hover:text-white" : "text-indigo-600 hover:text-indigo-800"
                                        : "text-stone-300 hover:text-stone-500 bg-transparent opacity-0 group-hover:opacity-100"
                                    }`}
                                    title={pinnedAppIds.includes(app.id) ? "Remove from Pinned & Favorites" : "Pin as Favorite to Dashboard"}
                                  >
                                    <Pin className={`h-2.5 w-2.5 ${pinnedAppIds.includes(app.id) ? "fill-current" : ""}`} />
                                  </button>
                                </motion.div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}

          </div>

          <div className="pt-4 border-t border-stone-200 mt-4 space-y-4">
            {/* System Status Controls Widget */}
            <div className="bg-stone-50 border border-stone-150 p-3 rounded-xl space-y-3">
              <span className="text-[9px] font-extrabold text-stone-500 uppercase tracking-wider block font-mono">
                System Status & Volume Controls
              </span>
              
              {/* Battery Indicator */}
              <div className="flex items-center justify-between text-xs font-semibold text-stone-700 font-sans">
                <div className="flex items-center space-x-2">
                  {isCharging ? (
                    <BatteryCharging className="h-4 w-4 text-emerald-500 animate-pulse" />
                  ) : (
                    <Battery className={`h-4 w-4 ${batteryLevel < 20 ? "text-rose-500 animate-bounce" : "text-stone-500"}`} />
                  )}
                  <span>Device Battery</span>
                </div>
                <div className="flex items-center space-x-1.5 font-mono text-[11.5px] bg-stone-200/50 px-2 py-0.5 rounded-md">
                  <span className={batteryLevel < 20 ? "text-rose-600 font-extrabold animate-pulse" : "text-stone-700 font-bold"}>
                    {batteryLevel}%
                  </span>
                  {isCharging && (
                    <span className="text-[9px] font-sans font-black text-emerald-600 uppercase tracking-tight">
                      [Charging]
                    </span>
                  )}
                </div>
              </div>

              {/* Volume Slider Control */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-stone-750">
                  <span className="flex items-center gap-1.5 font-sans">
                    {volume === 0 ? (
                      <VolumeX className="h-4 w-4 text-rose-500" />
                    ) : (
                      <Volume2 className="h-4 w-4 text-indigo-500" />
                    )}
                    <span>Launcher Volume</span>
                  </span>
                  <span className="font-mono text-xs text-indigo-650 bg-indigo-50 px-1.5 py-0.5 rounded-md font-bold">
                    {volume}%
                  </span>
                </div>
                
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  title="Adjust dynamic applet speaker volume"
                />
              </div>
            </div>

            <p className="text-[9.5px] font-mono text-stone-400 leading-normal font-sans text-center">
              ⚡ Wafula OS Launcher engine is fully configured. App switching requires zero memory reload.
            </p>
          </div>
        </div>

        {/* DEVICE RUNTIME PREVIEW / ACTIVE EMULATOR CANVAS */}
        <div className="lg:col-span-8 bg-stone-900 rounded-3xl p-4 shadow-2xl border-4 border-stone-800 min-h-[500px] flex flex-col relative overflow-hidden">
          
          {/* Status Bar Mock */}
          <div className="flex justify-between items-center text-[#94a3b8] font-mono text-[10px] px-2 pb-3 border-b border-stone-800">
            <div className="flex items-center space-x-1">
              <span className="font-bold">Wafula OS v2.1</span>
              <span className="bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded text-[8px] font-bold">● ONLINE</span>
            </div>
            <div>
              <span>4G / Wi-Fi Active</span>
            </div>
          </div>

          {/* Screen Content */}
          <div className="flex-grow flex flex-col justify-center items-center p-3 relative bg-slate-950 rounded-2xl mt-3 text-white overflow-hidden">
            
            {!activeAppId ? (
              <div className="w-full h-full flex flex-col justify-between p-4 space-y-6">
                
                {/* Simulated Widget Board Header */}
                <div className="text-center max-w-sm mx-auto space-y-2 mt-4">
                  <div className="w-12 h-12 bg-indigo-950/50 border border-indigo-500/20 rounded-full flex items-center justify-center mx-auto text-indigo-400">
                    <Grid className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <strong className="block text-sm font-bold tracking-tight text-white font-display">Launcher Sandboxed Workspace</strong>
                    <p className="text-[10.5px] text-stone-400 leading-relaxed font-sans">
                      Tap a custom application in the left column to launch, or pin frequent study resources directly to this widget board.
                    </p>
                  </div>
                </div>

                {/* PINNED WIDGET DASHBOARD */}
                <div className="flex-grow flex flex-col justify-center">
                  {pinnedAppIds.length === 0 ? (
                    <div className="border border-dashed border-slate-800 rounded-2xl p-6 text-center text-stone-500 max-w-xs mx-auto">
                      <Pin className="h-5 w-5 mx-auto text-stone-600 mb-1.5 animate-pulse" />
                      <p className="text-[10px] uppercase font-bold tracking-wider text-stone-400">No Pinned or Favorite Apps</p>
                      <p className="text-[9.5px] mt-1 text-stone-500 leading-normal font-sans">
                        Hover over any application card in the left index list and tap the pin button to display permanent dashboard tiles.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-w-md mx-auto w-full">
                      <div className="flex items-center justify-between border-b border-slate-850 pb-1.5">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                          <Pin className="h-3 w-3 fill-indigo-400" />
                          <span>Pinned & Favorite Applications</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-indigo-400/80 animate-pulse bg-indigo-950/40 border border-indigo-900/45 px-2 py-0.5 rounded font-mono text-[8px] uppercase tracking-wider">
                            ↕ Drag Tiles to Reorder
                          </span>
                          <span className="text-[9px] font-mono text-slate-500">({pinnedAppIds.length} Active)</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 select-none">
                        {pinnedAppIds
                          .map((pinnedId) => apps.find((a) => a.id === pinnedId))
                          .filter((a): a is PhoneApp => !!a)
                          .map((pinnedApp, index) => (
                            <motion.div
                              key={`pinned-widget-${pinnedApp.id}`}
                              layout
                              draggable
                              onDragStart={(e) => handleDragStart(e, index)}
                              onDragOver={(e) => handleDragOver(e, index)}
                              onDrop={(e) => handleDrop(e, index)}
                              onDragEnd={handleDragEnd}
                              initial={{ opacity: 0, scale: 0.95, y: 8 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              whileHover={{ scale: 1.03, y: -1, zIndex: 10 }}
                              transition={{ 
                                duration: 0.2, 
                                ease: "easeOut",
                                scale: { type: "spring", stiffness: 300, damping: 15 }
                              }}
                              className={`p-3 bg-slate-900 border rounded-xl flex items-start justify-between space-x-2 transition text-left group cursor-grab active:cursor-grabbing ${
                                draggedIndex === index 
                                  ? "border-emerald-500 bg-slate-900/40 opacity-40 shadow-inner" 
                                  : dragOverIndex === index
                                  ? "border-dashed border-indigo-500 bg-indigo-950/25 scale-102 ring-1 ring-indigo-500/30"
                                  : "border-slate-800 hover:border-indigo-500/40 hover:bg-slate-900/80"
                              }`}
                              title="Drag tile to reorder, or click items to launch"
                            >
                              <button
                                type="button"
                                onClick={() => launchApp(pinnedApp.id)}
                                className="flex items-start space-x-2.5 min-w-0 flex-grow text-left cursor-pointer outline-none"
                              >
                                <div className={`p-1.5 rounded-lg shrink-0 ${pinnedApp.color} scale-90`}>
                                  {pinnedApp.icon}
                                </div>
                                <div className="truncate min-w-0">
                                  <span className="text-xs font-bold text-white block group-hover:text-indigo-300 transition-colors truncate font-sans">
                                    {pinnedApp.name}
                                  </span>
                                  <span className="text-[9px] text-slate-400 block truncate mt-0.5 leading-tight font-sans">
                                    {pinnedApp.category}
                                  </span>
                                </div>
                              </button>
                              
                              {/* Grip handle signaling drag movement mechanics */}
                              <div className="text-slate-600 group-hover:text-slate-400 transition-colors shrink-0 pt-1 pointer-events-none">
                                <GripVertical className="h-3.5 w-3.5" />
                              </div>
                            </motion.div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* WEEKLY CATEGORY INGESTION METRICS (RECHARTS WIDGET) */}
                <div className="bg-slate-900 border border-slate-850 rounded-xl p-4 max-w-md mx-auto w-full space-y-3 shadow-md">
                  <div className="flex items-center justify-between border-b border-slate-850 pb-1.5 pointer-events-auto">
                    <div className="flex items-center space-x-2">
                      <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-400">
                        <Activity className="h-4 w-4 animate-pulse" />
                      </div>
                      <div>
                        <strong className="text-xs font-bold text-slate-200 block">Weekly Study Distribution</strong>
                        <span className="text-[9px] text-slate-500 block leading-tight">Quantified live sandbox category study periods</span>
                      </div>
                    </div>
                    <span className="text-[8px] font-mono font-bold text-indigo-400 bg-indigo-950/50 px-1.5 py-0.5 rounded border border-indigo-900/30 uppercase tracking-wider">
                      Live Session Tracker
                    </span>
                  </div>

                  <div className="h-28 w-full select-none text-[8px] pointer-events-auto relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                        <XAxis 
                          dataKey="name" 
                          stroke="#64748b" 
                          fontSize={8} 
                          tickLine={false} 
                          axisLine={false}
                        />
                        <YAxis 
                          stroke="#64748b" 
                          fontSize={8} 
                          tickLine={false} 
                          axisLine={false}
                          unit="m"
                        />
                        <Tooltip
                          contentStyle={{ 
                            background: "#0f172a", 
                            border: "1px solid #1e293b", 
                            borderRadius: "8px", 
                            fontSize: "9px",
                            padding: "4px 8px" 
                          }}
                          labelStyle={{ color: "#94a3b8", fontWeight: "bold" }}
                          itemStyle={{ color: "#38bdf8", padding: 0 }}
                          cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
                        />
                        <Bar dataKey="minutes" radius={[4, 4, 0, 0]} maxBarSize={28}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Legend guide & Simulation controller */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-850/50">
                    <span className="text-[8.5px] text-slate-500 font-sans">
                      💡 Runs while sandbox windows are interactive.
                    </span>
                    <button 
                      type="button" 
                      onClick={() => {
                        setCategoryTimeSpent({
                          "Utilities": 10 + Math.floor(Math.random() * 45),
                          "Scholary": 20 + Math.floor(Math.random() * 80),
                          "Maps": 5 + Math.floor(Math.random() * 40),
                          "Entertainment": 5 + Math.floor(Math.random() * 25)
                        });
                      }} 
                      className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 transition cursor-pointer flex items-center gap-1 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-900/40 active:scale-95 pointer-events-auto"
                    >
                      <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                      <span>Log Activity</span>
                    </button>
                  </div>
                </div>

                {/* SMART FOLDER CONTENT METRICS (RECHARTS WIDGET) */}
                <div className="bg-slate-900 border border-slate-850 rounded-xl p-4 max-w-md mx-auto w-full space-y-3 shadow-md">
                  <div className="flex items-center justify-between border-b border-slate-850 pb-1.5 pointer-events-auto">
                    <div className="flex items-center space-x-2">
                      <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-400">
                        <Grid className="h-4 w-4" />
                      </div>
                      <div>
                        <strong className="text-xs font-bold text-slate-200 block">Smart Folder Architecture</strong>
                        <span className="text-[9px] text-slate-500 block leading-tight">Total active sandbox app packages categorized per folder</span>
                      </div>
                    </div>
                    <span className="text-[8px] font-mono font-bold text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-900/30 uppercase tracking-wider">
                      Dynamic Registry
                    </span>
                  </div>

                  <div className="h-28 w-full select-none text-[8px] pointer-events-auto relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={folderChartData} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                        <XAxis 
                          dataKey="name" 
                          stroke="#64748b" 
                          fontSize={8} 
                          tickLine={false} 
                          axisLine={false}
                        />
                        <YAxis 
                          stroke="#64748b" 
                          fontSize={8} 
                          tickLine={false} 
                          axisLine={false}
                          allowDecimals={false}
                          unit=" apps"
                        />
                        <Tooltip
                          contentStyle={{ 
                            background: "#0f172a", 
                            border: "1px solid #1e293b", 
                            borderRadius: "8px", 
                            fontSize: "9px",
                            padding: "4px 8px" 
                          }}
                          labelStyle={{ color: "#94a3b8", fontWeight: "bold" }}
                          itemStyle={{ color: "#38bdf8", padding: 0 }}
                          cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={28}>
                          {folderChartData.map((entry, index) => (
                            <Cell key={`cell-folder-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="flex items-center justify-between pt-1 border-t border-slate-850/50">
                    <span className="text-[8.5px] text-slate-500 font-sans">
                      💡 Long-press folder headers or click the config gear to edit colors.
                    </span>
                    <span className="text-[9px] font-mono text-slate-400">
                      Total: {apps.length} Apps
                    </span>
                  </div>
                </div>

                {/* Dashboard Smart Info Widget */}
                <div className="bg-slate-900 border border-slate-850 rounded-xl p-3 flex items-center justify-between gap-4 max-w-md mx-auto w-full">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs">📚</span>
                    <div>
                      <strong className="text-[10px] text-slate-300 block font-sans">Digital Study Resource Quick Bar</strong>
                      <span className="text-[9px] text-slate-500 block leading-tight font-sans">Fast, zero-load access to educational media in Bungoma.</span>
                    </div>
                  </div>
                  <div className="text-[9.5px] font-mono text-indigo-400 text-right shrink-0">
                    <div>{apps.length} Assets Loaded</div>
                    <div className="text-stone-500">v2.1 Stable</div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="w-full h-full flex flex-col text-left flex-grow overflow-hidden">
                
                {/* Simulated App Bar Header */}
                <div className="flex justify-between items-center bg-slate-900 border-b border-slate-800 p-3 rounded-lg mb-3 w-full">
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className="text-sm shrink-0">📱</span>
                    <strong className="text-xs uppercase font-mono tracking-wider font-extrabold text-indigo-300 truncate">
                      {apps.find((a) => a.id === activeAppId)?.name}
                    </strong>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    {onNavigate && apps.find((a) => a.id === activeAppId)?.embedUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          const emb = apps.find((a) => a.id === activeAppId)?.embedUrl;
                          if (emb) {
                            if (emb.startsWith("http")) {
                              setBrowserUrl(emb);
                              setActiveAppId("browser");
                            } else {
                              onNavigate(emb);
                            }
                          }
                        }}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-mono text-[9px] uppercase tracking-wider font-extrabold flex items-center gap-1 transition cursor-pointer"
                        title="Load in full view screen"
                      >
                        <Maximize2 className="h-3 w-3" />
                        <span>Launch Full</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveAppId(null)}
                      className="p-1 rounded bg-slate-850 text-slate-400 hover:text-white transition cursor-pointer"
                      title="Close Application"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* APP: STORE INTEGRATION */}
                {activeAppId === "store" && (
                  <div className="flex-grow flex flex-col space-y-3 h-full overflow-y-auto max-h-[420px] pr-1">
                    <p className="text-[10px] text-stone-350 italic">Centred micro bookstore preview. Select any volume to load full study course:</p>
                    <div className="grid grid-cols-2 gap-3 pb-4">
                      {[
                        { id: "b1", title: "Vocational Leadership", author: "Wafula Opara", cover: bookstoreImg, price: "Free" },
                        { id: "b2", title: "Agribusiness & Self Reliance", author: "Kelvin Wafula", cover: bibleImg, price: "KES 500" }
                      ].map((bk) => (
                        <div key={bk.id} className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-center flex flex-col justify-between space-y-2">
                          <div className="aspect-[3/4] w-full flex items-center justify-center bg-transparent p-1 relative">
                            <img src={bk.cover} className="max-h-full max-w-full object-contain" alt={bk.title} />
                          </div>
                          <div>
                            <h5 className="text-[10.5px] font-bold text-white truncate">{bk.title}</h5>
                            <span className="text-[9px] text-stone-400 block">{bk.author}</span>
                            <span className="text-[9.5px] text-amber-400 font-mono font-bold mt-1 block">{bk.price}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => onNavigate && onNavigate("store")}
                            className="w-full py-1 bg-indigo-650 hover:bg-indigo-700 rounded text-[9px] font-semibold uppercase tracking-wider transition cursor-pointer text-white"
                          >
                            Read Now
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* APP: HOLY DEVOTIONAL BIBLE */}
                {activeAppId === "devotional" && (
                  <div className="flex-grow flex flex-col space-y-3 h-full overflow-y-auto max-h-[420px] pr-1 text-xs">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
                      <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest block font-mono">🕊️ DAILY DEVOTION VERSE</span>
                      <blockquote className="italic text-stone-200 border-l-2 border-amber-400 pl-2.5 font-sans">
                        "I am crucified with Christ: nevertheless I live; yet not I, but Christ liveth in me: and the life which I now live in the flesh I live by the faith of the Son of God, who loved me, and gave himself for me."
                      </blockquote>
                      <cite className="block text-right text-[10px] font-mono text-stone-400 font-extrabold">— Galatians 2:20 (KJV)</cite>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-1">
                      <strong className="text-[10.5px] text-indigo-300 block">Offline Concordance Topics</strong>
                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        {["Faith & Grace", "Leadership Principles", "Daily Motivation", "Wisdom & Diligence"].map((topic, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => onNavigate && onNavigate("devotional")}
                            className="p-1.5 rounded bg-slate-950 border border-slate-800 hover:border-amber-400 text-[10px] text-stone-300 text-left truncate cursor-pointer transition"
                          >
                            📖 {topic}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* APP: LEADERSHIP SCHOOL */}
                {activeAppId === "school" && (
                  <div className="flex-grow flex flex-col space-y-2.5 h-full overflow-y-auto max-h-[420px] pr-1 text-xs">
                    <div className="p-3 bg-indigo-950/20 border border-indigo-900/40 rounded-xl">
                      <strong className="text-white text-[11px] block text-indigo-300">Zion Certified Courses:</strong>
                      <p className="text-[10px] text-stone-400 leading-relaxed mt-1">
                        Vocational self-reliance training. Build enterprise modules and local agricultural bookkeeping tracks.
                      </p>
                    </div>
                    {[
                      { title: "Theology & Hermeneutics", code: "THEO-101", prog: "Finished" },
                      { title: "Basic IT & Scholar Writing", code: "IT-204", prog: "Start Now" }
                    ].map((crs, idx) => (
                      <div key={idx} className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex justify-between items-center">
                        <div>
                          <strong className="text-[10.5px] block text-white">{crs.title}</strong>
                          <span className="text-[8.5px] font-mono text-stone-400">{crs.code}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onNavigate && onNavigate("school")}
                          className="px-2 py-1 rounded bg-slate-950 text-[9px] font-bold uppercase tracking-wider text-indigo-400 border border-slate-800 hover:border-indigo-400 transition cursor-pointer"
                        >
                          {crs.prog}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* APP: OFFLINE COMPANION */}
                {activeAppId === "companion" && (
                  <div className="flex-grow flex flex-col space-y-3 h-full overflow-y-auto max-h-[420px] pr-1 text-xs">
                    <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl text-center space-y-1.5">
                      <Sparkles className="h-6 w-6 text-amber-300 mx-auto animate-pulse" />
                      <strong className="block text-[11px] text-white">Smart Offline Assistant</strong>
                      <p className="text-[10px] text-stone-400 leading-normal">
                        Use offline AI to analyze agricultural records, vocabulary lexicon references, and scripture indices immediately.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate && onNavigate("companion")}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-[10px] font-bold uppercase tracking-widest text-white transition cursor-pointer"
                    >
                      💬 Start Offline AI Chat
                    </button>
                  </div>
                )}

                {/* APP: DOCUMENT CREATOR STUDIO */}
                {activeAppId === "studio" && (
                  <div className="flex-grow flex flex-col space-y-2.5 h-full overflow-y-auto max-h-[420px] pr-1">
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-mono font-bold text-stone-400 block uppercase">DRAFT WORK:</span>
                      <textarea
                        rows={5}
                        placeholder="Write your research paper drafts or agribusiness notes..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-[11px] text-white outline-none focus:border-indigo-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate && onNavigate("studio")}
                      className="w-full py-1.5 bg-sky-655 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-[9px] font-extrabold uppercase tracking-widest text-white cursor-pointer"
                    >
                      💾 Persist files to Doc Studio
                    </button>
                  </div>
                )}

                {/* APP: GMAIL CLIENT */}
                {activeAppId === "gmail" && (
                  <div className="flex-grow flex flex-col space-y-2.5 h-full overflow-y-auto max-h-[420px] pr-1 text-xs">
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl space-y-2">
                      <span className="text-[9px] font-black uppercase text-red-400 block font-mono">📨 Compose secure console message</span>
                      <input type="text" placeholder="Recipient (e.g. registry@zion.org)" className="w-full p-2 rounded bg-slate-950 border border-slate-800 text-[10.5px] text-white outline-none" />
                      <textarea placeholder="Message body..." className="w-full p-2 h-16 rounded bg-slate-950 border border-slate-800 text-[10.5px] text-white outline-none" />
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate && onNavigate("gmail")}
                      className="w-full py-1.5 bg-rose-700 hover:bg-rose-800 rounded-xl text-[9px] font-bold uppercase tracking-wider text-white cursor-pointer"
                    >
                      🚀 Open Full Sandbox Mail client
                    </button>
                  </div>
                )}

                {/* APP: SWAHILI TEACHER */}
                {activeAppId === "language-teacher" && (
                  <div className="flex-grow flex flex-col space-y-2 h-full overflow-y-auto max-h-[420px] pr-1 text-xs">
                    <span className="text-[9px] font-black uppercase text-emerald-400 block font-mono">🗣️ VOCABULARY DRILL INDEX</span>
                    {[
                      { eng: "Welcome", swa: "Karibu" },
                      { eng: "Let us learn", swa: "Tujifunze" },
                      { eng: "Agribusiness", swa: "Biashara ya kilimo" },
                      { eng: "God bless you", swa: "Mungu akubariki" }
                    ].map((vcb, i) => (
                      <div key={i} className="p-2 bg-slate-900 border border-slate-850 rounded-lg flex justify-between items-center font-sans">
                        <span className="text-stone-300 font-medium">{vcb.eng}</span>
                        <span className="text-emerald-400 font-extrabold font-mono text-[11px]">{vcb.swa}</span>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => onNavigate && onNavigate("language-teacher")}
                      className="w-full py-1 bg-slate-950 border border-slate-800 hover:border-emerald-500 rounded text-[9px] font-black uppercase text-center cursor-pointer text-stone-300 mt-2"
                    >
                      Expand Language Teacher Modules
                    </button>
                  </div>
                )}

                {/* APP: ACADEMIC LEXICON */}
                {activeAppId === "offline-dictionary" && (
                  <div className="flex-grow flex flex-col space-y-2.5 h-full overflow-y-auto max-h-[420px] pr-1 text-xs">
                    <input type="text" placeholder="Search dictionary definitions..." className="w-full p-2 rounded bg-slate-905 border border-slate-800 text-[10.5px] outline-none" />
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1 leading-relaxed">
                      <strong className="text-amber-400 text-[10.5px] font-mono">Hermeneutics:</strong>
                      <p className="text-[10px] text-stone-300 font-sans">
                        The methodology and methodology principles of theological scriptural interpretation.
                      </p>
                    </div>
                  </div>
                )}

                {/* APP: GENERIC IN-APP IFRAME HUB FOR WEB SATELLITES */}
                {(activeAppId === "youtube_app" || activeAppId === "tiktok_app" || activeAppId === "wikipedia_app" || activeAppId === "opera_app") && (() => {
                  const item = apps.find(a => a.id === activeAppId);
                  return (
                    <div className="flex-grow flex flex-col space-y-2 h-full overflow-hidden">
                      <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center justify-between text-[10px] font-mono text-indigo-300">
                        <span className="truncate">🌐 {item?.embedUrl}</span>
                        <span className="text-emerald-400 font-extrabold select-none shrink-0">✓ IN-APP SANDBOX</span>
                      </div>
                      <div className="border border-slate-800 rounded-xl overflow-hidden bg-white text-slate-850 flex-grow min-h-[290px] relative">
                        {/* Interactive local custom browser simulation to avoid X-Frame restrictions */}
                        <iframe 
                          src={item?.embedUrl} 
                          className="w-full h-full border-0 bg-white"
                          title="Sandbox Iframe Satellite"
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* APP 1: CALCULATOR */}
                {activeAppId === "calculator" && (
                  <div className="flex-grow flex flex-col justify-between max-w-xs mx-auto w-full bg-stone-900 p-4 rounded-xl border border-stone-800">
                    <div className="bg-black p-3.5 rounded-lg text-right mb-4">
                      <div className="text-stone-400 text-xs font-mono h-5 overflow-hidden">{calcInput || "0"}</div>
                      <div className="text-white text-2xl font-bold font-mono h-8 overflow-hidden">{calcResult || "0"}</div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "C", "0", "=", "+"].map((char) => (
                        <button
                          type="button"
                          key={char}
                          onClick={() => handleCalcClick(char)}
                          className={`py-3.5 rounded-lg font-mono font-bold text-xs cursor-pointer transition ${
                            char === "=" 
                              ? "bg-indigo-650 hover:bg-indigo-700 text-white"
                              : char === "C"
                              ? "bg-rose-900 hover:bg-rose-950 text-rose-300"
                              : ["+", "-", "*", "/"].includes(char)
                              ? "bg-slate-800 hover:bg-slate-850 text-indigo-400 font-extrabold"
                              : "bg-stone-800 hover:bg-stone-850 text-white"
                          }`}
                        >
                          {char}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* APP 2: STUDY NOTEPAD */}
                {activeAppId === "notepad" && (
                  <div className="flex-grow flex flex-col space-y-4 h-full">
                    <form onSubmit={handleAddNewNote} className="flex gap-2">
                      <input
                        type="text"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Add quick scholarly note..."
                        className="flex-grow rounded-lg bg-slate-900 border border-slate-800 p-2 text-xs font-medium text-white outline-none"
                      />
                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 rounded-lg text-xs font-extrabold font-mono uppercase"
                      >
                        Save
                      </button>
                    </form>

                    <div className="flex-grow max-h-[280px] overflow-y-auto pr-1 space-y-2">
                      {notes.length === 0 ? (
                        <p className="text-xs text-stone-500 italic text-center py-6">Your notepad is currently empty. Make local drafts of notes instantly.</p>
                      ) : (
                        notes.map((note, idx) => (
                          <div key={idx} className="p-3 bg-slate-900 border border-slate-850 rounded-lg flex justify-between items-start">
                            <span className="text-xs text-stone-300 pr-2 leading-relaxed">{note}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteNote(idx)}
                              className="text-stone-500 hover:text-red-400 p-0.5"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* APP 3: DAILY PLANNER */}
                {activeAppId === "planner" && (
                  <div className="flex-grow flex flex-col space-y-4">
                    <form onSubmit={handleAddTask} className="flex gap-2">
                      <input
                        type="text"
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                        placeholder="e.g. Grade Swahili language module tasks..."
                        className="flex-grow rounded-lg bg-slate-900 border border-slate-800 p-2 text-xs font-medium text-white outline-none"
                      />
                      <button
                        type="submit"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 rounded-lg text-xs font-extrabold font-mono uppercase shrink-0"
                      >
                        Add Task
                      </button>
                    </form>

                    <div className="flex-grow max-h-[280px] overflow-y-auto pr-1 space-y-2">
                      {tasks.length === 0 ? (
                        <p className="text-xs text-stone-500 italic text-center py-6">All planned operations completed! Put checklist items above.</p>
                      ) : (
                        tasks.map((task) => (
                          <div key={task.id} className="p-2.5 bg-slate-900 rounded-lg border border-slate-850 flex items-center justify-between">
                            <div className="flex items-center space-x-2 truncate">
                              <input
                                type="checkbox"
                                checked={task.done}
                                onChange={() => handleToggleTask(task.id)}
                                className="h-3.5 w-3.5 text-indigo-600 border-stone-300 rounded cursor-pointer"
                              />
                              <span className={`text-xs truncate ${task.done ? "line-through text-stone-500 font-medium" : "text-stone-200"}`}>
                                {task.text}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-stone-500 hover:text-red-400 p-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* APP 4: BROWSER / GOOGLE CHROME MOBILE EXPERIENCE */}
                {activeAppId === "browser" && (
                  <div className="flex-grow flex flex-col space-y-2 h-full overflow-y-auto max-h-[420px] pr-1">
                    <div className="bg-slate-900 border border-slate-800 px-3 p-1.5 rounded-lg flex items-center justify-between text-[10px] font-mono text-indigo-300">
                      <span className="truncate">🌐 {browserUrl}</span>
                      <button 
                        type="button"
                        onClick={() => setBrowserUrl("https://www.google.com")}
                        className="text-emerald-450 hover:text-emerald-350 cursor-pointer text-[9.5px] font-bold uppercase tracking-wider bg-slate-950 px-2 py-0.5 rounded border border-slate-800"
                      >
                        Home
                      </button>
                    </div>
                    <div className="border border-slate-800 rounded-xl overflow-hidden bg-white text-slate-850 flex-grow min-h-[350px] relative">
                      {browserUrl.startsWith("https://www.google.com") ? (
                        <GoogleSimView 
                          iframeUrl={browserUrl} 
                          onNavigate={(url) => setBrowserUrl(url)} 
                        />
                      ) : (
                        <iframe 
                          src={browserUrl} 
                          className="w-full h-full border-0 bg-white"
                          title="Mobile Sandbox Browser Viewport"
                          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                          referrerPolicy="no-referrer"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* APP 5: BUNGOMA MAP VIEW */}
                {activeAppId === "maps" && (
                  <div className="flex-grow flex flex-col space-y-2">
                    <span className="block text-[10.5px] font-semibold text-[#38bdf8]">🌐 ACTIVE BUNGOMA COUNTY SCHOLAR CENTER EMBED</span>
                    <div className="border border-slate-800 rounded-xl overflow-hidden flex-grow min-h-[300px]">
                      <iframe
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d127633.91494025178!2d34.48512198086054!3d0.5638217316718105!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1781fc47c5dfcd2d%3A0xc3cf052b61f9eb8b!2sBungoma!5e0!3m2!1sen!2ske!4v1716942000000!5m2!1sen!2ske"
                        className="w-full h-full border-0 min-h-[290px]"
                        allowFullScreen={false}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="Bungoma Library Map Locator"
                      />
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>

          {/* Navigation Bar Button Emulators */}
          <div className="flex justify-around items-center pt-3 text-[#94a3b8] border-t border-stone-850 mt-3 select-none">
            <button
              onClick={() => setActiveAppId(null)}
              className="p-1 text-xs font-mono font-black text-stone-405 hover:text-white"
            >
              ◀ BACK
            </button>
            <div className="w-10 h-10 border-2 border-stone-750 bg-stone-800 rounded-full flex items-center justify-center cursor-pointer hover:bg-stone-750 active:bg-stone-800" onClick={() => setActiveAppId(null)}>
              <div className="w-4 h-4 bg-stone-300 rounded" />
            </div>
            <span className="text-xs font-bold text-slate-550 opacity-40">📱 W-OS</span>
          </div>

        </div>

      </div>

      {/* FOLDER EDIT MODAL */}
      {editingFolderKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 pointer-events-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-white rounded-2xl border border-stone-200 p-5 shadow-2xl space-y-4 text-stone-850"
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 font-sans">
                <Folder className="h-4 w-4 text-indigo-500 fill-indigo-50" />
                <span>Customize Smart Folder</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setEditingFolderKey(null)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block font-sans">
                  Folder Title Reference
                </label>
                <input
                  type="text"
                  value={tempFolderName}
                  onChange={(e) => setTempFolderName(e.target.value)}
                  placeholder="Enter a descriptive folder name"
                  className="w-full text-xs font-semibold px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:border-indigo-600 focus:bg-white outline-none transition"
                  maxLength={24}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block font-sans">
                  Theme Palette Accent
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {[
                    { color: "#6366f1", label: "Indigo" },
                    { color: "#10b981", label: "Emerald" },
                    { color: "#f43f5e", label: "Rose" },
                    { color: "#f59e0b", label: "Amber" },
                    { color: "#8b5cf6", label: "Purple" },
                    { color: "#06b6d4", label: "Cyan" },
                    { color: "#f97316", label: "Orange" }
                  ].map((item) => (
                    <button
                      key={item.color}
                      type="button"
                      onClick={() => setTempFolderColor(item.color)}
                      className={`h-7 w-7 rounded-full border-2 transition transform active:scale-90 cursor-pointer flex items-center justify-center ${
                        tempFolderColor === item.color 
                          ? "border-black scale-110 shadow-xs" 
                          : "border-transparent opacity-80 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: item.color }}
                      title={item.label}
                    >
                      {tempFolderColor === item.color && (
                        <span className="text-white text-[9px] font-black">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-stone-50 border border-stone-150 rounded-xl p-2.5 flex items-center gap-2">
              <div 
                className="h-5 w-5 rounded-md flex items-center justify-center shrink-0"
                style={{ backgroundColor: tempFolderColor }}
              >
                <Folder className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] block font-bold text-stone-500 uppercase font-mono tracking-wider">Preview Accent</span>
                <span className="text-xs font-bold block truncate" style={{ color: tempFolderColor }}>{tempFolderName || editingFolderKey} Folder</span>
              </div>
            </div>

            <div className="flex space-x-2.5 pt-1.5">
              <button
                type="button"
                onClick={() => setEditingFolderKey(null)}
                className="flex-1 py-2 text-xs font-bold border border-stone-200 hover:bg-stone-50 rounded-xl text-stone-500 hover:text-stone-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveFolderCustomization}
                className="flex-1 py-2 text-xs font-black text-white rounded-xl transition cursor-pointer shadow-md shadow-indigo-100"
                style={{ backgroundColor: tempFolderColor }}
              >
                Save Settings
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
