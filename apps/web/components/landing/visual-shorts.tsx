'use client';

import { motion, useReducedMotion } from 'motion/react';
import { Avatar, CREATORS, LiveDot, PlayGlyph, SHORT_GRADIENTS, VideoStill } from './bits';
import { EASE_OUT, LiveCount } from './motion-bits';

const SHORTS = [
  { creator: 0, g: 0, views: 412_000 },
  { creator: 1, g: 1, views: 128_400 },
  { creator: 2, g: 2, views: 86_300 },
  { creator: 3, g: 5, views: 240_200 },
  { creator: 4, g: 3, views: 64_100 },
  { creator: 5, g: 6, views: 302_000 },
  { creator: 1, g: 4, views: 152_600 },
  { creator: 2, g: 7, views: 98_400 },
  { creator: 0, g: 2, views: 356_800 },
];
const TOTAL = SHORTS.reduce((a, b) => a + b.views, 0);
const COLUMNS = [SHORTS.slice(0, 3), SHORTS.slice(3, 6), SHORTS.slice(6, 9)];
const OFFSETS = ['-18%', '-4%', '-26%'];

function ShortCard({ short, index, play }: { short: (typeof SHORTS)[number]; index: number; play: boolean }) {
  const reduce = useReducedMotion();
  const shown = play || !!reduce;
  return (
    <motion.div
      initial={false}
      animate={shown ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.9, y: 16 }}
      transition={{ duration: 0.7, ease: EASE_OUT, delay: shown && !reduce ? 0.08 + index * 0.06 : 0 }}
      className="aspect-[9/16] w-full overflow-hidden rounded-[16px] shadow-soft ring-1 ring-black/5"
    >
      <VideoStill gradient={SHORT_GRADIENTS[short.g]} className="size-full">
        <div className="absolute left-2 top-2 flex items-center gap-1.5">
          <Avatar index={short.creator} className="size-5 text-[9px] ring-white/60" />
          <span className="truncate text-[10px] font-semibold text-white/95">@{CREATORS[short.creator].handle}</span>
        </div>
        <div className="absolute left-1/2 top-[42%] grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/25 text-white backdrop-blur-sm">
          <PlayGlyph className="ml-0.5 size-4" />
        </div>
        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-[3px] text-[11px] font-semibold text-white backdrop-blur-md">
          <span aria-hidden className="text-[8px]">▶</span>
          <LiveCount
            start={short.views}
            play={play}
            countIn
            delay={0.2 + index * 0.06}
            min={60}
            max={420}
            every={1.8}
            format="compact"
            className="tabular"
          />
        </span>
      </VideoStill>
    </motion.div>
  );
}

/** Step 2 — a drifting wall of Shorts with view counts rolling in. */
export function ShortsVisual({ play }: { play: boolean }) {
  const reduce = useReducedMotion();
  const drift = play && !reduce;
  return (
    <div className="relative h-full overflow-hidden">
      <div className="absolute inset-0 flex justify-center gap-3 px-[7%] [mask-image:linear-gradient(to_bottom,black_55%,transparent_96%)]">
        {COLUMNS.map((col, c) => (
          <motion.div
            key={c}
            className="flex min-w-0 flex-1 flex-col gap-3"
            style={{ marginTop: OFFSETS[c] }}
            initial={false}
            animate={drift ? { y: c % 2 ? [0, 26] : [0, -26] } : { y: 0 }}
            transition={drift ? { duration: 7 + c, ease: 'easeInOut', repeat: Infinity, repeatType: 'mirror' } : { duration: 0.6 }}
          >
            {col.map((short, r) => (
              <ShortCard key={r} short={short} index={c * 3 + r} play={play} />
            ))}
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={false}
        animate={play || reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
        transition={{ duration: 0.6, ease: EASE_OUT, delay: play && !reduce ? 0.6 : 0 }}
        className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2.5 whitespace-nowrap rounded-full bg-surface py-2 pl-3 pr-4 text-[13px] font-semibold text-ink shadow-lift ring-1 ring-line"
      >
        <LiveDot className="text-accent-2" />
        <span className="text-muted">9 Shorts</span>
        <span className="h-3.5 w-px bg-line-strong" />
        <span className="tabular">
          <LiveCount start={TOTAL} play={play} countIn delay={0.3} min={300} max={1400} every={1.2} format="int" /> views
        </span>
      </motion.div>
    </div>
  );
}
