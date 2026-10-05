import "server-only";
import { ZodError } from "zod";
import { UnauthorizedError } from "./auth";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** An error whose message is safe to show to the person using the app. */
export class UserFacingError extends Error {}

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });
export const fail = (error: string, fieldErrors?: Record<string, string>): ActionResult<never> => ({
  ok: false,
  error,
  fieldErrors,
});

/**
 * Converts any thrown error into a friendly ActionResult. Internal errors (database, network…)
 * are logged on the server and replaced with a generic message so stack traces and SQL never
 * reach the browser.
 */
export function toActionError(error: unknown, fallback = "Something went wrong. Please try again."): ActionResult<never> {
  if (error instanceof UserFacingError || error instanceof UnauthorizedError) return fail(error.message);
  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of error.issues) {
      const key = issue.path.join(".") || "form";
      fieldErrors[key] ??= issue.message;
    }
    return fail(error.issues[0]?.message ?? "Please check the form and try again.", fieldErrors);
  }
  console.error("[action error]", error);
  return fail(fallback);
}

/** Postgres unique-violation detection that works for node-postgres and PGlite. */
export function isUniqueViolation(error: unknown, constraintIncludes?: string): boolean {
  const e = findPgError(error);
  if (!e || e.code !== "23505") return false;
  return constraintIncludes ? String(e.constraint ?? e.message ?? "").includes(constraintIncludes) : true;
}

export function isForeignKeyViolation(error: unknown): boolean {
  return findPgError(error)?.code === "23503";
}

function findPgError(error: unknown): { code?: string; constraint?: string; message?: string } | null {
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth++) {
    const candidate = current as { code?: unknown; cause?: unknown };
    if (typeof candidate.code === "string") return candidate as { code: string };
    current = candidate.cause;
  }
  return null;
}
