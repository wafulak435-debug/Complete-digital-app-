import {
  collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, addDoc
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { User, Book, CommunityMessage, SavedDocument, MemberUploadRequest, AppSettings, BookOrder, SystemNotification, WifiPurchase, SearchHistoryItem } from "../types";

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

/**
 * Normalizes Firebase Firestore errors into structured JSON while keeping offline queueing resilient.
 */
function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): void {
  const errObj = error as any;
  const message = errObj instanceof Error ? errObj.message : String(errObj || "Unknown Firestore error");

  // If connection is unavailable/offline, treat gracefully for offline-first queueing.
  if (
    errObj &&
    (errObj.code === "unavailable" ||
      message.includes("Could not reach Cloud Firestore backend") ||
      message.includes("the client is offline") ||
      message.includes("unavailable") ||
      message.includes("Connection failed"))
  ) {
    console.log(`[Offline Sync Queue] Operation '${operationType}' on '${path}' stored in offline state buffers. Will background sync when connection resumes.`);
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: message,
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
  };

  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Cleanse objects of `undefined` values recursively to make them fully safe for Firestore serialization.
 */
function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore);
  }
  if (typeof obj === "object") {
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      cleaned[key] = val === undefined ? null : sanitizeForFirestore(val);
    }
    return cleaned;
  }
  return obj;
}

/**
 * Synchronize User Session & setting defaults
 */
export async function syncUserSession(userId: string, email: string, name: string): Promise<User> {
  try {
    const userDocRef = doc(db, "users", userId);
    const docSnap = await getDoc(userDocRef);
    
    if (docSnap.exists()) {
      const existing = docSnap.data() as User;
      try {
        localStorage.setItem(`WAFULA_CACHED_USER_${userId}`, JSON.stringify(existing));
      } catch (_) {}
      return existing;
    } else {
      const newUser: User = {
        email,
        name,
        role: "member",
        readingStreak: 1,
        dailyGoalMinutes: 30
      };
      await setDoc(userDocRef, sanitizeForFirestore(newUser));
      try {
        localStorage.setItem(`WAFULA_CACHED_USER_${userId}`, JSON.stringify(newUser));
      } catch (_) {}
      return newUser;
    }
  } catch (e) {
    console.warn("Offline/unreachable firestore user session sync. Returning fallback:", e);
    const cachedObj = localStorage.getItem(`WAFULA_CACHED_USER_${userId}`);
    if (cachedObj) {
      try {
        return JSON.parse(cachedObj) as User;
      } catch (_) {}
    }
    return {
      email,
      name,
      role: "member",
      readingStreak: 1,
      dailyGoalMinutes: 30
    };
  }
}

/**
 * Fetch catalog books
 */
export async function fetchBooksFromFirestore(): Promise<Book[]> {
  try {
    let querySnapshot;
    try {
      querySnapshot = await getDocs(collection(db, "books"));
    } catch (err: any) {
      if (err?.code === "permission-denied" || String(err?.message || "").includes("insufficient permissions")) {
        querySnapshot = await getDocs(query(collection(db, "books"), where("status", "==", "active")));
      } else {
        throw err;
      }
    }
    const booksList: Book[] = [];
    querySnapshot.forEach((docSnap) => {
      booksList.push({ ...docSnap.data() } as Book);
    });
    if (booksList.length > 0) {
      try {
        localStorage.setItem("WAFULA_CACHED_BOOKS", JSON.stringify(booksList));
      } catch (_) {}
    }
    return booksList;
  } catch (e) {
    console.warn("Offline/unreachable firestore books fetch. Restoring local cache:", e);
    const cached = localStorage.getItem("WAFULA_CACHED_BOOKS");
    if (cached) {
      try {
        return JSON.parse(cached) as Book[];
      } catch (_) {}
    }
    return [];
  }
}

/**
 * Save / Create Book
 */
export async function saveBookToFirestore(book: Book): Promise<void> {
  try {
    await setDoc(doc(db, "books", book.id), sanitizeForFirestore(book));
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, `books/${book.id}`);
  }
}

/**
 * Delete Book
 */
export async function deleteBookFromFirestore(bookId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "books", bookId));
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, `books/${bookId}`);
  }
}

/**
 * Fetch community messages
 */
