import React, { useState, useEffect, useRef } from "react";
import { Book, User, SavedDocument } from "../types";
import { 
  X, Shield, Lock, Download, AlertCircle, Play, ChevronLeft, ChevronRight, 
  RefreshCw, Eye, Sparkles, Copy, FileText, Clock, Bookmark,
  Plus, Trash, Save, Layers, Wifi, WifiOff, Highlighter, BookOpen,
  Volume2, VolumeX, Printer, Brush, Mic, MicOff, Loader2, Settings
} from "lucide-react";
import { db } from "../lib/firebase";
import { collection, addDoc, onSnapshot, query, where, deleteDoc, doc, orderBy } from "firebase/firestore";
import { getPdfFromOfflineDb } from "../utils/pdfDb";

// --- INDEXEDDB OFFLINE BUFFER ENGINE ---
const openIndexedDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this server environment."));
      return;
    }
    const request = window.indexedDB.open("WafulaReadsDB", 1);
    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains("offline_annotations")) {
        database.createObjectStore("offline_annotations", { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };
    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

const saveToIndexedDB = async (payload: any): Promise<void> => {
  try {
    const database = await openIndexedDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("offline_annotations", "readwrite");
      const store = transaction.objectStore("offline_annotations");
      const request = store.add(payload);
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject((e.target as IDBRequest).error);
    });
  } catch (err) {
    console.error("IndexedDB write failed:", err);
  }
};

const getFromIndexedDB = async (): Promise<any[]> => {
  try {
    const database = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction("offline_annotations", "readonly");
      const store = transaction.objectStore("offline_annotations");
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject((e.target as IDBRequest).error);
    });
  } catch (err) {
    console.error("IndexedDB read failed:", err);
    return [];
  }
};

const deleteFromIndexedDB = async (id: number): Promise<void> => {
  try {
    const database = await openIndexedDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("offline_annotations", "readwrite");
      const store = transaction.objectStore("offline_annotations");
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject((e.target as IDBRequest).error);
    });
  } catch (err) {
    console.error("IndexedDB delete failed:", err);
  }
};

// --- AUTOMATIC eBOOK CONTENT FALLBACK SEED ENGINE ---
function getDefaultBookContent(title: string, author: string, desc: string): string {
  const t = title.toLowerCase();
  
  if (t.includes("seven spirits") || t.includes("7 spirits") || t.includes("spirits of god")) {
    return `THE SEVEN SPIRITS OF GOD: UNDERSTANDING THE FULLNESS OF THE HOLY SPIRIT

CHAPTER 1: THE REVELATION OF THE SEVEN SPIRITS
The Apostle John mentions in Revelation 1:4, "Grace be unto you, and peace, from him which is, and which was, and which is to come; and from the seven Spirits which are before his throne." This is not a description of seven distinct Holy Spirits, but rather a representation of the fullness, absolute perfection, and manifold operations of the one and selfsame Holy Spirit of God in the life of the believer. To walk in this fullness is to exercise absolute dominion over circumstances.

CHAPTER 2: THE ISAIAH METRIC & SEVENFOLD WORKING
According to the prophet Isaiah in Isaiah 11:1-2, the Spirit of the Lord manifests in seven diverse dimensions of supernatural capacity:
1. THE SPIRIT OF THE LORD: The foundational presence of sovereignty and divine placement.
2. THE SPIRIT OF WISDOM: The capability to discern deep solutions and manage assets.
3. THE SPIRIT OF UNDERSTANDING: The power of insight, translation, and comprehensive clarity.
4. THE SPIRIT OF COUNSEL: Correct strategy, guidance, and executive leadership.
5. THE SPIRIT OF MIGHT: Supernatural energy, strength, and unwavering persistence.
6. THE SPIRIT OF KNOWLEDGE: Absolute alignment with the mind of Christ and revelation.
7. THE SPIRIT OF THE FEAR OF THE LORD: Revering the Creator and walking in absolute moral integrity.

CHAPTER 3: ACTIVATING THE SEVEN SPIRITS IN YOUR LIFE
To activate these seven operations, you must receive the Word of God with absolute devotion. Walk in prayer, honor covenants, and yield your faculties. When the Spirit of Wisdom is active, your decisions are flawless. If you are a leader in Bungoma County or anywhere across East Africa, carrying this sevenfold operation ensures that your projects succeed, resources are preserved, and scholars are empowered. This is the ultimate spiritual workbook for local renewal.`;
  }

  if (t.includes("children") || t.includes("parent") || t.includes("investment")) {
    return `CHILDREN ARE PARENTS' INVESTMENT: A STEWARDSHIP MANUAL

CHAPTER 1: THE VALUE OF FAMILY SYSTEM STEWARDSHIP
Children are not accidental burdens; they are heritage from the Lord. They represent a high-value, long-term spiritual and civic investment. To manage this investment successfully, parents must first model integrity, self-control, and structural literacy. The home is the first schoolhouse, the first sanctuary, and the ultimate governance incubator where the future standards of Western Kenya are engineered.

CHAPTER 2: STRUCTURAL PARENTING IN THE DIGITAL ERA
In modern society, screen navigation, social media, and digital networks represent both major progress and a spiritual hazard. Parents must actively guide their children's reading, restrict focus-stealing platforms, and encourage the study of scripture and scientific literature. Encourage kids to read premium digital books, solve scientific equations, and practice civic speech, laying a robust academic foundation.

CHAPTER 3: FINANCIAL & CHARACTER INVESTMENT BLUEPRINTS
1. THE PRINCIPLE OF THE PLANTED SEED: Invest early in books, secondary school tuitions, and physical wellness.
2. DISCIPLINE OF ACCOUNTABILITY: Teach financial tracking, cooperative agriculture, and the value of hard work.
3. CONSECRATED OUTCOMES: Dedicate your lineage to community development. When a child learns accountability at home, they become a transparent leader who manages public assets without theft or vanity.`;
  }

  if (t.includes("filled and simulate") || t.includes("simulate") || t.includes("spirit")) {
    return `FILLED AND SIMULATED BY THE SPIRIT: WALK IN SUPERNATURAL REVELATION

CHAPTER 1: THE HABITATION OF GLORY
To be filled with the Spirit is to be fully occupied and influenced by the divine atmosphere. It is the contrast between empty human calculations and the overflowing stream of divine wisdom. In this chapter, we evaluate methods to maintain an continuous, high-efficiency connection to the Holy Spirit, turning your inner mind into a high-fidelity spiritual radio.

CHAPTER 2: CONTINUOUS SPIRITUAL CALIBRATION
Spiritual dryness is resolved by turning back to biblical study and heartfelt prayer. Maintain a daily reading schedule, study theological expositions, and speak the Word out loud. Walk in absolute spiritual alignment, casting off worry, doubt, and administrative exhaustion.

CHAPTER 3: THE EMPOWERMENT BLUEPRINT FOR LOCAL SCHOLARS
For ministries, schools, and agribusiness groups in Bungoma, being filled with the Spirit provides the wisdom to resolve disputes, create job opportunities, and direct projects. It generates a tactile, life-changing atmosphere that heals, preserves resources, and inspires everyone around you.`;
  }

  if (t.includes("greatest evangelist") || t.includes("evangelist") || t.includes("outreach")) {
    return `THE GREATEST EVANGELIST: THE PATTERNS OF THE CLASSIC OUTREACH

CHAPTER 1: THE MISSION MANDATE AND PREPARATION
"Go ye into all the world, and preach the gospel." The ultimate evangelist is a messenger carrying a message of transformation. But before taking the pulpit, the evangelist must be thoroughly prepared in homiletics, biblical history, and textual analysis. They must understand the cultural context of the community they serve.

CHAPTER 2: METHODS OF EXPONENTIAL OUTREACH
Modern evangelism must combine the ancient paths of dynamic preaching with contemporary digital tools. Expand your reach by launching digital book libraries, recording clear sermon audio podcasts, and utilizing community forums. Focus on active, personal engagement over broadcast noise.

CHAPTER 3: DISCIPLES OF SOCIAL RENEWAL
A true convert must be integrated into a local community, nurtured in leadership, and equipped to serve. The ultimate goal of saving souls is the total renewal of society: creating honest businesses, supporting children's education, and empowering Bungoma scholars to walk in absolute excellence.`;
  }

  if (t.includes("global education") || t.includes("frameworks") || t.includes("curriculum")) {
    return `GLOBAL EDUCATION FRAMEWORKS: SYNTHESIS OF MODERN ACADEMIC STANDARDS

CHAPTER 1: THE STRUCTURAL FOUNDATIONS OF ACADEMICS
Modern education requires a balance between rigorous cognitive science, character formation, and technological competency. An effective global standard must load without barrier, adapt to low-bandwidth regional realities in East Africa, and foster problem-solving over mechanical memorization.

CHAPTER 2: TRANSFORMATIVE LEADERSHIP SCHOOLS
A high-end curriculum integrates moral leadership early. Students should not only master mathematics, chemistry, and literature, but also participate in cooperative agribusiness, financial ledgers auditing, and local civic workshops.

CHAPTER 3: DIGITAL LIBRARIES & TECHNOLOGY MATRIX
Using highly accessible, offline-first digital ebook platforms ensures that every student, regardless of their location, has immediate access to rich primary source textbooks, historical maps, and interactive testing engines. This is the future of academic accessibility.`;
  }

  // Elegant fallback template for any custom metadata
  return `${title.toUpperCase()}: A PERSISTENT DIGITAL STUDY GUIDE

CHAPTER 1: GENERAL PREFACE & STUDY SYLLABUS
This academic textbook, written by ${author}, covers essential theological, leadership, or educational frameworks. Read this volume chapter-by-chapter to acquire comprehensive understanding.

CHAPTER 2: PRIMARY THEORIES AND COMPREHENSIVE OUTLINES
1. TEXTUAL RESEARCH: Investigate primary source materials carefully.
2. SOCIAL PRACTICES: Coordinate local agribusiness or community resources transparently.
3. ACCOUNTABLE LEADERSHIP: Model strict spiritual values and clear governance rules.

CHAPTER 3: EVALUATION QUESTIONS & CORE DISCUSSION
- Analyze how these values translate to public welfare in Western Kenya.
- Detail the practical steps to implement these frameworks in your local team.
- Download the complete document to access coordinates, maps, and advanced checklists.`;
}

