/**
 * bot/paper.ts — PAPER TRADING: wirtualny portfel prowadzony przez ALGORITHM
 * v1.2 na żywych danych (decyzja Rafała 18.08). Odpowiada na pytanie "jak
 * zachowałby się algorytm na prawdziwym kapitale" bez ryzykowania go.
 *
 * ZASADY:
 *  - $10k wirtualnego kapitału NA KAŻDĄ pulę z BOT_POOLS (PAPER_CAPITAL_USD env).
 *  - Zero transakcji, zero Rabby — decyzje algorytmu wykonują się wirtualnie
 *    od razu; Telegram dostaje MILESTONY informacyjne (📊 PAPER: ...).
 *  - Wywoływane z observer.ts po każdym cyklu statystyk (15 min).
 *
 * MODEL (uczciwie o przybliżeniach — spójny z doradcą i silnikiem backtestu):
 *  - Otwarcie: zakres = sugestia doradcy (k·σ·√7d, k per pula), kapitał
 *    dzielony geometrią v3 przy bieżącej cenie (float, jak backtest/engine).
 *  - Fees: valueUsd × feeYieldDaily × (2·spacing / szerokość_pozycji) × Δt —
 *    DOKŁADNIE ta sama formuła co expectedDailyFeesUsd w advisor.assessPosition
 *    (trailing yield pasma ±1 spacing przeskalowany na naszą szerokość).
 *    NIE jest to replay per-swap — bez modelowania udziału L w puli; przy
 *    interpretacji pamiętać, że to estymata "sprawiedliwego" yieldu.
 *  - Rebalans: ALGORITHM v1 trigger — poza zakresem NIEPRZERWANIE ≥24h
 *    (histereza) ORAZ payback ≤7d (assessPosition). Koszt = gas + pół obrotu
 *    × (fee tier + 5 bps slippage). Fees zebrane dopisują się do kapitału
 *    przy rebalansie (collect+reinwest).
 *  - Bezpiecznik trendu per pula (trendAction): 'exit' → wirtualne zamknięcie
 *    do cash 50/50 (koszt jw.), powrót po zgaśnięciu sygnału (trendReentry);
 *    'hedge' → wirtualny short nadwyżki ETH >50% wartości (taker 5 bps
 *    otwarcie/zamknięcie, funding +2.9%/r dla shorta — historyczna średnia
 *    z F4; LP zostaje).
 *  - Benchmark: HODL 50/50 — kwoty tokenów zamrożone w chwili otwarcia,
 *    wyceniane bieżącymi cenami (ta sama definicja co bramka projektu).
 *  - Wycena USD respektuje quote:'WETH' (ceny nóg podaje observer).
 *
 * PLIKI (w .bot/, gitignored — NIE force-addować, lekcja 17.08):
 *  - paper-state.json    — bieżący stan portfela (czyta /api/paper),
 *  - paper-events.ndjson — księga decyzji (open/rebalance/exit/reentry/hedge),
 *  - paper-history.ndjson — próbki equity co 15 min (wykresy UI).
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
const HYSTERESIS_MS = 24 * 3600 * 1000; // h=24 z ALGORITHM v1
// te same założenia kosztowe co advisor/backtest (GAS_USD w advisor.ts jest
// prywatny — duplikacja wg istniejącej konwencji z useCockpitActions.ts)
const GAS_USD: Record<number, number> = { 1: 8, 8453: 0.08, 42161: 0.1 };
const HEDGE_TAKER_BPS = 5;
const HEDGE_FUNDING_APR = 0.029; // +2.9%/r DLA shorta (Binance 400d, F4)
const TICK_SPACING: Record<number, number> = { 100: 1, 500: 10, 3000: 60, 10000: 200 };

// --- typy stanu ---
export interface PaperPosition {
  poolId: string;
  status: 'open' | 'cash' | 'pending'; // pending = czeka na pierwszą sugestię
  capitalUsd: number; // kapitał pracujący (po kosztach, z reinwestowanymi fees)
  // pozycja LP (gdy open):
  tickLower?: number;
  tickUpper?: number;
  liquidity?: number; // float, jednostki human (konwencja backtest/engine)
  entryHuman?: number; // cena human przy otwarciu
  // księga:
  feesUsd: number; // zebrane fees od startu (narastająco)
  feesSinceRebalanceUsd: number; // fees od ostatniego collect (reinwest przy rebalansie)
  costsUsd: number; // suma kosztów (gas+swap+taker)
  rebalances: number;
  outOfRangeSince?: number | null; // ms — histereza 24h
  // hedge (tylko trendAction='hedge'):
  hedge?: { sizeBase: number; entryUsd: number; fundingUsd: number } | null;
  hedgePnlRealizedUsd: number;
  // benchmark HODL 50/50 (kwoty zamrożone na starcie):
  hodl?: { a0: number; a1: number } | null;
  openedAt?: string;
  startedAt: string; // start śledzenia puli (do APR)
  cashUsd?: number; // gdy status='cash' — wartość zaparkowana
}
interface PaperState {
  startedAt: string;
  capitalPerPoolUsd: number;
  positions: Record<string, PaperPosition>;
  updatedAt?: string;
}

// --- geometria v3 na floatach (human price space; zgodna z backtest/engine) ---
const tickToHuman = (t: number, d0: number, d1: number) => Math.pow(1.0001, t) * Math.pow(10, d0 - d1);
/** kwoty human dla L=1 przy cenie human P w zakresie [pa,pb] */
function amountsPerL(P: number, pa: number, pb: number) {
  const s = Math.sqrt(Math.min(Math.max(P, pa), pb));
  const sa = Math.sqrt(pa), sb = Math.sqrt(pb);
  return { a0: (sb - s) / (s * sb), a1: s - sa }; // token0, token1 (human)
}

