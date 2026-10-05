import "server-only";
import { and, count, desc, eq, gte, inArray, lt, or, sql, type SQL } from "drizzle-orm";
import { getDb, schema, type Tx } from "@/db";
import type { OrderSource, OrderStatus, OrderType, PaymentMethod } from "@/db/schema";
import { describeSelection, MAX_LINE_QUANTITY, MAX_ORDER_LINES, resolveSelection } from "@/lib/pricing";
import { formatPeso } from "@/lib/money";
import { shopMidnight } from "@/lib/format";
import { loadProductsForPricing } from "./menu";
import { isUniqueViolation, UserFacingError } from "./result";

export type OrderLineInput = {
  productId: string;
  optionIds: string[];
  addonIds: string[];
  quantity: number;
};

export type CreateOrderInput = {
  idempotencyKey: string;
  source: OrderSource;
  items: OrderLineInput[];
  customerName: string | null;
  orderType: OrderType;
  notes: string | null;
  status: OrderStatus;
  createdById: string | null;
  /** When provided, the order is rejected if the server-computed total differs (prices changed since the customer saw them). */
  expectedTotalCents?: number;
  payment: {
    method: PaymentMethod;
    /** POS: staff confirms the money was received. Online orders are always recorded as unpaid. */
    markPaid: boolean;
    tenderedCents?: number | null;
    reference?: string | null;
  };
};

export type CreatedOrder = { id: string; orderNumber: number; totalCents: number; changeCents: number | null; duplicate: boolean };

export const PRICE_CHANGED_MESSAGE =
  "Some prices or items on the menu changed while you were ordering. Please review your order and try again.";

/**
 * Creates an order atomically. Prices are always recomputed from the database; the client only
 * sends product/option/add-on IDs and quantities. Stock is deducted with a conditional UPDATE so
 * concurrent orders can never push inventory below zero.
 */
