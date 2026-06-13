import React, { useState, useEffect } from "react";
import { Book, Review, Comment, User, BookCategory, SavedDocument, BookOrder } from "../types";
import { Search, SlidersHorizontal, Star, Calendar, DollarSign, MessageSquare, ArrowLeft, Bookmark, ShoppingBag, FolderKey, Plus, Eye, Globe, Sparkles, Crown, Cpu, BookOpen, Briefcase, Smile, GraduationCap, Heart, Atom, Loader2, MoreVertical, Share2, Check } from "lucide-react";
import SecureBookReader from "./SecureBookReader";

interface StoreProps {
  currentUser: User | null;
  onLogIn: () => void;
  books: Book[];
  onUpdateBookRating: (id: string, newAvg: number, newReviewCount: number) => void;
  onPurchaseBook: (id: string) => void;
  purchasedBookIds: string[];
  onToggleWishlist: (id: string) => void;
  wishlistBookIds: string[];
  onAddNewDocument?: (doc: SavedDocument) => void;
  bookOrders?: BookOrder[];
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
  books,
  onUpdateBookRating,
  onPurchaseBook,
  purchasedBookIds,
  onToggleWishlist,
  wishlistBookIds,
  onAddNewDocument,
  bookOrders = []
}: StoreProps) {
  // Navigation
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [detailModalBook, setDetailModalBook] = useState<Book | null>(null);
  const [readingBook, setReadingBook] = useState<Book | null>(null);
  const [expandedBookIds, setExpandedBookIds] = useState<string[]>([]);
  const [quickViewBook, setQuickViewBook] = useState<Book | null>(null);

  // Search, Filters & Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [isSearchingDebounced, setIsSearchingDebounced] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Debounced search trigger for improved typing performance
  useEffect(() => {
    if (searchInput !== searchQuery) {
      setIsSearchingDebounced(true);
    }
    const handler = setTimeout(() => {
      setSearchQuery(searchInput);
      setIsSearchingDebounced(false);
    }, 320);

    return () => {
      clearTimeout(handler);
    };
  }, [searchInput]);
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

  // M-Pesa Integration Checkout flow states
  const [showMpesaModal, setShowMpesaModal] = useState(false);
  const [checkoutPhone, setCheckoutPhone] = useState("");
  const [stkStatus, setStkStatus] = useState<"idle" | "pushing" | "waiting" | "finalizing" | "success">("idle");
  const [checkoutError, setCheckoutError] = useState("");
  const [stkCountdown, setStkCountdown] = useState(12);

  // Core Premium Interactive states: Instant Preview, Multi-select, Context Menus, Bulk Actions
  const [instantPreviewBook, setInstantPreviewBook] = useState<Book | null>(null);
  const [previewPage, setPreviewPage] = useState<number>(1);
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [activeContextMenuBookId, setActiveContextMenuBookId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);

  const categories: string[] = ["All", "Fiction", "Leadership", "Technology", "Religion", "Business", "Self-Help", "Education", "Health", "Science"];

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

  // Submit Comment dialogue entry
  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onLogIn();
      return;
    }
    if (!commentText.trim() || !selectedBook) return;

    const newComment: Comment = {
      id: "com_" + Date.now(),
      targetId: selectedBook.id,
      userId: currentUser.email,
      userName: currentUser.name,
      text: commentText.trim(),
      date: new Date().toISOString().split("T")[0]
    };

    const nextComments = [...comments, newComment];
    setComments(nextComments);
    localStorage.setItem(`WAFULA_COMMENTS_${selectedBook.id}`, JSON.stringify(nextComments));
    setCommentText("");
  };

  // Trigger STK Push countdown simulations
  useEffect(() => {
    let timer: any;
    if (stkStatus === "pushing") {
      timer = setTimeout(() => {
        setStkStatus("waiting");
      }, 3000);
    } else if (stkStatus === "waiting") {
      timer = setTimeout(() => {
        setStkStatus("finalizing");
      }, 3500);
    } else if (stkStatus === "finalizing") {
      timer = setTimeout(() => {
        setStkStatus("success");
        if (selectedBook) {
          onPurchaseBook(selectedBook.id);
        }
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [stkStatus, selectedBook]);

  // Nested comment replies
  const handleReplySubmit = (parentId: string) => {
    if (!currentUser) {
      onLogIn();
      return;
    }
    if (!replyText.trim() || !selectedBook) return;

    const newReply: Comment = {
      id: "com_rep_" + Date.now(),
      targetId: selectedBook.id,
      userId: currentUser.email,
      userName: currentUser.name,
      text: replyText.trim(),
      parentId,
      date: new Date().toISOString().split("T")[0]
    };

    const nextComments = [...comments, newReply];
    setComments(nextComments);
    localStorage.setItem(`WAFULA_COMMENTS_${selectedBook.id}`, JSON.stringify(nextComments));
    setReplyText("");
    setReplyTarget(null);
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
  const filteredBooks = books.filter((b) => {
    const matchesSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          b.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || b.category === selectedCategory;
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
            onClick={() => setSelectedBook(null)}
            className="flex items-center space-x-1.5 text-stone-500 hover:text-stone-900 text-xs font-semibold"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Store Listing</span>
          </button>

          <div className="grid gap-8 md:grid-cols-12 md:items-start">
            {/* Book Graphic cover and action bar buttons */}
            <div className="md:col-span-4 space-y-4">
              <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl border border-stone-200 shadow-lg relative bg-neutral-50 flex items-center justify-center">
                <img src={selectedBook.coverImage} className="w-full h-full object-contain" alt={selectedBook.title} />
                {selectedBook.isFeatured && (
                  <span className="absolute top-4 left-4 rounded-full bg-red-700 font-mono text-[10px] font-bold text-white px-3 py-1 uppercase tracking-wider">
                    Featured
                  </span>
                )}
              </div>

              <button
                onClick={() => onToggleWishlist(selectedBook.id)}
                className={`w-full flex items-center justify-center space-x-1.5 rounded-xl border py-2.5 text-xs font-bold transition duration-200 ${
                  wishlistBookIds.includes(selectedBook.id)
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-stone-200 bg-white text-stone-700 hover:bg-neutral-55"
                }`}
              >
                <Bookmark className="h-4 w-4" />
                <span>{wishlistBookIds.includes(selectedBook.id) ? "Bookmarked in Wishlist" : "Add to Whishlist"}</span>
              </button>

              {(() => {
                const currentUserEmail = currentUser?.email?.toLowerCase()?.trim();
                const activeOrder = currentUserEmail 
                  ? bookOrders.find(o => o.bookId === selectedBook.id && o.userId.toLowerCase().trim() === currentUserEmail)
                  : null;

                if (purchasedBookIds.includes(selectedBook.id)) {
                  return (
                    <div className="rounded-xl bg-green-50 p-4 border border-green-200 flex flex-col items-center justify-center text-center space-y-2">
                      <span className="text-xl">🎓</span>
                      <p className="text-xs font-bold text-green-800">You already own this book!</p>
                      <p className="text-[10px] text-green-600 leading-tight">Proceed to 'My Library' dashboard to access immediate PDFs and conversion systems.</p>
                      <button
                        onClick={() => setReadingBook(selectedBook)}
                        className="mt-2 w-full flex items-center justify-center space-x-1.5 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        <Eye className="h-4 w-4" />
                        <span>Read Full E-Book Online</span>
                      </button>
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
                <div className="space-y-4">
                  {comments.filter(c => !c.parentId).map((c) => {
                    const childReplies = comments.filter((rep) => rep.parentId === c.id);

                    return (
                      <div key={c.id} className="rounded-xl bg-[#fcfbf9] border border-stone-150 p-4 space-y-3">
                        <div className="flex justify-between">
                          <span className="font-bold text-stone-850">{c.userName}</span>
                          <span className="text-[9px] text-stone-400 font-mono">{c.date}</span>
                        </div>
                        <p className="text-stone-700 leading-relaxed font-sans">"{c.text}"</p>

                        {/* Nested replies */}
                        {childReplies.length > 0 && (
                          <div className="border-l-2 border-amber-500/40 pl-4 space-y-2.5 mt-2.5 pl-4 md:pl-6 bg-stone-50 py-2 rounded-r-lg">
                            {childReplies.map((rep) => (
                              <div key={rep.id} className="text-xs space-y-1">
                                <div className="flex justify-between items-center text-[10px] font-bold text-stone-400">
                                  <span>{rep.userName}</span>
                                  <span className="font-mono">{rep.date}</span>
                                </div>
                                <p className="text-stone-600 italic">"{rep.text}"</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reply Action */}
                        {replyTarget === c.id ? (
                          <div className="flex gap-2 pt-2 text-xs">
                            <input
                              type="text"
                              required
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Write a reply..."
                              className="flex-1 rounded border p-1"
                            />
                            <button
                              type="button"
                              onClick={() => handleReplySubmit(c.id)}
                              className="rounded bg-red-700 px-3 py-1 text-white text-[10px] font-bold"
                            >
                              Post
                            </button>
                            <button
                              type="button"
                              onClick={() => setReplyTarget(null)}
                              className="text-stone-400"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setReplyTarget(c.id)}
                            className="text-[10px] font-bold text-red-700 hover:underline block pt-1.5"
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
      ) : (
             /* STORE PAGE MAIN SHELF AND PRODUCT LISTINGS */
        <div className="space-y-6">
          {/* Main search and dynamic filter banner */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Query search text */}
              <div className="flex-1 relative">
                <Search className="absolute top-3 left-3 h-4 w-4 text-stone-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search premium books, local authors, categories..."
                  className="w-full rounded-xl border border-stone-200 bg-neutral-50 py-2.5 pl-10 pr-10 outline-none focus:bg-white focus:border-red-700"
                />
                {isSearchingDebounced && (
                  <div className="absolute right-3 top-3">
                    <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Compare Trigger button */}
                <button
                  type="button"
                  onClick={() => setShowCompareView(!showCompareView)}
                  className={`flex items-center justify-center space-x-1.5 rounded-xl border px-4 py-2.5 font-bold transition shrink-0 cursor-pointer ${
                    showCompareView 
                      ? "bg-orange-700 text-white border-orange-850 hover:bg-orange-800" 
                      : "border-stone-200 hover:bg-neutral-55 bg-white text-stone-700"
                  }`}
                  title="Compare two books side-by-side"
                >
                  <span className="text-sm">⚖️</span>
                  <span>Compare Books</span>
                </button>

                {/* Filters dropdown triggers */}
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center justify-center space-x-1.5 rounded-xl border px-4 py-2.5 font-bold transition shrink-0 cursor-pointer ${
                    showFilters 
                      ? "bg-red-700 text-white border-red-800 hover:bg-red-800" 
                      : "border-stone-200 hover:bg-neutral-55 bg-white text-stone-700"
                  }`}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  <span>Sort & Filters</span>
                </button>
              </div>
            </div>

            {/* Horizontal Category Filter Bar */}
            <div className="space-y-1.5">
              <span className="text-[9px] font-mono text-stone-400 font-bold uppercase tracking-wider block">Filter by Subject Genre</span>
              <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-thin scroll-smooth flex-nowrap w-full">
                {categories.map((cat) => {
                  const categoryIconMap: Record<string, React.ReactNode> = {
                    All: <Globe className="h-3.5 w-3.5" />,
                    Fiction: <Sparkles className="h-3.5 w-3.5 text-pink-500" />,
                    Leadership: <Crown className="h-3.5 w-3.5 text-amber-500" />,
                    Technology: <Cpu className="h-3.5 w-3.5 text-blue-500" />,
                    Religion: <BookOpen className="h-3.5 w-3.5 text-rose-500" />,
                    Business: <Briefcase className="h-3.5 w-3.5 text-indigo-500" />,
                    "Self-Help": <Smile className="h-3.5 w-3.5 text-emerald-500" />,
                    Education: <GraduationCap className="h-3.5 w-3.5 text-amber-600" />,
                    Health: <Heart className="h-3.5 w-3.5 text-red-500" />,
                    Science: <Atom className="h-3.5 w-3.5 text-cyan-500" />
                  };
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer select-none border flex items-center space-x-2 ${
                        selectedCategory === cat 
                          ? "bg-red-700 border-red-700 text-white shadow-md shadow-red-500/15 scale-105" 
                          : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
                      }`}
                    >
                      <span className={selectedCategory === cat ? "[&_svg]:text-white" : ""}>
                        {categoryIconMap[cat] || <BookOpen className="h-3.5 w-3.5" />}
                      </span>
                      <span>{cat === "All" ? "All Publications" : cat}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Side-by-Side Compare view container block */}
            {showCompareView && (
              <div className="bg-orange-50/40 border border-orange-200 p-5 rounded-2xl space-y-4 animate-fade-in text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-orange-100 pb-3 gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-orange-950 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                      <span>⚖️ Side-by-Side Book Comparison</span>
                    </h4>
                    <p className="text-[11px] text-stone-500 font-medium">Select any two publications from our library catalog to compare pages, file size, rating, and price side-by-side.</p>
                  </div>
                  <button
                    onClick={() => {
                      setCompareBookId1("");
                      setCompareBookId2("");
                    }}
                    className="text-[10px] text-orange-700 font-bold hover:underline self-start sm:self-center font-mono uppercase"
                  >
                    Reset selects
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Select Book 1 */}
                  <div className="flex flex-col space-y-1">
                    <span className="font-bold text-slate-600 font-mono uppercase text-[9px] tracking-wide">First Book:</span>
                    <select
                      value={compareBookId1}
                      onChange={(e) => setCompareBookId1(e.target.value)}
                      className="w-full rounded-xl border border-indigo-200 bg-white p-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer text-slate-800"
                    >
                      <option value="">-- Select Book One --</option>
                      {books.filter(b => b.status === 'active').map(b => (
                        <option key={b.id} value={b.id}>{b.title} (by {b.author})</option>
                      ))}
                    </select>
                  </div>

                  {/* Select Book 2 */}
                  <div className="flex flex-col space-y-1">
                    <span className="font-bold text-slate-600 font-mono uppercase text-[9px] tracking-wide font-semibold font-mono">Second Book:</span>
                    <select
                      value={compareBookId2}
                      onChange={(e) => setCompareBookId2(e.target.value)}
                      className="w-full rounded-xl border border-indigo-200 bg-white p-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer text-slate-800"
                    >
                      <option value="">-- Select Book Two --</option>
                      {books.filter(b => b.status === 'active').map(b => (
                        <option key={b.id} value={b.id}>{b.title} (by {b.author})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {compareBookId1 && compareBookId2 ? (
                  (() => {
                    const book1 = books.find(b => b.id === compareBookId1);
                    const book2 = books.find(b => b.id === compareBookId2);
                    if (!book1 || !book2) return null;

                    return (
                      <div className="overflow-x-auto border border-orange-100 rounded-2xl bg-white shadow-sm pt-1">
                        <table className="w-full text-left text-xs border-collapse font-sans">
                          <thead>
                            <tr className="bg-orange-50/30 text-[9.5px] uppercase font-mono tracking-widest text-orange-950 border-b border-orange-100">
                              <th className="py-3 px-4 font-black">Book Metric</th>
                              <th className="py-3 px-4 font-black text-orange-800">{book1.title}</th>
                              <th className="py-3 px-4 font-black text-orange-800 text-indigo-705">{book2.title}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100 text-slate-700">
                            <tr>
                              <td className="py-2.5 px-4 font-bold text-slate-500 font-mono uppercase text-[9px]">Cover</td>
                              <td className="py-2.5 px-4">
                                <img src={book1.coverImage} className="w-12 h-16 object-cover rounded-md border shadow-xs" alt={book1.title} />
                              </td>
                              <td className="py-2.5 px-4">
                                <img src={book2.coverImage} className="w-12 h-16 object-cover rounded-md border shadow-xs" alt={book2.title} />
                              </td>
                            </tr>
                            <tr>
                              <td className="py-2.5 px-4 font-bold text-slate-500 font-mono uppercase text-[9px]">Author</td>
                              <td className="py-2.5 px-4 font-sans text-slate-800 font-semibold">{book1.author}</td>
                              <td className="py-2.5 px-4 font-sans text-slate-800 font-semibold">{book2.author}</td>
                            </tr>
                            <tr>
                              <td className="py-2.5 px-4 font-bold text-slate-500 font-mono uppercase text-[9px]">Category</td>
                              <td className="py-2.5 px-4">
                                <span className="bg-orange-50 text-orange-850 px-2.5 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase">{book1.category}</span>
                              </td>
                              <td className="py-2.5 px-4">
                                <span className="bg-orange-50 text-orange-850 px-2.5 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase">{book2.category}</span>
                              </td>
                            </tr>
                            <tr>
                              <td className="py-2.5 px-4 font-bold text-slate-500 font-mono uppercase text-[9px]">Pages</td>
                              <td className="py-2.5 px-4 font-mono font-bold text-slate-800">{book1.pages || "N/A"} pp</td>
                              <td className="py-2.5 px-4 font-mono font-bold text-slate-800">{book2.pages || "N/A"} pp</td>
                            </tr>
                            <tr>
                              <td className="py-2.5 px-4 font-bold text-slate-500 font-mono uppercase text-[9px]">Reading Time</td>
                              <td className="py-2.5 px-4 font-mono font-bold text-emerald-600">⏱️ {getReadingDuration(book1.pages)} mins read</td>
                              <td className="py-2.5 px-4 font-mono font-bold text-emerald-600">⏱️ {getReadingDuration(book2.pages)} mins read</td>
                            </tr>
                            <tr>
                              <td className="py-2.5 px-4 font-bold text-slate-500 font-mono uppercase text-[9px]">File Size</td>
                              <td className="py-2.5 px-4 font-mono font-bold">{book1.fileSize}</td>
                              <td className="py-2.5 px-4 font-mono font-bold">{book2.fileSize}</td>
                            </tr>
                            <tr>
                              <td className="py-2.5 px-4 font-bold text-slate-500 font-mono uppercase text-[9px]">Rating</td>
                              <td className="py-2.5 px-4 font-bold">
                                <span className="inline-flex items-center text-amber-500 space-x-1 font-mono text-[11px]">
                                  <span>⭐ {book1.rating}</span>
                                  <span className="text-stone-400 font-normal">({book1.reviewsCount} reviews)</span>
                                </span>
                              </td>
                              <td className="py-2.5 px-4 font-bold">
                                <span className="inline-flex items-center text-amber-500 space-x-1 font-mono text-[11px]">
                                  <span>⭐ {book2.rating}</span>
                                  <span className="text-stone-400 font-normal">({book2.reviewsCount} reviews)</span>
                                </span>
                              </td>
                            </tr>
                            <tr className="bg-orange-50/20">
                              <td className="py-3 px-4 font-bold text-slate-600 font-mono uppercase text-[9px]">Price</td>
                              <td className="py-3 px-4 font-mono font-black text-red-700 text-xs">KES {book1.price.toLocaleString()}</td>
                              <td className="py-3 px-4 font-mono font-black text-red-700 text-xs">KES {book2.price.toLocaleString()}</td>
                            </tr>
                            <tr>
                              <td className="py-2.5 px-4 font-bold text-slate-500 font-mono uppercase text-[9px]">Action</td>
                              <td className="py-2.5 px-4">
                                <button
                                  type="button"
                                  onClick={() => setSelectedBook(book1)}
                                  className="bg-orange-700 hover:bg-orange-850 text-white font-bold py-1 px-3 rounded-xl text-[10px] transition uppercase cursor-pointer"
                                >
                                  Inspect Book
                                </button>
                              </td>
                              <td className="py-2.5 px-4">
                                <button
                                  type="button"
                                  onClick={() => setSelectedBook(book2)}
                                  className="bg-orange-700 hover:bg-orange-850 text-white font-bold py-1 px-3 rounded-xl text-[10px] transition uppercase cursor-pointer"
                                >
                                  Inspect Book
                                </button>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-center py-4 text-[11px] text-indigo-700 bg-white rounded-xl border border-dashed border-indigo-200 font-mono font-medium">
                    Please select two publications above from the dropdown search menus to view side-by-side metrics.
                  </div>
                )}
              </div>
            )}

            {/* Advanced Filters Drawer options */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4 border-t border-stone-100 uppercase tracking-wider font-mono text-[10px] font-bold text-stone-500">
                {/* Price bounds slider config */}
                <div className="space-y-2">
                  <span className="block mb-1 text-stone-400">Max Price (KES)</span>
                  <div className="flex justify-between font-mono text-neutral-800">
                    <span>KES 100</span>
                    <span className="text-red-700 font-bold">KES {maxPrice}</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="2000"
                    step="50"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                    className="w-full accent-red-700 cursor-pointer"
                  />
                </div>

                {/* File size slider config */}
                <div className="space-y-2">
                  <span className="block mb-1 text-stone-400">Max File Size (MB)</span>
                  <div className="flex justify-between font-mono text-neutral-800">
                    <span>Under 1 MB</span>
                    <span className="text-red-700 font-bold">{maxFileSize === 10 ? "Any Size" : `${maxFileSize} MB`}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.5"
                    value={maxFileSize}
                    onChange={(e) => setMaxFileSize(parseFloat(e.target.value))}
                    className="w-full accent-red-700 cursor-pointer"
                  />
                </div>

                {/* Reading Duration slider config */}
                <div className="space-y-2">
                  <span className="block mb-1 text-stone-400">Max Duration (Mins)</span>
                  <div className="flex justify-between font-mono text-neutral-800">
                    <span>Quick Reads</span>
                    <span className="text-red-700 font-bold">{maxDuration === 600 ? "Any Duration" : `${maxDuration} mins`}</span>
                  </div>
                  <input
                    type="range"
                    min="60"
                    max="600"
                    step="30"
                    value={maxDuration}
                    onChange={(e) => setMaxDuration(parseInt(e.target.value))}
                    className="w-full accent-red-700 cursor-pointer"
                  />
                </div>

                {/* Sorters selection */}
                <div className="space-y-2">
                  <span className="block mb-1 text-stone-400">Sort listings by</span>
                  <div className="grid grid-cols-2 gap-1.5 text-neutral-800 text-[11px] font-bold font-sans">
                    <button
                      type="button"
                      onClick={() => setSortBy("rating")}
                      className={`rounded p-2 border transition cursor-pointer ${sortBy === "rating" ? "border-stone-900 bg-stone-900 text-white font-bold" : "border-stone-200 bg-white"}`}
                    >
                      Top Rated
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortBy("date")}
                      className={`rounded p-2 border transition cursor-pointer ${sortBy === "date" ? "border-stone-900 bg-stone-900 text-white font-bold" : "border-stone-200 bg-white"}`}
                    >
                      Published Date
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortBy("alphabet")}
                      className={`rounded p-2 border transition cursor-pointer ${sortBy === "alphabet" ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-white text-stone-800 font-bold"}`}
                    >
                      Alphabetical
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortBy("price")}
                      className={`rounded p-2 border transition cursor-pointer ${sortBy === "price" ? "border-stone-900 bg-stone-900 text-white font-bold" : "border-stone-200 bg-white text-stone-800 font-bold"}`}
                    >
                      Cheapest
                    </button>
                  </div>
                </div>

                {/* Helper recap metrics */}
                <div className="flex flex-col justify-end space-y-1 col-span-1 md:col-span-4 mt-2 border-t pt-3">
                  <p className="text-stone-400 font-mono text-[9px]">Filtering Results: <strong className="text-stone-850 font-bold">{sortedBooks.length} titles</strong></p>
                  <p className="text-[11px] leading-relaxed text-stone-500 font-sans tracking-normal font-medium normal-case">
                    All premium book items are backed globally. Includes secure digital DRM locks for your protection.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Book Card Shelf grid */}
          <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
            {sortedBooks.map((b) => (
              <div
                key={b.id}
                id={b.id === "b1" ? "book_card_book_1" : `book_card_${b.id}`}
                onClick={() => setDetailModalBook(b)}
                className={`group bookstore-item-card relative flex flex-col justify-between rounded-2xl border bg-white p-2.5 sm:p-3 md:p-4.5 cursor-pointer text-left transition-all duration-300 ${
                  selectedBookIds.includes(b.id)
                    ? "border-amber-500 ring-2 ring-amber-500 ring-offset-1 bg-amber-50/10 shadow-lg shadow-amber-500/10"
                    : b.id === "b1"
                    ? "border-stone-200"
                    : "border-stone-200 shadow-xs"
                }`}
                data-tooltip-price={`KES ${b.price.toLocaleString()}`}
                data-tooltip-rating={`${b.rating} ★ (${b.reviewsCount})`}
                data-tooltip-size={b.fileSize}
              >
                <div>
                  <div className="aspect-[3/4] w-full h-44 sm:h-56 md:h-72 max-h-[195px] sm:max-h-[240px] md:max-h-none overflow-hidden rounded-xl border border-stone-150 relative mb-2 md:mb-4 bg-neutral-50 flex items-center justify-center">
                    <img 
                      src={b.coverImage} 
                      className={`w-full h-full object-contain transition duration-300 ${
                        b.id === "b1"
                          ? "grayscale group-hover:grayscale-0 group-hover:scale-103"
                          : "group-hover:scale-103"
                      }`} 
                      alt={b.title} 
                    />
                    
                    {b.isFeatured && (
                      <span className="absolute top-11 left-2.5 rounded-full bg-red-700 font-mono text-[8px] sm:text-[9px] font-bold text-white px-2 py-0.5 uppercase tracking-wider">
                        Featured
                      </span>
                    )}

                    {/* Interactive Selection Checkbox (glowing border action) */}
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBookIds(prev => 
                          prev.includes(b.id) ? prev.filter(id => id !== b.id) : [...prev, b.id]
                        );
                      }}
                      className={`absolute top-2 left-2 z-20 h-6 w-6 sm:h-7 sm:w-7 rounded-full flex items-center justify-center border transition-all duration-300 cursor-pointer ${
                        selectedBookIds.includes(b.id)
                          ? "bg-amber-500 border-amber-600 text-stone-950 scale-110 shadow-md shadow-amber-500/35"
                          : "bg-white/80 dark:bg-stone-900/80 border-stone-200 hover:bg-white text-stone-400"
                      }`}
                      title={selectedBookIds.includes(b.id) ? "Deselect Book" : "Select Book"}
                    >
                      {selectedBookIds.includes(b.id) ? (
                        <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 stroke-[3.5]" />
                      ) : (
                        <div className="h-1.5 w-1.5 rounded-full border border-stone-300" />
                      )}
                    </div>

                    {/* Context Menu Dropdown Trigger (ellipsis) */}
                    <div className="absolute top-2 right-2 z-20">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveContextMenuBookId(prev => prev === b.id ? null : b.id);
                        }}
                        className={`h-6 w-6 sm:h-7 sm:w-7 flex items-center justify-center rounded-full bg-white dark:bg-stone-900 text-stone-600 hover:text-stone-950 shadow-md border border-stone-200/50 hover:bg-stone-50 transition cursor-pointer ${
                          activeContextMenuBookId === b.id ? "bg-stone-100 border-amber-400" : ""
                        }`}
                        title="Context Menu"
                      >
                        <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </button>

                      {/* Context Menu Dropdown */}
                      {activeContextMenuBookId === b.id && (
                        <div className="absolute right-0 mt-1.5 w-44 rounded-xl bg-white dark:bg-stone-950 border border-stone-200 shadow-xl py-1.5 z-30 animate-in fade-in slide-in-from-top-1 duration-150">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveContextMenuBookId(null);
                              navigator.clipboard.writeText(`Check out "${b.title}" by ${b.author} in Wafula's Academic Bookstore!`);
                              triggerToast(`📋 Share link for "${b.title}" copied!`);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-stone-750 hover:bg-stone-100 hover:text-stone-950 dark:text-stone-300 dark:hover:bg-stone-900 flex items-center gap-2 cursor-pointer transition"
                          >
                            <Share2 className="h-3.5 w-3.5 text-stone-450" />
                            <span>Share Book</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveContextMenuBookId(null);
                              onToggleWishlist(b.id);
                              const isFav = wishlistBookIds.includes(b.id);
                              triggerToast(isFav ? `📚 Removed "${b.title}" from reading list.` : `📚 Added "${b.title}" to reading list!`);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-stone-750 hover:bg-stone-100 hover:text-stone-950 dark:text-stone-300 dark:hover:bg-stone-900 flex items-center gap-2 cursor-pointer transition"
                          >
                            <Heart className="h-3.5 w-3.5 text-red-500 fill-current" />
                            <span>{wishlistBookIds.includes(b.id) ? "In Reading List" : "Add to Reading List"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveContextMenuBookId(null);
                              setSelectedBook(b);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-stone-750 hover:bg-stone-100 hover:text-stone-950 dark:text-stone-300 dark:hover:bg-stone-900 flex items-center gap-2 cursor-pointer transition"
                          >
                            <Eye className="h-3.5 w-3.5 text-blue-500" />
                            <span>View Details</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Interactive Hover Overlay with prominently displayed Author, Rating, dimmed BG, and Instant Preview */}
                    <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-[1px] flex flex-col items-center justify-center text-center opacity-0 group-hover:opacity-100 transition duration-300 p-2 sm:p-4 z-10 select-none">
                      <p className="text-[8px] sm:text-[9px] uppercase font-mono font-black text-amber-500 tracking-wider mb-1">
                        {b.category}
                      </p>
                      <h4 className="text-white font-extrabold text-[10px] sm:text-[12px] line-clamp-2 px-1 sm:px-2 mb-1 drop-shadow-sm font-display tracking-tight leading-normal">
                        {b.title}
                      </h4>
                      <p className="text-stone-300 text-[9px] sm:text-[10.5px] italic font-semibold mb-2">
                        By {b.author}
                      </p>
                      
                      {/* Prominent Rating Rating Badge */}
                      <div className="flex items-center gap-1 mb-2 sm:mb-4 select-none">
                        <div className="flex text-amber-400">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={`h-2.5 w-2.5 sm:h-3 sm:w-3 ${i < Math.floor(b.rating) ? "fill-amber-400" : "text-stone-700"}`} 
                            />
                          ))}
                        </div>
                        <span className="text-white text-[9px] sm:text-[10px] font-bold font-mono">
                          {b.rating.toFixed(1)}
                        </span>
                      </div>

                      {/* Instant Preview Buttons & Details */}
                      <div className="flex flex-col gap-1 w-full max-w-[130px]">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInstantPreviewBook(b);
                            setPreviewPage(1);
                          }}
                          className="bg-amber-500 hover:bg-amber-600 text-stone-950 font-black px-2 py-1 rounded-md text-[8px] sm:text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 shadow hover:scale-104 active:scale-96 transition cursor-pointer"
                        >
                          <BookOpen className="h-2.5 font-bold w-2.5 stroke-[2.5]" />
                          <span>Preview</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBook(b);
                          }}
                          className="bg-white/10 hover:bg-white/20 text-white border border-white/15 font-bold px-2 py-1 rounded-md text-[8px] sm:text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 hover:scale-104 active:scale-96 transition cursor-pointer"
                        >
                          <Eye className="h-2.5 w-2.5" />
                          <span>Details</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <span className="font-mono text-[8px] sm:text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-0.5 transition-all duration-300 transform translate-x-[-3px] group-hover:translate-x-0">
                    {b.category}
                  </span>

                  <h3 
                    className={`font-display text-[10.5px] sm:text-xs md:text-sm leading-snug max-h-12 overflow-hidden truncate transition-all duration-300 transform group-hover:translate-x-0.5 ${
                      b.id === "b1"
                        ? "tracking-tight"
                        : "font-bold text-neutral-900"
                    }`}
                    style={b.id === "b1" ? { fontWeight: 900 } : undefined}
                  >
                    {b.title}
                  </h3>

                  <p className="text-[9px] sm:text-[10px] md:text-[11px] text-stone-500 mt-0.5 truncate transition-all duration-500 transform translate-y-1 group-hover:translate-y-0 opacity-75 group-hover:opacity-100">By {b.author}</p>

                  {/* Show More/Less full description toggle (desktop only to maintain compact cards on phones) */}
                  <div className="hidden md:block mt-2 text-left">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedBookIds(prev => 
                          prev.includes(b.id) ? prev.filter(item => item !== b.id) : [...prev, b.id]
                        );
                      }}
                      className="text-[10px] font-bold text-stone-500 hover:text-red-700 dark:text-stone-400 dark:hover:text-amber-500 uppercase tracking-widest flex items-center space-x-1 cursor-pointer"
                    >
                      <span>{expandedBookIds.includes(b.id) ? "Show Less" : "Show More"}</span>
                    </button>
                    {expandedBookIds.includes(b.id) && b.description && (
                      <div className="mt-1.5 py-2 px-2.5 bg-stone-50/90 dark:bg-stone-900/80 rounded-xl border border-stone-150/70 dark:border-stone-850 text-[10.5px] text-stone-600 dark:text-stone-450 leading-normal font-sans tracking-tight animate-in fade-in slide-in-from-top-1 duration-150">
                        {b.description}
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-stone-100 pt-2 sm:pt-3 mt-2 sm:mt-4 flex flex-col space-y-2 sm:space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="font-mono text-[9.5px] sm:text-[11px] md:text-xs font-bold text-red-700">KES {b.price.toLocaleString()}</span>
                      
                      {/* Live Star metric listed directly on listing! */}
                      <div className="flex items-center space-x-1 mt-0.5 text-[8.5px] sm:text-[9px] md:text-[10px] font-bold text-neutral-700 font-mono">
                        <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3.5 fill-amber-500 text-amber-500 shrink-0" />
                        <span>{b.rating}</span>
                        <span className="text-stone-300 font-normal">({b.reviewsCount})</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-[8px] sm:text-[8.5px] md:text-[9.5px] text-stone-400 block">{b.fileSize} • PDF</span>
                      <span className="font-mono text-[8px] sm:text-[8.5px] md:text-[9px] text-emerald-600 font-bold block mt-0.5">⏱️ {getReadingDuration(b.pages)}m read</span>
                    </div>
                  </div>

                  {/* Reading progress indicator */}
                  {(() => {
                    const progressVal = getBookProgress(b.id, b.pages);
                    return (
                      <div className="flex flex-col space-y-0.5 sm:space-y-1 pt-1 sm:pt-1.5 border-t border-dashed border-stone-100">
                        <div className="flex justify-between items-center text-[8px] sm:text-[9px] md:text-[10px] font-semibold text-stone-550 font-sans">
                          <span className="text-stone-550">Progress</span>
                          <span className={progressVal > 0 ? "text-emerald-600 font-bold" : "text-stone-400"}>
                            {progressVal}% read
                          </span>
                        </div>
                        <div className="w-full bg-stone-100 h-1 sm:h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${progressVal || 0}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* 🪟 BOOKSTORE QUICK VIEW MODAL */}
      {quickViewBook && (
        <div id="bookstore_quick_view_modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-md animate-fade-in select-none">
          <div className="relative w-full max-w-lg bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-850 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-left flex flex-col md:flex-row">
            
            {/* Visual Thumbnail */}
            <div className="w-full md:w-2/5 bg-stone-50 dark:bg-stone-900 p-6 flex items-center justify-center border-b md:border-b-0 md:border-r border-stone-150 dark:border-stone-850 relative">
              <img 
                src={quickViewBook.coverImage} 
                alt={quickViewBook.title} 
                className="w-full max-h-[220px] object-contain rounded-lg drop-shadow-lg" 
              />
              {quickViewBook.isFeatured && (
                <span className="absolute top-3 left-3 rounded-full bg-red-700 font-mono text-[9px] font-bold text-white px-2 py-0.5 uppercase tracking-wider">
                  Featured
                </span>
              )}
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
              {/* Left Column: Image cover, price, wishlist button */}
              <div className="md:col-span-5 flex flex-col items-center">
                <div className="aspect-[3/4] w-full max-w-[200px] overflow-hidden rounded-2xl border border-stone-200 relative mb-4 bg-neutral-50 shadow-md">
                  <img src={detailModalBook.coverImage} className="w-full h-full object-contain" alt={detailModalBook.title} />
                  {detailModalBook.isFeatured && (
                    <span className="absolute top-3 left-3 rounded-full bg-red-700 font-mono text-[9px] font-bold text-white px-2 py-0.5 uppercase tracking-wider shadow">
                      Featured
                    </span>
                  )}
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

      {/* 6. M-PESA CHECKOUT PORTAL DIAGRAM MODAL */}
      {showMpesaModal && selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md" onClick={() => { if (stkStatus === "idle" || stkStatus === "success") setShowMpesaModal(false); }} />
          
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-100 p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-250 select-none text-xs text-left">
            
            {/* Mpesa Branded Badge */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-4">
              <div className="flex items-center space-x-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-600 text-white font-black text-sm tracking-tighter">
                  M
                </span>
                <div>
                  <h3 className="font-display font-black text-stone-900 text-sm">Lipa Na M-Pesa checkout</h3>
                  <p className="text-[10px] text-green-600 font-mono font-bold uppercase tracking-wider">SECURE INSTANT PAYBILL</p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => setShowMpesaModal(false)}
                disabled={stkStatus !== "idle" && stkStatus !== "success"}
                className="text-stone-400 hover:text-stone-600 font-bold p-1 text-sm disabled:opacity-30"
              >
                ✕
              </button>
            </div>

            {/* Mpesa payload details card */}
            <div className="bg-stone-55 rounded-2xl border border-stone-150 p-4 space-y-2.5 bg-stone-50">
              <div className="flex justify-between items-center">
                <span className="text-stone-400 uppercase font-bold text-[9px] tracking-wider">E-Book Release</span>
                <span className="bg-stone-200 text-stone-700 font-bold px-2 py-0.5 rounded font-mono text-[9px]">{selectedBook.fileSize} PDF</span>
              </div>
              <h4 className="font-display font-extrabold text-stone-900 text-xs truncate leading-snug">{selectedBook.title}</h4>
              
              <div className="border-t border-stone-200/50 pt-2 flex justify-between items-center text-xs">
                <span className="text-stone-500 font-medium">Billed Amount:</span>
                <span className="text-red-750 font-mono font-black text-sm text-red-700">KES {selectedBook.price.toLocaleString()}</span>
              </div>
            </div>

            {/* Paybill reference details */}
            <div className="my-4 bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl text-xs space-y-2">
              <span className="text-[9px] font-bold text-emerald-800 uppercase block tracking-wider">Manual Payment Reference:</span>
              <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
                If the automated SIM checkout pop-up does not trigger on your Safaricom line automatically, please enter coordinates manually:
              </p>
              
              <div className="grid grid-cols-2 gap-2 font-mono text-xs pt-1">
                <div className="bg-white p-2 rounded-lg border border-emerald-250 text-center">
                  <span className="text-[9px] text-[#34d399] uppercase block font-bold font-sans">M-Pesa Paybill</span>
                  <strong className="text-stone-900 font-black tracking-normal text-xs block mt-0.5 text-center">247247</strong>
                </div>

                <div className="bg-white p-2 rounded-lg border border-emerald-250 text-center">
                  <span className="text-[9px] text-[#34d399] uppercase block font-bold font-sans">Account Reference</span>
                  <strong className="text-stone-900 font-black tracking-normal text-[10px] block mt-0.5 text-center leading-none">7770185693193</strong>
                </div>
              </div>

              <div className="text-[10px] text-emerald-600 font-medium text-center italic pt-1">
                Account holder: <strong className="font-bold">Kelvin Wafula</strong>
              </div>
            </div>

            {stkStatus === "idle" && (
              <form onSubmit={(e) => { e.preventDefault(); if (checkoutPhone.length >= 10) setStkStatus("pushing"); else setCheckoutError("Valid Phone is required!"); }} className="space-y-4">
                {checkoutError && (
                  <div className="bg-rose-50 text-rose-800 p-2.5 rounded-lg font-bold text-[10px] leading-tight text-left">
                    ⚠️ {checkoutError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-stone-500 font-bold uppercase tracking-wide">Safaricom Mobile Number</label>
                  <input
                    type="text"
                    required
                    maxLength={13}
                    value={checkoutPhone}
                    onChange={(e) => setCheckoutPhone(e.target.value.replace(/[^0-9+]/g, ""))}
                    placeholder="e.g. 0712345678 or +254712345678"
                    className="w-full rounded-lg border border-stone-200 bg-stone-50 p-2.5 font-bold text-stone-800 outline-none text-xs focus:bg-white focus:border-green-600 font-mono tracking-wider"
                  />
                  <p className="text-[9px] text-stone-400 font-mono leading-none">Requires active M-Pesa subscription in East Africa or globally.</p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMpesaModal(false)}
                    className="flex-1 rounded-xl border border-stone-200 font-bold py-2.5 hover:bg-stone-50 text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 text-white font-extrabold py-2.5 text-center shadow-md shadow-green-600/10"
                  >
                    Send STK Push
                  </button>
                </div>
              </form>
            )}

            {/* Processing state diagrams */}
            {stkStatus !== "idle" && (
              <div className="py-6 space-y-4 text-center">
                
                {/* Visual stage ticker animation */}
                <div className="flex items-center justify-center space-x-1 py-2">
                  <span className={`h-2.5 w-2.5 rounded-full transition-all ${
                    stkStatus === "pushing" ? "bg-green-600 scale-125 animate-ping" : "bg-green-400"
                  }`} />
                  <span className={`h-2.5 w-2.5 rounded-full transition-all ${
                    stkStatus === "waiting" ? "bg-green-600 scale-125 animate-ping" : stkStatus === "pushing" ? "bg-stone-200" : "bg-green-400"
                  }`} />
                  <span className={`h-2.5 w-2.5 rounded-full transition-all relative ${
                    stkStatus === "finalizing" ? "bg-green-600 scale-125 animate-ping" : (stkStatus === "success") ? "bg-green-400" : "bg-stone-200"
                  }`} />
                </div>

                <div className="space-y-1">
                  <h4 className="font-display font-extrabold text-stone-900 text-sm">
                    {stkStatus === "pushing" && "Stage 1/3: Triggering PIN Prompt"}
                    {stkStatus === "waiting" && "Stage 2/3: Waiting for PIN details"}
                    {stkStatus === "finalizing" && "Stage 3/3: Verifying ledger entries"}
                    {stkStatus === "success" && "Transaction Confirmed! 🎉"}
                  </h4>
                  <p className="text-[11px] text-stone-500 max-w-xs mx-auto leading-normal">
                    {stkStatus === "pushing" && `Sending automated paybill prompt to Safaricom endpoint for ${checkoutPhone}...`}
                    {stkStatus === "waiting" && "Please check your mobile screen for a secure prompt requesting your M-Pesa PIN password..."}
                    {stkStatus === "finalizing" && "Validating transaction with Paybill 247247 servers in Bungoma base nodes..."}
                    {stkStatus === "success" && "Successfully purchased! Your ebook is unlocked permanently. Go to My Library dashboard."}
                  </p>
                </div>

                {stkStatus === "success" && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMpesaModal(false);
                      setStkStatus("idle");
                    }}
                    className="w-full rounded-xl bg-stone-900 text-white font-extrabold py-2.5 hover:bg-stone-955 transition shadow-md"
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
          isAdmin={currentUser?.role === "admin"}
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

      {/* Floating Bulk Action Bar */}
      {selectedBookIds.length > 0 && (
        <div id="bookstore_bulk_actions_bar" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4 animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-slate-950 text-white rounded-2xl border border-stone-800 shadow-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-left">
              <span className="h-8 w-8 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center font-bold font-mono text-xs shadow-md">
                {selectedBookIds.length}
              </span>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">Books Selected</h4>
                <p className="text-[10px] text-stone-400 font-medium">Batch actions on selected books</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={isBulkDownloading}
                onClick={() => {
                  setIsBulkDownloading(true);
                  setBulkProgress(10);
                  const interval = setInterval(() => {
                    setBulkProgress(prev => {
                      if (prev >= 100) {
                        clearInterval(interval);
                        setIsBulkDownloading(false);
                        triggerToast(`📦 Fully packaged & compiled ${selectedBookIds.length} eBooks to Academic ZIP Archive!`);
                        setSelectedBookIds([]);
                        return 0;
                      }
                      return prev + 15;
                    });
                  }, 250);
                }}
                className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-stone-950 font-black px-3.5 py-2 rounded-xl text-[10.5px] uppercase tracking-wider flex items-center gap-1.5 shadow transition cursor-pointer disabled:bg-stone-850 disabled:text-stone-500"
              >
                {isBulkDownloading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-stone-950" />
                    <span>Processing {bulkProgress}%...</span>
                  </>
                ) : (
                  <>
                    <span>Download ZIP</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  selectedBookIds.forEach(id => {
                    if (!wishlistBookIds.includes(id)) {
                      onToggleWishlist(id);
                    }
                  });
                  triggerToast(`📚 Added ${selectedBookIds.length} select volumes directly to your Library Reading List!`);
                  setSelectedBookIds([]);
                }}
                className="bg-stone-900 border border-stone-800 hover:bg-stone-850 active:scale-95 text-white font-bold px-3 py-2 rounded-xl text-[10.5px] uppercase tracking-wider transition cursor-pointer"
              >
                Add To Library
              </button>

              <button
                type="button"
                onClick={() => setSelectedBookIds([])}
                className="text-[10.5px] font-bold text-stone-400 hover:text-white px-2 cursor-pointer transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
                    <div className="aspect-[3/4.5] w-12 sm:w-16 md:w-28 shrink-0 rounded-lg border shadow-md overflow-hidden bg-white">
                      <img src={instantPreviewBook.coverImage} className="w-full h-full object-cover" alt="" />
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
