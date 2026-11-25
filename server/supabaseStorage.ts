import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AuthenticatedRequest } from "./security";

export const SUPABASE_UPLOADS_BUCKET = "user-uploads";

const ALLOWED_BUCKET_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

let cachedAdminClient: SupabaseClient | null = null;
let cachedConfigKey = "";
let bucketReady = false;
let bucketPromise: Promise<boolean> | null = null;

function readSupabaseServerCredentials() {
  const url = (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ""
  ).trim();
  const secretKey = (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  ).trim();
  return { url, secretKey };
}

export function isSupabaseAdminStorageEnabled(): boolean {
  if (process.env.ZION_TEST_MODE === "1") return false;
  const { url, secretKey } = readSupabaseServerCredentials();
  return Boolean(url && secretKey && (url.startsWith("https://") || url.startsWith("http://")));
}

export function getSupabaseStorageAdminClient(): SupabaseClient | null {
  if (!isSupabaseAdminStorageEnabled()) return null;
  const { url, secretKey } = readSupabaseServerCredentials();
  const configKey = `${url}|${secretKey.slice(0, 12)}`;
  if (!cachedAdminClient || cachedConfigKey !== configKey) {
    cachedAdminClient = createClient(url, secretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    cachedConfigKey = configKey;
    bucketReady = false;
    bucketPromise = null;
  }
  return cachedAdminClient;
}

export async function ensureSupabaseUploadsBucket(): Promise<{
  ready: boolean;
  bucket: string;
  error?: string;
}> {
  const client = getSupabaseStorageAdminClient();
  if (!client) {
    return { ready: false, bucket: SUPABASE_UPLOADS_BUCKET, error: "Supabase admin credentials not active." };
  }
  if (bucketReady) {
    return { ready: true, bucket: SUPABASE_UPLOADS_BUCKET };
  }
  if (bucketPromise) {
    const ok = await bucketPromise;
    return { ready: ok, bucket: SUPABASE_UPLOADS_BUCKET };
  }

  bucketPromise = (async () => {
    try {
      const { data, error } = await client.storage.getBucket(SUPABASE_UPLOADS_BUCKET);
      if (!error && data) {
        bucketReady = true;
        return true;
      }

      const { error: createErr } = await client.storage.createBucket(SUPABASE_UPLOADS_BUCKET, {
        public: false,
        fileSizeLimit: 52428800,
        allowedMimeTypes: Array.from(ALLOWED_BUCKET_MIMES),
      });

      if (!createErr || createErr.message?.toLowerCase().includes("already exists")) {
        bucketReady = true;
        return true;
      }
      console.warn("Supabase bucket create warning:", createErr.message);
      return false;
    } catch (err: any) {
      console.warn("Supabase ensureBucket warning:", err?.message || err);
      return false;
    } finally {
      bucketPromise = null;
    }
  })();

  const ok = await bucketPromise;
  return { ready: ok, bucket: SUPABASE_UPLOADS_BUCKET };
}

export function getSafeUserStorageFolder(identity: NonNullable<AuthenticatedRequest["identity"]>): string {
  const raw = (identity.uid || identity.email || "member").trim();
  const sanitized = raw.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.+/g, "_").slice(0, 64);
  return sanitized || "member";
}

