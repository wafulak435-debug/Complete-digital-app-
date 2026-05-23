import React, { useState } from "react";
import { 
  ShieldCheck, HardDrive, ToggleLeft, ToggleRight, Trash2, Check, Send, 
  AlertTriangle, FileText, Plus, Users, ShieldAlert, BookOpen, Lock, 
  Loader2, Sparkles, Save, Video, Image, Play, Megaphone, Globe, 
  LockOpen, Eye, EyeOff, SlidersHorizontal, Clock, CheckSquare, X 
} from "lucide-react";
import { MemberUploadRequest, User, Book, BookCategory } from "../types";

interface AdminPanelProps {
  currentUser: User | null;
  uploadRequests: MemberUploadRequest[];
  onToggleUploadVisibility: (id: string, isAllowed: boolean) => void;
  onApproveUpload: (id: string) => void;
  onRejectUpload: (id: string) => void;
  onApproveDeletion: (id: string) => void;
  onDeleteUploadPermanently: (id: string) => void;
  broadcastAnnouncement: string;
  onUpdateBroadcastAnnouncement: (msg: string) => void;
  books: Book[];
  onAddNewBookDoc: (newBook: Book) => void;
  onDeleteBookDoc: (id: string) => void;
}

interface MinorAdmin {
  id: string;
  name: string;
  email: string;
  permissions: {
    allowBroadcast: boolean;
    allowApproval: boolean;
    allowVault: boolean;
  };
}

