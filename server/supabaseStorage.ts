import fs from "fs";
import path from "path";
import type { AuthenticatedRequest } from "./security";

export const SUPABASE_UPLOADS_BUCKET = "user-uploads";

const VAULT_DIR = path.join(process.cwd(), "data", "vault");
if (!fs.existsSync(VAULT_DIR)) {
  fs.mkdirSync(VAULT_DIR, { recursive: true });
}

const ALLOWED_BUCKET_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export function isSupabaseAdminStorageEnabled(): boolean {
  return false;
}

export function getSupabaseStorageAdminClient(): any {
  return null;
}

export async function ensureSupabaseUploadsBucket(): Promise<{
  ready: boolean;
  bucket: string;
  error?: string;
}> {
  return { ready: true, bucket: SUPABASE_UPLOADS_BUCKET };
}

export function getSafeUserStorageFolder(identity: NonNullable<AuthenticatedRequest["identity"]>): string {
  const raw = (identity.uid || identity.email || "member").trim();
  const sanitized = raw.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.+/g, "_").slice(0, 64);
  return sanitized || "member";
}

export function sanitizeVaultObjectPath(rawPath: string): string | null {
  const cleaned = String(rawPath || "")
    .replace(/^supabase:\/\/user-uploads\//, "")
    .replace(/^firestore:\/\/user-uploads\//, "")
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
  try {
    const filePath = path.join(VAULT_DIR, "books", `${bookId}${ext}`);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, buffer);
    return true;
  } catch {
    return false;
  }
}

export async function downloadBookFileFromSupabase(
  bookId: string,
  ext: ".pdf" | ".docx"
): Promise<Buffer | null> {
  try {
    const filePath = path.join(VAULT_DIR, "books", `${bookId}${ext}`);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath);
    }
  } catch {}
  return null;
}

export async function uploadVaultFileViaAdmin(params: {
  ownerFolder: string;
  folder: "documents" | "images";
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<{ path: string; signedUrl: string | null } | null> {
  const mime = ALLOWED_BUCKET_MIMES.has(params.mimeType)
    ? params.mimeType
    : "application/octet-stream";
  if (!ALLOWED_BUCKET_MIMES.has(mime)) {
    throw new Error("Unsupported file type for cloud storage vault.");
  }

  const safeName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file.bin";
  const objectPath = `${params.ownerFolder}/${params.folder}/${Date.now()}_${safeName}`;
  const diskPath = path.join(VAULT_DIR, objectPath);

  fs.mkdirSync(path.dirname(diskPath), { recursive: true });
  fs.writeFileSync(diskPath, params.buffer);

  // Data URL for immediate preview
  const dataUrl = `data:${mime};base64,${params.buffer.toString("base64")}`;

  return {
    path: objectPath,
    signedUrl: dataUrl,
  };
}

export async function listVaultFilesViaAdmin(ownerFolder: string) {
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
    const dir = path.join(VAULT_DIR, ownerFolder, folder);
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file.startsWith(".")) continue;
      const fullDisk = path.join(dir, file);
      const stat = fs.statSync(fullDisk);
      const relPath = `${ownerFolder}/${folder}/${file}`;
      const ext = path.extname(file).toLowerCase();
      const mime =
        ext === ".pdf"
          ? "application/pdf"
          : ext === ".png"
          ? "image/png"
          : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : ext === ".webp"
          ? "image/webp"
          : "application/octet-stream";

      collected.push({
        name: file,
        path: relPath,
        size: stat.size,
        mimeType: mime,
        createdAt: stat.birthtime.toISOString(),
      });
    }
  }

  return collected;
}

export async function getVaultSignedUrlViaAdmin(objectPath: string, _expiresInSeconds = 3600): Promise<string | null> {
  const diskPath = path.join(VAULT_DIR, objectPath);
  if (!fs.existsSync(diskPath)) return null;

  try {
    const buf = fs.readFileSync(diskPath);
    const ext = path.extname(objectPath).toLowerCase();
    const mime =
      ext === ".pdf"
        ? "application/pdf"
        : ext === ".png"
        ? "image/png"
        : ext === ".jpg" || ext === ".jpeg"
        ? "image/jpeg"
        : ext === ".webp"
        ? "image/webp"
        : "application/octet-stream";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function deleteVaultFileViaAdmin(objectPath: string): Promise<boolean> {
  const diskPath = path.join(VAULT_DIR, objectPath);
  if (fs.existsSync(diskPath)) {
    try {
      fs.unlinkSync(diskPath);
      return true;
    } catch {
      return false;
    }
  }
  return true;
}
