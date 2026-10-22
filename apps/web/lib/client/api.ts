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
  // Results are keyed by path, so switching paths never shows the previous path's data.
  const [state, setState] = useState<{ path: string | null; data?: T; error?: string }>({ path: null });
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    if (!path) return;
    try {
      const d = await apiGet<T>(path);
      if (alive.current) setState({ path, data: d });
    } catch (e) {
      if (alive.current) setState((s) => ({ path, data: s.path === path ? s.data : undefined, error: (e as Error).message }));
    }
  }, [path]);

  useEffect(() => {
    alive.current = true;
    refresh();
    if (!path || !intervalMs) return () => void (alive.current = false);
    const t = setInterval(refresh, intervalMs);
    return () => {
      alive.current = false;
      clearInterval(t);
    };
  }, [path, intervalMs, refresh]);

  const current = state.path === path ? state : { path, data: undefined, error: undefined };
  return { data: current.data, error: current.error, loading: Boolean(path) && current.data === undefined && current.error === undefined, refresh };
}