/** ceny USD nóg puli — przekazywane z observera (respektują quote:'WETH') */
export interface LegPrices { px0: number; px1: number; human: number }

/** kontekst wstrzykiwany z observer.ts (unikamy cyklu importów) */
export interface PaperCtx {
  log: (m: string) => void;
  telegram: (m: string) => Promise<void> | void;
  /** bieżące dane puli: statystyki doradcy + ceny nóg + sygnał trendu */
  getPool: (poolId: string) => { stats: PoolStats | null; prices: LegPrices | null; trendDown: boolean } | null;
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

/** wartość USD otwartej pozycji LP przy bieżących cenach */
function positionValueUsd(pos: PaperPosition, p: BotPool, pr: LegPrices): number {
  if (pos.status !== 'open' || pos.liquidity == null) return pos.cashUsd ?? pos.capitalUsd;
  const pa = tickToHuman(pos.tickLower!, p.d0, p.d1), pb = tickToHuman(pos.tickUpper!, p.d0, p.d1);
  const { a0, a1 } = amountsPerL(pr.human, pa, pb);
  return pos.liquidity * (a0 * pr.px0 + a1 * pr.px1);
}
const hodlValueUsd = (pos: PaperPosition, pr: LegPrices): number =>
  pos.hodl ? pos.hodl.a0 * pr.px0 + pos.hodl.a1 * pr.px1 : CAPITAL_USD;

/** otwarcie pozycji LP w zakresie sugestii przy bieżącej cenie */
function openPosition(pos: PaperPosition, p: BotPool, pr: LegPrices, stats: PoolStats, capital: number, why: string, ctx: PaperCtx) {
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
    // benchmark zamrożony przy PIERWSZYM otwarciu: 50/50 USD po obu nogach
    pos.hodl = { a0: capital / 2 / pr.px0, a1: capital / 2 / pr.px1 };
  }
  event(pos.poolId, why, { tickLower: sug.tickLower, tickUpper: sug.tickUpper, capitalUsd: capital, widthPct: sug.widthPct });
}

