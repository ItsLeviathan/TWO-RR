/**
 * Idempotent seed.
 *   npm run db:seed            → business settings row + owner account (from OWNER_EMAIL / OWNER_PASSWORD)
 *   npm run db:seed -- --sample → also adds a SAMPLE menu, only if the menu is empty.
 *
 * The sample menu exists so the site and POS can be tried immediately. It is ordinary data:
 * the owner edits or deletes it from Admin → Products.
 */
import { config } from "dotenv";
config({ path: [".env.local", ".env"], quiet: true });

import bcrypt from "bcryptjs";
import { count, eq } from "drizzle-orm";
import { createDb } from "../src/db/client";
import * as schema from "../src/db/schema";

const withSample = process.argv.includes("--sample");

type SampleProduct = {
  name: string;
  description: string;
  price: number;
  featured?: boolean;
  stock?: number;
  options?: { group: string; name: string; delta: number }[];
  addons?: { name: string; price: number }[];
};

const sizes = (largeDelta: number) => [
  { group: "Size", name: "Regular", delta: 0 },
  { group: "Size", name: "Large", delta: largeDelta },
];
const coffeeAddons = [
  { name: "Extra Shot", price: 30 },
  { name: "Oat Milk", price: 20 },
];

const SAMPLE_MENU: { category: string; products: SampleProduct[] }[] = [
  {
    category: "Coffee",
    products: [
      { name: "Iced Spanish Latte", description: "Espresso, milk, and Spanish-style sweetness.", price: 120, featured: true, options: sizes(20), addons: coffeeAddons },
      { name: "Americano", description: "Espresso lengthened with water.", price: 100, options: sizes(20), addons: [coffeeAddons[0]!] },
      { name: "Caffè Latte", description: "Espresso with steamed milk.", price: 120, featured: true, options: sizes(20), addons: coffeeAddons },
      { name: "Caramel Macchiato", description: "Milk, vanilla, espresso and caramel drizzle.", price: 140, options: sizes(20), addons: coffeeAddons },
    ],
  },
  {
    category: "Non-Coffee",
    products: [
      { name: "Matcha Latte", description: "Matcha whisked with milk.", price: 140, featured: true, options: sizes(20), addons: [coffeeAddons[1]!] },
      { name: "Chocolate", description: "Rich chocolate with milk, served hot or iced.", price: 120, options: sizes(20) },
    ],
  },
  {
    category: "Pastries",
    products: [
      { name: "Croissant", description: "Buttery, flaky pastry.", price: 90, featured: true, stock: 12 },
      { name: "Chocolate Chip Cookie", description: "Baked with chocolate chips.", price: 65, stock: 20 },
    ],
  },
  {
    category: "Food",
    products: [{ name: "Ham & Cheese Sandwich", description: "Ham and cheese on toasted bread.", price: 150, stock: 8 }],
  },
];

const slug = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

async function main() {
  const { db, close } = await createDb();
  try {
    await db.insert(schema.businessSettings).values({ id: 1 }).onConflictDoNothing();
    console.log("✓ Business settings ready");

    const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
    const password = process.env.OWNER_PASSWORD;
    if (email && password) {
      if (password.length < 10) throw new Error("OWNER_PASSWORD must be at least 10 characters.");
      const [existing] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email));
      if (existing) {
        console.log(`✓ Owner account ${email} already exists (password unchanged)`);
      } else {
        await db.insert(schema.users).values({
          email,
          name: process.env.OWNER_NAME?.trim() || "Owner",
          passwordHash: await bcrypt.hash(password, 12),
          role: "owner",
        });
        console.log(`✓ Owner account created: ${email}`);
      }
    } else {
      const [{ n }] = await db.select({ n: count() }).from(schema.users);
      if (n === 0) console.warn("! No owner account exists. Set OWNER_EMAIL and OWNER_PASSWORD, then run this again.");
    }

    if (withSample) {
      const [{ n }] = await db.select({ n: count() }).from(schema.categories);
      if (n > 0) {
        console.log("• Menu already has categories — sample menu skipped");
      } else {
        for (const [ci, group] of SAMPLE_MENU.entries()) {
          const [cat] = await db
            .insert(schema.categories)
            .values({ name: group.category, slug: slug(group.category), sortOrder: ci + 1 })
            .returning();
          for (const [pi, p] of group.products.entries()) {
            const [product] = await db
              .insert(schema.products)
              .values({
                categoryId: cat!.id,
                name: p.name,
                slug: slug(p.name),
                description: p.description,
                priceCents: p.price * 100,
                isFeatured: p.featured ?? false,
                trackInventory: p.stock !== undefined,
                sortOrder: pi + 1,
              })
              .returning();
            if (p.options?.length) {
              await db.insert(schema.productOptions).values(
                p.options.map((o, i) => ({ productId: product!.id, groupName: o.group, name: o.name, priceDeltaCents: o.delta * 100, sortOrder: i })),
              );
            }
            if (p.addons?.length) {
              await db.insert(schema.productAddons).values(
                p.addons.map((a, i) => ({ productId: product!.id, name: a.name, priceCents: a.price * 100, sortOrder: i })),
              );
            }
            if (p.stock !== undefined) {
              await db.insert(schema.inventory).values({ productId: product!.id, quantity: p.stock, lowStockThreshold: 5 });
            }
          }
        }
        console.log("✓ Sample menu added (edit or delete it in Admin → Products)");
      }
    }
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error("Seed failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