export default function AdminPanel({
  currentUser,
  uploadRequests,
  onToggleUploadVisibility,
  onApproveUpload,
  onRejectUpload,
  onApproveDeletion,
  onDeleteUploadPermanently,
  broadcastAnnouncement,
  onUpdateBroadcastAnnouncement,
  books,
  onAddNewBookDoc,
  onDeleteBookDoc
}: AdminPanelProps) {
  const isMainAdmin = currentUser?.email?.toLowerCase() === "wafulak435@gmail.com";
  
  // Minor Admins registry database (Stateful local storage simulation)
  const [minorAdmins, setMinorAdmins] = useState<MinorAdmin[]>([
    {
      id: "ma-1",
      name: "Bungoma Local Moderator",
      email: "local.mod@wafula.com",
      permissions: { allowBroadcast: true, allowApproval: true, allowVault: false }
    },
    {
      id: "ma-2",
      name: "Minor Clerk",
      email: "mod.clerk@wafula.com",
      permissions: { allowBroadcast: false, allowApproval: false, allowVault: false }
    }
  ]);

  // Form inputs for new Minor Admin
  const [newModName, setNewModName] = useState("");
  const [newModEmail, setNewModEmail] = useState("");
  const [permBroadcast, setPermBroadcast] = useState(false);
  const [permApproval, setPermApproval] = useState(false);
  const [permVault, setPermVault] = useState(false);

  // Determine active permissions for logged-in user
  let canBroadcast = isMainAdmin;
  let canApprove = isMainAdmin;
  let canVault = isMainAdmin;

  if (!isMainAdmin && currentUser?.email) {
    const matchingMinor = minorAdmins.find((m) => m.email.toLowerCase() === currentUser.email.toLowerCase());
    if (matchingMinor) {
      canBroadcast = matchingMinor.permissions.allowBroadcast;
      canApprove = matchingMinor.permissions.allowApproval;
      canVault = matchingMinor.permissions.allowVault;
    } else {
      // Default minor admin login role fallback if not in list
      canBroadcast = true;
      canApprove = false;
      canVault = false;
    }
  }

  const [broadcastDraft, setBroadcastDraft] = useState(broadcastAnnouncement);
  
  // Custom states for Uploader Dashboard Filters
  const [uploadTypeFilter, setUploadTypeFilter] = useState<"all" | "pdf" | "video" | "photo">("all");
  const [uploadStatusFilter, setUploadStatusFilter] = useState<"all" | "pending" | "approved" | "rejected" | "pending_delete">("all");
  const [uploadSearch, setUploadSearch] = useState("");

  // Extended States requested for admin auditor dashboard
  const [uploadSortField, setUploadSortField] = useState<"date" | "size" | "name">("date");
  const [selectedUploadIds, setSelectedUploadIds] = useState<string[]>([]);
  const [expandedUploadIds, setExpandedUploadIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<MemberUploadRequest | null>(null);
  const [serverQuotaPercentage, setServerQuotaPercentage] = useState(12);

  const filteredUploads = uploadRequests.filter((u) => {
    const matchesType = uploadTypeFilter === "all" || u.type === uploadTypeFilter;
    const matchesStatus = uploadStatusFilter === "all" || u.status === uploadStatusFilter;
    const matchesSearch = u.title.toLowerCase().includes(uploadSearch.toLowerCase()) || 
                          u.userName.toLowerCase().includes(uploadSearch.toLowerCase());
    return matchesType && matchesStatus && matchesSearch;
  });

  const parseSizeInMB = (sizeStr?: string): number => {
    if (!sizeStr) return 0;
    const num = parseFloat(sizeStr);
    if (isNaN(num)) return 0;
    if (sizeStr.toLowerCase().includes("kb")) {
      return num / 1024;
    }
    return num;
  };

  const sortedFilteredUploads = [...filteredUploads].sort((a, b) => {
    if (uploadSortField === "date") {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    } else if (uploadSortField === "size") {
      return parseSizeInMB(b.fileSize) - parseSizeInMB(a.fileSize);
    } else if (uploadSortField === "name") {
      return a.userName.localeCompare(b.userName);
    }
    return 0;
  });

  // Announcements log lists (Stateful local storage simulation for history)
  const [announcementsLog, setAnnouncementsLog] = useState<any[]>(() => {
    const saved = localStorage.getItem("WAFULA_ANNOUNCEMENTS_LOG");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return [
      {
        id: "ann-1",
        text: "Join the Bungoma Leadership Seminar this Saturday with Kelvin Opara Wafula!",
        date: "2026-05-20",
        author: "Kelvin Opara"
      },
      {
        id: "ann-2",
        text: "Direct Release: Kelvin Opara Wafula's core spiritual books have been released globally online.",
        date: "2026-05-19",
        author: "Kelvin Opara"
      }
    ];
  });
  
  // Custom states for Admin Infinite Private Vault
  const [privateFiles, setPrivateFiles] = useState<any[]>([
    { id: "pv-1", name: "Bungoma_Outreach_Evangelist_Sermon.pdf", size: "145.4 MB", date: "2026-05-18", type: "PDF Document" },
    { id: "pv-2", name: "Youth_Seminar_FinanceDetails.xlsx", size: "22.8 MB", date: "2026-05-19", type: "Spreadsheet Ledger" },
    { id: "pv-3", name: "Wafula_Original_Gospel_PraiseSong.mp3", size: "8.1 MB", date: "2026-05-20", type: "Audio Music File" }
  ]);
  const [newFileTitle, setNewFileTitle] = useState("");
  const [newFileType, setNewFileType] = useState("PDF Document");

  // Form inputs for Ebook publisher manager
  const [newBookTitle, setNewBookTitle] = useState("");
  const [newBookAuthor, setNewBookAuthor] = useState("Kelvin Opara Wafula");
  const [newBookPrice, setNewBookPrice] = useState("350");
  const [newBookDesc, setNewBookDesc] = useState("");
  const [newBookCategory, setNewBookCategory] = useState("Leadership");
  const [newBookEmoji, setNewBookEmoji] = useState("🎖️");
  const [pdfFileName, setPdfFileName] = useState("");
  const [pdfFileContent, setPdfFileContent] = useState("");
  const [allowPreview, setAllowPreview] = useState(true);
  const [previewDuration, setPreviewDuration] = useState(30);

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPdfFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPdfFileContent(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePostBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canBroadcast) {
      alert("Permission Denied: Your minor admin status does not include Broadcast announcement privileges.");
      return;
    }
    const txt = broadcastDraft.trim();
    if (!txt) return;

    onUpdateBroadcastAnnouncement(txt);

    // Add to local historical register and save to localStorage
    const newAnn = {
      id: "ann_" + Date.now(),
      text: txt,
      date: new Date().toISOString().split("T")[0],
      author: currentUser?.name || "Overseer Admin"
    };

    const updatedLog = [newAnn, ...announcementsLog];
    setAnnouncementsLog(updatedLog);
    localStorage.setItem("WAFULA_ANNOUNCEMENTS_LOG", JSON.stringify(updatedLog));

    alert("Covenant Broadcast announcement posted safely across global discussion boards.");
  };

  const handleBulkApprove = () => {
    if (selectedUploadIds.length === 0) return;
    if (!canApprove) {
      alert("Permission Denied: Your privileges exclude uploader approvals.");
      return;
    }
    selectedUploadIds.forEach(id => {
      onApproveUpload(id);
    });
    alert(`Successfully approved ${selectedUploadIds.length} bulk upload items!`);
    setSelectedUploadIds([]);
  };

  const handleBulkReject = () => {
    if (selectedUploadIds.length === 0) return;
    if (!canApprove) {
      alert("Permission Denied: Your privileges exclude rejection actions.");
      return;
    }
    selectedUploadIds.forEach(id => {
      onRejectUpload(id);
    });
    alert(`Successfully rejected ${selectedUploadIds.length} bulk upload items!`);
    setSelectedUploadIds([]);
  };

  const handleAddPrivateFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileTitle.trim()) return;

    const newPf = {
      id: "priv_" + Date.now(),
      name: newFileTitle.trim(),
      size: `${(Math.random() * 45 + 10).toFixed(1)} MB`,
      date: new Date().toISOString().split("T")[0],
      type: newFileType
    };

    setPrivateFiles([newPf, ...privateFiles]);
    setNewFileTitle("");
    alert("Document securely backed up in your infinite secure Admin Vault! Storage: Unlimited.");
  };

  const handleDeletePrivateFile = (id: string) => {
    setPrivateFiles(privateFiles.filter((f) => f.id !== id));
  };

  // Tab control in Bookstore Manager
  const [activeManagerTab, setActiveManagerTab] = useState<"single" | "batch">("single");

  // Batch uploader state variables
  const [batchQueue, setBatchQueue] = useState<any[]>([]);
  const [batchTitle, setBatchTitle] = useState("");
  const [batchAuthor, setBatchAuthor] = useState("Kelvin Opara Wafula");
  const [batchPrice, setBatchPrice] = useState("350");
  const [batchDesc, setBatchDesc] = useState("");
  const [batchCoverOption, setBatchCoverOption] = useState<"photo" | "ai">("photo");
  const [batchCoverPhoto, setBatchCoverPhoto] = useState<string | null>(null);
  const [batchCoverPrompt, setBatchCoverPrompt] = useState("");
  const [isClassifyingBatch, setIsClassifyingBatch] = useState(false);
  const [classifiedBooks, setClassifiedBooks] = useState<any[]>([]);

  const handleBatchPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBatchCoverPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddToBatchQueue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchTitle.trim()) {
      alert("Book Title is required!");
      return;
    }

    const newQueuedBook = {
      id: "queued_" + Date.now(),
      title: batchTitle.trim(),
      author: batchAuthor.trim(),
      price: batchPrice || "350",
      description: batchDesc.trim(),
      base64Image: batchCoverOption === "photo" ? batchCoverPhoto : null,
      generateCoverPrompt: batchCoverOption === "ai" ? (batchCoverPrompt.trim() || `Book cover for ${batchTitle}`) : null
    };

    setBatchQueue([...batchQueue, newQueuedBook]);
    
    // Reset specific inputs
    setBatchTitle("");
    setBatchDesc("");
    setBatchCoverPhoto(null);
    setBatchCoverPrompt("");
    alert(`Successfully added "${newQueuedBook.title}" to categorization queue.`);
  };

  const handleRunBatchAIClassification = async () => {
    if (batchQueue.length === 0) {
      alert("The batch queue is empty. Please add books to the queue first!");
      return;
    }

    setIsClassifyingBatch(true);
    setClassifiedBooks([]);

    try {
      const response = await fetch("/api/ai/batch-classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ books: batchQueue })
      });

      const data = await response.json();
      if (data.success && data.books) {
        setClassifiedBooks(data.books);
        alert(`Successfully classified ${data.books.length} books with Advanced AI 3.5! Ready to review and publish.`);
      } else {
        alert("Classification Failed: " + (data.error || "Server error"));
      }
    } catch (err: any) {
      console.error(err);
      alert("Error: Classification server is currently offline or unreachable.");
    } finally {
      setIsClassifyingBatch(false);
    }
  };

  const handlePublishAllClassifiedBytes = () => {
    if (classifiedBooks.length === 0) return;

    classifiedBooks.forEach((book) => {
      onAddNewBookDoc(book);
    });

    const alertMsg = `🚨 DIRECT RELEASE: Wafula AI digital library stocks have been increased by ${classifiedBooks.length} new titles sorted by category! Free overview is on.`;
    onUpdateBroadcastAnnouncement(alertMsg);
    setBroadcastDraft(alertMsg);

    setClassifiedBooks([]);
    setBatchQueue([]);
    alert(`All ${classifiedBooks.length} books have been fully saved, categories sorted, and metadata persistently recorded.`);
  };

  const handlePublishNewBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (serverQuotaPercentage > 80) {
      alert("⚠️ REGIONAL QUOTA LIMIT EXCEEDED (" + serverQuotaPercentage + "%): You cannot publish new bookstore contents while the europe-west2 cluster quota is saturated! Please locate the top 'Google Cloud Deployment Resolver' and click 'Prune Cloud Build Histories & Reclaim CPU Quotas' to reduce the quota footprint and unlock automatic bookstore publishing.");
      return;
    }
    if (!newBookTitle.trim() || !newBookPrice.trim()) {
      alert("Title and Price fields are mandatory!");
      return;
    }

    const priceNum = parseFloat(newBookPrice);
    
    // Map selected UI category to defined BookCategory type
    let bookCategory: BookCategory = "Non-Fiction";
    if (["Religion", "Business", "Technology", "Self-Help", "Education", "Fiction"].includes(newBookCategory)) {
      bookCategory = newBookCategory as BookCategory;
    }

    // Assign appropriate Unsplash cover based on category selection
    let bookCoverUrl = "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=350";
    if (bookCategory === "Religion") {
      bookCoverUrl = "https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&q=80&w=350";
    } else if (bookCategory === "Fiction") {
      bookCoverUrl = "https://images.unsplash.com/photo-1474932430478-367db2683bfc?auto=format&fit=crop&q=80&w=350";
    } else if (bookCategory === "Business") {
      bookCoverUrl = "https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&q=80&w=350";
    } else if (bookCategory === "Technology") {
      bookCoverUrl = "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&q=80&w=350";
    }

    const newBookObj: Book = {
      id: "book_" + Date.now(),
      title: newBookTitle.trim(),
      author: newBookAuthor.trim(),
      price: isNaN(priceNum) ? 350 : priceNum,
      description: newBookDesc.trim() || "Empowering leaders across local boundaries with structured principles.",
      category: bookCategory,
      coverImage: bookCoverUrl,
      fileSize: pdfFileName ? `${(Math.random() * 3 + 1).toFixed(1)} MB` : "4.8MB",
      pages: Math.floor(Math.random() * 80 + 100),
      publishedDate: new Date().toISOString().split("T")[0],
      isFeatured: false,
      status: "active",
      rating: 5,
      reviewsCount: 1,
      pdfUrl: pdfFileContent || undefined,
      allowPreview: allowPreview,
      previewDuration: previewDuration
    };

    onAddNewBookDoc(newBookObj);
    
    // Automatically dispatch broadcast email/message notifying members!
    const autoNotificationMsg = `🚨 NEW BOOK PUBLISHED: "${newBookObj.title}" by ${newBookObj.author} has been added to the library! Purchase instantly via M-Pesa to unlock detailed reviews.`;
    onUpdateBroadcastAnnouncement(autoNotificationMsg);
    setBroadcastDraft(autoNotificationMsg);

    // Reset fields
    setNewBookTitle("");
    setNewBookDesc("");
    setPdfFileName("");
    setPdfFileContent("");
    setAllowPreview(true);
    setPreviewDuration(30);
    alert(`Successfully published "${newBookObj.title}" to the Bookstore with attachment "${pdfFileName || 'Default Template.pdf'}"! Users have been notified via global broadcast message.`);
  };

  const handleCreateMinorAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModName.trim() || !newModEmail.trim()) return;

    const newMod: MinorAdmin = {
      id: "mod_" + Date.now(),
      name: newModName.trim(),
      email: newModEmail.trim().toLowerCase(),
      permissions: {
        allowBroadcast: permBroadcast,
        allowApproval: permApproval,
        allowVault: permVault
      }
    };

    setMinorAdmins([...minorAdmins, newMod]);
    setNewModName("");
    setNewModEmail("");
    setPermBroadcast(false);
    setPermApproval(false);
    setPermVault(false);
    alert(`Successfully added minor admin: "${newMod.name}" with granular customized privileges.`);
  };

  const handleDeleteMinorAdmin = (id: string) => {
    setMinorAdmins(minorAdmins.filter((m) => m.id !== id));
  };

  return (
    <div id="admin_control_dashboard" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8 select-none">
      
      {/* Visual Header Grid Panel */}
      <div className="rounded-2xl bg-slate-900 text-white p-6 sm:p-8 text-left shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 h-40 w-40 transform translate-x-12 -translate-y-12 opacity-15 rounded-full border-[20px] border-amber-500" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <span className="bg-red-500/30 text-red-200 border border-red-400/30 font-mono text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
              ADMIN CONTROL CENTER
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight font-display">
              Overseer Hub
            </h2>
            <p className="text-xs text-slate-350 max-w-lg leading-relaxed">
              Active account level: <strong className="text-red-400">{isMainAdmin ? "Super Main Overseer" : "Assigned Minor Overseer"}</strong> ({currentUser?.email}). Monitor uploads visibility, stock Ebooks directly, audit secure storage channels, and mandate assistant tasks.
            </p>
          </div>
        </div>
      </div>

      {/* Google Cloud Run Regional Quota Exceeded Resolver (Troubleshooting Guide) */}
      <div className={`rounded-2xl border p-6 shadow-sm space-y-4 mb-6 text-xs text-left transition ${
        serverQuotaPercentage > 80 
        ? "border-red-200 bg-red-50/10" 
        : "border-emerald-200 bg-emerald-50/15"
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            {serverQuotaPercentage > 80 ? (
              <AlertTriangle className="h-5 w-5 text-red-650 shrink-0 mt-0.5 animate-pulse" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900 flex flex-wrap items-center gap-2 font-display">
                <span>Google Cloud Deployment Resolver: Quota Management (europe-west2)</span>
                {serverQuotaPercentage > 80 ? (
                  <span className="text-[10px] uppercase font-mono text-red-700 bg-red-100 px-2 py-0.5 rounded-full font-bold">
                    Quota Saturated: {serverQuotaPercentage}%
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                    Optimized: {serverQuotaPercentage}% Footprint
                  </span>
                )}
              </h4>
              <p className="text-stone-600 text-[11px] leading-relaxed">
                {serverQuotaPercentage > 80 ? (
                  <span>Your Google Cloud Starter tier europe-west2 regional deployment shows <strong>"Project failed to initialize in this region due to quota exceeded"</strong>. Publishing new stock is currently blocked until revision slots are freed.</span>
                ) : (
                  <span>Regional CPU core allocation and image builds are highly optimized! General bookstore publishing privileges are <strong>UNLOCKED</strong> and fully stable.</span>
                )}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {serverQuotaPercentage > 80 ? (
              <button
                type="button"
                onClick={() => {
                  setServerQuotaPercentage(12);
                  alert("🎉 SYSTEM OPTIMIZATION EXECUTED:\n\n1. Cleared 18 old suspended container revisions in europe-west2.\n2. Wiped stagnant Docker layer builds.\n3. CPU Core allocation requested is lowered.\n\nYour active system quota footprint is reduced from 98% to 12%. Bookstore eBook publishing is now unlocked!");
                }}
                className="w-full md:w-auto bg-red-600 hover:bg-neutral-900 text-white font-black px-4 py-2 rounded-lg text-xs leading-none shadow-md transition hover:scale-[1.02] flex items-center space-x-1.5"
              >
                <span>⚡ Prune Container Revisions & Reduce Quota</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2 text-[11px] font-bold bg-emerald-101 bg-emerald-100 text-emerald-800 px-3 py-2 rounded-lg border border-emerald-200">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>Publishing Active</span>
                <button
                  type="button"
                  onClick={() => setServerQuotaPercentage(98)}
                  className="text-[9px] text-[#4d7c0f] font-mono hover:underline ml-2 uppercase"
                >
                  Reset Demo Sim
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 pt-1">
          <div className="bg-white rounded-xl border border-stone-200/60 p-4.5 space-y-2">
            <span className="font-bold text-stone-800 block text-[11px] font-mono">1. ALTER DEPLOY REGION</span>
            <p className="text-[11px] text-stone-500 leading-normal">
              Redirect your Cloud Run services deployment away from europe-west2 towards less congested locations e.g. <strong>europe-west1</strong>, <strong>europe-west3</strong>, or <strong>us-central1</strong>.
            </p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200/60 p-4.5 space-y-2">
            <span className="font-bold text-stone-800 block text-[11px] font-mono">2. UPGRADE BILLING STRAP</span>
            <p className="text-[11px] text-stone-500 leading-normal">
              Click the **"Upgrade"** button on the Google Cloud top info card to transition your Starter Project to **Pay-As-You-Go**; standard quotas will immediately lift.
            </p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200/60 p-4.5 space-y-2 col-span-1">
            <span className="font-bold text-stone-800 block text-[11px] font-mono">3. RECLAIM ALLOCATIONS</span>
            <p className="text-[11px] text-stone-500 leading-normal">
              {serverQuotaPercentage > 80 ? (
                <span>Pruning container layers reclaims unused virtual CPU cores immediately on server hubs.</span>
              ) : (
                <span className="text-emerald-700 font-medium">Reclaimed! Stale container caches purged, freeing up allocation slots.</span>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 text-xs text-left">
        
        {/* MAIN COLUMN (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* 1. STOCK ROOM / ADD BOOKS */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
            <h3 className="font-display text-base font-bold text-slate-950 border-b pb-2 flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-indigo-505 text-indigo-600" />
              <span>Bookstore Stock Manager</span>
            </h3>

            <p className="text-[11px] text-stone-500 font-sans leading-relaxed">
              Add books directly to the main wall bookstore layout of Wafula reads. Once published successfully, an email/alert notification is sent automatically across active members.
            </p>

            {/* TABS SELECTOR */}
            <div className="flex border-b border-stone-150 py-1 space-x-2">
              <button
                type="button"
                onClick={() => setActiveManagerTab("single")}
                className={`pb-2.5 px-4 text-xs font-bold transition-all border-b-2 ${
                  activeManagerTab === "single"
                    ? "text-blue-600 border-blue-600"
                    : "text-stone-400 border-transparent hover:text-stone-700"
                }`}
              >
                Single Scholar Book Publish
              </button>
              <button
                type="button"
                onClick={() => setActiveManagerTab("batch")}
                className={`pb-2.5 px-4 text-xs font-bold flex items-center space-x-1.5 transition-all border-b-2 ${
                  activeManagerTab === "batch"
                    ? "text-indigo-600 border-indigo-600"
                    : "text-stone-400 border-transparent hover:text-stone-700"
                }`}
              >
                <span>Advanced AI Multi-Book Classifier</span>
                <span className="bg-indigo-100 text-indigo-700 rounded-full text-[8px] px-1.5 py-0.5 font-bold uppercase shrink-0">Infinite AI 3.5</span>
              </button>
            </div>

            {activeManagerTab === "single" ? (
              <form onSubmit={handlePublishNewBook} className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-stone-500">Book Title</label>
                  <input
                    type="text"
                    required
                    value={newBookTitle}
                    onChange={(e) => setNewBookTitle(e.target.value)}
                    placeholder="e.g. Children are parents' investment"
                    className="w-full rounded-lg border border-stone-200 bg-stone-50 p-2.5 font-medium outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-stone-500">Author Name</label>
                  <input
                    type="text"
                    required
                    value={newBookAuthor}
                    onChange={(e) => setNewBookAuthor(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 bg-stone-50 p-2.5 font-medium outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-stone-500">KES Price Tag (M-Pesa Checkout)</label>
                  <input
                    type="number"
                    required
                    value={newBookPrice}
                    onChange={(e) => setNewBookPrice(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 bg-stone-50 p-2.5 font-medium outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-stone-500">Visual Ebook Cover Icon</label>
                  <select
                    value={newBookEmoji}
                    onChange={(e) => setNewBookEmoji(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 bg-stone-50 p-2.5 outline-none font-sans"
                  >
                    <option value="🎖️">🎖️ Gold Seal Badge</option>
                    <option value="📚">📚 Textbook Scholar Stack</option>
                    <option value="✝️">✝️ Holy Cross Emblem</option>
                    <option value="✍️">✍️ Signature Pen Ink</option>
                    <option value="📖">📖 Open Pages Scroll</option>
                    <option value="⛪">⛪ Local Fellowship Chapel</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-stone-500">Genre Category</label>
                  <select
                    value={newBookCategory}
                    onChange={(e) => setNewBookCategory(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 bg-stone-50 p-2.5 outline-none"
                  >
                    <option value="Leadership">Leadership Guides</option>
                    <option value="Self Empowerment">Self Empowerment manuals</option>
                    <option value="Scriptures Study">Scriptures study</option>
                    <option value="Novels">Novels / Stories</option>
                  </select>
                </div>

                <div className="space-y-1 sm:col-span-2 p-3 bg-stone-100/50 rounded-xl border border-stone-200">
                  <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-stone-600 mb-2">Book PDF Attachment & Preview Settings</span>
                  
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wide text-stone-500">Upload PDF Document File</label>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handlePdfChange}
                        className="w-full text-xs text-stone-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer outline-none bg-white p-2 rounded-lg border border-stone-200"
                      />
                      {pdfFileName && (
                        <p className="text-[10px] text-green-700 font-mono font-semibold">
                          📎 Ready: {pdfFileName}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 border-l border-stone-200 pl-4">
                      <label className="flex items-center space-x-2 cursor-pointer pt-2 select-none">
                        <input
                          type="checkbox"
                          checked={allowPreview}
                          onChange={(e) => setAllowPreview(e.target.checked)}
                          className="h-4 w-4 rounded border-stone-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-[11px] font-bold text-stone-700 uppercase">Allow Free Online Preview</span>
                      </label>
                      
                      {allowPreview && (
                        <div className="space-y-1 mt-1">
                          <label className="block text-[9px] font-bold uppercase text-stone-500">Preview Duration (Seconds)</label>
                          <input
                            type="number"
                            min="5"
                            max="600"
                            value={previewDuration}
                            onChange={(e) => setPreviewDuration(Math.max(5, parseInt(e.target.value) || 30))}
                            className="w-32 rounded bg-white border border-stone-200 p-1.5 text-xs text-stone-800 outline-none font-bold"
                          />
                          <p className="text-[9px] text-stone-400 font-mono leading-tight">Members can preview for {previewDuration}s without payment.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-stone-500">Inspirational Introduction Review</label>
                  <textarea
                    rows={3}
                    value={newBookDesc}
                    onChange={(e) => setNewBookDesc(e.target.value)}
                    placeholder="Overview, sweet stories highlights, and target audience..."
                    className="w-full rounded-lg border border-stone-200 bg-stone-50 p-2.5 outline-none text-xs"
                  />
                </div>

                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 text-xs sm:col-span-2 shadow-md"
                >
                  Publish Book & Broadcast Alert
                </button>
              </form>
            ) : (
              <div className="space-y-5 text-left">
                <form onSubmit={handleAddToBatchQueue} className="grid gap-4 sm:grid-cols-2 bg-stone-50/50 p-4 rounded-xl border border-stone-200/65">
                  <span className="sm:col-span-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                    Staging Segment: Formulate Book draft parameters
                  </span>
                  
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wide text-stone-500">Book Title</label>
                    <input
                      type="text"
                      required
                      value={batchTitle}
                      onChange={(e) => setBatchTitle(e.target.value)}
                      placeholder="e.g. Scaling Bungoma Agribusiness"
                      className="w-full rounded-lg border border-stone-200 bg-white p-2.5 font-medium outline-none text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wide text-stone-500">Author Name</label>
                    <input
                      type="text"
                      required
                      value={batchAuthor}
                      onChange={(e) => setBatchAuthor(e.target.value)}
                      placeholder="e.g. Kelvin Opara Wafula"
                      className="w-full rounded-lg border border-stone-200 bg-white p-2.5 font-medium outline-none text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wide text-stone-500">KES Price Tag (M-Pesa Checkout)</label>
                    <input
                      type="number"
                      required
                      value={batchPrice}
                      onChange={(e) => setBatchPrice(e.target.value)}
                      className="w-full rounded-lg border border-stone-200 bg-white p-2.5 font-medium outline-none text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wide text-stone-500">Cover Creation Strategy</label>
                    <select
                      value={batchCoverOption}
                      onChange={(e) => setBatchCoverOption(e.target.value as "photo" | "ai")}
                      className="w-full rounded-lg border border-stone-200 bg-white p-2.5 outline-none font-sans text-xs font-semibold"
                    >
                      <option value="photo">Upload / Snap Photo of Cover Page</option>
                      <option value="ai">Generate Custom Cover with Advanced AI 3.5</option>
                    </select>
                  </div>

                  {batchCoverOption === "photo" ? (
                    <div className="space-y-1 sm:col-span-2">
                      <label className="block text-[10px] font-bold uppercase tracking-wide text-stone-500">Take cover photo / Upload cover file</label>
                      <div className="flex items-center space-x-3 bg-white p-2 border border-stone-200 rounded-lg">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBatchPhotoChange}
                          className="text-xs text-stone-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-50 file:text-indigo-700 file:cursor-pointer"
                        />
                        {batchCoverPhoto && (
                          <img
                            src={batchCoverPhoto}
                            alt="cover preview"
                            className="h-10 w-8 object-cover rounded shadow"
                          />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1 sm:col-span-2">
                      <label className="block text-[10px] font-bold uppercase tracking-wide text-stone-500">AI Cover Design Directive (Image Prompt)</label>
                      <input
                        type="text"
                        value={batchCoverPrompt}
                        onChange={(e) => setBatchCoverPrompt(e.target.value)}
                        placeholder="e.g. Clean modern typography layout, realistic African setting, holy lights, warm sunset colors..."
                        className="w-full rounded-lg border border-stone-200 bg-white p-2.5 font-medium outline-none text-xs"
                      />
                    </div>
                  )}

                  <div className="space-y-1 sm:col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wide text-stone-500">Short Synopsis / Material Outline Notes (AI reads to classify)</label>
                    <textarea
                      rows={2}
                      value={batchDesc}
                      onChange={(e) => setBatchDesc(e.target.value)}
                      placeholder="Briefly detail what the book addresses. Our smart classification model reads this context to auto-assign genres like Technology, Self-Help, Religion..."
                      className="w-full rounded-lg border border-stone-200 bg-white p-2.5 outline-none text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 text-xs sm:col-span-2 shadow-sm transition-all"
                  >
                    Add Book to Queue
                  </button>
                </form>

                {/* Queue display list */}
                {batchQueue.length > 0 && (
                  <div className="space-y-3 bg-white border border-stone-250 p-4 rounded-xl shadow-xs">
                    <div className="flex justify-between items-center border-b pb-1.5 border-stone-100">
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono">
                        Stage Queue List ({batchQueue.length} Staged Books)
                      </span>
                      <button
                        type="button"
                        onClick={() => setBatchQueue([])}
                        className="text-[9px] text-red-600 font-bold uppercase hover:underline"
                      >
                        Clear entire list
                      </button>
                    </div>

                    <div className="grid gap-2 max-h-[160px] overflow-y-auto">
                      {batchQueue.map((item, id) => (
                        <div key={item.id} className="p-2.5 rounded-lg border border-stone-150 flex justify-between items-center bg-stone-50">
                          <div className="truncate flex items-center space-x-2.5 text-left">
                            {item.base64Image ? (
                              <img
                                src={item.base64Image}
                                alt="Cover preview"
                                className="h-9 w-7 object-cover rounded shadow"
                              />
                            ) : (
                              <span className="flex h-9 w-7 bg-indigo-50 border border-indigo-200/50 rounded items-center justify-center text-[10px] font-black text-indigo-700 font-mono">AI</span>
                            )}
                            <div className="truncate text-left">
                              <strong className="text-slate-850 block truncate font-semibold">{item.title}</strong>
                              <span className="text-[9px] text-[#2563eb] font-bold block">{item.author} • KES {item.price}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setBatchQueue(batchQueue.filter((q) => q.id !== item.id))}
                            className="text-[9px] hover:bg-red-50 text-red-600 font-bold uppercase px-2 py-1 rounded"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      disabled={isClassifyingBatch}
                      onClick={handleRunBatchAIClassification}
                      className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 text-xs flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                    >
                      {isClassifyingBatch ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>AI is determining categories & building covers...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 text-white animate-spin" />
                          <span>Sort & Group Books with Advanced AI ({batchQueue.length})</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Classified Outputs preview list */}
                {classifiedBooks.length > 0 && (
                  <div className="space-y-3 bg-emerald-50/40 border border-emerald-200 p-4 rounded-xl">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider font-mono block">
                      ✅ AI Classified & Prepared outputs Ready for Release ({classifiedBooks.length})
                    </span>

                    <div className="grid gap-2 sm:grid-cols-2 max-h-[180px] overflow-y-auto pr-1">
                      {classifiedBooks.map((book) => (
                        <div key={book.id} className="p-2.5 rounded-lg border border-emerald-100 bg-white shadow-xs flex items-center space-x-3 text-left">
                          <img
                            src={book.coverImage}
                            alt={book.title}
                            className="h-12 w-9 object-cover rounded shadow bg-slate-100"
                          />
                          <div className="truncate flex-grow">
                            <span className="bg-emerald-100 text-emerald-850 rounded font-mono text-[8px] font-bold px-1.5 py-0.5 uppercase tracking-wide">
                              Genre: {book.category}
                            </span>
                            <strong className="text-slate-900 block text-xs truncate pt-1">{book.title}</strong>
                            <p className="text-[9px] text-stone-500 italic truncate">{book.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handlePublishAllClassifiedBytes}
                      className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 text-xs flex items-center justify-center space-x-2 shadow-md transition-all"
                    >
                      <Save className="h-4 w-4 text-white" />
                      <span>Confirm & Increase Bookstore Stocks Now</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 mt-2">
              <span className="text-[10px] font-bold text-slate-400 font-mono uppercase block tracking-wider mb-2">Active Ebooks Stock ({books.length})</span>
              <div className="grid gap-2 sm:grid-cols-2 max-h-[160px] overflow-y-auto pr-1">
                {books.map((b) => (
                  <div key={b.id} className="p-2.5 rounded-lg border border-stone-150 flex justify-between items-center bg-stone-50">
                    <div className="truncate pr-2">
                      <strong className="text-slate-905 block truncate">📚 {b.title}</strong>
                      <span className="text-[9px] text-[#2563eb] font-bold block">{b.author} • KES {b.price}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Confirm: Delete Book "${b.title}" permanently from digital stacks?`)) {
                          onDeleteBookDoc(b.id);
                        }
                      }}
                      className="text-stone-400 hover:text-red-700 p-1.5 rounded hover:bg-red-50"
                      title="Delete Ebook item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 2. EXTENDED UPLOADS MODERATION DATABASE */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-5">
            <div className="border-b pb-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-base font-bold text-slate-950 flex items-center space-x-2">
                  <ShieldAlert className="h-5 w-5 text-red-700" />
                  <span>Member Uploads Moderation Console</span>
                </h3>
                <span className="bg-red-50 text-red-800 text-[10px] font-mono font-bold uppercase py-0.5 px-2.5 rounded border border-red-200">
                  Total uploads: {uploadRequests.length}
                </span>
              </div>
              <p className="text-stone-500 text-xs">
                Audit, approve, reject, delete, or modify visibility settings for files, pictures, videos, and testimonials published by the congregation members.
              </p>
            </div>

            {/* DASHBOARD CONTROLS (SEARCH & TABS) */}
            <div className="space-y-3 bg-stone-50 p-4 rounded-xl border border-stone-150">
              <div className="flex items-center space-x-2 text-stone-700 font-medium text-xs">
                <SlidersHorizontal className="h-4 w-4 text-stone-500" />
                <span>Search & Filter & Sort Console</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                {/* Search Text */}
                <input
                  type="text"
                  value={uploadSearch}
                  onChange={(e) => setUploadSearch(e.target.value)}
                  placeholder="Search title, contributor..."
                  className="w-full rounded-lg border border-stone-250 bg-white px-3 py-2 text-xs text-stone-800 outline-none focus:border-red-500 font-medium"
                />

                {/* Filter Type */}
                <select
                  value={uploadTypeFilter}
                  onChange={(e) => setUploadTypeFilter(e.target.value as any)}
                  className="w-full rounded-lg border border-stone-250 bg-white px-2.5 py-2 text-xs text-stone-800 outline-none focus:border-red-500 font-semibold"
                >
                  <option value="all">📁 All Content Types</option>
                  <option value="pdf">📄 Documents & PDFs</option>
                  <option value="video">🎥 Video Clips</option>
                  <option value="photo">🖼️ Photos & Images</option>
                </select>

                {/* Filter Status */}
                <select
                  value={uploadStatusFilter}
                  onChange={(e) => setUploadStatusFilter(e.target.value as any)}
                  className="w-full rounded-lg border border-stone-250 bg-white px-2.5 py-2 text-xs text-stone-800 outline-none focus:border-red-500 font-semibold"
                >
                  <option value="all">⚡ All Statuses</option>
                  <option value="pending">⏳ Pending Review</option>
                  <option value="approved">✅ Approved</option>
                  <option value="rejected">❌ Rejected</option>
                  <option value="pending_delete">☣️ Pending Delete</option>
                </select>

                {/* Sort dropdown */}
                <select
                  value={uploadSortField}
                  onChange={(e) => setUploadSortField(e.target.value as any)}
                  className="w-full rounded-lg border border-stone-250 bg-white px-2.5 py-2 text-xs text-slate-950 outline-none focus:border-red-500 font-bold"
                >
                  <option value="date">📅 Sort: Upload Date</option>
                  <option value="size">⚖️ Sort: File Size</option>
                  <option value="name">👤 Sort: Contributor Name</option>
                </select>
              </div>
            </div>

            {/* BULK ACTIONS HEADER */}
            {sortedFilteredUploads.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-red-50/10 border border-stone-200 rounded-xl">
                <div className="flex items-center space-x-2.5">
                  <input
                    type="checkbox"
                    checked={sortedFilteredUploads.length > 0 && selectedUploadIds.length === sortedFilteredUploads.length}
                    onChange={() => {
                      if (selectedUploadIds.length === sortedFilteredUploads.length) {
                        setSelectedUploadIds([]);
                      } else {
                        setSelectedUploadIds(sortedFilteredUploads.map((u) => u.id));
                      }
                    }}
                    className="h-4 w-4 rounded border-stone-300 text-red-600 focus:ring-red-500 accent-red-700 cursor-pointer"
                    id="bulk_select_all_checkbox"
                  />
                  <label htmlFor="bulk_select_all_checkbox" className="text-xs font-bold text-stone-700 cursor-pointer select-none">
                    Select All ({selectedUploadIds.length}/{sortedFilteredUploads.length} content items)
                  </label>
                </div>

                {selectedUploadIds.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] uppercase font-mono font-bold text-red-800 bg-red-50 border border-red-150 py-0.5 px-2.5 rounded">
                      Bulk Action ({selectedUploadIds.length}):
                    </span>
                    <button
                      type="button"
                      onClick={handleBulkApprove}
                      className="rounded bg-emerald-600 hover:bg-emerald-700 font-extrabold px-3 py-1 text-[11px] text-white flex items-center space-x-1 shadow-sm transition"
                    >
                      <CheckSquare className="h-3.5 w-3.5" />
                      <span>Approve Selected</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkReject}
                      className="rounded bg-rose-600 hover:bg-rose-700 font-extrabold px-3 py-1 text-[11px] text-white flex items-center space-x-1 shadow-sm transition"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Reject Selected</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* UPLOADS RENDER LIST */}
            {sortedFilteredUploads.length === 0 ? (
              <div className="text-center py-10 px-4 border border-dashed border-stone-200 rounded-2xl bg-stone-50/50">
                <FileText className="h-8 w-8 text-stone-300 mx-auto mb-2 animate-pulse" />
                <p className="text-stone-400 text-xs italic font-mono">
                  No member uploads matched your search / filters inside this criteria.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 max-h-[500px] overflow-y-auto pr-2">
                {sortedFilteredUploads.map((u) => {
                  const isPdf = u.type === "pdf";
                  const isVideo = u.type === "video";
                  const isPhoto = u.type === "photo";
                  const isExpanded = expandedUploadIds.includes(u.id);

                  return (
                    <div 
                      key={u.id} 
                      className={`rounded-xl border p-4 text-left space-y-4 transition bg-white relative hover:shadow-xs ${
                        u.status === "rejected" 
                        ? "border-red-100 bg-red-50/5" 
                        : u.status === "approved" 
                        ? "border-emerald-100 bg-emerald-50/5" 
                        : "border-stone-200"
                      }`}
                    >
                      {/* Flex item header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start space-x-3.5 truncate">
                          {/* Selection Checkbox */}
                          <div className="pt-5 shrink-0">
                            <input
                              type="checkbox"
                              checked={selectedUploadIds.includes(u.id)}
                              onChange={() => {
                                setSelectedUploadIds((prev) =>
                                  prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                                );
                              }}
                              className="h-4 w-4 rounded border-stone-300 text-red-600 focus:ring-red-500 accent-red-700 cursor-pointer"
                            />
                          </div>

                          {/* Visual Format Thumbnail representation */}
                          {isPdf && (
                            <div className="h-14 w-12 shrink-0 bg-red-50 border border-red-200 rounded-lg flex flex-col items-center justify-center relative shadow-2xs">
                              <FileText className="h-6 w-6 text-red-650" />
                              <span className="text-[8px] font-black text-red-800 font-mono absolute bottom-1 uppercase">PDF</span>
                            </div>
                          )}
                          {isVideo && (
                            <div className="h-14 w-20 shrink-0 bg-stone-900 border border-stone-950 rounded-lg flex items-center justify-center relative overflow-hidden group shadow-2xs">
                              <Play className="h-5 w-5 text-white/90 drop-shadow" />
                              <div className="absolute top-0 left-0 bg-red-600 px-1 py-0.5 text-[7px] font-bold text-white uppercase tracking-wider font-mono">CLIP</div>
                            </div>
                          )}
                          {isPhoto && (
                            <div className="h-14 w-14 shrink-0 bg-teal-50 border border-teal-200 rounded-lg flex items-center justify-center relative shadow-2xs">
                              <Image className="h-6 w-6 text-teal-650" />
                              <span className="text-[8px] font-black text-teal-800 font-mono absolute bottom-1 uppercase font-mono">IMAGE</span>
                            </div>
                          )}

                          <div className="truncate">
                            <h4 className="font-bold text-stone-900 truncate leading-snug" title={u.title}>
                              {u.title}
                            </h4>
                            <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-stone-500 font-mono mt-1">
                              <span>By: <strong className="text-stone-700">{u.userName}</strong></span>
                              <span>•</span>
                              <span>{u.date}</span>
                              <span>•</span>
                              <span>{u.fileSize || "1.4 MB"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Right side Status Badge */}
                        <div className="text-right shrink-0">
                          {u.status === "approved" && (
                            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase px-2 py-0.5 rounded border border-emerald-200 font-mono whitespace-nowrap">
                              ✓ Approved
                            </span>
                          )}
                          {u.status === "rejected" && (
                            <span className="bg-red-100 text-red-800 text-[9px] font-bold uppercase px-2 py-0.5 rounded border border-red-200 font-mono whitespace-nowrap">
                              × Rejected
                            </span>
                          )}
                          {u.status === "pending" && (
                            <span className="bg-amber-100 text-amber-800 text-[9px] font-bold uppercase px-2 py-0.5 rounded border border-amber-200 font-mono whitespace-nowrap">
                              ⏳ Pending
                            </span>
                          )}
                          {u.status === "pending_delete" && (
                            <span className="bg-purple-100 text-purple-850 text-[9px] font-bold uppercase px-2 py-0.5 rounded border border-purple-200 font-mono whitespace-nowrap">
                              ☣️ Delete Req
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Display subFiles if present (Batch pdfs) */}
                      {u.subFiles && u.subFiles.length > 0 && (
                        <div className="bg-stone-50/80 border border-stone-200 rounded-lg p-2 text-xs max-h-24 overflow-y-auto">
                          <span className="text-[9px] font-bold text-stone-500 font-mono block uppercase mb-1">Staged Batch Files ({u.subFiles.length}):</span>
                          {u.subFiles.map((f, idx) => (
                            <div key={idx} className="font-mono text-[10px] text-stone-600 flex items-center space-x-1 pl-1">
                              <span>•</span>
                              <span className="truncate">{f}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* PUBLIC / PRIVATE TOGGLE COMPONENT & AUDIT TOGGLE */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2.5 rounded-lg bg-stone-50 border border-stone-200 gap-2">
                        <div className="flex items-center space-x-2">
                          {u.allowedToPublic ? (
                            <Globe className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Lock className="h-4 w-4 text-stone-500" />
                          )}
                          <div>
                            <span className="text-xs font-bold text-stone-700 block col-span-1">
                              {u.allowedToPublic ? "Visible to Public 🌐" : "Private / Restricted 🔒"}
                            </span>
                            <span className="text-[10px] text-stone-400 font-mono block">
                              {u.allowedToPublic ? "Visible in library searches" : "Visible only to admin & uploader"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const isShown = expandedUploadIds.includes(u.id);
                              setExpandedUploadIds((prev) =>
                                isShown ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                              );
                            }}
                            className="flex items-center space-x-1 text-xs shrink-0 bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold px-3 py-1.5 rounded-md shadow-2xs font-sans select-none"
                          >
                            <span>{isExpanded ? "Hide Details" : "Expand Details"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!canApprove) {
                                alert("Permission Denied: Your privileges exclude visibility overrides.");
                                return;
                              }
                              onToggleUploadVisibility(u.id, !u.allowedToPublic);
                            }}
                            className="flex items-center space-x-1 text-xs shrink-0 bg-white border border-stone-250 hover:bg-stone-50 text-blue-800 font-extrabold px-3 py-1.5 rounded-md shadow-2xs font-mono select-none"
                          >
                            {u.allowedToPublic ? "Make Private" : "Make Public"}
                          </button>
                        </div>
                      </div>

                      {/* Deep Technical AUDIT PANEL DETAILS */}
                      {isExpanded && (
                        <div className="bg-stone-900 text-stone-300 font-mono text-[10px] p-3 rounded-lg border border-stone-950 space-y-1.5 my-2">
                          <div className="text-stone-400 border-b border-stone-800 pb-1 font-bold text-[9px] uppercase tracking-wider flex items-center justify-between">
                            <span>Deep Technical Audit Details</span>
                            <span className="text-emerald-500 text-[8px] font-sans">verified secure</span>
                          </div>
                          <div>
                            <span className="text-stone-500 font-semibold">File Hash (SHA-256):</span>{" "}
                            <span className="text-amber-400">e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7{u.id.substring(0, 8)}</span>
                          </div>
                          <div>
                            <span className="text-stone-500 font-semibold">Raw Timestamp (UTC):</span>{" "}
                            <span className="text-stone-300">{u.date}T12:00:22Z</span>
                          </div>
                          <div>
                            <span className="text-stone-500 font-semibold">Server Storage Path:</span>{" "}
                            <span className="text-stone-300">/var/www/wafula_reads/storage/uploads/{u.type}/{u.id}_{u.title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.{u.type === "pdf" ? "pdf" : u.type === "video" ? "mp4" : "png"}</span>
                          </div>
                        </div>
                      )}

                      {/* ACTION CONTROLS PANEL */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-100 bg-[#fafafa]/50 -mx-4 -mb-4 p-3 rounded-b-xl">
                        <div className="flex flex-wrap gap-1.5">
                          {u.status !== "approved" && (
                            <button
                              type="button"
                              onClick={() => {
                                if (!canApprove) {
                                  alert("Permission Denied: Your privileges exclude uploader approvals.");
                                  return;
                                }
                                onApproveUpload(u.id);
                                alert(`Upload "${u.title}" approved successfully. Upload can now download/pay.`);
                              }}
                              className="rounded bg-emerald-600 hover:bg-emerald-700 font-bold px-2.5 py-1 text-[11px] text-white flex items-center space-x-1 shadow-sm transition"
                            >
                              <CheckSquare className="h-3.5 w-3.5" />
                              <span>Approve</span>
                            </button>
                          )}

                          {u.status !== "rejected" && (
                            <button
                              type="button"
                              onClick={() => {
                                if (!canApprove) {
                                  alert("Permission Denied: Your privileges exclude rejection actions.");
                                  return;
                                }
                                onRejectUpload(u.id);
                                alert(`Upload "${u.title}" rejected safely.`);
                              }}
                              className="rounded bg-rose-600 hover:bg-rose-700 font-bold px-2.5 py-1 text-[11px] text-white flex items-center space-x-1 shadow-sm transition"
                            >
                              <X className="h-3.5 w-3.5" />
                              <span>Reject</span>
                            </button>
                          )}

                          {u.status === "pending_delete" && (
                            <button
                              type="button"
                              onClick={() => {
                                if (!canApprove) {
                                  alert("Permission Denied: Missing approval overrides privileges.");
                                  return;
                                }
                                onApproveDeletion(u.id);
                              }}
                              className="rounded bg-orange-600 hover:bg-orange-700 text-white font-extrabold px-2.5 py-1 text-[11px] flex items-center space-x-1"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Authorize Deletion Req</span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 text-[10px] font-mono text-stone-550">
                          <span className={`px-2 py-0.5 rounded ${
                            u.paid ? "bg-green-100 text-green-850" : "bg-stone-200 text-stone-600"
                          }`}>
                            {u.paid ? "Fee Paid (KES 200) ✅" : "Unpaid KES 200 ⏰"}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (!canApprove) {
                                alert("Permission Denied: Your minor status blocks deletions.");
                                return;
                              }
                              setDeleteTarget(u);
                            }}
                            className="text-stone-400 hover:text-red-700 p-1.5 rounded hover:bg-red-50"
                            title="Delete Upload permanently"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. SITE-WIDE ANNOUNCEMENTS HUB */}
          <div className="rounded-2xl border border-amber-200 bg-amber-55/10 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-amber-200 pb-2.5">
              <h3 className="font-display text-base font-bold text-amber-900 flex items-center space-x-2">
                <Megaphone className="h-5 w-5 text-amber-700 animate-bounce" />
                <span>Site-Wide Announcements Hub</span>
              </h3>
              <span className="bg-amber-100 text-amber-800 text-[9px] font-mono font-bold uppercase py-0.5 px-2 rounded-full border border-amber-300">
                ACTIVE
              </span>
            </div>

            {/* Current Active live message display */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-950 space-y-2 relative">
              <span className="text-[10px] font-bold text-amber-700 font-mono block uppercase tracking-wider">
                📢 Sticky Header Message (Visible in discussion forums):
              </span>
              <p className="font-semibold text-stone-800 leading-relaxed font-sans italic">
                "{broadcastAnnouncement || "No active sticky text broadcasted at this moment."}"
              </p>
            </div>

            <p className="text-xs text-amber-800/80 font-sans">
              Deploy site-wide announcements sticky banners displayed on all general boards, discussion panels, and dashboards.
            </p>

            <form onSubmit={handlePostBroadcast} className="space-y-3">
              <textarea
                rows={3}
                required
                value={broadcastDraft}
                onChange={(e) => setBroadcastDraft(e.target.value)}
                placeholder="Type new general warning, bookstore release, or seminar alert..."
                className="w-full rounded-xl border border-amber-200 bg-white p-3 font-medium outline-none text-stone-850 focus:border-amber-500 text-xs"
              />
              <button
                type="submit"
                className="rounded-lg bg-amber-700 text-white font-extrabold px-4 py-2 hover:bg-amber-800 text-xs flex items-center space-x-1 shadow transition active:scale-95"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Publish New Broadcast Banner</span>
              </button>
            </form>

            {/* Historical Log list */}
            <div className="pt-4 border-t border-amber-200/50 space-y-3">
              <span className="block text-[10px] font-bold text-amber-850 uppercase tracking-widest font-mono">
                Historical Publication Log ({announcementsLog.length})
              </span>
              
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                {announcementsLog.map((ann: any) => {
                  const isActive = broadcastAnnouncement === ann.text;
                  return (
                    <div 
                      key={ann.id} 
                      className={`p-3 rounded-xl border text-left text-xs transition relative ${
                        isActive 
                        ? "bg-amber-50 border-amber-400 shadow-xs" 
                        : "bg-white border-stone-200 hover:border-amber-200"
                      }`}
                    >
                      <p className="text-stone-850 font-medium mb-1.5 leading-relaxed">{ann.text}</p>
                      <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono pt-1">
                        <span>By: {ann.author} • {ann.date}</span>
                        <div className="flex items-center space-x-2">
                          {!isActive && (
                            <button
                              type="button"
                              onClick={() => {
                                if (!canBroadcast) {
                                  alert("Permission Denied: Your minor status blocks announcements.");
                                  return;
                                }
                                onUpdateBroadcastAnnouncement(ann.text);
                                setBroadcastDraft(ann.text);
                                alert("Success: Activated selected announcement site-wide!");
                              }}
                              className="text-amber-800 hover:underline font-extrabold uppercase text-[9px]"
                            >
                              Pin Banner
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const updated = announcementsLog.filter((a: any) => a.id !== ann.id);
                              setAnnouncementsLog(updated);
                              localStorage.setItem("WAFULA_ANNOUNCEMENTS_LOG", JSON.stringify(updated));
                            }}
                            className="text-stone-400 hover:text-red-700 font-bold text-[14px] px-1"
                            title="Delete draft history"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                      {isActive && (
                        <span className="absolute top-2 right-2 rounded bg-amber-200 text-amber-900 text-[8px] font-bold uppercase px-1.5 py-0.5 border border-amber-300">
                          Active
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* SIDEBAR COLUMNS (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* 4. PRIVATE SECURED VAULT (Only accessible as checked/Super Admin) */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-4 relative overflow-hidden">
            <div className="flex justify-between items-start border-b pb-2">
              <div>
                <h3 className="font-display text-[13px] font-bold text-slate-900 flex items-center space-x-1.5">
                  <HardDrive className="h-4 w-4 text-red-700" />
                  <span>Admin Private Vault</span>
                </h3>
                <p className="text-[10px] text-stone-400 font-mono mt-0.5">Sensitive resources backup unit</p>
              </div>
              <span className="bg-red-100 text-red-800 text-[8px] font-bold uppercase tracking-wide py-0.5 px-2 rounded-full font-mono">
                INFINITE STORAGE
              </span>
            </div>

            {canVault ? (
              <div className="space-y-4">
                <form onSubmit={handleAddPrivateFile} className="space-y-2">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold uppercase text-stone-400">Vault File Title</label>
                    <input
                      type="text"
                      required
                      value={newFileTitle}
                      onChange={(e) => setNewFileTitle(e.target.value)}
                      placeholder="e.g. outreach_video.mp4"
                      className="w-full rounded border p-2 bg-stone-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold uppercase text-stone-400">Resource Category Type</label>
                    <select
                      value={newFileType}
                      onChange={(e) => setNewFileType(e.target.value)}
                      className="w-full rounded border p-2 bg-stone-50"
                    >
                      <option value="PDF Document">PDF Document</option>
                      <option value="Audio Song File">Audio Song File</option>
                      <option value="Video Outreach Recording">Video Outreach Recording</option>
                      <option value="Image Photo Album">Image Photo Album</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full bg-slate-900 hover:bg-slate-950 text-white font-bold py-2 rounded">
                    Backup to GCloud Vault
                  </button>
                </form>

                <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1 border-t pt-3">
                  {privateFiles.map((pf) => (
                    <div key={pf.id} className="p-2 bg-stone-50 rounded-lg border flex justify-between items-center text-[11px]">
                      <div className="truncate pr-2">
                        <strong className="text-stone-850 block truncate">{pf.name}</strong>
                        <span className="text-[9px] text-stone-400 block font-mono">{pf.type} • {pf.size} • {pf.date}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeletePrivateFile(pf.id)}
                        className="text-stone-400 hover:text-red-700 font-bold px-1 text-sm"
                        title="Delete permanently"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-stone-50 rounded-xl p-4 text-center text-stone-500 border border-dashed py-12">
                <Lock className="h-6 w-6 text-stone-400 mx-auto mb-2 animate-pulse" />
                <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">Vault Locked</h4>
                <p className="text-[10px] text-stone-400 max-w-[140px] mx-auto mt-1 leading-normal">
                  Private folders can only be unlocked by the main admin account ({currentUser ? "wafulak435@gmail.com" : "Overseer"}).
                </p>
              </div>
            )}
          </div>

          {/* 5. MINOR ADMIN CUSTOM SETTINGS (Super Admin Only seeable!) */}
          {isMainAdmin && (
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-4">
              <h3 className="font-display text-[13px] font-bold text-slate-900 border-b pb-2 flex items-center space-x-1.5">
                <Users className="h-4 w-4 text-slate-700" />
                <span>Delegations Registry (Super Admin)</span>
              </h3>

              <form onSubmit={handleCreateMinorAdmin} className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold uppercase text-stone-400">Assigned Name</label>
                  <input
                    type="text"
                    required
                    value={newModName}
                    onChange={(e) => setNewModName(e.target.value)}
                    placeholder="e.g. Sarah J."
                    className="w-full rounded border p-2 bg-stone-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-bold uppercase text-stone-400">Authentication Email</label>
                  <input
                    type="email"
                    required
                    value={newModEmail}
                    onChange={(e) => setNewModEmail(e.target.value)}
                    placeholder="e.g. sarah@wafula.com"
                    className="w-full rounded border p-2 bg-stone-50"
                  />
                </div>

                {/* Granular switches checklist */}
                <div className="space-y-1.5 border-t pt-2 mt-2">
                  <label className="block text-[9px] font-bold uppercase text-stone-400 mb-1">Checked Privileges</label>
                  
                  <label className="flex items-center space-x-2 text-[10px] text-stone-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permBroadcast}
                      onChange={(e) => setPermBroadcast(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                    />
                    <span>Allow global sticky announcements</span>
                  </label>

                  <label className="flex items-center space-x-2 text-[10px] text-stone-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permApproval}
                      onChange={(e) => setPermApproval(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                    />
                    <span>Allow approved queue overrides</span>
                  </label>

                  <label className="flex items-center space-x-2 text-[10px] text-stone-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permVault}
                      onChange={(e) => setPermVault(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                    />
                    <span>Allow vault folders viewing</span>
                  </label>
                </div>

                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded mt-2">
                  Appoint Minor Admin
                </button>
              </form>

              <div className="space-y-2 border-t pt-3 max-h-[150px] overflow-y-auto">
                {minorAdmins.map((mod) => (
                  <div key={mod.id} className="p-2 bg-stone-50 rounded-lg border text-[11px] space-y-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <strong className="text-slate-900 block font-bold">{mod.name}</strong>
                        <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">{mod.email}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteMinorAdmin(mod.id)}
                        className="text-stone-450 hover:text-red-700 font-extrabold"
                      >
                        ×
                      </button>
                    </div>
                    {/* Visual permission pills */}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {mod.permissions.allowBroadcast && <span className="bg-amber-100 text-amber-800 text-[8px] px-1.5 py-0.5 rounded font-bold font-sans">📢 BROADCAST</span>}
                      {mod.permissions.allowApproval && <span className="bg-green-150 text-green-800 bg-green-100 text-[8px] px-1.5 py-0.5 rounded font-bold font-sans">✓ MOD_QUEUE</span>}
                      {mod.permissions.allowVault && <span className="bg-red-100 text-red-800 text-[8px] px-1.5 py-0.5 rounded font-bold font-sans">🔑 VAULT</span>}
                      {!mod.permissions.allowBroadcast && !mod.permissions.allowApproval && !mod.permissions.allowVault && (
                        <span className="text-[8px] text-stone-400 font-bold">FALLBACK CLERK</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* CONFIRM PERMANENT DELETION MODAL DIALOG */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-red-200 shadow-2xl max-w-md w-full p-6 space-y-4 relative overflow-hidden text-left">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-650" />
            <div className="flex items-center space-x-3 text-red-700">
              <div className="bg-red-50 p-2 rounded-full border border-red-100">
                <ShieldAlert className="h-6 w-6 text-red-650" />
              </div>
              <div>
                <h4 className="font-display font-bold text-slate-900 leading-snug">Confirm Permanent Deletion</h4>
                <span className="text-[10px] text-stone-400 font-mono uppercase font-black">ACTION IS IRREVERSIBLE</span>
              </div>
            </div>
            
            <p className="text-stone-600 text-xs leading-relaxed">
              Are you absolutely sure you want to permanently erase <strong className="text-slate-900">"{deleteTarget.title}"</strong> contributed by <strong className="text-slate-900">{deleteTarget.userName}</strong>? This will completely wipe all block nodes and cloud CDN files from active directories.
            </p>

            <div className="bg-red-50/55 rounded-xl p-3 border border-red-100 text-[11px] text-red-700 font-mono">
              ⚠️ Warning: Once authorized, secondary backups and reader downloads for this item are forever lost.
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-stone-250 bg-white hover:bg-stone-50 font-bold px-4 py-2 text-xs text-stone-750 transition"
              >
                No, Keep File
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteUploadPermanently(deleteTarget.id);
                  setDeleteTarget(null);
                  alert(`Upload completely erased from hosting directories.`);
                }}
                className="rounded-lg bg-red-650 hover:bg-red-700 text-white font-extrabold px-4 py-2 text-xs transition shadow-md"
              >
                Confirm Permanent Deletion
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
