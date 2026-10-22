'use client';

import type { ReactNode } from 'react';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="bottom-right" toastOptions={{ className: '!rounded-2xl !font-sans' }} />
    </>
  );
}
