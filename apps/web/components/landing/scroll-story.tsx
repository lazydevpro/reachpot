'use client';

/*
 * The krafa-style scroll story. The hero is frame 0 of a tall section with a sticky two-column stage:
 * the left column shows one headline at a time (scroll-linked slide + crossfade), the right column is a
 * single rounded card whose contents switch per step (state-driven crossfade, each visual plays its own
 * choreography). Below 900px it collapses into a plain vertical sequence: headline, then its visual.
 *
 * One DOM serves both layouts: each frame is a wrapper that is `display: contents` on desktop, so its
 * copy and visual can be placed into the shared grid cells, and a normal flex column on mobile.
 */
import {
  MotionConfig,
  easeIn,
  easeOut,
  motion,
  useInView,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState, type ComponentType } from 'react';
import { ButtonLink } from '@/components/ui/button';
import { Eyebrow } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import './landing.css';
import { BadgeVisual } from './visual-badge';
import { PayoutVisual } from './visual-payout';
import { HeroPhoneVisual } from './visual-phone';
import { PotVisual } from './visual-pot';
import { ShortsVisual } from './visual-shorts';
import { SplitVisual } from './visual-split';
import { VerifyVisual } from './visual-verify';

type Frame = {
  id: string;
  step?: string;
  title: string;
  body: string;
  Visual: ComponentType<{ play: boolean }>;
};

const FRAMES: Frame[] = [
  {
    id: 'hero',
    title: 'Get paid for your reach, fairly',
    body: 'Brands lock a pot on Portaldot. Creators post Shorts. When the campaign ends, the pot splits by views and lands in every creator’s wallet.',
    Visual: HeroPhoneVisual,
  },
  {
    id: 'fund',
    step: 'Fund',
    title: 'Brands lock a pot in any Portaldot token',
    body: 'rUSD, the brand’s own token, any native asset. Once it’s escrowed on-chain, the brand can’t claw it back.',
    Visual: PotVisual,
  },
  {
    id: 'create',
    step: 'Create',
    title: 'Creators post Shorts, views roll in',
    body: 'Anyone can join. Every Short submitted to the campaign is tracked until the window closes.',
    Visual: ShortsVisual,
  },
  {
    id: 'split',
    step: 'Split',
    title: 'The pot splits by views, with a fair cap',
    body: 'No first-come drain — the whole budget is always spent. A capped creator’s excess is re-split across everyone else.',
    Visual: SplitVisual,
  },
  {
    id: 'verify',
    step: 'Verify',
    title: 'Anyone can verify the split on-chain',
    body: 'The full view snapshot lives in TransactionStorage and its Merkle root is posted to the contract. Then a guardian dispute window opens.',
    Visual: VerifyVisual,
  },
  {
    id: 'payout',
    step: 'Payout',
    title: 'Paid on Portaldot, cash out in one tap',
    body: 'A keeper pays every creator on-chain. Swap your share to POT on Portaldot’s native DEX without leaving the app.',
    Visual: PayoutVisual,
  },
  {
    id: 'reputation',
    step: 'Reputation',
    title: 'Every payout builds your creator badge',
    body: 'A soulbound NFT tracks your campaigns, views and earnings — an on-chain résumé the next brand can trust.',
    Visual: BadgeVisual,
  },
];

const N = FRAMES.length;
const linear = (t: number) => t;

/** null until mounted (SSR + first client render), then whether the sticky desktop stage is in use. */
function useDesktop() {
  const [desktop, setDesktop] = useState<boolean | null>(null);
  useLayoutEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)');
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return desktop;
}

