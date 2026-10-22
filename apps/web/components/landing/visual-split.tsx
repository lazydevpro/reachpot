'use client';

import { animate, motion, useReducedMotion } from 'motion/react';
import { CircleCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Avatar, CREATORS, formatNumber } from './bits';
import { EASE_OUT } from './motion-bits';

/*
 * Real water-filling numbers: 10,000 rUSD pot, 30% per-creator cap.
 * maya's raw 41% is capped at 30%; the 11% excess is re-split over the others by views.
 */
const POT = 10_000;
const TRACK = 0.45; // the bar track spans 0..45% of the pot
const CAP = 0.3;
const ROWS = [
  { c: 0, views: '820K', raw: 0.41, final: 3000.0 },
  { c: 1, views: '410K', raw: 0.205, final: 2432.2 },
  { c: 2, views: '300K', raw: 0.15, final: 1779.66 },
  { c: 3, views: '280K', raw: 0.14, final: 1661.02 },
  { c: 4, views: '190K', raw: 0.095, final: 1127.12 },
];
const pct = (share: number) => `${(share / TRACK) * 100}%`;
const CAP_X = (CAP / TRACK) * 100;
const EXCESS_MID = ((CAP + (ROWS[0].raw - CAP) / 2) / TRACK) * 100;

/** Number that tweens from whatever it shows now to `value`. */
function Tween({ value, delay = 0, className }: { value: number; delay?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      shown.current = value;
      el.textContent = formatNumber(value, 'money');
      return;
    }
    const c = animate(shown.current, value, {
      duration: 0.9,
      delay,
      ease: EASE_OUT,
      onUpdate: (v) => {
        shown.current = v;
        el.textContent = formatNumber(v, 'money');
      },
    });
    return () => c.stop();
  }, [value, delay, reduce]);
  return (
    <span ref={ref} className={className}>
      {formatNumber(0, 'money')}
    </span>
  );
}

