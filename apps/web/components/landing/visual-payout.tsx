'use client';

import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Check, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Avatar, CREATORS, TokenCoin } from './bits';
import { CountUp, EASE_OUT } from './motion-bits';

const RECEIPTS = [
  { c: 0, amount: '3,000.00', tx: '0x4be1…9a0c' },
  { c: 1, amount: '2,432.20', tx: '0x1d7a…c3f2' },
  { c: 2, amount: '1,779.66', tx: '0xa9e0…41bb' },
  { c: 3, amount: '1,661.02', tx: '0x72cf…0e18' },
];

/** Step 5 — receipts settle one by one, then a one-tap swap to POT on the native DEX. */
export function PayoutVisual({ play }: { play: boolean }) {
  const reduce = useReducedMotion();
  const [ticked, setTicked] = useState(0);
  const [prevPlay, setPrevPlay] = useState(play);
  if (play !== prevPlay) {
    setPrevPlay(play);
    setTicked(0);
  }

  useEffect(() => {
    if (!play || reduce) return;
    const timers = RECEIPTS.map((_, i) => setTimeout(() => setTicked(i + 1), 450 + i * 330));
    return () => timers.forEach(clearTimeout);
  }, [play, reduce]);

  const settled = reduce ? RECEIPTS.length : ticked;
  const allDone = settled === RECEIPTS.length;
  const showSwap = play || !!reduce;

  return (
    <div className="flex h-full items-center justify-center px-5">
      <div className="w-full max-w-[420px]">
        <div className="rounded-[26px] bg-surface p-5 shadow-lift ring-1 ring-line">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[16px] font-semibold tracking-[-0.03em] text-ink">Payouts</p>
              <p className="text-[13px] text-muted">Nova Launch · paid by keeper</p>
            </div>
            <motion.span
              initial={false}
              animate={{ opacity: allDone ? 1 : 0.45 }}
              className={
                allDone
                  ? 'inline-flex h-6 items-center gap-1 rounded-full bg-good-soft px-2.5 text-[12px] font-semibold text-good'
                  : 'inline-flex h-6 items-center gap-1 rounded-full bg-sunken px-2.5 text-[12px] font-semibold text-muted'
              }
            >
              {allDone ? 'All settled' : 'Settling…'}
            </motion.span>
          </div>

          <ul className="mt-4 divide-y divide-line">
            {RECEIPTS.map((r, i) => {
              const done = i < settled;
              return (
                <li key={r.c} className="flex items-center gap-3 py-2.5">
                  <Avatar index={r.c} className="size-8 text-[12px]" />
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-[13.5px] font-semibold tracking-[-0.02em] text-ink-2">@{CREATORS[r.c].handle}</p>
                    <p className="font-mono text-[11.5px] text-faint">{r.tx}</p>
                  </div>
                  <p className="tabular text-right text-[13.5px] font-semibold tracking-[-0.02em] text-ink">
                    +{r.amount} <span className="text-[11px] font-semibold text-faint">rUSD</span>
                  </p>
                  <span className="grid size-6 shrink-0 place-items-center">
                    {done ? (
                      <motion.span
                        key="ok"
                        initial={reduce ? false : { scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                        className="grid size-6 place-items-center rounded-full bg-good text-white"
                      >
                        <Check className="size-3.5" strokeWidth={3} />
                      </motion.span>
                    ) : (
                      <LoaderCircle className="size-4 text-faint motion-safe:animate-spin" />
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <motion.div
          initial={false}
          animate={showSwap ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
          transition={{ duration: 0.7, ease: EASE_OUT, delay: showSwap && !reduce ? 1.9 : 0 }}
          className="relative -mt-3 ml-auto w-full rounded-[22px] bg-surface p-4 shadow-lift ring-1 ring-line sm:w-[92%]"
        >
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-semibold tracking-[-0.02em] text-ink">Cash out</p>
            <span className="inline-flex h-6 items-center rounded-full bg-accent-soft px-2.5 text-[11.5px] font-semibold text-accent">Native DEX</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[14px] bg-sunken/70 px-2.5 py-2 ring-1 ring-line">
              <TokenCoin token="rUSD" className="size-7 text-[13px]" />
              <span className="min-w-0 leading-tight">
                <span className="tabular block text-[15px] font-semibold tracking-[-0.03em] text-ink">182.40</span>
                <span className="block text-[11px] font-semibold text-faint">rUSD</span>
              </span>
            </div>
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-white">
              <ArrowRight className="size-3.5" strokeWidth={2.6} />
            </span>
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[14px] bg-sunken/70 px-2.5 py-2 ring-1 ring-line">
              <TokenCoin token="tPOT" className="size-7 text-[13px]" />
              <span className="min-w-0 leading-tight">
                <CountUp
                  to={1204.6}
                  play={play}
                  delay={2.3}
                  duration={1.1}
                  format="fixed1"
                  className="tabular block text-[15px] font-semibold tracking-[-0.03em] text-ink"
                />
                <span className="block text-[11px] font-semibold text-faint">tPOT</span>
              </span>
            </div>
          </div>
          <p className="mt-2.5 text-[11.5px] font-semibold text-faint">AssetConversion pool · 1 rUSD ≈ 6.604 tPOT · one tap</p>
        </motion.div>
      </div>
    </div>
  );
}
