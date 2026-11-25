import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { Request, Response, NextFunction } from "express";
import { fromSupabaseUrl } from "@supabase/server";
import {
  verifyCredentials,
  createContextClient,
  createAdminClient,
  resolveEnv,
} from "@supabase/server/core";
import type { RequestWithSsrUser } from "./supabaseSsr";
import { BUILTIN_EXAM_ANSWER_KEYS } from "./examBank";

export type AppRole = "main_admin" | "sub_admin" | "manager" | "tutor" | "member";

export interface SubAdminCapabilityMap {
  allowBroadcast: boolean;
  allowApproval: boolean;
  allowVault: boolean;
  allowManageBooks: boolean;
  allowConfirmPayments: boolean;
  allowManageEnrollments: boolean;
  allowManageExams: boolean;
  allowIssueCertificates: boolean;
  allowModeration: boolean;
  allowSuspendUsers: boolean;
}

export type SubAdminCapabilityKey = keyof SubAdminCapabilityMap;

export const EMPTY_CAPABILITIES: SubAdminCapabilityMap = {
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

export interface SubAdminPermissionRecord {
  id: string;
  name: string;
  email: string;
  permissions: SubAdminCapabilityMap;
  createdBy: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorEmail: string;
  actorRole: string;
  category:
    | "ADMIN_ACTION"
    | "ROLE_CHANGE"
    | "BOOK_ACTION"
    | "PAYMENT_CONFIRMATION"
    | "PAYMENT_INITIATION"
    | "ENROLLMENT_APPROVAL"
    | "EXAM_RESULT_CHANGE"
    | "CERTIFICATE_ISSUANCE"
    | "USER_SUSPENSION"
    | "ACCESS_DENIED"
    | "AI_USAGE";
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  ip?: string;
}

export interface RequestIdentity {
  uid: string;
  email: string;
  name: string;
  role: AppRole;
  isMainAdmin: boolean;
  isSuspended: boolean;
  capabilities: SubAdminCapabilityMap;
  authorizedCourses: string[];
  authSource: "zion_session" | "supabase" | "firebase";
}

export interface AuthenticatedRequest extends Request {
  identity?: RequestIdentity;
}

export const MAIN_ADMIN_EMAILS = new Set([
  "wafulak435@gmail.com",
  "wafula435@gmail.com",
  "wafulak4@gmail.com",
  "wafulak003@gmail.com",
]);

const DATA_DIR = path.join(process.cwd(), "data");
const STATE_FILE = path.join(DATA_DIR, "zion-security-state.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getSessionSecret(): string {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16) {
    return process.env.SESSION_SECRET;
  }
  return crypto.randomBytes(48).toString("hex");
}

const SESSION_SECRET = getSessionSecret();

