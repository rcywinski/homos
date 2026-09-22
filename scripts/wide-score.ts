/**
 * wide-score.ts — FUNNEL v2, TIER 1: scoring the whole universe for the product
 * (passive wide / pegged classes), NOT for headline APY.
 *
 * Spec: TASKS-FUNNEL.md §2 (Rafal's decision, review 31.08).
 * Constant calibration: CONTEXT 01.09 (on live positions #5886957/#5908083).
 *
 *   npx tsx scripts/wide-score.ts             (full run, ~2-4 min)
 *   npx tsx scripts/wide-score.ts --limit 50  (quick test)
 *
 * Output: data/wide-score/wide-score-<YYYY-MM-DD>.{json,csv} + top on stdout.
 * DELIBERATELY without a pipeline step and without UI — validate the metric first
 * (lesson of v1.2: do not build pages for a metric that may not survive).
 *
 * MODEL (a ranker, not a dollar estimator):
 *   score [%/yr] = feeAprWide − drag
 *   feeAprWide  = apyMean30d × cClass
 *     cClass = g(wOurs) / g(wTypLP)  — how much of our density vs a typical LP of the class,
 *     g(w) = 1 / (1 − 1/sqrt(1+w))  — liquidity density of a ±w range (v3 math:
 *       L = V / (2·sqrt(P)·(1 − 1/sqrt(1+w))), fee ∝ L at the same V).
 *   drag = K_DRAG × (σ_ann²/8) × g(wOurs)  — variance drag scaled by
 *     concentration; σ_ann = volatility of the pair RATIO (not the asset!) from 90d
 *     of daily prices (coins.llama.fi).
 *   DRIFT-FLAG: |μ_ann| > wOurs/2 — a symmetric range drifts out through its center
 *     in <2 years (the wstETH case: ~3–4%/yr drift breaks ±2%); this is a FLAG,
 *     not a score component (backlog: "drift-aware range").
 *
 * CALIBRATION (01.09, live positions):
 *   crypto-stable ±50, typLP ±15 → c=0.37; measured base-030: $1.04/d
 *     on $3459 = 11.0%/yr vs pool apyBase ~31% → c_real≈0.33 ✓ (±30%)
 *   eth-btc ±40, typLP ±2 → c=0.064; measured cbBTC wide: $0.19/d
 *     on $2300 = 3.0%/yr vs apyBase ~44% → c_real≈0.07 ✓
 *   K_DRAG=0.6: model drag base-030 3.8%×5.45×0.6=12.4%/yr vs
 *     backtest-measured vsHODL drag ~11–13%/yr ✓
 */
import * as fs from 'fs';
import * as path from 'path';
import { BOT_POOLS, STATE_DIR } from '../bot/config';

const OUT_DIR = path.join(__dirname, '..', 'data', 'wide-score');
fs.mkdirSync(OUT_DIR, { recursive: true });

// ── configuration ───────────────────────────────────────────────────────────
const CHAINS: Record<string, string> = {
  // name in yields.llama.fi → slug in coins.llama.fi
  Ethereum: 'ethereum',
  Base: 'base',
  Arbitrum: 'arbitrum',
  'OP Mainnet': 'optimism',
};
const PROJECTS = new Set(['uniswap-v3', 'uniswap-v4']);
const MIN_TVL = 3_000_000;
const MIN_AGE_DAYS = 90; // DefiLlama `count` field (days of tracking)
const K_DRAG = 0.6;
const PRICE_SPAN_DAYS = 90;

// native ETH in v4 pools (zero address) → the chain's WETH (for pricing)
const WETH: Record<string, string> = {
  ethereum: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  base: '0x4200000000000000000000000000000000000006',
  arbitrum: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
  optimism: '0x4200000000000000000000000000000000000006',
};

// ── class dictionary (IN CODE, tracked — like SEED_VERDICTS) ────────────────
const ETH_SYMS = new Set(['ETH', 'WETH']);
const BTC_SYMS = new Set(['WBTC', 'CBBTC', 'TBTC']);
const LST_SYMS = new Set(['WSTETH', 'WEETH', 'CBETH', 'RETH', 'EZETH', 'RSETH']);
const STABLE_SYMS = new Set(['USDC', 'USDT', 'DAI', 'USDS', 'PYUSD', 'USDE', 'LUSD', 'GHO', 'FRAX', 'USDBC']);