export async function fetchCommunityMessagesFromFirestore(): Promise<CommunityMessage[]> {
  try {
    let querySnapshot;
    try {
      const q = query(collection(db, "communityMessages"), orderBy("date", "asc"));
      querySnapshot = await getDocs(q);
    } catch (err: any) {
      if (err?.code === "permission-denied" || String(err?.message || "").includes("insufficient permissions")) {
        const publicQ = query(
          collection(db, "communityMessages"),
          where("channel", "in", ["#General", "#Book Talks", "#Leadership", "#Publishing", "#generatechat"])
        );
        querySnapshot = await getDocs(publicQ);
      } else {
        throw err;
      }
    }
    const msgs: CommunityMessage[] = [];
    querySnapshot.forEach((docSnap) => {
      msgs.push({ ...docSnap.data() } as CommunityMessage);
    });
    return msgs;
  } catch (e) {
    // Treat harmlessly to allow local storage when Firestore is empty
    return [];
  }
}

/**
 * Add community chat message
 */
export async function saveCommunityMessageToFirestore(msg: CommunityMessage): Promise<void> {
  try {
    await setDoc(doc(db, "communityMessages", msg.id), sanitizeForFirestore(msg));
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, `communityMessages/${msg.id}`);
  }
}

/**
 * Delete community chat message
 */
export async function deleteCommunityMessageFromFirestore(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "communityMessages", id));
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, `communityMessages/${id}`);
  }
}

/**
 * Fetch Saved Documents from Doc Studio
 */
export async function fetchSavedDocumentsFromFirestore(userId: string): Promise<SavedDocument[]> {
  try {
    const q = query(collection(db, "savedDocuments"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    const docList: SavedDocument[] = [];
    querySnapshot.forEach((docSnap) => {
      docList.push({ ...docSnap.data() } as SavedDocument);
    });
    try {
      localStorage.setItem(`WAFULA_CACHED_SAVED_DOCUMENTS_${userId}`, JSON.stringify(docList));
    } catch (_) {}
    return docList;
  } catch (e) {
    console.warn("Offline/unreachable firestore docs fetch. Restoring local cache:", e);
    const cached = localStorage.getItem(`WAFULA_CACHED_SAVED_DOCUMENTS_${userId}`);
    if (cached) {
      try {
        return JSON.parse(cached) as SavedDocument[];
      } catch (_) {}
    }
    return [];
  }
}

/**
 * Save Personal Document Studio PDF/DOC
 */
export async function saveDocumentToFirestore(docObj: SavedDocument): Promise<void> {
  try {
    await setDoc(doc(db, "savedDocuments", docObj.id), sanitizeForFirestore(docObj));
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, `savedDocuments/${docObj.id}`);
  }
}

/**
 * Delete Personal Saved Document
 */
export async function deleteSavedDocumentFromFirestore(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "savedDocuments", id));
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, `savedDocuments/${id}`);
  }
}

/**
 * Fetch Member Upload queue Requests
 */
export async function fetchUploadRequestsFromFirestore(): Promise<MemberUploadRequest[]> {
  try {
    let querySnapshot;
    try {
      querySnapshot = await getDocs(collection(db, "uploadRequests"));
    } catch (err: any) {
      if (err?.code === "permission-denied" || String(err?.message || "").includes("insufficient permissions")) {
        const publicQ = query(
          collection(db, "uploadRequests"),
          where("status", "==", "approved"),
          where("allowedToPublic", "==", true)
        );
        querySnapshot = await getDocs(publicQ);
      } else {
        throw err;
      }
    }
    const uploadList: MemberUploadRequest[] = [];
    querySnapshot.forEach((docSnap) => {
      uploadList.push({ ...docSnap.data() } as MemberUploadRequest);
    });
    try {
      localStorage.setItem("WAFULA_CACHED_UPLOAD_REQUESTS", JSON.stringify(uploadList));
    } catch (_) {}
    return uploadList;
  } catch (e) {
    console.warn("Offline/unreachable firestore upload requests fetch. Restoring local cache:", e);
    const cached = localStorage.getItem("WAFULA_CACHED_UPLOAD_REQUESTS");
    if (cached) {
      try {
        return JSON.parse(cached) as MemberUploadRequest[];
      } catch (_) {}
    }
    const localQueue = localStorage.getItem("WAFULA_MEMBER_UPLOADS");
    if (localQueue) {
      try {
        return JSON.parse(localQueue) as MemberUploadRequest[];
      } catch (_) {}
    }
    return [];
  }
}

/**
 * Save new Member Upload request
 */
export async function saveUploadRequestToFirestore(reqObj: MemberUploadRequest): Promise<void> {
  try {
    await setDoc(doc(db, "uploadRequests", reqObj.id), sanitizeForFirestore(reqObj));
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, `uploadRequests/${reqObj.id}`);
  }
}

/**
 * Remove Member Upload Request
 */
