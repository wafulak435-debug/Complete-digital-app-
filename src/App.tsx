import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User, Book, MemberUploadRequest, CommunityMessage, SavedDocument, GameScore, AppSettings, BookOrder } from "./types";
import { INITIAL_BOOKS, INITIAL_MEMBER_UPLOADS, INITIAL_COMMUNITY_CHATS } from "./data";
import { getCookie, setCookie, eraseCookie } from "./utils/cookies";
import { 
  syncUserSession, fetchBooksFromFirestore, saveBookToFirestore, deleteBookFromFirestore,
  fetchCommunityMessagesFromFirestore, saveCommunityMessageToFirestore, deleteCommunityMessageFromFirestore,
  fetchSavedDocumentsFromFirestore, saveDocumentToFirestore, deleteSavedDocumentFromFirestore,
  fetchUploadRequestsFromFirestore, saveUploadRequestToFirestore, deleteUploadRequestFromFirestore,
  fetchAppSettingsFromFirestore,
  fetchBookOrdersFromFirestore, saveBookOrderToFirestore, deleteBookOrderFromFirestore,
  saveNotificationToFirestore,
  logUserActivity,
  handleFirestoreError,
  OperationType
} from "./lib/firestoreUtils";
import { auth, firebaseGoogleSignIn, googleLogout, db, testConnection } from "./lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";

// Sub-components
import Navigation from "./components/Navigation";
import Store from "./components/Store";
import Bible from "./components/Bible";
import LeadershipSchool from "./components/LeadershipSchool";
import DocStudio from "./components/DocStudio";
import AIChat from "./components/AIChat";
import Community from "./components/Community";
import Contact from "./components/Contact";
import Dashboard from "./components/Dashboard";
import GmailConsole from "./components/GmailConsole";
import BookThreedViewer from "./components/BookThreedViewer";
import OfflineDictionary from "./components/OfflineDictionary";
import Announcements from "./components/Announcements";
import SermonsMotivation from "./components/SermonsMotivation";
import CertificateVerificationView from "./components/CertificateVerificationView";
import AuthScreen from "./components/AuthScreen";
import UpgradeModal from "./components/UpgradeModal";
import ProfessionalHub from "./components/ProfessionalHub";
import AITutorStudio from "./components/AITutorStudio";
import BibleSchoolEnvironment from "./components/BibleSchoolEnvironment";
import EvangelismMissionsDashboard from "./components/EvangelismMissionsDashboard";
import ZionCampus3DView from "./components/ZionCampus3DView";
import ZionDesignSystemViewer from "./components/ZionDesignSystemViewer";
import ZionSettingsPanel from "./components/ZionSettingsPanel";
import ZionAdminPortal from "./components/ZionAdminPortal";
import { BOOKS_DEFAULT_COVER } from "./lib/showcase";
import { secureApiFetch, setSessionToken } from "./lib/aiClient";
import { syncSqlProfile } from "./lib/sqlClient";
import {
  isPaystackConfigured,
  ensureUserProfile,
  mapProfileToAppUser,
  uploadUserFile,
  syncLocalVaultFilesToSupabase,
} from "./lib/supabaseClient";
import { savePdfToOfflineDb, getAllOfflinePdfs, requestPersistentStorage } from "./utils/pdfDb";
import { recordSyncEvent } from "./lib/syncHistory";

function safeSetLocalStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.warn(`Local storage quota notice while saving ${key}:`, err);
  }
}