type PairClass = 'pegged-btc' | 'lst-eth' | 'stable-stable' | 'eth-btc' | 'crypto-stable' | 'inne'; // 'inne' = "other" (data string, kept)

/** widths: ours (wOurs) and a typical LP of the class (wTypLP) — calibration knobs */
const CLASS_PARAMS: Record<Exclude<PairClass, 'inne'>, { wOurs: number; wTypLP: number; driftMatters: boolean }> = {
  // driftMatters: the drift flag only makes sense for tight classes — an ETH trend
  // within a quarter is not "peg drift" (validation 01.09: μ ETH 90d ±130%/yr
  // annualized flagged the whole crypto-stable class).
  'pegged-btc': { wOurs: 0.01, wTypLP: 0.01, driftMatters: true },
  'lst-eth': { wOurs: 0.02, wTypLP: 0.01, driftMatters: true },
  'stable-stable': { wOurs: 0.005, wTypLP: 0.002, driftMatters: true },
  'eth-btc': { wOurs: 0.4, wTypLP: 0.02, driftMatters: false },
  // wTypLP 0.07 (not 0.15): recalibration 01.09 — live base-030 $1.04/d
  // = 11%/yr at pool apy30 58% → c_real≈0.19; at apyBase 31% (10.08)
  // c_real≈0.33. The LP crowd concentrates harder in high-APY regimes,
  // so c drifts 0.19–0.35; 0.07 gives c=0.19 (conservative,
  // on the side of NOT overestimating fees). A ranker, not an estimator.
  'crypto-stable': { wOurs: 0.5, wTypLP: 0.07, driftMatters: false },
};

function classify(symbol: string): PairClass {
  const parts = symbol.toUpperCase().split('-');
  if (parts.length !== 2) return 'inne';
  const [a, b] = parts;
  const eth = (s: string) => ETH_SYMS.has(s);
  const btc = (s: string) => BTC_SYMS.has(s);
  const lst = (s: string) => LST_SYMS.has(s);
  const stb = (s: string) => STABLE_SYMS.has(s);
  if (btc(a) && btc(b)) return 'pegged-btc';
  if ((lst(a) && eth(b)) || (eth(a) && lst(b))) return 'lst-eth';
  if (stb(a) && stb(b)) return 'stable-stable';
  if ((eth(a) && btc(b)) || (btc(a) && eth(b))) return 'eth-btc';
  if (((eth(a) || btc(a)) && stb(b)) || (stb(a) && (eth(b) || btc(b)))) return 'crypto-stable';
  return 'inne';
}

/** liquidity density of a ±w range relative to $1 of value (v3 math) */
const g = (w: number) => 1 / (1 - 1 / Math.sqrt(1 + w));

// ── fetching ────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url: string, tries = 5): Promise<any> {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.status === 429) {
        await sleep(5000 * 2 ** i);
        continue;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(2000 * (i + 1));
    }
  }
}

/** 90d daily prices for a list of chain:addr keys — in batches of 15 */
async function fetchPrices(keys: string[]): Promise<Map<string, { t: number; p: number }[]>> {
  const out = new Map<string, { t: number; p: number }[]>();
  // API limit: keys × span ≤ 500 points per request → at 90d max 5 keys
  const BATCH = Math.max(1, Math.floor(500 / PRICE_SPAN_DAYS));
  for (let i = 0; i < keys.length; i += BATCH) {
    const batch = keys.slice(i, i + BATCH);
    // NOTE: no searchWidth — the parameter is in SECONDS and narrows the price
    // matching window; at 600s most lookups come back empty
    // (found during the 01.09 validation in the browser).
    const url =
      `https://coins.llama.fi/chart/${batch.join(',')}` +
      `?span=${PRICE_SPAN_DAYS}&period=1d`;
    try {
      const j = await fetchJson(url);
      for (const [k, v] of Object.entries<any>(j.coins ?? {})) {
        out.set(k.toLowerCase(), (v.prices ?? []).map((x: any) => ({ t: x.timestamp, p: x.price })));
      }
    } catch (e) {
      console.warn(`prices: batch ${i / BATCH} failed (${e}) — pools without σ will get NO-PRICE`);
    }
    process.stdout.write(`\rprices: ${Math.min(i + BATCH, keys.length)}/${keys.length}  `);
    await sleep(400);
  }
  console.log();
  return out;
}

