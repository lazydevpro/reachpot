'use client';

// One-purpose helper: send tPOT from your Portaldot wallet extension to Reachpot's testnet admin account.
// Always talks to Portaldot V3 *testnet*, whatever network the rest of the app is configured for.
import { ArrowRight, CheckCircle2, ExternalLink, RefreshCw, Wallet } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { ApiPromise } from '@polkadot/api';
import { fmtUnits, parseUnitsStrict, shortAddr, type NetworkConfig } from '@reachpot/core';
import { Copyable } from '@/components/common/bits';
import { Button } from '@/components/ui/button';
import { Card, Panel } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/field';
import { usePoll } from '@/lib/client/api';
import { cn } from '@/lib/utils';

interface Acct {
  address: string;
  name: string;
  source: string;
  free?: bigint;
}

let testnetApi: Promise<ApiPromise> | undefined;
async function api(ws: string) {
  testnetApi ??= import('@reachpot/core/native').then(async ({ connectNative }) => {
    const a = await connectNative(ws);
    await a.isReady;
    return a;
  });
  return testnetApi;
}

export function FundAdmin() {
  const { data: target, error: targetError } = usePoll<{ address: string; network: NetworkConfig }>('/api/fund-target');
  const [accounts, setAccounts] = useState<Acct[]>([]);
  const [selected, setSelected] = useState<string>();
  const [amount, setAmount] = useState('45');
  const [decimals, setDecimals] = useState(14);
  const [adminFree, setAdminFree] = useState<bigint>();
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState<string>();
  const [done, setDone] = useState<{ txHash: string; block: number }>();

  const refresh = useCallback(async () => {
    if (!target) return;
    const a = await api(target.network.ws);
    setDecimals(a.registry.chainDecimals[0] ?? 14);
    const free = async (who: string) => (await a.query.system.account(who)).data.free.toBigInt();
    setAdminFree(await free(target.address));
    const updated = await Promise.all(accounts.map(async (x) => ({ ...x, free: await free(x.address) })));
    if (updated.length) setAccounts(updated);
  }, [target, accounts]);

  useEffect(() => {
    if (!target) return;
    let alive = true;
    api(target.network.ws)
      .then(async (a) => {
        const f = (await a.query.system.account(target.address)).data.free.toBigInt();
        if (alive) {
          setDecimals(a.registry.chainDecimals[0] ?? 14);
          setAdminFree(f);
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [target]);

  async function connect() {
    if (!target) return;
    setConnecting(true);
    try {
      const { web3Enable, web3Accounts } = await import('@polkadot/extension-dapp');
      const exts = await web3Enable('Reachpot');
      if (exts.length === 0) throw new Error('No wallet extension answered. Open the extension, unlock it, allow this site, then try again.');
      const list = (await web3Accounts({ ss58Format: 42 })).filter((x) => x.type !== 'ethereum');
      if (list.length === 0) throw new Error('The extension has no Portaldot (Substrate) accounts to share with this site.');
      const a = await api(target.network.ws);
      const withBal = await Promise.all(
        list.map(async (x) => ({ address: x.address, name: x.meta.name ?? 'Account', source: x.meta.source, free: (await a.query.system.account(x.address)).data.free.toBigInt() })),
      );
      withBal.sort((p, q) => (q.free! > p.free! ? 1 : -1));
      setAccounts(withBal);
      setSelected(withBal[0].address);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setConnecting(false);
    }
  }

  const from = accounts.find((a) => a.address === selected);
  let planck: bigint | null = null;
  try {
    planck = parseUnitsStrict(amount, decimals);
  } catch {
    planck = null;
  }
  const tooMuch = planck !== null && from?.free !== undefined && planck >= from.free;

  async function send() {
    if (!target || !from || !planck) return;
    setDone(undefined);
    try {
      const [a, { sendNative }, { web3FromAddress }] = await Promise.all([api(target.network.ws), import('@reachpot/core/native'), import('@polkadot/extension-dapp')]);
      const injector = await web3FromAddress(from.address);
      setStatus('Waiting for your approval in the extension…');
      const r = await sendNative(a, a.tx.balances.transferKeepAlive(target.address, planck), { address: from.address, signer: injector.signer }, (s) =>
        setStatus(s === 'Ready' || s === 'Broadcast' ? 'Submitted, waiting for the next block…' : `Status: ${s}`),
      );
      setDone({ txHash: r.txHash, block: r.blockNumber });
      setStatus(undefined);
      toast.success(`Sent ${amount} tPOT`, { description: `Included in block #${r.blockNumber}` });
      await refresh();
    } catch (e) {
      setStatus(undefined);
      toast.error('Transfer failed', { description: (e as Error).message.slice(0, 200) });
    }
  }

  return (
    <div className="mx-auto max-w-[720px] px-5 pb-10 pt-32 sm:px-8">
      <div className="mb-8 space-y-3">
        <h1 className="text-[clamp(32px,4vw,44px)] leading-[1.05]">Fund the Reachpot admin</h1>
        <p className="text-[16px] leading-relaxed">
          Sends testnet tPOT from your Portaldot wallet extension to the account that deploys Reachpot and runs the keeper on Portaldot V3 testnet.
          You approve the transfer in your extension.
        </p>
      </div>

      <Card className="space-y-6 p-6 sm:p-8">
        <section className="space-y-2">
          <p className="text-[14px] font-semibold text-ink">To · Reachpot native admin</p>
          {targetError ? (
            <p className="text-[14px] text-bad">{targetError}</p>
          ) : target ? (
            <Panel className="flex flex-wrap items-center justify-between gap-3 p-4">
              <Copyable value={target.address} display={shortAddr(target.address, 10, 8)} />
              <span className="text-[13px] text-muted">
                Balance <span className="font-semibold text-ink tabular">{adminFree === undefined ? '…' : fmtUnits(adminFree, decimals)}</span> tPOT
              </span>
            </Panel>
          ) : (
            <div className="skeleton h-14 rounded-tile" />
          )}
        </section>

        <section className="space-y-2">
          <p className="text-[14px] font-semibold text-ink">From · your extension account</p>
          {accounts.length === 0 ? (
            <Button onClick={connect} loading={connecting} icon={<Wallet className="size-4" />} disabled={!target}>
              Connect wallet extension
            </Button>
          ) : (
            <div className="space-y-2">
              {accounts.map((a) => (
                <button
                  key={a.address}
                  onClick={() => setSelected(a.address)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left ring-1 transition-colors',
                    a.address === selected ? 'bg-accent-soft ring-accent/40' : 'bg-surface ring-line hover:bg-sunken',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block text-[14.5px] font-semibold text-ink">{a.name}</span>
                    <span className="block truncate font-mono text-[12px] text-faint">{a.address}</span>
                  </span>
                  <span className="shrink-0 text-right text-[14px] font-semibold text-ink tabular">{a.free === undefined ? '…' : fmtUnits(a.free, decimals)} tPOT</span>
                </button>
              ))}
              <button onClick={connect} className="inline-flex items-center gap-1 text-[13px] font-semibold text-faint hover:text-ink">
                <RefreshCw className="size-3.5" /> Refresh accounts
              </button>
            </div>
          )}
        </section>

        <Field label="Amount (tPOT)" hint="About 45 tPOT covers deploys, deposits, DEX liquidity and two demo creators. Your account keeps a small remainder for fees." error={tooMuch ? 'More than this account can send (it must keep a little for fees)' : undefined}>
          <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>

        <Button size="lg" className="w-full" icon={<ArrowRight className="size-4" />} disabled={!from || !planck || tooMuch || Boolean(status)} loading={Boolean(status)} onClick={send}>
          {status ?? `Send ${amount || '0'} tPOT`}
        </Button>

        {done && (
          <Panel className="space-y-1 p-4">
            <p className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">
              <CheckCircle2 className="size-4 text-good" /> Sent in block #{done.block.toLocaleString()}
            </p>
            <Copyable value={done.txHash} display={`tx ${done.txHash.slice(0, 14)}…`} />
            {target?.network.explorer && (
              <a
                href={`${target.network.explorer}/?rpc=${encodeURIComponent(target.network.ws)}#/explorer/query/${done.block}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent hover:underline"
              >
                View on the Portaldot explorer <ExternalLink className="size-3.5" />
              </a>
            )}
          </Panel>
        )}
      </Card>
      <p className="mt-4 px-2 text-[12.5px] text-faint">
        Nothing is sent without your approval in the extension. If no accounts appear, open the extension and allow “Reachpot” (localhost) to see your accounts.
      </p>
    </div>
  );
}