export async function createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
  const db = await getDb();

  const existing = await findByIdempotencyKey(input.idempotencyKey);
  if (existing) return existing;

  if (input.items.length === 0) throw new UserFacingError("The order is empty.");
  if (input.items.length > MAX_ORDER_LINES) throw new UserFacingError("This order has too many lines.");

  try {
    return await db.transaction(async (tx) => {
      const products = await loadProductsForPricing(tx, [...new Set(input.items.map((i) => i.productId))]);

      const lines = input.items.map((item) => {
        if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_LINE_QUANTITY) {
          throw new UserFacingError(`Quantities must be between 1 and ${MAX_LINE_QUANTITY}.`);
        }
        const product = products.get(item.productId);
        if (!product) throw new UserFacingError(PRICE_CHANGED_MESSAGE);
        if (product.isAvailable && product.stockStatus === "out") {
          throw new UserFacingError(`${product.name} is out of stock.`);
        }
        if (!product.isAvailable || !product.isOrderable) {
          throw new UserFacingError(`${product.name} is currently unavailable.`);
        }
        const selection = resolveSelection(product, item.optionIds, item.addonIds);
        if (!selection.ok) throw new UserFacingError(`${product.name}: ${selection.error}`);
        return {
          product,
          quantity: item.quantity,
          unitPriceCents: selection.unitPriceCents,
          lineTotalCents: selection.unitPriceCents * item.quantity,
          selections: {
            options: selection.options.map((o) => ({ group: o.groupName, name: o.name, priceDeltaCents: o.priceDeltaCents })),
            addons: selection.addons.map((a) => ({ name: a.name, priceCents: a.priceCents })),
          },
        };
      });

      const subtotalCents = lines.reduce((sum, l) => sum + l.lineTotalCents, 0);
      const totalCents = subtotalCents;
      if (!Number.isSafeInteger(totalCents) || totalCents <= 0) {
        throw new UserFacingError("The order total must be greater than zero.");
      }
      if (input.expectedTotalCents !== undefined && input.expectedTotalCents !== totalCents) {
        throw new UserFacingError(PRICE_CHANGED_MESSAGE);
      }

      // Payment validation
      const { payment } = input;
      let tenderedCents: number | null = null;
      let changeCents: number | null = null;
      if (payment.markPaid && payment.method === "cash") {
        if (payment.tenderedCents == null || !Number.isSafeInteger(payment.tenderedCents)) {
          throw new UserFacingError("Enter the cash amount received.");
        }
        if (payment.tenderedCents < totalCents) {
          throw new UserFacingError(`Cash received is less than the total of ${formatPeso(totalCents)}.`);
        }
        tenderedCents = payment.tenderedCents;
        changeCents = tenderedCents - totalCents;
      }

      // Inventory: aggregate per tracked product, then deduct atomically.
      const tracked = new Map<string, { name: string; qty: number }>();
      for (const line of lines) {
        if (line.product.stockStatus === "untracked") continue;
        const entry = tracked.get(line.product.id) ?? { name: line.product.name, qty: 0 };
        entry.qty += line.quantity;
        tracked.set(line.product.id, entry);
      }
      for (const [productId, { name, qty }] of tracked) {
        const updated = await tx
          .update(schema.inventory)
          .set({ quantity: sql`${schema.inventory.quantity} - ${qty}` })
          .where(and(eq(schema.inventory.productId, productId), gte(schema.inventory.quantity, qty)))
          .returning({ quantity: schema.inventory.quantity });
        if (updated.length === 0) {
          const [row] = await tx
            .select({ quantity: schema.inventory.quantity })
            .from(schema.inventory)
            .where(eq(schema.inventory.productId, productId));
          const left = row?.quantity ?? 0;
          throw new UserFacingError(left > 0 ? `Only ${left} ${name} left in stock.` : `${name} is out of stock.`);
        }
      }

      const now = new Date();
      const [order] = await tx
        .insert(schema.orders)
        .values({
          idempotencyKey: input.idempotencyKey,
          source: input.source,
          customerName: input.customerName,
          orderType: input.orderType,
          status: input.status,
          notes: input.notes,
          subtotalCents,
          totalCents,
          inventoryDeducted: tracked.size > 0,
          createdById: input.createdById,
          completedAt: input.status === "completed" ? now : null,
        })
        .returning({ id: schema.orders.id, orderNumber: schema.orders.orderNumber });

      await tx.insert(schema.orderItems).values(
        lines.map((l) => ({
          orderId: order!.id,
          productId: l.product.id,
          productName: l.product.name,
          categoryName: l.product.categoryName,
          unitPriceCents: l.unitPriceCents,
          quantity: l.quantity,
          selections: l.selections,
          lineTotalCents: l.lineTotalCents,
        })),
      );

      await tx.insert(schema.payments).values({
        orderId: order!.id,
        method: payment.method,
        status: payment.markPaid ? "paid" : "unpaid",
        amountCents: totalCents,
        tenderedCents,
        changeCents,
        reference: payment.reference?.trim() || null,
        recordedById: payment.markPaid ? input.createdById : null,
        paidAt: payment.markPaid ? now : null,
      });

      return { id: order!.id, orderNumber: order!.orderNumber, totalCents, changeCents, duplicate: false };
    });
  } catch (error) {
    // Two identical submissions raced: return the one that won.
    if (isUniqueViolation(error, "idempotency")) {
      const winner = await findByIdempotencyKey(input.idempotencyKey);
      if (winner) return winner;
    }
    throw error;
  }
}

async function findByIdempotencyKey(key: string): Promise<CreatedOrder | null> {
  const db = await getDb();
  const [row] = await db
    .select({
      id: schema.orders.id,
      orderNumber: schema.orders.orderNumber,
      totalCents: schema.orders.totalCents,
      changeCents: schema.payments.changeCents,
    })
    .from(schema.orders)
    .leftJoin(schema.payments, eq(schema.payments.orderId, schema.orders.id))
    .where(eq(schema.orders.idempotencyKey, key))
    .limit(1);
  return row ? { ...row, duplicate: true } : null;
}

/* ------------------------------------------------------------------ */
/* Status changes                                                      */
/* ------------------------------------------------------------------ */

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["preparing", "ready", "completed", "cancelled"],
  preparing: ["ready", "completed", "cancelled"],
  ready: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function nextStatusesFor(status: OrderStatus): OrderStatus[] {
  return ALLOWED_TRANSITIONS[status];
}

