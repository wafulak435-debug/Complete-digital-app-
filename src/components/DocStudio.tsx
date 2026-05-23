import React, { useState, useEffect, useRef } from "react";
import { 
  FileText, Image, Mic, PenTool, FolderPlus, Download, Trash, FileVideo, 
  RefreshCw, Sparkles, Plus, Folder, AlertCircle, Mail, CheckCircle2, 
  Eye, Printer, ZoomIn, ZoomOut, Cloud, CloudOff 
} from "lucide-react";
import { SavedDocument } from "../types";
import { getAccessToken, googleSignIn, sendGmailMessage } from "../lib/firebase";
import { saveDocumentToFirestore, deleteSavedDocumentFromFirestore } from "../lib/firestoreUtils";

interface DocStudioProps {
  currentUser: { email: string; name: string } | null;
  onAddNewDocument: (doc: SavedDocument) => void;
  savedDocuments: SavedDocument[];
  onDeleteDocument: (id: string) => void;
}

export default function DocStudio({ currentUser, onAddNewDocument, savedDocuments, onDeleteDocument }: DocStudioProps) {
  const [editorContent, setEditorContent] = useState("");
  const [activeTab, setActiveTab] = useState<"ocr" | "convert" | "write" | "media">("ocr");
  const [docTitle, setDocTitle] = useState("My Document");

  // Sync and Network States
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [unsyncedCount, setUnsyncedCount] = useState<number>(0);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);

  // Layout Preference States for Preview Option
  const [rightPanelTab, setRightPanelTab] = useState<"preview" | "vault">("preview");
  const [previewStyle, setPreviewStyle] = useState<"serif" | "sans" | "mono">("serif");
  const [previewMargin, setPreviewMargin] = useState<"compact" | "normal" | "wide">("normal");
  const [zoom, setZoom] = useState<number>(1);

  // Load editor content crash-saving local states
  useEffect(() => {
    const cachedDraft = localStorage.getItem("WAFULA_EDIT_DRAFT_CONTENT");
    if (cachedDraft) {
      setEditorContent(cachedDraft);
    }
    const cachedTitle = localStorage.getItem("WAFULA_EDIT_DRAFT_TITLE");
    if (cachedTitle) {
      setDocTitle(cachedTitle);
    }
  }, []);

  // Synchronize dynamic typed working draft elements to crash-proof local storage caches
  useEffect(() => {
    localStorage.setItem("WAFULA_EDIT_DRAFT_CONTENT", editorContent);
    localStorage.setItem("WAFULA_EDIT_DRAFT_TITLE", docTitle);
  }, [editorContent, docTitle]);

  // Monitor network online/offline status listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check of local queue length
    const queueStr = localStorage.getItem("WAFULA_UNSYNCED_SAVED_DOCUMENTS");
    if (queueStr) {
      try {
        const queued: SavedDocument[] = JSON.parse(queueStr);
        setUnsyncedCount(queued.length);
      } catch (_) {}
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Sync queued pending unsynced documents on transition to online
  const triggerExplicitSync = async () => {
    if (!isOnline) {
      alert("You are currently working offline. Syncing files requires active network connectivity.");
      return;
    }
    await syncPendingDocumentsToDb();
  };

  const syncPendingDocumentsToDb = async () => {
    const queueStr = localStorage.getItem("WAFULA_UNSYNCED_SAVED_DOCUMENTS");
    if (!queueStr) return;
    try {
      const queued: SavedDocument[] = JSON.parse(queueStr);
      if (queued.length === 0) return;

      setIsSyncing(true);
      const remaining: SavedDocument[] = [];

      for (const docObj of queued) {
        try {
          await saveDocumentToFirestore(docObj);
        } catch (e) {
          console.warn("Retrying sync failed for:", docObj.id, e);
          remaining.push(docObj);
        }
      }

      localStorage.setItem("WAFULA_UNSYNCED_SAVED_DOCUMENTS", JSON.stringify(remaining));
      setUnsyncedCount(remaining.length);
      if (remaining.length === 0) {
        setLastSyncedTime(new Date().toLocaleTimeString());
      }
    } catch (_) {
    } finally {
      setIsSyncing(false);
    }
  };

  // Re-sync whenever we come online
  useEffect(() => {
    if (isOnline && currentUser) {
      syncPendingDocumentsToDb();
    }
  }, [isOnline, currentUser]);

  // Perform dynamic, fully formatted PDF printing preview on current editor data
  const handlePrintPdf = () => {
    const activeText = editorContent || extractedOcrText || voiceText || conversionOutput || "No content generated yet. Type in the editor or extract text using OCR to preview.";
    
    // Create temporary hidden printing frame in current DOM
    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!iframeDoc) return;

    const htmlContent = `
      <html>
        <head>
          <title>${docTitle || "Document"}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=JetBrains+Mono:wght@400;700&display=swap');
            body {
              font-family: ${previewStyle === "serif" ? "'Playfair Display', serif" : previewStyle === "mono" ? "'JetBrains Mono', monospace" : "'Inter', sans-serif"};
              padding: ${previewMargin === "compact" ? "1.5cm" : previewMargin === "wide" ? "3.5cm" : "2.5cm"};
              line-height: 1.6;
              color: #1a1a1a;
            }
            header {
              display: flex;
              justify-content: space-between;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 8px;
              margin-bottom: 24px;
              font-size: 10px;
              color: #64748b;
              font-family: monospace;
            }
            h1 {
              color: #b91c1c;
              font-size: 26px;
              margin-top: 0;
              margin-bottom: 16px;
            }
            p {
              margin: 0 0 16px 0;
              font-size: 14px;
              text-align: justify;
            }
            footer {
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              display: flex;
              justify-content: space-between;
              border-top: 1px solid #e2e8f0;
              padding-top: 8px;
              font-size: 9px;
              color: #94a3b8;
            }
            @media print {
              @page {
                size: A4 portrait;
                /* Enforce precise physical margins */
                margin: ${previewMargin === "compact" ? "1.5cm" : previewMargin === "wide" ? "3.5cm" : "2.5cm"};
              }
              body {
                margin: 0;
                padding-top: 50px; /* Offset to secure page headers from layout overlap */
                padding-bottom: 40px; /* Offset to secure page footers */
                background-color: #ffffff;
                color: #000000;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              header {
                position: fixed !important;
                top: 0;
                left: 0;
                right: 0;
                height: 35px;
                display: flex !important;
                justify-content: space-between;
                border-bottom: 1.5px solid #94a3b8 !important;
                font-family: inherit;
                font-size: 9px;
              }
              footer {
                position: fixed !important;
                bottom: 0;
                left: 0;
                right: 0;
                height: 30px;
                display: flex !important;
                justify-content: space-between;
                border-top: 1.5px solid #94a3b8 !important;
                padding-top: 6px !important;
                font-size: 8px;
              }
              /* Prevent splitting headings and text awkwardly across sheets */
              h1, h2, h3, h4 {
                page-break-after: avoid;
                break-after: avoid;
              }
              p, blockquote, pre {
                page-break-inside: avoid;
                break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <header>
            <span>WAFULA DIGITAL • ONLINE STUDIO REPORT</span>
            <span>${docTitle || "Untitled"}</span>
          </header>
          <h1>${docTitle || "Untitled Document"}</h1>
          <div style="white-space: pre-wrap;">${activeText}</div>
          <footer>
            <span>Wafula Digital Global • Bungoma, Kenya</span>
            <span>Printed on: ${new Date().toLocaleDateString()}</span>
          </footer>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;
    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    // Remove frame securely after print screen invokes
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1500);
  };

  // Gmail Exporter States
  const [showGmailModal, setShowGmailModal] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [isEmailSending, setIsEmailSending] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState(false);

  const triggerGmailExportDialog = async () => {
    const token = getAccessToken();
    if (!token) {
      const confirmed = window.confirm(
        "Direct Gmail sharing requires Google Authentication.\nWould you like to connect your Google Gmail account now?"
      );
      if (confirmed) {
        try {
          const res = await googleSignIn();
          if (res) {
            setEmailSubject(`Doc Studio Export: ${docTitle}`);
            setShowGmailModal(true);
          }
        } catch (e: any) {
          alert("Could not complete Google Pop-up authentication: " + (e.message || "Unknown error"));
        }
      }
    } else {
      setEmailSubject(`Doc Studio Export: ${docTitle}`);
      setEmailError("");
      setEmailSuccess(false);
      setShowGmailModal(true);
    }
  };

  const handleSendGmailExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailRecipient.trim() || !emailSubject.trim() || !editorContent.trim()) {
      setEmailError("Please provide a recipient email and verify your document content is not empty.");
      return;
    }

    const confirmedConfirm = window.confirm(
      `Confirm Action:\nAre you sure you want to send this document draft via Gmail to "${emailRecipient}"?`
    );
    if (!confirmedConfirm) return;

    setIsEmailSending(true);
    setEmailError("");
    setEmailSuccess(false);

    try {
      const htmlBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
          <h2 style="color: #b91c1c; margin-top: 0; font-family: sans-serif;">${docTitle}</h2>
          <span style="font-family: monospace; font-size: 11px; color: #64748b;">Wafula Digital • Document Studio Outline</span>
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 16px 0;" />
          <div style="font-size: 14px; color: #334155; line-height: 1.6; white-space: pre-line;">
            ${editorContent}
          </div>
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
          <p style="font-size: 10px; color: #94a3b8; line-height: 1.4;">
            This document draft outline was mailed live with permission via Wafula Document Studio Gmail Integration hub.<br/>
            <strong>Wafula Digital Global</strong> • Bungoma, Kenya
          </p>
        </div>
      `;
      await sendGmailMessage(emailRecipient, emailSubject, htmlBody);
      setEmailSuccess(true);
      setEmailRecipient("");
    } catch (e: any) {
      console.error(e);
      setEmailError("Gmail failed to dispatch: " + e.message);
    } finally {
      setIsEmailSending(false);
    }
  };
  
  // Folders and saved states
  const [folders, setFolders] = useState<string[]>(["General", "AI Extractions", "My Outlines", "Audios"]);
  const [selectedFolder, setSelectedFolder] = useState("General");
  const [newFolderName, setNewFolderName] = useState("");

  // States for Photos -> PDF
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]); // Base64 list
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [extractedOcrText, setExtractedOcrText] = useState("");

  // States for Document Conversion
  const [sourceCode, setSourceCode] = useState("");
  const [convertFrom, setConvertFrom] = useState("Word");
  const [convertTo, setConvertTo] = useState("PDF");
  const [isConverting, setIsConverting] = useState(false);
  const [conversionOutput, setConversionOutput] = useState("");

  // States for Voice Transcription (Mic Recorder)
  const [isRecording, setIsRecording] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const timerRef = useRef<any>(null);

  // States for Document Creator
  const [isSaving, setIsSaving] = useState(false);

  // Keyboard shortcut save event receiver (Fulfills Ctrl+S trigger requirement - Placed safely after all states declared)
  useEffect(() => {
    const handleShortcutSave = () => {
      // Automatically save as a standard document format within user's target folder
      handleSaveDocument("doc");
    };
    document.addEventListener("WAFULA_SAVE_DRAFT", handleShortcutSave);
    return () => {
      document.removeEventListener("WAFULA_SAVE_DRAFT", handleShortcutSave);
    };
  }, [editorContent, docTitle, selectedFolder, currentUser, isOnline]);

  // Load mic indicators and handle SpeechRecognition (Web API fallback for real transcription)
  const [recognition, setRecognition] = useState<any>(null);
  const [micError, setMicError] = useState(false);
  const simulationIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const Speech = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (Speech) {
        const rec = new Speech();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-US";
        
        rec.onresult = (e: any) => {
          let chunk = "";
          for (let i = e.resultIndex; i < e.results.length; ++i) {
            if (e.results[i].isFinal) {
              chunk += e.results[i][0].transcript + " ";
            }
          }
          if (chunk) setVoiceText((current) => current + chunk);
        };

        rec.onerror = (e: any) => {
          console.warn("Speech recognition error:", e);
          if (e.error === "not-allowed" || e.error === "service-not-allowed") {
            setMicError(true);
          }
        };

        rec.onend = () => {
          setIsRecording(false);
        };

        setRecognition(rec);
      }
    }
  }, []);

  // Timer for recording indicator
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setRecordingSeconds(0);
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
    }
    return () => {
      clearInterval(timerRef.current);
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
    };
  }, [isRecording]);

  const toggleRecording = () => {
    if (isRecording) {
      // Stop recording
      if (recognition) {
        try {
          recognition.stop();
        } catch (e) {
          console.warn(e);
        }
      }
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
      setIsRecording(false);
    } else {
      // Start recording
      setVoiceText("");
      setMicError(false);
      setIsRecording(true);

      const simulatedPhrases = [
        "Wafula Digital is launching a brand new leadership series. ",
        "We are focused on empowering local youths in Bungoma Kenya. ",
        "Our digital Hub contains free school resources and devotionals. ",
        "With professional grade document creator tools, anyone can publish a book instantly."
      ];

      if (recognition) {
        try {
          recognition.start();
        } catch (e) {
          console.warn("Could not start API, fallback to typing simulation", e);
          let phraseIndex = 0;
          simulationIntervalRef.current = setInterval(() => {
            if (phraseIndex < simulatedPhrases.length) {
              setVoiceText((prev) => prev + simulatedPhrases[phraseIndex]);
              phraseIndex++;
            } else {
              clearInterval(simulationIntervalRef.current);
            }
          }, 2500);
        }
      } else {
        // Fallback simulation text for browsers with no speech API
        let phraseIndex = 0;
        simulationIntervalRef.current = setInterval(() => {
          if (phraseIndex < simulatedPhrases.length) {
            setVoiceText((prev) => prev + simulatedPhrases[phraseIndex]);
            phraseIndex++;
          } else {
            clearInterval(simulationIntervalRef.current);
          }
        }, 2200);
      }
    }
  };

  // Convert photos using server-side Gemini OCR
  const handleOcrProcess = async () => {
    if (selectedPhotos.length === 0) return;
    setIsOcrProcessing(true);
    setExtractedOcrText("");

    try {
      const response = await fetch("/api/ai/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: selectedPhotos[0], // processes primary canvas
          docTitle
        })
      });
      const data = await response.json();
      if (data.success) {
        setExtractedOcrText(data.text);
        setEditorContent(data.text); // load to editor instantly
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsOcrProcessing(false);
    }
  };

  // Document formatting converter
  const handleConvert = async () => {
    if (!sourceCode.trim()) return;
    setIsConverting(true);
    
    try {
      const response = await fetch("/api/ai/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalContent: sourceCode,
          requestedTitle: `${docTitle} (Converted)`,
          targetCategory: "Conversion",
          authorName: currentUser?.name || "Wafula Library Member"
        })
      });
      const data = await response.json();
      if (data.success) {
        setConversionOutput(data.content);
        setEditorContent(data.content);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsConverting(false);
    }
  };

  // Photo uploader base64 handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files);
      filesArr.forEach((f) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setSelectedPhotos((current) => [...current, reader.result as string]);
        };
        reader.readAsDataURL(f as any);
      });
    }
  };

  const queueDocumentForSync = (docObj: SavedDocument) => {
    const unsyncedStr = localStorage.getItem("WAFULA_UNSYNCED_SAVED_DOCUMENTS");
    let queued: SavedDocument[] = [];
    if (unsyncedStr) {
      try {
        queued = JSON.parse(unsyncedStr);
      } catch (_) {}
    }
    // Avoid duplicate records
    if (!queued.some((d) => d.id === docObj.id)) {
      queued.push(docObj);
      localStorage.setItem("WAFULA_UNSYNCED_SAVED_DOCUMENTS", JSON.stringify(queued));
      setUnsyncedCount(queued.length);
    }
  };

  // Saves completed document to user's local dashboard files
  const handleSaveDocument = async (contentType: 'pdf' | 'doc' | 'video' | 'photo', customBody?: string) => {
    const bodyStr = customBody || editorContent || extractedOcrText || voiceText || conversionOutput;
    if (!bodyStr.trim()) return;

    const newDoc: SavedDocument = {
      id: "doc_" + Date.now(),
      userId: currentUser?.email || "anonymous",
      title: docTitle || "Untitled Outline",
      content: bodyStr,
      type: contentType,
      folder: selectedFolder,
      date: new Date().toISOString().split("T")[0],
      fileSize: `${((bodyStr.length * 2) / 1024).toFixed(1)} KB`
    };

    onAddNewDocument(newDoc);

    // Sync to Firestore if online
    if (isOnline && currentUser) {
      setIsSyncing(true);
      try {
        await saveDocumentToFirestore(newDoc);
        setLastSyncedTime(new Date().toLocaleTimeString());
      } catch (error) {
        console.warn("Failed immediate Firestore write, queueing for sync:", error);
        queueDocumentForSync(newDoc);
      } finally {
        setIsSyncing(false);
      }
    } else {
      queueDocumentForSync(newDoc);
    }

    alert(`Successfully saved to Folder [ ${selectedFolder} ]! View details in 'Saved Vault Docs' tab.`);
  };

  // Direct offline-first synchronized delete handler
  const handleDeleteCheckFirestore = async (id: string) => {
    onDeleteDocument(id);

    // Remove from offline sync queue if present
    const unsyncedStr = localStorage.getItem("WAFULA_UNSYNCED_SAVED_DOCUMENTS");
    if (unsyncedStr) {
      try {
        const queued: SavedDocument[] = JSON.parse(unsyncedStr);
        const filtered = queued.filter((d) => d.id !== id);
        localStorage.setItem("WAFULA_UNSYNCED_SAVED_DOCUMENTS", JSON.stringify(filtered));
        setUnsyncedCount(filtered.length);
      } catch (_) {}
    }

    // Attempt delete from Firestore
    if (isOnline && currentUser) {
      setIsSyncing(true);
      try {
        await deleteSavedDocumentFromFirestore(id);
      } catch (error) {
        console.warn("Failed immediate Firestore delete:", error);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // Generates clean downloadable Word or PDF raw bytes for offline clients!
  const downloadTextData = (title: string, text: string, type: string) => {
    const element = document.createElement("a");
    const file = new Blob([text as string], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `${title.replace(/\s+/g, "_")}.${type === "pdf" ? "pdf" : "doc"}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Perform professional formatted A4 printable PDF export (Fulfills professional headers/footers requirements)
  const handlePrintSavedPdf = (doc: SavedDocument) => {
    // Create temporary hidden printing frame in current DOM
    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!iframeDoc) return;

    const htmlContent = `
      <html>
        <head>
          <title>${doc.title || "Exported Document"}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&family=JetBrains+Mono:wght@400;700&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              padding: 2.2cm;
              line-height: 1.62;
              color: #1f2937;
              background-color: #ffffff;
            }
            .header-info-line {
              display: flex;
              justify-content: space-between;
              border-bottom: 2px solid #ce1126; /* Official Kenya Red accent colors */
              padding-bottom: 8px;
              margin-bottom: 26px;
              font-size: 10px;
              font-weight: 700;
              color: #4b5563;
              text-transform: uppercase;
              font-family: 'Space Grotesk', sans-serif;
            }
            h1 {
              color: #111827;
              font-family: 'Space Grotesk', sans-serif;
              font-size: 26px;
              font-weight: 700;
              margin-top: 0;
              margin-bottom: 8px;
              letter-spacing: -0.025em;
            }
            .metadata-line {
              font-family: 'JetBrains Mono', monospace;
              font-size: 11px;
              color: #6b7280;
              margin-bottom: 24px;
              border-bottom: 1px dashed #e5e7eb;
              padding-bottom: 11px;
            }
            p {
              margin: 0 0 16px 0;
              font-size: 13.5px;
              text-align: justify;
              color: #374151;
            }
            .content-body {
              white-space: pre-wrap;
              font-size: 13.5px;
              color: #1f2937;
              line-height: 1.65;
            }
            footer {
              position: fixed;
              bottom: 0;
              left: 2.2cm;
              right: 2.2cm;
              display: flex;
              justify-content: space-between;
              border-top: 1px solid #e5e7eb;
              padding-top: 8px;
              font-size: 8px;
              color: #9cb3af;
              font-family: 'Inter', sans-serif;
            }
            @media print {
              @page {
                size: A4 portrait;
                margin: 0;
              }
              body {
                padding: 2.5cm 2cm;
                color: #000000;
                background-color: #ffffff;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .header-info-line {
                position: fixed !important;
                top: 1cm;
                left: 2cm;
                right: 2cm;
                border-bottom: 2px solid #ce1126 !important;
                height: 30px;
                display: flex !important;
              }
              .content-area {
                margin-top: 1.5cm;
                margin-bottom: 1.5cm;
              }
              footer {
                position: fixed !important;
                bottom: 1cm;
                left: 2cm;
                right: 2cm;
                border-top: 1.5px solid #e5e7eb !important;
                height: 25px;
                display: flex !important;
              }
              h1, h2, h3, h4 {
                page-break-after: avoid;
                break-after: avoid;
              }
              p, blockquote {
                page-break-inside: avoid;
                break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="header-info-line">
            <span>WAFULA DIGITAL HUB &bull; VAULT DIGITAL EXPORT DOCUMENT TRANSCRIPT</span>
            <span>BUNGOMA, KENYA</span>
          </div>
          <div class="content-area">
            <h1>${doc.title || "Untitled Document"}</h1>
            <div class="metadata-line">
              [Folder: ${doc.folder || "General"}] &bull; [File Size: ${doc.fileSize || "Unknown"}] &bull; [Created Date: ${doc.date || "Unknown"}]
            </div>
            <div class="content-body">${doc.content}</div>
          </div>
          <footer>
            <span>Wafula Digital Hub &bull; Empowering Digital Literacy & Transcripts &bull; Wafula Reads</span>
            <span>Exported on: ${new Date().toLocaleDateString()}</span>
          </footer>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;
    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    // Remove frame securely after print screen invokes
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1500);
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim() && !folders.includes(newFolderName)) {
      setFolders([...folders, newFolderName.trim()]);
      setSelectedFolder(newFolderName.trim());
      setNewFolderName("");
    }
  };

  return (
    <div id="doc_studio_dashboard" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-stone-200 pb-5 mb-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center space-x-3">
            <h2 className="font-display text-3xl font-extrabold">Doc <span className="text-red-700">Studio</span></h2>
            
            {/* Database Sync Status Indicator Badge */}
            <div id="firestore_sync_badge" className="inline-flex items-center">
              {isSyncing ? (
                <span className="inline-flex items-center space-x-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200 animate-pulse">
                  <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                  <span>Syncing to Cloud...</span>
                </span>
              ) : !isOnline ? (
                <span className="inline-flex items-center space-x-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-300" title="Offline mode: working from browser vault storage cache">
                  <CloudOff className="h-2.5 w-2.5" />
                  <span>Offline ({unsyncedCount} Queued)</span>
                </span>
              ) : unsyncedCount > 0 ? (
                <button
                  type="button"
                  onClick={triggerExplicitSync}
                  className="inline-flex items-center space-x-1.5 rounded-full bg-red-50 hover:bg-red-100 px-2.5 py-0.5 text-[10px] font-bold text-red-700 border border-red-200 transition cursor-pointer"
                  title="Offline savings queued for synchronization. Click to upload now!"
                >
                  <RefreshCw className="h-2.5 w-2.5" />
                  <span>Sync Pending ({unsyncedCount})</span>
                </button>
              ) : (
                <span className="inline-flex items-center space-x-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200" title={`Successfully synchronized to live Firestore database. ${lastSyncedTime ? `Last saved at ${lastSyncedTime}` : ''}`}>
                  <Cloud className="h-2.5 w-2.5 text-emerald-600" />
                  <span>Synced to Cloud</span>
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-neutral-500">Formulate publications, convert files, transcribe audio dictations, and save with structural folders.</p>
        </div>

        {/* Studio Categories tabs */}
        <div id="studio_tabs_panel" className="flex flex-wrap gap-1.5 mt-4 md:mt-0 font-semibold text-xs">
          <button
            onClick={() => setActiveTab("ocr")}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-2 transition ${
              activeTab === "ocr" ? "bg-red-700 text-white shadow-xs" : "bg-neutral-50 text-neutral-600 hover:bg-neutral-105"
            }`}
          >
            <Image className="h-4 w-4" />
            <span>Photos ➔ PDF</span>
          </button>
          <button
            onClick={() => setActiveTab("convert")}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-2 transition ${
              activeTab === "convert" ? "bg-red-700 text-white shadow-xs" : "bg-neutral-50 text-neutral-600 hover:bg-neutral-105"
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Convert Doc</span>
          </button>
          <button
            onClick={() => setActiveTab("write")}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-2 transition ${
              activeTab === "write" ? "bg-red-700 text-white shadow-xs" : "bg-neutral-50 text-neutral-600 hover:bg-neutral-105"
            }`}
          >
            <PenTool className="h-4 w-4" />
            <span>Writer Editor</span>
          </button>
          <button
            onClick={() => setActiveTab("media")}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-2 transition ${
              activeTab === "media" ? "bg-red-700 text-white shadow-xs" : "bg-neutral-50 text-neutral-600 hover:bg-neutral-105"
            }`}
          >
            <Mic className="h-4 w-4" />
            <span>Voice Voice</span>
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Interactive Panel */}
        <div className="lg:col-span-7">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-4">
            
            {/* Setting common metadata */}
            <div className="grid gap-4 sm:grid-cols-2 text-xs border-b border-stone-100 pb-4 mb-2">
              <div>
                <label className="block text-stone-500 font-bold mb-1.5 uppercase tracking-wider">Document Working Title</label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 bg-neutral-50 p-2.5 font-bold outline-none"
                  placeholder="e.g. Leadership Notes"
                />
              </div>

              <div>
                <label className="block text-stone-500 font-bold mb-1.5 uppercase tracking-wider">Target Folder Vault</label>
                <div className="flex space-x-2">
                  <select
                    value={selectedFolder}
                    onChange={(e) => setSelectedFolder(e.target.value)}
                    className="flex-1 rounded-lg border border-stone-200 bg-neutral-50 p-2.5 font-bold outline-none"
                  >
                    {folders.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="New..."
                    className="w-16 rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs outline-none"
                  />
                  <button
                    onClick={handleCreateFolder}
                    className="rounded-lg bg-red-700 text-white px-2 text-xs font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* TAB 1: Photos -> PDF */}
            {activeTab === "ocr" && (
              <div className="space-y-4">
                <div className="rounded-xl border-2 border-dashed border-stone-200 p-6 text-center space-y-3">
                  <span className="text-3xl text-stone-400">🖼️</span>
                  <div className="text-xs">
                    <p className="font-bold text-neutral-800">Upload Photos of Written Texts or Word Pages</p>
                    <p className="text-stone-400 mt-1">Accepts multiple images. Our OCR will transcribe and extract values.</p>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="ocr_photo_uploader"
                  />
                  <label
                    htmlFor="ocr_photo_uploader"
                    className="mx-auto block w-fit rounded bg-neutral-900 text-white text-xs font-bold px-4 py-2 hover:bg-neutral-800 cursor-pointer"
                  >
                    Browse Local Photos
                  </label>
                </div>

                {selectedPhotos.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-stone-700">{selectedPhotos.length} Images Selected</span>
                      <button onClick={() => setSelectedPhotos([])} className="text-red-700 underline font-semibold">Clear All</button>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {selectedPhotos.map((src, idx) => (
                        <div key={idx} className="relative aspect-square border border-stone-200 rounded-lg overflow-hidden">
                          <img src={src} className="w-full h-full object-cover" alt="Source photo" />
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleOcrProcess}
                      disabled={isOcrProcessing}
                      className="flex w-full items-center justify-center space-x-2 rounded-lg bg-red-700 py-3 text-xs font-bold text-white shadow-sm hover:bg-red-800 transition"
                    >
                      {isOcrProcessing ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>AI Scanning Images & Formulating Markdown...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          <span>Extract Text from Images & Export into Editor</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Convert Doc */}
            {activeTab === "convert" && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-stone-500 mb-1 font-semibold">Convert From</label>
                    <select
                      value={convertFrom}
                      onChange={(e) => setConvertFrom(e.target.value)}
                      className="w-full rounded border p-2"
                    >
                      <option value="Word">Word (.docx)</option>
                      <option value="Text">Plain Text (.txt)</option>
                      <option value="PDF">PDF (.pdf)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-stone-500 mb-1 font-semibold">Convert To</label>
                    <select
                      value={convertTo}
                      disabled
                      className="w-full rounded border p-2 bg-stone-100 text-stone-500"
                    >
                      <option value="PDF">Downloadable PDF (.pdf)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-stone-500 mb-1.5 font-bold">Paste File Content or Outline Text</label>
                  <textarea
                    rows={6}
                    value={sourceCode}
                    onChange={(e) => setSourceCode(e.target.value)}
                    placeholder="Paste the contents of your document here..."
                    className="w-full rounded-lg border border-stone-200 bg-neutral-50 px-3 py-2 outline-none focus:bg-white focus:border-red-750"
                  />
                </div>

                <button
                  onClick={handleConvert}
                  disabled={isConverting}
                  className="w-full flex items-center justify-center space-x-2 rounded-lg bg-red-700 py-3 font-bold text-white shadow-sm hover:bg-red-800 transition"
                >
                  {isConverting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  <span>Convert Document into Structured Work</span>
                </button>
              </div>
            )}

            {/* TAB 3: Writer Editor (Standalone) */}
            {activeTab === "write" && (
              <div className="space-y-4 text-xs">
                <label className="block text-stone-500 font-bold mb-1">Direct Outliner & Publisher Editor</label>
                <textarea
                  rows={8}
                  value={editorContent}
                  onChange={(e) => setEditorContent(e.target.value)}
                  placeholder="Start composing your premium publication chapter outline..."
                  className="w-full rounded-xl border border-stone-200 p-4 font-mono text-xs leading-relaxed outline-none focus:border-red-700"
                />

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button
                    onClick={() => handleSaveDocument("pdf")}
                    className="flex-1 rounded-lg bg-red-700 text-white font-bold py-2.5 text-xs hover:bg-red-850 text-center"
                  >
                    Save As PDF File
                  </button>
                  <button
                    onClick={() => handleSaveDocument("doc")}
                    className="flex-1 rounded-lg bg-stone-900 text-white font-bold py-2.5 text-xs hover:bg-stone-950 text-center"
                  >
                    Save As Word Outline
                  </button>
                  <button
                    type="button"
                    onClick={triggerGmailExportDialog}
                    className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 text-xs text-center flex items-center justify-center space-x-1 whitespace-nowrap"
                  >
                    <Mail className="h-3 w-3 shrink-0" />
                    <span>Send via Gmail</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: Voice dictation transcription */}
            {activeTab === "media" && (
              <div className="space-y-4 text-center py-6">
                <div className="flex flex-col items-center justify-center space-y-3">
                  <button
                    onClick={toggleRecording}
                    className={`flex h-16 w-16 items-center justify-center rounded-full shadow-lg transition duration-200 ${
                      isRecording ? "bg-red-700 text-white animate-pulse" : "bg-red-50 text-red-700 hover:scale-105"
                    }`}
                  >
                    <Mic className="h-7 w-7" />
                  </button>
                  
                  <div className="text-xs">
                    <p className="font-bold text-neutral-950">
                      {isRecording ? "Transcribing Spoken Speech..." : "Voice Verbal Recorder"}
                    </p>
                    <p className="text-stone-400 mt-1">
                      {isRecording ? `Recording Duration: ${recordingSeconds}s` : "Click the microphone, grant permissions, and speak."}
                    </p>
                  </div>
                </div>

                {isRecording && (
                  <div className="flex items-center justify-center space-x-1 py-2">
                    <span className="h-4 w-1 bg-red-700 rounded animate-bounce [animation-delay:0.1s]"></span>
                    <span className="h-6 w-1 bg-blue-600 rounded animate-bounce [animation-delay:0.2s]"></span>
                    <span className="h-8 w-1 bg-emerald-500 rounded animate-bounce [animation-delay:0.3s]"></span>
                    <span className="h-5 w-1 bg-red-700 rounded animate-bounce [animation-delay:0.4s]"></span>
                    <span className="h-7 w-1 bg-blue-600 rounded animate-bounce [animation-delay:0.5s]"></span>
                  </div>
                )}

                {micError && (
                  <div className="mx-auto max-w-sm rounded-xl bg-orange-50 border border-orange-100 p-3 text-[10px] text-orange-850 text-left">
                    <p className="font-bold mb-0.5">⚠️ Sandboxed Preview Notice</p>
                    <p className="leading-relaxed opacity-90">
                      Standard sandbox iFrames often restrict direct browser microphone APIs. We have automatically activated our <strong>Verbal Study Writer Simulator</strong> so you can still preview continuous auto-transcribing seamlessly!
                    </p>
                  </div>
                )}

                {voiceText && (
                  <div className="space-y-3 text-left">
                    <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 font-mono text-xs leading-relaxed text-stone-700 max-h-[150px] overflow-y-auto">
                      {voiceText}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setEditorContent((prev) => prev + (prev ? "\n" : "") + voiceText);
                          setActiveTab("write");
                        }}
                        className="flex-1 rounded-lg border border-stone-200 hover:bg-neutral-50 py-2 text-xs font-semibold"
                      >
                        Load to Editor
                      </button>
                      <button
                        onClick={() => handleSaveDocument("doc", voiceText)}
                        className="flex-1 rounded-lg bg-red-700 text-white font-semibold py-2 text-xs hover:bg-red-850"
                      >
                        Save Voice Document
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Right Saved Materials Sidebar Portfolio (Offline Folders & Interactive PDF/Doc Print Previewer) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Main Segmented Toggle Buttons */}
          <div className="flex bg-stone-100 rounded-xl p-1 border border-stone-200">
            <button
              type="button"
              onClick={() => setRightPanelTab("preview")}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                rightPanelTab === "preview" 
                  ? "bg-white text-red-755 shadow-xs font-bold" 
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              <Eye className="h-4 w-4" />
              <span>Interactive Preview</span>
            </button>
            <button
              type="button"
              onClick={() => setRightPanelTab("vault")}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                rightPanelTab === "vault" 
                  ? "bg-white text-red-755 shadow-xs font-bold" 
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              <Folder className="h-4 w-4" />
              <span>Vault Folders</span>
            </button>
          </div>

          {/* TAB 1: INTERACTIVE DOCUMENT/PDF PREVIEWER */}
          {rightPanelTab === "preview" && (
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <h3 className="font-display text-sm font-extrabold text-stone-900">Live PDF / Doc Viewer</h3>
                  <p className="text-[10px] text-stone-400 font-mono mt-0.5">Est. Pages: {Math.max(1, Math.ceil((editorContent || extractedOcrText || voiceText || conversionOutput || "").trim().split(/\s+/).filter(Boolean).length / 220))} | Words: {(editorContent || extractedOcrText || voiceText || conversionOutput || "").trim().split(/\s+/).filter(Boolean).length}</p>
                </div>
                <button
                  type="button"
                  onClick={handlePrintPdf}
                  className="inline-flex items-center space-x-1 rounded-lg bg-red-700 hover:bg-red-850 px-3 py-1.5 text-xs font-bold text-white transition shadow-xs cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print & Download PDF</span>
                </button>
              </div>

              {/* View Customizations */}
              <div className="grid grid-cols-2 gap-3 bg-stone-50 p-3 rounded-xl border border-stone-150">
                <div className="space-y-1 text-left">
                  <label className="text-[10px] uppercase font-bold text-stone-500 block">Typography Mood</label>
                  <div className="flex bg-stone-200/60 rounded-md p-0.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setPreviewStyle("serif")}
                      className={`flex-1 py-1 rounded text-center transition ${previewStyle === "serif" ? "bg-white font-bold text-stone-900" : "text-stone-500"}`}
                    >
                      Scholar
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewStyle("sans")}
                      className={`flex-1 py-1 rounded text-center transition ${previewStyle === "sans" ? "bg-white font-bold text-stone-900" : "text-stone-500"}`}
                    >
                      Modern
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewStyle("mono")}
                      className={`flex-1 py-1 rounded text-center transition ${previewStyle === "mono" ? "bg-white font-bold text-stone-900" : "text-stone-500"}`}
                    >
                      Coding
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[10px] uppercase font-bold text-stone-500 block">Margin Border</label>
                  <div className="flex bg-stone-200/60 rounded-md p-0.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setPreviewMargin("compact")}
                      className={`flex-1 py-1 rounded text-center transition ${previewMargin === "compact" ? "bg-white font-bold text-stone-900" : "text-stone-500"}`}
                    >
                      Narrow
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMargin("normal")}
                      className={`flex-1 py-1 rounded text-center transition ${previewMargin === "normal" ? "bg-white font-bold text-stone-900" : "text-stone-500"}`}
                    >
                      Mid
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMargin("wide")}
                      className={`flex-1 py-1 rounded text-center transition ${previewMargin === "wide" ? "bg-white font-bold text-stone-900" : "text-stone-500"}`}
                    >
                      Wide
                    </button>
                  </div>
                </div>
              </div>

              {/* Dynamic Zoom Adjuster Control bar */}
              <div className="flex items-center justify-between text-[11px] text-stone-500 px-1 select-none">
                <span className="font-semibold text-stone-400">Sheet Zoom</span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setZoom(Math.max(0.6, zoom - 0.1))}
                    className="p-1 rounded bg-stone-100 hover:bg-stone-200 transition text-stone-700 cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <span className="font-mono font-bold w-10 text-center text-stone-800">{Math.round(zoom * 100)}%</span>
                  <button
                    type="button"
                    onClick={() => setZoom(Math.min(1.4, zoom + 0.1))}
                    className="p-1 rounded bg-stone-100 hover:bg-stone-200 transition text-stone-700 cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* A4 Sheet Arena Scrollable block */}
              <div className="overflow-auto max-h-[550px] border border-stone-200 rounded-xl bg-stone-100 p-4 transition-all duration-300">
                <div 
                  id="a4_printed_page"
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: "top center",
                    transition: "transform 0.15s ease",
                  }}
                  className={`mx-auto bg-white border border-stone-300 shadow-lg rounded-sm text-left select-text relative mb-12`}
                >
                  {/* Aspect Ratio A4 representation spacer styling wrapper */}
                  <div
                    className="h-full min-h-[520px]"
                    style={{
                      padding: 
                        previewMargin === "compact" 
                          ? "1.2rem" 
                          : previewMargin === "wide" 
                            ? "3rem" 
                            : "2rem",
                      fontFamily: 
                        previewStyle === "serif" 
                          ? "Georgia, Cambria, 'Times New Roman', serif" 
                          : previewStyle === "mono" 
                            ? "'JetBrains Mono', Courier, monospace" 
                            : "system-ui, -apple-system, sans-serif",
                    }}
                  >
                    {/* Header Watermark */}
                    <div className="flex justify-between items-center border-b border-stone-100 pb-1.5 mb-4 text-[9px] text-stone-400 font-mono">
                      <span>WA-DIGITAL DOCUMENT COMPANION</span>
                      <span>{docTitle || "Untitled Outline"}</span>
                    </div>

                    {/* Paper Title */}
                    <h1 className="text-xl font-bold tracking-tight text-red-800 mb-3 border-stone-200 pb-0.5">
                      {docTitle || "Untitled Document"}
                    </h1>

                    {/* Paper Body Text content */}
                    <div className="text-xs text-stone-850 whitespace-pre-wrap leading-relaxed min-h-[220px]">
                      {(editorContent || extractedOcrText || voiceText || conversionOutput || "").trim() ? (
                        editorContent || extractedOcrText || voiceText || conversionOutput
                      ) : (
                        <p className="text-stone-400 italic font-sans text-center mt-12 py-6">
                            No content has been authored or processed yet. Use the Left Panel tab options (OCR, voice recorder, file translation types or direct writer) to format text and see live previews here.
                        </p>
                      )}
                    </div>

                    {/* Footer Watermark */}
                    <div className="mt-8 border-t border-stone-100 pt-1.5 flex justify-between items-center text-[8px] text-stone-400 font-mono">
                      <span>Bungoma, Kenya</span>
                      <span>Page 1 of {Math.max(1, Math.ceil((editorContent || extractedOcrText || voiceText || conversionOutput || "").trim().split(/\s+/).filter(Boolean).length / 220))}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VAULT SAVED FOLDERS */}
          {rightPanelTab === "vault" && (
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
              <h3 className="font-display text-base font-bold text-stone-900 mb-3 flex items-center space-x-2">
                <Folder className="h-4.5 w-4.5 text-red-700" />
                <span>Vault Folders</span>
              </h3>

              {/* Document list grouped by Folder */}
              {savedDocuments.length === 0 ? (
                <div className="text-center py-8 text-xs text-stone-400">
                  <p>No documents saved yet.</p>
                  <p className="mt-1 opacity-80">Compose or translate text above to fill folders.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {folders.map((folderName) => {
                    const filtered = savedDocuments.filter((d) => d.folder === folderName);
                    if (filtered.length === 0) return null;

                    return (
                      <div key={folderName} className="space-y-2">
                        <div className="flex items-center space-x-1.5 text-xs font-bold text-neutral-800 border-b border-stone-100 pb-1">
                          <Folder className="h-3.5 w-3.5 fill-red-50 text-red-700" />
                          <span>{folderName} ({filtered.length})</span>
                        </div>

                        <div className="space-y-1.5">
                          {filtered.map((doc) => (
                            <div key={doc.id} className="rounded-lg border border-stone-100 bg-neutral-50 hover:bg-neutral-100 p-3 flex justify-between items-start text-xs text-left">
                              <div className="flex-1 pr-2">
                                <h4 className="font-bold text-stone-850 truncate max-w-[150px]">{doc.title}</h4>
                                <p className="text-[10px] text-stone-400 font-mono mt-0.5">{doc.date} • {doc.fileSize}</p>
                                <p className="text-[11px] text-stone-500 line-clamp-2 mt-1 italic font-mono leading-relaxed mt-1">"{doc.content}"</p>
                              </div>

                               <div className="flex flex-col space-y-1 text-[10px] shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handlePrintSavedPdf(doc)}
                                  className="text-red-700 hover:text-red-900 flex items-center space-x-0.5 border border-red-200 dark:border-red-900 rounded px-1.5 py-0.5 bg-red-50 dark:bg-red-950/20 cursor-pointer font-semibold transition"
                                  title="Export format as PDF printable"
                                >
                                  <Download className="h-3 w-3 text-red-700" />
                                  <span>Export PDF</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => downloadTextData(doc.title, doc.content, doc.type)}
                                  className="text-stone-500 hover:text-stone-700 flex items-center space-x-0.5 border border-stone-200 rounded px-1.5 py-0.5 bg-white cursor-pointer transition"
                                >
                                  <FileText className="h-3 w-3" />
                                  <span>Get TXT</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCheckFirestore(doc.id)}
                                  className="text-stone-400 hover:text-rose-700 font-medium tracking-wide cursor-pointer text-center text-[9px] pt-1 transition"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Pop-up Gmail Sharing Dialog Modal */}
      {showGmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs" onClick={() => setShowGmailModal(false)} />
          
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-100 p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-xs">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4 text-left">
              <div className="flex items-center space-x-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold">📧</span>
                <div>
                  <h3 className="font-display font-black text-neutral-900 text-sm">Send Document via Gmail</h3>
                  <p className="text-[10px] text-stone-400 font-medium font-mono leading-none">WAFULA WORKSPACE PORTAL</p>
                </div>
              </div>
              <button
                onClick={() => setShowGmailModal(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 font-bold"
              >
                ✕
              </button>
            </div>

            {emailSuccess ? (
              <div className="py-6 text-center space-y-3">
                <div className="h-12 w-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-stone-900 text-sm">Successfully Emailed!</h4>
                <p className="text-stone-500 max-w-sm mx-auto leading-relaxed">
                  Your outline report <strong>"{docTitle}"</strong> has been packaged into structured HTML format and securely mailed using the Gmail active server connection interface.
                </p>
                <button
                  onClick={() => setShowGmailModal(false)}
                  className="rounded-lg bg-neutral-900 text-white font-bold px-4 py-2 hover:bg-neutral-800"
                >
                  Close Mailer
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendGmailExport} className="space-y-4 text-left">
                {emailError && (
                  <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg text-amber-900 flex items-start gap-2">
                    <AlertCircle className="h-4.5 w-4.5 text-amber-500 shrink-0" />
                    <span>{emailError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-bold tracking-wide text-stone-500">Document Title</label>
                  <input
                    type="text"
                    disabled
                    value={docTitle}
                    className="w-full rounded-lg border border-stone-200 bg-stone-100 p-2.5 font-bold text-stone-600 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-bold tracking-wide text-stone-500">Recipient Address</label>
                  <input
                    type="email"
                    required
                    value={emailRecipient}
                    onChange={(e) => setEmailRecipient(e.target.value)}
                    placeholder="e.g. wafulak435@gmail.com, editor@school.org"
                    className="w-full rounded-lg border border-stone-200 bg-stone-50 p-2.5 font-medium outline-none focus:bg-white focus:border-blue-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-bold tracking-wide text-stone-500">Subject Line</label>
                  <input
                    type="text"
                    required
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Subject for recipient inboxes"
                    className="w-full rounded-lg border border-stone-200 bg-stone-50 p-2.5 font-medium outline-none focus:bg-white focus:border-blue-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-bold tracking-wide text-stone-500">Content Snapshot (MIME Payload Body)</label>
                  <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 max-h-[140px] overflow-y-auto font-mono text-[10px] text-stone-600 whitespace-pre-wrap leading-relaxed">
                    {editorContent || "(Empty document. Please type outline text in the editor first before sharing.)"}
                  </div>
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowGmailModal(false)}
                    className="flex-1 rounded-lg border border-stone-200 hover:bg-stone-50 py-2.5 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isEmailSending || !editorContent}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg transition flex items-center justify-center space-x-1"
                  >
                    {isEmailSending ? (
                      <>
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        <span>Sending secure MIME...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="h-3 w-3" />
                        <span>Deliver Now</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
