import {
  User,
  SectionKey,
  AppRole,
  AuditLogItem,
  SchoolCourseItem,
  Book,
  MissionOutreachItem,
  MissionFieldReportItem,
  PrayerRequestItem,
  PaymentSettingsConfig,
} from "../types";

export const APP_OWNER_EMAILS = [
  "wafulak435@gmail.com",
  "wafula435@gmail.com",
  "wafulak4@gmail.com",
  "wafulak003@gmail.com",
];

export function isSuperAdmin(user?: User | null): boolean {
  if (!user) return false;
  if (user.isMainAdmin) return true;
  const role = (user.role || "").toLowerCase();
  if (role === "super_admin" || role === "main_admin" || role === "admin") return true;
  const email = (user.email || "").toLowerCase();
  if (APP_OWNER_EMAILS.includes(email)) return true;
  return false;
}

export function isManager(user?: User | null): boolean {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  const role = (user.role || "").toLowerCase();
  return role === "manager" || role === "sub_admin";
}

export function isManagerForSection(user: User | null | undefined, section: SectionKey): boolean {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  const role = (user.role || "").toLowerCase();
  if (role !== "manager" && role !== "sub_admin") return false;
  return Array.isArray(user.assigned_sections) && user.assigned_sections.includes(section);
}

export function canAccessSection(user: User | null | undefined, section: SectionKey): boolean {
  if (!user) return true;
  if (isSuperAdmin(user)) return true;
  const role = (user.role || "").toLowerCase();
  if (role === "user" || role === "member" || role === "guest" || role === "tutor") return true;
  if (role === "manager" || role === "sub_admin") {
    return Array.isArray(user.assigned_sections) && user.assigned_sections.includes(section);
  }
  return false;
}

export function canManageSection(user: User | null | undefined, section: SectionKey): boolean {
  return isManagerForSection(user, section);
}

export const SEED_USERS: User[] = [
  {
    id: "usr-super-admin",
    name: "Kelvin Opara Wafula",
    email: "wafulak435@gmail.com",
    role: "super_admin",
    isMainAdmin: true,
    assigned_sections: ["school_1", "school_2", "bookstore", "mission"],
    avatarUrl: "",
    credits: 100,
    readingStreak: 45,
    dailyGoalMinutes: 60,
    subscription_status: "active",
    plan_name: "Executive Chancellor",
    createdAt: "2026-01-10T08:00:00Z",
  },
  {
    id: "usr-school-mgr",
    name: "Pastor Silas Barasa",
    email: "silas.barasa@ziondigital.org",
    role: "manager",
    assigned_sections: ["school_1", "school_2"],
    credits: 40,
    readingStreak: 20,
    dailyGoalMinutes: 45,
    subscription_status: "active",
    plan_name: "Academic Dean (School 1 & 2)",
    createdAt: "2026-02-15T09:30:00Z",
  },
  {
    id: "usr-bookstore-mgr",
    name: "Miriam Chebet",
    email: "miriam.chebet@ziondigital.org",
    role: "manager",
    assigned_sections: ["bookstore"],
    credits: 30,
    readingStreak: 12,
    dailyGoalMinutes: 30,
    subscription_status: "active",
    plan_name: "Bookstore Director",
    createdAt: "2026-03-01T11:00:00Z",
  },
  {
    id: "usr-mission-mgr",
    name: "David Wanyonyi",
    email: "david.wanyonyi@ziondigital.org",
    role: "manager",
    assigned_sections: ["mission"],
    credits: 25,
    readingStreak: 8,
    dailyGoalMinutes: 30,
    subscription_status: "active",
    plan_name: "Outreach Evangelist",
    createdAt: "2026-03-15T14:20:00Z",
  },
  {
    id: "usr-student-user",
    name: "Grace Wanjiku",
    email: "grace.wanjiku@gmail.com",
    role: "user",
    assigned_sections: [],
    credits: 15,
    readingStreak: 5,
    dailyGoalMinutes: 20,
    subscription_status: "free",
    plan_name: "Matriculated Scholar",
    createdAt: "2026-04-02T16:45:00Z",
  },
];

