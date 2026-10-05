import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { UserRole } from "@/db/schema";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";
import { can, homeFor, type Permission } from "@/lib/permissions";

export type CurrentUser = { id: string; email: string; name: string; role: UserRole };

/**
 * Reads the session cookie, then confirms against the database that the user still exists, is
 * active, and that the session hasn't been revoked. The role comes from the database, never from
 * the cookie. Memoized per request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const db = await getDb();
  const [user] = await db
    .select({ id: schema.users.id, email: schema.users.email, name: schema.users.name, role: schema.users.role })
    .from(schema.users)
    .where(
      and(
        eq(schema.users.id, session.sub),
        eq(schema.users.isActive, true),
        eq(schema.users.sessionVersion, session.sv),
      ),
    )
    .limit(1);
  return user ?? null;
});

/**
 * For admin pages. Not signed in → login page. Signed in without the permission → their own home
 * (cashiers land on the POS), so a typed URL never shows an owner-only page.
 */
export async function requirePage(permission: Permission): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!can(user.role, permission)) redirect(homeFor(user.role));
  return user;
}

export class UnauthorizedError extends Error {
  constructor(message = "You must be signed in to do that.") {
    super(message);
  }
}

/** For Server Actions: throws unless signed in with the permission. Every mutation calls this first. */
export async function requirePermission(permission: Permission): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  if (!can(user.role, permission)) throw new UnauthorizedError("Only the owner can do that.");
  return user;
}
