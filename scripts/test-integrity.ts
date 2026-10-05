/**
 * Data-integrity tests for the order engine, run against a throwaway embedded database.
 *   npm run test:integrity
 */
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const dir = mkdtempSync(path.join(tmpdir(), "tworr-test-"));
process.env.PGLITE_DIR = dir;
delete process.env.DATABASE_URL;

let passed = 0;
let failed = 0;
async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed++;
    console.log(`  ✗ ${name}\n    ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main() {
  const { eq } = await import("drizzle-orm");
  const { getDb, schema } = await import("../src/db");
  const { createOrder, updateOrderStatus, recordPayment, PRICE_CHANGED_MESSAGE } = await import("../src/server/orders");
  const { parsePesoToCents, formatPeso } = await import("../src/lib/money");
  const { resolveSelection } = await import("../src/lib/pricing");

  const db = await getDb();
  const [cat] = await db.insert(schema.categories).values({ name: "Coffee", slug: "coffee" }).returning();
  const [latte] = await db
    .insert(schema.products)
    .values({ categoryId: cat!.id, name: "Latte", slug: "latte", priceCents: 12000 })
    .returning();
  const [regular, large] = await db
    .insert(schema.productOptions)
    .values([
      { productId: latte!.id, groupName: "Size", name: "Regular", priceDeltaCents: 0, sortOrder: 0 },
      { productId: latte!.id, groupName: "Size", name: "Large", priceDeltaCents: 2000, sortOrder: 1 },
    ])
    .returning();
  const [shot] = await db.insert(schema.productAddons).values({ productId: latte!.id, name: "Extra Shot", priceCents: 3000 }).returning();
  const [croissant] = await db
    .insert(schema.products)
    .values({ categoryId: cat!.id, name: "Croissant", slug: "croissant", priceCents: 9000, trackInventory: true })
    .returning();
  await db.insert(schema.inventory).values({ productId: croissant!.id, quantity: 2 });
  const [hidden] = await db
    .insert(schema.products)
    .values({ categoryId: cat!.id, name: "Hidden", slug: "hidden", priceCents: 5000, isAvailable: false })
    .returning();

  const stock = async () =>
    (await db.select().from(schema.inventory).where(eq(schema.inventory.productId, croissant!.id)))[0]!.quantity;
  let n = 0;
  const base = (over: Partial<Parameters<typeof createOrder>[0]> = {}): Parameters<typeof createOrder>[0] => ({
    idempotencyKey: `test-key-${++n}-${Date.now()}`,
    source: "pos",
    items: [{ productId: latte!.id, optionIds: [regular!.id], addonIds: [], quantity: 1 }],
    customerName: null,
    orderType: "dine_in",
    notes: null,
    status: "completed",
    createdById: null,
    payment: { method: "cash", markPaid: true, tenderedCents: 100000 },
    ...over,
  });

  console.log("\nMoney");
  await test("parses peso input as integer centavos", () => {
    assert.equal(parsePesoToCents("120"), 12000);
    assert.equal(parsePesoToCents("120.5"), 12050);
    assert.equal(parsePesoToCents("₱1,200.05"), 120005);
    assert.equal(parsePesoToCents("0.10"), 10);
    assert.equal(parsePesoToCents("-5"), null);
    assert.equal(parsePesoToCents("1.234"), null);
    assert.equal(parsePesoToCents("abc"), null);
    assert.equal(parsePesoToCents(""), null);
  });
  await test("formats safely, never NaN", () => {
    assert.equal(formatPeso(12000), "₱120.00");
    assert.equal(formatPeso(Number.NaN), "₱0.00");
    assert.equal(formatPeso(Infinity), "₱0.00");
  });

  console.log("\nPricing");
  await test("requires exactly one option per group", () => {
    const product = {
      priceCents: 12000,
      options: [regular!, large!].map((o) => ({ id: o.id, groupName: o.groupName, name: o.name, priceDeltaCents: o.priceDeltaCents })),
      addons: [{ id: shot!.id, name: shot!.name, priceCents: shot!.priceCents, isAvailable: true }],
    };
    assert.equal(resolveSelection(product, [], []).ok, false);
    assert.equal(resolveSelection(product, [regular!.id, large!.id], []).ok, false);
    const r = resolveSelection(product, [large!.id], [shot!.id]);
    assert.ok(r.ok && r.unitPriceCents === 17000);
  });

  console.log("\nOrders");
  await test("server recomputes price (Large + Extra Shot × 2 = ₱340)", async () => {
    const o = await createOrder(base({ items: [{ productId: latte!.id, optionIds: [large!.id], addonIds: [shot!.id], quantity: 2 }] }));
    assert.equal(o.totalCents, 34000);
    assert.equal(o.changeCents, 100000 - 34000);
  });
  await test("rejects a tampered expected total", async () => {
    await assert.rejects(createOrder(base({ expectedTotalCents: 100 })), { message: PRICE_CHANGED_MESSAGE });
  });
  await test("rejects an option belonging to nothing / another group", async () => {
    await assert.rejects(createOrder(base({ items: [{ productId: latte!.id, optionIds: [shot!.id], addonIds: [], quantity: 1 }] })));
  });
  await test("rejects unknown product IDs", async () => {
    await assert.rejects(
      createOrder(base({ items: [{ productId: "00000000-0000-4000-8000-000000000000", optionIds: [], addonIds: [], quantity: 1 }] })),
    );
  });
  await test("rejects unavailable products", async () => {
    await assert.rejects(createOrder(base({ items: [{ productId: hidden!.id, optionIds: [], addonIds: [], quantity: 1 }] })), /unavailable/);
  });
  await test("rejects zero and negative quantities", async () => {
    await assert.rejects(createOrder(base({ items: [{ productId: latte!.id, optionIds: [regular!.id], addonIds: [], quantity: 0 }] })));
    await assert.rejects(createOrder(base({ items: [{ productId: latte!.id, optionIds: [regular!.id], addonIds: [], quantity: -2 }] })));
  });
  await test("rejects insufficient cash and writes nothing", async () => {
    const before = await db.$count(schema.orders);
    await assert.rejects(createOrder(base({ payment: { method: "cash", markPaid: true, tenderedCents: 500 } })), /less than the total/);
    assert.equal(await db.$count(schema.orders), before);
  });
  await test("same idempotency key never creates a duplicate (concurrent double-submit)", async () => {
    const input = base();
    const before = await db.$count(schema.orders);
    const [a, b] = await Promise.all([createOrder(input), createOrder(input)]);
    assert.equal(a.id, b.id);
    assert.equal(await db.$count(schema.orders), before + 1);
    const again = await createOrder(input);
    assert.equal(again.id, a.id);
    assert.equal(again.duplicate, true);
  });

  console.log("\nInventory");
  const croissantLine = (quantity: number) => [{ productId: croissant!.id, optionIds: [], addonIds: [], quantity }];
  await test("concurrent orders cannot oversell (stock 2, two orders of 2)", async () => {
    const results = await Promise.allSettled([createOrder(base({ items: croissantLine(2) })), createOrder(base({ items: croissantLine(2) }))]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(await stock(), 0);
  });
  let cancelId = "";
  await test("out-of-stock order is rejected and stock never goes negative", async () => {
    await assert.rejects(createOrder(base({ items: croissantLine(1) })), /out of stock/);
    assert.equal(await stock(), 0);
    await db.update(schema.inventory).set({ quantity: 3 }).where(eq(schema.inventory.productId, croissant!.id));
    cancelId = (await createOrder(base({ items: croissantLine(3), status: "pending", payment: { method: "gcash", markPaid: false } }))).id;
    assert.equal(await stock(), 0);
  });
  await test("cancelling restores stock exactly once and voids unpaid payment", async () => {
    await updateOrderStatus(cancelId, "cancelled");
    assert.equal(await stock(), 3);
    await assert.rejects(updateOrderStatus(cancelId, "cancelled"));
    await assert.rejects(updateOrderStatus(cancelId, "completed"));
    assert.equal(await stock(), 3);
    const [p] = await db.select().from(schema.payments).where(eq(schema.payments.orderId, cancelId));
    assert.equal(p!.status, "voided");
  });
  await test("database itself refuses negative stock", async () => {
    await assert.rejects(db.update(schema.inventory).set({ quantity: -1 }).where(eq(schema.inventory.productId, croissant!.id)));
  });

  console.log("\nPayments");
  await test("unpaid order: insufficient cash refused, then recorded with change, then cannot pay twice", async () => {
    const o = await createOrder(base({ source: "online", status: "pending", payment: { method: "cash", markPaid: false } }));
    await assert.rejects(recordPayment(o.id, { method: "cash", tenderedCents: 100, reference: null, userId: "" as never }), /less than/);
    const user = (await db.insert(schema.users).values({ email: "t@t.t", name: "T", passwordHash: "x" }).returning())[0]!;
    const r = await recordPayment(o.id, { method: "cash", tenderedCents: 20000, reference: null, userId: user.id });
    assert.equal(r.changeCents, 20000 - 12000);
    await assert.rejects(recordPayment(o.id, { method: "cash", tenderedCents: 20000, reference: null, userId: user.id }), /already paid/);
  });
  await test("database refuses zero-total orders and negative prices", async () => {
    await assert.rejects(
      db.insert(schema.products).values({ categoryId: cat!.id, name: "Neg", slug: "neg", priceCents: -1 }),
    );
  });

  console.log("\nRoles");
  const { can } = await import("../src/lib/permissions");
  await test("cashier permissions match the owner's rules", () => {
    for (const p of ["pos.use", "orders.viewRecent", "orders.updateStatus", "payments.record", "products.view", "account.manageOwn"] as const) {
      assert.equal(can("staff", p), true, p);
    }
    for (const p of [
      "dashboard.view",
      "orders.viewAll",
      "orders.cancelPaid",
      "products.manage",
      "categories.manage",
      "inventory.manage",
      "reports.view",
      "settings.manage",
      "users.manage",
    ] as const) {
      assert.equal(can("staff", p), false, p);
      assert.equal(can("owner", p), true, p);
    }
  });
  await test("cashier cannot cancel a paid order; can cancel an unpaid one; owner can cancel paid", async () => {
    const paid = await createOrder(base({ status: "preparing" }));
    await assert.rejects(updateOrderStatus(paid.id, "cancelled", { canCancelPaid: false }), /Only the owner/);
    const unpaid = await createOrder(base({ status: "pending", payment: { method: "cash", markPaid: false } }));
    await updateOrderStatus(unpaid.id, "cancelled", { canCancelPaid: false });
    await updateOrderStatus(paid.id, "cancelled", { canCancelPaid: true });
  });

  console.log(`\n${passed} passed, ${failed} failed`);
}

main()
  .catch((error) => {
    console.error(error);
    failed++;
  })
  .finally(() => {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {}
    process.exit(failed ? 1 : 0);
  });