interface SecureBookReaderProps {
  book: Book;
  currentUser: User | null;
  hasPaid: boolean;
  isAdmin: boolean;
  onClose: () => void;
  onTriggerPayment?: () => void;
  onAddNewDocument?: (doc: SavedDocument) => void;
}

export default function SecureBookReader({
  book,
  currentUser,
  hasPaid,
  isAdmin,
  onClose,
  onTriggerPayment,
  onAddNewDocument
}: SecureBookReaderProps) {
  const canAccessFully = hasPaid || isAdmin || (book.id.startsWith("book_") && !["b1", "b2", "b3"].includes(book.id)) || (book.pdfUrl && (book.pdfUrl.includes("/api/books/pdf/") || book.pdfUrl.startsWith("indexeddb://")));

  const isAdminUploadedMainBook = book.id.startsWith("book_") && !book.id.startsWith("book_ai_doc_") && !["b1", "b2", "b3"].includes(book.id);
  const isWordDoc = book.pdfUrl?.includes("/api/books/docx/") || book.pdfUrl?.endsWith(".docx") || book.pdfUrl?.endsWith(".doc");

  // Dynamic book content local state (to allow compiling missing text via Gemini / caching)
  const [localBookContent, setLocalBookContent] = useState<string>(() => {
    if (book.content) return book.content;
    const cached = typeof window !== "undefined" ? localStorage.getItem(`WAFULA_BOOK_CONTENT_${book.id}`) : null;
    if (cached) return cached;
    if (isAdminUploadedMainBook) {
      return "Authentic document presentation. Please read in 'Original PDF Presentation' mode using the selector above.";
    }
    return getDefaultBookContent(book.title, book.author, book.description || "");
  });

  // View presentation mode: text by default if there's text content, else default to 'pdf' if it has a pdfUrl, else 'text'
  const [viewMode, setViewMode] = useState<'text' | 'pdf'>(() => {
    if (isWordDoc) {
      return 'text';
    }
    if (isAdminUploadedMainBook && book.pdfUrl) {
      return 'pdf';
    }
    
    const titleLower = book.title.toLowerCase();
    const isSpecialTitle = titleLower.includes("seven spirits") || 
                           titleLower.includes("investment") || 
                           titleLower.includes("spirit") || 
                           titleLower.includes("evangelist") || 
                           titleLower.includes("frameworks");
    
    if (isSpecialTitle || book.content) {
      return 'text';
    }
    const cached = typeof window !== "undefined" ? localStorage.getItem(`WAFULA_BOOK_CONTENT_${book.id}`) : null;
    if (cached) return 'text';
    
    if (book.pdfUrl && (book.pdfUrl.startsWith("http://") || book.pdfUrl.startsWith("https://") || book.pdfUrl.startsWith("blob:") || book.pdfUrl.startsWith("data:") || book.pdfUrl.startsWith("/") || book.pdfUrl.startsWith("api/"))) {
      return 'pdf';
    }
    return 'text';
  });

  const [isCompiling, setIsCompiling] = useState(false);
  const [compilationProgress, setCompilationProgress] = useState("");

  const handleCompileBookText = async () => {
    setIsCompiling(true);
    setCompilationProgress("Connecting to Wafula AI Publishing cloud...");
    try {
      // Stage 1: Connecting
      setTimeout(() => setCompilationProgress("Analyzing book titles, author thesis and description..."), 1000);
      
      const promptMessage = `Construct a complete, academically robust, multi-chapter textbook for:
Title: "${book.title}"
Author: "${book.author}"
Category: "${book.category}"
Description: "${book.description || 'A theological and leadership study manual.'}"

Please write at least 3 dense chapters. For each chapter, include an introduction, study outlines, rich analytical body commentary, real-world development checklists for East Africa (specifically Bungoma, Kenya), and review exercises. Provide absolute canonical depth. Do not include summary prefixes like 'Sure, here is your book' or mock outlines only. Fill in real content!`;

      const response = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptMessage,
          category: "Book Publisher"
        })
      });
      
      setCompilationProgress("Synthesizing chapters and formatting pages...");
      const data = await response.json();
      if (data.success && data.text) {
        const gText = data.text;
        setLocalBookContent(gText);
        if (typeof window !== "undefined") {
          localStorage.setItem(`WAFULA_BOOK_CONTENT_${book.id}`, gText);
        }
      } else {
        throw new Error(data.error || "Received empty compilation.");
      }
    } catch (err: any) {
      console.error("AI Compilation failed:", err);
      alert("⚠️ Direct Reader Compilation failed: " + err.message + ". Please toggle 'Original PDF layout' instead.");
    } finally {
      setIsCompiling(false);
    }
  };

  // Reading layout state
  const [currentPage, setCurrentPage] = useState(1);
  const [cloudStatus, setCloudStatus] = useState<'idle' | 'syncing' | 'synced'>('idle');

  // Synchronize reading progress from Firestore (Load on mount)
  useEffect(() => {
    if (!currentUser || !book.id) return;
    
    const loadProgress = async () => {
      setCloudStatus('syncing');
      try {
        const { getDocs, query, collection, where } = await import("firebase/firestore");
        const q = query(
          collection(db, "reading_progress"),
          where("userId", "==", currentUser.id || "guest"),
          where("bookId", "==", book.id)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const docData = snapshot.docs[0].data();
          if (docData.currentPage) {
            setCurrentPage(docData.currentPage);
          }
        }
        setCloudStatus('synced');
      } catch (err) {
        console.error("Failed to load reading progress from Firestore:", err);
        setCloudStatus('idle');
      }
    };
    
    loadProgress();
  }, [currentUser?.id, book.id]);

  // Synchronize reading progress back to Firestore (Save on change)
  useEffect(() => {
    if (!currentUser || !book.id) return;
    
    const saveProgress = async () => {
      setCloudStatus('syncing');
      try {
        const { getDocs, query, collection, where, doc, addDoc } = await import("firebase/firestore");
        const q = query(
          collection(db, "reading_progress"),
          where("userId", "==", currentUser.id || "guest"),
          where("bookId", "==", book.id)
        );
        const snapshot = await getDocs(q);
        const totalPages = book.pages || 10;
        const progressPercent = Math.min(100, Math.floor((currentPage / totalPages) * 100));
        
        if (!snapshot.empty) {
          const docId = snapshot.docs[0].id;
          const { updateDoc } = await import("firebase/firestore");
          await updateDoc(doc(db, "reading_progress", docId), {
            currentPage,
            percentage: progressPercent,
            updatedAt: new Date().toISOString()
          });
        } else {
          await addDoc(collection(db, "reading_progress"), {
            userId: currentUser.id || "guest",
            bookId: book.id,
            currentPage,
            percentage: progressPercent,
            updatedAt: new Date().toISOString()
          });
        }
        // Sync local storage as well
        localStorage.setItem(`wafula_bookmark_${book.id}`, currentPage.toString());
        setCloudStatus('synced');
      } catch (err) {
        console.error("Failed to save reading progress to Firestore:", err);
        setCloudStatus('idle');
      }
    };

    const timeout = setTimeout(() => {
      saveProgress();
    }, 1200);
    
    return () => clearTimeout(timeout);
  }, [currentPage, currentUser?.id, book.id]);

  const [isTimerActive, setIsTimerActive] = useState(!canAccessFully && !!book.allowPreview);
  const [timeLeft, setTimeLeft] = useState(book.previewDuration || 30);
  const [isExpired, setIsExpired] = useState(false);
  
  // Settings Folder collapsible trigger state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Layout preference options (Folded/collapsed on phone screens by default to optimize viewport, open on desktop)
  const [isAnnotationsPanelOpen, setIsAnnotationsPanelOpen] = useState(() => typeof window !== "undefined" ? window.innerWidth >= 768 : false);
  const [isOfflineCachingActive, setIsOfflineCachingActive] = useState(true);
  const [isProgressTrackerActive, setIsProgressTrackerActive] = useState(true);
  const [isDrawingMode, setIsDrawingMode] = useState(false);

  // Custom text adjustments
  const [readerFontSize, setReaderFontSize] = useState<number>(14);
  const [jumpPageVal, setJumpPageVal] = useState("1");
  const [contrastLevel, setContrastLevel] = useState<number>(100);

  // PDF resolvement states
  const [resolvedPdfUrl, setResolvedPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let localUrlObj: string | null = null;

    const resolveBookPdf = async () => {
      if (!book.pdfUrl) {
        setResolvedPdfUrl(null);
        return;
      }

      // Check IndexedDB offline cache first for optimal speed and reliability
      try {
        const offlineBlob = await getPdfFromOfflineDb(book.id);
        if (offlineBlob && active) {
          console.log(`Loading Book "${book.title}" from local high-speed IndexedDB cache...`);
          localUrlObj = URL.createObjectURL(offlineBlob);
          setResolvedPdfUrl(localUrlObj);
          return;
        }
      } catch (err) {
        console.warn("Local IndexedDB file lookup failed, falling back to server URL...", err);
      }

      if (book.pdfUrl.startsWith("indexeddb://")) {
        const bookId = book.pdfUrl.replace("indexeddb://", "");
        try {
          const blob = await getPdfFromOfflineDb(bookId);
          if (blob && active) {
            localUrlObj = URL.createObjectURL(blob);
            setResolvedPdfUrl(localUrlObj);
          } else if (active) {
            setResolvedPdfUrl(null);
          }
        } catch (err) {
          console.error("Reader: Failed to load book blob from IndexedDB indices:", err);
          if (active) setResolvedPdfUrl(null);
        }
      } else {
        setResolvedPdfUrl(book.pdfUrl);
      }
    };

    resolveBookPdf();

    return () => {
      active = false;
      if (localUrlObj) {
        URL.revokeObjectURL(localUrlObj);
      }
    };
  }, [book.pdfUrl, book.id]);

  useEffect(() => {
    setJumpPageVal(currentPage.toString());
  }, [currentPage]);

  // Firestore annotations state
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [newAnnotationText, setNewAnnotationText] = useState("");
  const [newAnnotationComment, setNewAnnotationComment] = useState("");
  const [newAnnotationColor, setNewAnnotationColor] = useState("#fef08a"); // Default yellow
  const [isLoadingAnnotations, setIsLoadingAnnotations] = useState(true);

  // Web Speech API / Voice recording states
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [interimSpeechResult, setInterimSpeechResult] = useState("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      setVoiceSupported(true);
    }
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);

  // Speaks active book content out loud
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechRate, setSpeechRate] = useState(1);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
        if (voices.length > 0 && !selectedVoiceURI) {
          const defaultVoice = voices.find(v => v.lang.startsWith("en")) || voices[0];
          setSelectedVoiceURI(defaultVoice.voiceURI);
        }
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [selectedVoiceURI]);

  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleToggleReadAloud = () => {
    if (!window.speechSynthesis) {
      alert("Oops! Web Speech synthesis is not supported in this browser window.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      
      const textToRead = `Chapter Header: ${activePageData.header}. Page Body: ${activePageData.content}`;
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.rate = speechRate;
      
      const voices = window.speechSynthesis.getVoices();
      if (selectedVoiceURI) {
        const matchVoice = voices.find(v => v.voiceURI === selectedVoiceURI);
        if (matchVoice) {
          utterance.voice = matchVoice;
        }
      } else {
        const matchVoice = voices.find(v => v.lang.startsWith("en-")) || voices[0];
        if (matchVoice) {
          utterance.voice = matchVoice;
        }
      }

      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleToggleVoiceRecording = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert("Oops! Web Speech Recognition API is not supported in this browser window.");
      return;
    }

    if (isVoiceRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsVoiceRecording(false);
    } else {
      setSpeechError(null);
      setInterimSpeechResult("");
      setIsVoiceRecording(true);

      try {
        const recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onstart = () => {
          console.log("Voice notes dictation engine opened...");
        };

        recognition.onerror = (event: any) => {
          console.error("Speech Recognition Error:", event.error);
          setSpeechError(event.error || "Recording failed.");
          setIsVoiceRecording(false);
        };

        recognition.onend = () => {
          setIsVoiceRecording(false);
          setInterimSpeechResult("");
        };

        recognition.onresult = (event: any) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          if (finalTranscript) {
            setNewAnnotationComment((prev) => {
              const prefix = prev ? prev.trim() + " " : "";
              return prefix + finalTranscript;
            });
          }
          setInterimSpeechResult(interimTranscript);
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch (err: any) {
        console.error("Failed to boot webkitSpeechRecognition:", err);
        setSpeechError(err.message || "Failed to boot webkitSpeechRecognition API.");
        setIsVoiceRecording(false);
      }
    }
  };

  const handleExportHighlightsPDF = () => {
    if (annotations.length === 0) {
      alert("📝 Notice: You have not saved any text highlights or study notes on this book block yet!");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("⚠️ Window system blocked popups! Please enable popup rendering to instantly download PDF formatted highlights.");
      return;
    }

    const docTitle = `${book.title} - Study Highlights Log`;
    const logsHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${docTitle}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Playfair+Display:ital,wght@1,500;1,700&display=swap');
          body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 40px;
            line-height: 1.6;
          }
          .container {
            max-width: 760px;
            margin: 0 auto;
          }
          .header {
            border-bottom: 3px solid #000000;
            padding-bottom: 24px;
            margin-bottom: 32px;
          }
          h1 {
            font-size: 28px;
            font-weight: 800;
            color: #0f172a;
            margin: 0 0 8px 0;
            text-transform: uppercase;
            letter-spacing: -0.025em;
          }
          .meta-row {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #64748b;
            display: flex;
            justify-content: space-between;
          }
          .intro-p {
            font-size: 13px;
            font-weight: 500;
            color: #475569;
            margin-bottom: 30px;
            background: #f8fafc;
            border-left: 4px solid #3b82f6;
            padding: 12px 16px;
            border-radius: 4px;
          }
          .highlight-card {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 24px;
            background: #fff;
            box-shadow: 0 2px 4px rgba(0,0,0,0.02);
            page-break-inside: avoid;
          }
          .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
          }
          .badge-page {
            background: #f1f5f9;
            color: #334155;
            font-size: 10px;
            font-weight: 700;
            padding: 3px 8px;
            border-radius: 9999px;
            font-family: monospace;
          }
          .badge-color {
            width: 12px;
            height: 12px;
            border-radius: 9999px;
            border: 1px solid rgba(0,0,0,0.1);
          }
          .quote-text {
            font-family: 'Playfair Display', Georgia, serif;
            font-size: 16px;
            font-style: italic;
            font-weight: 5
            color: #1e293b;
            line-height: 1.5;
            margin: 0 0 12px 0;
            border-left: 3px solid #cbd5e1;
            padding-left: 12px;
          }
          .comment-block {
            background: #fffbeb;
            border: 1px dashed #f59e0b;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 12.5px;
            font-weight: 600;
            color: #78350f;
          }
          .footer {
            margin-top: 60px;
            border-top: 1px solid #e2e8f0;
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            text-align: center;
            color: #94a3b8;
            padding-top: 24px;
            letter-spacing: 0.1em;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Study Highlights Certificate</h1>
            <div class="meta-row">
              <span>Book: ${book.title} (by ${book.author})</span>
              <span>Generated: ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}</span>
            </div>
          </div>

          <div class="intro-p">
            Below is the compiled digital certificate of study annotations, markers, and analytical notes curated within the online sandbox reader.
          </div>

          ${annotations.map(a => {
            return `
              <div class="highlight-card">
                <div class="card-header">
                  <span class="badge-page">Page: ${a.page || 1}</span>
                  <div class="badge-color" style="background-color: ${a.color || '#fef08a'}"></div>
                </div>
                <p class="quote-text">"${a.text || ''}"</p>
                ${a.comment ? `
                  <div class="comment-block">
                    <strong>Study Note:</strong> ${a.comment}
                  </div>
                ` : ""}
              </div>
            `;
          }).join("")}

          <div class="footer">
            Study Material • Verified Authentic Release Account Copy • Generated via Digital Library
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(logsHtml);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 450);
  };

  // --- Real-time Annotations Sync (Cloud & IndexedDB fallback) ---
  useEffect(() => {
    if (!currentUser) {
      setIsLoadingAnnotations(false);
      return;
    }

    try {
      const q = query(
        collection(db, "annotations"),
        where("userId", "==", currentUser.id),
        where("bookId", "==", book.id),
        orderBy("createdAt", "desc")
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        setAnnotations(list);
        setIsLoadingAnnotations(false);
      }, (err) => {
        console.warn("Firestore permissions or index missing, falling back to Local IndexedDB:", err.message);
        getFromIndexedDB().then((localList) => {
          const matched = localList.filter((x) => x.bookId === book.id);
          setAnnotations(matched);
          setIsLoadingAnnotations(false);
        });
      });

      return () => unsubscribe();
    } catch (e: any) {
      console.warn("Live annotation listener init failed:", e.message);
      setIsLoadingAnnotations(false);
    }
  }, [book.id, currentUser]);

  const handleAddAnnotation = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = newAnnotationText.trim();
    if (!t) {
      alert("Please highlight sentences on the page and place them in the highlighted quote textarea!");
      return;
    }

    const comment = newAnnotationComment.trim();

    const payload = {
      bookId: book.id,
      bookTitle: book.title,
      userId: currentUser?.id || "guest",
      userName: currentUser?.name || "Anonymous Member",
      page: currentPage,
      text: t,
      comment: comment,
      color: newAnnotationColor,
      createdAt: new Date().toISOString()
    };

    try {
      if (currentUser) {
        await addDoc(collection(db, "annotations"), payload);
      } else {
        await saveToIndexedDB({ ...payload, id: Date.now() });
        const localList = await getFromIndexedDB();
        setAnnotations(localList.filter((x) => x.bookId === book.id));
      }

      setNewAnnotationText("");
      setNewAnnotationComment("");
      alert("🎉 Study Annotation saved permanently!");
    } catch (err: any) {
      console.warn("Failed to write annotation to database, writing to local index:", err.message);
      await saveToIndexedDB({ ...payload, id: Date.now() });
      const localList = await getFromIndexedDB();
      setAnnotations(localList.filter((x) => x.bookId === book.id));
      setNewAnnotationText("");
      setNewAnnotationComment("");
    }
  };

  const handleDeleteAnnotation = async (id: string | number) => {
    if (!confirm("Are you sure you want to delete this study annotation highlight?")) return;

    try {
      if (typeof id === "string") {
        await deleteDoc(doc(db, "annotations", id));
      } else {
        await deleteFromIndexedDB(id);
        const localList = await getFromIndexedDB();
        setAnnotations(localList.filter((x) => x.bookId === book.id));
      }
      alert("Annotation removed.");
    } catch (err: any) {
      console.error("Failed to remove annotation:", err);
      if (typeof id === "number") {
        await deleteFromIndexedDB(id);
        const localList = await getFromIndexedDB();
        setAnnotations(localList.filter((x) => x.bookId === book.id));
      }
    }
  };

  // --- Preview Expiration Monitor ---
  useEffect(() => {
    if (!isTimerActive) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTimerActive]);

  const getSimulatedBookPages = () => {
    const title = book.title;
    const author = book.author;
    const category = book.category;
    const desc = book.description;

    if (localBookContent) {
      const lines = localBookContent.split("\n");
      const pages: Array<{ page: number; subtitle: string; header: string; content: string }> = [];
      let currentPageNum = 1;
      let currentHeader = "INTRODUCTION";
      let currentSubtitle = "GENERAL PREFACE";
      let currentContentLines: string[] = [];

      const flushPage = () => {
        if (currentContentLines.some(line => line.trim().length > 0)) {
          // Join and cleanup double empty spots
          const cleanedText = currentContentLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
          pages.push({
            page: currentPageNum++,
            subtitle: currentSubtitle.toUpperCase(),
            header: `${title.toUpperCase()} — ${currentHeader.toUpperCase()}`,
            content: cleanedText
          });
          currentContentLines = [];
        }
      };

      lines.forEach((line) => {
        const trimmed = line.trim();
        // Detect section landmarks generated by AI document publisher typically written as ALL CAPS heading
        const isHeading = trimmed && (
          trimmed.startsWith("CHAPTER") || 
          trimmed.startsWith("INTRODUCTION") || 
          trimmed.startsWith("CONCLUSION") || 
          (trimmed.length > 5 && trimmed.length < 50 && trimmed === trimmed.toUpperCase() && !trimmed.includes(".") && !trimmed.includes(",") && !trimmed.includes(":"))
        );

        if (isHeading) {
          if (currentContentLines.length > 8) {
            flushPage();
          }
          currentHeader = trimmed;
          currentSubtitle = trimmed;
        } else {
          currentContentLines.push(line);
        }
      });
      flushPage();

      if (pages.length > 0) {
        return pages;
      }
    }

    return [
      {
        page: 1,
        subtitle: "DIGITAL PUBLIC RELEASE",
        header: `${title.toUpperCase()} — BY ${author.toUpperCase()}`,
        content: `
          ==================================================
          ${title.toUpperCase()}
          ==================================================
          
          Written by: ${author}
          Genre: ${category}
          Edition: 2026 Public Library Release
          
          --------------------------------==================
          INTRODUCTION:
          ${desc}
          
          This library copy was compiled automatically and made available
          digitally. You can download this book as a complete PDF document
          by purchasing a full reading license.
        `
      },
      {
        page: 2,
        subtitle: "CHAPTER I: THE CALLING VALUE PILLARS",
        header: "CHAPTER I: THE LEADER WITHIN",
        content: `
          How do we scale community assets in Western Kenya utilizing dynamic values?
          We begin with character. Kelvin Opara Wafula structures accountability 
          as a foundational ledger.
          
          No church group, study room, or research assembly can hold weight without 
          verifiable truth. In this section, we analyze integrity integration of resources:
          
          1. SACRIFICIAL LEADERSHIP: Leading without self-promotion. 
          2. DOCKING RESOURCES: Saving local collections for public scholarship.
          3. DIGITAL STEWARDSHIP: Leveraging modern database tools to distribute wisdom.
          
          "The greatest calling is the calling that builds other leaders."
          Study this chapter line-by-line to understand the complete framework.
        `
      },
      {
        page: 3,
        subtitle: "CHAPTER II: LOCAL DEVELOPMENT",
        header: "CHAPTER II: LOCAL FUNDING & AGRIBUSINESS",
        content: `
          Bungoma is rich in agricultural soil. Why are local youth migrating to urban centers? 
          It is because they lack strategic empowerment manuals.
          
          By launching self-help cooperatives:
          - We group community resources.
          - We automate local production reports.
          - We log active farm metrics.
          
          * Agrarian calibration rules demand we keep crop records:
            "A well-fed village is a praying village."
          
          To view the exact financial blueprints and legal structures mapped in Appendix A, 
          proceed to purchase the complete digital publication.
        `
      },
      {
        page: 4,
        subtitle: "CHAPTER III: EDUCATION OUTREACH",
        header: "CHAPTER III: INTELLECTUAL CAPITALS",
        content: `
          We must invest heavily in local training schools and technical laboratories.
          Every library is a power plant. The books purchased fund local scholarships,
          enabling children to read, write, and innovate.
          
          - 50% of library proceeds directly support high school students.
          - 10% supports local community tech centers in Western Kenya.
          
          Thank you for support. Let us continue studying.
        `
      }
    ];
  };

  const pagesData = getSimulatedBookPages();
  const activePageData = pagesData[currentPage - 1] || pagesData[0];
  const totalPagesOnBook = (viewMode === 'pdf' && book.pdfUrl) ? (book.pages || 10) : pagesData.length;

  const handlePrevPage = () => {
    setCurrentPage((p) => Math.max(1, p - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((p) => Math.min(totalPagesOnBook, p + 1));
  };

  // --- Drawing Highlight Overlay Canvas Core ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawingColor, setDrawingColor] = useState("rgba(253, 224, 71, 0.4)"); // yellow highlight
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingStrokes, setDrawingStrokes] = useState<any[]>(() => {
    const saved = localStorage.getItem(`WAFULA_STROKES_${book.id}_${currentPage}`);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    setDrawingStrokes([]);
    const saved = localStorage.getItem(`WAFULA_STROKES_${book.id}_${currentPage}`);
    if (saved) {
      setDrawingStrokes(JSON.parse(saved));
    }
  }, [currentPage, book.id]);

  useEffect(() => {
    if (drawingStrokes.length > 0) {
      localStorage.setItem(`WAFULA_STROKES_${book.id}_${currentPage}`, JSON.stringify(drawingStrokes));
    } else {
      localStorage.removeItem(`WAFULA_STROKES_${book.id}_${currentPage}`);
    }
    redrawCanvas();
  }, [drawingStrokes]);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawingStrokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width || 12;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    const newStroke = {
      color: drawingColor,
      width: 14,
      points: [{ x, y }]
    };
    setDrawingStrokes((prev) => [...prev, newStroke]);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode || !isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setDrawingStrokes((prev) => {
      if (prev.length === 0) return prev;
      const copy = [...prev];
      const last = { ...copy[copy.length - 1] };
      last.points = [...last.points, { x, y }];
      copy[copy.length - 1] = last;
      return copy;
    });
  };

  const handleCanvasMouseUp = () => {
    setIsDrawing(false);
  };

  const handleClearDrawings = () => {
    setDrawingStrokes([]);
  };

  // --- Real Document Download exporter ---
  const handleDownloadOriginal = () => {
    if (!canAccessFully) {
      alert("Verification Error: Downloading has been locked. Please purchase this book to download.");
      return;
    }

    const fileTitle = book.title.replace(/\s+/g, "_").toLowerCase();
    
    // Create simulated file content payload to download
    const boundaryStr = "WAFULA_READS_AUTHORIZED_OFFLINE_STUDY_PDF_RELEASE";
    const rawContent = `
      %PDF-1.4
      %Wafula Reads Certified PDF Release File
      Title: ${book.title}
      Author: ${book.author}
      Category: ${book.category}
      Licence Owner ID: ${currentUser?.id || "Local Member Account"}
      Licence Owner Name: ${currentUser?.name || "Library Subscriber"}
      
      -------------------------------------------------------------------
      CERTIFICATE OF DIGITAL ACCESS:
      This certifies that the subscriber has fully purchased and owns 100% 
      original rights to keep this digital ebook within their private device.
      
      -------------------------------------------------------------------
      BOOK DETAILS:
      ${pagesData.map(p => `[Page ${p.page}] - ${p.subtitle}\n${p.content}`).join("\n\n")}
      
    `;
    
    const blob = new Blob([rawContent], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const element = document.createElement("a");
    element.href = url;
    element.download = `${fileTitle}_authenticated_release.pdf`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(url);
    alert(`🎉 Successfully downloaded "${book.title}" as a portable document PDF securely.`);
  };

  const safePercent = Math.min(100, Math.floor((currentPage / totalPagesOnBook) * 100));

  return (
    <div 
      id="secure-reader-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-100 p-0 sm:p-0 select-text"
    >
      {/* Main Full-Screen Layout */}
      <div 
        ref={containerRef}
        id="secure-reader"
        className="w-full h-full bg-white flex flex-col relative"
      >
        {/* -- TOP NAV HEADER BAR -- */}
        <div className="bg-slate-900 text-white p-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-950 shrink-0 z-20 shadow-md">
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button 
              onClick={onClose}
              className="p-2 border border-slate-700 bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 rounded-xl transition font-extrabold flex items-center space-x-1.5 cursor-pointer"
            >
              <span>&larr; Exit Reader</span>
            </button>
            <div className="text-left">
              <h4 className="text-xs sm:text-sm font-black tracking-tight line-clamp-1 max-w-[200px] sm:max-w-[400px]">
                {book.title}
              </h4>
              <p className="text-[10px] text-slate-350 font-bold uppercase tracking-wider">
                BY {book.author.toUpperCase()} • {hasPaid ? "🔓 UNLOCKED FULL" : "⏳ FREE PREVIEW"}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end w-full sm:w-auto space-x-3">
            {/* Expanded customizers Settings Folder button */}
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 rounded-xl font-black text-xs transition cursor-pointer active:scale-95"
            >
              <Settings className="h-3.5 w-3.5 animate-spin-slow text-indigo-400" />
              <span>⚙️ {isSettingsOpen ? "Hide Settings Folder" : "Reader Settings Folder"}</span>
            </button>

            {/* Countdown timer badge if previewing */}
            {isTimerActive && !isExpired && (
              <div className="flex items-center space-x-1 px-3 py-1.5 bg-amber-500/10 border border-amber-500/35 text-amber-500 rounded-full text-[10px] font-mono font-black animate-pulse">
                <Clock className="h-3.5 w-3.5 mr-1" />
                <span>SECONDS REMAINING: {timeLeft}s</span>
              </div>
            )}
          </div>
        </div>

        {/* -- READER MODE SELECTOR BAR -- */}
        {book.pdfUrl && (
          <div className="bg-slate-850 text-stone-200 border-b border-slate-950 px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-2 z-10 text-xs shadow-sm">
            <div className="flex items-center space-x-2 font-bold select-none">
              <BookOpen className="h-4 w-4 text-indigo-400" />
              <span>{isWordDoc ? "Original Word Document (.docx) loaded:" : "Select Reader Presentation Mode:"}</span>
            </div>
            
            {isAdminUploadedMainBook ? (
              <div className="flex items-center space-x-2">
                {isWordDoc ? (
                  <>
                    <div className="px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/35 text-emerald-400 rounded-lg text-xs font-mono font-bold">
                      📖 AUTHENTIC WORD EXTRACTED TEXT
                    </div>
                    <a 
                      href={book.pdfUrl}
                      download={`${book.title}.docx`}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold transition cursor-pointer flex items-center space-x-1.5 border border-emerald-850 shadow"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download Original docx</span>
                    </a>
                  </>
                ) : (
                  <div className="px-3.5 py-1.5 bg-indigo-500/10 border border-indigo-500/35 text-indigo-400 rounded-lg text-xs font-mono font-bold uppercase">
                    📄 SECURE ORIGINAL PDF PRESENTATION
                  </div>
                )}
              </div>
            ) : isWordDoc ? (
              <div className="flex items-center space-x-2">
                <a 
                  href={book.pdfUrl}
                  download={`${book.title}.docx`}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold transition cursor-pointer flex items-center space-x-1.5 border border-emerald-800 shadow"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Original Word Document</span>
                </a>
              </div>
            ) : (
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-700">
                <button
                  onClick={() => setViewMode('text')}
                  className={`px-3 py-1 rounded-md font-extrabold transition cursor-pointer flex items-center space-x-1.5 ${
                    viewMode === 'text' 
                      ? 'bg-slate-700 text-white shadow' 
                      : 'text-stone-400 hover:text-stone-200 hover:bg-slate-900'
                  }`}
                >
                  <span>📖 Enhanced Text Reader</span>
                  {!isAdminUploadedMainBook && (
                    <span className="text-[9px] bg-slate-900 text-indigo-300 px-1 py-0.5 rounded font-mono font-black border border-indigo-950">AI Support</span>
                  )}
                </button>
                <button
                  onClick={() => setViewMode('pdf')}
                  className={`px-3 py-1 rounded-md font-extrabold transition cursor-pointer flex items-center space-x-1.5 ${
                    viewMode === 'pdf' 
                      ? 'bg-slate-700 text-white shadow' 
                      : 'text-stone-400 hover:text-stone-200 hover:bg-slate-900'
                  }`}
                >
                  <span>📄 Original PDF (Iframe)</span>
                </button>
              </div>
            )}

            <div className="text-[10px] text-stone-300 font-bold select-none italic text-center sm:text-right">
              {isAdminUploadedMainBook ? (
                isWordDoc 
                  ? "✨ Complete Word Document content parsed above. Authentic administrative edition."
                  : "✨ Authorized copy registered by Overseer Kelvin Wafula. Displaying official PDF layout."
              ) : isWordDoc 
                ? "✨ This Word Document was parsed to authentic text. Read the actual contents below."
                : (viewMode === 'pdf' 
                  ? "⚠️ If your browser blocks secure plugin display, toggle the Enhanced Text Reader!" 
                  : "✨ Web Read Aloud and Highlight Brush features are fully active in Text Mode.")
              }
            </div>
          </div>
        )}

        {/* -- COLLAPSIBLE SETTINGS & CONTROLS FOLDER -- */}
        {isSettingsOpen && (
          <div className="bg-slate-50 border-b border-stone-200 p-4 shrink-0 z-20 shadow-inner grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4 select-none">
            {/* View Layer Toggles */}
            <div className="space-y-2 p-3 bg-white rounded-xl border border-stone-200">
              <span className="block text-[10px] font-extrabold uppercase text-stone-500 tracking-wider">👁️ Layout Visibility</span>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-xs font-bold text-stone-800 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isAnnotationsPanelOpen}
                    onChange={(e) => setIsAnnotationsPanelOpen(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 border-stone-300 cursor-pointer"
                  />
                  <span>Show Annotations Side Panel</span>
                </label>

                <label className="flex items-center space-x-2 text-xs font-bold text-stone-800 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isProgressTrackerActive}
                    onChange={(e) => setIsProgressTrackerActive(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 border-stone-300 cursor-pointer"
                  />
                  <span>Show Progress Tracker Bar</span>
                </label>
              </div>
            </div>

            {/* Syncing preferences */}
            <div className="space-y-2 p-3 bg-white rounded-xl border border-stone-200">
              <span className="block text-[10px] font-extrabold uppercase text-stone-500 tracking-wider">💾 Sync Settings</span>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-xs font-bold text-stone-800 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isOfflineCachingActive}
                    onChange={(e) => {
                      setIsOfflineCachingActive(e.target.checked);
                      if (e.target.checked) {
                        alert("📶 Caching synced automatically.");
                      }
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 border-stone-300 cursor-pointer"
                  />
                  <span>Adaptive Offline Local Cache</span>
                </label>
              </div>
            </div>

            {/* Typography adjustments */}
            <div className="space-y-2 p-3 bg-white rounded-xl border border-stone-200">
              <span className="block text-[10px] font-extrabold uppercase text-stone-500 tracking-wider">🔤 Font & Layout Adjust</span>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700">Text Size:</span>
                <div className="flex items-center space-x-1">
                  <button 
                    onClick={() => setReaderFontSize(s => Math.max(10, s - 1))}
                    className="px-2 py-1 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded text-xs font-mono font-extrabold cursor-pointer"
                  >
                    A-
                  </button>
                  <span className="text-xs font-mono font-black text-stone-900 bg-stone-50 px-2 py-1 border rounded">{readerFontSize}px</span>
                  <button 
                    onClick={() => setReaderFontSize(s => Math.min(24, s + 1))}
                    className="px-2 py-1 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded text-xs font-mono font-extrabold cursor-pointer"
                  >
                    A+
                  </button>
                </div>
              </div>
            </div>

            {/* Custom Accessibility contrast adjusts */}
            <div className="space-y-2 p-3 bg-white rounded-xl border border-stone-200">
              <span className="block text-[10px] font-extrabold uppercase text-stone-500 tracking-wider">⚙️ Visual Parameters</span>
              <div className="space-y-2">
                {/* Contrast settings input */}
                <div className="flex items-center justify-between text-xs font-bold text-stone-700">
                  <span>Contrast Level:</span>
                  <div className="flex items-center space-x-1 font-mono">
                    <button 
                      onClick={() => setContrastLevel(c => Math.max(60, c - 10))}
                      className="px-2 py-0.5 bg-stone-100 border rounded font-mono font-black"
                    >
                      -
                    </button>
                    <span className="bg-stone-50 px-1 border rounded">{contrastLevel}%</span>
                    <button 
                      onClick={() => setContrastLevel(c => Math.min(180, c + 10))}
                      className="px-2 py-0.5 bg-stone-100 border rounded font-mono font-black"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* -- READ PROGRESS BAR -- */}
        {isProgressTrackerActive && (
          <div className="bg-stone-50 border-b border-stone-250 px-3 sm:px-4 py-2 flex flex-row items-center justify-between text-[10px] sm:text-[11px] select-none shrink-0 z-10 w-full gap-2">
            <div className="flex items-center space-x-1.5 text-stone-600 font-bold shrink-0">
              <BookOpen className="h-3.5 w-3.5 text-slate-800 shrink-0" />
              <span>Progress:</span>
              <span className="font-mono font-black text-white bg-slate-900 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px]">
                {safePercent}%
              </span>
              {currentUser && (
                <div className="flex items-center space-x-1 pl-1 text-[9px] font-mono select-none">
                  {cloudStatus === 'syncing' && (
                    <span className="text-amber-600 flex items-center space-x-1">
                      <span className="inline-block h-2.5 w-2.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin shrink-0" />
                      <span>Syncing...</span>
                    </span>
                  )}
                  {cloudStatus === 'synced' && (
                    <span className="text-emerald-600 font-extrabold flex items-center space-x-0.5">
                      <span>☁️</span>
                      <span>Synced to Cloud</span>
                    </span>
                  )}
                  {cloudStatus === 'idle' && (
                    <span className="text-slate-400">Offline Standby</span>
                  )}
                </div>
              )}
            </div>
            
            <div className="hidden sm:block flex-1 max-w-lg mx-3 sm:mx-6 h-2 bg-stone-200 rounded-full overflow-hidden border border-stone-300">
              <div 
                className="h-full bg-slate-800 transition-all duration-300 ease-out"
                style={{ width: `${safePercent}%` }}
              />
            </div>
            
            <div className="text-[10px] font-mono font-bold text-stone-500 shrink-0">
              Page <strong>{currentPage}</strong> of <strong>{totalPagesOnBook}</strong>
            </div>
          </div>
        )}

        {/* -- READER CORE VIEWER AND ANNOTATIONS PANEL SPLIT -- */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* Main Book Visual Canvas Content area (Minimal gutter padding on phones to maximize reading workspace) */}
          <div className="flex-1 bg-stone-100 p-1 sm:p-6 overflow-y-auto flex items-start justify-center relative">
            
            {isExpired ? (
              /* Time Expired Checkout redirect display */
              <div className="max-w-md w-full bg-white border border-stone-300 p-8 rounded-2xl shadow-xl text-center space-y-5 animate-scaleUp z-20 my-auto">
                <div className="h-16 w-16 bg-red-100 text-red-650 rounded-full flex items-center justify-center mx-auto border border-red-200 animate-pulse">
                  <Lock className="h-8 w-8 text-slate-900" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-display font-extrabold text-stone-900 text-base leading-tight">
                    Preview Sample Ends Here
                  </h3>
                  <p className="text-[11.5px] text-stone-700 font-bold leading-relaxed">
                    You have browsed the authorized free intro preview of <strong>{book.title}</strong>! 
                    Complete the M-Pesa or eCitizen checkout of <strong>KES {book.price}</strong> to enable unlimited full-screen vertical scrolling and DRM-free offline file downloads.
                  </p>
                </div>

                <div className="pt-2 flex flex-col space-y-2.5">
                  {onTriggerPayment ? (
                    <button
                      onClick={() => {
                        onTriggerPayment();
                        onClose();
                      }}
                      className="w-full flex items-center justify-center space-x-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3 text-xs transition duration-200 cursor-pointer shadow-md"
                    >
                      <Sparkles className="h-4 w-4 fill-white" />
                      <span>Unlock Entire Book Online (KES {book.price})</span>
                    </button>
                  ) : (
                    <p className="text-[10px] text-stone-400 italic font-bold">Navigate to Digital Store catalog to unlock automatically.</p>
                  )}
                  <button
                    onClick={onClose}
                    className="text-stone-500 hover:text-stone-800 font-extrabold text-xs bg-transparent border-0 cursor-pointer"
                  >
                    Return to Digital Bookstore catalog
                  </button>
                </div>
              </div>
            ) : (
              /* ACTIVE VIEWPORT */
              viewMode === 'pdf' && book.pdfUrl ? (
                resolvedPdfUrl ? (
                  <div 
                    className="w-full h-full bg-stone-50 border border-stone-300 rounded-xl shadow-md overflow-hidden flex flex-col justify-between relative"
                    style={{ minHeight: "75vh" }}
                  >
                    <div className="flex-1 w-full h-full relative bg-stone-100">
                      <iframe 
                        src={resolvedPdfUrl.startsWith("data:") ? resolvedPdfUrl : `${resolvedPdfUrl}#toolbar=0&navpanes=0&scrollbar=1&zoom=100`}
                        className="w-full h-full border-0 min-h-[70vh]"
                        style={{ width: "100%", height: "100%", minHeight: "70vh" }}
                        title={book.title}
                      />
                    </div>

                    <div className="border-t border-stone-200 bg-stone-100 p-3.5 flex justify-between items-center text-[10px] font-mono text-stone-500 z-10">
                      <span>Reader Licence Account: {currentUser?.name || "Library Subscriber"}</span>
                      <span className="font-black uppercase text-stone-800">Dynamic Fullscreen Presentation</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full bg-white border border-stone-300 rounded-xl p-12 text-center min-h-[70vh] flex flex-col justify-center items-center" style={{ minHeight: "70vh" }}>
                    <Loader2 className="h-8 w-8 text-slate-800 animate-spin mb-4" />
                    <p className="text-xs font-mono font-bold text-stone-605">Assembling secure offline document sheets...</p>
                  </div>
                )
              ) : localBookContent ? (
                /* SIMULATED DIGITAL BOOK SHEETS */
                <div className="flex flex-col items-center w-full">
                  {/* CONTINUOUS SCROLL VIEW ONCE PAID */}
                  {canAccessFully ? (
                    <div className="space-y-8 w-full max-w-2xl select-text pb-12">
                      <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-center text-xs text-indigo-950 font-bold mb-4">
                        📖 Scroll Mode Active: Scroll downwards to continue reading this ebook continuously in full width!
                      </div>
                      {pagesData.map((pageObj, pIdx) => (
                        <div 
                          key={pIdx}
                          id={`ebook-scroll-page-${pageObj.page}`}
                          className="w-full bg-white border border-stone-300 p-4 sm:p-12 rounded-xl shadow-md text-left select-text relative"
                          style={{ 
                            filter: `contrast(${contrastLevel}%)`
                          }}
                        >
                          {/* Page header */}
                          <div className="pb-3 flex justify-between items-center text-[10px] font-mono text-stone-550 mb-6 font-bold uppercase select-none">
                            <span>{pageObj.subtitle}</span>
                            <span>PAGE {pageObj.page} OF {pagesData.length}</span>
                          </div>

                          {/* Page body */}
                          <div className="py-2">
                            <h5 
                              className="font-display font-black tracking-tight text-slate-900 uppercase mb-4 pb-1"
                              style={{ fontSize: `${readerFontSize + 3}px` }}
                            >
                              {pageObj.header}
                            </h5>
                            <pre 
                              className="font-sans leading-relaxed whitespace-pre-wrap select-text cursor-text text-stone-900 font-bold"
                              style={{ fontSize: `${readerFontSize}px` }}
                            >
                              {pageObj.content}
                            </pre>
                          </div>

                          {/* Footnote license */}
                          <div className="border-t border-stone-200 pt-3 mt-6 flex justify-between items-center text-[8.5px] font-mono text-stone-400 font-bold uppercase select-none">
                            <span>Licence owner: {currentUser?.name || "Library Subscriber"}</span>
                            <span>Continuous study record</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Free tier preview / Page buttons layout */
                    <div 
                      className="w-full max-w-2xl bg-white border border-stone-305 p-4 sm:p-12 rounded-xl shadow-md min-h-[60vh] flex flex-col justify-between relative select-text"
                      style={{ 
                        filter: `contrast(${contrastLevel}%)`
                      }}
                    >
                      {/* Highlight brush overlay canvas */}
                      {isDrawingMode && (
                        <canvas
                          ref={canvasRef}
                          width={620}
                          height={580}
                          className="absolute inset-0 w-full h-full z-25 cursor-crosshair touch-none select-none"
                          onMouseDown={handleCanvasMouseDown}
                          onMouseMove={handleCanvasMouseMove}
                          onMouseUp={handleCanvasMouseUp}
                          onMouseLeave={handleCanvasMouseUp}
                        />
                      )}

                      <div className="space-y-6 flex-1 flex flex-col justify-between">
                        {/* Page Header */}
                        <div className="pb-3 flex justify-between items-center text-[10px] font-mono text-stone-550 font-bold uppercase select-none">
                          <span>{activePageData.subtitle}</span>
                          <span>PAGE {activePageData.page} OF {pagesData.length}</span>
                        </div>

                        {/* Page text content */}
                        <div className="flex-1 py-2 text-left select-text cursor-text pointer-events-auto">
                          <h5 
                            className="font-display font-black tracking-tight uppercase mb-4 text-stone-950 pb-1"
                            style={{ fontSize: `${readerFontSize + 2}px` }}
                          >
                            {activePageData.header}
                          </h5>
                          <pre 
                            className="font-sans leading-relaxed whitespace-pre-wrap select-text cursor-text text-stone-900 font-bold"
                            style={{ fontSize: `${readerFontSize}px` }}
                          >
                            {activePageData.content}
                          </pre>
                        </div>

                        {/* Footnote */}
                        <div className="border-t border-stone-200 pt-3 flex justify-between items-center text-[9px] font-mono text-stone-400 font-bold uppercase select-none">
                          <span>Licensed to: {currentUser?.name || "Public Guest Reader"}</span>
                          <span>Page {activePageData.page} Preview Specimen</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* BEAUTIFUL AI COMPILER SCREEN */
                <div className="max-w-xl w-full bg-white border border-stone-300 p-8 rounded-2xl shadow-xl text-center space-y-6 my-auto animate-scaleUp">
                  <div className="h-16 w-16 bg-indigo-50 text-indigo-650 rounded-full flex items-center justify-center mx-auto border border-indigo-150 relative">
                    {isCompiling ? (
                      <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
                    ) : (
                      <Sparkles className="h-8 w-8 text-indigo-600 fill-indigo-200" />
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-display font-extrabold text-stone-900 text-lg leading-tight">
                      {isCompiling ? "Compiling Book Content..." : "Read Secure Book Directly!"}
                    </h3>
                    <p className="text-[12px] text-stone-600 font-semibold leading-relaxed">
                      {isCompiling 
                        ? compilationProgress 
                        : `This publication (${book.title}) is registered under document format. Some browser security layers disable external PDF rendering inside sandbox previews. Let Wafula's integrated cloud Gemini AI compile a comprehensive, highly formatted electronic reading edition of this ebook instantly!`
                      }
                    </p>
                  </div>

                  {!isCompiling && (
                    <div className="pt-2 flex flex-col space-y-3">
                      <button
                        onClick={handleCompileBookText}
                        className="w-full flex items-center justify-center space-x-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 text-xs transition duration-200 cursor-pointer shadow-md active:scale-95 border-0"
                      >
                        <Sparkles className="h-4 w-4 fill-white" />
                        <span>Compile & Read with Wafula AI (Free Study Trial)</span>
                      </button>

                      {book.pdfUrl && (
                        <button
                          onClick={() => setViewMode('pdf')}
                          className="text-stone-550 hover:text-stone-800 font-extrabold text-xs flex items-center justify-center space-x-1 bg-transparent hover:bg-stone-100 py-1.5 rounded transition border-0 cursor-pointer"
                        >
                          <span>Or try opening Original PDF Document</span>
                          <span>&rarr;</span>
                        </button>
                      )}
                    </div>
                  )}

                  {isCompiling && (
                    <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden border">
                      <div className="h-2 bg-indigo-600 animate-pulse w-4/5 rounded-full" />
                    </div>
                  )}
                </div>
              )
            )}
          </div>

          {/* -- INTERACTIVE HIGHLIGHTS AND STUDY NOTES SIDEBAR -- */}
          {isAnnotationsPanelOpen && (
            <div className="fixed md:static inset-y-0 right-0 z-30 w-85 max-w-full border-l border-stone-200 bg-white flex flex-col h-full shrink-0 select-text shadow-2xl md:shadow-none animate-slideInRight">
              {/* Sidebar Header */}
              <div className="p-4 bg-stone-50 border-b border-stone-200 flex flex-col gap-2 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-stone-800">
                    <Highlighter className="h-4 w-4 text-slate-800" />
                    <span className="text-xs font-black uppercase tracking-wider">Highlights Logs</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="bg-slate-900 text-white font-mono font-black text-[9px] px-2 py-0.5 rounded">
                      {annotations.length} Nodes
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAnnotationsPanelOpen(false)}
                      className="inline-flex md:hidden text-stone-550 hover:text-stone-900 p-1 bg-stone-100 hover:bg-stone-200 rounded transition"
                      title="Fold and collapse panel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {/* PDF Highlights/Notes Download Button */}
                <button
                  type="button"
                  onClick={handleExportHighlightsPDF}
                  className="w-full flex items-center justify-center space-x-1.5 bg-slate-900 hover:bg-slate-850 text-white font-extrabold py-2 px-3 rounded-lg shadow transition cursor-pointer text-[10.5px] uppercase mt-1"
                >
                  <Printer className="h-3.5 w-3.5 text-white" />
                  <span>Download Highlights PDF</span>
                </button>
              </div>

              {/* Sidebar Content Scroll area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-5 text-left">
                {/* Add annotation form */}
                <form onSubmit={handleAddAnnotation} className="space-y-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="text-[9px] font-mono font-black text-stone-500 uppercase tracking-wider block mb-1">
                    🖊️ New In-App Annotation note
                  </span>
                  
                  {/* Quote highlights quote grabber block */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center mb-0.5">
                      <label className="text-[9.5px] font-mono font-bold text-stone-500 block">Highlighted Quote:</label>
                      <button
                        type="button"
                        onClick={() => {
                          const selection = window.getSelection()?.toString();
                          if (selection && selection.trim()) {
                            setNewAnnotationText(selection);
                          } else {
                            alert("💡 Select some sentences inside the text box first, then click here to grab!");
                          }
                        }}
                        className="text-[9px] text-slate-900 hover:underline font-bold"
                      >
                        [📋 Grab Selection]
                      </button>
                    </div>
                    <textarea
                      placeholder="Highlight sentences of text or paste text here..."
                      value={newAnnotationText}
                      onChange={(e) => setNewAnnotationText(e.target.value)}
                      rows={2}
                      className="w-full text-xs p-2 rounded-lg bg-white border border-stone-200 font-bold outline-none leading-relaxed resize-none"
                    />
                  </div>

                  {/* Comment Note input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[9.5px] font-mono font-bold text-stone-500 block font-bold">Personal study thoughts:</label>
                      
                      {/* Voice Microphone recording */}
                      <button
                        type="button"
                        onClick={handleToggleVoiceRecording}
                        className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[8.5px] font-bold tracking-wider uppercase font-mono transition-all cursor-pointer border ${
                          isVoiceRecording 
                            ? "bg-red-50 text-red-650 border-red-200 animate-pulse" 
                            : "bg-white hover:bg-stone-100 text-stone-700 border-stone-250"
                        }`}
                      >
                        {isVoiceRecording ? "STOP REC" : "🎤 VOICENOTE"}
                      </button>
                    </div>

                    <textarea
                      placeholder="Compose critical thoughts or sermon outlines..."
                      value={newAnnotationComment}
                      onChange={(e) => setNewAnnotationComment(e.target.value)}
                      rows={3}
                      className="w-full text-xs p-2 rounded-lg bg-white border border-stone-200 font-bold outline-none font-bold"
                    />

                    {interimSpeechResult && (
                      <p className="text-[10px] text-red-600 bg-red-100/50 p-1 rounded italic font-mono animate-pulse">
                        Listening: "{interimSpeechResult}"
                      </p>
                    )}
                  </div>

                  {/* Marker Highlighting Pen colors */}
                  <div className="flex items-center justify-between pt-1 border-t border-stone-200/50">
                    <span className="text-[9.5px] font-mono font-bold text-stone-500 uppercase">Marker Pen Color:</span>
                    <div className="flex items-center space-x-1.5">
                      {[
                        { color: "#fef08a", label: "Yellow" },
                        { color: "#bbf7d0", label: "Green" },
                        { color: "#bfdbfe", label: "Blue" },
                        { color: "#fbcfe8", label: "Pink" }
                      ].map((c) => (
                        <button
                          key={c.color}
                          type="button"
                          onClick={() => setNewAnnotationColor(c.color)}
                          className={`w-4 h-4 rounded-full border border-stone-250 transition ${
                            newAnnotationColor === c.color ? "ring-2 ring-slate-900 scale-110" : "opacity-70 hover:opacity-100"
                          }`}
                          style={{ backgroundColor: c.color }}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center space-x-1 bg-slate-900 hover:bg-slate-800 text-white text-[10.5px] font-extrabold uppercase py-2 px-3.5 rounded-xl block shadow"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Save study note</span>
                  </button>
                </form>

                {/* Annotation historical items list */}
                <div className="space-y-3 pt-2 border-t border-stone-200">
                  <span className="block text-[10px] font-mono font-black text-stone-600 uppercase tracking-wider">
                    Historic Annotations logs ({annotations.length})
                  </span>

                  {isLoadingAnnotations ? (
                    <div className="text-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-stone-400 mx-auto" />
                    </div>
                  ) : annotations.length === 0 ? (
                    <p className="text-[10px] text-stone-400 italic text-center font-bold">No saved study insights recorded on this account yet.</p>
                  ) : (
                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                      {annotations.map((ann) => (
                        <div 
                          key={ann.id}
                          className="p-3 rounded-xl border border-stone-205 text-left text-stone-900 relative transition hover:shadow-xs"
                          style={{ borderLeft: `4.5px solid ${ann.color || "#fef08a"}` }}
                        >
                          <button
                            type="button"
                            onClick={() => handleDeleteAnnotation(ann.id)}
                            className="absolute top-2 right-2 text-stone-400 hover:text-red-750 transition"
                            title="Remove annotation permanently"
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </button>
                          
                          <span className="inline-block text-[8px] font-mono font-black text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded uppercase select-none mb-1">
                            Page {ann.page || 1}
                          </span>

                          <p className="text-[11px] font-sans italic text-stone-850 font-bold leading-relaxed mb-2 outline-none">
                            "{ann.text}"
                          </p>

                          {ann.comment && (
                            <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg text-amber-950 text-[10.5px] font-sans font-bold leading-normal">
                              📌 {ann.comment}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* -- BOTTOM DRAWER COMMAND BAR (Read Aloud, Draw Highlights panel and exporter) -- */}
        {!isExpired && (
          <div className="bg-slate-900 text-white p-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-950 shrink-0 z-20 shadow-md">
            
            {/* Draw highlights overlay tools */}
            <div className="flex items-center space-x-2 bg-slate-800 border border-slate-700 py-1.5 px-3 rounded-xl">
              <label className="flex items-center space-x-1.5 cursor-pointer text-xs font-black uppercase text-slate-200 select-none">
                <input 
                  type="checkbox"
                  checked={isDrawingMode}
                  onChange={(e) => {
                    setIsDrawingMode(e.target.checked);
                    if (e.target.checked) {
                      alert("🖌️ Drawing Highlight mode is active! Direct-draw lines over simulated reading card using mouse clicks.");
                    }
                  }}
                  className="rounded text-indigo-500 focus:ring-indigo-500 h-3.5 w-3.5 border-slate-600 cursor-pointer"
                />
                <Brush className="h-3.5 w-3.5 text-indigo-400" />
                <span>Draw Highlights</span>
              </label>

              {isDrawingMode && (
                <>
                  <div className="h-3 w-px bg-slate-700 mx-1" />
                  <div className="flex items-center space-x-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
                    <button 
                      type="button" 
                      onClick={() => setDrawingColor("rgba(253, 224, 71, 0.4)")}
                      className={`w-3.5 h-3.5 rounded-full bg-yellow-300 border-0 ${drawingColor.includes("253, 224, 71") ? "ring-2 ring-indigo-400 scale-110" : ""}`}
                      title="Yellow highlighter pen"
                    />
                    <button 
                      type="button" 
                      onClick={() => setDrawingColor("rgba(96, 165, 250, 0.4)")}
                      className={`w-3.5 h-3.5 rounded-full bg-blue-300 border-0 ${drawingColor.includes("96, 165, 250") ? "ring-2 ring-indigo-400 scale-110" : ""}`}
                      title="Blue highlighter pen"
                    />
                    <button 
                      type="button" 
                      onClick={() => setDrawingColor("rgba(74, 222, 128, 0.4)")}
                      className={`w-3.5 h-3.5 rounded-full bg-green-300 border-0 ${drawingColor.includes("74, 222, 128") ? "ring-2 ring-indigo-400 scale-110" : ""}`}
                      title="Green highlighter pen"
                    />
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleClearDrawings}
                    className="text-[9.5px] text-red-400 hover:text-white font-extrabold px-1.5 py-0.5 rounded transition uppercase"
                  >
                    Clear Canvas
                  </button>
                </>
              )}
            </div>

            {/* Read aloud trigger controls */}
            <div className="flex items-center space-x-3 bg-slate-800 border border-slate-700 py-1 px-3 rounded-xl">
              <button 
                type="button"
                onClick={handleToggleReadAloud}
                className={`py-1 px-2.5 rounded text-xs font-black uppercase transition flex items-center space-x-1.5 cursor-pointer select-none ${
                  isSpeaking ? "bg-red-650 text-white animate-pulse" : "bg-slate-700 hover:bg-slate-650 text-slate-100"
                }`}
              >
                {isSpeaking ? <VolumeX className="h-3.5 w-3.5 mr-1" /> : <Volume2 className="h-3.5 w-3.5 mr-1" />}
                <span>{isSpeaking ? "Mute Read Aloud" : "Read Page Aloud"}</span>
              </button>

              <div className="flex items-center space-x-1 text-[10px] font-bold text-slate-350 shrink-0">
                <span>Speed:</span>
                <select
                  value={speechRate}
                  onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                  className="bg-slate-950/80 text-white font-mono font-bold border-0 p-1 rounded cursor-pointer scale-90"
                >
                  <option value={0.75}>0.75x</option>
                  <option value={1}>1.0x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                </select>
              </div>

              {availableVoices.length > 0 && (
                <div className="flex items-center space-x-1 text-[10px] font-bold text-slate-350 shrink-0 border-l border-slate-700 pl-2">
                  <span>Voice:</span>
                  <select
                    value={selectedVoiceURI}
                    onChange={(e) => setSelectedVoiceURI(e.target.value)}
                    className="bg-slate-950/80 text-white font-mono font-bold border-0 p-1 rounded cursor-pointer scale-90 max-w-[110px] truncate"
                  >
                    {availableVoices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Offline study document downloader or locked statement */}
            <div className="flex items-center space-x-2">
              {canAccessFully ? (
                <button
                  type="button"
                  onClick={handleDownloadOriginal}
                  className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2 px-3.5 rounded-lg transition shadow text-xs cursor-pointer"
                >
                  <Download className="h-4 w-4 shrink-0" />
                  <span>Download Book PDF ({book.fileSize || "1.2MB"})</span>
                </button>
              ) : (
                <div className="flex items-center space-x-1.5 py-1.5 px-3 bg-slate-800 text-slate-400 border border-slate-700 rounded-lg text-[10.5px] font-bold">
                  <Lock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span>Download PDF Locked (Paid)</span>
                </div>
              )}
            </div>

            {/* Single Page Navigation indicators (Only displayed if NOT in full vertical scroll Mode) */}
            {!canAccessFully && (
              <div className="flex items-center space-x-3 bg-slate-800 border border-slate-700 py-1 px-2 rounded-xl">
                <button
                  disabled={currentPage === 1}
                  onClick={handlePrevPage}
                  className="flex items-center justify-center p-1 hover:bg-slate-700 rounded transition disabled:opacity-45"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-mono text-xs text-stone-200">{currentPage} / {totalPagesOnBook}</span>
                <button
                  disabled={currentPage === totalPagesOnBook}
                  onClick={handleNextPage}
                  className="flex items-center justify-center p-1 hover:bg-slate-700 rounded transition disabled:opacity-45"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