export default function App() {
  const recordUserSession = (user: User, actionType: string) => {
    try {
      const logs = JSON.parse(localStorage.getItem("WAFULA_LOGIN_SESSIONS") || "[]");
      const sessionIndex = logs.findIndex((l: any) => l.email.toLowerCase() === user.email.toLowerCase());
      
      const newLog = {
        id: "sess_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
        name: user.name || user.email.split("@")[0],
        email: user.email,
        role: user.role,
        lastActive: new Date().toLocaleString(),
        status: "Online",
        method: actionType,
        device: navigator.userAgent.includes("Mobi") ? "Mobile Device" : "Desktop Computer"
      };

      if (sessionIndex !== -1) {
        // Update existing active session
        logs[sessionIndex] = { ...logs[sessionIndex], ...newLog };
      } else {
        logs.unshift(newLog);
      }
      localStorage.setItem("WAFULA_LOGIN_SESSIONS", JSON.stringify(logs));
      window.dispatchEvent(new Event("storage"));
    } catch (_) {}
  };

  const markSessionOffline = (email: string) => {
    try {
      const logs = JSON.parse(localStorage.getItem("WAFULA_LOGIN_SESSIONS") || "[]");
      const matched = logs.map((l: any) => {
        if (l.email.toLowerCase() === email.toLowerCase()) {
          return { ...l, status: "Offline", lastActive: new Date().toLocaleString() };
        }
        return l;
      });
      localStorage.setItem("WAFULA_LOGIN_SESSIONS", JSON.stringify(matched));
      window.dispatchEvent(new Event("storage"));
    } catch (_) {}
  };

  // Global application brand and custom themes configuration settings
  const [globalSettings, setGlobalSettings] = useState<AppSettings>({
    primaryColor: "#A8421B",
    fontSizeMultiplier: 1.0,
    customLogoUrl: ""
  });

  const [offlineMode, setOfflineMode] = useState<boolean>(() => {
    return localStorage.getItem("WAFULA_OFFLINE_MODE") === "true";
  });
  const [sleekMode, setSleekMode] = useState<boolean>(() => {
    return localStorage.getItem("WAFULA_SLEEK_MODE") === "true";
  });
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);

  const effectiveIsOnline = isOnline && !offlineMode;

  const handleToggleOfflineMode = () => {
    const nextVal = !offlineMode;
    setOfflineMode(nextVal);
    localStorage.setItem("WAFULA_OFFLINE_MODE", String(nextVal));
    window.dispatchEvent(new Event("storage"));
  };

  const handleToggleSleekMode = () => {
    const nextVal = !sleekMode;
    setSleekMode(nextVal);
    localStorage.setItem("WAFULA_SLEEK_MODE", String(nextVal));
  };

  // Monitor network status change in real time
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Listen for global custom navigation events
  useEffect(() => {
    const handleCustomNavigation = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.view) {
        const rawView = String(customEvent.detail.view);
        const viewStr =
          rawView === "mpesa-api"
            ? "admin"
            : rawView === "virtual-classroom"
            ? "school"
            : rawView === "campuses-map"
            ? "3d-campus"
            : ["website-center", "playstore-hub", "zion-quest"].includes(rawView)
            ? "store"
            : rawView;
        setCurrentView((cur) => {
          if (viewStr === cur) return cur;
          setViewHistory((prev) => {
            if (prev[prev.length - 1] === viewStr) return prev;
            return [...prev, viewStr];
          });
          return viewStr;
        });
      }
    };
    window.addEventListener("WAFULA_NAVIGATE", handleCustomNavigation);
    return () => {
      window.removeEventListener("WAFULA_NAVIGATE", handleCustomNavigation);
    };
  }, []);

  // Fetch current aesthetics configuration coordinate on mount
  useEffect(() => {
    fetchAppSettingsFromFirestore()
      .then((settings) => {
        if (settings) {
          setGlobalSettings(settings);
        }
      })
      .catch((e) => console.log("Initializing dynamic styling configurations.", e));
  }, []);

  // Sync state dynamic update hook
  useEffect(() => {
    if (globalSettings.primaryColor) {
      document.documentElement.style.setProperty("--color-accent", globalSettings.primaryColor);
    }
    if (globalSettings.fontSizeMultiplier) {
      document.documentElement.style.setProperty("font-size", `${globalSettings.fontSizeMultiplier * 100}%`);
    }
  }, [globalSettings]);

  // Current user state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const [dismissedSetupBanner, setDismissedSetupBanner] = useState<boolean>(false);
  const [adminAccessState, setAdminAccessState] = useState<"idle" | "checking" | "granted" | "denied">("idle");
  const [adminAccessError, setAdminAccessError] = useState<string>("");
  const [pendingDmTarget, setPendingDmTarget] = useState<{ email: string; name: string } | null>(null);

  // Custom Authentication Modal state variables
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [regName, setRegName] = useState("");
  const [regGoal, setRegGoal] = useState(30);



  // View state history routing (respects /admin, /manager-portal, and ?view=...)
  const normalizeView = (v: string): string => {
    if (v === "mpesa-api") return "admin";
    if (v === "virtual-classroom") return "school";
    if (v === "campuses-map") return "3d-campus";
    if (["website-center", "playstore-hub", "zion-quest"].includes(v)) return "store";
    return v;
  };
  const [currentView, setCurrentView] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const p = window.location.pathname.toLowerCase();
      if (p.startsWith("/admin")) return "admin";
      if (p.startsWith("/manager-portal")) return "manager-portal";
      const qView = new URLSearchParams(window.location.search).get("view");
      if (qView) return normalizeView(qView);
    }
    return normalizeView(localStorage.getItem("WAFULA_CURRENT_VIEW") || "store");
  });
  const [initialBookId, setInitialBookId] = useState<string | null>(null);
  const [viewHistory, setViewHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem("WAFULA_VIEW_HISTORY");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return ["store"];
  });

  useEffect(() => {
    localStorage.setItem("WAFULA_CURRENT_VIEW", currentView);
  }, [currentView]);

  useEffect(() => {
    localStorage.setItem("WAFULA_VIEW_HISTORY", JSON.stringify(viewHistory));
  }, [viewHistory]);

  // Global Voice Commands Assistant States
  const [voiceControlActive, setVoiceControlActive] = useState(false);
  const [voiceNotification, setVoiceNotification] = useState<string | null>(null);

  // Application Data stores states (saved in localStorage for resilience)
  const [books, setBooks] = useState<Book[]>([]);
  const [uploadRequests, setUploadRequests] = useState<MemberUploadRequest[]>([]);
  const [bookOrders, setBookOrders] = useState<BookOrder[]>([]);
  const [communityMessages, setCommunityMessages] = useState<CommunityMessage[]>([]);
  const [isFetchingCommunity, setIsFetchingCommunity] = useState(false);
  const [savedDocuments, setSavedDocuments] = useState<SavedDocument[]>([]);
  
  // Gamification & Core indexes
  const [purchasedBookIds, setPurchasedBookIds] = useState<string[]>(["book_1"]); // Start with one unlocked
  const [wishlistBookIds, setWishlistBookIds] = useState<string[]>([]);
  const [unlockedBadgeIds, setUnlockedBadgeIds] = useState<string[]>(["badge_1"]); // welcome badge
  const [broadcastAnnouncement, setBroadcastAnnouncement] = useState(
    "Join the Bungoma Leadership Seminar this Saturday with Kelvin Opara Wafula!"
  );
  const [isBannerClosed, setIsBannerClosed] = useState(false);

  // Synchronize orders & paid book entitlements from trusted server backend
  const syncOrdersFromServer = async () => {
    try {
      const res = await secureApiFetch("/api/orders");
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && Array.isArray(data.orders)) {
        setBookOrders(data.orders);
        localStorage.setItem("WAFULA_BOOK_ORDERS", JSON.stringify(data.orders));
        const approvedBookIds = data.orders
          .filter((o: any) => o.status === "approved")
          .map((o: any) => String(o.bookId));
        if (approvedBookIds.length > 0) {
          setPurchasedBookIds((prev) => {
            const merged = Array.from(new Set([...prev, ...approvedBookIds]));
            localStorage.setItem("WAFULA_PURCHASED", JSON.stringify(merged));
            return merged;
          });
        }
      }
    } catch {
      // Offline resilient fallback
    }
  };

  // Verify admin authorization on server whenever navigating to /admin
  useEffect(() => {
    if (currentView !== "admin" || !currentUser) {
      setAdminAccessState("idle");
      return;
    }
    let mounted = true;
    setAdminAccessState("checking");
    secureApiFetch("/api/admin/access-check")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!mounted) return;
        if (!res.ok || !data.success) {
          setAdminAccessState("denied");
          setAdminAccessError(data?.error || "Access Restricted (403): Verified administrator privileges required.");
        } else {
          setAdminAccessState("granted");
          setAdminAccessError("");
        }
      })
      .catch(() => {
        if (!mounted) return;
        setAdminAccessState("denied");
        setAdminAccessError("Unable to verify administrator privileges with backend server.");
      });
    return () => {
      mounted = false;
    };
  }, [currentView, currentUser?.email, currentUser?.role]);


  // Hydrate & verify active session against Express server (/api/auth/me) or Supabase Auth
  useEffect(() => {
    let mounted = true;

    const verifyServerCookieSession = async () => {
      try {
        const res = await secureApiFetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (mounted && data?.success && data?.user) {
            setCurrentUser(data.user);
            localStorage.setItem("WAFULA_CURRENT_USER", JSON.stringify(data.user));
            setCookie("WAFULA_CURRENT_USER", JSON.stringify(data.user), 7);
            recordUserSession(data.user, "Verified Server Session");
            syncOrdersFromServer();
            setIsCheckingAuth(false);
            return true;
          }
        }
      } catch {
        // Ignore offline fallback
      }
      return false;
    };

    (async () => {
      const restored = await verifyServerCookieSession();
      if (!mounted) return;
      if (restored) {
        setIsCheckingAuth(false);
        return;
      }

      // Check if Firebase Auth has an active persisted user session
      try {
        if (typeof auth.authStateReady === "function") {
          await auth.authStateReady();
        }
        if (mounted && auth.currentUser) {
          const idToken = await auth.currentUser.getIdToken();
          const fbRes = await secureApiFetch("/api/auth/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "firebase", idToken }),
          });
          const fbData = await fbRes.json().catch(() => ({}));
          if (mounted && fbRes.ok && fbData?.success && fbData?.user) {
            if (fbData.sessionToken) setSessionToken(fbData.sessionToken);
            setCurrentUser(fbData.user);
            localStorage.setItem("WAFULA_CURRENT_USER", JSON.stringify(fbData.user));
            setCookie("WAFULA_CURRENT_USER", JSON.stringify(fbData.user), 7);
            recordUserSession(fbData.user, "Firebase Session");
            syncOrdersFromServer();
            setIsCheckingAuth(false);
            return;
          }
        }
      } catch {
        // Non-fatal fallback
      }

      if (!mounted) return;
      // Fallback local cookie / cache verification
      const cookieUser = getCookie("WAFULA_CURRENT_USER");
      const savedUser = cookieUser || localStorage.getItem("WAFULA_CURRENT_USER");
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed && ["admin", "main_admin", "sub_admin", "manager"].includes(parsed.role)) {
            parsed.role = "member";
            delete parsed.permissions;
            delete parsed.isMainAdmin;
          }
          setCurrentUser(parsed);
        } catch {
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setIsCheckingAuth(false);
    })();

    // Listen to Firebase auth state changes in real-time
    const unsubscribeAuth = auth.onAuthStateChanged(async (fbUser) => {
      if (!mounted) return;
      if (fbUser) {
        try {
          const idToken = await fbUser.getIdToken();
          const fbRes = await secureApiFetch("/api/auth/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "firebase", idToken }),
          });
          const fbData = await fbRes.json().catch(() => ({}));
          if (mounted && fbRes.ok && fbData?.success && fbData?.user) {
            if (fbData.sessionToken) setSessionToken(fbData.sessionToken);
            const enrichedUser: User = {
              ...fbData.user,
              avatarUrl: fbUser.photoURL || fbData.user.avatarUrl,
            };
            setCurrentUser(enrichedUser);
            localStorage.setItem("WAFULA_CURRENT_USER", JSON.stringify(enrichedUser));
            setCookie("WAFULA_CURRENT_USER", JSON.stringify(enrichedUser), 7);
            recordUserSession(enrichedUser, "Firebase Session");
            syncUserSession(
              fbUser.uid,
              fbUser.email || enrichedUser.email,
              fbUser.displayName || enrichedUser.name,
              fbUser.photoURL || undefined
            ).catch(() => {});
            void syncSqlProfile();
            syncOrdersFromServer();
          }
        } catch {}
      }
    });

    return () => {
      mounted = false;
      unsubscribeAuth();
    };
  }, []);

  // Load books & cached files on mount
  useEffect(() => {
    requestPersistentStorage().catch(() => {});

    // 2. Books Database
    const savedBooks = localStorage.getItem("WAFULA_BOOKS");
    let initialBooksList: Book[] = [];
    const blacklistIds = ["b1", "b2", "b3", "b15", "unit_01", "unit_02", "unit_03", "unit_04", "unit_05", "unit_06", "theology_infinite_volume_supplement_for_1mb_compliance"];
    const isMock = (id: string) => blacklistIds.includes(id) || id.startsWith("unit_") || id.startsWith("b1") || id.startsWith("b2") || id.startsWith("b3");
    if (savedBooks) {
      try {
        const parsed = JSON.parse(savedBooks) as Book[];
        // Completely exclude any mock/default books
        initialBooksList = parsed.filter(b => !isMock(b.id));
      } catch (err) {
        initialBooksList = [];
      }
    } else {
      initialBooksList = [];
    }
    safeSetLocalStorage("WAFULA_BOOKS", JSON.stringify(initialBooksList));
    setBooks(initialBooksList);

    // Merge server-persisted catalog books so Express-saved books survive browser refreshes/clears
    secureApiFetch("/api/books")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.books) && data.books.length > 0) {
          setBooks((prev) => {
            const map = new Map<string, Book>();
            prev.forEach((b) => map.set(b.id, b));
            data.books.forEach((sb: Book) => {
              if (!sb?.id || isMock(sb.id)) return;
              const existing = map.get(sb.id);
              if (!existing) {
                map.set(sb.id, {
                  ...sb,
                  description: sb.description || `Published digital resource by ${sb.author || "Zion Digital"}.`,
                  coverImage: sb.coverImage || BOOKS_DEFAULT_COVER,
                  fileSize: sb.fileSize || "2.4 MB",
                  pages: sb.pages || 80,
                  publishedDate: sb.publishedDate || new Date().toISOString().split("T")[0],
                  isFeatured: Boolean(sb.isFeatured),
                  rating: sb.rating || 5,
                  reviewsCount: sb.reviewsCount || 1,
                  isSynced: true,
                });
              }
            });
            const merged = Array.from(map.values());
            safeSetLocalStorage("WAFULA_BOOKS", JSON.stringify(merged));
            return merged;
          });
        }
      })
      .catch(() => {});

    // Load offline cached PDF Blobs and attach live object URLs dynamically
    getAllOfflinePdfs().then((pdfsMap) => {
      if (pdfsMap && pdfsMap.size > 0) {
        setBooks((currentBooks) => {
          return currentBooks.map((b) => {
            const rawId = b.id.startsWith("book_uploaded_") ? b.id.replace("book_uploaded_", "") : b.id;
            if (pdfsMap.has(b.id)) {
              const blob = pdfsMap.get(b.id)!;
              return {
                ...b,
                pdfUrl: URL.createObjectURL(blob)
              };
            } else if (pdfsMap.has(rawId)) {
              const blob = pdfsMap.get(rawId)!;
              return {
                ...b,
                pdfUrl: URL.createObjectURL(blob)
              };
            }
            return b;
          });
        });
      }
    }).catch((err) => {
      console.warn("IndexedDB PDF load error:", err);
    });

    // 3. Member Uploads
    const savedUploads = localStorage.getItem("WAFULA_MEMBER_UPLOADS");
    if (savedUploads) {
      setUploadRequests(JSON.parse(savedUploads));
    } else {
      setUploadRequests(INITIAL_MEMBER_UPLOADS);
      localStorage.setItem("WAFULA_MEMBER_UPLOADS", JSON.stringify(INITIAL_MEMBER_UPLOADS));
    }

    // 3.5 Book purchase orders
    const savedOrders = localStorage.getItem("WAFULA_BOOK_ORDERS");
    if (savedOrders) {
      setBookOrders(JSON.parse(savedOrders));
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

    // 10. URL routing helper for Verification and Book Store pages
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get("view");
    const bookParam = urlParams.get("bookId");
    if (viewParam === "verify") {
      setCurrentView("verify");
    } else {
      if (bookParam) {
        setInitialBookId(bookParam);
        setCurrentView("store");
      } else if (viewParam) {
        setCurrentView(viewParam);
      }
    }
  }, []);

  // Listen in real-time to administrative broadcasts & free book releases
  useEffect(() => {
    if (!isOnline || !auth.currentUser || !currentUser || currentUser.role === "guest") return;
    try {
      const q = collection(db, "notifications");
      const unSub = onSnapshot(q, (snapshot) => {
        let latestBanner = "";
        let foundAnn = false;
        
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (docSnap.id === "announcement-banner") {
            latestBanner = data.message;
            foundAnn = true;
          }
        });
        
        if (foundAnn && latestBanner) {
          setBroadcastAnnouncement(latestBanner);
          localStorage.setItem("WAFULA_BROADCAST", latestBanner);
        }
      }, (err) => {
        console.warn("Notifications listener notice:", err?.message || err);
      });
      return () => unSub();
    } catch (e) {
      console.warn("Failed initializing notifications listener:", e);
    }
  }, [isOnline, currentUser?.id, currentUser?.role]);

  // Key background helper to cache shared/uploaded base64 book contents locally
  const saveBase64PdfToIndexedDb = (bookId: string, base64Url: string) => {
    if (!base64Url || !base64Url.startsWith("data:application/pdf;base64,")) return;
    try {
      const parts = base64Url.split(";base64,");
      const contentType = parts[0].split(":")[1] || "application/pdf";
      const raw = window.atob(parts[1]);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      const blob = new Blob([uInt8Array], { type: contentType });
      savePdfToOfflineDb(bookId, blob)
        .then(() => {
          recordSyncEvent({
            title: "Offline PDF cached",
            detail: `Stored offline reading copy (${bookId}) in browser database`,
            category: "offline_cache",
            status: "synced",
            itemCount: 1,
          });
        })
        .catch((err) => {
          console.warn("Could not background cache remote PDF to IndexedDB:", err);
        });
    } catch (e) {
      console.warn("Base64 background caching parse error:", e);
    }
  };

  // Hybrid Online/Offline Books Bidirectional Synchronization Engine with Real-time Firestore Sync
  useEffect(() => {
    if (!isOnline) return;
    const isBookAdmin = Boolean(
      currentUser && ["main_admin", "admin", "sub_admin"].includes(currentUser.role)
    );
    try {
      const q = isBookAdmin
        ? collection(db, "books")
        : query(collection(db, "books"), where("status", "==", "active"));
      const unSub = onSnapshot(q, (snapshot) => {
        const remoteBooks: Book[] = [];

        snapshot.forEach((docSnap) => {
          const b = { ...docSnap.data() } as Book;
          const isMockId = ["b1", "b2", "b3", "b15", "unit_01", "unit_02", "unit_03", "unit_04", "unit_05", "unit_06", "theology_infinite_volume_supplement_for_1mb_compliance"].includes(b.id) || b.id.startsWith("unit_") || b.id.startsWith("b1") || b.id.startsWith("b2") || b.id.startsWith("b3");
          if (isMockId) {
            if (isBookAdmin) deleteBookFromFirestore(b.id).catch(() => {});
            return;
          }
          
          if (b.pdfUrl && b.pdfUrl.startsWith("data:application/pdf;base64,")) {
            saveBase64PdfToIndexedDb(b.id, b.pdfUrl);
            b.pdfUrl = "indexeddb://" + b.id;
          }
          remoteBooks.push(b);
        });

        if (remoteBooks && remoteBooks.length > 0) {
          setBooks((prev) => {
            const localBooks = [...prev];
            const currentRemoteIds = new Set(remoteBooks.map(b => b.id));
            const keptLocalBooks = localBooks.filter(lb => {
              const isRemotePresent = currentRemoteIds.has(lb.id);
              if (isRemotePresent) return true;
              if (lb.isSynced === false) return true;
              return false;
            });
            const localOnly = keptLocalBooks.filter(lb => !currentRemoteIds.has(lb.id) && lb.isSynced === false);
            const localById = new Map(localBooks.map((lb) => [lb.id, lb]));
            const markedRemoteBooks = remoteBooks.map((rb) => {
              const localMatch = localById.get(rb.id);
              const keepLocalPdf =
                localMatch?.pdfUrl &&
                (localMatch.pdfUrl.startsWith("blob:") || localMatch.pdfUrl.startsWith("indexeddb://")) &&
                (!rb.pdfUrl || rb.pdfUrl.startsWith("Community Secure") || rb.pdfUrl.startsWith("indexeddb://"));
              return {
                ...rb,
                pdfUrl: keepLocalPdf ? localMatch!.pdfUrl : rb.pdfUrl,
                isSynced: true,
              };
            });

            const merged = [...localOnly, ...markedRemoteBooks];
            const map = new Map<string, Book>();
            merged.forEach(b => map.set(b.id, b));
            const finalBooks = Array.from(map.values());
            safeSetLocalStorage("WAFULA_BOOKS", JSON.stringify(finalBooks));

            if (isBookAdmin) {
              localOnly.forEach((lb) => {
                const sanitizedBook = { ...lb, isSynced: true };
                saveBookToFirestore(sanitizedBook)
                  .then(() => {
                    setBooks(current => current.map(item => item.id === lb.id ? { ...item, isSynced: true } : item));
                    const saved = localStorage.getItem("WAFULA_BOOKS");
                    if (saved) {
                      const parsed = JSON.parse(saved) as Book[];
                      const updated = parsed.map(item => item.id === lb.id ? { ...item, isSynced: true } : item);
                      localStorage.setItem("WAFULA_BOOKS", JSON.stringify(updated));
                    }
                    recordSyncEvent({
                      title: "Books uploaded",
                      detail: `Uploaded offline book "${lb.title}" to cloud library`,
                      category: "books",
                      status: "synced",
                      itemCount: 1,
                    });
                  })
                  .catch((err) => {
                    console.warn(`Firestore sync upload failed for offline-added book: ${lb.title}`, err);
                    recordSyncEvent({
                      title: "Books queued offline",
                      detail: `Kept "${lb.title}" queued for retry`,
                      category: "books",
                      status: "queued",
                      itemCount: 1,
                    });
                  });
              });
            }

            recordSyncEvent({
              title: "Books synced",
              detail: `${finalBooks.length} books verified in offline library cache`,
              category: "books",
              status: "synced",
              itemCount: finalBooks.length,
            });
            
            return finalBooks;
          });
        } else if (isBookAdmin) {
          console.log("Firestore books cache is empty. Seeding INITIAL_BOOKS globally for all users...");
          INITIAL_BOOKS.forEach((ib) => {
            const sanitizedBook = { ...ib, isSynced: true };
            saveBookToFirestore(sanitizedBook).catch((err) => {
              console.warn(`Failure seeding Initial Book ${ib.title} to Firestore:`, err);
            });
          });
          setBooks((prev) => {
            if (!prev || prev.length === 0) {
              localStorage.setItem("WAFULA_BOOKS", JSON.stringify(INITIAL_BOOKS));
              return [...INITIAL_BOOKS];
            }
            return prev;
          });
        }
      }, (error) => {
        console.warn("Firestore real-time books sync notice:", error?.message || error);
      });
      return () => unSub();
    } catch (e) {
      console.warn("Failed initializing books real-time subscription:", e);
    }
  }, [isOnline, currentUser?.role]);

  // Hybrid Online/Offline Upload Requests Bidirectional Synchronization Engine
  useEffect(() => {
    if (isOnline) {
      fetchUploadRequestsFromFirestore()
        .then((remoteRequests) => {
          if (remoteRequests && remoteRequests.length > 0) {
            setUploadRequests((prev) => {
              const localRequests = [...prev];
              const remoteIds = new Set(remoteRequests.map(rr => rr.id));
              const localOnly = localRequests.filter(lr => !remoteIds.has(lr.id));
              const merged = [...localOnly, ...remoteRequests];
              
              const map = new Map<string, MemberUploadRequest>();
              merged.forEach(r => map.set(r.id, r));
              const finalRequests = Array.from(map.values());
              
              localStorage.setItem("WAFULA_MEMBER_UPLOADS", JSON.stringify(finalRequests));
              
              // Automatically publish locally accumulated requests to Live Firestore database
              localOnly.forEach((lr) => {
                saveUploadRequestToFirestore(lr)
                  .then(() => {
                    recordSyncEvent({
                      title: "Uploads uploaded",
                      detail: `Uploaded "${lr.title}" to cloud review queue`,
                      category: "uploads",
                      status: "synced",
                      itemCount: 1,
                    });
                  })
                  .catch((err) => {
                    console.warn(`Firestore sync upload failed for upload request: ${lr.title}`, err);
                    recordSyncEvent({
                      title: "Uploads queued offline",
                      detail: `Pending retry for "${lr.title}"`,
                      category: "uploads",
                      status: "queued",
                      itemCount: 1,
                    });
                  });
              });

              recordSyncEvent({
                title: "Uploads synced",
                detail: `${finalRequests.length} member upload records synchronized`,
                category: "uploads",
                status: "synced",
                itemCount: finalRequests.length,
              });
              
              return finalRequests;
            });
          }
        })
        .catch((e) => {
          console.warn("Retrying Firestore upload requests synchronization...", e);
        });
    }
  }, [isOnline]);

  // Hybrid Online/Offline Book Purchase Orders Bidirectional Synchronization Engine
  useEffect(() => {
    if (isOnline) {
      fetchBookOrdersFromFirestore()
        .then((remoteOrders) => {
          if (remoteOrders && remoteOrders.length > 0) {
            setBookOrders((prev) => {
              const localOrders = [...prev];
              const remoteIds = new Set(remoteOrders.map(o => o.id));
              const localOnly = localOrders.filter(lo => !remoteIds.has(lo.id));
              const merged = [...localOnly, ...remoteOrders];
              
              const map = new Map<string, BookOrder>();
              merged.forEach(o => map.set(o.id, o));
              const finalOrders = Array.from(map.values());
              
              localStorage.setItem("WAFULA_BOOK_ORDERS", JSON.stringify(finalOrders));

              // Auto-unlock books that have been approved for the current user
              if (currentUser?.email) {
                const approvedForMe = finalOrders
                  .filter(o => o.userId.toLowerCase().trim() === currentUser.email.toLowerCase().trim() && o.status === "approved")
                  .map(o => o.bookId);
                
                if (approvedForMe.length > 0) {
                  setPurchasedBookIds((prevIds) => {
                    const next = Array.from(new Set([...prevIds, ...approvedForMe]));
                    localStorage.setItem("WAFULA_PURCHASED", JSON.stringify(next));
                    return next;
                  });
                }
              }

              // Sync any offline-placed orders to Live Firestore
              localOnly.forEach((lo) => {
                saveBookOrderToFirestore(lo)
                  .then(() => {
                    recordSyncEvent({
                      title: "Orders uploaded",
                      detail: `Uploaded order for "${lo.bookTitle}"`,
                      category: "orders",
                      status: "synced",
                      itemCount: 1,
                    });
                  })
                  .catch((err) => {
                    console.warn(`Firestore sync upload failed for purchase order: ${lo.id}`, err);
                  });
              });

              recordSyncEvent({
                title: "Orders synced",
                detail: `${finalOrders.length} purchase orders verified`,
                category: "orders",
                status: "synced",
                itemCount: finalOrders.length,
              });

              return finalOrders;
            });
          }
        })
        .catch((e) => {
          console.warn("Retrying Firestore book orders synchronization...", e);
        });
    }
  }, [isOnline, currentUser]);

  // Automated Sync Service for Offline Data immediately upon detecting active connection
  const runBackgroundSync = async () => {
    if (!effectiveIsOnline) {
      recordSyncEvent({
        title: "Offline mode active",
        detail: "Background sync paused until an internet connection is available",
        category: "offline_cache",
        status: "queued",
        itemCount: 0,
      });
      return;
    }

    const conn = await testConnection();
    recordSyncEvent({
      title: conn.connected ? "Firebase Firestore connected" : "Firebase offline fallback",
      detail: conn.connected
        ? `Connected to ${conn.projectId} (${conn.databaseId})`
        : "Cloud Firestore unreachable; serving cached offline data",
      category: "offline_cache",
      status: conn.connected ? "synced" : "queued",
      itemCount: 1,
    });

    const tasks: Promise<void>[] = [];

    // 1. Sync Books
    tasks.push(
      fetchBooksFromFirestore()
        .then((remoteBooks) => {
          setBooks((prevBooks) => {
            const remoteIds = new Set((remoteBooks || []).map((b) => b.id));
            const pendingUpload = prevBooks.filter((b) => !remoteIds.has(b.id));

            if (pendingUpload.length > 0) {
              pendingUpload.forEach((b) => {
                saveBookToFirestore(b).catch((err) => {
                  console.warn(`[Sync Warning] Failed to upload book ${b.title}:`, err);
                });
              });
            }

            const merged = [...prevBooks];
            (remoteBooks || []).forEach((rb) => {
              if (!merged.some((mb) => mb.id === rb.id)) {
                merged.push(rb);
              }
            });
            localStorage.setItem("WAFULA_BOOKS", JSON.stringify(merged));
            recordSyncEvent({
              title: pendingUpload.length > 0 ? "Books synced & uploaded" : "Books synced",
              detail:
                pendingUpload.length > 0
                  ? `Uploaded ${pendingUpload.length} local books and verified ${merged.length} total`
                  : `${merged.length} books synchronized with offline storage`,
              category: "books",
              status: "synced",
              itemCount: merged.length,
            });
            return merged;
          });
        })
        .catch((err) => {
          console.warn("Automated books metadata sync fetch failed:", err);
          recordSyncEvent({
            title: "Books sync failed",
            detail: "Could not reach cloud library; using cached catalog",
            category: "books",
            status: "failed",
            itemCount: 0,
          });
        })
    );

    // 2. Sync Saved Documents (only when authenticated with Firebase Auth)
    const targetUserId = auth.currentUser?.uid || currentUser?.id;
    if (auth.currentUser && targetUserId) {
      tasks.push(
        fetchSavedDocumentsFromFirestore(targetUserId)
        .then((remoteDocs) => {
          setSavedDocuments((prevDocs) => {
            const remoteIds = new Set((remoteDocs || []).map((d) => d.id));
            const pendingUpload = prevDocs.filter(
              (d) =>
                auth.currentUser &&
                (d.userId === auth.currentUser.uid || d.userId === auth.currentUser.email) &&
                !remoteIds.has(d.id) &&
                !d.id.startsWith("doc_sample_") &&
                !d.id.startsWith("d_")
            );

            if (pendingUpload.length > 0) {
              pendingUpload.forEach((d) => {
                saveDocumentToFirestore(d).catch((err) => {
                  console.warn(`[Sync Warning] Failed to upload document ${d.title}:`, err);
                });
              });
            }

            const merged = [...prevDocs];
            (remoteDocs || []).forEach((rd) => {
              if (!merged.some((md) => md.id === rd.id)) {
                merged.push(rd);
              }
            });
            localStorage.setItem("WAFULA_SAVED_DOCUMENTS", JSON.stringify(merged));
            recordSyncEvent({
              title: pendingUpload.length > 0 ? "Documents uploaded" : "Documents synced",
              detail:
                pendingUpload.length > 0
                  ? `Uploaded ${pendingUpload.length} local study documents`
                  : `${merged.length} saved documents verified offline`,
              category: "documents",
              status: "synced",
              itemCount: merged.length,
            });
            return merged;
          });
        })
        .catch((err) => {
          console.warn("Automated documents metadata sync fetch failed:", err);
        })
      );
    }

    // 3. Sync Offline Community Chat Messages
    tasks.push(
      fetchCommunityMessagesFromFirestore()
        .then((remoteMsgs) => {
          setCommunityMessages((prevMsgs) => {
            const remoteIds = new Set((remoteMsgs || []).map((m) => m.id));
            const pendingUpload = prevMsgs.filter(
              (m) =>
                auth.currentUser &&
                (m.userId === auth.currentUser.uid || m.userId === auth.currentUser.email) &&
                !remoteIds.has(m.id) &&
                !m.id.startsWith("msg_")
            );

            if (pendingUpload.length > 0) {
              pendingUpload.forEach((m) => {
                saveCommunityMessageToFirestore(m).catch((err) => {
                  console.warn(`[Sync Warning] Failed to upload community message:`, err);
                });
              });
            }

            const merged = [...prevMsgs];
            (remoteMsgs || []).forEach((rm) => {
              if (!merged.some((mm) => mm.id === rm.id)) {
                merged.push(rm);
              }
            });
            localStorage.setItem("WAFULA_CHAT_MESSAGES", JSON.stringify(merged));
            recordSyncEvent({
              title: pendingUpload.length > 0 ? "Messages uploaded" : "Messages synced",
              detail: `${merged.length} community messages cached offline`,
              category: "messages",
              status: "synced",
              itemCount: merged.length,
            });
            return merged;
          });
        })
        .catch((err) => console.warn("Automated community messages sync failed:", err))
    );

    // 4. Sync Peer-to-Peer Member Upload Requests
    tasks.push(
      fetchUploadRequestsFromFirestore()
        .then((remoteRequests) => {
          setUploadRequests((prevRequests) => {
            const remoteIds = new Set((remoteRequests || []).map((r) => r.id));
            const pendingUpload = prevRequests.filter(
              (r) =>
                auth.currentUser &&
                (r.userId === auth.currentUser.uid || r.userId === auth.currentUser.email) &&
                !remoteIds.has(r.id) &&
                !r.id.startsWith("upl_")
            );

            if (pendingUpload.length > 0) {
              pendingUpload.forEach((r) => {
                saveUploadRequestToFirestore(r).catch((err) => {
                  console.warn(`[Sync Warning] Failed to upload file request ${r.title}:`, err);
                });
              });
            }

            const merged = [...prevRequests];
            (remoteRequests || []).forEach((rr) => {
              if (!merged.some((mr) => mr.id === rr.id)) {
                merged.push(rr);
              }
            });
            localStorage.setItem("WAFULA_MEMBER_UPLOADS", JSON.stringify(merged));
            recordSyncEvent({
              title: pendingUpload.length > 0 ? "Uploads uploaded" : "Uploads synced",
              detail:
                pendingUpload.length > 0
                  ? `Uploaded ${pendingUpload.length} queued member uploads`
                  : `${merged.length} upload records verified`,
              category: "uploads",
              status: "synced",
              itemCount: merged.length,
            });
            return merged;
          });
        })
        .catch((err) => console.warn("Automated member upload requests sync failed:", err))
    );

    // 5. Sync eBook order bookings
    tasks.push(
      fetchBookOrdersFromFirestore()
        .then((remoteOrders) => {
          setBookOrders((prevOrders) => {
            const remoteIds = new Set((remoteOrders || []).map((o) => o.id));
            const pendingUpload = prevOrders.filter((o) => !remoteIds.has(o.id));

            if (pendingUpload.length > 0) {
              pendingUpload.forEach((o) => {
                saveBookOrderToFirestore(o).catch((err) => {
                  console.warn(`[Sync Warning] Failed to upload eBook order:`, err);
                });
              });
            }

            const merged = [...prevOrders];
            (remoteOrders || []).forEach((ro) => {
              if (!merged.some((mo) => mo.id === ro.id)) {
                merged.push(ro);
              }
            });
            localStorage.setItem("WAFULA_BOOK_ORDERS", JSON.stringify(merged));
            recordSyncEvent({
              title: pendingUpload.length > 0 ? "Orders uploaded" : "Orders synced",
              detail: `${merged.length} book orders synchronized`,
              category: "orders",
              status: "synced",
              itemCount: merged.length,
            });
            return merged;
          });
        })
        .catch((err) => console.warn("Automated eBook orders sync failed:", err))
    );

    // 6. Sync any offline-queued Supabase Storage Vault files if configured & signed in
    const vaultOwner = currentUser?.id || currentUser?.email;
    if (vaultOwner) {
      tasks.push(
        syncLocalVaultFilesToSupabase(vaultOwner)
          .then((syncedCount) => {
            if (syncedCount > 0) {
              recordSyncEvent({
                title: "Storage Vault synced",
                detail: `Synchronized ${syncedCount} private vault files to cloud storage`,
                category: "uploads",
                status: "synced",
                itemCount: syncedCount,
              });
            }
          })
          .catch(() => {})
      );
    }

    await Promise.allSettled(tasks);
  };

  useEffect(() => {
    if (isOnline && !offlineMode) {
      runBackgroundSync();
    }
  }, [isOnline, offlineMode, currentUser]);

  // Fetch Community Messages in real-time or via helper
  useEffect(() => {
    if (currentView === "community") {
      setIsFetchingCommunity(true);
      fetchCommunityMessagesFromFirestore()
        .then((msgs) => {
          if (msgs && msgs.length > 0) {
            setCommunityMessages(msgs);
            localStorage.setItem("WAFULA_CHAT_MESSAGES", JSON.stringify(msgs));
          }
        })
        .catch((e) => {
          console.warn("Could not query communityMessages from Firestore:", e);
        })
        .finally(() => {
          // Elegant artificial delay so user sees transition loader
          setTimeout(() => {
            setIsFetchingCommunity(false);
          }, 850);
        });
    }
  }, [currentView]);

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
    setAuthEmail("");
    setAuthPassword("");
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
      const trimmedEmail = authEmail.trim();
      const trimmedPassword = authPassword.trim();
      const mappedName = regName.trim() || trimmedEmail.split("@")[0];

      // Authenticate via server-side session verification (never assigns admin by email string on client)
      const res = await secureApiFetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: authMode === "register" ? "register" : "login",
          email: trimmedEmail,
          password: trimmedPassword,
          name: mappedName,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success || !data?.user) {
        throw new Error(data?.error || "Invalid credentials. Please verify your email and password.");
      }

      if (data.sessionToken) {
        setSessionToken(data.sessionToken);
      }

      const userProfile: User = {
        ...data.user,
        readingStreak: 1,
        dailyGoalMinutes: regGoal || 30,
      };

      setCurrentUser(userProfile);
      localStorage.setItem("WAFULA_CURRENT_USER", JSON.stringify(userProfile));
      setCookie("WAFULA_CURRENT_USER", JSON.stringify(userProfile), 7);
      recordUserSession(userProfile, authMode === "register" ? "Verified Register" : "Verified Login");
      syncOrdersFromServer();
      setShowAuthModal(false);
    } catch (error: any) {
      setAuthError(error?.message || "Authentication failed. Check your credentials.");
    }
  };

  const handleGoogleMockLogin = async () => {
    try {
      setAuthError("");
      const { user, idToken } = await firebaseGoogleSignIn();
      const verifyRes = await secureApiFetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "firebase", idToken }),
      });
      const verifyData = await verifyRes.json().catch(() => ({}));
      if (!verifyRes.ok || !verifyData?.success || !verifyData?.user) {
        throw new Error(verifyData?.error || "Server rejected Google token verification.");
      }
      if (verifyData.sessionToken) {
        setSessionToken(verifyData.sessionToken);
      }
      const userProfile: User = {
        ...(verifyData.user as User),
        avatarUrl: user.photoURL || (verifyData.user as User).avatarUrl,
      };
      await syncUserSession(
        user.uid,
        user.email || userProfile.email,
        user.displayName || userProfile.name,
        user.photoURL || undefined
      );
      void logUserActivity(
        user.email || userProfile.email,
        user.displayName || userProfile.name,
        "Google Sign-In",
        "Signed in with Google Firebase Auth"
      );
      setCurrentUser(userProfile);
      localStorage.setItem("WAFULA_CURRENT_USER", JSON.stringify(userProfile));
      setCookie("WAFULA_CURRENT_USER", JSON.stringify(userProfile), 7);
      recordUserSession(userProfile, "Firebase Google Sign-In");
      void syncSqlProfile();
      syncOrdersFromServer();
      setShowAuthModal(false);
    } catch (error: any) {
      setAuthError(error?.message || "Google sign-in unavailable. Please allow popups or sign in with email credentials.");
    }
  };

  const handleContinueAsGuest = () => {
    const guestUser: User = {
      id: "guest_" + Date.now(),
      email: "guest@zionreads.com",
      name: "Guest Reader",
      role: "guest",
      readingStreak: 1,
      dailyGoalMinutes: 30
    };
    setSessionToken(null);
    setCurrentUser(guestUser);
    localStorage.setItem("WAFULA_CURRENT_USER", JSON.stringify(guestUser));
    setCookie("WAFULA_CURRENT_USER", JSON.stringify(guestUser), 7);
    setShowAuthModal(false);
  };

  const handlePasswordReset = async () => {
    if (!authEmail.trim()) {
      setAuthError("Please fill in your email address first to send a password reset link.");
      return;
    }

    try {
      setAuthError("");
      await sendPasswordResetEmail(auth, authEmail.trim());
      alert(`A password reset link has been dispatched to ${authEmail.trim()}.`);
    } catch {
      setAuthError("Live password reset requires Firebase/Supabase email delivery configuration.");
    }
  };

  const handleLogOut = async () => {
    if (currentUser?.email) {
      markSessionOffline(currentUser.email);
    }
    try {
      await secureApiFetch("/api/auth/logout", { method: "POST" });
      await googleLogout();
      await auth.signOut();
    } catch (_) {}
    setSessionToken(null);
    setCurrentUser(null);
    localStorage.removeItem("WAFULA_CURRENT_USER");
    eraseCookie("WAFULA_CURRENT_USER");
  };

  // View navigator with history trace tracking and URL synchronization
  const navigateTo = (rawView: string) => {
    const viewStr = normalizeView(rawView);
    if (typeof window !== "undefined") {
      const targetUrl =
        viewStr === "admin"
          ? "/admin"
          : viewStr === "manager-portal"
          ? "/manager-portal"
          : "/";
      if (window.location.pathname !== targetUrl) {
        window.history.pushState({ view: viewStr }, "", targetUrl);
      }
    }
    if (viewStr === currentView) return;
    setViewHistory((prev) => [...prev, viewStr]);
    setCurrentView(viewStr);
  };

  const handlePopBackHistory = () => {
    if (viewHistory.length > 1) {
      const popped = [...viewHistory];
      popped.pop();
      const prev = popped[popped.length - 1];
      setViewHistory(popped);
      setCurrentView(prev);
    } else {
      navigateTo("store");
    }
  };

  // Global Voice Commands Controller
  useEffect(() => {
    if (!voiceControlActive) {
      return;
    }

    const Speech = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Speech) {
      setVoiceNotification("⚠️ Web Speech API is not supported in this browser.");
      setVoiceControlActive(false);
      return;
    }

    const rec = new Speech();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-US";

    rec.onstart = () => {
      console.log("Global voice commands listening started...");
    };

    rec.onresult = (e: any) => {
      const lastIndex = e.results.length - 1;
      const transcript = e.results[lastIndex][0].transcript.trim().toLowerCase();
      console.log("Global voice command heard:", transcript);

      if (transcript.includes("open library") || transcript.includes("library")) {
        navigateTo("store");
        setVoiceNotification("🔊 Voice Command: Opened Library");
        const t = setTimeout(() => setVoiceNotification(null), 3000);
        return () => clearTimeout(t);
      } else if (transcript.includes("go back") || transcript.includes("back")) {
        handlePopBackHistory();
        setVoiceNotification("🔊 Voice Command: Navigated Back");
        const t = setTimeout(() => setVoiceNotification(null), 3000);
        return () => clearTimeout(t);
      } else if (transcript.includes("save document") || transcript.includes("save")) {
        window.dispatchEvent(new CustomEvent("voice-save-document"));
        setVoiceNotification("🔊 Voice Command: Save Document triggered");
        const t = setTimeout(() => setVoiceNotification(null), 3000);
        return () => clearTimeout(t);
      }
    };

    rec.onerror = (err: any) => {
      console.warn("Speech recognition error:", err);
      if (err.error === 'not-allowed') {
        setVoiceNotification("❌ Microphone permission denied.");
        setVoiceControlActive(false);
      }
    };

    rec.onend = () => {
      // Re-enable if still turned on
      if (voiceControlActive) {
        try {
          rec.start();
        } catch (_) {}
      }
    };

    try {
      rec.start();
    } catch (_) {}

    return () => {
      try {
        rec.stop();
      } catch (_) {}
    };
  }, [voiceControlActive]);

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

  // Verified eBook purchase entitlement sync (triggered after Daraja M-Pesa confirmation in Store)
  const handlePurchaseBook = (id: string) => {
    if (!currentUser) {
      handleLogIn();
      return;
    }

    const targetBook = books.find((b) => b.id === id);
    if (!targetBook) return;

    setPurchasedBookIds((prevIds) => {
      const next = prevIds.includes(id) ? prevIds : [...prevIds, id];
      localStorage.setItem("WAFULA_PURCHASED", JSON.stringify(next));
      return next;
    });

    void syncOrdersFromServer();
    handleUnlockBadge("badge_2");
    logUserActivity(
      currentUser.email,
      currentUser.name,
      "Purchase Book",
      `Verified M-Pesa payment and unlocked "${targetBook.title}" (ID: ${targetBook.id}, KES ${targetBook.price || 0}).`
    );
  };

  // Quick save FREE eBook directly to personal 'My Books' library (paid books go through verified checkout)
  const handleQuickSaveToLibrary = (id: string) => {
    if (!currentUser) {
      handleLogIn();
      return;
    }
    const targetBook = books.find(b => b.id === id);
    if (!targetBook) return;

    if ((targetBook.price || 0) > 0) {
      handlePurchaseBook(id);
      return;
    }

    if (purchasedBookIds.includes(id)) {
      return;
    }

    setPurchasedBookIds((prevIds) => {
      const next = prevIds.includes(id) ? prevIds : [...prevIds, id];
      localStorage.setItem("WAFULA_PURCHASED", JSON.stringify(next));
      return next;
    });

    const newOrder: BookOrder = {
      id: `lib_quick_${Date.now()}`,
      userId: currentUser.email,
      userEmail: currentUser.email,
      userName: currentUser.name || currentUser.email.split("@")[0],
      bookId: targetBook.id,
      bookTitle: targetBook.title,
      price: 0,
      status: "approved",
      date: new Date().toISOString().split("T")[0]
    };

    setBookOrders((prevOrders) => {
      const next = [newOrder, ...prevOrders];
      localStorage.setItem("WAFULA_BOOK_ORDERS", JSON.stringify(next));
      return next;
    });

    saveBookOrderToFirestore(newOrder).catch(() => {});

    logUserActivity(
      currentUser.email,
      currentUser.name,
      "Quick Add Library",
      `Saved free eBook to My Books: "${targetBook.title}" (ID: ${targetBook.id})`
    );
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
  const handleAddNewUpload = (
    titleStr: string, 
    type: 'pdf' | 'video' | 'photo' | 'audio', 
    subFiles?: string[], 
    audioDuration?: string,
    audioCodec?: string,
    thumbnail?: string,
    fileSizeStr?: string,
    actualFile?: File,
    category?: string
  ) => {
    const isAdmin = currentUser && ["admin", "main_admin", "sub_admin"].includes(currentUser.role);

    // Auto approve and auto pay only if user is verified Admin
    const shouldAutoApprove = !!isAdmin;
    const fileId = "upl_" + Date.now();
    const bookId = `book_uploaded_${fileId}`;

    if (actualFile) {
      savePdfToOfflineDb(fileId, actualFile).then(() => {
        if (type === "pdf") {
          savePdfToOfflineDb(bookId, actualFile).catch(() => {});
        }
        recordSyncEvent({
          title: "Offline file cached",
          detail: `Saved "${titleStr}" locally in durable browser storage`,
          category: "offline_cache",
          status: "synced",
          itemCount: 1,
        });
      }).catch((e) => {
        console.warn("Could not write physical file bytes to IndexedDB:", e);
        recordSyncEvent({
          title: "Local file save warning",
          detail: `Could not cache binary copy of "${titleStr}" locally`,
          category: "offline_cache",
          status: "failed",
          itemCount: 0,
        });
      });
    }

    const fresh: MemberUploadRequest = {
      id: fileId,
      userId: currentUser?.email || "anonymous",
      userName: currentUser?.name || "Anonymous Member",
      title: titleStr,
      type,
      fileSize: fileSizeStr || (subFiles && subFiles.length > 0 ? `${(subFiles.length * 3.2).toFixed(1)} MB` : "4.8 MB"),
      date: new Date().toISOString().split("T")[0],
      status: shouldAutoApprove ? "approved" : "pending",
      allowedToPublic: shouldAutoApprove ? true : false,
      subFiles: subFiles || [],
      paid: shouldAutoApprove ? true : false, // Auto-paid for direct preview visibility
      audioDuration,
      audioCodec,
      thumbnail,
      hasLocalBlob: !!actualFile,
      category: category || "General Education"
    };

    setUploadRequests((prev) => {
      const updated = [fresh, ...prev];
      safeSetLocalStorage("WAFULA_MEMBER_UPLOADS", JSON.stringify(updated));
      return updated;
    });

    // Write upload request directly to Firestore to synchronize with other users
    saveUploadRequestToFirestore(fresh)
      .then(() => {
        recordSyncEvent({
          title: "Uploads uploaded",
          detail: `Uploaded "${titleStr}" to cloud queue`,
          category: "uploads",
          status: "synced",
          itemCount: 1,
        });
      })
      .catch((err) => {
        console.warn("Offline: Upload request queued locally, online backup scheduled on reconnect:", err);
        recordSyncEvent({
          title: "Uploads queued offline",
          detail: `Saved "${titleStr}" locally for upload on reconnect`,
          category: "uploads",
          status: "queued",
          itemCount: 1,
        });
      });

    // Mirror physical file to Supabase Storage (user-uploads bucket) and Express uploads when online
    if (actualFile && (currentUser?.id || currentUser?.email)) {
      const ownerId = currentUser?.id || currentUser?.email || "member";
      const folder = type === "photo" ? "images" : "documents";
      uploadUserFile(ownerId, actualFile, folder)
        .then((res) => {
          const storageRef = res.path;
          setUploadRequests((prev) => {
            const next = prev.map((u) => (u.id === fileId ? { ...u, contentUrl: storageRef } : u));
            safeSetLocalStorage("WAFULA_MEMBER_UPLOADS", JSON.stringify(next));
            return next;
          });
          saveUploadRequestToFirestore({ ...fresh, contentUrl: storageRef }).catch(() => {});
          recordSyncEvent({
            title: "Storage Vault synced",
            detail: `Backed up "${titleStr}" to storage vault`,
            category: "uploads",
            status: "synced",
            itemCount: 1,
          });
        })
        .catch(() => {});

      // Also persist PDF document copy on Express server if user has an active session
      if (type === "pdf" && actualFile.size <= 25 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = String(reader.result || "");
          if (!base64) return;
          secureApiFetch("/api/books/upload-doc", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: bookId,
              fileBase64: base64,
              fileName: actualFile.name || `${fileId}.pdf`,
            }),
          }).catch(() => {});
        };
        reader.readAsDataURL(actualFile);
      }
    }

    if (currentUser) {
      logUserActivity(
        currentUser.email,
        currentUser.name,
        "Upload Book",
        `Uploaded eBook: "${titleStr}" (Category: ${category || "General Education"}, Format: ${type.toUpperCase()})`
      );
    }

    // If ANY user uploads a PDF book, release it directly to the bookstore preview wall so it is visible immediately!
    if (type === "pdf") {
      let bookCoverUrl = fresh.thumbnail;
      
      if (!bookCoverUrl) {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 300;
          canvas.height = 400;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            const grad = ctx.createLinearGradient(0, 0, 0, 400);
            const titleLower = titleStr.toLowerCase();
            if (titleLower.includes("lead") || titleLower.includes("manag") || titleLower.includes("govern")) {
              grad.addColorStop(0, "#1d4ed8");
              grad.addColorStop(1, "#172554");
            } else if (titleLower.includes("faith") || titleLower.includes("god") || titleLower.includes("bibl") || titleLower.includes("theo")) {
              grad.addColorStop(0, "#7f1d1d");
              grad.addColorStop(1, "#450a0a");
            } else if (titleLower.includes("agro") || titleLower.includes("biz") || titleLower.includes("money") || titleLower.includes("wealth") || titleLower.includes("finance")) {
              grad.addColorStop(0, "#014737");
              grad.addColorStop(1, "#011f18");
            } else {
              grad.addColorStop(0, "#312e81");
              grad.addColorStop(1, "#1e1b4b");
            }
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 300, 400);

            ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
            ctx.lineWidth = 1;
            for (let i = 0; i < 300; i += 25) {
              ctx.beginPath();
              ctx.moveTo(i, 0);
              ctx.lineTo(i, 400);
              ctx.stroke();
            }

            ctx.strokeStyle = "#fbbf24";
            ctx.lineWidth = 3;
            ctx.strokeRect(12, 12, 276, 376);

            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 15px sans-serif";
            ctx.textAlign = "center";
            const words = titleStr.split(" ");
            let line = "";
            let yCoord = 140;
            for (let n = 0; n < words.length; n++) {
              const testLine = line + words[n] + " ";
              const metrics = ctx.measureText(testLine);
              if (metrics.width > 230 && n > 0) {
                ctx.fillText(line.trim(), 150, yCoord);
                line = words[n] + " ";
                yCoord += 22;
              } else {
                line = testLine;
              }
            }
            ctx.fillText(line.trim(), 150, yCoord);

            ctx.fillStyle = "#facc15";
            ctx.font = "bold 11px monospace";
            ctx.fillText(`By ${fresh.userName}`, 150, yCoord + 45);

            ctx.fillStyle = "rgba(239, 68, 68, 0.85)";
            ctx.font = "bold 8px monospace";
            ctx.fillText("PDF COVERSHEET SECURE", 150, 345);

            bookCoverUrl = canvas.toDataURL("image/jpeg");
          }
        } catch (e) {
          bookCoverUrl = BOOKS_DEFAULT_COVER;
        }
      }

      const gBook: Book = {
        id: bookId,
        title: fresh.title,
        author: fresh.userName,
        authorEmail: currentUser?.email,
        price: 350,
        description: `Verified study resource published by ${fresh.userName}. Beautifully bound in high-resolution vector layout.`,
        category: "Leadership",
        coverImage: bookCoverUrl || BOOKS_DEFAULT_COVER,
        fileSize: fresh.fileSize,
        pages: Math.floor(Math.random() * 60 + 90),
        publishedDate: fresh.date,
        isFeatured: true,
        status: "active",
        rating: 5,
        reviewsCount: 1,
        pdfUrl: actualFile ? "indexeddb://" + fresh.id : "Community Secure Read Document - Authenticated Offline DRM Protected Copy",
        allowPreview: true,
        previewDuration: 120,
        isSynced: false
      };

      setBooks((prevBooks) => {
        const next = [gBook, ...prevBooks];
        safeSetLocalStorage("WAFULA_BOOKS", JSON.stringify(next));
        return next;
      });

      // Synchronize auto-approved book catalog with Firestore database without risking premature onSnapshot deletion
      saveBookToFirestore({ ...gBook, isSynced: true })
        .then(() => {
          setBooks((current) => {
            const next = current.map((item) => (item.id === gBook.id ? { ...item, isSynced: true } : item));
            safeSetLocalStorage("WAFULA_BOOKS", JSON.stringify(next));
            return next;
          });
        })
        .catch((err) => {
          console.warn("Offline: Catalog element saved locally, online lookup synchronization scheduled:", err);
        });
    }
  };

  // Member pays upload fee AFTER Admin has approved the file
  const handlePayUpload = (id: string) => {
    setUploadRequests((prev) => {
      const updated = prev.map((u) => {
        if (u.id === id) {
          const isApproved = u.status === 'approved';
          const nextItem = { ...u, paid: true, allowedToPublic: isApproved };
          saveUploadRequestToFirestore(nextItem).catch(() => {});
          return nextItem;
        }
        return u;
      });
      safeSetLocalStorage("WAFULA_MEMBER_UPLOADS", JSON.stringify(updated));
      return updated;
    });

    // If user's approved upload is paid, publish to bookstore wall!
    setTimeout(() => {
      setUploadRequests((curRequests) => {
        const item = curRequests.find((u) => u.id === id);
        if (item && item.type === "pdf" && item.status === "approved" && item.paid) {
          setBooks((prevBooks) => {
            const exists = prevBooks.some((b) => b.id === `book_uploaded_${item.id}`);
            if (exists) return prevBooks;
            
            const gBook: Book = {
              id: `book_uploaded_${item.id}`,
              title: item.title,
              author: item.userName,
              price: 200,
              description: `Verified member community publication by ${item.userName}. All visual credentials verified.`,
              category: "Non-Fiction",
              coverImage: item.thumbnail || BOOKS_DEFAULT_COVER,
              fileSize: item.fileSize,
              pages: Math.floor(Math.random() * 40 + 60),
              publishedDate: item.date,
              isFeatured: false,
              status: "active",
              rating: 5,
              reviewsCount: 1,
              pdfUrl: item.contentUrl || (item.hasLocalBlob ? `indexeddb://${item.id}` : "Community Secure Read Document - Authenticated Offline DRM Protected Copy"),
              allowPreview: true,
              previewDuration: 45,
              isSynced: false
            };
            const next = [gBook, ...prevBooks];
            safeSetLocalStorage("WAFULA_BOOKS", JSON.stringify(next));
            saveBookToFirestore({ ...gBook, isSynced: true })
              .then(() => {
                setBooks((curr) => curr.map((b) => (b.id === gBook.id ? { ...b, isSynced: true } : b)));
              })
              .catch(() => {});
            return next;
          });
        }
        return curRequests;
      });
    }, 50);
  };

  // Member deletes upload permanently immediately
  const handleRequestDeleteUpload = (id: string) => {
    setUploadRequests((prev) => {
      const updated = prev.filter((u) => u.id !== id);
      localStorage.setItem("WAFULA_MEMBER_UPLOADS", JSON.stringify(updated));
      return updated;
    });

    deleteUploadRequestFromFirestore(id).catch((err) => {
      console.warn("Could not permanently delete request from Firestore:", err);
    });

    const possibleBookId = `book_uploaded_${id}`;
    setBooks((prevBooks) => {
      const updatedBooks = prevBooks.filter((b) => b.id !== possibleBookId && b.id !== id);
      localStorage.setItem("WAFULA_BOOKS", JSON.stringify(updatedBooks));
      return updatedBooks;
    });

    deleteBookFromFirestore(possibleBookId).catch((err) => {
      console.warn("Could not delete associated book from Firestore:", err);
    });
    deleteBookFromFirestore(id).catch((err) => {
      console.warn("Could not delete associated book from Firestore:", err);
    });
  };

  // Admin approves member upload request
  const handleApproveUpload = (id: string) => {
    setUploadRequests((prev) => {
      const updated = prev.map((u) => {
        if (u.id === id) {
          const updatedItem = { ...u, status: 'approved' as const, allowedToPublic: true };
          saveUploadRequestToFirestore(updatedItem).catch((err) => {
            console.warn("Could not sync approved upload request to Firestore:", err);
          });

          if (currentUser) {
            logUserActivity(
              currentUser.email,
              currentUser.name,
              "Approve Upload",
              `Admin approved scholar eBook submission: "${updatedItem.title}"`
            );
          }
          return updatedItem;
        }
        return u;
      });
      localStorage.setItem("WAFULA_MEMBER_UPLOADS", JSON.stringify(updated));
      return updated;
    });

    // Push into books if type is PDF (so it goes live on approval!)
    setTimeout(() => {
      setUploadRequests((curRequests) => {
        const item = curRequests.find((u) => u.id === id);
        if (item && item.type === "pdf") {
          setBooks((prevBooks) => {
            const exists = prevBooks.some((b) => b.id === `book_uploaded_${item.id}`);
            if (exists) return prevBooks;

            const gBook: Book = {
              id: `book_uploaded_${item.id}`,
              title: item.title,
              author: item.userName,
              price: 200,
              description: `Verified member community publication by ${item.userName}. All visual credentials verified.`,
              category: "Non-Fiction",
              coverImage: item.thumbnail || BOOKS_DEFAULT_COVER,
              fileSize: item.fileSize,
              pages: Math.floor(Math.random() * 40 + 60),
              publishedDate: item.date,
              isFeatured: false,
              status: "active",
              rating: 5,
              reviewsCount: 1,
              pdfUrl: "Community Secure Read Document - Authenticated Offline DRM Protected Copy",
              allowPreview: true,
              previewDuration: 45,
              isSynced: false
            };
            const next = [gBook, ...prevBooks];
            localStorage.setItem("WAFULA_BOOKS", JSON.stringify(next));
            
            // Push approved book metadata up to live Firestore catalog
            const syncedgBook = { ...gBook, isSynced: true };
            saveBookToFirestore(syncedgBook)
              .then(() => {
                setBooks((current) =>
                  current.map((item) => (item.id === gBook.id ? { ...item, isSynced: true } : item))
                );
                const saved = localStorage.getItem("WAFULA_BOOKS");
                if (saved) {
                  const parsed = JSON.parse(saved) as Book[];
                  const updated = parsed.map((item) =>
                    item.id === gBook.id ? { ...item, isSynced: true } : item
                  );
                  localStorage.setItem("WAFULA_BOOKS", JSON.stringify(updated));
                }
              })
              .catch((err) => {
                console.warn("Failed saving approved book catalog record online:", err);
              });

            return next;
          });
        }
        return curRequests;
      });
    }, 50);
  };

  // Admin rejects member upload request
  const handleRejectUpload = (id: string) => {
    setUploadRequests((prev) => {
      const updated = prev.map((u) => {
        if (u.id === id) {
          const updatedItem = { ...u, status: 'rejected' as const, allowedToPublic: false };
          saveUploadRequestToFirestore(updatedItem).catch((err) => {
            console.warn("Could not sync rejected status to Firestore:", err);
          });
          return updatedItem;
        }
        return u;
      });
      localStorage.setItem("WAFULA_MEMBER_UPLOADS", JSON.stringify(updated));
      return updated;
    });
  };

  // Finance Admin / Manager approves purchase verification order on server
  const handleApproveBookOrder = async (id: string) => {
    try {
      const res = await secureApiFetch(`/api/orders/${encodeURIComponent(id)}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error || "Permission denied: finance administrator authorization required.");
        return;
      }
      setBookOrders((prev) => {
        const updated = prev.map((o) => {
          if (o.id === id) {
            const updatedItem = { ...o, status: "approved" as const };
            saveBookOrderToFirestore(updatedItem).catch(() => {});
            return updatedItem;
          }
          return o;
        });
        localStorage.setItem("WAFULA_BOOK_ORDERS", JSON.stringify(updated));
        return updated;
      });
      syncOrdersFromServer();
    } catch {
      alert("Could not reach order verification server.");
    }
  };

  // Finance Admin / Manager rejects purchase verification order on server
  const handleRejectBookOrder = async (id: string) => {
    try {
      const res = await secureApiFetch(`/api/orders/${encodeURIComponent(id)}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error || "Permission denied: finance administrator authorization required.");
        return;
      }
      setBookOrders((prev) => {
        const updated = prev.map((o) => {
          if (o.id === id) {
            const updatedItem = { ...o, status: "rejected" as const };
            saveBookOrderToFirestore(updatedItem).catch(() => {});
            return updatedItem;
          }
          return o;
        });
        localStorage.setItem("WAFULA_BOOK_ORDERS", JSON.stringify(updated));
        return updated;
      });
    } catch {
      alert("Could not reach order verification server.");
    }
  };

  // Admin toggles member Visibility checkbox (Allows/Hides public posts)
  const handleToggleUploadVisibility = (id: string, isAllowed: boolean) => {
    setUploadRequests((prev) => {
      const updated = prev.map((u) => {
        if (u.id === id) {
          const updatedItem = { ...u, allowedToPublic: isAllowed };
          saveUploadRequestToFirestore(updatedItem).catch((err) => {
            console.warn("Could not sync public visibility to Firestore:", err);
          });
          return updatedItem;
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
    // Remove from Firestore
    deleteUploadRequestFromFirestore(id).catch((err) => {
      console.warn("Could not delete request from Firestore:", err);
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
    // Remove from Firestore
    deleteUploadRequestFromFirestore(id).catch((err) => {
      console.warn("Could not permanently delete request from Firestore:", err);
    });
  };

  // Admin Broadcast Sticky updater
  const handleUpdateBroadcastAnnouncement = (msg: string) => {
    setBroadcastAnnouncement(msg);
    localStorage.setItem("WAFULA_BROADCAST", msg);

    // Persist to remote Firestore to sync with all logged in users
    if (isOnline) {
      saveNotificationToFirestore({
        id: "announcement-banner",
        title: "Global Sticky Broadcast",
        message: msg,
        type: "general",
        date: new Date().toISOString()
      }).catch((err) => {
        console.warn("Could not sync broadcast message to remote Firestore:", err);
      });
    }
  };

  // Main Bookstore Admin inventory functions (synced to Express + Firestore)
  const handleAddNewBook = (newBook: Book) => {
    let finalBook = { ...newBook, authorEmail: currentUser?.email, isSynced: false };

    if (newBook.pdfUrl && newBook.pdfUrl.startsWith("data:application/pdf;base64,")) {
      try {
        const parts = newBook.pdfUrl.split(";base64,");
        const contentType = parts[0].split(":")[1] || "application/pdf";
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);
        for (let i = 0; i < rawLength; ++i) {
          uInt8Array[i] = raw.charCodeAt(i);
        }
        const blob = new Blob([uInt8Array], { type: contentType });
        finalBook.pdfUrl = `/api/books/pdf/${newBook.id}`;
        savePdfToOfflineDb(newBook.id, blob).catch(() => {});

        secureApiFetch("/api/books/pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: newBook.id, pdfBase64: newBook.pdfUrl }),
        }).catch(() => {});
      } catch (e) {
        console.error("Base64 conversion failed:", e);
      }
    }

    secureApiFetch("/api/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: finalBook.id,
        title: finalBook.title,
        author: finalBook.author,
        price: finalBook.price,
        status: finalBook.status,
        category: finalBook.category,
        allowPreview: finalBook.allowPreview !== false,
        previewDuration: finalBook.previewDuration || 30,
        content: finalBook.content,
        pdfUrl: finalBook.pdfUrl,
      }),
    }).catch(() => {});

    setBooks((prev) => {
      const updated = [finalBook, ...prev];
      localStorage.setItem("WAFULA_BOOKS", JSON.stringify(updated));
      return updated;
    });

    const safeFirestoreBook = { ...finalBook, pdfUrl: finalBook.pdfUrl, isSynced: true };
    saveBookToFirestore(safeFirestoreBook)
      .then(() => {
        setBooks((current) =>
          current.map((item) => (item.id === finalBook.id ? { ...item, isSynced: true } : item))
        );
      })
      .catch(() => {});
  };

  const handleDeleteBook = async (id: string) => {
    try {
      const res = await secureApiFetch(`/api/books/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || "Permission denied: authorized book manager role required to delete books.");
        return;
      }
    } catch {
      // Proceed locally if server unreachable
    }
    setBooks((prev) => {
      const updated = prev.filter((b) => b.id !== id);
      localStorage.setItem("WAFULA_BOOKS", JSON.stringify(updated));
      return updated;
    });
    deleteBookFromFirestore(id).catch(() => {});
  };

  // Community discussion message submission with server RBAC & channel membership checks
  const handleSendCommunityMessage = async (
    text: string, 
    parentId?: string, 
    channelName?: string,
    extras?: { imageContent?: string; attachedFile?: { name: string; type: string; dataUrl?: string; sizeStr?: string; url?: string }; stickerEmoji?: string }
  ) => {
    const channel = channelName || "#generatechat";
    try {
      const res = await secureApiFetch("/api/community/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, text, parentId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error || `Membership is required to post in ${channel}.`);
        return;
      }
    } catch {
      // Allow local fallback if offline
    }

    const fresh: CommunityMessage = {
      id: "msg_" + Date.now(),
      channel,
      userId: currentUser?.id || currentUser?.email || "anonymous",
      userEmail: currentUser?.email,
      userName: currentUser?.name || "Bungoma Member",
      text,
      role: currentUser?.role || "member",
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      parentId,
      ...extras
    };

    setCommunityMessages((prev) => {
      const updated = [...prev, fresh];
      localStorage.setItem("WAFULA_CHAT_MESSAGES", JSON.stringify(updated));
      return updated;
    });

    saveCommunityMessageToFirestore(fresh).catch(() => {});
  };

  const handleEditCommunityMessage = async (id: string, nextText: string) => {
    try {
      const res = await secureApiFetch(`/api/community/messages/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: nextText }),
      });
      if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || "Only the message owner or an authorized moderator may edit this message.");
        return;
      }
    } catch {}

    setCommunityMessages((prev) => {
      const updated = prev.map((m) => {
        if (m.id === id) {
          const updatedMsg = { ...m, text: nextText, isEdited: true };
          saveCommunityMessageToFirestore(updatedMsg).catch(() => {});
          return updatedMsg;
        }
        return m;
      });
      localStorage.setItem("WAFULA_CHAT_MESSAGES", JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteCommunityMessage = async (id: string) => {
    try {
      const res = await secureApiFetch(`/api/community/messages/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || "Only the message owner or an authorized moderator may delete this message.");
        return;
      }
    } catch {}

    setCommunityMessages((prev) => {
      const updated = prev.filter((m) => m.id !== id && m.parentId !== id);
      localStorage.setItem("WAFULA_CHAT_MESSAGES", JSON.stringify(updated));
      return updated;
    });

    deleteCommunityMessageFromFirestore(id).catch(() => {});
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

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
        <p className="text-xs font-mono uppercase tracking-widest text-slate-400">
          Verifying Session...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthScreen
        onAuthenticated={(user, methodLabel) => {
          setCurrentUser(user);
          localStorage.setItem("WAFULA_CURRENT_USER", JSON.stringify(user));
          setCookie("WAFULA_CURRENT_USER", JSON.stringify(user), 7);
          recordUserSession(user, methodLabel);
        }}
        onDemoFallbackLogin={(user, methodLabel) => {
          setCurrentUser(user);
          localStorage.setItem("WAFULA_CURRENT_USER", JSON.stringify(user));
          setCookie("WAFULA_CURRENT_USER", JSON.stringify(user), 7);
          recordUserSession(user, methodLabel);
        }}
      />
    );
  }

  return (
    <div className={`min-h-screen safe-area-bottom flex flex-col bg-bg-app text-text-primary font-sans selection:bg-orange-100 selection:text-orange-950 transition-colors duration-200 ${sleekMode ? "sleek-mode-active text-sm font-medium tracking-tight" : ""}`}>
      
      {/* Universal navigation layout frame */}
      <Navigation
        currentUser={currentUser}
        currentView={currentView}
        onNavigate={navigateTo}
        onLogIn={handleLogIn}
        onLogOut={handleLogOut}
        onOpenUpgrade={() => setShowUpgradeModal(true)}
        onBack={handlePopBackHistory}
        canGoBack={viewHistory.length > 1}
        books={books}
        savedDocuments={savedDocuments}
        communityMessages={communityMessages}
        globalSettings={globalSettings}
        onUpdateSettings={setGlobalSettings}
        isOnline={effectiveIsOnline}
        broadcastAnnouncement={broadcastAnnouncement}
        isBannerClosed={isBannerClosed}
        onRestoreBanner={() => setIsBannerClosed(false)}
        offlineMode={offlineMode}
        onToggleOfflineMode={handleToggleOfflineMode}
        sleekMode={sleekMode}
        onToggleSleekMode={handleToggleSleekMode}
      />

      {/* Main interactive window viewport */}
      <main className="flex-grow pt-3 md:pt-4 pb-24 lg:pb-14 min-h-[calc(100vh-4rem)] w-full max-w-full overflow-x-hidden flex flex-col safe-area-x">

        {broadcastAnnouncement && !isBannerClosed && (
          <div className="mx-3 sm:mx-4 mb-4 md:mb-6 relative overflow-hidden bg-gradient-to-r from-red-700 via-rose-700 to-amber-600 text-white rounded-2xl p-3 sm:p-4 shadow-md flex items-center justify-between gap-2.5 sm:gap-4 animate-fade-in border border-rose-500/25">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-white/10 p-1.5 sm:p-2 rounded-xl backdrop-blur-md shrink-0 flex items-center justify-center">
                <span className="text-base sm:text-xl">📢</span>
              </div>
              <div className="space-y-0.5 text-left">
                <span className="text-[8px] sm:text-[9px] font-mono font-extrabold uppercase bg-white/20 px-2 py-0.5 rounded-full select-none tracking-wider">Site-Wide Broadcast Announcement</span>
                <p className="text-[11.5px] sm:text-xs md:text-sm font-semibold tracking-wide text-white leading-normal pt-1">{broadcastAnnouncement}</p>
              </div>
            </div>
            <button
              onClick={() => setIsBannerClosed(true)}
              className="p-1 px-1.5 sm:px-2 hover:bg-white/10 rounded-lg text-white font-mono text-[9px] sm:text-[10px] uppercase font-bold transition shrink-0 active:scale-95 border border-white/20 bg-white/5 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            className="w-full h-full flex flex-col flex-grow"
          >
            {currentView === "store" && (
              <Store
                currentUser={currentUser}
                onLogIn={handleLogIn}
                onNavigate={navigateTo}
                books={books}
                onUpdateBookRating={handleUpdateBookRating}
                onPurchaseBook={handlePurchaseBook}
                purchasedBookIds={purchasedBookIds}
                onToggleWishlist={handleToggleWishlist}
                wishlistBookIds={wishlistBookIds}
                onAddNewDocument={handleAddNewDocument}
                bookOrders={bookOrders}
                onQuickSaveToLibrary={handleQuickSaveToLibrary}
                initialBookId={initialBookId}
                onClearInitialBookId={() => setInitialBookId(null)}
              />
            )}

            {currentView === "sermons-motivation" && (
              <SermonsMotivation currentUser={currentUser} />
            )}

            {currentView === "devotional" && (
              <Bible onUnlockBadge={handleUnlockBadge} />
            )}

            {currentView === "school" && (
              <LeadershipSchool
                currentUser={currentUser}
                onLogIn={handleLogIn}
                unlockedBadges={unlockedBadgeIds}
                onUnlockBadge={handleUnlockBadge}
                onNavigate={setCurrentView}
                books={books}
                onAddNewBookDoc={handleAddNewBook}
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

            {currentView === "offline-dictionary" && (
              <OfflineDictionary />
            )}

            {currentView === "companion" && (
              <div className="light-only w-full">
                <AIChat
                  currentUser={currentUser}
                  onUnlockBadge={handleUnlockBadge}
                  isOnline={effectiveIsOnline}
                  sleekMode={sleekMode}
                  onToggleSleekMode={handleToggleSleekMode}
                />
              </div>
            )}

            {currentView === "threed-loft" && (
              <BookThreedViewer
                books={books}
              />
            )}

            {currentView === "announcements" && (
              <Announcements
                currentUser={currentUser}
                onUpdateBroadcastAnnouncement={handleUpdateBroadcastAnnouncement}
                isOnline={isOnline}
              />
            )}

            {currentView === "community" && (
              <Community
                currentUser={currentUser}
                onLogIn={handleLogIn}
                onLogOut={handleLogOut}
                messages={communityMessages}
                onSendMessage={handleSendCommunityMessage}
                onDeleteMessage={handleDeleteCommunityMessage}
                onEditMessage={handleEditCommunityMessage}
                broadcastAnnouncement={broadcastAnnouncement}
                onUpdateBroadcastAnnouncement={handleUpdateBroadcastAnnouncement}
                isLoading={isFetchingCommunity}
                onNavigate={navigateTo}
                initialDmTarget={pendingDmTarget}
                onClearDmTarget={() => setPendingDmTarget(null)}
              />
            )}

            {currentView === "professional" && (
              <ProfessionalHub
                currentUser={currentUser}
                onLogIn={handleLogIn}
                onStartDm={(email, name) => {
                  setPendingDmTarget({ email, name });
                  navigateTo("community");
                }}
              />
            )}

            {currentView === "dashboard" && (
              <div
                id="main_app_dashboard_grid"
                className="w-full"
                style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}
              >
                <Dashboard
                  currentUser={currentUser}
                  onLogIn={handleLogIn}
                  onOpenUpgrade={() => setShowUpgradeModal(true)}
                  books={books}
                  purchasedBookIds={purchasedBookIds}
                  wishlistBookIds={wishlistBookIds}
                  unlockedBadgeIds={unlockedBadgeIds}
                  savedDocuments={savedDocuments}
                  uploadRequests={uploadRequests}
                  communityMessages={communityMessages}
                  onRemoveWishlist={handleToggleWishlist}
                  onAddNewDocument={handleAddNewDocument}
                  isOnline={effectiveIsOnline}
                  onTriggerSync={runBackgroundSync}
                />
              </div>
            )}

            {currentView === "verify" && (
              <CertificateVerificationView 
                onClose={() => setCurrentView("school")}
              />
            )}

            {currentView === "contact" && (
              <Contact onNavigate={navigateTo} />
            )}

            {currentView === "3d-campus" && (
              <div className="mx-auto max-w-7xl w-full px-4 py-6">
                <ZionCampus3DView />
              </div>
            )}

            {currentView === "ai-tutor" && (
              <AITutorStudio
                currentUser={currentUser}
                onLogIn={handleLogIn}
                onSaveToPersonalDocs={handleAddNewDocument}
              />
            )}

            {currentView === "bible-school" && (
              <BibleSchoolEnvironment
                currentUser={currentUser}
                onLogIn={handleLogIn}
                onNavigate={navigateTo}
              />
            )}

            {(currentView === "evangelism-missions" || currentView === "evangelism-forum") && (
              <EvangelismMissionsDashboard
                currentUser={currentUser}
                onLogIn={handleLogIn}
                onNavigate={navigateTo}
                initialTab="meetings"
              />
            )}

            {currentView === "design-system" && (
              <ZionDesignSystemViewer onClose={() => navigateTo("store")} />
            )}

            {currentView === "settings" && (
              <ZionSettingsPanel
                currentUser={currentUser}
                onClose={() => navigateTo("store")}
                isDarkMode={globalSettings.darkMode}
                onToggleDarkMode={() => {
                  const nextDark = !globalSettings.darkMode;
                  setGlobalSettings((prev) => ({ ...prev, darkMode: nextDark }));
                }}
              />
            )}

            {(currentView === "manager-portal" || currentView === "admin") && (
              <ZionAdminPortal
                currentUser={currentUser}
                onBack={() => navigateTo("store")}
                books={books}
                bookOrders={bookOrders}
                uploadRequests={uploadRequests}
                globalSettings={globalSettings}
                onUpdateSettings={setGlobalSettings}
                onUpdateBroadcastAnnouncement={handleUpdateBroadcastAnnouncement}
                onAddNewBookDoc={handleAddNewBook}
                onDeleteBookDoc={handleDeleteBook}
                onApproveBookOrder={handleApproveBookOrder}
                onRejectBookOrder={handleRejectBookOrder}
                onApproveUploadRequest={handleApproveUpload}
                onRejectUploadRequest={handleRejectUpload}
                onNavigate={navigateTo}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer copyright */}
      <footer className="bg-bg-surface border-t border-border-main pt-6 pb-20 lg:pb-6 text-center text-xs text-text-secondary font-mono">
        <div>© 2026 Zion Digital · Read. Lead. Transform. · Bungoma, Kenya.</div>
      </footer>

      {/* Universal Floating Voice Commands Assistant Widget */}
      <div className="fixed bottom-20 left-3 lg:bottom-6 lg:left-6 z-40">
        <div className="flex flex-col items-start space-y-2">
          {voiceNotification && (
            <div className="bg-slate-900 text-white text-[10px] sm:text-xs font-bold py-2 px-3.5 rounded-xl shadow-xl max-w-xs border border-slate-800 animate-bounce">
              {voiceNotification}
            </div>
          )}

          <button
            type="button"
            onClick={() => setVoiceControlActive(!voiceControlActive)}
            className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-full border text-[11px] font-black tracking-wide shadow-lg transition duration-300 hover:scale-105 cursor-pointer select-none ${
              voiceControlActive
                ? "bg-red-650 text-white border-red-700 hover:bg-red-705"
                : "bg-white text-slate-800 border-slate-205 hover:bg-slate-50"
            }`}
          >
            <span className={voiceControlActive ? "animate-ping inline-block h-2 w-2 rounded-full bg-white mr-1" : "inline-block h-2 w-2 rounded-full bg-stone-300 mr-1"} />
            <span>🎙️ {voiceControlActive ? "Voice Commands Active" : "Enable Voice Control"}</span>
          </button>
        </div>
      </div>


      {/* Dynamic Member Authentication Modal popup */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowAuthModal(false)} />
          
          <div className="relative w-full max-w-md bg-stone-900 text-slate-100 rounded-3xl shadow-2xl border border-stone-800 p-8 overflow-hidden animate-in fade-in zoom-in-95 duration-250 select-none">
            {/* Background absolute ambient glows */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-36 h-36 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-36 h-36 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

            {/* Design header */}
            <div className="flex items-center justify-between border-b border-stone-800 pb-5 mb-5 relative z-10">
              <div className="flex items-center space-x-3.5 text-left">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-extrabold shadow-lg shadow-blue-900/30 font-display text-lg select-none">
                  Z
                </div>
                <div>
                  <h3 className="font-display font-black text-white text-base tracking-tight">Zion Digital Gateway</h3>
                  <p className="text-[10px] text-stone-400 font-mono tracking-wider uppercase">Bungoma Shared Academic Ledger</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAuthModal(false)} 
                className="text-stone-400 hover:text-white transition p-1.5 rounded-lg hover:bg-stone-800"
              >
                ✕
              </button>
            </div>

            {/* Selector Tabs (Login vs Register) */}
            <div className="flex bg-stone-950/60 p-1 rounded-xl border border-stone-800/80 mb-5 relative z-10 text-xs font-bold text-stone-400">
              <button
                type="button"
                onClick={() => { setAuthMode("login"); setAuthError(""); }}
                className={`flex-1 py-2 rounded-lg text-center transition-all ${
                  authMode === "login" 
                    ? "bg-stone-800 text-white shadow-xs" 
                    : "hover:text-stone-200"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode("register"); setAuthError(""); }}
                className={`flex-1 py-2 rounded-lg text-center transition-all ${
                  authMode === "register" 
                    ? "bg-stone-800 text-white shadow-xs" 
                    : "hover:text-stone-200"
                }`}
              >
                Register
              </button>
            </div>

            {/* Quick Demo Pre-fill Action (Only for Login) */}
            {authMode === "login" && (
              <div className="mb-5 bg-stone-950/40 border border-stone-800/80 p-4 rounded-2xl text-left relative z-10">
                <span className="text-[9px] font-black text-amber-500 uppercase block tracking-wider font-mono">⚡ QUICK DEMO AUTO-FILL</span>
                <p className="text-[10.5px] text-stone-400 mt-1 leading-relaxed">
                  Click below to instantly populate secure credentials for testing purposes:
                </p>
                <div className="flex gap-2 mt-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthEmail("member75@mail.com");
                      setAuthPassword("password");
                      setAuthError("");
                    }}
                    className="bg-stone-800 hover:bg-stone-750 border border-stone-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition active:scale-95"
                  >
                    Load General Member Demo
                  </button>
                </div>
              </div>
            )}

            {/* Sign in with Google button */}
            <button
              type="button"
              onClick={handleGoogleMockLogin}
              className="w-full mb-5 py-2.5 px-4 border border-stone-700 rounded-xl text-xs font-bold text-stone-100 bg-stone-950/60 hover:bg-stone-950 transition flex items-center justify-center space-x-2.5 relative z-10 cursor-pointer active:scale-98"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="relative flex items-center justify-center my-4 relative z-10">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-stone-800" /></div>
              <span className="relative bg-stone-900 px-3 font-mono text-[8.5px] uppercase font-black text-stone-550 text-stone-500 tracking-wider">OR EMAIL ACCESS</span>
            </div>

            {/* Main Form */}
            <form onSubmit={handleProcessSubmitAuth} className="space-y-4.5 text-xs text-left relative z-10">
              {authError && (
                <div className="bg-rose-950/20 border border-rose-900/50 text-rose-300 p-3 rounded-xl font-bold text-[11px] leading-relaxed">
                  ⚠️ {authError}
                </div>
              )}

              {authMode === "register" && (
                <div className="space-y-1.5">
                  <label className="block text-stone-400 font-bold uppercase tracking-wider text-[9px] font-mono">Full Name</label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Kelvin Wafula"
                    className="w-full rounded-xl border border-stone-800 bg-stone-950/55 p-3 font-semibold text-white placeholder-stone-650 outline-none focus:border-blue-600 transition"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-stone-400 font-bold uppercase tracking-wider text-[9px] font-mono">Email Reference</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="e.g. member@wafula.com"
                  className="w-full rounded-xl border border-stone-800 bg-stone-950/55 p-3 font-semibold text-white placeholder-stone-650 outline-none focus:border-blue-600 transition"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-stone-400 font-bold uppercase tracking-wider text-[9px] font-mono">Secure Passphrase</label>
                  {authMode === "login" && (
                    <button
                      type="button"
                      onClick={handlePasswordReset}
                      className="text-[10px] font-bold text-blue-400 hover:text-blue-300 hover:underline transition cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Minimum 4 characters"
                  className="w-full rounded-xl border border-stone-800 bg-stone-950/55 p-3 font-semibold text-white placeholder-stone-650 outline-none focus:border-blue-600 transition"
                />
              </div>

              {authMode === "register" && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-stone-400 font-bold">
                    <label className="uppercase tracking-wider text-[9px] font-mono">Daily Reading Goal</label>
                    <span className="text-blue-400 font-mono font-black">{regGoal} Minutes</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="180"
                    step="5"
                    value={regGoal}
                    onChange={(e) => setRegGoal(Number(e.target.value))}
                    className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              )}

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="flex-1 rounded-xl border border-stone-800 font-bold py-3 hover:bg-stone-850 text-stone-300 transition-all text-center cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 tracking-wide shadow-lg shadow-blue-900/30 transition-all text-center cursor-pointer active:scale-95"
                >
                  {authMode === "register" ? "Create Account" : "Access Hub"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Paystack KES & M-Pesa Upgrade / Top-Up Modal */}
      {currentUser && (
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          currentUser={currentUser}
          onSubscriptionUpdated={(updates) => {
            setCurrentUser((prev) => {
              if (!prev) return prev;
              const next = { ...prev, ...updates };
              localStorage.setItem("WAFULA_CURRENT_USER", JSON.stringify(next));
              setCookie("WAFULA_CURRENT_USER", JSON.stringify(next), 7);
              return next;
            });
          }}
        />
      )}
    </div>
  );
}
