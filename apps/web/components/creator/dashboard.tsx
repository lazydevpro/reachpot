'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowDownUp, ArrowUpRight, BadgeCheck, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { compact, fmtUnits, parseUnitsStrict, shortAddr } from '@reachpot/core';
import { Amount, Copyable, ShortThumb } from '@/components/common/bits';
import { NativeConnect } from '@/components/wallet/connect';
import { Button, ButtonLink } from '@/components/ui/button';
import { Badge, Card, Panel } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/field';
import { usePoll } from '@/lib/client/api';
import { useDeployment } from '@/lib/client/deployment';
import { getNativeApi, useNativeWallet } from '@/lib/client/native-wallet';
import type { CreatorDashboard as Dash } from '@/lib/shared/protocol';
import { PayoutSetup, usePayoutMapping } from './payout-setup';

export function CreatorDashboard() {
  const wallet = useNativeWallet();
  const address = wallet.account?.address;
  const { data, refresh } = usePoll<Dash>(address ? `/api/creators/${address}` : null, 6000);
  const mapping = usePayoutMapping();

  return (
    <div className="mx-auto max-w-[1200px] px-5 pb-10 pt-32 sm:px-8">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-xl space-y-3">
          <h1 className="text-[clamp(36px,4.5vw,52px)] leading-[1.02]">Your reach, paid</h1>
          <p className="text-[17px] leading-relaxed">Earnings land in your Portaldot account. Cash out on the native DEX, and every payout levels up your soulbound creator badge.</p>
        </div>
        <NativeConnect size="lg" />
      </header>

      {!address ? (
        <Card className="grid place-items-center px-6 py-20 text-center">
          <span className="app-icon mb-5 grid size-14 place-items-center rounded-2xl text-white"><Sparkles className="size-6" /></span>
          <h2 className="text-[26px]">Connect to see your earnings</h2>
          <p className="mt-2 max-w-sm">Use Talisman, SubWallet or polkadot&#123;.js&#125;. On the local demo chain you can pick a demo creator.</p>
        </Card>
      ) : !data ? (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <div className="skeleton h-[460px] rounded-card" />
          <div className="skeleton h-[460px] rounded-card" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <div className="space-y-6">
            <BadgeCard d={data} />
            {mapping.mapped === false && <PayoutSetup mapping={mapping} />}
          </div>
          <div className="space-y-6">
            <CashOut d={data} onDone={refresh} />
            <Card className="space-y-4 p-6">
              <h2 className="text-[22px]">Payouts</h2>
              {data.payouts.length === 0 ? (
                <p className="text-[14px]">No payouts yet. <Link href="/campaigns" className="font-semibold text-ink underline underline-offset-2">Find a campaign</Link> and post a Short.</p>
              ) : (
                data.payouts.map((p, i) => (
                  <Link key={i} href={`/c/${p.campaignId}`} className="flex items-center justify-between gap-3 rounded-xl bg-sunken/60 px-4 py-3 transition-colors hover:bg-sunken">
                    <span className="min-w-0">
                      <span className="block truncate text-[14.5px] font-semibold text-ink">{p.campaignTitle}</span>
                      <span className="block text-[12.5px] text-faint">{new Date(p.createdAt).toLocaleString()} · tx {p.txHash.slice(0, 10)}…</span>
                    </span>
                    <span className="text-right">
                      <Amount value={p.amount} decimals={p.tokenDecimals} symbol={p.tokenSymbol} className="text-[15px] font-semibold text-ink" />
                      <span className={`block text-[12px] font-semibold ${p.status === 'paid' ? 'text-good' : 'text-warn'}`}>{p.status === 'paid' ? 'Paid' : 'Retrying'}</span>
                    </span>
                  </Link>
                ))
              )}
            </Card>
            {data.submissions.length > 0 && (
              <Card className="space-y-4 p-6">
                <h2 className="text-[22px]">Your Shorts</h2>
                <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-5">
                  {data.submissions.map((s) => (
                    <Link key={s.id} href={`/c/${s.campaignId}`} className="group space-y-1.5">
                      <div className="relative">
                        <ShortThumb videoId={s.videoId} className="transition-transform group-hover:scale-[1.02]" />
                        <span className="absolute bottom-1.5 left-1.5 rounded-full bg-ink/75 px-1.5 py-0.5 text-[11px] font-semibold text-white">▶ {compact(BigInt(s.views))}</span>
                      </div>
                      <p className="truncate text-[12.5px] font-semibold text-ink">{s.campaignTitle}</p>
                    </Link>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BadgeCard({ d }: { d: Dash }) {
  const a = d.badge?.attributes;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-card p-[1.5px] shadow-lift" style={{ background: 'conic-gradient(from 140deg, #ffb59e, #c9b8ff, #8f74ff, #7fd3ff, #ffb59e)' }}>
      <div className="relative space-y-8 overflow-hidden rounded-[27px] bg-[radial-gradient(120%_80%_at_0%_0%,#fff3ee_0%,#fff_45%,#f1ecff_100%)] p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-[radial-gradient(circle,#c9b8ff_0%,transparent_70%)] opacity-60" aria-hidden />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-[13px] font-semibold text-faint">Reachpot creator badge</p>
            <p className="mt-1 font-mono text-[13px] text-ink-2">{shortAddr(d.creator, 6, 6)}</p>
          </div>
          <Badge tone="accent"><BadgeCheck className="size-3.5" /> Soulbound</Badge>
        </div>
        {d.badge ? (
          <div className="relative grid grid-cols-3 gap-3">
            <Metric label="Campaigns" value={a?.campaigns ?? '0'} />
            <Metric label="Views" value={compact(BigInt(a?.views || '0'))} />
            <Metric label="Badge" value={`#${d.badge.item}`} />
            <div className="col-span-3 rounded-2xl bg-white/70 p-3 ring-1 ring-line">
              <p className="text-[12px] font-semibold text-faint">Earned</p>
              <p className="text-[18px] font-semibold tracking-[-0.02em] text-ink">{a?.earned || '—'}</p>
            </div>
          </div>
        ) : (
          <p className="relative text-[14px]">Your badge is minted with your first payout. It records campaigns, views and earnings on-chain and can&apos;t be transferred.</p>
        )}
        {d.badge && (
          <p className="relative text-[12px] text-faint">
            Nfts collection {d.badge.collection} · item {d.badge.item}
            {d.badge.mintTx && <> · <Copyable value={d.badge.mintTx} display={`mint ${d.badge.mintTx.slice(0, 8)}…`} className="text-faint" /></>}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/70 p-3 ring-1 ring-line">
      <p className="text-[12px] font-semibold text-faint">{label}</p>
      <p className="text-[20px] font-semibold tracking-[-0.03em] text-ink">{value}</p>
    </div>
  );
}

function CashOut({ d, onDone }: { d: Dash; onDone: () => void }) {
  const { deployment } = useDeployment();
  const wallet = useNativeWallet();
  const tradable = d.balances.filter((b) => deployment?.assets.find((a) => a.id === b.assetId)?.pool);
  const [assetId, setAssetId] = useState<number | undefined>(tradable[0]?.assetId);
  const [amount, setAmount] = useState('');
  const [quoted, setQuoted] = useState<{ key: string; out: bigint | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const bal = d.balances.find((b) => b.assetId === assetId) ?? tradable[0];
  const native = deployment?.native;

  let amountIn: bigint | null = null;
  try {
    amountIn = bal && amount ? parseUnitsStrict(amount, bal.decimals) : null;
  } catch {
    amountIn = null;
  }

  const quoteKey = bal && amountIn ? `${bal.assetId}:${amountIn}` : '';
  // A quote is only valid for the exact asset + amount it was fetched for (it sets the swap's minimum output).
  const quote = quoted && quoted.key === quoteKey ? quoted.out : null;

  useEffect(() => {
    if (!bal || !amountIn || amountIn <= 0n) return;
    const key = `${bal.assetId}:${amountIn}`;
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const [api, { assetKind, nativeKind }] = await Promise.all([getNativeApi(), import('@reachpot/core/native')]);
        const q = await api.call.assetConversionApi.quotePriceExactTokensForTokens(assetKind(bal.assetId), nativeKind, amountIn!, true);
        const v = (q as unknown as { isSome: boolean; unwrap: () => { toBigInt: () => bigint } });
        if (alive) setQuoted({ key, out: v.isSome ? v.unwrap().toBigInt() : null });
      } catch {
        if (alive) setQuoted({ key, out: null });
      }
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [bal, amountIn]);

  if (!bal || !native) return null;
  const tooMuch = amountIn !== null && amountIn > BigInt(bal.amount);

  async function swap() {
    if (!bal || !amountIn || !quote || !native) return;
    setBusy(true);
    try {
      const [api, { assetKind, nativeKind, sendNative }] = await Promise.all([getNativeApi(), import('@reachpot/core/native')]);
      const r = await sendNative(
        api,
        api.tx.assetConversion.swapExactTokensForTokens([assetKind(bal.assetId), nativeKind], amountIn, (quote * 97n) / 100n, wallet.account!.address, true),
        await wallet.signer(),
      );
      toast.success(`Swapped ${fmtUnits(amountIn, bal.decimals)} ${bal.symbol}`, { description: `≈ ${fmtUnits(quote, native.decimals)} ${native.symbol} · block #${r.blockNumber}` });
      setAmount('');
      onDone();
    } catch (e) {
      toast.error('Swap failed', { description: (e as Error).message.slice(0, 160) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[22px]">Cash out</h2>
          <p className="text-[14px]">Swap earnings to {native.symbol} on Portaldot&apos;s native DEX (AssetConversion).</p>
        </div>
        <div className="text-right">
          <p className="text-[12.5px] font-semibold text-faint">{native.symbol} balance</p>
          <Amount value={d.native.free} decimals={native.decimals} className="text-[18px] font-semibold text-ink" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {d.balances.map((b) => (
          <Panel key={b.assetId} className="p-4">
            <p className="text-[12.5px] font-semibold text-faint">{b.symbol}</p>
            <Amount value={b.amount} decimals={b.decimals} className="text-[20px] font-semibold tracking-[-0.03em] text-ink" />
          </Panel>
        ))}
      </div>
      <div className="grid items-end gap-3 sm:grid-cols-[140px_1fr_auto]">
        <Select value={bal.assetId} onChange={(e) => setAssetId(Number(e.target.value))}>
          {tradable.map((b) => (
            <option key={b.assetId} value={b.assetId}>{b.symbol}</option>
          ))}
        </Select>
        <div className="relative">
          <Input inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <button className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-sunken px-2.5 py-1 text-[12px] font-semibold text-ink-2 hover:bg-line" onClick={() => setAmount(fmtUnits(BigInt(bal.amount), bal.decimals, bal.decimals).replace(/,/g, ''))}>
            Max
          </button>
        </div>
        <Button size="lg" icon={<ArrowDownUp className="size-4" />} disabled={!quote || tooMuch || !amountIn} loading={busy} onClick={swap}>
          Swap
        </Button>
      </div>
      <p className="text-[13px] text-muted">
        {tooMuch ? <span className="text-bad">More than your balance</span> : quote ? <>You receive ≈ <span className="font-semibold text-ink">{fmtUnits(quote, native.decimals)} {native.symbol}</span> · 3% max slippage</> : 'Enter an amount to see a live quote.'}
      </p>
      <ButtonLink href="/campaigns" variant="ghost" size="sm" className="-ml-2" icon={<ArrowUpRight className="size-3.5" />}>
        Find more campaigns
      </ButtonLink>
    </Card>
  );
}
