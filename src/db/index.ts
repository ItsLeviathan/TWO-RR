import "server-only";
import { createDb, type Db } from "./client";

// Reuse one connection per server instance (and across hot reloads in development).
const globalForDb = globalThis as unknown as { __tworrDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  globalForDb.__tworrDb ??= createDb()
    .then((c) => c.db)
    .catch((error) => {
      globalForDb.__tworrDb = undefined;
      throw error;
    });
  return globalForDb.__tworrDb;
}

export * as schema from "./schema";
export type { Db, Tx } from "./client";
