/**
 * Idempotent seed.
 *   npm run db:seed            → business settings row + owner account (from OWNER_EMAIL / OWNER_PASSWORD)
 *   npm run db:seed -- --sample → also adds a SAMPLE menu, only if the menu is empty.
 *   SEED_SAMPLE_MENU=1             → same as --sample (set it in Vercel to fill the menu on the first deploy).
 *
 * The sample menu exists so the site and POS can be tried immediately. It is ordinary data:
 * the owner edits or deletes it from Admin → Products.
 */
import { config } from "dotenv";
config({ path: [".env.local", ".env"], quiet: true });

import bcrypt from "bcryptjs";
import { and, count, eq, isNull } from "drizzle-orm";
import { createDb } from "../src/db/client";
import * as schema from "../src/db/schema";

const withSample = process.argv.includes("--sample") || process.env.SEED_SAMPLE_MENU === "1";

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
const whippedCream = { name: "Extra Whipped Cream", price: 15 };
const frappeAddons = [coffeeAddons[0]!, whippedCream];

const SAMPLE_MENU: { category: string; products: SampleProduct[] }[] = [
  {
    category: "Coffee",
    products: [
      { name: "Iced Spanish Latte", description: "Espresso, milk, and Spanish-style sweetness.", price: 120, featured: true, options: sizes(20), addons: coffeeAddons },
      { name: "Americano", description: "Espresso lengthened with water.", price: 100, options: sizes(20), addons: [coffeeAddons[0]!] },
      { name: "Caffè Latte", description: "Espresso with steamed milk.", price: 120, featured: true, options: sizes(20), addons: coffeeAddons },
      { name: "Caramel Macchiato", description: "Milk, vanilla, espresso and caramel drizzle.", price: 140, options: sizes(20), addons: coffeeAddons },
      {
        name: "Espresso",
        description: "A short, intense shot with a golden crema.",
        price: 90,
        options: [
          { group: "Shot", name: "Single", delta: 0 },
          { group: "Shot", name: "Double", delta: 30 },
        ],
      },
      { name: "Cappuccino", description: "Espresso under a deep cap of velvety milk foam.", price: 120, options: sizes(20), addons: coffeeAddons },
      { name: "Flat White", description: "A double shot with a thin layer of silky microfoam.", price: 130, options: sizes(20), addons: coffeeAddons },
      { name: "Café Mocha", description: "Espresso, rich chocolate and steamed milk.", price: 140, featured: true, options: sizes(20), addons: coffeeAddons },
      { name: "Vanilla Latte", description: "Espresso and steamed milk with a touch of vanilla.", price: 130, options: sizes(20), addons: coffeeAddons },
      { name: "Cold Brew", description: "Steeped slow and cold for a smooth, low-acid coffee over ice.", price: 130, options: sizes(20), addons: [coffeeAddons[1]!] },
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
    category: "Frappé",
    products: [
      { name: "Caramel Frappe", description: "Coffee blended with milk and ice, topped with whipped cream and caramel drizzle.", price: 150, options: sizes(20), addons: frappeAddons },
      { name: "Mocha Frappe", description: "Coffee, chocolate and milk blended with ice, finished with whipped cream.", price: 155, options: sizes(20), addons: frappeAddons },
      { name: "Java Chip Frappe", description: "Mocha blended with chocolate chips, under whipped cream and more chips.", price: 165, featured: true, options: sizes(20), addons: frappeAddons },
      { name: "Matcha Frappe", description: "Matcha blended with milk and ice, crowned with whipped cream.", price: 160, options: sizes(20), addons: [whippedCream] },
      { name: "Cookies & Cream Frappe", description: "Crushed chocolate cookies blended with milk and ice. Coffee-free.", price: 160, options: sizes(20), addons: [whippedCream] },
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

/** Sample product photos live in public/menu/<slug>.webp (see public/menu/CREDITS.md). */
const sampleImage = (productSlug: string) => `/menu/${productSlug}.webp`;

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
        // Give sample products that still have no photo their stock photo; never overwrites the owner's images.
        let filled = 0;
        for (const p of SAMPLE_MENU.flatMap((g) => g.products)) {
          const s = slug(p.name);
          const updated = await db
            .update(schema.products)
            .set({ imageUrl: sampleImage(s) })
            .where(and(eq(schema.products.slug, s), isNull(schema.products.imageUrl)))
            .returning({ id: schema.products.id });
          filled += updated.length;
        }
        if (filled > 0) console.log(`✓ Added photos to ${filled} sample product(s)`);
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
                imageUrl: sampleImage(slug(p.name)),
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
