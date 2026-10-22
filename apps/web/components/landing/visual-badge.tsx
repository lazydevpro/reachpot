'use client';

import { motion, useReducedMotion } from 'motion/react';
import { Lock, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { LogoMark } from '@/components/brand/logo';
import { cn } from '@/lib/utils';
import { Avatar } from './bits';
import { CountUp, EASE_OUT } from './motion-bits';
import './landing.css';

function Attr({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-[14px] bg-white/70 px-3 py-2.5 shadow-[inset_0_1px_0_rgb(255_255_255/0.8)] ring-1 ring-white/80">
      <p className="text-[10.5px] font-semibold tracking-[0.01em] text-muted">{label}</p>
      <p className="mt-0.5 flex items-baseline gap-1 text-[16px] font-semibold tracking-[-0.03em] text-ink">{children}</p>
    </div>
  );
}

function Toast({ show, delay, className, children }: { show: boolean; delay: number; className?: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={false}
      animate={show ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 10, scale: 0.92 }}
      transition={{ duration: 0.55, ease: EASE_OUT, delay: show && !reduce ? delay : 0 }}
      className={cn(
        'absolute z-10 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-surface py-1.5 pl-1.5 pr-3 text-[12.5px] font-semibold text-ink shadow-lift ring-1 ring-line',
        className,
      )}
    >
      <span className="grid size-5 place-items-center rounded-full bg-good-soft text-good">
        <Plus className="size-3" strokeWidth={3} />
      </span>
      {children}
    </motion.div>
  );
}

/** Step 6 — a holographic, soulbound creator badge whose attributes update with each payout. */
export function BadgeVisual({ play }: { play: boolean }) {
  const reduce = useReducedMotion();
  const on = play || !!reduce;
  const float = play && !reduce;

  return (
    <div className="flex h-full items-center justify-center">
      <div className="relative">
        <Toast
          show={on}
          delay={1.1}
          className="-top-12 left-1/2 -translate-x-1/2 min-[900px]:left-auto min-[900px]:right-[calc(100%-22px)] min-[900px]:top-[57%] min-[900px]:translate-x-0"
        >
          1 campaign
        </Toast>
        <Toast
          show={on}
          delay={1.35}
          className="-bottom-12 left-1/2 -translate-x-1/2 min-[900px]:bottom-auto min-[900px]:left-[calc(100%-22px)] min-[900px]:top-[80%] min-[900px]:translate-x-0"
        >
          182.40 rUSD earned
        </Toast>

        <motion.div
          initial={false}
          animate={on ? { opacity: 1, y: 0, rotateX: 0 } : { opacity: 0, y: 40, rotateX: 18 }}
          transition={{ duration: 0.9, ease: EASE_OUT }}
          style={{ transformPerspective: 1100 }}
        >
          <motion.div
            initial={false}
            animate={float ? { rotateY: [-9, 9], rotateX: [5, -4] } : { rotateY: -4, rotateX: 2 }}
            transition={float ? { duration: 6, ease: 'easeInOut', repeat: Infinity, repeatType: 'mirror' } : { duration: 0.6 }}
            style={{ transformPerspective: 1100 }}
            className="relative h-[352px] w-[262px] overflow-hidden rounded-[26px] shadow-[0_40px_70px_-30px_rgb(91_51_224/0.45),0_16px_30px_-16px_rgb(37_32_45/0.3)] ring-1 ring-white/70"
          >
            <div className="absolute inset-0 rp-foil" />
            <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgb(255_255_255/0.75),rgb(255_255_255/0.15)_60%,transparent)]" />
            <div className="absolute inset-0 opacity-70 rp-grain" />
            <div className="absolute inset-y-0 -left-1/2 w-[200%] rp-sheen" />

            <div className="relative flex h-full flex-col p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[12px] font-semibold tracking-[-0.01em] text-ink">
                  <LogoMark className="size-6 rounded-[8px]" />
                  Creator badge
                </span>
                <span className="font-mono text-[11px] font-medium text-muted">#0427</span>
              </div>

              <div className="mt-4 flex flex-col items-center">
                <Avatar index={0} className="size-[62px] text-[24px] ring-4 ring-white/80 shadow-soft" />
                <p className="mt-2.5 text-[16px] font-semibold tracking-[-0.03em] text-ink">@maya.makes</p>
                <p className="text-[11.5px] font-semibold text-muted">Reachpot creator since 2026</p>
              </div>

              <div className="mt-auto grid grid-cols-2 gap-2">
                <Attr label="Campaigns">
                  <CountUp from={6} to={7} play={play} delay={1.2} duration={0.4} className="tabular" />
                </Attr>
                <Attr label="Views">
                  <CountUp to={1_200_000} play={play} delay={0.3} duration={1.6} format="compact" className="tabular" />
                </Attr>
                <Attr label="Earned">
                  <CountUp from={2757.6} to={2940} play={play} delay={1.4} duration={1} className="tabular" />
                  <span className="text-[11px] font-semibold text-muted">rUSD</span>
                </Attr>
                <Attr label="Transfer">
                  <span className="inline-flex items-center gap-1">
                    <Lock className="size-3.5 shrink-0 text-accent" strokeWidth={2.6} />
                    Soulbound
                  </span>
                </Attr>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
