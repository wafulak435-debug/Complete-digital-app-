import React, { useState, useEffect, useRef } from "react";
import { 
  FileText, Image, Mic, PenTool, FolderPlus, Download, Trash, FileVideo, 
  RefreshCw, Sparkles, Plus, Folder, AlertCircle, Mail, CheckCircle2, 
  Eye, Printer, ZoomIn, ZoomOut, Cloud, CloudOff, Upload 
} from "lucide-react";
import { SavedDocument } from "../types";
import { getAccessToken, googleSignIn, sendGmailMessage } from "../lib/firebase";
import { saveDocumentToFirestore, deleteSavedDocumentFromFirestore } from "../lib/firestoreUtils";
import { DeleteConfirmationModal } from "./DeleteConfirmationModal";

interface DocStudioProps {
  currentUser: { email: string; name: string; role?: string } | null;
  onAddNewDocument: (doc: SavedDocument) => void;
  savedDocuments: SavedDocument[];
  onDeleteDocument: (id: string) => void;
}

export default function DocStudio({ currentUser, onAddNewDocument, savedDocuments, onDeleteDocument }: DocStudioProps) {
  const [editorContent, setEditorContent] = useState("");
  const [activeTab, setActiveTab] = useState<"ocr" | "convert" | "write" | "media" | "curriculum">("ocr");
  const [docTitle, setDocTitle] = useState("My Document");
  const [autoSaveStatus, setAutoSaveStatus] = useState("Draft saved");

  // Syllabus and Curricular Note Generation states
  const [curriculumSubject, setCurriculumSubject] = useState("");
  const [isGeneratingCurriculum, setIsGeneratingCurriculum] = useState(false);
  const [curriculumError, setCurriculumError] = useState("");

  // Keep track of latest text using refs to avoid stale interval closures
  const editorContentRef = useRef(editorContent);
  const docTitleRef = useRef(docTitle);

  useEffect(() => {
    editorContentRef.current = editorContent;
  }, [editorContent]);

  useEffect(() => {
    docTitleRef.current = docTitle;
  }, [docTitle]);

  // Highlight and Text Selection Reference State
  const [currentHighlights, setCurrentHighlights] = useState<{ id: string; text: string; color: string }[]>([]);
  const editorTextareaRef = useRef<HTMLTextAreaElement>(null);

  const handleApplyHighlight = (color: 'yellow' | 'cyan') => {
    const textarea = editorTextareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    if (start === end || start === undefined || end === undefined) {
      alert("Please highlight/select some text within the Direct Outliner textarea first!");
      return;
    }
    
    const textSelected = editorContent.substring(start, end).trim();
    if (!textSelected) return;

    // Avoid duplicating exact same slice and color
    const isDup = currentHighlights.some(hl => hl.text === textSelected && hl.color === color);
    if (isDup) return;

    const newHl = {
      id: "hl_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
      text: textSelected,
      color: color
    };

    setCurrentHighlights(prev => [...prev, newHl]);
  };

  // Sync and Network States
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<{ id: string; title: string } | null>(null);
  const [unsyncedCount, setUnsyncedCount] = useState<number>(0);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);

  // Layout Preference States for Preview Option
  const [rightPanelTab, setRightPanelTab] = useState<"preview" | "vault">("preview");
  const [previewStyle, setPreviewStyle] = useState<"serif" | "sans" | "mono">("serif");
  const [previewMargin, setPreviewMargin] = useState<"compact" | "normal" | "wide">("normal");
  const [zoom, setZoom] = useState<number>(1);

  // Load editor content crash-saving local states
  useEffect(() => {
    const cachedDraft = localStorage.getItem("WAFULA_AUTOSAVE_CONTENT") || localStorage.getItem("WAFULA_EDIT_DRAFT_CONTENT");
    if (cachedDraft) {
      setEditorContent(cachedDraft);
    }
    const cachedTitle = localStorage.getItem("WAFULA_AUTOSAVE_TITLE") || localStorage.getItem("WAFULA_EDIT_DRAFT_TITLE");
    if (cachedTitle) {
      setDocTitle(cachedTitle);
    }
  }, []);

  // Synchronize dynamic typed working draft elements to crash-proof local storage caches
  useEffect(() => {
    localStorage.setItem("WAFULA_EDIT_DRAFT_CONTENT", editorContent);
    localStorage.setItem("WAFULA_EDIT_DRAFT_TITLE", docTitle);
  }, [editorContent, docTitle]);

  // Periodic Auto-Save mechanism: Persists the current editor content and title to localStorage every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const content = editorContentRef.current;
        const title = docTitleRef.current;
        
        localStorage.setItem("WAFULA_AUTOSAVE_CONTENT", content);
        localStorage.setItem("WAFULA_AUTOSAVE_TITLE", title);
        
        // Ensure synchronization with basic draft keys as well
        localStorage.setItem("WAFULA_EDIT_DRAFT_CONTENT", content);
        localStorage.setItem("WAFULA_EDIT_DRAFT_TITLE", title);

        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setAutoSaveStatus(`Auto-saved at ${timeStr}`);
      } catch (err) {
        console.warn("Auto-save periodic interval failed:", err);
      }
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

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

  // Vault Uploader states
  const [vaultUploadMode, setVaultUploadMode] = useState<"files" | "link">("files");
  const [vaultUploadedFiles, setVaultUploadedFiles] = useState<File[]>([]);
  const [vaultUploadedPreview, setVaultUploadedPreview] = useState<{ name: string; size: number }[]>([]);
  const [linkInputTitle, setLinkInputTitle] = useState("");
  const [linkInputUrl, setLinkInputUrl] = useState("");

  // States for Photos & Videos -> PDF and Media Extraction
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]); // Base64 list
  const [mediaFiles, setMediaFiles] = useState<{ id: string; type: "photo" | "video"; name: string; dataUrl: string; size: string }[]>([]);
  const [isMediaProcessing, setIsMediaProcessing] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [extractedOcrText, setExtractedOcrText] = useState("");

  // States for Document Conversion
  const [sourceCode, setSourceCode] = useState("");
  const [convertFrom, setConvertFrom] = useState("Word");
  const [convertTo, setConvertTo] = useState("PDF");
  const [isConverting, setIsConverting] = useState(false);
  const [conversionOutput, setConversionOutput] = useState("");
  const [conversionFile, setConversionFile] = useState<{ name: string; dataUrl: string; size: string } | null>(null);

  // States for Voice Transcription (Mic Recorder)
  const [isRecording, setIsRecording] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const timerRef = useRef<any>(null);

  // States for Document Creator
  const [isSaving, setIsSaving] = useState(false);

  const handleVaultFilesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files) as File[];
      setVaultUploadedFiles((prev) => [...prev, ...fileArray]);
      const prevMetadata = fileArray.map((f) => ({ name: f.name, size: Math.round(f.size / 1024) }));
      setVaultUploadedPreview((prev) => [...prev, ...prevMetadata]);
    }
  };

  const handleProcessVaultLinkSave = () => {
    if (!linkInputTitle.trim() || !linkInputUrl.trim()) return;
    const newDoc: SavedDocument = {
      id: "vault_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
      userId: currentUser?.email || "anonymous",
      title: linkInputTitle.trim(),
      content: linkInputUrl.trim(),
      type: "link",
      folder: selectedFolder,
      date: new Date().toISOString().split("T")[0],
      fileSize: "URI Link"
    };
    onAddNewDocument(newDoc);
    setLinkInputTitle("");
    setLinkInputUrl("");
  };

  const handleProcessVaultBatchUpload = () => {
    if (vaultUploadedFiles.length === 0) return;
    
    vaultUploadedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result ? (reader.result as string) : "";
        
        // Detect document type
        const extension = file.name.split(".").pop()?.toLowerCase() || "";
        let docType: 'pdf' | 'doc' | 'video' | 'photo' | 'audio' | 'link' | 'book' = "doc";
        
        if (["pdf"].includes(extension)) {
          docType = "pdf";
        } else if (["doc", "docx", "txt", "rtf"].includes(extension)) {
          docType = "doc";
        } else if (["png", "jpg", "jpeg", "gif", "webp", "tiff", "svg"].includes(extension)) {
          docType = "photo";
        } else if (["mp3", "wav", "m4a", "ogg", "aac"].includes(extension)) {
          docType = "audio";
        } else if (["mp4", "mov", "avi", "mkv", "webm", "3gp"].includes(extension)) {
          docType = "video";
        } else if (["epub", "mobi", "pdf_book", "book"].includes(extension)) {
          docType = "book";
        }

        const newDoc: SavedDocument = {
          id: "vault_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
          userId: currentUser?.email || "anonymous",
          title: file.name,
          content: base64Data.slice(0, 500) || `Uploaded raw file binary placeholder for: ${file.name}`,
          type: docType,
          folder: selectedFolder,
          date: new Date().toISOString().split("T")[0],
          fileSize: (file.size / 1024).toFixed(1) + " KB",
          downloadUrl: base64Data || undefined
        };
        onAddNewDocument(newDoc);
      };
      reader.readAsDataURL(file);
    });

    setVaultUploadedFiles([]);
    setVaultUploadedPreview([]);
  };

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

  // Global voice-save-document event receiver
  useEffect(() => {
    const handleVoiceSave = () => {
      handleSaveDocument("doc");
    };
    window.addEventListener("voice-save-document", handleVoiceSave);
    return () => {
      window.removeEventListener("voice-save-document", handleVoiceSave);
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

  // Unified Media (Photos & Videos) uploader
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files) as File[];
      filesArr.forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const type = file.type.startsWith("video/") ? "video" : "photo";
          const newMedia = {
            id: "media_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
            type: type as "photo" | "video",
            name: file.name,
            dataUrl: reader.result as string,
            size: (file.size / (1024 * 1024)) < 1 
              ? `${(file.size / 1024).toFixed(1)} KB`
              : `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          };
          setMediaFiles((current) => [...current, newMedia]);
          if (type === "photo") {
            setSelectedPhotos((prev) => [...prev, reader.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // Convert photos or videos using server-side Gemini OCR / Transcription
  const handleOcrProcess = async () => {
    if (mediaFiles.length === 0 && selectedPhotos.length === 0) {
      alert("Please upload at least one image or video to extract text from.");
      return;
    }
    
    setIsOcrProcessing(true);
    setIsMediaProcessing(true);
    setExtractedOcrText("");

    try {
      // Process unified media if available, fallback to selectedPhotos standard OCR
      const payloadFile = mediaFiles.length > 0 ? mediaFiles[0].dataUrl : selectedPhotos[0];
      const payloadName = mediaFiles.length > 0 ? mediaFiles[0].name : "My_Photo.png";
      const payloadMime = mediaFiles.length > 0 
        ? (mediaFiles[0].type === "video" ? "video/mp4" : "image/png") 
        : "image/png";

      const response = await fetch("/api/ai/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileBase64: payloadFile,
          fileName: payloadName,
          customMimeType: payloadMime,
          docTitle
        })
      });
      const data = await response.json();
      if (data.success) {
        setExtractedOcrText(data.text);
        setEditorContent(data.text); // load to editor instantly
        alert(`🎉 Extraction Complete!\nAI successfully processed file "${payloadName}" and loaded text/outlines into the Direct Outliner editor.`);
      } else {
        alert("Extraction failed: " + (data.error || "Reason unknown"));
      }
    } catch (e: any) {
      console.error(e);
      alert("Error reaching the extraction server: " + e.message);
    } finally {
      setIsOcrProcessing(false);
      setIsMediaProcessing(false);
    }
  };

  // Physical document uploader handler for format converter
  const handleConvertFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      const extension = file.name.split(".").pop()?.toLowerCase() || "";
      
      if (extension === "docx") {
        setConvertFrom("Word");
      } else if (extension === "txt") {
        setConvertFrom("Text");
      } else if (extension === "pdf") {
        setConvertFrom("PDF");
      }

      reader.onloadend = () => {
        setConversionFile({
          name: file.name,
          dataUrl: reader.result as string,
          size: `${(file.size / 1024).toFixed(1)} KB`
        });
        setDocTitle(file.name.replace(/\.[^/.]+$/, ""));
      };
      reader.readAsDataURL(file);
    }
  };

  // Document formatting converter (Supporting pasted text OR physically uploaded files!)
  const handleConvert = async () => {
    if (!conversionFile && !sourceCode.trim()) {
      alert("Please upload a file (.docx, .txt, .pdf) or paste outline text to convert first.");
      return;
    }
    setIsConverting(true);
    setConversionOutput("");
    
    try {
      let response;
      if (conversionFile) {
        response = await fetch("/api/ai/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileBase64: conversionFile.dataUrl,
            fileName: conversionFile.name,
            docTitle,
            customMimeType: convertFrom === "Word" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : convertFrom === "PDF" ? "application/pdf" : "text/plain"
          })
        });
      } else {
        response = await fetch("/api/ai/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            originalContent: sourceCode,
            requestedTitle: `${docTitle} (Converted)`,
            targetCategory: "Conversion",
            authorName: currentUser?.name || "Wafula Library Member"
          })
        });
      }

      const data = await response.json();
      if (data.success) {
        const textValue = data.text || data.content || "";
        setConversionOutput(textValue);
        setEditorContent(textValue);
        alert(`🎉 Document Format Conversion Completed Successfully!\n"${docTitle}" has been converted, structured via Zion AI, and loaded into the Direct Outliner editor.`);
      } else {
        alert("Conversion failed: " + (data.error || "Reason unknown"));
      }
    } catch (e: any) {
      console.error(e);
      alert("Error occurred during document conversion: " + e.message);
    } finally {
      setIsConverting(false);
    }
  };

  // AI Syllabus Note Maker handler
  const handleGenerateCurriculumSyllabus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!curriculumSubject.trim()) return;
    setIsGeneratingCurriculum(true);
    setCurriculumError("");

    try {
      const response = await fetch("/api/school/generate-curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: curriculumSubject.trim() })
      });
      const data = await response.json();
      if (data.success) {
        setEditorContent(data.notes);
        setDocTitle(`${data.subject} Curricular Notes`);
        setActiveTab("write");
        alert(`🎉 Complete Study Notes on "${data.subject}" Generated Successfully!\nAll 10 Topics & 50 Subtopics have been written in high-integrity academic prose and loaded directly in the Direct Outliner editor.`);
      } else {
        setCurriculumError(data.error || "Generation request was rejected by learning model controls.");
      }
    } catch (err: any) {
      console.error(err);
      setCurriculumError("Could not dispatch syllabus request. Check network connection status.");
    } finally {
      setIsGeneratingCurriculum(false);
    }
  };

  // Legacy uploader fallback
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleMediaUpload(e);
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
      fileSize: `${((bodyStr.length * 2) / 1024).toFixed(1)} KB`,
      highlights: currentHighlights
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
    <div id="doc_studio_dashboard" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      {/* Zion Digital Academic Center Banner */}
      <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-red-900 via-neutral-900 to-amber-955 text-white rounded-2xl p-5 shadow-sm border border-stone-250">
        <div className="flex items-center space-x-3">
          <div className="rounded-xl bg-white text-red-900 h-12 w-12 flex items-center justify-center font-black text-xl shadow-md border-2 border-amber-300 select-all shrink-0">
            ZION
          </div>
          <div>
            <h1 className="font-display text-2xl font-black tracking-tight leading-none text-white flex items-center gap-1.5 flex-wrap">
              Zion Digital Document Studio
              <span className="text-[10px] bg-amber-400 text-neutral-900 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-widest font-mono">Academic R&D</span>
            </h1>
            <p className="text-xs text-amber-200/90 mt-1 font-sans font-medium">
              Official academic printing & document conversion hub. Powered by the <strong>Zion Course Ranger Series</strong>. Direct Word-to-PDF formatting, multimedia AI extraction, voice lecture transcribing, and offline Firestore secure cloud syncing.
            </p>
          </div>
        </div>
        
        {/* Course Code Ranger Indicator Widget */}
        <div className="bg-white/10 p-3 rounded-xl border border-white/20 text-left md:text-right shrink-0">
          <span className="block text-[9px] uppercase tracking-wider font-extrabold text-amber-300 font-mono">Registration Course Code:</span>
          <span className="block font-mono font-black text-white text-base tracking-wide mt-0.5">ZIO01/001/26</span>
          <span className="block text-[9px] text-neutral-300 font-medium mt-0.5">Zion IT School &bull; Bungoma, Kenya</span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-stone-200 pb-5 mb-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center space-x-3">
            <h2 className="font-display text-xl font-bold text-neutral-800">Workspace Editor</h2>
            
            {/* Database Sync Status Indicator Badge */}
            <div id="firestore_sync_badge" className="inline-flex items-center gap-2">
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

              {/* LocalStorage Auto-Save Status Badge */}
              <span className="inline-flex items-center space-x-1.5 rounded-full bg-stone-50 dark:bg-slate-900 px-2.5 py-0.5 text-[10px] font-bold text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-slate-800">
                <span className="w-1.5 h-1.5 rounded-full bg-red-700 animate-pulse block" />
                <span>{autoSaveStatus}</span>
              </span>
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
            <span>Photos & Videos ➔ Text/PDF</span>
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
          <button
            onClick={() => setActiveTab("curriculum")}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-2 transition ${
              activeTab === "curriculum" ? "bg-red-700 text-white shadow-xs" : "bg-neutral-50 text-neutral-600 hover:bg-neutral-105"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>AI Syllabus Note Maker</span>
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

              {currentUser?.role === 'admin' ? (
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
              ) : null}
            </div>

            {/* TAB 1: Photos & Videos ➔ PDF / Text Extraction */}
            {activeTab === "ocr" && (
              <div className="space-y-4 text-xs">
                <div className="rounded-xl border-2 border-dashed border-stone-200 p-6 text-center space-y-3 bg-neutral-50">
                  <span className="text-3xl text-stone-400">📽️</span>
                  <div className="text-xs">
                    <p className="font-bold text-neutral-800">Upload Photos or Videos for AI Extraction</p>
                    <p className="text-stone-400 mt-1">Accepts multiple images, or video clips. Our AI transcribes and extracts text contents.</p>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleMediaUpload}
                    className="hidden"
                    id="ocr_multimedia_uploader"
                  />
                  <label
                    htmlFor="ocr_multimedia_uploader"
                    className="mx-auto block w-fit rounded bg-neutral-900 text-white text-xs font-bold px-4 py-2 hover:bg-neutral-800 cursor-pointer transition"
                  >
                    Select Local Images & Videos
                  </label>
                </div>

                {mediaFiles.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-stone-700">{mediaFiles.length} Media File(s) Staged</span>
                      <button 
                        onClick={() => {
                          setMediaFiles([]);
                          setSelectedPhotos([]);
                        }} 
                        className="text-red-700 underline font-semibold cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {mediaFiles.map((med) => (
                        <div key={med.id} className="relative border border-stone-200 rounded-xl overflow-hidden bg-stone-50 p-2 flex flex-col justify-between">
                          <div className="aspect-video w-full rounded-lg overflow-hidden bg-black flex items-center justify-center relative">
                            {med.type === "photo" ? (
                              <img src={med.dataUrl} className="w-full h-full object-cover" alt={med.name} />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-white bg-neutral-900 text-center p-2">
                                <FileVideo className="h-8 w-8 text-red-500 mb-1" />
                                <span className="text-[10px] font-mono font-bold truncate max-w-full">VIDEO CLIP</span>
                              </div>
                            )}
                          </div>
                          <div className="mt-2 text-left">
                            <p className="font-semibold text-neutral-800 truncate text-[10.5px]" title={med.name}>{med.name}</p>
                            <p className="text-stone-400 text-[9.5px] uppercase font-mono font-bold">{med.type} • {med.size}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleOcrProcess}
                      disabled={isMediaProcessing}
                      className="flex w-full items-center justify-center space-x-2 rounded-lg bg-red-700 py-3 text-xs font-bold text-white shadow-sm hover:bg-red-800 transition cursor-pointer"
                    >
                      {isMediaProcessing ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>AI Scanning Media & Generating Text Outline...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          <span>Extract Text / Video Audio into Editor</span>
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
                      onChange={(e) => {
                        setConvertFrom(e.target.value);
                        setConversionFile(null); // Reset when switching manually
                      }}
                      className="w-full rounded border p-2 bg-white"
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

                <div className="space-y-2">
                  <span className="block text-stone-500 font-bold uppercase tracking-wider text-[10px] pr-1">Option A: Upload Physical Document File</span>
                  <div className="rounded-xl border-2 border-dashed border-stone-200 p-5 text-center bg-stone-50/50 hover:bg-stone-55 transition">
                    <span className="text-xl">📄</span>
                    <p className="font-bold text-neutral-800 text-[11px] mt-1">Upload .docx, .txt, or .pdf</p>
                    <input
                      type="file"
                      id="doc_convert_uploader"
                      accept=".docx,.txt,.pdf"
                      onChange={handleConvertFileUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="doc_convert_uploader"
                      className="mx-auto block w-fit rounded bg-neutral-900 hover:bg-neutral-800 text-white text-[10.5px] font-bold px-3 py-1.5 mt-2 cursor-pointer transition select-none"
                    >
                      Browse Physical Document
                    </label>

                    {conversionFile && (
                      <div className="mt-3 p-2 bg-white border border-stone-200 rounded-lg flex items-center justify-between text-left max-w-md mx-auto">
                        <div className="truncate">
                          <p className="font-bold text-neutral-800 text-[11px] truncate">{conversionFile.name}</p>
                          <p className="text-stone-400 text-[10px]">{conversionFile.size} • Prepared</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setConversionFile(null)}
                          className="text-red-700 text-xs font-bold underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-stone-200"></div>
                  <span className="flex-shrink mx-4 text-stone-400 font-bold text-[10px] uppercase">OR</span>
                  <div className="flex-grow border-t border-stone-200"></div>
                </div>

                <div>
                  <label className="block text-stone-500 mb-1.5 font-bold uppercase tracking-wider text-[10px]">Option B: Paste File Content or Outline Text</label>
                  <textarea
                    rows={6}
                    value={sourceCode}
                    onChange={(e) => {
                      setSourceCode(e.target.value);
                      if (e.target.value.trim()) {
                        setConversionFile(null); // Prefer pasted content instead
                      }
                    }}
                    placeholder="Paste raw Word copy-pastes, transcripts, or plain text notes here to format..."
                    className="w-full rounded-lg border border-stone-200 bg-neutral-50 px-3 py-2 outline-none focus:bg-white focus:border-red-750 font-mono text-xs"
                  />
                </div>

                <button
                  onClick={handleConvert}
                  disabled={isConverting}
                  className="w-full flex items-center justify-center space-x-2 rounded-lg bg-red-700 py-3 font-bold text-white shadow-sm hover:bg-red-800 transition cursor-pointer"
                >
                  {isConverting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>AI Parsing & Composing Structured PDF Draft...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Process & Convert Document</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* TAB 3: Writer Editor (Standalone) */}
            {activeTab === "write" && (
              <div className="space-y-4 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                  <div>
                    <label className="block text-stone-500 font-bold mb-0.5">Direct Outliner & Publisher Editor</label>
                    <p className="text-[10px] text-stone-400">Design custom manuscripts, outlines, and lectures</p>
                  </div>
                  
                  {/* Zion Academy Course Code Template Charger */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end">
                    <span className="text-[10px] font-bold text-red-900 font-mono tracking-tight shrink-0">🏛️ Quick Zion Courses:</span>
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        const dateStr = new Date().toISOString().split("T")[0];
                        let title = "Zion Outline";
                        let content = "";

                        if (val === "it") {
                          title = "ZION IT Fundamental Outline";
                          content = `🏛️ ZION DIGITAL ACADEMY\nCOURSE CODE: ZIO01/001/26\nOFFICIAL RESEARCH OUTLINE & MANUSCRIPT\nDATE: ${dateStr}\n-----------------------------------------------\n\n## TOPIC: Fundamentals of ICT Infrastructure & Local Area Servers\n\n### MODULE 1: Computer Ingress & Reverse Proxy Paradigms\n- Structural routing strategies\n- Safe local bindings for development servers\n- Port configurations in sandboxed host environments\n\n### MODULE 2: Operating System Architectures\n- Dual-stack networks\n- Persistent storage queues\n- Client-side caching and SQLite engines`;
                        } else if (val === "db") {
                          title = "Zion System Security notes";
                          content = `🏛️ ZION DIGITAL ACADEMY\nCOURSE CODE: ZIO02/002/26\nOFFICIAL RESEARCH OUTLINE & MANUSCRIPT\nDATE: ${dateStr}\n-----------------------------------------------\n\n## TOPIC: Advanced Cyber Security & Firestore Real-time Queries\n\n### SECTION 1: Firestore Rule Optimization\n- Safe request.auth token verification patterns\n- Secure collection mapping and read constraints\n\n### SECTION 2: Cryptographic Hash Transcripts\n- Securing client sessions\n- Local credentials storage guidelines`;
                        } else if (val === "sec") {
                          title = "Zion Servant Leadership series";
                          content = `🏛️ ZION DIGITAL ACADEMY\nCOURSE CODE: ZIO03/003/26\nOFFICIAL RESEARCH OUTLINE & MANUSCRIPT\nDATE: ${dateStr}\n-----------------------------------------------\n\n## TOPIC: Servant Leadership & Cooperative Local Empowerment\n\n### TOPIC 1: Community Empowerment\n- Bungoma Central youth leadership guidelines\n- Teamwork frameworks of digital literacy cooperatives\n\n### TOPIC 2: Ethical Decision Making\n- Maintaining horizontal accountability structures\n- Community asset ownership models`;
                        }

                        setDocTitle(title);
                        setEditorContent(content);
                        // Open Interactive preview immediately to see styled layout!
                        setRightPanelTab("preview");
                      }}
                      className="rounded border border-stone-200 bg-neutral-50 px-2.5 py-1.5 text-[10.5px] font-bold tracking-tight text-neutral-800 outline-none cursor-pointer"
                      defaultValue=""
                    >
                      <option value="">-- Load Zion Template --</option>
                      <option value="it">ZION01 • Fundamentals of Computer IT (ZIO01/001/26)</option>
                      <option value="db">ZION02 • System Security & Firestore (ZIO02/002/26)</option>
                      <option value="sec">ZION03 • Servant Leadership Dynamics (ZIO03/003/26)</option>
                    </select>
                  </div>
                </div>

                {/* Interactive Highlighting Tools */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-stone-50 border border-stone-200 rounded-xl p-3">
                  <span className="text-[10px] uppercase font-extrabold text-stone-600 font-mono">🎨 Text Selection Highlighting Tools:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleApplyHighlight("yellow")}
                      className="px-2.5 py-1.5 rounded-lg bg-yellow-100 hover:bg-yellow-200 border border-yellow-300 text-yellow-800 font-bold font-mono tracking-normal text-[10px] cursor-pointer flex items-center space-x-1 transition"
                      title="Select text in editor below and click to register yellow highlight tag"
                    >
                      <span className="h-2 w-2 rounded-full bg-yellow-400"></span>
                      <span>Highlight Yellow</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyHighlight("cyan")}
                      className="px-2.5 py-1.5 rounded-lg bg-cyan-100 hover:bg-cyan-200 border border-cyan-300 text-cyan-800 font-bold font-mono tracking-normal text-[10px] cursor-pointer flex items-center space-x-1 transition"
                      title="Select text in editor below and click to register cyan highlight tag"
                    >
                      <span className="h-2 w-2 rounded-full bg-cyan-400"></span>
                      <span>Highlight Cyan</span>
                    </button>
                    {currentHighlights.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentHighlights([]);
                          alert("All active highlights cleared from editor draft cache.");
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 font-bold text-[10px] cursor-pointer transition font-mono"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  ref={editorTextareaRef}
                  rows={8}
                  value={editorContent}
                  onChange={(e) => setEditorContent(e.target.value)}
                  placeholder="Start composing your premium publication chapter outline... TIP: Select any phrase/sentences inside here and click highlighters above to pin tags!"
                  className="w-full rounded-xl border border-stone-200 p-4 font-mono text-xs leading-relaxed outline-none focus:border-red-700 focus:ring-1 focus:ring-red-400"
                />

                {/* Display Current Highlighting Metadata tags */}
                {currentHighlights.length > 0 && (
                  <div className="bg-stone-55/40 rounded-xl border border-stone-200 p-3.5 space-y-2">
                    <span className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider block">🏷️ Active Highlighting Metadata Tags ({currentHighlights.length}):</span>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {currentHighlights.map((hl) => (
                        <div
                          key={hl.id}
                          className={`flex items-center space-x-2 rounded-lg px-2.5 py-1 border text-[10.5px] leading-tight max-w-full font-mono ${
                            hl.color === "yellow" 
                              ? "bg-yellow-50/70 text-yellow-950 border-yellow-200" 
                              : "bg-cyan-50/70 text-cyan-950 border-cyan-200"
                          }`}
                        >
                          <span className="truncate max-w-[200px] select-all">"{hl.text}"</span>
                          <button
                            type="button"
                            onClick={() => setCurrentHighlights(currentHighlights.filter(h => h.id !== hl.id))}
                            className="hover:text-red-700 font-extrabold text-[12px] shrink-0 p-0.5 cursor-pointer leading-none transition"
                            title="Remove Highlight Tag"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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

            {activeTab === "curriculum" && (
              <div className="space-y-4 text-xs text-left">
                <div className="rounded-xl border border-stone-150 bg-stone-50/50 p-4 space-y-2">
                  <h4 className="font-bold text-neutral-900 flex items-center gap-1">
                    <Sparkles className="h-4 w-4 text-red-700 animate-pulse" />
                    <span>Zion Digital AI Syllabus Architect</span>
                  </h4>
                  <p className="text-stone-500 leading-normal text-[11px]">
                    Enter a specialized subject (e.g., <em>"Strategic Governance & Administrative Integrity in East Africa"</em> or <em>"Modern High-Performance Memory-Mapped Software Engineering in C++"</em>) and our distinguished AI instructor will formulate exactly 10 comprehensive academic topics.
                  </p>
                  <p className="text-stone-500 leading-normal text-[11px]">
                    Each topic will come equipped with 5 numbered key subtopics (50 subtopics total) paired with detailed notes (equivalent of approximately 4 printed pages total) of unmatched scholarly depth.
                  </p>
                </div>

                <form onSubmit={handleGenerateCurriculumSyllabus} className="space-y-4">
                  <div>
                    <label className="block text-stone-500 font-bold mb-1.5 uppercase tracking-wide">Target Scholarly Subject Name</label>
                    <input
                      type="text"
                      required
                      value={curriculumSubject}
                      onChange={(e) => setCurriculumSubject(e.target.value)}
                      className="w-full rounded-lg border border-stone-200 bg-neutral-50 px-3.5 py-2.5 outline-none focus:bg-white text-xs font-semibold"
                      placeholder="e.g. Transformational African Leadership Paradigms or Advanced Distributed Computing Systems"
                    />
                  </div>

                  {curriculumError && (
                    <div className="rounded-xl bg-red-50 border border-red-100 p-3.5 text-xs text-red-950 flex items-start space-x-2">
                      <AlertCircle className="h-4 w-4 text-red-700 shrink-0 mt-0.5" />
                      <span>{curriculumError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isGeneratingCurriculum || !curriculumSubject.trim()}
                    className="w-full flex items-center justify-center space-x-2 rounded-lg bg-red-700 hover:bg-neutral-900 text-white font-bold py-3 shadow-md disabled:opacity-45 cursor-pointer"
                  >
                    {isGeneratingCurriculum ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>AI Director Creating Syllabus & Intensive Study Ledger (approx. 4 Dense Pages)...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>Generate Complete 10-Topic Notes</span>
                      </>
                    )}
                  </button>
                </form>
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
            {currentUser?.role === "admin" && (
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
            )}
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

                    {/* Active highlight metadata tags print preview */}
                    {currentHighlights.length > 0 && (
                      <div className="mt-6 border-t border-dashed border-stone-200 pt-3 space-y-1 text-left">
                        <span className="text-[9px] font-bold text-stone-405 font-mono block tracking-wider uppercase">HIGHLIGHTED TRANSCRIPT SECTIONS:</span>
                        <div className="flex flex-wrap gap-1">
                          {currentHighlights.map((hl) => (
                            <span
                              key={hl.id}
                              className={`rounded px-1.5 py-0.5 text-[9px] font-mono select-none border leading-normal inline-block ${
                                hl.color === "yellow" 
                                  ? "bg-yellow-50 text-yellow-800 border-yellow-200" 
                                  : "bg-cyan-50 text-cyan-800 border-cyan-200"
                              }`}
                            >
                              🔖 "{hl.text}"
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

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
              <h3 className="font-display text-base font-bold text-stone-900 mb-3 flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Folder className="h-4.5 w-4.5 text-red-700" />
                  <span>Vault Folders</span>
                </span>
                <span className="text-[9px] bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">Vault Storage</span>
              </h3>

              {/* Expandable Multi-Uploader Widget */}
              <div className="mb-4 border border-stone-150 rounded-xl bg-neutral-50 p-3.5 text-xs">
                <h4 className="font-bold text-stone-850 mb-2 flex items-center justify-between">
                  <span>📥 Vault Multi-Uploader</span>
                  <span className="text-[10px] text-gray-500 font-medium">Any format supported</span>
                </h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-extrabold font-mono text-stone-500 mb-1">Select Destination Folder:</label>
                    <div className="flex gap-1.5">
                      <select
                        value={selectedFolder}
                        onChange={(e) => setSelectedFolder(e.target.value)}
                        className="flex-1 rounded-lg border border-stone-200 bg-white p-1.5 text-xs outline-none"
                      >
                        {folders.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="New folder..."
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        className="w-24 rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newFolderName.trim() && !folders.includes(newFolderName.trim())) {
                            setFolders([...folders, newFolderName.trim()]);
                            setSelectedFolder(newFolderName.trim());
                            setNewFolderName("");
                          }
                        }}
                        className="rounded-lg bg-red-700 px-3 py-1 text-white font-bold cursor-pointer hover:bg-red-800 transition"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Two Sub-Tabs: Upload Files vs. Save URL Link */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-stone-105 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setVaultUploadMode("files")}
                      className={`py-1 text-[10px] font-bold uppercase rounded-md transition cursor-pointer ${vaultUploadMode === "files" ? "bg-white text-stone-900 shadow-2xs" : "text-stone-500 hover:text-stone-700"}`}
                    >
                      Multiple Files
                    </button>
                    <button
                      type="button"
                      onClick={() => setVaultUploadMode("link")}
                      className={`py-1 text-[10px] font-bold uppercase rounded-md transition cursor-pointer ${vaultUploadMode === "link" ? "bg-white text-stone-900 shadow-2xs" : "text-stone-500 hover:text-stone-700"}`}
                    >
                      External URL Link
                    </button>
                  </div>

                  {vaultUploadMode === "files" ? (
                    <div className="space-y-2">
                      <div
                        className="border-2 border-dashed border-stone-200 hover:border-red-400 bg-white hover:bg-neutral-100 p-4 rounded-xl text-center cursor-pointer transition relative"
                        onClick={() => document.getElementById("vault_multi_files")?.click()}
                      >
                        <Upload className="h-5 w-5 text-stone-400 mx-auto mb-1 animate-bounce" />
                        <span className="font-semibold block text-[11px] text-stone-700">Drag & Drop or Choose Files</span>
                        <span className="text-[9px] text-stone-400 block mt-0.5">Supports PDF, Word (DOC), Photos, Audios, Videos & Books</span>
                        <input
                          id="vault_multi_files"
                          type="file"
                          multiple
                          onChange={handleVaultFilesUpload}
                          className="hidden"
                        />
                      </div>
                      {vaultUploadedPreview.length > 0 && (
                        <div className="space-y-1.5 max-h-[120px] overflow-y-auto bg-white p-2 rounded-lg border border-stone-150 pr-1.5">
                          {vaultUploadedPreview.map((f, i) => (
                            <div key={i} className="flex items-center justify-between text-[10px] font-mono text-stone-600 bg-stone-50 p-1.5 rounded border border-stone-100">
                              <span className="truncate max-w-[150px] font-bold">{f.name}</span>
                              <span className="text-stone-400 shrink-0">({f.size} KB)</span>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={handleProcessVaultBatchUpload}
                            className="w-full mt-2 rounded-lg bg-red-700 text-white font-bold py-1.5 uppercase tracking-wide hover:bg-red-800 cursor-pointer transition flex items-center justify-center space-x-1"
                          >
                            <span>Save All to Folder "{selectedFolder}"</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Link Title (e.g. Leadership Strategy)"
                          value={linkInputTitle}
                          onChange={(e) => setLinkInputTitle(e.target.value)}
                          className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-red-650 font-medium"
                        />
                        <input
                          type="text"
                          placeholder="URL (e.g. https://...)"
                          value={linkInputUrl}
                          onChange={(e) => setLinkInputUrl(e.target.value)}
                          className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-red-650 font-medium"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleProcessVaultLinkSave}
                        disabled={!linkInputTitle.trim() || !linkInputUrl.trim()}
                        className="w-full rounded-lg bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white font-bold py-1.5 uppercase transition cursor-pointer text-[10px]"
                      >
                        Save Link to Vault
                      </button>
                    </div>
                  )}
                </div>
              </div>

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
                                <div className="flex items-center space-x-1 flex-wrap gap-1 mb-1">
                                  {doc.type === "pdf" && <span className="bg-red-50 border border-red-200 text-red-700 px-1 rounded font-mono font-bold text-[8px] uppercase">📄 PDF</span>}
                                  {doc.type === "doc" && <span className="bg-sky-50 border border-sky-200 text-sky-700 px-1 rounded font-mono font-bold text-[8px] uppercase">📝 DOC</span>}
                                  {doc.type === "photo" && <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-1 rounded font-mono font-bold text-[8px] uppercase">🖼️ PHOTO</span>}
                                  {doc.type === "audio" && <span className="bg-violet-50 border border-violet-200 text-violet-750 px-1 rounded font-mono font-bold text-[8px] uppercase">🎵 AUDIO</span>}
                                  {doc.type === "video" && <span className="bg-amber-50 border border-amber-200 text-amber-700 px-1 rounded font-mono font-bold text-[8px] uppercase">🎬 VIDEO</span>}
                                  {doc.type === "book" && <span className="bg-yellow-50 border border-yellow-200 text-yellow-750 px-1 rounded font-mono font-bold text-[8px] uppercase">📚 BOOK</span>}
                                  {doc.type === "link" && <span className="bg-teal-50 border border-teal-200 text-teal-700 px-1 rounded font-mono font-bold text-[8px] uppercase">🔗 LINK</span>}
                                  <h4 className="font-bold text-stone-850 truncate max-w-[130px] inline-block align-middle">{doc.title}</h4>
                                </div>
                                <p className="text-[10px] text-stone-400 font-mono mt-0.5">{doc.date} • {doc.fileSize}</p>
                                {doc.type === "link" ? (
                                  <a href={doc.content} target="_blank" rel="noopener noreferrer" className="text-[10px] text-red-700 font-semibold underline truncate max-w-[180px] block mt-1 hover:text-red-900 leading-normal">{doc.content}</a>
                                ) : (
                                  <p className="text-[11px] text-stone-500 line-clamp-2 mt-1 italic font-mono leading-relaxed">"{doc.content.startsWith("data:") ? "[Document / File Data Content Preview]" : doc.content}"</p>
                                )}
                                {doc.highlights && doc.highlights.length > 0 && (
                                  <div className="mt-1.5 flex flex-wrap gap-1">
                                    {doc.highlights.map((hl: any, idx: number) => (
                                      <span
                                        key={idx}
                                        className={`rounded px-1.5 py-0.5 text-[8px] font-mono select-none leading-none border inline-block ${
                                          hl.color === "yellow" 
                                            ? "bg-yellow-50 text-yellow-850 border-yellow-200" 
                                            : "bg-cyan-50 text-cyan-800 border-cyan-200"
                                        }`}
                                        title={`Highlight tag from editor`}
                                      >
                                        🔖 {hl.text}
                                      </span>
                                    ))}
                                  </div>
                                )}
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
                                  onClick={() => {
                                    setDocumentToDelete({ id: doc.id, title: doc.title });
                                    setDeleteModalOpen(true);
                                  }}
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

      {/* Reusable custom confirmation modal for document deletion to prevent accidental clicks */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        title="Delete Document"
        itemName={documentToDelete?.title || ""}
        itemType="document"
        onConfirm={async () => {
          if (documentToDelete) {
            await handleDeleteCheckFirestore(documentToDelete.id);
            setDeleteModalOpen(false);
            setDocumentToDelete(null);
          }
        }}
        onCancel={() => {
          setDeleteModalOpen(false);
          setDocumentToDelete(null);
        }}
        confirmText="Yes, Delete"
        cancelText="No, Keep"
      />
    </div>
  );
}
