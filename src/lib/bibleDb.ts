export interface Highlight {
  id: string; // e.g. "Genesis_1_1" or "John_1_1"
  book: string;
  chapter: number;
  verse: number;
  color: string;
  createdAt: number;
}

export interface StudyNote {
  id: string; // e.g. "Genesis_1_1" or "John_1_1"
  book: string;
  chapter: number;
  verse: number;
  text: string;
  updatedAt: number;
}

const DB_NAME = "BibleOfflineDB";
const DB_VERSION = 2;

export class BibleDB {
  private static instance: IDBDatabase | null = null;

  private static getDB(): Promise<IDBDatabase> {
    if (this.instance) return Promise.resolve(this.instance);

    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !window.indexedDB) {
        reject(new Error("IndexedDB is not available in this environment."));
        return;
      }
      
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("highlights")) {
          db.createObjectStore("highlights", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("notes")) {
          db.createObjectStore("notes", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("verses")) {
          db.createObjectStore("verses", { keyPath: "id" });
        }
      };

      request.onsuccess = () => {
        this.instance = request.result;
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // --- HIGHLIGHTS ---
  public static async getHighlights(): Promise<Highlight[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction("highlights", "readonly");
        const store = transaction.objectStore("highlights");
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn("Could not load highlights from IndexedDB:", e);
      return [];
    }
  }

  public static async saveHighlight(highlight: Highlight): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction("highlights", "readwrite");
        const store = transaction.objectStore("highlights");
        const request = store.put(highlight);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn("Could not save highlight to IndexedDB:", e);
    }
  }

  public static async deleteHighlight(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction("highlights", "readwrite");
        const store = transaction.objectStore("highlights");
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn("Could not delete highlight from IndexedDB:", e);
    }
  }

  // --- NOTES ---
  public static async getNotes(): Promise<StudyNote[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction("notes", "readonly");
        const store = transaction.objectStore("notes");
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn("Could not load study notes from IndexedDB:", e);
      return [];
    }
  }

  public static async saveNote(note: StudyNote): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction("notes", "readwrite");
        const store = transaction.objectStore("notes");
        const request = store.put(note);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn("Could not save study note to IndexedDB:", e);
    }
  }

  public static async deleteNote(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction("notes", "readwrite");
        const store = transaction.objectStore("notes");
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn("Could not delete study note from IndexedDB:", e);
    }
  }

  // --- OFFLINE SCRIPTURES CACHE ---
  public static async getCachedChapter(book: string, chapter: number, version: string): Promise<string[] | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction("verses", "readonly");
        const store = transaction.objectStore("verses");
        const id = `${book}_${chapter}_${version.toUpperCase()}`;
        const request = store.get(id);

        request.onsuccess = () => {
          if (request.result) {
            resolve(request.result.verses);
          } else {
            resolve(null);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn("Could not get cached chapter from IndexedDB:", e);
      return null;
    }
  }

  public static async saveCachedChapter(book: string, chapter: number, version: string, verses: string[]): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction("verses", "readwrite");
        const store = transaction.objectStore("verses");
        const id = `${book}_${chapter}_${version.toUpperCase()}`;
        const request = store.put({ 
          id, 
          book, 
          chapter, 
          version: version.toUpperCase(), 
          verses, 
          updatedAt: Date.now() 
        });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn("Could not save cached chapter to IndexedDB:", e);
    }
  }

  public static async clearAllCachedChapters(): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction("verses", "readwrite");
        const store = transaction.objectStore("verses");
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn("Could not clear cached chapters list:", e);
    }
  }

  public static async getAllCachedChapters(): Promise<any[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction("verses", "readonly");
        const store = transaction.objectStore("verses");
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn("Could not retrieve all cached chapters from IndexedDB:", e);
      return [];
    }
  }
}
