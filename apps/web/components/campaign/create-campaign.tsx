'use client';

import { useRouter } from 'next/navigation';
import { Check, Coins, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { erc20Abi, parseEventLogs, type Address } from 'viem';
import { fmtUnits, parseUnitsStrict, reachpotAbi } from '@reachpot/core';
import { Amount } from '@/components/common/bits';
import { EvmConnect } from '@/components/wallet/connect';
import { Button } from '@/components/ui/button';
import { Card, Panel } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { apiPost } from '@/lib/client/api';
import { useDeployment } from '@/lib/client/deployment';
import { publicClient, useEvmWallet } from '@/lib/client/evm-wallet';
import { publicConfig } from '@/lib/config';
import { rulesHash, type CampaignRules } from '@/lib/shared/protocol';
import { cn } from '@/lib/utils';

const DURATIONS =
  publicConfig.network.name === 'local'
    ? [{ label: '2 minutes', s: 120 }, { label: '5 minutes', s: 300 }, { label: '15 minutes', s: 900 }, { label: '1 hour', s: 3600 }]
    : [{ label: '15 minutes', s: 900 }, { label: '1 hour', s: 3600 }, { label: '24 hours', s: 86_400 }, { label: '3 days', s: 259_200 }, { label: '7 days', s: 604_800 }];

type Step = 'idle' | 'approve' | 'create' | 'register' | 'done';

export function CreateCampaign() {
  const router = useRouter();
  const { deployment } = useDeployment();
  const wallet = useEvmWallet();

  const [brandName, setBrandName] = useState('');
  const [title, setTitle] = useState('');
  const [brief, setBrief] = useState('');
  const [assetIdx, setAssetIdx] = useState(0);
  const [pool, setPool] = useState('10000');
  const [cap, setCap] = useState('4000');
  const [minViews, setMinViews] = useState('100');
  const [duration, setDuration] = useState(DURATIONS[1].s);
  const [step, setStep] = useState<Step>('idle');
  const [balance, setBalance] = useState<bigint | null>(null);

  const asset = deployment?.assets[assetIdx];
  const shownBalance = wallet.address ? balance : null;
  const parsed = useMemo(() => {
    if (!asset) return null;
    try {
      return { pool: parseUnitsStrict(pool, asset.decimals), cap: parseUnitsStrict(cap, asset.decimals), minViews: BigInt(minViews || '0') };
    } catch {
      return null;
    }
  }, [asset, pool, cap, minViews]);

  useEffect(() => {
    if (!asset || !wallet.address) return;
    publicClient.readContract({ address: asset.precompile, abi: erc20Abi, functionName: 'balanceOf', args: [wallet.address] }).then(setBalance).catch(() => setBalance(null));
  }, [asset, wallet.address, step]);

  const errors = {
    brandName: brandName.trim() ? undefined : 'Required',
    title: title.trim().length >= 3 ? undefined : 'At least 3 characters',
    brief: brief.trim().length >= 10 ? undefined : 'Tell creators what to post (10+ characters)',
    pool: !parsed ? 'Enter an amount' : parsed.pool <= 0n ? 'Must be more than 0' : shownBalance !== null && parsed.pool > shownBalance ? 'More than your balance' : undefined,
    cap: !parsed ? 'Enter an amount' : parsed.cap <= 0n ? 'Must be more than 0' : undefined,
  };
  const valid = Object.values(errors).every((e) => !e);
  const busy = step !== 'idle' && step !== 'done';

  async function submit() {
    if (!deployment || !asset || !parsed || !wallet.walletClient || !wallet.address) return;
    const account = wallet.walletClient.account ?? wallet.address;
    const rules: CampaignRules = { title, brief, brandName, platform: 'youtube-shorts', minViews: parsed.minViews.toString() };
    try {
      const allowance = await publicClient.readContract({ address: asset.precompile, abi: erc20Abi, functionName: 'allowance', args: [wallet.address, deployment.reachpot] });
      if (allowance < parsed.pool) {
        setStep('approve');
        const tx = await wallet.walletClient.writeContract({ account, chain: wallet.walletClient.chain, address: asset.precompile, abi: erc20Abi, functionName: 'approve', args: [deployment.reachpot, parsed.pool] });
        await publicClient.waitForTransactionReceipt({ hash: tx });
      }
      setStep('create');
      const now = Math.floor(Date.now() / 1000);
      const { request } = await publicClient.simulateContract({
        account: wallet.address as Address,
        address: deployment.reachpot,
        abi: reachpotAbi,
        functionName: 'createCampaign',
        args: [
          {
            token: asset.precompile,
            pool: parsed.pool,
            start: BigInt(now - 5),
            end: BigInt(now + duration),
            measurementDelay: deployment.windows.minMeasurementDelay,
            capPerCreator: parsed.cap,
            minViews: parsed.minViews,
            rulesHash: rulesHash(rules),
          },
        ],
      });
      const tx = await wallet.walletClient.writeContract({ ...request, account, chain: wallet.walletClient.chain });
      const rcpt = await publicClient.waitForTransactionReceipt({ hash: tx });
      const id = Number(parseEventLogs({ abi: reachpotAbi, logs: rcpt.logs, eventName: 'CampaignCreated' })[0].args.id);
      setStep('register');
      await apiPost('/api/campaigns', { campaignId: id, createTx: tx, rules });
      setStep('done');
      toast.success('Campaign is live', { description: `${fmtUnits(parsed.pool, asset.decimals)} ${asset.symbol} escrowed on-chain` });
      router.push(`/c/${id}`);
    } catch (e) {
      setStep('idle');
      toast.error('Could not create the campaign', { description: ((e as { shortMessage?: string }).shortMessage ?? (e as Error).message).slice(0, 200) });
    }
  }

  return (
    <div className="mx-auto grid max-w-[1200px] gap-10 px-5 pb-10 pt-32 sm:px-8 lg:grid-cols-[1fr_400px]">
      <div className="space-y-8">
        <div className="space-y-3">
          <h1 className="text-[clamp(34px,4.2vw,48px)] leading-[1.04]">Start a campaign</h1>
          <p className="max-w-xl text-[17px] leading-relaxed">
            Lock a pot in any Portaldot token. When the window closes it splits by views, capped per creator, and pays out on-chain. You can never claw back a live pot,
            and anything left unallocated comes back to you.
          </p>
        </div>

        <Card className="space-y-6 p-6 sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Brand" error={brandName ? errors.brandName : undefined}>
              <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Nova Labs" maxLength={40} />
            </Field>
            <Field label="Campaign title" error={title ? errors.title : undefined}>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Launch week Shorts" maxLength={80} />
            </Field>
          </div>
          <Field label="What should creators post?" hint="Shown to every creator. Its hash is pinned on-chain, so it can't change later." error={brief ? errors.brief : undefined}>
            <Textarea value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="A Short showing your favourite feature. Mention @novalabs, keep it under 60s." maxLength={1200} />
          </Field>
        </Card>

        <Card className="space-y-6 p-6 sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Token" hint={asset ? `Native asset #${asset.id} · ERC-20 ${asset.precompile.slice(0, 10)}…` : undefined}>
              <Select value={assetIdx} onChange={(e) => setAssetIdx(Number(e.target.value))}>
                {deployment?.assets.map((a, i) => (
                  <option key={a.id} value={i}>
                    {a.symbol} — {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Pot"
              error={pool ? errors.pool : undefined}
              hint={shownBalance !== null && asset ? <>Balance <Amount value={shownBalance} decimals={asset.decimals} symbol={asset.symbol} /></> : 'Connect a wallet to see your balance'}
            >
              <Input inputMode="decimal" value={pool} onChange={(e) => setPool(e.target.value)} />
            </Field>
            <Field label="Cap per creator" hint="No creator can take more than this; the excess re-splits among the rest." error={cap ? errors.cap : undefined}>
              <Input inputMode="decimal" value={cap} onChange={(e) => setCap(e.target.value)} />
            </Field>
            <Field label="Minimum views per Short" hint="Shorts below this don't count.">
              <Input inputMode="numeric" value={minViews} onChange={(e) => setMinViews(e.target.value.replace(/\D/g, ''))} />
            </Field>
          </div>
          <Field label="Submission window">
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d.s}
                  type="button"
                  onClick={() => setDuration(d.s)}
                  className={cn(
                    'h-10 rounded-full px-4 text-[14px] font-semibold tracking-[-0.01em] ring-1 transition-colors',
                    duration === d.s ? 'bg-ink text-white ring-ink' : 'bg-surface text-ink-2 ring-line-strong hover:ring-ink/30',
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </Field>
        </Card>
      </div>

      <aside className="lg:pt-[148px]">
        <div className="sticky top-24 space-y-4">
          <Card className="space-y-6 p-6">
            <div>
              <p className="text-[13px] font-semibold text-faint">You lock</p>
              <p className="text-[34px] font-semibold tracking-[-0.04em] text-ink">
                {parsed && asset ? <Amount value={parsed.pool} decimals={asset.decimals} symbol={asset.symbol} /> : '—'}
              </p>
            </div>
            <Panel className="space-y-3 p-4 text-[14px]">
              <Row icon={<LockKeyhole className="size-4" />} text="Escrowed in Reachpot.sol on Portaldot; you can't withdraw a live pot." />
              <Row icon={<Coins className="size-4" />} text={`Split by views, max ${parsed && asset ? fmtUnits(parsed.cap, asset.decimals) : '—'} ${asset?.symbol ?? ''} per creator.`} />
              <Row icon={<ShieldCheck className="size-4" />} text={`Snapshot stored on-chain; ${deployment ? Math.round(deployment.windows.disputeWindow / 60) : '—'} min dispute window before payouts.`} />
            </Panel>
            <Steps step={step} />
            {wallet.address ? (
              <Button size="lg" className="w-full" chevron disabled={!valid || !deployment} loading={busy} onClick={submit}>
                {busy ? (step === 'approve' ? 'Approving…' : step === 'create' ? 'Locking the pot…' : 'Publishing…') : 'Lock pot & launch'}
              </Button>
            ) : (
              <div className="[&_button]:w-full">
                <EvmConnect size="lg" />
              </div>
            )}
          </Card>
          <p className="px-2 text-[12.5px] text-faint">Approvals go through the token&apos;s native-asset ERC-20 precompile, so there&apos;s no wrapping and no bridge.</p>
        </div>
      </aside>
    </div>
  );
}

function Row({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <p className="flex gap-2.5 text-muted">
      <span className="mt-0.5 text-ink-2">{icon}</span>
      {text}
    </p>
  );
}

function Steps({ step }: { step: Step }) {
  const order: Step[] = ['approve', 'create', 'register'];
  const labels = { approve: 'Approve token', create: 'Lock pot on-chain', register: 'Publish rules' } as const;
  const idx = step === 'done' ? 3 : order.indexOf(step);
  return (
    <ol className="space-y-2">
      {order.map((s, i) => (
        <li key={s} className="flex items-center gap-2.5 text-[13.5px]">
          <span className={cn('grid size-5 place-items-center rounded-full text-[11px] font-bold', i < idx ? 'bg-good text-white' : i === idx ? 'bg-ink text-white' : 'bg-sunken text-faint')}>
            {i < idx ? <Check className="size-3" /> : i + 1}
          </span>
          <span className={i <= idx ? 'text-ink' : 'text-faint'}>{labels[s as keyof typeof labels]}</span>
        </li>
      ))}
    </ol>
  );
}
