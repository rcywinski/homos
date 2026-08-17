/**
 * ForecastPanel.tsx — "Prognoza zysku" (HANDOFF Fable→Sonnet 2026-08-17
 * ~16:3x). Życzenie Rafała: widok dla laika, dolary zamiast procentów.
 *
 * Endpoint: GET {base}/api/results/forecast.json (istniejący generyczny
 * endpoint bot/server.ts `/api/results/:name`, ten sam wzorzec co
 * useWalkforward w ObservationAnalysis.tsx — zero zmian po stronie serwera).
 * Kształt: { generatedAt, disclaimer, pools: [{ poolId, symbol, strategy,
 * note, aprQ25, aprMed, aprQ75, winPct, worst }] }.
 *
 * ZAKRES TWARDY: BEZ własnych obliczeń finansowych poza mnożeniem kwoty —
 * wszystkie APR-y (Q25/med/Q75) liczy backtest/forecast.ts (CC-Mac), UI
 * tylko przelicza na USD per okres: kwota × apr/100 / okresówRoku
 * (tydzień /52, miesiąc /12, rok /1). Ujemne wyniki NIE są ukrywane
 * (uczciwość wobec Rafała) — czerwony kolor zamiast pomijania.
 */
import React, { FC, useEffect, useState } from 'react';
import { UseBotApi } from '../hooks/useBotApi';

interface ForecastPoolRow {
  poolId: string;
  symbol?: string;
  strategy?: string;
  note?: string;
  aprQ25: number;
  aprMed: number;
  aprQ75: number;
  winPct?: number;
  worst?: number;
}

interface ForecastFile {
  generatedAt?: string;
  disclaimer?: string;
  pools?: ForecastPoolRow[];
}

const AMOUNT_KEY = 'homos_forecast_amount';
const DEFAULT_AMOUNT = 5000;

function readStoredAmount(): number {
  try {
    const raw = localStorage.getItem(AMOUNT_KEY);
    const n = raw ? Number(raw) : NaN;
    return isFinite(n) && n > 0 ? n : DEFAULT_AMOUNT;
  } catch {
    return DEFAULT_AMOUNT; // private browsing / brak localStorage — fallback in-memory
  }
}

function storeAmount(v: number) {
  try {
    localStorage.setItem(AMOUNT_KEY, String(v));
  } catch {
    /* noop — private browsing */
  }
}

function useForecast(apiBase: string, apiToken: string) {
  const [data, setData] = useState<ForecastFile | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'not-found' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setState('loading');
      try {
        const headers: Record<string, string> = {};
        if (apiToken) headers.Authorization = `Bearer ${apiToken}`;
        const res = await fetch(`${apiBase.replace(/\/$/, '')}/api/results/forecast.json`, { headers });
        if (res.status === 404) {
          if (!cancelled) {
            setData(null);
            setState('not-found');
          }
          return;
        }
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as ForecastFile;
        if (!cancelled) {
          setData(json);
          setState('ok');
        }
      } catch {
        if (!cancelled) {
          setData(null);
          setState('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiBase, apiToken]);

  return { data, state };
}

const fmtSigned = (v: number) => {
  const sign = v > 0 ? '+' : v < 0 ? '−' : '';
  return `${sign}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const PERIODS: { label: string; perYear: number }[] = [
  { label: 'tydzień', perYear: 52 },
  { label: 'miesiąc', perYear: 12 },
  { label: 'rok', perYear: 1 },
];

const ForecastTile: FC<{ row: ForecastPoolRow; amount: number }> = ({ row, amount }) => {
  return (
    <div className="forecast-pool-tile">
      <div className="morning-section-title forecast-pool-title">
        {row.symbol ?? row.poolId}
        {row.strategy && <span className="muted forecast-strategy"> · {row.strategy}</span>}
      </div>
      {row.note && <div className="morning-note muted forecast-pool-note">{row.note}</div>}
      <div className="forecast-rows">
        {PERIODS.map(({ label, perYear }) => {
          const lo = (amount * row.aprQ25) / 100 / perYear;
          const mid = (amount * row.aprMed) / 100 / perYear;
          const hi = (amount * row.aprQ75) / 100 / perYear;
          return (
            <div key={label} className="forecast-row">
              <span className="forecast-row-label">{label}:</span>
              <span className={`forecast-amount ${lo < 0 ? 'forecast-negative' : ''}`}>{fmtSigned(lo)}</span>
              <span className="forecast-amount-sep">/</span>
              <span className={`forecast-amount ${mid < 0 ? 'forecast-negative' : ''}`}>{fmtSigned(mid)}</span>
              <span className="forecast-amount-sep">/</span>
              <span className={`forecast-amount ${hi < 0 ? 'forecast-negative' : ''}`}>{fmtSigned(hi)}</span>
            </div>
          );
        })}
      </div>
      <div className="muted forecast-legend">słabo / typowo / dobrze</div>
      {(typeof row.winPct === 'number' || typeof row.worst === 'number') && (
        <div className="muted forecast-footnote">
          {typeof row.winPct === 'number' && <>trafność {row.winPct.toFixed(0)}%</>}
          {typeof row.winPct === 'number' && typeof row.worst === 'number' && ' · '}
          {typeof row.worst === 'number' && <>najgorsze okno {row.worst.toFixed(1)}% APR</>}
        </div>
      )}
    </div>
  );
};

interface Props {
  bot: UseBotApi;
}

const ForecastPanel: FC<Props> = ({ bot }) => {
  const [expanded, setExpanded] = useState(false);
  const [amount, setAmount] = useState<number>(() => readStoredAmount());
  const { data, state } = useForecast(bot.apiBase, bot.apiToken);

  const handleAmountChange = (raw: string) => {
    const n = Number(raw);
    if (!isFinite(n)) return;
    setAmount(n);
    storeAmount(n);
  };

  return (
    <div className="telemetry-section">
      <div className="telemetry-header" onClick={() => setExpanded((e) => !e)}>
        <span className="morning-section-title telemetry-title">Prognoza zysku</span>
        <span className="morning-toggle">{expanded ? '▼' : '▶'}</span>
      </div>

      {expanded && (
        <div className="telemetry-body">
          <div className="forecast-amount-input-row">
            <label htmlFor="forecast-amount" className="muted">
              Kwota inwestycji ($)
            </label>
            <input
              id="forecast-amount"
              type="number"
              min={0}
              step={100}
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="forecast-amount-input"
            />
          </div>

          {state === 'loading' && <div className="morning-note muted">wczytywanie prognozy…</div>}
          {state === 'not-found' && <div className="morning-note muted">prognoza jeszcze nie wygenerowana.</div>}
          {state === 'error' && <div className="morning-note muted">prognoza niedostępna (błąd sieci lub serwera).</div>}

          {state === 'ok' && data?.pools && data.pools.length > 0 && (
            <div className="forecast-pool-grid">
              {data.pools.map((row) => (
                <ForecastTile key={row.poolId} row={row} amount={amount} />
              ))}
            </div>
          )}
          {state === 'ok' && (!data?.pools || data.pools.length === 0) && (
            <div className="morning-note muted">prognoza pusta (brak pul w pliku).</div>
          )}

          {state === 'ok' && data?.disclaimer && (
            <div className="muted forecast-disclaimer">
              {data.disclaimer}
              {data.generatedAt && <> — wygenerowano: {new Date(data.generatedAt).toLocaleString('pl-PL')}</>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ForecastPanel;
