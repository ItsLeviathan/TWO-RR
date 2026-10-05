import "server-only";
import { asc, count, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { stockStatusOf } from "./menu";

export async function listCategoriesWithCounts() {
  const db = await getDb();
  return db
    .select({
      id: schema.categories.id,
      name: schema.categories.name,
      slug: schema.categories.slug,
      sortOrder: schema.categories.sortOrder,
      isActive: schema.categories.isActive,
      productCount: count(schema.products.id),
    })
    .from(schema.categories)
    .leftJoin(schema.products, eq(schema.products.categoryId, schema.categories.id))
    .groupBy(schema.categories.id)
    .orderBy(asc(schema.categories.sortOrder), asc(schema.categories.name));
}

export async function listAdminProducts() {
  const db = await getDb();
  const rows = await db.query.products.findMany({
    with: { category: true, inventory: true },
    orderBy: [asc(schema.products.sortOrder), asc(schema.products.name)],
  });
  return rows
    .map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      imageUrl: p.imageUrl,
      priceCents: p.priceCents,
      isAvailable: p.isAvailable,
      isFeatured: p.isFeatured,
      categoryId: p.categoryId,
      categoryName: p.category.name,
      categoryActive: p.category.isActive,
      categorySort: p.category.sortOrder,
      trackInventory: p.trackInventory,
      stockQuantity: p.inventory?.quantity ?? null,
      stockStatus: stockStatusOf(p),
    }))
    .sort((a, b) => a.categorySort - b.categorySort);
}
export type AdminProductRow = Awaited<ReturnType<typeof listAdminProducts>>[number];

export async function getAdminProduct(id: string) {
  const db = await getDb();
  const p = await db.query.products.findFirst({
    where: eq(schema.products.id, id),
    with: { options: true, addons: true, inventory: true },
  });
  if (!p) return null;
  return {
    ...p,
    options: [...p.options].sort((a, b) => a.sortOrder - b.sortOrder),
    addons: [...p.addons].sort((a, b) => a.sortOrder - b.sortOrder),
  };
}
export type AdminProduct = NonNullable<Awaited<ReturnType<typeof getAdminProduct>>>;

export async function listInventory() {
  const db = await getDb();
  const rows = await db.query.products.findMany({
    where: eq(schema.products.trackInventory, true),
    with: { inventory: true, category: true },
    orderBy: [asc(schema.products.name)],
  });
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    categoryName: p.category.name,
    quantity: p.inventory?.quantity ?? 0,
    threshold: p.inventory?.lowStockThreshold ?? 5,
    status: stockStatusOf(p),
    updatedAt: p.inventory?.updatedAt ?? null,
  }));
}