/** Step 3 — bars grow by views, the top creator hits the cap and the excess flows to everyone else. */
export function SplitVisual({ play }: { play: boolean }) {
  const reduce = useReducedMotion();
  // 0 = empty, 1 = raw split by views (top creator overshoots the cap), 2 = water-filled final split.
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [prevPlay, setPrevPlay] = useState(play);
  if (play !== prevPlay) {
    setPrevPlay(play);
    setStep(play ? 1 : 0);
  }

  useEffect(() => {
    if (!play || reduce) return;
    const t = setTimeout(() => setStep(2), 1700);
    return () => clearTimeout(t);
  }, [play, reduce]);

  const phase: 0 | 1 | 2 = reduce ? (play ? 2 : 0) : step;

  const ease = { ease: EASE_OUT };

  return (
    <div className="flex h-full items-center justify-center px-5">
      <div className="w-full max-w-[440px] rounded-[26px] bg-surface p-5 shadow-lift ring-1 ring-line sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[16px] font-semibold tracking-[-0.03em] text-ink">Pot split</p>
            <p className="mt-0.5 text-[13px] text-muted">10,000 rUSD · 30% cap per creator</p>
          </div>
          <span className="inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-full bg-accent-soft px-2.5 text-[12px] font-semibold text-accent">By views</span>
        </div>

        <div className="mt-10 grid grid-cols-[minmax(0,96px)_minmax(0,1fr)_74px] grid-rows-[repeat(5,44px)] items-center gap-x-3">
          {ROWS.map((r, i) => (
            <div key={`who-${r.c}`} className="col-start-1 flex min-w-0 items-center gap-2" style={{ gridRow: i + 1 }}>
              <Avatar index={r.c} className="size-6 text-[10px]" />
              <div className="min-w-0 leading-tight">
                <p className="truncate text-[12.5px] font-semibold tracking-[-0.02em] text-ink-2">{CREATORS[r.c].handle.split('.')[0]}</p>
                <p className="text-[11px] text-faint">{r.views} views</p>
              </div>
            </div>
          ))}

          {ROWS.map((r, i) => (
            <div key={`bar-${r.c}`} className="relative col-start-2 h-2.5 rounded-full bg-sunken" style={{ gridRow: i + 1 }}>
              <motion.div
                className="absolute inset-y-0 left-0 origin-left rounded-full bg-[linear-gradient(90deg,#a594ff,#7b5cff)]"
                style={{ width: pct(Math.min(r.raw, CAP)) }}
                initial={false}
                animate={{ scaleX: phase === 0 ? 0 : 1 }}
                transition={{ duration: i === 0 ? 0.6 : 0.8, delay: phase === 1 ? 0.1 + i * 0.07 : 0, ...ease }}
              />
              {i === 0 ? (
                <motion.div
                  className="absolute inset-y-0 origin-left rounded-r-full bg-[repeating-linear-gradient(135deg,#ff8a6b_0_4px,#ffb39f_4px_8px)]"
                  style={{ left: pct(CAP), width: pct(r.raw - CAP) }}
                  initial={false}
                  animate={{ scaleX: phase === 1 ? 1 : 0, opacity: phase === 1 ? 1 : 0.4 }}
                  transition={{ duration: phase === 1 ? 0.45 : 0.8, delay: phase === 1 ? 0.62 : 0.15, ...ease }}
                />
              ) : (
                <motion.div
                  className="absolute inset-y-0 origin-left rounded-r-full bg-[linear-gradient(90deg,#ffb39f,#ff8a6b)]"
                  style={{ left: `calc(${pct(r.raw)} - 5px)`, width: `calc(${pct(r.final / POT - r.raw)} + 5px)` }}
                  initial={false}
                  animate={{ scaleX: phase === 2 ? 1 : 0 }}
                  transition={{ duration: 0.7, delay: phase === 2 ? 0.55 + i * 0.07 : 0, ...ease }}
                />
              )}
            </div>
          ))}

          {/* cap line + excess particles, overlaid on the bar column */}
          <div className="pointer-events-none relative col-start-2 row-start-1 row-end-6 self-stretch">
            <div className="absolute -top-5 bottom-0 border-l-[1.5px] border-dashed border-accent-2/70" style={{ left: `${CAP_X}%` }}>
              <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full bg-[#fff0eb] px-2 py-0.5 text-[10.5px] font-semibold text-accent-2">
                30% cap
              </span>
            </div>
            {ROWS.slice(1).flatMap((r, k) =>
              [0, 1].map((d) => {
                const to = { left: `${(r.final / POT / TRACK) * 100}%`, top: `${((k + 1.5) / 5) * 100}%` };
                const from = { left: `${EXCESS_MID}%`, top: '10%' };
                const go = phase === 2 && !reduce;
                return (
                  <motion.span
                    key={`${r.c}-${d}`}
                    className="absolute -ml-1 -mt-1 size-2 rounded-full bg-accent-2 shadow-[0_0_0_3px_rgb(255_122_89/0.18)]"
                    initial={false}
                    animate={
                      go
                        ? { left: [from.left, to.left], top: [from.top, to.top], opacity: [0, 1, 1, 0], scale: [0.6, 1, 1, 0.4] }
                        : { left: from.left, top: from.top, opacity: 0 }
                    }
                    transition={go ? { duration: 0.85, delay: 0.1 + k * 0.08 + d * 0.12, ease: [0.45, 0, 0.2, 1] } : { duration: 0 }}
                  />
                );
              }),
            )}
          </div>

          {ROWS.map((r, i) => (
            <div key={`amt-${r.c}`} className="relative col-start-3 text-right leading-tight" style={{ gridRow: i + 1 }}>
              <Tween
                value={phase === 0 ? 0 : phase === 1 ? r.raw * POT : r.final}
                delay={phase === 2 ? (i === 0 ? 0.15 : 0.55 + i * 0.07) : 0.1 + i * 0.07}
                className="tabular text-[13px] font-semibold tracking-[-0.02em] text-ink"
              />
              {i === 0 && (
                <motion.span
                  className="absolute right-0 top-full whitespace-nowrap text-[10.5px] font-semibold text-accent-2"
                  initial={false}
                  animate={{ opacity: phase === 2 ? 1 : 0, y: phase === 2 ? 0 : -3 }}
                  transition={{ duration: 0.4, delay: phase === 2 ? 0.3 : 0 }}
                >
                  capped
                </motion.span>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-2">
            <motion.span
              initial={false}
              animate={{ scale: phase === 2 ? 1 : 0.6, opacity: phase === 2 ? 1 : 0.3 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20, delay: phase === 2 ? 1.2 : 0 }}
              className="inline-flex text-good"
            >
              <CircleCheck className="size-4" strokeWidth={2.4} />
            </motion.span>
            Budget fully spent
          </span>
          <span className="tabular text-[13px] font-semibold text-ink">10,000.00 rUSD</span>
        </div>
        <p className="mt-2 text-[12px] leading-snug text-faint">Reject a creator and their share goes to the others — never back to the brand.</p>
      </div>
    </div>
  );
}
