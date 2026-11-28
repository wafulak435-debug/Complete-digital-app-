import React, { useMemo, useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  GraduationCap,
  DollarSign,
  Package,
  Megaphone,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit3,
  Download,
  Plus,
  ArrowLeft,
  Building2,
  BarChart3,
  FileText,
  BookOpen,
  Heart,
  Clock,
  Check,
  Settings,
  CreditCard,
  UserPlus,
  UserMinus,
  Zap,
  History,
} from "lucide-react";
import {
  User,
  Book,
  BookOrder,
  MemberUploadRequest,
  AppSettings,
  SectionKey,
  SchoolCourseItem,
  MissionOutreachItem,
  MissionFieldReportItem,
  PrayerRequestItem,
  AuditLogItem,
  PaymentSettingsConfig,
} from "../types";
import { ZionButton, ZionCard, ZionAlert, ZionInput, ZionModal } from "./ZionDesignSystem";
import { exportPDF } from "../lib/docExporter";
import {
  isSuperAdmin as checkSuperAdmin,
  isManager as checkManager,
  isManagerForSection,
  getStoredUsers,
  saveStoredUsers,
  getStoredCourses,
  saveStoredCourses,
  getStoredBooks,
  saveStoredBooks,
  getStoredMissionEvents,
  saveStoredMissionEvents,
  getStoredMissionReports,
  saveStoredMissionReports,
  getStoredPrayerRequests,
  saveStoredPrayerRequests,
  getStoredAuditLogs,
  appendAuditLog,
  getStoredPaymentSettings,
  saveStoredPaymentSettings,
} from "../lib/zionRbac";
import { BOOKS_DEFAULT_COVER } from "../lib/showcase";

interface ZionAdminPortalProps {
  currentUser: User | null;
  onBack: () => void;
  books?: Book[];
  bookOrders?: BookOrder[];
  uploadRequests?: MemberUploadRequest[];
  globalSettings?: AppSettings;
  onUpdateSettings?: (settings: AppSettings) => void;
  onUpdateBroadcastAnnouncement?: (msg: string) => void;
  onAddNewBookDoc?: (book: Book) => void;
  onDeleteBookDoc?: (id: string) => void;
  onApproveBookOrder?: (id: string) => void;
  onRejectBookOrder?: (id: string) => void;
  onApproveUploadRequest?: (id: string) => void;
  onRejectUploadRequest?: (id: string) => void;
  onNavigate?: (view: string) => void;
}

type PortalTab =
  | "overview"
  | "school_1"
  | "school_2"
  | "bookstore"
  | "mission"
  | "team"
  | "payments"
  | "settings";

interface EnrolmentItem {
  id: string;
  studentName: string;
  admNo: string;
  section: "school_1" | "school_2";
  courseTitle: string;
  phone: string;
  status: "pending" | "approved" | "rejected";
  date: string;
  mpesaCode: string;
}

const SECTION_LABELS: Record<SectionKey, string> = {
  school_1: "School 1 (Leadership)",
  school_2: "School 2 (Bible Seminary)",
  bookstore: "Bookstore",
  mission: "Evangelism & Mission",
};

const ALL_SECTIONS: SectionKey[] = ["school_1", "school_2", "bookstore", "mission"];

const INITIAL_ENROLMENTS: EnrolmentItem[] = [
  {
    id: "enr-101",
    studentName: "Grace Wanjiku",
    admNo: "ADM-2026-001",
    section: "school_1",
    courseTitle: "Visionary Leadership and Strategic Governance",
    phone: "+254 712 345 678",
    status: "approved",
    date: "2026-05-20",
    mpesaCode: "QHD8912KL3",
  },
  {
    id: "enr-102",
    studentName: "Joseph Otieno",
    admNo: "ADM-2026-002",
    section: "school_1",
    courseTitle: "Applied Software Systems and ICT Programming",
    phone: "+254 733 112 233",
    status: "pending",
    date: "2026-05-26",
    mpesaCode: "QHD9923BB1",
  },
  {
    id: "enr-201",
    studentName: "Miriam Chebet",
    admNo: "ADM-2026-003",
    section: "school_2",
    courseTitle: "Old Testament Survey and Hebrew Covenants",
    phone: "+254 722 987 654",
    status: "pending",
    date: "2026-05-25",
    mpesaCode: "QHD6741MN9",
  },
];

