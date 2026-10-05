export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** Accepts https URLs and site-relative paths; rejects javascript:, data:, etc. */
export function isSafeImageUrl(url: string): boolean {
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

/** Images on Vercel Blob are optimized by next/image; any other host is served as-is. */
export function isOptimizableImage(url: string): boolean {
  if (url.startsWith("/")) return true;
  try {
    return new URL(url).hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}
