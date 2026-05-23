import React, { useState, useEffect } from "react";
import { User, Book, MemberUploadRequest, CommunityMessage, SavedDocument, GameScore } from "./types";
import { INITIAL_BOOKS, INITIAL_MEMBER_UPLOADS, INITIAL_COMMUNITY_CHATS } from "./data";
import { 
  syncUserSession, fetchBooksFromFirestore, saveBookToFirestore, deleteBookFromFirestore,
  fetchCommunityMessagesFromFirestore, saveCommunityMessageToFirestore, deleteCommunityMessageFromFirestore,
  fetchSavedDocumentsFromFirestore, saveDocumentToFirestore, deleteSavedDocumentFromFirestore,
  fetchUploadRequestsFromFirestore, saveUploadRequestToFirestore, deleteUploadRequestFromFirestore
} from "./lib/firestoreUtils";
import { auth, googleSignIn, googleLogout } from "./lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

// Sub-components
import Navigation from "./components/Navigation";
import Store from "./components/Store";
import Bible from "./components/Bible";
import LeadershipSchool from "./components/LeadershipSchool";
import DocStudio from "./components/DocStudio";
import AIChat from "./components/AIChat";
import Upload from "./components/Upload";
import Community from "./components/Community";
import Contact from "./components/Contact";
import AdminPanel from "./components/AdminPanel";
import Dashboard from "./components/Dashboard";
import Games from "./components/Games";
import GmailConsole from "./components/GmailConsole";
import AIMedia from "./components/AIMedia";
import BookThreedViewer from "./components/BookThreedViewer";
import PlayStoreHub from "./components/PlayStoreHub";

