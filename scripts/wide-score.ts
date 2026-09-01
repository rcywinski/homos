/**
 * wide-score.ts — LEJEK v2, PIĘTRO 1: scoring całego uniwersum pod produkt
 * (pasywny wide / klasy pegged), NIE pod headline APY.
 *
 * Spec: TASKS-FUNNEL.md §2 (decyzja Rafała, przegląd 31.08).
 * Kalibracja stałych: CONTEXT 01.09 (na żywych pozycjach #5886957/#5908083).
 *
 *   npx tsx scripts/wide-score.ts             (pełny przebieg, ~2-4 min)
 *   npx tsx scripts/wide-score.ts --limit 50  (szybki test)
 *
 * Wyjście: data/wide-score/wide-score-<YYYY-MM-DD>.{json,csv} + top na stdout.
 * ŚWIADOMIE bez kroku w pipeline i bez UI — najpierw walidacja metryki
 * (lekcja v1.2: nie budować stron pod metrykę, która może nie przeżyć).
 *
 * MODEL (ranker, nie estymator dolarów):
 *   score [%/r] = feeAprWide − drag
 *   feeAprWide  = apyMean30d × cClass
 *     cClass = g(wOurs) / g(wTypLP)  — ile naszej gęstości vs typowy LP klasy,
 *     g(w) = 1 / (1 − 1/sqrt(1+w))  — gęstość płynności pasma ±w (mat. v3:
 *       L = V / (2·sqrt(P)·(1 − 1/sqrt(1+w))), fee ∝ L przy tym samym V).
 *   drag = K_DRAG × (σ_ann²/8) × g(wOurs)  — drag wariancji skalowany
 *     koncentracją; σ_ann = zmienność RATIO pary (nie aktywa!) z 90d
 *     dziennych cen (coins.llama.fi).
 *   DRIFT-FLAG: |μ_ann| > wOurs/2 — symetryczne pasmo wyjeżdża środkiem
 *     w <2 lata (przypadek wstETH: dryf ~3–4%/r psuje ±2%); to FLAGA,
 *     nie składnik score (backlog: „pasmo świadome dryfu").
 *
 * KALIBRACJA (01.09, żywe pozycje):
 *   crypto-stable ±50, typLP ±15 → c=0.37; zmierzone base-030: $1.04/d
 *     na $3459 = 11.0%/r vs apyBase puli ~31% → c_real≈0.33 ✓ (±30%)
 *   eth-btc ±40, typLP ±2 → c=0.064; zmierzone cbBTC szeroko: $0.19/d
 *     na $2300 = 3.0%/r vs apyBase ~44% → c_real≈0.07 ✓
 *   K_DRAG=0.6: drag base-030 modelowy 3.8%×5.45×0.6=12.4%/r vs
 *     zmierzony backtestem vsHODL drag ~11–13%/r ✓
 */
import * as fs from 'fs';
import * as path from 'path';

const OUT_DIR = path.join(__dirname, '..', 'data', 'wide-score');
fs.mkdirSync(OUT_DIR, { recursive: true });

// ── konfiguracja ────────────────────────────────────────────────────────────
const CHAINS: Record<string, string> = {
  // nazwa w yields.llama.fi → slug w coins.llama.fi
  Ethereum: 'ethereum',
  Base: 'base',
  Arbitrum: 'arbitrum',
  'OP Mainnet': 'optimism',
};
const PROJECTS = new Set(['uniswap-v3', 'uniswap-v4']);
const MIN_TVL = 3_000_000;
const MIN_AGE_DAYS = 90; // pole `count` DefiLlama (dni trackingu)
const K_DRAG = 0.6;
const PRICE_SPAN_DAYS = 90;

// natywne ETH w pulach v4 (adres zerowy) → WETH danej sieci (do wyceny)
const WETH: Record<string, string> = {
  ethereum: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  base: '0x4200000000000000000000000000000000000006',
  arbitrum: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
  optimism: '0x4200000000000000000000000000000000000006',
};

