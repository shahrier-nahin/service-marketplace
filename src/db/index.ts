import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// A module-level singleton pool, guarded against Next.js dev-mode hot-reload
// creating a new pool on every file change (which would otherwise exhaust
// Postgres connections quickly during local development).
declare global {
  // eslint-disable-next-line no-var
  var __dbPool: Pool | undefined;
}

const pool =
  global.__dbPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  global.__dbPool = pool;
}

export const db = drizzle(pool, { schema });
