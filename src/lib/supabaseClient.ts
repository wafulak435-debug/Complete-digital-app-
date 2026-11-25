import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient as createSsrBrowserClient, getSupabaseBrowserEnv } from "../utils/supabase/client";
import type { User, UserProfile, UserHistoryRecord, StorageFileItem } from "../types";

const { configured: browserSupabaseConfigured } = getSupabaseBrowserEnv();
const rawPaystackPublicKey = (import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "").trim();

export const isSupabaseConfigured = browserSupabaseConfigured;

export const isPaystackConfigured = Boolean(
  rawPaystackPublicKey &&
    (rawPaystackPublicKey.startsWith("pk_live_") || rawPaystackPublicKey.startsWith("pk_test_"))
);

export const paystackPublicKey = rawPaystackPublicKey;

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? (createSsrBrowserClient() as unknown as SupabaseClient)
  : null;

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
// PROFILES HELPERS
// ============================================================================

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn("Supabase fetchUserProfile warning:", error.message);
    return null;
  }
  return data as UserProfile | null;
}

export async function ensureUserProfile(
  authUser: { id: string; email?: string; user_metadata?: Record<string, any> }
): Promise<UserProfile | null> {
  if (!supabase || !authUser?.id) return null;

  const existing = await fetchUserProfile(authUser.id);
  if (existing) return existing;

  const email = authUser.email || "";
  const fullName =
    authUser.user_metadata?.full_name ||
    authUser.user_metadata?.name ||
    email.split("@")[0] ||
    "Scholar";

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: authUser.id,
        email,
        full_name: fullName,
        phone_number: authUser.user_metadata?.phone_number || null,
        role: "member",
        subscription_status: "free",
        plan_name: "Free",
        credits: 20,
      },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (error) {
    console.warn("Supabase ensureUserProfile warning:", error.message);
    return null;
  }
  return data as UserProfile;
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, "full_name" | "phone_number" | "subscription_status" | "plan_name" | "credits">>
): Promise<UserProfile | null> {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    console.warn("Supabase updateUserProfile error:", error.message);
    return null;
  }
  return data as UserProfile;
}

// ============================================================================
// USER_HISTORY HELPERS (AI Generations & Projects)
// ============================================================================

export async function saveUserHistory(entry: {
  userId?: string;
  title: string;
  category: string;
  prompt: string;
  response: string;
  metadata?: Record<string, any>;
}): Promise<UserHistoryRecord | null> {
  if (supabase && entry.userId) {
    const { data, error } = await supabase
      .from("user_history")
      .insert({
        user_id: entry.userId,
        title: entry.title.slice(0, 160),
        category: entry.category,
        prompt: entry.prompt,
        response: entry.response,
        metadata: entry.metadata || {},
      })
      .select()
      .single();

    if (!error && data) {
      return data as UserHistoryRecord;
    }
    if (error) {
      console.warn("Supabase saveUserHistory error:", error.message);
    }
  }

  // Demo / Offline local fallback
  try {
    const existing: UserHistoryRecord[] = JSON.parse(
      localStorage.getItem(LOCAL_HISTORY_KEY) || "[]"
    );
    const localRecord: UserHistoryRecord = {
      id: "hist_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      user_id: entry.userId || "demo_user",
      title: entry.title.slice(0, 160),
      category: entry.category,
      prompt: entry.prompt,
      response: entry.response,
      metadata: entry.metadata || {},
      created_at: new Date().toISOString(),
    };
    const next = [localRecord, ...existing].slice(0, 60);
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(next));
    return localRecord;
  } catch {
    return null;
  }
}

