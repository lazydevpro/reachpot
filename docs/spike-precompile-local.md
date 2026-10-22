# Spike: native-asset ERC-20 precompile write path (Local dev chain)

Run 2026-10-22T11:29:21.203Z · chain id 420420420 · native decimals 12

- rUSD native asset `789179` → precompile `0x000c0abb00000000000000000000000000010000`
- PrecompileProbe `0xc01ee7f10ea4af4673cfff62710e1d7792aba8f3`

| Step | Result | Detail | Tx |
|---|---|---|---|
| fund brand native account (20× ED) | ✅ | 5Em1NEHgVvpXYBEzWeNf9JzuLyvuyyn3ZLifywLQPGdqFVU2 | `0x2bd4fc5afb3426288f95703e7570c6ba068d1237739c509ede2efc998790644d` |
| create native asset + mint to brand | ✅ | asset 789179 | `0xaeebeac9ca95be46178f77f817fe794fc1d70e7d1c451487dcf342129bc47258` |
| precompile balanceOf(brand) | ✅ | 1,000,000 rUSD at 0x000c0abb00000000000000000000000000010000 |  |
| deploy PrecompileProbe | ✅ | 0xc01ee7f10ea4af4673cfff62710e1d7792aba8f3 | `0xa5590c2a8bbf74ab25882eb82131f4ca56d7fadec89f8b2efa8d99604132590b` |
| approve via precompile | ✅ | allowance 100 | `0x964f9a334e6893daef7a9fb86c228062005618d1baccb923447e5042e5b033b5` |
| contract transferFrom (pull) | ✅ | probe holds 100 rUSD | `0x45b47da1ded149109aa07e22234a64543da24c025f4f93459b69274f8364d5b3` |
| push → fresh H160, no native balance | ❌ | inner ok=false received=0 ret=0x | `0xd017eb6d0517f73613eca96926fcc38a56ea55fd6591a9bdfde8990a420fdd74` |
| send ED to fresh H160 via EVM | ✅ | 0x16FF5a79E2A84bd6F2b3B00074058a8f91Ecf9aA | `0x330859139e7684424f371e830bcd98da923be0b34c0a55c8f7c18f0c7dc86f88` |
| push → fresh H160 with ED | ✅ | inner ok=true received=10 | `0x0558ab0dee9e6323a6272da29b419d044bc254487b674923873f87b3e7878785` |
| assets.touchOther fresh H160 (admin pays deposit) | ✅ | 0x2823714ED244F1964cC9390422A340c20C2BC23c | `0x85e985c67bbc20518680b23078add6c241384b052ce8f20dc70f7ea484da8818` |
| push → fresh H160 touched by admin | ✅ | inner ok=true received=10 | `0x9b7ddf5dc6945238f7877effe2125bd711bdac5b8104a94baed4b678640ad3f3` |
| push → mapped native creator 5FHneW46… (H160 0x41dccbd4…) | ✅ | inner ok=true received=10 | `0x48f2ef48a76ca02a0971f47d7cc4cdb3e7402229ae4e9167468fac326435b4bc` |
| payout landed in creator native account | ✅ | native assets.account(789179, Bob) = 10000000 (existed before: false); native free 1000000000000000000000 |  |
