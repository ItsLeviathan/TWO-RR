"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq, ne, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getDb, schema, type Tx } from "@/db";
import { passwordResetSchema, userCreateSchema, userUpdateSchema } from "@/lib/validation";
import { requirePermission } from "../auth";
import { isUniqueViolation, ok, toActionError, UserFacingError, type ActionResult } from "../result";

const done = () => {
  revalidatePath("/admin", "layout");
  return ok(null);
};

/** Locks the user table's owner rows and counts active owners other than `exceptId`. */
async function otherActiveOwners(tx: Tx, exceptId: string): Promise<number> {
  await tx
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.role, "owner"))
    .for("update");
  const [{ n }] = await tx
    .select({ n: count() })
    .from(schema.users)
    .where(and(eq(schema.users.role, "owner"), eq(schema.users.isActive, true), ne(schema.users.id, exceptId)));
  return n;
}

export async function createUser(input: unknown): Promise<ActionResult<null>> {
  try {
    await requirePermission("users.manage");
    const data = userCreateSchema.parse(input);
    const db = await getDb();
    await db.insert(schema.users).values({
      name: data.name,
      email: data.email,
      role: data.role,
      passwordHash: await bcrypt.hash(data.password, 12),
    });
    return done();
  } catch (error) {
    if (isUniqueViolation(error)) return toActionError(new UserFacingError("Another user already has that email."));
    return toActionError(error, "Unable to create the user. Please try again.");
  }
}

export async function updateUser(input: unknown): Promise<ActionResult<null>> {
  try {
    const me = await requirePermission("users.manage");
    const data = userUpdateSchema.parse(input);
    const db = await getDb();
    await db.transaction(async (tx) => {
      const [target] = await tx.select().from(schema.users).where(eq(schema.users.id, data.id)).for("update");
      if (!target) throw new UserFacingError("This user no longer exists.");

      if (target.id === me.id && (data.role !== target.role || !data.isActive)) {
        throw new UserFacingError("You can't change your own role or disable your own account.");
      }
      const losesOwnerAccess = target.role === "owner" && target.isActive && (data.role !== "owner" || !data.isActive);
      if (losesOwnerAccess && (await otherActiveOwners(tx, target.id)) === 0) {
        throw new UserFacingError("There must always be at least one active owner.");
      }

      // Access changed → end the user's existing sessions immediately.
      const accessChanged = data.role !== target.role || data.isActive !== target.isActive;
      await tx
        .update(schema.users)
        .set({
          name: data.name,
          email: data.email,
          role: data.role,
          isActive: data.isActive,
          ...(accessChanged ? { sessionVersion: sql`${schema.users.sessionVersion} + 1` } : {}),
        })
        .where(eq(schema.users.id, target.id));
    });
    return done();
  } catch (error) {
    if (isUniqueViolation(error)) return toActionError(new UserFacingError("Another user already has that email."));
    return toActionError(error, "Unable to update the user. Please try again.");
  }
}

/** Sets a new password for someone else (e.g. a cashier who forgot theirs) and signs them out everywhere. */
export async function resetUserPassword(input: unknown): Promise<ActionResult<null>> {
  try {
    const me = await requirePermission("users.manage");
    const data = passwordResetSchema.parse(input);
    if (data.id === me.id) throw new UserFacingError("Change your own password on the My account page.");
    const db = await getDb();
    const updated = await db
      .update(schema.users)
      .set({ passwordHash: await bcrypt.hash(data.password, 12), sessionVersion: sql`${schema.users.sessionVersion} + 1` })
      .where(eq(schema.users.id, data.id))
      .returning({ id: schema.users.id });
    if (updated.length === 0) throw new UserFacingError("This user no longer exists.");
    return done();
  } catch (error) {
    return toActionError(error, "Unable to reset the password. Please try again.");
  }
}

/**
 * Removes a user who never handled a sale. Anyone who created orders or recorded payments is kept
 * (disable them instead) so order history always shows who handled each sale.
 */
export async function deleteUser(input: unknown): Promise<ActionResult<null>> {
  try {
    const me = await requirePermission("users.manage");
    const id = z.uuid().parse(input);
    if (id === me.id) throw new UserFacingError("You can't remove your own account.");
    const db = await getDb();
    await db.transaction(async (tx) => {
      const [target] = await tx.select().from(schema.users).where(eq(schema.users.id, id)).for("update");
      if (!target) throw new UserFacingError("This user no longer exists.");
      if (target.role === "owner" && target.isActive && (await otherActiveOwners(tx, id)) === 0) {
        throw new UserFacingError("There must always be at least one active owner.");
      }
      const [{ orders }] = await tx.select({ orders: count() }).from(schema.orders).where(eq(schema.orders.createdById, id));
      const [{ payments }] = await tx
        .select({ payments: count() })
        .from(schema.payments)
        .where(eq(schema.payments.recordedById, id));
      if (orders + payments > 0) {
        throw new UserFacingError(
          `${target.name} has handled sales, so their name stays on order history. Disable the account instead.`,
        );
      }
      await tx.delete(schema.users).where(eq(schema.users.id, id));
    });
    return done();
  } catch (error) {
    return toActionError(error, "Unable to remove the user. Please try again.");
  }
}
