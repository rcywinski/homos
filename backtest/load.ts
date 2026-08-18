/**
 * load.ts — WSPÓLNY loader cache'ów swapów dla run/walkforward/sweep
 * (wcześniej trzy zduplikowane kopie loadPool; jedna prawda tutaj).
 *
 * NOWE: wsparcie par kwotowanych w WETH (quote:'WETH'), np. cbBTC/WETH,
 * WTAO/WETH. Silnik zakładał parę ETH/stable (nie-ETH-owa noga = $1) —
 * dla par WETH-owych dawało to bezsensowne jednostki (patrz CONTEXT
 * 2026-08-11). Naprawa: cena USD-za-WETH brana PO BLOKACH z równoległego
 * cache USDC/WETH na TEJ SAMEJ sieci (te same numery bloków — join po bloku,
 * step-function z próbkowaniem co SAMPLE_EVERY swapów).
 */
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { SwapEv, PoolSpec } from './engine';

const CACHE = path.join(__dirname, '..', 'data', 'cache');
export const TICK_SPACING: Record<number, number> = { 100: 1, 500: 10, 3000: 60, 10000: 200 };
export const GAS_USD: Record<string, number> = { mainnet: 8, base: 0.08, arbitrum: 0.1, optimism: 0.05 };

/** pule kwotowane w WETH → id referencyjnego cache USDC/WETH na tej samej sieci */
export const QUOTE_WETH_REF: Record<string, string> = {
  'base-cbbtc-weth-005': 'base-weth-usdc-030',
  'base-cbbtc-weth-005-365d': 'base-weth-usdc-030-365d',
  'mainnet-wtao-weth-100': 'mainnet-usdc-weth-005',
  'mainnet-wsteth-weth-001': 'mainnet-usdc-weth-005-365d', // F.B: LST, token1=WETH
  // UWAGA: mainnet-tbtc-wbtc-001 kwotowany w WBTC — wymaga referencji USD/BTC
  // (brak cache WBTC/USDC; zadanie w RESEARCH-QUEUE F) — NIE liczyć silnikiem do tego czasu.
};

const SAMPLE_EVERY = 100; // próbkowanie serii referencyjnej (co N-ty swap)

/** step-function USD-za-WETH po bloku, z cache pary USDC/WETH */
async function loadUsdRef(refId: string): Promise<(b: number) => number> {
  const metaPath = path.join(CACHE, `${refId}.meta.json`);
  const dataPath = path.join(CACHE, `${refId}.ndjson`);
  if (!fs.existsSync(metaPath) || !fs.existsSync(dataPath)) {
    throw new Error(`Brak referencyjnego cache ${refId} (potrzebny do wyceny USD pary WETH-owej)`);
  }
  const cfg = JSON.parse(fs.readFileSync(metaPath, 'utf8')).cfg;
  const blocks: number[] = [];
  const prices: number[] = [];
  let i = 0;
  const rl = readline.createInterface({ input: fs.createReadStream(dataPath) });
  for await (const line of rl) {
    if (!line.trim()) continue;
    if (i++ % SAMPLE_EVERY !== 0) continue;
    const j = JSON.parse(line);
    const sqrtP = Number(BigInt(j.sp)) / 2 ** 96;
    const p = sqrtP * sqrtP * 10 ** (cfg.token0Decimals - cfg.token1Decimals); // token1/token0 human
    const usd = cfg.ethIsToken0 ? p : 1 / p;
    blocks.push(j.b);
    prices.push(usd);
  }
  if (!blocks.length) throw new Error(`Referencyjny cache ${refId} pusty`);
  // uwaga: append-only ndjson jest posortowany po bloku (fetch idzie rosnąco)
  return (b: number): number => {
    // binary search: ostatnia próbka o bloku ≤ b (przed zakresem → pierwsza)
    let lo = 0;
    let hi = blocks.length - 1;
    if (b <= blocks[0]) return prices[0];
    if (b >= blocks[hi]) return prices[hi];
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (blocks[mid] <= b) lo = mid;
      else hi = mid;
    }
    return prices[lo];
  };
}

/** funding perp (F4): step-function ts(sec) → rate za okres 8h (Binance).
 *  Konwencja: r > 0 → short DOSTAJE funding. */
