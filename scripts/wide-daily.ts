/**
 * wide-daily.ts — MODEL DZIENNY: „ile nasze szerokie pasmo zarobiłoby na tej
 * puli przez ostatnie 365/720 dni" dla KAŻDEJ puli z obu rankingów
 * (APY selektora i WIDE), bez danych swap-po-swapie.
 * (pomysł Rafała 02.09: kolumny % zysku/straty 365d i 720d w tabelach
 * rankingowych; ustalenia: trzy liczby LP / HODL / Δ vs HODL, mediana z
 * okien kroczących, szerokość wg klasy pary, zwężanie NIE modelowane —
 * zamiast tego „flat %"; pełny przebieg = osobna kolumna z wide-collect).
 *
 *   npx tsx scripts/wide-daily.ts             (krok pipeline'u po wide-score, ~1-3 min)
 *   npx tsx scripts/wide-daily.ts --limit 5   (szybki test)
 *
 * Wyjście: .bot/wide-daily.json {generatedAt, params, pools: {uuid → wynik}}
 *          → GET /api/wide-daily → kolumny w obu tabelach rankingowych (Partia 22).
 *
 * DANE: ceny dzienne tokenów z coins.llama.fi (span 1100d, cache
 * data/llama/prices/, odświeżane raz dziennie), dzienne apyBase puli z
 * data/llama/history/<uuid>.json (fetch-llama-history; fallback: chart API).
 *
 * MODEL (ten sam co Monte Carlo 01.09, tylko na historii zamiast na
 * losowanych ścieżkach): pasywne pasmo v3 [P0/(1+w), P0·(1+w)] (konwencja
 * produktu: log-symetryczne) w cenie WZGLĘDNEJ pary asset/quote; wartość
 * pozycji z formuł v3 (x = L(1/√P − 1/√Pb), y = L(√P − √Pa)); fee dnia =
 * wartość pozycji × apyBase/365 × c_klasy × [w zakresie] (c = udział fee
 * szerokiego pasma vs typowy LP klasy — kalibracja jak w wide-score);
 * po ≥7 dniach poza pasmem recentrowanie z kosztem 0.15% (swap+gaz) — jak
 * MC; HODL 50/50 w USD z chwili wejścia. Wynik w USD (quote wyceniane
 * ceną USD z coins.llama). Okna kroczące: start = dziś−W, dziś−W−30, …
 * (max 13) → mediana/worst/%wygr Δ vs HODL + „dziś" (start dokładnie W dni
 * temu). Flat % = udział dni z |log P − EMA_HL7d| < 2% (ostatnie 365d).
 * DOKŁADNOŚĆ: ±kilka pp/r (dzienna siatka nie widzi wyjść z pasma w ciągu
 * dnia, fee = średnia puli × stały współczynnik) — do porównań pul między
 * sobą, nie do księgowości. Pełny przebieg (wide-collect) jest sędzią.
 */
import * as fs from 'fs';
import * as path from 'path';
import { STATE_DIR } from '../bot/config';

const ROOT = path.join(__dirname, '..');
const BOT = path.join(ROOT, STATE_DIR);
const HIST = path.join(ROOT, 'data', 'llama', 'history');
const PRICES = path.join(ROOT, 'data', 'llama', 'prices');
const UNIVERSE = path.join(ROOT, 'data', 'llama', 'universe.json');
const OUT_PATH = path.join(BOT, 'wide-daily.json');
fs.mkdirSync(PRICES, { recursive: true });

const SPAN_DAYS = 1100;
const WINDOWS = [365, 720];
const STEP_DAYS = 30;
const MAX_WINDOWS = 13;
const RECENTER_AFTER_DAYS = 7;
const RECENTER_COST = 0.0015;
const FLAT_GAP = 0.02;
const FLAT_HL_DAYS = 7;
const DAY = 86400;

