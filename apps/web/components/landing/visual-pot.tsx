'use client';

import { motion, useReducedMotion } from 'motion/react';
import { CalendarRange, Lock, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { TokenChip, type Token } from './bits';
import { CountUp, EASE_OUT } from './motion-bits';

const CHIPS: { token: Token; left: string; rest: number; drop: number }[] = [
  { token: 'NOVA', left: '4%', rest: -7, drop: 0.12 },
  { token: 'rUSD', left: '36%', rest: 2, drop: 0 },
  { token: 'tPOT', left: '66%', rest: 8, drop: 0.24 },
];

/** Step 1 — token chips drop onto an escrowed pot card while the locked amount counts up. */
export function PotVisual({ play }: { play: boolean }) {
  const reduce = useReducedMotion();
  const shown = play || !!reduce;

  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="relative w-full max-w-[380px] pt-12">
        {/* chips resting on the card's top edge */}
        <div className="absolute inset-x-0 top-0 z-10 h-12">
          {CHIPS.map((c) => (
            <motion.div
              key={c.token}
              className="absolute top-[14px]"
              style={{ left: c.left }}
              initial={false}
              animate={shown ? { y: 0, opacity: 1, rotate: c.rest } : { y: -150, opacity: 0, rotate: c.rest * -2 }}
              transition={
                shown && !reduce
                  ? { type: 'spring', stiffness: 260, damping: 17, mass: 0.9, delay: 0.15 + c.drop }
                  : { duration: 0.2 }
              }
            >
              <TokenChip token={c.token} />
            </motion.div>
          ))}
        </div>

        <div className="relative rounded-[26px] bg-surface p-6 shadow-lift ring-1 ring-line">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold tracking-[-0.01em] text-faint">Nova Launch pot</span>
            <motion.span
              className="inline-flex h-6 items-center gap-1 rounded-full bg-good-soft px-2.5 text-[12px] font-semibold text-good"
              initial={false}
              animate={shown ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.4, ease: EASE_OUT, delay: shown && !reduce ? 1.35 : 0 }}
            >
              <Lock className="size-3" strokeWidth={2.6} />
              Escrowed
            </motion.span>
          </div>

          <div className="mt-4 flex items-baseline gap-2">
            <CountUp
              to={10000}
              play={play}
              duration={1.5}
              delay={0.35}
              className="tabular text-[50px] font-semibold leading-none tracking-[-0.045em] text-ink"
            />
            <span className="text-[20px] font-semibold tracking-[-0.03em] text-muted">rUSD</span>
          </div>
          <p className="mt-2.5 flex items-center gap-1.5 text-[14px] text-muted">
            <ShieldCheck className="size-4 text-good" strokeWidth={2.2} />
            locked · escrowed on-chain
          </p>

          <div className="mt-5 space-y-2.5 border-t border-line pt-4 text-[13.5px]">
            <Row label="Window" value="Oct 01 → Oct 15" icon={<CalendarRange className="size-3.5" />} />
            <Row label="Per-creator cap" value="30% of pot" />
            <Row label="Brand can withdraw" value="Never" tone="good" />
          </div>
        </div>

        <p className="mt-4 text-center text-[13px] font-semibold tracking-[-0.01em] text-faint">Any Portaldot native asset works</p>
      </div>
    </div>
  );
}

function Row({ label, value, icon, tone }: { label: string; value: string; icon?: ReactNode; tone?: 'good' }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-muted">
        {icon}
        {label}
      </span>
      <span className={tone === 'good' ? 'font-semibold text-good' : 'font-semibold text-ink-2'}>{value}</span>
    </div>
  );
}
