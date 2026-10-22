'use client';

import { useEffect, useState } from 'react';
import { publicConfig } from '@/lib/config';

/** "All systems operational"-style live block indicator for the configured Portaldot network. */
export function NetworkStatus() {
  const [block, setBlock] = useState<number | null>(null);
  const [down, setDown] = useState(false);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch(publicConfig.network.evmRpc, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
        });
        const { result } = await res.json();
        if (alive) {
          setBlock(parseInt(result, 16));
          setDown(false);
        }
      } catch {
        if (alive) setDown(true);
      }
    };
    tick();
    const t = setInterval(tick, 6000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return (
    <p className="inline-flex items-center gap-2 text-[13px] text-faint">
      <span className={`size-2 rounded-full ${down ? 'bg-bad' : block ? 'bg-good' : 'bg-faint'}`} />
      {publicConfig.network.label}
      {block !== null && !down && <span className="tabular">· block {block.toLocaleString()}</span>}
      {down && <span>· unreachable</span>}
    </p>
  );
}
