// Opens a real campaign for real YouTube Shorts: the brand role funds an rUSD pot on-chain and registers the rules with the
// web app. Creators then submit through the app with their own Portaldot wallet; views come from the YouTube Data API
// (the app must run with YOUTUBE_API_KEY) and the deployed keeper takes it from there: snapshot → root → payouts → badges.
// Usage: npm run live-campaign -- [--network testnet] [--web https://reachpot.vercel.app] [--hours 24] [--delay 3600]
//        [--pool 1000] [--cap 600] [--min-views 10] [--title "…"] [--brief "…"]
import { erc20Abi, keccak256, parseEventLogs, toBytes } from 'viem';
import { fmtUnits, reachpotAbi } from '@reachpot/core';
import { accountOfH160, freeBalance, sendNative } from '@reachpot/core/native';
import { arg, evmClients, evmRoles, loadDeployment, nativeAdmin, native, net } from './lib/ctx.js';

const WEB = arg('web') ?? process.env.WEB_URL ?? (net.name === 'local' ? 'http://localhost:3000' : 'https://reachpot.vercel.app');
const hours = Number(arg('hours') ?? 24);
const delay = Number(arg('delay') ?? 3600);

const dep = loadDeployment();
const { api: chain, units } = await native();
const roles = evmRoles();
const brand = evmClients(roles.brand);
const token = dep.assets.find((a) => a.symbol === 'rUSD')!;
const U = 10n ** BigInt(token.decimals);
const pool = BigInt(arg('pool') ?? 1000) * U;
const cap = BigInt(arg('cap') ?? 600) * U;
const minViews = arg('min-views') ?? '10';
const reachpot = dep.reachpot.address;

const config = (await (await fetch(`${WEB}/api/config`)).json()) as { network: string; reachpot: string; viewsSource: string };
if (config.reachpot.toLowerCase() !== reachpot.toLowerCase()) throw new Error(`${WEB} serves contract ${config.reachpot}, not ${reachpot}`);
if (config.viewsSource !== 'youtube') console.warn(`⚠️  ${WEB} counts views from "${config.viewsSource}", not YouTube`);

// The brand role pays the createCampaign storage deposit (~19 tPOT) from its mapped native account.
if (net.name !== 'local') {
  const nativeAcct = await accountOfH160(chain, roles.brand.address);
  const target = 60n * 10n ** BigInt(units.decimals);
  const free = await freeBalance(chain, nativeAcct);
  if (free < target) {
    const r = await sendNative(chain, chain.tx.balances.transferKeepAlive(nativeAcct, target - free), await nativeAdmin());
    console.log(`✅ funded brand role ${roles.brand.address} with ${fmtUnits(target - free, units.decimals)} ${dep.native.symbol}\n   ${r.txHash}`);
  }
}

const balance = await brand.publicClient.readContract({ address: token.precompile, abi: erc20Abi, functionName: 'balanceOf', args: [roles.brand.address] });
if (balance < pool) throw new Error(`brand holds ${fmtUnits(balance, token.decimals)} rUSD, needs ${fmtUnits(pool, token.decimals)}`);

const now = Math.floor(Date.now() / 1000);
const rules = {
  title: arg('title') ?? 'Reachpot launch: real Shorts, real views',
  brief:
    arg('brief') ??
    'Post a YouTube Short about Reachpot or Portaldot and add your Reachpot code to its description. The pot splits by real YouTube views when the window closes.',
  brandName: 'Reachpot',
  platform: 'youtube-shorts' as const,
  minViews,
};
const rulesHash = keccak256(
  toBytes(JSON.stringify({ schema: 'reachpot.rules/v1', title: rules.title, brief: rules.brief, brandName: rules.brandName, platform: rules.platform, minViews: rules.minViews })),
);

const approveTx = await brand.walletClient.writeContract({ address: token.precompile, abi: erc20Abi, functionName: 'approve', args: [reachpot, pool] });
await brand.publicClient.waitForTransactionReceipt({ hash: approveTx });
console.log(`✅ approved ${fmtUnits(pool, token.decimals)} rUSD via the native-asset precompile\n   ${approveTx}`);

const { request } = await brand.publicClient.simulateContract({
  account: roles.brand,
  address: reachpot,
  abi: reachpotAbi,
  functionName: 'createCampaign',
  args: [
    {
      token: token.precompile,
      pool,
      start: BigInt(now - 5),
      end: BigInt(now + Math.round(hours * 3600)),
      measurementDelay: Math.max(delay, dep.windows.minMeasurementDelay),
      capPerCreator: cap,
      minViews: BigInt(minViews),
      rulesHash,
    },
  ],
});
const createTx = await brand.walletClient.writeContract(request);
const rcpt = await brand.publicClient.waitForTransactionReceipt({ hash: createTx });
const id = Number(parseEventLogs({ abi: reachpotAbi, logs: rcpt.logs, eventName: 'CampaignCreated' })[0].args.id);
console.log(`✅ campaign #${id} created: ${fmtUnits(pool, token.decimals)} rUSD pot, ${fmtUnits(cap, token.decimals)} cap/creator, open ${hours} h\n   ${createTx}`);

const res = await fetch(`${WEB}/api/campaigns`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ campaignId: id, createTx, rules }) });
if (!res.ok) throw new Error(`registering rules failed: ${res.status} ${await res.text()}`);
console.log(`✅ rules registered with ${WEB}\n\nCampaign: ${WEB}/c/${id}\nSubmit:   ${WEB}/c/${id}/submit`);
await chain.disconnect();
