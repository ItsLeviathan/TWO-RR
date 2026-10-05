import { jwtVerify, SignJWT } from "jose";

/** Session token helpers. Safe to import from `proxy.ts` (no Node-only or DB dependencies). */

export const SESSION_COOKIE = "tworr_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days — the POS stays signed in through a work week.

/**
 * `sv` is the user's session version at sign-in. The server compares it with the database on every
 * request, so disabling a user, changing their role or resetting their password ends old sessions.
 * The role is NOT trusted from the token; it is always re-read from the database.
 */
export type SessionPayload = { sub: string; sv: number };

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to a random string of at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ sv: payload.sv })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.sv !== "number") return null;
    return { sub: payload.sub, sv: payload.sv };
  } catch {
    return null;
  }
}
