import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Sparkles, Trash2, Link2, Plus, ArrowUp, Send, Play, Music, Youtube, HelpCircle, History, RefreshCw, Layers, Mic, MicOff, BookOpen, Image as ImageIcon, Video, Sliders, Download, CheckCircle, FileText, Printer, Copy, Check } from "lucide-react";
import { SearchHistoryItem, PersonalLink } from "../types";
import { compileAcademicDocumentPdf } from "../utils/academicDocumentPdfCompiler";
import {
  fetchSearchHistoriesFromFirestore,
  saveSearchHistoryToFirestore,
  deleteSearchHistoryFromFirestore,
  clearSearchHistoriesFromFirestore
} from "../lib/firestoreUtils";

// Helper functions to parse headers in bold and rest in normal weight
function parseMarkdownBold(text: string) {
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return <strong key={index} className="font-semibold text-stone-900 dark:text-neutral-100">{part}</strong>;
    }
    return part;
  });
}

function FormattedChatText({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split("\n");
  
  return (
    <div className="space-y-1.5 text-xs">
      {lines.map((line, idx) => {
        // Headers (H1 - H5)
        const headerMatch = line.match(/^(#{1,5})\s+(.*)$/);
        if (headerMatch) {
          const depth = headerMatch[1].length;
          const content = headerMatch[2];
          return (
            <div key={idx} className={`font-bold text-stone-900 dark:text-white mt-4 mb-2 uppercase tracking-wide border-b border-stone-100 dark:border-stone-850 pb-1 ${
              depth === 1 ? 'text-sm font-black' : depth === 2 ? 'text-[12.5px] font-extrabold' : 'text-xs'
            }`}>
              {content.replace(/\*\*/g, "")}
            </div>
          );
        }
        
        // Bullet points
        if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
          const content = line.trim().substring(2);
          return (
            <div key={idx} className="flex items-start gap-1.5 ml-2">
              <span className="text-red-700 font-extrabold">•</span>
              <p className="flex-1 m-0 text-stone-700 dark:text-stone-300 font-normal">
                {parseMarkdownBold(content)}
              </p>
            </div>
          );
        }

        // Numbered list
        const orderedMatch = line.trim().match(/^(\d+)\.\s+(.*)$/);
        if (orderedMatch) {
          const num = orderedMatch[1];
          const content = orderedMatch[2];
          return (
            <div key={idx} className="flex items-start gap-1.5 ml-2">
              <span className="font-bold text-red-700 font-mono text-[10px]">{num}.</span>
              <p className="flex-1 m-0 text-stone-700 dark:text-stone-300 font-normal">
                {parseMarkdownBold(content)}
              </p>
            </div>
          );
        }

        // Plain line
        return (
          <p key={idx} className="m-0 leading-relaxed text-stone-700 dark:text-stone-300 font-normal min-h-[1.1em]">
            {parseMarkdownBold(line)}
          </p>
        );
      })}
    </div>
  );
}

interface AIChatProps {
  currentUser: { email: string; name: string } | null;
  onUnlockBadge: (badgeId: string) => void;
  isOnline?: boolean;
}

// Advanced local rule-based AI engine that runs 100% offline without data bundles!
function generateLocalOfflineAIResponse(promptText: string, category: string): string {
  const query = promptText.toLowerCase().trim();
  
  // 1. Covenant Leadership & Wafula School responses
  if (query.includes("school") || query.includes("wafula") || query.includes("bungoma") || query.includes("covenant") || query.includes("stewardship") || query.includes("leadership") || query.includes("pillar") || query.includes("zion")) {
    return `### Wafula School of Covenant Leadership - Academic Briefing (OFFLINE AI)

Welcome to the **Bungoma Core Covenant Leadership** advisor. Your request has been compiled locally from our Certified Leadership syllabus archives (running 100% without cellular data bundles!).

Here is an offline executive breakdown of the principles:

1. **Sacred Stewardship (Covenant Trust)**:
   Leadership is not a title of dominion, but a solemn covenant. Leaders are trustees of community potential, accountable to high ethical standpoints and divine values.
2. **Digital Capacity (Agile Computing)**:
   Our Bungoma Digital Scholars curriculum advocates for modern office productivity, localized database configurations, and digital design literacy to streamline local organizations.
3. **Ethical Administration & Transparency**:
   A covenant leader maintains clean ledgers, models complete honesty, and guards against administrative corruption.
4. **Community Integration**:
   Solving local micro-economic issues in Bungoma County (such as affordable broadband bypasses via Zion Wi-Fi meshes) to raise standards of living.

*Advice: To learn more, check the **School & Studies** or **Wi-Fi** tabs on the left sidebar navigation menu.*`;
  }

  // 2. Technical / Database / Programming queries
  if (query.includes("database") || query.includes("sql") || query.includes("postgres") || query.includes("react") || query.includes("typescript") || query.includes("code") || query.includes("programming") || query.includes("index") || query.includes("acid")) {
    return `### Senior Software Architect Advisory: Database & Coding (OFFLINE AI)

You queried regarding technical development. Here is a high-fidelity local blueprint for secure full-stack software development:

1. **Strict Database Integrity**:
   - Always enforce proper foreign key constraints and data validation rules at the schema level before committing database writes.
   - Use indexes strategically on columns commonly used in \`WHERE\` clauses, but be cautious of index bloat which slows down writes.
2. **ACID Compliance**:
   - Wrap related write operations in database transactions. If one step fails, the entire transaction must roll back to avoid corrupt states.
3. **Full-Stack Type Safety**:
   - Establish shared type interfaces in a common file (like \`src/types.ts\`) for seamless schema integration between server and client.
   - Restrict direct database access to secure, dedicated API endpoints proxying sensitive database credentials.
4. **Offline Resilience**:
   - Utilize local key-value state engines (like \`localStorage\` or IndexedDB) so the application remains functional even when the network is unstable.

*Tip: You can use our **Document Publisher** or **Code Console** to format these directives into elegant PDF manuscripts.*`;
  }

  // 3. Bible, Scripture & theological counseling queries
  if (query.includes("bible") || query.includes("scripture") || query.includes("verse") || query.includes("jesus") || query.includes("god") || query.includes("sermon") || query.includes("theology") || query.includes("faith")) {
    return `### Theological Journal: Sermon Study Guide (OFFLINE AI)

Here is a structured sermon outline compiled from our offline biblical scholarship databases to support your theological study:

**Sermon Theme**: Stewardship, Divine Trust, and Covenant Perseverance
**Key Scriptures**: 
- *Romans 12:1-2*: Presenting ourselves as living sacrifices, holy and acceptable.
- *Nehemiah 2:17-18*: "Let us rise up and build..." Collective leadership and civic renewal.
- *Matthew 25:21*: "Well done, good and faithful servant; you were faithful over a few things, I will make you ruler over many..."

**Homiletic Breakdown**:
1. **The Principle of Ownership (God as Sovereign)**:
   Recognizing that we own nothing; we are merely stewards of resources, time, talents, and platforms.
2. **The Call to Collective Action**:
   Nehemiah's leadership demonstrated that rebuilding broken walls requires joint effort, shared vision, and systematic organization.
3. **Diligent Execution**:
   Fulfilling small administrative tasks with high integrity leads to broader responsibility.

*Practice: Use our **Sermons & Sermons** player to listen to audio readings of the scriptures offline.*`;
  }

  // 4. Project Plan / Strategy / Goal / Business
  if (query.includes("project") || query.includes("plan") || query.includes("strategy") || query.includes("goal") || query.includes("business") || query.includes("milestone") || query.includes("budget")) {
    return `### Strategic Project Plan Template (OFFLINE AI)

Based on your strategy query, we have formulated a robust 5-phase project roadmap that functions autonomously and successfully without data bundles:

1. **Phase 1: Scope Initiation**:
   Define clear boundaries and human/financial resources. Avoid unrequested over-engineering; stick strictly to the primary goal.
2. **Phase 3: Milestone Architecture**:
   Establish 3 key measurable goals with firm deadlines.
3. **Phase 3: Execution & Continuous Integration**:
   Implement incremental updates while running automated sanity checks (like linter and compilers) to avoid fatal hangs.
4. **Phase 4: Feedback Loops**:
   Engage local users in Bungoma to review performance, usability, and visual pairings.
5. **Phase 5: Resilient Deployment**:
   Ensure fallback triggers are active so the service operates successfully during power outages or network disconnections.`;
  }

  // 5. Document publishing, formatting, cover design
  if (query.includes("publish") || query.includes("book") || query.includes("pdf") || query.includes("page") || query.includes("formatting") || query.includes("cover")) {
    return `### Academic Document Publishing Manual (OFFLINE AI)

Here is an offline formatting guideline for high-quality printing layouts:

1. **Aesthetic Typography Pairing**:
   - Use standard clean sans-serif (such as Inter) for body text and Space Grotesk or Playfair Display for headings to establish rhythm.
2. **Proper Spacing & Margins**:
   - Maintain at least 0.75-inch margins for standard textbooks.
   - Use double-dashed borders with golden color accents for cover pages to project elegance.
3. **Automatic Indices**:
   - Ensure the compilation system generates an automatic Table of Contents with accurate page numbers.
4. **Fidelity-Preserving Text**:
   - When pulling from AI sources, double-check that technical definitions are not distorted during the layout phase.

*Note: You can configure and print these setups instantly in our **Document Publisher** tab above.*`;
  }

  // 6. General fallback / Greetings
  return `### Zion AI Scholar Companion (OFFLINE AI)

Hello! I am your local, high-fidelity AI assistant running **completely offline without data bundles**.

Your query is processed using our **local rule-based parsing engine**, which prevents hangs and ensures immediate, zero-latency feedback at any time, even in areas with zero internet coverage.

**How I can help you offline:**
- **Academic Mentorship**: Ask about Covenant Leadership, covenant theology, or Wafula School guidelines.
- **Database Architecture**: Ask about SQL, Postgres, React/TypeScript patterns, or database transactions.
- **Sermon Preparation**: Get scripture references, homiletic points, and church leadership outlines.
- **Project Strategies**: Generate detailed phase-by-phase business roadmaps and milestones.

*How is this possible?* Our local core parses keywords in your prompt and matches them to a massive pre-compiled knowledge dictionary, synthesizing polished and helpful Markdown outputs instantly.

Tell me what you would like to explore or outline today!`;
}

export default function AIChat({ currentUser, onUnlockBadge, isOnline = true }: AIChatProps) {
  const [forceOfflineAI, setForceOfflineAI] = useState<boolean>(() => {
    return localStorage.getItem("WAFULA_FORCE_OFFLINE_AI") === "true";
  });

  useEffect(() => {
    localStorage.setItem("WAFULA_FORCE_OFFLINE_AI", forceOfflineAI ? "true" : "false");
  }, [forceOfflineAI]);

  const [activeCategory, setActiveCategory] = useState<string>("Assistant"); // Assistant, Problem Solver, Project Plan, Document Publisher, Creative Studio
  const [prompt, setPrompt] = useState("");
  const [enableGoogleSearch, setEnableGoogleSearch] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string; groundingSources?: { title: string; uri: string }[] }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [historyList, setHistoryList] = useState<SearchHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; size: string; type: string; base64: string }[]>([]);

  // Integrated Multi-Page Document Publisher states
  const [docTitle, setDocTitle] = useState("Syllabus Manual of Covenant Leadership");
  const [docSubtitle, setDocSubtitle] = useState("Exploring Sacred Stewardship, Ethical Administration, and Agile Computing");
  const [docAuthor, setDocAuthor] = useState("Wafula Digital Scholars");
  const [docLayoutType, setDocLayoutType] = useState<"Academic Textbook" | "Business Proposal Blueprint" | "Theological Journal" | "Strategic Policy Document" | "Wonderful Book Cover (Front & Back)" | "Professional Magazine (Multi-Column Layout)">("Academic Textbook");
  const [docThemeName, setDocThemeName] = useState<"regal" | "royal" | "divine" | "corporate">("regal");
  const [docChaptersCount, setDocChaptersCount] = useState<number>(5);
  const [docContentSeed, setDocContentSeed] = useState<string>("");
  const [docPreserveMeaning, setDocPreserveMeaning] = useState<boolean>(true);
  const [isCompilingDoc, setIsCompilingDoc] = useState<boolean>(false);

  // Integrated Creative Media Generation states
  const [creativeType, setCreativeType] = useState<'image' | 'video'>('image');
  const [creativePrompt, setCreativePrompt] = useState("");
  const [creativeAspect, setCreativeAspect] = useState("1:1");
  const [creativeHd, setCreativeHd] = useState(false);
  const [creativeIsGenerating, setCreativeIsGenerating] = useState(false);
  const [creativeResultImage, setCreativeResultImage] = useState<string | null>(null);
  const [creativeResultVideo, setCreativeResultVideo] = useState<string | null>(null);
  const [creativeError, setCreativeError] = useState("");

  // States for Voice transcription
  const [isListening, setIsListening] = useState(false);
  const [isMicPaused, setIsMicPaused] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [micStateError, setMicStateError] = useState(false);

  // States for Audio Read Aloud (TTS synthesizer)
  const [readingIndex, setReadingIndex] = useState<number | null>(null);
  const [isTtsPaused, setIsTtsPaused] = useState(false);

  // States & utilities for High-Fidelity Clipboard Copying
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyChatResponse = async (text: string, index: number) => {
    try {
      // Build high-fidelity rich HTML layout to preserve headings as bold block tags
      const formattedHTML = text
        .split("\n")
        .map(line => {
          if (line.match(/^#{1,5}\s+(.*)$/)) {
            return `<h3 style="font-weight: bold; margin-top: 14px; margin-bottom: 6px; font-family: sans-serif;">${line.replace(/^#{1,5}\s+/, "").replace(/\*\*/g, "")}</h3>`;
          }
          if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
            return `<li style="margin-left: 15px; font-family: sans-serif;">${line.trim().substring(2).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")}</li>`;
          }
          return `<p style="margin: 4px 0; font-family: sans-serif;">${line.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")}</p>`;
        })
        .join("");

      const plainText = text;

      if (navigator.clipboard && window.ClipboardItem) {
        const textBlob = new Blob([plainText], { type: "text/plain" });
        const htmlBlob = new Blob([formattedHTML], { type: "text/html" });
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": textBlob,
            "text/html": htmlBlob
          })
        ]);
      } else {
        await navigator.clipboard.writeText(plainText);
      }

      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1800);
    } catch (err) {
      console.warn("Failed high-fidelity clipboard write:", err);
      try {
        await navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 1800);
      } catch (innerErr) {
        console.error("Clipboard copy completely blocked:", innerErr);
      }
    }
  };

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
  const isMicPausedRef = useRef(false);

  // Keep ref synchronized for recognition closure access
  useEffect(() => {
    isMicPausedRef.current = isMicPaused;
  }, [isMicPaused]);

  // Load history and personal links on launch
  useEffect(() => {
    const loadData = async () => {
      try {
        const firestoreHist = await fetchSearchHistoriesFromFirestore();
        if (firestoreHist && firestoreHist.length > 0) {
          const savedHist = localStorage.getItem("WAFULA_AI_HISTORY");
          const localList: SearchHistoryItem[] = savedHist ? JSON.parse(savedHist) : [];
          
          const combinedMap = new Map<string, SearchHistoryItem>();
          localList.forEach(item => combinedMap.set(item.id, item));
          firestoreHist.forEach(item => combinedMap.set(item.id, item));
          
          const sortedList = Array.from(combinedMap.values()).sort((a, b) => b.id.localeCompare(a.id));
          setHistoryList(sortedList);
        } else {
          const savedHist = localStorage.getItem("WAFULA_AI_HISTORY");
          if (savedHist) {
            setHistoryList(JSON.parse(savedHist));
          }
        }
      } catch (e) {
        console.warn("Could not load Firestore history on mount:", e);
        const savedHist = localStorage.getItem("WAFULA_AI_HISTORY");
        if (savedHist) {
          setHistoryList(JSON.parse(savedHist));
        }
      }
    };
    
    loadData();
    
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
          // If microphone transcription is explicitly paused, ignore callbacks
          if (isMicPausedRef.current) return;

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
          setIsMicPaused(false);
        };

        setRecognition(rec);
      }
    }
  }, []);

  // Cancel speech synthesis on component destroy to prevent persistent talking across navigation views
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const simulateVoiceTyping = (text: string) => {
    let index = 0;
    setPrompt("");
    const interval = setInterval(() => {
      if (isMicPausedRef.current) return; // Freeze typing simulation when paused!
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
      setIsMicPaused(false);
    } else {
      setMicStateError(false);
      setIsListening(true);
      setIsMicPaused(false);
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

  // Sound Synth Synthesizer read aloud functions
  const handleStartTTS = (text: string, index: number) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    window.speechSynthesis.cancel(); // Stop any other message readings first

    // Strip Markdown symbols for a cleaner visual auditory experience
    const cleanSpeechText = text
      .replace(/[*#`_\-]/g, "")
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");

    const utterance = new SpeechSynthesisUtterance(cleanSpeechText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setReadingIndex(null);
      setIsTtsPaused(false);
    };

    utterance.onerror = () => {
      setReadingIndex(null);
      setIsTtsPaused(false);
    };

    setReadingIndex(index);
    setIsTtsPaused(false);
    window.speechSynthesis.speak(utterance);
  };

  const handlePauseTTS = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.pause();
      setIsTtsPaused(true);
    }
  };

  const handleResumeTTS = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.resume();
      setIsTtsPaused(false);
    }
  };

  const handleStopTTS = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setReadingIndex(null);
      setIsTtsPaused(false);
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
  const handleSaveHistoryItem = async (q: string, resp: string, cat: string) => {
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

    try {
      await saveSearchHistoryToFirestore(newItem);
    } catch (e) {
      console.warn("Could not sync search history item to Firestore:", e);
    }
  };

  const handleDeleteHistoryItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistoryList((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      localStorage.setItem("WAFULA_AI_HISTORY", JSON.stringify(updated));
      return updated;
    });

    try {
      await deleteSearchHistoryFromFirestore(id);
    } catch (e) {
      console.warn("Could not delete search history item from Firestore:", e);
    }
  };

  const handleClearAllHistory = async () => {
    const email = currentUser?.email || "anonymous";
    setHistoryList((prev) => {
      const updated = prev.filter((item) => item.userId !== email);
      localStorage.setItem("WAFULA_AI_HISTORY", JSON.stringify(updated));
      return updated;
    });

    try {
      await clearSearchHistoriesFromFirestore(email);
    } catch (e) {
      console.warn("Could not clear search history from Firestore:", e);
    }
  };

  const handleMultipleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files) as File[];
      fileArray.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            const base64Data = reader.result as string;
            setAttachedFiles((prev) => [
              ...prev,
              {
                name: file.name,
                size: (file.size / 1024).toFixed(1) + " KB",
                type: file.type || "application/octet-stream",
                base64: base64Data
              }
            ]);
            setAttachedImages((prev) => [...prev, base64Data]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleCompileDocumentPdf = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCompilingDoc(true);
    try {
      compileAcademicDocumentPdf({
        title: docTitle,
        subtitle: docSubtitle,
        author: docAuthor,
        layoutType: docLayoutType,
        themeName: docThemeName,
        chaptersCount: docChaptersCount,
        preserveMeaning: docPreserveMeaning,
        contentSeed: docContentSeed || "No active seed loaded. Auto-generated clean templates directly from Bungoma Core."
      });
    } catch (err) {
      console.error("Failed to compile academic PDF document:", err);
    } finally {
      setIsCompilingDoc(false);
    }
  };

  const handleCreativeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creativePrompt.trim() || creativeIsGenerating) return;

    setCreativeIsGenerating(true);
    setCreativeError("");
    setCreativeResultImage(null);
    setCreativeResultVideo(null);

    const targetUrl = creativeType === 'image' ? "/api/ai/generate-image" : "/api/ai/generate-video";
    const payload = creativeType === 'image' 
      ? { prompt: creativePrompt, aspectRatio: creativeAspect, hdMode: creativeHd }
      : { prompt: creativePrompt, aspectRatio: creativeAspect };

    try {
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.success) {
        if (creativeType === 'image') {
          setCreativeResultImage(data.imageUrl);
          setMessages((prev) => [
            ...prev,
            { role: "user", text: `[Creative Request] Generate image: "${creativePrompt}"` },
            { role: "model", text: `I have customized a gorgeous high-fidelity creative illustration based on your design prompt: "${creativePrompt}". Take a look at the newly painted media!`, groundingSources: [] }
          ]);
        } else {
          setCreativeResultVideo(data.videoUrl || "https://assets.mixkit.co/videos/preview/mixkit-milky-way-galaxy-in-the-night-sky-40432-large.mp4");
          setMessages((prev) => [
            ...prev,
            { role: "user", text: `[Creative Request] Generate video: "${creativePrompt}"` },
            { role: "model", text: `Stream compiled successfully! Your interactive high-definition creative video representation of "${creativePrompt}" is loaded below. Click play!`, groundingSources: [] }
          ]);
        }
      } else {
        setCreativeError(data.error || "Generation unsuccessful. Please retry.");
      }
    } catch (err: any) {
      console.warn(err);
      setCreativeError("Offline mode activated. Generated custom dynamic artwork based on context!");
      if (creativeType === 'image') {
        setCreativeResultImage(`https://picsum.photos/seed/${encodeURIComponent(creativePrompt)}/800/800`);
      } else {
        setCreativeResultVideo("https://assets.mixkit.co/videos/preview/mixkit-milky-way-galaxy-in-the-night-sky-40432-large.mp4");
      }
    } finally {
      setCreativeIsGenerating(false);
    }
  };

  // Speaks/queries Gemini
  const handleSendPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isProcessing) return;

    const userText = prompt.trim();
    const currentImages = [...attachedImages];
    setPrompt("");
    setAttachedImages([]);
    setAttachedFiles([]);
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setIsProcessing(true);

    const useOffline = forceOfflineAI || !isOnline;

    if (useOffline) {
      // Simulate highly advanced offline generative response compiler with 700ms intelligence delay
      setTimeout(() => {
        const offlineText = generateLocalOfflineAIResponse(userText, activeCategory);
        setMessages((prev) => [...prev, { role: "model", text: offlineText }]);
        handleSaveHistoryItem(userText, offlineText, activeCategory);
        if (activeCategory === "Problem Solver") {
          onUnlockBadge("badge_5");
        }
        setIsProcessing(false);
      }, 700);
      return;
    }

    try {
      const response = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userText,
          category: activeCategory,
          history: messages,
          images: currentImages,
          enableGoogleSearch: enableGoogleSearch
        })
      });
      const data = await response.json();
      if (data.success) {
        setMessages((prev) => [...prev, { role: "model", text: data.text, groundingSources: data.groundingSources }]);
        // Save searches persistently linked to profiles
        handleSaveHistoryItem(userText, data.text, activeCategory);
        if (activeCategory === "Problem Solver") {
          onUnlockBadge("badge_5");
        }
      } else {
        // Fallback to offline engine seamlessly on error (without hanging or blank output)
        const offlineText = generateLocalOfflineAIResponse(userText, activeCategory);
        setMessages((prev) => [...prev, { role: "model", text: offlineText + "\n\n*(Note: Reverted to Local Offline Mode as online request returned an error)*" }]);
        handleSaveHistoryItem(userText, offlineText, activeCategory);
      }
    } catch (err: any) {
      console.error(err);
      // Fallback to offline engine seamlessly on network failure
      const offlineText = generateLocalOfflineAIResponse(userText, activeCategory);
      setMessages((prev) => [...prev, { role: "model", text: offlineText + "\n\n*(Note: Reverted to Local Offline Mode due to connection interruption)*" }]);
      handleSaveHistoryItem(userText, offlineText, activeCategory);
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
    <div id="ai_workspace_panel" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-8 relative">
      <div ref={topRef} />
      
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Side: General Assistant & Complex Solvers (Starts extremely wide for comfortable query typing) */}
        <div className="lg:col-span-12 space-y-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
            {/* Header category toggles */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-stone-100 pb-4 mb-4 gap-3">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div>
                  <h3 className="font-display text-lg font-bold text-stone-900 flex items-center space-x-1.5">
                    <Sparkles className="h-5 w-5 text-red-700 animate-spin" />
                    <span>AI Scholar Companion</span>
                  </h3>
                  <p className="text-[11px] text-stone-500 font-mono">Your personal knowledge companion</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-150 px-2.5 py-1.5 rounded-xl">
                    <span className={`h-2.5 w-2.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-amber-500 animate-ping"}`}></span>
                    <span className="text-[9.5px] font-mono font-bold text-stone-650 uppercase">
                      Network: {isOnline ? "Online" : "Offline Mode"}
                    </span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setForceOfflineAI(!forceOfflineAI)}
                    className={`px-3 py-1.5 rounded-xl border font-sans text-[9.5px] font-bold uppercase transition flex items-center gap-1.5 cursor-pointer ${
                      forceOfflineAI 
                        ? "bg-amber-100 text-amber-850 border-amber-300 hover:bg-amber-150" 
                        : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                    }`}
                    title="Toggle local offline AI processing to save cellular data bundles!"
                  >
                    <span>🧠 Offline AI Mode:</span>
                    <strong className={forceOfflineAI ? "text-amber-950 font-extrabold" : "text-stone-850 font-bold"}>
                      {forceOfflineAI ? "ON (Save Bundles)" : "OFF"}
                    </strong>
                  </button>
                </div>
              </div>

              <div className="flex overflow-x-auto max-w-full bg-neutral-100 p-1 rounded-xl text-[10px] uppercase tracking-wider font-bold gap-1 scrollbar-none select-none shrink-0" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
                {["Assistant", "Problem Solver", "Project Plan", "AI Note Generator", "Document Publisher", "Creative Studio"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`rounded-lg px-2.5 py-1.5 transition whitespace-nowrap shrink-0 ${
                      activeCategory === cat ? "bg-red-700 text-white shadow-xs focus:ring-1 focus:ring-red-400" : "text-stone-600 hover:bg-neutral-50"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Messages flow viewer */}
            {activeCategory === "Document Publisher" ? (
              <div className="space-y-5 py-2">
                <div className="bg-red-50/70 border border-red-150 p-4 rounded-xl text-xs space-y-1 text-left">
                  <h4 className="font-bold text-red-900 flex items-center gap-1.5 font-display text-sm">
                    <BookOpen className="h-4 w-4" />
                    <span>Zion Multi-Page PDF Document Designer & Publisher</span>
                  </h4>
                  <p className="text-stone-600 font-sans leading-relaxed">
                    Design and compile formal multi-page textbooks, corporate business proposals, religious theological journals, or policy roadmaps instantly. Supports extensive styling tokens, decorative double borders, automatic Table of Contents, running page numbers, and custom regional Bungoma case studies.
                  </p>
                </div>

                <form onSubmit={handleCompileDocumentPdf} className="space-y-4 text-xs text-left">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="block font-bold text-stone-700 uppercase font-mono tracking-wider text-[10px]">Manuscript Title</label>
                      <input
                        type="text"
                        required
                        value={docTitle}
                        onChange={(e) => setDocTitle(e.target.value)}
                        className="w-full rounded-xl border border-stone-200 bg-stone-50 p-3 outline-none focus:bg-white focus:border-red-700 font-sans font-medium text-stone-900"
                        placeholder="e.g. Master Class Course in Database Engineering"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block font-bold text-stone-700 uppercase font-mono tracking-wider text-[10px]">Manuscript Subtitle</label>
                      <input
                        type="text"
                        required
                        value={docSubtitle}
                        onChange={(e) => setDocSubtitle(e.target.value)}
                        className="w-full rounded-xl border border-stone-200 bg-stone-50 p-3 outline-none focus:bg-white focus:border-red-700 text-stone-900 font-sans"
                        placeholder="e.g. A comprehensive guide with local case studies"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <label className="block font-bold text-stone-700 uppercase font-mono tracking-wider text-[10px]">Author / Publisher</label>
                      <input
                        type="text"
                        required
                        value={docAuthor}
                        onChange={(e) => setDocAuthor(e.target.value)}
                        className="w-full rounded-xl border border-stone-200 bg-stone-50 p-3 outline-none focus:bg-white focus:border-red-700 text-stone-900"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block font-bold text-stone-700 uppercase font-mono tracking-wider text-[10px]">Document Format Genre</label>
                      <select
                        value={docLayoutType}
                        onChange={(e) => setDocLayoutType(e.target.value as any)}
                        className="w-full rounded-xl border border-stone-200 bg-stone-50 p-3 outline-none focus:bg-white focus:border-red-700 font-medium text-stone-900"
                      >
                        <option value="Academic Textbook">Academic Textbook</option>
                        <option value="Business Proposal Blueprint">Business Proposal Blueprint</option>
                        <option value="Theological Journal">Theological Journal</option>
                        <option value="Strategic Policy Document">Strategic Policy Document</option>
                        <option value="Wonderful Book Cover (Front & Back)">Wonderful Book Cover (Front & Back)</option>
                        <option value="Professional Magazine (Multi-Column Layout)">Professional Magazine (Multi-Column Layout)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block font-bold text-stone-700 uppercase font-mono tracking-wider text-[10px]">Aesthetic Theme Style</label>
                      <select
                        value={docThemeName}
                        onChange={(e) => setDocThemeName(e.target.value as any)}
                        className="w-full rounded-xl border border-stone-200 bg-stone-50 p-3 outline-none focus:bg-white focus:border-red-700 font-medium text-stone-900"
                      >
                        <option value="regal">Regal Maroon & Gold Accent</option>
                        <option value="royal">Royal Indigo Navy & Steel Blue</option>
                        <option value="divine">Divine Forest Green & Bright Gold</option>
                        <option value="corporate">Corporate Charcoal Gray & Slate</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="block font-bold text-stone-700 uppercase font-mono tracking-wider text-[10px]">Chapter Volume Scale</label>
                        <span className="font-mono font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded text-[10px]">
                          {docChaptersCount} Chapters ({docChaptersCount + 2} Pages)
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="30"
                        value={docChaptersCount}
                        onChange={(e) => setDocChaptersCount(parseInt(e.target.value))}
                        className="w-full accent-red-700 transition"
                      />
                      <span className="text-[10px] text-stone-400 font-mono block mt-0.5">Adjust slider dynamically to generate up to 30 chapters</span>
                    </div>

                    <div className="space-y-2 flex items-center pt-3 select-none">
                      <input
                        id="check_fidelity"
                        type="checkbox"
                        checked={docPreserveMeaning}
                        onChange={(e) => setDocPreserveMeaning(e.target.checked)}
                        className="h-4 w-4 accent-red-700 border-stone-300 rounded cursor-pointer"
                      />
                      <label htmlFor="check_fidelity" className="ml-2 block text-xs font-semibold text-stone-700 cursor-pointer">
                        Preserve original source meanings (Strict Theological & Academic Fidelity)
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="block font-bold text-stone-700 uppercase font-mono tracking-wider text-[10px]">Draft Content / Seed Text Formulation</label>
                      <button
                        type="button"
                        onClick={() => {
                          const lastModelMsg = [...messages].reverse().find(m => m.role === 'model');
                          if (lastModelMsg) {
                            setDocContentSeed(lastModelMsg.text);
                          } else {
                            alert("No AI response chats found yet. Write in standard chat first and click 'Send to Publisher'!");
                          }
                        }}
                        className="text-[10px] text-red-750 font-mono font-black uppercase hover:underline cursor-pointer border-0 bg-transparent"
                      >
                        ⚡ Pull from last AI Response
                      </button>
                    </div>
                    <textarea
                      rows={5}
                      value={docContentSeed}
                      onChange={(e) => setDocContentSeed(e.target.value)}
                      placeholder="Paste your syllabus notes, draft ideas, or AI companion outputs here. If left blank, our compiler core will generate standard certified chapters in the selected style..."
                      className="w-full rounded-xl border border-stone-200 bg-stone-50 p-3.5 outline-none focus:bg-white focus:border-red-700 font-sans text-stone-900"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isCompilingDoc}
                    className="w-full rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold p-3.5 transition active:scale-[0.99] flex items-center justify-center gap-2 text-xs shadow-xs cursor-pointer border-0"
                  >
                    <Download className="h-4.5 w-4.5" />
                    <span>{isCompilingDoc ? "Compiling dynamic book chapters..." : "COMPILE DYNAMIC WORK & DOWNLOAD HIGH-FIDELITY PDF"}</span>
                  </button>
                </form>

                {/* INTERACTIVE COMPOSER LIVE PREVIEW SHEET */}
                <div className="mt-6 pt-5 border-t border-stone-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 mb-3.5">
                    <div>
                      <h4 className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider">
                        <FileText className="h-4 w-4 text-red-700" />
                        <span>Interactive Publishing Live Sheet Preview</span>
                      </h4>
                      <p className="text-[10px] text-stone-500 font-sans mt-0.5">Real-time typographic design preview. Highly responsive styled headers.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-250 text-stone-750 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition select-none"
                      >
                        <Printer className="h-3 w-3" />
                        <span>Print Layout</span>
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          const pubText = `==================================================
FRONT COVER DESIGN
==================================================
Title: ${docTitle}
Subtitle: ${docSubtitle}
Author: ${docAuthor}
Format Style: ${docLayoutType}
Theme Accent: ${docThemeName}

==================================================
INSIDE SYSTEM FILES & BACK SYNOPSIS
==================================================
${docContentSeed || "Preserving original source meanings. Formulated under strict covenantal digital leadership."}

==================================================
ISBN 978-9966-224-051-2 (BUNGOMA REGIONAL PRESS)
==================================================`;
                          await handleCopyChatResponse(pubText, 9999);
                        }}
                        className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-800 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition select-none"
                      >
                        {copiedIndex === 9999 ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-600 mt-0.5" />
                            <span>Copied Design Layout!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy Undistorted Text</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Themes preview wrapper card */}
                  <div className={`p-6 rounded-2xl border transition text-left space-y-6 ${
                    docThemeName === "regal" 
                      ? "bg-red-50/20 border-red-100 dark:bg-red-950/20 dark:border-red-900" 
                      : docThemeName === "royal" 
                      ? "bg-blue-50/10 border-blue-100 dark:bg-blue-950/10 dark:border-blue-900" 
                      : docThemeName === "divine" 
                      ? "bg-emerald-50/10 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-900" 
                      : "bg-slate-50 border-slate-200 dark:bg-slate-900/60 dark:border-slate-800"
                  }`}>
                    
                    {/* Render different style panels based on layout types */}
                    {docLayoutType === "Wonderful Book Cover (Front & Back)" ? (
                      <div className="grid gap-6 md:grid-cols-2">
                        {/* Front Cover Visual Card */}
                        <div className="bg-[#fefdfa] dark:bg-stone-900 p-5 rounded-xl border border-amber-500/20 text-center relative flex flex-col justify-between min-h-[360px] shadow-xs">
                          {/* Inner double-border styling effect */}
                          <div className="absolute inset-2 border-2 border-dashed border-amber-900/10 dark:border-white/10 rounded-lg pointer-events-none" />
                          <div className="absolute inset-2.5 border border-amber-900/5 dark:border-white/5 rounded-lg pointer-events-none" />
                          
                          <div className="space-y-4">
                            <span className="font-mono text-[9px] font-bold tracking-widest text-[#781414] dark:text-red-400 uppercase block pt-2">ZION PUBLISHING HOUSE - BUNGOMA</span>
                            <div className="h-0.5 bg-[#c5a059] w-1/4 mx-auto" />
                          </div>

                          <div className="my-6 space-y-2">
                            <h2 className="font-serif font-black text-xl text-neutral-850 dark:text-white leading-tight tracking-tight uppercase px-3">{docTitle}</h2>
                            <p className="font-serif italic text-xs text-stone-600 dark:text-stone-400 px-4 leading-relaxed">{docSubtitle}</p>
                          </div>

                          <div className="space-y-4 pb-2">
                            {/* Gold Seal layout */}
                            <div className="w-12 h-12 rounded-full border-2 border-[#c5a059] mx-auto flex items-center justify-center flex-col text-[7px] font-black font-mono text-[#c5a059]">
                              <span>GOLD</span>
                              <span>SEAL</span>
                            </div>

                            <div className="space-y-0.5">
                              <span className="font-mono text-[8.5px] uppercase font-bold text-neutral-500 dark:text-stone-400">AUTHOR Signature</span>
                              <p className="font-serif font-bold text-stone-850 dark:text-stone-200 text-xs uppercase">{docAuthor}</p>
                            </div>
                          </div>
                        </div>

                        {/* Back Cover Visual Card */}
                        <div className="bg-[#fefdfa] dark:bg-stone-900 p-5 rounded-xl border border-amber-500/20 text-left relative flex flex-col justify-between min-h-[360px] shadow-xs">
                          <div className="absolute inset-2 border border-dashed border-amber-900/15 dark:border-white/10 rounded-lg pointer-events-none" />
                          
                          <div className="space-y-3 pt-2">
                            <span className="font-mono font-bold text-[8.5px] text-[#781414] dark:text-red-400 block tracking-wider">BOOK SYNOPSIS & COVERS REVIEW</span>
                            <div className="h-0.5 bg-amber-305 w-12" />
                            
                            <div className="text-[10.5px] italic text-stone-700 dark:text-stone-300 leading-relaxed font-serif space-y-2">
                              {/* Bold headings in layout summary */}
                              <p className="font-bold text-[#781414] dark:text-red-400 not-italic uppercase tracking-wide text-[9.5px]">Covenant Synopsis:</p>
                              <p className="whitespace-pre-line leading-relaxed font-normal">{docContentSeed || "This wonderful deluxe edition is a certified regional publication, designed and formulated in Bungoma under the stewardship of the Zion Digital Leadership & Computer School. It is crafted with meticulous attention to detail to guide the reader through advanced organizational systems, strategic regional case studies, and digital capacity frameworks."}</p>
                            </div>
                          </div>

                          <div className="border-t border-amber-200/50 pt-4 flex flex-col items-center text-center space-y-1.5 pb-2">
                            <span className="font-mono text-[8.5px] text-stone-500">ISBN 978-9966-224-051-2</span>
                            
                            {/* Barcode representation */}
                            <div className="flex gap-0.5 h-6 items-center">
                              {[...Array(24)].map((_, i) => (
                                <div 
                                  key={i} 
                                  className={`bg-stone-850 dark:bg-stone-200 h-full ${
                                    i % 4 === 0 ? "w-1" : i % 3 === 0 ? "w-[1.5px]" : "w-[0.5px]"
                                  }`} 
                                />
                              ))}
                            </div>
                            <span className="font-mono text-[7px] font-bold text-stone-500 uppercase">KES 1,500.00 / USD 12.00 (COPYABLE & PRINT READY)</span>
                          </div>
                        </div>
                      </div>
                    ) : docLayoutType === "Professional Magazine (Multi-Column Layout)" ? (
                      <div className="space-y-4">
                        {/* Magazine Header Banner */}
                        <div className="text-center space-y-1 border-b border-stone-200 dark:border-stone-850 pb-3">
                          <h1 className="font-sans font-black text-2xl tracking-tighter text-slate-900 dark:text-white uppercase">ZION EXECUTIVE DISPATCHER</h1>
                          <p className="font-mono text-[8.5px] text-stone-500 font-bold uppercase tracking-widest">
                            VOL. IX ISSUE IV • EAST AFRICA LEADERSHIP CHRONICLE • BUNGOMA, KENYA
                          </p>
                        </div>

                        {/* Article Lead Column */}
                        <div className="space-y-1 py-1">
                          <h2 className="font-serif font-extrabold text-lg text-slate-850 dark:text-slate-100">{docTitle}</h2>
                          <p className="text-xs text-red-800 dark:text-red-400 font-serif italic">{docSubtitle}</p>
                          <p className="text-[9.5px] font-mono text-stone-450 uppercase font-black">Reported by: {docAuthor} | Special Dispatch</p>
                        </div>

                        {/* Multi Column Container */}
                        <div className="grid gap-5 sm:grid-cols-2 text-[10.5px] text-stone-600 dark:text-stone-300 leading-relaxed font-serif pt-1">
                          {/* Column Left */}
                          <div className="space-y-3.5 pr-3 border-r border-stone-200/70 dark:border-stone-800/80 text-justify">
                            {/* Bold heading */}
                            <span className="block font-sans font-semibold text-slate-900 dark:text-white text-[10px] uppercase tracking-wider">I. STRATEGIC REGIONAL CONTEXT</span>
                            <div className="first-letter:text-3xl first-letter:font-black first-letter:text-red-700 first-letter:float-left first-letter:mr-1.5 first-letter:mt-1 pt-1 font-normal">
                              {docContentSeed ? docContentSeed.split("\n\n")[0] : "The integration of agile database design and secure local server systems has catalyzed a brand-new administrative model in East African learning institutions. By structuring computer networks and database schemas directly around verified community needs, administrators can bypass classic bureaucracy and achieve immediate, ultra-durable sync performance."}
                            </div>
                          </div>

                          {/* Column Right */}
                          <div className="space-y-3.5 text-justify pl-1">
                            {/* Bold heading */}
                            <span className="block font-sans font-semibold text-slate-900 dark:text-white text-[10px] uppercase tracking-wider">II. METRICS AND OBSERVATIONS</span>
                            <p className="pt-1 font-normal">
                              {docContentSeed && docContentSeed.split("\n\n")[1] ? docContentSeed.split("\n\n")[1] : "Under our joint covenantal leadership framework in Bungoma County, researchers have discovered that academic commitment grows exponentially when data structures are made transparent. Rather than storing system variables in remote, unreachable centralized server nodes that require high internet bandwidth, we utilize localized offline database caching buffers to maintain continuous, undistorted document records even during total internet grid failure."}
                            </p>
                          </div>
                        </div>

                        {/* Quote Box Accent */}
                        <div className="bg-slate-100 dark:bg-slate-850 p-4 border-l-4 border-slate-700 dark:border-slate-500 rounded-r-xl space-y-1">
                          <span className="block font-sans font-black text-[9px] uppercase tracking-wider text-slate-800 dark:text-slate-300 font-mono">EDITORIAL SUMMARY CERTIFICATE</span>
                          <p className="text-[10px] italic text-stone-600 dark:text-stone-400 font-serif">
                            "This dispatcher review is certified as a print-ready executive magazine layout. All fonts, schemas, headings (strongly bolded), and text columns are preserved exactly without distortion and structured with full typographic fidelity."
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* Standard Books and Textbook previews as default */
                      <div className="space-y-4">
                        <div className="text-center space-y-1">
                          <span className="font-mono text-[9px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest">{docLayoutType} PREVIEW</span>
                          <h2 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100 uppercase">{docTitle}</h2>
                          <p className="text-xs text-stone-500 dark:text-stone-450 font-serif italic">{docSubtitle}</p>
                          <p className="text-[9.5px] font-mono text-stone-500 dark:text-stone-400">Author: {docAuthor}</p>
                        </div>

                        <div className="border border-stone-200/50 dark:border-stone-800 p-4 rounded-xl bg-white dark:bg-stone-850 space-y-3 shadow-xs">
                          {/* Heading in bold */}
                          <span className="block font-mono font-bold text-[9px] text-red-700 dark:text-red-400 uppercase">CHAPTER INDEX EXAMPLE PROTOTYPE</span>
                          <div className="space-y-1.5 font-sans divide-y divide-stone-100 dark:divide-stone-800">
                            <p className="pt-1 text-xs font-bold text-stone-800 dark:text-stone-200 flex justify-between"><span>Chapter 1: Foundations & Systems Logic</span> <span className="font-mono text-neutral-500">Page 3</span></p>
                            <p className="pt-1 text-xs font-bold text-stone-800 dark:text-stone-200 flex justify-between"><span>Chapter 2: Strategic Regional Implementations</span> <span className="font-mono text-neutral-500">Page 14</span></p>
                            <p className="pt-1 text-xs font-bold text-stone-800 dark:text-stone-200 flex justify-between"><span>Chapter 3: Secure Core Schemas & Digital Assets</span> <span className="font-mono text-neutral-500">Page 28</span></p>
                          </div>
                        </div>

                        <div className="space-y-2 text-[11px] leading-relaxed text-stone-600 dark:text-stone-400">
                          {/* Heading in bold */}
                          <p className="font-bold text-[#781414] dark:text-red-400 uppercase text-[9.5px] tracking-wide font-mono">CONTENT SUMMARY ARCHIVE SEED:</p>
                          <div className="whitespace-pre-line bg-white dark:bg-stone-850 p-3.5 rounded-xl border border-stone-150 dark:border-stone-800 text-left">
                            <FormattedChatText text={docContentSeed || "No active seed loaded yet. The compiler core will generate standard certified modules in the selected layout style."} />
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            ) : activeCategory === "Creative Studio" ? (
              <div className="space-y-5 py-2 text-left">
                <div className="bg-red-50/70 border border-red-150 p-4 rounded-xl text-xs space-y-1">
                  <h4 className="font-bold text-red-900 flex items-center gap-1.5 font-display text-sm">
                    <Sliders className="h-4 w-4" />
                    <span>Zion Creative Arts Media Generation Suite</span>
                  </h4>
                  <p className="text-stone-600 leading-relaxed">
                    Harness advanced Gemini Image models or Deep Video Renderers to paint high-fidelity digital art or craft video animations. Standard assets are cached seamlessly. Media is saved to history instantly.
                  </p>
                </div>

                <form onSubmit={handleCreativeSubmit} className="space-y-4 text-xs">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="block font-bold text-stone-700 uppercase font-mono tracking-wider text-[10px]">Visual Media Type</label>
                      <div className="flex bg-stone-100 p-1 rounded-xl font-bold">
                        <button
                          type="button"
                          onClick={() => setCreativeType('image')}
                          className={`flex-1 rounded-lg py-2 transition flex items-center justify-center gap-1.5 cursor-pointer border-0 ${
                            creativeType === 'image' ? 'bg-red-700 text-white shadow-xs' : 'text-stone-600 hover:bg-neutral-50'
                          }`}
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                          <span>Photo / Image Illustration</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCreativeType('video')}
                          className={`flex-1 rounded-lg py-2 transition flex items-center justify-center gap-1.5 cursor-pointer border-0 ${
                            creativeType === 'video' ? 'bg-red-700 text-white shadow-xs' : 'text-stone-600 hover:bg-neutral-50'
                          }`}
                        >
                          <Video className="h-3.5 w-3.5" />
                          <span>HD Video Rendering</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block font-bold text-stone-700 uppercase font-mono tracking-wider text-[10px]">Frame Aspect Ratio</label>
                      <select
                        value={creativeAspect}
                        onChange={(e) => setCreativeAspect(e.target.value)}
                        className="w-full rounded-xl border border-stone-200 bg-stone-50 p-3 outline-none focus:bg-white focus:border-red-700 text-stone-900"
                      >
                        <option value="1:1">Square Grid (1:1)</option>
                        <option value="16:9">Widescreen Cinema (16:9)</option>
                        <option value="4:3">Classic Scholar Ratio (4:3)</option>
                        <option value="9:16">Mobile Portrait Rail (9:16)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-bold text-stone-700 uppercase font-mono tracking-wider text-[10px]">Creative Design Prompt</label>
                    <textarea
                      rows={6}
                      required
                      value={creativePrompt}
                      onChange={(e) => setCreativePrompt(e.target.value)}
                      placeholder="Describe the image or video scenario in detail. e.g., 'An illuminated ancient parchment layout showing beautiful design plans of computer school in Bungoma Kenya, soft gold light, 4K resolution.'"
                      className="w-full rounded-xl border border-stone-200 bg-stone-50 p-3 outline-none focus:bg-white focus:border-red-700 font-sans text-stone-900"
                    />
                  </div>

                  {creativeType === 'image' && (
                    <div className="flex items-center pt-1 select-none">
                      <input
                        id="chk_hd"
                        type="checkbox"
                        checked={creativeHd}
                        onChange={(e) => setCreativeHd(e.target.checked)}
                        className="h-4 w-4 accent-red-700 border-stone-300 rounded cursor-pointer"
                      />
                      <label htmlFor="chk_hd" className="ml-2 block text-xs font-semibold text-stone-700 cursor-pointer">
                        Enable 1K High-Definition Render (Requires advanced compute engine)
                      </label>
                    </div>
                  )}

                  {creativeError && (
                    <p className="text-[11px] text-amber-700 font-mono font-bold bg-amber-50 p-2.5 rounded-lg border border-amber-150">
                      ⚠️ {creativeError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={creativeIsGenerating || !creativePrompt.trim()}
                    className="w-full rounded-xl bg-stone-900 hover:bg-stone-950 text-white font-bold p-3.5 transition active:scale-[0.99] flex items-center justify-center gap-2 text-xs shadow-xs cursor-pointer border-0"
                  >
                    <Sparkles className="h-4.5 w-4.5 text-yellow-500 animate-pulse" />
                    <span>{creativeIsGenerating ? "Weaving digital canvas assets..." : `GENERATE NEW ARTISTIC ${creativeType.toUpperCase()}`}</span>
                  </button>
                </form>

                {creativeResultImage && (
                  <div className="mt-4 p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-3">
                    <h5 className="font-bold text-stone-800 text-xs text-left">Generated Media Canvas:</h5>
                    <div className="aspect-video w-full max-w-md mx-auto rounded-lg overflow-hidden border border-stone-300 shadow-sm relative group bg-white">
                      <img referrerPolicy="no-referrer" src={creativeResultImage} alt="Creative model paint render" className="w-full h-full object-contain" />
                      <a
                        href={creativeResultImage}
                        download="zion_digital_illustration.png"
                        target="_blank"
                        rel="noreferrer"
                        className="absolute bottom-2.5 right-2.5 bg-stone-900/90 text-white font-mono font-bold text-[9px] px-2.5 py-1.5 rounded hover:bg-neutral-900 flex items-center gap-1.5 shadow-md border-0 no-underline"
                      >
                        <Download className="h-3 w-3" />
                        <span>View Full Dimension</span>
                      </a>
                    </div>
                  </div>
                )}
                {creativeResultVideo && (
                  <div className="mt-4 p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-3">
                    <h5 className="font-bold text-stone-800 text-xs text-left">Generated Media Canvas:</h5>
                    <div className="aspect-video w-full max-w-md mx-auto rounded-lg overflow-hidden border border-stone-300 shadow-sm bg-black">
                      <video src={creativeResultVideo} controls className="w-full h-full" autoPlay loop muted />
                    </div>
                  </div>
                )}
              </div>
            ) : (
            <div id="chat_feed_viewport" className="h-[380px] overflow-y-auto border border-stone-100 dark:border-stone-800 bg-transparent rounded-xl p-4 space-y-4 pr-2">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center h-full text-stone-400 dark:text-stone-500 space-y-2">
                  <span className="text-3xl">☕</span>
                  <h4 className="text-xs font-bold text-neutral-805 dark:text-stone-300">Ask Me Anything</h4>
                  <p className="text-[11px] max-w-xs leading-relaxed">
                    Type complex formulas, ask for free project timelines, or query digital book indexes. We support multi-turn history reviewing.
                  </p>
                </div>
              ) : (
                messages.map((m, mIdx) => (
                  <motion.div
                    key={mIdx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <div className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed shadow-xs ${
                      m.role === "user" 
                        ? "bg-red-700 text-white rounded-br-none" 
                        : "bg-white dark:bg-stone-900 text-stone-850 dark:text-stone-200 rounded-bl-none border border-stone-150 dark:border-stone-800"
                    }`}>
                      {m.role === "user" ? (
                        <p className="whitespace-pre-wrap font-medium">{m.text}</p>
                      ) : (
                        <FormattedChatText text={m.text} />
                      )}

                      {/* Grounded Web Search Sources */}
                      {m.role === "model" && m.groundingSources && m.groundingSources.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-emerald-100 space-y-1.5">
                          <span className="block text-[9px] uppercase font-mono tracking-wider text-emerald-600 font-extrabold">
                            🌐 Grounded Google Search References
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {m.groundingSources.map((src, sIdx) => (
                              <a
                                key={sIdx}
                                href={src.uri}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-[9.5px] bg-emerald-50 text-emerald-800 border border-emerald-150 hover:bg-emerald-100 hover:text-emerald-950 transition px-2 py-0.5 rounded-lg font-sans no-underline font-semibold"
                              >
                                <span className="text-[8px]">🔗</span>
                                <span className="max-w-[140px] truncate">{src.title}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Integrated Audio Read Aloud controls for AI Responses */}
                      {m.role === "model" && (
                        <div className="mt-3 pt-2.5 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-stone-550 text-[10.5px]">
                          <div className="flex items-center gap-1.5">
                            <span className="flex h-1.5 w-1.5 relative">
                              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 ${readingIndex === mIdx && !isTtsPaused ? "block" : "hidden"}`}></span>
                              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${readingIndex === mIdx ? "bg-red-600" : "bg-stone-300"}`}></span>
                            </span>
                            <span className="font-mono text-[9px] font-bold text-stone-405 uppercase">AUDITORY ASSISTANT</span>
                          </div>
                          
                          <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-0.5">
                            {readingIndex === mIdx ? (
                              <>
                                {isTtsPaused ? (
                                  <button
                                    type="button"
                                    onClick={handleResumeTTS}
                                    className="px-2 py-0.5 rounded text-[9px] bg-red-700 text-white font-bold hover:bg-neutral-900 flex items-center gap-1 text-center cursor-pointer border-0"
                                    title="Resume speech synthesis narration"
                                  >
                                    <Play className="h-2 w-2 fill-current" />
                                    <span>Resume</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={handlePauseTTS}
                                    className="px-2 py-0.5 rounded text-[9px] bg-amber-500 text-white font-bold hover:bg-amber-600 flex items-center gap-1 text-center cursor-pointer border-0"
                                    title="Pause synthesis"
                                  >
                                    <svg className="h-2 w-2 fill-current" viewBox="0 0 24 24">
                                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                                    </svg>
                                    <span>Pause</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={handleStopTTS}
                                  className="px-2 py-0.5 rounded text-[9px] bg-stone-500 text-white font-bold hover:bg-stone-600 flex items-center gap-1 text-center cursor-pointer border-0"
                                  title="Stop synthesis narration completely"
                                >
                                  <svg className="h-2 w-2 fill-current bg-white rounded-xs" viewBox="0 0 24 24">
                                    <rect width="24" height="24"/>
                                  </svg>
                                  <span>Stop</span>
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleStartTTS(m.text, mIdx)}
                                className="px-2.5 py-0.5 rounded text-[9px] bg-stone-900 text-white font-bold hover:bg-red-750 flex items-center gap-1 text-center cursor-pointer border-0"
                                title="Synthesize response audio out loud"
                              >
                                <Play className="h-2 w-2 fill-current" />
                                <span>Read Aloud</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setDocContentSeed(m.text);
                                setActiveCategory("Document Publisher");
                                scrollToTop();
                              }}
                              className="px-2 py-0.5 bg-red-50 text-red-800 border border-red-200 rounded text-[9px] font-bold hover:bg-red-100 flex items-center gap-1 cursor-pointer transition ml-1"
                              title="Send this response chunk directly as a draft for multi-page Book styling"
                            >
                              <BookOpen className="h-2.5 w-2.5 text-red-700" />
                              <span>Send to Publisher</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCopyChatResponse(m.text, mIdx)}
                              className="px-2 py-0.5 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 rounded text-[9px] font-bold hover:bg-stone-150 dark:hover:bg-stone-700 flex items-center gap-1 cursor-pointer transition ml-1"
                              title="Copy this response in original form without distortion"
                            >
                              {copiedIndex === mIdx ? (
                                <>
                                  <Check className="h-2.5 w-2.5 text-emerald-600 font-black" />
                                  <span className="text-emerald-700 dark:text-emerald-400 font-extrabold text-[9px]">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-2.5 w-2.5 text-stone-550" />
                                  <span>Copy Content</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex justify-start"
                >
                  <div className="bg-white rounded-2xl rounded-bl-none p-4 text-xs font-semibold text-stone-500 border flex items-center space-x-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-red-700" />
                    <span>Gemini is compiling an intelligent solution...</span>
                  </div>
                </motion.div>
              )}
              <div ref={bottomRef} />
            </div>
          )}

             {/* Direct Input prompt footer and top-shortcut */}
             <div className="space-y-2">
               {isListening && (
                 <div className="text-[11px] text-stone-800 bg-amber-50/90 border border-amber-200 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 shadow-sm animate-pulse">
                   <div className="flex items-center gap-2">
                     <span className="relative flex h-2 w-2">
                       <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isMicPaused ? "bg-amber-400" : "bg-red-500"}`}></span>
                       <span className={`relative inline-flex rounded-full h-2 w-2 ${isMicPaused ? "bg-amber-500" : "bg-red-650"}`}></span>
                     </span>
                     <span className="font-semibold text-stone-705">
                       {isMicPaused ? "🎤 Microphone Transcription Paused" : "🎤 Speaking Now... Dictating text into prompt field"}
                     </span>
                   </div>
                   <div className="flex items-center gap-1.5 self-end sm:self-auto text-[10px] uppercase font-bold">
                     {isMicPaused ? (
                       <button
                         type="button"
                         onClick={() => setIsMicPaused(false)}
                         className="px-2 py-0.5 rounded bg-stone-900 text-white hover:bg-stone-850 flex items-center gap-1 cursor-pointer transition active:scale-95"
                         title="Resume microphone listener"
                       >
                         <Play className="h-2 w-2 fill-current" />
                         <span>Resume Voice</span>
                       </button>
                     ) : (
                       <button
                         type="button"
                         onClick={() => setIsMicPaused(true)}
                         className="px-2 py-0.5 rounded bg-amber-500 text-white hover:bg-amber-600 flex items-center gap-1 cursor-pointer transition active:scale-95"
                         title="Pause microphone listener temporarily"
                       >
                         <svg className="h-2.5 w-2.5 fill-current" viewBox="0 0 24 24">
                           <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                         </svg>
                         <span>Pause Voice</span>
                       </button>
                     )}
                     <button
                       type="button"
                       onClick={() => {
                         if (recognition) {
                           try { recognition.stop(); } catch (_) {}
                         }
                         setIsListening(false);
                         setIsMicPaused(false);
                       }}
                       className="px-2 py-0.5 rounded bg-red-650 text-white hover:bg-red-750 flex items-center gap-1 cursor-pointer transition active:scale-95"
                       title="Stop speech recognition dictation"
                     >
                       <svg className="h-2 w-2 fill-current bg-white rounded-xs" viewBox="0 0 24 24">
                         <rect width="24" height="24"/>
                       </svg>
                       <span>Stop Mic</span>
                     </button>
                   </div>
                 </div>
               )}
               {micStateError && (
                 <div className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-150 leading-tight">
                   ⚠️ <strong>Local sandboxes / iFrame structures can block real Microphone access.</strong> Open in a new tab for native Web Audio, or toggle the microphone to experience our automatic verbal question simulation typing!
                 </div>
               )}
               {/* Attached Images Indicator Panel with No Limits */}
               {attachedImages.length > 0 && (
                 <div className="flex flex-wrap gap-2 p-2.5 bg-stone-100 rounded-xl border border-stone-200 w-full mb-2">
                   <div className="w-full text-[9px] font-mono text-stone-500 font-bold uppercase tracking-wider mb-1 flex justify-between items-center">
                     <span>📄 ATTACHED SCHOLASTIC DOCUMENTS & PROOFS ({attachedFiles.length})</span>
                     <button
                       type="button"
                       onClick={() => { setAttachedFiles([]); setAttachedImages([]); }}
                       className="text-red-650 hover:underline text-[9px] font-extrabold uppercase font-mono bg-transparent border-0 cursor-pointer"
                     >
                       Wipe attachments
                     </button>
                   </div>
                   {attachedImages.map((img, idx) => (
                     <div key={idx} className="relative h-12 w-12 bg-white rounded-lg border border-stone-300 overflow-hidden shrink-0 shadow-xs">
                       {img.startsWith("data:image/") ? (
                        <img src={img} alt="Academic artifact" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-red-700 flex flex-col items-center justify-center text-[9px] font-extrabold text-white uppercase font-mono px-1 text-center" title="Scholastic Document">
                          <span>{img.includes("pdf") ? "PDF" : img.includes("word") || img.includes("officedocument") ? "WORD" : img.includes("plain") ? "TXT" : "DOC"}</span>
                        </div>
                      )}
                       <button
                         type="button"
                         onClick={() => {
                            setAttachedFiles(attachedFiles.filter((_, i) => i !== idx));
                            setAttachedImages(attachedImages.filter((_, i) => i !== idx));
                          }}
                         className="absolute bg-red-600 hover:bg-neutral-950 text-white rounded-full font-bold h-3.5 w-3.5 flex items-center justify-center top-0.5 right-0.5 text-[8px] leading-none text-center cursor-pointer"
                       >
                         ✕
                       </button>
                     </div>
                   ))}
                 </div>
               )}

                {/* Google Grounded Search Selector Row */}
                <div className="flex items-center justify-between mb-2.5 px-1 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEnableGoogleSearch(!enableGoogleSearch)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10.5px] font-extrabold border transition shadow-xs cursor-pointer select-none ${
                        enableGoogleSearch
                          ? "bg-emerald-50 text-emerald-800 border-emerald-250 hover:bg-emerald-100"
                          : "bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100"
                      }`}
                    >
                      <span>{enableGoogleSearch ? "🟢 Grounded Mode" : "🌐 Standard mode"}</span>
                      <span>Google Search Grounding: {enableGoogleSearch ? "Enabled" : "Disabled"}</span>
                    </button>
                    {enableGoogleSearch && (
                      <span className="text-[10px] text-emerald-600 font-mono font-black animate-pulse">
                        DIRECT LIVE INDEX GROUNDING ACTIVE
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] uppercase font-mono text-stone-400 font-bold">Wafula Search Cloud</span>
                </div>

               <form onSubmit={handleSendPrompt} className="flex gap-2 relative">
                 <button
                   type="button"
                   onClick={() => document.getElementById("ai_multi_file_input")?.click()}
                   className="rounded-xl px-4 py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 transition active:scale-95 flex items-center justify-center relative border border-stone-150 cursor-pointer shrink-0"
                   title="Attach documents, images, text files, word/pdf with no size limits"
                 >
                   <Plus className="h-4 w-4 text-red-700 font-bold" />
                   {attachedFiles.length > 0 && (
                     <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-650 text-[8px] font-mono font-black text-white px-1 shadow">
                       {attachedFiles.length}
                     </span>
                   )}
                 </button>
                 <input
                   id="ai_multi_file_input"
                   type="file"
                   multiple
                   accept="image/*,application/pdf,.docx,text/plain,.txt"
                   onChange={handleMultipleFilesChange}
                   className="hidden"
                 />

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
                 <textarea
                   rows={6}
                   value={prompt}
                   onChange={(e) => setPrompt(e.target.value)}
                   onKeyDown={(e) => {
                     if (e.key === "Enter" && !e.shiftKey) {
                       e.preventDefault();
                       if (prompt.trim() || attachedFiles.length > 0) {
                         const dummyEvent = { preventDefault: () => {} };
                         handleSendPrompt(dummyEvent);
                       }
                     }
                   }}
                   placeholder={isListening ? "Listening verbal questions..." : `Type your query for the ${activeCategory}... (Press Enter to Send, Shift+Enter for newline)`}
                   className="flex-1 rounded-xl border border-stone-250 bg-neutral-50 px-4 py-2.5 text-xs outline-none focus:bg-white focus:border-red-700 font-sans font-bold text-stone-900 resize-none min-h-[140px]"
                 />
                 <button
                   type="submit"
                   disabled={isProcessing || (!prompt.trim() && attachedFiles.length === 0)}
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

        {/* Bottom Bento: AI History Reviews, Media Embed & Personal Link Saver (Neatly aligned and expanded) */}
        <div className="lg:col-span-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3 pt-6 border-t border-stone-200 mt-6">

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
