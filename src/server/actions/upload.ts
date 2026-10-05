"use server";

import { requirePermission } from "../auth";
import { fail, ok, toActionError, type ActionResult } from "../result";
import { ALLOWED_IMAGE_TYPES, isUploadConfigured, MAX_IMAGE_BYTES, storeImage } from "../storage";

export async function uploadImage(formData: FormData): Promise<ActionResult<{ url: string }>> {
  try {
    await requirePermission("products.manage");
    if (!isUploadConfigured()) {
      return fail("Image uploads are not configured. Connect Vercel Blob (BLOB_READ_WRITE_TOKEN) or paste an image link.");
    }
    const file = formData.get("file");
    const folderValue = formData.get("folder");
    const folder = folderValue === "gallery" || folderValue === "brand" ? folderValue : "products";
    if (!(file instanceof File) || file.size === 0) return fail("Choose an image to upload.");
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      return fail("Use a JPG, PNG, WebP or AVIF image.");
    }
    if (file.size > MAX_IMAGE_BYTES) return fail("Images must be 4 MB or smaller.");
    const url = await storeImage(file, folder);
    return ok({ url });
  } catch (error) {
    return toActionError(error, "The upload failed. Please try again.");
  }
}
