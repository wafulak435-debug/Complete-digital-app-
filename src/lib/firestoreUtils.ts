import { 
  collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, 
  query, where, orderBy, limit, addDoc 
} from "firebase/firestore";
import { db } from "./firebase";
import { User, Book, CommunityMessage, SavedDocument, MemberUploadRequest } from "../types";

/**
 * Normalizes Firebase Firestore permission-denied errors into structured JSON.
 */
function handleFirestoreError(error: any, operationName: string): never {
  console.error(`Firestore error in ${operationName}:`, error);
  if (error && (error.code === "permission-denied" || error.message?.includes("insufficient permissions"))) {
    throw new Error(JSON.stringify({
      code: "PERMISSION_DENIED",
      message: `The security rules rejected this database operation (${operationName}). Secure credential matching or Admin authorization is mandatory.`,
      details: error.message || "Missing or insufficient permissions"
    }));
  }
  throw error;
}

/**
 * Synchronize User Session & setting defaults
 */
export async function syncUserSession(userId: string, email: string, name: string): Promise<User> {
  try {
    const userDocRef = doc(db, "users", userId);
    const docSnap = await getDoc(userDocRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as User;
    } else {
      const newUser: User = {
        email,
        name,
        role: (email === "wafulak435@gmail.com" || email === "wafula435@gmail.com") ? "admin" : "member",
        readingStreak: 1,
        dailyGoalMinutes: 30
      };
      await setDoc(userDocRef, newUser);
      return newUser;
    }
  } catch (e) {
    return handleFirestoreError(e, "syncUserSession");
  }
}

/**
 * Fetch catalog books
 */
export async function fetchBooksFromFirestore(): Promise<Book[]> {
  try {
    const querySnapshot = await getDocs(collection(db, "books"));
    const booksList: Book[] = [];
    querySnapshot.forEach((docSnap) => {
      booksList.push({ ...docSnap.data() } as Book);
    });
    return booksList;
  } catch (e) {
    return handleFirestoreError(e, "fetchBooksFromFirestore");
  }
}

/**
 * Save / Create Book
 */
export async function saveBookToFirestore(book: Book): Promise<void> {
  try {
    await setDoc(doc(db, "books", book.id), book);
  } catch (e) {
    handleFirestoreError(e, "saveBookToFirestore");
  }
}

/**
 * Delete Book
 */
export async function deleteBookFromFirestore(bookId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "books", bookId));
  } catch (e) {
    handleFirestoreError(e, "deleteBookFromFirestore");
  }
}

/**
 * Fetch community messages
 */
export async function fetchCommunityMessagesFromFirestore(): Promise<CommunityMessage[]> {
  try {
    const q = query(collection(db, "communityMessages"), orderBy("date", "asc"));
    const querySnapshot = await getDocs(q);
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
    await setDoc(doc(db, "communityMessages", msg.id), msg);
  } catch (e) {
    handleFirestoreError(e, "saveCommunityMessageToFirestore");
  }
}

/**
 * Delete community chat message
 */
export async function deleteCommunityMessageFromFirestore(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "communityMessages", id));
  } catch (e) {
    handleFirestoreError(e, "deleteCommunityMessageFromFirestore");
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
    return docList;
  } catch (e) {
    return handleFirestoreError(e, "fetchSavedDocumentsFromFirestore");
  }
}

/**
 * Save Personal Document Studio PDF/DOC
 */
export async function saveDocumentToFirestore(docObj: SavedDocument): Promise<void> {
  try {
    await setDoc(doc(db, "savedDocuments", docObj.id), docObj);
  } catch (e) {
    handleFirestoreError(e, "saveDocumentToFirestore");
  }
}

/**
 * Delete Personal Saved Document
 */
export async function deleteSavedDocumentFromFirestore(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "savedDocuments", id));
  } catch (e) {
    handleFirestoreError(e, "deleteSavedDocumentFromFirestore");
  }
}

/**
 * Fetch Member Upload queue Requests
 */
export async function fetchUploadRequestsFromFirestore(): Promise<MemberUploadRequest[]> {
  try {
    const querySnapshot = await getDocs(collection(db, "uploadRequests"));
    const uploadList: MemberUploadRequest[] = [];
    querySnapshot.forEach((docSnap) => {
      uploadList.push({ ...docSnap.data() } as MemberUploadRequest);
    });
    return uploadList;
  } catch (e) {
    return handleFirestoreError(e, "fetchUploadRequestsFromFirestore");
  }
}

/**
 * Save new Member Upload request
 */
export async function saveUploadRequestToFirestore(reqObj: MemberUploadRequest): Promise<void> {
  try {
    await setDoc(doc(db, "uploadRequests", reqObj.id), reqObj);
  } catch (e) {
    handleFirestoreError(e, "saveUploadRequestToFirestore");
  }
}

/**
 * Remove Member Upload Request
 */
export async function deleteUploadRequestFromFirestore(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "uploadRequests", id));
  } catch (e) {
    handleFirestoreError(e, "deleteUploadRequestFromFirestore");
  }
}
