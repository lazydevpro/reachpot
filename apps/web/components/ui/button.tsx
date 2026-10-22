import Link from 'next/link';
import { ChevronRight, LoaderCircle } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'accent';
type Size = 'sm' | 'md' | 'lg';

const base =
  'group/btn relative inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-[650] tracking-[-0.01em] transition-[transform,box-shadow,background-color,opacity] duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50';

const variants: Record<Variant, string> = {
  primary:
    'text-white bg-[linear-gradient(180deg,#3b3444_0%,#221d29_100%)] shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_1px_2px_rgb(37_32_45/0.2),0_6px_16px_-6px_rgb(37_32_45/0.45)] hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_1px_2px_rgb(37_32_45/0.2),0_10px_22px_-8px_rgb(37_32_45/0.5)]',
  secondary: 'bg-surface text-ink shadow-pill ring-1 ring-line hover:shadow-lift',
  ghost: 'text-muted hover:text-ink hover:bg-sunken',
  accent:
    'text-white bg-[linear-gradient(180deg,#8d72ff_0%,#6a48f5_100%)] shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_6px_16px_-6px_rgb(106_72_245/0.6)]',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3.5 text-[13px]',
  md: 'h-10 px-[18px] text-[14px]',
  lg: 'h-12 px-6 text-[15px]',
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  chevron?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}

function Inner({ children, chevron, loading, icon }: CommonProps & { children: ReactNode }) {
  return (
    <>
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : icon}
      <span className="inline-flex items-center gap-1.5">{children}</span>
      {chevron && (
        <ChevronRight className="-mr-1 size-4 transition-transform duration-200 group-hover/btn:translate-x-0.5" aria-hidden />
      )}
    </>
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  chevron,
  loading,
  icon,
  className,
  children,
  disabled,
  ...props
}: CommonProps & ComponentProps<'button'>) {
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} disabled={disabled || loading} {...props}>
      <Inner chevron={chevron} loading={loading} icon={icon}>
        {children}
      </Inner>
    </button>
  );
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  chevron,
  icon,
  className,
  children,
  ...props
}: CommonProps & ComponentProps<typeof Link>) {
  return (
    <Link className={cn(base, variants[variant], sizes[size], className)} {...props}>
      <Inner chevron={chevron} icon={icon}>
        {children}
      </Inner>
    </Link>
  );
}