export async function updateOrderStatus(
  orderId: string,
  next: OrderStatus,
  { canCancelPaid = true }: { canCancelPaid?: boolean } = {},
): Promise<void> {
  const db = await getDb();
  await db.transaction(async (tx) => {
    const [order] = await tx
      .select({
        status: schema.orders.status,
        inventoryDeducted: schema.orders.inventoryDeducted,
        paymentStatus: schema.payments.status,
      })
      .from(schema.orders)
      .leftJoin(schema.payments, eq(schema.payments.orderId, schema.orders.id))
      .where(eq(schema.orders.id, orderId))
      .for("update", { of: schema.orders });
    if (!order) throw new UserFacingError("Order not found.");
    if (!ALLOWED_TRANSITIONS[order.status].includes(next)) {
      throw new UserFacingError(`A ${order.status} order cannot be changed to ${next}.`);
    }
    // Checked under the row lock so a payment recorded at the same moment can't slip past.
    if (next === "cancelled" && order.paymentStatus === "paid" && !canCancelPaid) {
      throw new UserFacingError("This order is already paid. Only the owner can cancel paid orders.");
    }

    if (next === "cancelled") {
      if (order.inventoryDeducted) await restoreInventory(tx, orderId);
      await tx
        .update(schema.payments)
        .set({ status: "voided" })
        .where(and(eq(schema.payments.orderId, orderId), eq(schema.payments.status, "unpaid")));
    }

    await tx
      .update(schema.orders)
      .set({
        status: next,
        completedAt: next === "completed" ? new Date() : undefined,
        inventoryDeducted: next === "cancelled" ? false : undefined,
      })
      .where(eq(schema.orders.id, orderId));
  });
}

/** Returns stock for every item of the order whose product still tracks inventory. */
async function restoreInventory(tx: Tx, orderId: string) {
  const items = await tx
    .select({ productId: schema.orderItems.productId, quantity: schema.orderItems.quantity })
    .from(schema.orderItems)
    .where(eq(schema.orderItems.orderId, orderId));
  const totals = new Map<string, number>();
  for (const item of items) {
    if (item.productId) totals.set(item.productId, (totals.get(item.productId) ?? 0) + item.quantity);
  }
  for (const [productId, qty] of totals) {
    await tx
      .update(schema.inventory)
      .set({ quantity: sql`${schema.inventory.quantity} + ${qty}` })
      .where(eq(schema.inventory.productId, productId));
  }
}

/** Records payment for an order that was placed unpaid (e.g. an online order paid at the counter). */
export async function recordPayment(
  orderId: string,
  input: { method: PaymentMethod; tenderedCents: number | null; reference: string | null; userId: string },
): Promise<{ changeCents: number | null }> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ status: schema.orders.status, totalCents: schema.orders.totalCents, paymentStatus: schema.payments.status })
      .from(schema.orders)
      .innerJoin(schema.payments, eq(schema.payments.orderId, schema.orders.id))
      .where(eq(schema.orders.id, orderId))
      .for("update");
    if (!row) throw new UserFacingError("Order not found.");
    if (row.status === "cancelled") throw new UserFacingError("This order was cancelled.");
    if (row.paymentStatus === "paid") throw new UserFacingError("This order is already paid.");

    let changeCents: number | null = null;
    let tenderedCents: number | null = null;
    if (input.method === "cash") {
      if (input.tenderedCents == null) throw new UserFacingError("Enter the cash amount received.");
      if (input.tenderedCents < row.totalCents) {
        throw new UserFacingError(`Cash received is less than the total of ${formatPeso(row.totalCents)}.`);
      }
      tenderedCents = input.tenderedCents;
      changeCents = input.tenderedCents - row.totalCents;
    }

    await tx
      .update(schema.payments)
      .set({
        method: input.method,
        status: "paid",
        tenderedCents,
        changeCents,
        reference: input.reference?.trim() || null,
        recordedById: input.userId,
        paidAt: new Date(),
      })
      .where(eq(schema.payments.orderId, orderId));
    return { changeCents };
  });
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

export type OrderDetail = NonNullable<Awaited<ReturnType<typeof getOrderDetail>>>;

export async function getOrderDetail(orderId: string) {
  const db = await getDb();
  const order = await db.query.orders.findFirst({
    where: eq(schema.orders.id, orderId),
    with: {
      items: true,
      payment: { with: { recordedBy: { columns: { name: true } } } },
      createdBy: { columns: { name: true } },
    },
  });
  if (!order) return null;
  return {
    ...order,
    items: order.items.map((i) => ({
      ...i,
      summary: describeSelection(i.selections.options, i.selections.addons),
    })),
  };
}