export function hashPasswordScrypt(password: string, existingSalt?: string): string {
  const salt = existingSalt || crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPasswordScrypt(password: string, storedHash: string): boolean {
  const [salt, keyHex] = String(storedHash || "").split(":");
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(keyHex, "hex");
  if (derived.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(derived, storedBuf);
}

export interface BookServerRecord {
  id: string;
  title: string;
  author: string;
  authorId: string;
  authorEmail: string;
  price: number;
  status: "active" | "draft";
  category: string;
  allowPreview?: boolean;
  previewDuration?: number;
  content?: string;
  previewExcerpt?: string;
  pdfUrl?: string;
}

export interface OrderServerRecord {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  bookId: string;
  bookTitle: string;
  price: number;
  status: "pending" | "approved" | "rejected";
  paymentReference?: string;
  verifiedBy?: string;
  date: string;
  updatedAt: string;
}

export interface FeePaymentServerRecord {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  feeType: "library" | "certificate" | "tuition" | "wifi";
  planName: string;
  amount: number;
  phoneNumber: string;
  status: "pending" | "confirmed" | "rejected";
  verifiedBy?: string;
  date: string;
  updatedAt: string;
}

export interface EnrollmentServerRecord {
  id: string;
  userId: string;
  userEmail: string;
  studentName: string;
  admNo: string;
  phone: string;
  courseId: string;
  courseTopic: string;
  courseCode: string;
  courseFee: number;
  enrolmentType: "new" | "continuing" | "repeat";
  mpesaTransactionCode: string;
  status: "pending" | "approved" | "rejected";
  feeStatus: "unpaid" | "paid";
  certificateIssued: boolean;
  certificateId?: string;
  reviewedBy?: string;
  enrolledAt: string;
  updatedAt: string;
}

export interface CertificateServerRecord {
  id: string;
  studentEmail: string;
  studentName: string;
  schoolName: string;
  courseTopic: string;
  score: number;
  ledgerHash: string;
  status: "active" | "revoked";
  issuedBy: string;
  date: string;
  updatedAt: string;
}

export interface ExamDefinitionRecord {
  id: string;
  lessonId: string;
  courseTrack: string;
  title: string;
  questions: { question: string; options: string[] }[];
  durationMinutes: number;
  maxAttempts: number;
  resultsReleased: boolean;
  createdBy: string;
  updatedAt: string;
}

export interface ExamAnswerKeyStore {
  answers: { correctIndex: number; explanation: string }[];
  updatedBy: string;
  updatedAt: string;
}

export interface ExamAttemptRecord {
  id: string;
  examId: string;
  userId: string;
  userEmail: string;
  userName: string;
  attemptNumber: number;
  startedAt: string;
  expiresAt: string;
  submittedAt?: string;
  answers: Record<string, number>;
  score: number | null;
  correctCount: number | null;
  totalQuestions: number;
  passed: boolean | null;
  status: "in_progress" | "submitted" | "expired";
  gradedBy?: string;
  updatedAt: string;
}

export interface ChatMessageServerRecord {
  id: string;
  channel: string;
  userId: string;
  userEmail: string;
  userName: string;
  role: string;
  text: string;
  parentId?: string;
  date: string;
  time: string;
  isEdited?: boolean;
  moderated?: boolean;
}

export interface SocialPostServerRecord {
  id: string;
  targetId: string;
  kind: "review" | "comment" | "post";
  userId: string;
  userEmail: string;
  userName: string;
  rating?: number;
  text: string;
  parentId?: string;
  isModerated?: boolean;
  moderatedReason?: string;
  date: string;
  updatedAt: string;
}

export interface LocalAccountRecord {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  passwordHash: string;
  authorizedCourses?: string[];
  suspended?: boolean;
  suspendedReason?: string;
  createdAt: string;
}

export interface MpesaTransactionRecord {
  id: string;
  checkoutRequestId: string;
  merchantRequestId: string;
  userId?: string;
  userEmail: string;
  userName?: string;
  phoneNumber: string;
  amount: number;
  currency: "KES";
  purpose: "book" | "course" | "fee" | "subscription";
  targetId: string;
  targetTitle?: string;
  accountReference: string;
  status: "pending" | "completed" | "failed" | "cancelled";
  resultCode?: number;
  resultDesc?: string;
  mpesaReceiptNumber?: string;
  transactionDate?: string;
  environment: "sandbox" | "production";
  shortcode: string;
  shortcodeType: "paybill" | "till";
  rawCallback?: any;
  createdAt: string;
  updatedAt: string;
}

interface SecurityDatabaseState {
  adminPasscodeHash?: string;
  accounts: Record<string, LocalAccountRecord>;
  suspendedUsers: Record<string, { reason: string; suspendedBy: string; suspendedAt: string }>;
  subAdminPermissions: Record<string, SubAdminPermissionRecord>;
  tutorCourses: Record<string, string[]>;
  books: Record<string, BookServerRecord>;
  orders: Record<string, OrderServerRecord>;
  bookEntitlements: Record<string, { bookId: string; userEmail: string; orderId: string; grantedAt: string }>;
  feePayments: Record<string, FeePaymentServerRecord>;
  enrollments: Record<string, EnrollmentServerRecord>;
  certificates: Record<string, CertificateServerRecord>;
  exams: Record<string, ExamDefinitionRecord>;
  examAnswerKeys: Record<string, ExamAnswerKeyStore>;
  examAttempts: Record<string, ExamAttemptRecord>;
  restrictedChannels: Record<string, { name: string; members: string[] }>;
  chatMessages: Record<string, ChatMessageServerRecord>;
  socialPosts: Record<string, SocialPostServerRecord>;
  aiUsage: Record<string, { minuteStart: number; minuteCount: number; dayKey: string; dayCount: number; totalCount: number }>;
  mpesaTransactions: Record<string, MpesaTransactionRecord>;
  processedReceipts: Record<string, { transactionId: string; processedAt: string; amount: number; phone: string }>;
  auditLogs: AuditLogEntry[];
  siteShowcase?: {
    heroBackdropUrl?: string;
    heroEyebrow?: string;
    heroTitleLead?: string;
    heroTitleAccent?: string;
    heroDescription?: string;
    vision?: string;
    mission?: string;
    slogan?: string;
    tagline?: string;
    intervalMs?: number;
    slides?: {
      id: string;
      title: string;
      subtitle: string;
      category: string;
      imageUrl: string;
      ctaLabel: string;
      targetView: string;
    }[];
    updatedAt?: string;
  };
  socialProfiles: Record<string, {
    email: string;
    name: string;
    headline?: string;
    bio?: string;
    avatar?: string;
    coverImage?: string;
    location?: string;
    onlineStatusVisible?: boolean;
    lastSeenAt?: string;
    skills?: string[];
    updatedAt: string;
  }>;
  userFollows: Record<string, string[]>;
  blockedUsers: Record<string, string[]>;
  moderationReports: {
    id: string;
    targetType: string;
    targetId: string;
    reason: string;
    reportedBy: string;
    createdAt: string;
    status: string;
  }[];
  privateConversations: Record<string, {
    id: string;
    participants: string[];
    disappearingTimer: "off" | "24h" | "7d";
    archivedBy: string[];
    mutedBy: string[];
    updatedAt: string;
    lastMessagePreview?: string;
  }>;
  privateMessages: Record<string, {
    id: string;
    conversationId: string;
    senderEmail: string;
    senderName: string;
    text: string;
    replyToId?: string;
    attachments?: {
      id: string;
      kind: "image" | "video" | "audio" | "document";
      name: string;
      mimeType: string;
      dataUrl: string;
      sizeBytes?: number;
    }[];
    reactions?: Record<string, string[]>;
    readBy: string[];
    edited?: boolean;
    deleted?: boolean;
    expiresAt?: string;
    createdAt: string;
  }>;
  callSignals: Record<string, {
    id: string;
    conversationId: string;
    fromEmail: string;
    toEmail: string;
    callType: "audio" | "video";
    signalType: "offer" | "answer" | "candidate" | "end";
    payload: unknown;
    createdAt: string;
  }[]>;
  reels: Record<string, {
    id: string;
    title: string;
    authorName: string;
    authorEmail: string;
    description: string;
    hashtags: string[];
    videoUrl: string;
    thumbnailUrl: string;
    duration: string;
    views: number;
    likes: string[];
    comments: { id: string; userName: string; userEmail: string; text: string; createdAt: string }[];
    createdAt: string;
  }>;
  reelPlaylists: Record<string, {
    id: string;
    ownerEmail: string;
    name: string;
    reelIds: string[];
    updatedAt: string;
  }>;
  communityGroups: Record<string, {
    id: string;
    name: string;
    category: string;
    description: string;
    privacy: "public" | "private";
    coverUrl: string;
    creatorEmail: string;
    admins: string[];
    moderators: string[];
    members: string[];
    invitedEmails: string[];
    events: { id: string; title: string; date: string; location: string; rsvps: string[] }[];
    discussions: { id: string; userName: string; userEmail: string; text: string; createdAt: string }[];
    createdAt: string;
  }>;
  professionalProfiles: Record<string, {
    email: string;
    name: string;
    headline: string;
    summary: string;
    location: string;
    cvName?: string;
    cvDataUrl?: string;
    skills: { name: string; endorsedBy: string[] }[];
    experience: { role: string; org: string; period: string }[];
    updatedAt: string;
  }>;
  professionalJobs: Record<string, {
    id: string;
    title: string;
    orgName: string;
    location: string;
    jobType: string;
    salaryRange: string;
    description: string;
    postedBy: string;
    applicants: { email: string; name: string; note: string; cvName?: string; appliedAt: string }[];
    createdAt: string;
  }>;
  professionalOrgs: Record<string, {
    id: string;
    name: string;
    sector: string;
    location: string;
    description: string;
    website?: string;
    followers: string[];
    createdBy: string;
    createdAt: string;
  }>;
  professionalArticles: Record<string, {
    id: string;
    title: string;
    summary: string;
    body: string;
    authorName: string;
    authorEmail: string;
    category: string;
    likes: string[];
    createdAt: string;
  }>;
  scheduledPosts: Record<string, {
    id: string;
    ownerEmail: string;
    ownerName: string;
    title: string;
    content: string;
    posterImageUrl?: string;
    targetPlatform: "Zion Connect" | "WhatsApp" | "Facebook";
    scheduledFor: string;
    status: "draft" | "scheduled" | "published";
    createdAt: string;
  }>;
}

function buildInitialState(): SecurityDatabaseState {
  const exams: Record<string, ExamDefinitionRecord> = {};
  const examAnswerKeys: Record<string, ExamAnswerKeyStore> = {};

  for (const [lessonId, data] of Object.entries(BUILTIN_EXAM_ANSWER_KEYS)) {
    const courseTrack =
      lessonId.includes("bible") || lessonId.includes("evangelism") || lessonId.includes("church")
        ? "bible"
        : lessonId.includes("coding") ||
          lessonId.includes("programming") ||
          lessonId.includes("robotics") ||
          lessonId.includes("graphic") ||
          lessonId.includes("video") ||
          lessonId.includes("maintenance") ||
          lessonId.includes("digital_service")
        ? "computer"
        : "leadership";

    exams[lessonId] = {
      id: lessonId,
      lessonId,
      courseTrack,
      title: data.topic,
      questions: [],
      durationMinutes: 30,
      maxAttempts: 3,
      resultsReleased: true,
      createdBy: "system",
      updatedAt: new Date().toISOString(),
    };
    examAnswerKeys[lessonId] = {
      answers: data.answers,
      updatedBy: "system",
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    accounts: {},
    suspendedUsers: {},
    subAdminPermissions: {
      "local.mod@wafula.com": {
        id: "ma-1",
        name: "Bungoma Local Moderator",
        email: "local.mod@wafula.com",
        permissions: {
          ...EMPTY_CAPABILITIES,
          allowBroadcast: true,
          allowApproval: true,
          allowModeration: true,
        },
        createdBy: "system",
        updatedAt: new Date().toISOString(),
      },
      "mod.clerk@wafula.com": {
        id: "ma-2",
        name: "Minor Clerk",
        email: "mod.clerk@wafula.com",
        permissions: { ...EMPTY_CAPABILITIES },
        createdBy: "system",
        updatedAt: new Date().toISOString(),
      },
    },
    tutorCourses: {},
    books: {},
    orders: {},
    bookEntitlements: {},
    feePayments: {},
    enrollments: {},
    certificates: {},
    exams,
    examAnswerKeys,
    examAttempts: {},
    restrictedChannels: {
      "#workers": {
        name: "Workers & Faculty Hub",
        members: Array.from(MAIN_ADMIN_EMAILS),
      },
      "#faculty": {
        name: "Faculty Private Room",
        members: Array.from(MAIN_ADMIN_EMAILS),
      },
    },
    chatMessages: {},
    socialPosts: {},
    aiUsage: {},
    mpesaTransactions: {},
    processedReceipts: {},
    auditLogs: [],
    socialProfiles: {},
    userFollows: {},
    blockedUsers: {},
    moderationReports: [],
    privateConversations: {},
    privateMessages: {},
    callSignals: {},
    reels: {
      reel_seed_1: {
        id: "reel_seed_1",
        title: "Morning Devotional: Walking in Kingdom Purpose",
        authorName: "Pastor Kelvin Wafula",
        authorEmail: "wafulak435@gmail.com",
        description: "Short daily charge from Bungoma Fellowship Hub on faithfulness in study and leadership.",
        hashtags: ["#MorningDevotion", "#FaithInAction", "#ZionConnect"],
        videoUrl: "",
        thumbnailUrl: "",
        duration: "0:48",
        views: 1240,
        likes: [],
        comments: [],
        createdAt: "2026-05-01T07:00:00.000Z",
      },
      reel_seed_2: {
        id: "reel_seed_2",
        title: "CBC & 8-4-4 Study Discipline Tips",
        authorName: "Grace Achieng",
        authorEmail: "grace.achieng@ziondigital.co.ke",
        description: "Practical daily revision structure for scholars preparing for term assessments.",
        hashtags: ["#StudyTips", "#ZionSchool", "#Excellence"],
        videoUrl: "",
        thumbnailUrl: "",
        duration: "1:05",
        views: 890,
        likes: [],
        comments: [],
        createdAt: "2026-05-02T09:30:00.000Z",
      },
    },
    reelPlaylists: {},
    communityGroups: {
      grp_bible_study: {
        id: "grp_bible_study",
        name: "Bible Study Group",
        category: "Bible Study",
        description: "Weekly verse-by-verse study across all 66 NIV books with discussion notes.",
        privacy: "public",
        coverUrl: "",
        creatorEmail: "wafulak435@gmail.com",
        admins: ["wafulak435@gmail.com"],
        moderators: ["grace.achieng@ziondigital.co.ke"],
        members: ["wafulak435@gmail.com", "grace.achieng@ziondigital.co.ke"],
        invitedEmails: [],
        events: [
          {
            id: "gevt_1",
            title: "Romans Chapter 8 Deep Dive",
            date: "2026-06-20 18:00",
            location: "Zion Fellowship Hall & Live Audio",
            rsvps: ["wafulak435@gmail.com"],
          },
        ],
        discussions: [
          {
            id: "gdisc_1",
            userName: "Pastor Kelvin Wafula",
            userEmail: "wafulak435@gmail.com",
            text: "Welcome to this week's Bible study thread. Share your key takeaway from Romans 8.",
            createdAt: "2026-05-03T10:00:00.000Z",
          },
        ],
        createdAt: "2026-05-01T08:00:00.000Z",
      },
      grp_youth_christ: {
        id: "grp_youth_christ",
        name: "Youth for Christ",
        category: "Fellowship",
        description: "Empowering young believers in Bungoma and East Africa through mentorship and service.",
        privacy: "public",
        coverUrl: "",
        creatorEmail: "wafulak435@gmail.com",
        admins: ["wafulak435@gmail.com"],
        moderators: [],
        members: ["wafulak435@gmail.com"],
        invitedEmails: [],
        events: [],
        discussions: [],
        createdAt: "2026-05-01T09:00:00.000Z",
      },
    },
    professionalProfiles: {
      "wafulak435@gmail.com": {
        email: "wafulak435@gmail.com",
        name: "Kelvin Opara Wafula",
        headline: "Chancellor & Lead Educator · Zion Digital Academy",
        summary: "Author, Christian educator, and digital systems architect equipping leaders across East Africa.",
        location: "Bungoma, Kenya",
        skills: [
          { name: "Leadership", endorsedBy: ["grace.achieng@ziondigital.co.ke"] },
          { name: "Curriculum Design", endorsedBy: [] },
          { name: "Theology & Ethics", endorsedBy: [] },
        ],
        experience: [
          { role: "Chancellor & Founder", org: "Zion Digital Academy", period: "2022 – Present" },
        ],
        updatedAt: "2026-05-01T08:00:00.000Z",
      },
    },
    professionalJobs: {
      job_seed_1: {
        id: "job_seed_1",
        title: "CBC STEM & Computer Studies Tutor",
        orgName: "Zion Digital Academy",
        location: "Bungoma / Hybrid",
        jobType: "Full-Time",
        salaryRange: "KES 45,000 – 65,000",
        description: "Teach Junior School CBC Computer Science & Mathematics with digital grading tools.",
        postedBy: "wafulak435@gmail.com",
        applicants: [],
        createdAt: "2026-05-01T10:00:00.000Z",
      },
      job_seed_2: {
        id: "job_seed_2",
        title: "Christian Media & Reels Editor (Internship)",
        orgName: "Zion Digital Publishers",
        location: "Remote / Kenya",
        jobType: "Internship",
        salaryRange: "KES 20,000 Stipend",
        description: "Edit short devotional clips, sermon highlights, and scripture graphics for Zion Connect.",
        postedBy: "wafulak435@gmail.com",
        applicants: [],
        createdAt: "2026-05-02T11:00:00.000Z",
      },
    },
    professionalOrgs: {
      org_seed_1: {
        id: "org_seed_1",
        name: "Zion Digital Publishers & Academy",
        sector: "Education & Christian Publishing",
        location: "Bungoma, Kenya",
        description: "Digital bookstore, accredited leadership academy, and community learning ecosystem.",
        website: "https://ziondigital.co.ke",
        followers: ["wafulak435@gmail.com"],
        createdBy: "wafulak435@gmail.com",
        createdAt: "2026-05-01T08:00:00.000Z",
      },
      org_seed_2: {
        id: "org_seed_2",
        name: "East Africa Christian Educators Network",
        sector: "Ministry & Schools",
        location: "Nairobi & Bungoma",
        description: "Supporting 8-4-4 and CBC teachers with Christian ethos curriculum resources.",
        followers: [],
        createdBy: "wafulak435@gmail.com",
        createdAt: "2026-05-02T08:00:00.000Z",
      },
    },
    professionalArticles: {
      art_seed_1: {
        id: "art_seed_1",
        title: "Building Ethical Digital Schools Across East Africa",
        summary: "How transparent grading, CBC competency portfolios, and faith-anchored mentorship raise future leaders.",
        body: "Modern African education thrives when digital record-keeping pairs with character formation. At Zion Digital Academy, teachers maintain real-time mark sheets and attendance logs while parents stay connected every week.",
        authorName: "Kelvin Opara Wafula",
        authorEmail: "wafulak435@gmail.com",
        category: "Leadership & Education",
        likes: [],
        createdAt: "2026-05-01T12:00:00.000Z",
      },
    },
    scheduledPosts: {},
  };
}

const STATE_BACKUP_FILE = `${STATE_FILE}.bak`;

function hydrateSecurityState(base: SecurityDatabaseState, raw: any): SecurityDatabaseState {
  return {
    ...base,
    ...raw,
    exams: { ...base.exams, ...(raw.exams || {}) },
    examAnswerKeys: { ...base.examAnswerKeys, ...(raw.examAnswerKeys || {}) },
    subAdminPermissions: { ...base.subAdminPermissions, ...(raw.subAdminPermissions || {}) },
    restrictedChannels: { ...base.restrictedChannels, ...(raw.restrictedChannels || {}) },
    mpesaTransactions: { ...(base.mpesaTransactions || {}), ...(raw.mpesaTransactions || {}) },
    processedReceipts: { ...(base.processedReceipts || {}), ...(raw.processedReceipts || {}) },
    auditLogs: Array.isArray(raw.auditLogs) ? raw.auditLogs : [],
    socialProfiles: { ...base.socialProfiles, ...(raw.socialProfiles || {}) },
    userFollows: { ...base.userFollows, ...(raw.userFollows || {}) },
    blockedUsers: { ...base.blockedUsers, ...(raw.blockedUsers || {}) },
    moderationReports: Array.isArray(raw.moderationReports) ? raw.moderationReports : [],
    privateConversations: { ...base.privateConversations, ...(raw.privateConversations || {}) },
    privateMessages: { ...base.privateMessages, ...(raw.privateMessages || {}) },
    callSignals: { ...base.callSignals, ...(raw.callSignals || {}) },
    reels: { ...base.reels, ...(raw.reels || {}) },
    reelPlaylists: { ...base.reelPlaylists, ...(raw.reelPlaylists || {}) },
    communityGroups: { ...base.communityGroups, ...(raw.communityGroups || {}) },
    professionalProfiles: { ...base.professionalProfiles, ...(raw.professionalProfiles || {}) },
    professionalJobs: { ...base.professionalJobs, ...(raw.professionalJobs || {}) },
    professionalOrgs: { ...base.professionalOrgs, ...(raw.professionalOrgs || {}) },
    professionalArticles: { ...base.professionalArticles, ...(raw.professionalArticles || {}) },
    scheduledPosts: { ...base.scheduledPosts, ...(raw.scheduledPosts || {}) },
  };
}

function loadSecurityState(): SecurityDatabaseState {
  const base = buildInitialState();
  const candidates = [STATE_FILE, STATE_BACKUP_FILE];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        const rawText = fs.readFileSync(candidate, "utf8");
        if (!rawText.trim()) continue;
        const raw = JSON.parse(rawText);
        if (candidate === STATE_BACKUP_FILE) {
          console.warn("Recovered security state automatically from rolling .bak backup.");
        }
        return hydrateSecurityState(base, raw);
      }
    } catch (err) {
      console.warn(`Failed parsing security state file (${path.basename(candidate)}):`, err);
    }
  }
  return base;
}

