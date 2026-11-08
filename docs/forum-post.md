Portaldot Hacker House 2026 | Reachpot: Pro-Rata Creator Campaigns Paid in Portaldot Native Assets

---

**Project Introduction**

Reachpot lets a brand or a Portaldot project lock a pot in any Portaldot native asset and pay creators for the reach their YouTube Shorts actually get. When the campaign window closes, the pot splits pro-rata by views with a per-creator cap, every creator is paid on-chain, and anyone can verify the split from data stored on Portaldot.

**Problem Solved**

Brands already pay "clippers" to post Shorts about them, but fixed-CPM programs fail those creators: budgets drain first-come, payouts happen off-chain on the platform's terms, and rejecting a submission saves the brand money. New Portaldot projects have the mirror problem: they need distribution and real utility for their tokens. Reachpot gives both sides a fair, verifiable deal: the pot is escrowed and can't be clawed back while the campaign runs, a capped creator's excess re-splits across everyone else (only what can't be allocated returns to the brand), and creators can cash a project-token payout out to POT on Portaldot's native DEX in one tap.

**Link**

- Live App: https://reachpot.vercel.app
- Demo Video: https://youtu.be/EtGjwMlh9Zg
- GitHub: https://github.com/lazydevpro/reachpot
- Pitch Deck: https://github.com/lazydevpro/reachpot/blob/main/docs/pitch/Reachpot-pitch.pdf
- DoraHacks: https://dorahacks.io/build/50212

**Technical Highlights**

**1. Any Portaldot native asset can fund a pot, with no wrapping and no bridge**
`Reachpot.sol` runs on Revive EVM and escrows Assets-pallet tokens directly through their native-asset ERC-20 precompile. Brands fund from MetaMask; creators use a Portaldot wallet, and after `revive.mapAccount` their EVM payouts land in their native 5… account.

**2. A split anyone can verify**
The keeper computes the capped pro-rata ("water-filling") split, stores the full snapshot on-chain in TransactionStorage, and posts its Merkle root and blake2 hash to the contract. The campaign page re-reads the snapshot from chain and recomputes the root in your browser. A guardian can cancel a bad root during the dispute window, and payouts are permissionless and batched: a failing recipient never blocks the others.

**3. Real YouTube views, with proof of channel ownership**
The hosted app counts views from the YouTube Data API. Each creator gets a code tied to their wallet and the campaign, and a Short only counts once that code is in its description. Videos longer than 3 minutes or published before the campaign are rejected automatically.

**4. Five Portaldot modules working as one product**
Revive EVM + precompiles (escrow), account mapping (payouts to native accounts), TransactionStorage (snapshots), Nfts (soulbound creator badges whose stats are a portable on-chain résumé) and AssetConversion (one-tap cash-out with live quotes). All of them are exercised on the V3 testnet.

**5. Proven on testnet, built for Portaldot's economics**
Contract `0xcfcdb8ccac9b95534aedbbe9c90e49a6a1d493cf`. A full lifecycle ran against the hosted app (with simulated views): snapshot stored at block 157,841, two creators paid 4,000 rUSD each (capped), badges minted, a DEX cash-out, and the 2,000 rUSD remainder refunded to the brand. Every transaction hash is in `docs/e2e-testnet.md`. 23 Foundry tests (unit, fuzz, golden fixtures shared with the TypeScript allocation engine) + 17 allocation tests run in CI, and `npm test` works from a fresh clone. The contract was slimmed from 7.9 KB to 5.9 KB, cutting its Revive deployment deposit from 615 to 448 tPOT.

**Team**

lazydevpro — solo build

- GitHub: @lazydevpro
- X: @lazydevpro
- Telegram: @lazydevpro
- Discord: lazydevpro
- Project nature: a new, Portaldot-native implementation of the pro-rata creator-pool idea from my earlier project ClipPool (USDC campaigns on Arc). All Reachpot code was written during Portaldot Hacker House 2026.

**Judges & Voting Fit**

**For Judges:** Reachpot is deployed on the Portaldot V3 testnet with a complete, verifiable lifecycle (escrow → on-chain snapshot → root → dispute window → payouts → badges → DEX cash-out → refund), every transaction hash documented, and real YouTube views live in the hosted app. It uses Portaldot's native modules as product features rather than decoration, and it gives every Portaldot project a way to turn its token into distribution: fund a pot, and creators bring the audience.

**For Community Voters:** If you make Shorts, Reachpot is built so that you get paid for the views you actually earn: no first-come budget race and no off-chain payout you have to trust. Open https://reachpot.vercel.app/c/1 to see a finished campaign and verify its split yourself in your browser, with no wallet and no setup: it re-reads the snapshot from Portaldot and recomputes the payout root.