export const SEED_COURSES: SchoolCourseItem[] = [
  {
    id: "crs-s1-101",
    section: "school_1",
    title: "Visionary Leadership and Strategic Governance",
    courseCode: "LDR-101",
    description: "Equipping executive leaders with biblical governance principles, strategic clarity, and crisis decision-making frameworks.",
    duration: "4 Months",
    feeKes: 4500,
    lessonsCount: 12,
    videoUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    studyMaterials: ["Executive Leadership Syllabus (PDF)", "Strategic Framework Workbook"],
    assignments: [
      {
        id: "asg-101-1",
        title: "Organizational Strategic Vision Blueprint",
        description: "Draft a 5-year transformational leadership plan addressing local resource allocation.",
        dueDate: "2026-06-15",
        maxPoints: 100,
      },
    ],
    announcements: ["Mid-term examination schedule released for May cohort."],
    enrolledStudents: ["Grace Wanjiku", "David Barasa"],
    created_by: "Kelvin Opara Wafula (Super Admin)",
    created_by_id: "wafulak435@gmail.com",
    created_at: "2026-02-01T10:00:00Z",
  },
  {
    id: "crs-s2-101",
    section: "school_2",
    title: "Old Testament Survey and Hebrew Covenants",
    courseCode: "BIB-101",
    description: "In-depth study of the Pentateuch, historical books, Abrahamic and Mosaic covenants.",
    duration: "4 Months",
    feeKes: 3500,
    lessonsCount: 14,
    videoUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    studyMaterials: ["Old Testament Exegesis Companion", "Chronology Chart of Israel"],
    assignments: [
      {
        id: "asg-201-1",
        title: "Theological Exposition of Genesis 15",
        description: "Examine the unilateral covenant ceremony of Genesis 15.",
        dueDate: "2026-06-20",
        maxPoints: 100,
      },
    ],
    announcements: ["Scriptural Hebrew vocabulary flashcards available."],
    enrolledStudents: ["David Barasa", "Grace Wanjiku"],
    created_by: "Pastor Silas Barasa (Manager School 1 & 2)",
    created_by_id: "silas.barasa@ziondigital.org",
    created_at: "2026-02-05T09:15:00Z",
  },
];

export const SEED_BOOKS: Book[] = [
  {
    id: "bk-101",
    title: "Covenant Leadership in Africa",
    author: "Kelvin Opara Wafula",
    price: 1200,
    category: "Leadership",
    description: "A foundational text on servant leadership and community transformation.",
    coverImage: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80",
    fileSize: "4.8MB",
    pages: 240,
    publishedDate: "2026-01-15",
    isFeatured: true,
    status: "active",
    rating: 5,
    reviewsCount: 38,
    stockQuantity: 45,
    isPhysical: true,
    created_by: "Kelvin Opara Wafula (Super Admin)",
    created_by_id: "wafulak435@gmail.com",
    created_at: "2026-01-15T10:00:00Z",
  },
  {
    id: "bk-102",
    title: "Biblical Hermeneutics",
    author: "Zion Theological Faculty",
    price: 1450,
    category: "Religion",
    description: "Comprehensive seminary textbook guiding scholars through inductive Bible study.",
    coverImage: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80",
    fileSize: "6.2MB",
    pages: 320,
    publishedDate: "2026-02-10",
    isFeatured: true,
    status: "active",
    rating: 5,
    reviewsCount: 24,
    stockQuantity: 30,
    isPhysical: true,
    created_by: "Miriam Chebet (Bookstore Manager)",
    created_by_id: "miriam.chebet@ziondigital.org",
    created_at: "2026-02-10T12:00:00Z",
  },
];

export const SEED_MISSION_EVENTS: MissionOutreachItem[] = [
  {
    id: "msn-evt-1",
    title: "Western Kenya Frontier Crusade & Medical Camp",
    theme: "Arise and Shine, for Thy Light Has Come",
    type: "Physical Crusade",
    venue: "Bungoma Posta Grounds",
    date: "2026-06-18",
    time: "14:00 EAT",
    expectedAttendance: 5000,
    rsvpsCount: 1420,
    registeredVolunteers: ["Grace Wanjiku", "David Barasa"],
    description: "Mass gospel crusade featuring open-air preaching and free medical clinic consultations.",
    status: "upcoming",
    created_by: "Kelvin Opara Wafula (Super Admin)",
    created_by_id: "wafulak435@gmail.com",
    created_at: "2026-03-10T08:00:00Z",
  },
];

export const SEED_MISSION_REPORTS: MissionFieldReportItem[] = [
  {
    id: "rep-1",
    title: "Kakamega Rural Outreach Report: 340 Souls Added",
    location: "Malava District",
    date: "2026-04-12",
    narrative: "Our 4-day mobile missions cohort conducted house-to-house evangelism and distributed 500 Swahili New Testaments.",
    soulsSavedCount: 340,
    attendeesCount: 2200,
    created_by: "David Wanyonyi (Mission Manager)",
    created_by_id: "david.wanyonyi@ziondigital.org",
    created_at: "2026-04-13T09:00:00Z",
  },
];

export const SEED_PRAYER_REQUESTS: PrayerRequestItem[] = [
  {
    id: "pr-1",
    authorName: "Sister Beatrice Nekesa",
    authorEmail: "beatrice@example.com",
    category: "Healing & Restoration",
    request: "Praying for full physical restoration and complete recovery from chest complications.",
    isAnonymous: false,
    status: "approved",
    prayersCount: 42,
    createdAt: "2026-05-20T10:15:00Z",
  },
];

