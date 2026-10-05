import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * Creates the database connection.
 *
 * - `DATABASE_URL` set → PostgreSQL via node-postgres (Neon / Vercel Postgres / any Postgres in production).
 * - `DATABASE_URL` unset, outside Vercel → embedded PGlite stored in `.data/pglite` so local
 *   development works with zero setup. Migrations are applied automatically on first connect.
 */
export async function createDb(): Promise<{ db: Db; close: () => Promise<void> }> {
  const url = process.env.DATABASE_URL;

  if (url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const pool = new Pool({
      connectionString: url,
      max: process.env.VERCEL ? 3 : 10,
      idleTimeoutMillis: 10_000,
    });
    return { db: drizzle(pool, { schema }) as unknown as Db, close: () => pool.end() };
  }

  if (process.env.VERCEL) {
    throw new Error("DATABASE_URL is not set. Configure a Postgres database for this deployment.");
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dataDir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
  const { mkdirSync } = await import("node:fs");
  mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return { db: db as unknown as Db, close: () => client.close() };
}