export function loadFunding(symbol = 'ETHUSDT'): ((tsSec: number) => number) | null {
  const p = path.join(__dirname, '..', 'data', 'funding', `${symbol}.json`);
  if (!fs.existsSync(p)) return null;
  const arr = JSON.parse(fs.readFileSync(p, 'utf8')) as Array<{ t: number; r: number }>;
  if (!arr.length) return null;
  const ts = arr.map((x) => x.t / 1000);
  const rs = arr.map((x) => x.r);
  return (tsSec: number): number => {
    if (tsSec <= ts[0]) return rs[0];
    if (tsSec >= ts[ts.length - 1]) return rs[rs.length - 1];
    let lo = 0;
    let hi = ts.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (ts[mid] <= tsSec) lo = mid;
      else hi = mid;
    }
    return rs[lo];
  };
}

export async function loadPool(id: string): Promise<{ swaps: SwapEv[]; spec: PoolSpec } | null> {
  const metaPath = path.join(CACHE, `${id}.meta.json`);
  const dataPath = path.join(CACHE, `${id}.ndjson`);
  if (!fs.existsSync(metaPath) || !fs.existsSync(dataPath)) return null;
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  const cfg = meta.cfg;
  const anchors: Array<{ block: number; ts: number }> = meta.anchors;

  const tsForBlock = (b: number): number => {
    let i = 0;
    while (i < anchors.length - 2 && anchors[i + 1].block < b) i++;
    const a = anchors[i];
    const c = anchors[i + 1];
    return a.ts + ((b - a.block) / (c.block - a.block)) * (c.ts - a.ts);
  };

  const spec: PoolSpec = {
    id,
    feeRate: cfg.feeBps / 1_000_000,
    ethIsToken0: cfg.ethIsToken0,
    d0: cfg.token0Decimals,
    d1: cfg.token1Decimals,
    tickSpacing: TICK_SPACING[cfg.feeBps],
    gasUsdPerRebalance: GAS_USD[cfg.chain],
    slippageBps: 5,
  };

  if (QUOTE_WETH_REF[id]) {
    spec.quote = 'WETH';
    spec.usdPerEth = await loadUsdRef(QUOTE_WETH_REF[id]);
  }

  const swaps: SwapEv[] = [];
  const rl = readline.createInterface({ input: fs.createReadStream(dataPath) });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const j = JSON.parse(line);
    swaps.push({
      b: j.b,
      ts: tsForBlock(j.b),
      a0: Number(BigInt(j.a0)) / 10 ** spec.d0,
      a1: Number(BigInt(j.a1)) / 10 ** spec.d1,
      sqrtP: Number(BigInt(j.sp)) / 2 ** 96,
      L: Number(BigInt(j.L)),
      t: j.t,
    });
  }
  swaps.sort((a, b) => a.b - b.b);
  // dedup (resume może zdublować ostatni chunk)
  const seen = new Set<string>();
  const dedup = swaps.filter((s) => {
    const k = `${s.b}-${s.a0}-${s.a1}-${s.t}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  // FILTR PROBE-SWAPÓW (17.08, po anomalii WETH-USDT 0.01%: sondy przez puste
  // ticki ±13–20k ticków od rynku wybijały fałszywy sygnał trendu i strategia
  // "wychodziła" po absurdalnej cenie → −100%). Odrzucamy eventy odchylone
  // > 1000 ticków (~10.5%) od rolling-mediany 201 swapów — prawdziwe ruchy
  // (nawet flash-crashe) nie skaczą o 10% w obrębie ~200 swapów na pulach,
  // które analizujemy; dla głębokich pul filtr to no-op (zweryfikowane:
  // wyniki mainnet-030 identyczne). pegged.ts ma własny, ostrzejszy (300).
  const OUTLIER_TICKS = 1000;
  const W = 201;
  const win: number[] = [];
  const sortedW: number[] = [];
  const ins = (v: number) => {
    let lo = 0, hi = sortedW.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (sortedW[m] < v) lo = m + 1; else hi = m; }
    sortedW.splice(lo, 0, v);
  };
  const del = (v: number) => {
    let lo = 0, hi = sortedW.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (sortedW[m] < v) lo = m + 1; else hi = m; }
    sortedW.splice(lo, 1);
  };
  const filtered: SwapEv[] = [];
  let dropped = 0;
  for (const s of dedup) {
    if (win.length >= 50 && Math.abs(s.t - sortedW[sortedW.length >> 1]) > OUTLIER_TICKS) {
      dropped++;
      continue;
    }
    filtered.push(s);
    win.push(s.t);
    ins(s.t);
    if (win.length > W) del(win.shift()!);
  }
  if (dropped) console.log(`[${id}] filtr probe-swapów: odrzucono ${dropped} (${((dropped / dedup.length) * 100).toFixed(4)}%)`);
  return { swaps: filtered, spec };
}