const CHAINS: Record<string, string> = { Ethereum: 'ethereum', Base: 'base', Arbitrum: 'arbitrum', 'OP Mainnet': 'optimism' };
const WETH: Record<string, string> = {
  ethereum: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  base: '0x4200000000000000000000000000000000000006',
  arbitrum: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
  optimism: '0x4200000000000000000000000000000000000006',
};
const ETH_SYMS = new Set(['ETH', 'WETH']);
const BTC_SYMS = new Set(['WBTC', 'CBBTC', 'TBTC']);
const LST_SYMS = new Set(['WSTETH', 'WEETH', 'CBETH', 'RETH', 'EZETH', 'RSETH']);
const STABLE_SYMS = new Set(['USDC', 'USDT', 'DAI', 'USDS', 'PYUSD', 'USDE', 'LUSD', 'GHO', 'FRAX', 'USDBC']);

type Cls = 'pegged-btc' | 'lst-eth' | 'stable-stable' | 'eth-btc' | 'crypto-stable' | 'crypto-crypto';
/** szerokość NASZA (w) i typowego LP klasy (wTyp) → c = g(w)/g(wTyp); jak wide-score.ts
 *  (crypto-crypto: decyzja Rafała 02.09 — każda para dwóch niezależnych aktywów = ±40%) */
const CLASS_PARAMS: Record<Cls, { w: number; wTyp: number }> = {
  'crypto-stable': { w: 0.5, wTyp: 0.15 },
  'eth-btc': { w: 0.4, wTyp: 0.02 },
  'crypto-crypto': { w: 0.4, wTyp: 0.15 },
  'pegged-btc': { w: 0.01, wTyp: 0.01 },
  'lst-eth': { w: 0.02, wTyp: 0.01 },
  'stable-stable': { w: 0.005, wTyp: 0.002 },
};
const g = (w: number) => 1 / (1 - 1 / Math.sqrt(1 + w));

function classify(symbol: string): Cls | null {
  const parts = symbol.toUpperCase().split('-');
  if (parts.length !== 2) return null;
  const [a, b] = parts;
  const eth = (s: string) => ETH_SYMS.has(s), btc = (s: string) => BTC_SYMS.has(s), lst = (s: string) => LST_SYMS.has(s), stb = (s: string) => STABLE_SYMS.has(s);
  if (btc(a) && btc(b)) return 'pegged-btc';
  if ((lst(a) && eth(b)) || (eth(a) && lst(b))) return 'lst-eth';
  if (stb(a) && stb(b)) return 'stable-stable';
  if ((eth(a) && btc(b)) || (btc(a) && eth(b))) return 'eth-btc';
  if (stb(a) || stb(b)) return 'crypto-stable';
  return 'crypto-crypto';
}
/** która noga kwotuje: stable > WETH > BTC > druga; zwraca indeks nogi QUOTE */
function quoteIndex(syms: string[]): number {
  const s = syms.map((x) => x.toUpperCase());
  for (const pred of [(x: string) => STABLE_SYMS.has(x), (x: string) => ETH_SYMS.has(x), (x: string) => BTC_SYMS.has(x)]) {
    const i = s.findIndex(pred);
    if (i >= 0) return i;
  }
  return 1;
}

// ── IO ──────────────────────────────────────────────────────────────────────
const readJson = (p: string) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const log = (m: string) => console.log(`${new Date().toISOString()} daily: ${m}`);
async function fetchJson(url: string, tries = 5): Promise<any> {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      if (r.status === 429) { await sleep(5000 * 2 ** i); continue; }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) { if (i === tries - 1) throw e; await sleep(2000 * (i + 1)); }
  }
}
const dayOf = (tsSec: number) => Math.floor(tsSec / DAY);
const today = dayOf(Date.now() / 1000);

