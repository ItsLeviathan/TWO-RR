"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { requirePermission } from "../auth";
import { ok, toActionError, UserFacingError, type ActionResult } from "../result";

const adjustSchema = z.object({
  productId: z.uuid(),
  mode: z.enum(["set", "add", "remove"]),
  amount: z.number().int("Use whole numbers.").min(0, "Use a positive number.").max(1_000_000),
});

/**
 * "add"/"remove" are applied relative to the current stock inside the database, so they stay
 * correct even if a sale happens at the same moment. Stock can never go below zero.
 */
export async function adjustStock(input: unknown): Promise<ActionResult<{ quantity: number }>> {
  try {
    await requirePermission("inventory.manage");
    const { productId, mode, amount } = adjustSchema.parse(input);
    const db = await getDb();
    const where = eq(schema.inventory.productId, productId);
    let rows: { quantity: number }[];
    if (mode === "set") {
      rows = await db.update(schema.inventory).set({ quantity: amount }).where(where).returning({ quantity: schema.inventory.quantity });
    } else if (mode === "add") {
      rows = await db
        .update(schema.inventory)
        .set({ quantity: sql`${schema.inventory.quantity} + ${amount}` })
        .where(where)
        .returning({ quantity: schema.inventory.quantity });
    } else {
      rows = await db
        .update(schema.inventory)
        .set({ quantity: sql`${schema.inventory.quantity} - ${amount}` })
        .where(and(where, gte(schema.inventory.quantity, amount)))
        .returning({ quantity: schema.inventory.quantity });
      if (rows.length === 0) throw new UserFacingError("You can't remove more than what's in stock.");
    }
    if (rows.length === 0) throw new UserFacingError("Inventory tracking is not enabled for this product.");
    revalidatePath("/", "layout");
    return ok({ quantity: rows[0]!.quantity });
  } catch (error) {
    return toActionError(error);
  }
}

export async function setLowStockThreshold(input: unknown): Promise<ActionResult<null>> {
  try {
    await requirePermission("inventory.manage");
    const data = z.object({ productId: z.uuid(), threshold: z.number().int().min(0).max(100_000) }).parse(input);
    const db = await getDb();
    await db
      .update(schema.inventory)
      .set({ lowStockThreshold: data.threshold })
      .where(eq(schema.inventory.productId, data.productId));
    revalidatePath("/", "layout");
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}
