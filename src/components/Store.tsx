import React, { useState, useEffect, useRef } from "react";
import { Book, Review, Comment, User, SavedDocument, BookOrder } from "../types";
import {
  Search, SlidersHorizontal, Star, ArrowLeft, ArrowRight, Bookmark, ShoppingBag,
  Plus, Eye, Globe, Sparkles, Crown, Cpu, BookOpen, Briefcase, Smile, GraduationCap,
  Heart, Atom, Loader2, MoreVertical, Share2, Check, ChevronLeft, ChevronRight,
  Compass, CreditCard, Cloud, HardDrive, ShieldCheck,
  ChevronDown, ChevronUp, HelpCircle, Scale, ListOrdered, Library, X,
  History, Download, UploadCloud, Calculator, TrendingUp, Award
} from "lucide-react";
import SecureBookReader from "./SecureBookReader";
import { motion } from "motion/react";
import {
  DEFAULT_SHOWCASE_CONFIG,
  fetchShowcaseFromServer,
  subscribeShowcaseUpdates,
  SiteShowcaseConfig,
} from "../lib/showcase";
import { secureApiFetch } from "../lib/aiClient";
import VirtualTourCarousel from "./VirtualTourCarousel";
import { getBuildingPhotoForCategory, getLocalCampusPhotos, CampusBuildingPhoto } from "../utils/campusPhotoManager";

interface StoreProps {
  currentUser: User | null;
  onLogIn: () => void;
  onNavigate?: (view: any) => void;
  books: Book[];
  onUpdateBookRating: (id: string, newAvg: number, newReviewCount: number) => void;
  onPurchaseBook: (id: string) => void;
  purchasedBookIds: string[];
  onToggleWishlist: (id: string) => void;
  wishlistBookIds: string[];
  onAddNewDocument?: (doc: SavedDocument) => void;
  bookOrders?: BookOrder[];
  onQuickSaveToLibrary?: (id: string) => void;
  initialBookId?: string | null;
  onClearInitialBookId?: () => void;
}

const getBookProgress = (bookId: string, totalPages: number) => {
  const saved = localStorage.getItem(`wafula_bookmark_${bookId}`);
  if (saved) {
    const pageNum = parseInt(saved, 10);
    if (!isNaN(pageNum) && pageNum > 0 && totalPages > 0) {
      return Math.min(100, Math.round((pageNum / totalPages) * 100));
    }
  }
  return 0;
};

