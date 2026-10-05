/**
 * Applies SQL migrations from ./drizzle.
 * - With DATABASE_URL: migrates that Postgres database (run on every Vercel deploy via `vercel-build`).
 * - Without it: migrates the local PGlite database (also done automatically when the app starts).
 */
import { config } from "dotenv";
config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const pool = new Pool({ connectionString: url, max: 1 });
    await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
    await pool.end();
    console.log("✓ Postgres migrations applied");
  } else {
    const { createDb } = await import("../src/db/client");
    const { close } = await createDb();
    await close();
    console.log("✓ Local PGlite migrations applied (.data/pglite)");
  }
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