export const securityState: SecurityDatabaseState = loadSecurityState();

export function persistSecurityState(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const serialized = JSON.stringify(securityState, null, 2);
    const tmpFile = `${STATE_FILE}.tmp`;
    fs.writeFileSync(tmpFile, serialized, "utf8");
    // Preserve previous valid state file as .bak before replacing primary
    if (fs.existsSync(STATE_FILE)) {
      try {
        const prevRaw = fs.readFileSync(STATE_FILE, "utf8");
        if (prevRaw.trim().startsWith("{")) {
          fs.writeFileSync(STATE_BACKUP_FILE, prevRaw, "utf8");
        }
      } catch {
        // non-fatal backup copy failure
      }
    }
    fs.renameSync(tmpFile, STATE_FILE);
  } catch (err) {
    console.error("Failed persisting security state:", err);
  }
}

export function getSecurityStorageInfo() {
  const primaryBytes = fs.existsSync(STATE_FILE) ? fs.statSync(STATE_FILE).size : 0;
  const backupExists = fs.existsSync(STATE_BACKUP_FILE);
  const backupBytes = backupExists ? fs.statSync(STATE_BACKUP_FILE).size : 0;
  return {
    stateFile: path.basename(STATE_FILE),
    primaryBytes,
    backupExists,
    backupBytes,
    counts: {
      books: Object.keys(securityState.books || {}).length,
      orders: Object.keys(securityState.orders || {}).length,
      enrollments: Object.keys(securityState.enrollments || {}).length,
      feePayments: Object.keys(securityState.feePayments || {}).length,
      certificates: Object.keys(securityState.certificates || {}).length,
      chatMessages: Object.keys(securityState.chatMessages || {}).length,
      socialPosts: Object.keys(securityState.socialPosts || {}).length,
      auditLogs: (securityState.auditLogs || []).length,
    },
  };
}