export default function Store({
  currentUser,
  onLogIn,
  onNavigate,
  books,
  onUpdateBookRating,
  onPurchaseBook,
  purchasedBookIds,
  onToggleWishlist,
  wishlistBookIds,
  onAddNewDocument,
  bookOrders = [],
  onQuickSaveToLibrary,
  initialBookId = null,
  onClearInitialBookId
}: StoreProps) {
  // Navigation & Live Showcase config
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [showcase, setShowcase] = useState<SiteShowcaseConfig>(DEFAULT_SHOWCASE_CONFIG);
  const [slideIdx, setSlideIdx] = useState(0);
  const [isSlidePaused, setIsSlidePaused] = useState(false);

  const canModerateComments =
    currentUser?.role === "main_admin" ||
    currentUser?.role === "admin" ||
    (currentUser?.role === "sub_admin" && Boolean(currentUser?.permissions?.allowModeration));

  useEffect(() => {
    fetchShowcaseFromServer().then((cfg) => setShowcase(cfg));
    const unsub = subscribeShowcaseUpdates((cfg) => setShowcase(cfg));
    return unsub;
  }, []);

  useEffect(() => {
    if (isSlidePaused || selectedBook || !showcase.slides.length) return;
    const intervalMs = Math.max(1500, Number(showcase.intervalMs) || 2000);
    const timer = setInterval(() => {
      setSlideIdx((prev) => (prev + 1) % showcase.slides.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isSlidePaused, selectedBook, showcase.slides.length, showcase.intervalMs]);

  // Auto-select initial book from shared link or deep link
  useEffect(() => {
    if (initialBookId) {
      const found = books.find((b) => b.id === initialBookId);
      if (found) {
        setSelectedBook(found);
      }
    }
  }, [initialBookId, books]);
  const [detailModalBook, setDetailModalBook] = useState<Book | null>(null);
  const [readingBook, setReadingBook] = useState<Book | null>(null);
  const [expandedBookIds, setExpandedBookIds] = useState<string[]>([]);
  const [quickViewBook, setQuickViewBook] = useState<Book | null>(null);

  // Search, Filters & Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [isSearchingDebounced, setIsSearchingDebounced] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [storeSection, setStoreSection] = useState<"catalog" | "library" | "wishlist" | "orders" | "history">("catalog");
  const [showMoreCategories, setShowMoreCategories] = useState(false);
  const [showAllFeatured, setShowAllFeatured] = useState(false);
  const [showCampusTourInStore, setShowCampusTourInStore] = useState(false);
  const [campusPhotos, setCampusPhotos] = useState<CampusBuildingPhoto[]>(() => getLocalCampusPhotos());

  useEffect(() => {
    const handlePhotosUpdate = (e: any) => {
      setCampusPhotos(e.detail?.photos || getLocalCampusPhotos());
    };
    window.addEventListener("ZION_CAMPUS_PHOTOS_UPDATED", handlePhotosUpdate);
    return () => window.removeEventListener("ZION_CAMPUS_PHOTOS_UPDATED", handlePhotosUpdate);
  }, []);

  const categoryBuildingPhoto = getBuildingPhotoForCategory(
    selectedCategory === "Religion" ? "Christian Books" : selectedCategory,
    campusPhotos
  );

  const historyStorageKey = `WAFULA_READING_HISTORY_${(currentUser?.email || "guest").toLowerCase()}`;
  const [readingHistoryIds, setReadingHistoryIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`WAFULA_READING_HISTORY_${(currentUser?.email || "guest").toLowerCase()}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(historyStorageKey);
      setReadingHistoryIds(saved ? JSON.parse(saved) : []);
    } catch {
      setReadingHistoryIds([]);
    }
  }, [historyStorageKey]);

  const recordReadingHistory = (bookId: string) => {
    setReadingHistoryIds((prev) => {
      const next = [bookId, ...prev.filter((id) => id !== bookId)].slice(0, 24);
      localStorage.setItem(historyStorageKey, JSON.stringify(next));
      return next;
    });
  };

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("WAFULA_RECENT_SEARCHES");
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });
  const [showRecentDropdown, setShowRecentDropdown] = useState(false);

  const addRecentSearch = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 8);
      localStorage.setItem("WAFULA_RECENT_SEARCHES", JSON.stringify(updated));
      return updated;
    });
  };

  // Debounced search trigger for improved typing performance
  useEffect(() => {
    if (searchInput !== searchQuery) {
      setIsSearchingDebounced(true);
    }
    const handler = setTimeout(() => {
      setSearchQuery(searchInput);
      setIsSearchingDebounced(false);
      if (searchInput.trim().length > 1) {
        addRecentSearch(searchInput);
      }
    }, 320);

    return () => {
      clearTimeout(handler);
    };
  }, [searchInput]);

  // Click outside listener for recent search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowRecentDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  const [maxPrice, setMaxPrice] = useState<number>(2000);
  const [minPrice, setMinPrice] = useState<number>(0);
  const [sortBy, setSortBy] = useState<"rating" | "date" | "alphabet" | "price">("rating");
  const [showFilters, setShowFilters] = useState(false);
  const [maxFileSize, setMaxFileSize] = useState<number>(10); // MB
  const [maxDuration, setMaxDuration] = useState<number>(600); // Minutes

  // Side-by-side compare view states
  const [showCompareView, setShowCompareView] = useState(false);
  const [compareBookId1, setCompareBookId1] = useState<string>("");
  const [compareBookId2, setCompareBookId2] = useState<string>("");

  // Detail Review / Comments States
  const [reviews, setReviews] = useState<Review[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);

  // Form states inside details popup
  const [userRating, setUserRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [commentText, setCommentText] = useState("");
  const [replyTarget, setReplyTarget] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [showReviewModal, setShowReviewModal] = useState(false);

  // M-Pesa Daraja Integration Checkout flow states
  const [showMpesaModal, setShowMpesaModal] = useState(false);
  const [checkoutPhone, setCheckoutPhone] = useState("");
  const [checkoutCustomerID, setCheckoutCustomerID] = useState("");
  const [checkoutCustomerName, setCheckoutCustomerName] = useState("");
  const [stkStatus, setStkStatus] = useState<"idle" | "pushing" | "waiting" | "finalizing" | "success" | "failed">("idle");
  const [checkoutError, setCheckoutError] = useState("");
  const [darajaShortcode, setDarajaShortcode] = useState("1171473");
  const [darajaEnv, setDarajaEnv] = useState<"sandbox" | "production">("production");
  const [activeCheckoutId, setActiveCheckoutId] = useState("");
  const [mpesaReceiptCode, setMpesaReceiptCode] = useState("");
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);

  // Core Premium Interactive states: Instant Preview, Multi-select, Context Menus, Bulk Actions
  const [instantPreviewBook, setInstantPreviewBook] = useState<Book | null>(null);
  const [previewPage, setPreviewPage] = useState<number>(1);
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [activeContextMenuBookId, setActiveContextMenuBookId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);

  const categories: string[] = [
    "All",
    "Christian Books",
    "Education",
    "Leadership",
    "Mathematics",
    "Science",
    "Business",
    "Personal Development",
    "Fiction",
    "Health",
  ];

  // Initialize and synchronise reviews + comments from localStorage on start or when active book details panel focuses
  useEffect(() => {
    if (selectedBook) {
      const savedReviews = localStorage.getItem(`WAFULA_REVIEWS_${selectedBook.id}`);
      if (savedReviews) {
        setReviews(JSON.parse(savedReviews));
      } else {
        // Mock presets
        const defaultReviewsList: Review[] = [
          {
            id: `rev_${selectedBook.id}_1`,
            productId: selectedBook.id,
            userId: "sarah",
            userName: "Sarah Njeri",
            rating: 5,
            text: "WAFULA DIGITAL BOOKS has completely revolutionized how we access material! Instantly readable.",
            date: "2026-04-10"
          }
        ];
        setReviews(defaultReviewsList);
        localStorage.setItem(`WAFULA_REVIEWS_${selectedBook.id}`, JSON.stringify(defaultReviewsList));
      }

      const savedComments = localStorage.getItem(`WAFULA_COMMENTS_${selectedBook.id}`);
      if (savedComments) {
        setComments(JSON.parse(savedComments));
      } else {
        const defaultComments: Comment[] = [
          {
            id: `com_${selectedBook.id}_1`,
            targetId: selectedBook.id,
            userId: "kelvin",
            userName: "Kelvin Opara Wafula",
            text: "Welcome specifically to my publication dialogue board! Let me know if you would like me to compile notes.",
            date: "2026-03-27"
          }
        ];
        setComments(defaultComments);
        localStorage.setItem(`WAFULA_COMMENTS_${selectedBook.id}`, JSON.stringify(defaultComments));
      }
    }
  }, [selectedBook]);

  // Submit dynamic Star rating (+ updates book average instantly)
  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onLogIn();
      return;
    }
    if (!reviewText.trim() || !selectedBook) return;

    const newReview: Review = {
      id: "rev_" + Date.now(),
      productId: selectedBook.id,
      userId: currentUser.email,
      userName: currentUser.name,
      rating: userRating,
      text: reviewText.trim(),
      date: new Date().toISOString().split("T")[0]
    };

    const nextReviews = [newReview, ...reviews];
    setReviews(nextReviews);
    localStorage.setItem(`WAFULA_REVIEWS_${selectedBook.id}`, JSON.stringify(nextReviews));
    setReviewText("");

    // Calculate new average
    const totalStars = nextReviews.reduce((sum, r) => sum + r.rating, 0);
    const newAverage = parseFloat((totalStars / nextReviews.length).toFixed(1));
    onUpdateBookRating(selectedBook.id, newAverage, nextReviews.length);

    // Update focused book state ref
    setSelectedBook((prev) => prev ? { ...prev, rating: newAverage, reviewsCount: nextReviews.length } : null);
  };

  // Submit Comment dialogue entry (with server sync)
  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onLogIn();
      return;
    }
    if (!commentText.trim() || !selectedBook) return;

    const cleanText = commentText.trim();
    const newComment: Comment = {
      id: "com_" + Date.now(),
      targetId: selectedBook.id,
      userId: currentUser.email,
      userName: currentUser.name,
      text: cleanText,
      date: new Date().toISOString().split("T")[0]
    };

    const nextComments = [...comments, newComment];
    setComments(nextComments);
    localStorage.setItem(`WAFULA_COMMENTS_${selectedBook.id}`, JSON.stringify(nextComments));
    setCommentText("");

    secureApiFetch("/api/social/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: newComment.id,
        targetId: selectedBook.id,
        text: cleanText,
        userName: currentUser.name,
      }),
    }).catch(() => {});
  };

  // Load active Daraja PayBill configuration when checkout modal opens
  useEffect(() => {
    if (!showMpesaModal) return;
    fetch("/api/mpesa/config")
      .then((res) => res.json())
      .then((data) => {
        if (data?.success) {
          if (data.shortcode) setDarajaShortcode(String(data.shortcode));
          if (data.environment) setDarajaEnv(data.environment);
        }
      })
      .catch(() => {});
  }, [showMpesaModal]);

  const queryDarajaPaymentStatus = async (checkoutId: string) => {
    if (!checkoutId) return;
    try {
      const res = await secureApiFetch(`/api/mpesa/query/${encodeURIComponent(checkoutId)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      if (data.status === "completed") {
        setMpesaReceiptCode(String(data.receiptNumber || checkoutId));
        setStkStatus("success");
        if (selectedBook) {
          onPurchaseBook(selectedBook.id);
        }
      } else if (data.status === "cancelled" || data.status === "failed") {
        setCheckoutError(String(data.resultDesc || "M-Pesa payment was cancelled or declined on your handset."));
        setStkStatus("failed");
      }
    } catch {
      // keep polling while network recovers
    }
  };

  // Poll Daraja payment status while awaiting handset PIN confirmation
  useEffect(() => {
    if (stkStatus !== "waiting" || !activeCheckoutId) return;
    const interval = setInterval(() => {
      void queryDarajaPaymentStatus(activeCheckoutId);
    }, 3500);
    return () => clearInterval(interval);
  }, [stkStatus, activeCheckoutId, selectedBook]);

  const handleDispatchLiveStkPush = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError("");
    if (!selectedBook) return;
    if (!currentUser) {
      onLogIn();
      return;
    }
    if (checkoutPhone.trim().length < 9) {
      setCheckoutError("Enter a valid Kenyan mobile number (e.g. 0712345678).");
      return;
    }

    setStkStatus("pushing");
    try {
      const res = await secureApiFetch("/api/mpesa/stkpush", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: checkoutPhone.trim(),
          purpose: "book",
          targetId: selectedBook.id,
          customAccountRef: (checkoutCustomerID || currentUser.email || selectedBook.id).slice(0, 12),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success || !data?.checkoutRequestId) {
        setCheckoutError(data?.error || "Could not initiate M-Pesa STK Push. Please verify your phone number and try again.");
        setStkStatus("idle");
        return;
      }

      setActiveCheckoutId(String(data.checkoutRequestId));
      setStkStatus("waiting");
    } catch (err: any) {
      setCheckoutError(err?.message || "Network error contacting Daraja gateway.");
      setStkStatus("idle");
    }
  };

  const handleGenerateDynamicQr = async () => {
    if (!selectedBook) return;
    setIsLoadingQr(true);
    setCheckoutError("");
    try {
      const res = await secureApiFetch("/api/mpesa/qrcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose: "book",
          targetId: selectedBook.id,
          customAccountRef: (checkoutCustomerID || selectedBook.id).slice(0, 12),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.qrCode) {
        setQrCodeBase64(String(data.qrCode));
      } else {
        setCheckoutError(data?.message || data?.error || "QR code unavailable; use STK Push or PayBill directly.");
      }
    } catch {
      setCheckoutError("Could not load Daraja QR code.");
    } finally {
      setIsLoadingQr(false);
    }
  };

  // Nested comment replies
  const handleReplySubmit = (parentId: string) => {
    if (!currentUser) {
      onLogIn();
      return;
    }
    if (!replyText.trim() || !selectedBook) return;

    const cleanReply = replyText.trim();
    const newReply: Comment = {
      id: "com_rep_" + Date.now(),
      targetId: selectedBook.id,
      userId: currentUser.email,
      userName: currentUser.name,
      text: cleanReply,
      parentId,
      date: new Date().toISOString().split("T")[0]
    };

    const nextComments = [...comments, newReply];
    setComments(nextComments);
    localStorage.setItem(`WAFULA_COMMENTS_${selectedBook.id}`, JSON.stringify(nextComments));
    setReplyText("");
    setReplyTarget(null);

    secureApiFetch("/api/social/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: newReply.id,
        targetId: selectedBook.id,
        parentId,
        text: cleanReply,
        userName: currentUser.name,
      }),
    }).catch(() => {});
  };

  const handleDeleteComment = async (commentId: string, ownerEmail?: string) => {
    const isOwner = Boolean(
      currentUser?.email &&
      ownerEmail &&
      currentUser.email.toLowerCase().trim() === ownerEmail.toLowerCase().trim()
    );
    if (!isOwner && !canModerateComments) {
      triggerToast("Only the comment owner or an authorized moderator can delete this comment.");
      return;
    }
    try {
      const res = await secureApiFetch(`/api/social/posts/${encodeURIComponent(commentId)}`, {
        method: "DELETE",
      });
      if (res.status === 403) {
        triggerToast("Permission denied on server.");
        return;
      }
    } catch {}

    const updated = comments.filter(c => c.id !== commentId && c.parentId !== commentId);
    setComments(updated);
    if (selectedBook) {
      localStorage.setItem(`WAFULA_COMMENTS_${selectedBook.id}`, JSON.stringify(updated));
    }
  };

  const handleModerateComment = (commentId: string) => {
    if (!canModerateComments) {
      triggerToast("Moderator permissions are required to moderate discussion posts.");
      return;
    }
    const updated = comments.map(c => {
      if (c.id === commentId) {
        const currentlyModerated = !c.isModerated;
        return {
          ...c,
          isModerated: currentlyModerated,
          originalText: currentlyModerated ? (c.originalText || c.text) : undefined,
          text: currentlyModerated ? "[This comment has been hidden by an administrator due to moderation guidelines.]" : (c.originalText || c.text),
          moderatedReason: currentlyModerated ? "Content flagged by Admin" : undefined
        };
      }
      return c;
    });
    setComments(updated);
    if (selectedBook) {
      localStorage.setItem(`WAFULA_COMMENTS_${selectedBook.id}`, JSON.stringify(updated));
    }
  };

  const parseFileSize = (fileSizeStr: string): number => {
    if (!fileSizeStr) return 0;
    const clean = fileSizeStr.toLowerCase().replace("mb", "").replace(" mb", "").trim();
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  };

  const getReadingDuration = (bookPages: number): number => {
    return Math.round(bookPages * 1.5);
  };

  // Advanced filtration and computation models of books
  const matchesSelectedCategory = (cat: string, filterCat: string) => {
    if (filterCat === "All") return true;
    if (filterCat === "Christian Books" || filterCat === "Religion") {
      return cat === "Religion" || cat === "Leadership" && false || cat === "Christian Books" as any;
    }
    if (filterCat === "Personal Development" || filterCat === "Self-Help") {
      return cat === "Self-Help" || cat === ("Personal Development" as any);
    }
    if (filterCat === "Mathematics") {
      return cat === ("Mathematics" as any) || cat === "Technology";
    }
    return cat === filterCat;
  };

  const filteredBooks = books.filter((b) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      b.category.toLowerCase().includes(q) ||
      (b.description || "").toLowerCase().includes(q);
    const matchesCategory = matchesSelectedCategory(b.category, selectedCategory);
    const matchesPrice = b.price >= minPrice && b.price <= maxPrice;

    // File Size checking
    const bSize = parseFileSize(b.fileSize);
    const matchesFileSize = bSize <= maxFileSize;

    // Reading Duration checking
    const bDuration = getReadingDuration(b.pages);
    const matchesDuration = bDuration <= maxDuration;

    return matchesSearch && matchesCategory && matchesPrice && matchesFileSize && matchesDuration && b.status === "active";
  });

  // Advanced Sorting
  const sortedBooks = [...filteredBooks].sort((x, y) => {
    if (sortBy === "rating") return y.rating - x.rating; // author popularity
    if (sortBy === "date") return y.publishedDate.localeCompare(x.publishedDate);
    if (sortBy === "alphabet") return x.title.localeCompare(y.title);
    if (sortBy === "price") return x.price - y.price;
    return 0;
  });

  // Toast notifier helper
  const triggerToast = (msg: string) => {
    setShowToast(msg);
  };

  const handleShareBook = (b: Book) => {
    const shareText = `Check out "${b.title}" by ${b.author} in Zion Academic Bookstore!`;
    const shareUrl = `${window.location.origin}${window.location.pathname}?view=store&bookId=${b.id}`;
    if (navigator.share) {
      navigator.share({
        title: b.title,
        text: shareText,
        url: shareUrl,
      }).then(() => {
        triggerToast("✨ Book shared successfully!");
      }).catch((err) => {
        if (err.name !== 'AbortError') {
          console.error("Web Share failed:", err);
        }
      });
    } else {
      navigator.clipboard.writeText(`${shareText}\nLink: ${shareUrl}`);
      triggerToast("📋 Share link copied to clipboard!");
    }
  };

  // Auto-dismiss toast timer
  useEffect(() => {
    if (showToast) {
      const handle = setTimeout(() => {
        setShowToast(null);
      }, 3500);
      return () => clearTimeout(handle);
    }
  }, [showToast]);

  // Click outside to dismiss active book context menus
  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveContextMenuBookId(null);
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  const getBookPreviewPages = (book: Book): { title: string; content: string }[] => {
    const rawContent = book.content || `Chapter 1: The Essence of Faithful Leadership\n\nLeadership is a sacred trust. It starts in the quietest chambers of the heart, where character is forged over the raw embers of patience and hard truth. To lead Kelvin\'s community begins with understanding that service is not a step towards authority, but rather the ultimate expression of it.\n\nChapter 2: Grace and Governance\n\nTrue governance is built on the foundation of grace. When we manage institutions—whether educational, ecclesiastical, or administrative—we are dealing with fragile human journeys. Grace gives us the lens of compassion, enabling us to seek restorative remedies where modern systems seek simple punitive measures.\n\nChapter 3: Legacy of Knowledge\n\nAs scholars, our ultimate benchmark is the generation that follows us. We write, model, and publish not to cement our current standing, but to illuminate paths for young leaders. Knowledge without active stewardship is empty; let our outlines be the bricks for tomorrow\'s community foundations.`;

    const paragraphs = rawContent.split("\n\n").filter(p => p.trim() !== "");
    
    return [
      {
        title: "Page 1: Introductory Module & Preface",
        content: paragraphs[0] || "In this module, we explore the conceptual scaffolding of modern academic governance. Under Wafula\'s guidance, scholars learn to harmonize professional technical skills with rigorous ethical underpinnings. This establishes a baseline of unwavering truth and excellence."
      },
      {
        title: "Page 2: Core Exposition",
        content: paragraphs[1] || "The primary challenge confronting contemporary leadership is structural drift. To restore institutional integrity, leaders must cultivate deep presence. True power lives in transparent engagement, active mentorship, and building sustainable pipelines of local empowerment."
      },
      {
        title: "Page 3: Colloquium & Discussion Syllabus",
        content: paragraphs[2] || "We close this blueprint volume with critical questions for local leadership circles: How do we construct accountable networks? Where does active Grace intersect with standard operational directives? How can we manage digital transitions without sacrificing core human connection?"
      }
    ];
  };

  return (
    <div id="store_viewport" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      
      {selectedBook ? (
        /* PRODUCT DETAIL PANEL VIEW WITH REVIEWS, RATINGS, COMMENT BOARDS */
        <div id="product_detail_section" className="space-y-8 animate-fade-in text-left">
          <button
            onClick={() => {
              setSelectedBook(null);
              if (onClearInitialBookId) {
                onClearInitialBookId();
              }
            }}
            className="flex items-center space-x-1.5 text-stone-500 hover:text-stone-900 text-xs font-semibold"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Store Listing</span>
          </button>

          <div className="grid gap-8 md:grid-cols-12 md:items-start">
            {/* Book Graphic cover and action bar buttons (Book Cover Fix: transparent container, natural colors, zero crop/box/badge overlap) */}
            <div className="md:col-span-4 space-y-4">
              <div className="w-full flex items-center justify-center bg-transparent py-2">
                <img
                  src={selectedBook.coverImage}
                  className="max-h-[380px] w-auto max-w-full object-contain"
                  alt={selectedBook.title}
                />
              </div>
              {selectedBook.isFeatured && (
                <div className="flex justify-center">
                  <span className="rounded-md bg-[#F5B82E] font-mono text-[10px] font-bold text-[#0B254D] px-2.5 py-0.5 uppercase tracking-wider">
                    Featured Edition
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onToggleWishlist(selectedBook.id)}
                  className={`flex items-center justify-center space-x-1.5 rounded-xl border py-2.5 text-xs font-bold transition duration-200 cursor-pointer ${
                    wishlistBookIds.includes(selectedBook.id)
                      ? "border-rose-500 bg-rose-50 text-rose-700"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Bookmark className="h-4 w-4 shrink-0" />
                  <span className="truncate">{wishlistBookIds.includes(selectedBook.id) ? "Wishlisted" : "Add Wishlist"}</span>
                </button>

                <button
                  onClick={() => handleShareBook(selectedBook)}
                  className="flex items-center justify-center space-x-1.5 rounded-xl border border-slate-200 bg-amber-50 hover:bg-amber-100 text-amber-900 py-2.5 text-xs font-bold transition duration-200 cursor-pointer"
                >
                  <Share2 className="h-4 w-4 shrink-0 text-amber-700" />
                  <span>Share Book</span>
                </button>
              </div>

              {(() => {
                const currentUserEmail = currentUser?.email?.toLowerCase()?.trim();
                const activeOrder = currentUserEmail 
                  ? bookOrders.find(o => o.bookId === selectedBook.id && o.userId.toLowerCase().trim() === currentUserEmail)
                  : null;

                if (purchasedBookIds.includes(selectedBook.id)) {
                  const downloadPermitted = selectedBook.price === 0 || Boolean(selectedBook.pdfUrl && !selectedBook.pdfUrl.startsWith("Community Secure"));
                  return (
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-4 border border-emerald-200 dark:border-emerald-800 flex flex-col items-center justify-center text-center space-y-2">
                      <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Unlocked in Your Library</p>
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-400 leading-tight">
                        Read online or cache offline inside SecureBookReader.
                      </p>
                      <button
                        onClick={() => {
                          recordReadingHistory(selectedBook.id);
                          setReadingBook(selectedBook);
                        }}
                        className="mt-1 w-full flex items-center justify-center space-x-1.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        <Eye className="h-4 w-4" />
                        <span>Read Full E-Book Online</span>
                      </button>
                      {downloadPermitted ? (
                        <button
                          type="button"
                          onClick={() => {
                            const textBody = `${selectedBook.title}\nBy ${selectedBook.author}\n\n${selectedBook.description}\n\n${selectedBook.content || ""}`;
                            const blob = new Blob([textBody], { type: "text/plain;charset=utf-8" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `${selectedBook.title.replace(/[^a-z0-9]+/gi, "_")}.txt`;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            URL.revokeObjectURL(url);
                            triggerToast(`Downloaded copy of "${selectedBook.title}".`);
                          }}
                          className="w-full flex items-center justify-center space-x-1.5 py-2 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 bg-white dark:bg-slate-900 hover:bg-emerald-100/50 rounded-lg text-xs font-semibold transition cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Download Permitted Copy</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500">DRM Online Reading Only (Download restricted by publisher)</span>
                      )}
                    </div>
                  );
                }

                if (activeOrder && activeOrder.status === "pending") {
                  return (
                    <div className="space-y-4">
                      <div className="rounded-xl bg-amber-50 p-4 border border-amber-200 flex flex-col items-center justify-center text-center space-y-2">
                        <span className="text-xl animate-bounce">⏳</span>
                        <p className="text-xs font-bold text-amber-800">Payment Verification Pending</p>
                        <p className="text-[10px] text-amber-600 leading-snug">
                          Your purchase reference <strong>{activeOrder.id}</strong> has been logged. Admin Kelvin Opara Wafula has been notified to manually confirm the Lipa Na M-Pesa transaction.
                        </p>
                        <p className="text-[9px] text-stone-400 font-mono mt-1">Please keep an eye on your dashboard or notify Wafula to speed up clearance.</p>
                      </div>

                      {(selectedBook.allowPreview !== false || currentUser?.role === "admin") && (
                        <button
                          onClick={() => setReadingBook(selectedBook)}
                          className="w-full flex items-center justify-center space-x-1.5 rounded-xl border border-stone-300 text-stone-700 bg-white font-bold py-2.5 hover:bg-stone-50 transition text-xs cursor-pointer"
                        >
                          <Eye className="h-4 w-4 text-red-700 shrink-0" />
                          <span>
                            {currentUser?.role === "admin"
                              ? "Preview Book (Admin Crown Mod) 👑"
                              : `Read Online Preview (Free • ${selectedBook.previewDuration || 30}s limit)`}
                          </span>
                        </button>
                      )}
                    </div>
                  );
                }

                if (activeOrder && activeOrder.status === "rejected") {
                  return (
                    <div className="space-y-4">
                      <div className="rounded-xl bg-rose-50 p-4 border border-rose-200 flex flex-col items-center justify-center text-center space-y-2">
                        <span className="text-xl">❌</span>
                        <p className="text-xs font-bold text-rose-800">Clearance Verification Declined</p>
                        <p className="text-[10px] text-rose-600 leading-snug">Your payment reference was declined. It is possible the reference was invalid or couldn't be matched.</p>
                        <button
                          onClick={() => {
                            setStkStatus("idle");
                            setCheckoutPhone("");
                            setCheckoutError("");
                            setShowMpesaModal(true);
                          }}
                          className="mt-2 w-full flex items-center justify-center space-x-1.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                        >
                          <span>Retry Payment Placement</span>
                        </button>
                      </div>

                      {(selectedBook.allowPreview !== false || currentUser?.role === "admin") && (
                        <button
                          onClick={() => setReadingBook(selectedBook)}
                          className="w-full flex items-center justify-center space-x-1.5 rounded-xl border border-stone-300 text-stone-700 bg-white font-bold py-2.5 hover:bg-stone-50 transition text-xs cursor-pointer"
                        >
                          <Eye className="h-4 w-4 text-red-700 shrink-0" />
                          <span>
                            {currentUser?.role === "admin"
                              ? "Preview Book (Admin Crown Mod) 👑"
                              : `Read Online Preview (Free • ${selectedBook.previewDuration || 30}s limit)`}
                          </span>
                        </button>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        if (!currentUser) {
                          onLogIn();
                          return;
                        }
                        setStkStatus("idle");
                        setCheckoutPhone("");
                        setCheckoutError("");
                        setShowMpesaModal(true);
                      }}
                      className="w-full flex items-center justify-center space-x-2 rounded-xl bg-red-700 text-white font-bold py-3 hover:bg-red-800 shadow-md transition active:scale-95 cursor-pointer"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      <span>Buy Now (KES {selectedBook.price.toLocaleString()})</span>
                    </button>

                    {(selectedBook.allowPreview !== false || currentUser?.role === "admin") && (
                      <button
                        onClick={() => setReadingBook(selectedBook)}
                        className="w-full flex items-center justify-center space-x-1.5 rounded-xl border border-stone-300 text-stone-700 bg-white font-bold py-2.5 hover:bg-stone-50 transition text-xs cursor-pointer"
                      >
                        <Eye className="h-4 w-4 text-red-700 shrink-0" />
                        <span>
                          {currentUser?.role === "admin"
                            ? "Preview Book (Admin Crown Mod) 👑"
                            : `Read Online Preview (Free • ${selectedBook.previewDuration || 30}s limit)`}
                        </span>
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Structured Specifications descriptions */}
            <div className="md:col-span-8 space-y-6 text-xs">
              <div className="border-b border-stone-200 pb-4">
                <h3 className="font-display text-2xl font-extrabold text-stone-900 tracking-tight leading-tight">{selectedBook.title}</h3>
                <p className="text-stone-500 text-sm mt-1">Written by <strong className="text-stone-850 font-semibold">{selectedBook.author}</strong></p>
                
                {/* Visual Average Score */}
                <div className="flex items-center space-x-1.5 mt-3">
                  <div className="flex items-center text-amber-500">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`h-4 w-4 ${s <= Math.round(selectedBook.rating) ? "fill-amber-500 text-amber-500" : "text-stone-200"}`} />
                    ))}
                  </div>
                  <span className="font-mono font-bold text-neutral-800 text-sm">{selectedBook.rating || 5.0}</span>
                  <span className="text-stone-400 font-mono">({selectedBook.reviewsCount} reviews)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-stone-50 border rounded-xl p-4 font-mono text-center">
                <div>
                  <span className="text-[10px] text-stone-400 block uppercase">Book Format</span>
                  <strong className="text-stone-800 font-bold block mt-0.5">PDF E-Book</strong>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 block uppercase">File Weight</span>
                  <strong className="text-stone-800 font-bold block mt-0.5">{selectedBook.fileSize}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 block uppercase">Pages Length</span>
                  <strong className="text-stone-800 font-bold block mt-0.5">{selectedBook.pages} pages</strong>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 block uppercase">Publish Date</span>
                  <strong className="text-stone-800 font-bold block mt-0.5">{selectedBook.publishedDate}</strong>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-stone-800 uppercase tracking-widest">Introduction Blueprint</h4>
                <p className="text-neutral-700 leading-relaxed text-xs">{selectedBook.description}</p>
              </div>

              {/* ACTIVE RATINGS & REVIEWS SECTION */}
              <div className="border-t border-stone-200 pt-6 space-y-5">
                <h4 className="font-display text-lg font-bold text-stone-900 border-l-4 border-red-750 pl-3">Member Reviews & Ratings</h4>

                {/* Star review submission trigger button */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#f5f5f4] rounded-2xl border border-stone-200/80 p-5 mt-2 shadow-xs">
                  <div className="space-y-1">
                    <h5 className="font-bold text-stone-900 text-sm">Add Your Rating & Review</h5>
                    <p className="text-stone-500 text-[11px]">Share your authentic study experience with our regional scholars.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!currentUser) {
                        onLogIn();
                        return;
                      }
                      setShowReviewModal(true);
                    }}
                    className="flex items-center space-x-1.5 rounded-xl bg-red-750 text-white font-bold px-4 py-2 text-xs hover:bg-stone-900 shadow-sm transition active:scale-95 cursor-pointer"
                  >
                    <Star className="h-4 w-4 fill-white text-white" />
                    <span>Rate E-Book</span>
                  </button>
                </div>

                {/* Review listings */}
                <div className="space-y-3.5">
                  {reviews.length === 0 ? (
                    <p className="text-stone-400 italic">No ratings listed yet. Be the first to add your voice!</p>
                  ) : (
                    reviews.map((r) => (
                      <div key={r.id} className="rounded-xl bg-white border border-stone-100 p-4 space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[#1c1917]">{r.userName}</span>
                          <span className="text-[10px] text-stone-400 font-mono">{r.date}</span>
                        </div>
                        <div className="flex text-amber-500">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className={`h-3 w-3 ${s <= r.rating ? "fill-amber-500 text-amber-500" : "text-stone-200"}`} />
                          ))}
                        </div>
                        <p className="text-stone-600 italic">"{r.text}"</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* AUTHENTICATED SERVICE COMMENTS PANEL */}
              <div className="border-t border-stone-200 pt-6 space-y-5">
                <h4 className="font-display text-lg font-bold text-stone-900 border-l-4 border-amber-600 pl-3">Discussion Board</h4>

                {/* Comment Box */}
                <form onSubmit={handleSubmitComment} className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Ask questions or share ideas with other authors..."
                    className="flex-1 rounded-lg border border-stone-200 bg-neutral-50 p-2.5 outline-none focus:bg-white"
                  />
                  <button type="submit" className="rounded-lg bg-stone-900 text-white font-bold px-4 text-xs hover:bg-stone-955">
                    Submit
                  </button>
                </form>

                {/* Comment threads listing */}
                <div id="store_comments_list" className="space-y-4">
                  {comments.filter(c => !c.parentId).map((c) => {
                    const childReplies = comments.filter((rep) => rep.parentId === c.id);
                    const isCommentOwner = Boolean(
                      currentUser?.email &&
                      c.userId &&
                      currentUser.email.toLowerCase().trim() === c.userId.toLowerCase().trim()
                    );

                    return (
                      <div key={c.id} className="rounded-xl bg-[#FAF8F4] border border-[#E7E1D8] p-4 space-y-3 relative text-left">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-[#1F1B18]">{c.userName}</span>
                            {c.isModerated && (
                              <span className="bg-amber-100 text-amber-800 text-[9px] px-2 py-0.5 rounded-full font-bold">
                                Moderated
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] text-[#6E655E] font-mono">{c.date}</span>
                        </div>
                        
                        {/* If moderated, show public warning, or if moderator show original with tag */}
                        {c.isModerated && !canModerateComments ? (
                          <p className="text-[#6E655E] italic text-xs bg-[#EFECE5] p-2.5 rounded-lg border border-dashed border-[#D8D0C5]">
                            "{c.text}"
                          </p>
                        ) : (
                          <div className="space-y-1">
                            {c.isModerated && canModerateComments && (
                              <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded block font-mono">
                                Moderator view (Original message):
                              </span>
                            )}
                            <p className="text-[#1F1B18] leading-relaxed font-sans">
                              "{c.isModerated && canModerateComments ? c.originalText : c.text}"
                            </p>
                          </div>
                        )}

                        {/* Owner / Moderator Action Bar */}
                        {(canModerateComments || isCommentOwner) && (
                          <div className="flex gap-3 pt-1.5 border-t border-dashed border-[#E7E1D8] mt-2">
                            {canModerateComments && (
                              <button
                                type="button"
                                onClick={() => handleModerateComment(c.id)}
                                className="text-[10px] font-bold text-amber-700 hover:text-amber-900 flex items-center space-x-1 cursor-pointer"
                                title="Toggle public visibility moderation"
                              >
                                <span>{c.isModerated ? "Unmoderate" : "Moderate / Hide"}</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm("Delete this comment and its replies? This cannot be undone.")) {
                                  handleDeleteComment(c.id, c.userId);
                                }
                              }}
                              className="text-[10px] font-bold text-[#A8421B] hover:text-[#8F3614] flex items-center space-x-1 cursor-pointer"
                            >
                              <span>Delete Thread</span>
                            </button>
                          </div>
                        )}

                        {/* Nested replies */}
                        {childReplies.length > 0 && (
                          <div className="border-l-2 border-[#D8D0C5] pl-4 space-y-2.5 mt-2.5 bg-white/70 py-2.5 px-3 rounded-r-lg">
                            {childReplies.map((rep) => {
                              const isRepModerated = rep.isModerated;
                              const isRepOwner = Boolean(
                                currentUser?.email &&
                                rep.userId &&
                                currentUser.email.toLowerCase().trim() === rep.userId.toLowerCase().trim()
                              );
                              return (
                                <div key={rep.id} className="text-xs space-y-1.5 border-b border-[#E7E1D8] last:border-b-0 pb-2 last:pb-0">
                                  <div className="flex justify-between items-center text-[10px] text-[#6E655E]">
                                    <div className="flex items-center gap-1">
                                      <span className="font-bold text-[#1F1B18]">{rep.userName}</span>
                                      {isRepModerated && (
                                        <span className="bg-amber-100 text-amber-800 text-[8px] px-1.5 py-0.5 rounded font-mono">
                                          Moderated
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-mono">{rep.date}</span>
                                  </div>
                                  
                                  {isRepModerated && !canModerateComments ? (
                                    <p className="text-[#6E655E] italic text-[11px] bg-[#EFECE5] p-1.5 rounded">
                                      "{rep.text}"
                                    </p>
                                  ) : (
                                    <div className="space-y-0.5">
                                      {isRepModerated && canModerateComments && (
                                        <span className="text-[9px] text-amber-700 bg-amber-50 px-1 py-0.5 rounded block font-mono">
                                          Moderator view (Original reply):
                                        </span>
                                      )}
                                      <p className="text-[#1F1B18]/80 italic">
                                        "{isRepModerated && canModerateComments ? rep.originalText : rep.text}"
                                      </p>
                                    </div>
                                  )}

                                  {/* Reply Owner / Moderator Controls */}
                                  {(canModerateComments || isRepOwner) && (
                                    <div className="flex gap-2 text-[9px] font-bold text-[#6E655E] pt-0.5">
                                      {canModerateComments && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => handleModerateComment(rep.id)}
                                            className="text-amber-700 hover:underline cursor-pointer"
                                          >
                                            {isRepModerated ? "Unmoderate Reply" : "Moderate Reply"}
                                          </button>
                                          <span className="text-[#D8D0C5]">|</span>
                                        </>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (confirm("Delete this reply?")) {
                                            handleDeleteComment(rep.id, rep.userId);
                                          }
                                        }}
                                        className="text-[#A8421B] hover:underline cursor-pointer"
                                      >
                                        Delete Reply
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Reply Action Form / Trigger */}
                        {replyTarget === c.id ? (
                          <div className="flex gap-2 pt-2 text-xs">
                            <input
                              type="text"
                              required
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Write a reply..."
                              className="flex-1 rounded-lg border border-[#E7E1D8] bg-white px-2.5 py-1.5 outline-none focus:border-[#A8421B]"
                            />
                            <button
                              type="button"
                              onClick={() => handleReplySubmit(c.id)}
                              className="rounded-lg bg-[#A8421B] hover:bg-[#8F3614] px-3 py-1.5 text-white text-[10px] font-bold cursor-pointer"
                            >
                              Post
                            </button>
                            <button
                              type="button"
                              onClick={() => setReplyTarget(null)}
                              className="text-[#6E655E] px-2 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setReplyTarget(c.id)}
                            className="text-[10px] font-bold text-[#A8421B] hover:underline block pt-1.5 cursor-pointer"
                          >
                            Reply to Thread
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        </div>
      ) : (() => {
        const primarySidebarCategories = [
          { value: "Christian Books", label: "Christian Books", icon: BookOpen },
          { value: "Education", label: "Education", icon: GraduationCap },
          { value: "Leadership", label: "Leadership", icon: Crown },
          { value: "Mathematics", label: "Mathematics", icon: Calculator },
          { value: "Science", label: "Science", icon: Atom },
          { value: "Business", label: "Business", icon: Briefcase },
          { value: "Personal Development", label: "Personal Development", icon: Smile },
        ];
        const extraSidebarCategories = [
          { value: "Fiction", label: "Fiction", icon: Sparkles },
          { value: "Health", label: "Health", icon: Heart },
        ];

        const featuredBooks = books.filter((b) => b.status === "active" && b.isFeatured);
        const visibleFeatured = showAllFeatured ? featuredBooks : featuredBooks.slice(0, 5);
        const bestsellingBooks = [...books]
          .filter((b) => b.status === "active")
          .sort((a, b) => (b.reviewsCount || 0) - (a.reviewsCount || 0) || b.rating - a.rating)
          .slice(0, 5);
        const recommendedBooks = [...books]
          .filter((b) => b.status === "active" && b.rating >= 4.5)
          .slice(0, 5);

        const displayedCatalogBooks = sortedBooks.filter((b) => {
          if (storeSection === "library") return purchasedBookIds.includes(b.id);
          if (storeSection === "wishlist") return wishlistBookIds.includes(b.id);
          if (storeSection === "history") return readingHistoryIds.includes(b.id);
          return true;
        });

        const safeIndex = showcase.slides.length ? slideIdx % showcase.slides.length : 0;
        const activeSlide = showcase.slides.length ? showcase.slides[safeIndex] : null;

        return (
          <div className="flex flex-col lg:flex-row gap-5 items-start text-left">
            {/* LEFT BOOKSTORE RAIL (Desktop Sidebar + Compact Mobile Bar) */}
            <aside className="w-full lg:w-60 shrink-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
              {/* Mobile Compact Horizontal Nav Strip */}
              <div className="lg:hidden p-3 border-b border-slate-100 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setStoreSection("catalog");
                      setSelectedCategory("All");
                    }}
                    className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      storeSection === "catalog" && selectedCategory === "All"
                        ? "bg-[#155EEF] text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Books</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStoreSection("library")}
                    className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      storeSection === "library"
                        ? "bg-[#155EEF] text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    <Library className="h-3.5 w-3.5" />
                    <span>My Library ({purchasedBookIds.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStoreSection("wishlist")}
                    className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      storeSection === "wishlist"
                        ? "bg-[#155EEF] text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    <Heart className="h-3.5 w-3.5" />
                    <span>Wishlist ({wishlistBookIds.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStoreSection("orders")}
                    className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      storeSection === "orders"
                        ? "bg-[#155EEF] text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    <ListOrdered className="h-3.5 w-3.5" />
                    <span>Orders ({bookOrders.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStoreSection("history")}
                    className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      storeSection === "history"
                        ? "bg-[#155EEF] text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    <History className="h-3.5 w-3.5" />
                    <span>History ({readingHistoryIds.length})</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                  {[...primarySidebarCategories, ...extraSidebarCategories].map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => {
                        setStoreSection("catalog");
                        setSelectedCategory(cat.value);
                      }}
                      className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-medium transition cursor-pointer ${
                        storeSection === "catalog" && selectedCategory === cat.value
                          ? "bg-[#0B254D] text-white"
                          : "bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Desktop Vertical Sidebar */}
              <div className="hidden lg:block p-3.5 space-y-5">
                <button
                  type="button"
                  onClick={() => {
                    setStoreSection("catalog");
                    setSelectedCategory("All");
                  }}
                  className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition cursor-pointer ${
                    storeSection === "catalog" && selectedCategory === "All"
                      ? "bg-[#155EEF] text-white shadow-xs"
                      : "bg-slate-50 dark:bg-slate-800 text-[#0B254D] dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5">
                    <BookOpen className="h-4 w-4" />
                    <span>Books</span>
                  </span>
                  <span className="text-[11px] opacity-80 tabular-nums">
                    {books.filter((b) => b.status === "active").length}
                  </span>
                </button>

                {/* Categories List */}
                <div className="space-y-1">
                  <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Categories
                  </p>
                  {primarySidebarCategories.map((cat) => {
                    const Icon = cat.icon;
                    const active = storeSection === "catalog" && selectedCategory === cat.value;
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => {
                          setStoreSection("catalog");
                          setSelectedCategory(cat.value);
                        }}
                        className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition cursor-pointer ${
                          active
                            ? "bg-[#EFF6FF] dark:bg-blue-950/50 text-[#155EEF] dark:text-blue-300 font-semibold"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70"
                        }`}
                      >
                        <span className="inline-flex items-center gap-2.5">
                          <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                          <span>{cat.label}</span>
                        </span>
                      </button>
                    );
                  })}

                  {showMoreCategories &&
                    extraSidebarCategories.map((cat) => {
                      const Icon = cat.icon;
                      const active = storeSection === "catalog" && selectedCategory === cat.value;
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => {
                            setStoreSection("catalog");
                            setSelectedCategory(cat.value);
                          }}
                          className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition cursor-pointer ${
                            active
                              ? "bg-[#EFF6FF] dark:bg-blue-950/50 text-[#155EEF] dark:text-blue-300 font-semibold"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70"
                          }`}
                        >
                          <span className="inline-flex items-center gap-2.5">
                            <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                            <span>{cat.label}</span>
                          </span>
                        </button>
                      );
                    })}

                  <button
                    type="button"
                    onClick={() => setShowMoreCategories((prev) => !prev)}
                    className="w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/70 cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-2.5">
                      {showMoreCategories ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                      <span>{showMoreCategories ? "Less" : "More"}</span>
                    </span>
                  </button>
                </div>

                {/* Reader Workspace Links */}
                <div className="space-y-1 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setStoreSection("library")}
                    className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition cursor-pointer ${
                      storeSection === "library"
                        ? "bg-[#EFF6FF] dark:bg-blue-950/50 text-[#155EEF] dark:text-blue-300 font-semibold"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2.5">
                      <Library className="h-3.5 w-3.5" />
                      <span>My Library</span>
                    </span>
                    <span className="text-[11px] text-slate-400 tabular-nums">{purchasedBookIds.length}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStoreSection("wishlist")}
                    className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition cursor-pointer ${
                      storeSection === "wishlist"
                        ? "bg-[#EFF6FF] dark:bg-blue-950/50 text-[#155EEF] dark:text-blue-300 font-semibold"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2.5">
                      <Heart className="h-3.5 w-3.5" />
                      <span>Wishlist</span>
                    </span>
                    <span className="text-[11px] text-slate-400 tabular-nums">{wishlistBookIds.length}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStoreSection("orders")}
                    className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition cursor-pointer ${
                      storeSection === "orders"
                        ? "bg-[#EFF6FF] dark:bg-blue-950/50 text-[#155EEF] dark:text-blue-300 font-semibold"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2.5">
                      <ListOrdered className="h-3.5 w-3.5" />
                      <span>Orders</span>
                    </span>
                    <span className="text-[11px] text-slate-400 tabular-nums">{bookOrders.length}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStoreSection("history")}
                    className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition cursor-pointer ${
                      storeSection === "history"
                        ? "bg-[#EFF6FF] dark:bg-blue-950/50 text-[#155EEF] dark:text-blue-300 font-semibold"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2.5">
                      <History className="h-3.5 w-3.5" />
                      <span>Reading History</span>
                    </span>
                    <span className="text-[11px] text-slate-400 tabular-nums">{readingHistoryIds.length}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStoreSection("catalog");
                      setShowCompareView((prev) => !prev);
                      setTimeout(() => {
                        document.getElementById("store_catalog_anchor")?.scrollIntoView({ behavior: "smooth" });
                      }, 50);
                    }}
                    className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition cursor-pointer ${
                      showCompareView
                        ? "bg-[#EFF6FF] dark:bg-blue-950/50 text-[#155EEF] dark:text-blue-300 font-semibold"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2.5">
                      <Scale className="h-3.5 w-3.5" />
                      <span>Compare Books</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate?.("studio")}
                    className="w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-2.5">
                      <UploadCloud className="h-3.5 w-3.5 text-[#155EEF]" />
                      <span>Author Upload Desk</span>
                    </span>
                  </button>

                  {currentUser && ["admin", "main_admin", "sub_admin", "manager"].includes(currentUser.role) && (
                    <button
                      type="button"
                      onClick={() => onNavigate?.(currentUser.role === "manager" ? "manager-portal" : "admin")}
                      className="w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold text-[#0B254D] dark:text-[#F5B82E] bg-amber-50/70 dark:bg-amber-950/20 hover:bg-amber-100/70 transition cursor-pointer"
                    >
                      <span className="inline-flex items-center gap-2.5">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Bookstore Admin</span>
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onNavigate?.("contact")}
                    className="w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-2.5">
                      <HelpCircle className="h-3.5 w-3.5" />
                      <span>Help</span>
                    </span>
                  </button>
                </div>
              </div>
            </aside>

            {/* MAIN BOOKSTORE CANVAS */}
            <div className="flex-1 min-w-0 w-full space-y-6">
              {/* Top Search & Action Strip */}
              <div className="rounded-2xl bg-[#0B254D] px-4 py-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shadow-xs">
                <div ref={searchContainerRef} className="flex-1 min-w-0 relative">
                  <Search className="absolute top-2.5 left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onFocus={() => setShowRecentDropdown(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addRecentSearch(searchInput);
                        setShowRecentDropdown(false);
                      }
                    }}
                    placeholder="Search books, authors, categories..."
                    className="w-full rounded-xl bg-white dark:bg-slate-900 py-2 pl-10 pr-10 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#F5B82E]"
                  />
                  {isSearchingDebounced && (
                    <div className="absolute right-3 top-2.5">
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    </div>
                  )}

                  {/* Recent Searches Dropdown */}
                  {showRecentDropdown && recentSearches.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-xl max-h-60 overflow-y-auto">
                      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        <span>Recent Searches</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRecentSearches([]);
                            localStorage.removeItem("WAFULA_RECENT_SEARCHES");
                          }}
                          className="text-rose-600 hover:text-rose-700 font-bold cursor-pointer text-[10px]"
                        >
                          Clear All
                        </button>
                      </div>
                      <div className="space-y-0.5">
                        {recentSearches.map((term, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              setSearchInput(term);
                              setSearchQuery(term);
                              setShowRecentDropdown(false);
                            }}
                            className="flex items-center justify-between rounded-lg px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition text-slate-700 dark:text-slate-200 group"
                          >
                            <span className="font-medium text-xs">{term}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const updated = recentSearches.filter((_, i) => i !== idx);
                                setRecentSearches(updated);
                                localStorage.setItem("WAFULA_RECENT_SEARCHES", JSON.stringify(updated));
                              }}
                              className="text-slate-400 hover:text-rose-600 p-0.5 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowFilters((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition cursor-pointer ${
                      showFilters
                        ? "bg-[#F5B82E] text-[#0B254D]"
                        : "bg-white/10 hover:bg-white/20 text-white"
                    }`}
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    <span>Sort &amp; Filters</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStoreSection("orders")}
                    className="relative inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2 text-xs font-semibold text-white transition cursor-pointer"
                    title="View your book orders"
                  >
                    <ShoppingBag className="h-4 w-4 text-[#F5B82E]" />
                    <span className="tabular-nums">{bookOrders.length}</span>
                  </button>
                </div>
              </div>

              {/* Hero Banner (Royal & Deep Navy with Golden CTA) */}
              {storeSection === "catalog" && (
                <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B254D] via-[#123A78] to-[#155EEF] text-white shadow-sm">
                  <img
                    src={showcase.heroBackdropUrl}
                    alt="Zion Digital Bookstore"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-luminosity"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0B254D]/92 via-[#0B254D]/70 to-[#155EEF]/85" />

                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 px-6 py-7 sm:px-8 sm:py-9">
                    <div className="space-y-2.5 max-w-xl">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#F5B82E]">
                        {showcase.heroEyebrow}
                      </p>
                      <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight leading-tight">
                        Grow in Christ
                        <span className="block text-blue-100">Discover Knowledge</span>
                      </h1>
                      <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed max-w-lg">
                        {showcase.tagline} · M-Pesa STK &amp; instant encrypted digital library access.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          document.getElementById("featured_books_anchor")?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="inline-flex items-center gap-2 rounded-full bg-[#F5B82E] hover:bg-[#E5A91E] text-[#0B254D] font-bold px-5 py-2.5 text-xs sm:text-sm shadow-sm transition cursor-pointer"
                      >
                        <span>Shop Now &raquo;</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setStoreSection("library")}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-2.5 text-xs transition cursor-pointer"
                      >
                        <Library className="h-3.5 w-3.5" />
                        <span>My Library ({purchasedBookIds.length})</span>
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {/* Compact Live Showcase Bar (from Manager Portal, unobtrusive) */}
              {storeSection === "catalog" && activeSlide && (
                <section
                  onMouseEnter={() => setIsSlidePaused(true)}
                  onMouseLeave={() => setIsSlidePaused(false)}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 sm:p-4 flex flex-col sm:flex-row items-center gap-4 shadow-2xs"
                >
                  <img
                    src={activeSlide.imageUrl}
                    alt={activeSlide.title}
                    className="h-20 w-full sm:w-32 rounded-xl object-cover shrink-0 border border-slate-100 dark:border-slate-800"
                  />
                  <div className="flex-1 min-w-0 space-y-1 text-left">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#155EEF] dark:text-blue-400">
                      <span>{activeSlide.category || "ZION DIGITAL"}</span>
                      <span className="text-slate-300 dark:text-slate-600">·</span>
                      <span className="font-mono text-slate-400 tabular-nums">
                        {String(safeIndex + 1).padStart(2, "0")} / {String(showcase.slides.length).padStart(2, "0")}
                      </span>
                    </div>
                    <h2 className="font-display text-sm sm:text-base font-bold text-[#0B254D] dark:text-white truncate">
                      {activeSlide.title}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                      {activeSlide.subtitle}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() =>
                        setSlideIdx((prev) => (prev - 1 + showcase.slides.length) % showcase.slides.length)
                      }
                      className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer"
                      aria-label="Previous spotlight"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSlideIdx((prev) => (prev + 1) % showcase.slides.length)}
                      className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer"
                      aria-label="Next spotlight"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (activeSlide.targetView === "store") {
                          document.getElementById("store_catalog_anchor")?.scrollIntoView({ behavior: "smooth" });
                        } else {
                          onNavigate?.(activeSlide.targetView);
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#0B254D] hover:bg-[#155EEF] text-white px-3 py-2 text-xs font-semibold transition cursor-pointer"
                    >
                      <span>{activeSlide.ctaLabel || "Open"}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </section>
              )}

              {/* ORDERS LEDGER VIEW */}
              {storeSection === "orders" ? (
                <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <h2 className="font-display text-lg font-bold text-[#0B254D] dark:text-white">
                        My Book Orders &amp; Unlock Ledger
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Track M-Pesa &amp; eCitizen book unlock approvals and open approved titles immediately.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStoreSection("catalog")}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#155EEF] hover:bg-[#0F49C7] text-white px-3.5 py-2 text-xs font-semibold cursor-pointer"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Back to Books</span>
                    </button>
                  </div>

                  {bookOrders.length === 0 ? (
                    <div className="py-10 text-center space-y-3">
                      <ShoppingBag className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600" />
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        No book orders recorded yet
                      </p>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Select any book from the catalog to unlock with M-Pesa STK Push or read free titles instantly.
                      </p>
                      <button
                        type="button"
                        onClick={() => setStoreSection("catalog")}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#0B254D] text-white px-4 py-2 text-xs font-semibold cursor-pointer"
                      >
                        Browse Catalog
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            <th className="py-2.5 pr-4">Book Title</th>
                            <th className="py-2.5 pr-4">Date</th>
                            <th className="py-2.5 pr-4">Reference</th>
                            <th className="py-2.5 pr-4">Amount</th>
                            <th className="py-2.5 pr-4">Status</th>
                            <th className="py-2.5 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {bookOrders.map((ord) => {
                            const matchedBook = books.find((b) => b.id === ord.bookId);
                            return (
                              <tr key={ord.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                <td className="py-3 pr-4 font-semibold text-[#0B254D] dark:text-white">
                                  {ord.bookTitle || matchedBook?.title || "Digital Publication"}
                                </td>
                                <td className="py-3 pr-4 text-slate-500 tabular-nums">{ord.date}</td>
                                <td className="py-3 pr-4 font-mono text-slate-600 dark:text-slate-300">
                                  {ord.userName || ord.phoneNumber || ord.id.slice(-8)}
                                </td>
                                <td className="py-3 pr-4 font-semibold text-[#0B254D] dark:text-slate-200 tabular-nums">
                                  KES {Number(ord.price || 0).toLocaleString()}
                                </td>
                                <td className="py-3 pr-4 font-semibold uppercase text-[11px]">
                                  <span
                                    className={
                                      ord.status === "approved"
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : ord.status === "rejected"
                                        ? "text-rose-600 dark:text-rose-400"
                                        : "text-amber-600 dark:text-amber-400"
                                    }
                                  >
                                    {ord.status}
                                  </span>
                                </td>
                                <td className="py-3 text-right">
                                  {matchedBook && (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedBook(matchedBook)}
                                      className="rounded-lg bg-[#155EEF] hover:bg-[#0F49C7] text-white px-3 py-1.5 text-[11px] font-semibold cursor-pointer"
                                    >
                                      {ord.status === "approved" ? "Open Reader" : "View Book"}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              ) : (
                <>
                  {/* FEATURED BOOKS SECTION (5-Up Desktop Row) */}
                  {storeSection === "catalog" && featuredBooks.length > 0 && (
                    <section id="featured_books_anchor" className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h2 className="font-display text-lg sm:text-xl font-bold text-[#0B254D] dark:text-white">
                          Featured Books
                        </h2>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAllFeatured((prev) => !prev);
                            if (!showAllFeatured) {
                              document.getElementById("store_catalog_anchor")?.scrollIntoView({ behavior: "smooth" });
                            }
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#155EEF] hover:underline cursor-pointer"
                        >
                          <span>{showAllFeatured ? "Show Top 5" : "View All"}</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                        {visibleFeatured.map((fb) => (
                          <div
                            key={fb.id}
                            onClick={() => {
                              recordReadingHistory(fb.id);
                              setSelectedBook(fb);
                            }}
                            className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 cursor-pointer hover:border-[#155EEF]/60 transition flex flex-col"
                          >
                            <div className="aspect-[3/4] w-full bg-white dark:bg-transparent flex items-center justify-center mb-2.5">
                              <img
                                src={fb.coverImage}
                                alt={fb.title}
                                className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.02]"
                              />
                            </div>
                            <div className="space-y-1 flex-1 flex flex-col justify-between">
                              <div>
                                <span className="inline-block rounded bg-[#F5B82E]/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#0B254D] dark:text-[#F5B82E] mb-1">
                                  Featured
                                </span>
                                <h3 className="font-display text-xs sm:text-sm font-semibold text-[#0B254D] dark:text-white line-clamp-2 leading-snug">
                                  {fb.title}
                                </h3>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                  {fb.author}
                                </p>
                              </div>
                              <p className="text-xs font-bold text-[#155EEF] dark:text-blue-400 tabular-nums pt-1">
                                {fb.price > 0 ? `KES ${fb.price.toLocaleString()}` : "Free Access"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* BESTSELLING & RECOMMENDED SHELF (Clean Book Cover Display) */}
                  {storeSection === "catalog" && !searchQuery && selectedCategory === "All" && bestsellingBooks.length > 0 && (
                    <section className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-[#155EEF]" />
                          <h2 className="font-display text-base sm:text-lg font-bold text-[#0B254D] dark:text-white">
                            Bestsellers &amp; Recommended
                          </h2>
                        </div>
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          Top reader ratings ({recommendedBooks.length})
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
                        {bestsellingBooks.map((bb) => (
                          <div
                            key={`best_${bb.id}`}
                            onClick={() => {
                              recordReadingHistory(bb.id);
                              setSelectedBook(bb);
                            }}
                            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 cursor-pointer hover:border-[#155EEF]/55 transition flex flex-col"
                          >
                            <div className="aspect-[3/4] w-full bg-white dark:bg-transparent flex items-center justify-center mb-2">
                              <img
                                src={bb.coverImage}
                                alt={bb.title}
                                className="h-full w-full object-contain"
                              />
                            </div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-[#155EEF] dark:text-blue-400">
                              Bestseller · ★ {bb.rating}
                            </span>
                            <h3 className="font-display text-xs font-bold text-[#0B254D] dark:text-white line-clamp-1 mt-0.5">
                              {bb.title}
                            </h3>
                            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                              {bb.price > 0 ? `KES ${bb.price.toLocaleString()}` : "Free"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* DYNAMIC CAMPUS BUILDING PHOTO SPOTLIGHT (Linking Physical Bungoma Campus to Digital Bookstore) */}
                  {storeSection === "catalog" && categoryBuildingPhoto && (
                    <div className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-gradient-to-r from-[#0B254D] via-[#123A78] to-[#155EEF] text-white p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5 min-w-0 w-full md:w-auto">
                        <img
                          src={categoryBuildingPhoto.url}
                          alt={categoryBuildingPhoto.title}
                          className="h-16 w-24 sm:h-20 sm:w-28 rounded-xl object-cover border border-white/20 shrink-0 shadow-xs"
                        />
                        <div className="min-w-0 text-left space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded bg-[#F5B82E] text-[#0B254D] text-[10px] font-black uppercase font-mono tracking-wider">
                              Bungoma Campus Facility
                            </span>
                            <span className="text-[11px] text-blue-200 truncate font-mono">
                              Category: {categoryBuildingPhoto.libraryCategory}
                            </span>
                          </div>
                          <h3 className="font-display text-sm sm:text-base font-bold text-white truncate">
                            {categoryBuildingPhoto.title}
                          </h3>
                          <p className="text-[11px] text-blue-100/85 line-clamp-1">
                            {categoryBuildingPhoto.location} · {categoryBuildingPhoto.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
                        <button
                          type="button"
                          onClick={() => setShowCampusTourInStore(!showCampusTourInStore)}
                          className="w-full md:w-auto px-3.5 py-2 rounded-xl bg-[#F5B82E] hover:bg-[#E5A91E] text-[#0B254D] text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Compass className="h-3.5 w-3.5" />
                          <span>{showCampusTourInStore ? "Hide Virtual Tour" : "Take Bungoma Virtual Tour"}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {showCampusTourInStore && (
                    <div className="my-2">
                      <VirtualTourCarousel
                        currentUser={currentUser}
                        onNavigate={onNavigate}
                        titleOverride={`Virtual Tour: ${categoryBuildingPhoto?.title || "Bungoma Campus"}`}
                        subtitleOverride="Explore the physical lecture halls, library carrels, and computer labs in Kanduyi, Bungoma."
                      />
                    </div>
                  )}

                  {/* FILTERS, COMPARE & CATALOG HEADER */}
                  <div id="store_catalog_anchor" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="font-display text-base sm:text-lg font-bold text-[#0B254D] dark:text-white">
                          {storeSection === "library"
                            ? "My Unlocked Library"
                            : storeSection === "wishlist"
                            ? "Saved Reading Wishlist"
                            : storeSection === "history"
                            ? "My Reading History"
                            : selectedCategory === "All"
                            ? "All Publications"
                            : `${selectedCategory === "Religion" ? "Christian Books" : selectedCategory} Collection`}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          Showing {displayedCatalogBooks.length} {displayedCatalogBooks.length === 1 ? "title" : "titles"}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {storeSection !== "catalog" && (
                          <button
                            type="button"
                            onClick={() => setStoreSection("catalog")}
                            className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            All Books
                          </button>
                        )}
                        <select
                          id="store_category_select"
                          value={selectedCategory}
                          onChange={(e) => {
                            setStoreSection("catalog");
                            setSelectedCategory(e.target.value);
                          }}
                          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:border-[#155EEF] cursor-pointer"
                          title="Filter publications by category"
                        >
                          <option value="All">All Categories</option>
                          {categories
                            .filter((c) => c !== "All")
                            .map((cat) => (
                              <option key={cat} value={cat}>
                                {cat === "Religion" ? "Christian Books" : cat}
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowCompareView(!showCompareView)}
                          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                            showCompareView
                              ? "bg-[#155EEF] text-white border-[#155EEF]"
                              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <Scale className="h-3.5 w-3.5" />
                          <span>Compare</span>
                        </button>
                      </div>
                    </div>

                    {/* Side-by-Side Compare view */}
                    {showCompareView && (
                      <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4 rounded-xl space-y-4 text-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-700 pb-2.5 gap-2">
                          <div>
                            <h4 className="text-sm font-bold text-[#0B254D] dark:text-white">
                              Side-by-Side Book Comparison
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              Select any two publications to compare pages, file size, rating, and KES price.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setCompareBookId1("");
                              setCompareBookId2("");
                            }}
                            className="text-xs text-[#155EEF] font-semibold hover:underline cursor-pointer"
                          >
                            Reset selection
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <select
                            value={compareBookId1}
                            onChange={(e) => setCompareBookId1(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100"
                          >
                            <option value="">-- Select Book One --</option>
                            {books
                              .filter((b) => b.status === "active")
                              .map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.title} ({b.author})
                                </option>
                              ))}
                          </select>
                          <select
                            value={compareBookId2}
                            onChange={(e) => setCompareBookId2(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100"
                          >
                            <option value="">-- Select Book Two --</option>
                            {books
                              .filter((b) => b.status === "active")
                              .map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.title} ({b.author})
                                </option>
                              ))}
                          </select>
                        </div>

                        {compareBookId1 && compareBookId2 ? (
                          (() => {
                            const book1 = books.find((b) => b.id === compareBookId1);
                            const book2 = books.find((b) => b.id === compareBookId2);
                            if (!book1 || !book2) return null;
                            return (
                              <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800 text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                                      <th className="py-2.5 px-3">Metric</th>
                                      <th className="py-2.5 px-3 text-[#0B254D] dark:text-white">{book1.title}</th>
                                      <th className="py-2.5 px-3 text-[#0B254D] dark:text-white">{book2.title}</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    <tr>
                                      <td className="py-2 px-3 font-semibold text-slate-500">Author</td>
                                      <td className="py-2 px-3">{book1.author}</td>
                                      <td className="py-2 px-3">{book2.author}</td>
                                    </tr>
                                    <tr>
                                      <td className="py-2 px-3 font-semibold text-slate-500">Category</td>
                                      <td className="py-2 px-3">{book1.category}</td>
                                      <td className="py-2 px-3">{book2.category}</td>
                                    </tr>
                                    <tr>
                                      <td className="py-2 px-3 font-semibold text-slate-500">Pages / Time</td>
                                      <td className="py-2 px-3 tabular-nums">
                                        {book1.pages} pp · {getReadingDuration(book1.pages)}m
                                      </td>
                                      <td className="py-2 px-3 tabular-nums">
                                        {book2.pages} pp · {getReadingDuration(book2.pages)}m
                                      </td>
                                    </tr>
                                    <tr>
                                      <td className="py-2 px-3 font-semibold text-slate-500">Price</td>
                                      <td className="py-2 px-3 font-bold text-[#155EEF] tabular-nums">
                                        KES {book1.price.toLocaleString()}
                                      </td>
                                      <td className="py-2 px-3 font-bold text-[#155EEF] tabular-nums">
                                        KES {book2.price.toLocaleString()}
                                      </td>
                                    </tr>
                                    <tr>
                                      <td className="py-2 px-3 font-semibold text-slate-500">Inspect</td>
                                      <td className="py-2 px-3">
                                        <button
                                          type="button"
                                          onClick={() => setSelectedBook(book1)}
                                          className="bg-[#155EEF] text-white font-semibold py-1 px-3 rounded-lg text-[11px] cursor-pointer"
                                        >
                                          Open
                                        </button>
                                      </td>
                                      <td className="py-2 px-3">
                                        <button
                                          type="button"
                                          onClick={() => setSelectedBook(book2)}
                                          className="bg-[#155EEF] text-white font-semibold py-1 px-3 rounded-lg text-[11px] cursor-pointer"
                                        >
                                          Open
                                        </button>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            );
                          })()
                        ) : (
                          <div className="text-center py-3 text-xs text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                            Select two books above to view side-by-side comparison metrics.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Advanced Filters Drawer */}
                    {showFilters && (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <div className="space-y-1.5">
                          <div className="flex justify-between font-semibold text-slate-600 dark:text-slate-300">
                            <span>Max Price</span>
                            <span className="text-[#155EEF] tabular-nums">KES {maxPrice}</span>
                          </div>
                          <input
                            type="range"
                            min="100"
                            max="2000"
                            step="50"
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(parseInt(e.target.value, 10))}
                            className="w-full accent-[#155EEF] cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between font-semibold text-slate-600 dark:text-slate-300">
                            <span>Max File Size</span>
                            <span className="text-[#155EEF] tabular-nums">
                              {maxFileSize === 10 ? "Any" : `${maxFileSize} MB`}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            step="0.5"
                            value={maxFileSize}
                            onChange={(e) => setMaxFileSize(parseFloat(e.target.value))}
                            className="w-full accent-[#155EEF] cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between font-semibold text-slate-600 dark:text-slate-300">
                            <span>Max Duration</span>
                            <span className="text-[#155EEF] tabular-nums">
                              {maxDuration === 600 ? "Any" : `${maxDuration}m`}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="60"
                            max="600"
                            step="30"
                            value={maxDuration}
                            onChange={(e) => setMaxDuration(parseInt(e.target.value, 10))}
                            className="w-full accent-[#155EEF] cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <span className="font-semibold text-slate-600 dark:text-slate-300 block">Sort By</span>
                          <div className="grid grid-cols-2 gap-1.5">
                            {[
                              { id: "rating", label: "Top Rated" },
                              { id: "date", label: "Newest" },
                              { id: "alphabet", label: "A–Z" },
                              { id: "price", label: "Lowest KES" },
                            ].map((opt) => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => setSortBy(opt.id as any)}
                                className={`rounded-lg py-1.5 px-2 text-[11px] font-semibold border transition cursor-pointer ${
                                  sortBy === opt.id
                                    ? "bg-[#0B254D] text-white border-[#0B254D]"
                                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* MAIN CATALOG GRID */}
                  {displayedCatalogBooks.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-3">
                      <BookOpen className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600" />
                      <h3 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">
                        No Matching Publications
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                        {storeSection === "library"
                          ? "You have not unlocked any books yet. Browse the catalog to add free titles or unlock via M-Pesa."
                          : storeSection === "wishlist"
                          ? "Your reading wishlist is empty. Click the three-dot menu on any book to save it here."
                          : "Adjust your search or category filter to view available titles."}
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-3.5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                      {displayedCatalogBooks.map((b, index) => {
                        const progressVal = getBookProgress(b.id, b.pages);
                        const isPurchased = purchasedBookIds.includes(b.id);
                        return (
                          <motion.div
                            key={b.id}
                            id={b.id === "b1" ? "book_card_book_1" : `book_card_${b.id}`}
                            onClick={() => {
                              recordReadingHistory(b.id);
                              setDetailModalBook(b);
                            }}
                            className="group bookstore-item-card relative flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 cursor-pointer text-left transition hover:border-[#155EEF]/55"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.24) }}
                          >
                            <div>
                              {/* Clean Unframed Portrait Book Cover (Natural Colors & Proportions, Zero Distortion/Veil) */}
                              <div className="aspect-[3/4] w-full bg-white dark:bg-transparent relative mb-2.5 flex items-center justify-center">
                                <img
                                  src={b.coverImage}
                                  className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.02]"
                                  alt={b.title}
                                />
                              </div>

                              <div className="flex items-center justify-between gap-1.5">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 truncate">
                                  {b.category === "Religion" ? "Christian Books" : b.category === "Self-Help" ? "Personal Dev." : b.category}
                                  {b.isFeatured ? " · Featured" : ""}
                                </p>

                                {/* Clean Metadata-Row Actions & Context Menu */}
                                <div className="relative flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      recordReadingHistory(b.id);
                                      setInstantPreviewBook(b);
                                      setPreviewPage(1);
                                    }}
                                    title="Preview chapters"
                                    className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-[#155EEF] hover:bg-[#EFF6FF] dark:hover:bg-slate-800 cursor-pointer"
                                  >
                                    Preview
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveContextMenuBookId((prev) => (prev === b.id ? null : b.id));
                                    }}
                                    className="h-6 w-6 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                    title="More options"
                                  >
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </button>

                                  {activeContextMenuBookId === b.id && (
                                    <div className="absolute right-0 bottom-full mb-1 w-44 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl py-1.5 z-30">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveContextMenuBookId(null);
                                          handleShareBook(b);
                                        }}
                                        className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                                      >
                                        <Share2 className="h-3.5 w-3.5 text-slate-400" />
                                        <span>Share Book</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveContextMenuBookId(null);
                                          onToggleWishlist(b.id);
                                          const isFav = wishlistBookIds.includes(b.id);
                                          triggerToast(
                                            isFav
                                              ? `Removed "${b.title}" from wishlist.`
                                              : `Added "${b.title}" to wishlist.`
                                          );
                                        }}
                                        className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                                      >
                                        <Heart className="h-3.5 w-3.5 text-rose-500 fill-current" />
                                        <span>{wishlistBookIds.includes(b.id) ? "In Wishlist" : "Add to Wishlist"}</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveContextMenuBookId(null);
                                          setSelectedBook(b);
                                        }}
                                        className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                                      >
                                        <Eye className="h-3.5 w-3.5 text-[#155EEF]" />
                                        <span>Full Details</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <h3 className="font-display text-xs sm:text-sm font-bold text-[#0B254D] dark:text-white line-clamp-2 leading-snug mt-0.5">
                                {b.title}
                              </h3>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {b.author}
                              </p>
                            </div>

                            <div className="pt-2.5 mt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-[#155EEF] dark:text-blue-400 tabular-nums">
                                  {b.price > 0 ? `KES ${b.price.toLocaleString()}` : "Free"}
                                </span>
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
                                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                  <span>{b.rating}</span>
                                </span>
                              </div>

                              {progressVal > 0 && (
                                <div className="space-y-1">
                                  <div className="flex justify-between text-[10px] font-medium text-slate-500 tabular-nums">
                                    <span>Progress</span>
                                    <span className="text-emerald-600 font-semibold">{progressVal}%</span>
                                  </div>
                                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                                    <div
                                      className="bg-emerald-500 h-full rounded-full"
                                      style={{ width: `${progressVal}%` }}
                                    />
                                  </div>
                                </div>
                              )}

                              {isPurchased ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedBook(b);
                                  }}
                                  className="w-full py-1.5 px-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold flex items-center justify-center gap-1 border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  <span>In Library</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!currentUser) {
                                      triggerToast("Please sign in first to save or purchase eBooks.");
                                      onLogIn();
                                      return;
                                    }
                                    if ((b.price || 0) > 0) {
                                      setSelectedBook(b);
                                      triggerToast(`"${b.title}" requires KES ${b.price.toLocaleString()} checkout.`);
                                      return;
                                    }
                                    onQuickSaveToLibrary?.(b.id);
                                    triggerToast(`"${b.title}" added to your personal library.`);
                                  }}
                                  className="w-full py-1.5 px-2.5 rounded-lg bg-[#EFF6FF] hover:bg-[#155EEF] text-[#155EEF] hover:text-white dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-[#155EEF] dark:hover:text-white text-[11px] font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  <span>{(b.price || 0) > 0 ? `Unlock · KES ${b.price.toLocaleString()}` : "Save Book"}</span>
                                </button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}

                  {/* Compact Payment & Cloud Vault Strip */}
                  <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="flex items-start gap-2.5">
                      <CreditCard className="h-4 w-4 text-[#155EEF] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-[#0B254D] dark:text-white">M-Pesa STK &amp; PayBill {darajaShortcode}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Instant Kenyan Shilling checkout powered by Safaricom Daraja.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Cloud className="h-4 w-4 text-[#155EEF] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-[#0B254D] dark:text-white">Supabase &amp; Firebase Vault</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Cross-device reading progress and unlocked library sync.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <HardDrive className="h-4 w-4 text-[#155EEF] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-[#0B254D] dark:text-white">Offline IndexedDB Reader</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Access approved publications offline inside SecureBookReader.
                        </p>
                      </div>
                    </div>
                  </section>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* 🪟 BOOKSTORE QUICK VIEW MODAL */}
      {quickViewBook && (
        <div id="bookstore_quick_view_modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-md animate-fade-in select-none">
          <div className="relative w-full max-w-lg bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-850 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-left flex flex-col md:flex-row">
            
            {/* Visual Thumbnail (Book Cover Fix: clean transparent/white, zero shadow/badge overlap) */}
            <div className="w-full md:w-2/5 bg-white dark:bg-transparent p-6 flex items-center justify-center">
              <img 
                src={quickViewBook.coverImage} 
                alt={quickViewBook.title} 
                className="w-full max-h-[240px] object-contain" 
              />
            </div>

            {/* Content info */}
            <div className="w-full md:w-3/5 p-6 flex flex-col justify-between">
              <button
                type="button"
                onClick={() => setQuickViewBook(null)}
                className="absolute top-3 right-3 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 font-bold p-1 w-7 h-7 flex items-center justify-center rounded-full hover:bg-stone-100 dark:hover:bg-stone-850 cursor-pointer transition text-sm"
              >
                ✕
              </button>

              <div className="space-y-3">
                <div>
                  <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-stone-400 block">
                    {quickViewBook.category}
                  </span>
                  <h4 className="font-display font-extrabold text-stone-900 dark:text-stone-100 text-sm leading-snug mt-0.5">
                    {quickViewBook.title}
                  </h4>
                  <p className="text-[11px] text-stone-500 font-sans font-medium">By {quickViewBook.author}</p>
                </div>

                {/* Rating */}
                <div className="flex items-center space-x-1.5 text-xs font-bold text-neutral-800 dark:text-stone-200 font-mono">
                  <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                  <span>{quickViewBook.rating}</span>
                  <span className="text-stone-400 font-normal">({quickViewBook.reviewsCount} reviews)</span>
                </div>

                {/* Description snippet */}
                <p className="text-[11px] leading-relaxed text-stone-600 dark:text-stone-300 font-sans line-clamp-4">
                  {quickViewBook.description || "No summary description available for this technical blueprint curriculum."}
                </p>

                <div className="grid grid-cols-2 gap-2 border-t border-b border-stone-150 dark:border-stone-850 py-2.5 font-mono text-[10px] text-stone-500 dark:text-stone-400">
                  <div>Length: <strong className="text-stone-700 dark:text-stone-250">{quickViewBook.pages} pages</strong></div>
                  <div>File Size: <strong className="text-stone-700 dark:text-stone-250">{quickViewBook.fileSize}</strong></div>
                  <div>Format: <strong className="text-stone-700 dark:text-stone-250">PDF Document</strong></div>
                  <div>Pub Date: <strong className="text-stone-700 dark:text-stone-250">{quickViewBook.publishedDate}</strong></div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <div>
                  <span className="font-mono text-[10px] text-stone-400 block uppercase leading-none">Price</span>
                  <span className="font-mono text-xs font-black text-red-700">KES {quickViewBook.price.toLocaleString()}</span>
                </div>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onToggleWishlist(quickViewBook.id);
                    }}
                    className={`p-2 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center justify-center cursor-pointer transition hover:scale-105 ${
                      wishlistBookIds.includes(quickViewBook.id)
                        ? "bg-red-50 dark:bg-red-950/20 text-red-600 border-red-200 dark:border-red-900"
                        : "bg-white dark:bg-stone-900 text-stone-400 hover:text-stone-600"
                    }`}
                    title={wishlistBookIds.includes(quickViewBook.id) ? "Wishlisted" : "Add to Wishlist"}
                  >
                    <Heart className={`h-4 w-4 ${wishlistBookIds.includes(quickViewBook.id) ? "fill-red-600" : ""}`} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBook(quickViewBook);
                      setQuickViewBook(null);
                    }}
                    className="bg-stone-900 hover:bg-black dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-950 font-bold px-4 py-2 rounded-xl text-[11px] uppercase tracking-wide cursor-pointer transition hover:scale-105"
                  >
                    Details & Buy
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Premium Scholastic Book Details Modal (triggered when a bookstore card is clicked) */}
      {detailModalBook && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4" style={{ zIndex: 60 }}>
          <div 
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity duration-300" 
            onClick={() => setDetailModalBook(null)} 
          />
          
          <div className="relative w-full max-w-2xl bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 p-6 overscroll-contain overflow-y-auto max-h-[90vh] animate-in fade-in zoom-in-95 duration-250 ease-out text-left">
            {/* Close button */}
            <button
              onClick={() => setDetailModalBook(null)}
              className="absolute top-5 right-5 h-8 w-8 flex items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-350 transition cursor-pointer"
              title="Close Panel"
            >
              <span className="text-xl font-bold font-sans">&times;</span>
            </button>

            {/* Layout grid */}
            <div className="grid gap-6 md:grid-cols-12 mt-2">
              {/* Left Column: Image cover, price, wishlist button (Book Cover Fix: transparent, no border/shadow/badge) */}
              <div className="md:col-span-5 flex flex-col items-center">
                <div className="w-full max-w-[220px] mb-4 flex items-center justify-center bg-white dark:bg-transparent">
                  <img src={detailModalBook.coverImage} className="w-full max-h-[280px] object-contain" alt={detailModalBook.title} />
                </div>

                <div className="w-full bg-stone-50 dark:bg-stone-950 p-4 rounded-xl border border-stone-200/60 dark:border-stone-800 space-y-2 text-center">
                  <div className="text-[10px] uppercase font-mono font-bold text-stone-400">Price & Licensing</div>
                  <div className="text-xl font-mono font-black text-red-700">KES {detailModalBook.price.toLocaleString()}</div>
                  <div className="text-[10px] text-stone-500 font-medium">Includes lifelong interactive access & DRM updates</div>
                </div>
              </div>

              {/* Right Column: Descriptions, Full summary, Author Profile */}
              <div className="md:col-span-7 space-y-4">
                <div>
                  <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-350 border border-indigo-200/50 rounded-full text-[9px] font-mono tracking-wider font-bold uppercase block w-fit mb-2">
                    {detailModalBook.category}
                  </span>
                  <h3 className="font-display text-xl font-extrabold text-stone-900 leading-tight tracking-tight dark:text-white">
                    {detailModalBook.title}
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">Written by <strong className="text-stone-800 dark:text-stone-200">{detailModalBook.author}</strong></p>
                </div>

                {/* Grid of details */}
                <div className="grid grid-cols-2 gap-2.5 border-t border-b border-stone-100 dark:border-stone-800 py-3 font-mono text-[10px] text-stone-500">
                  <div>Size: <strong className="text-stone-800 dark:text-stone-300">{detailModalBook.fileSize}</strong></div>
                  <div>Length: <strong className="text-stone-800 dark:text-stone-300">{detailModalBook.pages} pages</strong></div>
                  <div>Format: <strong className="text-stone-800 dark:text-stone-300">DRM-Secured PDF</strong></div>
                  <div>Date: <strong className="text-stone-800 dark:text-stone-300">{detailModalBook.publishedDate}</strong></div>
                </div>

                {/* Scholastic Full Summary */}
                <div className="space-y-1.5">
                  <h4 className="text-[11px] uppercase font-mono font-black tracking-wider text-stone-400">Complete Summary</h4>
                  <p className="text-xs text-stone-600 leading-relaxed font-sans font-medium dark:text-stone-300">
                    {detailModalBook.description || `In this masterfully crafted volume, "${detailModalBook.title}", the author provides a deep analytical dive into ${detailModalBook.category.toLowerCase()} methodologies. Drawing from professional field case reviews and historical datasets, this treatise articulates the critical intersection of functional execution and strategic vision. Readers will discover progressive frameworks for evaluating organizational pipelines, diagnostic criteria for risk management, and step-by-step guidelines for building resilient modern systems.`}
                  </p>
                </div>

                {/* Author Biography Section */}
                <div className="space-y-1.5 bg-amber-50/20 dark:bg-amber-950/10 border border-amber-200/30 p-3.5 rounded-xl">
                  <h4 className="text-[10px] uppercase font-mono font-black tracking-wider text-amber-600 block mb-0.5">Author Biography Profile</h4>
                  <p className="text-[11px] text-stone-600 leading-relaxed italic font-medium dark:text-stone-350">
                    {`Professor ${detailModalBook.author} is an accomplished scholar, lecturer, and senior authority in academic networks and administrative sciences. With over a decade of dedication to research fellowships, curriculum engineering, and advising public-private collaborative networks, they specialize in translating highly complex methodologies into accessible, human-centered logical guides.`}
                  </p>
                </div>

                {/* Footer Action buttons inside details modal */}
                <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex flex-wrap gap-2 items-center justify-end">
                  <button
                    onClick={() => {
                      onToggleWishlist(detailModalBook.id);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      wishlistBookIds.includes(detailModalBook.id)
                        ? "bg-amber-100 text-amber-800"
                        : "bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-600"
                    }`}
                  >
                    <Bookmark className="h-3.5 w-3.5 shrink-0" />
                    <span>{wishlistBookIds.includes(detailModalBook.id) ? "Bookmarked (Saved)" : "Bookmark Book"}</span>
                  </button>

                  <button
                    onClick={() => {
                      // Trigger reading standard preview directly!
                      setReadingBook(detailModalBook);
                      setDetailModalBook(null);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition cursor-pointer"
                  >
                    Read Online Preview
                  </button>

                  <button
                    onClick={() => {
                      // Trigger M-PESA checkout directly!
                      setSelectedBook(detailModalBook);
                      setDetailModalBook(null);
                      setShowMpesaModal(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-red-750 hover:bg-red-800 text-white text-xs font-bold transition flex items-center gap-1 hover:scale-103 cursor-pointer shadow-md shadow-red-700/15"
                  >
                    <ShoppingBag className="h-3.5 w-3.5 shrink-0" />
                    <span>Buy KES {detailModalBook.price.toLocaleString()}</span>
                  </button>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* 6. LIVE DARAJA M-PESA CHECKOUT MODAL */}
      {showMpesaModal && selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
            onClick={() => {
              if (stkStatus === "idle" || stkStatus === "success" || stkStatus === "failed") {
                setShowMpesaModal(false);
              }
            }}
          />

          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-100 p-6 overflow-hidden text-xs text-left my-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-4">
              <div className="flex items-center space-x-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-600 text-white font-black text-sm tracking-tighter">
                  M
                </span>
                <div>
                  <h3 className="font-display font-black text-stone-900 text-sm">Lipa Na M-Pesa Checkout</h3>
                  <p className="text-[10px] text-green-600 font-mono font-bold uppercase tracking-wider">
                    Safaricom Daraja {darajaEnv === "production" ? "Live Production" : "Sandbox"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowMpesaModal(false);
                  setStkStatus("idle");
                  setQrCodeBase64(null);
                  setCheckoutError("");
                }}
                disabled={stkStatus === "pushing"}
                className="text-stone-400 hover:text-stone-600 font-bold p-1 text-sm disabled:opacity-30 cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="rounded-2xl border border-stone-200 p-4 space-y-2 bg-stone-50">
              <div className="flex justify-between items-center">
                <span className="text-stone-500 uppercase font-bold text-[9px] tracking-wider">E-Book Release</span>
                <span className="bg-stone-200 text-stone-700 font-bold px-2 py-0.5 rounded font-mono text-[9px]">{selectedBook.fileSize} PDF</span>
              </div>
              <h4 className="font-display font-extrabold text-stone-900 text-xs truncate leading-snug">{selectedBook.title}</h4>

              <div className="border-t border-stone-200/70 pt-2 flex justify-between items-center text-xs">
                <span className="text-stone-500 font-medium">Billed Amount:</span>
                <span className="font-mono font-black text-sm text-red-700">KES {selectedBook.price.toLocaleString()}</span>
              </div>
            </div>

            <div className="my-4 bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-1.5">
                <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">PayBill Target</span>
                <span className="text-[10px] font-mono font-bold text-emerald-700">{darajaEnv.toUpperCase()}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                <div className="bg-white p-2 rounded-xl border border-emerald-200 text-center">
                  <span className="text-[9px] text-stone-500 uppercase block font-bold font-sans">Business PayBill</span>
                  <span className="text-stone-900 font-black text-xs">{darajaShortcode}</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-emerald-200 text-center">
                  <span className="text-[9px] text-stone-500 uppercase block font-bold font-sans">Account Reference</span>
                  <span className="text-stone-900 font-black text-[11px]">ZD-{selectedBook.id.slice(0, 10)}</span>
                </div>
              </div>
            </div>

            {checkoutError && (
              <div className="mb-3 bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-xl font-bold text-[11px] leading-tight text-left">
                {checkoutError}
              </div>
            )}

            {stkStatus === "idle" && (
              <form onSubmit={handleDispatchLiveStkPush} className="space-y-4">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-left">
                  <span className="text-[9.5px] font-black text-slate-600 uppercase tracking-widest block">Your Payment Details</span>

                  <div className="space-y-1">
                    <label className="block text-[10px] text-slate-700 font-black uppercase tracking-wide">Safaricom Mobile Number</label>
                    <input
                      type="text"
                      required
                      maxLength={13}
                      value={checkoutPhone}
                      onChange={(e) => setCheckoutPhone(e.target.value.replace(/[^0-9+]/g, ""))}
                      placeholder="e.g. 0712345678 or 254712345678"
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-bold text-stone-900 outline-none text-xs focus:border-green-600 font-mono tracking-wider"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] text-slate-700 font-black uppercase tracking-wide">Customer ID / Account Ref</label>
                    <input
                      type="text"
                      required
                      value={checkoutCustomerID || (currentUser?.email || "")}
                      onChange={(e) => setCheckoutCustomerID(e.target.value)}
                      placeholder="Member Email or Account Ref"
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-bold text-stone-900 outline-none text-xs focus:border-indigo-600 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] text-slate-700 font-black uppercase tracking-wide">Payer Full Name</label>
                    <input
                      type="text"
                      required
                      value={checkoutCustomerName || (currentUser?.name || "")}
                      onChange={(e) => setCheckoutCustomerName(e.target.value)}
                      placeholder="Your registered name"
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-bold text-stone-900 outline-none text-xs focus:border-indigo-600"
                    />
                  </div>
                </div>

                {qrCodeBase64 && (
                  <div className="p-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 text-center space-y-2">
                    <p className="text-[10px] font-bold text-emerald-800 uppercase">Scan with M-Pesa App</p>
                    <img
                      src={`data:image/png;base64,${qrCodeBase64}`}
                      alt="M-Pesa PayBill Dynamic QR Code"
                      className="w-36 h-36 mx-auto rounded-lg border border-emerald-200 bg-white p-1"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleGenerateDynamicQr}
                    disabled={isLoadingQr}
                    className="rounded-xl border border-stone-200 font-bold px-3 py-2.5 hover:bg-stone-50 text-stone-700 cursor-pointer disabled:opacity-50"
                  >
                    {isLoadingQr ? "Loading QR..." : "PayBill QR"}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 text-white font-extrabold py-2.5 text-center shadow-md shadow-green-600/10 cursor-pointer"
                  >
                    Send Live STK Push
                  </button>
                </div>
              </form>
            )}

            {stkStatus !== "idle" && (
              <div className="py-4 space-y-4 text-center">
                <div className="space-y-1.5">
                  <h4 className="font-display font-extrabold text-stone-900 text-sm">
                    {stkStatus === "pushing" && "Dispatching M-Pesa STK Push..."}
                    {stkStatus === "waiting" && "Check Your Phone for M-Pesa PIN Prompt"}
                    {stkStatus === "success" && "Payment Confirmed"}
                    {stkStatus === "failed" && "Payment Not Completed"}
                  </h4>
                  <p className="text-[11px] text-stone-600 max-w-xs mx-auto leading-normal">
                    {stkStatus === "pushing" && `Connecting to Safaricom PayBill ${darajaShortcode} for ${checkoutPhone}...`}
                    {stkStatus === "waiting" && `Approve the KES ${selectedBook.price.toLocaleString()} prompt on ${checkoutPhone} by entering your M-Pesa PIN on your handset. Waiting for Daraja callback (${activeCheckoutId})...`}
                    {stkStatus === "success" && `Receipt ${mpesaReceiptCode} verified. Your e-book is now unlocked in My Library.`}
                    {stkStatus === "failed" && "You can retry the STK push or pay directly via PayBill."}
                  </p>
                </div>

                {stkStatus === "waiting" && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setStkStatus("idle");
                        setActiveCheckoutId("");
                      }}
                      className="flex-1 rounded-xl border border-stone-200 text-stone-700 font-bold py-2.5 hover:bg-stone-50 cursor-pointer"
                    >
                      Change Phone
                    </button>
                    <button
                      type="button"
                      onClick={() => void queryDarajaPaymentStatus(activeCheckoutId)}
                      className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 cursor-pointer"
                    >
                      Verify Status Now
                    </button>
                  </div>
                )}

                {stkStatus === "failed" && (
                  <button
                    type="button"
                    onClick={() => {
                      setStkStatus("idle");
                      setCheckoutError("");
                    }}
                    className="w-full rounded-xl bg-stone-900 text-white font-extrabold py-2.5 hover:bg-stone-800 cursor-pointer"
                  >
                    Try Payment Again
                  </button>
                )}

                {stkStatus === "success" && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMpesaModal(false);
                      setStkStatus("idle");
                      setActiveCheckoutId("");
                    }}
                    className="w-full rounded-xl bg-stone-900 text-white font-extrabold py-2.5 hover:bg-stone-800 transition shadow-md cursor-pointer"
                  >
                    Unlock and Read PDF
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. WAFULA READS STAR RATING & REFLECTIVE REVIEW MODAL */}
      {showReviewModal && selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md" onClick={() => setShowReviewModal(false)} />
          
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-100 p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-250 select-none text-xs text-left">
            
            {/* Header section styled to match Mpesa paying layout */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-5">
              <div className="flex items-center space-x-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-550 text-white font-black text-sm">
                  ★
                </span>
                <div>
                  <h3 className="font-display font-black text-stone-900 text-sm">Submit Review & Star Rating</h3>
                  <p className="text-[10px] text-amber-600 font-mono font-bold uppercase tracking-wider">Academic Syllabus Review Ledger</p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="text-stone-400 hover:text-stone-600 font-bold p-1 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-stone-50 rounded-2xl border border-stone-150 p-4 mb-4 space-y-1.5">
              <span className="text-stone-400 uppercase font-black text-[9px] tracking-wider block">Currently Reviewing</span>
              <h4 className="font-bold text-stone-900 text-xs line-clamp-1">{selectedBook.title}</h4>
              <p className="text-[10.5px] text-stone-500 font-mono">Volume Author: {selectedBook.author}</p>
            </div>

            <form
              onSubmit={(e) => {
                handleSubmitReview(e);
                setShowReviewModal(false);
              }}
              className="space-y-4"
            >
              {/* Star interactive selection board */}
              <div className="space-y-1.5 text-center bg-amber-50/50 rounded-2xl border border-amber-100/70 p-4">
                <label className="block text-[11px] font-bold text-amber-800 uppercase tracking-wider">Select Star Score</label>
                <div className="flex items-center justify-center space-x-1.5 mt-1">
                  {[1, 2, 3, 4, 5].map((starNum) => (
                    <button
                      key={starNum}
                      type="button"
                      onClick={() => setUserRating(starNum)}
                      className="text-amber-500 hover:scale-115 transition duration-150 shrink-0 cursor-pointer"
                    >
                      <Star className={`h-8 w-8 ${starNum <= userRating ? "fill-amber-500 text-amber-500" : "text-stone-250"}`} />
                    </button>
                  ))}
                </div>
                <p className="text-[10.5px] text-amber-700/80 mt-1 font-mono">
                  {userRating === 5 && "⭐ Excellent Masterpiece"}
                  {userRating === 4 && "⭐ Highly Recommended"}
                  {userRating === 3 && "⭐ Good Material Study"}
                  {userRating === 2 && "⭐ Needs Additional Notes"}
                  {userRating === 1 && "⭐ Disappointed Volume"}
                </p>
              </div>

              {/* Text review detail input */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-widest pl-1">Review Comments Text</label>
                <textarea
                  required
                  rows={4}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Provide detailed, helpful paragraphs regarding your study context, note content clarity, academic depth, or lesson questions..."
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50 p-3.5 text-xs outline-none focus:border-red-750 focus:bg-white transition resize-none leading-relaxed"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 rounded-2xl border border-stone-200 py-3 font-bold text-stone-700 bg-white hover:bg-stone-50 text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-2xl bg-red-750 text-white font-extrabold py-3 hover:bg-stone-900 text-xs shadow-md transition cursor-pointer"
                >
                  Submit Review
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* SECURE ONLINE BOOK DRM READER */}
      {readingBook && (
        <SecureBookReader
          book={readingBook}
          currentUser={currentUser}
          hasPaid={purchasedBookIds.includes(readingBook.id)}
          isAdmin={["main_admin", "admin", "sub_admin"].includes(currentUser?.role || "")}
          onClose={() => setReadingBook(null)}
          onTriggerPayment={() => {
            setStkStatus("idle");
            setCheckoutPhone("");
            setCheckoutError("");
            setShowMpesaModal(true);
          }}
          onAddNewDocument={onAddNewDocument}
        />
      )}

      {/* Bulk Action Bar Removed */}

      {/* Premium Instant Preview open-book modal */}
      {instantPreviewBook && (() => {
        const pages = getBookPreviewPages(instantPreviewBook);
        return (
          <div id="book_instant_preview_modal" className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-850 w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] animate-in zoom-in-95 duration-250 select-text">
              {/* Header */}
              <div className="px-6 py-4 border-b border-stone-150/80 flex items-center justify-between bg-stone-50 dark:bg-stone-900/50">
                <div className="flex items-center space-x-2.5">
                  <span className="text-xl">📖</span>
                  <div className="text-left">
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest font-mono">
                      eBook Instant Preview (Pages 1 to 3)
                    </span>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white font-display">
                      {instantPreviewBook.title}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInstantPreviewBook(null)}
                  className="rounded-full h-8 w-8 flex items-center justify-center bg-stone-100 hover:bg-stone-200 dark:bg-stone-850 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition cursor-pointer font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Page stage - styled like an open academic manuscript */}
              <div className="p-4 md:p-8 bg-amber-50/15 dark:bg-stone-900/10 flex-1 overflow-y-auto grid md:grid-cols-12 gap-4 md:gap-6 min-h-[280px]">
                {/* Book Left Margin / Branding */}
                <div className="md:col-span-3 flex md:flex-col justify-between items-center md:items-stretch border-b md:border-b-0 md:border-r border-stone-200 border-dashed pb-3 md:pb-0 md:pr-4 gap-4 text-left">
                  <div className="flex items-center md:items-stretch space-x-3.5 md:space-x-0 md:space-y-4 w-full">
                    <div className="w-12 sm:w-16 md:w-28 shrink-0 bg-transparent flex items-center justify-center">
                      <img src={instantPreviewBook.coverImage} className="w-full max-h-36 object-contain" alt={instantPreviewBook.title} />
                    </div>
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div>
                        <span className="text-[7.5px] font-bold uppercase tracking-wider text-stone-400 block leading-none">AUTHOR</span>
                        <p className="text-[11px] md:text-xs font-bold text-slate-800 dark:text-stone-200 italic truncate">{instantPreviewBook.author}</p>
                      </div>
                      <div>
                        <span className="text-[7.5px] font-bold uppercase tracking-wider text-stone-400 block leading-none">CATEGORY</span>
                        <p className="text-[11px] md:text-xs font-bold text-indigo-600 dark:text-indigo-400 leading-tight truncate">{instantPreviewBook.category}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 text-white rounded-xl p-2.5 md:p-3 text-center space-y-0.5 md:space-y-1 flex md:flex-col justify-between items-center md:items-stretch w-40 sm:w-44 md:w-full shrink-0">
                    <div className="text-left md:text-center">
                      <span className="text-[7px] md:text-[8px] font-mono tracking-widest text-amber-400 font-extrabold uppercase block select-none">OFFLINE PRICE</span>
                      <p className="text-[10px] md:text-xs font-black">KES {instantPreviewBook.price.toLocaleString()}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setInstantPreviewBook(null);
                        setSelectedBook(instantPreviewBook);
                      }}
                      className="bg-amber-500 hover:bg-amber-600 text-stone-950 font-black rounded-lg text-[8px] md:text-[9px] uppercase py-1 px-2.5 md:py-1.5 transition cursor-pointer shrink-0"
                    >
                      Buy Full
                    </button>
                  </div>
                </div>

                {/* Right Area: Actual Paper Content Box */}
                <div className="md:col-span-9 flex flex-col justify-between text-left space-y-6">
                  {/* Paper Sheet */}
                  <div className="bg-white dark:bg-stone-900 p-6 md:p-8 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-sm relative min-h-[250px] flex flex-col justify-between">
                    {/* Ribbon or binding lines */}
                    <div className="absolute top-0 bottom-0 left-0 w-2.5 bg-gradient-to-r from-stone-100 to-transparent dark:from-stone-950/20" />
                    
                    <div className="space-y-4">
                      {/* Page header */}
                      <div className="flex justify-between items-center border-b border-stone-100 dark:border-stone-850 pb-2.5">
                        <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider font-mono">
                          {pages[previewPage - 1].title}
                        </span>
                        <span className="text-[10px] font-mono text-stone-400">
                          {previewPage} of 3
                        </span>
                      </div>

                      {/* Content text */}
                      <p className="text-xs text-stone-750 dark:text-stone-300 leading-relaxed font-sans font-medium whitespace-pre-wrap">
                        {pages[previewPage - 1].content}
                      </p>
                    </div>

                    <div className="border-t border-stone-100 dark:border-stone-850 pt-4 mt-6 flex justify-between items-center text-[10px] text-stone-400 font-medium">
                      <span>Wafula Premium Bookstore Academic Preview</span>
                      <span>DRM Secure Lock Level 1</span>
                    </div>
                  </div>

                  {/* Page Navigator Controls */}
                  <div className="flex items-center justify-between border-t border-stone-150 pt-4">
                    <button
                      type="button"
                      disabled={previewPage === 1}
                      onClick={() => setPreviewPage(prev => Math.max(1, prev - 1))}
                      className="px-3.5 py-1.5 rounded-xl border bg-white dark:bg-stone-900 border-stone-200 hover:bg-stone-50 select-none font-bold text-xs disabled:opacity-40 disabled:pointer-events-none cursor-pointer text-slate-700"
                    >
                      ← Previous Page
                    </button>

                    <div className="flex space-x-1.5">
                      {[1, 2, 3].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setPreviewPage(num)}
                          className={`h-6 w-6 rounded-lg text-xs font-black transition cursor-pointer ${
                            previewPage === num
                              ? "bg-slate-900 text-white dark:bg-stone-100 dark:text-stone-900"
                              : "bg-stone-100 text-stone-500 hover:bg-stone-250"
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>

                    {previewPage < 3 ? (
                      <button
                        type="button"
                        onClick={() => setPreviewPage(prev => Math.min(3, prev + 1))}
                        className="px-3.5 py-1.5 rounded-xl border bg-amber-500 text-stone-950 font-black hover:bg-amber-600 select-none text-xs cursor-pointer"
                      >
                        Next Page →
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setInstantPreviewBook(null);
                          setSelectedBook(instantPreviewBook);
                        }}
                        className="px-3.5 py-1.5 rounded-xl border bg-green-600 text-white font-black hover:bg-green-700 select-none text-xs cursor-pointer animate-pulse"
                      >
                        Buy Book ✓
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Toast Notification Widget */}
      {showToast && (
        <div id="bookstore_toast_widget" className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-3 fade-in duration-300">
          <div className="bg-slate-900 border border-amber-500/30 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 max-w-sm">
            <span className="text-base text-amber-400">✨</span>
            <p className="text-xs font-semibold leading-snug">{showToast}</p>
          </div>
        </div>
      )}

    </div>
  );
}
