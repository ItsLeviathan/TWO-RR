import "server-only";
import { and, desc, eq, gte, inArray, lt, ne, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { PaymentMethod } from "@/db/schema";
import { shopDateKey, shopMidnight, SHOP_TIME_ZONE } from "@/lib/format";

/**
 * Revenue definition used everywhere: orders that are not cancelled and whose payment is recorded
 * as paid. Unpaid online orders count once staff record their payment.
 */
const revenueOrder = and(ne(schema.orders.status, "cancelled"), eq(schema.payments.status, "paid"));

const DAY_MS = 24 * 60 * 60 * 1000;

export type ReportRange = "today" | "7d" | "30d" | "month";

export function rangeBounds(range: ReportRange, now = new Date()): { start: Date; end: Date; days: number } {
  const todayStart = shopMidnight(shopDateKey(now));
  const end = new Date(todayStart.getTime() + DAY_MS);
  switch (range) {
    case "today":
      return { start: todayStart, end, days: 1 };
    case "7d":
      return { start: new Date(todayStart.getTime() - 6 * DAY_MS), end, days: 7 };
    case "30d":
      return { start: new Date(todayStart.getTime() - 29 * DAY_MS), end, days: 30 };
    case "month": {
      const key = shopDateKey(now);
      const start = shopMidnight(`${key.slice(0, 8)}01`);
      return { start, end, days: Math.round((end.getTime() - start.getTime()) / DAY_MS) };
    }
  }
}

async function totalsBetween(start: Date, end: Date) {
  const db = await getDb();
  const [row] = await db
    .select({
      salesCents: sql<number>`COALESCE(SUM(${schema.orders.totalCents}), 0)::int`,
      orders: sql<number>`COUNT(*)::int`,
    })
    .from(schema.orders)
    .innerJoin(schema.payments, eq(schema.payments.orderId, schema.orders.id))
    .where(and(revenueOrder, gte(schema.orders.createdAt, start), lt(schema.orders.createdAt, end)));
  const salesCents = row?.salesCents ?? 0;
  const orders = row?.orders ?? 0;
  return { salesCents, orders, averageCents: orders ? Math.round(salesCents / orders) : 0 };
}

async function topProductsBetween(start: Date, end: Date, limit: number) {
  const db = await getDb();
  return db
    .select({
      name: schema.orderItems.productName,
      quantity: sql<number>`SUM(${schema.orderItems.quantity})::int`,
      salesCents: sql<number>`SUM(${schema.orderItems.lineTotalCents})::int`,
    })
    .from(schema.orderItems)
    .innerJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId))
    .innerJoin(schema.payments, eq(schema.payments.orderId, schema.orders.id))
    .where(and(revenueOrder, gte(schema.orders.createdAt, start), lt(schema.orders.createdAt, end)))
    .groupBy(schema.orderItems.productName)
    .orderBy(desc(sql`SUM(${schema.orderItems.quantity})`), desc(sql`SUM(${schema.orderItems.lineTotalCents})`))
    .limit(limit);
}

export async function getDashboardData() {
  const db = await getDb();
  const { start, end } = rangeBounds("today");
  const [today, best, recent, openCounts, lowStock] = await Promise.all([
    totalsBetween(start, end),
    topProductsBetween(start, end, 1),
    db
      .select({
        id: schema.orders.id,
        orderNumber: schema.orders.orderNumber,
        createdAt: schema.orders.createdAt,
        customerName: schema.orders.customerName,
        status: schema.orders.status,
        source: schema.orders.source,
        totalCents: schema.orders.totalCents,
        paymentStatus: schema.payments.status,
      })
      .from(schema.orders)
      .leftJoin(schema.payments, eq(schema.payments.orderId, schema.orders.id))
      .orderBy(desc(schema.orders.createdAt))
      .limit(8),
    db
      .select({ status: schema.orders.status, n: sql<number>`COUNT(*)::int` })
      .from(schema.orders)
      .where(inArray(schema.orders.status, ["pending", "preparing", "ready"]))
      .groupBy(schema.orders.status),
    db
      .select({
        id: schema.products.id,
        name: schema.products.name,
        quantity: schema.inventory.quantity,
        threshold: schema.inventory.lowStockThreshold,
      })
      .from(schema.inventory)
      .innerJoin(schema.products, eq(schema.products.id, schema.inventory.productId))
      .where(and(eq(schema.products.trackInventory, true), sql`${schema.inventory.quantity} <= ${schema.inventory.lowStockThreshold}`))
      .orderBy(schema.inventory.quantity)
      .limit(6),
  ]);
  const open = Object.fromEntries(openCounts.map((r) => [r.status, r.n])) as Partial<Record<string, number>>;
  return { today, bestSeller: best[0] ?? null, recent, open, lowStock };
}

