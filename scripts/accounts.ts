// Prints the testnet accounts in .env and their tPOT balances.
import { NATIVE_DECIMALS, evmClients, fmt, freeBalance, mappedAccount, nativeAdmin, nativeApi } from './lib/portaldot.js';

const api = await nativeApi();
const admin = nativeAdmin();
const { account } = evmClients();
const deployerNative = await mappedAccount(api, account.address);

const rows = [
  ['native admin (sr25519)', admin.address, await freeBalance(api, admin.address)],
  [`EVM deployer ${account.address}`, deployerNative, await freeBalance(api, deployerNative)],
] as const;

for (const [label, addr, bal] of rows) console.log(`${label}\n  ${addr}  ${fmt(bal, NATIVE_DECIMALS)} tPOT`);
await api.disconnect();
