"use server";

import { revalidatePath } from "next/cache";
import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { galleryImageSchema } from "@/lib/validation";
import { requirePermission } from "../auth";
import { ok, toActionError, type ActionResult } from "../result";
import { deleteStoredImage } from "../storage";

export async function addGalleryImage(input: unknown): Promise<ActionResult<null>> {
  try {
    await requirePermission("gallery.manage");
    const data = galleryImageSchema.parse(input);
    const db = await getDb();
    const [max] = await db
      .select({ max: sql<number>`COALESCE(MAX(${schema.galleryImages.sortOrder}), 0)::int` })
      .from(schema.galleryImages);
    await db.insert(schema.galleryImages).values({ ...data, sortOrder: (max?.max ?? 0) + 1 });
    revalidatePath("/", "layout");
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteGalleryImage(input: unknown): Promise<ActionResult<null>> {
  try {
    await requirePermission("gallery.manage");
    const id = z.uuid().parse(input);
    const db = await getDb();
    const [deleted] = await db
      .delete(schema.galleryImages)
      .where(eq(schema.galleryImages.id, id))
      .returning({ url: schema.galleryImages.url });
    if (deleted) await deleteStoredImage(deleted.url);
    revalidatePath("/", "layout");
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

export async function moveGalleryImage(input: unknown): Promise<ActionResult<null>> {
  try {
    await requirePermission("gallery.manage");
    const data = z.object({ id: z.uuid(), direction: z.enum(["up", "down"]) }).parse(input);
    const db = await getDb();
    await db.transaction(async (tx) => {
      const all = await tx
        .select({ id: schema.galleryImages.id })
        .from(schema.galleryImages)
        .orderBy(asc(schema.galleryImages.sortOrder), asc(schema.galleryImages.createdAt))
        .for("update");
      const index = all.findIndex((g) => g.id === data.id);
      const target = data.direction === "up" ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= all.length) return;
      [all[index], all[target]] = [all[target]!, all[index]!];
      for (const [i, g] of all.entries()) {
        await tx.update(schema.galleryImages).set({ sortOrder: i + 1 }).where(eq(schema.galleryImages.id, g.id));
      }
    });
    revalidatePath("/", "layout");
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}