/** jeden przebieg paper-tradingu — wołać po cyklu statystyk observera (15 min) */
export function paperTick(ctx: PaperCtx) {
  const now = Date.now();
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

      // START: pierwsza dostępna sugestia otwiera pozycję
      if (pos.status === 'pending') {
        if (lv.stats) {
          openPosition(pos, p, pr, lv.stats, CAPITAL_USD, 'OPEN', ctx);
          const m = `📊 PAPER: START ${p.id} — $${CAPITAL_USD} w zakresie ±${((state.positions[p.id].tickUpper! - state.positions[p.id].tickLower!) / 2 * 0.0001 * 100).toFixed(1)}% (symulacja, nic nie wykonano)`;
          ctx.log(m); void ctx.telegram(m);
          save();
        }
        continue;
      }

      const inRange = pos.status === 'open' && lv.stats
        ? lv.stats.lastTick >= pos.tickLower! && lv.stats.lastTick < pos.tickUpper!
        : false;

      // FEES: akrecja za miniony cykl (tylko w zakresie) — formuła doradcy
      if (pos.status === 'open' && lv.stats && inRange) {
        const spacing = TICK_SPACING[p.feeBps] ?? 60;
        const width = Math.max(pos.tickUpper! - pos.tickLower!, 2 * spacing);
        const value = positionValueUsd(pos, p, pr);
        const dtDays = 15 / 1440; // cykl statystyk
        const fees = value * lv.stats.feeYieldDaily * ((2 * spacing) / width) * dtDays;
        pos.feesUsd += fees;
        pos.feesSinceRebalanceUsd += fees;
      }

      // BEZPIECZNIK TRENDU
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
          const m = `📊 PAPER: EXIT_TREND ${p.id} — zamykam wirtualnie $${value.toFixed(0)} do cash (koszt $${cost.toFixed(2)}); wrócę po zgaśnięciu sygnału`;
          ctx.log(m); void ctx.telegram(m);
        } else if (!pos.hedge) {
          // hedge-excess: short nadwyżki tokena bazowego ponad 50% wartości
          const baseAmt = pos.liquidity! * amountsPerL(pr.human, tickToHuman(pos.tickLower!, p.d0, p.d1), tickToHuman(pos.tickUpper!, p.d0, p.d1))[p.ethIsToken0 ? 'a0' : 'a1'];
          const baseUsd = p.ethIsToken0 ? pr.px0 : pr.px1;
          const sizeBase = Math.max(0, baseAmt - value / 2 / baseUsd);
          if (sizeBase * baseUsd > 10) {
            const taker = sizeBase * baseUsd * (HEDGE_TAKER_BPS / 10_000);
            pos.hedge = { sizeBase, entryUsd: baseUsd, fundingUsd: 0 };
            pos.costsUsd += taker;
            event(p.id, 'HEDGE_OPEN', { sizeBase, entryUsd: baseUsd, takerUsd: taker });
            const m = `📊 PAPER: HEDGE ${p.id} — wirtualny short ${sizeBase.toFixed(4)} @ $${baseUsd.toFixed(0)} (~$${(sizeBase * baseUsd).toFixed(0)}); LP zostaje`;
            ctx.log(m); void ctx.telegram(m);
          }
        }
      }

      // HEDGE: funding + zamknięcie po zgaśnięciu sygnału
      if (pos.hedge) {
        const baseUsd = p.ethIsToken0 ? pr.px0 : pr.px1;
        pos.hedge.fundingUsd += pos.hedge.sizeBase * baseUsd * HEDGE_FUNDING_APR * (15 / 1440 / 365);
        if (!lv.trendDown) {
          const pnl = pos.hedge.sizeBase * (pos.hedge.entryUsd - baseUsd) + pos.hedge.fundingUsd;
          const taker = pos.hedge.sizeBase * baseUsd * (HEDGE_TAKER_BPS / 10_000);
          pos.hedgePnlRealizedUsd += pnl - taker;
          event(p.id, 'HEDGE_CLOSE', { pnlUsd: pnl, takerUsd: taker, exitUsd: baseUsd });
          const m = `📊 PAPER: HEDGE CLOSE ${p.id} — PnL shorta $${(pnl - taker).toFixed(2)} (w tym funding $${pos.hedge.fundingUsd.toFixed(2)})`;
          pos.hedge = null;
          ctx.log(m); void ctx.telegram(m);
        }
      }

      // POWRÓT z cash po zgaśnięciu sygnału
      if (pos.status === 'cash' && !lv.trendDown && lv.stats) {
        const capital = pos.cashUsd ?? pos.capitalUsd;
        const cost = rebalanceCostUsd(p, capital);
        pos.costsUsd += cost;
        openPosition(pos, p, pr, lv.stats, capital - cost, 'REENTRY', ctx);
        const m = `📊 PAPER: REENTRY ${p.id} — sygnał zgasł, otwieram ponownie $${(capital - cost).toFixed(0)}`;
        ctx.log(m); void ctx.telegram(m);
      }

      // REBALANS: histereza 24h poza zakresem + payback ≤7d
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
            const capital = value - cost + pos.feesSinceRebalanceUsd; // collect+reinwest
            pos.costsUsd += cost;
            pos.feesSinceRebalanceUsd = 0;
            pos.rebalances += 1;
            openPosition(pos, p, pr, lv.stats, capital, 'REBALANCE', ctx);
            const m = `📊 PAPER: REBALANS ${p.id} (#${pos.rebalances}) — nowy zakres, kapitał $${capital.toFixed(0)}, koszt $${cost.toFixed(2)}, payback ~${a.paybackDays?.toFixed(1)}d`;
            ctx.log(m); void ctx.telegram(m);
          }
          // payback za długi → czekamy dalej (histereza biegnie, sprawdzimy za cykl)
        }
      }

      // PRÓBKA EQUITY co cykl (wykresy UI + raport poranny)
      const lpValue = positionValueUsd(pos, p, pr);
      const hedgeOpenPnl = pos.hedge
        ? pos.hedge.sizeBase * (pos.hedge.entryUsd - (p.ethIsToken0 ? pr.px0 : pr.px1)) + pos.hedge.fundingUsd
        : 0;
      const equity = lpValue + pos.feesSinceRebalanceUsd + pos.hedgePnlRealizedUsd + hedgeOpenPnl;
      fs.appendFileSync(
        HISTORY_PATH,
        JSON.stringify({
          ts: new Date().toISOString(), poolId: p.id, status: pos.status,
          equityUsd: +equity.toFixed(2), hodlUsd: +hodlValueUsd(pos, pr).toFixed(2),
          feesUsd: +pos.feesUsd.toFixed(2), costsUsd: +pos.costsUsd.toFixed(2),
          inRange, trendDown: lv.trendDown, rebalances: pos.rebalances,
        }) + '\n'
      );
    } catch (e) {
      ctx.log(`paper ${p.id} failed: ${String(e).slice(0, 140)}`);
    }
  }
  save();
}