export default function ZionAdminPortal({
  currentUser,
  onBack,
  books: propBooks = [],
  bookOrders: propOrders = [],
  uploadRequests = [],
  globalSettings,
  onUpdateSettings,
  onUpdateBroadcastAnnouncement,
  onAddNewBookDoc,
  onDeleteBookDoc,
  onApproveBookOrder,
  onRejectBookOrder,
  onApproveUploadRequest,
  onRejectUploadRequest,
}: ZionAdminPortalProps) {
  // Core RBAC data stores
  const [users, setUsers] = useState<User[]>(() => getStoredUsers());
  const [courses, setCourses] = useState<SchoolCourseItem[]>(() => getStoredCourses());
  const [localBooks, setLocalBooks] = useState<Book[]>(() =>
    propBooks.length > 0 ? propBooks : getStoredBooks()
  );
  const [missionEvents, setMissionEvents] = useState<MissionOutreachItem[]>(() =>
    getStoredMissionEvents()
  );
  const [missionReports, setMissionReports] = useState<MissionFieldReportItem[]>(() =>
    getStoredMissionReports()
  );
  const [prayerRequests, setPrayerRequests] = useState<PrayerRequestItem[]>(() =>
    getStoredPrayerRequests()
  );
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(() => getStoredAuditLogs());
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettingsConfig>(() =>
    getStoredPaymentSettings()
  );

  // Enrollments & Orders state
  const [enrolments, setEnrolments] = useState<EnrolmentItem[]>(() => {
    try {
      const saved = localStorage.getItem("ZION_ENROLMENTS_V2");
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return INITIAL_ENROLMENTS;
  });

  const [localOrders, setLocalOrders] = useState<BookOrder[]>(() => {
    if (propOrders && propOrders.length > 0) return propOrders;
    try {
      const saved = localStorage.getItem("ZION_BOOK_ORDERS");
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [
      {
        id: "ord-101",
        userId: "usr-david",
        userEmail: "david@example.com",
        userName: "David Barasa",
        bookId: "bk-101",
        bookTitle: "Covenant Leadership in Africa",
        price: 1200,
        paymentMethod: "M-Pesa",
        phoneNumber: "+254 712 889 900",
        status: "approved",
        date: "2026-05-22",
      },
      {
        id: "ord-102",
        userId: "usr-grace",
        userEmail: "grace@example.com",
        userName: "Grace Wanjiku",
        bookId: "bk-102",
        bookTitle: "Biblical Hermeneutics",
        price: 1450,
        paymentMethod: "M-Pesa",
        phoneNumber: "+254 720 334 455",
        status: "pending",
        date: "2026-05-24",
      },
    ];
  });

  const ordersToDisplay = propOrders.length > 0 ? propOrders : localOrders;
  const booksToDisplay = propBooks.length > 0 ? propBooks : localBooks;

  // Super Admin live role simulation (allows owner to verify manager isolation live)
  const realIsSuperAdmin = checkSuperAdmin(currentUser);
  const [simulatedUserId, setSimulatedUserId] = useState<string>("actual");

  const effectiveUser: User | null = useMemo(() => {
    if (realIsSuperAdmin && simulatedUserId !== "actual") {
      return users.find((u) => u.id === simulatedUserId) || currentUser;
    }
    if (currentUser) {
      const matched = users.find(
        (u) => u.email.toLowerCase() === currentUser.email.toLowerCase()
      );
      if (matched) {
        return {
          ...currentUser,
          role: matched.role,
          assigned_sections: matched.assigned_sections,
        };
      }
    }
    return currentUser;
  }, [currentUser, realIsSuperAdmin, simulatedUserId, users]);

  const isSuper = checkSuperAdmin(effectiveUser);
  const isMgr = checkManager(effectiveUser);
  const isAuthorized = isSuper || isMgr;
  const assignedSections: SectionKey[] = isSuper
    ? ALL_SECTIONS
    : Array.isArray(effectiveUser?.assigned_sections)
    ? effectiveUser!.assigned_sections!
    : [];

  const [activeTab, setActiveTab] = useState<PortalTab>("overview");
  const [notice, setNotice] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Modals & Form States
  const [courseModalSection, setCourseModalSection] = useState<"school_1" | "school_2" | null>(
    null
  );
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [courseDuration, setCourseDuration] = useState("4 Months");
  const [courseFee, setCourseFee] = useState(3500);
  const [courseDesc, setCourseDesc] = useState("");
  const [courseMaterialsInput, setCourseMaterialsInput] = useState("");
  const [courseAnnouncementInput, setCourseAnnouncementInput] = useState("");

  const [showBookModal, setShowBookModal] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState("");
  const [bookAuthor, setBookAuthor] = useState("");
  const [bookPrice, setBookPrice] = useState(1200);
  const [bookStock, setBookStock] = useState(25);
  const [bookCategory, setBookCategory] = useState("Leadership");
  const [bookDesc, setBookDesc] = useState("");
  const [bookIsPhysical, setBookIsPhysical] = useState(true);

  const [showEventModal, setShowEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventTheme, setEventTheme] = useState("");
  const [eventType, setEventType] = useState<"Physical Crusade" | "Online Crusade" | "Mission Trip">(
    "Physical Crusade"
  );
  const [eventVenue, setEventVenue] = useState("");
  const [eventDate, setEventDate] = useState("2026-07-15");
  const [eventDesc, setEventDesc] = useState("");

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTitle, setReportTitle] = useState("");
  const [reportLocation, setReportLocation] = useState("");
  const [reportSouls, setReportSouls] = useState(50);
  const [reportAttendees, setReportAttendees] = useState(400);
  const [reportNarrative, setReportNarrative] = useState("");

  const [broadcastInput, setBroadcastInput] = useState(() => {
    return localStorage.getItem("ZION_BROADCAST_ANNOUNCEMENT") || "";
  });

  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [auditFilterSection, setAuditFilterSection] = useState<string>("all");

  const flashNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  const recordAudit = (
    section: AuditLogItem["section"],
    action: AuditLogItem["action"],
    itemTitle: string,
    details?: string,
    itemId?: string
  ) => {
    const newLog = appendAuditLog({
      section,
      action,
      itemTitle,
      itemId,
      created_by: effectiveUser?.name || "System Operator",
      created_by_id: effectiveUser?.email || effectiveUser?.id || "system",
      details,
    });
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Strict UI Access Gate
  if (!isAuthorized) {
    return (
      <div className="p-8 text-center max-w-md mx-auto my-12 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl space-y-4 shadow-sm">
        <ShieldAlert className="h-12 w-12 text-red-700 mx-auto" />
        <h2 className="font-display text-lg font-bold uppercase tracking-tight text-stone-900 dark:text-white">
          Access Denied: Authorized Personnel Only
        </h2>
        <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
          Regular user accounts cannot access the administrative or departmental management portal.
          Your current role is <strong>{effectiveUser?.role || "guest"}</strong>.
        </p>
        {realIsSuperAdmin && (
          <ZionButton variant="secondary" onClick={() => setSimulatedUserId("actual")}>
            Return to Super Admin View
          </ZionButton>
        )}
        <div className="pt-1">
          <ZionButton variant="outline" onClick={onBack}>
            Return to Campus Store
          </ZionButton>
        </div>
      </div>
    );
  }

  // Strictly visible tabs computed from role and assigned_sections
  const visibleTabs: Array<{
    id: PortalTab;
    label: string;
    icon: React.ElementType;
    badge?: string;
  }> = [
    { id: "overview", label: "Overview & Quick Actions", icon: BarChart3 },
    ...(isManagerForSection(effectiveUser, "school_1")
      ? [{ id: "school_1" as PortalTab, label: "School 1: Leadership", icon: GraduationCap }]
      : []),
    ...(isManagerForSection(effectiveUser, "school_2")
      ? [{ id: "school_2" as PortalTab, label: "School 2: Bible Seminary", icon: BookOpen }]
      : []),
    ...(isManagerForSection(effectiveUser, "bookstore")
      ? [{ id: "bookstore" as PortalTab, label: "Bookstore & Orders", icon: Package }]
      : []),
    ...(isManagerForSection(effectiveUser, "mission")
      ? [{ id: "mission" as PortalTab, label: "Evangelism & Mission", icon: Heart }]
      : []),
    ...(isSuper
      ? [
          { id: "team" as PortalTab, label: "Team & Permissions", icon: Users, badge: "Super Admin" },
          { id: "payments" as PortalTab, label: "Payments & M-Pesa", icon: CreditCard, badge: "Super Admin" },
          { id: "settings" as PortalTab, label: "App Settings & Broadcast", icon: Settings, badge: "Super Admin" },
        ]
      : []),
  ];

  // Guard activeTab if user role/sections changed
  const isTabAllowed = visibleTabs.some((t) => t.id === activeTab);
  const safeActiveTab: PortalTab = isTabAllowed ? activeTab : "overview";

  // Pending counts for Quick Actions
  const pendingOrders = ordersToDisplay.filter((o) => o.status === "pending");
  const pendingUploads = uploadRequests.filter((u) => u.status === "pending");

  // -------------------------------------------------------------------------
  // QUICK ACTION HANDLERS (One-Click Approvals)
  // -------------------------------------------------------------------------
  const handleQuickApproveOrder = (order: BookOrder) => {
    if (!isManagerForSection(effectiveUser, "bookstore")) {
      setErrorBanner("Unauthorized: Bookstore permission required to approve orders.");
      return;
    }
    if (onApproveBookOrder) {
      onApproveBookOrder(order.id);
    } else {
      const updated = localOrders.map((o) =>
        o.id === order.id ? { ...o, status: "approved" as const } : o
      );
      setLocalOrders(updated);
      localStorage.setItem("ZION_BOOK_ORDERS", JSON.stringify(updated));
    }
    recordAudit("bookstore", "order", `Approved Order #${order.id}`, `Customer: ${order.userName} (KES ${order.price})`);
    flashNotice(`Order #${order.id} for ${order.userName} approved.`);
  };

  const handleQuickRejectOrder = (order: BookOrder) => {
    if (!isManagerForSection(effectiveUser, "bookstore")) return;
    if (onRejectBookOrder) {
      onRejectBookOrder(order.id);
    } else {
      const updated = localOrders.map((o) =>
        o.id === order.id ? { ...o, status: "rejected" as const } : o
      );
      setLocalOrders(updated);
      localStorage.setItem("ZION_BOOK_ORDERS", JSON.stringify(updated));
    }
    recordAudit("bookstore", "order", `Rejected Order #${order.id}`, `Customer: ${order.userName}`);
    flashNotice(`Order #${order.id} rejected.`);
  };

  const handleQuickApproveUpload = (req: MemberUploadRequest) => {
    if (!isSuper && !isManagerForSection(effectiveUser, "bookstore") && !isManagerForSection(effectiveUser, "school_1")) {
      setErrorBanner("Unauthorized: Academic or Bookstore manager permission required.");
      return;
    }
    if (onApproveUploadRequest) {
      onApproveUploadRequest(req.id);
    }
    recordAudit("bookstore", "create", `Approved Member Upload: ${req.title}`, `Submitted by ${req.userName}`, req.id);
    flashNotice(`Member upload "${req.title}" approved and published.`);
  };

  const handleQuickRejectUpload = (req: MemberUploadRequest) => {
    if (onRejectUploadRequest) {
      onRejectUploadRequest(req.id);
    }
    recordAudit("bookstore", "delete", `Rejected Member Upload: ${req.title}`, `Submitted by ${req.userName}`, req.id);
    flashNotice(`Member upload "${req.title}" rejected.`);
  };

  // -------------------------------------------------------------------------
  // SCHOOL 1 & SCHOOL 2 COURSE CRUD HANDLERS
  // -------------------------------------------------------------------------
  const openCreateCourse = (section: "school_1" | "school_2") => {
    setEditingCourseId(null);
    setCourseTitle("");
    setCourseCode(section === "school_1" ? "LDR-" : "BIB-");
    setCourseDuration("4 Months");
    setCourseFee(section === "school_1" ? 4500 : 3000);
    setCourseDesc("");
    setCourseMaterialsInput("Core Syllabus PDF, Lecture Slides");
    setCourseAnnouncementInput("");
    setCourseModalSection(section);
  };

  const openEditCourse = (c: SchoolCourseItem) => {
    setEditingCourseId(c.id);
    setCourseTitle(c.title);
    setCourseCode(c.courseCode);
    setCourseDuration(c.duration);
    setCourseFee(c.feeKes);
    setCourseDesc(c.description);
    setCourseMaterialsInput(c.studyMaterials.join(", "));
    setCourseAnnouncementInput(c.announcements[0] || "");
    setCourseModalSection(c.section);
  };

  const handleSaveCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseModalSection || !courseTitle.trim()) return;
    if (!isManagerForSection(effectiveUser, courseModalSection)) {
      setErrorBanner(`Unauthorized: You do not hold access to ${courseModalSection}.`);
      return;
    }

    const materials = courseMaterialsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const announcements = courseAnnouncementInput.trim() ? [courseAnnouncementInput.trim()] : [];

    if (editingCourseId) {
      const updated = courses.map((c) =>
        c.id === editingCourseId
          ? {
              ...c,
              title: courseTitle.trim(),
              courseCode: courseCode.trim(),
              duration: courseDuration.trim(),
              feeKes: Number(courseFee) || 0,
              description: courseDesc.trim(),
              studyMaterials: materials,
              announcements: announcements.length > 0 ? announcements : c.announcements,
            }
          : c
      );
      setCourses(updated);
      saveStoredCourses(updated);
      recordAudit(courseModalSection, "update", `Course: ${courseTitle.trim()}`, `Code ${courseCode}`, editingCourseId);
      flashNotice(`Updated course "${courseTitle.trim()}".`);
    } else {
      const newCourse: SchoolCourseItem = {
        id: `crs-${Date.now()}`,
        section: courseModalSection,
        title: courseTitle.trim(),
        courseCode: courseCode.trim() || "ZION-101",
        description: courseDesc.trim() || "Accredited Zion Academy program.",
        duration: courseDuration.trim() || "4 Months",
        feeKes: Number(courseFee) || 0,
        lessonsCount: 10,
        studyMaterials: materials,
        assignments: [],
        announcements,
        enrolledStudents: [],
        created_by: effectiveUser?.name || "Manager",
        created_by_id: effectiveUser?.email || "system",
        created_at: new Date().toISOString(),
      };
      const updated = [newCourse, ...courses];
      setCourses(updated);
      saveStoredCourses(updated);
      recordAudit(courseModalSection, "create", `Course: ${newCourse.title}`, `Code ${newCourse.courseCode}`, newCourse.id);
      flashNotice(`Added new course "${newCourse.title}" to ${SECTION_LABELS[courseModalSection]}.`);
    }
    setCourseModalSection(null);
  };

  const handleDeleteCourse = (c: SchoolCourseItem) => {
    if (!isManagerForSection(effectiveUser, c.section)) return;
    const updated = courses.filter((item) => item.id !== c.id);
    setCourses(updated);
    saveStoredCourses(updated);
    recordAudit(c.section, "delete", `Deleted Course: ${c.title}`, `Code ${c.courseCode}`, c.id);
    flashNotice(`Removed course "${c.title}".`);
  };

  const handleUpdateEnrolment = (id: string, status: "approved" | "rejected") => {
    const target = enrolments.find((e) => e.id === id);
    if (!target || !isManagerForSection(effectiveUser, target.section)) return;
    const updated = enrolments.map((e) => (e.id === id ? { ...e, status } : e));
    setEnrolments(updated);
    localStorage.setItem("ZION_ENROLMENTS_V2", JSON.stringify(updated));
    recordAudit(target.section, "enroll", `Enrollment ${status}: ${target.studentName}`, target.courseTitle, id);
    flashNotice(`Enrollment for ${target.studentName} marked as ${status}.`);
  };

  // -------------------------------------------------------------------------
  // BOOKSTORE CRUD HANDLERS
  // -------------------------------------------------------------------------
  const openCreateBook = () => {
    setEditingBookId(null);
    setBookTitle("");
    setBookAuthor("");
    setBookPrice(1200);
    setBookStock(30);
    setBookCategory("Leadership");
    setBookDesc("");
    setBookIsPhysical(true);
    setShowBookModal(true);
  };

  const openEditBook = (b: Book) => {
    setEditingBookId(b.id);
    setBookTitle(b.title);
    setBookAuthor(b.author);
    setBookPrice(b.price);
    setBookStock(b.stockQuantity ?? 20);
    setBookCategory(b.category);
    setBookDesc(b.description);
    setBookIsPhysical(b.isPhysical ?? true);
    setShowBookModal(true);
  };

  const handleSaveBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isManagerForSection(effectiveUser, "bookstore") || !bookTitle.trim()) return;

    if (editingBookId) {
      const updated = booksToDisplay.map((b) =>
        b.id === editingBookId
          ? {
              ...b,
              title: bookTitle.trim(),
              author: bookAuthor.trim() || b.author,
              price: Number(bookPrice) || 0,
              stockQuantity: Number(bookStock) || 0,
              isPhysical: bookIsPhysical,
              category: bookCategory as any,
              description: bookDesc.trim(),
            }
          : b
      );
      setLocalBooks(updated);
      saveStoredBooks(updated);
      recordAudit("bookstore", "update", `Book: ${bookTitle.trim()}`, `KES ${bookPrice} | Stock: ${bookStock}`, editingBookId);
      flashNotice(`Updated book "${bookTitle.trim()}".`);
    } else {
      const newBook: Book = {
        id: `bk-${Date.now()}`,
        title: bookTitle.trim(),
        author: bookAuthor.trim() || "Zion Academic Press",
        price: Number(bookPrice) || 1000,
        stockQuantity: Number(bookStock) || 25,
        isPhysical: bookIsPhysical,
        category: bookCategory as any,
        description: bookDesc.trim() || "Official Zion Digital catalog publication.",
        coverImage: BOOKS_DEFAULT_COVER,
        fileSize: "4.5MB",
        pages: 180,
        publishedDate: new Date().toISOString().split("T")[0],
        isFeatured: false,
        status: "active",
        rating: 5,
        reviewsCount: 1,
        created_by: effectiveUser?.name || "Manager",
        created_by_id: effectiveUser?.email || "system",
        created_at: new Date().toISOString(),
      };
      if (onAddNewBookDoc) onAddNewBookDoc(newBook);
      const updated = [newBook, ...localBooks];
      setLocalBooks(updated);
      saveStoredBooks(updated);
      recordAudit("bookstore", "create", `Book: ${newBook.title}`, `KES ${newBook.price} | Stock: ${newBook.stockQuantity}`, newBook.id);
      flashNotice(`Published "${newBook.title}" to Bookstore.`);
    }
    setShowBookModal(false);
  };

  const handleDeleteBook = (b: Book) => {
    if (!isManagerForSection(effectiveUser, "bookstore")) return;
    if (onDeleteBookDoc) onDeleteBookDoc(b.id);
    const updated = localBooks.filter((item) => item.id !== b.id);
    setLocalBooks(updated);
    saveStoredBooks(updated);
    recordAudit("bookstore", "delete", `Deleted Book: ${b.title}`, undefined, b.id);
    flashNotice(`Deleted book "${b.title}".`);
  };

  // -------------------------------------------------------------------------
  // EVANGELISM & MISSION HANDLERS
  // -------------------------------------------------------------------------
  const handleCreateMissionEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isManagerForSection(effectiveUser, "mission") || !eventTitle.trim()) return;
    const newEvt: MissionOutreachItem = {
      id: `msn-${Date.now()}`,
      title: eventTitle.trim(),
      theme: eventTheme.trim() || "Advancing the Gospel",
      type: eventType,
      venue: eventVenue.trim() || "Bungoma Main Grounds",
      date: eventDate,
      time: "09:00 EAT",
      expectedAttendance: 1000,
      rsvpsCount: 0,
      registeredVolunteers: [],
      description: eventDesc.trim() || "Community evangelism outreach.",
      status: "upcoming",
      created_by: effectiveUser?.name || "Mission Director",
      created_by_id: effectiveUser?.email || "system",
      created_at: new Date().toISOString(),
    };
    const updated = [newEvt, ...missionEvents];
    setMissionEvents(updated);
    saveStoredMissionEvents(updated);
    recordAudit("mission", "create", `Outreach Event: ${newEvt.title}`, `${newEvt.type} at ${newEvt.venue}`, newEvt.id);
    setShowEventModal(false);
    setEventTitle("");
    setEventTheme("");
    setEventVenue("");
    setEventDesc("");
    flashNotice(`Outreach event "${newEvt.title}" scheduled.`);
  };

  const handleDeleteMissionEvent = (evt: MissionOutreachItem) => {
    if (!isManagerForSection(effectiveUser, "mission")) return;
    const updated = missionEvents.filter((item) => item.id !== evt.id);
    setMissionEvents(updated);
    saveStoredMissionEvents(updated);
    recordAudit("mission", "delete", `Deleted Outreach Event: ${evt.title}`, undefined, evt.id);
    flashNotice(`Removed event "${evt.title}".`);
  };

  const handleCreateFieldReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isManagerForSection(effectiveUser, "mission") || !reportTitle.trim()) return;
    const newRep: MissionFieldReportItem = {
      id: `rep-${Date.now()}`,
      title: reportTitle.trim(),
      location: reportLocation.trim() || "Western Kenya",
      date: new Date().toISOString().split("T")[0],
      narrative: reportNarrative.trim(),
      soulsSavedCount: Number(reportSouls) || 0,
      attendeesCount: Number(reportAttendees) || 0,
      created_by: effectiveUser?.name || "Mission Director",
      created_by_id: effectiveUser?.email || "system",
      created_at: new Date().toISOString(),
    };
    const updated = [newRep, ...missionReports];
    setMissionReports(updated);
    saveStoredMissionReports(updated);
    recordAudit("mission", "create", `Field Report: ${newRep.title}`, `${newRep.soulsSavedCount} souls recorded`, newRep.id);
    setShowReportModal(false);
    setReportTitle("");
    setReportLocation("");
    setReportNarrative("");
    flashNotice(`Published field report "${newRep.title}".`);
  };

  const handleModeratePrayer = (id: string, action: "approve" | "delete") => {
    if (!isManagerForSection(effectiveUser, "mission")) return;
    const target = prayerRequests.find((p) => p.id === id);
    if (action === "approve") {
      const updated = prayerRequests.map((p) =>
        p.id === id ? { ...p, status: "approved" as const } : p
      );
      setPrayerRequests(updated);
      saveStoredPrayerRequests(updated);
      recordAudit("mission", "update", `Approved Prayer Request (${target?.authorName})`, undefined, id);
      flashNotice("Prayer request approved for community prayer wall.");
    } else {
      const updated = prayerRequests.filter((p) => p.id !== id);
      setPrayerRequests(updated);
      saveStoredPrayerRequests(updated);
      recordAudit("mission", "delete", `Removed Prayer Request (${target?.authorName})`, undefined, id);
      flashNotice("Prayer request deleted.");
    }
  };

  // -------------------------------------------------------------------------
  // SUPER ADMIN: TEAM MANAGEMENT & PERMISSIONS
  // -------------------------------------------------------------------------
  const handleToggleUserRole = (userId: string, nextRole: "manager" | "user") => {
    if (!isSuper) return;
    const target = users.find((u) => u.id === userId);
    if (!target || checkSuperAdmin(target)) return;

    const updated = users.map((u) => {
      if (u.id !== userId) return u;
      return {
        ...u,
        role: nextRole,
        assigned_sections: nextRole === "user" ? [] : u.assigned_sections || [],
      };
    });
    setUsers(updated);
    saveStoredUsers(updated);
    recordAudit(
      "admin",
      nextRole === "manager" ? "promote" : "revoke",
      `${nextRole === "manager" ? "Promoted" : "Revoked"} ${target.name}`,
      `Role changed to ${nextRole}`,
      userId
    );
    flashNotice(`${target.name} updated to ${nextRole.toUpperCase()}.`);
  };

  const handleToggleAssignedSection = (userId: string, section: SectionKey) => {
    if (!isSuper) return;
    const target = users.find((u) => u.id === userId);
    if (!target || checkSuperAdmin(target)) return;

    const currentSections = Array.isArray(target.assigned_sections)
      ? target.assigned_sections
      : [];
    const exists = currentSections.includes(section);
    const nextSections = exists
      ? currentSections.filter((s) => s !== section)
      : [...currentSections, section];

    const updated = users.map((u) =>
      u.id === userId
        ? {
            ...u,
            role: nextSections.length > 0 ? ("manager" as const) : u.role,
            assigned_sections: nextSections,
          }
        : u
    );
    setUsers(updated);
    saveStoredUsers(updated);
    recordAudit(
      "admin",
      "permission_change",
      `${exists ? "Revoked" : "Granted"} ${SECTION_LABELS[section]} for ${target.name}`,
      `Assigned sections: [${nextSections.join(", ")}]`,
      userId
    );
    flashNotice(
      `Updated ${target.name} assigned_sections: [${nextSections.join(", ") || "None"}]`
    );
  };

  const handleRegisterTeamMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuper || !newUserEmail.trim() || !newUserName.trim()) return;
    const exists = users.some(
      (u) => u.email.toLowerCase() === newUserEmail.trim().toLowerCase()
    );
    if (exists) {
      setErrorBanner("A user with this email already exists in the directory.");
      return;
    }
    const newUser: User = {
      id: `usr-${Date.now()}`,
      name: newUserName.trim(),
      email: newUserEmail.trim().toLowerCase(),
      role: "user",
      assigned_sections: [],
      createdAt: new Date().toISOString(),
    };
    const updated = [newUser, ...users];
    setUsers(updated);
    saveStoredUsers(updated);
    recordAudit("admin", "create", `Registered User: ${newUser.name}`, newUser.email, newUser.id);
    setNewUserName("");
    setNewUserEmail("");
    flashNotice(`Registered user ${newUser.name}. Promote to Manager and assign sections below.`);
  };

  const handleSavePaymentSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuper) return;
    const updated: PaymentSettingsConfig = {
      ...paymentSettings,
      updatedAt: new Date().toISOString(),
      updatedBy: effectiveUser?.name || "Super Admin",
    };
    setPaymentSettings(updated);
    saveStoredPaymentSettings(updated);
    recordAudit("admin", "update", "Updated M-Pesa & Paystack Payment Settings");
    flashNotice("Payment gateway credentials saved securely.");
  };

  const handlePublishBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuper) return;
    const clean = broadcastInput.trim();
    localStorage.setItem("ZION_BROADCAST_ANNOUNCEMENT", clean);
    if (onUpdateBroadcastAnnouncement) {
      onUpdateBroadcastAnnouncement(clean);
    }
    if (onUpdateSettings && globalSettings) {
      onUpdateSettings({ ...globalSettings });
    }
    recordAudit("admin", "update", clean ? "Published Global Announcement" : "Cleared Global Announcement", clean);
    flashNotice(clean ? "Global announcement published." : "Global announcement cleared.");
  };

  const handleExportAuditPdf = () => {
    const lines = [
      "# Zion Digital Institutional Audit Trail",
      `Exported by: ${effectiveUser?.name} (${effectiveUser?.role})`,
      `Timestamp: ${new Date().toISOString()}`,
      "",
      ...auditLogs.map(
        (l) =>
          `- [${l.created_at}] [${l.section.toUpperCase()}] (${l.action.toUpperCase()}) ${l.itemTitle} | By: ${l.created_by} (${l.created_by_id})`
      ),
    ].join("\n");
    exportPDF("Zion RBAC Audit Trail", lines);
  };

  const filteredAuditLogs = auditLogs.filter((l) =>
    auditFilterSection === "all" ? true : l.section === auditFilterSection
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 min-h-screen">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:bg-stone-100 text-stone-700 dark:text-stone-300 transition cursor-pointer shadow-xs"
            title="Return to campus"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <span className="text-[10px] font-mono font-bold text-stone-400 uppercase tracking-widest block">
              Zion Digital Enterprise Governance
            </span>
            <h1 className="font-display text-2xl font-black uppercase tracking-tight text-[#0B254D] dark:text-white">
              {isSuper
                ? "Super Admin Command Center"
                : "Departmental Manager Portal"}
            </h1>
          </div>
        </div>

        {/* Role Identity & Super Admin Live Role Simulator */}
        <div className="flex flex-wrap items-center gap-2.5">
          {realIsSuperAdmin && (
            <div className="flex items-center gap-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 px-3 py-1.5 rounded-xl shadow-xs">
              <span className="text-[10px] font-mono font-bold uppercase text-stone-500">
                Test RBAC View:
              </span>
              <select
                value={simulatedUserId}
                onChange={(e) => {
                  setSimulatedUserId(e.target.value);
                  setActiveTab("overview");
                }}
                className="text-xs font-bold bg-transparent text-[#0B254D] dark:text-white outline-none cursor-pointer"
                aria-label="Preview role permissions"
              >
                <option value="actual">Actual Account (Super Admin)</option>
                {users
                  .filter((u) => !checkSuperAdmin(u))
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role}: {u.assigned_sections?.join(", ") || "none"})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {isSuper ? (
            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0B254D] text-[#F5B82E] border border-[#F5B82E]/40 text-xs font-bold font-mono shadow-xs">
              <ShieldCheck className="h-4 w-4 text-[#F5B82E]" />
              <span>Role: SUPER_ADMIN (All Sections)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800 text-xs font-bold font-mono shadow-xs">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span>
                Role: MANAGER ({assignedSections.length > 0 ? assignedSections.join(", ") : "No Sections"})
              </span>
            </div>
          )}
        </div>
      </div>

      {notice && (
        <ZionAlert variant="success" title="Action Completed">
          {notice}
        </ZionAlert>
      )}
      {errorBanner && (
        <ZionAlert variant="error" title="Permission Blocked">
          {errorBanner}
        </ZionAlert>
      )}

      {/* Dynamic Navigation Tabs (Strictly Filtered by Role & assigned_sections) */}
      <nav aria-label="Portal Navigation Tabs" className="flex flex-wrap gap-2 border-b border-stone-200 dark:border-stone-800 pb-4">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const active = safeActiveTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setErrorBanner(null);
                setActiveTab(tab.id);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                active
                  ? "bg-[#0B254D] text-white shadow-xs"
                  : "bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 shadow-xs"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-bold ${
                    active ? "bg-[#F5B82E] text-[#0B254D]" : "bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* =====================================================================
          TAB: OVERVIEW & MANAGER QUICK ACTIONS
      ===================================================================== */}
      {safeActiveTab === "overview" && (
        <div className="space-y-6">
          <ZionAlert
            variant="info"
            title={isSuper ? "Super Admin Clearance Active" : "Department Manager Scope"}
          >
            {isSuper
              ? "You have full CRUD access across School 1, School 2, Bookstore, Evangelism & Mission, Team Role Delegation, Payment Settings, and Audit Trails."
              : `Strict RBAC isolation is active. You hold full CRUD authority exclusively for your assigned sections: ${
                  assignedSections.length > 0
                    ? assignedSections.map((s) => SECTION_LABELS[s]).join(" and ")
                    : "None assigned yet"
                }.`}
          </ZionAlert>

          {/* Metrics Grid Scoped to Assigned Sections */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {isManagerForSection(effectiveUser, "school_1") && (
              <ZionCard title="School 1: Leadership">
                <p className="text-3xl font-black text-[#0B254D] dark:text-white">
                  {courses.filter((c) => c.section === "school_1").length} Courses
                </p>
                <p className="text-xs text-stone-500 mt-1">
                  {enrolments.filter((e) => e.section === "school_1" && e.status === "pending").length} Pending Applications
                </p>
              </ZionCard>
            )}

            {isManagerForSection(effectiveUser, "school_2") && (
              <ZionCard title="School 2: Bible Seminary">
                <p className="text-3xl font-black text-[#0B254D] dark:text-white">
                  {courses.filter((c) => c.section === "school_2").length} Courses
                </p>
                <p className="text-xs text-stone-500 mt-1">
                  {enrolments.filter((e) => e.section === "school_2" && e.status === "pending").length} Pending Applications
                </p>
              </ZionCard>
            )}

            {isManagerForSection(effectiveUser, "bookstore") && (
              <ZionCard title="Bookstore Inventory & Orders">
                <p className="text-3xl font-black text-[#0B254D] dark:text-white">
                  {booksToDisplay.length} Books
                </p>
                <p className="text-xs text-amber-700 font-semibold mt-1">
                  {pendingOrders.length} Pending Orders
                </p>
              </ZionCard>
            )}

            {isManagerForSection(effectiveUser, "mission") && (
              <ZionCard title="Evangelism & Mission">
                <p className="text-3xl font-black text-[#0B254D] dark:text-white">
                  {missionEvents.length} Outreaches
                </p>
                <p className="text-xs text-stone-500 mt-1">
                  {prayerRequests.filter((p) => p.status === "pending").length} Prayer Moderation Queue
                </p>
              </ZionCard>
            )}
          </div>

          {/* QUICK ACTIONS PANEL (One-Click Order & Upload Approvals) */}
          <ZionCard
            title="Quick Actions: One-Click Approvals"
            subtitle="Instantly approve or reject pending bookstore orders and member document uploads"
          >
            <div className="grid gap-6 lg:grid-cols-2 pt-2">
              {/* Pending Book Orders Queue */}
              {isManagerForSection(effectiveUser, "bookstore") ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-[#F5B82E]" />
                      <span>Pending Book Orders ({pendingOrders.length})</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setActiveTab("bookstore")}
                      className="text-[11px] font-bold text-[#155EEF] hover:underline cursor-pointer"
                    >
                      Open Bookstore Tab
                    </button>
                  </div>

                  {pendingOrders.length === 0 ? (
                    <p className="text-xs text-stone-500 py-4 bg-stone-50 dark:bg-stone-900 rounded-xl px-4">
                      All bookstore orders have been processed. No pending approvals.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {pendingOrders.map((ord) => (
                        <div
                          key={ord.id}
                          className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="text-xs">
                            <p className="font-bold text-stone-900 dark:text-white">
                              #{ord.id} - {ord.userName}
                            </p>
                            <p className="text-[11px] text-stone-500">
                              KES {(ord.price || 0).toLocaleString()} | {ord.bookTitle}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <ZionButton
                              variant="primary"
                              className="px-2.5 py-1.5 text-[11px]"
                              onClick={() => handleQuickApproveOrder(ord)}
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Approve</span>
                            </ZionButton>
                            <ZionButton
                              variant="outline"
                              className="px-2.5 py-1.5 text-[11px]"
                              onClick={() => handleQuickRejectOrder(ord)}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              <span>Reject</span>
                            </ZionButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-stone-200 dark:border-stone-800 text-xs text-stone-500 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-stone-400 shrink-0" />
                  <span>Bookstore order approvals require Bookstore section assignment.</span>
                </div>
              )}

              {/* Pending Member Uploads Queue */}
              {isSuper ||
              isManagerForSection(effectiveUser, "bookstore") ||
              isManagerForSection(effectiveUser, "school_1") ||
              isManagerForSection(effectiveUser, "school_2") ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-[#F5B82E]" />
                      <span>Pending Member Uploads ({pendingUploads.length})</span>
                    </h4>
                  </div>

                  {pendingUploads.length === 0 ? (
                    <p className="text-xs text-stone-500 py-4 bg-stone-50 dark:bg-stone-900 rounded-xl px-4">
                      No pending member uploads awaiting review.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {pendingUploads.map((req) => (
                        <div
                          key={req.id}
                          className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="text-xs">
                            <p className="font-bold text-stone-900 dark:text-white">{req.title}</p>
                            <p className="text-[11px] text-stone-500">
                              By {req.userName} ({req.fileSize}) | {req.date}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <ZionButton
                              variant="primary"
                              className="px-2.5 py-1.5 text-[11px]"
                              onClick={() => handleQuickApproveUpload(req)}
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Approve</span>
                            </ZionButton>
                            <ZionButton
                              variant="outline"
                              className="px-2.5 py-1.5 text-[11px]"
                              onClick={() => handleQuickRejectUpload(req)}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              <span>Reject</span>
                            </ZionButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-stone-200 dark:border-stone-800 text-xs text-stone-500 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-stone-400 shrink-0" />
                  <span>Member upload approvals require School or Bookstore section assignment.</span>
                </div>
              )}
            </div>
          </ZionCard>
        </div>
      )}

      {/* =====================================================================
          TAB: SCHOOL 1 & SCHOOL 2 MANAGEMENT (Strictly Gated by SectionKey)
      ===================================================================== */}
      {(safeActiveTab === "school_1" || safeActiveTab === "school_2") && (
        <div className="space-y-6">
          {!isManagerForSection(effectiveUser, safeActiveTab) ? (
            <ZionAlert variant="error" title="Section Access Denied">
              You do not have permission to view or manage {SECTION_LABELS[safeActiveTab]}.
            </ZionAlert>
          ) : (
            <>
              <ZionCard
                title={`${SECTION_LABELS[safeActiveTab]} - Course Catalog & Materials`}
                subtitle="Create, edit, or remove accredited courses, study materials, assignments, and announcements"
              >
                <div className="flex justify-between items-center pb-4 border-b border-stone-200 dark:border-stone-800">
                  <span className="text-xs text-stone-500 font-medium">
                    Showing {courses.filter((c) => c.section === safeActiveTab).length} active courses
                  </span>
                  <ZionButton variant="primary" onClick={() => openCreateCourse(safeActiveTab)}>
                    <Plus className="h-4 w-4" />
                    <span>Add Course</span>
                  </ZionButton>
                </div>

                <div className="overflow-x-auto pt-4">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-stone-200 dark:border-stone-800 text-[10px] font-mono uppercase text-stone-500">
                        <th className="py-2.5 px-3">Code</th>
                        <th className="py-2.5 px-3">Course Title</th>
                        <th className="py-2.5 px-3">Fee (KES)</th>
                        <th className="py-2.5 px-3">Materials / Assignments</th>
                        <th className="py-2.5 px-3">Audit Trail</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                      {courses
                        .filter((c) => c.section === safeActiveTab)
                        .map((c) => (
                          <tr key={c.id} className="hover:bg-stone-50 dark:hover:bg-stone-900/50">
                            <td className="py-3 px-3 font-mono font-bold text-[#0B254D] dark:text-[#F5B82E]">
                              {c.courseCode}
                            </td>
                            <td className="py-3 px-3">
                              <p className="font-bold text-stone-900 dark:text-white">{c.title}</p>
                              <p className="text-[11px] text-stone-500 line-clamp-1">{c.description}</p>
                            </td>
                            <td className="py-3 px-3 font-mono font-bold">
                              KES {c.feeKes.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-stone-600 dark:text-stone-400">
                              {c.studyMaterials.length} Materials | {c.assignments.length} Assignments
                            </td>
                            <td className="py-3 px-3 text-[10px] font-mono text-stone-500">
                              <div>{c.created_by}</div>
                              <div>{new Date(c.created_at).toLocaleDateString()}</div>
                            </td>
                            <td className="py-3 px-3 text-right space-x-2 whitespace-nowrap">
                              <ZionButton variant="outline" className="px-2.5 py-1.5 text-[11px]" onClick={() => openEditCourse(c)}>
                                <Edit3 className="h-3.5 w-3.5" />
                                <span>Edit</span>
                              </ZionButton>
                              <ZionButton variant="outline" className="px-2.5 py-1.5 text-[11px]" onClick={() => handleDeleteCourse(c)}>
                                <Trash2 className="h-3.5 w-3.5 text-red-600" />
                              </ZionButton>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </ZionCard>

              {/* Enrollments Table */}
              <ZionCard
                title={`${SECTION_LABELS[safeActiveTab]} - Student Enrollments`}
                subtitle="Approve or reject student matriculation requests"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-stone-200 dark:border-stone-800 text-[10px] font-mono uppercase text-stone-500">
                        <th className="py-2.5 px-3">Adm No</th>
                        <th className="py-2.5 px-3">Student</th>
                        <th className="py-2.5 px-3">Course</th>
                        <th className="py-2.5 px-3">M-Pesa Ref</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                      {enrolments
                        .filter((e) => e.section === safeActiveTab)
                        .map((e) => (
                          <tr key={e.id}>
                            <td className="py-3 px-3 font-mono font-bold">{e.admNo}</td>
                            <td className="py-3 px-3 font-bold">{e.studentName}</td>
                            <td className="py-3 px-3 text-stone-600 dark:text-stone-400">{e.courseTitle}</td>
                            <td className="py-3 px-3 font-mono">{e.mpesaCode}</td>
                            <td className="py-3 px-3">
                              <span
                                className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                                  e.status === "approved"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : e.status === "rejected"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {e.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right space-x-2 whitespace-nowrap">
                              {e.status === "pending" && (
                                <>
                                  <ZionButton
                                    variant="primary"
                                    className="px-2.5 py-1.5 text-[11px]"
                                    onClick={() => handleUpdateEnrolment(e.id, "approved")}
                                  >
                                    Approve
                                  </ZionButton>
                                  <ZionButton
                                    variant="outline"
                                    className="px-2.5 py-1.5 text-[11px]"
                                    onClick={() => handleUpdateEnrolment(e.id, "rejected")}
                                  >
                                    Reject
                                  </ZionButton>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </ZionCard>
            </>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB: BOOKSTORE MANAGEMENT (Strictly Gated by 'bookstore')
      ===================================================================== */}
      {safeActiveTab === "bookstore" && (
        <div className="space-y-6">
          {!isManagerForSection(effectiveUser, "bookstore") ? (
            <ZionAlert variant="error" title="Section Access Denied">
              You do not hold Bookstore permissions.
            </ZionAlert>
          ) : (
            <>
              <ZionCard
                title="Bookstore Catalog & Inventory (KES)"
                subtitle="Upload, edit, or delete digital and physical books, Bibles, and study guides"
              >
                <div className="flex justify-between items-center pb-4 border-b border-stone-200 dark:border-stone-800">
                  <span className="text-xs text-stone-500">
                    Total active volumes: {booksToDisplay.length}
                  </span>
                  <ZionButton variant="primary" onClick={openCreateBook}>
                    <Plus className="h-4 w-4" />
                    <span>Upload Book Volume</span>
                  </ZionButton>
                </div>

                <div className="overflow-x-auto pt-4">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-stone-200 dark:border-stone-800 text-[10px] font-mono uppercase text-stone-500">
                        <th className="py-2.5 px-3">Title &amp; Author</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Price</th>
                        <th className="py-2.5 px-3">Stock</th>
                        <th className="py-2.5 px-3">Audit Trail</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                      {booksToDisplay.map((b) => (
                        <tr key={b.id} className="hover:bg-stone-50 dark:hover:bg-stone-900/50">
                          <td className="py-3 px-3">
                            <p className="font-bold text-stone-900 dark:text-white">{b.title}</p>
                            <p className="text-[11px] text-stone-500">{b.author}</p>
                          </td>
                          <td className="py-3 px-3">{b.category}</td>
                          <td className="py-3 px-3 font-mono font-bold">
                            KES {b.price.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 font-mono">
                            {b.isPhysical !== false ? `${b.stockQuantity ?? 25} units` : "Digital PDF"}
                          </td>
                          <td className="py-3 px-3 text-[10px] font-mono text-stone-500">
                            <div>{b.created_by || b.author}</div>
                            <div>{b.created_at ? new Date(b.created_at).toLocaleDateString() : b.publishedDate}</div>
                          </td>
                          <td className="py-3 px-3 text-right space-x-2 whitespace-nowrap">
                            <ZionButton variant="outline" className="px-2.5 py-1.5 text-[11px]" onClick={() => openEditBook(b)}>
                              <Edit3 className="h-3.5 w-3.5" />
                              <span>Edit</span>
                            </ZionButton>
                            <ZionButton variant="outline" className="px-2.5 py-1.5 text-[11px]" onClick={() => handleDeleteBook(b)}>
                              <Trash2 className="h-3.5 w-3.5 text-red-600" />
                            </ZionButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ZionCard>

              <ZionCard
                title="Customer Orders & Fulfillment"
                subtitle="Approve and fulfill digital or physical book orders"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-stone-200 dark:border-stone-800 text-[10px] font-mono uppercase text-stone-500">
                        <th className="py-2.5 px-3">Order ID</th>
                        <th className="py-2.5 px-3">Customer</th>
                        <th className="py-2.5 px-3">Items</th>
                        <th className="py-2.5 px-3">Total (KES)</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                      {ordersToDisplay.map((ord) => (
                        <tr key={ord.id}>
                          <td className="py-3 px-3 font-mono font-bold">{ord.id}</td>
                          <td className="py-3 px-3">
                            <div className="font-bold">{ord.userName}</div>
                            <div className="text-[11px] text-stone-500">{ord.phoneNumber || ord.userEmail || ""}</div>
                          </td>
                          <td className="py-3 px-3 text-stone-600 dark:text-stone-400">
                            {ord.bookTitle}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold">
                            KES {(ord.price || 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                                ord.status === "approved"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : ord.status === "rejected"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {ord.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right space-x-2 whitespace-nowrap">
                            {ord.status === "pending" && (
                              <>
                                <ZionButton
                                  variant="primary"
                                  className="px-2.5 py-1.5 text-[11px]"
                                  onClick={() => handleQuickApproveOrder(ord)}
                                >
                                  Approve Order
                                </ZionButton>
                                <ZionButton
                                  variant="outline"
                                  className="px-2.5 py-1.5 text-[11px]"
                                  onClick={() => handleQuickRejectOrder(ord)}
                                >
                                  Reject
                                </ZionButton>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ZionCard>
            </>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB: EVANGELISM & MISSION MANAGEMENT (Strictly Gated by 'mission')
      ===================================================================== */}
      {safeActiveTab === "mission" && (
        <div className="space-y-6">
          {!isManagerForSection(effectiveUser, "mission") ? (
            <ZionAlert variant="error" title="Section Access Denied">
              You do not hold Evangelism &amp; Mission permissions.
            </ZionAlert>
          ) : (
            <>
              <ZionCard
                title="Outreach Schedules &amp; Mission Trips"
                subtitle="Publish crusades, cross-border trips, and volunteer deployments"
              >
                <div className="flex justify-between items-center pb-4 border-b border-stone-200 dark:border-stone-800">
                  <span className="text-xs text-stone-500">
                    Active Mission Events: {missionEvents.length}
                  </span>
                  <ZionButton variant="primary" onClick={() => setShowEventModal(true)}>
                    <Plus className="h-4 w-4" />
                    <span>Schedule Outreach</span>
                  </ZionButton>
                </div>

                <div className="overflow-x-auto pt-4">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-stone-200 dark:border-stone-800 text-[10px] font-mono uppercase text-stone-500">
                        <th className="py-2.5 px-3">Event &amp; Venue</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Volunteers / RSVPs</th>
                        <th className="py-2.5 px-3">Audit Trail</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                      {missionEvents.map((evt) => (
                        <tr key={evt.id}>
                          <td className="py-3 px-3">
                            <p className="font-bold text-stone-900 dark:text-white">{evt.title}</p>
                            <p className="text-[11px] text-stone-500">{evt.venue}</p>
                          </td>
                          <td className="py-3 px-3">{evt.type}</td>
                          <td className="py-3 px-3 font-mono">{evt.date}</td>
                          <td className="py-3 px-3">
                            {evt.registeredVolunteers.length} Volunteers | {evt.rsvpsCount} RSVPs
                          </td>
                          <td className="py-3 px-3 text-[10px] font-mono text-stone-500">
                            <div>{evt.created_by}</div>
                            <div>{new Date(evt.created_at).toLocaleDateString()}</div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <ZionButton
                              variant="outline"
                              className="px-2.5 py-1.5 text-[11px]"
                              onClick={() => handleDeleteMissionEvent(evt)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-600" />
                            </ZionButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ZionCard>

              <div className="grid gap-6 lg:grid-cols-2">
                <ZionCard
                  title="Prayer Requests Moderation"
                  subtitle="Review and approve member prayer requests"
                >
                  <div className="space-y-3">
                    {prayerRequests.map((pr) => (
                      <div
                        key={pr.id}
                        className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 space-y-2"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="text-xs font-bold">{pr.authorName}</span>
                            <span className="ml-2 text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-800">
                              {pr.category}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono uppercase font-bold text-emerald-700">
                            {pr.status}
                          </span>
                        </div>
                        <p className="text-xs text-stone-600 dark:text-stone-400">{pr.request}</p>
                        <div className="flex gap-2">
                          {pr.status !== "approved" && (
                            <ZionButton
                              variant="primary"
                              className="px-2.5 py-1.5 text-[11px]"
                              onClick={() => handleModeratePrayer(pr.id, "approve")}
                            >
                              Approve
                            </ZionButton>
                          )}
                          <ZionButton
                            variant="outline"
                            className="px-2.5 py-1.5 text-[11px]"
                            onClick={() => handleModeratePrayer(pr.id, "delete")}
                          >
                            Remove
                          </ZionButton>
                        </div>
                      </div>
                    ))}
                  </div>
                </ZionCard>

                <ZionCard
                  title="Mission Field Reports"
                  subtitle="Document outreach impact and souls saved"
                >
                  <div className="flex justify-end pb-3">
                    <ZionButton variant="secondary" className="px-2.5 py-1.5 text-[11px]" onClick={() => setShowReportModal(true)}>
                      <Plus className="h-3.5 w-3.5" />
                      <span>Post Field Report</span>
                    </ZionButton>
                  </div>
                  <div className="space-y-3">
                    {missionReports.map((rep) => (
                      <div
                        key={rep.id}
                        className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 space-y-1.5"
                      >
                        <h5 className="font-bold text-xs text-stone-900 dark:text-white">{rep.title}</h5>
                        <p className="text-[11px] font-mono text-stone-500">
                          {rep.location} | {rep.date} | {rep.soulsSavedCount} Souls Saved
                        </p>
                        <p className="text-xs text-stone-600 dark:text-stone-400">{rep.narrative}</p>
                        <p className="text-[10px] font-mono text-stone-400 pt-1">
                          Created by {rep.created_by} on {new Date(rep.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </ZionCard>
              </div>
            </>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB: SUPER ADMIN TEAM MANAGEMENT & AUDIT TRAIL (SUPER ADMIN ONLY)
      ===================================================================== */}
      {safeActiveTab === "team" && (
        <div className="space-y-6">
          {!isSuper ? (
            <ZionAlert variant="error" title="Super Admin Exclusive Interface">
              Only the Super Admin (App Owner) may manage team roles or assigned sections.
            </ZionAlert>
          ) : (
            <>
              <ZionCard
                title="Team &amp; Permissions Management"
                subtitle="Promote registered users to Manager, revoke back to User, and toggle assigned_sections checkboxes immediately"
              >
                {/* Add Registered User Row */}
                <form
                  onSubmit={handleRegisterTeamMember}
                  className="grid sm:grid-cols-3 gap-3 pb-5 mb-5 border-b border-stone-200 dark:border-stone-800 items-end"
                >
                  <ZionInput
                    label="Full Name"
                    placeholder="e.g. Samuel Wekesa"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    required
                  />
                  <ZionInput
                    label="Email Address"
                    type="email"
                    placeholder="e.g. samuel@ziondigital.org"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    required
                  />
                  <ZionButton variant="primary" type="submit">
                    <UserPlus className="h-4 w-4" />
                    <span>Register User</span>
                  </ZionButton>
                </form>

                {/* Users & Assigned Sections Matrix Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-stone-200 dark:border-stone-800 text-[10px] font-mono uppercase text-stone-500">
                        <th className="py-3 px-3">User Name &amp; Email</th>
                        <th className="py-3 px-3">Role</th>
                        <th className="py-3 px-3 text-center">School 1</th>
                        <th className="py-3 px-3 text-center">School 2</th>
                        <th className="py-3 px-3 text-center">Bookstore</th>
                        <th className="py-3 px-3 text-center">Mission</th>
                        <th className="py-3 px-3 text-right">Role Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                      {users.map((u) => {
                        const userIsOwner = checkSuperAdmin(u);
                        const isMgrUser = u.role === "manager" || u.role === "sub_admin";
                        const sections = u.assigned_sections || [];

                        return (
                          <tr key={u.id || u.email} className="hover:bg-stone-50 dark:hover:bg-stone-900/40">
                            <td className="py-3 px-3">
                              <p className="font-bold text-stone-900 dark:text-white">{u.name}</p>
                              <p className="text-[11px] font-mono text-stone-500">{u.email}</p>
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                                  userIsOwner
                                    ? "bg-[#0B254D] text-[#F5B82E]"
                                    : isMgrUser
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-stone-200 text-stone-700"
                                }`}
                              >
                                {userIsOwner ? "super_admin" : u.role}
                              </span>
                            </td>
                            {ALL_SECTIONS.map((sec) => (
                              <td key={sec} className="py-3 px-3 text-center">
                                <input
                                  type="checkbox"
                                  disabled={userIsOwner || !isMgrUser}
                                  checked={userIsOwner || sections.includes(sec)}
                                  onChange={() => u.id && handleToggleAssignedSection(u.id, sec)}
                                  aria-label={`Toggle ${sec} for ${u.name}`}
                                  className="h-4 w-4 accent-[#0B254D] cursor-pointer disabled:opacity-40"
                                />
                              </td>
                            ))}
                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              {userIsOwner ? (
                                <span className="text-[10px] font-mono text-stone-400">Owner Lock</span>
                              ) : isMgrUser ? (
                                <ZionButton
                                  variant="outline"
                                  className="px-2.5 py-1.5 text-[11px]"
                                  onClick={() => u.id && handleToggleUserRole(u.id, "user")}
                                >
                                  <UserMinus className="h-3.5 w-3.5" />
                                  <span>Revoke to User</span>
                                </ZionButton>
                              ) : (
                                <ZionButton
                                  variant="secondary"
                                  className="px-2.5 py-1.5 text-[11px]"
                                  onClick={() => u.id && handleToggleUserRole(u.id, "manager")}
                                >
                                  <UserPlus className="h-3.5 w-3.5" />
                                  <span>Promote to Manager</span>
                                </ZionButton>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </ZionCard>

              {/* Audit Trail Card */}
              <ZionCard
                title="Institutional Audit Trail"
                subtitle="Track created_by user name/ID and created_at timestamp across all uploaded books, courses, mission posts, and permission updates"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200 dark:border-stone-800">
                  <select
                    value={auditFilterSection}
                    onChange={(e) => setAuditFilterSection(e.target.value)}
                    className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-2 text-xs font-bold outline-none"
                  >
                    <option value="all">All Sections</option>
                    <option value="school_1">School 1 (Leadership)</option>
                    <option value="school_2">School 2 (Bible Seminary)</option>
                    <option value="bookstore">Bookstore</option>
                    <option value="mission">Evangelism &amp; Mission</option>
                    <option value="admin">Team &amp; Admin Changes</option>
                  </select>

                  <ZionButton variant="outline" className="px-2.5 py-1.5 text-[11px]" onClick={handleExportAuditPdf}>
                    <Download className="h-3.5 w-3.5" />
                    <span>Export Audit Trail (PDF)</span>
                  </ZionButton>
                </div>

                <div className="overflow-x-auto pt-3">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-stone-200 dark:border-stone-800 text-[10px] font-mono uppercase text-stone-500">
                        <th className="py-2.5 px-3">Timestamp (created_at)</th>
                        <th className="py-2.5 px-3">Section</th>
                        <th className="py-2.5 px-3">Action</th>
                        <th className="py-2.5 px-3">Item / Summary</th>
                        <th className="py-2.5 px-3">Actor (created_by)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                      {filteredAuditLogs.map((log) => (
                        <tr key={log.id}>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-stone-500 whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 font-mono uppercase text-[10px] font-bold">
                            {log.section}
                          </td>
                          <td className="py-2.5 px-3 font-mono uppercase text-[10px] text-[#155EEF] font-bold">
                            {log.action}
                          </td>
                          <td className="py-2.5 px-3">
                            <p className="font-bold text-stone-900 dark:text-white">{log.itemTitle}</p>
                            {log.details && <p className="text-[11px] text-stone-500">{log.details}</p>}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px]">
                            <div className="font-bold">{log.created_by}</div>
                            <div className="text-stone-500">{log.created_by_id}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ZionCard>
            </>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB: PAYMENT SETTINGS & M-PESA LEDGERS (SUPER ADMIN ONLY)
      ===================================================================== */}
      {safeActiveTab === "payments" && (
        <div className="space-y-6">
          {!isSuper ? (
            <ZionAlert variant="error" title="Super Admin Exclusive Interface">
              Payment gateway settings and financial ledgers are strictly restricted to the Super Admin.
            </ZionAlert>
          ) : (
            <ZionCard
              title="Payment Gateway Configuration (M-Pesa &amp; Paystack KES)"
              subtitle="Exclusive administrative control over Safaricom Paybill, Till, and Paystack revenue endpoints"
            >
              <form onSubmit={handleSavePaymentSettings} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <ZionInput
                    label="Safaricom M-Pesa Paybill Number"
                    value={paymentSettings.mpesaPaybill}
                    onChange={(e) =>
                      setPaymentSettings({ ...paymentSettings, mpesaPaybill: e.target.value })
                    }
                  />
                  <ZionInput
                    label="Safaricom Buy Goods Till Number"
                    value={paymentSettings.mpesaTill}
                    onChange={(e) =>
                      setPaymentSettings({ ...paymentSettings, mpesaTill: e.target.value })
                    }
                  />
                  <ZionInput
                    label="M-Pesa Daraja Consumer Key"
                    value={paymentSettings.mpesaConsumerKey}
                    onChange={(e) =>
                      setPaymentSettings({ ...paymentSettings, mpesaConsumerKey: e.target.value })
                    }
                  />
                  <ZionInput
                    label="Paystack Public Key (KES)"
                    value={paymentSettings.paystackPublicKey}
                    onChange={(e) =>
                      setPaymentSettings({ ...paymentSettings, paystackPublicKey: e.target.value })
                    }
                  />
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-[11px] font-mono text-stone-500">
                    Last updated by {paymentSettings.updatedBy} on{" "}
                    {new Date(paymentSettings.updatedAt).toLocaleDateString()}
                  </span>
                  <ZionButton variant="primary" type="submit">
                    Save Payment Configuration
                  </ZionButton>
                </div>
              </form>
            </ZionCard>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB: GLOBAL ANNOUNCEMENTS & APP SETTINGS (SUPER ADMIN ONLY)
      ===================================================================== */}
      {safeActiveTab === "settings" && (
        <div className="space-y-6">
          {!isSuper ? (
            <ZionAlert variant="error" title="Super Admin Exclusive Interface">
              Global announcements and institutional app settings are strictly restricted to the Super Admin.
            </ZionAlert>
          ) : (
            <ZionCard
              title="Global Campus Broadcast &amp; System Configuration"
              subtitle="Publish campus-wide announcement banners across all departments"
            >
              <form onSubmit={handlePublishBroadcast} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase">
                    Global Announcement Message
                  </label>
                  <textarea
                    rows={3}
                    value={broadcastInput}
                    onChange={(e) => setBroadcastInput(e.target.value)}
                    placeholder="Enter global institutional notice..."
                    className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 p-3 text-xs outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <ZionButton variant="primary" type="submit">
                    <Megaphone className="h-4 w-4" />
                    <span>Publish Global Notice</span>
                  </ZionButton>
                  <ZionButton
                    variant="outline"
                    onClick={() => {
                      setBroadcastInput("");
                      localStorage.removeItem("ZION_BROADCAST_ANNOUNCEMENT");
                      if (onUpdateBroadcastAnnouncement) {
                        onUpdateBroadcastAnnouncement("");
                      }
                      if (onUpdateSettings && globalSettings) {
                        onUpdateSettings({ ...globalSettings });
                      }
                      flashNotice("Cleared global announcement.");
                    }}
                  >
                    Clear Notice
                  </ZionButton>
                </div>
              </form>
            </ZionCard>
          )}
        </div>
      )}

      {/* =====================================================================
          MODALS
      ===================================================================== */}
      <ZionModal
        isOpen={Boolean(courseModalSection)}
        onClose={() => setCourseModalSection(null)}
        title={
          editingCourseId
            ? "Edit Course Curriculum"
            : `Create New Course (${courseModalSection ? SECTION_LABELS[courseModalSection] : ""})`
        }
      >
        <form onSubmit={handleSaveCourse} className="space-y-4">
          <ZionInput
            label="Course Title"
            value={courseTitle}
            onChange={(e) => setCourseTitle(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <ZionInput
              label="Course Code"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              required
            />
            <ZionInput
              label="Tuition Fee (KES)"
              type="number"
              value={courseFee}
              onChange={(e) => setCourseFee(Number(e.target.value))}
              required
            />
          </div>
          <ZionInput
            label="Duration"
            value={courseDuration}
            onChange={(e) => setCourseDuration(e.target.value)}
          />
          <ZionInput
            label="Study Materials (comma-separated)"
            value={courseMaterialsInput}
            onChange={(e) => setCourseMaterialsInput(e.target.value)}
          />
          <ZionInput
            label="Course Announcement"
            value={courseAnnouncementInput}
            onChange={(e) => setCourseAnnouncementInput(e.target.value)}
          />
          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase text-stone-600">
              Syllabus Description
            </label>
            <textarea
              rows={3}
              value={courseDesc}
              onChange={(e) => setCourseDesc(e.target.value)}
              className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 p-3 text-xs outline-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <ZionButton variant="outline" onClick={() => setCourseModalSection(null)}>
              Cancel
            </ZionButton>
            <ZionButton variant="primary" type="submit">
              Save Course
            </ZionButton>
          </div>
        </form>
      </ZionModal>

      <ZionModal
        isOpen={showBookModal}
        onClose={() => setShowBookModal(false)}
        title={editingBookId ? "Edit Book Volume" : "Upload Book Volume to Bookstore"}
      >
        <form onSubmit={handleSaveBook} className="space-y-4">
          <ZionInput
            label="Book Title"
            value={bookTitle}
            onChange={(e) => setBookTitle(e.target.value)}
            required
          />
          <ZionInput
            label="Author"
            value={bookAuthor}
            onChange={(e) => setBookAuthor(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <ZionInput
              label="Price (KES)"
              type="number"
              value={bookPrice}
              onChange={(e) => setBookPrice(Number(e.target.value))}
              required
            />
            <ZionInput
              label="Inventory Stock"
              type="number"
              value={bookStock}
              onChange={(e) => setBookStock(Number(e.target.value))}
              required
            />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={bookIsPhysical}
              onChange={(e) => setBookIsPhysical(e.target.checked)}
              id="bookPhysicalToggle"
              className="h-4 w-4 accent-[#0B254D]"
            />
            <label htmlFor="bookPhysicalToggle" className="font-bold">
              Track Physical Inventory Copy
            </label>
          </div>
          <ZionInput
            label="Category"
            value={bookCategory}
            onChange={(e) => setBookCategory(e.target.value)}
          />
          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase text-stone-600">
              Description
            </label>
            <textarea
              rows={3}
              value={bookDesc}
              onChange={(e) => setBookDesc(e.target.value)}
              className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 p-3 text-xs outline-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <ZionButton variant="outline" onClick={() => setShowBookModal(false)}>
              Cancel
            </ZionButton>
            <ZionButton variant="primary" type="submit">
              Save Book
            </ZionButton>
          </div>
        </form>
      </ZionModal>

      <ZionModal
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        title="Schedule Evangelism Outreach / Mission Trip"
      >
        <form onSubmit={handleCreateMissionEvent} className="space-y-4">
          <ZionInput
            label="Event Title"
            value={eventTitle}
            onChange={(e) => setEventTitle(e.target.value)}
            required
          />
          <ZionInput
            label="Theme"
            value={eventTheme}
            onChange={(e) => setEventTheme(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase text-stone-600">Type</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as any)}
                className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 p-2.5 text-xs outline-none"
              >
                <option value="Physical Crusade">Physical Crusade</option>
                <option value="Mission Trip">Mission Trip</option>
                <option value="Online Crusade">Online Crusade</option>
              </select>
            </div>
            <ZionInput
              label="Event Date"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
            />
          </div>
          <ZionInput
            label="Venue / Destination"
            value={eventVenue}
            onChange={(e) => setEventVenue(e.target.value)}
            required
          />
          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase text-stone-600">
              Outreach Details
            </label>
            <textarea
              rows={3}
              value={eventDesc}
              onChange={(e) => setEventDesc(e.target.value)}
              className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 p-3 text-xs outline-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <ZionButton variant="outline" onClick={() => setShowEventModal(false)}>
              Cancel
            </ZionButton>
            <ZionButton variant="primary" type="submit">
              Schedule Outreach
            </ZionButton>
          </div>
        </form>
      </ZionModal>

      <ZionModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="Publish Mission Field Report"
      >
        <form onSubmit={handleCreateFieldReport} className="space-y-4">
          <ZionInput
            label="Report Headline"
            value={reportTitle}
            onChange={(e) => setReportTitle(e.target.value)}
            required
          />
          <ZionInput
            label="Field Location"
            value={reportLocation}
            onChange={(e) => setReportLocation(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <ZionInput
              label="Souls Saved"
              type="number"
              value={reportSouls}
              onChange={(e) => setReportSouls(Number(e.target.value))}
            />
            <ZionInput
              label="Total Attendance"
              type="number"
              value={reportAttendees}
              onChange={(e) => setReportAttendees(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase text-stone-600">
              Field Narrative
            </label>
            <textarea
              rows={3}
              value={reportNarrative}
              onChange={(e) => setReportNarrative(e.target.value)}
              required
              className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 p-3 text-xs outline-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <ZionButton variant="outline" onClick={() => setShowReportModal(false)}>
              Cancel
            </ZionButton>
            <ZionButton variant="primary" type="submit">
              Publish Report
            </ZionButton>
          </div>
        </form>
      </ZionModal>
    </div>
  );
}