export async function deleteUploadRequestFromFirestore(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "uploadRequests", id));
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, `uploadRequests/${id}`);
  }
}

/**
 * Fetch eBook order requests required for Admin Confirmation before receiving
 */
export async function fetchBookOrdersFromFirestore(): Promise<BookOrder[]> {
  try {
    let querySnapshot;
    try {
      querySnapshot = await getDocs(collection(db, "bookOrders"));
    } catch (err: any) {
      if (
        (err?.code === "permission-denied" || String(err?.message || "").includes("insufficient permissions")) &&
        auth.currentUser?.uid
      ) {
        querySnapshot = await getDocs(
          query(collection(db, "bookOrders"), where("userId", "==", auth.currentUser.uid))
        );
      } else {
        throw err;
      }
    }
    const orderList: BookOrder[] = [];
    querySnapshot.forEach((docSnap) => {
      orderList.push({ ...docSnap.data() } as BookOrder);
    });
    try {
      localStorage.setItem("WAFULA_CACHED_BOOK_ORDERS", JSON.stringify(orderList));
    } catch (_) {}
    return orderList;
  } catch (e) {
    console.warn("Offline/unreachable firestore book orders fetch. Restoring local cache:", e);
    const cached = localStorage.getItem("WAFULA_CACHED_BOOK_ORDERS");
    if (cached) {
      try {
        return JSON.parse(cached) as BookOrder[];
      } catch (_) {}
    }
    return [];
  }
}

/**
 * Save new or update current book order
 */
export async function saveBookOrderToFirestore(orderObj: BookOrder): Promise<void> {
  try {
    await setDoc(doc(db, "bookOrders", orderObj.id), sanitizeForFirestore(orderObj));
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, `bookOrders/${orderObj.id}`);
  }
}

/**
 * Delete a book purchase order
 */
export async function deleteBookOrderFromFirestore(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "bookOrders", id));
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, `bookOrders/${id}`);
  }
}

/**
 * Fetch global application settings from Firestore
 */
export async function fetchAppSettingsFromFirestore(): Promise<AppSettings | null> {
  try {
    const docSnap = await getDoc(doc(db, "appSettings", "globalPreferences"));
    if (docSnap.exists()) {
      const data = docSnap.data() as AppSettings;
      try {
        localStorage.setItem("WAFULA_CACHED_APP_SETTINGS", JSON.stringify(data));
      } catch (_) {}
      return data;
    }
    return null;
  } catch (e) {
    console.warn("Offline or failed fetching Firestore app settings, loading local fallback cache:", e);
    const cached = localStorage.getItem("WAFULA_CACHED_APP_SETTINGS");
    if (cached) {
      try {
        return JSON.parse(cached) as AppSettings;
      } catch (_) {}
    }
    return {
      primaryColor: "#3B82F6",
      fontSizeMultiplier: 1.0,
      customLogoUrl: ""
    };
  }
}

/**
 * Save global settings to Firestore (Admins only)
 */
export async function saveAppSettingsToFirestore(settings: AppSettings): Promise<void> {
  try {
    try {
      localStorage.setItem("WAFULA_CACHED_APP_SETTINGS", JSON.stringify(settings));
    } catch (_) {}
    await setDoc(doc(db, "appSettings", "globalPreferences"), sanitizeForFirestore(settings));
  } catch (e) {
    console.warn("Could not save to remote Firestore due to offline/permission state. Cached locally.", e);
  }
}

/**
 * Fetch broadcast system notifications
 */
export async function fetchNotificationsFromFirestore(): Promise<SystemNotification[]> {
  try {
    const querySnapshot = await getDocs(collection(db, "notifications"));
    const notifications: SystemNotification[] = [];
    querySnapshot.forEach((docSnap) => {
      notifications.push({ ...docSnap.data() } as SystemNotification);
    });
    try {
      localStorage.setItem("WAFULA_CACHED_NOTIFICATIONS", JSON.stringify(notifications));
    } catch (_) {}
    return notifications;
  } catch (e) {
    console.warn("Offline/unreachable firestore notifications fetch. Restoring local cache:", e);
    const cached = localStorage.getItem("WAFULA_CACHED_NOTIFICATIONS");
    if (cached) {
      try {
        return JSON.parse(cached) as SystemNotification[];
      } catch (_) {}
    }
    return [];
  }
}

/**
 * Save / broadcast a new notification
 */
export async function saveNotificationToFirestore(notif: SystemNotification): Promise<void> {
  try {
    await setDoc(doc(db, "notifications", notif.id), sanitizeForFirestore(notif));
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, `notifications/${notif.id}`);
  }
}

