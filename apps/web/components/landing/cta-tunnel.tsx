/*
 * Closing CTA: centered app icon + headline, surrounded by a slowly orbiting "tunnel" of tilted tiles.
 * Tiles sit on a sphere (radius 1000px, perspective 2800px), four rings at increasing tilt, each ring
 * blurrier than the last, faded out toward the edges by a vignette. Server-rendered and deterministic;
 * only the off-screen pause is client-side.
 */
import { Check } from 'lucide-react';
import { LogoMark } from '@/components/brand/logo';
import { ButtonLink } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Avatar, CREATORS, PlayGlyph, SHORT_GRADIENTS, TokenCoin, VideoStill, formatNumber, type Token } from './bits';
import './landing.css';
import { TunnelStage } from './tunnel-stage';

/** Small deterministic PRNG so server and client markup always match. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Kind = 'short' | 'grad' | 'token' | 'avatar' | 'payout' | 'badge';
const KINDS: Kind[] = ['short', 'grad', 'token', 'short', 'avatar', 'payout', 'grad', 'short', 'badge', 'token', 'avatar'];
const TOKEN_LIST: Token[] = ['rUSD', 'NOVA', 'tPOT'];
const PASTELS = [
  'linear-gradient(140deg,#fff1ea,#ffd3c4)',
  'linear-gradient(140deg,#f1edff,#d6ccff)',
  'linear-gradient(140deg,#eafaf1,#c5ecd6)',
  'linear-gradient(140deg,#eef5ff,#cfe0fb)',
  'linear-gradient(140deg,#fff8e6,#fbe3ad)',
  'linear-gradient(140deg,#fdeef6,#f6cfe2)',
];

const RINGS = [
  { tilt: 22.9, count: 14, duration: 150, reverse: false, blur: 0 },
  { tilt: 32.1, count: 20, duration: 190, reverse: true, blur: 0.5 },
  { tilt: 42.1, count: 25, duration: 230, reverse: false, blur: 1.4 },
  { tilt: 53.5, count: 30, duration: 270, reverse: true, blur: 2.8 },
];

type TileSpec = { kind: Kind; azimuth: number; tilt: number; spin: number; n: number; blur: number };

const TILES: TileSpec[][] = (() => {
  const rand = mulberry32(7);
  return RINGS.map((ring, r) =>
    Array.from({ length: ring.count }, (_, i) => {
      const azimuth = (360 / ring.count) * i + (rand() - 0.5) * 6;
      return {
        kind: KINDS[Math.floor(rand() * KINDS.length)],
        azimuth,
        tilt: ring.tilt + (rand() - 0.5) * 1.2,
        // tops point radially outward (so the slow orbit never looks "tilted"), with a little jitter
        spin: 90 + (rand() - 0.5) * 8,
        n: Math.floor(rand() * 1000) + r * 7,
        blur: ring.blur,
      };
    }),
  );
})();

const VIEW_COUNTS = [12_400, 48_200, 3_900, 128_000, 860, 22_700, 7_300, 310_000, 64_100, 1_840];

function Tile({ spec }: { spec: TileSpec }) {
  const { kind, n } = spec;
  const base = 'absolute left-0 top-0 size-[110px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[18px] shadow-[0_1px_2px_rgb(37_32_45/0.06),0_10px_24px_-14px_rgb(37_32_45/0.3)] ring-1 ring-black/5';
  const style = spec.blur ? { filter: `blur(${spec.blur}px)` } : undefined;

  switch (kind) {
    case 'short':
      return (
        <div className={base} style={style}>
          <VideoStill gradient={SHORT_GRADIENTS[n % SHORT_GRADIENTS.length]} className="size-full">
            <span className="absolute left-1/2 top-[40%] grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/30 text-white">
              <PlayGlyph className="ml-0.5 size-3.5" />
            </span>
            <span className="absolute bottom-2 left-2 rounded-full bg-black/30 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              ▶ {formatNumber(VIEW_COUNTS[n % VIEW_COUNTS.length], 'compact')}
            </span>
          </VideoStill>
        </div>
      );
    case 'token': {
      const token = TOKEN_LIST[n % TOKEN_LIST.length];
      return (
        <div className={cn(base, 'grid place-items-center bg-surface')} style={style}>
          <span className="flex flex-col items-center gap-1.5">
            <TokenCoin token={token} className="size-10 text-[17px]" />
            <span className="text-[12px] font-semibold tracking-[-0.02em] text-ink">{token}</span>
          </span>
        </div>
      );
    }
    case 'avatar':
      return (
        <div className={cn(base, 'grid place-items-center')} style={{ ...style, background: PASTELS[n % PASTELS.length] }}>
          <span className="flex flex-col items-center gap-1.5">
            <Avatar index={n} className="size-11 text-[17px] ring-2 ring-white/80" />
            <span className="text-[10.5px] font-semibold text-ink-2">@{CREATORS[n % CREATORS.length].handle.split('.')[0]}</span>
          </span>
        </div>
      );
    case 'payout':
      return (
        <div className={cn(base, 'flex flex-col justify-between bg-surface p-3')} style={style}>
          <span className="grid size-5 place-items-center rounded-full bg-good text-white">
            <Check className="size-3" strokeWidth={3} />
          </span>
          <span className="leading-tight">
            <span className="tabular block text-[15px] font-semibold tracking-[-0.03em] text-ink">+{formatNumber(40 + (n % 9) * 37.35, 'money')}</span>
            <span className="text-[10.5px] font-semibold text-faint">rUSD paid</span>
          </span>
        </div>
      );
    case 'badge':
      return (
        <div className={cn(base, 'grid place-items-center rp-foil')} style={style}>
          <LogoMark className="size-11 rounded-[13px]" />
        </div>
      );
    default:
      return (
        <div className={base} style={{ ...style, background: PASTELS[n % PASTELS.length] }}>
          <span className="absolute inset-0 bg-[radial-gradient(90%_70%_at_25%_15%,rgb(255_255_255/0.7),transparent_60%)]" />
        </div>
      );
  }
}

export function CtaTunnel() {
  return (
    <section
      aria-labelledby="reachpot-cta-title"
      className="relative isolate mt-[clamp(72px,9vw,140px)] grid h-[min(880px,92svh)] min-h-[660px] place-items-center overflow-hidden max-[560px]:min-h-[600px]"
    >
      <TunnelStage className="absolute inset-0 rp-tunnel">
        <div className="absolute left-1/2 top-1/2 size-0 rp-field">
          <div className="absolute left-0 top-0 size-0 rp-sphere">
            {RINGS.map((ring, r) => (
              <div
                key={r}
                className="absolute left-0 top-0 size-0 rp-ring"
                style={{
                  animationDuration: `${ring.duration}s`,
                  animationDirection: ring.reverse ? 'reverse' : 'normal',
                  animationDelay: `-${ring.duration * (0.13 + r * 0.21)}s`,
                }}
              >
                {TILES[r].map((spec, i) => (
                  <div
                    key={i}
                    className="absolute left-0 top-0 size-0"
                    style={{
                      transform: `rotate(${spec.azimuth.toFixed(2)}deg) translateZ(-1000px) rotateY(${spec.tilt.toFixed(2)}deg) translateZ(1000px) rotate(${spec.spin.toFixed(2)}deg)`,
                    }}
                  >
                    <Tile spec={spec} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </TunnelStage>
      <div aria-hidden className="pointer-events-none absolute -inset-1 z-[2] rp-vignette" />

      <div className="relative z-[3] flex w-[min(620px,calc(100%-40px))] flex-col items-center text-center">
        <LogoMark className="size-[76px] rounded-[22px] rp-mark-shadow" />
        <h2 id="reachpot-cta-title" className="mt-5 text-[clamp(38px,4.4vw,60px)] leading-[1.04] max-[560px]:text-[min(10.4vw,44px)]">
          Make every view count.
        </h2>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/campaigns/new" size="lg" chevron>
            Start a campaign
          </ButtonLink>
          <ButtonLink href="/me" size="lg" variant="secondary">
            I&apos;m a creator
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
