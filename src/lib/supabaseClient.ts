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
// PRIVATE STORAGE BUCKET (user-uploads) HELPERS
// ============================================================================

export async function uploadUserFile(
  userId: string,
  file: File,
  folder = "documents"
): Promise<{ path: string; signedUrl: string | null }> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${userId}/${folder}/${Date.now()}_${safeName}`;

  if (supabase && isSupabaseConfigured) {
    const { error } = await supabase.storage
      .from(USER_UPLOADS_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "application/octet-stream",
      });

    if (error) {
      throw new Error(error.message || "Failed to upload file to private storage.");
    }

    const signedUrl = await getUserFileSignedUrl(filePath, 3600);
    return { path: filePath, signedUrl };
  }

  // Demo mode fallback using Data URL in localStorage (up to 2 MB for local preview)
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });

  const existing: StorageFileItem[] = JSON.parse(
    localStorage.getItem(LOCAL_STORAGE_KEY) || "[]"
  );
  const item: StorageFileItem = {
    name: file.name,
    path: filePath,
    size: file.size,
    mimeType: file.type || "application/octet-stream",
    createdAt: new Date().toISOString(),
    signedUrl: dataUrl,
  };
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([item, ...existing].slice(0, 20)));
  return { path: filePath, signedUrl: dataUrl };
}

export async function getUserFileSignedUrl(
  filePath: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  if (supabase && isSupabaseConfigured) {
    const { data, error } = await supabase.storage
      .from(USER_UPLOADS_BUCKET)
      .createSignedUrl(filePath, expiresInSeconds);

    if (error) {
      console.warn("Signed URL error:", error.message);
      return null;
    }
    return data?.signedUrl || null;
  }

  const existing: StorageFileItem[] = JSON.parse(
    localStorage.getItem(LOCAL_STORAGE_KEY) || "[]"
  );
  return existing.find((f) => f.path === filePath)?.signedUrl || null;
}

export async function listUserFiles(userId: string): Promise<StorageFileItem[]> {
  if (supabase && isSupabaseConfigured && userId) {
    const folders = ["documents", "images"];
    const collected: StorageFileItem[] = [];

    for (const folder of folders) {
      const { data, error } = await supabase.storage
        .from(USER_UPLOADS_BUCKET)
        .list(`${userId}/${folder}`, {
          limit: 50,
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
    return collected;
  }

  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export async function deleteUserFile(filePath: string): Promise<boolean> {
  if (supabase && isSupabaseConfigured) {
    const { error } = await supabase.storage
      .from(USER_UPLOADS_BUCKET)
      .remove([filePath]);
    if (!error) return true;
  }

  try {
    const existing: StorageFileItem[] = JSON.parse(
      localStorage.getItem(LOCAL_STORAGE_KEY) || "[]"
    );
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify(existing.filter((f) => f.path !== filePath))
    );
    return true;
  } catch {
    return false;
  }
}
