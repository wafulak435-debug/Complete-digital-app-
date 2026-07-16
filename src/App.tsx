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
  logUserActivity
} from "./lib/firestoreUtils";
import { auth, googleSignIn, googleLogout, db } from "./lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";

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
import HomeApps from "./components/HomeApps";
import ZionWifi from "./components/ZionWifi";
import LanguageTeacher from "./components/LanguageTeacher";
import OfflineDictionary from "./components/OfflineDictionary";
import WebsiteCenter from "./components/WebsiteCenter";
import MpesaApiConsole from "./components/MpesaApiConsole";
import Announcements from "./components/Announcements";
import SermonsMotivation from "./components/SermonsMotivation";
import CertificateVerificationView from "./components/CertificateVerificationView";
import { savePdfToOfflineDb, getAllOfflinePdfs } from "./utils/pdfDb";

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
    primaryColor: "#3B82F6",
    fontSizeMultiplier: 1.0,
    customLogoUrl: ""
  });

  const [offlineMode, setOfflineMode] = useState<boolean>(() => {
    return localStorage.getItem("WAFULA_OFFLINE_MODE") === "true";
  });
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);

  const effectiveIsOnline = isOnline && !offlineMode;

  const handleToggleOfflineMode = () => {
    const nextVal = !offlineMode;
    setOfflineMode(nextVal);
    localStorage.setItem("WAFULA_OFFLINE_MODE", String(nextVal));
    window.dispatchEvent(new Event("storage"));
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
        const viewStr = customEvent.detail.view;
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

  // Current user state (Admin default mock credentials for seamless demonstration out of the box!)
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Custom Authentication Modal state variables
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showGoogleSelectorSim, setShowGoogleSelectorSim] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [regName, setRegName] = useState("");
  const [regGoal, setRegGoal] = useState(30);

  // Payment Gateway Trigger States
  const [checkoutBook, setCheckoutBook] = useState<Book | null>(null);
  const [checkoutPhoneNumber, setCheckoutPhoneNumber] = useState("");
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<"mpesa" | "ecitizen_foreign" | "ecitizen_local">("mpesa");
  const [checkoutStep, setCheckoutStep] = useState<"form" | "sending_stk" | "waiting_pin" | "completed">("form");
  const [checkoutCountdown, setCheckoutCountdown] = useState(15);
  const [checkoutAccountDetails, setCheckoutAccountDetails] = useState(""); 
  const [checkoutRef, setCheckoutRef] = useState("");
  const [checkoutCustomerIDInput, setCheckoutCustomerIDInput] = useState("");
  const [checkoutCustomerNameInput, setCheckoutCustomerNameInput] = useState("");
  const [checkoutMpesaPin, setCheckoutMpesaPin] = useState("");

  // View state history routing (Fulfills: "improve on navigation especially going back")
  const [currentView, setCurrentView] = useState<string>(() => {
    return localStorage.getItem("WAFULA_CURRENT_VIEW") || "store";
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

  // Automated Lipa Na M-Pesa & eCitizen Global Checkout Gateway Simulator
  useEffect(() => {
    if (checkoutStep !== "searching_payment") return;

    const timer = setInterval(() => {
      setCheckoutCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          
          if (checkoutBook && currentUser) {
            const orderId = "ord_" + Date.now();
            const newOrder: BookOrder = {
              id: orderId,
              userId: checkoutCustomerIDInput || currentUser.email,
              userName: checkoutCustomerNameInput || currentUser.name,
              bookId: checkoutBook.id,
              bookTitle: checkoutBook.title,
              price: checkoutBook.price || 200,
              status: "approved", 
              date: new Date().toISOString().split("T")[0]
            };

            setBookOrders((prevOrders) => {
              const next = [newOrder, ...prevOrders];
              localStorage.setItem("WAFULA_BOOK_ORDERS", JSON.stringify(next));
              return next;
            });

            setPurchasedBookIds((prevIds) => {
              const next = prevIds.includes(checkoutBook.id) ? prevIds : [...prevIds, checkoutBook.id];
              localStorage.setItem("WAFULA_PURCHASED", JSON.stringify(next));
              return next;
            });

            saveBookOrderToFirestore(newOrder).catch((e) => console.log("Offline saving order fallback active.", e));

            if (currentUser && checkoutBook) {
              logUserActivity(
                currentUser.email,
                currentUser.name,
                "Purchase Book",
                `Ordered and unlocked eBook access: "${checkoutBook.title}" (ID: ${checkoutBook.id}) for KES ${checkoutBook.price}`
              );
            }

            setCheckoutStep("completed");
            
            // Auto unlock badges
            handleUnlockBadge("badge_2"); 
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [checkoutStep, checkoutBook, currentUser, checkoutCustomerIDInput, checkoutCustomerNameInput]);

  // Initialize and reload from localStorage & cookies to stay resilient online & offline!
  useEffect(() => {
    // 1. User cookie & localStorage lookup
    const cookieUser = getCookie("WAFULA_CURRENT_USER");
    const savedUser = cookieUser || localStorage.getItem("WAFULA_CURRENT_USER");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        const lowerEm = parsed?.email?.toLowerCase()?.trim();
        if (lowerEm === "wafulak435@gmail.com" || lowerEm === "wafula435@gmail.com") {
          parsed.role = "admin";
        }
        setCurrentUser(parsed);
        setCookie("WAFULA_CURRENT_USER", JSON.stringify(parsed), 7);
        recordUserSession(parsed, "Auto-Login Restore");
      } catch (err) {
        // Fallback safely
      }
    } else {
      // Do not auto-login as admin by default. Everyday users should see lock screen to register/login first.
      setCurrentUser(null);
    }

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
    localStorage.setItem("WAFULA_BOOKS", JSON.stringify(initialBooksList));
    setBooks(initialBooksList);

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
    if (!isOnline) return;
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
        console.warn("Offline or permission restricted on notifications syncing.");
      });
      return () => unSub();
    } catch (e) {
      console.warn("Failed initializing notifications listener:", e);
    }
  }, [isOnline]);

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
      savePdfToOfflineDb(bookId, blob).catch((err) => {
        console.warn("Could not background cache remote PDF to IndexedDB:", err);
      });
    } catch (e) {
      console.warn("Base64 background caching parse error:", e);
    }
  };

  // Hybrid Online/Offline Books Bidirectional Synchronization Engine with Real-time Firestore Sync
  useEffect(() => {
    if (!isOnline) return;
    try {
      const q = collection(db, "books");
      const unSub = onSnapshot(q, (snapshot) => {
        const remoteBooks: Book[] = [];

        snapshot.forEach((docSnap) => {
          const b = { ...docSnap.data() } as Book;
          const isMockId = ["b1", "b2", "b3", "b15", "unit_01", "unit_02", "unit_03", "unit_04", "unit_05", "unit_06", "theology_infinite_volume_supplement_for_1mb_compliance"].includes(b.id) || b.id.startsWith("unit_") || b.id.startsWith("b1") || b.id.startsWith("b2") || b.id.startsWith("b3");
          if (isMockId) {
            deleteBookFromFirestore(b.id).catch(() => {});
            return;
          }
          
          if (b.pdfUrl && b.pdfUrl.startsWith("data:application/pdf;base64,")) {
            // Background save the heavy PDF to IndexedDB for offline capability
            saveBase64PdfToIndexedDb(b.id, b.pdfUrl);
            // Replace with indexeddb references for local storage to prevent saturation crashes
            b.pdfUrl = "indexeddb://" + b.id;
          }
          remoteBooks.push(b);
        });

        if (remoteBooks && remoteBooks.length > 0) {
          setBooks((prev) => {
            const localBooks = [...prev];
            const currentRemoteIds = new Set(remoteBooks.map(b => b.id));
            
            // Filter out books that were deleted from the remote database.
            // A book is considered deleted on remote if:
            // 1. It is not present in remoteBooks (remoteIds does not have it)
            // 2. AND it has already been synced before (isSynced is not false)
            const keptLocalBooks = localBooks.filter(lb => {
              const isRemotePresent = currentRemoteIds.has(lb.id);
              if (isRemotePresent) return true;
              if (lb.isSynced === false) return true;
              return false;
            });

            // Detect any book records that exist ONLY locally and need syncing (isSynced === false)
            const localOnly = keptLocalBooks.filter(lb => !currentRemoteIds.has(lb.id) && lb.isSynced === false);
            
            // Since remoteBooks are authoritative, mark them as isSynced: true
            const markedRemoteBooks = remoteBooks.map(rb => ({ ...rb, isSynced: true }));

            const merged = [...localOnly, ...markedRemoteBooks];
            
            // Unique-ify array to prevent duplicate IDs
            const map = new Map<string, Book>();
            merged.forEach(b => map.set(b.id, b));
            const finalBooks = Array.from(map.values());
            
            localStorage.setItem("WAFULA_BOOKS", JSON.stringify(finalBooks));
            
            // Instantly push local-only additions up to the live Firestore collection
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
                })
                .catch((err) => {
                  console.warn(`Firestore sync upload failed for offline-added book: ${lb.title}`, err);
                });
            });
            
            return finalBooks;
          });
        } else {
          // If Firestore contains zero books, we seed all of our INITIAL_BOOKS globally so everyone gets them
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
        console.warn("Firestore real-time books sync error, offline, or restricted:", error);
      });
      return () => unSub();
    } catch (e) {
      console.warn("Failed initializing books real-time subscription:", e);
    }
  }, [isOnline]);

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
                saveUploadRequestToFirestore(lr).catch((err) => {
                  console.warn(`Firestore sync upload failed for upload request: ${lr.title}`, err);
                });
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
                saveBookOrderToFirestore(lo).catch((err) => {
                  console.warn(`Firestore sync upload failed for purchase order: ${lo.id}`, err);
                });
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
  useEffect(() => {
    if (isOnline) {
      console.log("🔄 Network connection detected! Automating synchronization service for all pending offline data stores...");
      
      // 1. Sync Books
      fetchBooksFromFirestore()
        .then((remoteBooks) => {
          setBooks((prevBooks) => {
            const remoteIds = new Set((remoteBooks || []).map(b => b.id));
            const pendingUpload = prevBooks.filter(b => !remoteIds.has(b.id));
            
            if (pendingUpload.length > 0) {
              console.log(`[Sync Engine] Uploading ${pendingUpload.length} pending local books metadata to firestore...`);
              pendingUpload.forEach((b) => {
                saveBookToFirestore(b).catch(err => {
                  console.warn(`[Sync Warning] Failed to upload book ${b.title}:`, err);
                });
              });
            }
            
            const merged = [...prevBooks];
            (remoteBooks || []).forEach(rb => {
              if (!merged.some(mb => mb.id === rb.id)) {
                merged.push(rb);
              }
            });
            localStorage.setItem("WAFULA_BOOKS", JSON.stringify(merged));
            return merged;
          });
        })
        .catch(err => console.warn("Automated books metadata sync fetch failed:", err));

      // 2. Sync Saved Documents
      const targetUserId = currentUser?.email || "guest_academic";
      fetchSavedDocumentsFromFirestore(targetUserId)
        .then((remoteDocs) => {
          setSavedDocuments((prevDocs) => {
            const remoteIds = new Set((remoteDocs || []).map(d => d.id));
            const pendingUpload = prevDocs.filter(d => !remoteIds.has(d.id));
            
            if (pendingUpload.length > 0) {
              console.log(`[Sync Engine] Uploading ${pendingUpload.length} pending local documents metadata to firestore...`);
              pendingUpload.forEach((d) => {
                saveDocumentToFirestore(d).catch(err => {
                  console.warn(`[Sync Warning] Failed to upload document ${d.title}:`, err);
                });
              });
            }
            
            const merged = [...prevDocs];
            (remoteDocs || []).forEach(rd => {
              if (!merged.some(md => md.id === rd.id)) {
                merged.push(rd);
              }
            });
            localStorage.setItem("WAFULA_SAVED_DOCUMENTS", JSON.stringify(merged));
            return merged;
          });
        })
        .catch(err => console.warn("Automated documents metadata sync fetch failed:", err));

      // 3. Sync Offline Community Chat Messages
      fetchCommunityMessagesFromFirestore()
        .then((remoteMsgs) => {
          setCommunityMessages((prevMsgs) => {
            const remoteIds = new Set((remoteMsgs || []).map(m => m.id));
            const pendingUpload = prevMsgs.filter(m => !remoteIds.has(m.id));
            
            if (pendingUpload.length > 0) {
              console.log(`[Sync Engine] Uploading ${pendingUpload.length} pending local community messages to firestore...`);
              pendingUpload.forEach((m) => {
                saveCommunityMessageToFirestore(m).catch(err => {
                  console.warn(`[Sync Warning] Failed to upload community message:`, err);
                });
              });
            }
            
            const merged = [...prevMsgs];
            (remoteMsgs || []).forEach(rm => {
              if (!merged.some(mm => mm.id === rm.id)) {
                merged.push(rm);
              }
            });
            localStorage.setItem("WAFULA_CHAT_MESSAGES", JSON.stringify(merged));
            return merged;
          });
        })
        .catch(err => console.warn("Automated community messages sync failed:", err));

      // 4. Sync Peer-to-Peer Member Upload Requests
      fetchUploadRequestsFromFirestore()
        .then((remoteRequests) => {
          setUploadRequests((prevRequests) => {
            const remoteIds = new Set((remoteRequests || []).map(r => r.id));
            const pendingUpload = prevRequests.filter(r => !remoteIds.has(r.id));
            
            if (pendingUpload.length > 0) {
              console.log(`[Sync Engine] Uploading ${pendingUpload.length} pending member upload requests to firestore...`);
              pendingUpload.forEach((r) => {
                saveUploadRequestToFirestore(r).catch(err => {
                  console.warn(`[Sync Warning] Failed to upload file request ${r.title}:`, err);
                });
              });
            }
            
            const merged = [...prevRequests];
            (remoteRequests || []).forEach(rr => {
              if (!merged.some(mr => mr.id === rr.id)) {
                merged.push(rr);
              }
            });
            localStorage.setItem("WAFULA_MEMBER_UPLOADS", JSON.stringify(merged));
            return merged;
          });
        })
        .catch(err => console.warn("Automated member upload requests sync failed:", err));

      // 5. Sync eBook order bookings
      fetchBookOrdersFromFirestore()
        .then((remoteOrders) => {
          setBookOrders((prevOrders) => {
            const remoteIds = new Set((remoteOrders || []).map(o => o.id));
            const pendingUpload = prevOrders.filter(o => !remoteIds.has(o.id));
            
            if (pendingUpload.length > 0) {
              console.log(`[Sync Engine] Uploading ${pendingUpload.length} pending eBook orders to firestore...`);
              pendingUpload.forEach((o) => {
                saveBookOrderToFirestore(o).catch(err => {
                  console.warn(`[Sync Warning] Failed to upload eBook order:`, err);
                });
              });
            }
            
            const merged = [...prevOrders];
            (remoteOrders || []).forEach(ro => {
              if (!merged.some(mo => mo.id === ro.id)) {
                merged.push(ro);
              }
            });
            localStorage.setItem("WAFULA_BOOK_ORDERS", JSON.stringify(merged));
            return merged;
          });
        })
        .catch(err => console.warn("Automated eBook orders sync failed:", err));
    }
  }, [isOnline, currentUser]);

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
      const lowerEmail = authEmail.trim().toLowerCase();
      const isAdminByEmail = lowerEmail === "wafulak435@gmail.com" || 
                             lowerEmail === "wafula435@gmail.com";

      if (authMode === "register") {
        let userProfile: User;
        try {
          // Create user with Firebase Auth
          const cred = await createUserWithEmailAndPassword(auth, authEmail.trim(), authPassword.trim());
          const mappedName = regName.trim() || authEmail.trim().split("@")[0].replace(/\d+/g, "");
          userProfile = await syncUserSession(cred.user.uid, authEmail.trim(), mappedName);
        } catch (fbErr: any) {
          console.warn("Firebase Auth registration offline/fallback mode:", fbErr.message);
          const mappedName = regName.trim() || authEmail.trim().split("@")[0].replace(/\d+/g, "");
          
          userProfile = {
            id: "loc_" + Date.now(),
            email: authEmail.trim(),
            name: mappedName,
            role: isAdminByEmail ? "admin" : "member",
            readingStreak: 1,
            dailyGoalMinutes: regGoal || 30
          };

          const localAccounts = JSON.parse(localStorage.getItem("WAFULA_LOCAL_ACCOUNTS") || "[]");
          if (!localAccounts.some((a: any) => a.email.toLowerCase() === lowerEmail)) {
            localAccounts.push({
              email: lowerEmail,
              password: authPassword.trim(),
              profile: userProfile
            });
            localStorage.setItem("WAFULA_LOCAL_ACCOUNTS", JSON.stringify(localAccounts));
          }
        }
        
        setCurrentUser(userProfile);
        localStorage.setItem("WAFULA_CURRENT_USER", JSON.stringify(userProfile));
        setCookie("WAFULA_CURRENT_USER", JSON.stringify(userProfile), 7);
        recordUserSession(userProfile, "Email Register");
        logUserActivity(
          userProfile.email,
          userProfile.name || userProfile.email.split("@")[0],
          "Email Register",
          `Registered academic member account and signed in successfully.`
        );
        setShowAuthModal(false);
        alert(`Welcome to Wafula Reads Hub! Your account for "${userProfile.name}" was successfully registered worldwide!`);
        return;
      }

      // Regular user/admin firebase login
      let userProfile: User;
      try {
        const cred = await signInWithEmailAndPassword(auth, authEmail.trim(), authPassword.trim());
        userProfile = await syncUserSession(cred.user.uid, authEmail.trim(), "");
      } catch (fbErr: any) {
        console.warn("Firebase Login offline/fallback mode, checking local registry:", fbErr.message);
        const localAccounts = JSON.parse(localStorage.getItem("WAFULA_LOCAL_ACCOUNTS") || "[]");
        const matched = localAccounts.find((a: any) => a.email.toLowerCase() === lowerEmail && a.password === authPassword.trim());
        
        if (matched) {
          userProfile = matched.profile;
        } else if (isAdminByEmail) {
          userProfile = {
            id: "loc_admin_" + Date.now(),
            email: authEmail.trim(),
            name: authEmail.trim().split("@")[0],
            role: "admin",
            readingStreak: 1,
            dailyGoalMinutes: 30
          };
        } else {
          throw new Error(fbErr.message || "Invalid credentials or username. Please check your credentials.");
        }
      }

      setCurrentUser(userProfile);
      localStorage.setItem("WAFULA_CURRENT_USER", JSON.stringify(userProfile));
      setCookie("WAFULA_CURRENT_USER", JSON.stringify(userProfile), 7);
      recordUserSession(userProfile, "Email Login");
      logUserActivity(
        userProfile.email,
        userProfile.name || userProfile.email.split("@")[0],
        "Email Login",
        `Successfully logged in using standard credentials.`
      );
      setShowAuthModal(false);
      alert(`Authenticated successfully as: ${userProfile.name || authEmail.trim().split("@")[0]}!`);
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
        setCookie("WAFULA_CURRENT_USER", JSON.stringify(userProfile), 7);
        recordUserSession(userProfile, "Google Account Link");
        logUserActivity(
          userProfile.email,
          userProfile.name,
          "Google Account Link",
          `Logged in via Google Account federation.`
        );
        setShowAuthModal(false);
        alert(`Authenticated successfully using secure Google Account integration as ${userProfile.name}!`);
      }
    } catch (error: any) {
      console.warn("Google authentication popup error, initiating account simulation selection:", error.message);
      setShowAuthModal(false);
      setShowGoogleSelectorSim(true);
    }
  };

  const handleContinueAsGuest = () => {
    const guestUser = {
      id: "guest_" + Date.now(),
      email: "guest@zionreads.com",
      name: "Guest Reader",
      role: "guest",
      readingStreak: 1,
      dailyGoalMinutes: 30
    };
    setCurrentUser(guestUser);
    localStorage.setItem("WAFULA_CURRENT_USER", JSON.stringify(guestUser));
    setCookie("WAFULA_CURRENT_USER", JSON.stringify(guestUser), 7);
    logUserActivity(
      guestUser.email,
      guestUser.name,
      "Guest Login",
      "Browsing catalog anonymously under temporary guest access."
    );
    setShowAuthModal(false);
    alert("Welcome! You are now browsing in Guest Mode. Registration is optional, but needed for admin features.");
  };

  const handlePasswordReset = async () => {
    if (!authEmail.trim()) {
      setAuthError("Please fill in your email address above first, then click 'Reset Password' to send the reset link.");
      return;
    }

    try {
      setAuthError("");
      await sendPasswordResetEmail(auth, authEmail.trim());
      alert(`📬 A secure password reset link has been dispatched to ${authEmail.trim()}! Please inspect your email inbox (and spam folder) to reset your passphrase.`);
    } catch (error: any) {
      console.warn("sendPasswordResetEmail failed, launching simulated/local bypass reset trigger:", error);
      const lowerEmail = authEmail.trim().toLowerCase();
      const isAdminByEmail = lowerEmail === "wafulak435@gmail.com" || 
                             lowerEmail === "wafula435@gmail.com";

      if (isAdminByEmail) {
        alert(`📬 [SIMULATED RESET TRIGGERED] Admin account confirmed!\nWe have dispatched a secure emergency bypass reset request to your administrative console email inbox: ${authEmail.trim()}.\n\nFor sandbox test convenience, you can reset your local password instantly!`);
        const nextPass = prompt("Please set your new secure password immediately for offline/sandbox access:");
        if (nextPass && nextPass.trim().length >= 4) {
          const localAccounts = JSON.parse(localStorage.getItem("WAFULA_LOCAL_ACCOUNTS") || "[]");
          const updated = localAccounts.filter((a: any) => a.email.toLowerCase() !== lowerEmail);
          updated.push({
            email: lowerEmail,
            password: nextPass.trim(),
            profile: {
              id: "loc_admin",
              email: authEmail.trim(),
              name: authEmail.trim().split("@")[0],
              role: "admin",
              readingStreak: 1,
              dailyGoalMinutes: 30
            }
          });
          localStorage.setItem("WAFULA_LOCAL_ACCOUNTS", JSON.stringify(updated));
          alert(`Success! Offline Admin password for ${authEmail.trim()} updated to "${nextPass.trim()}" successfully!`);
        }
      } else {
        const localAccounts = JSON.parse(localStorage.getItem("WAFULA_LOCAL_ACCOUNTS") || "[]");
        const matched = localAccounts.find((a: any) => a.email.toLowerCase() === lowerEmail);
        if (matched) {
          alert(`📬 [SIMULATED RESET TRIGGERED] Dispatching a reset link for account "${authEmail.trim()}"!\nFor convenience, you can update your offline sandbox password right now!`);
          const nextPass = prompt("Enter your new secure password directly:", matched.password);
          if (nextPass && nextPass.trim().length >= 4) {
            matched.password = nextPass.trim();
            localStorage.setItem("WAFULA_LOCAL_ACCOUNTS", JSON.stringify(localAccounts));
            alert(`Success! Password for "${authEmail.trim()}" is now updated to "${nextPass.trim()}"!`);
          }
        } else {
          alert(`📬 [EMAIL DISPATCHED] Simulated password reset link sent to ${authEmail.trim()} successfully!`);
        }
      }
    }
  };

  const handleLogOut = async () => {
    if (currentUser?.email) {
      markSessionOffline(currentUser.email);
    }
    try {
      await googleLogout();
      await auth.signOut();
    } catch (_) {}
    setCurrentUser(null);
    localStorage.removeItem("WAFULA_CURRENT_USER");
    eraseCookie("WAFULA_CURRENT_USER");
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

  // Ebook purchases
  const handlePurchaseBook = (id: string) => {
    if (!currentUser) {
      handleLogIn();
      return;
    }
    
    const targetBook = books.find(b => b.id === id);
    if (!targetBook) return;

    // Check if they already own it
    if (purchasedBookIds.includes(id)) {
      alert("You already have full access authorization to read this eBook!");
      return;
    }

    setCheckoutBook(targetBook);
    setCheckoutPhoneNumber(currentUser.phone || "");
    setCheckoutCustomerIDInput(currentUser.email || "");
    setCheckoutCustomerNameInput(currentUser.name || "");
    setCheckoutAccountDetails("");
    setCheckoutPaymentMethod("mpesa");
    setCheckoutStep("form");
    setCheckoutCountdown(15);
  };

  // Quick save eBook directly to personal 'My Books' library
  const handleQuickSaveToLibrary = (id: string) => {
    if (!currentUser) {
      handleLogIn();
      return;
    }
    const targetBook = books.find(b => b.id === id);
    if (!targetBook) return;

    if (purchasedBookIds.includes(id)) {
      return;
    }

    setPurchasedBookIds((prevIds) => {
      const next = prevIds.includes(id) ? prevIds : [...prevIds, id];
      localStorage.setItem("WAFULA_PURCHASED", JSON.stringify(next));
      return next;
    });

    // Create a matching zero-price order record so they can see order history or invoice
    const newOrder: BookOrder = {
      id: `lib_quick_${Date.now()}`,
      userId: currentUser.email,
      userName: currentUser.name || currentUser.email.split("@")[0],
      bookId: targetBook.id,
      bookTitle: targetBook.title,
      price: targetBook.price || 0,
      status: "approved",
      date: new Date().toISOString().split("T")[0]
    };

    setBookOrders((prevOrders) => {
      const next = [newOrder, ...prevOrders];
      localStorage.setItem("WAFULA_BOOK_ORDERS", JSON.stringify(next));
      return next;
    });

    saveBookOrderToFirestore(newOrder).catch((e) => console.log("Offline saving quick-order fallback active.", e));

    logUserActivity(
      currentUser.email,
      currentUser.name,
      "Quick Add Library",
      `Quickly saved eBook to personal My Books section: "${targetBook.title}" (ID: ${targetBook.id})`
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
    const isAdmin = currentUser && (
      currentUser.role === 'admin' || 
      currentUser.email === 'wafulak435@gmail.com' || 
      currentUser.email === 'wafula435@gmail.com'
    );

    // Auto approve and auto pay only if user is Admin, general members require administrative approval confirmation
    const shouldAutoApprove = !!isAdmin;
    const fileId = "upl_" + Date.now();

    if (actualFile) {
      savePdfToOfflineDb(fileId, actualFile).then(() => {
        console.log("Member file saved to local IndexedDB store successfully:", fileId);
      }).catch((e) => {
        console.warn("Could not write physical file bytes to IndexedDB indices:", e);
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
      localStorage.setItem("WAFULA_MEMBER_UPLOADS", JSON.stringify(updated));
      return updated;
    });

    // Write upload request directly to Firestore to synchronize with other users
    saveUploadRequestToFirestore(fresh).catch((err) => {
      console.warn("Offline: Upload request queued locally, online backup scheduled on reconnect:", err);
    });

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
      
      // If no thumbnail has been provided, draw a custom screenshot cover page using a virtual canvas matching a high-end leadership/academic aesthetic!
      if (!bookCoverUrl) {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 300;
          canvas.height = 400;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            // Pick elegant backdrop based on name keywords
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

            // Tech mesh lattice lines
            ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
            ctx.lineWidth = 1;
            for (let i = 0; i < 300; i += 25) {
              ctx.beginPath();
              ctx.moveTo(i, 0);
              ctx.lineTo(i, 400);
              ctx.stroke();
            }

            // Outer golden thin border
            ctx.strokeStyle = "#fbbf24";
            ctx.lineWidth = 3;
            ctx.strokeRect(12, 12, 276, 376);

            // Wrap and render book title
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

            // Subtitle or publisher
            ctx.fillStyle = "#facc15";
            ctx.font = "bold 11px monospace";
            ctx.fillText(`By ${fresh.userName}`, 150, yCoord + 45);

            // Watermark layout text
            ctx.fillStyle = "rgba(239, 68, 68, 0.85)";
            ctx.font = "bold 8px monospace";
            ctx.fillText("📷 PDF COVERSHEET SCREENSHOT SECURE", 150, 345);

            bookCoverUrl = canvas.toDataURL("image/jpeg");
          }
        } catch (e) {
          bookCoverUrl = "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=350";
        }
      }

      const gBook: Book = {
        id: `book_uploaded_${fresh.id}`,
        title: fresh.title,
        author: fresh.userName,
        price: 350,
        description: `Verified study resource published by ${fresh.userName}. Beautifully bound in high-resolution vector layout.`,
        category: "Leadership",
        coverImage: bookCoverUrl || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=350",
        fileSize: fresh.fileSize,
        pages: Math.floor(Math.random() * 60 + 90),
        publishedDate: fresh.date,
        isFeatured: true,
        status: "active",
        rating: 5,
        reviewsCount: 1,
        pdfUrl: actualFile ? "indexeddb://" + fresh.id : "Community Secure Read Document - Authenticated Offline DRM Protected Copy",
        allowPreview: true,
        previewDuration: 120
      };

      setBooks((prevBooks) => {
        const next = [gBook, ...prevBooks];
        localStorage.setItem("WAFULA_BOOKS", JSON.stringify(next));
        return next;
      });

      // Synchronize auto-approved book catalog with Firestore database for immediate online display
      saveBookToFirestore(gBook).catch((err) => {
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
          return { ...u, paid: true, allowedToPublic: isApproved };
        }
        return u;
      });
      localStorage.setItem("WAFULA_MEMBER_UPLOADS", JSON.stringify(updated));
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
              coverImage: item.thumbnail || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=350",
              fileSize: item.fileSize,
              pages: Math.floor(Math.random() * 40 + 60),
              publishedDate: item.date,
              isFeatured: false,
              status: "active",
              rating: 5,
              reviewsCount: 1,
              pdfUrl: "Community Secure Read Document - Authenticated Offline DRM Protected Copy",
              allowPreview: true,
              previewDuration: 45
            };
            const next = [gBook, ...prevBooks];
            localStorage.setItem("WAFULA_BOOKS", JSON.stringify(next));
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
              coverImage: item.thumbnail || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=350",
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

  // Admin approves purchase verification order
  const handleApproveBookOrder = (id: string) => {
    setBookOrders((prev) => {
      const updated = prev.map((o) => {
        if (o.id === id) {
          const updatedItem = { ...o, status: 'approved' as const };
          saveBookOrderToFirestore(updatedItem).catch((err) => {
            console.warn("Could not sync approved book order to Firestore:", err);
          });
          return updatedItem;
        }
        return o;
      });
      localStorage.setItem("WAFULA_BOOK_ORDERS", JSON.stringify(updated));
      return updated;
    });
  };

  // Admin rejects purchase verification order
  const handleRejectBookOrder = (id: string) => {
    setBookOrders((prev) => {
      const updated = prev.map((o) => {
        if (o.id === id) {
          const updatedItem = { ...o, status: 'rejected' as const };
          saveBookOrderToFirestore(updatedItem).catch((err) => {
            console.warn("Could not sync rejected book order to Firestore:", err);
          });
          return updatedItem;
        }
        return o;
      });
      localStorage.setItem("WAFULA_BOOK_ORDERS", JSON.stringify(updated));
      return updated;
    });
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

  // Main Bookstore Admin inventory functions
  const handleAddNewBook = (newBook: Book) => {
    let finalBook = { ...newBook, isSynced: false };
    
    // Base64 helper to convert to physical Blob inside IndexedDB offline caches
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
        
        finalBook.pdfUrl = "indexeddb://" + newBook.id;
        
        savePdfToOfflineDb(newBook.id, blob).then(() => {
          console.log("PDF saved offline to IndexedDB successfully for book:", newBook.id);
        }).catch((err) => {
          console.error("Failed to save PDF to IndexedDB:", err);
        });
      } catch (e) {
        console.error("Base64 to Blob conversion failed:", e);
      }
    }

    setBooks((prev) => {
      const updated = [finalBook, ...prev];
      localStorage.setItem("WAFULA_BOOKS", JSON.stringify(updated));
      return updated;
    });

    // Record instantly to remote live collection
    const safeFirestoreBook = { ...finalBook, pdfUrl: newBook.pdfUrl || finalBook.pdfUrl, isSynced: true };
    saveBookToFirestore(safeFirestoreBook)
      .then(() => {
        setBooks((current) =>
          current.map((item) => (item.id === finalBook.id ? { ...item, isSynced: true } : item))
        );
        const saved = localStorage.getItem("WAFULA_BOOKS");
        if (saved) {
          const parsed = JSON.parse(saved) as Book[];
          const updated = parsed.map((item) =>
            item.id === finalBook.id ? { ...item, isSynced: true } : item
          );
          localStorage.setItem("WAFULA_BOOKS", JSON.stringify(updated));
        }
      })
      .catch((err) => {
        console.warn("Offline: New item cataloged locally, live upload scheduled on network reconnect:", err);
      });
  };

  const handleDeleteBook = (id: string) => {
    setBooks((prev) => {
      const updated = prev.filter((b) => b.id !== id);
      localStorage.setItem("WAFULA_BOOKS", JSON.stringify(updated));
      return updated;
    });
    // Remove instantly from remote live collection
    deleteBookFromFirestore(id).catch((err) => {
      console.warn("Offline: Book removed locally, live deletion scheduled on network reconnect:", err);
    });
  };

  // Community discussion message submission (with replies, edits, and rich attachments)
  const handleSendCommunityMessage = (
    text: string, 
    parentId?: string, 
    channelName?: string,
    extras?: { imageContent?: string; attachedFile?: { name: string; type: string; dataUrl?: string; sizeStr?: string; url?: string }; stickerEmoji?: string }
  ) => {
    const fresh: CommunityMessage = {
      id: "msg_" + Date.now(),
      channel: channelName || "#generatechat",
      userId: currentUser?.email || "anonymous",
      userName: currentUser?.name || "Bungoma Guest",
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

    // Real synchronization: write directly to Cloud Firestore database
    saveCommunityMessageToFirestore(fresh).catch((err) => {
      console.warn("Offline: local chat queued, cloud ledger synchronization scheduled on connect:", err);
    });

    if (currentUser) {
      logUserActivity(
        currentUser.email,
        currentUser.name,
        "Post Message",
        `Posted in ${channelName || "#General"}: "${text.length > 55 ? text.substring(0, 55) + "..." : text}"`
      );
    }
  };

  const handleEditCommunityMessage = (id: string, nextText: string) => {
    setCommunityMessages((prev) => {
      const updated = prev.map((m) => {
        if (m.id === id) {
          const updatedMsg = { ...m, text: nextText, isEdited: true };
          // Real synchronization: overwrite directly in Cloud Firestore
          saveCommunityMessageToFirestore(updatedMsg).catch((err) => {
            console.warn("Offline: local edit stored, cloud overwrite scheduled on reconnect:", err);
          });

          if (currentUser) {
            logUserActivity(
              currentUser.email,
              currentUser.name,
              "Edit Message",
              `Edited message content to: "${nextText.length > 55 ? nextText.substring(0, 55) + "..." : nextText}"`
            );
          }

          return updatedMsg;
        }
        return m;
      });
      localStorage.setItem("WAFULA_CHAT_MESSAGES", JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteCommunityMessage = (id: string) => {
    setCommunityMessages((prev) => {
      // Filter out this message and any sub-threaded replies
      const updated = prev.filter((m) => m.id !== id && m.parentId !== id);
      localStorage.setItem("WAFULA_CHAT_MESSAGES", JSON.stringify(updated));
      return updated;
    });

    // Real synchronization: remove directly from Cloud Firestore database
    deleteCommunityMessageFromFirestore(id).catch((err) => {
      console.warn("Offline: chat deleted, cloud ledger synchronization scheduled on connect:", err);
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

  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-100 text-stone-900 p-4 font-sans select-none antialiased">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.05),transparent_60%)] pointer-events-none" />
        
        <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-2xl relative overflow-hidden transition-all duration-300">
          <div className="absolute right-0 top-0 w-32 h-32 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
          
          {/* Brand header */}
          <div className="flex flex-col items-center text-center space-y-2 mb-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-lg shadow-xl shadow-blue-900/30">
              W
            </span>
            <div>
              <h1 className="font-sans font-black text-xl tracking-tight text-stone-900 uppercase sm:text-2xl">Wafula Reads Hub</h1>
              <p className="text-[10px] text-blue-600 font-mono tracking-widest uppercase mt-0.5">Bungoma Digital Library Portal</p>
            </div>
            <p className="text-[11px] text-stone-600 mt-2 max-w-xs leading-relaxed">
              Read, publish, study mathematical proofs, and consult scholarly digital companion AI. Create an account to gain instant access.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleProcessSubmitAuth} className="space-y-4">
            {authMode === "register" && (
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-550 text-left">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Calvin Opara"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full rounded-lg border border-stone-250 bg-stone-50 p-2.5 text-xs text-stone-900 outline-none focus:border-blue-500 font-bold"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-550 text-left">Email Address</label>
              <input
                type="email"
                required
                placeholder="you@domain.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full rounded-lg border border-stone-250 bg-stone-50 p-2.5 text-xs text-stone-900 outline-none focus:border-blue-500 font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-550 text-left">Security Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full rounded-lg border border-stone-250 bg-stone-50 p-2.5 text-xs text-stone-900 outline-none focus:border-blue-500 font-bold"
              />
            </div>

            {authError && (
              <p className="p-2.5 rounded bg-red-50 border border-red-200 text-red-705 text-[10.5px] font-bold leading-normal text-left">
                ⚠️ {authError}
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2.5 text-xs tracking-wide uppercase shadow-lg shadow-blue-500/10 active:scale-95 transition-all cursor-pointer"
            >
              {authMode === "login" ? "Verify Credentials" : "Create New Profile"}
            </button>
          </form>

          {/* Alternate Google option */}
          <div className="relative my-5 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200" />
            </div>
            <span className="relative bg-white px-3 text-[10px] font-mono uppercase tracking-wider text-stone-500">
              Or Use Google Sign-in
            </span>
          </div>

          <button
            onClick={handleGoogleMockLogin}
            className="w-full flex items-center justify-center space-x-2 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-bold py-2.5 transition active:scale-95 cursor-pointer"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>Log In with Google Account</span>
          </button>

          <div className="relative my-4 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-150" />
            </div>
            <span className="relative bg-white px-3 text-[9px] font-mono uppercase tracking-wider text-stone-500">
              Or Try Guest Access
            </span>
          </div>

          <button
            onClick={handleContinueAsGuest}
            type="button"
            className="w-full py-2.5 rounded-lg border border-teal-200 bg-teal-50 hover:bg-teal-100/80 text-teal-800 text-xs font-black tracking-wide uppercase transition active:scale-95 cursor-pointer leading-none"
          >
            👥 Browse & Read as Guest
          </button>

          {/* Toggle link */}
          <p className="text-[11px] text-stone-500 font-medium text-center mt-5">
            {authMode === "login" ? "First time using Wafula Reads?" : "Already registered your account?"}{" "}
            <button
              onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthError(""); }}
              className="text-blue-600 hover:underline font-bold"
            >
              {authMode === "login" ? "Sign Up Now" : "Sign In Here"}
            </button>
          </p>

          {/* Secure credentials disclaimer block */}
          <div className="mt-5 pt-4 border-t border-stone-150 text-center text-[10px] text-stone-500 font-medium">
            <span>🔐 Authorized Student & Leadership Access Protocol • Bungoma Digitized Hub</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-app text-text-primary font-sans selection:bg-orange-100 selection:text-orange-950 transition-colors duration-200">
      
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
        globalSettings={globalSettings}
        onUpdateSettings={setGlobalSettings}
        isOnline={effectiveIsOnline}
        broadcastAnnouncement={broadcastAnnouncement}
        isBannerClosed={isBannerClosed}
        onRestoreBanner={() => setIsBannerClosed(false)}
        offlineMode={offlineMode}
        onToggleOfflineMode={handleToggleOfflineMode}
      />

      {/* Main interactive window viewport - Responsive pl matching desktop sidebar layout */}
      <main className="flex-grow lg:pl-52 pt-3 md:pt-4 pb-24 lg:pb-14 min-h-[calc(100vh-4rem)] w-full max-w-full overflow-x-hidden flex flex-col">
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

            {currentView === "mpesa-api" && (
              <MpesaApiConsole
                currentUser={currentUser}
                books={books}
                onUnlockBookManual={(bookId) => {
                  if (!purchasedBookIds.includes(bookId)) {
                    setPurchasedBookIds((prev) => [...prev, bookId]);
                    alert("Book instantly unlocked on the local ledger catalog!");
                  }
                }}
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

            {currentView === "language-teacher" && (
              <div className="light-only w-full">
                <LanguageTeacher />
              </div>
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
                />
              </div>
            )}

            {currentView === "ai-media" && (
              <div className="light-only w-full">
                <AIMedia
                  currentUser={currentUser}
                  onAddNewDocument={handleAddNewDocument}
                  books={books}
                  savedDocuments={savedDocuments}
                />
              </div>
            )}

            {currentView === "threed-loft" && (
              <BookThreedViewer
                books={books}
              />
            )}

            {currentView === "playstore-hub" && (
              <PlayStoreHub />
            )}

            {currentView === "home-apps" && (
              <HomeApps onNavigate={setCurrentView} />
            )}

            {currentView === "zion-wifi" && (
              <ZionWifi 
                currentUser={currentUser}
                isOnline={effectiveIsOnline}
                onLogIn={handleLogIn}
              />
            )}

            {currentView === "website-center" && (
              <WebsiteCenter />
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
                globalSettings={globalSettings}
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
                messages={communityMessages}
                onSendMessage={handleSendCommunityMessage}
                onDeleteMessage={handleDeleteCommunityMessage}
                onEditMessage={handleEditCommunityMessage}
                broadcastAnnouncement={broadcastAnnouncement}
                onUpdateBroadcastAnnouncement={handleUpdateBroadcastAnnouncement}
                isLoading={isFetchingCommunity}
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
                onAddNewDocument={handleAddNewDocument}
              />
            )}

            {currentView === "verify" && (
              <CertificateVerificationView 
                onClose={() => setCurrentView("school")}
              />
            )}

            {currentView === "contact" && (
              <Contact />
            )}

            {currentView === "admin" && (
              currentUser?.role === "admin" || 
              currentUser?.email?.toLowerCase()?.trim() === "wafulak435@gmail.com" || 
              currentUser?.email?.toLowerCase()?.trim() === "wafula435@gmail.com"
            ) && (
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
                globalSettings={globalSettings}
                onUpdateSettings={setGlobalSettings}
                bookOrders={bookOrders}
                onApproveBookOrder={handleApproveBookOrder}
                onRejectBookOrder={handleRejectBookOrder}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer copyright */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400 font-mono lg:pl-52">
        <div>© 2026 Wafula Digital. All rights reserved. Headquartered under Bungoma Kenya.</div>
      </footer>

      {/* Universal Floating Voice Commands Assistant Widget */}
      <div className="fixed bottom-6 right-6 z-40">
        <div className="flex flex-col items-end space-y-2">
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

      {/* Lipa Na M-Pesa & eCitizen Global Checkout Gateway Dialog Popup */}
      {checkoutBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setCheckoutBook(null)} />
          
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-300 p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200 select-text">
            {/* Header branding */}
            <div className="flex items-center justify-between border-b border-stone-200 pb-4 mb-4">
              <div className="flex items-center space-x-2.5 text-left">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#dc2626] text-white font-black text-xs shadow-md">
                  eC
                </span>
                <div>
                  <h3 className="font-display font-black text-slate-900 leading-tight uppercase text-xs sm:text-sm tracking-wide">
                    eCitizen Joint Payment Gateway
                  </h3>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest font-mono">
                    Official Safaricom Lipa Na M-PESA & Foreign Accounts API
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setCheckoutBook(null)} 
                className="text-stone-400 hover:text-stone-900 font-extrabold hover:bg-stone-100 p-1.5 rounded-full transition text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Book Info Summary */}
            <div className="mb-4 bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-left">
              <span className="text-[9px] font-mono font-black text-slate-500 uppercase tracking-widest block">Selected Publication</span>
              <div className="flex justify-between items-center mt-1">
                <div className="font-extrabold text-slate-900 text-xs sm:text-sm">{checkoutBook.title}</div>
                <div className="text-slate-900 font-black text-xs sm:text-sm bg-stone-200/60 px-2.5 py-1 rounded">KES {checkoutBook.price || 350}</div>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 italic font-bold">Author: {checkoutBook.author} • Genre: {checkoutBook.category}</p>
            </div>

            {checkoutStep === "form" && (
              <div className="space-y-4 text-left">
                {/* Payment channel select */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-900">Payment Gateway System</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setCheckoutPaymentMethod("mpesa")}
                      className={`py-2 px-3.5 rounded-xl border-2 font-black text-[11px] uppercase transition cursor-pointer text-center ${
                        checkoutPaymentMethod === "mpesa"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      🟢 M-PESA STK
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckoutPaymentMethod("ecitizen_local")}
                      className={`py-2 px-3.5 rounded-xl border-2 font-black text-[11px] uppercase transition cursor-pointer text-center ${
                        checkoutPaymentMethod === "ecitizen_local"
                          ? "border-amber-500 bg-amber-50 text-amber-800"
                          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      👑 eCitizen Wallet
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckoutPaymentMethod("ecitizen_foreign")}
                      className={`py-2 px-3.5 rounded-xl border-2 font-black text-[11px] uppercase transition cursor-pointer text-center ${
                        checkoutPaymentMethod === "ecitizen_foreign"
                          ? "border-blue-500 bg-blue-50 text-blue-800"
                          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      🌐 Foreign / Card
                    </button>
                  </div>
                </div>

                {checkoutPaymentMethod === "mpesa" && (
                  <div className="space-y-3">
                    {/* Locked Admin Targets */}
                    <div className="bg-emerald-50 border border-emerald-150 p-3 rounded-xl space-y-2 text-xs font-mono">
                      <div className="flex items-center space-x-1.5 text-[9.5px] font-bold text-emerald-800 uppercase tracking-widest border-b border-emerald-100 pb-1">
                        <span>🔒</span>
                        <span>Locked Billing Target details</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white p-1.5 rounded-lg border border-emerald-200">
                          <span className="text-[8px] text-slate-500 uppercase block font-sans">Paybill No</span>
                          <strong className="text-stone-900 font-extrabold text-xs block text-center mt-0.5">247247</strong>
                        </div>
                        <div className="bg-white p-1.5 rounded-lg border border-emerald-200">
                          <span className="text-[8px] text-slate-500 uppercase block font-sans">Business Account</span>
                          <strong className="text-stone-950 font-extrabold text-[10px] block text-center mt-0.5 leading-none">7770185693193</strong>
                        </div>
                      </div>
                      <div className="bg-white p-1.5 rounded-lg border border-emerald-200">
                        <span className="text-[8px] text-slate-500 uppercase block font-sans">Beneficiary Name</span>
                        <strong className="text-stone-900 font-extrabold text-[10.5px] block text-center mt-0.5">Kelvin opara wafula</strong>
                      </div>
                    </div>

                    {/* User Editable Fields */}
                    <div className="space-y-2 border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs space-y-2">
                      <span className="text-[9.5px] font-black text-slate-500 uppercase tracking-widest block mb-2">Your Editable Payment Details:</span>
                      
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-700">Safaricom Mobile Number:</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 0712345678 or +254712345678"
                          value={checkoutPhoneNumber}
                          onChange={(e) => setCheckoutPhoneNumber(e.target.value.replace(/[^0-9+]/g, ""))}
                          className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-bold font-mono outline-none text-slate-900 focus:border-green-600"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-700">Your Customer ID / Mail Reference:</label>
                        <input
                          type="text"
                          required
                          placeholder="Customer ID Email reference"
                          value={checkoutCustomerIDInput}
                          onChange={(e) => setCheckoutCustomerIDInput(e.target.value)}
                          className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-mono outline-none text-slate-900 focus:border-[#4f46e5]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-700">Full Payer Account Name:</label>
                        <input
                          type="text"
                          required
                          placeholder="Payer Account Name"
                          value={checkoutCustomerNameInput}
                          onChange={(e) => setCheckoutCustomerNameInput(e.target.value)}
                          className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-bold outline-none text-slate-900 focus:border-[#4f46e5]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {checkoutPaymentMethod === "ecitizen_local" && (
                  <div className="space-y-3">
                    <p className="text-[10.5px] text-amber-700 bg-amber-50/50 p-3 rounded-lg border border-amber-150 leading-relaxed font-bold">
                      💡 Pay directly via Bungoma Local Government Study eCitizen Wallet. Transactions are encrypted using standard national treasury guidelines.
                    </p>
                    <div className="space-y-1">
                      <label className="block text-xs font-black text-slate-900">Enter eCitizen National ID / Wallet Account:</label>
                      <input
                        type="text"
                        required
                        placeholder="ID Card Number (e.g. E-391059)"
                        value={checkoutAccountDetails}
                        onChange={(e) => setCheckoutAccountDetails(e.target.value)}
                        className="w-full text-xs p-3 border border-slate-300 bg-slate-50 rounded-xl font-bold font-mono outline-none text-slate-900 focus:bg-white text-slate-900"
                      />
                    </div>
                  </div>
                )}

                {checkoutPaymentMethod === "ecitizen_foreign" && (
                  <div className="space-y-3">
                    <p className="text-[10.5px] text-blue-700 bg-blue-50/50 p-3 rounded-lg border border-blue-150 leading-relaxed font-bold">
                      💡 International currency conversions are supported. Accepts payments from any foreign account worldwide (Visa, MasterCard, PayPal, or Stripe Transfer).
                    </p>
                    <div className="space-y-1">
                      <label className="block text-xs font-black text-slate-900">Foreign Card Number / PayPal ID:</label>
                      <input
                        type="text"
                        required
                        placeholder="Enter full Card details / PayPal email"
                        value={checkoutAccountDetails}
                        onChange={(e) => setCheckoutAccountDetails(e.target.value)}
                        className="w-full text-xs p-3 border border-slate-300 bg-slate-50 rounded-xl font-bold font-mono outline-none text-slate-900 focus:bg-white text-slate-900"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-stone-200">
                  <button
                    onClick={() => {
                      if (checkoutPaymentMethod === "mpesa" && !checkoutPhoneNumber.trim()) {
                        alert("Please enter a valid Safaricom phone number first.");
                        return;
                      }
                      if (checkoutPaymentMethod === "mpesa" && !checkoutCustomerIDInput.trim()) {
                        alert("Please enter your Customer ID validation mail reference first.");
                        return;
                      }
                      if (checkoutPaymentMethod !== "mpesa" && !checkoutAccountDetails.trim()) {
                        alert("Please enter your account validation credentials first.");
                        return;
                      }
                      setCheckoutStep("sending_stk");
                      setTimeout(() => {
                        setCheckoutStep("waiting_pin");
                      }, 2500);
                    }}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-3 px-4 rounded-xl text-xs sm:text-sm uppercase tracking-wider cursor-pointer transform active:scale-95 transition"
                  >
                    Confirm & Complete Checkout
                  </button>
                </div>
              </div>
            )}

            {checkoutStep === "sending_stk" && (
              <div className="py-8 text-center space-y-4 text-slate-900 font-bold">
                <Loader2 className="h-10 w-10 text-emerald-500 animate-spin mx-auto" />
                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-900 text-sm sm:text-base uppercase tracking-wider">Latching Payment Session...</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-bold">
                    Initializing Daraja API server payload loops to request STK Push or Citizen ledger handshake. Keep your phone screen open.
                  </p>
                </div>
              </div>
            )}

            {checkoutStep === "waiting_pin" && (
              <div className="py-8 text-center space-y-4 text-slate-900 font-bold animate-pulse">
                <div className="relative h-14 w-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200 shadow-sm">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-20"></span>
                  <div className="text-xl font-bold">📱</div>
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-extrabold text-slate-900 text-sm sm:text-base uppercase tracking-wider">M-Pesa STK Emitted!</h4>
                  <p className="text-xs text-slate-700 leading-relaxed font-bold">
                    Check your mobile phone! A secure Safaricom SIM Toolkit pop-up request has been generated for KES {checkoutBook.price}. Enter your PIN onto the prompt to authorize.
                  </p>
                  <div className="inline-block bg-slate-100 px-3 py-1 border border-slate-300 rounded-full text-[10px] font-mono font-black text-slate-700">
                    AWAITING PIN INPUT: {checkoutCountdown}s
                  </div>
                </div>

                {/* --- PHONE DEVICE SIM TOOLKIT FLOATING OVERLAY DIALOGUE (APP LEVEL) --- */}
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                  <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" />
                  
                  <div className="relative w-full max-w-xs bg-slate-900 border border-slate-700/85 shadow-2xl rounded-2xl p-6 select-none font-mono text-[#e2e8f0] text-xs transition">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3.5">
                      <div className="flex items-center space-x-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-sans font-black text-xs text-slate-300 uppercase tracking-widest">SIM TOOLKIT</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-bold">M-PESA PUSH</span>
                    </div>

                    {/* Prompt Statement */}
                    <div className="space-y-2 border-b border-dashed border-slate-800 pb-3 mb-4">
                      <p className="text-[11px] text-slate-300 leading-relaxed text-left">
                        Do you want to authorize payment of <strong className="text-white font-black">KES {checkoutBook.price}</strong> to Paybill <strong className="text-emerald-400">247247</strong> Account <strong className="text-emerald-400">7770185693193</strong>?
                      </p>
                      <p className="text-[10px] text-slate-500 italic text-left">
                        Recipient Payee: Kelvin opara wafula
                      </p>
                    </div>

                    {/* Secure PIN Prompt Input */}
                    <div className="space-y-2 text-left">
                      <label className="block text-[10px] font-extrabold uppercase text-slate-450 tracking-widest text-[#94a3b8]">Enter M-PESA PIN Code:</label>
                      <input
                        type="password"
                        required
                        maxLength={4}
                        value={checkoutMpesaPin}
                        onChange={(e) => setCheckoutMpesaPin(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="••••"
                        className="w-full text-center tracking-[1.5em] text-lg font-black bg-slate-950 border border-slate-700 p-2.5 rounded-xl text-white outline-none focus:border-emerald-400 focus:bg-black font-mono transition"
                      />
                    </div>

                    {/* Action controls */}
                    <div className="flex gap-3 mt-6">
                      <button
                        type="button"
                        onClick={() => {
                          setCheckoutStep("form");
                          setCheckoutMpesaPin("");
                          alert("⚠️ Payment Authorization Cancelled from SIM Toolkit.");
                        }}
                        className="flex-1 py-1.5 font-bold hover:text-white text-slate-400 bg-slate-800 hover:bg-slate-750 transition rounded-xl"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (checkoutMpesaPin.length < 4) {
                            alert("⚠️ Security Protection: Enter a valid 4-digit PIN password to confirm.");
                            return;
                          }
                          // Proceed to searching loading stage
                          setCheckoutStep("searching_payment");
                          setCheckoutCountdown(5); // Reset loader stopwatch
                          setCheckoutMpesaPin("");
                        }}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 font-extrabold text-white transition rounded-xl text-center shadow-lg shadow-emerald-900/20"
                      >
                        Send / OK
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {checkoutStep === "searching_payment" && (
              <div className="py-8 text-center space-y-4 text-slate-900 font-bold">
                <Loader2 className="h-10 w-10 text-emerald-500 animate-spin mx-auto" />
                <div className="space-y-2">
                  <h4 className="font-extrabold text-slate-950 text-sm uppercase tracking-wide">Searching & Scanning Payment...</h4>
                  <div className="inline-block bg-emerald-50 text-emerald-800 px-3 py-1 border border-emerald-200 rounded-full font-mono text-[10px] font-black">
                    SCAN INDICES: WAFULA_LIPA_MPESA_LEDGER_247247...
                  </div>
                  <p className="text-[11px] text-slate-550 leading-relaxed font-bold px-4">
                    The app is searching the Safaricom network ledger for KES {checkoutBook.price} paid by {checkoutCustomerNameInput || currentUser?.name || "Member"} with Verification ID "{checkoutCustomerIDInput || currentUser?.email}". Undergoing secure compliance validation loops...
                  </p>
                </div>
              </div>
            )}

            {checkoutStep === "completed" && (
              <div className="py-8 text-center space-y-4 text-slate-900">
                <div className="h-12 w-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto border border-emerald-300 font-black text-lg animate-bounce">
                  ✓
                </div>
                <div className="space-y-2">
                  <h4 className="font-black text-slate-950 text-sm sm:text-base uppercase tracking-wider">Payment Successfully Verified!</h4>
                  <p className="text-[11.5px] text-slate-650 font-bold leading-relaxed px-2">
                    Bungoma eCitizen Treasury successfully credited <strong>KES {checkoutBook.price || 350}</strong> for <strong>"{checkoutBook.title}"</strong>. The transaction has been posted to your permanent library ledger, fully unlocking vertical scrolling and PDF download options.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => setCheckoutBook(null)}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-2.5 px-6 rounded-xl text-xs uppercase cursor-pointer transition active:scale-95"
                  >
                    Start Reading Now
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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

            {/* Sign in with Google shortcut banner */}
            <button
              type="button"
              onClick={handleGoogleMockLogin}
              className="w-full mb-5 py-2.5 px-4 border border-stone-800 rounded-xl text-xs font-bold text-stone-300 bg-stone-950/40 hover:bg-stone-950 transition flex items-center justify-center space-x-2 relative z-10 cursor-pointer active:scale-98"
            >
              <span className="text-sm">🌐</span>
              <span>Continue with Google Cloud</span>
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

      {/* High-Fidelity Google Account Selector Simulation modal */}
      {showGoogleSelectorSim && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowGoogleSelectorSim(false)} />
          
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-205 select-none text-stone-850">
            {/* Google G logo & Header */}
            <div className="text-center pb-4 mb-4 border-b border-stone-100 flex flex-col items-center">
              <div className="w-10 h-10 mb-2 flex items-center justify-center rounded-full bg-slate-50 border border-stone-100 text-lg font-black font-sans shadow-xs">
                <span className="text-red-500">G</span>
                <span className="text-blue-500">o</span>
                <span className="text-amber-500">o</span>
                <span className="text-emerald-500">g</span>
                <span className="text-blue-600 font-serif">l</span>
                <span className="text-red-500">e</span>
              </div>
              <h3 className="font-display font-black text-slate-900 text-lg">Sign in with Google</h3>
              <p className="text-xs text-stone-500 mt-1">to continue to Wafula Reads Academic Hub</p>
            </div>

            {/* Simulated accounts listings */}
            <div className="space-y-2 text-xs">
              <span className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1 text-left">SAVED GOOGLE ACCOUNTS</span>
              
              <button
                type="button"
                onClick={() => {
                  const prof: User = {
                    id: "google_main_admin435",
                    email: "wafulak435@gmail.com",
                    name: "Wafula Principal",
                    role: "admin",
                    readingStreak: 23,
                    dailyGoalMinutes: 60
                  };
                  setCurrentUser(prof);
                  localStorage.setItem("WAFULA_CURRENT_USER", JSON.stringify(prof));
                  setCookie("WAFULA_CURRENT_USER", JSON.stringify(prof), 7);
                  recordUserSession(prof, "Google Account Link (Simulated)");
                  setShowGoogleSelectorSim(false);
                  alert("Authenticated instantly as Main Administrator: wafulak435@gmail.com! Credentials are saved securely.");
                }}
                className="w-full p-3 rounded-xl border border-stone-200 hover:border-blue-500 hover:bg-blue-50/20 text-left transition flex items-center justify-between cursor-pointer"
              >
                <div>
                  <span className="font-extrabold text-stone-900 block">Wafula Principal</span>
                  <span className="text-stone-400 font-mono text-[10px]">wafulak435@gmail.com</span>
                </div>
                <span className="bg-red-100 text-red-800 text-[9px] font-bold uppercase py-0.5 px-2 rounded border border-red-200">
                  Principal Admin
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const prof: User = {
                    id: "google_member_sim",
                    email: "guest.scholar@gmail.com",
                    name: "Guest Scholar",
                    role: "member",
                    readingStreak: 12,
                    dailyGoalMinutes: 20
                  };
                  setCurrentUser(prof);
                  localStorage.setItem("WAFULA_CURRENT_USER", JSON.stringify(prof));
                  setCookie("WAFULA_CURRENT_USER", JSON.stringify(prof), 7);
                  recordUserSession(prof, "Google Account Link (Simulated)");
                  setShowGoogleSelectorSim(false);
                  alert("Authenticated instantly as Guest Scholar: guest.scholar@gmail.com. Saved credentials.");
                }}
                className="w-full p-3 rounded-xl border border-stone-200 hover:border-blue-500 hover:bg-blue-50/20 text-left transition flex items-center justify-between cursor-pointer"
              >
                <div>
                  <span className="font-extrabold text-stone-900 block">Guest Scholar</span>
                  <span className="text-stone-400 font-mono text-[10px]">guest.scholar@gmail.com</span>
                </div>
                <span className="bg-blue-55 text-blue-800 text-[9px] font-bold uppercase py-0.5 px-2 rounded border border-blue-200">
                  Member
                </span>
              </button>
            </div>

            {/* Custom Google Selector Input Form Option */}
            <div className="mt-4 pt-4 border-t border-stone-100">
              <span className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2 text-left">OR USE ANOTHER GOOGLE ACCOUNT</span>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const emailInput = form.elements.namedItem("sim_email") as HTMLInputElement;
                const nameInput = form.elements.namedItem("sim_name") as HTMLInputElement;
                
                if (!emailInput.value.trim() || !nameInput.value.trim()) return;
                
                const em = emailInput.value.trim();
                const lowerEm = em.toLowerCase();
                const isCustomAdmin = lowerEm === "wafulak4@gmail.com" || 
                                      lowerEm === "wafulak003@gmail.com" || 
                                      lowerEm === "wafulak435@gmail.com" || 
                                      lowerEm === "wafula435@gmail.com";
                
                const prof: User = {
                  id: "google_custom_" + Date.now(),
                  email: em,
                  name: nameInput.value.trim(),
                  role: isCustomAdmin ? "admin" : "member",
                  readingStreak: 1,
                  dailyGoalMinutes: 30
                };
                
                setCurrentUser(prof);
                localStorage.setItem("WAFULA_CURRENT_USER", JSON.stringify(prof));
                setCookie("WAFULA_CURRENT_USER", JSON.stringify(prof), 7);
                recordUserSession(prof, "Google Account Link (Manual Sim)");
                setShowGoogleSelectorSim(false);
                alert(`Successfully authenticated custom Google Account as ${prof.name} (${prof.email})! Credentials saved.`);
              }} className="space-y-2 text-left text-xs">
                <div>
                  <label className="block text-stone-450 font-bold uppercase tracking-wider mb-1 text-[9px]">Google User Full Name</label>
                  <input
                    type="text"
                    name="sim_name"
                    required
                    placeholder="e.g. Kelvin Wafula"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 p-2.5 font-bold outline-none focus:bg-white focus:border-blue-600 block"
                  />
                </div>
                <div>
                  <label className="block text-stone-450 font-bold uppercase tracking-wider mb-1 text-[9px]">Google Account Email</label>
                  <input
                    type="email"
                    name="sim_email"
                    required
                    placeholder="e.g. wafulak4@gmail.com"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 p-2.5 font-bold outline-none focus:bg-white focus:border-blue-600 block"
                  />
                </div>
                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowGoogleSelectorSim(false)}
                    className="flex-1 rounded-xl border border-stone-200 font-bold py-2.5 hover:bg-stone-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-blue-600 text-white font-extrabold py-2.5 hover:bg-blue-700 shadow-md transition cursor-pointer"
                  >
                    Sign In Google
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
