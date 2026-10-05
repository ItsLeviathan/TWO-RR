"use server";

import { revalidatePath } from "next/cache";
import { asc, count, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { slugify } from "@/lib/format";
import { categoryNameSchema } from "@/lib/validation";
import { requirePermission } from "../auth";
import { isUniqueViolation, ok, toActionError, UserFacingError, type ActionResult } from "../result";

const done = () => {
  revalidatePath("/", "layout");
  return ok(null);
};

function categorySlug(name: string) {
  return slugify(name) || `category-${Date.now()}`;
}

export async function createCategory(input: unknown): Promise<ActionResult<null>> {
  try {
    await requirePermission("categories.manage");
    const name = categoryNameSchema.parse(input);
    const db = await getDb();
    const [max] = await db
      .select({ max: sql<number>`COALESCE(MAX(${schema.categories.sortOrder}), 0)::int` })
      .from(schema.categories);
    await db.insert(schema.categories).values({ name, slug: categorySlug(name), sortOrder: (max?.max ?? 0) + 1 });
    return done();
  } catch (error) {
    if (isUniqueViolation(error)) return toActionError(new UserFacingError("A category with that name already exists."));
    return toActionError(error);
  }
}

export async function renameCategory(input: unknown): Promise<ActionResult<null>> {
  try {
    await requirePermission("categories.manage");
    const data = z.object({ id: z.uuid(), name: categoryNameSchema }).parse(input);
    const db = await getDb();
    await db
      .update(schema.categories)
      .set({ name: data.name, slug: categorySlug(data.name) })
      .where(eq(schema.categories.id, data.id));
    return done();
  } catch (error) {
    if (isUniqueViolation(error)) return toActionError(new UserFacingError("A category with that name already exists."));
    return toActionError(error);
  }
}

export async function setCategoryActive(input: unknown): Promise<ActionResult<null>> {
  try {
    await requirePermission("categories.manage");
    const data = z.object({ id: z.uuid(), isActive: z.boolean() }).parse(input);
    const db = await getDb();
    await db.update(schema.categories).set({ isActive: data.isActive }).where(eq(schema.categories.id, data.id));
    return done();
  } catch (error) {
    return toActionError(error);
  }
}

/** Moves a category one position up or down by swapping sort order with its neighbour. */
export async function moveCategory(input: unknown): Promise<ActionResult<null>> {
  try {
    await requirePermission("categories.manage");
    const data = z.object({ id: z.uuid(), direction: z.enum(["up", "down"]) }).parse(input);
    const db = await getDb();
    await db.transaction(async (tx) => {
      const all = await tx
        .select({ id: schema.categories.id })
        .from(schema.categories)
        .orderBy(asc(schema.categories.sortOrder), asc(schema.categories.name))
        .for("update");
      const index = all.findIndex((c) => c.id === data.id);
      const target = data.direction === "up" ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= all.length) return;
      [all[index], all[target]] = [all[target]!, all[index]!];
      // Re-number everything so sort orders stay contiguous.
      for (const [i, c] of all.entries()) {
        await tx.update(schema.categories).set({ sortOrder: i + 1 }).where(eq(schema.categories.id, c.id));
      }
    });
    return done();
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteCategory(input: unknown): Promise<ActionResult<null>> {
  try {
    await requirePermission("categories.manage");
    const id = z.uuid().parse(input);
    const db = await getDb();
    const [{ n }] = await db
      .select({ n: count() })
      .from(schema.products)
      .where(eq(schema.products.categoryId, id));
    if (n > 0) {
      throw new UserFacingError(
        `This category still has ${n} product${n === 1 ? "" : "s"}. Move or delete them first, or disable the category instead.`,
      );
    }
    await db.delete(schema.categories).where(eq(schema.categories.id, id));
    return done();
  } catch (error) {
    return toActionError(error);
  }
}
