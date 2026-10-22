'use client';

import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { DeploymentProvider } from '@/lib/client/deployment';
import { EvmWalletProvider } from '@/lib/client/evm-wallet';
import { NativeWalletProvider } from '@/lib/client/native-wallet';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <DeploymentProvider>
      <EvmWalletProvider>
        <NativeWalletProvider>
          {children}
          <Toaster position="bottom-right" toastOptions={{ className: '!rounded-2xl !font-sans' }} />
        </NativeWalletProvider>
      </EvmWalletProvider>
    </DeploymentProvider>
  );
}
