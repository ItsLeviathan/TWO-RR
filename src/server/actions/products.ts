"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, ne, notInArray, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema, type Tx } from "@/db";
import { slugify } from "@/lib/format";
import { productSchema } from "@/lib/validation";
import { requirePermission } from "../auth";
import { isUniqueViolation, ok, toActionError, UserFacingError, type ActionResult } from "../result";
import { deleteStoredImage } from "../storage";

async function uniqueSlug(tx: Tx, name: string, excludeId: string | null): Promise<string> {
  const base = slugify(name) || "item";
  const rows = await tx
    .select({ slug: schema.products.slug })
    .from(schema.products)
    .where(and(sql`${schema.products.slug} LIKE ${base + "%"}`, excludeId ? ne(schema.products.id, excludeId) : undefined));
  const taken = new Set(rows.map((r) => r.slug));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

export async function saveProduct(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("products.manage");
    const data = productSchema.parse(input);
    const db = await getDb();

    const productId = await db.transaction(async (tx) => {
      const [category] = await tx
        .select({ id: schema.categories.id })
        .from(schema.categories)
        .where(eq(schema.categories.id, data.categoryId));
      if (!category) throw new UserFacingError("Choose a valid category.");

      const values = {
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        priceCents: data.priceCents,
        imageUrl: data.imageUrl,
        sku: data.sku,
        isAvailable: data.isAvailable,
        isFeatured: data.isFeatured,
        trackInventory: data.trackInventory,
      };

      let id: string;
      if (data.id) {
        const [existing] = await tx
          .select({ id: schema.products.id, name: schema.products.name, slug: schema.products.slug })
          .from(schema.products)
          .where(eq(schema.products.id, data.id));
        if (!existing) throw new UserFacingError("This product no longer exists.");
        const slug = existing.name === data.name ? existing.slug : await uniqueSlug(tx, data.name, data.id);
        await tx.update(schema.products).set({ ...values, slug }).where(eq(schema.products.id, data.id));
        id = data.id;
      } else {
        const [maxSort] = await tx
          .select({ max: sql<number>`COALESCE(MAX(${schema.products.sortOrder}), 0)::int` })
          .from(schema.products)
          .where(eq(schema.products.categoryId, data.categoryId));
        const [created] = await tx
          .insert(schema.products)
          .values({ ...values, slug: await uniqueSlug(tx, data.name, null), sortOrder: (maxSort?.max ?? 0) + 1 })
          .returning({ id: schema.products.id });
        id = created!.id;
      }

      // Options: keep the ones still listed, delete removed ones, insert new ones.
      const keptOptionIds = data.options.flatMap((o) => (o.id ? [o.id] : []));
      await tx
        .delete(schema.productOptions)
        .where(
          and(
            eq(schema.productOptions.productId, id),
            keptOptionIds.length ? notInArray(schema.productOptions.id, keptOptionIds) : undefined,
          ),
        );
      for (const [index, option] of data.options.entries()) {
        const row = { groupName: option.groupName, name: option.name, priceDeltaCents: option.priceDeltaCents, sortOrder: index };
        if (option.id) {
          await tx
            .update(schema.productOptions)
            .set(row)
            .where(and(eq(schema.productOptions.id, option.id), eq(schema.productOptions.productId, id)));
        } else {
          await tx.insert(schema.productOptions).values({ ...row, productId: id });
        }
      }

      const keptAddonIds = data.addons.flatMap((a) => (a.id ? [a.id] : []));
      await tx
        .delete(schema.productAddons)
        .where(
          and(
            eq(schema.productAddons.productId, id),
            keptAddonIds.length ? notInArray(schema.productAddons.id, keptAddonIds) : undefined,
          ),
        );
      for (const [index, addon] of data.addons.entries()) {
        const row = { name: addon.name, priceCents: addon.priceCents, isAvailable: addon.isAvailable, sortOrder: index };
        if (addon.id) {
          await tx
            .update(schema.productAddons)
            .set(row)
            .where(and(eq(schema.productAddons.id, addon.id), eq(schema.productAddons.productId, id)));
        } else {
          await tx.insert(schema.productAddons).values({ ...row, productId: id });
        }
      }

      // Inventory: stock levels for existing rows are changed on the Inventory page (so an edit here
      // can never overwrite sales that happened meanwhile); the starting quantity is set only when
      // tracking is first enabled.
      if (data.trackInventory) {
        await tx
          .insert(schema.inventory)
          .values({ productId: id, quantity: data.stockQuantity ?? 0, lowStockThreshold: data.lowStockThreshold })
          .onConflictDoUpdate({
            target: schema.inventory.productId,
            set: { lowStockThreshold: data.lowStockThreshold },
          });
      } else {
        await tx.delete(schema.inventory).where(eq(schema.inventory.productId, id));
      }

      return id;
    });

    revalidatePath("/", "layout");
    return ok({ id: productId });
  } catch (error) {
    if (isUniqueViolation(error, "sku")) return toActionError(new UserFacingError("Another product already uses that SKU."));
    return toActionError(error, "Unable to save the product. Please try again.");
  }
}

export async function setProductAvailability(input: unknown): Promise<ActionResult<null>> {
  try {
    await requirePermission("products.manage");
    const { id, isAvailable } = z.object({ id: z.uuid(), isAvailable: z.boolean() }).parse(input);
    const db = await getDb();
    await db.update(schema.products).set({ isAvailable }).where(eq(schema.products.id, id));
    revalidatePath("/", "layout");
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteProducts(input: unknown): Promise<ActionResult<null>> {
  try {
    await requirePermission("products.manage");
    const ids = z.array(z.uuid()).min(1).max(100).parse(input);
    const db = await getDb();
    // Order history keeps working: order_items store a snapshot of name/price and the FK is SET NULL.
    const deleted = await db
      .delete(schema.products)
      .where(inArray(schema.products.id, ids))
      .returning({ imageUrl: schema.products.imageUrl });
    await Promise.all(deleted.map((d) => deleteStoredImage(d.imageUrl)));
    revalidatePath("/", "layout");
    return ok(null);
  } catch (error) {
    return toActionError(error, "Unable to delete the product. Please try again.");
  }
}
