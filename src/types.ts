export interface User {
  id?: string;
  email: string;
  name: string;
  role: 'admin' | 'member';
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
  | 'Religion';

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
}

export interface SavedDocument {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: 'pdf' | 'doc' | 'video' | 'photo';
  folder: string; // Folder name, e.g. "General", "AI Extractions", "Books"
  date: string;
  fileSize: string;
  downloadUrl?: string;
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
  type: 'pdf' | 'video' | 'photo';
  fileSize: string;
  status: 'pending' | 'approved' | 'rejected' | 'pending_delete';
  allowedToPublic: boolean;
  date: string;
  contentUrl?: string;
  subFiles?: string[];
  paid?: boolean;
}

export interface Announcement {
  id: string;
  text: string;
  date: string;
  author: string;
}

export interface GameScore {
  gameId: 'trivia' | 'scramble' | 'memory' | 'hangman' | 'math' | 'bible' | 'maze';
  highScore: number;
  streak: number;
  playedCount: number;
}
