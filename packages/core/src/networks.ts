import { defineChain, type Address, type Chain, type Hex } from 'viem';

export type NetworkName = 'local' | 'testnet';

export interface NetworkConfig {
  name: NetworkName;
  label: string;
  ws: string;
  evmRpc: string;
  chainId: number;
  /** Native token symbol as shown in the UI (the chain itself may not report one). */
  symbol: string;
  explorer?: string;
}

export const NETWORKS: Record<NetworkName, NetworkConfig> = {
  local: {
    name: 'local',
    label: 'Local dev chain',
    ws: 'ws://127.0.0.1:9944',
    evmRpc: 'http://127.0.0.1:8545',
    chainId: 420420420,
    symbol: 'DEV',
  },
  testnet: {
    name: 'testnet',
    label: 'Portaldot V3 Testnet',
    ws: 'wss://test-node-v3.portaldot.dev',
    evmRpc: 'https://test-evm-rpc-v3.portaldot.dev',
    chainId: 420420777,
    symbol: 'tPOT',
    explorer: 'https://node-console.portaldot.dev',
  },
};

export function getNetwork(name: string | undefined): NetworkConfig {
  const n = (name ?? 'local') as NetworkName;
  if (!(n in NETWORKS)) throw new Error(`unknown network "${name}" (expected local | testnet)`);
  return NETWORKS[n];
}

/** EVM-side chain definition. Revive always exposes the native balance with 18 decimals. */
export function evmChain(net: NetworkConfig): Chain {
  return defineChain({
    id: net.chainId,
    name: net.label,
    nativeCurrency: { name: net.symbol, symbol: net.symbol, decimals: 18 },
    rpcUrls: { default: { http: [net.evmRpc] } },
  });
}

/** Explorer link for a native block / extrinsic (polkadot.js apps style console). */
export function explorerBlockUrl(net: NetworkConfig, blockHashOrNumber: string | number): string | undefined {
  if (!net.explorer) return undefined;
  return `${net.explorer}/?rpc=${encodeURIComponent(net.ws)}#/explorer/query/${blockHashOrNumber}`;
}

/**
 * Well-known public dev keys of the local kitchensink chain (`substrate-node --dev`, `eth-rpc --dev`).
 * They hold funds only on a throwaway local chain — never use them anywhere else.
 */
export const LOCAL_DEV = {
  native: {
    admin: '//Alice',
    creators: ['//Bob', '//Charlie', '//Dave', '//Eve', '//Ferdie'],
  },
  evm: {
    deployer: { name: 'Alith', key: '0x5fb92d6e98884f76de468fa3f6278f8807c48bebc13595d45af5bdc4da702133' as Hex },
    oracle: { name: 'Baltathar', key: '0x8075991ce870b93a8870eca0c0f91913d12f47948ca0fd25b49c6fa7cdbeee8b' as Hex },
    guardian: { name: 'Charleth', key: '0x0b6e18cafb6ed99687ec547bd28139cafdd2bffe70e6b688025de6b445aa5c5b' as Hex },
    brand: { name: 'Dorothy', key: '0x39539ab1876910bbf3a223d84a29e28f1cb4e2e456503e7e91ed39b2e7223d68' as Hex },
    brand2: { name: 'Ethan', key: '0x7dce9bc8babb68fec1409be38c8e1a52650206a7ed90ff956ae8a6d15eeaaef4' as Hex },
  },
} as const;

/** Written by scripts/deploy.ts to deployments/<network>.json and read by the web app + keeper. */
export interface Deployment {
  network: NetworkName;
  chainId: number;
  deployedAt: string;
  reachpot: { address: Address; deployTx: Hex; blockNumber: number };
  roles: { owner: Address; oracle: Address; guardian: Address; nativeAdmin: string };
  windows: { disputeWindow: number; minMeasurementDelay: number; rootTimeout: number; claimWindow: number };
  native: { decimals: number; symbol: string; nativeToEthRatio: string };
  assets: { id: number; symbol: string; name: string; decimals: number; precompile: Address; pool?: { lpToken: number; tx: string } }[];
  badges: { collection: number; tx: string };
  txs: Record<string, string>;
}
