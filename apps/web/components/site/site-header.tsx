'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/brand/logo';
import { ButtonLink } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/campaigns', label: 'Campaigns' },
  { href: '/me', label: 'Creators' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,backdrop-filter] duration-300',
        scrolled ? 'bg-canvas/75 shadow-[0_1px_0_var(--color-line)] backdrop-blur-xl' : 'bg-transparent',
      )}
    >
      <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-5 sm:px-8">
        <Logo />
        <nav className="flex items-center gap-1 sm:gap-2">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                'hidden rounded-full px-3 py-2 text-[14px] font-semibold tracking-[-0.01em] transition-colors sm:inline-flex',
                pathname.startsWith(n.href) ? 'text-ink' : 'text-faint hover:text-ink',
              )}
            >
              {n.label}
            </Link>
          ))}
          <ButtonLink href="/campaigns/new" size="md" chevron className="ml-1">
            Start a campaign
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
