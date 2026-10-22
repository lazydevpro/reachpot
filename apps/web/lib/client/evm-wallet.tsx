'use client';

// Brand wallet (EVM side of Portaldot via Revive): an injected wallet (MetaMask, Talisman, SubWallet) or, on the
// local chain only, the well-known dev accounts as in-browser signers.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPublicClient, createWalletClient, custom, http, type Address, type EIP1193Provider, type WalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { LOCAL_DEV, evmChain } from '@reachpot/core';
import { publicConfig } from '@/lib/config';

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

export const chain = evmChain(publicConfig.network);
export const publicClient = createPublicClient({ chain, transport: http(publicConfig.network.evmRpc), pollingInterval: 1_000 });

export const DEV_BRANDS = [LOCAL_DEV.evm.brand, LOCAL_DEV.evm.brand2];

interface EvmWallet {
  address?: Address;
  walletClient?: WalletClient;
  kind?: 'injected' | 'dev';
  label?: string;
  connecting: boolean;
  hasInjected: boolean;
  connectInjected: () => Promise<void>;
  connectDev: (index: number) => void;
  disconnect: () => void;
}

const Ctx = createContext<EvmWallet | null>(null);
const STORAGE = 'reachpot.evm';

export function EvmWalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Pick<EvmWallet, 'address' | 'walletClient' | 'kind' | 'label'>>({});
  const [connecting, setConnecting] = useState(false);
  const [hasInjected, setHasInjected] = useState(false);

  const connectDev = useCallback((index: number) => {
    const dev = DEV_BRANDS[index];
    if (!publicConfig.devWallets || !dev) return;
    const account = privateKeyToAccount(dev.key);
    setState({ address: account.address, kind: 'dev', label: `${dev.name} (dev)`, walletClient: createWalletClient({ account, chain, transport: http(publicConfig.network.evmRpc) }) });
    localStorage.setItem(STORAGE, `dev:${index}`);
  }, []);

  const connectInjected = useCallback(async () => {
    if (!window.ethereum) throw new Error('No EVM wallet found. Install MetaMask or Talisman.');
    setConnecting(true);
    try {
      const wc = createWalletClient({ chain, transport: custom(window.ethereum) });
      const [address] = await wc.requestAddresses();
      try {
        await wc.switchChain({ id: chain.id });
      } catch {
        await wc.addChain({ chain });
        await wc.switchChain({ id: chain.id });
      }
      setState({ address, kind: 'injected', label: 'Browser wallet', walletClient: createWalletClient({ account: address, chain, transport: custom(window.ethereum) }) });
      localStorage.setItem(STORAGE, 'injected');
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({});
    localStorage.removeItem(STORAGE);
  }, []);

  useEffect(() => {
    setHasInjected(Boolean(window.ethereum));
    const saved = localStorage.getItem(STORAGE);
    if (saved?.startsWith('dev:')) connectDev(Number(saved.slice(4)));
    else if (saved === 'injected' && window.ethereum) {
      window.ethereum
        .request({ method: 'eth_accounts' })
        .then((accts) => {
          if ((accts as Address[]).length > 0) void connectInjected();
        })
        .catch(() => undefined);
    }
  }, [connectDev, connectInjected]);

  const value = useMemo<EvmWallet>(
    () => ({ ...state, connecting, hasInjected, connectInjected, connectDev, disconnect }),
    [state, connecting, hasInjected, connectInjected, connectDev, disconnect],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEvmWallet(): EvmWallet {
  const v = useContext(Ctx);
  if (!v) throw new Error('useEvmWallet outside EvmWalletProvider');
  return v;
}
