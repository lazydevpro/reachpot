# Reachpot end-to-end run (Local dev chain)

Run 2026-10-22T19:15:51.138Z · contract `0x3ed62137c5db927cb137c26455969116bf0c23cb` · campaign #1 · web http://localhost:3000

| Step | Detail | Tx |
|---|---|---|
| brand approves rUSD via native-asset precompile | 10,000 rUSD → 0x00002f1600000000000000000000000000010000 | `0x4e613ee91311337e77575a02669773e4262e6d4d49e405c7d3e301f1ee57571d` |
| brand creates campaign (pool escrowed on-chain) | #1: 10,000 rUSD pool, 4,000 cap/creator, window 45s | `0xc1829f139b3bc3ff60561df5c5ed44648dd5708e2a2d6887356e6c2e5b7fb4f9` |
| campaign rules registered (hash-bound to rulesHash) | 0xf06e4ed4e357fd76d9085a0faada9a69d5c069ecbe639b257b3e574b7d802c88 |  |
| creator 1 submits a Short (signed) | rptnbpegxxx · verified · payout H160 0x41dccbd49b26c50d34355ed86ff0fa9e489d1e01 · 142,000 views |  |
| creator 2 submits a Short (signed) | rptnbpehxxx · verified · payout H160 0xe2235a2ffe0354b27a6a1c543be6bf2920ff2134 · 42,500 views |  |
| creator 3 submits a Short (signed) | rptnbpeixxx · verified · payout H160 0xa799a942f85792ddc0028a7dd32b582e75d5e57b · 13,100 views |  |
| creator 4 submits a Short (signed) | rptnbpejxxx · verified · payout H160 0x203aedc6e1ee061f55ec52309d5ac8674d4e8352 · 60 views |  |
| keeper stores snapshot in TransactionStorage | block #4375, extrinsic 2, blake2-256 0xe960ac53b5793595ce30cdd8d3dc1f4f7f0a2091b3ca067eae1e29b65947f414 | `0x9558dc40de98ef8d47ff34ebca8375ac5460cd7cf78398913fa6689099e61677` |
| oracle posts payout root (Reachpot.postRoot) | 0xba4f01f60093297abef7f59c0b8b0664a2b5e6abcb20b50ef591c04de77b0525 | `0xcebbaf0818fd5da1fd86f312921efde7a68e7a5dab876e5e811ce9a6f66aa3b1` |
| payout paid | 0x41dccbd49b26c50d34355ed86ff0fa9e489d1e01 ← 4,000 rUSD | `0x28c486bfd8330e13ce97be71ecdbf16bebd0524c033734e9809c0d86ec3eb383` |
| payout paid | 0xa799a942f85792ddc0028a7dd32b582e75d5e57b ← 2,000 rUSD | `0x28c486bfd8330e13ce97be71ecdbf16bebd0524c033734e9809c0d86ec3eb383` |
| payout paid | 0xe2235a2ffe0354b27a6a1c543be6bf2920ff2134 ← 4,000 rUSD | `0x28c486bfd8330e13ce97be71ecdbf16bebd0524c033734e9809c0d86ec3eb383` |
| soulbound creator badges minted/updated (Nfts) | Creator badges: 3 minted, 3 updated (soulbound NFTs) | `0x96340c97145981fdf47a8f7d7aa7506732f5c25b530dddf372471a98ccdf3262` |
| anyone verifies: chain data → blake2 hash → recomputed root | hash 0xe960ac53b5793595ce30cdd8d3dc1f4f7f0a2091b3ca067eae1e29b65947f414 = on-chain; root 0xba4f01f60093297abef7f59c0b8b0664a2b5e6abcb20b50ef591c04de77b0525 = on-chain |  |
| creator cashes out on the native DEX (AssetConversion) | 2,000 rUSD → ~12,901.3004 DEV | `0x5885990e5aa046cf8e529e95945682785edbd1667c39b9a498b44cb53895623a` |
| brand refund | nothing left over: the whole pot went to creators |  |
