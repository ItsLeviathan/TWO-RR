import "server-only";

/**
 * Persistent image storage via Vercel Blob. Uploaded files never touch the server filesystem,
 * so they survive redeploys and work across serverless instances.
 *
 * Local development without a Blob token falls back to `public/uploads/` (git-ignored) so the
 * owner can try uploads immediately. Never used on Vercel, whose filesystem is read-only.
 */
const LOCAL_UPLOAD_PREFIX = "/uploads/";

function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function localUploadsEnabled(): boolean {
  return !blobConfigured() && !process.env.VERCEL && process.env.NODE_ENV !== "production";
}

export function isUploadConfigured(): boolean {
  return blobConfigured() || localUploadsEnabled();
}

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export async function storeImage(file: File, folder: "products" | "gallery" | "brand"): Promise<string> {
  const ext = file.type.split("/")[1] ?? "jpg";
  const safeBase = file.name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9-_]+/gi, "-").slice(0, 40) || "image";
  if (!blobConfigured()) return storeLocally(file, folder, `${safeBase}-${crypto.randomUUID().slice(0, 8)}.${ext}`);
  const { put } = await import("@vercel/blob");
  const blob = await put(`${folder}/${safeBase}.${ext}`, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
  });
  return blob.url;
}

async function storeLocally(file: File, folder: string, name: string): Promise<string> {
  const { mkdir, writeFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return `${LOCAL_UPLOAD_PREFIX}${folder}/${name}`;
}

/** Best-effort removal of an uploaded image (Blob or local) that is no longer referenced. */
export async function deleteStoredImage(url: string | null | undefined): Promise<void> {
  if (!url) return;
  if (url.startsWith(LOCAL_UPLOAD_PREFIX)) {
    if (!localUploadsEnabled() || url.includes("..")) return;
    try {
      const { unlink } = await import("node:fs/promises");
      const path = await import("node:path");
      await unlink(path.join(process.cwd(), "public", ...url.split("/").filter(Boolean)));
    } catch (error) {
      console.warn("[storage] could not delete image", error);
    }
    return;
  }
  if (!blobConfigured()) return;
  try {
    if (!new URL(url).hostname.endsWith(".public.blob.vercel-storage.com")) return;
    const { del } = await import("@vercel/blob");
    await del(url);
  } catch (error) {
    console.warn("[storage] could not delete image", error);
  }
}
