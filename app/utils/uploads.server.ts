import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

// Merchant-uploaded feed media lives on local disk next to the app. It is
// untracked by git, so `git pull` deploys leave it in place.
// Kept outside the "/uploads" URL path on purpose: Vite dev refuses to let a
// route handle URLs that match a real folder in the project root.
const UPLOADS_DIR = path.join(process.cwd(), "storage", "uploads");
const PUBLIC_PREFIX = "/uploads/";

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export const UPLOAD_CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
};

const SAFE_NAME = /^[0-9a-f-]{36}\.[a-z0-9]+$/;

export class UploadError extends Error {}

export async function saveUploadedFile(file: File) {
  const extension = path.extname(file.name).toLowerCase();
  if (!UPLOAD_CONTENT_TYPES[extension]) {
    throw new UploadError("Unsupported file type. Use JPG, PNG, GIF, WEBP, MP4, MOV or WEBM.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError("File is too large (max 50 MB).");
  }

  await mkdir(UPLOADS_DIR, { recursive: true });
  const filename = `${randomUUID()}${extension}`;
  await writeFile(path.join(UPLOADS_DIR, filename), Buffer.from(await file.arrayBuffer()));

  return {
    url: `${PUBLIC_PREFIX}${filename}`,
    mediaType: UPLOAD_CONTENT_TYPES[extension].startsWith("video/") ? "video" : "image",
  };
}

/** Absolute path for a served upload, or null if the name isn't one we generated. */
export function resolveUploadPath(filename: string | undefined) {
  if (!filename || !SAFE_NAME.test(filename)) return null;
  return path.join(UPLOADS_DIR, filename);
}

/** Remove the file behind a stored media URL, if it is one of our uploads. */
export async function deleteUploadedFile(url: string) {
  if (!url.startsWith(PUBLIC_PREFIX)) return;
  const filePath = resolveUploadPath(url.slice(PUBLIC_PREFIX.length));
  if (filePath) await unlink(filePath).catch(() => {});
}

// Uploads are stored as relative paths so they keep working if the app's
// domain changes (e.g. a dev tunnel). Merchant-pasted URLs are absolute.
export function resolveMediaUrl(url: string) {
  return url.startsWith("/") ? `${process.env.SHOPIFY_APP_URL || ""}${url}` : url;
}
