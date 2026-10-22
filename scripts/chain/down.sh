#!/usr/bin/env bash
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
for p in eth-rpc node; do f="$ROOT/.bin/$p.pid"; [ -f "$f" ] && kill "$(cat "$f")" 2>/dev/null; rm -f "$f"; done
echo "local chain stopped"