export async function getReport(range: ReportRange) {
  const db = await getDb();
  const { start, end, days } = rangeBounds(range);
  const now = new Date();
  const todayStart = shopMidnight(shopDateKey(now));
  const dayEnd = new Date(todayStart.getTime() + DAY_MS);
  const monthStart = shopMidnight(`${shopDateKey(now).slice(0, 8)}01`);
  // The zone is a fixed constant inlined as a literal so the SELECT and GROUP BY expressions match.
  const zone = sql.raw(`'${SHOP_TIME_ZONE}'`);
  const dayBucket = sql<string>`to_char((${schema.orders.createdAt} AT TIME ZONE ${zone})::date, 'YYYY-MM-DD')`;
  const inRange = and(revenueOrder, gte(schema.orders.createdAt, start), lt(schema.orders.createdAt, end));

  const [summaryToday, summaryWeek, summaryMonth, rangeTotals, daily, topProducts, topCategories, payments, cancelled] =
    await Promise.all([
      totalsBetween(todayStart, dayEnd),
      totalsBetween(new Date(todayStart.getTime() - 6 * DAY_MS), dayEnd),
      totalsBetween(monthStart, dayEnd),
      totalsBetween(start, end),
      db
        .select({
          day: dayBucket,
          salesCents: sql<number>`SUM(${schema.orders.totalCents})::int`,
          orders: sql<number>`COUNT(*)::int`,
        })
        .from(schema.orders)
        .innerJoin(schema.payments, eq(schema.payments.orderId, schema.orders.id))
        .where(inRange)
        .groupBy(dayBucket),
      topProductsBetween(start, end, 8),
      db
        .select({
          name: schema.orderItems.categoryName,
          quantity: sql<number>`SUM(${schema.orderItems.quantity})::int`,
          salesCents: sql<number>`SUM(${schema.orderItems.lineTotalCents})::int`,
        })
        .from(schema.orderItems)
        .innerJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId))
        .innerJoin(schema.payments, eq(schema.payments.orderId, schema.orders.id))
        .where(inRange)
        .groupBy(schema.orderItems.categoryName)
        .orderBy(desc(sql`SUM(${schema.orderItems.lineTotalCents})`))
        .limit(8),
      db
        .select({
          method: schema.payments.method,
          orders: sql<number>`COUNT(*)::int`,
          salesCents: sql<number>`SUM(${schema.orders.totalCents})::int`,
        })
        .from(schema.orders)
        .innerJoin(schema.payments, eq(schema.payments.orderId, schema.orders.id))
        .where(inRange)
        .groupBy(schema.payments.method),
      db
        .select({ n: sql<number>`COUNT(*)::int` })
        .from(schema.orders)
        .where(and(eq(schema.orders.status, "cancelled"), gte(schema.orders.createdAt, start), lt(schema.orders.createdAt, end))),
    ]);

  // Fill missing days with zero so the chart shows real gaps instead of skipping them.
  const byDay = new Map(daily.map((d) => [d.day, d]));
  const series = Array.from({ length: days }, (_, i) => {
    const key = shopDateKey(new Date(start.getTime() + i * DAY_MS + 12 * 60 * 60 * 1000));
    const hit = byDay.get(key);
    return { day: key, salesCents: hit?.salesCents ?? 0, orders: hit?.orders ?? 0 };
  });

  const paymentBreakdown = (["cash", "gcash", "card"] as PaymentMethod[]).map((method) => {
    const hit = payments.find((p) => p.method === method);
    return { method, orders: hit?.orders ?? 0, salesCents: hit?.salesCents ?? 0 };
  });

  return {
    range,
    summary: { today: summaryToday, week: summaryWeek, month: summaryMonth },
    totals: rangeTotals,
    series,
    topProducts,
    topCategories,
    paymentBreakdown,
    cancelledOrders: cancelled[0]?.n ?? 0,
  };
}
