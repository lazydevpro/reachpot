import Link from 'next/link';
import { LogoMark } from '@/components/brand/logo';
import { NetworkStatus } from '@/components/site/network-status';

const COLS = [
  {
    title: 'Product',
    links: [
      { href: '/campaigns', label: 'Campaigns' },
      { href: '/campaigns/new', label: 'Start a campaign' },
      { href: '/me', label: 'Creator dashboard' },
    ],
  },
  {
    title: 'Build',
    links: [
      { href: 'https://github.com/lazydevpro/reachpot', label: 'GitHub' },
      { href: 'https://github.com/lazydevpro/reachpot#how-it-works', label: 'How it works' },
      { href: 'https://dorahacks.io/hackathon/portaldot-hacker-house-2026/detail', label: 'Portaldot Hacker House' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1fr_auto]">
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <LogoMark className="size-8 rounded-[10px]" />
            <span className="text-[16px] font-semibold tracking-[-0.03em] text-ink">Reachpot</span>
          </div>
          <p className="max-w-xs text-[14px]">Get paid for your reach, fairly. Pro-rata creator campaigns on Portaldot.</p>
          <NetworkStatus />
        </div>
        <div className="grid grid-cols-2 gap-12">
          {COLS.map((c) => (
            <div key={c.title} className="space-y-3">
              <p className="text-[14px] font-semibold tracking-[-0.01em] text-ink">{c.title}</p>
              <ul className="space-y-2">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-[14px] text-muted transition-colors hover:text-ink">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="mx-auto max-w-[1200px] px-5 pb-10 text-[13px] text-faint sm:px-8">
        © 2026 Reachpot · Built for Portaldot Hacker House 2026
      </div>
    </footer>
  );
}
