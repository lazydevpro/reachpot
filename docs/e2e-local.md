# Reachpot end-to-end run (Local dev chain)

Run 2026-10-22T12:12:36.233Z · contract `0x970951a12f975e6762482aca81e57d5a2a4e73f4` · campaign #4 · web http://localhost:3000

| Step | Detail | Tx |
|---|---|---|
| brand approves rUSD via native-asset precompile | 10,000 rUSD → 0x00003a9c00000000000000000000000000010000 | `0xfa952fca96e3a48a5be810116e2356e658e72aae2f175c542ed72e9b6c7afba3` |
| brand creates campaign (pool escrowed on-chain) | #4: 10,000 rUSD pool, 4,000 cap/creator, window 45s | `0x98384012d5c8c3f342b6736ac0c08ebf169cfe3c344e3314ac78a79e1c12e996` |
| campaign rules registered (hash-bound to rulesHash) | 0xa8b3ec5dfdc75e4ce2372d14267a23cd001989902a179dd2e8c7cbaa360601a7 |  |
| creator 1 submits a Short (signed) | rptnb5t0xxx · verified · payout H160 0x41dccbd49b26c50d34355ed86ff0fa9e489d1e01 · 142,000 views |  |
| creator 2 submits a Short (signed) | rptnb5t1xxx · verified · payout H160 0xe2235a2ffe0354b27a6a1c543be6bf2920ff2134 · 42,500 views |  |
| creator 3 submits a Short (signed) | rptnb5t2xxx · verified · payout H160 0xa799a942f85792ddc0028a7dd32b582e75d5e57b · 13,100 views |  |
| creator 4 submits a Short (signed) | rptnb5t3xxx · verified · payout H160 0x203aedc6e1ee061f55ec52309d5ac8674d4e8352 · 60 views |  |
| keeper stores snapshot in TransactionStorage | block #697, extrinsic 2, blake2-256 0x6581db5b5615855cdb6ca1ac64d6b6e7c7b18ff79c04b8f4f16b6a55d083e0c7 | `0xbd4c8f01f6f3711c366af305c664c58436c935af2f5e679db370bacd3b5a9cd2` |
| oracle posts payout root (Reachpot.postRoot) | 0xba4f01f60093297abef7f59c0b8b0664a2b5e6abcb20b50ef591c04de77b0525 | `0x5ebc38c9a107d799662138991c5d9c96900f1eee579b014c5b67a0898259049e` |
| payout paid | 0x41dccbd49b26c50d34355ed86ff0fa9e489d1e01 ← 4,000 rUSD | `0xd53c296907a717932eafd8e367de7169ffa5e53475fd43b3f68f3971d08c0ed1` |
| payout paid | 0xa799a942f85792ddc0028a7dd32b582e75d5e57b ← 2,000 rUSD | `0xd53c296907a717932eafd8e367de7169ffa5e53475fd43b3f68f3971d08c0ed1` |
| payout paid | 0xe2235a2ffe0354b27a6a1c543be6bf2920ff2134 ← 4,000 rUSD | `0xd53c296907a717932eafd8e367de7169ffa5e53475fd43b3f68f3971d08c0ed1` |
| soulbound creator badges minted/updated (Nfts) | Creator badges: 0 minted, 3 updated (soulbound NFTs) | `0xf6c9ddd973911b005bf3654286d4d1ffe82f11261e3b4944ae00acb66b302153` |
| anyone verifies: chain data → blake2 hash → recomputed root | hash 0x6581db5b5615855cdb6ca1ac64d6b6e7c7b18ff79c04b8f4f16b6a55d083e0c7 = on-chain; root 0xba4f01f60093297abef7f59c0b8b0664a2b5e6abcb20b50ef591c04de77b0525 = on-chain |  |
| creator cashes out on the native DEX (AssetConversion) | 5,500 rUSD → ~31,199.8401 DEV | `0x98a98738687e0462755559652128654b801db26d04e3b848541b1bfb14a73309` |
| brand refund | nothing left over: the whole pot went to creators |  |
