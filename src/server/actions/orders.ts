"use server";

import { revalidatePath } from "next/cache";
import { checkoutSchema, orderStatusSchema, posSaleSchema, recordPaymentSchema } from "@/lib/validation";
import { ORDER_TYPE_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/format";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { can } from "@/lib/permissions";
import { requirePermission, type CurrentUser } from "../auth";
import { createOrder, getOrderDetail, isRecentOrder, recordPayment, updateOrderStatus, type CreatedOrder } from "../orders";
import { getSettings } from "../settings";
import { fail, ok, toActionError, UserFacingError, type ActionResult } from "../result";

/** Customer checkout from the public website. Payment is recorded as unpaid until staff collect it. */
export async function placeOnlineOrder(input: unknown): Promise<ActionResult<{ id: string; orderNumber: number }>> {
  try {
    const data = checkoutSchema.parse(input);
    const settings = await getSettings();
    if (!settings.onlineOrderingEnabled) {
      return fail("Online ordering is currently paused. Please order at the counter.");
    }
    if (!settings.orderTypes.includes(data.orderType)) {
      return fail(`${ORDER_TYPE_LABEL[data.orderType]} is not available right now.`);
    }
    if (!settings.paymentMethods.includes(data.paymentMethod)) {
      return fail(`${PAYMENT_METHOD_LABEL[data.paymentMethod]} is not accepted right now.`);
    }
    const order = await createOrder({
      idempotencyKey: `web:${data.idempotencyKey}`,
      source: "online",
      items: data.items,
      customerName: data.customerName,
      orderType: data.orderType,
      notes: data.notes,
      status: "pending",
      createdById: null,
      expectedTotalCents: data.expectedTotalCents,
      payment: { method: data.paymentMethod, markPaid: false },
    });
    revalidatePath("/admin", "layout");
    return ok({ id: order.id, orderNumber: order.orderNumber });
  } catch (error) {
    return toActionError(error, "We couldn't place your order. Please check your connection and try again.");
  }
}

export type PosSaleResult = CreatedOrder;

/** Cashiers may only act on recent/open orders; owners on any order. */
async function assertOrderAccess(user: CurrentUser, orderId: string) {
  if (can(user.role, "orders.viewAll")) return;
  const db = await getDb();
  const [order] = await db
    .select({ createdAt: schema.orders.createdAt, status: schema.orders.status })
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId))
    .limit(1);
  if (!order) throw new UserFacingError("Order not found.");
  if (!isRecentOrder(order)) throw new UserFacingError("Only the owner can change older orders.");
}

/** In-store sale from the POS. Staff confirm payment was received before completing. */
export async function completePosSale(input: unknown): Promise<ActionResult<PosSaleResult>> {
  try {
    const user = await requirePermission("pos.use");
    const data = posSaleSchema.parse(input);
    const settings = await getSettings();
    if (!settings.paymentMethods.includes(data.paymentMethod)) {
      throw new UserFacingError(`${PAYMENT_METHOD_LABEL[data.paymentMethod]} is disabled in Settings.`);
    }
    if (data.paymentMethod === "cash" && data.tenderedCents == null) {
      throw new UserFacingError("Enter the cash amount received.");
    }
    const order = await createOrder({
      idempotencyKey: `pos:${data.idempotencyKey}`,
      source: "pos",
      items: data.items,
      customerName: data.customerName,
      orderType: data.orderType,
      notes: data.notes,
      status: settings.posDefaultStatus,
      createdById: user.id,
      expectedTotalCents: data.expectedTotalCents,
      payment: {
        method: data.paymentMethod,
        markPaid: true,
        tenderedCents: data.paymentMethod === "cash" ? data.tenderedCents : null,
        reference: data.paymentMethod === "cash" ? null : data.reference,
      },
    });
    revalidatePath("/admin", "layout");
    return ok(order);
  } catch (error) {
    return toActionError(error, "Unable to complete the order. Please check your connection and try again.");
  }
}

export async function setOrderStatus(input: unknown): Promise<ActionResult<null>> {
  try {
    const user = await requirePermission("orders.updateStatus");
    const data = orderStatusSchema.parse(input);
    await assertOrderAccess(user, data.orderId);
    await updateOrderStatus(data.orderId, data.status, { canCancelPaid: can(user.role, "orders.cancelPaid") });
    revalidatePath("/admin", "layout");
    return ok(null);
  } catch (error) {
    return toActionError(error, "Unable to update the order. Please try again.");
  }
}

export async function recordOrderPayment(input: unknown): Promise<ActionResult<{ changeCents: number | null }>> {
  try {
    const user = await requirePermission("payments.record");
    const data = recordPaymentSchema.parse(input);
    await assertOrderAccess(user, data.orderId);
    const result = await recordPayment(data.orderId, {
      method: data.method,
      tenderedCents: data.tenderedCents,
      reference: data.reference,
      userId: user.id,
    });
    revalidatePath("/admin", "layout");
    return ok(result);
  } catch (error) {
    return toActionError(error, "Unable to record the payment. Please try again.");
  }
}

/** Receipt data for the POS success screen (printing right after a sale). */
export async function getReceiptData(orderId: string) {
  const user = await requirePermission("orders.viewRecent");
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return null;
  const order = await getOrderDetail(orderId);
  if (!order || (!can(user.role, "orders.viewAll") && !isRecentOrder(order))) return null;
  return order;
}
