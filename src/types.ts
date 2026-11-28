export type SectionKey = 'school_1' | 'school_2' | 'bookstore' | 'mission';

export type AppRole =
  | 'super_admin'
  | 'manager'
  | 'user'
  | 'admin'
  | 'main_admin'
  | 'sub_admin'
  | 'tutor'
  | 'member'
  | 'guest';

export interface SubAdminCapabilityMap {
  allowBroadcast: boolean;
  allowApproval: boolean;
  allowVault: boolean;
  allowManageBooks: boolean;
  allowConfirmPayments: boolean;
  allowManageEnrollments: boolean;
  allowManageStudents: boolean;
  allowManageExams: boolean;
  allowIssueCertificates: boolean;
  allowManageLeadership: boolean;
  allowManageComputer: boolean;
  allowManageBible: boolean;
  allowModeration: boolean;
  allowSuspendUsers: boolean;
}

export interface SubAdminPermission {
  id: string;
  name: string;
  email: string;
  permissions: SubAdminCapabilityMap;
  createdBy?: string;
  updatedAt?: string;
}

export interface User {
  id?: string;
  email: string;
  name: string;
  role: AppRole;
  assigned_sections?: SectionKey[];
  isMainAdmin?: boolean;
  isSuspended?: boolean;
  permissions?: Partial<SubAdminCapabilityMap>;
  authorizedCourses?: string[];
  avatarUrl?: string;
  readingStreak?: number;
  dailyGoalMinutes?: number;
  phone?: string;
  phone_number?: string;
  subscription_status?: 'free' | 'active' | 'past_due' | 'cancelled';
  plan_name?: string;
  credits?: number;
  createdAt?: string;
  lastLoginAt?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone_number: string | null;
  role: AppRole;
  assigned_sections?: SectionKey[];
  subscription_status: 'free' | 'active' | 'past_due' | 'cancelled';
  plan_name: string;
  credits: number;
  created_at?: string;
  updated_at?: string;
}