/** Customer-safe view of an order (no staff or internal fields). */
export async function getOrderForCustomer(orderId: string) {
  const order = await getOrderDetail(orderId);
  if (!order) return null;
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    orderType: order.orderType,
    customerName: order.customerName,
    notes: order.notes,
    totalCents: order.totalCents,
    subtotalCents: order.subtotalCents,
    createdAt: order.createdAt,
    items: order.items.map((i) => ({
      id: i.id,
      productName: i.productName,
      quantity: i.quantity,
      unitPriceCents: i.unitPriceCents,
      lineTotalCents: i.lineTotalCents,
      summary: i.summary,
    })),
    payment: order.payment ? { method: order.payment.method, status: order.payment.status } : null,
  };
}

/** Cashiers see today's orders plus any older order that is still open. */
export const OPEN_STATUSES: OrderStatus[] = ["pending", "preparing", "ready"];

function recentOrdersCondition(): SQL {
  return or(gte(schema.orders.createdAt, shopMidnight()), inArray(schema.orders.status, OPEN_STATUSES))!;
}

export function isRecentOrder(order: { createdAt: Date; status: OrderStatus }): boolean {
  return order.createdAt >= shopMidnight() || OPEN_STATUSES.includes(order.status);
}

export type OrderFilters = {
  /** "recent" restricts results to what cashiers may see. */
  scope?: "all" | "recent";
  q?: string;
  date?: string; // YYYY-MM-DD in shop time
  status?: OrderStatus;
  method?: PaymentMethod;
  page?: number;
};

export const ORDERS_PAGE_SIZE = 25;

export async function listOrders(filters: OrderFilters) {
  const db = await getDb();
  const conditions: SQL[] = [];
  const q = filters.q?.replace(/[^0-9]/g, "");
  if (q) conditions.push(sql`${schema.orders.orderNumber}::text LIKE ${q + "%"}`);
  if (filters.date && /^\d{4}-\d{2}-\d{2}$/.test(filters.date)) {
    const start = new Date(`${filters.date}T00:00:00+08:00`);
    if (!Number.isNaN(start.getTime())) {
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      conditions.push(gte(schema.orders.createdAt, start), lt(schema.orders.createdAt, end));
    }
  }
  if (filters.status) conditions.push(eq(schema.orders.status, filters.status));
  if (filters.method) conditions.push(eq(schema.payments.method, filters.method));
  if (filters.scope === "recent") conditions.push(recentOrdersCondition());
  const where = conditions.length ? and(...conditions) : undefined;
  const page = Math.max(1, filters.page ?? 1);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: schema.orders.id,
        orderNumber: schema.orders.orderNumber,
        createdAt: schema.orders.createdAt,
        customerName: schema.orders.customerName,
        orderType: schema.orders.orderType,
        status: schema.orders.status,
        source: schema.orders.source,
        totalCents: schema.orders.totalCents,
        paymentMethod: schema.payments.method,
        paymentStatus: schema.payments.status,
        itemCount: sql<number>`(SELECT COALESCE(SUM(${schema.orderItems.quantity}), 0)::int FROM ${schema.orderItems} WHERE ${schema.orderItems.orderId} = ${schema.orders.id})`,
        itemSummary: sql<string>`(SELECT string_agg(${schema.orderItems.quantity} || '× ' || ${schema.orderItems.productName}, ', ') FROM ${schema.orderItems} WHERE ${schema.orderItems.orderId} = ${schema.orders.id})`,
      })
      .from(schema.orders)
      .leftJoin(schema.payments, eq(schema.payments.orderId, schema.orders.id))
      .where(where)
      .orderBy(desc(schema.orders.createdAt))
      .limit(ORDERS_PAGE_SIZE)
      .offset((page - 1) * ORDERS_PAGE_SIZE),
    db
      .select({ total: count() })
      .from(schema.orders)
      .leftJoin(schema.payments, eq(schema.payments.orderId, schema.orders.id))
      .where(where),
  ]);

  return { rows, total, page, pageCount: Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE)) };
}
