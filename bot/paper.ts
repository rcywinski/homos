/**
 * bot/paper.ts — PAPER TRADING: a virtual portfolio run by ALGORITHM
 * v1.2 on live data (Rafal's decision 18.08). Answers the question "how
 * would the algorithm behave on real capital" without risking it.
 *
 * RULES:
 *  - $10k of virtual capital PER pool from BOT_POOLS (PAPER_CAPITAL_USD env).
 *  - Zero transactions, zero Rabby — the algorithm's decisions execute virtually
 *    at once; Telegram receives informational MILESTONES (📊 PAPER: ...).
 *  - Called from observer.ts after every statistics cycle (15 min).
 *
 * MODEL (honest about approximations — consistent with the advisor and the backtest engine):
 *  - Open: range = advisor suggestion (k·σ·√7d, k per pool), capital
 *    split by v3 geometry at the current price (float, like backtest/engine).
 *  - Fees: valueUsd × feeYieldDaily × (2·spacing / position_width) × Δt —
 *    EXACTLY the same formula as expectedDailyFeesUsd in advisor.assessPosition
 *    (trailing yield of the ±1 spacing band rescaled to our width).
 *    This is NOT a per-swap replay — no modeling of our L share in the pool; when
 *    interpreting, remember it is an estimate of the "fair" yield.
 *  - Rebalance: ALGORITHM v1 trigger — out of range CONTINUOUSLY >=24h
 *    (hysteresis) AND payback <=7d (assessPosition). Cost = gas + half a turnover
 *    × (fee tier + 5 bps slippage). Collected fees are added to the capital
 *    on rebalance (collect+reinvest).
 *  - Trend circuit breaker per pool (trendAction): 'exit' → virtual close
 *    to cash 50/50 (cost as above), re-entry after the signal clears (trendReentry);
 *    'hedge' → virtual short of the ETH excess >50% of value (taker 5 bps
 *    open/close, funding +2.9%/yr for the short — historical average
 *    from F4; LP stays).
 *  - Benchmark: HODL 50/50 — token amounts frozen at the moment of opening,
 *    valued at current prices (the same definition as the project gate).
 *  - USD valuation respects quote:'WETH' (leg prices are supplied by the observer).
 *
 * FILES (in .bot/, gitignored — do NOT force-add, lesson from 17.08):
 *  - paper-state.json    — current portfolio state (read by /api/paper),
 *  - paper-events.ndjson — decision ledger (open/rebalance/exit/reentry/hedge),
 *  - paper-history.ndjson — equity samples every 15 min (UI charts).
 */
import * as fs from 'fs';
import * as path from 'path';
import { BOT_POOLS, BotPool, STATE_DIR } from './config';
import { ADVISOR_PARAMS, assessPosition, PoolStats, suggestRange } from '../src/utils/advisor';

const DIR = path.join(__dirname, '..', STATE_DIR);
const STATE_PATH = path.join(DIR, 'paper-state.json');
const EVENTS_PATH = path.join(DIR, 'paper-events.ndjson');
const HISTORY_PATH = path.join(DIR, 'paper-history.ndjson');

const CAPITAL_USD = Number(process.env.PAPER_CAPITAL_USD || 10_000);
const HYSTERESIS_MS = 24 * 3600 * 1000; // h=24 from ALGORITHM v1
// the same cost assumptions as advisor/backtest (GAS_USD in advisor.ts is
// private — duplicated per the existing convention from useCockpitActions.ts)
const GAS_USD: Record<number, number> = { 1: 8, 8453: 0.08, 42161: 0.1 };
const HEDGE_TAKER_BPS = 5;
const HEDGE_FUNDING_APR = 0.029; // +2.9%/yr FOR the short (Binance 400d, F4)
const TICK_SPACING: Record<number, number> = { 100: 1, 500: 10, 3000: 60, 10000: 200 };

