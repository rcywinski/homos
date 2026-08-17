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
  tokenId: string; // '' dla propozycji OPEN z selektora (brak istniejącej pozycji)
  poolId?: string; // BOT_POOLS id, '' gdy pula spoza konfiguracji bota
  /** REBALANCE (doradca pozycji, jak dotychczas) | OPEN/ROTATE (warstwa
   *  selekcji pul — bot/selector.ts, Partia 4) | EXIT_TREND (bezpiecznik trendu
   *  ALGORITHM.md §4 — "wyjdź z LP do cash 50/50" gdy cena < EMA7d o 5%;
   *  HANDOFF Fable→Sonnet 2026-08-11). Brak pola = traktuj jak REBALANCE
   *  (kompatybilność wstecz ze starszymi wpisami w proposals.json). Karty w
   *  MorningCockpit.tsx renderują nieznane wartości `kind` jako szarą notę,
   *  zamiast crashować, na wypadek kolejnych rozszerzeń schematu. */
  kind?: 'REBALANCE' | 'OPEN' | 'ROTATE' | 'EXIT_TREND' | 'HEDGE';
  action: string;
  suggestedRange?: { tickLower?: number; tickUpper?: number; usdLo: number; usdHi: number };
  costUsd?: number;
  paybackDays?: number | null;
  // Pola selektora (OPEN/ROTATE) — bot/selector.ts SelectorProposal:
  llamaPool?: string;
  symbol?: string;
  chain?: string; // etykieta z DefiLlama ("Ethereum"/"Base"), nie chainId
  apy7d?: number;
  heldApy7d?: number; // przy ROTATE: 7d APY puli, którą rotujemy
  breakEvenDays?: number; // przy ROTATE: dni do pokrycia kosztu przejścia
  // HEDGE (ALGORITHM.md v1.2 — hedge-excess dla base-030, HANDOFF Fable→Sonnet
  // 2026-08-17 ~15:0x): bot proponuje SHORT perp na Arbitrum/GMX zamiast wyjścia
  // z LP. Wykonanie ręczne (poza appką, przez Rabby) — brak auto-execute.
  hedgeSizeEth?: number;
  hedgeNotionalUsd?: number;
  note?: string;
  // bot/observer.ts uses 'open'/'dismissed'; state.json only ever contains
  // 'open' ones (server-side filtered) but we check defensively anyway.
  status: 'open' | 'dismissed' | string;
}

// Kształt state.pools / state.positions — powielony z bot/observer.ts (PoolLive /
// WatchedPosition), ten plik jest poza zakresem edycji tej sesji UI. Używane w
// MorningCockpit.tsx / BotTelemetry.tsx (TASKS-UI.md Partia 3, sekcja "Telemetria bota").
export interface BotPoolLive {
  id: string;
  ethUsd: number;
  tick: number;
  sqrtPriceX96: string;
  stats: { volDaily: number; feeYieldDaily: number; swapsAnalyzed: number; hoursCovered: number } | null;
  suggestion: { tickLower: number; tickUpper: number; widthPct: number; priceLower: number; priceUpper: number } | null;
  updatedAt: string;
}

export interface BotWatchedPosition {
  tokenId: string;
  poolId: string;
  tickLower: number;
  tickUpper: number;
  amount0: number;
  amount1: number;
  valueUsd: number;
  inRange: boolean;
  advice: string;
  paybackDays: number | null;
}

export interface BotStateShape {
  updatedAt: string;
  mode?: string;
  watch?: string;
  pools?: BotPoolLive[];
  positions?: BotWatchedPosition[];
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
