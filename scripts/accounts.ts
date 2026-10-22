// Prints the accounts a network uses and their native balances. `pnpm accounts [--network testnet]`
import { fmtUnits } from '@reachpot/core';
import { accountOfH160, freeBalance } from '@reachpot/core/native';
import { evmRoles, nativeAdmin, native, net } from './lib/ctx.js';

const { api, units } = await native();
const admin = await nativeAdmin();
const rows: [string, string][] = [[`native admin (sr25519)`, admin.address]];
for (const [role, acct] of Object.entries(evmRoles())) rows.push([`${role} ${acct.address}`, await accountOfH160(api, acct.address)]);

console.log(`${net.label} (${net.ws})`);
for (const [label, ss58] of rows) {
  console.log(`${label}\n  ${ss58}  ${fmtUnits(await freeBalance(api, ss58), units.decimals)} ${net.symbol}`);
}
await api.disconnect();
