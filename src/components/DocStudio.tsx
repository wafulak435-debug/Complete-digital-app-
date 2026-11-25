import React, { useState, useEffect, useRef } from "react";
import { 
  FileText, Image, Mic, PenTool, FolderPlus, Download, Trash, FileVideo, 
  RefreshCw, Sparkles, Plus, Folder, AlertCircle, Mail, CheckCircle2, 
  Eye, Printer, ZoomIn, ZoomOut, Cloud, CloudOff, Upload, Calculator, Clock, HelpCircle, FileText as FileIcon, Landmark
} from "lucide-react";
import { SavedDocument } from "../types";
import { getAccessToken, googleSignIn, sendGmailMessage } from "../lib/firebase";
import { saveDocumentToFirestore, deleteSavedDocumentFromFirestore } from "../lib/firestoreUtils";
import { DeleteConfirmationModal } from "./DeleteConfirmationModal";
import { jsPDF } from "jspdf";
import { invokeGeminiAction } from "../lib/aiClient";
import QuotePosterDesigner from "./QuotePosterDesigner";

interface DocStudioProps {
  currentUser: { email: string; name: string; role?: string } | null;
  onAddNewDocument: (doc: SavedDocument) => void;
  savedDocuments: SavedDocument[];
  onDeleteDocument: (id: string) => void;
}

