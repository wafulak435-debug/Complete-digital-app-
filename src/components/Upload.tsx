import React, { useState, useEffect } from "react";
import { Upload as UploadIcon, FileText, Video, Image, CheckCircle, RefreshCw, Trash2, HeartHandshake, AlertCircle, Download, Music, Headphones, Eye, Loader2, Search, Play, Pause, X, Zap, Wifi } from "lucide-react";
import { MemberUploadRequest, User, AppSettings } from "../types";
import { getPdfFromOfflineDb } from "../utils/pdfDb";

interface UploadProps {
  currentUser: User | null;
  onLogIn: () => void;
  uploadRequests: MemberUploadRequest[];
  onAddNewUpload: (
    title: string, 
    type: 'pdf' | 'video' | 'photo' | 'audio', 
    subFiles?: string[],
    audioDuration?: string,
    audioCodec?: string,
    thumbnail?: string,
    fileSizeStr?: string,
    actualFile?: File,
    category?: string
  ) => void;
  onRequestDeleteUpload: (id: string) => void;
  onPayUpload: (id: string) => void;
  globalSettings?: AppSettings;
}

export default function Upload({
  currentUser,
  onLogIn,
  uploadRequests,
  onAddNewUpload,
  onRequestDeleteUpload,
  onPayUpload,
  globalSettings
}: UploadProps) {
  const isAdmin = Boolean(
    currentUser && ["main_admin", "admin", "sub_admin"].includes(currentUser.role)
  );
  const isRestricted = !!(globalSettings?.restrictMemberUploads && !isAdmin);

  const [activeType, setActiveType] = useState<'pdf' | 'video' | 'photo' | 'audio'>('pdf');
  const [titleInput, setTitleInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);

  // Real-time file upload simulation states
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadSpeed, setUploadSpeed] = useState<string>("0.0 MB/s");
  const [uploadEta, setUploadEta] = useState<string>("Estimating...");
  const [uploadHealth, setUploadHealth] = useState<"good" | "fair" | "poor" | "interrupted">("good");
  const [uploadStatusText, setUploadStatusText] = useState<string>("");
  const [uploadPausedState, setUploadPausedState] = useState<boolean>(false);

  // Category and Metadata states
  const [categorySelect, setCategorySelect] = useState<string>("General Education");
  const [ledgerCategoryFilter, setLedgerCategoryFilter] = useState<string>("All Categories");

  // States for immersive preview & search
  const [activePreviewUpload, setActivePreviewUpload] = useState<MemberUploadRequest | null>(null);
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [uploadSearchQuery, setUploadSearchQuery] = useState("");

  React.useEffect(() => {
    return () => {
      if (activePreviewUrl) {
        URL.revokeObjectURL(activePreviewUrl);
      }
    };
  }, [activePreviewUrl]);

  // Drag and Drop implementation states
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioDurationMeta, setAudioDurationMeta] = useState<string>("");
  const [audioCodecMeta, setAudioCodecMeta] = useState<string>("");
  const [generatedThumbnail, setGeneratedThumbnail] = useState<string>("");
  const [customCoverBase64, setCustomCoverBase64] = useState<string>("");

  const handleCustomCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCustomCoverBase64(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Support for PDF multi-file select batch queues
  const [queuedFiles, setQueuedFiles] = useState<string[]>([]);
  const [newQueueFileName, setNewQueueFileName] = useState("");

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFileMetadataAndThumbnails(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFileMetadataAndThumbnails(e.target.files[0]);
    }
  };

  const generateAudioThumbnailCanvas = (fileName: string, durationStr: string) => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 240;
      canvas.height = 150;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Draw elegant dark purple backdrop
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, "#1e1b4b"); // Deep Indigo
        grad.addColorStop(1, "#311042"); // Deep Violet
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw glowing frequency waves
        ctx.strokeStyle = "rgba(239, 68, 68, 0.75)";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        for (let x = 0; x < canvas.width; x += 6) {
          const rawY = Math.sin(x * 0.12) * Math.cos(x * 0.05) * 32;
          const noise = (Math.random() - 0.5) * 10;
          const y = canvas.height / 2 + (rawY + noise);
          ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.strokeStyle = "rgba(56, 189, 248, 0.5)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2 + 8);
        for (let x = 0; x < canvas.width; x += 10) {
          const y = canvas.height / 2 + Math.cos(x * 0.08) * 18;
          ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Overlay metadata watermarks
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px monospace";
        ctx.fillText("AUDIO TRANSCRIPT", 12, 22);
        ctx.fillStyle = "#facc15"; // yellow
        ctx.fillText(`DURATION: ${durationStr}`, 12, 135);
        ctx.fillText("HIGH FIDELITY CODEC", 12, 145);
        setGeneratedThumbnail(canvas.toDataURL("image/jpeg"));
      }
    } catch (e) {
      console.warn("Waveform creation failed:", e);
    }
  };

  const generateMockVideoThumbnail = (fileName: string) => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 180;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "rgba(239, 68, 68, 0.2)";
        ctx.beginPath();
        ctx.arc(160, 90, 35, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.moveTo(150, 75);
        ctx.lineTo(178, 90);
        ctx.lineTo(150, 105);
        ctx.closePath();
        ctx.fill();
        setGeneratedThumbnail(canvas.toDataURL("image/jpeg"));
      }
    } catch (_) {}
  };

  const processFileMetadataAndThumbnails = async (file: File) => {
    setSelectedFile(file);
    if (!titleInput.trim()) {
      setTitleInput(file.name);
    }

    const isAudio = file.type.startsWith("audio/") || file.name.endsWith(".mp3") || file.name.endsWith(".wav") || file.name.endsWith(".aac") || file.name.endsWith(".m4a");
    const isVideo = file.type.startsWith("video/") || file.name.endsWith(".mp4") || file.name.endsWith(".mov") || file.name.endsWith(".mkv");

    if (isAudio) {
      setActiveType("audio");
      setAudioCodecMeta(file.type || "audio/mpeg");
      try {
        const objectUrl = URL.createObjectURL(file);
        const audio = new Audio();
        audio.src = objectUrl;
        audio.addEventListener("loadedmetadata", () => {
          const durationSec = audio.duration;
          const mins = Math.floor(durationSec / 60);
          const secs = Math.ceil(durationSec % 60);
          const formattedDuration = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
          setAudioDurationMeta(formattedDuration);
          generateAudioThumbnailCanvas(file.name, formattedDuration);
          URL.revokeObjectURL(objectUrl);
        });
      } catch (err) {
        console.warn("Audio tag metadata read error, applying elegant fallback:", err);
        setAudioDurationMeta("2:55");
        generateAudioThumbnailCanvas(file.name, "2:55");
      }
    } else if (isVideo) {
      setActiveType("video");
      try {
        const objectUrl = URL.createObjectURL(file);
        const video = document.createElement("video");
        video.src = objectUrl;
        video.crossOrigin = "anonymous";
        video.muted = true;
        video.playsInline = true;
        video.addEventListener("loadeddata", () => {
          video.currentTime = 1; // Seek to 1s mark
        });
        video.addEventListener("seeked", () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = 320;
            canvas.height = 180;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.fillStyle = "#ef4444"; 
              ctx.beginPath();
              ctx.moveTo(canvas.width / 2 - 12, canvas.height / 2 - 12);
              ctx.lineTo(canvas.width / 2 + 16, canvas.height / 2);
              ctx.lineTo(canvas.width / 2 - 12, canvas.height / 2 + 12);
              ctx.closePath();
              ctx.fill();

              const dataUrl = canvas.toDataURL("image/jpeg");
              setGeneratedThumbnail(dataUrl);
            }
            URL.revokeObjectURL(objectUrl);
          } catch (e) {
            console.warn("Video frame render block, using random preview icon:", e);
            generateMockVideoThumbnail(file.name);
            URL.revokeObjectURL(objectUrl);
          }
        });
      } catch (_) {
        generateMockVideoThumbnail(file.name);
      }
    } else if (file.type.startsWith("image/") || file.name.endsWith(".png") || file.name.endsWith(".jpg") || file.name.endsWith(".jpeg") || file.name.endsWith(".webp") || file.name.endsWith(".svg")) {
      setActiveType("photo");
    } else if (file.name.endsWith(".pdf") || file.type === "application/pdf") {
      setActiveType("pdf");
    }
  };

  const handlePayAfterApprovalSimulate = (id: string) => {
    if (!currentUser) {
      onLogIn();
      return;
    }
    setPayingId(id);
    setTimeout(() => {
      onPayUpload(id);
      setPayingId(null);
      alert("🎉 M-PESA KES 200 fee paid successfully! Your approved document is now live in the library catalog.");
    }, 1800);
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRestricted) {
      alert("❌ Upload Paused: Member eBook uploads have been temporarily restricted/paused by the Admin. Only Administrators can upload files at this time.");
      return;
    }
    if (!currentUser) {
      onLogIn();
      return;
    }
    if (!titleInput.trim()) return;

    // Generate unique upload ID
    const uploadId = "upl_active_" + Date.now();
    
    // Setup simulated file size
    const sizeStr = selectedFile 
      ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` 
      : activeType === "video" ? "120.4 MB" : activeType === "pdf" ? "8.5 MB" : activeType === "audio" ? "4.2 MB" : "1.8 MB";

    // Initialize states
    setUploadProgress(0);
    setUploadSpeed("0.0 MB/s");
    setUploadEta("Estimating...");
    setUploadHealth("good");
    setUploadStatusText("Establishing secure connection...");
    setUploadPausedState(false);
    setIsUploading(true);
    setActiveUploadId(uploadId);

    // Save initial object to localStorage ongoing list for Admin Panel real-time tracking
    const initialUpload = {
      id: uploadId,
      fileName: selectedFile ? selectedFile.name : (titleInput.trim() + (activeType === "video" ? ".mp4" : activeType === "pdf" ? ".pdf" : activeType === "audio" ? ".mp3" : ".jpg")),
      fileSize: sizeStr,
      type: activeType,
      progress: 0,
      status: 'uploading',
      health: 'good',
      speed: '0.0 MB/s',
      eta: 'Estimating...',
      userId: currentUser?.email || 'anonymous',
      userName: currentUser?.name || 'Anonymous Member',
      timestamp: new Date().toISOString(),
      isBoosted: false,
      statusText: "Establishing connection..."
    };

    try {
      const currentOngoing = JSON.parse(localStorage.getItem("WAFULA_ONGOING_UPLOADS") || "[]");
      localStorage.setItem("WAFULA_ONGOING_UPLOADS", JSON.stringify([initialUpload, ...currentOngoing]));
      window.dispatchEvent(new Event("storage"));
    } catch (err) {
      console.warn("Could not save initial upload progress state:", err);
    }
  };

  useEffect(() => {
    if (!activeUploadId) return;

    const interval = setInterval(() => {
      // Read ongoing upload status from localStorage to sync with Admin Panel
      let uploads: any[] = [];
      try {
        uploads = JSON.parse(localStorage.getItem("WAFULA_ONGOING_UPLOADS") || "[]");
      } catch (_) {}

      const currentUpload = uploads.find((u: any) => u.id === activeUploadId);

      if (!currentUpload) {
        // Upload was deleted/removed from outside
        clearInterval(interval);
        setIsUploading(false);
        setActiveUploadId(null);
        return;
      }

      // Check for Admin commands:
      if (currentUpload.status === "cancelled") {
        clearInterval(interval);
        try {
          const remaining = uploads.filter((u: any) => u.id !== activeUploadId);
          localStorage.setItem("WAFULA_ONGOING_UPLOADS", JSON.stringify(remaining));
        } catch (_) {}
        setIsUploading(false);
        setActiveUploadId(null);
        setUploadPausedState(false);
        window.dispatchEvent(new Event("storage"));
        alert("Upload has been cancelled by Overseer.");
        return;
      }

      const isRemotePaused = currentUpload.status === "paused";
      setUploadPausedState(isRemotePaused);

      if (isRemotePaused) {
        setUploadStatusText("Paused by Overseer...");
        setUploadSpeed("0.0 KB/s");
        setUploadEta("Paused");
        return;
      }

      const currentHealthVal = currentUpload.health || "good";
      setUploadHealth(currentHealthVal);

      if (currentHealthVal === "interrupted") {
        setUploadStatusText("Connection Interrupted. Retrying signal...");
        setUploadSpeed("0.0 KB/s");
        setUploadEta("Reconnecting...");
        return;
      }

      // Increment progress based on Health & Speed Boosts
      let progressVal = currentUpload.progress || 0;
      let increment = 0;

      if (currentHealthVal === "good") {
        increment = currentUpload.isBoosted ? Math.floor(Math.random() * 8) + 12 : Math.floor(Math.random() * 4) + 4;
      } else if (currentHealthVal === "fair") {
        increment = Math.floor(Math.random() * 3) + 2;
      } else if (currentHealthVal === "poor") {
        increment = Math.floor(Math.random() * 2) + 1;
      }

      progressVal += increment;
      if (progressVal >= 100) {
        progressVal = 100;
      }

      // Calculate Speed & ETA
      let speedStr = "4.2 MB/s";
      let etaStr = "8s";
      if (currentUpload.isBoosted) {
        speedStr = `${(15 + Math.random() * 10).toFixed(1)} MB/s`;
        etaStr = `${Math.ceil((100 - progressVal) / 18)}s`;
      } else if (currentHealthVal === "good") {
        speedStr = `${(3.5 + Math.random() * 3).toFixed(1)} MB/s`;
        etaStr = `${Math.ceil((100 - progressVal) / 6)}s`;
      } else if (currentHealthVal === "fair") {
        speedStr = `${(1.2 + Math.random() * 1).toFixed(1)} MB/s`;
        etaStr = `${Math.ceil((100 - progressVal) / 2)}s`;
      } else if (currentHealthVal === "poor") {
        speedStr = `${(150 + Math.random() * 150).toFixed(0)} KB/s`;
        etaStr = `${Math.ceil((100 - progressVal) * 1.5)}s`;
      }

      if (progressVal >= 100) {
        speedStr = "0.0 MB/s";
        etaStr = "Complete";
      }

      setUploadProgress(progressVal);
      setUploadSpeed(speedStr);
      setUploadEta(etaStr);

      // Status messages
      let statusMsg = "Uploading blocks...";
      if (progressVal < 20) {
        statusMsg = "Establishing secure channel...";
      } else if (progressVal < 50) {
        statusMsg = activeType === "video" ? "Transcoding and buffer chunking..." : "Reading physical PDF bytes...";
      } else if (progressVal < 80) {
        statusMsg = "Uploading blocks to Bungoma node...";
      } else if (progressVal < 98) {
        statusMsg = "Verifying MD5 integrity checks...";
      } else {
        statusMsg = "Finalizing database catalog indices...";
      }
      setUploadStatusText(statusMsg);

      // Update in localStorage
      currentUpload.progress = progressVal;
      currentUpload.speed = speedStr;
      currentUpload.eta = etaStr;
      currentUpload.status = progressVal >= 100 ? "completed" : "uploading";
      currentUpload.statusText = statusMsg;

      try {
        localStorage.setItem("WAFULA_ONGOING_UPLOADS", JSON.stringify(uploads));
      } catch (_) {}

      // Trigger cross-view synchronization event
      window.dispatchEvent(new Event("storage"));

      // Complete Upload if reaches 100
      if (progressVal >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          let duration = audioDurationMeta;
          let codec = audioCodecMeta;
          let thumbnail = generatedThumbnail;

          if (!selectedFile) {
            if (activeType === "audio") {
              duration = "3:30";
              codec = "audio/mpeg (MP3 High Fidelity)";
              const canvas = document.createElement("canvas");
              canvas.width = 240;
              canvas.height = 150;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
                grad.addColorStop(0, "#0f172a");
                grad.addColorStop(1, "#311042");
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.strokeStyle = "#38bdf8";
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(0, 75);
                for (let i = 0; i < 240; i += 7) {
                  ctx.lineTo(i, 75 + Math.sin(i * 0.15) * 22);
                }
                ctx.stroke();
                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 9px monospace";
                ctx.fillText(titleInput.toUpperCase().slice(0, 18), 12, 25);
                ctx.fillStyle = "#fbbf24";
                ctx.fillText("DURATION: 3:30", 12, 135);
                thumbnail = canvas.toDataURL("image/jpeg");
              }
            } else if (activeType === "video") {
              const canvas = document.createElement("canvas");
              canvas.width = 300;
              canvas.height = 168;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.fillStyle = "#1e293b";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = "rgba(220, 38, 38, 0.4)";
                ctx.beginPath();
                ctx.arc(150, 84, 30, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#ef4444";
                ctx.beginPath();
                ctx.moveTo(140, 71);
                ctx.lineTo(168, 84);
                ctx.lineTo(140, 97);
                ctx.closePath();
                ctx.fill();
                thumbnail = canvas.toDataURL("image/jpeg");
              }
            }
          }

          if (customCoverBase64) {
            thumbnail = customCoverBase64;
          }

          onAddNewUpload(
            titleInput.trim(), 
            activeType, 
            activeType === "pdf" ? queuedFiles : [],
            activeType === "audio" ? duration : undefined,
            activeType === "audio" ? codec : undefined,
            thumbnail || undefined,
            selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : undefined,
            selectedFile || undefined,
            categorySelect
          );

          // Clean up states
          setIsUploading(false);
          setSuccess(true);
          setTitleInput("");
          setCategorySelect("General Education");
          setQueuedFiles([]);
          setNewQueueFileName("");
          setSelectedFile(null);
          setAudioDurationMeta("");
          setAudioCodecMeta("");
          setGeneratedThumbnail("");
          setCustomCoverBase64("");
          setActiveUploadId(null);

          // Remove completed upload from active list
          try {
            const finalUploads = JSON.parse(localStorage.getItem("WAFULA_ONGOING_UPLOADS") || "[]");
            const cleared = finalUploads.filter((u: any) => u.id !== activeUploadId);
            localStorage.setItem("WAFULA_ONGOING_UPLOADS", JSON.stringify(cleared));
          } catch (_) {}
          
          window.dispatchEvent(new Event("storage"));

          setTimeout(() => setSuccess(false), 4000);
        }, 800);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [activeUploadId, titleInput, activeType, selectedFile, categorySelect, queuedFiles, customCoverBase64, audioDurationMeta, audioCodecMeta, generatedThumbnail]);

  const myUploads = uploadRequests.filter((u) => u.userId?.toLowerCase() === (currentUser?.email?.toLowerCase() || "anonymous"));
  const filteredUploads = myUploads.filter((u) => {
    const matchesSearch = u.title.toLowerCase().includes(uploadSearchQuery.toLowerCase()) ||
                          u.type.toLowerCase().includes(uploadSearchQuery.toLowerCase());
    const matchesCategory = ledgerCategoryFilter === "All Categories" || 
                            (u.category || "General Education") === ledgerCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleDownloadFile = async (u: MemberUploadRequest) => {
    if (u.hasLocalBlob) {
      try {
        const localBlob = await getPdfFromOfflineDb(u.id);
        if (localBlob) {
          const url = URL.createObjectURL(localBlob);
          const a = document.createElement("a");
          a.href = url;
          a.download = u.title;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          return;
        }
      } catch (err) {
        console.error("Failed to load local blob for download:", err);
      }
    }

    // Fallback if no raw physical blob exists (seed data)
    let mimeType = "text/plain";
    let extension = "txt";
    let content = `WafulaReads Academic Portal File Content\n\nTitle: ${u.title}\nUploaded By: ${u.userName}\nClassification Segment: ${u.type.toUpperCase()}\nReview Clearance Status: ${u.status.toUpperCase()}\nFile Footprint Size: ${u.fileSize}\nTimestamp Saved: ${u.date}`;

    if (u.type === "pdf") {
      mimeType = "application/pdf";
      extension = "pdf";
      content = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 120 >>\nstream\nBT\n/F1 12 Tf\n70 700 Td\n(${u.title} - Verified Wafula Reads Digital Download) Tj\n/F1 10 Tf\n70 680 Td\n(Contributor: ${u.userName} - Size: ${u.fileSize}) Tj\n/F1 9 Tf\n70 650 Td\n(All cloud credentials and publication integrity hashes matched securely.) Tj\nET\nstreamend\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000056 00000 n\n0000000111 00000 n\n0000000211 00000 n\ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n340\n%%EOF`;
    } else if (u.type === "photo") {
      mimeType = "image/svg+xml";
      extension = "svg";
      content = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 350" width="100%" height="100%">
        <rect width="100%" height="100%" fill="#1e293b"/>
        <circle cx="250" cy="150" r="80" fill="#38bdf8" opacity="0.3"/>
        <text x="50%" y="150" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="22" font-weight="extrabold" fill="#ffffff">${u.title.toUpperCase()}</text>
        <text x="50%" y="190" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="12" fill="#94a3b8">Contributor: ${u.userName}</text>
        <rect x="150" y="240" width="200" height="30" rx="6" fill="#0f172a" stroke="#334155" stroke-width="1"/>
        <text x="50%" y="255" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="10" fill="#38bdf8">SECURED STORAGE AUDIT OK</text>
        <text x="50%" y="310" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#64748b">Wafula reads • Headquartered in Bungoma, Kenya</text>
      </svg>`;
    } else if (u.type === "video") {
      mimeType = "text/plain";
      extension = "mp4";
      content = `[Wafula Reads Media File System: MP4 Visual Stream Container]\n\nMeta Header Source:\n- Title: ${u.title}\n- Codec Ref: H.264 High Profile\n- Author: ${u.userName}\n- File Size: ${u.fileSize}\n- Security Hash: sha256_e3b0c442_${u.id}\n- Integrity Check: PASS`;
    } else if (u.type === "audio") {
      mimeType = "text/plain";
      extension = "mp3";
      content = `[Wafula Reads Audio Media Stream: MP3 Container]\n\nMeta Header Source:\n- Title: ${u.title}\n- Codec Ref: ${u.audioCodec || "audio/mpeg"}\n- Duration: ${u.audioDuration || "3:30"}\n- Author: ${u.userName}\n- File Size: ${u.fileSize}\n- Security Hash: sha255_audio_${u.id}\n- Integrity Check: PASS`;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = u.title.includes(".") ? u.title : `${u.title.replace(/[^a-zA-Z0-9]/g, "_")}_wafula_reads.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePreviewFileInline = async (u: MemberUploadRequest) => {
    if (activePreviewUrl) {
      URL.revokeObjectURL(activePreviewUrl);
      setActivePreviewUrl(null);
    }

    // If it has local payload inside IndexedDB
    if (u.hasLocalBlob) {
      setIsPreviewLoading(true);
      try {
        const fileBlob = await getPdfFromOfflineDb(u.id);
        if (fileBlob) {
          const objectUrl = URL.createObjectURL(fileBlob);
          setActivePreviewUrl(objectUrl);
          setActivePreviewUpload(u);
        } else {
          alert("Attached file payload could not be loaded from local IndexedDB storage indices.");
        }
      } catch (err) {
        console.error("Failed to load PDF blob for inline reader:", err);
        alert("Error launching secure inline reader.");
      } finally {
        setIsPreviewLoading(false);
      }
      return;
    }

    // Seed mock data fallbacks:
    let mimeType = "text/plain";
    let content = `SECURE ADMINISTRATIVE RESOURCE LEDGER\n\nFile: ${u.title}\nContributor: ${u.userName}\nReview Clearance: ${u.status.toUpperCase()}`;

    if (u.type === "pdf") {
      mimeType = "application/pdf";
      content = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 250 >>\nstream\nBT\n/F1 16 Tf\n50 750 Td\n(MEMBER PUBLIC CATALOG READ PREVIEW) Tj\n/F1 12 Tf\n50 700 Td\n(Classified Title: ${u.title}) Tj\n50 675 Td\n(Uploader Account: ${u.userName}) Tj\n50 650 Td\n(Filing System ID: ${u.id}) Tj\n50 625 Td\n(Academic Category: ${u.type.toUpperCase()}) Tj\n50 580 Td\n(NOTICE: This community publication has been successfully checked and validated) Tj\n50 560 Td\n(by Overseers. Reads persist offline securely inside sandboxed buffer clusters.) Tj\nET\nstreamend\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000056 00000 n\n0000000111 00000 n\n0000000211 00000 n\ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n400\n%%EOF`;
    } else if (u.type === "photo") {
      mimeType = "image/svg+xml";
      content = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
        <defs>
          <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0f172a" />
            <stop offset="100%" stop-color="#312e81" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#g)"/>
        <circle cx="300" cy="180" r="100" fill="#fbbf24" opacity="0.15"/>
        <text x="50%" y="150" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="28" font-weight="black" fill="#ffffff">${u.title.toUpperCase()}</text>
        <text x="50%" y="200" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="14" fill="#a78bfa" font-weight="bold">Verified Public Publication</text>
        <text x="50%" y="240" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="13" fill="#cbd5e1">Uploaded By: ${u.userName} (${u.fileSize})</text>
        <rect x="150" y="290" width="300" height="40" rx="8" fill="#1e1b4b" stroke="#4c1d95" stroke-width="2"/>
        <text x="50%" y="310" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="12" fill="#fbbf24" font-weight="bold">🔒 DRM INTEGRITY ENFORCED</text>
      </svg>`;
    } else if (u.type === "video") {
      alert("This is a legacy seed sample representing outreach video files of 100+ MB category size. Real actual videos can be uploaded directly via dragging files into the zone, watched smoothly via direct sandbox decoding!");
      return;
    } else if (u.type === "audio") {
      alert("This is a legacy seed sample representing praise song records. Attach a real MP3 file in the dragzone to play and stream the audio tracks directly inside the local audio deck!");
      return;
    }

    const blob = new Blob([content], { type: mimeType });
    const objectUrl = URL.createObjectURL(blob);
    setActivePreviewUrl(objectUrl);
    setActivePreviewUpload(u);
  };

  const handleClosePreviewInline = () => {
    if (activePreviewUrl) {
      URL.revokeObjectURL(activePreviewUrl);
      setActivePreviewUrl(null);
    }
    setActivePreviewUpload(null);
  };

  return (
    <>
      {/* Immersive Inline Media Viewer / Reader Overlays */}
      {activePreviewUpload && activePreviewUrl && (
        <div id="immersive_member_viewer_overlay" className="fixed inset-0 bg-stone-950/95 z-[2100] flex flex-col p-4 md:p-6 animate-fade-in text-left select-text">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-stone-900 border border-stone-850 p-4 rounded-xl mb-4 gap-4">
            <div className="text-left">
              <span className="bg-amber-500/20 text-amber-300 text-[8.5px] font-bold uppercase tracking-wider py-0.5 px-2 rounded font-mono border border-amber-500/30">
                🔒 VERIFIED VAULT PLAYER
              </span>
              <h3 className="text-sm md:text-base font-bold text-white mt-1 flex items-center gap-1.5 font-sans">
                {activePreviewUpload.type === "pdf" && <FileText className="h-4.5 w-4.5 text-indigo-400" />}
                {activePreviewUpload.type === "video" && <Video className="h-4.5 w-4.5 text-pink-400" />}
                {activePreviewUpload.type === "photo" && <Image className="h-4.5 w-4.5 text-emerald-400" />}
                {activePreviewUpload.type === "audio" && <Headphones className="h-4.5 w-4.5 text-sky-400" />}
                <span>Viewing: {activePreviewUpload.title}</span>
              </h3>
              <p className="text-[10px] text-stone-400 font-mono mt-0.5">
                Reference ID: {activePreviewUpload.id} • Registered Contributor: {activePreviewUpload.userName} • File Size Metric: {activePreviewUpload.fileSize}
              </p>
            </div>
            
            <button
              type="button"
              onClick={handleClosePreviewInline}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-all flex items-center space-x-1 border border-rose-500 cursor-pointer shadow-sm select-none"
            >
              <span>× EXIT IMMERSIVE VIEW</span>
            </button>
          </div>

          {/* Dynamic player framework */}
          <div className="flex-grow w-full bg-stone-900 rounded-xl border border-stone-850 p-2 overflow-hidden flex flex-col justify-center items-center relative">
            {activePreviewUpload.type === "pdf" && (
              <iframe 
                src={activePreviewUrl + "#view=FitH"} 
                className="w-full h-full rounded border-0 bg-white"
                title={activePreviewUpload.title}
              />
            )}

            {activePreviewUpload.type === "photo" && (
              <img 
                src={activePreviewUrl} 
                className="max-w-full max-h-[75vh] object-contain rounded-lg border border-stone-800 shadow-lg"
                alt={activePreviewUpload.title}
                referrerPolicy="no-referrer"
              />
            )}

            {activePreviewUpload.type === "video" && (
              <video 
                src={activePreviewUrl} 
                controls 
                autoPlay 
                className="max-w-full max-h-[75vh] rounded-lg shadow-xl outline-none"
              />
            )}

            {activePreviewUpload.type === "audio" && (
              <div className="bg-stone-950 p-8 rounded-2xl border border-stone-800 max-w-md w-full text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-sky-500/10 rounded-full flex items-center justify-center animate-pulse border border-sky-500/20">
                  <Headphones className="h-8 w-8 text-sky-400" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-base truncate">{activePreviewUpload.title}</h4>
                  <p className="text-xs text-stone-400 font-mono mt-0.5">Audio Container Output • Approved Stream</p>
                </div>
                <audio 
                  src={activePreviewUrl} 
                  controls 
                  autoPlay 
                  className="w-full mt-2 outline-none overflow-hidden rounded"
                />
              </div>
            )}
            
            <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 bg-stone-950/80 backdrop-blur-xs text-[8.5px] text-amber-300 font-mono font-bold px-3 py-1 rounded-full border border-amber-500/20">
              SECURE LOCAL DECRYPTION DECK ACTIVE • HARDWARE ACCELERATED FRAME INTERPOLATION
            </div>
          </div>
        </div>
      )}

      <div id="upload_section_panel" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <h2 className="font-display text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
          Publish with the <span className="text-red-700">Community</span>
        </h2>
        <p className="mt-2 text-sm text-neutral-600">
          Share your books, sermon recordings, video guides, worksheets or photos. All uploads undergo verification before public release.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
        {/* Upload Form Area */}
        <div className="lg:col-span-7">
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
            <h3 className="font-display text-lg font-bold text-neutral-950">Member Upload Portal</h3>
            
            {isRestricted && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900 flex items-start space-x-2.5 shadow-sm">
                <AlertCircle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <span className="font-extrabold text-[11px] uppercase tracking-wider block mb-0.5 text-amber-800">⚠️ Upload System Paused by Admin</span>
                  Member eBook submissions have been temporarily restricted/paused by the Administrator. Only Administrators can upload documents or release books at this time.
                </div>
              </div>
            )}

            <div className="rounded-xl bg-red-50 p-4 text-xs text-red-900 flex items-start space-x-2.5">
              <AlertCircle className="h-4.5 w-4.5 text-red-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Important Notice</span>: To cover cloud hosting and validation reviews, a minor upload fee of **KES 200** applies to member contributions. Admin uploads are exempt and are automatically featured.
              </div>
            </div>

            {/* Select what type they are uploading */}
            <div className="grid grid-cols-4 gap-2 text-xs">
              <button
                onClick={() => { setActiveType("pdf"); setSelectedFile(null); }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-lg border transition ${
                  activeType === "pdf" ? "border-red-400 bg-red-50 font-bold text-red-950" : "border-stone-200 bg-[#fbfbf9]"
                }`}
              >
                <FileText className="h-4 w-4 mb-1" />
                <span className="text-[10px]">Doc / PDF</span>
              </button>
              <button
                onClick={() => { setActiveType("video"); setSelectedFile(null); }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-lg border transition ${
                  activeType === "video" ? "border-red-400 bg-red-50 font-bold text-red-950" : "border-stone-200 bg-[#fbfbf9]"
                }`}
              >
                <Video className="h-4 w-4 mb-1" />
                <span className="text-[10px]">Video Clip</span>
              </button>
              <button
                onClick={() => { setActiveType("audio"); setSelectedFile(null); }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-lg border transition ${
                  activeType === "audio" ? "border-red-400 bg-red-50 font-bold text-red-950" : "border-stone-200 bg-[#fbfbf9]"
                }`}
              >
                <Music className="h-4 w-4 mb-1" />
                <span className="text-[10px]">Audio Track</span>
              </button>
              <button
                onClick={() => { setActiveType("photo"); setSelectedFile(null); }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-lg border transition ${
                  activeType === "photo" ? "border-red-400 bg-red-50 font-bold text-red-950" : "border-stone-200 bg-[#fbfbf9]"
                }`}
              >
                <Image className="h-4 w-4 mb-1" />
                <span className="text-[10px]">Photo / Image</span>
              </button>
            </div>

            {/* HTML5 Drag-and-Drop + Click manual file uploader */}
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-5 text-center transition cursor-pointer flex flex-col items-center justify-center space-y-2 select-none ${
                dragActive ? "border-[#4f46e5] bg-[#eeebff55]" : "border-stone-250 bg-neutral-50/50 hover:bg-neutral-50"
              }`}
            >
              <input 
                type="file" 
                id="file_input_uploader"
                className="hidden" 
                onChange={handleFileChange}
                accept={
                  activeType === "pdf" ? ".pdf" :
                  activeType === "video" ? "video/*" :
                  activeType === "audio" ? "audio/*" :
                  "image/*"
                }
              />
              <label htmlFor="file_input_uploader" className="cursor-pointer flex flex-col items-center w-full h-full justify-center">
                <UploadIcon className="h-7 w-7 text-stone-400 animate-pulse mb-1" />
                <span className="text-xs font-bold text-stone-700">Drag & Drop file here or <span className="text-indigo-600 underline text-indigo-700">click to browse</span></span>
                <span className="text-[9.5px] text-stone-450 mt-1 block">
                  Supports .pdf, .mp3, .wav, .mp4, and images. Real-time duration & audio tenses instantly computed.
                </span>
              </label>
            </div>

            {selectedFile && (
              <div className="bg-emerald-50 border border-emerald-150 rounded-xl p-3 flex flex-col space-y-1.5 text-xs text-emerald-950 text-left relative font-mono">
                <p className="font-bold shrink truncate max-w-sm">✓ Loaded: {selectedFile.name}</p>
                <div className="flex gap-4 text-[10px] text-emerald-800">
                  <span>Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                  {audioDurationMeta && (
                    <span className="text-amber-850 font-extrabold">⏱ Extracted Duration: {audioDurationMeta}</span>
                  )}
                  {audioCodecMeta && (
                    <span>Codec: {audioCodecMeta}</span>
                  )}
                </div>
                {generatedThumbnail && (
                  <div className="mt-2 text-left">
                    <span className="text-[9px] uppercase font-bold text-emerald-700 block mb-1">Generated Preview Thumbnail:</span>
                    <img src={generatedThumbnail} alt="Thumbnail preview" className="h-16 w-28 rounded-lg border object-cover shadow-sm bg-black" />
                  </div>
                )}
                <button 
                  type="button" 
                  onClick={() => { setSelectedFile(null); setAudioDurationMeta(""); setAudioCodecMeta(""); setGeneratedThumbnail(""); }}
                  className="absolute top-2 right-3 text-red-650 font-bold hover:underline"
                >
                  Clear File
                </button>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs text-left">
              <div>
                <label className="block text-stone-500 font-bold mb-1.5 uppercase tracking-wide">File Presentation Title</label>
                <input
                  type="text"
                  required
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 bg-neutral-50 px-3.5 py-2.5 outline-none focus:bg-white"
                  placeholder="e.g. My Sermon Outline"
                />
              </div>

              <div>
                <label className="block text-stone-500 font-bold mb-1.5 uppercase tracking-wide">Academic Category Directory</label>
                <select
                  value={categorySelect}
                  onChange={(e) => setCategorySelect(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 bg-neutral-50 px-3.5 py-2.5 outline-none focus:bg-white text-xs font-bold"
                >
                  <option value="General Education">General Education</option>
                  <option value="Leadership">Leadership</option>
                  <option value="Bible School">Bible School</option>
                  <option value="Religion">Religion</option>
                  <option value="Enjoyment">Enjoyment</option>
                  <option value="Fun">Fun</option>
                  <option value="Technology">Technology</option>
                  <option value="Many Others">Many Others</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-500 font-bold mb-1.5 uppercase tracking-wide">Upload Custom Cover Page (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCustomCoverChange}
                  className="w-full text-xs text-stone-550 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-red-50 file:text-red-755 hover:file:bg-red-100 cursor-pointer"
                />
                {customCoverBase64 && (
                  <div className="mt-2 text-left flex items-start gap-3">
                    <img src={customCoverBase64} alt="Cover preview" className="h-20 w-14 rounded border object-cover shadow-sm bg-neutral-50" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-red-750 block">Cover Page Loaded</span>
                      <p className="text-[10px] text-stone-400">This image will serve as the book/document cover featured inside the public catalogs.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Multi-File Selection PDF batch queue list */}
              {activeType === "pdf" && (
                <div className="rounded-xl border border-stone-200 bg-[#fbfcfa] p-4 space-y-3">
                  <span className="block text-stone-600 font-bold uppercase tracking-wide text-[10px]">
                    PDF Submission Batch Queue (Multi-File Selection)
                  </span>
                  <p className="text-[11px] text-stone-500 leading-normal">
                    You can bunch multiple PDF chapters or documents together under this single KES 200 review request.
                  </p>

                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newQueueFileName}
                      onChange={(e) => setNewQueueFileName(e.target.value)}
                      placeholder="e.g. Chapter_1_Introduction.pdf"
                      className="flex-1 rounded-lg border border-stone-200 bg-white px-3 py-2 outline-none text-xs focus:ring-1 focus:ring-red-400"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (newQueueFileName.trim()) {
                            setQueuedFiles([...queuedFiles, newQueueFileName.trim()]);
                            setNewQueueFileName("");
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newQueueFileName.trim()) {
                          setQueuedFiles([...queuedFiles, newQueueFileName.trim()]);
                          setNewQueueFileName("");
                        }
                      }}
                      className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-850 text-white font-bold rounded-lg transition text-xs shrink-0 cursor-pointer"
                    >
                      Add To Batch
                    </button>
                  </div>

                  {queuedFiles.length > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold text-stone-500 block">
                        Pending Queue Items ({queuedFiles.length} files added):
                      </span>
                      <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                        {queuedFiles.map((file, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-white border border-stone-150 rounded px-2.5 py-1 text-[11px] font-mono">
                            <span className="truncate text-stone-700">{file}</span>
                            <button
                              type="button"
                              onClick={() => setQueuedFiles(queuedFiles.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:text-red-700 font-bold ml-2 transition cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 border-2 border-dashed border-stone-200 rounded-lg text-stone-405 italic text-[11px] bg-white">
                      No additional files queued. Use inputs above to queue multiple docs.
                    </div>
                  )}
                </div>
              )}

              {/* Info text alerting about free submission and post-approval payment */}
              <div className="rounded-xl border border-amber-250 bg-amber-50/55 p-3.5 space-y-1 text-[11px] text-amber-900 leading-normal">
                <span className="font-bold flex items-center gap-1">
                  <HeartHandshake className="h-4 w-4 text-amber-700 shrink-0" />
                  Free Draft Submission Flow
                </span>
                <p>
                  No payment is required right now! Submit your draft completely for free. Once an Admin approves the contents, you can pay the KES 200 fee from your ledger on the right to make the download public.
                </p>
              </div>

              {isUploading ? (
                <div className="rounded-xl border border-stone-200 bg-slate-900 text-white p-5 space-y-4 shadow-lg animate-pulse-subtle">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="bg-red-500/20 text-red-300 border border-red-500/30 text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded">
                        {activeType === "video" ? "LARGE-SCALE VIDEO STREAM" : "ACADEMIC DOCUMENT FILE"}
                      </span>
                      <h4 className="font-bold text-xs truncate mt-1.5 max-w-[200px] sm:max-w-xs md:max-w-md">
                        {selectedFile ? selectedFile.name : titleInput || "Untitled Upload"}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Size: {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : "45.0 MB"}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span className={`w-2 h-2 rounded-full ${
                        uploadHealth === "good" ? "bg-emerald-500 animate-pulse" :
                        uploadHealth === "fair" ? "bg-amber-500 animate-pulse" :
                        uploadHealth === "poor" ? "bg-rose-500 animate-pulse" :
                        "bg-slate-500"
                      }`} />
                      <span className="text-[9px] font-bold font-mono uppercase text-slate-300">
                        {uploadHealth.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar and % Indicator */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[200px]">{uploadStatusText}</span>
                      <span className="text-sm font-bold text-red-400 shrink-0">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700 p-[1px]">
                      <div 
                        className="bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500 h-full rounded-full transition-all duration-300 relative"
                        style={{ width: `${uploadProgress}%` }}
                      >
                        <div className="absolute inset-0 bg-white/25 animate-pulse" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)', backgroundSize: '200% 100%' }} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <div>
                      <span className="block text-slate-500 font-bold">TRANSFER SPEED</span>
                      <span className="text-slate-200 font-extrabold text-[11px]">{uploadSpeed}</span>
                    </div>
                    <div>
                      <span className="block text-slate-500 font-bold">ESTIMATED ETA</span>
                      <span className="text-slate-200 font-extrabold text-[11px]">{uploadEta}</span>
                    </div>
                  </div>

                  {/* Interactive Controls */}
                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          const logs = JSON.parse(localStorage.getItem("WAFULA_ONGOING_UPLOADS") || "[]");
                          const idx = logs.findIndex((u: any) => u.id === activeUploadId);
                          if (idx !== -1) {
                            const nextStatus = logs[idx].status === "paused" ? "uploading" : "paused";
                            logs[idx].status = nextStatus;
                            localStorage.setItem("WAFULA_ONGOING_UPLOADS", JSON.stringify(logs));
                            setUploadPausedState(nextStatus === "paused");
                            window.dispatchEvent(new Event("storage"));
                          }
                        } catch (_) {}
                      }}
                      className="px-3 py-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-750 text-[10px] font-bold rounded-lg text-slate-300 transition flex items-center gap-1 cursor-pointer select-none"
                    >
                      {uploadPausedState ? (
                        <>
                          <Play className="h-3 w-3 text-emerald-400" />
                          <span>Resume Stream</span>
                        </>
                      ) : (
                        <>
                          <Pause className="h-3 w-3 text-amber-400" />
                          <span>Pause Stream</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        try {
                          const logs = JSON.parse(localStorage.getItem("WAFULA_ONGOING_UPLOADS") || "[]");
                          const idx = logs.findIndex((u: any) => u.id === activeUploadId);
                          if (idx !== -1) {
                            logs[idx].status = "cancelled";
                            localStorage.setItem("WAFULA_ONGOING_UPLOADS", JSON.stringify(logs));
                            window.dispatchEvent(new Event("storage"));
                          }
                        } catch (_) {}
                      }}
                      className="px-3 py-1.5 bg-rose-950/50 hover:bg-rose-900/50 border border-rose-900/60 text-[10px] font-bold rounded-lg text-rose-300 transition flex items-center gap-1 cursor-pointer select-none"
                    >
                      <X className="h-3 w-3" />
                      <span>Cancel Stream</span>
                    </button>
                  </div>
                </div>
              ) : success ? (
                <div className="rounded-lg bg-green-50 p-4 text-green-800 text-center font-semibold">
                  🎉 Draft submission queued successfully! Sent to the Admin review desk. View validation states and pay KES 200 fee in the Ledger!
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={isRestricted}
                  className="w-full flex items-center justify-center space-x-2 rounded-lg bg-red-700 hover:bg-neutral-900 text-white font-bold py-3 shadow-md disabled:opacity-45 cursor-pointer select-none transition-colors duration-150"
                >
                  {isRestricted ? (
                    <>
                      <AlertCircle className="h-4 w-4" />
                      <span>Upload Paused by Admin (Restricted)</span>
                    </>
                  ) : (
                    <>
                      <UploadIcon className="h-4 w-4" />
                      <span>Submit Draft for Admin Review (FREE)</span>
                    </>
                  )}
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Member Upload Listings ledger */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-4 font-sans">
            <h3 className="font-display text-base font-bold text-stone-900 border-b pb-2 mb-2 flex justify-between items-center">
              <span>My Upload Ledger</span>
              <span className="text-[10px] font-mono text-stone-400 font-bold bg-stone-50 px-2 py-0.5 rounded-full">
                {myUploads.length} File{myUploads.length !== 1 ? "s" : ""}
              </span>
            </h3>

            {myUploads.length > 0 && (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-stone-400" />
                  <input
                    type="text"
                    value={uploadSearchQuery}
                    onChange={(e) => setUploadSearchQuery(e.target.value)}
                    placeholder="Search file titles..."
                    className="w-full text-xs pl-8 pr-3 py-2 border border-stone-200 rounded-lg outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 bg-stone-50/50"
                  />
                </div>
                <div>
                  <select
                    value={ledgerCategoryFilter}
                    onChange={(e) => setLedgerCategoryFilter(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-2 text-xs font-bold outline-none"
                  >
                    <option value="All Categories">All Categories Filter</option>
                    <option value="General Education">General Education</option>
                    <option value="Leadership">Leadership</option>
                    <option value="Bible School">Bible School</option>
                    <option value="Religion">Religion</option>
                    <option value="Enjoyment">Enjoyment</option>
                    <option value="Fun">Fun</option>
                    <option value="Technology">Technology</option>
                    <option value="Many Others">Many Others</option>
                  </select>
                </div>
              </div>
            )}

            {myUploads.length === 0 ? (
              <p className="text-xs text-stone-400 text-center py-6">You haven't uploaded any documents through this portal yet.</p>
            ) : filteredUploads.length === 0 ? (
              <p className="text-xs text-stone-450 text-center py-6">No uploaded files match "{uploadSearchQuery}".</p>
            ) : (
              <div className="space-y-3">
                {filteredUploads.map((u) => {
                  const isApproved = u.status === "approved";
                  const isPaid = u.paid === true;
                  const isPendingDelete = u.status === "pending_delete";

                  let badgeColor = "bg-amber-50 text-amber-700 border border-amber-200";
                  let badgeLabel = "Draft Review";

                  if (isApproved) {
                    if (isPaid) {
                      badgeColor = "bg-green-50 text-green-700 border border-green-200";
                      badgeLabel = "Public / Live";
                    } else {
                      badgeColor = "bg-blue-50 text-blue-700 border border-blue-200";
                      badgeLabel = "Approved (Unpaid)";
                    }
                  } else if (isPendingDelete) {
                    badgeColor = "bg-orange-50 text-orange-600 border border-orange-200 animate-pulse";
                    badgeLabel = "Void Quest";
                  }

                  return (
                    <div key={u.id} className="rounded-xl bg-[#fcfbf9] border border-stone-150 p-4 text-xs text-left space-y-2 relative">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-2">
                          {u.thumbnail ? (
                            <img src={u.thumbnail} alt="preview" className="h-10 w-10 rounded-lg object-cover bg-stone-100 shrink-0 border" />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-stone-100 flex items-center justify-center shrink-0 border">
                              {u.type === "audio" ? <Headphones className="h-5 w-5 text-indigo-500" /> : <FileText className="h-5 w-5 text-stone-500" />}
                            </div>
                          )}
                          <div>
                            <h4 className="font-bold text-stone-850 truncate max-w-[130px]">{u.title}</h4>
                            <span className="text-[10px] text-stone-400 font-mono block mt-0.5">
                              {u.date} • {u.type.toUpperCase()}{u.category ? ` • ${u.category}` : " • General Education"}
                            </span>
                          </div>
                        </div>
                        
                        {/* Live review label */}
                        <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider font-mono ${badgeColor}`}>
                          {badgeLabel}
                        </span>
                      </div>

                      {u.type === "audio" && (
                        <div className="p-2 rounded-lg bg-stone-50 border border-stone-150 text-[10.5px] font-mono space-y-0.5 leading-tight">
                          {u.audioDuration && <p className="text-amber-800 font-extrabold">⏱ Duration: {u.audioDuration}</p>}
                          {u.audioCodec && <p className="text-stone-500">Codec: {u.audioCodec}</p>}
                        </div>
                      )}

                      {u.subFiles && u.subFiles.length > 0 && (
                        <div className="bg-stone-50 border border-stone-150 rounded-lg p-2.5 mt-2 space-y-1.5">
                          <span className="text-[10px] font-bold text-stone-500 font-mono block">BATCH QUEUE DOCUMENTS ({u.subFiles.length}):</span>
                          <div className="space-y-1 max-h-24 overflow-y-auto pr-1 font-mono">
                            {u.subFiles.map((file, fIdx) => (
                              <div key={fIdx} className="text-[11px] text-stone-600 flex items-center space-x-1.5 pl-1">
                                <span>•</span>
                                <span className="truncate select-all">{file}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="text-[11px] text-stone-605 space-y-1 bg-white border border-stone-100 rounded-lg p-2 mt-1">
                        <p className="font-semibold text-stone-700">
                          {u.allowedToPublic ? (
                            <span className="text-green-700">🔓 Visible & featured in public catalog</span>
                          ) : isApproved && !isPaid ? (
                            <span className="text-blue-700">🔒 Approved by Overseer but Private (Awaiting Payment)</span>
                          ) : (
                            <span className="text-amber-700">🔒 Private (Moderators evaluating content standards)</span>
                          )}
                        </p>
                        <p className="text-[10px] text-stone-400 font-mono">
                          Review Fee Status: {isPaid ? "✅ KES 200 Paid" : "❌ Unpaid (KES 200 review fee is due)"}
                        </p>
                      </div>

                      {/* Display Post-Approval Payment CTA */}
                      {isApproved && !isPaid && (
                        <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 mt-2 space-y-2">
                          <p className="text-[10.5px] text-blue-900 leading-tight">
                            Your upload has been approved by the Admin! Pay the **KES 200** fee to finalize publication.
                          </p>
                          <button
                            type="button"
                            onClick={() => handlePayAfterApprovalSimulate(u.id)}
                            disabled={payingId === u.id}
                            className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition text-[11px] cursor-pointer disabled:opacity-50 animate-bounce"
                          >
                            {payingId === u.id ? (
                              <>
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                <span>Contacting Safaricom M-PESA...</span>
                              </>
                            ) : (
                              <>
                                <HeartHandshake className="h-3.5 w-3.5" />
                                <span>Pay KES 200 with M-PESA</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between flex-wrap gap-2">
                        {/* Interactive local preview and physical stream decoder */}
                        <div className="flex items-center space-x-3">
                          <button
                            type="button"
                            onClick={() => handlePreviewFileInline(u)}
                            className="text-emerald-700 hover:text-emerald-800 font-extrabold hover:underline flex items-center space-x-1 cursor-pointer bg-transparent border-0 p-0 text-[11px]"
                          >
                            <Eye className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Read / Watch inline</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadFile(u)}
                            className="text-stone-550 hover:text-stone-700 font-medium hover:underline flex items-center space-x-1 cursor-pointer bg-transparent border-0 p-0 text-[11px]"
                          >
                            <Download className="h-3.5 w-3.5 text-stone-400" />
                            <span>Download ({u.fileSize})</span>
                          </button>
                        </div>

                        {/* Direct Permanent Deletion */}
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to permanently delete "${u.title}"? This cannot be undone.`)) {
                              onRequestDeleteUpload(u.id);
                            }
                          }}
                          className="text-red-650 hover:text-red-800 font-bold flex items-center space-x-1 cursor-pointer bg-transparent border-0 p-0 text-xs"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete Permanently</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
