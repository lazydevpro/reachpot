'use client';

import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Database, LoaderCircle, ShieldCheck, XCircle } from 'lucide-react';
import { useState } from 'react';
import type { Hex } from 'viem';
import { campaignFromTuple, reachpotAbi, explorerBlockUrl } from '@reachpot/core';
import { snapshotHash, verifySnapshot, type Snapshot } from '@reachpot/allocation';
import { Copyable } from '@/components/common/bits';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/card';
import { publicClient } from '@/lib/client/evm-wallet';
import { getNativeApi } from '@/lib/client/native-wallet';
import { publicConfig } from '@/lib/config';
import type { CampaignDetail, PublicDeployment } from '@/lib/shared/protocol';

type Check = { label: string; ok: boolean; detail: string };

/** Re-derives the payout root in the browser from data read straight off the chain — no trust in our server. */
export function VerifyPanel({ c, d }: { c: CampaignDetail; d: PublicDeployment }) {
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [running, setRunning] = useState(false);
  const snap = c.snapshot!;
  const blockUrl = explorerBlockUrl(publicConfig.network, snap.block);

  async function run() {
    setRunning(true);
    setChecks([]);
    const out: Check[] = [];
    const push = (x: Check) => {
      out.push(x);
      setChecks([...out]);
    };
    try {
      const onchain = campaignFromTuple(await publicClient.readContract({ address: d.reachpot, abi: reachpotAbi, functionName: 'campaigns', args: [BigInt(c.id)] }));
      push({ label: 'Read campaign from Reachpot.sol', ok: true, detail: `root ${onchain.root.slice(0, 12)}… · snapshot at #${onchain.snapshotBlock}-${onchain.snapshotIndex}` });

      const api = await getNativeApi();
      const { readStoredData } = await import('@reachpot/core/native');
      let bytes: Uint8Array;
      try {
        bytes = await readStoredData(api, Number(onchain.snapshotBlock), Number(onchain.snapshotIndex));
        push({ label: 'Fetched snapshot from TransactionStorage', ok: true, detail: `${bytes.length.toLocaleString()} bytes from block #${onchain.snapshotBlock}` });
      } catch {
        bytes = new Uint8Array(await (await fetch(`/api/campaigns/${c.id}/snapshot`)).arrayBuffer());
        push({ label: 'Block body pruned on this node: fetched cached copy', ok: true, detail: 'integrity is still proven by the on-chain hash below' });
      }

      const h = snapshotHash(bytes);
      push({ label: 'blake2-256(snapshot) matches the hash pinned on-chain', ok: h.toLowerCase() === onchain.snapshotHash.toLowerCase(), detail: h });

      const s = JSON.parse(new TextDecoder().decode(bytes)) as Snapshot;
      const v = verifySnapshot(s, { root: onchain.root as Hex, totalAllocated: onchain.totalAllocated });
      push({
        label: 'Recomputed the pro-rata split and Merkle root',
        ok: v.ok,
        detail: v.ok ? `${s.allocations.length} payouts · root ${v.recomputedRoot.slice(0, 18)}… = on-chain` : v.problems.join('; '),
      });
    } catch (e) {
      push({ label: 'Verification error', ok: false, detail: (e as Error).message });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Panel className="space-y-1 p-4">
          <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-faint"><Database className="size-3.5" /> TransactionStorage</p>
          <p className="text-[14px] text-ink">
            Block{' '}
            {blockUrl ? (
              <a href={blockUrl} target="_blank" rel="noreferrer" className="font-semibold underline decoration-line-strong underline-offset-2 hover:decoration-ink">
                #{snap.block.toLocaleString()}
              </a>
            ) : (
              <span className="font-semibold">#{snap.block.toLocaleString()}</span>
            )}{' '}
            · extrinsic {snap.index}
          </p>
          <Copyable value={snap.hash} display={`blake2 ${snap.hash.slice(0, 10)}…${snap.hash.slice(-6)}`} />
        </Panel>
        <Panel className="space-y-1 p-4">
          <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-faint"><ShieldCheck className="size-3.5" /> Payout root</p>
          <Copyable value={snap.root} display={`${snap.root.slice(0, 12)}…${snap.root.slice(-6)}`} />
          {snap.rootTx && <Copyable value={snap.rootTx} display={`tx ${snap.rootTx.slice(0, 10)}…`} />}
        </Panel>
      </div>
      <Button variant="secondary" onClick={run} loading={running} icon={<ShieldCheck className="size-4" />}>
        Verify in your browser
      </Button>
      <AnimatePresence>
        {checks && checks.length > 0 && (
          <motion.ol initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2 overflow-hidden">
            {checks.map((x) => (
              <motion.li key={x.label} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2.5 rounded-xl bg-sunken/60 px-3 py-2.5">
                {x.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-good" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-bad" />}
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold text-ink">{x.label}</span>
                  <span className="block break-all font-mono text-[12px] text-muted">{x.detail}</span>
                </span>
              </motion.li>
            ))}
            {running && (
              <li className="flex items-center gap-2 px-3 py-1 text-[13px] text-faint">
                <LoaderCircle className="size-4 animate-spin" /> checking…
              </li>
            )}
          </motion.ol>
        )}
      </AnimatePresence>
    </div>
  );
}
