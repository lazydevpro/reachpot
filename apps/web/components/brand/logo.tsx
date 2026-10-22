import Link from 'next/link';
import { cn } from '@/lib/utils';

/** Glossy app-icon tile with a "pot" mark: a bowl with three rising bars (views → share). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn('app-icon inline-grid size-10 place-items-center rounded-[13px]', className)} aria-hidden>
      <svg viewBox="0 0 24 24" className="size-[58%] drop-shadow-[0_1px_1px_rgb(37_32_45/0.25)]" fill="none">
        <rect x="6.2" y="7" width="2.6" height="5.5" rx="1.3" fill="white" fillOpacity="0.95" />
        <rect x="10.7" y="4" width="2.6" height="8.5" rx="1.3" fill="white" />
        <rect x="15.2" y="5.8" width="2.6" height="6.7" rx="1.3" fill="white" fillOpacity="0.9" />
        <path d="M3.5 11.5h17a.5.5 0 0 1 .5.55A8.6 8.6 0 0 1 12.4 20h-.8A8.6 8.6 0 0 1 3 12.05a.5.5 0 0 1 .5-.55Z" fill="white" />
      </svg>
    </span>
  );
}

export function Logo({ className, withWordmark = true }: { className?: string; withWordmark?: boolean }) {
  return (
    <Link href="/" className={cn('inline-flex items-center gap-2.5', className)} aria-label="Reachpot home">
      <LogoMark />
      {withWordmark && <span className="text-[17px] font-semibold tracking-[-0.03em] text-ink">Reachpot</span>}
    </Link>
  );
}
