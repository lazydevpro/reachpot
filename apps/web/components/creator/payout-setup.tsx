'use client';

import { CheckCircle2, Link2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { Address } from 'viem';
import { Copyable } from '@/components/common/bits';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/card';
import { getNativeApi, useNativeWallet } from '@/lib/client/native-wallet';

/**
 * Payouts are pushed from the EVM contract to the creator's Revive-mapped H160, so funds land in their native account.
 * `revive.mapAccount` is a one-time native transaction that links the two.
 */
export function usePayoutMapping() {
  const w = useNativeWallet();
  const [state, setState] = useState<{ address?: string; mapped?: boolean; h160?: Address }>({});
  const [busy, setBusy] = useState(false);
  const address = w.account?.address;

  useEffect(() => {
    let alive = true;
    if (!address) return;
    (async () => {
      const [api, { h160OfAccount, isMapped }] = await Promise.all([getNativeApi(), import('@reachpot/core/native')]);
      const [h160, mapped] = await Promise.all([h160OfAccount(api, address), isMapped(api, address)]);
      if (alive) setState({ address, h160, mapped });
    })().catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [address]);

  async function enable() {
    setBusy(true);
    try {
      const [api, { sendNative }] = await Promise.all([getNativeApi(), import('@reachpot/core/native')]);
      const r = await sendNative(api, api.tx.revive.mapAccount(), await w.signer());
      setState((s) => ({ ...s, address, mapped: true }));
      toast.success('Payouts enabled', { description: `Mapped in block #${r.blockNumber}` });
    } catch (e) {
      toast.error('Could not enable payouts', { description: (e as Error).message.slice(0, 160) });
    } finally {
      setBusy(false);
    }
  }
  const current = state.address === address ? state : {};
  return { mapped: current.mapped, h160: current.h160, busy, enable };
}

export function PayoutSetup({ mapping }: { mapping: ReturnType<typeof usePayoutMapping> }) {
  if (mapping.mapped === undefined) return <div className="skeleton h-20 rounded-tile" />;
  return (
    <Panel className="flex flex-wrap items-center justify-between gap-4 p-4">
      <div className="space-y-1">
        <p className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">
          {mapping.mapped ? <CheckCircle2 className="size-4 text-good" /> : <Link2 className="size-4 text-accent" />}
          {mapping.mapped ? 'Payouts enabled' : 'Enable payouts (one time)'}
        </p>
        <p className="text-[13px] text-muted">
          {mapping.mapped ? 'Payouts from the campaign contract land straight in this Portaldot account.' : 'Links your Portaldot account to its EVM address so the campaign contract can pay you.'}
        </p>
        {mapping.h160 && <Copyable value={mapping.h160} display={`EVM address ${mapping.h160.slice(0, 10)}…${mapping.h160.slice(-6)}`} className="text-faint" />}
      </div>
      {!mapping.mapped && (
        <Button variant="accent" onClick={mapping.enable} loading={mapping.busy}>
          Enable payouts
        </Button>
      )}
    </Panel>
  );
}