export interface UserHistoryRecord {
  id: string;
  user_id: string;
  title: string;
  category: string;
  prompt: string;
  response: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface StorageFileItem {
  name: string;
  path: string;
  size: number;
  mimeType: string;
  createdAt: string;
  signedUrl?: string;
}

export type BookCategory = 
  | 'Fiction'
  | 'Non-Fiction'
  | 'Business'
  | 'Technology'
  | 'Self-Help'
  | 'Education'
  | 'Health'
  | 'Science'
  | 'Religion'
  | 'Leadership'
  | 'Mathematics'
  | 'Personal Development';

export interface Book {
  id: string;
  title: string;
  author: string;
  authorEmail?: string;
  price: number; // in KES
  category: BookCategory;
  description: string;
  coverImage: string;
  fileSize: string; // e.g. "4.2MB"
  pages: number;
  publishedDate: string; // YYYY-MM-DD
  isFeatured: boolean;
  status: 'active' | 'draft';
  rating: number; // updated dynamically
  reviewsCount: number;
  pdfUrl?: string;
  allowPreview?: boolean;
  previewDuration?: number; // duration in seconds, e.g. 30
  isSynced?: boolean;
  content?: string;
  stockQuantity?: number;
  isPhysical?: boolean;
  created_by?: string;
  created_by_id?: string;
  created_at?: string;
}

export interface Review {
  id: string;
  productId: string; // book or media ID
  userId: string;
  userName: string;
  rating: number; // 1 to 5 stars
  text: string;
  date: string;
}

export interface Comment {
  id: string;
  targetId: string; // book, media, or community post ID
  userId: string;
  userName: string;
  text: string;
  date: string;
  parentId?: string; // for nested replies
  isModerated?: boolean; // if flagged/moderated by admin
  moderatedReason?: string; // optional reason why it was moderated
  originalText?: string; // original text for admin tracking
}

export interface CommunityMessage {
  id: string;
  channel: '#generatechat' | '#workers' | '#General' | '#Book Talks' | '#Leadership' | '#Publishing' | string;
  userId: string;
  userName: string;
  userEmail?: string;
  userAvatar?: string;
  isAdmin?: boolean;
  text: string;
  date: string;
  time: string;
  replies?: CommunityMessage[];
  parentId?: string;
  role?: string;
  isEdited?: boolean;
  imageContent?: string;
  stickerEmoji?: string;
  attachedFile?: { name: string; type: string; dataUrl?: string; sizeStr?: string; url?: string };
}

export interface SavedDocument {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: 'pdf' | 'doc' | 'video' | 'photo' | 'audio' | 'link' | 'book';
  folder: string; // Folder name, e.g. "General", "AI Extractions", "Books"
  date: string;
  fileSize: string;
  downloadUrl?: string;
  highlights?: { text: string; color: string; index?: number; id: string }[];
}

export interface SearchHistoryItem {
  id: string;
  userId: string;
  query: string;
  response: string;
  category: string; // 'Read Photo', 'Assistant', 'Publisher', etc.
  date: string;
}

export interface PersonalLink {
  id: string;
  userId: string;
  title: string;
  url: string;
  category: string;
  date: string;
}

export interface ReadingStreak {
  streakDays: number;
  lastReadDate: string; // YYYY-MM-DD
  dailyGoalMinutes: number;
  todayMinutes: number;
  unlockedBadgeIds: string[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string; // e.g., "Fiction Reader", "Early Bird", "Super Member"
}

export interface BibleVerse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface Devotional {
  id: string;
  title: string;
  verse: string;
  reflection: string;
  prayer: string;
  date: string;
}

export interface MemberUploadRequest {
  id: string;
  userId: string;
  userName: string;
  title: string;
  type: 'pdf' | 'video' | 'photo' | 'audio';
  fileSize: string;
  status: 'pending' | 'approved' | 'rejected' | 'pending_delete';
  allowedToPublic: boolean;
  date: string;
  contentUrl?: string;
  subFiles?: string[];
  paid?: boolean;
  audioDuration?: string;
  audioCodec?: string;
  thumbnail?: string;
  hasLocalBlob?: boolean;
  category?: string;
}

export interface Announcement {
  id: string;
  text: string;
  date: string;
  author: string;
}

export interface GameScore {
  gameId: string;
  highScore: number;
  streak: number;
  playedCount: number;
}

export interface AppSettings {
  primaryColor: string; // Hex color selector string e.g. "#3B82F6"
  fontSizeMultiplier: number; // Font size scale multiplier e.g. 1.0, 1.1, etc.
  customLogoUrl?: string; // Opt-in base64 custom enterprise branding image files
  restrictMemberUploads?: boolean; // If true, non-admins are restricted from uploading
}

export interface BookOrder {
  id: string;
  userId: string;
  userEmail?: string;
  userName: string;
  bookId: string;
  bookTitle: string;
  price: number;
  paymentMethod?: string;
  phoneNumber?: string;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
  confirmedBy?: string;
  confirmedAt?: string;
}

export interface FeePayment {
  id: string;
  userEmail: string;
  userName: string;
  courseId: string;
  amount: number;
  phoneNumber?: string;
  reference?: string;
  status: 'pending' | 'confirmed' | 'rejected';
  confirmedBy?: string;
  confirmedAt?: string;
  createdAt: string;
}

export interface EnrollmentRecord {
  id: string;
  userEmail: string;
  userName: string;
  courseId: string;
  courseTitle: string;
  status: 'pending' | 'approved' | 'rejected';
  feeStatus: 'unpaid' | 'pending' | 'paid' | 'waived';
  certificateIssued: boolean;
  approvedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  courseId: string;
  userEmail: string;
  userName: string;
  startedAt: string;
  expiresAt: string;
  submittedAt?: string;
  status: 'in_progress' | 'submitted' | 'graded';
  score?: number;
  passed?: boolean;
  gradedBy?: string;
  gradedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorEmail: string;
  actorRole: string;
  category:
    | 'ADMIN_ACTION'
    | 'ROLE_CHANGE'
    | 'BOOK_ACTION'
    | 'PAYMENT_ACTION'
    | 'ENROLLMENT_ACTION'
    | 'EXAM_ACTION'
    | 'CERTIFICATE_ACTION'
    | 'USER_MODERATION'
    | 'ACCESS_DENIED';
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  ip?: string;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: 'free_book' | 'wifi_alert' | 'general';
  targetBookId?: string;
  date: string;
}

export interface WifiPurchase {
  id: string;
  userId: string;
  userName: string;
  planName: string;
  price: number;
  phoneNumber: string;
  status: 'pending' | 'approved' | 'rejected';
  expiresAt: string;
  date: string;
}

export interface CertificateDownload {
  id: string;
  name: string;
  email: string;
  schoolName: string;
  courseTopic: string;
  score: number;
  ledgerHash: string;
  date: string;
  downloadedAt: string;
  issuedBy?: string;
}

export interface SermonVideo {
  id: string;
  title: string;
  speaker: string;
  videoUrl: string;
  thumbnailUrl: string;
  description: string;
  category: 'Sermon' | 'Motivation' | 'Evangelism' | 'Worship Songs';
  duration: string;
  date: string;
  likesCount?: number;
  viewsCount?: number;
}

export interface SocialProfile {
  email: string;
  name: string;
  username: string;
  bio: string;
  headline: string;
  location?: string;
  avatarUrl?: string;
  coverPhotoUrl?: string;
  education?: string;
  occupation?: string;
  skills: string[];
  showOnlineStatus: boolean;
  isOnline?: boolean;
  lastSeen?: string;
  dmPrivacy: 'everyone' | 'connections';
}

export interface PrivateConversation {
  id: string;
  participants: string[]; // strict 2-element lowercased email list
  participantNames: Record<string, string>;
  disappearingTimer: 'off' | '24h' | '7d';
  archivedBy: string[];
  mutedBy: string[];
  lastMessageText?: string;
  lastMessageAt?: string;
  unreadCounts: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface PrivateMessageAttachment {
  name: string;
  type: 'image' | 'video' | 'audio' | 'document';
  dataUrl?: string;
  sizeStr?: string;
  durationSec?: number;
}

export interface PrivateMessage {
  id: string;
  conversationId: string;
  senderEmail: string;
  senderName: string;
  text: string;
  replyToId?: string;
  replyPreview?: string;
  attachment?: PrivateMessageAttachment;
  reactions: Record<string, string[]>; // emoji -> array of user emails
  readBy: string[];
  isEdited?: boolean;
  deletedForAll?: boolean;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface ReelComment {
  id: string;
  userEmail: string;
  userName: string;
  text: string;
  createdAt: string;
}

export interface ReelItem {
  id: string;
  creatorEmail: string;
  creatorName: string;
  title: string;
  caption: string;
  category: 'Christian Reels' | 'Sermons' | 'Worship' | 'Youth' | 'Leadership' | 'Education';
  hashtags: string[];
  taggedUsers: string[];
  videoUrl: string;
  thumbnailUrl?: string;
  likes: string[];
  views: number;
  comments: ReelComment[];
  createdAt: string;
}

export interface CommunityGroupEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
  rsvps: string[];
  createdBy: string;
}

export interface CommunityGroupPost {
  id: string;
  authorEmail: string;
  authorName: string;
  text: string;
  attachmentName?: string;
  createdAt: string;
}

export interface CommunityGroup {
  id: string;
  name: string;
  category: 'Bible Study' | 'Prayer' | 'Fellowship' | 'Youth' | 'Leadership' | 'Professional';
  privacy: 'public' | 'private';
  description: string;
  coverImage?: string;
  creatorEmail: string;
  admins: string[];
  moderators: string[];
  members: string[];
  events: CommunityGroupEvent[];
  posts: CommunityGroupPost[];
  createdAt: string;
}

export interface ProfessionalJob {
  id: string;
  title: string;
  organization: string;
  location: string;
  type: 'Full-Time' | 'Part-Time' | 'Internship' | 'Ministry' | 'Remote';
  salaryRange: string;
  description: string;
  skillsRequired: string[];
  postedByEmail: string;
  postedByName: string;
  applicants: { email: string; name: string; note: string; cvName?: string; appliedAt: string }[];
  createdAt: string;
}

export interface ProfessionalOrg {
  id: string;
  name: string;
  sector: string;
  location: string;
  description: string;
  website?: string;
  ownerEmail: string;
  followers: string[];
  verified?: boolean;
  createdAt: string;
}

export interface ProfessionalArticle {
  id: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  authorEmail: string;
  authorName: string;
  likes: string[];
  createdAt: string;
}

export interface ScheduledStudioPost {
  id: string;
  authorEmail: string;
  authorName: string;
  title: string;
  caption: string;
  hashtags: string[];
  targetChannel: 'zion_connect' | 'group' | 'professional';
  status: 'draft' | 'scheduled' | 'published';
  scheduledFor?: string;
  posterDataUrl?: string;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ Zion RBAC & Modular Architecture */

export interface AuditLogItem {
  id: string;
  section: SectionKey | 'admin' | 'auth';
  action: 'create' | 'update' | 'delete' | 'permission_change' | 'enroll' | 'order' | 'promote' | 'revoke';
  itemTitle: string;
  itemId?: string;
  created_by: string;
  created_by_id: string;
  created_at: string;
  details?: string;
}

export interface CourseAssignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  maxPoints: number;
  submissionsCount?: number;
}

export interface SchoolCourseItem {
  id: string;
  section: 'school_1' | 'school_2';
  title: string;
  courseCode: string;
  description: string;
  duration: string;
  feeKes: number;
  lessonsCount: number;
  videoUrl?: string;
  studyMaterials: string[];
  assignments: CourseAssignment[];
  announcements: string[];
  enrolledStudents: string[];
  created_by: string;
  created_by_id?: string;
  created_at: string;
}

export interface MissionOutreachItem {
  id: string;
  title: string;
  theme: string;
  type: 'Physical Crusade' | 'Online Crusade' | 'Mission Trip';
  venue: string;
  date: string;
  time: string;
  expectedAttendance: number;
  rsvpsCount: number;
  registeredVolunteers: string[];
  description: string;
  status: 'upcoming' | 'live' | 'completed';
  created_by: string;
  created_by_id?: string;
  created_at: string;
}

export interface MissionVolunteerItem {
  id: string;
  eventId: string;
  eventTitle: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  rolePreference: string;
  registeredAt: string;
}

export interface PrayerRequestItem {
  id: string;
  authorName: string;
  authorEmail?: string;
  category: string;
  request: string;
  isAnonymous: boolean;
  status: 'pending' | 'approved';
  prayersCount: number;
  createdAt: string;
}

export interface MissionFieldReportItem {
  id: string;
  title: string;
  location: string;
  date: string;
  narrative: string;
  soulsSavedCount: number;
  attendeesCount: number;
  created_by: string;
  created_by_id?: string;
  created_at: string;
}

export interface PaymentSettingsConfig {
  mpesaPaybill: string;
  mpesaTill: string;
  mpesaConsumerKey: string;
  mpesaConsumerSecret: string;
  mpesaPasskey: string;
  paystackPublicKey: string;
  paystackSecretKey: string;
  currency: 'KES';
  updatedAt: string;
  updatedBy: string;
}