/** σ and μ (annualized, %) of daily log-returns of the RATIO pA/pB */
function ratioStats(pa: { t: number; p: number }[], pb: { t: number; p: number }[]) {
  const byDay = (s: { t: number; p: number }[]) => {
    const m = new Map<string, number>();
    for (const x of s) m.set(new Date(x.t * 1000).toISOString().slice(0, 10), x.p);
    return m;
  };
  const A = byDay(pa);
  const B = byDay(pb);
  const days = Array.from(A.keys()).filter((d) => B.has(d)).sort();
  if (days.length < 30) return null;
  const rets: number[] = [];
  for (let i = 1; i < days.length; i++) {
    const r0 = A.get(days[i - 1])! / B.get(days[i - 1])!;
    const r1 = A.get(days[i])! / B.get(days[i])!;
    if (r0 > 0 && r1 > 0) rets.push(Math.log(r1 / r0));
  }
  if (rets.length < 20) return null;
  const mean = rets.reduce((s, x) => s + x, 0) / rets.length;
  const sd = Math.sqrt(rets.reduce((s, x) => s + (x - mean) ** 2, 0) / (rets.length - 1));
  return { sigmaAnnPct: sd * Math.sqrt(365) * 100, driftAnnPct: mean * 365 * 100, nDays: rets.length };
}

