'use client';

// Creator wallet (native Portaldot account): a browser extension (Talisman, SubWallet, polkadot{.js}) or, on the local
// chain only, the well-known dev accounts (//Bob, //Charlie, …) as in-browser keyrings.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ApiPromise } from '@polkadot/api';
import { LOCAL_DEV } from '@reachpot/core';
import type { NativeSigner } from '@reachpot/core/native';
import { publicConfig } from '@/lib/config';

export interface NativeAccount {
  address: string;
  name: string;
  source: 'extension' | 'dev';
}

interface NativeWallet {
  account?: NativeAccount;
  accounts: NativeAccount[];
  connecting: boolean;
  error?: string;
  connectExtension: () => Promise<void>;
  connectDev: () => Promise<void>;
  select: (address: string) => void;
  disconnect: () => void;
  /** Signer usable with `sendNative`. */
  signer: () => Promise<NativeSigner>;
  /** sr25519 signature over a UTF-8 message (extensions wrap it in <Bytes>…</Bytes>; the server accepts both). */
  signMessage: (message: string) => Promise<`0x${string}`>;
}

const Ctx = createContext<NativeWallet | null>(null);
const STORAGE = 'reachpot.native';
const DEV_NAMES = ['Bob', 'Charlie', 'Dave', 'Eve', 'Ferdie'];

let apiPromise: Promise<ApiPromise> | undefined;
/** Browser-side native API singleton. */
export function getNativeApi(): Promise<ApiPromise> {
  apiPromise ??= import('@reachpot/core/native').then(async ({ connectNative }) => {
    const api = await connectNative(publicConfig.network.ws);
    await api.isReady;
    return api;
  });
  return apiPromise;
}

async function devPairs() {
  const [{ Keyring }, { cryptoWaitReady }] = await Promise.all([import('@polkadot/keyring'), import('@polkadot/util-crypto')]);
  await cryptoWaitReady();
  const kr = new Keyring({ type: 'sr25519', ss58Format: 42 });
  return LOCAL_DEV.native.creators.map((uri, i) => ({ pair: kr.addFromUri(uri), name: DEV_NAMES[i] ?? uri }));
}

export function NativeWalletProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<NativeAccount[]>([]);
  const [selected, setSelected] = useState<string | undefined>();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const connectExtension = useCallback(async () => {
    setConnecting(true);
    setError(undefined);
    try {
      const { web3Enable, web3Accounts } = await import('@polkadot/extension-dapp');
      const exts = await web3Enable('Reachpot');
      if (exts.length === 0) throw new Error('No Portaldot wallet extension found. Install Talisman or SubWallet and allow this site.');
      const list = (await web3Accounts({ ss58Format: 42 })).filter((a) => a.type !== 'ethereum');
      if (list.length === 0) throw new Error('Your wallet has no Portaldot (Substrate) accounts.');
      const mapped = list.map((a) => ({ address: a.address, name: a.meta.name ?? 'Account', source: 'extension' as const }));
      setAccounts(mapped);
      setSelected((s) => (s && mapped.some((m) => m.address === s) ? s : mapped[0].address));
      localStorage.setItem(STORAGE, `extension:${mapped[0].address}`);
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setConnecting(false);
    }
  }, []);

  const connectDev = useCallback(async () => {
    if (!publicConfig.devWallets) return;
    const pairs = await devPairs();
    const mapped = pairs.map((p) => ({ address: p.pair.address, name: `${p.name} (dev)`, source: 'dev' as const }));
    setAccounts(mapped);
    setSelected((s) => (s && mapped.some((m) => m.address === s) ? s : mapped[0].address));
    localStorage.setItem(STORAGE, `dev:${mapped[0].address}`);
  }, []);

  const select = useCallback((address: string) => {
    setSelected(address);
    const kind = localStorage.getItem(STORAGE)?.split(':')[0] ?? 'dev';
    localStorage.setItem(STORAGE, `${kind}:${address}`);
  }, []);

  const disconnect = useCallback(() => {
    setAccounts([]);
    setSelected(undefined);
    localStorage.removeItem(STORAGE);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE);
    if (!saved) return;
    const [kind, address] = saved.split(':');
    // Deferred so the restore never sets state synchronously inside this effect.
    Promise.resolve()
      .then(() => (kind === 'dev' ? connectDev() : connectExtension()))
      .then(() => address && setSelected(address))
      .catch(() => undefined);
  }, [connectDev, connectExtension]);

  const account = accounts.find((a) => a.address === selected);

  const signer = useCallback(async (): Promise<NativeSigner> => {
    if (!account) throw new Error('Connect a Portaldot wallet first');
    if (account.source === 'dev') {
      const p = (await devPairs()).find((d) => d.pair.address === account.address);
      if (!p) throw new Error('dev account not found');
      return p.pair;
    }
    const { web3FromAddress } = await import('@polkadot/extension-dapp');
    const injector = await web3FromAddress(account.address);
    return { address: account.address, signer: injector.signer };
  }, [account]);

  const signMessage = useCallback(
    async (message: string): Promise<`0x${string}`> => {
      if (!account) throw new Error('Connect a Portaldot wallet first');
      const { stringToHex, stringToU8a, u8aToHex } = await import('@polkadot/util');
      if (account.source === 'dev') {
        const p = (await devPairs()).find((d) => d.pair.address === account.address)!;
        return u8aToHex(p.pair.sign(stringToU8a(message)));
      }
      const { web3FromAddress } = await import('@polkadot/extension-dapp');
      const injector = await web3FromAddress(account.address);
      if (!injector.signer.signRaw) throw new Error('This wallet cannot sign messages');
      const { signature } = await injector.signer.signRaw({ address: account.address, data: stringToHex(message), type: 'bytes' });
      return signature;
    },
    [account],
  );

  const value = useMemo<NativeWallet>(
    () => ({ account, accounts, connecting, error, connectExtension, connectDev, select, disconnect, signer, signMessage }),
    [account, accounts, connecting, error, connectExtension, connectDev, select, disconnect, signer, signMessage],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNativeWallet(): NativeWallet {
  const v = useContext(Ctx);
  if (!v) throw new Error('useNativeWallet outside NativeWalletProvider');
  return v;
}
