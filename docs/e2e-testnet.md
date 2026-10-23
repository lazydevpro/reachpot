# Reachpot end-to-end run (Portaldot V3 Testnet)

Run 2026-10-23T08:33:38.053Z · contract `0xcfcdb8ccac9b95534aedbbe9c90e49a6a1d493cf` · campaign #1 · web https://reachpot.vercel.app

| Step | Detail | Tx |
|---|---|---|
| fund EVM roles (gas + Revive storage deposits) | 0xEbe6D5dF1516B8B572a2F8009c50637B39822519 ← 70.812 tPOT | `0x0b860a12ca938938557e345e3b4e07983865b4988005a26e1ec008eb867ab4cc` |
| brand approves rUSD via native-asset precompile | 10,000 rUSD → 0x00001e5a00000000000000000000000000010000 | `0x1b12ae331bbb99705978cc095956e50d06a40c381485790c67323368b3dbea0e` |
| brand creates campaign (pool escrowed on-chain) | #1: 10,000 rUSD pool, 4,000 cap/creator, window 300s | `0x67d18fcf7086cb11104c3768210eade840ddbe81810d8523dacad8ff679680ae` |
| campaign rules registered (hash-bound to rulesHash) | 0x79d9e3d80ca3f707ce329bfb5625b45785aeea288d3ea221b159899f6ca06fda |  |
| fund demo creator (mapping deposit + fees) | 5GRKbc9T2DY4jP8MBpR7Ln8NCdGnWpyzfiUuxCx9PRB72jCk ← 4.25 tPOT | `0x979da2915bdb8e24450948ed093ebc9de95a40d607bf6c5d3518f16479a69075` |
| fund demo creator (mapping deposit + fees) | 5F9onJQHRM8SSGLvunEYgwVuEuZz6rpELqoWMtg62HVzji94 ← 4.25 tPOT | `0xa8e34d943ffb7726ef8edb6556ca7fc7a138626171960b04297054baf8859649` |
| creator 1 submits a Short (signed) | rptncpkkxxx · verified · payout H160 0x820e207b16b6deb6ea36335695d71e79da6576b4 · 42,500 views |  |
| creator 2 submits a Short (signed) | rptncpklxxx · verified · payout H160 0x2ea1188589fbde5ac3907a477c6ae8b1ba01e122 · 13,100 views |  |
| keeper stores snapshot in TransactionStorage | block #157841, extrinsic 1, blake2-256 0x2e31a539ac1edda1816fc5bae9c54ffd9311006b03e567b589036965e2019050 | `0x42976cafd6568aa8cea6d1a5a292cf775ae170e37e9a5c21ca3d3b1b409a7fc0` |
| oracle posts payout root (Reachpot.postRoot) | 0x61594e7ddc8476ba0dfa104e35d4d1d95aa2cfaec7fd139bca15af729d5a70e3 | `0x149f6ab9763b23a03bc72926dd9ceb913ac98a62d9f680852de2ee501dd066cf` |
| payout paid | 0x2ea1188589fbde5ac3907a477c6ae8b1ba01e122 ← 4,000 rUSD | `0x00cd99e22aa80e351a646c5aeb4afdf7d4a5840b9c6ac75d5f5a576db211d057` |
| payout paid | 0x820e207b16b6deb6ea36335695d71e79da6576b4 ← 4,000 rUSD | `0x00cd99e22aa80e351a646c5aeb4afdf7d4a5840b9c6ac75d5f5a576db211d057` |
| soulbound creator badges minted/updated (Nfts) | Creator badges: 2 minted, 2 updated (soulbound NFTs) | `0x802d380f044ff9a8b2b842fe927ce6e29403437ec8b9aa283e5d4e4e1cc7bcf0` |
| anyone verifies: chain data → blake2 hash → recomputed root | hash 0x2e31a539ac1edda1816fc5bae9c54ffd9311006b03e567b589036965e2019050 = on-chain; root 0x61594e7ddc8476ba0dfa104e35d4d1d95aa2cfaec7fd139bca15af729d5a70e3 = on-chain |  |
| creator cashes out on the native DEX (AssetConversion) | 2,000 rUSD → ~0.0209 tPOT | `0x262b4361428d483e3d0adbd0b0b6c17b96d08d520519aecf8dc231f796c78e7b` |
| brand reclaims unallocated remainder | 2,000 rUSD | `0x206d7eaf5ef5c254863f0a1e01b4355d80cebdc0883b57345d5f62b6b5c01dca` |