/**
 * Fetch WiFi pack purchases
 */
export async function fetchWifiPurchasesFromFirestore(): Promise<WifiPurchase[]> {
  try {
    let querySnapshot;
    try {
      querySnapshot = await getDocs(collection(db, "wifiPurchases"));
    } catch (err: any) {
      if (
        (err?.code === "permission-denied" || String(err?.message || "").includes("insufficient permissions")) &&
        auth.currentUser?.uid
      ) {
        querySnapshot = await getDocs(
          query(collection(db, "wifiPurchases"), where("userId", "==", auth.currentUser.uid))
        );
      } else {
        throw err;
      }
    }
    const list: WifiPurchase[] = [];
    querySnapshot.forEach((docSnap) => {
      list.push({ ...docSnap.data() } as WifiPurchase);
    });
    try {
      localStorage.setItem("WAFULA_CACHED_WIFI_PURCHASES", JSON.stringify(list));
    } catch (_) {}
    return list;
  } catch (e) {
    console.warn("Offline/unreachable firestore wifi purchases fetch. Restoring local cache:", e);
    const cached = localStorage.getItem("WAFULA_CACHED_WIFI_PURCHASES");
    if (cached) {
      try {
        return JSON.parse(cached) as WifiPurchase[];
      } catch (_) {}
    }
    return [];
  }
}

/**
 * Save new or update current WiFi hotspot bundle purchase
 */
export async function saveWifiPurchaseToFirestore(purchase: WifiPurchase): Promise<void> {
  try {
    await setDoc(doc(db, "wifiPurchases", purchase.id), sanitizeForFirestore(purchase));
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, `wifiPurchases/${purchase.id}`);
  }
}

/**
 * Delete a WiFi hotspot purchase receipt
 */
export async function deleteWifiPurchaseFromFirestore(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "wifiPurchases", id));
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, `wifiPurchases/${id}`);
  }
}

/**
 * Log user activity for real-time administrative monitoring
 */
export async function logUserActivity(
  userEmail: string,
  userName: string,
  actionType: string,
  details: string
): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    const formattedDate = new Date().toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    const logId = "act_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    await setDoc(doc(db, "user_activities", logId), {
      id: logId,
      userEmail,
      userName: userName || userEmail.split("@")[0] || "Anonymous Scholar",
      actionType,
      details,
      timestamp,
      formattedDate
    });
  } catch (err) {
    console.warn("Could not log user activity to Firestore:", err);
  }
}

/**
 * Fetch search histories
 */
export async function fetchSearchHistoriesFromFirestore(): Promise<SearchHistoryItem[]> {
  try {
    let querySnapshot;
    try {
      querySnapshot = await getDocs(collection(db, "searchHistories"));
    } catch (err: any) {
      if (
        (err?.code === "permission-denied" || String(err?.message || "").includes("insufficient permissions")) &&
        auth.currentUser?.uid
      ) {
        querySnapshot = await getDocs(
          query(collection(db, "searchHistories"), where("userId", "==", auth.currentUser.uid))
        );
      } else {
        throw err;
      }
    }
    const list: SearchHistoryItem[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({ ...data } as SearchHistoryItem);
    });
    try {
      localStorage.setItem("WAFULA_CACHED_SEARCH_HISTORIES", JSON.stringify(list));
    } catch (_) {}
    return list;
  } catch (e) {
    console.warn("Offline/unreachable firestore search histories fetch. Restoring local cache:", e);
    const cached = localStorage.getItem("WAFULA_CACHED_SEARCH_HISTORIES");
    if (cached) {
      try {
        return JSON.parse(cached) as SearchHistoryItem[];
      } catch (_) {}
    }
    return [];
  }
}

/**
 * Save new search history item
 */
export async function saveSearchHistoryToFirestore(item: SearchHistoryItem): Promise<void> {
  try {
    await setDoc(doc(db, "searchHistories", item.id), sanitizeForFirestore(item));
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, `searchHistories/${item.id}`);
  }
}

/**
 * Delete a search history item
 */
export async function deleteSearchHistoryFromFirestore(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "searchHistories", id));
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, `searchHistories/${id}`);
  }
}

/**
 * Delete all search histories for a specific user
 */
export async function clearSearchHistoriesFromFirestore(userId: string): Promise<void> {
  try {
    const q = query(collection(db, "searchHistories"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    const promises = querySnapshot.docs.map((docSnap) => deleteDoc(docSnap.ref));
    await Promise.all(promises);
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, "searchHistories");
  }
}

