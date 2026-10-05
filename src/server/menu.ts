import "server-only";
import { connection } from "next/server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { MenuCategory, MenuProduct, StockStatus } from "@/lib/menu-types";

type ProductRow = typeof schema.products.$inferSelect & {
  category: typeof schema.categories.$inferSelect;
  options: (typeof schema.productOptions.$inferSelect)[];
  addons: (typeof schema.productAddons.$inferSelect)[];
  inventory: typeof schema.inventory.$inferSelect | null;
};

export function stockStatusOf(row: Pick<ProductRow, "trackInventory" | "inventory">): StockStatus {
  if (!row.trackInventory) return "untracked";
  const qty = row.inventory?.quantity ?? 0;
  if (qty <= 0) return "out";
  if (qty <= (row.inventory?.lowStockThreshold ?? 0)) return "low";
  return "in";
}

export function toMenuProduct(row: ProductRow): MenuProduct {
  const stockStatus = stockStatusOf(row);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    priceCents: row.priceCents,
    imageUrl: row.imageUrl,
    categoryId: row.categoryId,
    categoryName: row.category.name,
    isFeatured: row.isFeatured,
    // A product can be ordered only if it is switched on, its category is active, and it is in stock.
    isOrderable: row.isAvailable && row.category.isActive && stockStatus !== "out",
    isAvailable: row.isAvailable,
    stockStatus,
    stockQuantity: row.trackInventory ? (row.inventory?.quantity ?? 0) : null,
    options: [...row.options]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((o) => ({ id: o.id, groupName: o.groupName, name: o.name, priceDeltaCents: o.priceDeltaCents })),
    addons: [...row.addons]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((a) => ({ id: a.id, name: a.name, priceCents: a.priceCents, isAvailable: a.isAvailable })),
  };
}

const productWith = { category: true, options: true, addons: true, inventory: true } as const;

/**
 * The menu as customers (and the POS) see it: active categories in owner-defined order,
 * each with its products. Unavailable products are still listed (marked unavailable) so the
 * menu stays stable; `includeUnavailable: false` hides them entirely.
 */
export async function getMenu({ includeUnavailable = true } = {}): Promise<MenuCategory[]> {
  await connection();
  const db = await getDb();
  const cats = await db.query.categories.findMany({
    where: eq(schema.categories.isActive, true),
    orderBy: [asc(schema.categories.sortOrder), asc(schema.categories.name)],
  });
  if (cats.length === 0) return [];
  const rows = await db.query.products.findMany({
    where: and(
      inArray(
        schema.products.categoryId,
        cats.map((c) => c.id),
      ),
      includeUnavailable ? undefined : eq(schema.products.isAvailable, true),
    ),
    with: productWith,
    orderBy: [asc(schema.products.sortOrder), asc(schema.products.name)],
  });
  const products = rows.map((r) => toMenuProduct(r as ProductRow));
  return cats.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    products: products.filter((p) => p.categoryId === c.id),
  }));
}

export async function getProductBySlug(slug: string): Promise<MenuProduct | null> {
  await connection();
  const db = await getDb();
  const row = await db.query.products.findFirst({
    where: eq(schema.products.slug, slug),
    with: productWith,
  });
  if (!row || !row.category.isActive) return null;
  return toMenuProduct(row as ProductRow);
}

/** Featured products for the home page; falls back to the first few orderable items. */
export async function getFeaturedProducts(limit = 4): Promise<MenuProduct[]> {
  const menu = await getMenu({ includeUnavailable: false });
  const all = menu.flatMap((c) => c.products).filter((p) => p.isOrderable);
  const featured = all.filter((p) => p.isFeatured);
  return (featured.length ? featured : all).slice(0, limit);
}

/** Loads full product rows (inside or outside a transaction) for pricing. */
export async function loadProductsForPricing(
  db: Pick<Awaited<ReturnType<typeof getDb>>, "query">,
  productIds: string[],
): Promise<Map<string, MenuProduct>> {
  if (productIds.length === 0) return new Map();
  const rows = await db.query.products.findMany({
    where: inArray(schema.products.id, productIds),
    with: productWith,
  });
  return new Map(rows.map((r) => [r.id, toMenuProduct(r as ProductRow)]));
}
