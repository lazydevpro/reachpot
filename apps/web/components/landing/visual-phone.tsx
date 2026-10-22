'use client';

import { motion } from 'motion/react';
import { Heart, MessageCircle, Search, Send } from 'lucide-react';
import type { ReactNode } from 'react';
import { LogoMark } from '@/components/brand/logo';
import { cn } from '@/lib/utils';
import { Avatar, LiveDot, PlayGlyph, VideoStill } from './bits';
import { EASE_OUT, LiveCount } from './motion-bits';
import './landing.css';

const HERO_VIDEO = 'linear-gradient(172deg,#f79a82 0%,#ff8f74 26%,#c07dff 60%,#5135c2 100%)';

function StatusIcons() {
  return (
    <span className="flex items-center gap-[6px]">
      <svg viewBox="0 0 18 12" className="h-[11px] w-[17px]" fill="currentColor">
        <rect x="0" y="8" width="3" height="4" rx="1" />
        <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
        <rect x="10" y="3" width="3" height="9" rx="1" />
        <rect x="15" y="0" width="3" height="12" rx="1" />
      </svg>
      <svg viewBox="0 0 16 12" className="h-[11px] w-[15px]" fill="currentColor">
        <path d="M8 2.4c2.3 0 4.4.9 6 2.4l1.1-1.2A10.2 10.2 0 0 0 8 .8 10.2 10.2 0 0 0 .9 3.6L2 4.8a8.6 8.6 0 0 1 6-2.4Z" />
        <path d="M8 5.6c1.4 0 2.7.5 3.7 1.4l1.1-1.2A7 7 0 0 0 8 4a7 7 0 0 0-4.8 1.8L4.3 7c1-.9 2.3-1.4 3.7-1.4Z" />
        <path d="M8 8.8c.6 0 1.1.2 1.5.6L8 11 6.5 9.4c.4-.4.9-.6 1.5-.6Z" />
      </svg>
      <span className="relative flex h-[12px] w-[25px] items-center rounded-[4px] border border-current/40 p-[1.5px]">
        <span className="h-full w-[78%] rounded-[2px] bg-current" />
        <span className="absolute -right-[3.5px] top-1/2 h-[4px] w-[1.5px] -translate-y-1/2 rounded-r bg-current/40" />
      </span>
    </span>
  );
}

/** Rounded device frame with dynamic island and a 9:41 status bar. Designed at 312×640. */
export function PhoneFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'relative h-[640px] w-[312px] shrink-0 rounded-[54px] bg-[linear-gradient(150deg,#4a4352_0%,#1b171f_38%,#2b2631_100%)] p-[10px]',
        'shadow-[0_50px_90px_-40px_rgb(37_32_45/0.55),0_24px_40px_-24px_rgb(37_32_45/0.4),inset_0_0_0_1.5px_rgb(255_255_255/0.1)]',
        className,
      )}
    >
      <span className="absolute -left-[2.5px] top-[112px] h-[26px] w-[3px] rounded-l-[2px] bg-[#2d2833]" />
      <span className="absolute -left-[2.5px] top-[158px] h-[50px] w-[3px] rounded-l-[2px] bg-[#2d2833]" />
      <span className="absolute -left-[2.5px] top-[218px] h-[50px] w-[3px] rounded-l-[2px] bg-[#2d2833]" />
      <span className="absolute -right-[2.5px] top-[176px] h-[76px] w-[3px] rounded-r-[2px] bg-[#2d2833]" />
      <div className="relative h-full w-full overflow-hidden rounded-[44px] bg-[#0f0d12]">
        {children}
        <div className="absolute inset-x-0 top-0 z-20 flex h-[48px] items-center justify-between pl-[30px] pr-[24px] pt-[3px] text-[14.5px] font-semibold tracking-[-0.01em] text-white">
          <span className="tabular">9:41</span>
          <StatusIcons />
        </div>
        <div className="absolute left-1/2 top-[11px] z-30 h-[27px] w-[90px] -translate-x-1/2 rounded-full bg-black" />
        <div className="absolute bottom-[7px] left-1/2 z-30 h-[4px] w-[110px] -translate-x-1/2 rounded-full bg-ink/80" />
      </div>
    </div>
  );
}

function RailButton({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="flex flex-col items-center gap-1 text-[10.5px] font-semibold text-white">
      <span className="grid size-[38px] place-items-center rounded-full bg-white/18 backdrop-blur-md">{icon}</span>
      {label}
    </span>
  );
}