export function exportSanitizedSecuritySnapshot() {
  const sanitizedAccounts: Record<string, any> = {};
  for (const [email, acc] of Object.entries(securityState.accounts || {})) {
    sanitizedAccounts[email] = {
      id: acc.id,
      email: acc.email,
      name: acc.name,
      role: acc.role,
      authorizedCourses: acc.authorizedCourses || [],
      suspended: Boolean(acc.suspended),
      suspendedReason: acc.suspendedReason,
      createdAt: acc.createdAt,
    };
  }
  const { adminPasscodeHash: _omitPass, accounts: _omitAcc, ...rest } = securityState;
  return {
    ...rest,
    accountsMetadata: sanitizedAccounts,
  };
}

export function restoreSecurityFromSnapshot(snapshot: any): { restoredKeys: string[] } {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw new Error("Invalid security snapshot object.");
  }

  // Snapshot existing state to a dedicated pre-restore backup before mutating memory
  if (fs.existsSync(STATE_FILE)) {
    try {
      fs.copyFileSync(STATE_FILE, `${STATE_FILE}.pre-restore.bak`);
    } catch {
      // ignore
    }
  }

  const recordMaps: Array<keyof SecurityDatabaseState> = [
    "subAdminPermissions",
    "tutorCourses",
    "suspendedUsers",
    "books",
    "bookEntitlements",
    "orders",
    "feePayments",
    "enrollments",
    "certificates",
    "exams",
    "examAnswerKeys",
    "examAttempts",
    "chatMessages",
    "socialPosts",
    "restrictedChannels",
    "mpesaTransactions",
    "processedReceipts",
    "socialProfiles",
    "userFollows",
    "blockedUsers",
    "privateConversations",
    "privateMessages",
    "callSignals",
    "reels",
    "reelPlaylists",
    "communityGroups",
    "professionalProfiles",
    "professionalJobs",
    "professionalOrgs",
    "professionalArticles",
    "scheduledPosts",
  ];

  const restoredKeys: string[] = [];
  for (const key of recordMaps) {
    if (snapshot[key] && typeof snapshot[key] === "object" && !Array.isArray(snapshot[key])) {
      (securityState as any)[key] = { ...(securityState as any)[key], ...snapshot[key] };
      restoredKeys.push(String(key));
    }
  }

  if (snapshot.siteShowcase && typeof snapshot.siteShowcase === "object") {
    securityState.siteShowcase = snapshot.siteShowcase;
    restoredKeys.push("siteShowcase");
  }
  if (Array.isArray(snapshot.moderationReports)) {
    securityState.moderationReports = snapshot.moderationReports;
    restoredKeys.push("moderationReports");
  }

  persistSecurityState();
  return { restoredKeys };
}

