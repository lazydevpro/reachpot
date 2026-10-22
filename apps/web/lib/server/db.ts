import { mkdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite';
import * as schema from './schema';
import { serverEnv } from './env';

export type Db = PgliteDatabase<typeof schema>;

// One embedded Postgres per server process (survives dev hot reloads via globalThis).
const g = globalThis as unknown as { __reachpotDb?: Promise<Db> };

export function db(): Promise<Db> {
  if (!g.__reachpotDb) {
    g.__reachpotDb = (async () => {
      mkdirSync(serverEnv.dataDir, { recursive: true });
      const client = new PGlite(serverEnv.dataDir);
      await client.exec(schema.BOOTSTRAP_SQL);
      return drizzle(client, { schema });
    })().catch((e) => {
      g.__reachpotDb = undefined;
      throw e;
    });
  }
  return g.__reachpotDb;
}

export { schema };