/** ceny dzienne tokena: Map<dzień, cena USD>; cache per token odświeżany raz dziennie */
async function loadPrices(slug: string, addr: string): Promise<Map<number, number> | null> {
  const key = `${slug}:${addr.toLowerCase()}`;
  const f = path.join(PRICES, `${key.replace(':', '_')}.json`);
  let series: { t: number; p: number }[] | null = null;
  const cached = readJson(f);
  if (cached && cached.day === today) series = cached.series;
  if (!series) {
    try {
      // LIMIT API (znalezisko CC-Win 02.09, HTTP 400 „exceeds the maximum
      // of 500"): max 500 PUNKTÓW na request, niezależnie od liczby kluczy
      // → 1100d w porcjach po ≤500d z parametrem `start` (unix s), sklejane.
      const CHUNK = 500;
      const startAll = dayOf(Date.now() / 1000) * DAY + DAY / 2 - SPAN_DAYS * DAY;
      const acc: { t: number; p: number }[] = [];
      for (let off = 0; off < SPAN_DAYS; off += CHUNK) {
        const span = Math.min(CHUNK, SPAN_DAYS - off);
        const j = await fetchJson(`https://coins.llama.fi/chart/${key}?start=${startAll + off * DAY}&span=${span}&period=1d`);
        const v = j.coins?.[key] ?? j.coins?.[Object.keys(j.coins ?? {})[0]];
        for (const x of v?.prices ?? []) acc.push({ t: x.timestamp, p: x.price });
        await sleep(300);
      }
      series = acc;
      if (series.length) fs.writeFileSync(f, JSON.stringify({ day: today, key, series }));
    } catch (e) { log(`ceny ${key}: ${String(e).slice(0, 80)}`); return cached?.series ? toMap(cached.series) : null; }
  }
  return series && series.length ? toMap(series) : null;
}
const toMap = (s: { t: number; p: number }[]) => { const m = new Map<number, number>(); for (const x of s) if (x.p > 0) m.set(dayOf(x.t), x.p); return m; };

/** dzienne apyBase puli: Map<dzień, apy%> */
async function loadFees(uuid: string): Promise<Map<number, number> | null> {
  let series: any[] | null = readJson(path.join(HIST, `${uuid}.json`))?.series ?? null;
  if (!series || !series.length) {
    try { series = (await fetchJson(`https://yields.llama.fi/chart/${uuid}`)).data ?? null; await sleep(300); } catch { series = null; }
  }
  if (!series || !series.length) return null;
  const m = new Map<number, number>();
  for (const x of series) {
    const d = dayOf(Date.parse(x.timestamp) / 1000);
    const apy = typeof x.apyBase === 'number' && x.apyBase >= 0 ? x.apyBase : typeof x.apy === 'number' && x.apy >= 0 ? x.apy : null;
    if (apy !== null) m.set(d, apy);
  }
  return m;
}

// ── symulacja ───────────────────────────────────────────────────────────────
type Day = { d: number; pA: number; pB: number; apy: number };
/** wspólna oś dni: wymaga cen obu nóg; fee — carry-forward do 7 dni, dalej 0 */
export function buildDays(pa: Map<number, number>, pb: Map<number, number>, fees: Map<number, number>, from: number, to: number): Day[] {
  const out: Day[] = [];
  let lastApy = 0, lastApyDay = -1e9;
  let lastA: number | null = null, lastB: number | null = null;
  for (let d = from; d <= to; d++) {
    const a = pa.get(d) ?? null, b = pb.get(d) ?? null;
    if (a !== null) lastA = a;
    if (b !== null) lastB = b;
    if (lastA === null || lastB === null) continue;
    if (fees.has(d)) { lastApy = fees.get(d)!; lastApyDay = d; }
    const apy = d - lastApyDay <= 7 ? lastApy : 0;
    out.push({ d, pA: lastA, pB: lastB, apy });
  }
  return out;
}

export function simulate(days: Day[], s: number, e: number, w: number, c: number) {
  // ceny WZGLĘDNE: P = asset/quote; wartość w quote, USD = × pB
  const P = (i: number) => days[i].pA / days[i].pB;
  let lo = P(s) / (1 + w), hi = P(s) * (1 + w);
  const capUsd = 1;
  let quoteCap = capUsd / days[s].pB; // kapitał w quote
  const setL = (p: number, valQ: number) => { const u = unitVal(p); return valQ / u; };
  const unitVal = (p: number): number => {
    // wartość (w quote) pozycji o L=1 przy cenie p w [lo,hi]
    const sp = Math.sqrt(Math.min(Math.max(p, lo), hi)), sa = Math.sqrt(lo), sb = Math.sqrt(hi);
    const x = 1 / sp - 1 / sb, y = sp - sa;
    return x * p + y;
  };
  let L = setL(P(s), quoteCap);
  let feesQ = 0, outDays = 0, recenters = 0, inRangeDays = 0;
  const hodlA = 0.5 / days[s].pA, hodlB = 0.5 / days[s].pB;
  for (let i = s + 1; i <= e; i++) {
    const p = P(i);
    const inR = p >= lo && p <= hi;
    const posQ = L * unitVal(p);
    if (inR) { inRangeDays++; feesQ += posQ * (days[i].apy / 100 / 365) * c; outDays = 0; }
    else {
      outDays++;
      if (outDays >= RECENTER_AFTER_DAYS) {
        const valQ = posQ * (1 - RECENTER_COST);
        lo = p / (1 + w); hi = p * (1 + w);
        L = setL(p, valQ);
        recenters++; outDays = 0;
      }
    }
  }
  const pe = P(e);
  const lpUsd = (L * unitVal(pe) + feesQ) * days[e].pB;
  const hodlUsd = hodlA * days[e].pA + hodlB * days[e].pB;
  return {
    lpPct: (lpUsd / capUsd - 1) * 100,
    hodlPct: (hodlUsd / capUsd - 1) * 100,
    deltaPct: (lpUsd - hodlUsd) / capUsd * 100,
    feesPct: (feesQ * days[e].pB) / capUsd * 100,
    inRangePct: (inRangeDays / (e - s)) * 100,
    recenters,
  };
}