// ── słownik klas (W KODZIE, trackowany — jak SEED_VERDICTS) ────────────────
const ETH_SYMS = new Set(['ETH', 'WETH']);
const BTC_SYMS = new Set(['WBTC', 'CBBTC', 'TBTC']);
const LST_SYMS = new Set(['WSTETH', 'WEETH', 'CBETH', 'RETH', 'EZETH', 'RSETH']);
const STABLE_SYMS = new Set(['USDC', 'USDT', 'DAI', 'USDS', 'PYUSD', 'USDE', 'LUSD', 'GHO', 'FRAX', 'USDBC']);

type PairClass = 'pegged-btc' | 'lst-eth' | 'stable-stable' | 'eth-btc' | 'crypto-stable' | 'inne';

/** szerokości: nasza (wOurs) i typowego LP klasy (wTypLP) — knoby kalibracji */
const CLASS_PARAMS: Record<Exclude<PairClass, 'inne'>, { wOurs: number; wTypLP: number; driftMatters: boolean }> = {
  // driftMatters: flaga dryfu ma sens tylko dla klas ciasnych — trend ETH
  // w kwartale to nie „dryf pega" (walidacja 01.09: μ ETH 90d ±130%/r
  // annualizowane flagowało cały crypto-stable).
  'pegged-btc': { wOurs: 0.01, wTypLP: 0.01, driftMatters: true },
  'lst-eth': { wOurs: 0.02, wTypLP: 0.01, driftMatters: true },
  'stable-stable': { wOurs: 0.005, wTypLP: 0.002, driftMatters: true },
  'eth-btc': { wOurs: 0.4, wTypLP: 0.02, driftMatters: false },
  // wTypLP 0.07 (nie 0.15): rekalibracja 01.09 — live base-030 $1.04/d
  // = 11%/r przy apy30 puli 58% → c_real≈0.19; przy apyBase 31% (10.08)
  // c_real≈0.33. Tłum LP koncentruje się mocniej w reżimach wysokiego
  // APY, więc c dryfuje 0.19–0.35; 0.07 daje c=0.19 (konserwatywnie,
  // po stronie NIEprzeszacowania fee). Ranker, nie estymator.
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

/** gęstość płynności pasma ±w względem 1$ wartości (mat. v3) */
const g = (w: number) => 1 / (1 - 1 / Math.sqrt(1 + w));

// ── pobieranie ─────────────────────────────────────────────────────────────
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

/** ceny dzienne 90d dla listy kluczy chain:addr — batchami po 15 */
async function fetchPrices(keys: string[]): Promise<Map<string, { t: number; p: number }[]>> {
  const out = new Map<string, { t: number; p: number }[]>();
  // limit API: keys × span ≤ 500 punktów na request → przy 90d max 5 kluczy
  const BATCH = Math.max(1, Math.floor(500 / PRICE_SPAN_DAYS));
  for (let i = 0; i < keys.length; i += BATCH) {
    const batch = keys.slice(i, i + BATCH);
    // UWAGA: bez searchWidth — parametr jest w SEKUNDACH i zawęża okno
    // dopasowania ceny; przy 600s większość lookupów wraca pusta
    // (znalezione przy walidacji 01.09 w przeglądarce).
    const url =
      `https://coins.llama.fi/chart/${batch.join(',')}` +
      `?span=${PRICE_SPAN_DAYS}&period=1d`;
    try {
      const j = await fetchJson(url);
      for (const [k, v] of Object.entries<any>(j.coins ?? {})) {
        out.set(k.toLowerCase(), (v.prices ?? []).map((x: any) => ({ t: x.timestamp, p: x.price })));
      }
    } catch (e) {
      console.warn(`ceny: batch ${i / BATCH} nieudany (${e}) — pule bez σ dostaną NO-PRICE`);
    }
    process.stdout.write(`\rceny: ${Math.min(i + BATCH, keys.length)}/${keys.length}  `);
    await sleep(400);
  }
  console.log();
  return out;
}

/** σ i μ (annualizowane, %) log-zwrotów dziennych RATIO pA/pB */
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

  console.log('Pobieram uniwersum (yields.llama.fi)…');
  const all = (await fetchJson('https://yields.llama.fi/pools')).data as any[];

  const pools = all
    .filter(
      (p) =>
        PROJECTS.has(p.project) &&
        CHAINS[p.chain] &&
        p.tvlUsd >= MIN_TVL &&
        (p.count ?? 0) >= MIN_AGE_DAYS &&
        // v4: DefiLlama ma NIESTABILNE volumeUsd7d/apyBase7d dla v4
        // (walidacja 01.09: to samo pole 89.8M rano, 0.0 po południu)
        // → dla v4 filtrem aktywności jest apy>0, nie wolumen.
        (p.project === 'uniswap-v4' ? (p.apyMean30d ?? p.apyBase ?? 0) > 0 : (p.volumeUsd7d ?? 0) > 0)
    )
    .map((p) => ({ ...p, cls: classify(p.symbol) }))
    .filter((p) => p.cls !== 'inne')
    .slice(0, limit);

  console.log(`Po filtrach: ${pools.length} pul (TVL≥$3M, wiek≥${MIN_AGE_DAYS}d, vol7d>0, klasa znana).`);

  // unikalne tokeny do wyceny
  const keys = new Set<string>();
  for (const p of pools) {
    const slug = CHAINS[p.chain];
    for (const t of p.underlyingTokens ?? []) {
      const addr = /^0x0+$/.test(t) ? WETH[slug] : t.toLowerCase();
      keys.add(`${slug}:${addr}`);
    }
  }
  console.log(`Tokeny do wyceny: ${keys.size}`);
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
    // min z dostępnych okien — odporność na 30-dniowe spike'i APY
    // (walidacja 01.09: apy30 base-030 = 58% przy apy7d 34%)
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
      note: stats ? '' : 'NO-PRICE (brak σ — score niepoliczony)',
    };
  });

  rows.sort((a, b) => (b.score ?? -1e9) - (a.score ?? -1e9));

  const today = new Date().toISOString().slice(0, 10);
  const base = path.join(OUT_DIR, `wide-score-${today}`);
  fs.writeFileSync(`${base}.json`, JSON.stringify({ generated: new Date().toISOString(), params: { K_DRAG, CLASS_PARAMS, MIN_TVL, MIN_AGE_DAYS, PRICE_SPAN_DAYS }, rows }, null, 1));
  const cols = ['chain', 'project', 'symbol', 'feeTier', 'cls', 'tvlUsd', 'vol7dUsd', 'ageDays', 'apy30', 'cClass', 'feeAprWide', 'sigmaAnnPct', 'driftAnnPct', 'dragPct', 'score', 'driftFlag', 'note'];
  fs.writeFileSync(`${base}.csv`, [cols.join(';'), ...rows.map((r: any) => cols.map((c) => r[c]).join(';'))].join('\n'));

  console.log(`\nZapisano ${rows.length} pul → ${base}.{json,csv}\n`);
  console.log('TOP 15 (score %/r):');
  for (const r of rows.slice(0, 15))
    console.log(
      `  ${(r.score ?? NaN).toString().padStart(7)}  ${r.cls.padEnd(13)} ${r.chain.padEnd(9)} ${r.symbol.padEnd(14)} ${String(r.feeTier).padEnd(6)} tvl ${(r.tvlUsd / 1e6).toFixed(1)}M  fee ${r.feeAprWide}%  drag ${r.dragPct}%  σ ${r.sigmaAnnPct}%${r.driftFlag ? '  ⚠DRIFT ' + r.driftAnnPct + '%/r' : ''}`
    );
  console.log('\nTOP per klasa:');
  for (const cls of Object.keys(CLASS_PARAMS)) {
    const best = rows.find((r) => r.cls === cls && r.score !== null);
    if (best) console.log(`  ${cls.padEnd(13)} → ${best.chain} ${best.symbol} ${best.feeTier}: score ${best.score}${best.driftFlag ? ' ⚠DRIFT' : ''}`);
  }
})();

function round2(x: number) { return Math.round(x * 100) / 100; }
function round3(x: number) { return Math.round(x * 1000) / 1000; }