export function sanitizeVaultObjectPath(rawPath: string): string | null {
  const cleaned = String(rawPath || "")
    .replace(/^supabase:\/\/user-uploads\//, "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
  if (!cleaned || cleaned.includes("..") || cleaned.includes("\0")) return null;
  const parts = cleaned.split("/").filter(Boolean);
  if (parts.length < 2 || parts.length > 5) return null;
  for (const part of parts) {
    if (!/^[a-zA-Z0-9._-]+$/.test(part)) return null;
  }
  return parts.join("/");
}

export async function mirrorBookFileToSupabase(
  bookId: string,
  ext: ".pdf" | ".docx",
  buffer: Buffer
): Promise<boolean> {
  const { ready } = await ensureSupabaseUploadsBucket();
  const client = getSupabaseStorageAdminClient();
  if (!ready || !client) return false;

  const contentType =
    ext === ".pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  const objectPath = `books/${bookId}${ext}`;
  const { error } = await client.storage.from(SUPABASE_UPLOADS_BUCKET).upload(objectPath, buffer, {
    contentType,
    cacheControl: "3600",
    upsert: true,
  });

  if (error) {
    console.warn("Mirror book to Supabase warning:", error.message);
    return false;
  }
  return true;
}

export async function downloadBookFileFromSupabase(
  bookId: string,
  ext: ".pdf" | ".docx"
): Promise<Buffer | null> {
  const { ready } = await ensureSupabaseUploadsBucket();
  const client = getSupabaseStorageAdminClient();
  if (!ready || !client) return null;

  const objectPath = `books/${bookId}${ext}`;
  const { data, error } = await client.storage.from(SUPABASE_UPLOADS_BUCKET).download(objectPath);
  if (error || !data) return null;

  const arrayBuf = await data.arrayBuffer();
  return Buffer.from(arrayBuf);
}

export async function uploadVaultFileViaAdmin(params: {
  ownerFolder: string;
  folder: "documents" | "images";
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<{ path: string; signedUrl: string | null } | null> {
  const { ready } = await ensureSupabaseUploadsBucket();
  const client = getSupabaseStorageAdminClient();
  if (!ready || !client) return null;

  const mime = ALLOWED_BUCKET_MIMES.has(params.mimeType)
    ? params.mimeType
    : "application/octet-stream";
  if (!ALLOWED_BUCKET_MIMES.has(mime)) {
    throw new Error("Unsupported file type for cloud storage vault.");
  }

  const safeName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file.bin";
  const objectPath = `${params.ownerFolder}/${params.folder}/${Date.now()}_${safeName}`;

  const { error } = await client.storage.from(SUPABASE_UPLOADS_BUCKET).upload(objectPath, params.buffer, {
    contentType: mime,
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data: signedData } = await client.storage
    .from(SUPABASE_UPLOADS_BUCKET)
    .createSignedUrl(objectPath, 3600);

  return {
    path: objectPath,
    signedUrl: signedData?.signedUrl || null,
  };
}

export async function listVaultFilesViaAdmin(ownerFolder: string) {
  const { ready } = await ensureSupabaseUploadsBucket();
  const client = getSupabaseStorageAdminClient();
  if (!ready || !client) return null;

  const folders: Array<"documents" | "images"> = ["documents", "images"];
  const collected: Array<{
    name: string;
    path: string;
    size: number;
    mimeType: string;
    createdAt: string;
    signedUrl?: string;
  }> = [];

  for (const folder of folders) {
    const { data, error } = await client.storage
      .from(SUPABASE_UPLOADS_BUCKET)
      .list(`${ownerFolder}/${folder}`, {
        limit: 100,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (!error && Array.isArray(data)) {
      for (const obj of data) {
        if (!obj.name || obj.name === ".emptyFolderPlaceholder") continue;
        const fullPath = `${ownerFolder}/${folder}/${obj.name}`;
        const { data: signed } = await client.storage
          .from(SUPABASE_UPLOADS_BUCKET)
          .createSignedUrl(fullPath, 3600);
        collected.push({
          name: obj.name,
          path: fullPath,
          size: Number((obj.metadata as any)?.size || 0),
          mimeType: String((obj.metadata as any)?.mimetype || "application/octet-stream"),
          createdAt: obj.created_at || new Date().toISOString(),
          signedUrl: signed?.signedUrl || undefined,
        });
      }
    }
  }

  return collected;
}

export async function getVaultSignedUrlViaAdmin(objectPath: string, expiresInSeconds = 3600): Promise<string | null> {
  const { ready } = await ensureSupabaseUploadsBucket();
  const client = getSupabaseStorageAdminClient();
  if (!ready || !client) return null;

  const { data, error } = await client.storage
    .from(SUPABASE_UPLOADS_BUCKET)
    .createSignedUrl(objectPath, Math.min(86400, Math.max(60, expiresInSeconds)));

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function deleteVaultFileViaAdmin(objectPath: string): Promise<boolean> {
  const { ready } = await ensureSupabaseUploadsBucket();
  const client = getSupabaseStorageAdminClient();
  if (!ready || !client) return false;

  const { error } = await client.storage.from(SUPABASE_UPLOADS_BUCKET).remove([objectPath]);
  return !error;
}
