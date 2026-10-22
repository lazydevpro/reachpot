#!/usr/bin/env bash
# Starts a throwaway local chain: kitchensink dev node (ws://127.0.0.1:9944) + eth-rpc (http://127.0.0.1:8545).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BIN="$ROOT/.bin"; LOGS="$BIN/logs"; mkdir -p "$LOGS"
[ -x "$BIN/substrate-node" ] || "$ROOT/scripts/chain/install.sh"
"$ROOT/scripts/chain/down.sh" >/dev/null 2>&1 || true
nohup "$BIN/substrate-node" --dev --tmp --rpc-cors all --rpc-port 9944 --no-prometheus --no-telemetry \
  >"$LOGS/node.log" 2>&1 & echo $! >"$BIN/node.pid"
for _ in $(seq 1 60); do curl -s -o /dev/null -X POST -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"system_health"}' http://127.0.0.1:9944 && break; sleep 0.5; done
nohup "$BIN/eth-rpc" --dev --node-rpc-url ws://127.0.0.1:9944 --rpc-port 8545 --rpc-cors all --no-prometheus \
  >"$LOGS/eth-rpc.log" 2>&1 & echo $! >"$BIN/eth-rpc.pid"
for _ in $(seq 1 60); do curl -s -o /dev/null -X POST -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId"}' http://127.0.0.1:8545 && break; sleep 0.5; done
echo "local chain up: ws://127.0.0.1:9944 · http://127.0.0.1:8545 (logs in .bin/logs)"
