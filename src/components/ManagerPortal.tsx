import React, { useEffect, useMemo, useState } from "react";
import { secureApiFetch } from "../lib/aiClient";
import {
  loadShowcaseLocal,
  fetchShowcaseFromServer,
  saveShowcaseRemote,
  DEFAULT_SHOWCASE_SLIDES,
  type SiteShowcaseConfig,
  type ShowcaseSlide,
  type ShowcaseTargetView,
} from "../lib/showcase";
import type { User, SubAdminCapabilityMap } from "../types";
import FinanceDashboard from "./FinanceDashboard";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Award,
  CreditCard,
  GraduationCap,
  FileCheck2,
  RefreshCw,
  ArrowLeft,
  Loader2,
  Lock,
  Crown,
  Smartphone,
  BookOpen,
  Package,
  DollarSign,
  Users,
  Search,
  Calendar,
  School,
  FolderOpen,
  Megaphone,
  Upload,
  FileText,
  TrendingUp,
  Wallet,
  Edit3,
  HardDrive,
  Image as ImageIcon,
  Plus,
  Trash2,
  UserPlus,
  ArrowUp,
  ArrowDown,
  Save,
  KeyRound,
  Building2,
  BarChart3,
  PieChart,
  Bell,
  Clock,
  ArrowUpRight,
  Eye,
  Check,
  Tag,
  Compass,
  Heart,
  Share2,
  Sparkles,
  X,
  ChevronRight,
  Download,
  Filter,
  MessageCircle,
  Maximize2,
  SlidersHorizontal,
  MapPin,
} from "lucide-react";
import VirtualTourCarousel from "./VirtualTourCarousel";
import {
  CampusBuildingPhoto,
  getLocalCampusPhotos,
  saveLocalCampusPhotos,
  addOrUpdateCampusPhoto,
  deleteCampusPhoto,
  resetCampusPhotosToDefaults,
  syncCampusPhotosFromFirestore,
} from "../utils/campusPhotoManager";

interface ManagerPortalProps {
  currentUser: User | null;
  isDarkMode?: boolean;
  onBack: () => void;
  onSyncOrders?: () => void;
  onNavigate?: (view: string) => void;
  onOpenAdminPanel?: () => void;
  booksCount?: number;
}

const DEFAULT_CAPABILITY_FLAGS: SubAdminCapabilityMap = {
  allowBroadcast: false,
  allowApproval: false,
  allowVault: false,
  allowManageBooks: false,
  allowConfirmPayments: false,
  allowManageEnrollments: false,
  allowManageExams: false,
  allowIssueCertificates: false,
  allowModeration: false,
  allowSuspendUsers: false,
};

