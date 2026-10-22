import { getNetwork, type NetworkConfig } from '@reachpot/core';

/** Client-safe config. `NEXT_PUBLIC_NETWORK` selects local | testnet; deployment addresses come from /api/config. */
export const publicConfig: { network: NetworkConfig; devWallets: boolean } = {
  network: getNetwork(process.env.NEXT_PUBLIC_NETWORK ?? 'local'),
  /** Local chain only: offer the well-known dev accounts as in-browser wallets so the demo needs no extension. */
  devWallets: (process.env.NEXT_PUBLIC_NETWORK ?? 'local') === 'local',
};
