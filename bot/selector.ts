/**
 * bot/selector.ts — SELECTION LAYER: morning OPEN / ROTATE proposals.
 *
 * Policy validated by meta-backtest (backtest/selection.ts, 231 pools, 4.4y):
 *   Top5 by 7d average apyBase + 3-day persistence in the top zone + majors ONLY
 *   (74.8% fee-APR vs 43.0% naive chasing vs 32.9% fixed core).
 * Rotation by the rule from RESEARCH-QUEUE C: the candidate's edge must cover the
 * switch cost (0.3% of capital) in <=10 days; max 1 rotation proposal per day.
 *
 * Inputs: data/llama/universe.json + data/llama/history/<uuid>.json —
 * refreshed daily by the pipeline (Windows Task Scheduler 07:30).
 * The selector runs once a day after RUN_AFTER_HOUR, only when data is <26h old.
 *
 * MODE: proposals go to proposals.json (kind: OPEN/ROTATE) — the bot executes
 * nothing; the UI shows cards [Approve]/[Modify]/[Dismiss] (Batch 4),
 * and Approve always ends with signatures in Rabby.
 */
import * as fs from 'fs';
import * as path from 'path';
import { BOT_POOLS, BotPool, STATE_DIR } from './config';
import { readVerdicts } from './candidates';

const ROOT = path.join(__dirname, '..');
const LLAMA = path.join(ROOT, 'data', 'llama');
const SELECTOR_STATE = path.join(ROOT, STATE_DIR, 'selector-state.json');

// --- policy parameters (after freezing ALGORITHM.md: single source of truth here and in the backtest) ---
const TOP_N = 5;
const RANK_WINDOW_D = 7;
const PERSIST_DAYS = 3;
const MIN_TVL = 3_000_000;
const MAJORS = /ETH|BTC|USDC|USDT|DAI|USDS/;
const SWITCH_COST_PCT = 0.3; // exit+entry, % of capital (2× 0.15 from selection.ts)
const MAX_PAYBACK_DAYS = 10; // the edge must cover the switch cost in <=10 days
const MIN_ROTATE_USD = 25; // dust positions: fixed gas cost > value, we do not propose rotation
// gas for a FULL cycle (close+open) per chain — static fallback;
// since 26.08 (review decision, DECISIONS 6a) the observer supplies the LIVE cost via
// ctx.getGasUsd and the static table only plays before the first read.
const GAS_CYCLE_USD: Record<string, number> = { mainnet: 8, base: 0.1, arbitrum: 0.2 };
const chainOf = (key: string): string | null => {
  const k = key.toLowerCase();
  for (const chain of Object.keys(GAS_CYCLE_USD)) if (k.includes(chain) || (chain === 'mainnet' && k.includes('ethereum'))) return chain;
  return null;
};
const gasCycleUsd = (key: string, ctx?: SelectorCtx): number => {
  const chain = chainOf(key);
  if (!chain) return 1; // unknown chain: conservative default
  return ctx?.getGasUsd?.(chain) ?? GAS_CYCLE_USD[chain];
};
const RUN_AFTER_HOUR = 6; // local hour, after the 05:30 pipeline (25.08: the whole chain moved ~2h earlier, Rafal's decision)
const MAX_DATA_AGE_H = 26; // do not propose from stale data
const REPROPOSE_COOLDOWN_D = 7; // a dismissed proposal does not come back for a week
const MAX_OPEN_PROPOSALS_PER_DAY = 2;

const FEE_META: Record<number, string> = { 100: '0.01%', 500: '0.05%', 3000: '0.3%', 10000: '1%' };
// Arbitrum added 2026-08-11 after a passed 365d walk-forward (re>EMA 73% wins,
// worst −3.49 — best result in the project; Rafal's decision). OP deliberately NOT
// (thin $4.3M pool, gate far away, unstable profile).
const CHAIN_MAP: Record<string, string> = { Ethereum: 'mainnet', Base: 'base', Arbitrum: 'arbitrum' };

interface LlamaPoolMeta {
  pool: string; // DefiLlama uuid
  symbol: string; // e.g. "WETH-USDC"
  chain: string;
  project: string;
  poolMeta: string | null; // e.g. "0.3%"
  tvlUsd: number;
}
interface RankedPool extends LlamaPoolMeta {
  apy7d: number;
  streak: number;
  botPool: BotPool | null; // match against our configuration (address known)
}

