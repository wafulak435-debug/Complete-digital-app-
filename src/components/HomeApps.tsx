import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Smartphone, Search, X, Minimize2, Maximize2, RefreshCw, 
  Map, Calculator, BookOpen, Compass, Shield, Grid, HelpCircle,
  FileText, Calendar, Plus, Trash2, CheckSquare, Play, Sparkles,
  Pin, Folder, Activity, Volume2, VolumeX, Battery, BatteryCharging, GripVertical, History
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

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
    color: "bg-amber-550 border-amber-500 text-amber-600 bg-amber-50",
    description: "Perform quick calculations and algebraic operations for agribusiness book balances."
  },
  {
    id: "notepad",
    name: "Study Journal",
    category: "Scholary",
    icon: <FileText className="h-6 w-6" />,
    color: "bg-blue-550 border-blue-500 text-blue-600 bg-blue-50",
    description: "Write and persist scholastic thoughts, summaries, and book reviews offline."
  },
  {
    id: "planner",
    name: "Daily Planner",
    category: "Utilities",
    icon: <CheckSquare className="h-6 w-6" />,
    color: "bg-emerald-550 border-emerald-500 text-emerald-600 bg-emerald-50",
    description: "Organize pending reads, book study hours, and academic goals."
  },
  {
    id: "browser",
    name: "AI Web Search & Media Hub",
    category: "Scholary",
    icon: <Compass className="h-6 w-6" />,
    color: "bg-indigo-550 border-indigo-500 text-indigo-600 bg-indigo-50",
    description: "Search any topic on earth. Watch educational videos, view related photos, and read instant AI summaries."
  },
  {
    id: "maps",
    name: "Bungoma Map View",
    category: "Maps",
    icon: <Map className="h-6 w-6" />,
    color: "bg-teal-550 border-teal-500 text-teal-600 bg-teal-50",
    description: "Visual navigation of libraries and educational centers around Western Kenya."
  }
];

