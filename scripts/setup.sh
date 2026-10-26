#!/bin/sh
# One-time setup that needs only git and Node 22+: fetches the contract libraries (git submodules) and installs the
# workspace. The workspace uses pnpm (workspace: protocol); without a global pnpm it runs the pinned version via npx.
set -e
cd "$(dirname "$0")/.."

if [ ! -f contracts/lib/forge-std/src/Test.sol ] || [ ! -f contracts/lib/openzeppelin-contracts/package.json ]; then
  echo "→ fetching contract libraries (git submodules)"
  git submodule update --init --recursive
fi

if [ ! -f node_modules/.modules.yaml ]; then
  echo "→ installing dependencies"
  if command -v pnpm >/dev/null 2>&1; then
    pnpm install --frozen-lockfile
  else
    npx --yes pnpm@8.6.12 install --frozen-lockfile
  fi
fi
