import "server-only";
import { connection } from "next/server";
import { asc } from "drizzle-orm";
import { getDb, schema } from "@/db";

export type GalleryImage = typeof schema.galleryImages.$inferSelect;

export async function getGalleryImages(): Promise<GalleryImage[]> {
  await connection();
  const db = await getDb();
  return db
    .select()
    .from(schema.galleryImages)
    .orderBy(asc(schema.galleryImages.sortOrder), asc(schema.galleryImages.createdAt));
}