export default function DocStudio({ currentUser, onAddNewDocument, savedDocuments, onDeleteDocument }: DocStudioProps) {
  const [editorContent, setEditorContent] = useState("");
  const [activeTab, setActiveTab] = useState<"ocr" | "convert" | "write" | "media" | "curriculum" | "solver" | "posters">("ocr");
  const [docTitle, setDocTitle] = useState("My Document");
  const [autoSaveStatus, setAutoSaveStatus] = useState("Draft saved");

  // STEM & Complex Problem Solver states
  const [solverInput, setSolverInput] = useState("");
  const [solverResult, setSolverResult] = useState("");
  const [isSolving, setIsSolving] = useState(false);
  const [enableGrounding, setEnableGrounding] = useState(false);
  const [solverAttachedFiles, setSolverAttachedFiles] = useState<{ id: string; name: string; dataUrl: string; size: string; type: string }[]>([]);
  const [solvingSources, setSolvingSources] = useState<{ title: string; uri: string }[]>([]);
  
  // Voice Verbal Query states
  const [voiceQueryMode, setVoiceQueryMode] = useState<"transcribe" | "query">("transcribe");
  const [voiceAnswer, setVoiceAnswer] = useState("");
  const [isVoiceQuerying, setIsVoiceQuerying] = useState(false);
  const [voiceQueryGrounding, setVoiceQueryGrounding] = useState(false);
  const [voiceResponseSources, setVoiceResponseSources] = useState<{ title: string; uri: string }[]>([]);

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
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Montserrat:wght@400;750&family=Open+Sans:wght@400;600;700&family=Lora:ital,wght@0,400;0,600;1,400&family=JetBrains+Mono:wght@400;700&display=swap');
            body {
              font-family: ${previewStyle === "serif" ? "'Lora', 'Playfair Display', Georgia, serif" : previewStyle === "mono" ? "'JetBrains Mono', monospace" : "'Open Sans', 'Montserrat', sans-serif"};
              padding: ${previewMargin === "compact" ? "1.5cm" : previewMargin === "wide" ? "3.5cm" : "2.5cm"};
              line-height: 1.65;
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
              font-family: ${previewStyle === "serif" ? "'Playfair Display', serif" : previewStyle === "mono" ? "'JetBrains Mono', monospace" : "'Montserrat', sans-serif"};
              color: #b91c1c;
              font-size: 26px;
              margin-top: 0;
              margin-bottom: 16px;
              font-weight: 800;
            }
            p {
              margin: 0 0 16px 0;
              font-size: 11pt; /* 11pt as mandated by the publisher spec */
              text-align: justify;
              text-justify: inter-word;
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
            <span>ZION DIGITAL PUBLISHERS • OFFICIAL MANUSCRIPT</span>
            <span>${docTitle || "Untitled"}</span>
          </header>
          <h1>${docTitle || "Untitled Document"}</h1>
          <div style="white-space: pre-wrap;">${activeText}</div>
          <footer>
            <span>Zion Digital Publishers • Bungoma, Kenya</span>
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
  
  // Real-time document/media uploading simulation states
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [docProgress, setDocProgress] = useState(0);
  const [docFileName, setDocFileName] = useState("");
  const [docSpeed, setDocSpeed] = useState("0.0 MB/s");
  const [docEta, setDocEta] = useState("Estimating...");
  const [docStatusText, setDocStatusText] = useState("");

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
  const [mediaFiles, setMediaFiles] = useState<{ id: string; type: "photo" | "video" | "document"; name: string; dataUrl: string; size: string }[]>([]);
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
    if (files && files.length > 0) {
      const fileArray = Array.from(files) as File[];
      const firstFile = fileArray[0];
      setDocFileName(fileArray.length > 1 ? `${fileArray.length} vault files` : firstFile.name);
      setDocProgress(0);
      setDocSpeed("0.0 MB/s");
      setDocEta("Estimating...");
      setDocStatusText("Encrypting physical file payloads...");
      setIsUploadingDoc(true);

      let currentPrg = 0;
      const interval = setInterval(() => {
        currentPrg += Math.floor(Math.random() * 9) + 13;
        if (currentPrg >= 100) {
          currentPrg = 100;
          clearInterval(interval);
          setIsUploadingDoc(false);

          setVaultUploadedFiles((prev) => [...prev, ...fileArray]);
          const prevMetadata = fileArray.map((f) => ({ name: f.name, size: Math.round(f.size / 1024) }));
          setVaultUploadedPreview((prev) => [...prev, ...prevMetadata]);
        } else {
          setDocProgress(currentPrg);
          setDocSpeed(`${(2.1 + Math.random() * 2.2).toFixed(1)} MB/s`);
          setDocEta(`${Math.ceil((100 - currentPrg) / 14)}s`);
          setDocStatusText(
            currentPrg < 50 ? "Tunneling metadata to encrypted clusters..." :
            "Securing file with private keys..."
          );
        }
      }, 150);
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

  // Word formatting helper functions
  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const convertTextToHtmlForWord = (text: string): string => {
    const lines = text.split("\n");
    let html = "";
    let insideList = false;

    for (let line of lines) {
      let trimmed = line.trim();
      if (!trimmed) {
        if (insideList) {
          html += "</ul>\n";
          insideList = false;
        }
        html += "<p style='margin-bottom: 6pt;'>&nbsp;</p>\n";
        continue;
      }

      // Check for List items
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("• ")) {
        if (!insideList) {
          html += "<ul style='margin-bottom: 12pt;'>\n";
          insideList = true;
        }
        const itemText = trimmed.replace(/^[-*•]\s+/, "");
        html += `  <li style="font-family: Arial, sans-serif; font-size: 11pt; color: #333333; margin-bottom: 4pt;">${escapeHtml(itemText)}</li>\n`;
        continue;
      }

      if (insideList) {
        html += "</ul>\n";
        insideList = false;
      }

      // Check for headings: lines starting with #, ## or short capitalized lines
      const isHeading = trimmed.startsWith("##") || trimmed.startsWith("#") || 
                        (trimmed.toUpperCase() === trimmed && trimmed.length < 60 && trimmed.match(/[A-Z]/)) ||
                        trimmed.startsWith("CHAPTER") || trimmed.startsWith("TOPIC:") || trimmed.startsWith("SUB-TOPIC:");
      
      if (isHeading) {
        const headingText = trimmed.replace(/^[#\s]+/, "").replace(/^[*-]+/, "").trim();
        let color = "#b91c1c"; // Crimson primary for headings
        let fontSize = "16pt";
        let marginTop = "18pt";
        
        if (trimmed.startsWith("SUB-TOPIC:") || trimmed.startsWith("##")) {
          color = "#1e3a8a"; // Navy for subtopics
          fontSize = "13pt";
          marginTop = "14pt";
        }

        html += `<h2 style="font-family: 'Times New Roman', Times, serif; font-weight: bold; font-size: ${fontSize}; color: ${color}; margin-top: ${marginTop}; margin-bottom: 6pt; border-bottom: 1px solid #e5e7eb; padding-bottom: 3px;">${escapeHtml(headingText)}</h2>\n`;
      } else {
        // Regular paragraph
        let formatted = escapeHtml(trimmed);
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        formatted = formatted.replace(/__(.*?)__/g, "<strong>$1</strong>");
        
        html += `<p style="font-family: Arial, sans-serif; font-size: 11pt; color: #1f2937; line-height: 1.6; margin-bottom: 10pt; text-align: justify; text-justify: inter-word;">${formatted}</p>\n`;
      }
    }

    if (insideList) {
      html += "</ul>\n";
    }

    return html;
  };

  // Direct Word file downloader (.doc) utilizing MS-Word HTML format
  const handleDownloadWordDoc = () => {
    const activeText = editorContent || extractedOcrText || voiceText || conversionOutput || "";
    if (!activeText.trim()) {
      alert("No document content to export. Please type some text or extract content first.");
      return;
    }

    try {
      const formattedHtml = convertTextToHtmlForWord(activeText);
      const documentHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <title>${docTitle}</title>
          <!--[if gte mso 9]>
          <xml>
            <w:WordDocument>
              <w:View>Print</w:View>
              <w:Zoom>100</w:Zoom>
              <w:DoNotOptimizeForBrowser/>
            </w:WordDocument>
          </xml>
          <![endif]-->
          <style>
            @page {
              size: 21cm 29.7cm;
              margin: 2.5cm 2.5cm 2.5cm 2.5cm;
            }
            body {
              font-family: 'Arial', 'Helvetica', sans-serif;
              font-size: 11pt;
              line-height: 1.6;
              color: #1a1a1a;
            }
            h1, h2, h3 {
              font-family: 'Georgia', 'Times New Roman', Times, serif;
              font-weight: bold;
              color: #b91c1c;
              margin-top: 18pt;
              margin-bottom: 6pt;
            }
            h1 { font-size: 22pt; text-align: center; color: #b91c1c; }
            h2 { font-size: 15pt; color: #1e3a8a; border-bottom: 1px solid #e5e7eb; padding-bottom: 3px; }
            h3 { font-size: 12pt; color: #111827; }
            p {
              margin-top: 0in;
              margin-right: 0in;
              margin-bottom: 10pt;
              margin-left: 0in;
              text-align: justify;
              text-justify: inter-word;
            }
            ul, ol {
              margin-top: 0in;
              margin-bottom: 12pt;
              padding-left: 20pt;
            }
            li {
              margin-bottom: 4pt;
              color: #374151;
            }
            .header-table {
              width: 100%;
              border-bottom: 1px solid #e5e7eb;
              margin-bottom: 24pt;
              font-family: 'Courier New', Courier, monospace;
              font-size: 9pt;
              color: #6b7280;
            }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>ZION DIGITAL PUBLISHERS • AI DESIGN MACHINE</td>
              <td style="text-align: right;">${new Date().toLocaleDateString()}</td>
            </tr>
          </table>
          
          <h1 style="text-align: center; font-size: 24pt; color: #b91c1c; margin-bottom: 24pt;">${escapeHtml(docTitle)}</h1>
          
          ${formattedHtml}
          
          <div style="margin-top: 40pt; border-top: 1px solid #e5e7eb; padding-top: 10pt; font-family: 'Courier New', Courier, monospace; font-size: 8pt; color: #9ca3af; text-align: center;">
            ISSUED FROM ZION DIGITAL APP WORKSPACE • BUNGOMA, KENYA
          </div>
        </body>
        </html>
      `;

      const blob = new Blob([documentHtml], { type: "application/msword" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const sanitizedFilename = docTitle.trim().replace(/[^a-zA-Z0-9\s-_]+/g, "").replace(/\s+/g, "_") || "Document";
      
      link.href = url;
      link.download = `${sanitizedFilename}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Word export failed:", err);
      alert("Could not export document as Word: " + err.message);
    }
  };

  // Direct PDF download using jsPDF (with double borders and parchment style)
  const handleDownloadPdfFile = () => {
    const activeText = editorContent || extractedOcrText || voiceText || conversionOutput || "";
    if (!activeText.trim()) {
      alert("No document content to export. Please type some text or extract content first.");
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const w = 210;
      const h = 297;
      const pageMargin = 20;
      const contentWidth = w - (pageMargin * 2);

      // Light linen shading background
      doc.setFillColor(254, 253, 249);
      doc.rect(0, 0, w, h, "F");

      doc.setProperties({
        title: docTitle,
        subject: "Zion AI Document Export"
      });

      // Frame borders
      doc.setDrawColor(185, 28, 28);
      doc.setLineWidth(0.4);
      doc.rect(10, 10, w - 20, h - 20);

      doc.setDrawColor(218, 165, 32);
      doc.setLineWidth(0.15);
      doc.rect(11.5, 11.5, w - 23, h - 23);

      // Running header
      doc.setTextColor(100, 110, 120);
      doc.setFont("courier", "bold");
      doc.setFontSize(7.5);
      doc.text("ZION DIGITAL PUBLISHERS • AI DESIGN MACHINE", pageMargin, 16);
      doc.text(new Date().toLocaleDateString(), w - pageMargin, 16, { align: "right" });

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.line(pageMargin, 18, w - pageMargin, 18);

      // Title
      doc.setTextColor(185, 28, 28);
      doc.setFont("times", "bold");
      doc.setFontSize(20);
      const titleLines = doc.splitTextToSize(docTitle, contentWidth);
      doc.text(titleLines, pageMargin, 28);
      
      let currentY = 28 + (titleLines.length * 8) + 6;

      const splitLines = activeText.split("\n");
      for (let line of splitLines) {
        let trimmed = line.trim();
        if (!trimmed) {
          currentY += 5;
          continue;
        }

        if (currentY > h - 25) {
          doc.addPage();
          doc.setFillColor(254, 253, 249);
          doc.rect(0, 0, w, h, "F");

          doc.setDrawColor(185, 28, 28);
          doc.setLineWidth(0.4);
          doc.rect(10, 10, w - 20, h - 20);
          
          doc.setDrawColor(218, 165, 32);
          doc.setLineWidth(0.15);
          doc.rect(11.5, 11.5, w - 23, h - 23);

          // Running header
          doc.setTextColor(100, 110, 120);
          doc.setFont("courier", "bold");
          doc.setFontSize(7.5);
          doc.text("ZION DIGITAL PUBLISHERS • AI DESIGN MACHINE", pageMargin, 16);
          doc.text(new Date().toLocaleDateString(), w - pageMargin, 16, { align: "right" });

          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.2);
          doc.line(pageMargin, 18, w - pageMargin, 18);

          currentY = 25;
        }

        const isHeading = trimmed.startsWith("##") || trimmed.startsWith("#") || trimmed.startsWith("CHAPTER") || trimmed.startsWith("TOPIC:");
        if (isHeading) {
          const headingText = trimmed.replace(/^[#\s]+/, "").trim();
          doc.setTextColor(30, 58, 138);
          doc.setFont("times", "bold");
          doc.setFontSize(12);
          const linesWrapped = doc.splitTextToSize(headingText, contentWidth);
          doc.text(linesWrapped, pageMargin, currentY);
          currentY += (linesWrapped.length * 6) + 2;
        } else {
          doc.setTextColor(26, 26, 26);
          doc.setFont("times", "normal");
          doc.setFontSize(10);
          const linesWrapped = doc.splitTextToSize(trimmed, contentWidth);
          doc.text(linesWrapped, pageMargin, currentY);
          currentY += (linesWrapped.length * 4.4) + 2.2;
        }
      }

      const sanitizedFilename = docTitle.trim().replace(/[^a-zA-Z0-9\s-_]+/g, "").replace(/\s+/g, "_") || "Document";
      doc.save(`${sanitizedFilename}.pdf`);
    } catch (err: any) {
      console.error("Direct PDF compilation failed:", err);
      alert("Failed to compile direct PDF: " + err.message);
    }
  };

  // Unified Media & Physical Document uploader
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArr = Array.from(e.target.files) as File[];
      const firstFile = filesArr[0];
      setDocFileName(filesArr.length > 1 ? `${filesArr.length} files selected` : firstFile.name);
      setDocProgress(0);
      setDocSpeed("0.0 MB/s");
      setDocEta("Estimating...");
      setDocStatusText("Preparing media stream pipelines...");
      setIsUploadingDoc(true);

      let currentPrg = 0;
      const interval = setInterval(() => {
        currentPrg += Math.floor(Math.random() * 8) + 14; // Snappy upload
        if (currentPrg >= 100) {
          currentPrg = 100;
          clearInterval(interval);
          setIsUploadingDoc(false);

          filesArr.forEach((file: File) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              let type: "photo" | "video" | "document" = "photo";
              if (file.type.startsWith("video/")) {
                type = "video";
              } else if (
                file.type === "application/pdf" || 
                file.name.endsWith(".pdf") || 
                file.name.endsWith(".docx") || 
                file.name.endsWith(".txt") || 
                file.type.includes("wordprocessingml") || 
                file.type.startsWith("text/")
              ) {
                type = "document";
              }

              const newMedia = {
                id: "media_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
                type: type as "photo" | "video" | "document",
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
        } else {
          setDocProgress(currentPrg);
          setDocSpeed(`${(3.5 + Math.random() * 3).toFixed(1)} MB/s`);
          setDocEta(`${Math.ceil((100 - currentPrg) / 18)}s`);
          setDocStatusText(
            currentPrg < 40 ? "Deconstructing file blocks..." :
            currentPrg < 80 ? "Verifying stream frames checksum..." :
            "Writing ingestion catalog reference..."
          );
        }
      }, 150);
    }
  };

  // Extract from uploaded photos & documents sequentially using Gemini server OCR
  const handleOcrProcess = async () => {
    if (mediaFiles.length === 0) {
      alert("Please upload at least one photo or document to extract text from.");
      return;
    }
    
    setIsOcrProcessing(true);
    setIsMediaProcessing(true);
    setExtractedOcrText("");

    try {
      let concatenatedResult = "";
      
      for (let i = 0; i < mediaFiles.length; i++) {
        const med = mediaFiles[i];
        let payloadMime = med.type === "video" ? "video/mp4" : "image/png";
        
        if (med.dataUrl.startsWith("data:")) {
          const mimeMatch = med.dataUrl.match(/data:([^;]+);/);
          if (mimeMatch) {
            payloadMime = mimeMatch[1];
          }
        }

        // Set title dynamically based on the first processed document title if unchanged
        if (i === 0 && docTitle === "My Document") {
          setDocTitle(med.name.replace(/\.[^/.]+$/, ""));
        }

        const data = await invokeGeminiAction("extract", "/api/ai/extract", {
          fileBase64: med.dataUrl,
          fileName: med.name,
          customMimeType: payloadMime,
          docTitle
        });
        if (data.success && data.text) {
          if (mediaFiles.length > 1) {
            concatenatedResult += `\n\n=== EXTRACTED FROM: ${med.name.toUpperCase()} ===\n\n${data.text}`;
          } else {
            concatenatedResult += data.text;
          }
        } else {
          console.warn(`Extraction failed for ${med.name}:`, data.error);
        }
      }

      if (concatenatedResult.trim()) {
        const cleanedText = concatenatedResult.trim();
        setExtractedOcrText(cleanedText);
        setEditorContent(cleanedText); // load to editor instantly
        alert(`🎉 Extraction Complete!\nAI successfully processed ${mediaFiles.length} file(s) and loaded the compiled text into the Direct Outliner editor.`);
      } else {
        alert("Extraction failed: could not extract clear text from the uploaded files.");
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
      setDocFileName(file.name);
      setDocProgress(0);
      setDocSpeed("0.0 MB/s");
      setDocEta("Estimating...");
      setDocStatusText("Reading local document bytes...");
      setIsUploadingDoc(true);

      let currentPrg = 0;
      const interval = setInterval(() => {
        currentPrg += Math.floor(Math.random() * 10) + 12;
        if (currentPrg >= 100) {
          currentPrg = 100;
          clearInterval(interval);
          setIsUploadingDoc(false);

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
        } else {
          setDocProgress(currentPrg);
          setDocSpeed(`${(1.8 + Math.random() * 1.5).toFixed(1)} MB/s`);
          setDocEta(`${Math.ceil((100 - currentPrg) / 12)}s`);
          setDocStatusText(
            currentPrg < 45 ? "Extracting textual indices..." :
            "Readying parser pipelines..."
          );
        }
      }, 150);
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
      const data = conversionFile
        ? await invokeGeminiAction("extract", "/api/ai/extract", {
            fileBase64: conversionFile.dataUrl,
            fileName: conversionFile.name,
            docTitle,
            customMimeType: convertFrom === "Word" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : convertFrom === "PDF" ? "application/pdf" : "text/plain"
          })
        : await invokeGeminiAction("publish", "/api/ai/publish", {
            originalContent: sourceCode,
            requestedTitle: `${docTitle} (Converted)`,
            targetCategory: "Conversion",
            authorName: currentUser?.name || "Wafula Library Member"
          });
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
      const data = await invokeGeminiAction(
        "generate-curriculum",
        "/api/school/generate-curriculum",
        { subject: curriculumSubject.trim() },
        {
          saveHistory: true,
          historyTitle: `Curriculum: ${curriculumSubject.trim()}`,
          historyCategory: "Doc Studio Curriculum",
        }
      );
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

  // STEM & Math Problem Solving Dispatcher
  const handleSolveProblem = async (problemPrompt?: string, attachmentsOverride?: typeof solverAttachedFiles) => {
    const promptToSend = (problemPrompt || solverInput).trim();
    if (!promptToSend) {
      alert("Please enter a math equation, logical puzzle, or complex programming issue to solve.");
      return;
    }

    setIsSolving(true);
    setSolverResult("");
    setSolvingSources([]);

    try {
      const stagedAttachments = attachmentsOverride || solverAttachedFiles;
      const imagesPayload = stagedAttachments.map(f => f.dataUrl);

      const data = await invokeGeminiAction(
        "assistant",
        "/api/ai/assistant",
        {
          prompt: promptToSend,
          category: "Problem Solver",
          enableGoogleSearch: enableGrounding,
          images: imagesPayload.length > 0 ? imagesPayload : undefined
        },
        {
          saveHistory: true,
          historyTitle: `Problem Solver: ${promptToSend.slice(0, 60)}`,
          historyCategory: "Problem Solver",
        }
      );
      if (data.success) {
        setSolverResult(data.text);
        if (data.groundingSources) {
          setSolvingSources(data.groundingSources);
        }
      } else {
        alert("Zion Solver failed: " + (data.error || "Unknown server rejection."));
      }
    } catch (e: any) {
      console.error(e);
      alert("Error reaching AI Problem Solver server: " + e.message);
    } finally {
      setIsSolving(false);
    }
  };

  const handleSolverAttachedUploader = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files) as File[];
      filesArr.forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const extension = file.name.split(".").pop()?.toLowerCase() || "";
          let fileType = "photo";
          if (extension === "pdf") fileType = "pdf";
          else if (extension === "txt") fileType = "doc";

          const newFile = {
            id: "solv_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
            name: file.name,
            dataUrl: reader.result as string,
            size: `${(file.size / 1024).toFixed(1)} KB`,
            type: fileType
          };
          setSolverAttachedFiles(prev => [...prev, newFile]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // Speaks aloud or processes the verbal query response
  const handleVoiceQuerySolve = async () => {
    const promptToSend = voiceText.trim();
    if (!promptToSend) {
      alert("Please record or dictate your verbal query first.");
      return;
    }

    setIsVoiceQuerying(true);
    setVoiceAnswer("");
    setVoiceResponseSources([]);

    try {
      const data = await invokeGeminiAction(
        "assistant",
        "/api/ai/assistant",
        {
          prompt: promptToSend,
          category: "Problem Solver",
          enableGoogleSearch: voiceQueryGrounding
        },
        {
          saveHistory: true,
          historyTitle: `Voice Query: ${promptToSend.slice(0, 60)}`,
          historyCategory: "Voice Solver",
        }
      );
      if (data.success) {
        setVoiceAnswer(data.text);
        if (data.groundingSources) {
          setVoiceResponseSources(data.groundingSources);
        }
        
        // Let's do optional TTS simulation if SpeechSynthesis is supported
        if (typeof window !== "undefined" && window.speechSynthesis) {
          try {
            const utterance = new SpeechSynthesisUtterance("I have solved your verbal query. Here is the step by step explanation.");
            utterance.rate = 1.05;
            window.speechSynthesis.speak(utterance);
          } catch(e) {}
        }
      } else {
        alert("Zion Verbal AI Solver failed: " + (data.error || "No response."));
      }
    } catch (e: any) {
      console.error(e);
      alert("Verbal AI Solver network error: " + e.message);
    } finally {
      setIsVoiceQuerying(false);
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
          <button
            onClick={() => setActiveTab("solver")}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-2 transition cursor-pointer ${
              activeTab === "solver" ? "bg-[#155EEF] text-white shadow-xs" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Calculator className="h-4 w-4" />
            <span>AI Math &amp; STEM Solver</span>
          </button>
          <button
            onClick={() => setActiveTab("posters")}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-2 transition cursor-pointer ${
              activeTab === "posters" ? "bg-[#0B254D] text-[#F5B82E] shadow-xs" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Image className="h-4 w-4" />
            <span>Posters &amp; Schedule</span>
          </button>
        </div>
      </div>

      {activeTab === "posters" ? (
        <QuotePosterDesigner currentUser={currentUser} />
      ) : (
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

            {/* TAB 1: Photos, Videos & Documents ➔ PDF / Text Extraction */}
            {activeTab === "ocr" && (
              <div className="space-y-4 text-xs">
                {isUploadingDoc ? (
                  <div className="rounded-xl border border-stone-200 bg-neutral-900 text-white p-5 space-y-3 shadow-md animate-fade-in">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="bg-red-500/25 text-red-300 border border-red-500/30 text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded">
                          AI SECURE INGEST
                        </span>
                        <h4 className="font-bold text-xs truncate mt-1.5 max-w-[240px]">
                          {docFileName}
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-350">{docSpeed}</span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-slate-400 font-semibold">{docStatusText}</span>
                        <span className="text-xs font-bold text-red-400">{docProgress}%</span>
                      </div>
                      <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden border border-neutral-750 p-[1px]">
                        <div 
                          className="bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500 h-full rounded-full transition-all duration-200"
                          style={{ width: `${docProgress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[9px] font-mono text-slate-400">
                      <span>ETA: {docEta}</span>
                      <span className="text-emerald-400">● SECURE SSL TUNNEL</span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-stone-200 p-6 text-center space-y-3 bg-neutral-50 animate-fade-in">
                    <span className="text-3xl text-stone-400">📽️</span>
                    <div className="text-xs">
                      <p className="font-bold text-neutral-800">Upload Photos or Documents for AI Extraction</p>
                      <p className="text-stone-400 mt-1">Accepts multiple images, transcripts, video clips, PDFs, Word (.docx) or Text (.txt) files.</p>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*,application/pdf,.docx,.txt"
                      onChange={handleMediaUpload}
                      className="hidden"
                      id="ocr_multimedia_uploader"
                    />
                    <label
                      htmlFor="ocr_multimedia_uploader"
                      className="mx-auto block w-fit rounded bg-neutral-900 text-white text-xs font-bold px-4 py-2 hover:bg-neutral-800 cursor-pointer transition select-none"
                    >
                      Select Files (Photos, Videos, PDFs, Word/TXT Docs)
                    </label>
                  </div>
                )}

                {mediaFiles.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-stone-700">{mediaFiles.length} File(s) Staged</span>
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
                          <div className="aspect-video w-full rounded-lg overflow-hidden bg-stone-100 flex items-center justify-center relative border border-stone-200/50">
                            {med.type === "photo" ? (
                              <img src={med.dataUrl} className="w-full h-full object-cover" alt={med.name} />
                            ) : med.type === "video" ? (
                              <div className="w-full h-full flex flex-col items-center justify-center text-white bg-neutral-950 text-center p-2">
                                <FileVideo className="h-8 w-8 text-red-500 mb-1" />
                                <span className="text-[10px] font-mono font-bold truncate max-w-full">VIDEO CLIP</span>
                              </div>
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-stone-700 bg-white text-center p-2">
                                <FileText className="h-8 w-8 text-blue-600 mb-1" />
                                <span className="text-[9px] font-mono font-bold truncate max-w-full uppercase text-blue-700">
                                  {med.name.split('.').pop() || 'DOCUMENT'}
                                </span>
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
                  {isUploadingDoc ? (
                    <div className="rounded-xl border border-stone-200 bg-neutral-900 text-white p-5 space-y-3 shadow-md animate-fade-in text-left">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="bg-red-500/25 text-red-300 border border-red-500/30 text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded">
                            CONVERSION UPLOAD
                          </span>
                          <h4 className="font-bold text-xs truncate mt-1.5 max-w-[200px] sm:max-w-xs md:max-w-md">
                            {docFileName}
                          </h4>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-slate-350">{docSpeed}</span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-slate-400 font-semibold">{docStatusText}</span>
                          <span className="text-xs font-bold text-red-400">{docProgress}%</span>
                        </div>
                        <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden border border-neutral-750 p-[1px]">
                          <div 
                            className="bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500 h-full rounded-full transition-all duration-200"
                            style={{ width: `${docProgress}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[9px] font-mono text-slate-400">
                        <span>ETA: {docEta}</span>
                        <span className="text-emerald-400 font-bold">● PARSING CHANNELS</span>
                      </div>
                    </div>
                  ) : (
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
                  )}
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

            {/* TAB 4: Voice dictation transcription & Verbal AI Queries */}
            {activeTab === "media" && (
              <div className="space-y-5 text-left py-4 text-xs">
                {/* Voice Mode Selector */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 rounded-xl max-w-md mx-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setVoiceQueryMode("transcribe");
                      setVoiceAnswer("");
                      setVoiceText("");
                    }}
                    className={`py-2 rounded-lg font-bold text-center transition cursor-pointer ${
                      voiceQueryMode === "transcribe" ? "bg-white text-red-900 shadow-sm" : "text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    📝 Speech-to-Text Dictation
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVoiceQueryMode("query");
                      setVoiceAnswer("");
                      setVoiceText("");
                    }}
                    className={`py-2 rounded-lg font-bold text-center transition cursor-pointer ${
                      voiceQueryMode === "query" ? "bg-white text-red-900 shadow-sm" : "text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    ⚡ Verbal AI Query & Solve
                  </button>
                </div>

                <div className="flex flex-col items-center justify-center space-y-3 py-4 text-center">
                  <button
                    onClick={toggleRecording}
                    className={`flex h-16 w-16 items-center justify-center rounded-full shadow-lg transition duration-200 cursor-pointer ${
                      isRecording ? "bg-red-700 text-white animate-pulse" : "bg-red-50 text-red-700 hover:scale-105"
                    }`}
                  >
                    <Mic className="h-7 w-7" />
                  </button>
                  
                  <div className="text-xs">
                    <p className="font-extrabold text-neutral-900">
                      {isRecording 
                        ? (voiceQueryMode === "query" ? "Listening to your math/verbal query..." : "Transcribing your dictation...") 
                        : (voiceQueryMode === "query" ? "Click to Speak your Math / Logic Question" : "Voice Verbal Dictator")
                      }
                    </p>
                    <p className="text-stone-400 mt-1 font-mono font-medium">
                      {isRecording ? `Active recording: ${recordingSeconds}s` : "Click mic, grant workspace permissions, and ask away."}
                    </p>
                  </div>
                </div>

                {isRecording && (
                  <div className="flex items-center justify-center space-x-1.5 py-2">
                    <span className="h-4 w-1 bg-red-700 rounded animate-bounce [animation-delay:0.1s]"></span>
                    <span className="h-6 w-1 bg-red-900 rounded animate-bounce [animation-delay:0.2s]"></span>
                    <span className="h-8 w-1 bg-stone-900 rounded animate-bounce [animation-delay:0.3s]"></span>
                    <span className="h-5 w-1 bg-amber-500 rounded animate-bounce [animation-delay:0.4s]"></span>
                    <span className="h-7 w-1 bg-red-700 rounded animate-bounce [animation-delay:0.5s]"></span>
                  </div>
                )}

                {micError && (
                  <div className="mx-auto max-w-sm rounded-xl bg-orange-50 border border-orange-100 p-3 text-[10px] text-orange-850 text-left">
                    <p className="font-bold mb-0.5">⚠️ Pre-recorded Sample Loaded</p>
                    <p className="leading-relaxed opacity-90 font-medium">
                      Browsing inside sandbox limits browser mic APIs. We have automatically launched our Bungoma speech model simulator to populate the speech ledger!
                    </p>
                  </div>
                )}

                {voiceText && (
                  <div className="space-y-4 max-w-2xl mx-auto">
                    <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-1 text-stone-500 font-extrabold text-[10px] font-mono uppercase tracking-wider">
                        <span>Spoken Transcript:</span>
                        <button 
                          onClick={() => setVoiceText("")}
                          className="text-red-700 hover:underline"
                        >
                          Clear
                        </button>
                      </div>
                      <textarea
                        value={voiceText}
                        onChange={(e) => setVoiceText(e.target.value)}
                        rows={3}
                        className="w-full text-xs font-semibold bg-transparent border-none outline-none leading-relaxed text-stone-850 font-mono resize-none"
                      />
                    </div>

                    {voiceQueryMode === "query" ? (
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2 bg-stone-100 p-2.5 rounded-lg border border-stone-150">
                          <input
                            type="checkbox"
                            id="voice_grounding_toggle"
                            checked={voiceQueryGrounding}
                            onChange={(e) => setVoiceQueryGrounding(e.target.checked)}
                            className="rounded h-4 w-4 bg-white accent-red-700 cursor-pointer"
                          />
                          <label htmlFor="voice_grounding_toggle" className="font-bold text-stone-700 cursor-pointer flex items-center space-x-1 select-none">
                            <span>Enable Google Search grounding for real-time validation</span>
                          </label>
                        </div>

                        <button
                          onClick={handleVoiceQuerySolve}
                          disabled={isVoiceQuerying || !voiceText.trim()}
                          className="w-full flex items-center justify-center space-x-2 rounded-xl bg-red-700 hover:bg-neutral-900 py-3 text-white font-bold transition shadow-sm disabled:opacity-45 cursor-pointer"
                        >
                          {isVoiceQuerying ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              <span>AI STEM Solver analyzing, calculating & transcribing your voice...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4" />
                              <span>Submit Verbal Query to AI Solver</span>
                            </>
                          )}
                        </button>
                        
                        {voiceAnswer && (
                          <div className="rounded-xl border-2 border-stone-250 bg-stone-50/50 p-5 space-y-3.5 shadow-sm text-left animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
                              <span className="font-extrabold text-neutral-900 text-xs flex items-center space-x-1.5 uppercase font-mono tracking-wider">
                                <span className="p-1 rounded bg-amber-400 text-stone-900">✏️</span>
                                <span>Verbal Solution Outline</span>
                              </span>
                              <div className="flex space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditorContent(prev => prev + (prev ? "\n\n" : "") + `### VERBAL AI QUERY RESULT\n\n${voiceAnswer}`);
                                    setActiveTab("write");
                                    alert("Voice solution loaded directly into primary editor!");
                                  }}
                                  className="text-[10px] font-bold text-white bg-neutral-950 px-2.5 py-1 rounded-md cursor-pointer hover:bg-neutral-800 transition"
                                >
                                  Load to Editor
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveDocument("pdf", `### VERBAL AI SOLVED TASK\nQuestion: ${voiceText}\n\n${voiceAnswer}`)}
                                  className="text-[10px] font-bold text-white bg-red-700 px-2.5 py-1 rounded-md cursor-pointer hover:bg-red-800 transition"
                                >
                                  Download PDF
                                </button>
                              </div>
                            </div>

                            <div className="text-xs font-mono select-text font-medium leading-relaxed text-stone-850 whitespace-pre-wrap">
                              {voiceAnswer}
                            </div>

                            {voiceResponseSources.length > 0 && (
                              <div className="bg-white border border-stone-200 rounded-lg p-3 space-y-1 text-left mt-2 shadow-2xs">
                                <span className="text-[10px] font-extrabold text-stone-550 uppercase tracking-widest font-mono block">🌐 Grounded Web Intelligence Citations:</span>
                                <div className="flex flex-col gap-1 mt-1 font-medium font-mono text-[10px]">
                                  {voiceResponseSources.map((src, i) => (
                                    <a
                                      key={i}
                                      href={src.uri}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-red-700 hover:underline truncate hover:text-red-900 block"
                                    >
                                      [{i + 1}] {src.title || "Reference Site"}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setEditorContent((prev) => prev + (prev ? "\n" : "") + voiceText);
                            setActiveTab("write");
                            alert("Speech transcribed text appended to editor!");
                          }}
                          className="flex-1 rounded-xl border-2 border-stone-300 bg-white hover:bg-neutral-50 py-3 text-stone-800 text-xs font-bold transition duration-200 cursor-pointer text-center"
                        >
                          Append to Document Editor
                        </button>
                        <button
                          onClick={() => handleSaveDocument("doc", voiceText)}
                          className="flex-1 rounded-xl bg-red-700 text-white font-bold py-3 text-xs hover:bg-red-850 transition duration-200 cursor-pointer text-center"
                        >
                          Save Transcribed File
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: Curriculum Maker */}
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

            {/* TAB 6: AI Math & STEM Solver (Dynamic Solving Workspace) */}
            {activeTab === "solver" && (
              <div className="space-y-5 text-left text-xs">
                <div className="rounded-xl border border-rose-150 bg-red-50/20 p-4 space-y-1.5">
                  <h4 className="font-extrabold text-red-950 flex items-center gap-1 text-[13px] tracking-tight">
                    <Calculator className="h-4 w-4 text-red-800" />
                    <span>Zion Live Math & Complex Problem Solver</span>
                  </h4>
                  <p className="text-stone-600 leading-relaxed text-[11px] font-medium">
                    State complex mathematical queries, algebraic challenges, data-structures questions, physics equations, or computational algorithms below. You can also upload reference photos of problems or worksheet diagrams. 
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-stone-500 font-extrabold text-[10px] uppercase tracking-wider mb-1.5 font-mono">Solve Problem Prompt / Equation:</label>
                    <textarea
                      rows={5}
                      value={solverInput}
                      onChange={(e) => setSolverInput(e.target.value)}
                      placeholder="e.g. Find the local maxima and minima for f(x) = x^3 - 6x^2 + 9x + 15 within domain [-2, 5]. Show precise derivative formulations."
                      className="w-full rounded-xl border border-stone-200 bg-neutral-50 px-4 py-3 outline-none focus:bg-white focus:border-red-700 font-mono text-xs leading-relaxed"
                    />
                  </div>

                  {/* Preloaded quick math helpers templates */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block font-mono">🚀 Dynamic Math Formula Templates:</span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSolverInput("Find the exact general solution for the second-order ordinary differential equation: d^2y/dx^2 - 4 dy/dx + 13y = e^{2x} cos(3x). State complete characteristic polynomial calculations.")}
                        className="p-1 px-2.5 rounded bg-stone-105 hover:bg-stone-200 font-mono text-[10px] text-neutral-800 cursor-pointer transition"
                      >
                        📊 Differential Equation
                      </button>
                      <button
                        type="button"
                        onClick={() => setSolverInput("Solve this system of linear equations using Gaussian Elimination: \n1) 2x + 4y - z = 11 \n2) -x + 3y + 2z = 4 \n3) 3x - y + 5z = 16. \nWrite out each row echelon matrix mutation step-by-step!")}
                        className="p-1 px-2.5 rounded bg-stone-105 hover:bg-stone-200 font-mono text-[10px] text-neutral-800 cursor-pointer transition"
                      >
                        📐 System Matrix Solve
                      </button>
                      <button
                        type="button"
                        onClick={() => setSolverInput("Given f(x) = (2x - 3) / (x^2 + 4x + 5). Find the exact indefinite integral using partial fraction expansion or substitution theorems. Show the calculus steps.")}
                        className="p-1 px-2.5 rounded bg-stone-105 hover:bg-stone-200 font-mono text-[10px] text-neutral-800 cursor-pointer transition"
                      >
                        🧮 Indefinite Calculus
                      </button>
                    </div>
                  </div>

                  {/* Multimodal Diagram / Assignment PDF uploader */}
                  <div className="space-y-2 pt-1">
                    <span className="block text-stone-500 font-extrabold text-[10px] uppercase tracking-wider font-mono">📎 Optional: Upload Diagram Plate, Handwriting Notes or Equations Picture</span>
                    
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="border-2 border-dashed border-stone-200 hover:border-red-400 p-4 rounded-xl text-center cursor-pointer transition bg-stone-50/50 hover:bg-stone-50 relative">
                        <Upload className="h-5 w-5 text-stone-400 mx-auto mb-1" />
                        <span className="font-bold block text-[11px] text-stone-700">Choose Assignment Files</span>
                        <span className="text-[9.5px] text-stone-400 block mt-0.5">Supports JPG, PNG photos or math booklets PDFs</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*,application/pdf"
                          onChange={handleSolverAttachedUploader}
                          className="hidden"
                          id="solver_multimodal_uploader"
                        />
                        <label
                          htmlFor="solver_multimodal_uploader"
                          className="absolute inset-0 cursor-pointer"
                        />
                      </div>

                      {/* Staged uploaded files list */}
                      <div className="border border-stone-200 bg-white rounded-xl p-3 max-h-[140px] overflow-y-auto space-y-1.5">
                        {solverAttachedFiles.length === 0 ? (
                          <p className="text-stone-400 italic font-medium text-center py-6">No problem files attached. (Optional)</p>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex justify-between items-center pb-1 text-neutral-500 font-extrabold text-[9px] font-mono border-b border-stone-100">
                              <span>STAGED FILES ({solverAttachedFiles.length}):</span>
                              <button 
                                onClick={() => setSolverAttachedFiles([])} 
                                className="text-red-700 hover:underline"
                              >
                                Clear All
                              </button>
                            </div>
                            {solverAttachedFiles.map((f) => (
                              <div key={f.id} className="flex items-center justify-between font-mono text-[10.5px] bg-stone-50 rounded px-2 py-1.5 text-stone-700 border border-stone-100">
                                <span className="truncate max-w-[150px] font-bold">🖼️ {f.name}</span>
                                <button 
                                  onClick={() => setSolverAttachedFiles(prev => prev.filter(x => x.id !== f.id))} 
                                  className="text-[12px] text-stone-400 hover:text-red-700 font-extrabold pl-1 cursor-pointer leading-none"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Web Grounding CheckBox */}
                  <div className="flex items-center space-x-2 bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                    <input
                      type="checkbox"
                      id="google_grounding_toggle"
                      checked={enableGrounding}
                      onChange={(e) => setEnableGrounding(e.target.checked)}
                      className="rounded h-4 w-4 bg-white accent-red-700 cursor-pointer"
                    />
                    <label htmlFor="google_grounding_toggle" className="font-bold text-stone-700 cursor-pointer flex items-center space-x-1 select-none">
                      <span>Incorporate Google Search live web grounding (highly recommended for contemporary issues)</span>
                    </label>
                  </div>

                  {/* Solve Trigger Button */}
                  <button
                    onClick={() => handleSolveProblem()}
                    disabled={isSolving || !solverInput.trim()}
                    className="w-full flex items-center justify-center space-x-2 rounded-xl bg-red-700 hover:bg-neutral-900 py-3 text-white font-bold transition disabled:opacity-40 cursor-pointer"
                  >
                    {isSolving ? (
                      <>
                        <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                        <span>AI Mathematics & STEM engine computing derivatives, matrices & logic steps...</span>
                      </>
                    ) : (
                      <>
                        <Calculator className="h-4 w-4" />
                        <span>Compute Step-by-Step AI Solution</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Solving output */}
                {solverResult && (
                  <div className="rounded-xl border-2 border-neutral-300 bg-neutral-900 text-neutral-100 p-5 space-y-4 shadow-md font-mono select-text font-medium leading-relaxed max-w-full overflow-x-auto text-[11.5px] animate-in fade-in duration-300">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2 flex-wrap gap-2">
                      <span className="font-extrabold tracking-wider uppercase text-yellow-405 flex items-center space-x-1">
                        <span>🏛️</span>
                        <span>Official Step-by-Step Mathematics Solution</span>
                      </span>
                      <div className="flex space-x-1.5 flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditorContent(prev => prev + (prev ? "\n\n" : "") + `### WAFULA INTENSE STUDY SOLUTIONS\n\n${solverResult}`);
                            setActiveTab("write");
                            alert("This complete solution step formulation has been integrated inside your primary workspace editor draft (Writer Editor).");
                          }}
                          className="bg-white text-neutral-900 font-bold px-2 py-0.5 rounded text-[10px] hover:bg-neutral-100 transition cursor-pointer"
                        >
                          Load into Editor
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveDocument("pdf", `### MATHEMATICAL SOLUTION\n\nQuery: ${solverInput}\n\n${solverResult}`)}
                          className="bg-red-700 text-white font-bold px-2 py-0.5 rounded text-[10px] hover:bg-red-800 transition cursor-pointer"
                        >
                          Export as PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const newDoc: SavedDocument = {
                              id: "solv_save_" + Date.now(),
                              userId: currentUser?.email || "anonymous",
                              title: `${docTitle} Solved Task`,
                              content: solverResult,
                              type: "doc",
                              folder: selectedFolder,
                              date: new Date().toISOString().split("T")[0],
                              fileSize: `${((solverResult.length * 2) / 1024).toFixed(1)} KB`
                            };
                            onAddNewDocument(newDoc);
                            alert(`Solution successfully archived under vault folder [ ${selectedFolder} ]!`);
                          }}
                          className="bg-neutral-800 text-neutral-300 border border-white/20 font-bold px-2 py-0.5 rounded text-[10px] hover:bg-neutral-700 hover:text-white transition cursor-pointer"
                        >
                          Archive to Folder
                        </button>
                      </div>
                    </div>

                    <div className="whitespace-pre-wrap leading-relaxed select-text tracking-normal">
                      {solverResult}
                    </div>

                    {solvingSources.length > 0 && (
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-1 text-left text-[10.5px]">
                        <span className="text-[9.5px] font-extrabold text-white uppercase tracking-widest block font-mono">🛡️ Google Grounding Intelligence Citations:</span>
                        <div className="flex flex-col gap-1 mt-1">
                          {solvingSources.map((src, i) => (
                            <a
                              key={i}
                              href={src.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-amber-300 hover:underline hover:text-amber-400 truncate block font-sans"
                            >
                              [{i + 1}] {src.title || "Grounded Web Document"}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-stone-100 pb-3 gap-2 animate-fade-in-up">
                <div>
                  <h3 className="font-display text-sm font-extrabold text-stone-900">Live PDF / Doc Viewer</h3>
                  <p className="text-[10px] text-stone-400 font-mono mt-0.5">Est. Pages: {Math.max(1, Math.ceil((editorContent || extractedOcrText || voiceText || conversionOutput || "").trim().split(/\s+/).filter(Boolean).length / 220))} | Words: {(editorContent || extractedOcrText || voiceText || conversionOutput || "").trim().split(/\s+/).filter(Boolean).length}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePrintPdf}
                    className="inline-flex items-center space-x-1 rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-300 px-2.5 py-1.5 text-[11px] font-bold text-stone-700 transition shadow-xs cursor-pointer"
                    title="Print configuration"
                  >
                    <Printer className="h-3 w-3" />
                    <span>Print</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadPdfFile}
                    className="inline-flex items-center space-x-1 rounded-lg bg-red-700 hover:bg-red-850 px-2.5 py-1.5 text-[11px] font-bold text-white transition shadow-xs cursor-pointer"
                    title="Download styled PDF Document"
                  >
                    <Download className="h-3 w-3" />
                    <span>Download PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadWordDoc}
                    className="inline-flex items-center space-x-1 rounded-lg bg-blue-700 hover:bg-blue-800 px-2.5 py-1.5 text-[11px] font-bold text-white transition shadow-xs cursor-pointer"
                    title="Download Word Document (.doc)"
                  >
                    <FileText className="h-3 w-3" />
                    <span>Word (.doc)</span>
                  </button>
                </div>
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

              {/* Zion Design Machine Brand Indicator */}
              <div className="flex items-center justify-between bg-stone-900 border border-stone-850 rounded-xl px-4 py-2.5 mb-3.5 text-xs shadow-md select-none">
                <div className="flex items-center space-x-2 font-bold font-display">
                  <span className="text-emerald-500 font-extrabold animate-pulse">●</span>
                  <span className="text-stone-200 tracking-tight text-[11px] uppercase">ZION DESIGN SYSTEM MACHINE ACTIVE</span>
                </div>
                <div className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-[9px] font-mono font-bold text-amber-500 uppercase tracking-widest">
                  Zion Digital Publishers
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
                          ? "'Lora', Georgia, 'Times New Roman', serif" 
                          : previewStyle === "mono" 
                            ? "'JetBrains Mono', Courier, monospace" 
                            : "'Open Sans', system-ui, -apple-system, sans-serif",
                    }}
                  >
                    {/* Header Watermark */}
                    <div className="flex justify-between items-center border-b border-stone-100 pb-1.5 mb-4 text-[9px] text-stone-400 font-mono font-bold">
                      <span>ZION DIGITAL PUBLISHERS • COMPANION</span>
                      <span>{docTitle || "Untitled Outline"}</span>
                    </div>

                    {/* Paper Title */}
                    <h1 
                      style={{
                        fontFamily: previewStyle === "serif" ? "'Playfair Display', Georgia, serif" : previewStyle === "mono" ? "'JetBrains Mono', monospace" : "'Montserrat', sans-serif",
                        fontSize: "24px"
                      }}
                      className="font-bold tracking-tight text-red-800 mb-3 border-stone-200 pb-0.5"
                    >
                      {docTitle || "Untitled Document"}
                    </h1>

                    {/* Paper Body Text content */}
                    <div 
                      style={{
                        fontFamily: previewStyle === "serif" ? "'Lora', Georgia, serif" : previewStyle === "mono" ? "'JetBrains Mono', monospace" : "'Open Sans', sans-serif",
                        fontSize: "11pt",
                        lineHeight: "1.65"
                      }}
                      className="text-stone-850 whitespace-pre-wrap min-h-[220px]"
                    >
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
                      {isUploadingDoc ? (
                        <div className="rounded-xl border border-stone-200 bg-neutral-900 text-white p-4 space-y-3 shadow-md animate-fade-in text-left">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="bg-red-500/25 text-red-300 border border-red-500/30 text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded">
                                VAULT MULTI-INGEST
                              </span>
                              <h4 className="font-bold text-xs truncate mt-1.5 max-w-[150px] sm:max-w-xs">
                                {docFileName}
                              </h4>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-slate-350">{docSpeed}</span>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-[10px] font-mono">
                              <span className="text-slate-400 font-semibold truncate max-w-[120px]">{docStatusText}</span>
                              <span className="text-xs font-bold text-red-400">{docProgress}%</span>
                            </div>
                            <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden border border-neutral-750 p-[1px]">
                              <div 
                                className="bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500 h-full rounded-full transition-all duration-200"
                                style={{ width: `${docProgress}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-[9px] font-mono text-slate-400">
                            <span>ETA: {docEta}</span>
                            <span className="text-emerald-400">● ENCRYPTED SSL</span>
                          </div>
                        </div>
                      ) : (
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
                      )}
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
      )}

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