export function recordAuditLog(params: {
  actor?: RequestIdentity | null;
  actorEmail?: string;
  actorRole?: string;
  category: AuditLogEntry["category"];
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  ip?: string;
}): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: `audit_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
    timestamp: new Date().toISOString(),
    actorId: params.actor?.uid || params.actorEmail || "anonymous",
    actorEmail: params.actor?.email || params.actorEmail || "anonymous",
    actorRole: params.actor?.role || params.actorRole || "anonymous",
    category: params.category,
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId,
    details: params.details,
    ip: params.ip,
  };
  securityState.auditLogs.unshift(entry);
  if (securityState.auditLogs.length > 5000) {
    securityState.auditLogs.length = 5000;
  }
  persistSecurityState();
  return entry;
}

// --- Session Cookie & Token Signing ---
export interface SessionTokenPayload {
  uid: string;
  email: string;
  name: string;
  iat: number;
  exp: number;
}

export function signSessionToken(payload: Omit<SessionTokenPayload, "iat" | "exp">, ttlSeconds = 60 * 60 * 24 * 7): string {
  const fullPayload: SessionTokenPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string): SessionTokenPayload | null {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [encoded, providedSig] = token.split(".");
  if (!encoded || !providedSig) return null;
  const expectedSig = crypto.createHmac("sha256", SESSION_SECRET).update(encoded).digest("base64url");
  const bufA = Buffer.from(providedSig, "utf8");
  const bufB = Buffer.from(expectedSig, "utf8");
  if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionTokenPayload;
    if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) return null;
    if (!parsed.email || !parsed.uid) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function parseCookies(cookieHeader?: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  cookieHeader.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    const val = decodeURIComponent(part.slice(idx + 1).trim());
    result[key] = val;
  });
  return result;
}

function isHttpsRequest(req?: Request): boolean {
  if (!req) return process.env.NODE_ENV === "production";
  const fwdProto = String(req.headers["x-forwarded-proto"] || "").toLowerCase();
  return req.secure || fwdProto.includes("https") || process.env.NODE_ENV === "production";
}

export function setSessionCookie(res: Response, token: string, req?: Request): void {
  const isHttps = isHttpsRequest(req);
  res.cookie("zion_session", token, {
    httpOnly: true,
    sameSite: isHttps ? "none" : "lax",
    secure: isHttps,
    ...(isHttps ? { partitioned: true } : {}),
    maxAge: 1000 * 60 * 60 * 24 * 7,
    path: "/",
  } as any);
}

export function clearSessionCookie(res: Response, req?: Request): void {
  const isHttps = isHttpsRequest(req);
  res.clearCookie("zion_session", {
    path: "/",
    httpOnly: true,
    sameSite: isHttps ? "none" : "lax",
    secure: isHttps,
    ...(isHttps ? { partitioned: true } : {}),
  } as any);
}

export function resolveAuthoritativeRoleAndPermissions(email: string, uid?: string): {
  role: AppRole;
  isMainAdmin: boolean;
  isSuspended: boolean;
  capabilities: SubAdminCapabilityMap;
  authorizedCourses: string[];
} {
  const lower = email.toLowerCase().trim();
  const isSuspended = Boolean(securityState.suspendedUsers[lower] || (uid && securityState.suspendedUsers[uid]));
  const isMainAdmin = MAIN_ADMIN_EMAILS.has(lower);

  if (isMainAdmin) {
    return {
      role: "main_admin",
      isMainAdmin: true,
      isSuspended,
      capabilities: {
        allowBroadcast: true,
        allowApproval: true,
        allowVault: true,
        allowManageBooks: true,
        allowConfirmPayments: true,
        allowManageEnrollments: true,
        allowManageExams: true,
        allowIssueCertificates: true,
        allowModeration: true,
        allowSuspendUsers: true,
      },
      authorizedCourses: ["*"],
    };
  }

  const subAdmin = securityState.subAdminPermissions[lower];
  if (subAdmin) {
    return {
      role: "sub_admin",
      isMainAdmin: false,
      isSuspended,
      capabilities: { ...EMPTY_CAPABILITIES, ...subAdmin.permissions },
      authorizedCourses: securityState.tutorCourses[lower] || [],
    };
  }

  const account = securityState.accounts[lower];
  if (account) {
    return {
      role: account.role,
      isMainAdmin: false,
      isSuspended: isSuspended || Boolean(account.suspended),
      capabilities: { ...EMPTY_CAPABILITIES },
      authorizedCourses: securityState.tutorCourses[lower] || account.authorizedCourses || [],
    };
  }

  const tutorCourses = securityState.tutorCourses[lower];
  if (tutorCourses && tutorCourses.length > 0) {
    return {
      role: "tutor",
      isMainAdmin: false,
      isSuspended,
      capabilities: { ...EMPTY_CAPABILITIES },
      authorizedCourses: tutorCourses,
    };
  }

  return {
    role: "member",
    isMainAdmin: false,
    isSuspended,
    capabilities: { ...EMPTY_CAPABILITIES },
    authorizedCourses: [],
  };
}

// Short cache for verified remote Supabase tokens to avoid excessive latency per request
const remoteTokenCache = new Map<string, { uid: string; email: string; name: string; exp: number }>();

function buildSupabaseEnvOverrides() {
  const url = (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ""
  ).trim();
  const publishableKey = (
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ""
  ).trim();
  const secretKey = (process.env.SUPABASE_SECRET_KEY || "").trim();
  const jwksUrlRaw = (process.env.SUPABASE_JWKS_URL || "").trim();

  let jwksUrl: URL | undefined;
  if (jwksUrlRaw && jwksUrlRaw.startsWith("https://")) {
    try {
      jwksUrl = new URL(jwksUrlRaw);
    } catch {
      jwksUrl = undefined;
    }
  }

  return {
    url: url || undefined,
    publishableKeys: publishableKey ? { default: publishableKey } : undefined,
    secretKeys: secretKey ? { default: secretKey } : undefined,
    jwks: jwksUrl,
  };
}

export function getSupabaseServerStatus(): {
  configured: boolean;
  hasUrl: boolean;
  hasPublishableKey: boolean;
  hasSecretKey: boolean;
  jwksConfigured: boolean;
  missingEnvVars: string[];
} {
  const overrides = buildSupabaseEnvOverrides();
  const { data: env } = resolveEnv(overrides);
  const hasUrl = Boolean(env?.url);
  const hasPublishableKey = Boolean(env && Object.keys(env.publishableKeys || {}).length > 0);
  const hasSecretKey = Boolean(env && Object.keys(env.secretKeys || {}).length > 0);
  const jwksConfigured = Boolean(env?.jwks);

  const missingEnvVars: string[] = [];
  if (!hasUrl) missingEnvVars.push("SUPABASE_URL (or VITE_SUPABASE_URL)");
  if (!hasPublishableKey) missingEnvVars.push("SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY / VITE_SUPABASE_ANON_KEY)");
  if (!hasSecretKey) missingEnvVars.push("SUPABASE_SECRET_KEY");

  return {
    configured: hasUrl && hasPublishableKey,
    hasUrl,
    hasPublishableKey,
    hasSecretKey,
    jwksConfigured,
    missingEnvVars,
  };
}

export function createSupabaseServerUserClient(accessToken: string) {
  try {
    const overrides = buildSupabaseEnvOverrides();
    if (!overrides.url || !overrides.publishableKeys) return null;
    return createContextClient({
      auth: { token: accessToken },
      env: overrides,
    });
  } catch {
    return null;
  }
}

export function createSupabaseServerAdminClient() {
  try {
    const overrides = buildSupabaseEnvOverrides();
    if (!overrides.url || !overrides.secretKeys) return null;
    return createAdminClient({
      env: overrides,
    });
  } catch {
    return null;
  }
}

export async function verifySupabaseTokenWithServerSdk(
  token: string
): Promise<{ uid: string; email: string; name: string; source: "supabase" } | null> {
  if (!token) return null;
  const cached = remoteTokenCache.get(token);
  if (cached && cached.exp > Date.now()) {
    return { uid: cached.uid, email: cached.email, name: cached.name, source: "supabase" };
  }

  const overrides = buildSupabaseEnvOverrides();
  if (!overrides.url) return null;

  // 1. Primary verification via @supabase/server JWKS asymmetric signature verification
  try {
    const { data: auth, error } = await verifyCredentials(
      { token, apikey: null },
      {
        auth: "user",
        issuer: fromSupabaseUrl(overrides.url),
        env: overrides,
      }
    );
    if (!error && auth?.userClaims?.id && auth.userClaims.email) {
      const claims = (auth.jwtClaims || {}) as Record<string, any>;
      const userMeta = (claims.user_metadata || {}) as Record<string, any>;
      const emailVerified = claims.email_verified !== false && userMeta.email_verified !== false;
      const resolvedEmail = emailVerified ? String(auth.userClaims.email) : `unverified:${auth.userClaims.id}`;
      const name = String(userMeta.full_name || userMeta.name || auth.userClaims.email.split("@")[0]);
      remoteTokenCache.set(token, {
        uid: String(auth.userClaims.id),
        email: resolvedEmail,
        name,
        exp: Date.now() + 60_000,
      });
      return { uid: String(auth.userClaims.id), email: resolvedEmail, name, source: "supabase" };
    }
  } catch {
    // Fallback below if project uses non-JWKS signing or endpoint lookup is needed
  }

  // 2. Fallback verification via Supabase Auth user endpoint using publishable/anon key
  const apiKey = overrides.publishableKeys?.default || "";
  if (apiKey) {
    try {
      const resp = await fetch(`${overrides.url}/auth/v1/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: apiKey,
        },
      });
      if (resp.ok) {
        const user = (await resp.json()) as any;
        if (user?.id && user?.email) {
          const emailVerified = Boolean(user.email_confirmed_at || user.confirmed_at || user.user_metadata?.email_verified);
          const resolvedEmail = emailVerified ? String(user.email) : `unverified:${user.id}`;
          const name = String(user.user_metadata?.full_name || user.email.split("@")[0]);
          remoteTokenCache.set(token, {
            uid: String(user.id),
            email: resolvedEmail,
            name,
            exp: Date.now() + 60_000,
          });
          return { uid: String(user.id), email: resolvedEmail, name, source: "supabase" };
        }
      }
    } catch {
      // ignore network error
    }
  }
  return null;
}

