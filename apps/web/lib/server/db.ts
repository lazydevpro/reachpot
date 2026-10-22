// Database: hosted Postgres when DATABASE_URL is set (Neon/Supabase/any Postgres — used on Vercel), otherwise an embedded
// PGlite under .data/<network> for local development. Same drizzle schema and SQL either way.
import { mkdirSync } from 'node:fs';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import * as schema from './schema';
import { serverEnv } from './env';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = PgDatabase<any, typeof schema>;

// One connection per server process / serverless instance (survives dev hot reloads via globalThis).
const g = globalThis as unknown as { __reachpotDb?: Promise<Db> };

const bootstrapStatements = () =>
  schema.BOOTSTRAP_SQL.split(';')
    .map((s) => s.trim())
    .filter(Boolean);

async function openPostgres(url: string): Promise<Db> {
  const [{ default: postgres }, { drizzle }] = await Promise.all([import('postgres'), import('drizzle-orm/postgres-js')]);
  // prepare:false keeps it compatible with transaction-mode poolers (Neon/Supabase pooled URLs).
  const max = Number(process.env.PG_POOL_MAX ?? (process.env.VERCEL ? 1 : 5));
  const client = postgres(url, { prepare: false, max, idle_timeout: 20 });
  for (const stmt of bootstrapStatements()) {
    try {
      await client.unsafe(stmt);
    } catch (e) {
      // Concurrent cold starts can race on CREATE ... IF NOT EXISTS; the object exists either way.
      if (!/already exists|duplicate key/i.test((e as Error).message)) throw e;
    }
  }
  return drizzle(client, { schema }) as unknown as Db;
}

async function openPglite(): Promise<Db> {
  const [{ PGlite }, { drizzle }] = await Promise.all([import('@electric-sql/pglite'), import('drizzle-orm/pglite')]);
  mkdirSync(serverEnv.dataDir, { recursive: true });
  const client = new PGlite(serverEnv.dataDir);
  await client.exec(schema.BOOTSTRAP_SQL);
  return drizzle(client, { schema }) as unknown as Db;
}

export function db(): Promise<Db> {
  if (!g.__reachpotDb) {
    const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
    g.__reachpotDb = (url ? openPostgres(url) : openPglite()).catch((e) => {
      g.__reachpotDb = undefined;
      throw e;
    });
  }
  return g.__reachpotDb;
}

export { schema };