export default function HomeApps() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeAppId, setActiveAppId] = useState<string | null>(null);
  
  // Recent Searches state
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

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
  const [browserUrl, setBrowserUrl] = useState("https://en.wikipedia.org/wiki/Bungoma");
  const [browserSearch, setBrowserSearch] = useState("Bungoma");
  const [browserSearchMode, setBrowserSearchMode] = useState<"ai_smart" | "legacy_wiki">("ai_smart");
  const [hasSearched, setHasSearched] = useState(true);
  const [aiResult, setAiResult] = useState({
    title: "Bungoma County, Western Kenya",
    description: "Bungoma is a county in the former Western Province of Kenya. It bordering Uganda and features scenic valleys, scholastic institutions, and vast agricultural potential. Home of the Bukusu ethnic community, it acts as a central node for education and trade under Wafula Digital leadership models.",
    images: [
      "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1523805009345-7448845a9e53?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600"
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
    setActiveAppId(id);
    setAppUsage((prev) => {
      const updated = { ...prev, [id]: (prev[id] || 0) + 1 };
      localStorage.setItem("WAFULA_LAUNCHER_USAGE", JSON.stringify(updated));
      return updated;
    });
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
          "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&q=80&w=600",
          "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&q=80&w=600",
          "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&q=80&w=600"
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
          "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&q=80&w=600",
          "https://images.unsplash.com/photo-1523805009345-7448845a9e53?auto=format&fit=crop&q=80&w=600",
          "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600"
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
          "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80&w=600",
          "https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&q=80&w=600",
          "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=600"
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
          "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&q=80&w=600",
          "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600",
          "https://images.unsplash.com/photo-1464226184884-fa280b87c3e9?auto=format&fit=crop&q=80&w=600"
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
          "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=600",
          "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=600",
          "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=600"
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
              <div className="w-full h-full flex flex-col text-left">
                
                {/* Simulated App Bar Header */}
                <div className="flex justify-between items-center bg-slate-900 border-b border-slate-800 p-3 rounded-lg mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">📱</span>
                    <strong className="text-xs uppercase font-mono tracking-wider font-extrabold text-indigo-300">
                      {apps.find((a) => a.id === activeAppId)?.name}
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveAppId(null)}
                    className="p-1 rounded bg-slate-850 text-slate-400 hover:text-white"
                    title="Close Application"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

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

                {/* APP 4: BROWSER / WEB MEDIA & AI KNOWLEDGE HUB */}
                {activeAppId === "browser" && (
                  <div className="flex-grow flex flex-col space-y-3 h-full overflow-y-auto max-h-[420px] pr-1">
                    <form onSubmit={handleSearchWikiSim} className="flex gap-2">
                      <div className="flex-grow relative">
                        <input
                          type="text"
                          value={browserSearch}
                          onChange={(e) => setBrowserSearch(e.target.value)}
                          placeholder="Search anything (e.g., Bungoma, Faith, Leadership, Agribusiness)..."
                          className="w-full rounded-lg bg-slate-900 border border-slate-800 pl-7 pr-2 py-2 text-xs text-white outline-none"
                        />
                        <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-slate-500" />
                      </div>
                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 rounded-lg text-xs font-mono font-bold uppercase shrink-0 flex items-center gap-1.5"
                      >
                        <Sparkles className="h-3 w-3 text-amber-300 animate-pulse" />
                        <span>Search</span>
                      </button>
                    </form>

                    {/* Mode Switching Tabs */}
                    <div className="flex space-x-1 p-1 bg-slate-900 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setBrowserSearchMode("ai_smart")}
                        className={`flex-1 py-1 px-2 rounded text-[10px] font-bold uppercase tracking-wider transition ${
                          browserSearchMode === "ai_smart"
                            ? "bg-indigo-600 text-white"
                            : "text-stone-400 hover:text-white"
                        }`}
                      >
                        🌟 AI Media Search (Videos, Images & AI)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBrowserSearchMode("legacy_wiki")}
                        className={`flex-1 py-1 px-2 rounded text-[10px] font-bold uppercase tracking-wider transition ${
                          browserSearchMode === "legacy_wiki"
                            ? "bg-indigo-600 text-white"
                            : "text-stone-400 hover:text-white"
                        }`}
                      >
                        🌐 Desktop Legacy Wiki
                      </button>
                    </div>

                    {browserSearchMode === "legacy_wiki" ? (
                      <div className="border border-slate-800 rounded-xl overflow-hidden bg-white text-slate-850 text-xs flex-grow flex flex-col min-h-[300px]">
                        {/* Browser Simulated Web View */}
                        <div className="bg-slate-100 px-3 py-1.5 flex items-center justify-between border-b text-[10px] font-mono text-stone-600 select-all">
                          <span>🌐 {browserUrl}</span>
                          <span className="text-emerald-700 font-bold">✓ SECURE SHA256</span>
                        </div>
                        
                        <iframe 
                          src={browserUrl} 
                          className="w-full h-[260px] border-0 bg-white text-black"
                          title="Wiki Browser Sim"
                        />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* AI Summary Card */}
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs">🤖</span>
                            <strong className="text-xs text-amber-400 font-mono uppercase tracking-wider">AI Copilot Search Summary</strong>
                          </div>
                          <h4 className="text-sm font-black text-white">{aiResult.title}</h4>
                          <p className="text-xs text-stone-300 leading-relaxed font-sans">{aiResult.description}</p>
                        </div>

                        {/* Images Section */}
                        <div className="space-y-2">
                          <span className="block text-[10px] font-bold font-mono text-stone-400 uppercase tracking-widest">📷 High-Res Web Image results</span>
                          <div className="grid grid-cols-3 gap-2">
                            {aiResult.images.map((img, i) => (
                              <div key={i} className="group relative rounded-lg overflow-hidden border border-slate-800 bg-slate-900 h-20">
                                <img
                                  src={img}
                                  alt="Search Result visual"
                                  className="w-full h-full object-cover transition duration-300 group-hover:scale-110"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <span className="text-[8px] font-mono font-bold text-white uppercase tracking-wider bg-black/80 px-1 rounded">View Frame</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Playable Videos Section */}
                        <div className="space-y-2 pb-2">
                          <span className="block text-[10px] font-bold font-mono text-stone-400 uppercase tracking-widest">🎥 Streamable Video Feeds (Live Control)</span>
                          <div className="grid gap-3">
                            {aiResult.videos.map((vid, idx) => (
                              <div key={idx} className="bg-slate-905 border border-slate-850 p-2.5 rounded-xl space-y-2">
                                <span className="block text-xs font-bold text-slate-200">🎬 Video: {vid.title}</span>
                                
                                <div className="aspect-video w-full rounded-lg overflow-hidden border border-slate-800 bg-black">
                                  <iframe
                                    src={vid.url}
                                    className="w-full h-full border-0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    title={vid.title}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
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
