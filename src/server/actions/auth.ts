"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getDb, schema } from "@/db";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, signSession } from "@/lib/auth/session";
import { passwordChangeSchema } from "@/lib/validation";
import { homeFor } from "@/lib/permissions";
import { requirePermission } from "../auth";
import { fail, ok, toActionError, type ActionResult } from "../result";

export type LoginState = { error: string | null; email: string };

// Basic brute-force protection. Per server instance — combined with bcrypt's cost this makes
// online password guessing slow. For multi-region scale, back this with a shared store.
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

// A real hash so unknown emails take as long to reject as wrong passwords (no user enumeration).
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= bcrypt.hash("tworr-timing-equalizer", 12));

/** Only same-site /admin paths; pages the role can't open redirect it to its own home anyway. */
function safeNext(value: FormDataEntryValue | null, fallback: string): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/admin") && !next.startsWith("//") && !next.startsWith("/admin/login") ? next : fallback;
}

async function setSessionCookie(userId: string, sessionVersion: number) {
  const token = await signSession({ sub: userId, sv: sessionVersion });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password.", email };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `${ip}:${email}`;
  const now = Date.now();
  const entry = attempts.get(key);
  if (entry && entry.resetAt > now && entry.count >= MAX_ATTEMPTS) {
    return { error: "Too many sign-in attempts. Please wait 15 minutes and try again.", email };
  }

  let user: typeof schema.users.$inferSelect | undefined;
  try {
    const db = await getDb();
    [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  } catch (error) {
    console.error("[login]", error);
    return { error: "We couldn't reach the server. Please try again.", email };
  }

  const valid = await bcrypt.compare(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !valid) {
    const current = entry && entry.resetAt > now ? entry : { count: 0, resetAt: now + WINDOW_MS };
    current.count += 1;
    attempts.set(key, current);
    return { error: "Incorrect email or password.", email };
  }
  attempts.delete(key);
  // Checked only after the password matched, so this message never reveals which emails exist.
  if (!user.isActive) return { error: "This account is disabled. Please ask the owner to enable it.", email };

  try {
    const db = await getDb();
    await db.update(schema.users).set({ lastLoginAt: new Date() }).where(eq(schema.users.id, user.id));
  } catch (error) {
    console.error("[login] could not record last login", error);
  }
  await setSessionCookie(user.id, user.sessionVersion);
  redirect(safeNext(formData.get("next"), homeFor(user.role)));
}

export async function logout(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}

export async function changePassword(input: unknown): Promise<ActionResult<null>> {
  try {
    const me = await requirePermission("account.manageOwn");
    const data = passwordChangeSchema.parse(input);
    const db = await getDb();
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, me.id)).limit(1);
    if (!user || !(await bcrypt.compare(data.currentPassword, user.passwordHash))) {
      return fail("Your current password is incorrect.", { currentPassword: "Incorrect password." });
    }
    const passwordHash = await bcrypt.hash(data.newPassword, 12);
    // Bump the session version: every other device is signed out; this one gets a fresh session.
    const [updated] = await db
      .update(schema.users)
      .set({ passwordHash, sessionVersion: sql`${schema.users.sessionVersion} + 1` })
      .where(eq(schema.users.id, me.id))
      .returning({ sessionVersion: schema.users.sessionVersion });
    await setSessionCookie(me.id, updated!.sessionVersion);
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}