interface SelectorState {
  lastRunDate: string | null; // YYYY-MM-DD
  lastRotateDate: string | null;
  streaks: Record<string, number>; // uuid → consecutive days in the top zone (2N)
}

const loadSelState = (): SelectorState => {
  try {
    return JSON.parse(fs.readFileSync(SELECTOR_STATE, 'utf8'));
  } catch {
    return { lastRunDate: null, lastRotateDate: null, streaks: {} };
  }
};
const saveSelState = (s: SelectorState) => {
  fs.mkdirSync(path.dirname(SELECTOR_STATE), { recursive: true });
  fs.writeFileSync(SELECTOR_STATE, JSON.stringify(s, null, 2));
};

const isMajorsPair = (sym: string) => sym.split('-').every((t) => MAJORS.test(t));

/** average apyBase over a window of `days` entries ending `offsetDays` days back
 *  (offsetDays=0 → latest; >0 → historical, for seeding streaks) */
function trailingApy(uuid: string, days: number, offsetDays = 0): number | null {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(LLAMA, 'history', `${uuid}.json`), 'utf8'));
    const all: Array<{ apyBase: number | null }> = j.series || [];
    const sliced = offsetDays > 0 ? all.slice(0, Math.max(0, all.length - offsetDays)) : all;
    const series = sliced.slice(-days);
    const vals = series.map((r) => r.apyBase).filter((v): v is number => v !== null && v !== undefined);
    return vals.length >= days * 0.7 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  } catch {
    return null;
  }
}

/** match a DefiLlama pool to an entry in BOT_POOLS (chain + symbols + fee tier) */
function matchBotPool(m: LlamaPoolMeta): BotPool | null {
  const chain = CHAIN_MAP[m.chain];
  if (!chain) return null;
  const syms = new Set(m.symbol.split('-').map((s) => s.toUpperCase()));
  return (
    BOT_POOLS.find(
      (b) =>
        b.chain === chain &&
        FEE_META[b.feeBps] === (m.poolMeta || '').trim() &&
        syms.has(b.sym0.toUpperCase()) &&
        syms.has(b.sym1.toUpperCase())
    ) ?? null
  );
}

/** daily ranking: filter (v3, chain, TVL, majors) → apy7d → top zone → persistence.
 *  offsetDays>0 = historical pass (only streak update — cold start). */
function buildRanking(state: SelectorState, offsetDays = 0): RankedPool[] {
  const universe: LlamaPoolMeta[] = JSON.parse(fs.readFileSync(path.join(LLAMA, 'universe.json'), 'utf8'));
  const candidates = universe
    .filter(
      (p) =>
        p.project === 'uniswap-v3' && // v4 deliberately out of scope (different stack)
        CHAIN_MAP[p.chain] &&
        p.tvlUsd >= MIN_TVL &&
        isMajorsPair(p.symbol)
    )
    .map((p) => ({ ...p, apy7d: trailingApy(p.pool, RANK_WINDOW_D, offsetDays) }))
    .filter((p): p is LlamaPoolMeta & { apy7d: number } => p.apy7d !== null)
    .sort((a, b) => b.apy7d - a.apy7d);

  // top zone = 2N (as in selection.ts) — for counting persistence
  const topZone = new Set(candidates.slice(0, TOP_N * 2).map((p) => p.pool));
  for (const uuid of topZone) state.streaks[uuid] = (state.streaks[uuid] || 0) + 1;
  for (const uuid of Object.keys(state.streaks)) if (!topZone.has(uuid)) state.streaks[uuid] = 0;

  return candidates.map((p) => ({
    ...p,
    streak: state.streaks[p.pool] || 0,
    botPool: matchBotPool(p),
  }));
}

// --- types of the context passed from observer.ts (no import, to avoid a cycle) ---
export interface SelectorProposal {
  id: string;
  createdAt: string;
  kind: 'OPEN' | 'ROTATE';
  action: string; // human-readable description for UI/Telegram
  tokenId: string; // '' for OPEN; for ROTATE: the position to close
  poolId: string; // BOT_POOLS id or '' when the pool is outside the configuration
  llamaPool?: string; // DefiLlama uuid
  symbol?: string;
  chain?: string;
  apy7d?: number; // candidate
  heldApy7d?: number; // for ROTATE: the current pool
  breakEvenDays?: number; // for ROTATE: days to cover the switch cost
  suggestedRange?: { tickLower: number; tickUpper: number; usdLo: number; usdHi: number };
  note?: string;
  costUsd?: number;
  paybackDays?: number | null;
  status: 'open' | 'dismissed';
}

