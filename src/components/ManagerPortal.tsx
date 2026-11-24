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
} from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<"enrollments" | "payments" | "mpesa_finance" | "exams" | "certificates">("enrollments");
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

  const scrollToOperations = (tab: "enrollments" | "payments" | "mpesa_finance" | "exams" | "certificates") => {
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
            desc: "Sales performance and insights",
            icon: TrendingUp,
            action: () => scrollToOperations("payments"),
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-left">
      {/* Header matching editorial staff layout */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-3.5">
          <button
            onClick={onBack}
            className={`p-2 rounded-xl border ${surface} hover:opacity-85 cursor-pointer`}
            title="Back to Home"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="h-11 w-11 rounded-xl bg-[#FBF1EB] border border-[#E7C6B6] flex items-center justify-center text-[#A8421B]">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
              Manager Portal
            </h1>
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#6E655E]">
              PRIVATE · ADMIN ONLY
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAllOperationalData}
            disabled={isLoading}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${surface}`}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Sync
          </button>
          {canOpenAdminPanel && onOpenAdminPanel && (
            <button
              onClick={onOpenAdminPanel}
              className={`px-4 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${surface} hover:border-[#A8421B]`}
            >
              Admin Panel
            </button>
          )}
        </div>
      </div>

      <p className={`text-sm ${mutedText}`}>
        Welcome back, <strong className={isDarkMode ? "text-white" : "text-[#1F1B18]"}>{currentUser?.name}</strong>. Everything in one control centre.
      </p>

      {/* 4 KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          { label: "BOOKS PUBLISHED", value: booksCount || 4, icon: BookOpen },
          { label: "TOTAL ORDERS", value: orders.length, icon: Package },
          { label: "PENDING PAYMENTS", value: pendingPaymentsCount, icon: DollarSign },
          { label: "ENROLLED STUDENTS", value: enrollments.length, icon: GraduationCap },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`rounded-xl border p-4 space-y-2 ${surface}`}>
              <Icon className="h-4 w-4 text-[#A8421B]" />
              <div className="font-serif text-2xl font-bold tabular-nums">{stat.value}</div>
              <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-[#6E655E]">
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Deletion Protection Banner */}
      <div className="rounded-xl border border-[#C6DFCB] bg-[#EDF7EE] px-4 py-3 flex items-center gap-2.5 text-xs text-[#255A30]">
        <ShieldCheck className="h-4 w-4 shrink-0 text-[#2E7D32]" />
        <span>
          Deletions are protected: every delete asks for confirmation first, and nothing is removed until you approve it.
        </span>
      </div>

      {feedback && (
        <div
          className={`rounded-xl border p-3.5 text-xs font-medium flex items-center gap-2 ${
            feedback.type === "ok"
              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
              : "border-rose-300 bg-rose-50 text-rose-900"
          }`}
        >
          {feedback.type === "ok" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0 text-rose-700" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Tool Search Bar */}
      <div className={`rounded-xl border px-3.5 py-2.5 flex items-center gap-2.5 ${surface}`}>
        <Search className="h-4 w-4 text-[#6E655E] shrink-0" />
        <input
          type="text"
          value={toolSearch}
          onChange={(e) => setToolSearch(e.target.value)}
          placeholder="Find a tool — students, exams, vault, payroll..."
          className="w-full bg-transparent text-xs outline-none placeholder-[#9B9189]"
        />
      </div>

      {/* Categorized Tool Directory */}
      <div className="space-y-6">
        {filteredCategories.map((cat) => (
          <section key={cat.heading} className="space-y-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-serif text-lg font-semibold">{cat.heading}</h2>
              <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-[#6E655E]">
                {cat.subheading}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {cat.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.title}
                    type="button"
                    onClick={item.action}
                    className={`rounded-xl border p-4 flex items-center gap-3.5 text-left transition hover:border-[#A8421B] cursor-pointer ${surface}`}
                  >
                    <div className="h-10 w-10 rounded-lg bg-[#FBF1EB] border border-[#EED7C9] flex items-center justify-center text-[#A8421B] shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-sans text-sm font-semibold">{item.title}</h3>
                      <p className={`text-xs truncate ${mutedText}`}>{item.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Operational Queues Workspace (Server-Enforced) */}
      <section id="manager-operations-workspace" className="space-y-4 pt-2 border-t border-[#E7E1D8]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl font-bold">Live Operations Queue</h2>
            <p className={`text-xs ${mutedText}`}>
              Role: <span className="font-mono font-semibold text-[#A8421B]">{currentUser?.role}</span> • Verified via server session
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "enrollments", label: `Enrollments (${enrollments.length})`, icon: GraduationCap },
              { id: "payments", label: `Orders & Fees (${orders.length + feePayments.length})`, icon: CreditCard },
              { id: "mpesa_finance", label: "M-PESA Daraja Finance", icon: Smartphone },
              { id: "exams", label: `Exams & Grades (${attempts.length})`, icon: FileCheck2 },
              { id: "certificates", label: `Certificates (${certificates.length})`, icon: Award },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    active ? "bg-[#A8421B] text-white" : `border ${surface}`
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

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
                    {mpesaOverview?.config?.isLiveConfigured ? "🟢 Live Production Active" : "🟡 Sandbox / Test Mode"}
                  </span>
                </div>
              </div>

              <div className="text-xs space-y-2">
                <p className={mutedText}>
                  Secure HTTPS Callback Endpoint (Configured on Safaricom Developer Portal):
                </p>
                <div className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-900 font-mono text-[11px] text-stone-800 dark:text-stone-200 select-all border border-stone-200 dark:border-stone-800 break-all">
                  {mpesaOverview?.config?.callbackUrl || "https://complete-digital-app-486825715709.europe-west3.run.app/api/mpesa/callback"}
                </div>
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
    </div>
  );
}
