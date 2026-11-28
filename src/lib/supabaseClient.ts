import type { User, UserProfile, UserHistoryRecord, StorageFileItem } from "../types";
import { db, auth } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
} from "firebase/firestore";

const rawPaystackPublicKey = (import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "").trim();

// Supabase has been permanently removed in favor of pure Firebase Firestore & Auth
export const isSupabaseConfigured = false;
export const supabase: any = null;

export const isPaystackConfigured = Boolean(
  rawPaystackPublicKey &&
    (rawPaystackPublicKey.startsWith("pk_live_") || rawPaystackPublicKey.startsWith("pk_test_"))
);

export const paystackPublicKey = rawPaystackPublicKey;

export const USER_UPLOADS_BUCKET = "user-uploads";
const LOCAL_HISTORY_KEY = "WAFULA_DEMO_USER_HISTORY";
const LOCAL_STORAGE_KEY = "WAFULA_DEMO_USER_UPLOADS";

export function mapProfileToAppUser(
  authUser: { id: string; email?: string; user_metadata?: Record<string, any> },
  profile?: UserProfile | null
): User {
  const email = profile?.email || authUser.email || "";
  const resolvedRole = (profile?.role as User["role"]) || "member";

  return {
    id: authUser.id,
    email,
    name:
      profile?.full_name ||
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      email.split("@")[0] ||
      "Scholar",
    role: resolvedRole,
    phone_number: profile?.phone_number || authUser.user_metadata?.phone_number || undefined,
    phone: profile?.phone_number || authUser.user_metadata?.phone_number || undefined,
    subscription_status: profile?.subscription_status || "free",
    plan_name: profile?.plan_name || "Free",
    credits: typeof profile?.credits === "number" ? profile.credits : 20,
    readingStreak: 1,
    dailyGoalMinutes: 30,
  };
}

// ============================================================================
// PROFILES HELPERS (Using Cloud Firestore)
// ============================================================================

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  if (!userId) return null;
  try {
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        id: snap.id,
        email: data.email || "",
        full_name: data.name || data.full_name || "",
        phone_number: data.phone || data.phone_number || null,
        role: data.role || "member",
        subscription_status: data.subscription_status || "free",
        plan_name: data.plan_name || "Free",
        credits: typeof data.credits === "number" ? data.credits : 20,
      } as UserProfile;
    }
  } catch (err: any) {
    console.warn("Firestore fetchUserProfile notice:", err?.message || err);
  }
  return null;
}

export async function ensureUserProfile(
  authUser: { id: string; email?: string; user_metadata?: Record<string, any> }
): Promise<UserProfile | null> {
  if (!authUser?.id) return null;

  const existing = await fetchUserProfile(authUser.id);
  if (existing) return existing;

  const email = authUser.email || "";
  const fullName =
    authUser.user_metadata?.full_name ||
    authUser.user_metadata?.name ||
    email.split("@")[0] ||
    "Scholar";

  const newProfile: UserProfile = {
    id: authUser.id,
    email,
    full_name: fullName,
    phone_number: authUser.user_metadata?.phone_number || null,
    role: "member",
    subscription_status: "free",
    plan_name: "Free",
    credits: 20,
  };

  try {
    const userRef = doc(db, "users", authUser.id);
    await setDoc(
      userRef,
      {
        id: authUser.id,
        email,
        name: fullName,
        role: "member",
        subscription_status: "free",
        plan_name: "Free",
        credits: 20,
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err: any) {
    console.warn("Firestore ensureUserProfile notice:", err?.message || err);
  }

  return newProfile;
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, "full_name" | "phone_number" | "subscription_status" | "plan_name" | "credits">>
): Promise<UserProfile | null> {
  if (!userId) return null;
  try {
    const userRef = doc(db, "users", userId);
    const firestoreUpdates: Record<string, any> = {};
    if (updates.full_name !== undefined) firestoreUpdates.name = updates.full_name;
    if (updates.phone_number !== undefined) firestoreUpdates.phone = updates.phone_number;
    if (updates.subscription_status !== undefined) firestoreUpdates.subscription_status = updates.subscription_status;
    if (updates.plan_name !== undefined) firestoreUpdates.plan_name = updates.plan_name;
    if (updates.credits !== undefined) firestoreUpdates.credits = updates.credits;
    firestoreUpdates.updatedAt = new Date().toISOString();

    await updateDoc(userRef, firestoreUpdates);
    return await fetchUserProfile(userId);
  } catch (err: any) {
    console.warn("Firestore updateUserProfile notice:", err?.message || err);
    return null;
  }
}

// ============================================================================
// USER_HISTORY HELPERS (AI Generations in Firestore & LocalStorage)
// ============================================================================

export async function saveUserHistory(entry: {
  userId?: string;
  title: string;
  category: string;
  prompt: string;
  response: string;
  metadata?: Record<string, any>;
}): Promise<UserHistoryRecord | null> {
  const recordId = "hist_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
  const now = new Date().toISOString();

  const record: UserHistoryRecord = {
    id: recordId,
    user_id: entry.userId || "demo_user",
    title: entry.title.slice(0, 160),
    category: entry.category,
    prompt: entry.prompt,
    response: entry.response,
    metadata: entry.metadata || {},
    created_at: now,
  };

  // 1. Save to Cloud Firestore
  try {
    const uid = auth.currentUser?.uid || entry.userId;
    if (auth.currentUser && uid) {
      const histRef = doc(db, "userHistory", recordId);
      await setDoc(histRef, {
        id: recordId,
        userId: uid,
        title: record.title,
        category: record.category,
        prompt: record.prompt,
        response: record.response,
        metadata: record.metadata,
        createdAt: now,
      });
    }
  } catch (err: any) {
    console.warn("Firestore saveUserHistory notice:", err?.message || err);
  }

  // 2. Save locally for zero-latency offline access
  try {
    const existing: UserHistoryRecord[] = JSON.parse(
      localStorage.getItem(LOCAL_HISTORY_KEY) || "[]"
    );
    const next = [record, ...existing].slice(0, 60);
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(next));
  } catch {}

  return record;
}

export async function fetchUserHistory(userId?: string): Promise<UserHistoryRecord[]> {
  const localList: UserHistoryRecord[] = (() => {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_HISTORY_KEY) || "[]");
    } catch {
      return [];
    }
  })();

  if (!userId || !auth.currentUser) return localList;

  try {
    const histCol = collection(db, "userHistory");
    const q = query(histCol, where("userId", "==", auth.currentUser.uid), limit(50));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const remoteItems: UserHistoryRecord[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          user_id: data.userId || userId,
          title: data.title || "Study Session",
          category: data.category || "General",
          prompt: data.prompt || "",
          response: data.response || "",
          metadata: data.metadata || {},
          created_at: data.createdAt || new Date().toISOString(),
        };
      });
      return remoteItems;
    }
  } catch (err: any) {
    console.warn("Firestore fetchUserHistory notice:", err?.message || err);
  }

  return localList;
}

