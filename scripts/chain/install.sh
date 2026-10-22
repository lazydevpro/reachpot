#!/usr/bin/env bash
# Downloads Parity's official kitchensink node + eth-rpc (the runtime Portaldot V3 is based on) into .bin/, sha256-verified.
set -euo pipefail
TAG="${POLKADOT_SDK_TAG:-polkadot-stable2606-3}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
case "$(uname -s)-$(uname -m)" in
  Darwin-arm64) SUFFIX="-aarch64-apple-darwin" ;;
  Linux-x86_64) SUFFIX="" ;;
  *) echo "unsupported platform $(uname -s)-$(uname -m)"; exit 1 ;;
esac
mkdir -p "$ROOT/.bin" && cd "$ROOT/.bin"
for bin in substrate-node eth-rpc; do
  n="$bin$SUFFIX"
  if [ -x "$bin" ]; then echo "✓ $bin present"; continue; fi
  url="https://github.com/paritytech/polkadot-sdk/releases/download/$TAG/$n"
  curl -sSfL -o "$n" "$url" && curl -sSfL -o "$n.sha256" "$url.sha256"
  [ "$(awk '{print $1}' "$n.sha256")" = "$(shasum -a 256 "$n" | awk '{print $1}')" ] || { echo "sha256 mismatch for $n"; rm -f "$n"; exit 1; }
  chmod +x "$n" && mv "$n" "$bin" && rm -f "$n.sha256"
  echo "✓ $bin ($TAG) verified"
done
