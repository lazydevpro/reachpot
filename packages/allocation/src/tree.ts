import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import type { Address, Hex } from 'viem';
import type { Allocation } from './allocate';

/** Leaf encoding matches `Reachpot.leaf(address,uint256)`: keccak256(bytes.concat(keccak256(abi.encode(a, amt)))). */
export const LEAF_ENCODING = ['address', 'uint256'];

export interface PayoutTree {
  root: Hex;
  payouts: { account: Address; amount: bigint; proof: Hex[] }[];
}

export function buildTree(allocations: readonly Allocation[]): PayoutTree {
  if (allocations.length === 0) throw new Error('cannot build a payout tree with no allocations');
  const tree = StandardMerkleTree.of(
    allocations.map((a) => [a.account, a.amount.toString()]),
    LEAF_ENCODING,
  );
  return {
    root: tree.root as Hex,
    payouts: allocations.map((a, i) => ({ account: a.account, amount: a.amount, proof: tree.getProof(i) as Hex[] })),
  };
}
