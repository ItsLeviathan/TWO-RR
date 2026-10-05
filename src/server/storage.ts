import "server-only";

/**
 * Persistent image storage via Vercel Blob. Uploaded files never touch the server filesystem,
 * so they survive redeploys and work across serverless instances.
 */
export function isUploadConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export async function storeImage(file: File, folder: "products" | "gallery" | "brand"): Promise<string> {
  const { put } = await import("@vercel/blob");
  const ext = file.type.split("/")[1] ?? "jpg";
  const safeBase = file.name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9-_]+/gi, "-").slice(0, 40) || "image";
  const blob = await put(`${folder}/${safeBase}.${ext}`, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
  });
  return blob.url;
}

/** Best-effort removal of a Blob-hosted image that is no longer referenced. */
export async function deleteStoredImage(url: string | null | undefined): Promise<void> {
  if (!url || !isUploadConfigured()) return;
  try {
    if (!new URL(url).hostname.endsWith(".public.blob.vercel-storage.com")) return;
    const { del } = await import("@vercel/blob");
    await del(url);
  } catch (error) {
    console.warn("[storage] could not delete image", error);
  }
}