export const SEED_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: "aud-101",
    section: "admin",
    action: "permission_change",
    itemTitle: "Assigned School 1 & School 2 to Pastor Silas Barasa",
    itemId: "usr-school-mgr",
    created_by: "Kelvin Opara Wafula (Super Admin)",
    created_by_id: "wafulak435@gmail.com",
    created_at: "2026-02-15T09:35:00Z",
    details: "Assigned sections ['school_1', 'school_2'] to Pastor Silas Barasa for dual school management.",
  },
];

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettingsConfig = {
  mpesaPaybill: "247247",
  mpesaTill: "584930",
  mpesaConsumerKey: "vA8kL09mX12pQqRtyZ",
  mpesaConsumerSecret: "kL99mNxZ24810pqRstUv",
  mpesaPasskey: "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919",
  paystackPublicKey: "pk_live_8912klmno456789pqrstuvw",
  paystackSecretKey: "sk_live_9901bbnmcxz456789abcdef",
  currency: "KES",
  updatedAt: "2026-05-01T12:00:00Z",
  updatedBy: "Kelvin Opara Wafula (Super Admin)",
};

export function getStoredUsers(): User[] {
  try {
    const raw = localStorage.getItem("ZION_RBAC_USERS");
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return SEED_USERS;
}

export function saveStoredUsers(users: User[]): void {
  try {
    localStorage.setItem("ZION_RBAC_USERS", JSON.stringify(users));
  } catch (_) {}
}

export function getStoredCourses(): SchoolCourseItem[] {
  try {
    const raw = localStorage.getItem("ZION_RBAC_COURSES");
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return SEED_COURSES;
}

export function saveStoredCourses(courses: SchoolCourseItem[]): void {
  try {
    localStorage.setItem("ZION_RBAC_COURSES", JSON.stringify(courses));
  } catch (_) {}
}

export function getStoredBooks(): Book[] {
  try {
    const raw = localStorage.getItem("ZION_RBAC_BOOKS");
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return SEED_BOOKS;
}

export function saveStoredBooks(books: Book[]): void {
  try {
    localStorage.setItem("ZION_RBAC_BOOKS", JSON.stringify(books));
  } catch (_) {}
}

export function getStoredMissionEvents(): MissionOutreachItem[] {
  try {
    const raw = localStorage.getItem("ZION_RBAC_MISSION_EVENTS");
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return SEED_MISSION_EVENTS;
}

export function saveStoredMissionEvents(events: MissionOutreachItem[]): void {
  try {
    localStorage.setItem("ZION_RBAC_MISSION_EVENTS", JSON.stringify(events));
  } catch (_) {}
}

export function getStoredMissionReports(): MissionFieldReportItem[] {
  try {
    const raw = localStorage.getItem("ZION_RBAC_MISSION_REPORTS");
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return SEED_MISSION_REPORTS;
}

export function saveStoredMissionReports(reports: MissionFieldReportItem[]): void {
  try {
    localStorage.setItem("ZION_RBAC_MISSION_REPORTS", JSON.stringify(reports));
  } catch (_) {}
}

export function getStoredPrayerRequests(): PrayerRequestItem[] {
  try {
    const raw = localStorage.getItem("ZION_RBAC_PRAYERS");
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return SEED_PRAYER_REQUESTS;
}

export function saveStoredPrayerRequests(prayers: PrayerRequestItem[]): void {
  try {
    localStorage.setItem("ZION_RBAC_PRAYERS", JSON.stringify(prayers));
  } catch (_) {}
}

export function getStoredAuditLogs(): AuditLogItem[] {
  try {
    const raw = localStorage.getItem("ZION_RBAC_AUDIT_LOGS");
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return SEED_AUDIT_LOGS;
}

export function appendAuditLog(entry: Omit<AuditLogItem, "id" | "created_at">): AuditLogItem {
  const newLog: AuditLogItem = {
    ...entry,
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    created_at: new Date().toISOString(),
  };
  const logs = [newLog, ...getStoredAuditLogs()];
  try {
    localStorage.setItem("ZION_RBAC_AUDIT_LOGS", JSON.stringify(logs));
  } catch (_) {}
  return newLog;
}

export function getStoredPaymentSettings(): PaymentSettingsConfig {
  try {
    const raw = localStorage.getItem("ZION_PAYMENT_SETTINGS");
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return DEFAULT_PAYMENT_SETTINGS;
}

export function saveStoredPaymentSettings(settings: PaymentSettingsConfig): void {
  try {
    localStorage.setItem("ZION_PAYMENT_SETTINGS", JSON.stringify(settings));
  } catch (_) {}
}
