/**
 * IndexedDB offline buffer engine for storing uploaded large PDF files securely.
 * This allows users to read uploaded books directly from the application without a download,
 * and maintains the file availability across page reloads and offline sessions.
 */

const DB_NAME = "WafulaUploadedPDFsDB";
const STORE_NAME = "uploaded_pdfs";
const VERSION = 1;

export function openPdfDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this browser environment."));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "bookId" });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

/**
 * Saves a file blob indexed by bookId.
 */
export async function savePdfToOfflineDb(bookId: string, file: Blob): Promise<void> {
  try {
    const db = await openPdfDb();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ bookId, file });

      request.onsuccess = () => resolve();
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    });
  } catch (err) {
    console.error("Failed to store PDF file in IndexedDB:", err);
  }
}

/**
 * Gets a file blob indexed by bookId.
 */
export async function getPdfFromOfflineDb(bookId: string): Promise<Blob | null> {
  try {
    const db = await openPdfDb();
    return new Promise<Blob | null>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(bookId);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.file : null);
      };
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    });
  } catch (err) {
    console.error("Failed to retrieve PDF file from IndexedDB:", err);
    return null;
  }
}

/**
 * Retrieves all saved Book IDs and files.
 */
export async function getAllOfflinePdfs(): Promise<Map<string, Blob>> {
  const map = new Map<string, Blob>();
  try {
    const db = await openPdfDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result || [];
        items.forEach((item: { bookId: string; file: Blob }) => {
          map.set(item.bookId, item.file);
        });
        resolve(map);
      };
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    });
  } catch (err) {
    console.error("Failed to load all local PDF files from IndexedDB:", err);
    return map;
  }
}

/**
 * Deletes a cached PDF file.
 */
export async function deletePdfFromOfflineDb(bookId: string): Promise<void> {
  try {
    const db = await openPdfDb();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(bookId);

      request.onsuccess = () => resolve();
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    });
  } catch (err) {
    console.error("Failed to delete PDF file from IndexedDB:", err);
  }
}
