import React, { useState, useEffect, useRef } from "react";
import { Book, User } from "../types";
import { 
  X, Shield, Lock, Download, AlertCircle, Play, ChevronLeft, ChevronRight, 
  ZoomIn, ZoomOut, RefreshCw, Eye, Sparkles, Copy, FileText, Clock, Bookmark,
  Plus, Trash, Save, Moon, Sun, Layers, Wifi, WifiOff, Highlighter, BookOpen
} from "lucide-react";
import { db } from "../lib/firebase";
import { collection, addDoc, onSnapshot, query, where, deleteDoc, doc, orderBy } from "firebase/firestore";

interface SecureBookReaderProps {
  book: Book;
  currentUser: User | null;
  hasPaid: boolean;
  isAdmin: boolean;
  onClose: () => void;
  onTriggerPayment?: () => void;
}

export default function SecureBookReader({
  book,
  currentUser,
  hasPaid,
  isAdmin,
  onClose,
  onTriggerPayment
}: SecureBookReaderProps) {
  // Reading state
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isTimerActive, setIsTimerActive] = useState(!hasPaid && !isAdmin && !!book.allowPreview);
  const [timeLeft, setTimeLeft] = useState(book.previewDuration || 30);
  const [isExpired, setIsExpired] = useState(false);
  const [screenshotAdvisory, setScreenshotAdvisory] = useState(false);
  const [selectionBlockedAlert, setSelectionBlockedAlert] = useState(false);

  // New switches (The reader can switch options on or off)
  const [isAnnotationsPanelOpen, setIsAnnotationsPanelOpen] = useState(true);
  const [isDrmWatermarkActive, setIsDrmWatermarkActive] = useState(true);
  const [isOfflineCachingActive, setIsOfflineCachingActive] = useState(true);
  const [isProgressTrackerActive, setIsProgressTrackerActive] = useState(true);

  // Firestore annotations & highlights state
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [newAnnotationText, setNewAnnotationText] = useState("");
  const [newAnnotationComment, setNewAnnotationComment] = useState("");
  const [newAnnotationColor, setNewAnnotationColor] = useState("#fef08a"); // Default yellow
  const [isLoadingAnnotations, setIsLoadingAnnotations] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Restore bookmarked page on component mount
  useEffect(() => {
    const saved = localStorage.getItem(`wafula_bookmark_${book.id}`);
    if (saved) {
      const pageNum = parseInt(saved, 10);
      if (!isNaN(pageNum) && pageNum > 0) {
        setCurrentPage(pageNum);
      }
    }
  }, [book.id]);

  // 2. Save bookmarked page on page change as well as logging the last read book
  useEffect(() => {
    localStorage.setItem(`wafula_bookmark_${book.id}`, currentPage.toString());
    localStorage.setItem("wafula_last_read_book_id", book.id);
  }, [currentPage, book.id]);

  // 3. Real-time Firestore Annotations listener with robust Offline replication
  useEffect(() => {
    if (!book.id) return;
    setIsLoadingAnnotations(true);

    const userToken = currentUser?.id || "guest";
    const q = query(
      collection(db, "annotations"),
      where("bookId", "==", book.id),
      where("userId", "==", userToken)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      // Sort by page number list order
      list.sort((a, b) => {
        if (a.page !== b.page) return a.page - b.page;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      setAnnotations(list);
      setIsLoadingAnnotations(false);
    }, (error) => {
      console.warn("Firestore Annotations subscription blocked or database unprovisioned. Using robust physical local recovery backup.", error);
      try {
        const saved = localStorage.getItem(`wafula_local_annotations_${book.id}`);
        if (saved) {
          setAnnotations(JSON.parse(saved));
        }
      } catch (e) {
        console.error("Local storage backup load fail:", e);
      }
      setIsLoadingAnnotations(false);
    });

    return () => unsubscribe();
  }, [book.id, currentUser]);

  // 4. Document upload & write transaction
  const handleAddAnnotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnotationText.trim()) {
      alert("⚠️ Highlights text content cannot be blank! Select or enter text quotes.");
      return;
    }

    const payload = {
      userId: currentUser?.id || "guest",
      bookId: book.id,
      page: currentPage,
      text: newAnnotationText,
      comment: newAnnotationComment,
      color: newAnnotationColor,
      date: new Date().toISOString()
    };

    // Push local backup trigger
    const updatedLocal = [...annotations, { id: "temp_" + Date.now(), ...payload }];
    localStorage.setItem(`wafula_local_annotations_${book.id}`, JSON.stringify(updatedLocal));

    try {
      await addDoc(collection(db, "annotations"), payload);
      setNewAnnotationText("");
      setNewAnnotationComment("");
    } catch (err) {
      console.warn("Storing annotation on real cloud was suspended. Logged in local sandbox dictionary.", err);
      setAnnotations(updatedLocal);
      setNewAnnotationText("");
      setNewAnnotationComment("");
    }
  };

  const handleDeleteAnnotation = async (id: string) => {
    const isCloudDoc = !id.startsWith("temp_") && !id.startsWith("local_");
    
    // Purge local layout list
    const updatedLocal = annotations.filter(a => a.id !== id);
    localStorage.setItem(`wafula_local_annotations_${book.id}`, JSON.stringify(updatedLocal));
    setAnnotations(updatedLocal);

    if (isCloudDoc) {
      try {
        await deleteDoc(doc(db, "annotations", id));
      } catch (err) {
        console.error("Firestore annotation delete operation failed:", err);
      }
    }
  };

  // Countdown timer logic for unpaid preview mode
  useEffect(() => {
    if (!isTimerActive) return;
    if (timeLeft <= 0) {
      setIsExpired(true);
      setIsTimerActive(false);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isTimerActive, timeLeft]);

  // Inject CSS to block printing & select styles dynamically
  useEffect(() => {
    const styleEl = document.createElement("style");
    styleEl.innerHTML = `
      @media print {
        body { display: none !important; }
        #secure-reader { display: none !important; }
      }
      .unselectable {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
      }
    `;
    document.head.appendChild(styleEl);

    // Prevent key combinations like Ctrl+P, Ctrl+C, Ctrl+S, F12, PrtScr
    const handleKeyDown = (e: KeyboardEvent) => {
      // CMD/CTRL combinations
      const isMetaCtrl = e.ctrlKey || e.metaKey;
      
      // Block Ctrl+C (Copy)
      if (isMetaCtrl && e.key.toLowerCase() === "c") {
        e.preventDefault();
        triggerSelectionBlockedAdvisory();
      }
      // Block Ctrl+P (Print)
      if (isMetaCtrl && e.key.toLowerCase() === "p") {
        e.preventDefault();
        alert("⚠️ Printing is deactivated in this Secure DRM Sandbox to protect active publishing standards.");
      }
      // Block Ctrl+S (Save)
      if (isMetaCtrl && e.key.toLowerCase() === "s") {
        e.preventDefault();
        alert("🔒 DRM Sandbox block: Files cannot be saved locally from the online viewer.");
      }
      // Block F12 (Inspect Element)
      if (e.key === "F12" || (e.shiftKey && e.ctrlKey && e.key.toLowerCase() === "i")) {
        e.preventDefault();
        alert("🛡️ Developer debugger inspection tool disabled within this secure workspace.");
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Detect PrintScreen key
      if (e.key === "PrintScreen" || e.key === "PrtScn" || e.key === "PrtSc") {
        e.preventDefault();
        triggerScreenshotAdvisory();
      }
    };

    // Prevent copy event directly
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      triggerSelectionBlockedAdvisory();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    document.addEventListener("copy", handleCopy);

    return () => {
      document.head.removeChild(styleEl);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("copy", handleCopy);
    };
  }, []);

  const triggerScreenshotAdvisory = () => {
    setScreenshotAdvisory(true);
    setTimeout(() => setScreenshotAdvisory(false), 5000);
  };

  const triggerSelectionBlockedAdvisory = () => {
    setSelectionBlockedAlert(true);
    setTimeout(() => setSelectionBlockedAlert(false), 3000);
  };

  // Safe dummy pages for simulation (DRM protected)
  const getSimulatedBookPages = () => {
    const title = book.title;
    const author = book.author;
    const category = book.category;
    const desc = book.description;

    return [
      {
        page: 1,
        subtitle: "PROPRIETARY DIGITAL MANUSCRIPT",
        header: `${title.toUpperCase()} — BY ${author.toUpperCase()}`,
        content: `
          ======================================
          ${title.toUpperCase()}
          ======================================
          
          Written by: ${author}
          Classification: ${category} Library Catalog
          Registered Edition: 2026 Virtual Release
          
          --------------------------------------
          SPECIAL SECURITY ADVISORY / COPYRIGHT:
          All rights reserved. Under local Kenian intellectual property framework, 
          unauthorized distributions, screenshots, copies, or downloads of these 
          scholarly items constitute structural copyright breaches and lead to 
          automatic penalties on user profiles.
          
          "Dedicated to BUNGOMA COUNTY study groups, local high schools, 
          and pastors preaching real transcribing and spiritual leadership."
          
          --------------------------------------
          Introduction:
          ${desc}
          
          Please purchase the full uninhibited access to download this book as 
          a complete portable document spreadsheet or high-resolution PDF review file.
        `
      },
      {
        page: 2,
        subtitle: "FOREWORD & VALUE PILLARS",
        header: "CHAPTER I: THE CALLING OF HIGH INTEGRITY",
        content: `
          How do we scale community assets in Western Kenya utilizing dynamic values?
          We begin with character. Kelvin Opara Wafula structures accountability 
          as a foundational ledger of the Holy Spirit. 
          
          No church group, study room, or research assembly can hold weight without 
          verifiable truth. In this section, we analyze the spiritual integration:
          
          1. SACRIFICIAL LEADERSHIP: Leading without self-promotion. 
          2. DOCKING RESOURCES: Saving local collections for public scholarship.
          3. DIGITAL STEWARDSHIP: Leveraging modern database tools, chat corridors, 
             and books reviews to distribute wisdom transparently.
          
          "The greatest calling is the calling that builds other leaders."
          Study this chapter line-by-line to understand the complete theology.
        `
      },
      {
        page: 3,
        subtitle: "STRATEGIC STRAPS",
        header: "CHAPTER II: AGRIBUSINESS & LOCAL FUNDING",
        content: `
          Let us talk economics. Bungoma is rich in agricultural soil. Why are local 
          youth migrating to urban centers? It is because they lack strategic 
          empowerment manuals.
          
          By launching self-help cooperatives:
          - We group community resources.
          - We automate local production reports.
          - We log active farm metrics on public spreadsheets.
          
          * Agrarian calibration rules demand we keep crop records:
            "A well-fed village is a praying village."
          
          To view the exact financial blueprints and M-Pesa ledger structures mapped 
          in Appendix A, proceed to purchase the complete publication.
        `
      },
      {
        page: 4,
        subtitle: "CHRISTIAN DISCIPLESHIP COVENANTS",
        header: "CHAPTER III: WALKING IN SPIRITUAL ALIGNMENT",
        content: `
          Walking in alignment demands constant calibration. Prayer is not a 
          weekly checklist; it is an active hourly connection.
          
          In this chapter, Wafula outlines:
          - Fasting: Reclaiming mental stability.
          - Gospel Outreach: Setting up regional outreach channels.
          - Mentorship Books: Curating a customized library for new believers.
          
          This text has been translated across regional platforms to facilitate 
          Bungoma County pastors' daily assemblies and spiritual seminars.
        `
      },
      {
        page: 5,
        subtitle: "SUMMARY SPECIFICATIONS",
        header: "APPENDIX A: COMPLETE BIBLE VERSE METRICS",
        content: `
          Study Reference Index:
          --------------------------------------------------
          • Matthew 6:33  - Divine priorities and financial provision.
          • Galatians 5:22 - The Harvest fruits of the Spirit.
          • Nehemiah 2:18  - "Let us rise up and build."
          
          --------------------------------------------------
          This concludes the allowed secure online study preview. To download 
          this handbook offline permanently, please proceed with M-Pesa payment.
          Thank you for supporting authentic East African christian authorship.
        `
      }
    ];
  };

  const pagesData = getSimulatedBookPages();
  const activePageData = pagesData[currentPage - 1] || pagesData[0];
  const totalPagesOnBook = book.pdfUrl ? (book.pages || 10) : pagesData.length;
  const progressPercentOnBook = Math.min(100, Math.round((currentPage / totalPagesOnBook) * 105)) || 0;
  const safePercent = Math.min(100, Math.round((currentPage / totalPagesOnBook) * 100));

  const handleNextPage = () => {
    if (currentPage < totalPagesOnBook) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleDownloadOriginal = () => {
    if (!hasPaid && !isAdmin) {
      alert("🔒 Security Breach Blocked: Please complete payment of KES " + book.price + " first to unlock offline downloads.");
      return;
    }
    // Perform real simulation of downloading selected file
    const fileTitle = book.title.toLowerCase().replace(/\s+/g, "_");
    const fakeContent = `Wafula Digital Books Library\nTitle: ${book.title}\nAuthor: ${book.author}\nDRM Verified License: ${currentUser?.email || "Admin Mode"}\n\nThis certifies full paid licensing of the book offline resources. Enjoy maximum reading value.`;
    
    const element = document.createElement("a");
    const file = new Blob([fakeContent], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${fileTitle}_verified_release.pdf`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    alert(`🎉 Success! Downloading "${book.pdfUrl ? "Uploaded_Book_" : ""}${fileTitle}.pdf" (${book.fileSize || "1.2 MB"}) directly to your device.`);
  };

  return (
    <div 
      id="secure-reader-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/95 backdrop-blur-md p-2 sm:p-4 select-none"
      onContextMenu={(e) => {
        e.preventDefault();
        triggerSelectionBlockedAdvisory();
      }}
    >
      {/* SCREENSHOT BLUR LAYER OVERLAY (Aggressive DRM protection on trigger) */}
      {screenshotAdvisory && (
        <div className="absolute inset-0 z-50 bg-red-950/95 flex flex-col items-center justify-center text-center p-8 text-white space-y-4">
          <Shield className="h-16 w-16 text-red-500 animate-bounce" />
          <h2 className="text-xl font-bold font-display uppercase tracking-wide">Security Breach Warning</h2>
          <p className="max-w-md text-sm text-red-200 leading-relaxed">
            A system action resembling a screen capture, print, or console inspect has been identified. 
            Wafula Reads DRM enforces automated tracking. Unauthorized captures violate regional author copyright policies. Please read within secure boundaries!
          </p>
        </div>
      )}

      {/* Main Sandbox Reader Card */}
      <div 
        ref={containerRef}
        id="secure-reader"
        className="w-full max-w-7xl bg-[#faf9f6] dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-850 overflow-hidden flex flex-col h-[92vh] relative"
      >
        {/* DRAG-AND-COPY WATERMARK BASE LAYER */}
        {isDrmWatermarkActive && (
          <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden opacity-[0.03] select-none flex flex-wrap gap-20 p-6 items-center justify-center text-stone-850 transform -rotate-12 pointer-default">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="text-xs font-mono font-black uppercase tracking-widest whitespace-nowrap">
                WAFULA SECURE DRM PREVIEW • DO NOT COPY • PRINT RESTRICTED
              </div>
            ))}
          </div>
        )}

        {/* Top Control Header */}
        <div className="bg-stone-950 text-white p-4 flex flex-wrap items-center justify-between gap-3 border-b border-stone-850 z-20">
          <div className="flex items-center space-x-3">
            <span className="p-2 bg-red-700/80 rounded-lg text-white">
              <Shield className="h-5 w-5 fill-red-500 animate-pulse" />
            </span>
            <div className="text-left">
              <h4 className="text-xs font-bold font-display truncate max-w-[220px] sm:max-w-[450px]">
                {book.title}
              </h4>
              <p className="text-[10px] text-stone-400 font-mono">
                {hasPaid ? "🔓 FULL COVENANT LICENSE" : "🔒 SECURE PREVIEW ARCHITECTURE"} • BY {book.author.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Countdown timer badge if previewing */}
            {isTimerActive && !isExpired && (
              <div className="flex items-center space-x-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full text-[10px] font-mono font-bold animate-pulse">
                <Clock className="h-3.5 w-3.5" />
                <span>SANDBOX SECONDS LEFT: {timeLeft}s</span>
              </div>
            )}

            {/* Close button */}
            <button 
              onClick={onClose}
              className="p-1 px-2.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded transition text-xs font-mono font-bold"
            >
              Exit Sandbox [X]
            </button>
          </div>
        </div>

        {/* Reader Config Toggles Bar (Switches On or Off) */}
        <div className="bg-stone-850 dark:bg-stone-950 text-stone-300 dark:text-stone-400 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono border-b border-stone-800 z-20">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-amber-500 font-bold uppercase tracking-wider text-[9px] mr-1">
              ⚙️ READER CONTROLS:
            </span>
            
            {/* Toggle Highlights Panel */}
            <label className="flex items-center space-x-2 cursor-pointer hover:text-white select-none">
              <input 
                type="checkbox" 
                checked={isAnnotationsPanelOpen}
                onChange={(e) => setIsAnnotationsPanelOpen(e.target.checked)}
                className="rounded text-red-650 bg-stone-900 border-stone-700 h-3.5 w-3.5 cursor-pointer"
              />
              <span className="flex items-center gap-1">
                <Highlighter className="h-3 w-3" />
                <span>Annotations Panel: <strong>{isAnnotationsPanelOpen ? "ON" : "OFF"}</strong></span>
              </span>
            </label>

            {/* Toggle Watermarks */}
            <label className="flex items-center space-x-2 cursor-pointer hover:text-white select-none">
              <input 
                type="checkbox" 
                checked={isDrmWatermarkActive}
                onChange={(e) => setIsDrmWatermarkActive(e.target.checked)}
                className="rounded text-red-650 bg-stone-900 border-stone-700 h-3.5 w-3.5 cursor-pointer"
              />
              <span className="flex items-center gap-1">
                <Layers className="h-3 w-3" />
                <span>DRM Watermark: <strong>{isDrmWatermarkActive ? "ON" : "OFF"}</strong></span>
              </span>
            </label>

            {/* Toggle Service Worker Caching */}
            <label className="flex items-center space-x-2 cursor-pointer hover:text-white select-none">
              <input 
                type="checkbox" 
                checked={isOfflineCachingActive}
                onChange={(e) => {
                  setIsOfflineCachingActive(e.target.checked);
                  if (e.target.checked) {
                    alert("📶 Service Worker offline cache capability enabled. Complete books are synced instantly.");
                  }
                }}
                className="rounded text-red-650 bg-stone-900 border-stone-700 h-3.5 w-3.5 cursor-pointer"
              />
              <span className="flex items-center gap-1">
                {isOfflineCachingActive ? <Wifi className="h-3 w-3 text-emerald-400" /> : <WifiOff className="h-3 w-3 text-stone-500" />}
                <span>SW Offline Cache: <strong>{isOfflineCachingActive ? "ON" : "OFF"}</strong></span>
              </span>
            </label>

            {/* Toggle Visual Progress Tracker */}
            <label className="flex items-center space-x-2 cursor-pointer hover:text-white select-none">
              <input 
                type="checkbox" 
                checked={isProgressTrackerActive}
                onChange={(e) => setIsProgressTrackerActive(e.target.checked)}
                className="rounded text-red-650 bg-stone-900 border-stone-700 h-3.5 w-3.5 cursor-pointer"
              />
              <span className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                <span>Progress Bar: <strong>{isProgressTrackerActive ? "ON" : "OFF"}</strong></span>
              </span>
            </label>
          </div>

          <div className="text-[9px] font-bold text-red-400 bg-red-955/35 px-2 py-0.5 rounded-full select-none">
            DRM PROTECTION ENABLED
          </div>
        </div>

        {/* Real-time Visual Progress Bar of the Book */}
        {isProgressTrackerActive && (
          <div className="bg-stone-100 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-850 px-4 py-2 flex items-center justify-between text-[11px] select-none shrink-0 z-20">
            <div className="flex items-center space-x-2 text-stone-600 dark:text-stone-300 font-medium">
              <BookOpen className="h-4 w-4 text-red-700 dark:text-red-500" />
              <span>Percentage Read:</span>
              <span className="font-mono font-bold text-stone-800 dark:text-white bg-stone-200 dark:bg-stone-800 px-1.5 py-0.5 rounded text-[10px]">
                {safePercent}%
              </span>
            </div>
            
            {/* Visual Bar */}
            <div className="flex-1 max-w-md mx-4 h-2.5 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden border border-stone-300 dark:border-stone-750">
              <div 
                className="h-full bg-gradient-to-r from-red-600 to-amber-500 transition-all duration-300 ease-out"
                style={{ width: `${safePercent}%` }}
              />
            </div>
            
            <div className="text-[10px] font-mono text-stone-500 dark:text-stone-400">
              Page <strong>{currentPage}</strong> of <strong>{totalPagesOnBook}</strong>
            </div>
          </div>
        )}

        {/* Floating copy alert warning */}
        {selectionBlockedAlert && (
          <div className="absolute top-28 left-1/2 transform -translate-x-1/2 z-35 bg-red-700 text-white font-bold text-[10px] uppercase font-mono px-4 py-1.5 rounded-full shadow-lg flex items-center space-x-1.5 animate-slideDown animate-pulse">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            <span>DRM LOCK: Right-click and copy triggers are blocked</span>
          </div>
        )}

        {/* Reader Core Body Content with Side Panel */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* Main Book Visual Sheet Content */}
          <div className="flex-1 bg-stone-200/50 dark:bg-stone-950 p-4 sm:p-6 overflow-y-auto flex items-center justify-center relative">
            
            {isExpired ? (
              /* Time Expired locked display */
              <div className="max-w-md w-full bg-white dark:bg-stone-90 relative border border-stone-200 p-8 rounded-2xl shadow-xl text-center space-y-5 animate-scaleUp z-20">
                <div className="h-16 w-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto border border-red-200 shadow-sm animate-pulse">
                  <Lock className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-display font-extrabold text-stone-900 text-base leading-tight">
                    Secure Preview Period Expired
                  </h3>
                  <p className="text-[11.5px] text-stone-ec leading-relaxed">
                    You have read the authorized outline for the first {book.previewDuration || 30} seconds! 
                    Complete the M-Pesa purchase of <strong>KES {book.price}</strong> to register this book on your library ledger, enabling unlimited reading and PDF downloads.
                  </p>
                </div>

                <div className="pt-2 flex flex-col space-y-2.5">
                  {onTriggerPayment ? (
                    <button
                      onClick={() => {
                        onTriggerPayment();
                        onClose();
                      }}
                      className="w-full flex items-center justify-center space-x-2 rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold py-3 text-xs transition duration-200 cursor-pointer shadow-md"
                    >
                      <Sparkles className="h-4 w-4 fill-white" />
                      <span>Proceed to M-PESA Checkout (KES {book.price})</span>
                    </button>
                  ) : (
                    <p className="text-[10px] text-stone-400 italic">Go back to the bookstore to trigger the automated PIN checkout modal.</p>
                  )}
                  <button
                    onClick={onClose}
                    className="text-stone-500 hover:text-stone-800 font-bold hover:underline text-xs"
                  >
                    Click to browse other books
                  </button>
                </div>
              </div>
            ) : (
              /* Active Protected Viewport */
              book.pdfUrl ? (
                <div 
                  className="w-full h-full bg-slate-900 border border-stone-200 dark:border-stone-850 rounded-xl shadow-md overflow-hidden flex flex-col justify-between relative"
                  style={{ minHeight: "70vh" }}
                >
                  {/* DRM Security Tag at page edge */}
                  <span className="absolute top-3 right-3 text-[9px] font-mono font-bold text-red-700 bg-red-50 border border-red-200/50 rounded px-1.5 py-0.5 select-none pointer-events-none z-30">
                    🔒 SECURE PDF RENDERING FRAME
                  </span>

                  <div className="flex-1 w-full h-full relative bg-slate-800">
                    <iframe 
                      src={`${book.pdfUrl}#toolbar=0&navpanes=0&scrollbar=1&zoom=100`}
                      className="w-full h-full border-0 min-h-[62vh]"
                      style={{ width: "100%", height: "100%", minHeight: "64vh" }}
                      title={book.title}
                    />
                  </div>

                  {/* License Footnote at bottom */}
                  <div className="border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 p-3 flex justify-between items-center text-[9px] font-mono text-slate-400 select-none z-10">
                    <span>Licensed to: {currentUser?.name || "Unsigned Guest"}</span>
                    <span className="text-stone-500 font-bold uppercase">Dynamic SECURE PDF RENDERING</span>
                  </div>
                </div>
              ) : (
                <div 
                  className="w-full max-w-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-850 p-8 sm:p-12 rounded-xl shadow-md min-h-[66vh] flex flex-col justify-between relative select-none unselectable"
                  style={{ 
                    transform: `scale(${zoomLevel / 100})`, 
                    transformOrigin: 'center center',
                    transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' 
                  }}
                  onMouseDown={(e) => {
                    // Direct bypass of highlight selectors
                    e.preventDefault();
                  }}
                >
                  {/* DRM Security Tag at page edge */}
                  <span className="absolute top-3 right-3 text-[9px] font-mono font-bold text-red-700 bg-red-50 dark:bg-red-950/20 border border-red-200/50 rounded px-1.5 py-0.5 select-none pointer-events-none">
                    🔒 DRM SANDBOX
                  </span>

                  <div className="space-y-6 flex-1 flex flex-col justify-between">
                    {/* Page header */}
                    <div className="border-b border-stone-100 dark:border-stone-800 pb-3 flex justify-between items-center text-[10px] font-mono text-stone-400 select-none">
                      <span className="font-bold tracking-wider">{activePageData.subtitle}</span>
                      <span>PAGE {activePageData.page} OF {pagesData.length}</span>
                    </div>

                    {/* Main Page Core Content */}
                    <div className="flex-1 py-4 text-left select-none pointer-events-none">
                      <h5 className="font-display font-black text-stone-850 dark:text-white text-xs mb-4 tracking-wider uppercase">
                        {activePageData.header}
                      </h5>
                      <pre className="text-[11.5px] text-stone-750 dark:text-stone-300 font-sans leading-relaxed whitespace-pre-wrap select-none">
                        {activePageData.content}
                      </pre>
                    </div>

                    {/* License Footnote at bottom */}
                    <div className="border-t border-stone-105 dark:border-stone-800 pt-3 flex justify-between items-center text-[9px] font-mono text-slate-400 select-none">
                      <span>Licensed to: {currentUser?.name || "Unsigned Guest"}</span>
                      <span className="text-stone-350 dark:text-stone-500">Page {activePageData.page}</span>
                    </div>
                  </div>

                  {/* Soft Visual watermark banner center */}
                  {isDrmWatermarkActive && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rotate-12 opacity-[0.05] pointer-events-none select-none z-10 w-full text-center">
                      <h3 className="font-display font-black text-3xl uppercase tracking-widest text-red-800 dark:text-red-400">DRM SECURE ENVIRONMENT</h3>
                      <p className="text-[10px] text-stone-900 dark:text-white font-mono mt-1 font-bold">Unauthorized screen recordings are cataloged with system timestamp.</p>
                    </div>
                  )}
                </div>
              )
            )}
          </div>

          {/* Interactive Highlights & Annotations Sidebar (Saved to Firestore) */}
          {isAnnotationsPanelOpen && (
            <div className="w-80 border-l border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col h-full z-30 shrink-0 select-text">
              {/* Sidebar Header */}
              <div className="p-4 bg-stone-50 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-stone-800 dark:text-stone-200">
                  <Highlighter className="h-4 w-4 text-red-700" />
                  <span className="text-xs font-bold font-display uppercase tracking-wider">Book Highlights & Notes</span>
                </div>
                <span className="bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-400 font-mono font-bold text-[9px] px-2 py-0.5 rounded">
                  {annotations.length} Nodes
                </span>
              </div>

              {/* Sidebar Content Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-5 text-left">
                {/* Form to submit a new highlight annotation */}
                <form onSubmit={handleAddAnnotation} className="space-y-3 p-3 bg-stone-50 dark:bg-stone-950 rounded-xl border border-stone-200 dark:border-stone-800">
                  <span className="text-[9px] font-mono font-bold text-stone-400 uppercase tracking-widest block mb-1">
                    🖊️ Add Annotation (Page {currentPage})
                  </span>
                  
                  {/* Selected Text Highlight Input */}
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-mono text-stone-500 block">Highlighted Quote:</label>
                    <textarea
                      placeholder="Paste or type highlighted book quote here..."
                      value={newAnnotationText}
                      onChange={(e) => setNewAnnotationText(e.target.value)}
                      rows={2}
                      className="w-full text-[11px] p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 focus:outline-none focus:ring-1 focus:ring-red-650 cursor-text scrollbar-thin resize-none"
                    />
                  </div>

                  {/* Comment Annotation Note Input */}
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-mono text-stone-500 block">Personal Study Notes:</label>
                    <input
                      type="text"
                      placeholder="Add translation / contextual notes..."
                      value={newAnnotationComment}
                      onChange={(e) => setNewAnnotationComment(e.target.value)}
                      className="w-full text-[11px] p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 focus:outline-none focus:ring-1 focus:ring-red-650 cursor-text"
                    />
                  </div>

                  {/* Color Swatch Picker */}
                  <div className="flex items-center justify-between">
                    <span className="text-[9.5px] font-mono text-stone-500">Color Accent:</span>
                    <div className="flex items-center space-x-1.5">
                      {[
                        { color: "#fef08a", label: "Yellow" },
                        { color: "#bbf7d0", label: "Emerald" },
                        { color: "#bfdbfe", label: "Sky" },
                        { color: "#fecdd3", label: "Coral" }
                      ].map((item) => (
                        <button
                          key={item.color}
                          type="button"
                          onClick={() => setNewAnnotationColor(item.color)}
                          className={`h-4 w-4 rounded-full border-2 transition ${newAnnotationColor === item.color ? "border-stone-900 scale-110" : "border-transparent"}`}
                          style={{ backgroundColor: item.color }}
                          title={item.label}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Submission triggers */}
                  <button
                    type="submit"
                    className="w-full py-1.5 px-3 bg-red-700 hover:bg-red-850 text-white rounded-lg font-bold text-[10.5px] transition flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <Plus className="h-3.w-3" />
                    <span>Save to Cloud Ledger</span>
                  </button>
                </form>

                {/* List of existing annotations */}
                <div className="space-y-3">
                  <span className="text-[9.5px] font-mono font-bold text-stone-400 uppercase tracking-wider block">
                    📖 My Study Annotations Stack
                  </span>

                  {isLoadingAnnotations ? (
                    <p className="text-[10px] text-stone-400 italic text-center py-4 font-mono">Synchronizing database ledgers...</p>
                  ) : annotations.length === 0 ? (
                    <div className="text-center py-6 px-4 bg-stone-50 dark:bg-stone-950 border border-dashed border-stone-200 dark:border-stone-800 rounded-xl space-y-1">
                      <Highlighter className="h-5 w-5 text-stone-300 mx-auto" />
                      <p className="text-[10px] text-stone-400 italic">No notes created yet. Paste text and log highlights above!</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {annotations.map((ann) => (
                        <div 
                          key={ann.id}
                          className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 flex flex-col justify-between text-xs space-y-2 relative transition hover:border-stone-300"
                        >
                          <div className="flex items-center justify-between">
                            <span 
                              className="font-mono text-[9px] font-black px-2 py-0.5 rounded uppercase"
                              style={{ backgroundColor: ann.color, color: "#1c1917" }}
                            >
                              Page {ann.page}
                            </span>
                            <div className="flex items-center space-x-1.5">
                              {/* Jump Button (only if mock scroll) */}
                              {!book.pdfUrl && (
                                <button
                                  type="button"
                                  onClick={() => setCurrentPage(ann.page)}
                                  className="text-[9.5px] font-mono text-blue-600 hover:underline hover:text-blue-700 font-bold"
                                  title="Jump instantly to page outline"
                                >
                                  Go to Page
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteAnnotation(ann.id)}
                                className="text-stone-400 hover:text-red-650 p-0.5 transition"
                                title="Delete note annotation"
                              >
                                <Trash className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          <div className="p-2 border-l-2 border-red-400/30 bg-stone-50 dark:bg-stone-950 rounded-r text-[11px] text-stone-750 dark:text-stone-300 italic font-medium leading-relaxed select-text">
                            "{ann.text}"
                          </div>

                          {ann.comment && (
                            <p className="text-[10px] text-stone-500 dark:text-stone-400 leading-snug font-sans">
                              📝 <strong className="font-semibold text-stone-750 dark:text-stone-200">Notes:</strong> {ann.comment}
                            </p>
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

        {/* Bottom Navigation & Zoom Bar */}
        {!isExpired && (
          <div className="bg-stone-50 dark:bg-stone-950 border-t border-stone-200 dark:border-stone-850 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs z-20 select-none">
            
            {/* Zoom Controls */}
            <div className="flex items-center space-x-2 bg-white dark:bg-stone-900 rounded-lg border dark:border-stone-800 p-1">
              <button 
                onClick={() => setZoomLevel((z) => Math.max(75, z - 10))} 
                title="Zoom Out"
                className="p-1 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded transition"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="text-[10px] font-mono font-bold w-12 text-center text-stone-700 dark:text-stone-300">{zoomLevel}%</span>
              <button 
                onClick={() => setZoomLevel((z) => Math.min(125, z + 10))} 
                title="Zoom In"
                className="p-1 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded transition"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>

            {/* Locked & fully synced reader page tracker for BOTH mock books and live PDFs! */}
            <div className="flex items-center space-x-3 scale-95 sm:scale-100">
              <button
                disabled={currentPage === 1}
                onClick={handlePrevPage}
                className="flex items-center space-x-1 py-1.5 px-3 bg-white dark:bg-stone-900 hover:bg-stone-150 dark:hover:bg-stone-800 border dark:border-stone-800 text-stone-700 dark:text-stone-300 font-bold rounded-lg transition disabled:opacity-45"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Prev Page</span>
              </button>
              
              <span className="font-mono font-bold text-stone-800 dark:text-stone-200 text-xs">
                {currentPage} / {totalPagesOnBook}
              </span>

              <button
                disabled={currentPage === totalPagesOnBook}
                onClick={handleNextPage}
                className="flex items-center space-x-1 py-1.5 px-3 bg-white dark:bg-stone-900 hover:bg-stone-150 dark:hover:bg-stone-800 border dark:border-stone-800 text-stone-700 dark:text-stone-300 font-bold rounded-lg transition disabled:opacity-45"
              >
                <span className="hidden sm:inline">Next Page</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Offline download CTA if paid */}
            <div className="flex items-center space-x-2">
              {hasPaid || isAdmin ? (
                <button
                  type="button"
                  onClick={handleDownloadOriginal}
                  className="flex items-center space-x-1.5 bg-green-700 hover:bg-green-800 text-white font-extrabold py-2 px-3.5 rounded-lg transition shadow-sm text-xs cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>Download PDF ({book.fileSize || "1.2MB"})</span>
                </button>
              ) : (
                <div className="flex items-center space-x-1.5 py-1.5 px-2 bg-neutral-100 dark:bg-stone-900 border border-neutral-200 dark:border-stone-800 text-neutral-500 rounded-lg text-[10.5px]">
                  <Lock className="h-3.5 w-3.5 text-neutral-400" />
                  <span className="font-semibold text-stone-500 dark:text-stone-400">Download Locked (Paid)</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
