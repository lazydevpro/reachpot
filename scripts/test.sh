#!/bin/sh
# Every test, from a fresh clone: `npm test` (or `pnpm test`). Needs git, Node 22+ and Foundry; no global pnpm.
set -e
cd "$(dirname "$0")/.."
sh scripts/setup.sh

echo "→ allocation engine: water-filling, Merkle, snapshot, golden fixtures (vitest)"
(cd packages/allocation && ./node_modules/.bin/vitest run)

FORGE="$(command -v forge || true)"
if [ -z "$FORGE" ] && [ -x "$HOME/.foundry/bin/forge" ]; then FORGE="$HOME/.foundry/bin/forge"; fi
if [ -z "$FORGE" ]; then
  echo "✗ Foundry is needed for the contract tests. Install it with:" >&2
  echo "    curl -L https://foundry.paradigm.xyz | bash && foundryup" >&2
  echo "  then run npm test again." >&2
  exit 1
fi

echo "→ contracts: unit, fuzz, golden fixtures (forge test)"
(cd contracts && "$FORGE" test)
