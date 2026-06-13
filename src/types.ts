export interface User {
  id?: string;
  email: string;
  name: string;
  role: 'admin' | 'member' | 'guest';
  avatarUrl?: string;
  readingStreak?: number;
  dailyGoalMinutes?: number;
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
  | 'Leadership';

export interface Book {
  id: string;
  title: string;
  author: string;
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
}

export interface CommunityMessage {
  id: string;
  channel: '#General' | '#Book Talks' | '#Leadership' | '#Publishing';
  userId: string;
  userName: string;
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
  userName: string;
  bookId: string;
  bookTitle: string;
  price: number;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
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
}
