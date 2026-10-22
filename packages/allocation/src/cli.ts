#!/usr/bin/env -S npx tsx
// Recompute a Reachpot payout root from a snapshot file and compare it with the snapshot and (optionally) on-chain values.
//   reachpot-verify snapshot.json [--root 0x…] [--total 123] [--hash 0x…]
import { readFileSync } from 'node:fs';
import type { Hex } from 'viem';
import { snapshotHash, verifySnapshot, type Snapshot } from './snapshot.js';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
if (!file) {
  console.error('usage: reachpot-verify <snapshot.json> [--root 0x…] [--total <amount>] [--hash 0x…]');
  process.exit(2);
}

const bytes = new Uint8Array(readFileSync(file));
const snapshot = JSON.parse(new TextDecoder().decode(bytes)) as Snapshot;
const total = flag('total');
const res = verifySnapshot(snapshot, {
  root: flag('root') as Hex | undefined,
  totalAllocated: total === undefined ? undefined : BigInt(total),
  hash: flag('hash') as Hex | undefined,
  bytes,
});

console.log(`campaign      #${snapshot.campaignId} on ${snapshot.contract} (chain ${snapshot.chainId})`);
console.log(`creators      ${snapshot.creators.length}, allocations ${snapshot.allocations.length}`);
console.log(`content hash  ${snapshotHash(bytes)}`);
console.log(`root          ${res.recomputedRoot}`);
console.log(`total         ${res.recomputedTotal} of pool ${snapshot.pool}`);
if (res.ok) console.log('✅ snapshot verifies');
else {
  for (const p of res.problems) console.log(`❌ ${p}`);
  process.exit(1);
}
