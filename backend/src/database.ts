import pg from "pg";
import { assertPersistenceConfig, config } from "./config.js";

const { Pool, types } = pg;

types.setTypeParser(1114, (value) => new Date(`${value}Z`).toISOString());
types.setTypeParser(1184, (value) => new Date(value).toISOString());

let pool: pg.Pool | undefined;

export function database() {
  if (pool) return pool;
  assertPersistenceConfig();
  pool = new Pool({
    connectionString: config.databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
  });
  pool.on("error", (error) =>
    console.error("Conexão PostgreSQL ociosa falhou", error.message),
  );
  return pool;
}

export async function checkDatabase() {
  const result = await database().query<{ now: string }>("select now() as now");
  return result.rows[0]?.now;
}
