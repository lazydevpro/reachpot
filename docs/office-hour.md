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
1. View oracle trust: moving from simulated views to the YouTube Data API. What attestation would Portaldot accept (oracle pallet, multi-oracle, zkTLS)?
2. TransactionStorage retention: snapshots must stay verifiable after payout. What is the mainnet storage period, and is reading them from an archive node the right pattern?
3. Creator onboarding: can the revive.mapAccount deposit (~3.3 tPOT) and fees be sponsored for first-time creators? Will mainnet deposit rates match testnet?
4. Ecosystem: Portaldot projects as launch brands paying in their own tokens, plus liquidity support for their AssetConversion pools
5. Business model: protocol fee in POT or in the pot's token?
