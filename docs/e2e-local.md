# Reachpot end-to-end run (Local dev chain)

Run 2026-10-22T19:43:18.088Z · contract `0x3ed62137c5db927cb137c26455969116bf0c23cb` · campaign #4 · web http://localhost:3000

| Step | Detail | Tx |
|---|---|---|
| brand approves rUSD via native-asset precompile | 10,000 rUSD → 0x00002f1600000000000000000000000000010000 | `0x26d7eca126f7392e643ce94dde3ec986a9b1ad128a557eca229fe2d7543a3951` |
| brand creates campaign (pool escrowed on-chain) | #4: 10,000 rUSD pool, 4,000 cap/creator, window 45s | `0xbe591f0e64791c91f17809b24cd47aee6e5b90f9a1d82bf1080cef26cfd72940` |
| campaign rules registered (hash-bound to rulesHash) | 0x6f831c08bb44b0f0c892be0373cefeaf5f98f31e677e6ef54e14aa6d15088dcc |  |
| creator 1 submits a Short (signed) | rptnbqoaxxx · verified · payout H160 0x41dccbd49b26c50d34355ed86ff0fa9e489d1e01 · 142,000 views |  |
| creator 2 submits a Short (signed) | rptnbqobxxx · verified · payout H160 0xe2235a2ffe0354b27a6a1c543be6bf2920ff2134 · 42,500 views |  |
| creator 3 submits a Short (signed) | rptnbqocxxx · verified · payout H160 0xa799a942f85792ddc0028a7dd32b582e75d5e57b · 13,100 views |  |
| creator 4 submits a Short (signed) | rptnbqodxxx · verified · payout H160 0x203aedc6e1ee061f55ec52309d5ac8674d4e8352 · 60 views |  |
| keeper stores snapshot in TransactionStorage | block #4925, extrinsic 2, blake2-256 0x922f5d6e07c38e98c8ade85e7010940182b23bd97282bcf95133cbdde9e5fbec | `0x31151b3d66e1decfae18d5d348b43babb2a9ac01cd2d4448a9b759d7391c13bc` |
| oracle posts payout root (Reachpot.postRoot) | 0xba4f01f60093297abef7f59c0b8b0664a2b5e6abcb20b50ef591c04de77b0525 | `0x86253d349c73822543a50b7954bf7ef2666c1b22afdf1b60cbb1dbec545da713` |
| payout paid | 0x41dccbd49b26c50d34355ed86ff0fa9e489d1e01 ← 4,000 rUSD | `0xc8261b5cbc8c6f6653099410d10a8e2f75f03429c2c8c7c8394b8cc0ca94ace2` |
| payout paid | 0xa799a942f85792ddc0028a7dd32b582e75d5e57b ← 2,000 rUSD | `0xc8261b5cbc8c6f6653099410d10a8e2f75f03429c2c8c7c8394b8cc0ca94ace2` |
| payout paid | 0xe2235a2ffe0354b27a6a1c543be6bf2920ff2134 ← 4,000 rUSD | `0xc8261b5cbc8c6f6653099410d10a8e2f75f03429c2c8c7c8394b8cc0ca94ace2` |
| soulbound creator badges minted/updated (Nfts) | Creator badges: 0 minted, 3 updated (soulbound NFTs) | `0x94ed89e9b3dd4ec7952322fe3a1eb96c768c3134a9c78c47476913c298b751e2` |
| anyone verifies: chain data → blake2 hash → recomputed root | hash 0x922f5d6e07c38e98c8ade85e7010940182b23bd97282bcf95133cbdde9e5fbec = on-chain; root 0xba4f01f60093297abef7f59c0b8b0664a2b5e6abcb20b50ef591c04de77b0525 = on-chain |  |
| creator cashes out on the native DEX (AssetConversion) | 7,000 rUSD → ~41,438.1832 DEV | `0x4c610227e2bed369d3a8b05faf9ab833a8502022b78255af35048e43772db314` |
| brand refund | nothing left over: the whole pot went to creators |  |