export async function deleteUserHistory(id: string, _userId?: string): Promise<boolean> {
  try {
    if (auth.currentUser) {
      const histRef = doc(db, "userHistory", id);
      await deleteDoc(histRef);
    }
  } catch (err: any) {
    console.warn("Firestore deleteUserHistory notice:", err?.message || err);
  }

  try {
    const existing: UserHistoryRecord[] = JSON.parse(
      localStorage.getItem(LOCAL_HISTORY_KEY) || "[]"
    );
    const next = existing.filter((item) => item.id !== id);
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// PRIVATE VAULT STORAGE HELPERS WITH INDEXEDDB & FIRESTORE
// ============================================================================

const SUPA_VAULT_PREFIX = "supa_vault_";
const ALLOWED_BUCKET_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function readLocalVaultMetadata(): StorageFileItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalVaultMetadata(items: StorageFileItem[]): void {
  try {
    const compact = items.slice(0, 200).map((it) => ({
      ...it,
      signedUrl: it.signedUrl && it.signedUrl.startsWith("data:") ? undefined : it.signedUrl,
    }));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(compact));
  } catch {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items.slice(0, 50)));
    } catch {}
  }
}

async function cacheFileInVaultDb(filePath: string, file: Blob): Promise<void> {
  try {
    const { savePdfToOfflineDb } = await import("../utils/pdfDb");
    await savePdfToOfflineDb(`${SUPA_VAULT_PREFIX}${filePath}`, file);
  } catch (err) {
    console.warn("Could not mirror storage file in IndexedDB:", err);
  }
}

async function readFileUrlFromVaultDb(filePath: string): Promise<string | null> {
  try {
    const { getPdfFromOfflineDb } = await import("../utils/pdfDb");
    const blob = await getPdfFromOfflineDb(`${SUPA_VAULT_PREFIX}${filePath}`);
    if (blob) {
      return URL.createObjectURL(blob);
    }
  } catch {}
  return null;
}

