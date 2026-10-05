import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

export type BusinessSettings = typeof schema.businessSettings.$inferSelect;

export const DEFAULT_LOGO_SRC = "/brand/two-rr-logo-640.webp";

/** Loads the single settings row, creating it with defaults the first time. Memoized per request. */
export const getSettings = cache(async (): Promise<BusinessSettings> => {
  await connection();
  const db = await getDb();
  const [row] = await db.select().from(schema.businessSettings).where(eq(schema.businessSettings.id, 1)).limit(1);
  if (row) return row;
  await db.insert(schema.businessSettings).values({ id: 1 }).onConflictDoNothing();
  const [created] = await db.select().from(schema.businessSettings).where(eq(schema.businessSettings.id, 1)).limit(1);
  return created!;
});

/** Subset safe and useful for client components (no internal fields). */
export type PublicBrand = {
  businessName: string;
  tagline: string;
  logoUrl: string | null;
};

export function toPublicBrand(s: BusinessSettings): PublicBrand {
  return { businessName: s.businessName, tagline: s.tagline, logoUrl: s.logoUrl };
}
