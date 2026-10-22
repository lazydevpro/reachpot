import type { Metadata } from 'next';
import { Geist_Mono } from 'next/font/google';
import '@fontsource/open-runde/latin-400.css';
import '@fontsource/open-runde/latin-500.css';
import '@fontsource/open-runde/latin-600.css';
import '@fontsource/open-runde/latin-700.css';
import './globals.css';
import { SiteFooter } from '@/components/site/site-footer';
import { SiteHeader } from '@/components/site/site-header';
import { Providers } from '@/components/providers';

const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: { default: 'Reachpot — get paid for your reach, fairly', template: '%s · Reachpot' },
  description:
    'Pro-rata creator campaigns on Portaldot. Brands lock a pot in any Portaldot token; creators post Shorts; the pot splits by views and pays out on-chain.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${geistMono.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <Providers>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
