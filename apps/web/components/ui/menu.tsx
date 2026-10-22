'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Minimal popover menu: `trigger` toggles a floating panel; click outside / Escape closes it. */
export function Menu({ trigger, children, align = 'end', className }: { trigger: (open: boolean, toggle: () => void) => ReactNode; children: (close: () => void) => ReactNode; align?: 'start' | 'end'; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative inline-block">
      {trigger(open, () => setOpen((o) => !o))}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
            className={cn(
              'absolute z-50 mt-2 min-w-64 origin-top rounded-2xl bg-surface p-1.5 shadow-lift ring-1 ring-line',
              align === 'end' ? 'right-0' : 'left-0',
              className,
            )}
          >
            {children(() => setOpen(false))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MenuItem({ children, hint, onClick, icon }: { children: ReactNode; hint?: ReactNode; onClick: () => void; icon?: ReactNode }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-sunken">
      {icon && <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-sunken text-ink-2">{icon}</span>}
      <span className="min-w-0">
        <span className="block text-[14px] font-semibold tracking-[-0.01em] text-ink">{children}</span>
        {hint && <span className="block truncate text-[12.5px] text-faint">{hint}</span>}
      </span>
    </button>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <p className="px-3 pb-1 pt-2 text-[12px] font-semibold text-faint">{children}</p>;
}