async function deleteFileFromVaultDb(filePath: string): Promise<void> {
  try {
    const { deletePdfFromOfflineDb } = await import("../utils/pdfDb");
    await deletePdfFromOfflineDb(`${SUPA_VAULT_PREFIX}${filePath}`);
  } catch {}
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function uploadUserFile(
  userId: string,
  file: File,
  folder = "documents"
): Promise<{ path: string; signedUrl: string | null; storageBackend: "supabase" | "indexeddb" }> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${userId}/${folder}/${Date.now()}_${safeName}`;
  const mime = file.type || "application/octet-stream";

  // Retain durable local IndexedDB copy first
  await cacheFileInVaultDb(filePath, file);

  const existing = readLocalVaultMetadata().filter((f) => f.path !== filePath);
  const localItem: StorageFileItem = {
    name: file.name,
    path: filePath,
    size: file.size,
    mimeType: mime,
    createdAt: new Date().toISOString(),
  };

  // Register in Firestore userFiles collection with hardened alphanumeric ID
  try {
    if (auth.currentUser) {
      const docId = filePath.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
      const fileDocRef = doc(db, "userFiles", docId);
      await setDoc(fileDocRef, {
        id: docId,
        userId: auth.currentUser.uid,
        path: filePath,
        name: file.name,
        size: file.size,
        mimeType: mime,
        folder,
        createdAt: new Date().toISOString(),
      });
    }
  } catch (err: any) {
    console.warn("Firestore file index notice:", err?.message || err);
  }

  // Backup to server vault bridge if available
  if (ALLOWED_BUCKET_MIMES.has(mime) && file.size <= 35 * 1024 * 1024) {
    try {
      const { secureApiFetch } = await import("./aiClient");
      const fileBase64 = await blobToBase64(file);
      const res = await secureApiFetch("/api/storage/vault/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: mime,
          folder: folder === "images" ? "images" : "documents",
          fileBase64,
        }),
      });
      if (res.ok) {
        const payload = await res.json().catch(() => ({}));
        if (payload?.success && payload?.path) {
          await cacheFileInVaultDb(payload.path, file);
          const previewUrl = await readFileUrlFromVaultDb(payload.path);
          writeLocalVaultMetadata([
            { ...localItem, path: payload.path, signedUrl: previewUrl || undefined },
            ...existing,
          ]);
          return {
            path: payload.path,
            signedUrl: previewUrl,
            storageBackend: "indexeddb",
          };
        }
      }
    } catch {}
  }

  writeLocalVaultMetadata([localItem, ...existing]);
  const objectUrl = await readFileUrlFromVaultDb(filePath);
  return { path: filePath, signedUrl: objectUrl, storageBackend: "indexeddb" };
}

export async function getUserFileSignedUrl(
  filePath: string,
  _expiresInSeconds = 3600
): Promise<string | null> {
  const cleanPath = filePath.replace(/^(supabase:\/\/user-uploads\/|firestore:\/\/user-uploads\/)/, "");

  // Read from durable IndexedDB blob
  const dbUrl = await readFileUrlFromVaultDb(cleanPath);
  if (dbUrl) return dbUrl;

  try {
    const { secureApiFetch } = await import("./aiClient");
    const res = await secureApiFetch(`/api/storage/vault/signed-url?path=${encodeURIComponent(cleanPath)}`);
    if (res.ok) {
      const payload = await res.json().catch(() => ({}));
      if (payload?.signedUrl) return String(payload.signedUrl);
    }
  } catch {}

  const existing = readLocalVaultMetadata();
  return existing.find((f) => f.path === cleanPath)?.signedUrl || null;
}

export async function listUserFiles(userId: string): Promise<StorageFileItem[]> {
  const localFiles = readLocalVaultMetadata();
  if (!userId || !auth.currentUser) return localFiles;

  try {
    const filesCol = collection(db, "userFiles");
    const q = query(filesCol, where("userId", "==", auth.currentUser.uid), limit(100));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const remoteList: StorageFileItem[] = [];
      for (const d of snap.docs) {
        const data = d.data();
        const fullPath = data.path || d.id;
        const signedUrl = await getUserFileSignedUrl(fullPath, 3600);
        remoteList.push({
          name: data.name || "File",
          path: fullPath,
          size: Number(data.size || 0),
          mimeType: data.mimeType || "application/octet-stream",
          createdAt: data.createdAt || new Date().toISOString(),
          signedUrl: signedUrl || undefined,
        });
      }
      const remotePaths = new Set(remoteList.map((r) => r.path));
      const localUnsynced = localFiles.filter((lf) => !remotePaths.has(lf.path));
      return [...remoteList, ...localUnsynced];
    }
  } catch (err: any) {
    console.warn("Firestore listUserFiles notice:", err?.message || err);
  }

  return localFiles;
}

export async function syncLocalVaultFilesToSupabase(userId: string): Promise<number> {
  if (!userId || !auth.currentUser) return 0;
  const localFiles = readLocalVaultMetadata();
  if (localFiles.length === 0) return 0;

  let syncedCount = 0;
  for (const item of localFiles) {
    try {
      const docId = item.path.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
      const fileDocRef = doc(db, "userFiles", docId);
      await setDoc(
        fileDocRef,
        {
          id: docId,
          userId: auth.currentUser.uid,
          path: item.path,
          name: item.name,
          size: item.size,
          mimeType: item.mimeType,
          syncedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      syncedCount++;
    } catch {}
  }
  return syncedCount;
}

export async function deleteUserFile(filePath: string): Promise<boolean> {
  const cleanPath = filePath.replace(/^(supabase:\/\/user-uploads\/|firestore:\/\/user-uploads\/)/, "");
  await deleteFileFromVaultDb(cleanPath);

  try {
    if (auth.currentUser) {
      const docId = cleanPath.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
      const fileDocRef = doc(db, "userFiles", docId);
      await deleteDoc(fileDocRef);
    }
  } catch {}

  try {
    const { secureApiFetch } = await import("./aiClient");
    await secureApiFetch("/api/storage/vault", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: cleanPath }),
    });
  } catch {}

  try {
    const existing = readLocalVaultMetadata();
    writeLocalVaultMetadata(existing.filter((f) => f.path !== cleanPath));
    return true;
  } catch {
    return false;
  }
}