function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read selected photo."));
    reader.onload = () => {
      const src = String(reader.result || "");
      const img = new Image();
      img.onerror = () => resolve(src);
      img.onload = () => {
        const maxWidth = 1280;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(src);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

export default function ManagerPortal({
  currentUser,
  isDarkMode = false,
  onBack,
  onSyncOrders,
  onNavigate,
  onOpenAdminPanel,
  booksCount = 0,
}: ManagerPortalProps) {
  const [activeTab, setActiveTab] = useState<
    "finance_dashboard" | "enrollments" | "payments" | "mpesa_finance" | "exams" | "certificates" | "campus_photos"
  >("finance_dashboard");
  const [portalView, setPortalView] = useState<"manager" | "student" | "tutor">("manager");
  const [showTourModal, setShowTourModal] = useState(false);
  const [showQuickReportsDrawer, setShowQuickReportsDrawer] = useState(false);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [showRecordFeeModal, setShowRecordFeeModal] = useState(false);
  const [showCreateExamModal, setShowCreateExamModal] = useState(false);
  const [showTimetableModal, setShowTimetableModal] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  
  // Dynamic Campus Photos
  const [campusPhotos, setCampusPhotos] = useState<CampusBuildingPhoto[]>(() => getLocalCampusPhotos());
  const [photoFormTitle, setPhotoFormTitle] = useState("");
  const [photoFormCampus, setPhotoFormCampus] = useState("Bungoma Kanduyi Main Campus (HQ)");
  const [photoFormLibraryCategory, setPhotoFormLibraryCategory] = useState("Leadership");
  const [photoFormCategory, setPhotoFormCategory] = useState<CampusBuildingPhoto["category"]>("Campus Buildings");
  const [photoFormUrl, setPhotoFormUrl] = useState("");
  const [photoFormLocation, setPhotoFormLocation] = useState("Kanduyi Hub, Bungoma-Malaba Highway, Bungoma");
  const [photoFormDescription, setPhotoFormDescription] = useState("");
  const [photoFormFeatures, setPhotoFormFeatures] = useState("");
  const [photoFormIsFeatured, setPhotoFormIsFeatured] = useState(true);
  const [editingCampusPhotoId, setEditingCampusPhotoId] = useState<string | null>(null);

  // Sync photos from Firestore & custom events
  useEffect(() => {
    syncCampusPhotosFromFirestore().then((res) => {
      if (res && res.length > 0) setCampusPhotos(res);
    });
    const handlePhotosUpdated = (e: any) => {
      if (e.detail?.photos) {
        setCampusPhotos(e.detail.photos);
      } else {
        setCampusPhotos(getLocalCampusPhotos());
      }
    };
    window.addEventListener("ZION_CAMPUS_PHOTOS_UPDATED", handlePhotosUpdated);
    return () => window.removeEventListener("ZION_CAMPUS_PHOTOS_UPDATED", handlePhotosUpdated);
  }, []);
  const [mpesaOverview, setMpesaOverview] = useState<any>(null);
  const [mpesaFilter, setMpesaFilter] = useState<"all" | "completed" | "pending" | "failed">("all");
  const [accessStatus, setAccessStatus] = useState<"checking" | "granted" | "denied">("checking");
  const [accessError, setAccessError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [toolSearch, setToolSearch] = useState("");

  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [feePayments, setFeePayments] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [subAdmins, setSubAdmins] = useState<any[]>([]);
  const [showInviteSubAdmin, setShowInviteSubAdmin] = useState(false);
  const [subAdminForm, setSubAdminForm] = useState({
    name: "",
    email: "",
    permissions: { ...DEFAULT_CAPABILITY_FLAGS },
  });

  // Live Home Slideshow & Vision/Mission/Slogan state
  const [showcaseDraft, setShowcaseDraft] = useState<SiteShowcaseConfig>(() => loadShowcaseLocal());
  const [isSavingShowcase, setIsSavingShowcase] = useState(false);
  const [actionNotice, setActionNotice] = useState<string>("");

  const [gradeInputs, setGradeInputs] = useState<Record<string, string>>({});
  const [certForm, setCertForm] = useState({
    studentEmail: "",
    studentName: "",
    courseTopic: "",
    score: "90",
    schoolName: "Zion Digital Leadership & Bible Institute",
  });

  const isMainAdmin = Boolean(currentUser?.isMainAdmin) || currentUser?.role === "main_admin";
  const canOpenAdminPanel =
    isMainAdmin || ["admin", "sub_admin"].includes(currentUser?.role || "");

  const loadAllOperationalData = async () => {
    setIsLoading(true);
    try {
      const requests: Promise<Response>[] = [
        secureApiFetch("/api/enrollments"),
        secureApiFetch("/api/orders"),
        secureApiFetch("/api/fee-payments"),
        secureApiFetch("/api/exams"),
        secureApiFetch("/api/exams/attempts"),
        secureApiFetch("/api/certificates"),
        secureApiFetch("/api/mpesa/admin/overview"),
      ];
      if (isMainAdmin) {
        requests.push(secureApiFetch("/api/admin/sub-admins"));
      }

      const responses = await Promise.all(requests);
      const jsons = await Promise.all(responses.map((r) => r.json().catch(() => ({}))));

      if (jsons[0]?.success) setEnrollments(jsons[0].enrollments || []);
      if (jsons[1]?.success) setOrders(jsons[1].orders || []);
      if (jsons[2]?.success) setFeePayments(jsons[2].payments || []);
      if (jsons[3]?.success) setExams(jsons[3].exams || []);
      if (jsons[4]?.success) setAttempts(jsons[4].attempts || []);
      if (jsons[5]?.success) setCertificates(jsons[5].certificates || []);
      if (jsons[6]?.success) setMpesaOverview(jsons[6]);
      if (isMainAdmin && jsons[7]?.success) {
        setSubAdmins(jsons[7].subAdmins || []);
      }

      const remoteShowcase = await fetchShowcaseFromServer();
      setShowcaseDraft(remoteShowcase);
    } catch {
      setFeedback({ type: "err", text: "Unable to load operational queues from server." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const verify = async () => {
      setAccessStatus("checking");
      try {
        const res = await secureApiFetch("/api/manager/access-check");
        const data = await res.json().catch(() => ({}));
        if (!mounted) return;
        if (!res.ok || !data.success) {
          setAccessStatus("denied");
          setAccessError(
            data?.error || "Access Restricted (403): Manager or authorized capability required."
          );
          return;
        }
        setAccessStatus("granted");
        loadAllOperationalData();
      } catch {
        if (!mounted) return;
        setAccessStatus("denied");
        setAccessError("Server role verification failed.");
      }
    };
    verify();
    return () => {
      mounted = false;
    };
  }, [currentUser?.email, currentUser?.role]);

  const scrollToOperations = (tab: "finance_dashboard" | "enrollments" | "payments" | "mpesa_finance" | "exams" | "certificates" | "campus_photos") => {
    setActiveTab(tab);
    const el = document.getElementById("manager-operations-workspace");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleEnrollmentUpdate = async (
    id: string,
    payload: { status?: "approved" | "rejected" | "pending"; feeStatus?: "paid" | "unpaid"; certificateIssued?: boolean }
  ) => {
    setFeedback(null);
    const res = await secureApiFetch(`/api/enrollments/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      setFeedback({ type: "err", text: data.error || "Failed to update enrollment." });
      return;
    }
    setFeedback({ type: "ok", text: `Enrollment ${id} updated.` });
    await loadAllOperationalData();
  };

  const handleOrderStatus = async (id: string, status: "approved" | "rejected") => {
    setFeedback(null);
    const res = await secureApiFetch(`/api/orders/${encodeURIComponent(id)}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      setFeedback({ type: "err", text: data.error || "Permission denied for order confirmation." });
      return;
    }
    setFeedback({ type: "ok", text: `Order marked ${status}.` });
    onSyncOrders?.();
    await loadAllOperationalData();
  };

  const handleFeeConfirm = async (id: string, status: "confirmed" | "rejected") => {
    setFeedback(null);
    const res = await secureApiFetch(`/api/fee-payments/${encodeURIComponent(id)}/confirm`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      setFeedback({ type: "err", text: data.error || "Permission denied for fee confirmation." });
      return;
    }
    setFeedback({ type: "ok", text: `Fee payment ${status}.` });
    await loadAllOperationalData();
  };

  const handleGradeAttempt = async (attemptId: string) => {
    setFeedback(null);
    const raw = gradeInputs[attemptId];
    const score = Number(raw);
    if (Number.isNaN(score) || score < 0 || score > 100) {
      setFeedback({ type: "err", text: "Enter a valid score between 0 and 100." });
      return;
    }
    const res = await secureApiFetch(`/api/exams/attempts/${encodeURIComponent(attemptId)}/grade`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      setFeedback({ type: "err", text: data.error || "Not authorized to grade this course attempt." });
      return;
    }
    setFeedback({ type: "ok", text: `Exam attempt ${attemptId} graded at ${score}%.` });
    await loadAllOperationalData();
  };

  const handleReleaseResults = async (examId: string, released: boolean) => {
    setFeedback(null);
    const res = await secureApiFetch(`/api/exams/${encodeURIComponent(examId)}/release`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ released }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      setFeedback({ type: "err", text: data.error || "Not authorized to release results for this exam." });
      return;
    }
    setFeedback({
      type: "ok",
      text: `Results for ${examId} ${released ? "released to students" : "withheld"}.`,
    });
    await loadAllOperationalData();
  };

  const handleIssueCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const res = await secureApiFetch("/api/certificates/issue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentEmail: certForm.studentEmail.trim(),
        studentName: certForm.studentName.trim(),
        courseTopic: certForm.courseTopic.trim(),
        score: Number(certForm.score || 0),
        schoolName: certForm.schoolName.trim(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      setFeedback({ type: "err", text: data.error || "Certificate issuance permission denied." });
      return;
    }
    setFeedback({
      type: "ok",
      text: `Official certificate ${data.certificate?.id} issued for ${certForm.studentName}.`,
    });
    setCertForm((prev) => ({ ...prev, studentEmail: "", studentName: "", courseTopic: "" }));
    await loadAllOperationalData();
  };

  const handleSaveSubAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMainAdmin) return;
    setFeedback(null);
    const res = await secureApiFetch("/api/admin/sub-admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subAdminForm),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      setFeedback({ type: "err", text: data.error || "Could not save sub-administrator role." });
      return;
    }
    setFeedback({ type: "ok", text: `Sub-admin permissions saved for ${subAdminForm.email}.` });
    setSubAdminForm({ name: "", email: "", permissions: { ...DEFAULT_CAPABILITY_FLAGS } });
    setShowInviteSubAdmin(false);
    await loadAllOperationalData();
  };

  const handleToggleSubAdminPerm = async (
    email: string,
    key: keyof SubAdminCapabilityMap,
    nextVal: boolean
  ) => {
    if (!isMainAdmin) return;
    const res = await secureApiFetch(`/api/admin/sub-admins/${encodeURIComponent(email)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: { [key]: nextVal } }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      setFeedback({ type: "err", text: data.error || "Failed updating permission." });
      return;
    }
    setSubAdmins((prev) => prev.map((sa) => (sa.email === email ? data.subAdmin : sa)));
  };

  const handleRevokeSubAdmin = async (email: string) => {
    if (!isMainAdmin) return;
    if (!window.confirm(`Revoke sub-administrator privileges for ${email}?`)) return;
    const res = await secureApiFetch(`/api/admin/sub-admins/${encodeURIComponent(email)}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      setSubAdmins((prev) => prev.filter((sa) => sa.email !== email));
      setFeedback({ type: "ok", text: `Sub-admin access revoked for ${email}.` });
    }
  };

  // Slideshow & Purpose management handlers
  const handleUploadSlideshowPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;
    setFeedback(null);
    try {
      const uploadedSlides: ShowcaseSlide[] = [];
      for (const file of files.slice(0, 6)) {
        const compressed = await compressImageToDataUrl(file);
        const cleanTitle = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
        uploadedSlides.push({
          id: `slide_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          title: cleanTitle || "Featured Campus Highlight",
          subtitle: "Updated live from the Zion Manager Portal.",
          category: "Campus Highlight",
          imageUrl: compressed,
          ctaLabel: "Explore Now",
          targetView: "store",
        });
      }
      const nextConfig: SiteShowcaseConfig = {
        ...showcaseDraft,
        slides: [...uploadedSlides, ...showcaseDraft.slides].slice(0, 12),
      };
      setShowcaseDraft(nextConfig);
      const result = await saveShowcaseRemote(nextConfig);
      setShowcaseDraft(result.config);
      setFeedback({
        type: "ok",
        text: `Added ${uploadedSlides.length} slideshow photo(s) to the live Home & Login showcase.`,
      });
    } catch (err: any) {
      setFeedback({ type: "err", text: err?.message || "Failed reading photo upload." });
    } finally {
      e.target.value = "";
    }
  };

  const handleSaveShowcase = async () => {
    setIsSavingShowcase(true);
    setFeedback(null);
    const result = await saveShowcaseRemote(showcaseDraft);
    setShowcaseDraft(result.config);
    setIsSavingShowcase(false);
    setFeedback({
      type: result.success ? "ok" : "err",
      text: result.success
        ? "Home slideshow and Vision / Mission / Slogan published live!"
        : result.error || "Updated locally.",
    });
  };

  const moveSlide = (idx: number, dir: -1 | 1) => {
    const next = [...showcaseDraft.slides];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setShowcaseDraft({ ...showcaseDraft, slides: next });
  };

  const removeSlide = (idx: number) => {
    if (showcaseDraft.slides.length <= 1) {
      setFeedback({ type: "err", text: "Keep at least one active slide on the homepage." });
      return;
    }
    if (!window.confirm("Remove this slide from the homepage slideshow?")) return;
    const next = showcaseDraft.slides.filter((_, i) => i !== idx);
    setShowcaseDraft({ ...showcaseDraft, slides: next });
  };

  const resetDefaultSlides = () => {
    setShowcaseDraft((prev) => ({
      ...prev,
      intervalMs: 2000,
      slides: DEFAULT_SHOWCASE_SLIDES,
    }));
  };

  const categories = useMemo(
    () => [
      {
        heading: "Academics",
        subheading: "STUDENTS, EXAMS AND SCHOOL CALENDAR",
        items: [
          {
            title: "Students",
            desc: "Enrollments, progress, fees and certificates",
            icon: Users,
            action: () => scrollToOperations("enrollments"),
          },
          {
            title: "Assessments",
            desc: "Exams, quizzes and assignment grading",
            icon: FileCheck2,
            action: () => scrollToOperations("exams"),
          },
          {
            title: "Academic Calendar",
            desc: "Intakes, exam windows, results and deadlines",
            icon: Calendar,
            action: () => scrollToOperations("exams"),
          },
          {
            title: "Schools & Courses",
            desc: "Courses, tutors and school settings",
            icon: School,
            action: () => onNavigate?.("school"),
          },
        ],
      },
      {
        heading: "Content & Media",
        subheading: "PUBLISHING, ADVERTISING AND MEDIA",
        items: [
          {
            title: "Resource Hub",
            desc: "Media library, files, documents and uploads together",
            icon: FolderOpen,
            action: () => onNavigate?.("sermons-motivation"),
          },
          {
            title: "Media & Ads",
            desc: "Adverts, member submissions and previews",
            icon: Megaphone,
            action: () => {
              const el = document.getElementById("manager-home-slideshow");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            },
          },
          {
            title: "Publish Books",
            desc: "Add and publish books to the store",
            icon: Upload,
            action: () => (canOpenAdminPanel && onOpenAdminPanel ? onOpenAdminPanel() : onNavigate?.("store")),
          },
          {
            title: "Home Posts",
            desc: "Announcements shown on the home page",
            icon: FileText,
            action: () => onNavigate?.("announcements"),
          },
        ],
      },
      {
        heading: "Commerce",
        subheading: "STORE, ORDERS AND PERFORMANCE",
        items: [
          {
            title: "Book Store",
            desc: "Books, prices, categories and inventory",
            icon: BookOpen,
            action: () => onNavigate?.("store"),
          },
          {
            title: "Orders",
            desc: "Review and fulfil customer orders",
            icon: Package,
            action: () => scrollToOperations("payments"),
          },
          {
            title: "Analytics",
            desc: "Daily revenue trends, orders & M-Pesa/eCitizen insights",
            icon: TrendingUp,
            action: () => scrollToOperations("finance_dashboard"),
          },
        ],
      },
      {
        heading: "People & Finance",
        subheading: "MEMBERS, ROLES AND STAFF PAYOUTS",
        items: [
          {
            title: "Members & Roles",
            desc: "Users, invitations and sub-admin access",
            icon: Users,
            action: () => {
              const el = document.getElementById("manager-access-control");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            },
          },
          {
            title: "Staff Payroll",
            desc: "Tutor and worker payouts by period",
            icon: Wallet,
            action: () => scrollToOperations("payments"),
          },
        ],
      },
      {
        heading: "Studio & Vault",
        subheading: "CREATE DOCUMENTS, KEEP THEM SAFE",
        items: [
          {
            title: "Content Studio",
            desc: "Create, convert and upload documents",
            icon: Edit3,
            action: () => onNavigate?.("studio"),
          },
          {
            title: "Vault & Files",
            desc: "Private files, photos and saved documents",
            icon: HardDrive,
            action: () =>
              canOpenAdminPanel && onOpenAdminPanel ? onOpenAdminPanel() : onNavigate?.("dashboard"),
          },
        ],
      },
    ],
    [canOpenAdminPanel, onNavigate, onOpenAdminPanel]
  );

  const filteredCategories = useMemo(() => {
    const q = toolSearch.trim().toLowerCase();
    if (!q) return categories;
    return categories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            item.title.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [categories, toolSearch]);

  if (accessStatus === "checking") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#A8421B] mb-3" />
        <p className="text-sm font-medium text-[#6E655E]">
          Verifying server-side Manager Portal authorization...
        </p>
      </div>
    );
  }

  if (accessStatus === "denied") {
    return (
      <div className="max-w-lg mx-auto mt-12 p-8 rounded-2xl border border-rose-300 bg-rose-50 text-center space-y-4">
        <div className="h-14 w-14 mx-auto rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700">
          <Lock className="h-7 w-7" />
        </div>
        <h2 className="font-serif text-xl font-bold text-rose-900">403 — Access Restricted</h2>
        <p className="text-sm text-rose-800/80 leading-relaxed">{accessError}</p>
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl bg-[#1F1B18] text-white text-xs font-semibold cursor-pointer"
        >
          Return to Home
        </button>
      </div>
    );
  }

  const pendingPaymentsCount =
    orders.filter((o) => o.status === "pending").length +
    feePayments.filter((f) => f.status === "pending").length;

  const surface = isDarkMode
    ? "bg-[#1E1A17] border-[#332C26] text-[#F5F1EB]"
    : "bg-white border-[#E7E1D8] text-[#1F1B18]";
  const mutedText = isDarkMode ? "text-[#B6ABA0]" : "text-[#6E655E]";

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-5 lg:px-6 py-4 space-y-5 text-left font-sans">
      {/* 1. TOP BRANDED APP BAR (Matching Screenshot 1 & 2) */}
      <header className="rounded-2xl bg-white dark:bg-[#07142B] border border-blue-100 dark:border-slate-800 p-3 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Left: Back button & Live search bar */}
        <div className="flex items-center gap-2.5 flex-1 min-w-[260px]">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#0B254D] dark:text-slate-100 hover:bg-slate-100 transition cursor-pointer shrink-0"
            title="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={toolSearch}
              onChange={(e) => setToolSearch(e.target.value)}
              placeholder="Search students, staff, or records..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-[#155EEF] transition placeholder-slate-400"
            />
          </div>

          {/* Notifications bell with badge */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
              className="relative p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-[#155EEF] transition cursor-pointer"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-white font-mono text-[9px] font-bold flex items-center justify-center">
                3
              </span>
            </button>

            {showNotificationsDropdown && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-[#0B254D] border border-slate-200 dark:border-slate-700 shadow-xl p-3 z-50 space-y-2 text-xs text-left animate-in fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10 font-bold text-slate-900 dark:text-white">
                  <span>Manager Notifications</span>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">3 New</span>
                </div>
                <div className="space-y-1.5">
                  <div className="p-2 rounded-xl bg-blue-50/60 dark:bg-white/5 border border-blue-100 dark:border-white/5 space-y-0.5">
                    <p className="font-semibold text-slate-900 dark:text-white">New student registered: Mary Achieng</p>
                    <p className="text-[10px] text-slate-500 dark:text-blue-200">Enrolled into Form 1 Christian Leadership track · 2m ago</p>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-50/60 dark:bg-white/5 border border-emerald-100 dark:border-white/5 space-y-0.5">
                    <p className="font-semibold text-slate-900 dark:text-white">M-Pesa payment received: KES 15,000</p>
                    <p className="text-[10px] text-slate-500 dark:text-blue-200">Ref: 2026/0012 for Term 1 tuition balance · 5m ago</p>
                  </div>
                  <div className="p-2 rounded-xl bg-purple-50/60 dark:bg-white/5 border border-purple-100 dark:border-white/5 space-y-0.5">
                    <p className="font-semibold text-slate-900 dark:text-white">Form 3 Term 3 Exam Results Published</p>
                    <p className="text-[10px] text-slate-500 dark:text-blue-200">Grading verified by academic dean · 10m ago</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onNavigate?.("community")}
            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-[#155EEF] transition cursor-pointer"
            title="Messages"
          >
            <MessageCircle className="h-4 w-4" />
          </button>
        </div>

        {/* Right: School Crest, Academic Year & Profile chip */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2.5 pl-3 border-l border-slate-200 dark:border-slate-700">
            <div className="h-9 w-9 rounded-xl bg-[#0B254D] border border-[#F5B82E]/50 flex items-center justify-center text-[#F5B82E] shadow-xs">
              <School className="h-5 w-5" />
            </div>
            <div className="text-left leading-tight">
              <p className="font-display font-extrabold text-xs text-[#0B254D] dark:text-white">
                Zion Digital Leadership &amp; Bible School
              </p>
              <p className="text-[10px] font-medium text-slate-500 dark:text-blue-200">
                Bungoma Kanduyi Campus • Educating for a Brighter Future
              </p>
            </div>
          </div>

          {/* User profile capsule */}
          <div className="flex items-center gap-2.5 bg-blue-50/70 dark:bg-slate-800/80 border border-blue-100 dark:border-slate-700 py-1.5 px-3 rounded-xl">
            <div className="relative">
              <div className="h-8 w-8 rounded-full bg-[#155EEF] text-white font-bold flex items-center justify-center text-xs shadow-xs">
                {currentUser?.name ? currentUser.name[0].toUpperCase() : "M"}
              </div>
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
            </div>
            <div className="text-left hidden sm:block">
              <p className="font-bold text-xs text-[#0B254D] dark:text-white leading-none">
                {currentUser?.name || "Dr. Kelvin Wafula"}
              </p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                School Manager • Online
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* 2. MAJESTIC WELCOME HERO BANNER (Directly matching user screenshots) */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0B254D] via-[#0F3570] to-[#155EEF] text-white p-5 sm:p-7 shadow-xl border border-blue-500/20">
        {/* Subtle decorative glowing background shapes */}
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-[#F5B82E]/15 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-20 w-64 h-64 rounded-full bg-[#155EEF]/30 blur-2xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          {/* Left Text & Scripture Callout */}
          <div className="lg:col-span-7 space-y-3.5 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#F5B82E] text-[#0B254D] font-extrabold text-[10px] uppercase tracking-wider shadow-xs">
                School Manager Portal
              </span>
              <span className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-white font-mono text-[10px] font-semibold border border-white/20">
                Academic Year: 2026/2027
              </span>
              <button
                type="button"
                onClick={() => setShowTourModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/40 hover:bg-blue-500/60 text-white font-bold text-[10px] border border-blue-300/30 transition cursor-pointer"
              >
                <Compass className="h-3 w-3 text-[#F5B82E]" />
                <span>Bungoma Campus Tour</span>
              </button>
            </div>

            <div>
              <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight text-white">
                Welcome to School Manager Portal
              </h1>
              <p className="text-blue-100 text-sm sm:text-base font-medium tracking-wide mt-1">
                Manage • Monitor • Inspire
              </p>
            </div>

            {/* Holy Bible Scripture Banner */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 max-w-xl flex items-center gap-3">
              <span className="text-2xl shrink-0">📖</span>
              <div className="min-w-0">
                <p className="text-xs sm:text-[13px] font-serif italic text-amber-200 leading-snug">
                  "Train up a child in the way he should go, and when he is old he will not depart from it."
                </p>
                <p className="text-[10px] font-mono uppercase text-blue-200 font-bold mt-0.5">
                  Proverbs 22:6 • Zion Theological Pillar
                </p>
              </div>
            </div>

            {/* Portal Perspective Switchers */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPortalView("manager")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  portalView === "manager"
                    ? "bg-[#F5B82E] text-[#0B254D] shadow-md"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                Manager Portal
              </button>
              <button
                type="button"
                onClick={() => {
                  setPortalView("student");
                  onNavigate?.("dashboard");
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  portalView === "student"
                    ? "bg-[#F5B82E] text-[#0B254D] shadow-md"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                Student Portal
              </button>
              <button
                type="button"
                onClick={() => {
                  setPortalView("tutor");
                  scrollToOperations("exams");
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  portalView === "tutor"
                    ? "bg-[#F5B82E] text-[#0B254D] shadow-md"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                Teacher Portal
              </button>
            </div>
          </div>

          {/* Right: Bungoma Campus Building & Students Photo Frame */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-2xl overflow-hidden border-2 border-white/25 shadow-2xl group cursor-pointer" onClick={() => setShowTourModal(true)}>
              <img
                src={campusPhotos[0]?.url || "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80"}
                alt="Bungoma Campus Students and Facilities"
                className="w-full h-48 sm:h-56 object-cover transform group-hover:scale-105 transition duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B254D] via-transparent to-black/20" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-left">
                <div>
                  <span className="text-[10px] font-mono uppercase bg-[#155EEF] px-2 py-0.5 rounded text-white font-bold">
                    Bungoma Main Campus
                  </span>
                  <p className="text-xs font-bold text-white mt-1 drop-shadow">
                    Chancellor's Complex &amp; Academic Wings
                  </p>
                </div>
                <span className="p-2 rounded-xl bg-white/20 backdrop-blur-md text-white group-hover:bg-[#F5B82E] group-hover:text-[#0B254D] transition">
                  <Maximize2 className="h-4 w-4" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. TOP 5 STAT CARDS (Direct visual match to screenshot) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Stat 1: Total Students */}
        <div className="rounded-2xl p-4 bg-gradient-to-br from-[#155EEF] to-[#0A3BB3] text-white shadow-md shadow-blue-500/15 flex items-center gap-3 text-left">
          <div className="h-11 w-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-xl sm:text-2xl font-black tabular-nums">1,250</div>
            <div className="text-[11px] font-semibold text-blue-100 uppercase tracking-wide">
              Total Students
            </div>
          </div>
        </div>

        {/* Stat 2: Teachers */}
        <div className="rounded-2xl p-4 bg-gradient-to-br from-[#10B981] to-[#059669] text-white shadow-md shadow-emerald-500/15 flex items-center gap-3 text-left">
          <div className="h-11 w-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-xl sm:text-2xl font-black tabular-nums">120</div>
            <div className="text-[11px] font-semibold text-emerald-100 uppercase tracking-wide">
              Teachers
            </div>
          </div>
        </div>

        {/* Stat 3: Attendance */}
        <div className="rounded-2xl p-4 bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] text-white shadow-md shadow-purple-500/15 flex items-center gap-3 text-left">
          <div className="h-11 w-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-xl sm:text-2xl font-black tabular-nums">98%</div>
            <div className="text-[11px] font-semibold text-purple-100 uppercase tracking-wide">
              Attendance
            </div>
          </div>
        </div>

        {/* Stat 4: Fees Collected */}
        <div className="rounded-2xl p-4 bg-gradient-to-br from-[#F59E0B] to-[#D97706] text-white shadow-md shadow-amber-500/15 flex items-center gap-3 text-left">
          <div className="h-11 w-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-xl sm:text-2xl font-black tabular-nums">KES 2.5M</div>
            <div className="text-[11px] font-semibold text-amber-100 uppercase tracking-wide">
              Fees Collected
            </div>
          </div>
        </div>

        {/* Stat 5: Upcoming Events */}
        <div className="col-span-2 sm:col-span-1 rounded-2xl p-4 bg-gradient-to-br from-[#06B6D4] to-[#0891B2] text-white shadow-md shadow-teal-500/15 flex items-center gap-3 text-left">
          <div className="h-11 w-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-xl sm:text-2xl font-black tabular-nums">12</div>
            <div className="text-[11px] font-semibold text-cyan-100 uppercase tracking-wide">
              Upcoming Events
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Alert Banner */}
      {feedback && (
        <div
          className={`rounded-2xl border p-3.5 text-xs font-semibold flex items-center gap-2 ${
            feedback.type === "ok"
              ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200"
              : "border-rose-300 bg-rose-50 text-rose-900 dark:bg-rose-950/60 dark:text-rose-200"
          }`}
        >
          {feedback.type === "ok" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0 text-rose-600" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* 4. DASHBOARD MAIN ROW 1 (Academic Performance, Recent Activities, Quick Access) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* CARD 1: Academic Performance Bar Chart (Col 5) */}
        <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#07142B] border border-blue-100 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-3.5 text-left">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#155EEF]" />
              <h3 className="font-display font-extrabold text-sm text-[#0B254D] dark:text-white">
                Academic Performance
              </h3>
            </div>
            <button
              type="button"
              onClick={() => scrollToOperations("exams")}
              className="text-xs font-bold text-[#155EEF] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>View Report</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Chart Legend */}
          <div className="flex items-center justify-center gap-4 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#155EEF]" /> Term 1
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" /> Term 2
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]" /> Term 3
            </span>
          </div>

          {/* Grouped Bar Visualizer */}
          <div className="h-44 pt-3 flex items-end justify-between gap-3 sm:gap-6 border-b border-slate-200 dark:border-slate-700 px-2">
            {[
              { label: "Primary", t1: 68, t2: 72, t3: 75 },
              { label: "Form 1", t1: 82, t2: 88, t3: 92 },
              { label: "Form 2", t1: 74, t2: 79, t3: 84 },
              { label: "Form 3", t1: 78, t2: 85, t3: 89 },
            ].map((cohort) => (
              <div key={cohort.label} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <div className="w-full flex items-end justify-center gap-1 h-36">
                  {/* Term 1 Bar */}
                  <div
                    style={{ height: `${cohort.t1}%` }}
                    className="w-2.5 sm:w-3.5 bg-[#155EEF] rounded-t-md transition-all duration-500 hover:opacity-85"
                    title={`${cohort.label} Term 1: ${cohort.t1}%`}
                  />
                  {/* Term 2 Bar */}
                  <div
                    style={{ height: `${cohort.t2}%` }}
                    className="w-2.5 sm:w-3.5 bg-[#10B981] rounded-t-md transition-all duration-500 hover:opacity-85"
                    title={`${cohort.label} Term 2: ${cohort.t2}%`}
                  />
                  {/* Term 3 Bar */}
                  <div
                    style={{ height: `${cohort.t3}%` }}
                    className="w-2.5 sm:w-3.5 bg-[#F59E0B] rounded-t-md transition-all duration-500 hover:opacity-85"
                    title={`${cohort.label} Term 3: ${cohort.t3}%`}
                  />
                </div>
                <span className="text-[10.5px] font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  {cohort.label}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center font-medium">
            Average cohort attainment across 2026/2027 Western Kenya Regional Standards
          </p>
        </div>

        {/* CARD 2: Recent Activities (Col 3.5) */}
        <div className="lg:col-span-3.5 rounded-2xl bg-white dark:bg-[#07142B] border border-blue-100 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-3.5 text-left">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#F59E0B]" />
              <h3 className="font-display font-extrabold text-sm text-[#0B254D] dark:text-white">
                Recent Activities
              </h3>
            </div>
            <button
              type="button"
              onClick={() => scrollToOperations("enrollments")}
              className="text-xs font-bold text-[#155EEF] hover:underline cursor-pointer"
            >
              View All →
            </button>
          </div>

          <div className="space-y-3">
            {[
              {
                id: "act_1",
                title: "New student registered",
                desc: "Mary Achieng – Form 1",
                time: "2 mins ago",
                icon: Users,
                color: "text-[#155EEF] bg-blue-50 dark:bg-blue-950/50 border-blue-200",
              },
              {
                id: "act_2",
                title: "Fee payment received",
                desc: "KES 15,000 – 2026/0012",
                time: "5 mins ago",
                icon: Wallet,
                color: "text-[#F59E0B] bg-amber-50 dark:bg-amber-950/50 border-amber-200",
              },
              {
                id: "act_3",
                title: "Exam results published",
                desc: "Form 3 – 2026 Term 3",
                time: "10 mins ago",
                icon: FileText,
                color: "text-purple-600 bg-purple-50 dark:bg-purple-950/50 border-purple-200",
              },
              {
                id: "act_4",
                title: "Attendance updated",
                desc: "Form 2 – 96%",
                time: "15 mins ago",
                icon: CheckCircle2,
                color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200",
              },
            ].map((act) => {
              const Icon = act.icon;
              return (
                <div key={act.id} className="flex items-start gap-2.5">
                  <div className={`p-2 rounded-xl border ${act.color} shrink-0 mt-0.5`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                      {act.title}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {act.desc}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {act.time}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* CARD 3: Quick Access 8-Grid (Col 3.5) */}
        <div className="lg:col-span-3.5 rounded-2xl bg-white dark:bg-[#07142B] border border-blue-100 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-3 text-left">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#F5B82E]" />
              <h3 className="font-display font-extrabold text-sm text-[#0B254D] dark:text-white">
                Quick Access
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
              8 Modules
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Add Student", icon: UserPlus, color: "text-[#155EEF] bg-blue-50 dark:bg-blue-950/50", action: () => setShowAddStudentModal(true) },
              { label: "Add Teacher", icon: GraduationCap, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50", action: () => setShowAddTeacherModal(true) },
              { label: "Record Fees", icon: Wallet, color: "text-[#F59E0B] bg-amber-50 dark:bg-amber-950/50", action: () => setShowRecordFeeModal(true) },
              { label: "Create Exam", icon: FileCheck2, color: "text-purple-600 bg-purple-50 dark:bg-purple-950/50", action: () => setShowCreateExamModal(true) },
              { label: "Timetable", icon: Calendar, color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/50", action: () => setShowTimetableModal(true) },
              { label: "Library", icon: BookOpen, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50", action: () => onNavigate?.("store") },
              { label: "Reports", icon: BarChart3, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50", action: () => setShowQuickReportsDrawer(true) },
              { label: "Settings", icon: SlidersHorizontal, color: "text-slate-600 bg-slate-100 dark:bg-slate-800", action: () => scrollToOperations("campus_photos") },
            ].map((qa) => {
              const Icon = qa.icon;
              return (
                <button
                  key={qa.label}
                  type="button"
                  onClick={qa.action}
                  className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-[#155EEF] transition duration-200 group cursor-pointer text-center bg-white dark:bg-slate-900/60"
                >
                  <div className={`p-2 rounded-xl ${qa.color} mb-1 transition group-hover:scale-110`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-[9.5px] font-bold text-slate-700 dark:text-slate-200 leading-tight">
                    {qa.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. DASHBOARD MAIN ROW 2 (Upcoming Events, Fee Summary Donut, School Gallery) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* CARD 4: Upcoming Events (Col 4) */}
        <div className="lg:col-span-4 rounded-2xl bg-white dark:bg-[#07142B] border border-blue-100 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-3 text-left">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#155EEF]" />
              <h3 className="font-display font-extrabold text-sm text-[#0B254D] dark:text-white">
                Upcoming Events
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowTimetableModal(true)}
              className="text-xs font-bold text-[#155EEF] hover:underline cursor-pointer"
            >
              View All →
            </button>
          </div>

          <div className="space-y-2.5">
            {[
              { day: "25", month: "NOV", title: "School Sports Day", time: "9:00 AM – 4:00 PM", icon: Award, color: "text-[#F59E0B]" },
              { day: "28", month: "NOV", title: "Parent-Teacher Meeting", time: "2:00 PM – 5:00 PM", icon: Users, color: "text-[#155EEF]" },
              { day: "01", month: "DEC", title: "Examination Week", time: "8:00 AM – 4:00 PM", icon: FileText, color: "text-purple-600" },
            ].map((ev) => {
              const Icon = ev.icon;
              return (
                <div key={ev.title} className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[11px] font-black text-[#0B254D] dark:text-white leading-none">{ev.day}</span>
                      <span className="text-[9px] font-mono font-bold text-rose-600 uppercase leading-none mt-0.5">{ev.month}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">{ev.title}</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{ev.time}</p>
                    </div>
                  </div>
                  <Icon className={`h-4 w-4 ${ev.color} shrink-0`} />
                </div>
              );
            })}
          </div>
        </div>

        {/* CARD 5: Fee Summary Donut Progress (Col 4) */}
        <div className="lg:col-span-4 rounded-2xl bg-white dark:bg-[#07142B] border border-blue-100 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-3 text-left">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <PieChart className="h-4 w-4 text-emerald-600" />
              <h3 className="font-display font-extrabold text-sm text-[#0B254D] dark:text-white">
                Fee Summary
              </h3>
            </div>
            <button
              type="button"
              onClick={() => scrollToOperations("finance_dashboard")}
              className="text-xs font-bold text-[#155EEF] hover:underline cursor-pointer"
            >
              View Details →
            </button>
          </div>

          <div className="flex items-center justify-around gap-4 pt-1">
            {/* SVG Donut Ring */}
            <div className="relative h-28 w-28 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-200 dark:text-slate-700"
                  strokeWidth="3.8"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#10B981]"
                  strokeDasharray="85, 100"
                  strokeWidth="3.8"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-display font-black text-xl text-[#0B254D] dark:text-white leading-none">
                  85%
                </span>
                <span className="text-[9px] font-bold text-emerald-600 uppercase">Paid</span>
              </div>
            </div>

            {/* Figures Breakup */}
            <div className="space-y-2 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
                  <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                  <span>Paid Tuition</span>
                </div>
                <p className="font-extrabold text-sm text-[#0B254D] dark:text-white tabular-nums">
                  KES 2,125,000
                </p>
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
                  <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
                  <span>Pending Balances</span>
                </div>
                <p className="font-extrabold text-sm text-[#F59E0B] tabular-nums">
                  KES 375,000
                </p>
              </div>

              <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 font-medium">
                Total Budget: <strong className="text-slate-700 dark:text-slate-200">KES 2,500,000</strong>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 6: School Gallery (Col 4) */}
        <div className="lg:col-span-4 rounded-2xl bg-white dark:bg-[#07142B] border border-blue-100 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-3 text-left">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#155EEF]" />
              <h3 className="font-display font-extrabold text-sm text-[#0B254D] dark:text-white">
                School Gallery
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowTourModal(true)}
              className="text-xs font-bold text-[#155EEF] hover:underline cursor-pointer"
            >
              View All →
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {campusPhotos.slice(0, 4).map((p) => (
              <div
                key={p.id}
                onClick={() => setShowTourModal(true)}
                className="relative rounded-xl overflow-hidden h-20 group cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                <img
                  src={p.url}
                  alt={p.title}
                  className="w-full h-full object-cover transform group-hover:scale-110 transition duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <span className="absolute bottom-1.5 left-2 right-2 text-[9.5px] font-bold text-white truncate drop-shadow">
                  {p.title}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-[11px] pt-1">
            <span className="font-medium text-slate-500 dark:text-slate-400">
              {campusPhotos.length} Bungoma Facilities
            </span>
            <button
              type="button"
              onClick={() => scrollToOperations("campus_photos")}
              className="font-bold text-[#155EEF] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <Upload className="h-3 w-3" />
              <span>Assign Photos</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Quick Reports Widget (Directly matching screenshot) */}
      <div className="fixed bottom-20 right-4 sm:right-6 z-40">
        <button
          type="button"
          onClick={() => setShowQuickReportsDrawer(!showQuickReportsDrawer)}
          className="p-3.5 rounded-full bg-gradient-to-r from-[#155EEF] to-[#0A3BB3] text-white shadow-xl hover:scale-105 active:scale-95 transition flex items-center justify-center cursor-pointer border-2 border-white/40"
          title="Quick Reports"
        >
          <Share2 className="h-5 w-5" />
        </button>

        {showQuickReportsDrawer && (
          <div className="absolute bottom-16 right-0 w-64 rounded-2xl bg-white dark:bg-[#0B254D] border border-blue-200 dark:border-slate-700 shadow-2xl p-3 space-y-2 text-xs text-left animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10 font-bold text-slate-900 dark:text-white">
              <span>Quick Reports</span>
              <button
                type="button"
                onClick={() => setShowQuickReportsDrawer(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-1">
              {[
                "Student Report",
                "Attendance Report",
                "Fee Report",
                "Performance Report",
                "Class Performance",
              ].map((rep) => (
                <button
                  key={rep}
                  type="button"
                  onClick={() => {
                    setSelectedReport(rep);
                    setShowQuickReportsDrawer(false);
                  }}
                  className="w-full text-left p-2 rounded-xl text-slate-700 dark:text-blue-100 hover:bg-blue-50 dark:hover:bg-white/10 font-medium transition cursor-pointer flex items-center justify-between"
                >
                  <span>{rep}</span>
                  <Download className="h-3 w-3 text-[#155EEF]" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Selected Report Preview Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-[#07142B] rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-display font-black text-base text-[#0B254D] dark:text-white">
                {selectedReport} — Academic Year 2026/2027
              </h3>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <p className="font-semibold text-slate-800 dark:text-white">Official Zion Digital Record Export</p>
              <p className="text-slate-500 dark:text-slate-400">
                Data generated for Western Kenya Regional Campus Directorate. All 1,250 student records, fee receipts, and term assessments synchronized.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  window.print();
                  setSelectedReport(null);
                }}
                className="px-4 py-2 rounded-xl bg-[#155EEF] text-white font-bold text-xs cursor-pointer"
              >
                Download / Print PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Virtual Tour Fullscreen Modal */}
      {showTourModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto bg-white dark:bg-[#07142B] rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Compass className="h-5 w-5 text-[#F5B82E]" />
                <h3 className="font-display font-black text-lg text-[#0B254D] dark:text-white">
                  Zion Leadership Campus — Bungoma Virtual Tour
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTourModal(false)}
                className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <VirtualTourCarousel
              currentUser={currentUser}
              onNavigate={onNavigate}
            />
          </div>
        </div>
      )}

      {/* 6. OPERATIONAL WORKSPACE (Server-Enforced Queues & Facilities Manager) */}
      <section id="manager-operations-workspace" className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-[#0B254D] dark:text-white">
              Operations Control &amp; Facilities
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Role: <span className="font-mono font-bold text-[#155EEF] uppercase">{currentUser?.role}</span> • Verified Server Session
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "finance_dashboard", label: "Finance Dashboard", icon: TrendingUp },
              { id: "enrollments", label: `Enrollments (${enrollments.length})`, icon: GraduationCap },
              { id: "payments", label: `Orders & Fees (${orders.length + feePayments.length})`, icon: CreditCard },
              { id: "mpesa_finance", label: "M-PESA Daraja Finance", icon: Smartphone },
              { id: "exams", label: `Exams & Grades (${attempts.length})`, icon: FileCheck2 },
              { id: "certificates", label: `Certificates (${certificates.length})`, icon: Award },
              { id: "campus_photos", label: `Campus Photos & Facilities (${campusPhotos.length})`, icon: Building2 },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    active
                      ? "bg-[#155EEF] text-white shadow-sm"
                      : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-[#155EEF]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === "finance_dashboard" && (
          <FinanceDashboard
            orders={orders}
            feePayments={feePayments}
            mpesaOverview={mpesaOverview}
            isDarkMode={isDarkMode}
            isLoading={isLoading}
            onRefresh={loadAllOperationalData}
            onOrderStatus={handleOrderStatus}
            onFeeConfirm={handleFeeConfirm}
            onOpenMpesaLedger={() => setActiveTab("mpesa_finance")}
          />
        )}

        {activeTab === "enrollments" && (
          <div className={`rounded-2xl border p-5 space-y-4 ${surface}`}>
            <h3 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#6E655E]">
              Student Course Enrollment Approvals
            </h3>
            {enrollments.length === 0 ? (
              <p className="text-xs text-[#6E655E] py-6 text-center">No enrollment requests queued.</p>
            ) : (
              <div className="space-y-3">
                {enrollments.map((enr) => (
                  <div
                    key={enr.id}
                    className="p-4 rounded-xl border border-[#E7E1D8] flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="space-y-1 text-xs">
                      <p className="font-semibold text-sm">{enr.studentName || enr.userName}</p>
                      <p className={mutedText}>
                        {enr.userEmail} • {enr.courseTopic} ({enr.courseCode || enr.courseId})
                      </p>
                      <p className="text-[11px] font-mono">
                        Status: <span className="font-semibold uppercase">{enr.status}</span> • Fee:{" "}
                        <span className="font-semibold uppercase">{enr.feeStatus}</span> • M-Pesa:{" "}
                        {enr.mpesaTransactionCode || "N/A"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleEnrollmentUpdate(enr.id, { status: "approved", feeStatus: "paid" })}
                        className="px-3 py-1.5 rounded-lg bg-[#2E7D32] hover:bg-[#246628] text-white text-xs font-semibold cursor-pointer"
                      >
                        Approve &amp; Mark Paid
                      </button>
                      <button
                        onClick={() => handleEnrollmentUpdate(enr.id, { status: "rejected" })}
                        className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "payments" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className={`rounded-2xl border p-5 space-y-4 ${surface}`}>
              <h3 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#6E655E]">
                Book Orders
              </h3>
              {orders.length === 0 ? (
                <p className="text-xs text-[#6E655E] py-6 text-center">No book orders found.</p>
              ) : (
                orders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-3.5 rounded-xl border border-[#E7E1D8] flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-semibold">{ord.bookTitle}</p>
                      <p className={mutedText}>
                        {ord.userName} ({ord.userEmail}) • KES {ord.price}
                      </p>
                      <p className="font-mono text-[11px] uppercase mt-0.5">Status: {ord.status}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOrderStatus(ord.id, "approved")}
                        className="px-2.5 py-1.5 rounded-lg bg-[#2E7D32] text-white font-semibold cursor-pointer"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => handleOrderStatus(ord.id, "rejected")}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-700 text-white font-semibold cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className={`rounded-2xl border p-5 space-y-4 ${surface}`}>
              <h3 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#6E655E]">
                Tuition &amp; Wi-Fi Fees
              </h3>
              {feePayments.length === 0 ? (
                <p className="text-xs text-[#6E655E] py-6 text-center">No fee payment claims queued.</p>
              ) : (
                feePayments.map((fee) => (
                  <div
                    key={fee.id}
                    className="p-3.5 rounded-xl border border-[#E7E1D8] flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-semibold">
                        {fee.planName} ({fee.feeType})
                      </p>
                      <p className={mutedText}>
                        {fee.userEmail} • KES {fee.amount} • {fee.phoneNumber || "N/A"}
                      </p>
                      <p className="font-mono text-[11px] uppercase mt-0.5">Status: {fee.status}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleFeeConfirm(fee.id, "confirmed")}
                        className="px-2.5 py-1.5 rounded-lg bg-[#2E7D32] text-white font-semibold cursor-pointer"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => handleFeeConfirm(fee.id, "rejected")}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-700 text-white font-semibold cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "mpesa_finance" && (
          <div className="space-y-6">
            {/* Top Financial Metrics Grid */}
            {mpesaOverview && mpesaOverview.metrics && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`p-4 rounded-2xl border ${surface} space-y-1`}>
                  <p className="text-[10px] font-mono uppercase text-[#6E655E] tracking-wider">Total Verified Revenue</p>
                  <p className="font-serif text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    KES {(mpesaOverview.metrics.totalRevenueKes || 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-[#6E655E]">Completed Daraja Receipts</p>
                </div>
                <div className={`p-4 rounded-2xl border ${surface} space-y-1`}>
                  <p className="text-[10px] font-mono uppercase text-[#6E655E] tracking-wider">Today's Inflow</p>
                  <p className="font-serif text-2xl font-bold text-[#1F1B18] dark:text-white">
                    KES {(mpesaOverview.metrics.todayRevenueKes || 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-[#6E655E]">Real-time ledgered deposits</p>
                </div>
                <div className={`p-4 rounded-2xl border ${surface} space-y-1`}>
                  <p className="text-[10px] font-mono uppercase text-[#6E655E] tracking-wider">Successful Pushes</p>
                  <p className="font-serif text-2xl font-bold text-emerald-700">
                    {mpesaOverview.metrics.completedCount || 0}
                  </p>
                  <p className="text-[10px] text-[#6E655E]">ResultCode 0 verified</p>
                </div>
                <div className={`p-4 rounded-2xl border ${surface} space-y-1`}>
                  <p className="text-[10px] font-mono uppercase text-[#6E655E] tracking-wider">Failed / Timed Out</p>
                  <p className="font-serif text-2xl font-bold text-rose-600">
                    {mpesaOverview.metrics.failedCount || 0}
                  </p>
                  <p className="text-[10px] text-[#6E655E]">Declined or cancelled PIN</p>
                </div>
              </div>
            )}

            {/* Daraja Configuration & Gateway Status */}
            <div className={`rounded-2xl border p-5 space-y-4 ${surface}`}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7E1D8] dark:border-stone-800 pb-3">
                <div>
                  <h3 className="font-serif text-base font-bold">Safaricom Daraja Production Gateway Status</h3>
                  <p className={`text-xs ${mutedText}`}>
                    Environment: <strong className="uppercase text-[#A8421B]">{mpesaOverview?.config?.environment || "sandbox"}</strong> • Shortcode: <strong className="font-mono">{mpesaOverview?.config?.shortcode || "1171473"}</strong> ({mpesaOverview?.config?.shortcodeType || "paybill"})
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase ${
                    mpesaOverview?.config?.isLiveConfigured
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                  }`}>
                    {mpesaOverview?.config?.isLiveConfigured ? "Live Production Active" : "Sandbox / Test Mode"}
                  </span>
                </div>
              </div>

              <div className="text-xs space-y-3">
                <p className={mutedText}>
                  Secure HTTPS Callback Endpoint (Safaricom Daraja Production):
                </p>
                <div className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-900 font-mono text-[11px] text-stone-800 dark:text-stone-200 select-all border border-stone-200 dark:border-stone-800 break-all">
                  {mpesaOverview?.config?.callbackUrl || "https://ais-pre-d5s23qoulieuk3cgfupt2h-871905850700.europe-west2.run.app/api/mpesa/callback"}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await secureApiFetch("/api/mpesa/admin/test-auth");
                      const data = await res.json().catch(() => ({}));
                      setActionNotice(
                        res.ok && data.success
                          ? `Safaricom Daraja OAuth OK (${data.environment}, PayBill ${data.shortcode}).`
                          : data.error || "Daraja OAuth verification failed."
                      );
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#1F1B18] text-white text-xs font-semibold hover:opacity-90 cursor-pointer"
                  >
                    Test Live Daraja OAuth
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await secureApiFetch("/api/mpesa/c2b/register", { method: "POST" });
                      const data = await res.json().catch(() => ({}));
                      setActionNotice(
                        res.ok && data.success
                          ? `Registered C2B v2 PayBill URLs for ${data.shortcode}.`
                          : data.error || "C2B URL registration failed."
                      );
                    }}
                    className="px-3 py-1.5 rounded-lg border border-[#E7E1D8] dark:border-stone-700 text-xs font-semibold hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer"
                  >
                    Register C2B v2 PayBill URLs
                  </button>
                </div>
                {actionNotice && (
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2">
                    {actionNotice}
                  </p>
                )}
              </div>
            </div>

            {/* Transaction Ledger & Simulator */}
            <div className={`rounded-2xl border p-5 space-y-4 ${surface}`}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7E1D8] dark:border-stone-800 pb-3">
                <h3 className="font-serif text-base font-bold">M-PESA Transaction Ledger &amp; Audit Logs</h3>
                <div className="flex items-center gap-2">
                  {["all", "completed", "pending", "failed"].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setMpesaFilter(f as any)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize cursor-pointer transition ${
                        mpesaFilter === f ? "bg-[#A8421B] text-white" : "border border-[#E7E1D8] dark:border-stone-800"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => loadAllOperationalData()}
                    className="p-2 rounded-lg border border-[#E7E1D8] dark:border-stone-800 hover:bg-stone-50 cursor-pointer"
                    title="Refresh transactions"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {!mpesaOverview || !mpesaOverview.recentTransactions || mpesaOverview.recentTransactions.length === 0 ? (
                <p className="text-xs text-[#6E655E] py-8 text-center">No M-PESA transactions recorded in ledger yet.</p>
              ) : (
                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                  {mpesaOverview.recentTransactions
                    .filter((t: any) => mpesaFilter === "all" || t.status === mpesaFilter)
                    .map((tx: any) => (
                      <div
                        key={tx.id}
                        className="p-3.5 rounded-xl border border-[#E7E1D8] dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`inline-block h-2 w-2 rounded-full ${
                              tx.status === "completed" ? "bg-emerald-500" : tx.status === "pending" ? "bg-amber-500 animate-pulse" : "bg-rose-500"
                            }`} />
                            <span className="font-bold text-sm">KES {tx.amount.toLocaleString()}</span>
                            <span className="font-mono text-[11px] text-[#A8421B] uppercase px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40">
                              {tx.purpose}
                            </span>
                          </div>
                          <p className={mutedText}>
                            {tx.userEmail} • Phone: <span className="font-mono">{tx.phoneNumber}</span> • Ref: <span className="font-mono">{tx.accountReference}</span>
                          </p>
                          <p className="font-mono text-[10px] text-stone-500">
                            ID: {tx.checkoutRequestId} {tx.mpesaReceiptNumber ? `• Receipt: ${tx.mpesaReceiptNumber}` : ""} • {new Date(tx.createdAt).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase ${
                            tx.status === "completed"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                              : tx.status === "pending"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300"
                          }`}>
                            {tx.status}
                          </span>

                          {tx.status === "pending" && (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const res = await secureApiFetch("/api/mpesa/admin/simulate-sandbox-callback", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ checkoutRequestId: tx.checkoutRequestId, success: true }),
                                  });
                                  const data = await res.json();
                                  if (data.success) {
                                    alert("✅ Sandbox callback simulated successfully! Payment marked complete and order fulfilled.");
                                    loadAllOperationalData();
                                  } else {
                                    alert(data.error || "Simulation failed.");
                                  }
                                } catch {
                                  alert("Failed to simulate sandbox callback.");
                                }
                              }}
                              className="px-2.5 py-1 rounded bg-[#2E7D32] hover:bg-[#246628] text-white font-bold text-[10px] cursor-pointer"
                            >
                              Simulate Success
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "exams" && (
          <div className="space-y-5">
            <div className={`rounded-2xl border p-5 space-y-3 ${surface}`}>
              <h3 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#6E655E]">
                Examination Release Controls
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {exams.map((ex) => (
                  <div
                    key={ex.id}
                    className="p-3.5 rounded-xl border border-[#E7E1D8] flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <p className="font-semibold">{ex.title}</p>
                      <p className={mutedText}>
                        Track: {ex.courseTrack} • {ex.questionsCount} Qs
                      </p>
                    </div>
                    <button
                      onClick={() => handleReleaseResults(ex.id, !ex.resultsReleased)}
                      className={`px-3 py-1.5 rounded-lg font-semibold text-white cursor-pointer ${
                        ex.resultsReleased ? "bg-amber-700 hover:bg-amber-800" : "bg-[#A8421B] hover:bg-[#8F3614]"
                      }`}
                    >
                      {ex.resultsReleased ? "Withhold Explanations" : "Release Results"}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className={`rounded-2xl border p-5 space-y-3 ${surface}`}>
              <h3 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#6E655E]">
                Student Attempts &amp; Examiner Grading
              </h3>
              {attempts.length === 0 ? (
                <p className="text-xs text-[#6E655E] py-6 text-center">No student examination attempts yet.</p>
              ) : (
                attempts.map((att) => (
                  <div
                    key={att.id}
                    className="p-3.5 rounded-xl border border-[#E7E1D8] flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-semibold">
                        {att.userName} ({att.userEmail})
                      </p>
                      <p className={mutedText}>
                        Exam: {att.examId} • Score: {att.score ?? "Pending"}% • Status: {att.status}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        placeholder={String(att.score ?? 80)}
                        value={gradeInputs[att.id] ?? ""}
                        onChange={(e) => setGradeInputs((prev) => ({ ...prev, [att.id]: e.target.value }))}
                        className="w-20 px-2.5 py-1.5 rounded-lg border border-[#E7E1D8] bg-transparent text-xs"
                      />
                      <button
                        onClick={() => handleGradeAttempt(att.id)}
                        className="px-3 py-1.5 rounded-lg bg-[#1F1B18] text-white font-semibold cursor-pointer"
                      >
                        Save Score
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "certificates" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <form onSubmit={handleIssueCertificate} className={`rounded-2xl border p-5 space-y-4 ${surface}`}>
              <h3 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#6E655E]">
                Issue Official Academic Certificate
              </h3>
              <div className="space-y-3 text-xs">
                <input
                  type="email"
                  required
                  placeholder="Student Email"
                  value={certForm.studentEmail}
                  onChange={(e) => setCertForm({ ...certForm, studentEmail: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E7E1D8] bg-transparent"
                />
                <input
                  type="text"
                  required
                  placeholder="Student Full Name"
                  value={certForm.studentName}
                  onChange={(e) => setCertForm({ ...certForm, studentName: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E7E1D8] bg-transparent"
                />
                <input
                  type="text"
                  required
                  placeholder="Course / Program Title"
                  value={certForm.courseTopic}
                  onChange={(e) => setCertForm({ ...certForm, courseTopic: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E7E1D8] bg-transparent"
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  required
                  placeholder="Final Score (%)"
                  value={certForm.score}
                  onChange={(e) => setCertForm({ ...certForm, score: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E7E1D8] bg-transparent"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#A8421B] hover:bg-[#8F3614] text-white font-semibold cursor-pointer"
                >
                  Issue Signed Certificate
                </button>
              </div>
            </form>

            <div className={`rounded-2xl border p-5 space-y-3 ${surface}`}>
              <h3 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#6E655E]">
                Issued Registry ({certificates.length})
              </h3>
              {certificates.length === 0 ? (
                <p className="text-xs text-[#6E655E] py-6 text-center">No certificates issued yet.</p>
              ) : (
                certificates.map((c) => (
                  <div key={c.id} className="p-3 rounded-xl border border-[#E7E1D8] text-xs">
                    <p className="font-semibold">{c.studentName}</p>
                    <p className={mutedText}>
                      {c.courseTopic} • {c.score}% • {c.studentEmail}
                    </p>
                    <p className="font-mono text-[10px] text-[#2E7D32] mt-1">
                      ID: {c.id} • Hash: {c.ledgerHash}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "campus_photos" && (
          <div className="rounded-2xl border border-blue-100 dark:border-slate-800 bg-white dark:bg-[#07142B] p-5 space-y-6 text-left">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-display font-extrabold text-lg text-[#0B254D] dark:text-white flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-[#155EEF]" />
                  <span>Bungoma Campus Facilities &amp; Library Category Assignments</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                  Upload photos of physical campus buildings, lecture halls, and laboratories, assign them to regional campuses (Bungoma HQ, Eldoret, Kisumu, Nairobi), and link them dynamically to Bookstore and Library categories.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTourModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#155EEF] to-[#0A3BB3] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer hover:opacity-90"
                >
                  <Compass className="h-4 w-4 text-[#F5B82E]" />
                  <span>Interactive 360° Tour</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const defaults = resetCampusPhotosToDefaults();
                    setCampusPhotos(defaults);
                    setFeedback({ type: "ok", text: "Reset campus facilities to official Bungoma HQ set." });
                  }}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  Restore Defaults
                </button>
              </div>
            </div>

            {/* Photo Upload / Assignment Form Card */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!photoFormTitle.trim() || !photoFormUrl.trim()) {
                  alert("Please provide facility title and image photo URL.");
                  return;
                }
                const newPhoto: CampusBuildingPhoto = {
                  id: editingCampusPhotoId || `campus_${Date.now()}`,
                  title: photoFormTitle.trim(),
                  campusName: photoFormCampus,
                  libraryCategory: photoFormLibraryCategory,
                  category: photoFormCategory,
                  url: photoFormUrl.trim(),
                  location: photoFormLocation.trim(),
                  description: photoFormDescription.trim(),
                  features: photoFormFeatures.split(",").map(f => f.trim()).filter(Boolean),
                  isFeaturedTour: photoFormIsFeatured,
                  createdAt: new Date().toISOString().split("T")[0]
                };
                await addOrUpdateCampusPhoto(newPhoto);
                setCampusPhotos(getLocalCampusPhotos());
                setEditingCampusPhotoId(null);
                setPhotoFormTitle("");
                setPhotoFormUrl("");
                setPhotoFormDescription("");
                setPhotoFormFeatures("");
                setFeedback({ type: "ok", text: `Campus facility "${newPhoto.title}" successfully saved and linked to ${newPhoto.libraryCategory} category!` });
              }}
              className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-display font-extrabold text-sm text-[#0B254D] dark:text-white flex items-center gap-2">
                  <Upload className="h-4 w-4 text-[#155EEF]" />
                  <span>{editingCampusPhotoId ? "Edit Facility Assignment" : "Upload & Assign New Facility Photo"}</span>
                </span>
                {editingCampusPhotoId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCampusPhotoId(null);
                      setPhotoFormTitle("");
                      setPhotoFormUrl("");
                      setPhotoFormDescription("");
                      setPhotoFormFeatures("");
                    }}
                    className="text-xs text-slate-500 hover:underline cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Facility / Building Title
                  </label>
                  <input
                    type="text"
                    required
                    value={photoFormTitle}
                    onChange={(e) => setPhotoFormTitle(e.target.value)}
                    placeholder="e.g. Chancellor's Executive & Lecture Complex"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Regional Campus Location
                  </label>
                  <select
                    value={photoFormCampus}
                    onChange={(e) => setPhotoFormCampus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                  >
                    <option value="Bungoma Kanduyi Main Campus (HQ)">Bungoma Kanduyi Main Campus (HQ)</option>
                    <option value="Bible School Grounds, Bungoma">Bible School Grounds, Bungoma</option>
                    <option value="Eldoret Campus Wing">Eldoret Campus Wing</option>
                    <option value="Kisumu Regional Center">Kisumu Regional Center</option>
                    <option value="Nairobi Directorate">Nairobi Directorate</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Linked Bookstore &amp; Library Category
                  </label>
                  <select
                    value={photoFormLibraryCategory}
                    onChange={(e) => setPhotoFormLibraryCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                  >
                    <option value="Leadership">Leadership</option>
                    <option value="Christian Books">Christian Books</option>
                    <option value="Computer">Computer</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Science">Science</option>
                    <option value="Business">Business</option>
                    <option value="Education">Education</option>
                    <option value="Personal Development">Personal Development</option>
                    <option value="All">All Categories</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Architectural Facility Category
                  </label>
                  <select
                    value={photoFormCategory}
                    onChange={(e) => setPhotoFormCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                  >
                    <option value="Campus Buildings">Campus Buildings</option>
                    <option value="ICT & Library">ICT &amp; Library</option>
                    <option value="Fellowship & Seminars">Fellowship &amp; Seminars</option>
                    <option value="Students & Graduation">Students &amp; Graduation</option>
                    <option value="Lecture Halls">Lecture Halls</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Building Photo Image (URL or Local File Upload)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={photoFormUrl}
                      onChange={(e) => setPhotoFormUrl(e.target.value)}
                      placeholder="https://... or upload below"
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                    />
                    <label className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs cursor-pointer inline-flex items-center gap-1.5 shrink-0">
                      <Upload className="h-3.5 w-3.5" />
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const compressed = await compressImageToDataUrl(file);
                            setPhotoFormUrl(compressed);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Physical Address / Landmark
                  </label>
                  <input
                    type="text"
                    value={photoFormLocation}
                    onChange={(e) => setPhotoFormLocation(e.target.value)}
                    placeholder="e.g. Kanduyi Hub, Bungoma-Malaba Highway, Bungoma"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Key Features &amp; Amenities (comma separated)
                  </label>
                  <input
                    type="text"
                    value={photoFormFeatures}
                    onChange={(e) => setPhotoFormFeatures(e.target.value)}
                    placeholder="e.g. 500-Seat Hall, Solar Backup, Fibre Internet"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Architectural Description
                </label>
                <textarea
                  rows={2}
                  value={photoFormDescription}
                  onChange={(e) => setPhotoFormDescription(e.target.value)}
                  placeholder="Describe this facility's contribution to academic and biblical leadership..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={photoFormIsFeatured}
                    onChange={(e) => setPhotoFormIsFeatured(e.target.checked)}
                    className="h-4 w-4 rounded accent-[#155EEF]"
                  />
                  <span>Feature in interactive campus virtual tour</span>
                </label>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#155EEF] hover:bg-[#0F49C7] text-white font-bold text-xs cursor-pointer shadow-sm transition"
                >
                  {editingCampusPhotoId ? "Update Facility Assignment" : "Save & Assign Facility Photo"}
                </button>
              </div>
            </form>

            {/* List of Registered Campus Photos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campusPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-900/40 flex flex-col justify-between"
                >
                  <div className="relative h-40 group overflow-hidden">
                    <img
                      src={photo.url}
                      alt={photo.title}
                      className="w-full h-full object-cover transform group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-[#155EEF] text-white text-[10px] font-bold shadow-xs">
                      {photo.category}
                    </span>
                    <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-[#F5B82E] text-[#0B254D] text-[10px] font-black shadow-xs">
                      Linked: {photo.libraryCategory}
                    </span>
                    <div className="absolute bottom-2 left-3 right-3 text-white">
                      <p className="font-extrabold text-xs leading-snug drop-shadow">{photo.title}</p>
                      <p className="text-[10px] text-blue-100 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 text-[#F5B82E]" />
                        <span className="truncate">{photo.campusName}</span>
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 space-y-2.5 text-xs flex-1 flex flex-col justify-between">
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
                      {photo.description}
                    </p>

                    {photo.features && photo.features.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {photo.features.map((f, idx) => (
                          <span
                            key={idx}
                            className="text-[9.5px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium"
                          >
                            ✓ {f}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCampusPhotoId(photo.id);
                          setPhotoFormTitle(photo.title);
                          setPhotoFormCampus(photo.campusName);
                          setPhotoFormLibraryCategory(photo.libraryCategory);
                          setPhotoFormCategory(photo.category);
                          setPhotoFormUrl(photo.url);
                          setPhotoFormLocation(photo.location);
                          setPhotoFormDescription(photo.description);
                          setPhotoFormFeatures(photo.features?.join(", ") || "");
                          setPhotoFormIsFeatured(photo.isFeaturedTour ?? true);
                          window.scrollTo({ top: 600, behavior: "smooth" });
                        }}
                        className="text-[#155EEF] hover:underline font-bold text-xs cursor-pointer inline-flex items-center gap-1"
                      >
                        <Edit3 className="h-3 w-3" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm(`Delete facility photo "${photo.title}"?`)) {
                            await deleteCampusPhoto(photo.id);
                            setCampusPhotos(getLocalCampusPhotos());
                            setFeedback({ type: "ok", text: `Removed "${photo.title}".` });
                          }
                        }}
                        className="text-rose-600 hover:underline font-bold text-xs cursor-pointer inline-flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Access Control: Sub-Admin Role Assignment */}
      <section id="manager-access-control" className="space-y-3 pt-4 border-t border-[#E7E1D8]">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-serif text-lg font-semibold flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[#A8421B]" />
            Access control
          </h2>
          <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-[#6E655E]">
            SUB-ADMIN PERMISSIONS
          </span>
        </div>

        <div className={`rounded-2xl border p-5 space-y-4 ${surface}`}>
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-[#A8421B] shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold">Sub-Admin Role Assignment</h3>
              <p className={`text-xs ${mutedText}`}>
                Toggle specific permissions for each sub-admin. They can only access the areas you enable.
              </p>
            </div>
          </div>

          {subAdmins.length === 0 ? (
            <div className="rounded-xl bg-[#FAF8F4] dark:bg-[#141210] border border-[#E7E1D8] dark:border-[#332C26] p-4 text-center text-xs text-[#6E655E]">
              {isMainAdmin
                ? "No custom sub-admins configured yet."
                : "Only the Principal Main Admin can invite or modify sub-admin permissions."}
            </div>
          ) : (
            <div className="space-y-3">
              {subAdmins.map((sa) => (
                <div
                  key={sa.email}
                  className="p-4 rounded-xl border border-[#E7E1D8] dark:border-[#332C26] space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{sa.name}</p>
                      <p className="font-mono text-[11px] text-[#6E655E]">{sa.email}</p>
                    </div>
                    {isMainAdmin && (
                      <button
                        type="button"
                        onClick={() => handleRevokeSubAdmin(sa.email)}
                        className="text-xs font-semibold text-rose-700 hover:underline cursor-pointer"
                      >
                        Revoke Access
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-[11px]">
                    {(
                      [
                        ["allowApproval", "Approvals"],
                        ["allowManageBooks", "Manage Books"],
                        ["allowConfirmPayments", "Confirm Payments"],
                        ["allowManageEnrollments", "Enrollments"],
                        ["allowManageExams", "Exams & Grading"],
                        ["allowIssueCertificates", "Certificates"],
                        ["allowBroadcast", "Announcements"],
                        ["allowVault", "Private Vault"],
                        ["allowModeration", "Moderation"],
                        ["allowSuspendUsers", "Suspend Users"],
                      ] as [keyof SubAdminCapabilityMap, string][]
                    ).map(([k, label]) => (
                      <label key={k} className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          disabled={!isMainAdmin}
                          checked={Boolean(sa.permissions?.[k])}
                          onChange={(e) => handleToggleSubAdminPerm(sa.email, k, e.target.checked)}
                          className="accent-[#A8421B]"
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {isMainAdmin && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowInviteSubAdmin((v) => !v)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${surface} hover:border-[#A8421B]`}
              >
                <UserPlus className="h-3.5 w-3.5 text-[#A8421B]" />
                {showInviteSubAdmin ? "Close Sub-Admin Form" : "Invite new sub-admins"}
              </button>

              {showInviteSubAdmin && (
                <form
                  onSubmit={handleSaveSubAdmin}
                  className="p-4 rounded-xl border border-[#E7E1D8] bg-[#FAF8F4] dark:bg-[#141210] space-y-3 text-xs"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Sub-Admin Full Name"
                      value={subAdminForm.name}
                      onChange={(e) => setSubAdminForm({ ...subAdminForm, name: e.target.value })}
                      className="px-3 py-2 rounded-lg border border-[#E7E1D8] bg-white text-[#1F1B18]"
                    />
                    <input
                      type="email"
                      required
                      placeholder="subadmin@ziondigital.ac.ke"
                      value={subAdminForm.email}
                      onChange={(e) => setSubAdminForm({ ...subAdminForm, email: e.target.value })}
                      className="px-3 py-2 rounded-lg border border-[#E7E1D8] bg-white text-[#1F1B18]"
                    />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {(
                      [
                        ["allowApproval", "Approvals"],
                        ["allowManageBooks", "Books"],
                        ["allowConfirmPayments", "Payments"],
                        ["allowManageEnrollments", "Enrollments"],
                        ["allowManageExams", "Exams"],
                        ["allowIssueCertificates", "Certificates"],
                        ["allowBroadcast", "Broadcast"],
                        ["allowVault", "Vault"],
                        ["allowModeration", "Moderation"],
                        ["allowSuspendUsers", "Suspend"],
                      ] as [keyof SubAdminCapabilityMap, string][]
                    ).map(([k, label]) => (
                      <label key={k} className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={subAdminForm.permissions[k]}
                          onChange={(e) =>
                            setSubAdminForm((prev) => ({
                              ...prev,
                              permissions: { ...prev.permissions, [k]: e.target.checked },
                            }))
                          }
                          className="accent-[#A8421B]"
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#A8421B] text-white font-semibold cursor-pointer"
                  >
                    Save Sub-Admin Assignment
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Live Home Slideshow & Vision/Mission/Slogan Editor */}
      <section id="manager-home-slideshow" className="space-y-3 pt-4 border-t border-[#E7E1D8]">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-serif text-lg font-semibold flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-[#A8421B]" />
            Home slideshow &amp; Purpose
          </h2>
          <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-[#6E655E]">
            PHOTOS ON THE HOME &amp; LOGIN SCREENS
          </span>
        </div>

        <div className={`rounded-2xl border p-5 space-y-5 ${surface}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">
                {showcaseDraft.slides.length} active slide(s) · each shows for{" "}
                <span className="tabular-nums text-[#A8421B]">
                  {(showcaseDraft.intervalMs / 1000).toFixed(1)}s
                </span>
              </p>
              <p className={`text-xs ${mutedText}`}>
                Changes here update the Home showcase and Welcome Login carousel immediately.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#A8421B] hover:bg-[#8F3614] text-white text-xs font-semibold cursor-pointer">
                <Plus className="h-3.5 w-3.5" />
                <span>Upload photos</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleUploadSlideshowPhotos}
                  className="hidden"
                />
              </label>
              <button
                type="button"
                onClick={resetDefaultSlides}
                className={`px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${surface}`}
              >
                Restore Editorial Set
              </button>
              <button
                type="button"
                onClick={handleSaveShowcase}
                disabled={isSavingShowcase}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1F1B18] hover:bg-[#332D28] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                {isSavingShowcase ? "Publishing..." : "Publish Live"}
              </button>
            </div>
          </div>

          {/* Live Vision / Mission / Slogan & Slide Speed Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border border-[#E7E1D8] bg-[#FAF8F4] dark:bg-[#141210] text-xs">
            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase tracking-wider text-[#6E655E] block">
                Vision Statement
              </label>
              <textarea
                rows={2}
                value={showcaseDraft.vision}
                onChange={(e) => setShowcaseDraft({ ...showcaseDraft, vision: e.target.value })}
                className="w-full rounded-lg border border-[#E7E1D8] bg-white text-[#1F1B18] p-2.5"
              />
            </div>
            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase tracking-wider text-[#6E655E] block">
                Mission Statement
              </label>
              <textarea
                rows={2}
                value={showcaseDraft.mission}
                onChange={(e) => setShowcaseDraft({ ...showcaseDraft, mission: e.target.value })}
                className="w-full rounded-lg border border-[#E7E1D8] bg-white text-[#1F1B18] p-2.5"
              />
            </div>
            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase tracking-wider text-[#6E655E] block">
                Primary Slogan
              </label>
              <input
                type="text"
                value={showcaseDraft.slogan}
                onChange={(e) => setShowcaseDraft({ ...showcaseDraft, slogan: e.target.value })}
                className="w-full rounded-lg border border-[#E7E1D8] bg-white text-[#1F1B18] p-2.5"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-mono text-[10px] uppercase tracking-wider text-[#6E655E] block">
                  Secondary Motto
                </label>
                <input
                  type="text"
                  value={showcaseDraft.tagline}
                  onChange={(e) => setShowcaseDraft({ ...showcaseDraft, tagline: e.target.value })}
                  className="w-full rounded-lg border border-[#E7E1D8] bg-white text-[#1F1B18] p-2.5"
                />
              </div>
              <div className="space-y-1">
                <label className="font-mono text-[10px] uppercase tracking-wider text-[#6E655E] block">
                  Slide Interval (Seconds)
                </label>
                <input
                  type="number"
                  min={1.5}
                  max={10}
                  step={0.5}
                  value={Number((showcaseDraft.intervalMs / 1000).toFixed(1))}
                  onChange={(e) =>
                    setShowcaseDraft({
                      ...showcaseDraft,
                      intervalMs: Math.max(1500, Math.round(Number(e.target.value || 2) * 1000)),
                    })
                  }
                  className="w-full rounded-lg border border-[#E7E1D8] bg-white text-[#1F1B18] p-2.5 tabular-nums"
                />
              </div>
            </div>
          </div>

          {/* Slides List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {showcaseDraft.slides.map((slide, idx) => (
              <div
                key={slide.id}
                className="rounded-xl border border-[#E7E1D8] p-3.5 flex flex-col gap-3 bg-[#FAF8F4] dark:bg-[#141210]"
              >
                <div className="flex gap-3">
                  <img
                    src={slide.imageUrl}
                    alt={slide.title}
                    className="h-20 w-28 rounded-lg object-cover border border-[#E7E1D8] shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-1.5 text-xs">
                    <input
                      type="text"
                      value={slide.title}
                      onChange={(e) => {
                        const next = [...showcaseDraft.slides];
                        next[idx] = { ...next[idx], title: e.target.value };
                        setShowcaseDraft({ ...showcaseDraft, slides: next });
                      }}
                      className="w-full px-2.5 py-1.5 rounded-md border border-[#E7E1D8] bg-white text-[#1F1B18] font-semibold"
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        value={slide.category}
                        onChange={(e) => {
                          const next = [...showcaseDraft.slides];
                          next[idx] = { ...next[idx], category: e.target.value };
                          setShowcaseDraft({ ...showcaseDraft, slides: next });
                        }}
                        className="px-2 py-1 rounded-md border border-[#E7E1D8] bg-white text-[#1F1B18] text-[11px]"
                      />
                      <select
                        value={slide.targetView}
                        onChange={(e) => {
                          const next = [...showcaseDraft.slides];
                          next[idx] = {
                            ...next[idx],
                            targetView: e.target.value as ShowcaseTargetView,
                          };
                          setShowcaseDraft({ ...showcaseDraft, slides: next });
                        }}
                        className="px-2 py-1 rounded-md border border-[#E7E1D8] bg-white text-[#1F1B18] text-[11px]"
                      >
                        <option value="store">Bookstore Home</option>
                        <option value="school">Leadership &amp; Computer School</option>
                        <option value="devotional">Bible School &amp; NIV</option>
                        <option value="sermons-motivation">Videos &amp; Sermons</option>
                        <option value="community">Community</option>
                      </select>
                    </div>
                  </div>
                </div>
                <textarea
                  rows={2}
                  value={slide.subtitle}
                  onChange={(e) => {
                    const next = [...showcaseDraft.slides];
                    next[idx] = { ...next[idx], subtitle: e.target.value };
                    setShowcaseDraft({ ...showcaseDraft, slides: next });
                  }}
                  className="w-full px-2.5 py-1.5 rounded-md border border-[#E7E1D8] bg-white text-[#1F1B18] text-xs"
                />
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono text-[#6E655E]">Slide #{idx + 1}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => moveSlide(idx, -1)}
                      disabled={idx === 0}
                      className="p-1.5 rounded border border-[#E7E1D8] bg-white text-[#1F1B18] disabled:opacity-40 cursor-pointer"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSlide(idx, 1)}
                      disabled={idx === showcaseDraft.slides.length - 1}
                      className="p-1.5 rounded border border-[#E7E1D8] bg-white text-[#1F1B18] disabled:opacity-40 cursor-pointer"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSlide(idx)}
                      className="p-1.5 rounded border border-rose-200 bg-rose-50 text-rose-700 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* QUICK ACCESS MODAL: ADD STUDENT */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#07142B] rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-display font-black text-sm text-[#0B254D] dark:text-white flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-[#155EEF]" />
                <span>Admissions: Register New Student</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddStudentModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as any;
                const studentName = form.studentName.value;
                const studentEmail = form.studentEmail.value;
                const courseTopic = form.courseTopic.value;
                try {
                  await secureApiFetch("/api/enrollments", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      courseId: "course_" + Date.now(),
                      courseCode: "ZION/2026/001",
                      courseTopic,
                      studentName,
                      userEmail: studentEmail,
                      status: "approved",
                      feeStatus: "paid",
                    }),
                  });
                  await loadAllOperationalData();
                  setFeedback({ type: "ok", text: `Student ${studentName} successfully registered in ${courseTopic}!` });
                  setShowAddStudentModal(false);
                } catch {
                  setShowAddStudentModal(false);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">Student Full Name</label>
                <input
                  type="text"
                  name="studentName"
                  required
                  placeholder="e.g. Mary Achieng"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">Email Address</label>
                <input
                  type="email"
                  name="studentEmail"
                  required
                  placeholder="e.g. mary@gmail.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">Enrolled Program / Cohort</label>
                <select
                  name="courseTopic"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                >
                  <option value="Christian Leadership &amp; Governance">Christian Leadership &amp; Governance</option>
                  <option value="Systematic Biblical Theology">Systematic Biblical Theology</option>
                  <option value="Computer Software &amp; ICT Systems">Computer Software &amp; ICT Systems</option>
                  <option value="Form 1 Secondary CBC Cohort">Form 1 Secondary CBC Cohort</option>
                  <option value="Form 3 Secondary Cohort">Form 3 Secondary Cohort</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-3 py-2 rounded-xl border text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#155EEF] text-white font-bold cursor-pointer"
                >
                  Confirm Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ACCESS MODAL: ADD TEACHER */}
      {showAddTeacherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#07142B] rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-display font-black text-sm text-[#0B254D] dark:text-white flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-emerald-600" />
                <span>Staff: Appoint Academic Tutor / Teacher</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddTeacherModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as any;
                const name = form.tutorName.value;
                const dept = form.tutorDept.value;
                setFeedback({ type: "ok", text: `Teacher ${name} appointed to ${dept} department.` });
                setShowAddTeacherModal(false);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">Teacher Full Name</label>
                <input
                  type="text"
                  name="tutorName"
                  required
                  placeholder="e.g. Pastor Samuel Barasa"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">Department</label>
                <select
                  name="tutorDept"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                >
                  <option value="Bible School &amp; Theology">Bible School &amp; Theology</option>
                  <option value="Leadership &amp; Governance">Leadership &amp; Governance</option>
                  <option value="Computer &amp; Information Technology">Computer &amp; Information Technology</option>
                  <option value="Mathematics &amp; CBC Sciences">Mathematics &amp; CBC Sciences</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTeacherModal(false)}
                  className="px-3 py-2 rounded-xl border text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold cursor-pointer"
                >
                  Appoint Teacher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ACCESS MODAL: RECORD FEES */}
      {showRecordFeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#07142B] rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-display font-black text-sm text-[#0B254D] dark:text-white flex items-center gap-2">
                <Wallet className="h-4 w-4 text-[#F59E0B]" />
                <span>Finance: Record Student Fee Receipt</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowRecordFeeModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as any;
                const studentEmail = form.studentEmail.value;
                const amount = Number(form.amount.value);
                const mpesaRef = form.mpesaRef.value;
                try {
                  await secureApiFetch("/api/fee-payments", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      userEmail: studentEmail,
                      userName: studentEmail.split("@")[0],
                      purpose: "Tuition Balance Fee",
                      amount,
                      channel: "mpesa",
                      reference: mpesaRef || "STK" + Date.now().toString().slice(-6),
                    }),
                  });
                  await loadAllOperationalData();
                  setFeedback({ type: "ok", text: `Fee payment of KES ${amount} recorded for ${studentEmail}!` });
                  setShowRecordFeeModal(false);
                } catch {
                  setShowRecordFeeModal(false);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">Student Email or Admission No</label>
                <input
                  type="text"
                  name="studentEmail"
                  required
                  placeholder="e.g. 2026/0012 or student@gmail.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">Amount (KES)</label>
                  <input
                    type="number"
                    name="amount"
                    required
                    defaultValue={15000}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">M-Pesa Reference</label>
                  <input
                    type="text"
                    name="mpesaRef"
                    placeholder="e.g. SH91XX478"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono uppercase"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRecordFeeModal(false)}
                  className="px-3 py-2 rounded-xl border text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#F59E0B] text-white font-bold cursor-pointer"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ACCESS MODAL: CREATE EXAM */}
      {showCreateExamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#07142B] rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-display font-black text-sm text-[#0B254D] dark:text-white flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-purple-600" />
                <span>Exams: Schedule New Assessment</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateExamModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as any;
                const title = form.examTitle.value;
                const courseCode = form.courseCode.value;
                try {
                  await secureApiFetch("/api/exams", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      title,
                      courseCode,
                      durationMinutes: 60,
                      passScore: 70,
                      isPublished: true,
                      questions: [
                        { question: "Outline the key principles of Christian servant leadership.", type: "essay" },
                        { question: "Differentiate between exegesis and eisegesis.", type: "essay" },
                      ],
                    }),
                  });
                  await loadAllOperationalData();
                  setFeedback({ type: "ok", text: `Exam "${title}" scheduled and published to student portals!` });
                  setShowCreateExamModal(false);
                } catch {
                  setShowCreateExamModal(false);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">Exam Title</label>
                <input
                  type="text"
                  name="examTitle"
                  required
                  placeholder="e.g. Christian Leadership End-Term Assessment"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">Course Code</label>
                <input
                  type="text"
                  name="courseCode"
                  required
                  defaultValue="LEAD-202"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateExamModal(false)}
                  className="px-3 py-2 rounded-xl border text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold cursor-pointer"
                >
                  Schedule Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ACCESS MODAL: TIMETABLE */}
      {showTimetableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white dark:bg-[#07142B] rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-display font-black text-base text-[#0B254D] dark:text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[#155EEF]" />
                  <span>Official Academic Timetable — Bungoma Kanduyi Campus</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Academic Term Schedule • Lecture Halls &amp; Laboratory Rotations
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTimetableModal(false)}
                className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs max-h-[60vh] overflow-y-auto">
              {[
                { time: "08:00 AM – 10:00 AM", subject: "Old Testament Hebrew Hermeneutics", tutor: "Dr. Kelvin Wafula", hall: "Hall A (500-Seat Complex)" },
                { time: "10:30 AM – 12:30 PM", subject: "Computer Software Engineering & Cloud", tutor: "Eng. Wanyonyi", hall: "Lab 2 (Technology Wing)" },
                { time: "02:00 PM – 04:00 PM", subject: "Christian Leadership & Ethics in Governance", tutor: "Pastor Barasa", hall: "Chancellor's Executive Suite" },
                { time: "04:30 PM – 05:30 PM", subject: "Student Fellowship & Prayer Retreat", tutor: "Chaplaincy Team", hall: "Theological Sanctum Chapel" },
              ].map((slot, i) => (
                <div key={i} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-[#155EEF] uppercase block">{slot.time}</span>
                    <h4 className="font-extrabold text-sm text-slate-800 dark:text-white mt-0.5">{slot.subject}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Lecturer: {slot.tutor}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10.5px] font-bold text-slate-700 dark:text-slate-200 shrink-0">
                    {slot.hall}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  window.print();
                  setShowTimetableModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-[#155EEF] text-white font-bold text-xs cursor-pointer"
              >
                Print Timetable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