export async function fetchUserHistory(userId?: string): Promise<UserHistoryRecord[]> {
  if (supabase && userId) {
    const { data, error } = await supabase
      .from("user_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && Array.isArray(data)) {
      return data as UserHistoryRecord[];
    }
    if (error) {
      console.warn("Supabase fetchUserHistory error:", error.message);
    }
  }

  try {
    return JSON.parse(localStorage.getItem(LOCAL_HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

export async function deleteUserHistory(id: string, userId?: string): Promise<boolean> {
  if (supabase && userId) {
    const { error } = await supabase
      .from("user_history")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (!error) return true;
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
// PRIVATE STORAGE BUCKET (user-uploads) HELPERS WITH INDEXEDDB ANTI-DATA-LOSS
// ============================================================================

const SUPA_VAULT_PREFIX = "supa_vault_";
const ALLOWED_SUPABASE_BUCKET_MIMES = new Set([
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
    // Store metadata only (strip heavy inline Data URLs so localStorage never overflows)
    const compact = items.slice(0, 200).map((it) => ({
      ...it,
      signedUrl: it.signedUrl && it.signedUrl.startsWith("data:") ? undefined : it.signedUrl,
    }));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(compact));
  } catch {
    // Fallback keep newest 50 items if browser quota is tight
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items.slice(0, 50)));
    } catch {
      // ignore
    }
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
  } catch {
    // ignore
  }
  return null;
}

async function deleteFileFromVaultDb(filePath: string): Promise<void> {
  try {
    const { deletePdfFromOfflineDb } = await import("../utils/pdfDb");
    await deletePdfFromOfflineDb(`${SUPA_VAULT_PREFIX}${filePath}`);
  } catch {
    // ignore
  }
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

  // Always retain a durable local IndexedDB copy first so the file is never lost
  await cacheFileInVaultDb(filePath, file);

  const existing = readLocalVaultMetadata().filter((f) => f.path !== filePath);
  const localItem: StorageFileItem = {
    name: file.name,
    path: filePath,
    size: file.size,
    mimeType: mime,
    createdAt: new Date().toISOString(),
  };

  if (supabase && isSupabaseConfigured && ALLOWED_SUPABASE_BUCKET_MIMES.has(mime)) {
    const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
    if (sessionData?.session) {
      const { error } = await supabase.storage
        .from(USER_UPLOADS_BUCKET)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: mime,
        });

      if (!error) {
        const signedUrl = await getUserFileSignedUrl(filePath, 3600);
        writeLocalVaultMetadata([{ ...localItem, signedUrl: signedUrl || undefined }, ...existing]);
        return { path: filePath, signedUrl, storageBackend: "supabase" };
      }
      console.warn("Supabase storage upload fallback to server bridge:", error.message);
    }
  }

  // Fallback to authenticated Express -> Supabase Storage bridge (supports Firebase & Zion Auth)
  if (ALLOWED_SUPABASE_BUCKET_MIMES.has(mime) && file.size <= 35 * 1024 * 1024) {
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
          writeLocalVaultMetadata([
            { ...localItem, path: payload.path, signedUrl: payload.signedUrl || undefined },
            ...existing,
          ]);
          return {
            path: payload.path,
            signedUrl: payload.signedUrl || (await readFileUrlFromVaultDb(payload.path)),
            storageBackend: "supabase",
          };
        }
      }
    } catch {
      // Fall through cleanly to durable IndexedDB cache
    }
  }

  // Offline or pre-auth mode: durable IndexedDB blob + lightweight metadata in localStorage
  writeLocalVaultMetadata([localItem, ...existing]);
  const objectUrl = await readFileUrlFromVaultDb(filePath);
  return { path: filePath, signedUrl: objectUrl, storageBackend: "indexeddb" };
}

