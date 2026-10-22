'use client';

/*
 * Small animated text primitives. They write straight into the DOM node (no React re-render per frame)
 * and fall back to static final values under prefers-reduced-motion.
 */
import { animate, useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { formatNumber, type NumberFormat } from './bits';

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Counts from `from` to `to` whenever `play` turns on; resets when it turns off. */
export function CountUp({
  to,
  from = 0,
  play,
  format = 'int',
  duration = 1.4,
  delay = 0,
  className,
}: {
  to: number;
  from?: number;
  play: boolean;
  format?: NumberFormat;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!play) {
      el.textContent = formatNumber(from, format);
      return;
    }
    if (reduce) {
      el.textContent = formatNumber(to, format);
      return;
    }
    const controls = animate(from, to, {
      duration,
      delay,
      ease: EASE_OUT,
      onUpdate: (v) => {
        el.textContent = formatNumber(v, format);
      },
    });
    return () => controls.stop();
  }, [play, from, to, format, duration, delay, reduce]);

  return (
    <span ref={ref} className={className}>
      {formatNumber(from, format)}
    </span>
  );
}

/**
 * A number that keeps ticking upward while `play` is on (live view counters).
 * Starts at `start` (optionally counting up into it first) and adds `min..max` every `every` seconds.
 */
export function LiveCount({
  start,
  play,
  min,
  max,
  every = 1.6,
  format = 'int',
  countIn = false,
  delay = 0,
  className,
}: {
  start: number;
  play: boolean;
  min: number;
  max: number;
  every?: number;
  format?: NumberFormat;
  countIn?: boolean;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let value = start;
    if (!play || reduce) {
      el.textContent = formatNumber(countIn && !play ? 0 : start, format);
      return;
    }
    let current: ReturnType<typeof animate> | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const write = (v: number) => {
      el.textContent = formatNumber(v, format);
    };
    const tick = () => {
      const next = value + min + Math.random() * (max - min);
      current = animate(value, next, { duration: 0.7, ease: EASE_OUT, onUpdate: write });
      value = next;
      timer = setTimeout(tick, every * 1000 * (0.75 + Math.random() * 0.5));
    };
    if (countIn) {
      current = animate(0, start, { duration: 1.3, delay, ease: EASE_OUT, onUpdate: write });
      timer = setTimeout(tick, (delay + 1.3 + every * Math.random()) * 1000);
    } else {
      timer = setTimeout(tick, (delay + every * (0.4 + Math.random() * 0.6)) * 1000);
    }
    return () => {
      current?.stop();
      if (timer) clearTimeout(timer);
    };
  }, [play, start, min, max, every, format, countIn, delay, reduce]);

  return (
    <span ref={ref} className={className}>
      {formatNumber(countIn ? 0 : start, format)}
    </span>
  );
}

const HEX = '0123456789abcdef';

/** Hex string that "recomputes" (scrambles, then resolves left to right) when `play` turns on. */
export function Scramble({ text, play, delay = 0, duration = 0.9, className }: { text: string; play: boolean; delay?: number; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!play || reduce) {
      el.textContent = text;
      return;
    }
    const scrambleable = (c: string) => /[0-9a-f]/i.test(c);
    const controls = animate(0, 1, {
      duration,
      delay,
      ease: 'linear',
      onUpdate: (p) => {
        const settled = Math.floor(p * text.length);
        let out = '';
        for (let i = 0; i < text.length; i++) {
          const c = text[i];
          out += i < settled || !scrambleable(c) || (i < 2 && c === '0') ? c : HEX[(Math.random() * 16) | 0];
        }
        el.textContent = out;
      },
      onComplete: () => {
        el.textContent = text;
      },
    });
    return () => controls.stop();
  }, [play, text, delay, duration, reduce]);

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}

/** hh:mm:ss countdown that ticks while `play` is on. */
export function Countdown({ seconds, play, className }: { seconds: number; play: boolean; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let left = seconds;
    const write = () => {
      const h = Math.floor(left / 3600);
      const m = Math.floor((left % 3600) / 60);
      const s = left % 60;
      el.textContent = [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
    };
    write();
    if (!play || reduce) return;
    const id = setInterval(() => {
      left = Math.max(0, left - 1);
      write();
    }, 1000);
    return () => clearInterval(id);
  }, [play, seconds, reduce]);

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return (
    <span ref={ref} className={className}>
      {[h, m, s].map((n) => String(n).padStart(2, '0')).join(':')}
    </span>
  );
}
