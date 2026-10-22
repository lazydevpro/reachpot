'use client';

import { motion, useReducedMotion } from 'motion/react';
import { CircleCheck, Database, Fingerprint, GitMerge, ShieldCheck, Timer } from 'lucide-react';
import type { ReactNode } from 'react';
import { CREATORS } from './bits';
import { Countdown, EASE_OUT, Scramble } from './motion-bits';

const LEAVES = [
  { x: 38, c: 0 },
  { x: 106, c: 1 },
  { x: 174, c: 2 },
  { x: 242, c: 3 },
];
const MIDS = [72, 208];
const ROOT = 140;
const Y = { leaf: 92, mid: 54, root: 16 };

/** A tiny Merkle tree that draws itself leaf → root. */
function MerkleTree({ play }: { play: boolean }) {
  const reduce = useReducedMotion();
  const on = play || !!reduce;
  const t = (d: number) => (on && !reduce ? d : 0);
  const pop = (d: number) => ({
    initial: false as const,
    animate: on ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 },
    transition: { type: 'spring' as const, stiffness: 380, damping: 22, delay: t(d) },
    style: { transformBox: 'fill-box' as const, transformOrigin: 'center' },
  });
  const draw = (d: number) => ({
    initial: false as const,
    animate: { pathLength: on ? 1 : 0, opacity: on ? 1 : 0 },
    transition: { duration: 0.45, ease: EASE_OUT, delay: t(d) },
  });

  return (
    <svg viewBox="0 0 280 110" className="h-auto w-full max-w-[300px]" fill="none">
      {LEAVES.map((l, i) => {
        const mid = MIDS[i < 2 ? 0 : 1];
        return <motion.path key={`e${i}`} d={`M${l.x} ${Y.leaf - 10}L${mid} ${Y.mid + 8}`} stroke="#d6d2dd" strokeWidth={1.5} strokeLinecap="round" {...draw(0.35 + i * 0.05)} />;
      })}
      {MIDS.map((m, i) => (
        <motion.path key={`r${i}`} d={`M${m} ${Y.mid - 8}L${ROOT} ${Y.root + 9}`} stroke="#c4b8ff" strokeWidth={1.5} strokeLinecap="round" {...draw(0.95 + i * 0.05)} />
      ))}
      {LEAVES.map((l, i) => (
        <motion.g key={`l${i}`} {...pop(0.05 + i * 0.07)}>
          <circle cx={l.x} cy={Y.leaf} r={10} fill="#f1eef4" stroke="rgb(37 32 45 / 0.08)" />
          <text x={l.x} y={Y.leaf + 3.6} textAnchor="middle" fontSize="10" fontWeight="700" fill="#5f5968">
            {CREATORS[l.c].initial}
          </text>
        </motion.g>
      ))}
      {MIDS.map((m, i) => (
        <motion.rect key={`m${i}`} x={m - 9} y={Y.mid - 8} width={18} height={16} rx={5} fill="#ffffff" stroke="rgb(37 32 45 / 0.14)" {...pop(0.75 + i * 0.06)} />
      ))}
      <motion.g {...pop(1.3)}>
        <rect x={ROOT - 26} y={Y.root - 10} width={52} height={20} rx={10} fill="#7b5cff" />
        <text x={ROOT} y={Y.root + 3.6} textAnchor="middle" fontSize="10" fontWeight="700" fill="#ffffff" letterSpacing="0.02em">
          ROOT
        </text>
      </motion.g>
    </svg>
  );
}

function Item({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[14px] bg-sunken/70 px-3.5 py-2.5 ring-1 ring-line">
      <span className="flex shrink-0 items-center gap-2 text-[12.5px] font-semibold text-muted">
        <span className="text-faint">{icon}</span>
        {label}
      </span>
      <span className="min-w-0 truncate text-right text-[13px] font-semibold tracking-[-0.01em] text-ink-2">{children}</span>
    </div>
  );
}

/** Step 4 — the snapshot is on-chain, the tree recomputes, the root matches. */
export function VerifyVisual({ play }: { play: boolean }) {
  const reduce = useReducedMotion();
  const on = play || !!reduce;
  return (
    <div className="flex h-full items-center justify-center px-5">
      <div className="w-full max-w-[430px] rounded-[26px] bg-surface p-5 shadow-lift ring-1 ring-line sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-[13px] bg-accent-soft text-accent">
            <ShieldCheck className="size-5" strokeWidth={2.2} />
          </span>
          <div>
            <p className="text-[16px] font-semibold tracking-[-0.03em] text-ink">Snapshot verified</p>
            <p className="text-[13px] text-muted">Nova Launch · 5 creators · 2.0M views</p>
          </div>
        </div>

        <div className="mt-5 flex justify-center rounded-[18px] bg-[radial-gradient(circle_at_50%_0%,#f4f1ff,transparent_70%)] px-2 pt-3">
          <MerkleTree play={play} />
        </div>

        <div className="mt-4 space-y-2">
          <Item icon={<Database className="size-3.5" />} label="TransactionStorage">
            block #18,204
          </Item>
          <Item icon={<Fingerprint className="size-3.5" />} label="blake2-256">
            <Scramble text="0x9f3c…e1a2" play={play} delay={1.1} className="font-mono text-[12.5px]" />
          </Item>
          <Item icon={<GitMerge className="size-3.5" />} label="Merkle root">
            <Scramble text="0x67b1…5d95" play={play} delay={1.35} className="font-mono text-[12.5px]" />
          </Item>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <motion.span
            initial={false}
            animate={on ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22, delay: on && !reduce ? 2.3 : 0 }}
            className="inline-flex h-7 items-center gap-1 rounded-full bg-good-soft px-2.5 text-[12px] font-semibold text-good"
          >
            Recomputed
            <CircleCheck className="size-3.5" strokeWidth={2.6} />
            matches
          </motion.span>
          <span className="inline-flex h-7 items-center gap-1 rounded-full bg-warn-soft px-2.5 text-[12px] font-semibold text-warn">
            <Timer className="size-3.5" strokeWidth={2.4} />
            Dispute window
            <Countdown seconds={23 * 3600 + 59 * 60 + 41} play={play} className="tabular" />
          </span>
        </div>
      </div>
    </div>
  );
}
