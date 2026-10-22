'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `${res.status}`);
  return data as T;
}

export async function apiPost<T>(path: string, json: unknown): Promise<T> {
  const res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(json) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `${res.status}`);
  return data as T;
}

/** Fetch + optional polling. Keeps the last good data while refreshing. */
export function usePoll<T>(path: string | null, intervalMs = 0) {
  const [data, setData] = useState<T | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(Boolean(path));
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    if (!path) return;
    try {
      const d = await apiGet<T>(path);
      if (alive.current) {
        setData(d);
        setError(undefined);
      }
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    alive.current = true;
    setLoading(Boolean(path));
    refresh();
    if (!path || !intervalMs) return () => void (alive.current = false);
    const t = setInterval(refresh, intervalMs);
    return () => {
      alive.current = false;
      clearInterval(t);
    };
  }, [path, intervalMs, refresh]);

  return { data, error, loading, refresh };
}
