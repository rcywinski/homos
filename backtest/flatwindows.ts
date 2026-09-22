/**
 * flatwindows.ts — E1 (RESEARCH-QUEUE): statistics of FLAT episodes per the
 * FlatWide product definition + valuation of the narrowing (expected value of FLAT_ENTER).
 *
 * Business question (27.08): before we SIGN OFF a narrowing of the product
 * position for the first time — how many flats occur at all, how long they
 * last, and whether the extra fees from a narrow range cover the cost of two
 * transitions (narrowing + return).
 *
 * Method (deliberately WITHOUT the engine — plain arithmetic on the swap stream):
 *  - EMA of the pair's relative log-price (HL_D days) → gap = log(P/EMA);
 *  - flat episode: |gap|<ENTER held for CONFIRM_H hours (counter reset by a
 *    breakout, as in flatOnlyLP) → lasts until |gap|>EXIT;
 *  - within an episode we count fees of a hypothetical position with capital CAP:
 *    (a) WIDE ±WIDE and (b) NARROW ±NARROW — both centred at the moment the
 *    flat is confirmed, without recentering (conservative);
 *    fees per swap = input_volume_USD x feeRate x ourL/(poolL+ourL),
 *    accrued only when the tick is inside the position range; poolL = ev.L (real!).
 *  - episode EV = feesNarrow − feesWide − 2xCOST (narrowing and return).
 * Approximations: no recentering of the narrow one (in-range% reported), no IL
 * (in a flat it is by definition small and symmetric), constant transition cost COST.
 *
 * Usage: npx tsx backtest/flatwindows.ts <poolId>
 * Env: ENTER=0.02 EXIT=0.05 CONFIRM_H=24 HL_D=7 CAP=2500 WIDE=0.5
 *      NARROW=0.08 COST=6
 * Env COMPARE_HL_D=5 (28.08, Rafal's question "shouldn't the anchor jump to
 * the new price faster?"): runs detection a SECOND time with a different EMA
 * and prints a comparison — how many episodes we catch sooner, by how many
 * hours, which episodes exist only on the faster/slower anchor.
 */
import { unitPrices, ethUsd, PoolSpec } from './engine';
import { loadPool } from './load';

const id = process.argv[2];
if (!id) {
  console.error('Usage: npx tsx backtest/flatwindows.ts <poolId>');
  process.exit(1);
}
const ENTER = Number(process.env.ENTER ?? 0.02);
const EXIT = Number(process.env.EXIT ?? 0.05);
const CONFIRM_S = Number(process.env.CONFIRM_H ?? 24) * 3600;
const HL_D = Number(process.env.HL_D ?? 7);
const CAP = Number(process.env.CAP ?? 2500);
const WIDE = Number(process.env.WIDE ?? 0.5); // ± (geometric: [P/(1+w), P(1+w)])
const NARROW = Number(process.env.NARROW ?? 0.08);
const COST = Number(process.env.COST ?? 6); // USD per one full transition (close+open)

/** L_raw of a position worth V USD, range [s/√r, s·√r] around raw sqrt s. */
function ourL(V: number, r: number, s: number, spec: PoolSpec, px0: number, px1: number): number {
  const f = 1 - 1 / Math.sqrt(r);
  const perL = (f / s / 10 ** spec.d0) * px0 + s * f / 10 ** spec.d1 * px1;
  return perL > 0 ? V / perL : 0;
}

interface Episode {
  startTs: number; endTs: number; confirmed: boolean;
  volUsd: number; feesWide: number; feesNarrow: number;
  swapsIn: number; swapsInNarrow: number;
  p0: number; p1: number;
}

const CMP_HL_D = process.env.COMPARE_HL_D ? Number(process.env.COMPARE_HL_D) : null;

/** full episode detection for a given EMA (extracted from main, 28.08 —
 *  COMPARE_HL_D mode runs it twice on the same stream) */