// --- state types ---
export interface PaperPosition {
  poolId: string;
  status: 'open' | 'cash' | 'pending'; // pending = waiting for the first suggestion
  capitalUsd: number; // working capital (after costs, with reinvested fees)
  // LP position (when open):
  tickLower?: number;
  tickUpper?: number;
  liquidity?: number; // float, human units (backtest/engine convention)
  entryHuman?: number; // human price at open
  // ledger:
  feesUsd: number; // fees collected since start (cumulative)
  feesSinceRebalanceUsd: number; // fees since the last collect (reinvested on rebalance)
  costsUsd: number; // total costs (gas+swap+taker)
  rebalances: number;
  outOfRangeSince?: number | null; // ms — 24h hysteresis
  // hedge (only trendAction='hedge'):
  hedge?: { sizeBase: number; entryUsd: number; fundingUsd: number } | null;
  hedgePnlRealizedUsd: number;
  // HODL 50/50 benchmark (amounts frozen at start):
  hodl?: { a0: number; a1: number } | null;
  openedAt?: string;
  startedAt: string; // start of tracking the pool (for APR)
  cashUsd?: number; // when status='cash' — parked value
}
interface PaperState {
  startedAt: string;
  capitalPerPoolUsd: number;
  positions: Record<string, PaperPosition>;
  updatedAt?: string;
}

// --- v3 geometry on floats (human price space; consistent with backtest/engine) ---
const tickToHuman = (t: number, d0: number, d1: number) => Math.pow(1.0001, t) * Math.pow(10, d0 - d1);
/** human amounts for L=1 at human price P within range [pa,pb] */
function amountsPerL(P: number, pa: number, pb: number) {
  const s = Math.sqrt(Math.min(Math.max(P, pa), pb));
  const sa = Math.sqrt(pa), sb = Math.sqrt(pb);
  return { a0: (sb - s) / (s * sb), a1: s - sa }; // token0, token1 (human)
}

/** USD prices of the pool legs — passed in from the observer (respect quote:'WETH') */
export interface LegPrices { px0: number; px1: number; human: number }

/** context injected from observer.ts (avoids an import cycle) */
export interface PaperCtx {
  log: (m: string) => void;
  telegram: (m: string) => Promise<void> | void;
  /** current pool data: advisor statistics + leg prices + trend signal */
  getPool: (poolId: string) => { stats: PoolStats | null; tick?: number | null; prices: LegPrices | null; trendDown: boolean } | null;
}