export async function getUserFileSignedUrl(
  filePath: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const cleanPath = filePath.replace(/^supabase:\/\/user-uploads\//, "");

  if (supabase && isSupabaseConfigured) {
    const { data, error } = await supabase.storage
      .from(USER_UPLOADS_BUCKET)
      .createSignedUrl(cleanPath, expiresInSeconds);

    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  }

  try {
    const { secureApiFetch } = await import("./aiClient");
    const res = await secureApiFetch(`/api/storage/vault/signed-url?path=${encodeURIComponent(cleanPath)}`);
    if (res.ok) {
      const payload = await res.json().catch(() => ({}));
      if (payload?.signedUrl) return String(payload.signedUrl);
    }
  } catch {
    // ignore offline errors
  }

  // Fallback to durable IndexedDB blob URL first, then legacy Data URL if present
  const dbUrl = await readFileUrlFromVaultDb(cleanPath);
  if (dbUrl) return dbUrl;

  const existing = readLocalVaultMetadata();
  return existing.find((f) => f.path === cleanPath)?.signedUrl || null;
}

export async function listUserFiles(userId: string): Promise<StorageFileItem[]> {
  const localFiles = readLocalVaultMetadata();

  if (supabase && isSupabaseConfigured && userId) {
    const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
    if (sessionData?.session) {
      const folders = ["documents", "images"];
      const collected: StorageFileItem[] = [];

      for (const folder of folders) {
        const { data, error } = await supabase.storage
          .from(USER_UPLOADS_BUCKET)
          .list(`${userId}/${folder}`, {
            limit: 100,
            sortBy: { column: "created_at", order: "desc" },
          });

        if (!error && Array.isArray(data)) {
          for (const obj of data) {
            if (!obj.name || obj.name === ".emptyFolderPlaceholder") continue;
            const fullPath = `${userId}/${folder}/${obj.name}`;
            const signedUrl = await getUserFileSignedUrl(fullPath, 3600);
            collected.push({
              name: obj.name,
              path: fullPath,
              size: Number((obj.metadata as any)?.size || 0),
              mimeType: String((obj.metadata as any)?.mimetype || "application/octet-stream"),
              createdAt: obj.created_at || new Date().toISOString(),
              signedUrl: signedUrl || undefined,
            });
          }
        }
      }

      const remotePaths = new Set(collected.map((c) => c.path));
      const localUnsynced = localFiles.filter((lf) => !remotePaths.has(lf.path));
      return [...collected, ...localUnsynced];
    }
  }

  try {
    const { secureApiFetch } = await import("./aiClient");
    const res = await secureApiFetch("/api/storage/vault/list");
    if (res.ok) {
      const payload = await res.json().catch(() => ({}));
      if (Array.isArray(payload?.files)) {
        const remoteFiles = payload.files as StorageFileItem[];
        const remotePaths = new Set(remoteFiles.map((c) => c.path));
        const localUnsynced = localFiles.filter((lf) => !remotePaths.has(lf.path));
        return [...remoteFiles, ...localUnsynced];
      }
    }
  } catch {
    // ignore offline errors
  }

  return localFiles;
}

export async function syncLocalVaultFilesToSupabase(userId: string): Promise<number> {
  if (!userId) return 0;
  const localFiles = readLocalVaultMetadata();
  if (localFiles.length === 0) return 0;

  const { getPdfFromOfflineDb } = await import("../utils/pdfDb");
  const sessionResult =
    supabase && isSupabaseConfigured
      ? await supabase.auth.getSession().catch(() => ({ data: { session: null } }))
      : { data: { session: null } };
  const hasSupaSession = Boolean(sessionResult.data?.session);

  let syncedCount = 0;

  for (const item of localFiles) {
    if (!ALLOWED_SUPABASE_BUCKET_MIMES.has(item.mimeType)) continue;
    const blob = await getPdfFromOfflineDb(`${SUPA_VAULT_PREFIX}${item.path}`);
    if (!blob) continue;

    if (hasSupaSession && supabase) {
      const { error } = await supabase.storage
        .from(USER_UPLOADS_BUCKET)
        .upload(item.path, blob, {
          cacheControl: "3600",
          upsert: false,
          contentType: item.mimeType || "application/octet-stream",
        });

      if (!error || error.message?.toLowerCase().includes("already exists")) {
        syncedCount++;
        continue;
      }
    }

    try {
      const { secureApiFetch } = await import("./aiClient");
      const fileBase64 = await blobToBase64(blob);
      const res = await secureApiFetch("/api/storage/vault/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: item.name,
          mimeType: item.mimeType,
          folder: item.path.includes("/images/") ? "images" : "documents",
          fileBase64,
        }),
      });
      if (res.ok) syncedCount++;
    } catch {
      // keep in IndexedDB for next retry
    }
  }
  return syncedCount;
}

export async function deleteUserFile(filePath: string): Promise<boolean> {
  await deleteFileFromVaultDb(filePath);

  if (supabase && isSupabaseConfigured) {
    await supabase.storage
      .from(USER_UPLOADS_BUCKET)
      .remove([filePath])
      .catch(() => {});
  }

  try {
    const { secureApiFetch } = await import("./aiClient");
    await secureApiFetch("/api/storage/vault", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: filePath }),
    });
  } catch {
    // ignore offline errors
  }

  try {
    const existing = readLocalVaultMetadata();
    writeLocalVaultMetadata(existing.filter((f) => f.path !== filePath));
    return true;
  } catch {
    return false;
  }
}