export async function resolveRequestIdentity(req: Request): Promise<RequestIdentity | null> {
  const cookies = parseCookies(req.headers.cookie);
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  let base: { uid: string; email: string; name: string; source: RequestIdentity["authSource"] } | null = null;

  if (bearerToken) {
    const localVerified = verifySessionToken(bearerToken);
    if (localVerified) {
      base = { uid: localVerified.uid, email: localVerified.email, name: localVerified.name, source: "zion_session" };
    } else {
      const supa = await verifySupabaseTokenWithServerSdk(bearerToken);
      if (supa) {
        base = supa;
      }
    }
  }

  if (!base && cookies.zion_session) {
    const cookieVerified = verifySessionToken(cookies.zion_session);
    if (cookieVerified) {
      base = { uid: cookieVerified.uid, email: cookieVerified.email, name: cookieVerified.name, source: "zion_session" };
    }
  }

  if (!base && (req as RequestWithSsrUser).ssrSupabaseUser) {
    base = (req as RequestWithSsrUser).ssrSupabaseUser!;
  }

  if (!base) return null;

  const resolved = resolveAuthoritativeRoleAndPermissions(base.email, base.uid);
  return {
    uid: base.uid,
    email: base.email,
    name: base.name,
    role: resolved.role,
    isMainAdmin: resolved.isMainAdmin,
    isSuspended: resolved.isSuspended,
    capabilities: resolved.capabilities,
    authorizedCourses: resolved.authorizedCourses,
    authSource: base.source,
  };
}

