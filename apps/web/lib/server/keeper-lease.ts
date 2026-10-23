// A one-row lease in Postgres so only one keeper tick runs at a time across serverless instances. The in-process
// single-flight in keeper.ts can't see other instances, and the Cloudflare cron fires every minute while a tick on
// testnet can take minutes. An expired lease (e.g. a tick killed at maxDuration) is taken over by the next caller.
import { eq, sql } from 'drizzle-orm';
import type { Db } from './db';
import { keeperLease } from './schema';

/** Takes the lease for `seconds` unless someone else holds an unexpired one. Atomic: one INSERT … ON CONFLICT. */
export async function acquireKeeperLease(d: Db, holder: string, seconds: number): Promise<boolean> {
  const until = sql.raw(`now() + interval '${Math.ceil(seconds)} seconds'`);
  const got = await d
    .insert(keeperLease)
    .values({ id: 1, holder, until })
    .onConflictDoUpdate({ target: keeperLease.id, set: { holder, until }, setWhere: sql`${keeperLease.until} < now()` })
    .returning({ holder: keeperLease.holder });
  return got.length > 0;
}

/** Ends the lease early if `holder` still owns it (back-dated so a caller right after sees it expired). */
export async function releaseKeeperLease(d: Db, holder: string): Promise<void> {
  await d.update(keeperLease).set({ until: sql`now() - interval '1 second'` }).where(eq(keeperLease.holder, holder));
}
