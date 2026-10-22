# Reachpot end-to-end run (Local dev chain)

Run 2026-10-22T11:56:27.917Z · contract `0x970951a12f975e6762482aca81e57d5a2a4e73f4` · campaign #2 · web http://localhost:3000

| Step | Detail | Tx |
|---|---|---|
| brand approves rUSD via native-asset precompile | 10,000 rUSD → 0x00003a9c00000000000000000000000000010000 | `0xea5b62f413a543e64f53eb16a0d67a499006b7f432d388bf1c1bfb84ee703819` |
| brand creates campaign (pool escrowed on-chain) | #2: 10,000 rUSD pool, 4,000 cap/creator, window 45s | `0x8ff779c9924fef1f48b464a3ee5fff9d8725a246b462f1153ecd6181b68bd67e` |
| campaign rules registered (hash-bound to rulesHash) | 0xd1dd893e501c485ba5b582c9efd0b57134fb805ae18857e55e16b435bf39f4db |  |
| creator 1 submits a Short (signed) | rptnb51wxxx · verified · payout H160 0x41dccbd49b26c50d34355ed86ff0fa9e489d1e01 · 142,000 views |  |
| creator 2 submits a Short (signed) | rptnb51xxxx · verified · payout H160 0xe2235a2ffe0354b27a6a1c543be6bf2920ff2134 · 42,500 views |  |
| creator 3 submits a Short (signed) | rptnb51yxxx · verified · payout H160 0xa799a942f85792ddc0028a7dd32b582e75d5e57b · 13,100 views |  |
| creator 4 submits a Short (signed) | rptnb51zxxx · verified · payout H160 0x203aedc6e1ee061f55ec52309d5ac8674d4e8352 · 60 views |  |
| keeper stores snapshot in TransactionStorage | block #375, extrinsic 2, blake2-256 0xb818b6fc2f25e859c4813ce940327467f82004ac6293cbafc6de045c5032adc0 | `0x30c4d895aeaf28c0c47cb3e0061a985bfd3776dc32a57af5c3a367148c7c35b2` |
| oracle posts payout root (Reachpot.postRoot) | 0xba4f01f60093297abef7f59c0b8b0664a2b5e6abcb20b50ef591c04de77b0525 | `0xc087b0dd39b793278858d895e5e94628e5f5ea48ae3c745ddc709bd62e6ebddb` |
| payout paid | 0x41dccbd49b26c50d34355ed86ff0fa9e489d1e01 ← 4,000 rUSD | `0x387f29b02de424ea6971a3ca5c84cf91014bbf04e1b4680314815007006f342c` |
| payout paid | 0xa799a942f85792ddc0028a7dd32b582e75d5e57b ← 2,000 rUSD | `0x387f29b02de424ea6971a3ca5c84cf91014bbf04e1b4680314815007006f342c` |
| payout paid | 0xe2235a2ffe0354b27a6a1c543be6bf2920ff2134 ← 4,000 rUSD | `0x387f29b02de424ea6971a3ca5c84cf91014bbf04e1b4680314815007006f342c` |
| soulbound creator badges minted/updated (Nfts) | Creator badges: 0 minted, 3 updated (soulbound NFTs) | `0x3cc808b9dd3bd630f25a1df32ddc99bcb277daa1d10aad8734f0172682aa428f` |
| anyone verifies: chain data → blake2 hash → recomputed root | hash 0xb818b6fc2f25e859c4813ce940327467f82004ac6293cbafc6de045c5032adc0 = on-chain; root 0xba4f01f60093297abef7f59c0b8b0664a2b5e6abcb20b50ef591c04de77b0525 = on-chain |  |
| creator cashes out on the native DEX (AssetConversion) | 4,000 rUSD → ~25,309.5706 DEV | `0x92e398ac751ecb4d0b993d3958bb3ed3a9e41787d18fd18e6394b0d029e50190` |
| brand refund | nothing left over: the whole pot went to creators |  |