export async function attachIdentity(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  req.identity = (await resolveRequestIdentity(req)) || undefined;
  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.identity) {
    return res.status(401).json({ success: false, error: "Authentication required." });
  }
  if (req.identity.isSuspended) {
    return res.status(403).json({ success: false, error: "Account is suspended. Contact administrator." });
  }
  return next();
}

export function requireMainAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.identity) {
    return res.status(401).json({ success: false, error: "Authentication required." });
  }
  if (req.identity.isSuspended || !req.identity.isMainAdmin) {
    recordAuditLog({
      actor: req.identity,
      category: "ACCESS_DENIED",
      action: "MAIN_ADMIN_ROUTE_BLOCKED",
      targetType: "route",
      targetId: req.originalUrl,
      details: `Non-main-admin attempted privileged operation: ${req.method} ${req.originalUrl}`,
      ip: req.ip,
    });
    return res.status(403).json({ success: false, error: "Main Administrator privileges required." });
  }
  return next();
}

export function hasCapability(identity: RequestIdentity, capability: SubAdminCapabilityKey): boolean {
  if (identity.isMainAdmin) return true;
  if (identity.role !== "sub_admin") return false;
  return Boolean(identity.capabilities[capability]);
}

export function requireAdminAccess(requiredCapability?: SubAdminCapabilityKey) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.identity) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }
    if (req.identity.isSuspended) {
      return res.status(403).json({ success: false, error: "Account is suspended." });
    }
    const isAdminLevel = req.identity.isMainAdmin || req.identity.role === "sub_admin";
    if (!isAdminLevel) {
      recordAuditLog({
        actor: req.identity,
        category: "ACCESS_DENIED",
        action: "ADMIN_ACCESS_BLOCKED",
        targetType: "route",
        targetId: req.originalUrl,
        details: `Role "${req.identity.role}" denied admin access to ${req.method} ${req.originalUrl}`,
        ip: req.ip,
      });
      return res.status(403).json({ success: false, error: "Administrative access required." });
    }
    if (requiredCapability && !hasCapability(req.identity, requiredCapability)) {
      recordAuditLog({
        actor: req.identity,
        category: "ACCESS_DENIED",
        action: "SUBADMIN_CAPABILITY_DENIED",
        targetType: "capability",
        targetId: requiredCapability,
        details: `Sub-admin lacked capability "${requiredCapability}" on ${req.method} ${req.originalUrl}`,
        ip: req.ip,
      });
      return res.status(403).json({
        success: false,
        error: `Missing required sub-admin permission: ${requiredCapability}`,
      });
    }
    return next();
  };
}

