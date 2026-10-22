'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, ClipboardCopy, PenLine } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { CampaignStatus } from '@reachpot/core';
import { Amount, Countdown, ShortThumb, StatusPill } from '@/components/common/bits';
import { NativeConnect } from '@/components/wallet/connect';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card, Panel } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/field';
import { apiPost, usePoll } from '@/lib/client/api';
import { useDeployment } from '@/lib/client/deployment';
import { useNativeWallet } from '@/lib/client/native-wallet';
import { bindingCode, parseVideoId, submissionMessage, type CampaignDetail, type SubmissionView } from '@/lib/shared/protocol';
import { PayoutSetup, usePayoutMapping } from './payout-setup';

export function SubmitShort() {
  const { id } = useParams<{ id: string }>();
  const { deployment } = useDeployment();
  const { data: c } = usePoll<CampaignDetail>(`/api/campaigns/${id}`, 10_000);
  const wallet = useNativeWallet();
  const mapping = usePayoutMapping();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<SubmissionView | null>(null);

  const videoId = parseVideoId(url);
  const code = deployment && wallet.account ? bindingCode(deployment.reachpot, Number(id), wallet.account.address) : null;
  const mock = deployment?.viewsSource === 'mock';

  async function submit() {
    if (!deployment || !wallet.account || !videoId) return;
    setBusy(true);
    try {
      const message = submissionMessage({ contract: deployment.reachpot, campaignId: Number(id), videoId, creator: wallet.account.address });
      const signature = await wallet.signMessage(message);
      const sub = await apiPost<SubmissionView>('/api/submissions', { campaignId: Number(id), videoUrl: url, creator: wallet.account.address, signature });
      setDone(sub);
      toast.success(sub.status === 'verified' ? 'Short submitted and verified' : 'Short submitted', {
        description: sub.status === 'verified' ? 'Its views now count toward your share of the pot.' : 'We will verify the code in its description shortly.',
      });
    } catch (e) {
      toast.error('Submission failed', { description: (e as Error).message.slice(0, 200) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[760px] px-5 pb-10 pt-28 sm:px-8">
      <Link href={`/c/${id}`} className="mb-6 inline-flex items-center gap-1.5 text-[14px] font-semibold text-faint hover:text-ink">
        <ArrowLeft className="size-4" /> Back to campaign
      </Link>
      <div className="mb-8 space-y-3">
        <h1 className="text-[clamp(32px,4vw,44px)] leading-[1.05]">Submit your Short</h1>
        {c && (
          <div className="flex flex-wrap items-center gap-2 text-[15px]">
            <StatusPill status={c.status} />
            <span className="font-semibold text-ink">{c.title}</span>
            <span className="text-faint">·</span>
            <Amount value={c.pool} decimals={c.token.decimals} symbol={c.token.symbol} className="font-semibold text-ink" />
            <span className="text-faint">pot</span>
            {c.status === CampaignStatus.Open && (
              <span className="text-muted">
                · closes in <Countdown to={c.end} className="font-semibold text-ink" />
              </span>
            )}
          </div>
        )}
      </div>

      {done ? (
        <Card className="grid gap-6 p-6 sm:grid-cols-[120px_1fr] sm:p-8">
          <ShortThumb videoId={done.videoId} />
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-[20px] font-semibold text-ink">
              <CheckCircle2 className="size-5 text-good" /> You&apos;re in
            </p>
            <p>
              {done.title ?? done.videoId} is {done.status === 'verified' ? 'verified' : 'waiting for verification'}. When the window closes the pot splits by views, and your share is
              paid to this Portaldot account automatically.
            </p>
            <div className="flex gap-2">
              <ButtonLink href={`/c/${id}`} chevron>See live standings</ButtonLink>
              <Button variant="secondary" onClick={() => (setDone(null), setUrl(''))}>Submit another</Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="space-y-6 p-6 sm:p-8">
          <Step n={1} title="Connect your Portaldot wallet">
            <NativeConnect />
          </Step>
          {wallet.account && (
            <>
              <Step n={2} title="Enable payouts">
                <PayoutSetup mapping={mapping} />
              </Step>
              <Step n={3} title="Paste your Short">
                <Field label="YouTube Shorts link" error={url && !videoId ? 'Paste a youtube.com/shorts/… link' : undefined}>
                  <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/shorts/…" />
                </Field>
                {code && (
                  <Panel className="mt-4 space-y-2 p-4">
                    <p className="text-[14px] font-semibold text-ink">{mock ? 'Demo mode: views are simulated' : 'Prove it’s your channel'}</p>
                    <p className="text-[13.5px] text-muted">
                      {mock ? 'On the local chain the view source is simulated. On testnet, add this code to the Short’s description: ' : 'Add this code anywhere in the Short’s description so we can verify it’s yours: '}
                      <button
                        className="inline-flex items-center gap-1 rounded-md bg-surface px-1.5 py-0.5 font-mono text-[13px] font-semibold text-ink ring-1 ring-line"
                        onClick={() => (navigator.clipboard.writeText(code), toast.success('Code copied'))}
                      >
                        {code} <ClipboardCopy className="size-3" />
                      </button>
                    </p>
                  </Panel>
                )}
              </Step>
              <Button
                size="lg"
                className="w-full"
                icon={<PenLine className="size-4" />}
                disabled={!videoId || !mapping.mapped || c?.status !== CampaignStatus.Open}
                loading={busy}
                onClick={submit}
              >
                {c && c.status !== CampaignStatus.Open ? 'Campaign is closed' : 'Sign & submit'}
              </Button>
              <p className="text-center text-[12.5px] text-faint">Signing proves this Short and its payout belong to your account. It costs no gas.</p>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <p className="flex items-center gap-2.5 text-[15px] font-semibold text-ink">
        <span className="grid size-6 place-items-center rounded-full bg-ink text-[12px] font-bold text-white">{n}</span>
        {title}
      </p>
      {children}
    </section>
  );
}
