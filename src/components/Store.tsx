import React, { useState, useEffect } from "react";
import { Book, Review, Comment, User, BookCategory } from "../types";
import { Search, SlidersHorizontal, Star, Calendar, DollarSign, MessageSquare, ArrowLeft, Bookmark, ShoppingBag, FolderKey, Plus, Eye } from "lucide-react";
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
}

export default function Store({
  currentUser,
  onLogIn,
  books,
  onUpdateBookRating,
  onPurchaseBook,
  purchasedBookIds,
  onToggleWishlist,
  wishlistBookIds
}: StoreProps) {
  // Navigation
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [readingBook, setReadingBook] = useState<Book | null>(null);

  // Search, Filters & Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [maxPrice, setMaxPrice] = useState<number>(2000);
  const [minPrice, setMinPrice] = useState<number>(0);
  const [sortBy, setSortBy] = useState<"rating" | "date" | "alphabet" | "price">("rating");
  const [showFilters, setShowFilters] = useState(false);

  // Detail Review / Comments States
  const [reviews, setReviews] = useState<Review[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);

  // Form states inside details popup
  const [userRating, setUserRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [commentText, setCommentText] = useState("");
  const [replyTarget, setReplyTarget] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  // M-Pesa Integration Checkout flow states
  const [showMpesaModal, setShowMpesaModal] = useState(false);
  const [checkoutPhone, setCheckoutPhone] = useState("");
  const [stkStatus, setStkStatus] = useState<"idle" | "pushing" | "waiting" | "finalizing" | "success">("idle");
  const [checkoutError, setCheckoutError] = useState("");
  const [stkCountdown, setStkCountdown] = useState(12);

  const categories: string[] = ["All", "Religion", "Business", "Technology", "Fiction", "Self-Help", "Education", "Health", "Science"];

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

  // Advanced filtration and computation models of books
  const filteredBooks = books.filter((b) => {
    const matchesSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          b.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || b.category === selectedCategory;
    const matchesPrice = b.price >= minPrice && b.price <= maxPrice;
    return matchesSearch && matchesCategory && matchesPrice && b.status === "active";
  });

  // Advanced Sorting
  const sortedBooks = [...filteredBooks].sort((x, y) => {
    if (sortBy === "rating") return y.rating - x.rating; // author popularity
    if (sortBy === "date") return y.publishedDate.localeCompare(x.publishedDate);
    if (sortBy === "alphabet") return x.title.localeCompare(y.title);
    if (sortBy === "price") return x.price - y.price;
    return 0;
  });

  return (
    <div id="store_viewport" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      
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
              <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl border border-stone-200 shadow-lg relative">
                <img src={selectedBook.coverImage} className="w-full h-full object-cover" alt={selectedBook.title} />
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

              {purchasedBookIds.includes(selectedBook.id) ? (
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
              ) : (
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
              )}
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

                {/* Star review submission */}
                <form onSubmit={handleSubmitReview} className="rounded-xl border border-stone-150 p-4 bg-stone-50/65 space-y-4">
                  <h5 className="font-bold text-stone-850">Leave a Star Rating & Short Review</h5>

                  {/* Rating Selector */}
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((starNum) => (
                      <button
                        key={starNum}
                        type="button"
                        onClick={() => setUserRating(starNum)}
                        className="text-amber-500 hover:scale-110 transition shrink-0"
                      >
                        <Star className={`h-6 w-6 ${starNum <= userRating ? "fill-amber-500 text-amber-500" : "text-stone-200"}`} />
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    required
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Provide details about your reading experience..."
                    className="w-full rounded-lg border border-stone-200 bg-white p-2.5 text-xs outline-none focus:border-red-700"
                  />

                  <button type="submit" className="rounded-lg bg-red-700 text-white font-bold px-4 py-2 hover:bg-red-800 text-xs shadow-xs">
                    Submit Star Review
                  </button>
                </form>

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
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search premium books, local authors, categories..."
                  className="w-full rounded-xl border border-stone-200 bg-neutral-50 py-2.5 pl-10 pr-4 outline-none focus:bg-white focus:border-red-700"
                />
              </div>

              {/* Filters dropdown triggers */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center justify-center space-x-1.5 rounded-xl border border-stone-200 px-4 py-2.5 font-bold hover:bg-neutral-50 transition shrink-0"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Sort & Filters</span>
              </button>
            </div>

            {/* Sub-category scrolling bar */}
            <div className="flex space-x-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors select-none ${
                    selectedCategory === cat 
                      ? "bg-red-700 text-white shadow-xs" 
                      : "bg-neutral-100 hover:bg-neutral-200 text-stone-700"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Advanced Filters Drawer options */}
            {showFilters && (
              <div className="grid md:grid-cols-3 gap-6 pt-4 border-t border-stone-100 uppercase tracking-wider font-mono text-[10px] font-bold text-stone-500">
                {/* Price bounds slider config */}
                <div className="space-y-2">
                  <span className="block mb-1">Max Price Range (KES)</span>
                  <div className="flex justify-between font-mono text-neutral-800">
                    <span>KES {minPrice}</span>
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

                {/* Sorters selection */}
                <div className="space-y-2">
                  <span className="block mb-1">Sort listings by</span>
                  <div className="grid grid-cols-2 gap-1.5 text-neutral-800 text-[11px] font-bold font-sans">
                    <button
                      onClick={() => setSortBy("rating")}
                      className={`rounded p-2 border transition ${sortBy === "rating" ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-white"}`}
                    >
                      Top Rated
                    </button>
                    <button
                      onClick={() => setSortBy("date")}
                      className={`rounded p-2 border transition ${sortBy === "date" ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-white"}`}
                    >
                      Published Date
                    </button>
                    <button
                      onClick={() => setSortBy("alphabet")}
                      className={`rounded p-2 border transition ${sortBy === "alphabet" ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-white"}`}
                    >
                      Alphabetical
                    </button>
                    <button
                      onClick={() => setSortBy("price")}
                      className={`rounded p-2 border transition ${sortBy === "price" ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-white"}`}
                    >
                      Cheapest
                    </button>
                  </div>
                </div>

                {/* Helper recap metrics */}
                <div className="flex flex-col justify-end space-y-1">
                  <p className="text-stone-400">Filtering Results: <strong className="text-stone-850 font-bold">{sortedBooks.length} titles</strong></p>
                  <p className="text-[11px] leading-relaxed text-stone-500 font-sans tracking-normal font-medium capitalize">
                    All prices are converted to KES. Supports safe M-PESA checkouts online or complete offline downloads.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Book Card Shelf grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {sortedBooks.map((b) => (
              <div
                key={b.id}
                id={`book_card_${b.id}`}
                onClick={() => setSelectedBook(b)}
                className="group relative flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-4.5 cursor-pointer shadow-xs hover:shadow-md transition text-left"
              >
                <div>
                  <div className="aspect-[3/4] w-full overflow-hidden rounded-xl border border-stone-150 relative mb-4">
                    <img src={b.coverImage} className="w-full h-full object-cover transition duration-300 group-hover:scale-103" alt={b.title} />
                    {b.isFeatured && (
                      <span className="absolute top-2.5 left-2.5 rounded-full bg-red-700 font-mono text-[9px] font-bold text-white px-2.5 py-0.5 uppercase tracking-wider">
                        Featured
                      </span>
                    )}

                    {/* Book quick details overlay on hover */}
                    <div className="absolute inset-0 bg-stone-900/60 flex items-center justify-center text-center opacity-0 group-hover:opacity-100 transition p-4">
                      <span className="rounded bg-white text-stone-900 font-bold px-3 py-1.5 text-xs shadow-md">
                        Read Blueprint
                      </span>
                    </div>
                  </div>

                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                    {b.category}
                  </span>

                  <h3 className="font-display font-bold text-neutral-900 text-sm leading-snug max-h-12 overflow-hidden truncate">
                    {b.title}
                  </h3>

                  <p className="text-[11px] text-stone-500 mt-1 truncate">By {b.author}</p>
                </div>

                <div className="border-t border-stone-100 pt-3 mt-4 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-mono text-xs font-bold text-red-700">KES {b.price.toLocaleString()}</span>
                    
                    {/* Live Star metric listed directly on listing! */}
                    <div className="flex items-center space-x-1 mt-1 text-[10px] font-bold text-neutral-700 font-mono">
                      <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500 shrink-0" />
                      <span>{b.rating}</span>
                      <span className="text-stone-300 font-normal">({b.reviewsCount})</span>
                    </div>
                  </div>

                  <span className="font-mono text-[10px] text-stone-400 shrink-0">{b.fileSize} • PDF</span>
                </div>
              </div>
            ))}
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
        />
      )}

    </div>
  );
}
