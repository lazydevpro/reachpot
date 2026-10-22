import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

const control =
  'w-full rounded-2xl bg-surface px-4 text-[15px] text-ink shadow-[inset_0_1px_2px_rgb(37_32_45/0.04)] ring-1 ring-line-strong outline-none transition-shadow placeholder:text-faint focus:ring-2 focus:ring-accent/50';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(control, 'h-12', className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(control, 'min-h-28 py-3 leading-relaxed', className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn(control, 'h-12 appearance-none pr-10', className)} {...props} />;
}

export function Field({ label, hint, error, children, className }: { label: string; hint?: ReactNode; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block space-y-2', className)}>
      <span className="block text-[14px] font-semibold tracking-[-0.01em] text-ink">{label}</span>
      {children}
      {error ? <span className="block text-[13px] text-bad">{error}</span> : hint ? <span className="block text-[13px] text-faint">{hint}</span> : null}
    </label>
  );
}
