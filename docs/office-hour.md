Project Name: Reachpot (BUIDL 50212) — Ecosystem DApps
GitHub Repo Link: https://github.com/lazydevpro/reachpot
BUIDL: https://dorahacks.io/build/50212

Completed Modules:
• Reachpot.sol on Portaldot V3 EVM: escrows a pot in any native Assets token via the ERC-20 precompile, payout root pinned to an on-chain snapshot, dispute window, refunds (forge test 23/23)
• Allocation engine: capped pro-rata split, Merkle tree, snapshot format, verify CLI (17/17 tests)
• Keeper: snapshot in TransactionStorage → postRoot → payouts to Revive-mapped native accounts → soulbound badges (Nfts)
• Web app: brand + creator flows, in-browser verification of the split, one-tap cash-out on AssetConversion
• Docs: README + architecture diagram, deploy/testnet runbooks, pitch deck PDF; check-in PASSED

Testnet Deployment Status (Portaldot V3, EVM chain 420420777):
• Reachpot: 0xcfcdb8ccac9b95534aedbbe9c90e49a6a1d493cf (block 150,033)
• Full lifecycle run: snapshot at block 157,841 → 2 creators paid 4,000 rUSD each → badges → DEX cash-out → 2,000 rUSD refunded. All tx hashes: https://github.com/lazydevpro/reachpot/blob/main/docs/e2e-testnet.md

Demo link: https://reachpot.vercel.app (video: https://youtu.be/EtGjwMlh9Zg)

Topics You Want to Discuss:
1. View counts: one keeper reports views today. Best way to make this trustless on Portaldot: an oracle pallet, multiple oracles, or zkTLS?
2. Snapshot storage: how long does TransactionStorage keep data on mainnet? Snapshots must stay readable after payouts.
3. New creators: can we sponsor the account-mapping deposit (~3.3 tPOT) and fees so creators start with zero POT?
4. Launch partners: can you connect us with Portaldot projects to fund the first campaigns in their own tokens?
5. Fees: should our protocol fee be in POT or in the campaign's token?