// ── main ───────────────────────────────────────────────────────────────────
(async () => {
  const limitArg = process.argv.indexOf('--limit');
  const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;

  console.log('Fetching the universe (yields.llama.fi)…');
  const all = (await fetchJson('https://yields.llama.fi/pools')).data as any[];

  const pools = all
    .filter(
      (p) =>
        PROJECTS.has(p.project) &&
        CHAINS[p.chain] &&
        p.tvlUsd >= MIN_TVL &&
        (p.count ?? 0) >= MIN_AGE_DAYS &&
        // v4: DefiLlama has UNSTABLE volumeUsd7d/apyBase7d for v4
        // (validation 01.09: the same field 89.8M in the morning, 0.0 in the afternoon)
        // → for v4 the activity filter is apy>0, not volume.
        (p.project === 'uniswap-v4' ? (p.apyMean30d ?? p.apyBase ?? 0) > 0 : (p.volumeUsd7d ?? 0) > 0)
    )
    .map((p) => ({ ...p, cls: classify(p.symbol) }))
    .filter((p) => p.cls !== 'inne')
    .slice(0, limit);

  console.log(`After filters: ${pools.length} pools (TVL≥$3M, age≥${MIN_AGE_DAYS}d, vol7d>0, known class).`);

  // unique tokens to price
  const keys = new Set<string>();
  for (const p of pools) {
    const slug = CHAINS[p.chain];
    for (const t of p.underlyingTokens ?? []) {
      const addr = /^0x0+$/.test(t) ? WETH[slug] : t.toLowerCase();
      keys.add(`${slug}:${addr}`);
    }
  }
  console.log(`Tokens to price: ${keys.size}`);
  const prices = await fetchPrices(Array.from(keys));

  const rows = pools.map((p) => {
    const slug = CHAINS[p.chain];
    const [t0, t1] = (p.underlyingTokens ?? []).map((t: string) =>
      /^0x0+$/.test(t) ? WETH[slug] : t.toLowerCase()
    );
    const pa = prices.get(`${slug}:${t0}`);
    const pb = prices.get(`${slug}:${t1}`);
    const stats = pa && pb ? ratioStats(pa, pb) : null;
    const { wOurs, wTypLP, driftMatters } = CLASS_PARAMS[p.cls as Exclude<PairClass, 'inne'>];
    const c = g(wOurs) / g(wTypLP);
    // min of the available windows — resilience to 30-day APY spikes
    // (validation 01.09: apy30 base-030 = 58% at apy7d 34%)
    const apyCands = [p.apyMean30d, p.apyBase7d, p.apyBase].filter((x: any) => x != null && x > 0) as number[];
    const apy = apyCands.length ? Math.min(...apyCands) : 0;
    const feeAprWide = apy * c;
    const drag = stats ? K_DRAG * ((stats.sigmaAnnPct / 100) ** 2 / 8) * g(wOurs) * 100 : null;
    const score = drag !== null ? feeAprWide - drag : null;
    const driftFlag = stats && driftMatters ? Math.abs(stats.driftAnnPct) > (wOurs * 100) / 2 : false;
    return {
      pool: p.pool,
      chain: p.chain,
      project: p.project,
      t0, t1, // leg addresses (order = symbol) — for the Tier 2 collector (wide-collect.ts)
      symbol: p.symbol,
      feeTier: p.poolMeta,
      cls: p.cls,
      tvlUsd: Math.round(p.tvlUsd),
      vol7dUsd: Math.round(p.volumeUsd7d ?? 0),
      ageDays: p.count ?? null,
      apy30: round2(apy),
      cClass: round3(c),
      wOursPct: wOurs * 100,
      feeAprWide: round2(feeAprWide),
      sigmaAnnPct: stats ? round2(stats.sigmaAnnPct) : null,
      driftAnnPct: stats ? round2(stats.driftAnnPct) : null,
      dragPct: drag !== null ? round2(drag) : null,
      score: score !== null ? round2(score) : null,
      driftFlag,
      note: stats ? '' : 'NO-PRICE (no σ — score not computed)',
    };
  });

  rows.sort((a, b) => (b.score ?? -1e9) - (a.score ?? -1e9));

  const today = new Date().toISOString().slice(0, 10);
  const base = path.join(OUT_DIR, `wide-score-${today}`);
  fs.writeFileSync(`${base}.json`, JSON.stringify({ generated: new Date().toISOString(), params: { K_DRAG, CLASS_PARAMS, MIN_TVL, MIN_AGE_DAYS, PRICE_SPAN_DAYS }, rows }, null, 1));
  const cols = ['chain', 'project', 'symbol', 'feeTier', 'cls', 'tvlUsd', 'vol7dUsd', 'ageDays', 'apy30', 'cClass', 'feeAprWide', 'sigmaAnnPct', 'driftAnnPct', 'dragPct', 'score', 'driftFlag', 'note'];
  fs.writeFileSync(`${base}.csv`, [cols.join(';'), ...rows.map((r: any) => cols.map((c) => r[c]).join(';'))].join('\n'));

  console.log(`\nSaved ${rows.length} pools → ${base}.{json,csv}\n`);

  // ── WIDE RANKING for the UI/report (02.09, Rafal's decision: "an exact copy
  // of the ranking in the UI, only under the new guidelines — I want to observe it").
  // Same shape as .bot/selector-ranking.json (RankingData in useBotApi),
  // so the UI can reuse TopRankingPanel 1:1; `apy7d` holds the SCORE [%/yr]
  // (UI label: "score wide"), and the extra fields carry the breakdown.
  // Streak = consecutive days in the top zone (2×TOP_N, as in selector.ts), state
  // in .bot/wide-ranking-streaks.json. NO-PRICE pools (score null) skipped.
  // Ranking NEXT TO the old one, not instead — a month of observation, then a decision.
  try {
    const TOP_N = 10;
    const stateDir = path.join(__dirname, '..', STATE_DIR);
    fs.mkdirSync(stateDir, { recursive: true });
    const streakPath = path.join(stateDir, 'wide-ranking-streaks.json');
    const st: { lastDay?: string; streaks: Record<string, number> } = fs.existsSync(streakPath)
      ? JSON.parse(fs.readFileSync(streakPath, 'utf8'))
      : { streaks: {} };
    const scored = rows.filter((r: any) => r.score !== null);
    if (st.lastDay !== today) {
      const zone = new Set(scored.slice(0, TOP_N * 2).map((r: any) => r.pool));
      for (const u of zone) st.streaks[u] = (st.streaks[u] || 0) + 1;
      for (const u of Object.keys(st.streaks)) if (!zone.has(u)) st.streaks[u] = 0;
      st.lastDay = today;
      fs.writeFileSync(streakPath, JSON.stringify(st, null, 2));
    }
    const CHAIN_MAP: Record<string, string> = { Ethereum: 'mainnet', Base: 'base', Arbitrum: 'arbitrum' };
    const FEE_META: Record<number, string> = { 100: '0.01%', 500: '0.05%', 3000: '0.3%', 10000: '1%' };
    const botPoolId = (r: any): string | null => {
      const chain = CHAIN_MAP[r.chain];
      if (!chain || r.project !== 'uniswap-v3') return null;
      const syms = new Set(String(r.symbol).split('-').map((x) => x.toUpperCase()));
      const b = BOT_POOLS.find((b) => b.chain === chain && FEE_META[b.feeBps] === String(r.feeTier).trim() && syms.has(b.sym0.toUpperCase()) && syms.has(b.sym1.toUpperCase()));
      return b?.id ?? null;
    };
    const out = {
      day: today,
      generatedAt: new Date().toISOString(),
      criteria: { window: 'wide-score v1: fee_wide − 0.6·σ²/8·g(w), fee = MIN(apy7d, apy30)', persistDays: 3, minTvlUsd: MIN_TVL, filter: 'uniswap-v3 + v4, ETH/Base/Arb/OP, age ≥90d; score in %/yr' },
      rows: scored.slice(0, TOP_N).map((r: any, i: number) => ({
        rank: i + 1,
        symbol: r.symbol,
        chain: r.chain,
        poolMeta: `${r.feeTier}${r.project === 'uniswap-v4' ? ' v4' : ''}`,
        apy7d: r.score, // = SCORE [%/yr] — see the comment above
        streak: st.streaks[r.pool] || 0,
        eligible: (st.streaks[r.pool] || 0) >= 3 && r.score > 0,
        tvlUsd: r.tvlUsd,
        botPoolId: botPoolId(r),
        llamaUuid: r.pool,
        // score breakdown (extra fields, wide ranking only)
        cls: r.cls,
        feeAprWide: r.feeAprWide,
        dragPct: r.dragPct,
        sigmaAnnPct: r.sigmaAnnPct,
        driftFlag: r.driftFlag,
        wOursPct: r.wOursPct,
      })),
    };
    fs.writeFileSync(path.join(stateDir, 'wide-ranking.json'), JSON.stringify(out, null, 2));
    console.log(`WIDE ranking (top ${TOP_N}) → ${STATE_DIR}/wide-ranking.json`);
  } catch (e) {
    console.error(`wide-ranking: write failed: ${String(e).slice(0, 160)}`);
  }
  console.log('TOP 15 (score %/yr):');
  for (const r of rows.slice(0, 15))
    console.log(
      `  ${(r.score ?? NaN).toString().padStart(7)}  ${r.cls.padEnd(13)} ${r.chain.padEnd(9)} ${r.symbol.padEnd(14)} ${String(r.feeTier).padEnd(6)} tvl ${(r.tvlUsd / 1e6).toFixed(1)}M  fee ${r.feeAprWide}%  drag ${r.dragPct}%  σ ${r.sigmaAnnPct}%${r.driftFlag ? '  ⚠DRIFT ' + r.driftAnnPct + '%/yr' : ''}`
    );
  console.log('\nTOP per class:');
  for (const cls of Object.keys(CLASS_PARAMS)) {
    const best = rows.find((r) => r.cls === cls && r.score !== null);
    if (best) console.log(`  ${cls.padEnd(13)} → ${best.chain} ${best.symbol} ${best.feeTier}: score ${best.score}${best.driftFlag ? ' ⚠DRIFT' : ''}`);
  }
})();

function round2(x: number) { return Math.round(x * 100) / 100; }
function round3(x: number) { return Math.round(x * 1000) / 1000; }