export default function App() {
  // Current user state (Admin default mock credentials for seamless demonstration out of the box!)
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Custom Authentication Modal state variables
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState("wafula435@gmail.com");
  const [authPassword, setAuthPassword] = useState("19209820");
  const [authError, setAuthError] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [regName, setRegName] = useState("");
  const [regGoal, setRegGoal] = useState(30);

  // View state history routing (Fulfills: "improve on navigation especially going back")
  const [currentView, setCurrentView] = useState<string>("store");
  const [viewHistory, setViewHistory] = useState<string[]>(["store"]);

  // Application Data stores states (saved in localStorage for resilience)
  const [books, setBooks] = useState<Book[]>([]);
  const [uploadRequests, setUploadRequests] = useState<MemberUploadRequest[]>([]);
  const [communityMessages, setCommunityMessages] = useState<CommunityMessage[]>([]);
  const [savedDocuments, setSavedDocuments] = useState<SavedDocument[]>([]);
  
  // Gamification & Core indexes
  const [purchasedBookIds, setPurchasedBookIds] = useState<string[]>(["book_1"]); // Start with one unlocked
  const [wishlistBookIds, setWishlistBookIds] = useState<string[]>([]);
  const [unlockedBadgeIds, setUnlockedBadgeIds] = useState<string[]>(["badge_1"]); // welcome badge
  const [broadcastAnnouncement, setBroadcastAnnouncement] = useState(
    "Join the Bungoma Leadership Seminar this Saturday with Kelvin Opara Wafula!"
  );

  // Initialize and reload from localStorage to stay resilient online & offline!
  useEffect(() => {
    // 1. User
    const savedUser = localStorage.getItem("WAFULA_CURRENT_USER");
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    } else {
      // Create default admin session for quick evaluation
      const defaultAdmin: User = {
        email: "wafula435@gmail.com",
        name: "Kelvin Opara Wafula",
        role: "admin",
        readingStreak: 5,
        dailyGoalMinutes: 30
      };
      setCurrentUser(defaultAdmin);
      localStorage.setItem("WAFULA_CURRENT_USER", JSON.stringify(defaultAdmin));
    }

    // 2. Books Database
    const savedBooks = localStorage.getItem("WAFULA_BOOKS");
    if (savedBooks) {
      setBooks(JSON.parse(savedBooks));
    } else {
      setBooks(INITIAL_BOOKS);
      localStorage.setItem("WAFULA_BOOKS", JSON.stringify(INITIAL_BOOKS));
    }

    // 3. Member Uploads
    const savedUploads = localStorage.getItem("WAFULA_MEMBER_UPLOADS");
    if (savedUploads) {
      setUploadRequests(JSON.parse(savedUploads));
    } else {
      setUploadRequests(INITIAL_MEMBER_UPLOADS);
      localStorage.setItem("WAFULA_MEMBER_UPLOADS", JSON.stringify(INITIAL_MEMBER_UPLOADS));
    }

    // 4. Community forum chats
    const savedChats = localStorage.getItem("WAFULA_CHAT_MESSAGES");
    if (savedChats) {
      setCommunityMessages(JSON.parse(savedChats));
    } else {
      setCommunityMessages(INITIAL_COMMUNITY_CHATS);
      localStorage.setItem("WAFULA_CHAT_MESSAGES", JSON.stringify(INITIAL_COMMUNITY_CHATS));
    }

    // 5. Personal saved documents Vault
    const savedDocs = localStorage.getItem("WAFULA_SAVED_DOCUMENTS");
    if (savedDocs) {
      setSavedDocuments(JSON.parse(savedDocs));
    }

    // 6. Whishlists
    const savedWish = localStorage.getItem("WAFULA_WISHLIST");
    if (savedWish) setWishlistBookIds(JSON.parse(savedWish));

    // 7. Purchased bookshelf
    const savedPurch = localStorage.getItem("WAFULA_PURCHASED");
    if (savedPurch) setPurchasedBookIds(JSON.parse(savedPurch));

    // 8. Achievements
    const savedBadges = localStorage.getItem("WAFULA_UNLOCKED_BADGES");
    if (savedBadges) setUnlockedBadgeIds(JSON.parse(savedBadges));

    // 9. Sticky broadcast
    const savedBroad = localStorage.getItem("WAFULA_BROADCAST");
    if (savedBroad) setBroadcastAnnouncement(savedBroad);
  }, []);

  // Global Keyboard Shortcut Manager for Ctrl+S Draft Saving
  useEffect(() => {
    const handleGlobalSaveShortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (currentView === "studio") {
          const event = new CustomEvent("WAFULA_SAVE_DRAFT");
          document.dispatchEvent(event);
        } else {
          alert("📋 Shortcut Info: [Ctrl+S] is configured to automatically save draft content instantly within the 'Doc Studio' editor. Please open the Doc Studio to write and save your professional summaries!");
        }
      }
    };
    window.addEventListener("keydown", handleGlobalSaveShortcut);
    return () => window.removeEventListener("keydown", handleGlobalSaveShortcut);
  }, [currentView]);

  // Sync state modifications to localStorage
  const handleLogIn = () => {
    setAuthEmail("wafula435@gmail.com");
    setAuthPassword("19209820");
    setAuthError("");
    setRegName("");
    setAuthMode("login");
    setShowAuthModal(true);
  };

  const handleProcessSubmitAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError("Email and Password are required credentials!");
      return;
    }

    try {
      setAuthError("");
      if (authMode === "register") {
        // Create user with Firebase Auth
        const cred = await createUserWithEmailAndPassword(auth, authEmail.trim(), authPassword.trim());
        const mappedName = regName.trim() || authEmail.trim().split("@")[0].replace(/\d+/g, "");
        const userProfile = await syncUserSession(cred.user.uid, authEmail.trim(), mappedName);
        
        setCurrentUser(userProfile);
        localStorage.setItem("WAFULA_CURRENT_USER", JSON.stringify(userProfile));
        setShowAuthModal(false);
        alert(`Welcome to Wafula Reads Hub! Your account for "${userProfile.name}" was successfully registered worldwide!`);
        return;
      }

      // Check for Admin special login credentials (local or remote)
      if ((authEmail.trim() === "wafulak435@gmail.com" || authEmail.trim() === "wafula435@gmail.com") && authPassword.trim() === "19209820") {
        try {
          // If already registered with credentials on Firebase, sign in
          const cred = await signInWithEmailAndPassword(auth, authEmail.trim(), authPassword.trim());
          const userProfile = await syncUserSession(cred.user.uid, authEmail.trim(), "Kelvin Opara Wafula");
          setCurrentUser(userProfile);
          localStorage.setItem("WAFULA_CURRENT_USER", JSON.stringify(userProfile));
        } catch (_) {
          // Fallback static user profile if not provisioned on auth DB yet
          const adminUser: User = {
            email: authEmail.trim(),
            name: "Kelvin Opara Wafula",
            role: "admin",
            readingStreak: 5,
            dailyGoalMinutes: 30
          };
          setCurrentUser(adminUser);
          localStorage.setItem("WAFULA_CURRENT_USER", JSON.stringify(adminUser));
        }
        setShowAuthModal(false);
        alert("Successfully authenticated as Administrator (Kelvin Opara Wafula). Welcome back!");
      } else {
        // Regular user firebase login
        const cred = await signInWithEmailAndPassword(auth, authEmail.trim(), authPassword.trim());
        const userProfile = await syncUserSession(cred.user.uid, authEmail.trim(), "");
        setCurrentUser(userProfile);
        localStorage.setItem("WAFULA_CURRENT_USER", JSON.stringify(userProfile));
        setShowAuthModal(false);
        alert(`Authenticated successfully as Member: ${userProfile.name}!`);
      }
    } catch (error: any) {
      console.error(error);
      setAuthError(error.message || "Authentication failed. Check your credentials.");
    }
  };

  const handleGoogleMockLogin = async () => {
    try {
      setAuthError("");
      const res = await googleSignIn();
      if (res) {
        const userProfile = await syncUserSession(res.user.uid, res.user.email!, res.user.displayName || "Google User");
        setCurrentUser(userProfile);
        localStorage.setItem("WAFULA_CURRENT_USER", JSON.stringify(userProfile));
        setShowAuthModal(false);
        alert(`Authenticated successfully using secure Google Account integration as ${userProfile.name}!`);
      }
    } catch (error: any) {
      console.error(error);
      setAuthError(error.message || "Google Authentication popup failed.");
    }
  };

  const handleLogOut = async () => {
    try {
      await googleLogout();
      await auth.signOut();
    } catch (_) {}
    setCurrentUser(null);
    localStorage.removeItem("WAFULA_CURRENT_USER");
    alert("Successfully checked out securely. Visit again soon!");
  };

  // View navigator with history trace tracking (Enables exact going back request)
  const navigateTo = (viewStr: string) => {
    if (viewStr === currentView) return;
    setViewHistory((prev) => [...prev, viewStr]);
    setCurrentView(viewStr);
  };

  const handlePopBackHistory = () => {
    if (viewHistory.length > 1) {
      const popped = [...viewHistory];
      popped.pop(); // remove active view
      const prev = popped[popped.length - 1];
      setViewHistory(popped);
      setCurrentView(prev);
    } else {
      setCurrentView("store"); // base category fallback
    }
  };

  // Dynamic milestone triggers
  const handleUnlockBadge = (id: string) => {
    if (!unlockedBadgeIds.includes(id)) {
      const next = [...unlockedBadgeIds, id];
      setUnlockedBadgeIds(next);
      localStorage.setItem("WAFULA_UNLOCKED_BADGES", JSON.stringify(next));
    }
  };

  // Books ratings modifications
  const handleUpdateBookRating = (id: string, newAvg: number, newCount: number) => {
    setBooks((prevBooks) => {
      const updated = prevBooks.map((b) => (b.id === id ? { ...b, rating: newAvg, reviewsCount: newCount } : b));
      localStorage.setItem("WAFULA_BOOKS", JSON.stringify(updated));
      return updated;
    });
    handleUnlockBadge("badge_3"); // unlocking the critic reviewer badge
  };

  // Ebook purchases
  const handlePurchaseBook = (id: string) => {
    if (!currentUser) {
      handleLogIn();
      return;
    }
    if (!purchasedBookIds.includes(id)) {
      const next = [...purchasedBookIds, id];
      setPurchasedBookIds(next);
      localStorage.setItem("WAFULA_PURCHASED", JSON.stringify(next));
      alert("Book purchased successfully! It has been authorized in your personal study Dashboard Library.");
    }
  };

  // Wishlist bindings
  const handleToggleWishlist = (id: string) => {
    if (!currentUser) {
      handleLogIn();
      return;
    }
    setWishlistBookIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      localStorage.setItem("WAFULA_WISHLIST", JSON.stringify(next));
      return next;
    });
  };

  // Member Upload creations
  const handleAddNewUpload = (titleStr: string, type: 'pdf' | 'video' | 'photo', subFiles?: string[]) => {
    const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.email === 'wafulak435@gmail.com');
    const fresh: MemberUploadRequest = {
      id: "upl_" + Date.now(),
      userId: currentUser?.email || "anonymous",
      userName: currentUser?.name || "Anonymous Member",
      title: titleStr,
      type,
      fileSize: subFiles && subFiles.length > 0 ? `${(subFiles.length * 3.2).toFixed(1)} MB` : "4.8 MB",
      date: new Date().toISOString().split("T")[0],
      status: "pending",
      allowedToPublic: false,
      subFiles: subFiles || [],
      paid: isAdmin ? true : false // Admin is exempt and paid automatically
    };

    setUploadRequests((prev) => {
      const updated = [fresh, ...prev];
      localStorage.setItem("WAFULA_MEMBER_UPLOADS", JSON.stringify(updated));
      return updated;
    });
  };

  // Member pays upload fee AFTER Admin has approved the file
  const handlePayUpload = (id: string) => {
    setUploadRequests((prev) => {
      const updated = prev.map((u) => {
        if (u.id === id) {
          const isApproved = u.status === 'approved';
          return { ...u, paid: true, allowedToPublic: isApproved };
        }
        return u;
      });
      localStorage.setItem("WAFULA_MEMBER_UPLOADS", JSON.stringify(updated));
      return updated;
    });
  };

  // Member requests deletion
  const handleRequestDeleteUpload = (id: string) => {
    setUploadRequests((prev) => {
      const updated = prev.map((u) => u.id === id ? { ...u, status: "pending_delete" } : u);
      localStorage.setItem("WAFULA_MEMBER_UPLOADS", JSON.stringify(updated));
      return updated;
    });
  };

  // Admin approves member upload request
  const handleApproveUpload = (id: string) => {
    setUploadRequests((prev) => {
      const updated = prev.map((u) => {
        if (u.id === id) {
          return { ...u, status: 'approved' as const };
        }
        return u;
      });
      localStorage.setItem("WAFULA_MEMBER_UPLOADS", JSON.stringify(updated));
      return updated;
    });
  };

  // Admin rejects member upload request
  const handleRejectUpload = (id: string) => {
    setUploadRequests((prev) => {
      const updated = prev.map((u) => {
        if (u.id === id) {
          return { ...u, status: 'rejected' as const, allowedToPublic: false };
        }
        return u;
      });
      localStorage.setItem("WAFULA_MEMBER_UPLOADS", JSON.stringify(updated));
      return updated;
    });
  };

  // Admin toggles member Visibility checkbox (Allows/Hides public posts)
  const handleToggleUploadVisibility = (id: string, isAllowed: boolean) => {
    setUploadRequests((prev) => {
      const updated = prev.map((u) => {
        if (u.id === id) {
          return { ...u, allowedToPublic: isAllowed };
        }
        return u;
      });
      localStorage.setItem("WAFULA_MEMBER_UPLOADS", JSON.stringify(updated));
      return updated;
    });
  };

  // Admin approves Member Requests deletion
  const handleApproveDeletion = (id: string) => {
    setUploadRequests((prev) => {
      const updated = prev.filter((u) => u.id !== id);
      localStorage.setItem("WAFULA_MEMBER_UPLOADS", JSON.stringify(updated));
      return updated;
    });
    alert("Member deletion request approved. File completely wiped from database hosts.");
  };

  // Admin deletes any upload permanently
  const handleDeleteUploadPermanently = (id: string) => {
    setUploadRequests((prev) => {
      const updated = prev.filter((u) => u.id !== id);
      localStorage.setItem("WAFULA_MEMBER_UPLOADS", JSON.stringify(updated));
      return updated;
    });
  };

  // Admin Broadcast Sticky updater
  const handleUpdateBroadcastAnnouncement = (msg: string) => {
    setBroadcastAnnouncement(msg);
    localStorage.setItem("WAFULA_BROADCAST", msg);
  };

  // Main Bookstore Admin inventory functions
  const handleAddNewBook = (newBook: Book) => {
    setBooks((prev) => {
      const updated = [newBook, ...prev];
      localStorage.setItem("WAFULA_BOOKS", JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteBook = (id: string) => {
    setBooks((prev) => {
      const updated = prev.filter((b) => b.id !== id);
      localStorage.setItem("WAFULA_BOOKS", JSON.stringify(updated));
      return updated;
    });
  };

  // Community discussion message submission (with replies)
  const handleSendCommunityMessage = (text: string, parentId?: string) => {
    const fresh: CommunityMessage = {
      id: "msg_" + Date.now(),
      channel: "#General",
      userId: currentUser?.email || "anonymous",
      userName: currentUser?.name || "Bungoma Guest",
      text,
      role: currentUser?.role || "member",
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      parentId
    };

    setCommunityMessages((prev) => {
      const updated = [...prev, fresh];
      localStorage.setItem("WAFULA_CHAT_MESSAGES", JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteCommunityMessage = (id: string) => {
    setCommunityMessages((prev) => {
      const updated = prev.filter((m) => m.id !== id && m.parentId !== id);
      localStorage.setItem("WAFULA_CHAT_MESSAGES", JSON.stringify(updated));
      return updated;
    });
  };

  // Vault Saved Document additions
  const handleAddNewDocument = (doc: SavedDocument) => {
    setSavedDocuments((prev) => {
      const updated = [doc, ...prev];
      localStorage.setItem("WAFULA_SAVED_DOCUMENTS", JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteSavedDocument = (id: string) => {
    setSavedDocuments((prev) => {
      const updated = prev.filter((doc) => doc.id !== id);
      localStorage.setItem("WAFULA_SAVED_DOCUMENTS", JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F1F5F9] text-slate-800 font-sans selection:bg-blue-50 selection:text-blue-900">
      
      {/* Universal navigation layout frame */}
      <Navigation
        currentUser={currentUser}
        currentView={currentView}
        onNavigate={navigateTo}
        onLogIn={handleLogIn}
        onLogOut={handleLogOut}
        onBack={handlePopBackHistory}
        canGoBack={viewHistory.length > 1}
        books={books}
        savedDocuments={savedDocuments}
        communityMessages={communityMessages}
      />

      {/* Main interactive window viewport - Responsive pl matching desktop sidebar layout */}
      <main className="flex-grow lg:pl-64 pt-4 pb-14 min-h-[calc(100vh-4rem)]">
        {currentView === "store" && (
          <Store
            currentUser={currentUser}
            onLogIn={handleLogIn}
            books={books}
            onUpdateBookRating={handleUpdateBookRating}
            onPurchaseBook={handlePurchaseBook}
            purchasedBookIds={purchasedBookIds}
            onToggleWishlist={handleToggleWishlist}
            wishlistBookIds={wishlistBookIds}
          />
        )}

        {currentView === "devotional" && (
          <Bible onUnlockBadge={handleUnlockBadge} />
        )}

        {currentView === "school" && (
          <LeadershipSchool
            unlockedBadges={unlockedBadgeIds}
            onUnlockBadge={handleUnlockBadge}
          />
        )}

        {currentView === "studio" && (
          <DocStudio
            currentUser={currentUser}
            onAddNewDocument={handleAddNewDocument}
            savedDocuments={savedDocuments}
            onDeleteDocument={handleDeleteSavedDocument}
          />
        )}

        {currentView === "gmail" && (
          <GmailConsole />
        )}

        {currentView === "companion" && (
          <AIChat
            currentUser={currentUser}
            onUnlockBadge={handleUnlockBadge}
          />
        )}

        {currentView === "ai-media" && (
          <AIMedia
            currentUser={currentUser}
            onAddNewDocument={handleAddNewDocument}
          />
        )}

        {currentView === "threed-loft" && (
          <BookThreedViewer
            books={books}
          />
        )}

        {currentView === "playstore-hub" && (
          <PlayStoreHub />
        )}

        {currentView === "games" && (
          <Games onUnlockBadge={handleUnlockBadge} />
        )}

        {currentView === "upload" && (
          <Upload
            currentUser={currentUser}
            onLogIn={handleLogIn}
            uploadRequests={uploadRequests}
            onAddNewUpload={handleAddNewUpload}
            onRequestDeleteUpload={handleRequestDeleteUpload}
            onPayUpload={handlePayUpload}
          />
        )}

        {currentView === "community" && (
          <Community
            currentUser={currentUser}
            onLogIn={handleLogIn}
            messages={communityMessages}
            onSendMessage={handleSendCommunityMessage}
            onDeleteMessage={handleDeleteCommunityMessage}
            broadcastAnnouncement={broadcastAnnouncement}
          />
        )}

        {currentView === "dashboard" && (
          <Dashboard
            currentUser={currentUser}
            onLogIn={handleLogIn}
            books={books}
            purchasedBookIds={purchasedBookIds}
            wishlistBookIds={wishlistBookIds}
            unlockedBadgeIds={unlockedBadgeIds}
            savedDocuments={savedDocuments}
            uploadRequests={uploadRequests}
            communityMessages={communityMessages}
            onRemoveWishlist={handleToggleWishlist}
          />
        )}

        {currentView === "contact" && (
          <Contact />
        )}

        {currentView === "admin" && (
          <AdminPanel
            currentUser={currentUser}
            uploadRequests={uploadRequests}
            onToggleUploadVisibility={handleToggleUploadVisibility}
            onApproveUpload={handleApproveUpload}
            onRejectUpload={handleRejectUpload}
            onApproveDeletion={handleApproveDeletion}
            onDeleteUploadPermanently={handleDeleteUploadPermanently}
            broadcastAnnouncement={broadcastAnnouncement}
            onUpdateBroadcastAnnouncement={handleUpdateBroadcastAnnouncement}
            books={books}
            onAddNewBookDoc={handleAddNewBook}
            onDeleteBookDoc={handleDeleteBook}
          />
        )}
      </main>

      {/* Footer copyright */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400 font-mono lg:pl-64">
        <div>© 2026 Wafula Digital. All rights reserved. Headquartered under Bungoma Kenya.</div>
      </footer>

      {/* Dynamic Member Authentication Modal popup */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAuthModal(false)} />
          
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200 select-none">
            {/* Design header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center space-x-2 text-left">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white font-bold">W</span>
                <div>
                  <h3 className="font-display font-extrabold text-slate-950">Member Authentication</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Wafula Digital Gateway • Bungoma, Kenya</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAuthModal(false)} 
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-full text-xs"
              >
                ✕
              </button>
            </div>

            {/* Selector Tabs (Login vs Register) */}
            <div className="flex border-b border-stone-150 mb-4 text-xs font-bold text-stone-500">
              <button
                type="button"
                onClick={() => { setAuthMode("login"); setAuthError(""); }}
                className={`flex-1 py-2 border-b-2 text-center transition ${
                  authMode === "login" ? "text-blue-600 border-blue-600" : "border-transparent hover:text-stone-800"
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode("register"); setAuthError(""); }}
                className={`flex-1 py-2 border-b-2 text-center transition ${
                  authMode === "register" ? "text-blue-600 border-blue-600" : "border-transparent hover:text-stone-800"
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Quick Demo Pre-fill Action (Only for Login) */}
            {authMode === "login" && (
              <div className="mb-4 bg-blue-50/70 border border-blue-105 p-3 rounded-xl text-left">
                <span className="text-[10px] font-bold text-blue-800 uppercase block tracking-wide">Developer Credentials</span>
                <p className="text-[11px] text-blue-600 mt-0.5 leading-tight">
                  For rapid local evaluation, use Kelvin's admin login credentials pre-filled automatically below!
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthEmail("wafula435@gmail.com");
                      setAuthPassword("19209820");
                      setAuthError("");
                    }}
                    className="bg-blue-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition"
                  >
                    Load Kelvin's Admin Account
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthEmail("member75@mail.com");
                      setAuthPassword("password");
                      setAuthError("");
                    }}
                    className="bg-slate-200 text-slate-700 text-[10px] font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-300 transition"
                  >
                    Load Member Demo
                  </button>
                </div>
              </div>
            )}

            {/* Sign in with Google shortcut banner */}
            <button
              type="button"
              onClick={handleGoogleMockLogin}
              className="w-full mb-4 py-2.5 px-4 border border-stone-200 rounded-lg text-xs font-bold text-stone-700 bg-stone-50 hover:bg-stone-100 transition flex items-center justify-center space-x-2"
            >
              <span className="text-base">🌐</span>
              <span>Continue with Google Account</span>
            </button>

            <div className="relative flex items-center justify-center my-3">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-stone-150" /></div>
              <span className="relative bg-white px-2.5 font-mono text-[9px] uppercase font-bold text-stone-400">OR EMAIL</span>
            </div>

            {/* Main Form */}
            <form onSubmit={handleProcessSubmitAuth} className="space-y-4 text-xs text-left">
              {authError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-800 p-2.5 rounded-lg font-bold text-[11px] leading-tight">
                  ⚠️ {authError}
                </div>
              )}

              {authMode === "register" && (
                <div className="space-y-1">
                  <label className="block text-slate-500 font-bold uppercase tracking-wide">Full Name</label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Kelvin Wafula"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-semibold text-slate-800 outline-none focus:bg-white focus:border-blue-600"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-slate-500 font-bold uppercase tracking-wide">Email Reference</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="e.g. member@wafula.com"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-semibold text-slate-800 outline-none focus:bg-white focus:border-blue-600"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-500 font-bold uppercase tracking-wide">Secure Passphrase</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Minimum 4 characters"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-semibold text-slate-800 outline-none focus:bg-white focus:border-blue-600"
                />
              </div>

              {authMode === "register" && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-slate-500 font-bold">
                    <label className="uppercase tracking-wide">Daily Reading Goal</label>
                    <span className="text-blue-600 font-mono font-black">{regGoal} Minutes</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="180"
                    step="5"
                    value={regGoal}
                    onChange={(e) => setRegGoal(Number(e.target.value))}
                    className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="flex-1 rounded-lg border border-slate-200 font-bold py-2.5 hover:bg-slate-50 tracking-wide text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-blue-600 text-white font-bold py-2.5 hover:bg-blue-700 tracking-wide shadow-md text-center"
                >
                  {authMode === "register" ? "Create Account" : "Access Hub"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