const load = (): PaperState => {
  try { return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')); }
  catch {
    return { startedAt: new Date().toISOString(), capitalPerPoolUsd: CAPITAL_USD, positions: {} };
  }
};
const state: PaperState = load();
const save = () => {
  state.updatedAt = new Date().toISOString();
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
};
const event = (poolId: string, kind: string, detail: Record<string, unknown>) =>
  fs.appendFileSync(EVENTS_PATH, JSON.stringify({ ts: new Date().toISOString(), poolId, kind, ...detail }) + '\n');

const rebalanceCostUsd = (p: BotPool, valueUsd: number) =>
  (GAS_USD[p.chainId] ?? 5) + valueUsd * 0.5 * (p.feeBps / 1_000_000 + ADVISOR_PARAMS.slippageBps / 10_000);

/** USD value of an open LP position at current prices */
function positionValueUsd(pos: PaperPosition, p: BotPool, pr: LegPrices): number {
  if (pos.status !== 'open' || pos.liquidity == null) return pos.cashUsd ?? pos.capitalUsd;
  const pa = tickToHuman(pos.tickLower!, p.d0, p.d1), pb = tickToHuman(pos.tickUpper!, p.d0, p.d1);
  const { a0, a1 } = amountsPerL(pr.human, pa, pb);
  return pos.liquidity * (a0 * pr.px0 + a1 * pr.px1);
}
const hodlValueUsd = (pos: PaperPosition, pr: LegPrices): number =>
  pos.hodl ? pos.hodl.a0 * pr.px0 + pos.hodl.a1 * pr.px1 : CAPITAL_USD;

/** open an LP position in the suggested range at the current price */
/** `costUsd` (added 22.08): the entry cost WAS charged (`pos.costsUsd += cost`
 *  on REENTRY and REBALANCE), but did NOT reach the event ledger — `event()`
 *  logged only the range and capital. CC-Win noticed this while reading the tail
 *  of `paper-events.ndjson`: at EXIT_TREND `costUsd` is visible, at REENTRY it is not.
 *  Effect: summing costs from the ledger alone gives an UNDERSTATED value (for
 *  cbBTC $11.38 instead of $16.70). The same omission would hurt in a ledger
 *  used for tax settlements, where every cost must be explicit. */
function openPosition(pos: PaperPosition, p: BotPool, pr: LegPrices, stats: PoolStats, capital: number, why: string, ctx: PaperCtx, costUsd?: number) {
  const sug = suggestRange(stats, p.feeBps as any, p.d0, p.d1, { ...ADVISOR_PARAMS, k: p.advisorK ?? ADVISOR_PARAMS.k });
  const pa = tickToHuman(sug.tickLower, p.d0, p.d1), pb = tickToHuman(sug.tickUpper, p.d0, p.d1);
  const per = amountsPerL(pr.human, pa, pb);
  const perValue = per.a0 * pr.px0 + per.a1 * pr.px1;
  if (!(perValue > 0)) return;
  pos.status = 'open';
  pos.tickLower = sug.tickLower;
  pos.tickUpper = sug.tickUpper;
  pos.liquidity = capital / perValue;
  pos.entryHuman = pr.human;
  pos.capitalUsd = capital;
  pos.cashUsd = undefined;
  pos.outOfRangeSince = null;
  pos.openedAt = new Date().toISOString();
  if (!pos.hodl) {
    // benchmark frozen at the FIRST open: 50/50 USD across both legs
    pos.hodl = { a0: capital / 2 / pr.px0, a1: capital / 2 / pr.px1 };
  }
  event(pos.poolId, why, {
    tickLower: sug.tickLower,
    tickUpper: sug.tickUpper,
    capitalUsd: capital,
    widthPct: sug.widthPct,
    ...(costUsd !== undefined ? { costUsd } : {}),
  });
}

/** one paper-trading pass — call after the observer's statistics cycle (15 min) */
export function paperTick(ctx: PaperCtx) {
  const now = Date.now();
  // milestones collected per CYCLE and sent as ONE message — Telegram throttles
  // >1 msg/s to a chat (429 without retry = lost; lesson 18.08: of 5 STARTs 1 arrived)
  const notes: string[] = [];
  for (const p of BOT_POOLS) {
    try {
      const lv = ctx.getPool(p.id);
      if (!lv?.prices) continue;
      const pr = lv.prices;
      let pos = state.positions[p.id];
      if (!pos) {
        pos = state.positions[p.id] = {
          poolId: p.id, status: 'pending', capitalUsd: CAPITAL_USD,
          feesUsd: 0, feesSinceRebalanceUsd: 0, costsUsd: 0, rebalances: 0,
          hedgePnlRealizedUsd: 0, hodl: null, hedge: null, startedAt: new Date().toISOString(),
        };
      }

      // START: the first available suggestion opens the position
      if (pos.status === 'pending') {
        if (lv.stats) {
          openPosition(pos, p, pr, lv.stats, CAPITAL_USD, 'OPEN', ctx);
          const m = `📊 PAPER: START ${p.id} — $${CAPITAL_USD} in range ±${((state.positions[p.id].tickUpper! - state.positions[p.id].tickLower!) / 2 * 0.0001 * 100).toFixed(1)}% (simulation, nothing executed)`;
          ctx.log(m); notes.push(m);
          save();
        }
        continue;
      }

      // FIX 25.08 (Rafal's report: "out of range although in range"):
      // the source of truth for the range is the FRESH tick from slot0 (60 s), not
      // stats.lastTick — on an RPC failure (llamarpc 521, 25.08) stats
      // freeze for hours and inRange lied based on the stale tick.
      const curTick = lv.tick ?? lv.stats?.lastTick ?? null;
      const inRange = pos.status === 'open' && curTick !== null
        ? curTick >= pos.tickLower! && curTick < pos.tickUpper!
        : false;

      // FEES: accrual for the past cycle (only in range) — advisor formula
      if (pos.status === 'open' && lv.stats && inRange) {
        const spacing = TICK_SPACING[p.feeBps] ?? 60;
        const width = Math.max(pos.tickUpper! - pos.tickLower!, 2 * spacing);
        const value = positionValueUsd(pos, p, pr);
        const dtDays = 15 / 1440; // statistics cycle
        const fees = value * lv.stats.feeYieldDaily * ((2 * spacing) / width) * dtDays;
        pos.feesUsd += fees;
        pos.feesSinceRebalanceUsd += fees;
      }

      // TREND CIRCUIT BREAKER
      if (lv.trendDown && pos.status === 'open') {
        const value = positionValueUsd(pos, p, pr);
        if ((p.trendAction ?? 'exit') === 'exit') {
          const cost = rebalanceCostUsd(p, value);
          pos.status = 'cash';
          pos.cashUsd = value - cost + pos.feesSinceRebalanceUsd;
          pos.costsUsd += cost;
          pos.feesSinceRebalanceUsd = 0;
          pos.liquidity = undefined;
          event(p.id, 'EXIT_TREND', { valueUsd: value, costUsd: cost });
          const m = `📊 PAPER: EXIT_TREND ${p.id} — virtually closing $${value.toFixed(0)} to cash (cost $${cost.toFixed(2)}); will re-enter after the signal clears`;
          ctx.log(m); notes.push(m);
        } else if (!pos.hedge) {
          // hedge-excess: short the base token excess above 50% of value
          const baseAmt = pos.liquidity! * amountsPerL(pr.human, tickToHuman(pos.tickLower!, p.d0, p.d1), tickToHuman(pos.tickUpper!, p.d0, p.d1))[p.ethIsToken0 ? 'a0' : 'a1'];
          const baseUsd = p.ethIsToken0 ? pr.px0 : pr.px1;
          const sizeBase = Math.max(0, baseAmt - value / 2 / baseUsd);
          if (sizeBase * baseUsd > 10) {
            const taker = sizeBase * baseUsd * (HEDGE_TAKER_BPS / 10_000);
            pos.hedge = { sizeBase, entryUsd: baseUsd, fundingUsd: 0 };
            pos.costsUsd += taker;
            event(p.id, 'HEDGE_OPEN', { sizeBase, entryUsd: baseUsd, takerUsd: taker });
            const m = `📊 PAPER: HEDGE ${p.id} — virtual short ${sizeBase.toFixed(4)} @ $${baseUsd.toFixed(0)} (~$${(sizeBase * baseUsd).toFixed(0)}); LP stays`;
            ctx.log(m); notes.push(m);
          }
        }
      }

      // HEDGE: funding + close after the signal clears
      if (pos.hedge) {
        const baseUsd = p.ethIsToken0 ? pr.px0 : pr.px1;
        pos.hedge.fundingUsd += pos.hedge.sizeBase * baseUsd * HEDGE_FUNDING_APR * (15 / 1440 / 365);
        if (!lv.trendDown) {
          const pnl = pos.hedge.sizeBase * (pos.hedge.entryUsd - baseUsd) + pos.hedge.fundingUsd;
          const taker = pos.hedge.sizeBase * baseUsd * (HEDGE_TAKER_BPS / 10_000);
          pos.hedgePnlRealizedUsd += pnl - taker;
          event(p.id, 'HEDGE_CLOSE', { pnlUsd: pnl, takerUsd: taker, exitUsd: baseUsd });
          const m = `📊 PAPER: HEDGE CLOSE ${p.id} — short PnL $${(pnl - taker).toFixed(2)} (including funding $${pos.hedge.fundingUsd.toFixed(2)})`;
          pos.hedge = null;
          ctx.log(m); notes.push(m);
        }
      }

      // RE-ENTRY from cash after the signal clears
      if (pos.status === 'cash' && !lv.trendDown && lv.stats) {
        const capital = pos.cashUsd ?? pos.capitalUsd;
        const cost = rebalanceCostUsd(p, capital);
        pos.costsUsd += cost;
        openPosition(pos, p, pr, lv.stats, capital - cost, 'REENTRY', ctx, cost);
        const m = `📊 PAPER: REENTRY ${p.id} — signal cleared, reopening $${(capital - cost).toFixed(0)}`;
        ctx.log(m); notes.push(m);
      }

      // REBALANCE: 24h out-of-range hysteresis + payback <=7d
      if (pos.status === 'open' && lv.stats && !lv.trendDown) {
        if (inRange) pos.outOfRangeSince = null;
        else if (!pos.outOfRangeSince) pos.outOfRangeSince = now;
        else if (now - pos.outOfRangeSince >= HYSTERESIS_MS) {
          const value = positionValueUsd(pos, p, pr);
          const a = assessPosition(
            { tickLower: pos.tickLower!, tickUpper: pos.tickUpper!, valueUsd: value },
            lv.stats, p.chainId, p.feeBps as any, p.feeBps / 1_000_000, p.d0, p.d1,
            { ...ADVISOR_PARAMS, k: p.advisorK ?? ADVISOR_PARAMS.k }
          );
          if (a.action === 'REBALANCE') {
            const cost = a.costUsd;
            const capital = value - cost + pos.feesSinceRebalanceUsd; // collect+reinvest
            pos.costsUsd += cost;
            pos.feesSinceRebalanceUsd = 0;
            pos.rebalances += 1;
            openPosition(pos, p, pr, lv.stats, capital, 'REBALANCE', ctx, cost);
            const m = `📊 PAPER: REBALANCE ${p.id} (#${pos.rebalances}) — new range, capital $${capital.toFixed(0)}, cost $${cost.toFixed(2)}, payback ~${a.paybackDays?.toFixed(1)}d`;
            ctx.log(m); notes.push(m);
          }
          // payback too long → keep waiting (hysteresis keeps running, we check again next cycle)
        }
      }

      // EQUITY SAMPLE every cycle (UI charts + morning report)
      const lpValue = positionValueUsd(pos, p, pr);
      const hedgeOpenPnl = pos.hedge
        ? pos.hedge.sizeBase * (pos.hedge.entryUsd - (p.ethIsToken0 ? pr.px0 : pr.px1)) + pos.hedge.fundingUsd
        : 0;
      const equity = lpValue + pos.feesSinceRebalanceUsd + pos.hedgePnlRealizedUsd + hedgeOpenPnl;
      // price/lo/hi (human) — since 20.08, for the range band on UI charts
      // (Batch 7); lo/hi only when the position is open (in cash there is no range).
      const range = pos.status === 'open' && pos.tickLower != null
        ? { lo: +tickToHuman(pos.tickLower, p.d0, p.d1).toPrecision(6), hi: +tickToHuman(pos.tickUpper!, p.d0, p.d1).toPrecision(6) }
        : {};
      fs.appendFileSync(
        HISTORY_PATH,
        JSON.stringify({
          ts: new Date().toISOString(), poolId: p.id, status: pos.status,
          equityUsd: +equity.toFixed(2), hodlUsd: +hodlValueUsd(pos, pr).toFixed(2),
          feesUsd: +pos.feesUsd.toFixed(2), costsUsd: +pos.costsUsd.toFixed(2),
          inRange, trendDown: lv.trendDown, rebalances: pos.rebalances,
          price: +pr.human.toPrecision(6), ...range,
        }) + '\n'
      );
    } catch (e) {
      ctx.log(`paper ${p.id} failed: ${String(e).slice(0, 140)}`);
    }
  }
  if (notes.length) void ctx.telegram(notes.join('\n\n'));
  save();
}