function StoryCopy({
  frame,
  index,
  progress,
  desktop,
  isActive,
  onHeroFocus,
}: {
  frame: Frame;
  index: number;
  progress: MotionValue<number>;
  desktop: boolean | null;
  isActive: boolean;
  onHeroFocus: () => void;
}) {
  const reduce = useReducedMotion();
  // Sequential, krafa-style: the outgoing line slides up and out by the step boundary (±0.5),
  // the incoming one slides up from below right after it. No overlap, so two headlines never mix.
  const input = [index - 0.5, index - 0.22, index + 0.22, index + 0.5];
  const opacity = useTransform(progress, input, [0, 1, 1, 0]);
  const y = useTransform(progress, input, reduce ? [0, 0, 0, 0] : [76, 0, 0, -76], { ease: [easeOut, linear, easeIn] });
  const style = desktop === true ? { opacity, y } : desktop === false ? { opacity: 1, y: 0 } : undefined;

  const isHero = index === 0;
  return (
    <motion.div
      style={style}
      onFocusCapture={isHero ? onHeroFocus : undefined}
      className={cn(
        'min-[900px]:self-center min-[900px]:[grid-area:1/1] min-[900px]:will-change-[transform,opacity]',
        !isHero && 'min-[900px]:pointer-events-none min-[900px]:opacity-0',
        isHero && desktop && !isActive && 'pointer-events-none',
      )}
    >
      {isHero ? (
        <>
          <h1
            id="reachpot-hero-title"
            className="rp-rise max-w-[560px] text-[clamp(38px,9.4vw,48px)] leading-[1.03] min-[900px]:text-[clamp(44px,4.4vw,58px)]"
          >
            {frame.title}
          </h1>
          <p className="mt-6 max-w-[470px] text-[17px] leading-[1.6] tracking-[-0.025em] text-muted rp-rise" style={{ animationDelay: '90ms' }}>
            {frame.body}
          </p>
          <div className="mt-8 flex flex-wrap gap-3 rp-rise" style={{ animationDelay: '180ms' }}>
            <ButtonLink href="/campaigns/new" size="lg" chevron>
              Start a campaign
            </ButtonLink>
            <ButtonLink href="/campaigns" size="lg" variant="secondary">
              Browse campaigns
            </ButtonLink>
          </div>
        </>
      ) : (
        <>
          <Eyebrow className="tabular">
            {String(index).padStart(2, '0')} · {frame.step}
          </Eyebrow>
          <h2 className="mt-3 max-w-[520px] text-[clamp(30px,7.6vw,38px)] leading-[1.06] min-[900px]:text-[clamp(34px,3.2vw,44px)]">
            {frame.title}
          </h2>
          <p className="mt-5 max-w-[440px] text-[17px] leading-[1.6] tracking-[-0.025em] text-muted">{frame.body}</p>
        </>
      )}
    </motion.div>
  );
}

function StoryVisual({ frame, index, active, desktop }: { frame: Frame; index: number; active: number; desktop: boolean | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const live = desktop === true ? index === active : desktop === false ? inView : false;

  // Turn on immediately; turn off only after the frame has faded out (~800ms), so nothing visibly resets.
  const [prevLive, setPrevLive] = useState(live);
  const [linger, setLinger] = useState(false);
  if (live !== prevLive) {
    setPrevLive(live);
    setLinger(!live);
  }
  useEffect(() => {
    if (!linger) return;
    const t = setTimeout(() => setLinger(false), 800);
    return () => clearTimeout(t);
  }, [linger]);
  const play = live || linger;

  const { Visual } = frame;
  return (
    <div
      ref={ref}
      aria-hidden
      data-state={index === active ? 'active' : index < active ? 'past' : 'upcoming'}
      className={cn(
        'rp-frame relative overflow-hidden rounded-[28px] min-[900px]:rounded-[32px]',
        index === 0 ? 'h-[600px]' : 'h-[520px]',
        'min-[900px]:h-[var(--card-h)] min-[900px]:self-center min-[900px]:[grid-area:1/2]',
      )}
    >
      <Visual play={play} />
    </div>
  );
}

export function ScrollStory() {
  const sectionRef = useRef<HTMLElement>(null);
  const desktop = useDesktop();
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] });
  const progress = useTransform(scrollYProgress, (v) => v * (N - 1));

  const [active, setActive] = useState(0);
  useMotionValueEvent(progress, 'change', (v) => {
    const next = Math.min(N - 1, Math.max(0, Math.round(v)));
    setActive((prev) => (prev === next ? prev : next));
  });

  // Keyboard users tabbing into the hero CTAs while scrolled deep into the story: bring the hero back.
  const onHeroFocus = () => {
    if (desktop && active !== 0) window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <MotionConfig reducedMotion="user">
      <section
        ref={sectionRef}
        aria-labelledby="reachpot-hero-title"
        className="relative pt-[104px] min-[900px]:h-[580svh] min-[900px]:pt-[72px]"
      >
        <div
          className={cn(
            'mx-auto flex max-w-[1200px] flex-col gap-24 px-5 sm:px-8',
            '[--card-h:clamp(460px,calc(100svh-168px),640px)]',
            'min-[900px]:sticky min-[900px]:top-[72px] min-[900px]:grid min-[900px]:h-[calc(100svh-72px)] min-[900px]:grid-cols-[minmax(0,1fr)_minmax(0,1.04fr)] min-[900px]:grid-rows-1 min-[900px]:items-center min-[900px]:gap-x-[clamp(40px,6vw,96px)] min-[900px]:gap-y-0',
          )}
        >
          {/* the one shared stage card on desktop; on mobile each visual carries its own surface */}
          <div
            aria-hidden
            className="rp-surface hidden rounded-[32px] shadow-[inset_0_0_0_1px_rgb(37_32_45/0.05)] min-[900px]:block min-[900px]:h-[var(--card-h)] min-[900px]:self-center min-[900px]:[grid-area:1/2]"
          />
          {FRAMES.map((frame, i) => (
            <div key={frame.id} className="flex flex-col gap-10 min-[900px]:contents">
              <StoryCopy frame={frame} index={i} progress={progress} desktop={desktop} isActive={active === i} onHeroFocus={onHeroFocus} />
              <StoryVisual frame={frame} index={i} active={active} desktop={desktop} />
            </div>
          ))}
        </div>
      </section>
    </MotionConfig>
  );
}
