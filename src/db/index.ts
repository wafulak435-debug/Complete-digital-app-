import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.ts";

const { Pool } = pg;

declare global {
  var _postgresPool: pg.Pool | undefined;
}

const pool =
  globalThis._postgresPool ??
  new Pool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
    port: 5432,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 8000,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis._postgresPool = pool;
}

export const db = drizzle(pool, { schema });
export { pool };
