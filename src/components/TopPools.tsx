import React, { FC, useEffect, useState } from 'react';

/**
 * TopPools — lightweight "most profitable pools" ranking.
 *
 * Data source: DefiLlama yields API (public, no key, CORS-enabled).
 * This is a stop-gap: apyBase is a whole-pool fee APR estimate — good for
 * spotting venues, NOT a prediction of concentrated-position returns.
 * Phase 1 replaces this with our own on-chain fee/TVL-in-range scanner
 * (see PLAN.md §6 / PAIRS.md §4).
 */

interface LlamaPool {
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apyBase: number | null;
  poolMeta: string | null;
  volumeUsd1d?: number | null;
}

const CHAINS = new Set(['Ethereum', 'Base', 'Arbitrum']);
const MIN_TVL = 3_000_000; // ignore small pools (APR noise, toxic flow risk)
const TOP_N = 12;

// module-level cache: fetch at most once per session (the payload is large)
let cachePromise: Promise<LlamaPool[]> | null = null;

const fetchTopPools = (): Promise<LlamaPool[]> => {
  if (!cachePromise) {
    cachePromise = fetch('https://yields.llama.fi/pools')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j) => {
        const rows: LlamaPool[] = (j.data || []).filter(
          (p: LlamaPool) =>
            (p.project === 'uniswap-v3' || p.project === 'uniswap-v4') &&
            CHAINS.has(p.chain) &&
            p.tvlUsd >= MIN_TVL &&
            typeof p.apyBase === 'number'
        );
        rows.sort((a, b) => (b.apyBase || 0) - (a.apyBase || 0));
        return rows.slice(0, TOP_N);
      })
      .catch((e) => {
        cachePromise = null; // allow retry
        throw e;
      });
  }
  return cachePromise;
};

const TopPools: FC = () => {
  const [rows, setRows] = useState<LlamaPool[] | null>(null);
  const [error, setError] = useState<string>('');
  const [collapsed, setCollapsed] = useState<boolean>(false);

  const load = () => {
    setError('');
    fetchTopPools()
      .then(setRows)
      .catch((e) => setError(`Nie udało się pobrać rankingu (${e.message}).`));
  };

  useEffect(() => {
    load();
  }, []);

  const fmtUsd = (v: number) =>
    v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${(v / 1e3).toFixed(0)}K`;

  return (
    <div className="top-pools">
      <div className="top-pools-header" onClick={() => setCollapsed(!collapsed)}>
        <h4>
          🔥 Top pule wg fee APR <span className="top-pools-src">(Uniswap v3/v4 · ETH/Base/Arb · TVL ≥ $3M · DefiLlama)</span>
        </h4>
        <span>{collapsed ? '▶' : '▼'}</span>
      </div>
      {!collapsed && (
        <div className="top-pools-body">
          {error ? (
            <div className="error">
              {error}
              <button onClick={load} className="retry-button">Retry</button>
            </div>
          ) : !rows ? (
            <div className="loading">Ładowanie rankingu…</div>
          ) : (
            <table className="top-pools-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Pula</th>
                  <th>Sieć</th>
                  <th>Tier</th>
                  <th>TVL</th>
                  <th>Fee APR</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p, i) => (
                  <tr key={`${p.chain}-${p.symbol}-${p.poolMeta}-${i}`}>
                    <td>{i + 1}</td>
                    <td className="tp-symbol">{p.symbol}</td>
                    <td>{p.chain}</td>
                    <td>{p.poolMeta || '-'}</td>
                    <td>{fmtUsd(p.tvlUsd)}</td>
                    <td className="tp-apr">{(p.apyBase || 0).toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="top-pools-note">
            Uwaga: APR całej puli (pasywny full-range) — pozycja skoncentrowana może mieć
            wielokrotność, ale snapshot bywa mylący. Docelowy ranking on-chain: Faza 1.
          </div>
        </div>
      )}
    </div>
  );
};

export default TopPools;