/** Hero: a Short playing in the creator's feed, with their live share of the pot. */
export function HeroPhoneVisual({ play }: { play: boolean }) {
  return (
    <div className="flex h-full justify-center rp-phone-stage">
      <PhoneFrame className="mt-[22px] rp-phone">
        <VideoStill gradient={HERO_VIDEO} className="absolute inset-0">
          <div className="absolute left-[26%] top-[24%] size-[150px] rounded-full bg-[#ffe3d8]/70 blur-[38px]" />
          <div className="absolute right-[-12%] top-[44%] size-[190px] rounded-full bg-[#7b5cff]/45 blur-[44px]" />
        </VideoStill>

        {/* top bar */}
        <div className="absolute inset-x-0 top-[52px] z-10 flex items-center justify-between px-5 text-white">
          <span className="text-[17px] font-semibold tracking-[-0.03em]">Shorts</span>
          <Search className="size-[18px]" strokeWidth={2.4} />
        </div>
        <div className="absolute left-5 top-[84px] z-10 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
          <LogoMark className="size-4 rounded-[5px]" />
          Nova Launch campaign
        </div>

        {/* play glyph */}
        <div className="absolute left-1/2 top-[34%] z-10 grid size-[58px] -translate-x-1/2 place-items-center rounded-full bg-white/22 text-white backdrop-blur-md">
          <PlayGlyph className="ml-0.5 size-6" />
        </div>

        {/* right rail */}
        <div className="absolute bottom-[246px] right-3 z-10 flex flex-col items-center gap-3.5">
          <RailButton icon={<Heart className="size-[18px]" fill="currentColor" strokeWidth={0} />} label="4.8K" />
          <RailButton icon={<MessageCircle className="size-[18px]" strokeWidth={2.4} />} label="312" />
          <RailButton icon={<Send className="size-[17px]" strokeWidth={2.4} />} label="Share" />
        </div>

        {/* creator + caption + live views */}
        <div className="absolute bottom-[196px] left-4 right-16 z-10 text-white">
          <div className="flex items-center gap-2">
            <Avatar index={0} className="size-7 ring-2 ring-white/70" />
            <span className="text-[13.5px] font-semibold tracking-[-0.02em]">@maya.makes</span>
            <span className="rounded-full bg-white px-2 py-[3px] text-[10.5px] font-bold text-ink">Subscribe</span>
          </div>
          <p className="mt-2 text-[12.5px] leading-snug text-white/90">Day 12 of the #NovaLaunch glow-up challenge</p>
          <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-black/30 px-2.5 py-1 text-[12px] font-semibold backdrop-blur-md">
            <LiveDot className="text-[#ff9b80]" />
            <span aria-hidden>▶</span>
            <LiveCount start={48213} play={play} min={3} max={21} every={1.3} className="tabular" />
            <span className="text-white/75">views</span>
          </span>
        </div>

        {/* bottom sheet */}
        <div
          className="absolute inset-x-0 bottom-0 z-20 rounded-t-[26px] bg-surface px-[18px] pb-[30px] pt-2 shadow-[0_-12px_30px_-12px_rgb(0_0_0/0.35)]"
        >
          <div className="mx-auto h-1 w-9 rounded-full bg-line-strong" />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[12px] font-semibold tracking-[-0.01em] text-muted">Your share of the pot</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-good-soft px-2 py-[3px] text-[10.5px] font-bold text-good">
              <LiveDot />
              Live
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <LiveCount
              start={182.4}
              play={play}
              min={0.01}
              max={0.03}
              every={1.3}
              format="money"
              className="tabular text-[28px] font-semibold tracking-[-0.04em] text-ink"
            />
            <span className="text-[14px] font-semibold text-muted">rUSD</span>
          </div>
          <div className="relative mt-3 h-2 rounded-full bg-sunken">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,#8d72ff,#ff8a6b)]"
              initial={false}
              animate={{ width: play ? '61%' : '58%' }}
              transition={{ duration: 1.4, ease: EASE_OUT }}
            />
            <span className="absolute -top-1 right-0 h-4 w-0 border-l-[1.5px] border-dashed border-faint" />
          </div>
          <div className="mt-2 flex justify-between text-[11px] font-semibold text-faint">
            <span>61% of creator cap</span>
            <span>Ends in 2d 4h</span>
          </div>
        </div>
      </PhoneFrame>
    </div>
  );
}
