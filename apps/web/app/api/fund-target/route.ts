import { connection } from 'next/server';
import { getNetwork } from '@reachpot/core';
import '@/lib/server/env';

/** Public address of the keeper's native admin on testnet (what the Fund page sends tPOT to). Never returns secrets. */
export async function GET() {
  await connection();
  const address = process.env.NATIVE_ADMIN_ADDRESS;
  if (!address) return Response.json({ error: 'NATIVE_ADMIN_ADDRESS is not set in .env' }, { status: 404 });
  return Response.json({ address, network: getNetwork('testnet') });
}