export interface SelectorCtx {
  log: (msg: string) => void;
  telegram: (text: string) => Promise<void>;
  getProposals: () => Array<{ id: string; status: string; createdAt: string }>;
  addProposal: (p: SelectorProposal) => void; // the observer appends to proposals.json + state
  getPositions: () => Array<{ tokenId: string; poolId: string; valueUsd: number }>;
  getSuggestion: (poolId: string) => { tickLower: number; tickUpper: number; usdLo: number; usdHi: number } | null;
  /** live full-cycle gas cost in USD per chain ('mainnet'|'base'|'arbitrum');
   *  null/undefined → fallback to the static GAS_CYCLE_USD (26.08, DECISIONS 6a) */
  getGasUsd?: (chain: string) => number | null;
}

const today = () => new Date().toISOString().slice(0, 10);

/** whether a proposal with this key is open or was dismissed within the cooldown window */
function blocked(ctx: SelectorCtx, id: string): boolean {
  const cutoff = Date.now() - REPROPOSE_COOLDOWN_D * 24 * 3600 * 1000;
  return ctx.getProposals().some(
    (p) => p.id === id && (p.status === 'open' || new Date(p.createdAt).getTime() > cutoff)
  );
}

/** Run once a day after RUN_AFTER_HOUR, provided the pipeline data is fresh. */
export function runSelectorIfDue(ctx: SelectorCtx): void {
  const state = loadSelState();
  if (state.lastRunDate === today()) return;
  if (new Date().getHours() < RUN_AFTER_HOUR) return;

  const uniPath = path.join(LLAMA, 'universe.json');
  const st = fs.statSync(uniPath, { throwIfNoEntry: false });
  if (!st) {
    ctx.log('selector: no data/llama/universe.json — pipeline did not run? skipping today');
    state.lastRunDate = today(); // do not hammer every hour until it works
    saveSelState(state);
    return;
  }
  // The universe must be from TODAY (UTC date, pattern like the fetch-llama fix 24.08):
  // the 26h limit alone would let yesterday's file through while the pipeline is still running /
  // has failed — in that case we do NOT mark the day, just wait for the next cycle (up to 26h).
  const mtimeDay = new Date(st.mtimeMs).toISOString().slice(0, 10);
  const ageH = (Date.now() - st.mtimeMs) / 3_600_000;
  if (mtimeDay !== today() && ageH <= MAX_DATA_AGE_H) {
    ctx.log(`selector: universe.json from ${mtimeDay} (not today) — waiting for today's pipeline, will retry in the next cycle`);
    return; // without lastRunDate — retry until the pipeline finishes or the data exceeds 26h
  }
  if (ageH > MAX_DATA_AGE_H) {
    ctx.log(`selector: DefiLlama data is ${ageH.toFixed(1)}h old (>${MAX_DATA_AGE_H}h) — not proposing from stale data`);
    state.lastRunDate = today();
    saveSelState(state);
    return;
  }

  let ranking: RankedPool[];
  try {
    // COLD START: without saved state the 3d persistence would block proposals
    // for the first 3 days — we seed the streaks with historical passes
    // (ranking from 3, 2, 1 days ago from the same DefiLlama history files).
    const coldStart = !state.lastRunDate && Object.keys(state.streaks).length === 0;
    if (coldStart) {
      for (let k = PERSIST_DAYS; k >= 1; k--) buildRanking(state, k);
      ctx.log(`selector: cold start — streaks seeded from history (${PERSIST_DAYS} days back)`);
    }
    ranking = buildRanking(state);
  } catch (e) {
    ctx.log(`selector: ranking error: ${String(e).slice(0, 160)}`);
    return;
  }

  // Funnel verdicts (ranking consistency — Rafal's decision 25.08): a pool with
  // a FAIL/UNMAPPED verdict does not take a place in the top, is not eligible
  // and gets no OPEN proposal — the walkforward gate takes precedence over
  // headline APY (6/7 examined top candidates dropped out).
  const verdictBy = new Map(readVerdicts(path.join(ROOT, STATE_DIR)).map((v) => [v.llamaPool, v.verdict]));
  const isRejected = (uuid: string) => {
    const v = verdictBy.get(uuid);
    return v === 'FAIL' || v === 'UNMAPPED';
  };

  const eligible = ranking.filter((p) => p.streak >= PERSIST_DAYS && !isRejected(p.pool)).slice(0, TOP_N);

  // TOP 10 of the day → .bot/selector-ranking.json (section "watched for entry"
  // in the UI + future import into SQLite selector_ranking; Rafal's decision 18.08).
  try {
    fs.writeFileSync(
      path.join(ROOT, STATE_DIR, 'selector-ranking.json'),
      JSON.stringify({
        day: today(),
        generatedAt: new Date().toISOString(),
        criteria: { window: `${RANK_WINDOW_D}d avg apyBase`, persistDays: PERSIST_DAYS, minTvlUsd: MIN_TVL, filter: 'uniswap-v3, majors, ETH/Base/Arb' },
        rows: (() => {
          // "TOP10 OF GOOD ONES" (Rafal 25.08): pools rejected by the gate are shown
          // at their APY positions (⛔ badge in the UI), but do NOT take up the pool
          // of ten — the list grows until it collects 10 pools with status
          // unexamined / validated / playing-in-bot.
          const shown: RankedPool[] = [];
          let good = 0;
          for (const p of ranking) {
            shown.push(p);
            if (!isRejected(p.pool)) good++;
            if (good >= 10) break;
          }
          return shown.map((p, i) => ({
            rank: i + 1,
            symbol: p.symbol, chain: p.chain, poolMeta: p.poolMeta,
            apy7d: +p.apy7d.toFixed(2), streak: p.streak,
            eligible: p.streak >= PERSIST_DAYS && !isRejected(p.pool),
            rejected: isRejected(p.pool),
            tvlUsd: Math.round(p.tvlUsd),
            botPoolId: p.botPool?.id ?? null, // in the bot configuration = executable right away
            llamaUuid: p.pool,
          }));
        })(),
      }, null, 2)
    );
  } catch (e) {
    ctx.log(`selector: ranking write failed: ${String(e).slice(0, 120)}`);
  }

  const positions = ctx.getPositions();
  const heldPoolIds = new Set(positions.map((p) => p.poolId));
  const heldLlama = new Map<string, RankedPool>(); // poolId → ranking entry of the currently held pool
  for (const r of ranking) if (r.botPool && heldPoolIds.has(r.botPool.id)) heldLlama.set(r.botPool.id, r);

  ctx.log(
    // 'ranking dnia' (= daily ranking) is a log literal grepped by scripts/morning-report.ts (/selector:|ranking dnia/i) — kept unchanged
    `selector: ranking dnia — eligible top${TOP_N} (persist.>=${PERSIST_DAYS}d): ` +
      (eligible.map((p) => `${p.symbol}@${p.chain} ${p.apy7d.toFixed(1)}%`).join(', ') || 'NONE (nobody kept the streak)')
  );

  // --- OPEN: eligible pools in which we have no position ---
  let opens = 0;
  for (const cand of eligible) {
    if (opens >= MAX_OPEN_PROPOSALS_PER_DAY) break;
    if (cand.botPool && heldPoolIds.has(cand.botPool.id)) continue; // already there
    const id = `open-${cand.pool}`;
    if (blocked(ctx, id)) continue;

    const range = cand.botPool ? ctx.getSuggestion(cand.botPool.id) : null;
    const prop: SelectorProposal = {
      id,
      createdAt: new Date().toISOString(),
      kind: 'OPEN',
      action: `OPEN ${cand.symbol} ${cand.poolMeta ?? ''} @ ${cand.chain} (7d avg ${cand.apy7d.toFixed(1)}% APR, in top for ${cand.streak}d)`,
      tokenId: '',
      poolId: cand.botPool?.id ?? '',
      llamaPool: cand.pool,
      symbol: cand.symbol,
      chain: cand.chain,
      apy7d: cand.apy7d,
      suggestedRange: range ?? undefined,
      note: cand.botPool
        ? range
          ? undefined
          : 'pool is in the bot configuration, but the advisor has no statistics yet — set the range manually (Modify)'
        : 'pool OUTSIDE the bot configuration — before opening add it to bot/config.ts BOT_POOLS (task for Claude Code)',
      status: 'open',
    };
    ctx.addProposal(prop);
    opens++;
    const msg = `🤖 HOMOS selector: ${prop.action}${prop.note ? ` — ${prop.note}` : ''} [OBSERVE — nothing executed]`;
    ctx.log(msg);
    void ctx.telegram(msg);
  }

  // --- ROTATE: our position drops out of the ranking, the candidate covers the cost in <=10 days ---
  if (state.lastRotateDate !== today()) {
    const bestCand = eligible.find((c) => !(c.botPool && heldPoolIds.has(c.botPool.id)));
    if (bestCand) {
      // the weakest of our positions by the apy7d of its pool (no data = we do not touch it)
      const heldRanked = positions
        .map((pos) => ({ pos, r: heldLlama.get(pos.poolId) }))
        .filter((x): x is { pos: (typeof positions)[0]; r: RankedPool } => !!x.r)
        .sort((a, b) => a.r.apy7d - b.r.apy7d);
      const weakest = heldRanked[0];
      if (weakest && weakest.pos.valueUsd < MIN_ROTATE_USD) {
        ctx.log(
          `selector: rotation skipped — position #${weakest.pos.tokenId} worth $${weakest.pos.valueUsd.toFixed(2)} < $${MIN_ROTATE_USD} (fixed gas > economic sense)`
        );
      } else if (weakest) {
        const edge = bestCand.apy7d - weakest.r.apy7d; // p.p. per year
        // SWITCH cost IN USD: proportional part (swap/slippage) + FIXED gas
        // (close on the source chain + open on the target — half a cycle each).
        // The previous version computed payback purely in percent and for dust positions
        // ($2) proposed rotations where mainnet gas alone ($8) exceeded the position value.
        const posUsd = weakest.pos.valueUsd;
        const costUsd =
          posUsd * (SWITCH_COST_PCT / 100) +
          gasCycleUsd(weakest.pos.poolId, ctx) / 2 +
          gasCycleUsd(bestCand.botPool?.id ?? bestCand.chain ?? '', ctx) / 2;
        const edgeUsdPerDay = posUsd * (edge / 100) / 365;
        const breakEvenDays = edgeUsdPerDay > 0 ? costUsd / edgeUsdPerDay : Infinity;
        if (breakEvenDays <= MAX_PAYBACK_DAYS) {
          const id = `rotate-${weakest.pos.tokenId}-${bestCand.pool}`;
          if (!blocked(ctx, id)) {
            const range = bestCand.botPool ? ctx.getSuggestion(bestCand.botPool.id) : null;
            const prop: SelectorProposal = {
              id,
              createdAt: new Date().toISOString(),
              kind: 'ROTATE',
              action: `ROTATE #${weakest.pos.tokenId} (${weakest.pos.poolId}, 7d ${weakest.r.apy7d.toFixed(1)}%) → ${bestCand.symbol} ${bestCand.poolMeta ?? ''} @ ${bestCand.chain} (7d ${bestCand.apy7d.toFixed(1)}%; switch cost pays back in ~${breakEvenDays.toFixed(1)}d)`,
              tokenId: weakest.pos.tokenId,
              poolId: bestCand.botPool?.id ?? '',
              llamaPool: bestCand.pool,
              symbol: bestCand.symbol,
              chain: bestCand.chain,
              apy7d: bestCand.apy7d,
              heldApy7d: weakest.r.apy7d,
              breakEvenDays,
              suggestedRange: range ?? undefined,
              note: bestCand.botPool ? undefined : 'target pool OUTSIDE the bot configuration — add it to BOT_POOLS before executing',
              status: 'open',
            };
            ctx.addProposal(prop);
            state.lastRotateDate = today();
            const msg = `🤖 HOMOS selector: ${prop.action} [OBSERVE — nothing executed]`;
            ctx.log(msg);
            void ctx.telegram(msg);
          }
        } else {
          ctx.log(
            `selector: rotation not worth it — best candidate ${bestCand.symbol} edge ${edge.toFixed(1)} p.p. → cost recovered in ${breakEvenDays === Infinity ? '∞' : breakEvenDays.toFixed(0)}d (limit ${MAX_PAYBACK_DAYS}d)`
          );
        }
      }
    }
  }

  state.lastRunDate = today();
  saveSelState(state);
}