export function flatShare(days: Day[], s: number, e: number): number {
  const a = 1 - Math.exp(-Math.LN2 / FLAT_HL_DAYS);
  let ema = Math.log(days[s].pA / days[s].pB), flat = 0, n = 0;
  for (let i = s + 1; i <= e; i++) {
    const lp = Math.log(days[i].pA / days[i].pB);
    ema = (1 - a) * ema + a * lp;
    if (Math.abs(lp - ema) < FLAT_GAP) flat++;
    n++;
  }
  return n ? (flat / n) * 100 : 0;
}

const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
const r2 = (x: number | null | undefined) => (x === null || x === undefined || !Number.isFinite(x) ? null : Math.round(x * 100) / 100);

// ── main ────────────────────────────────────────────────────────────────────
if (require.main === module) (async () => {
  const limitArg = process.argv.indexOf('--limit');
  const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;

  // pule: unia obu rankingów (po llamaUuid)
  const wanted = new Map<string, { symbol: string; chain: string; poolMeta: string; src: string[] }>();
  for (const [file, src] of [['selector-ranking.json', 'apy'], ['wide-ranking.json', 'wide']] as const) {
    const r = readJson(path.join(BOT, file));
    for (const row of r?.rows ?? []) {
      if (!row.llamaUuid) continue;
      const cur = wanted.get(row.llamaUuid);
      if (cur) cur.src.push(src);
      else wanted.set(row.llamaUuid, { symbol: row.symbol, chain: row.chain, poolMeta: row.poolMeta, src: [src] });
    }
  }
  const poolsArg = process.argv.indexOf('--pools'); // test: lista uuid po przecinku
  if (poolsArg > -1) for (const u of process.argv[poolsArg + 1].split(',')) if (!wanted.has(u)) wanted.set(u, { symbol: '', chain: '', poolMeta: '', src: ['manual'] });
  if (!wanted.size) { log('brak rankingów w .bot — nic do policzenia'); process.exit(0); }
  // meta (underlyingTokens) z universe.json; brakujące dociągnij z listy pul
  const universe: any[] = readJson(UNIVERSE) ?? [];
  const meta = new Map(universe.map((p) => [p.pool, p]));
  const missing = [...wanted.keys()].filter((u) => !meta.get(u)?.underlyingTokens);
  if (missing.length) {
    log(`${missing.length} pul spoza universe.json — pobieram listę pul DefiLlamy`);
    try { for (const p of (await fetchJson('https://yields.llama.fi/pools')).data ?? []) if (wanted.has(p.pool)) meta.set(p.pool, p); }
    catch (e) { log(`lista pul: ${String(e).slice(0, 80)}`); }
  }

  const prev = readJson(OUT_PATH)?.pools ?? {};
  const pools: Record<string, any> = {};
  let n = 0;
  for (const [uuid, wrow] of wanted) {
    if (n++ >= limit) break;
    const m: any = meta.get(uuid);
    const symbol = m?.symbol ?? wrow.symbol;
    const chain = m?.chain ?? wrow.chain;
    const slug = CHAINS[chain];
    const cls = classify(symbol);
    const base = { symbol, chain, poolMeta: m?.poolMeta ?? wrow.poolMeta, src: wrow.src, cls };
    const toks: string[] = (m?.underlyingTokens ?? []).map((t: string) => (/^0x0+$/.test(t) ? WETH[slug] : t.toLowerCase()));
    if (!slug || !cls || toks.length !== 2) { pools[uuid] = { ...base, error: !slug ? 'sieć bez cen' : !cls ? 'para nieklasyfikowalna' : 'brak underlyingTokens' }; continue; }
    const syms = symbol.toUpperCase().split('-');
    const qi = quoteIndex(syms), ai = 1 - qi;
    const [pa, pb, fees] = await Promise.all([loadPrices(slug, toks[ai]), loadPrices(slug, toks[qi]), loadFees(uuid)]);
    if (!pa || !pb || !fees) { pools[uuid] = { ...base, error: !fees ? 'brak historii fee' : 'brak cen' }; continue; }
    const { w, wTyp } = CLASS_PARAMS[cls];
    const c = g(w) / g(wTyp);
    const from = Math.max(Math.min(...pa.keys()), Math.min(...pb.keys()), Math.min(...fees.keys()));
    const days = buildDays(pa, pb, fees, from, today - 1);
    const e = days.length - 1;
    const res: any = { ...base, quoteSym: syms[qi], assetSym: syms[ai], widthPct: w * 100, feeCapture: r2(c), ageDays: days.length, windows: {} };
    if (e < 30) { res.error = 'za krótka historia'; pools[uuid] = res; continue; }
    for (const W of WINDOWS) {
      const runs: any[] = [];
      for (let k = 0; k < MAX_WINDOWS; k++) {
        const s = e - W - k * STEP_DAYS;
        if (s < 0) break;
        runs.push(simulate(days, s, e - k * STEP_DAYS, w, c));
      }
      if (!runs.length) { res.windows[`w${W}`] = null; continue; }
      const deltas = runs.map((r) => r.deltaPct);
      res.windows[`w${W}`] = {
        n: runs.length,
        latest: { lpPct: r2(runs[0].lpPct), hodlPct: r2(runs[0].hodlPct), deltaPct: r2(runs[0].deltaPct), feesPct: r2(runs[0].feesPct), inRangePct: r2(runs[0].inRangePct), recenters: runs[0].recenters },
        medLpPct: r2(median(runs.map((r) => r.lpPct))),
        medHodlPct: r2(median(runs.map((r) => r.hodlPct))),
        medDeltaPct: r2(median(deltas)),
        worstDeltaPct: r2(Math.min(...deltas)),
        winPct: r2((deltas.filter((d) => d > 0).length / deltas.length) * 100),
      };
    }
    res.flatPct365 = r2(flatShare(days, Math.max(0, e - 365), e));
    const last365 = days.slice(Math.max(0, e - 365));
    res.feeAprMean365 = r2(last365.reduce((s, d) => s + d.apy, 0) / last365.length);
    pools[uuid] = res;
    const w3 = res.windows.w365, w7 = res.windows.w720;
    log(`${symbol.padEnd(14)} ${chain.padEnd(9)} ${cls.padEnd(13)} 365d: LP ${w3?.latest.lpPct ?? '—'} / HODL ${w3?.latest.hodlPct ?? '—'} / Δ ${w3?.latest.deltaPct ?? '—'} (med Δ ${w3?.medDeltaPct ?? '—'}, n=${w3?.n ?? 0}) · 720d Δ ${w7?.latest.deltaPct ?? '—'} · flat ${res.flatPct365}%`);
  }
  // pule, których dziś nie liczyliśmy (limit/błąd sieci) — zachowaj poprzedni wynik
  for (const [u, v] of Object.entries(prev)) if (!pools[u]) pools[u] = { ...(v as any), stale: true };
  fs.mkdirSync(BOT, { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify({
    generatedAt: new Date().toISOString(),
    params: { WINDOWS, STEP_DAYS, MAX_WINDOWS, RECENTER_AFTER_DAYS, RECENTER_COST, FLAT_GAP, FLAT_HL_DAYS, CLASS_PARAMS },
    pools,
  }, null, 1));
  log(`zapisano ${Object.keys(pools).length} pul → ${path.relative(ROOT, OUT_PATH)}`);
})();
