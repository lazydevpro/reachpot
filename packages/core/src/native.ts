// Native (Substrate) side helpers. Works in Node and the browser; import from '@reachpot/core/native'.
import '@polkadot/api-augment';
import { ApiPromise, WsProvider } from '@polkadot/api';
import type { SubmittableExtrinsic } from '@polkadot/api/types';
import type { KeyringPair } from '@polkadot/keyring/types';
import type { Signer } from '@polkadot/types/types';
import { u8aToHex } from '@polkadot/util';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import type { Address } from 'viem';

export const SS58_PREFIX = 42;

export async function connectNative(ws: string): Promise<ApiPromise> {
  return ApiPromise.create({ provider: new WsProvider(ws), noInitWarn: true, throwOnConnect: false });
}

export interface ChainUnits {
  decimals: number;
  /** native-planck → EVM wei multiplier (Revive `NativeToEthRatio`). */
  nativeToEthRatio: bigint;
  existentialDeposit: bigint;
}

export function chainUnits(api: ApiPromise): ChainUnits {
  return {
    decimals: api.registry.chainDecimals[0] ?? 12,
    nativeToEthRatio: BigInt(api.consts.revive.nativeToEthRatio.toString()),
    existentialDeposit: api.consts.balances.existentialDeposit.toBigInt(),
  };
}

/** AssetConversion asset kind (`NativeOrWithId<u32>`). */
export const nativeKind = { Native: null } as const;
export const assetKind = (id: number) => ({ WithId: id });

/** H160 → native account Revive maps it to (the mapped original account, or the 0xEE-padded fallback). */
export async function accountOfH160(api: ApiPromise, h160: Address): Promise<string> {
  const id = await api.call.reviveApi.accountId(h160);
  return encodeAddress(id.toU8a(), SS58_PREFIX);
}

/** Native account → the H160 Revive uses for it. Payouts to this H160 land in the native account once it is mapped. */
export async function h160OfAccount(api: ApiPromise, ss58: string): Promise<Address> {
  const h = await api.call.reviveApi.address(ss58);
  return h.toHex() as Address;
}

export async function isMapped(api: ApiPromise, ss58: string): Promise<boolean> {
  const h160 = await h160OfAccount(api, ss58);
  const original = await api.query.revive.originalAccount(h160);
  return original.isSome;
}

export async function freeBalance(api: ApiPromise, who: string): Promise<bigint> {
  return (await api.query.system.account(who)).data.free.toBigInt();
}

export async function assetBalance(api: ApiPromise, assetId: number, who: string): Promise<bigint> {
  const acc = await api.query.assets.account(assetId, who);
  return acc.isSome ? acc.unwrap().balance.toBigInt() : 0n;
}

export function normalizeSs58(addr: string): string {
  return encodeAddress(decodeAddress(addr), SS58_PREFIX);
}

export function publicKeyHex(addr: string): string {
  return u8aToHex(decodeAddress(addr));
}

export type NativeSigner = KeyringPair | { address: string; signer: Signer };

export interface NativeReceipt {
  txHash: string;
  blockHash: string;
  blockNumber: number;
  extrinsicIndex: number;
  events: { section: string; method: string; data: unknown }[];
}

/** Sign, submit, wait for inclusion. Rejects with the decoded module error (e.g. `assets.NoProvider`) on failure. */
export function sendNative(
  api: ApiPromise,
  tx: SubmittableExtrinsic<'promise'>,
  from: NativeSigner,
  onStatus?: (status: string) => void,
): Promise<NativeReceipt> {
  return new Promise((resolve, reject) => {
    let unsub: (() => void) | undefined;
    let done = false;
    const finish = (fn: () => void) => {
      if (done) return;
      done = true;
      unsub?.();
      fn();
    };
    const [account, options] = 'signer' in from && !('sign' in from) ? [from.address, { signer: from.signer }] : [from as KeyringPair, {}];
    tx.signAndSend(account as never, options, async (result) => {
      onStatus?.(result.status.type);
      const failed = result.events.find(({ event }) => api.events.system.ExtrinsicFailed.is(event));
      const dispatchError = result.dispatchError ?? (failed ? (failed.event.data[0] as never) : undefined);
      if (dispatchError) {
        const err = dispatchError as typeof result.dispatchError & {};
        let msg = err.toString();
        if (err.isModule) {
          const meta = api.registry.findMetaError(err.asModule);
          msg = `${meta.section}.${meta.name}${meta.docs.length ? `: ${meta.docs.join(' ')}` : ''}`;
        }
        return finish(() => reject(new Error(msg)));
      }
      if (result.status.isInBlock || result.status.isFinalized) {
        const blockHash = (result.status.isInBlock ? result.status.asInBlock : result.status.asFinalized).toHex();
        const header = await api.rpc.chain.getHeader(blockHash);
        finish(() =>
          resolve({
            txHash: tx.hash.toHex(),
            blockHash,
            blockNumber: header.number.toNumber(),
            extrinsicIndex: result.txIndex ?? -1,
            events: result.events.map(({ event }) => ({ section: event.section, method: event.method, data: event.data.toHuman() })),
          }),
        );
      } else if (result.isError) {
        finish(() => reject(new Error(`transaction ${result.status.type}`)));
      }
    })
      .then((u) => {
        unsub = u;
        if (done) u();
      })
      .catch((e) => finish(() => reject(e)));
  });
}

/** Read the payload of a `transactionStorage.store` extrinsic back from its block. */
export async function readStoredData(api: ApiPromise, blockNumber: number, extrinsicIndex: number): Promise<Uint8Array> {
  const hash = await api.rpc.chain.getBlockHash(blockNumber);
  const { block } = await api.rpc.chain.getBlock(hash);
  const ext = block.extrinsics[extrinsicIndex];
  if (!ext) throw new Error(`no extrinsic ${blockNumber}-${extrinsicIndex}`);
  if (ext.method.section !== 'transactionStorage' || ext.method.method !== 'store') {
    throw new Error(`extrinsic ${blockNumber}-${extrinsicIndex} is ${ext.method.section}.${ext.method.method}, not transactionStorage.store`);
  }
  return (ext.method.args[0] as unknown as { toU8a: (bare: boolean) => Uint8Array }).toU8a(true);
}