export function requireManagerAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.identity) {
    return res.status(401).json({ success: false, error: "Authentication required." });
  }
  if (req.identity.isSuspended) {
    return res.status(403).json({ success: false, error: "Account is suspended." });
  }
  const allowed =
    req.identity.isMainAdmin ||
    req.identity.role === "manager" ||
    (req.identity.role === "sub_admin" &&
      (req.identity.capabilities.allowManageEnrollments ||
        req.identity.capabilities.allowConfirmPayments ||
        req.identity.capabilities.allowManageExams ||
        req.identity.capabilities.allowIssueCertificates ||
        req.identity.capabilities.allowApproval));

  if (!allowed) {
    recordAuditLog({
      actor: req.identity,
      category: "ACCESS_DENIED",
      action: "MANAGER_PORTAL_BLOCKED",
      targetType: "route",
      targetId: req.originalUrl,
      details: `Unauthorized user attempted to access manager portal route ${req.originalUrl}`,
      ip: req.ip,
    });
    return res.status(403).json({ success: false, error: "Manager or authorized sub-admin access required." });
  }
  return next();
}

export function canTutorAccessCourse(identity: RequestIdentity, courseOrLessonId: string): boolean {
  if (identity.isMainAdmin || identity.role === "manager") return true;
  if (identity.role === "sub_admin" && identity.capabilities.allowManageExams) return true;
  if (identity.role !== "tutor") return false;
  return identity.authorizedCourses.includes("*") || identity.authorizedCourses.includes(courseOrLessonId);
}

// Per-user AI request rate limiting & usage tracking
const AI_MINUTE_LIMIT = 15;
const AI_DAILY_LIMIT_MEMBER = 100;
const AI_DAILY_LIMIT_ADMIN = 500;

export function enforceAiRateLimit(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.identity) {
    return res.status(401).json({ success: false, error: "Sign in required to invoke AI assistant endpoints." });
  }
  const userKey = req.identity.email.toLowerCase();
  const now = Date.now();
  const dayKey = new Date(now).toISOString().slice(0, 10);
  const dailyMax = req.identity.isMainAdmin ? AI_DAILY_LIMIT_ADMIN : AI_DAILY_LIMIT_MEMBER;

  const cur = securityState.aiUsage[userKey] || {
    minuteStart: now,
    minuteCount: 0,
    dayKey,
    dayCount: 0,
    totalCount: 0,
  };

  if (now - cur.minuteStart > 60_000) {
    cur.minuteStart = now;
    cur.minuteCount = 0;
  }
  if (cur.dayKey !== dayKey) {
    cur.dayKey = dayKey;
    cur.dayCount = 0;
  }

  if (cur.minuteCount >= AI_MINUTE_LIMIT || cur.dayCount >= dailyMax) {
    recordAuditLog({
      actor: req.identity,
      category: "AI_USAGE",
      action: "AI_RATE_LIMIT_EXCEEDED",
      targetType: "endpoint",
      targetId: req.path,
      details: `AI rate limit exceeded (minute=${cur.minuteCount}/${AI_MINUTE_LIMIT}, day=${cur.dayCount}/${dailyMax})`,
      ip: req.ip,
    });
    return res.status(429).json({
      success: false,
      error: "AI request quota limit reached. Please wait a moment before sending another request.",
    });
  }

  cur.minuteCount += 1;
  cur.dayCount += 1;
  cur.totalCount += 1;
  securityState.aiUsage[userKey] = cur;
  persistSecurityState();
  return next();
}

export function sanitizeUploadId(rawId: string): string | null {
  const cleaned = String(rawId || "").trim();
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(cleaned)) return null;
  return cleaned;
}

export function resolveSafeFileInsideDir(baseDir: string, fileName: string): string | null {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(resolvedBase, path.basename(fileName));
  if (!resolvedTarget.startsWith(resolvedBase + path.sep)) {
    return null;
  }
  return resolvedTarget;
}
