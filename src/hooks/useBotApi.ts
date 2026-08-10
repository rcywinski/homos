/**
 * useBotApi.ts — connects the UI to bot/server.ts (the observer API running
 * on the Windows server — see INFRA.md). Not on the same origin as the UI
 * dev server, so the address+token are user-configurable and persisted in
 * localStorage (`homos_api_base` / `homos_api_token`) — see TASKS-UI.md #1.
 *
 * Deliberately quiet on the common "bot offline" case (dev on Mac with no
 * server running, or server unreachable): failures land in `status`/`error`
 * for the UI to render, not in the console.
 */
import { useCallback, useEffect, useState } from 'react';

const BASE_KEY = 'homos_api_base';
const TOKEN_KEY = 'homos_api_token';
const DEFAULT_BASE = 'http://localhost:8787';
const POLL_MS = 60_000;
const STALE_MS = 5 * 60_000;

export interface BotProposal {
  id: string;
  createdAt: string;
  tokenId: string;
  action: string;
  suggestedRange?: { usdLo: number; usdHi: number };
  costUsd?: number;
  paybackDays?: number | null;
  // bot/observer.ts uses 'open'/'dismissed'; state.json only ever contains
  // 'open' ones (server-side filtered) but we check defensively anyway.
  status: 'open' | 'dismissed' | string;
}

export interface BotStateShape {
  updatedAt: string;
  mode?: string;
  pools?: unknown[];
  positions?: unknown[];
  proposals?: BotProposal[];
}

export type BotStatus = 'loading' | 'online' | 'stale' | 'offline';

export interface UseBotApi {
  state: BotStateShape | null;
  status: BotStatus;
  error: string | null;
  apiBase: string;
  apiToken: string;
  setApiBase: (v: string) => void;
  setApiToken: (v: string) => void;
  dismissProposal: (id: string) => Promise<void>;
  refresh: () => void;
}

const readLocal = (key: string, fallback: string): string => {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};

export function useBotApi(): UseBotApi {
  const [apiBase, setApiBaseState] = useState(() => readLocal(BASE_KEY, DEFAULT_BASE));
  const [apiToken, setApiTokenState] = useState(() => readLocal(TOKEN_KEY, ''));
  const [state, setState] = useState<BotStateShape | null>(null);
  const [status, setStatus] = useState<BotStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const fetchState = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (apiToken) headers.Authorization = `Bearer ${apiToken}`;
      const res = await fetch(`${apiBase.replace(/\/$/, '')}/api/state`, { headers });
      if (!res.ok) {
        setState(null);
        setStatus('offline');
        setError(res.status === 401 ? 'Zły token dostępu' : `HTTP ${res.status}`);
        return;
      }
      const data: BotStateShape = await res.json();
      setState(data);
      setError(null);
      const fresh = data.updatedAt && Date.now() - new Date(data.updatedAt).getTime() < STALE_MS;
      setStatus(fresh ? 'online' : 'stale');
    } catch {
      // network error (server down, wrong address, CORS) — expected in dev without a bot running
      setState(null);
      setStatus('offline');
      setError('Brak połączenia z serwerem bota');
    }
  }, [apiBase, apiToken]);

  useEffect(() => {
    fetchState();
    const id = setInterval(fetchState, POLL_MS);
    return () => clearInterval(id);
  }, [fetchState, tick]);

  const dismissProposal = useCallback(
    async (id: string) => {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiToken) headers.Authorization = `Bearer ${apiToken}`;
        await fetch(`${apiBase.replace(/\/$/, '')}/api/proposals/${id}/dismiss`, { method: 'POST', headers });
      } catch {
        // ignored — next poll will reconcile state either way
      }
      refresh();
    },
    [apiBase, apiToken, refresh]
  );

  const setApiBase = useCallback((v: string) => {
    try {
      localStorage.setItem(BASE_KEY, v);
    } catch {
      /* localStorage unavailable — keep in-memory only */
    }
    setApiBaseState(v);
  }, []);

  const setApiToken = useCallback((v: string) => {
    try {
      localStorage.setItem(TOKEN_KEY, v);
    } catch {
      /* localStorage unavailable — keep in-memory only */
    }
    setApiTokenState(v);
  }, []);

  return { state, status, error, apiBase, apiToken, setApiBase, setApiToken, dismissProposal, refresh };
}
