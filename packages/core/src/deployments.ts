// Deployments committed to the repo, bundled at build time so serverless hosts (Vercel) don't need filesystem access.
// The local chain's deployment changes on every restart and is read from disk instead (see apps/web env.ts).
import testnet from '../../../deployments/testnet.json';
import type { Deployment, NetworkName } from './networks';

export const BUNDLED_DEPLOYMENTS: Partial<Record<NetworkName, Deployment>> = {
  testnet: testnet as Deployment,
};
