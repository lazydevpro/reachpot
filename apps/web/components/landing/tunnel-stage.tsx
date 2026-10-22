'use client';

import { useInView } from 'motion/react';
import { useRef, type ReactNode } from 'react';

/** Pauses the CTA orbit (via `data-idle`) whenever the tunnel is off-screen. */
export function TunnelStage({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '120px 0px' });
  return (
    <div ref={ref} aria-hidden className={className} data-idle={inView ? undefined : ''}>
      {children}
    </div>
  );
}
