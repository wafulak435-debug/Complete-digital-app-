/**
 * IndexedDB offline buffer engine for storing uploaded PDFs and user files durably.
 * Maintains file availability across page reloads, offline sessions, and browser restarts,
 * and requests persistent storage permission to prevent browser eviction.
 */

const DB_NAME = "WafulaUploadedPDFsDB";
const STORE_NAME = "uploaded_pdfs";
const VERSION = 1;

let persistenceRequested = false;

/**
 * Requests durable browser storage so IndexedDB blobs are protected from automatic eviction.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (persistenceRequested) return true;
  persistenceRequested = true;
  try {
    if (typeof navigator !== "undefined" && navigator.storage && typeof navigator.storage.persist === "function") {
      const already = typeof navigator.storage.persisted === "function" ? await navigator.storage.persisted() : false;
      if (already) return true;
      return await navigator.storage.persist();
    }
  } catch {
    // Non-fatal in unsupported browsers
  }
  return false;
}

export async function getOfflineStorageEstimate(): Promise<{ usageBytes: number; quotaBytes: number; persisted: boolean }> {
  try {
    if (typeof navigator !== "undefined" && navigator.storage) {
      const estimate = typeof navigator.storage.estimate === "function" ? await navigator.storage.estimate() : {};
      const persisted = typeof navigator.storage.persisted === "function" ? await navigator.storage.persisted() : false;
      return {
        usageBytes: Number(estimate.usage || 0),
        quotaBytes: Number(estimate.quota || 0),
        persisted,
      };
    }
  } catch {
    // ignore
  }
  return { usageBytes: 0, quotaBytes: 0, persisted: false };
}

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
 * Saves a file blob indexed by bookId and waits for transaction commit before resolving.
 */
export async function savePdfToOfflineDb(bookId: string, file: Blob): Promise<boolean> {
  requestPersistentStorage().catch(() => {});
  const db = await openPdfDb();
  return new Promise<boolean>((resolve, reject) => {
    try {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      store.put({ bookId, file, savedAt: new Date().toISOString() });

      transaction.oncomplete = () => {
        db.close();
        resolve(true);
      };
      transaction.onerror = (event) => {
        db.close();
        reject((event.target as IDBTransaction).error || new Error("IndexedDB transaction failed."));
      };
      transaction.onabort = () => {
        db.close();
        reject(new Error("IndexedDB write was aborted."));
      };
    } catch (err) {
      db.close();
      reject(err);
    }
  });
}

/**
 * Gets a file blob indexed by bookId.
 */
export async function getPdfFromOfflineDb(bookId: string): Promise<Blob | null> {
  try {
    const db = await openPdfDb();
    return await new Promise<Blob | null>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(bookId);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.file : null);
      };
      request.onerror = (event) => reject((event.target as IDBRequest).error);
      transaction.oncomplete = () => db.close();
      transaction.onabort = () => db.close();
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
    return await new Promise((resolve, reject) => {
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
      transaction.oncomplete = () => db.close();
      transaction.onabort = () => db.close();
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
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      store.delete(bookId);

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = (event) => {
        db.close();
        reject((event.target as IDBTransaction).error);
      };
    });
  } catch (err) {
    console.error("Failed to delete PDF file from IndexedDB:", err);
  }
}