function detect(swaps: any[], spec: PoolSpec, hlDays: number): Episode[] {
  const tau = (hlDays * 86400) / Math.LN2;
  const rWide = 1 + WIDE;
  const rNarrow = 1 + NARROW;

  let ema: number | null = null;
  let lastTs = 0;
  let flatSince: number | null = null;
  let cur: (Episode & { sLoW: number; sHiW: number; sLoN: number; sHiN: number; LW: number; LN: number }) | null = null;
  const episodes: Episode[] = [];

  for (const ev of swaps) {
    if (spec.quote === 'WETH' && spec.usdPerEth) spec.usdPerEthNow = spec.usdPerEth(ev.b);
    const price = ethUsd(ev.sqrtP, spec); // relative price of the base (USD or WETH — irrelevant for the gap)
    if (!(price > 0) || !Number.isFinite(price)) continue; // broken first points of the cache (cand-* anomaly)
    const logP = Math.log(price);
    if (ema === null) { ema = logP; lastTs = ev.ts; continue; }
    const dt = Math.max(ev.ts - lastTs, 0);
    ema = (1 - (1 - Math.exp(-dt / tau))) * ema + (1 - Math.exp(-dt / tau)) * logP;
    lastTs = ev.ts;
    const gap = Math.abs(logP - ema);

    if (cur) {
      // fees of both hypothetical positions
      const { px0, px1 } = unitPrices(ev.sqrtP, spec);
      const volUsd = Math.max(ev.a0 > 0 ? ev.a0 * px0 : 0, ev.a1 > 0 ? ev.a1 * px1 : 0);
      const feePool = volUsd * spec.feeRate;
      cur.volUsd += volUsd;
      if (ev.sqrtP >= cur.sLoW && ev.sqrtP <= cur.sHiW) {
        cur.feesWide += feePool * (cur.LW / (ev.L + cur.LW));
        cur.swapsIn++;
      }
      if (ev.sqrtP >= cur.sLoN && ev.sqrtP <= cur.sHiN) {
        cur.feesNarrow += feePool * (cur.LN / (ev.L + cur.LN));
        cur.swapsInNarrow++;
      }
      if (gap > EXIT) {
        cur.endTs = ev.ts; cur.p1 = price; cur.confirmed = true;
        episodes.push(cur); cur = null; flatSince = null;
      }
      continue;
    }

    if (gap < ENTER) {
      const since = flatSince ?? (flatSince = ev.ts);
      if (ev.ts - since >= CONFIRM_S) {
        const { px0, px1 } = unitPrices(ev.sqrtP, spec);
        const s = ev.sqrtP;
        cur = {
          startTs: ev.ts, endTs: ev.ts, confirmed: false,
          volUsd: 0, feesWide: 0, feesNarrow: 0, swapsIn: 0, swapsInNarrow: 0,
          p0: price, p1: price,
          sLoW: s / Math.sqrt(rWide), sHiW: s * Math.sqrt(rWide),
          sLoN: s / Math.sqrt(rNarrow), sHiN: s * Math.sqrt(rNarrow),
          LW: ourL(CAP, rWide, s, spec, px0, px1),
          LN: ourL(CAP, rNarrow, s, spec, px0, px1),
        };
        flatSince = null;
      }
    } else {
      flatSince = null;
    }
  }
  if (cur) { cur.endTs = lastTs; episodes.push(cur); } // episode still running at the end of the data
  return episodes;
}

(async () => {
  const loaded = await loadPool(id);
  if (!loaded) { console.error(`No cache for ${id}`); process.exit(1); }
  const { swaps, spec } = loaded;
  const episodes = detect(swaps, spec, HL_D);

  const t0 = swaps[0].ts, t1 = swaps[swaps.length - 1].ts;
  const totalDays = (t1 - t0) / 86400;
  const durD = (e: Episode) => (e.endTs - e.startTs) / 86400;
  const flatDays = episodes.reduce((a, e) => a + durD(e), 0);
  const evOf = (e: Episode) => e.feesNarrow - e.feesWide - 2 * COST;

  console.log(`${id}: ${totalDays.toFixed(0)} days · ENTER<${ENTER * 100}% ${(CONFIRM_S / 3600).toFixed(0)}h → EXIT>${EXIT * 100}% · EMA HL${HL_D}d · CAP $${CAP} · ±${WIDE * 100}% vs ±${NARROW * 100}% · transition cost $${COST}x2\n`);
  console.log('episode start        days   vol$        feesWide$  feesNarrow$  uplift  inN%   EV$');
  for (let i = 0; i < episodes.length; i++) {
    const e = episodes[i];
    const up = e.feesWide > 0 ? e.feesNarrow / e.feesWide : 0;
    const inN = e.swapsIn > 0 ? (100 * e.swapsInNarrow) / e.swapsIn : 0;
    console.log(
      `${String(i + 1).padStart(4)}   ${new Date(e.startTs * 1000).toISOString().slice(0, 10)}  ${durD(e).toFixed(1).padStart(5)}  ` +
      `${e.volUsd.toLocaleString('en-US', { maximumFractionDigits: 0 }).padStart(11)} ` +
      `${e.feesWide.toFixed(2).padStart(9)}  ${e.feesNarrow.toFixed(2).padStart(10)}  ${up.toFixed(1).padStart(5)}x  ${inN.toFixed(0).padStart(3)}%  ${evOf(e).toFixed(2).padStart(7)}${e.confirmed ? '' : '  (still running at end of data)'}`
    );
  }
  const durs = episodes.map(durD).sort((a, b) => a - b);
  const med = durs.length ? durs[Math.floor(durs.length / 2)] : 0;
  const evPos = episodes.filter((e) => evOf(e) > 0);
  console.log(`\nSUMMARY: episodes ${episodes.length} (${((episodes.length / totalDays) * 365).toFixed(1)}/yr) · median ${med.toFixed(1)}d · time in flat ${((flatDays / totalDays) * 100).toFixed(1)}% · EV>0: ${evPos.length}/${episodes.length} · ΣEV $${episodes.reduce((a, e) => a + evOf(e), 0).toFixed(2)}`);
  if (evPos.length) {
    const minDur = Math.min(...evPos.map(durD));
    console.log(`practical threshold: all EV>0 episodes lasted ≥${minDur.toFixed(1)} days — sign off FLAT_ENTER when the flat promises at least that long.`);
  }
  console.log(`\nNOTES: narrow position without recentering (inN% shows how much volume it caught); IL in the flat omitted (symmetric, small); our liquidity included in the share denominator.`);

  // --- EMA anchor comparison mode (COMPARE_HL_D) — Rafal's question 28.08 ---
  if (CMP_HL_D) {
    const cmp = detect(swaps, spec, CMP_HL_D);
    const overlaps = (a: Episode, b: Episode) => a.startTs < b.endTs && b.startTs < a.endTs;
    const usedCmp = new Set<number>();
    const pairs: Array<[Episode, Episode]> = [];
    for (const e of episodes) {
      const j = cmp.findIndex((c, idx) => !usedCmp.has(idx) && overlaps(e, c));
      if (j >= 0) { usedCmp.add(j); pairs.push([e, cmp[j]]); }
    }
    const onlyCmp = cmp.filter((_, idx) => !usedCmp.has(idx));
    const onlyBase = episodes.filter((e) => !pairs.some(([a]) => a === e));
    const deltasH = pairs.map(([a, b]) => (a.startTs - b.startTs) / 3600); // >0 = compare catches it earlier
    const dSorted = [...deltasH].sort((x, y) => x - y);
    const medD = dSorted.length ? dSorted[Math.floor(dSorted.length / 2)] : 0;
    const earlier = deltasH.filter((d) => d > 0);
    const sumEv = (arr: Episode[]) => arr.reduce((a, e) => a + evOf(e), 0);
    console.log(`\n=== ANCHOR COMPARISON: EMA HL${HL_D}d (base) vs HL${CMP_HL_D}d ===`);
    console.log(`episodes: ${episodes.length} vs ${cmp.length} · paired by overlap in time: ${pairs.length}`);
    console.log(`among paired, HL${CMP_HL_D}d starts EARLIER in ${earlier.length}/${pairs.length}; median start lead ${medD.toFixed(1)}h; ${earlier.reduce((a, c) => a + c, 0).toFixed(0)}h earlier in flat in total`);
    console.log(`episodes ONLY on HL${CMP_HL_D}d: ${onlyCmp.length} (ΣEV $${sumEv(onlyCmp).toFixed(2)}) · ONLY on HL${HL_D}d: ${onlyBase.length} (ΣEV $${sumEv(onlyBase).toFixed(2)})`);
    console.log(`ΣEV overall: HL${HL_D}d $${sumEv(episodes).toFixed(2)} vs HL${CMP_HL_D}d $${sumEv(cmp).toFixed(2)}`);
  }
})();
