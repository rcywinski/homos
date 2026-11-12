/**
 * Field legends for the backtest result files (step 2.1, owner addition). The files carry bare numbers (mean, med,
 * winPct, worst); read_backtest_results puts the legend of the file's family in front of the data so the model knows
 * what a number measures and in which unit. Every definition is taken from the script that writes the family, named
 * in `source` (and for the pegged file suffix, the journal); a field whose meaning is not documented in this repository is listed as such, not guessed.
 *
 * The e8-* files are not named like the scripts' own output names (lp-vol-timing-*, funding-carry-*,
 * vault-house-edge-*, yield-benchmark-*): they were renamed when saved for experiment 8. The family is assigned by the
 * file's fields, which match the script's JSON output exactly.
 */

export interface Legend {
  family: string;
  source: string;
  lines: string[];
}

const WINDOW_STATS = (value: string) =>
  `mean, med, winPct, worst, best, windows: statistics over the per-window values (${value}): mean; median (the upper middle value, sorted[floor(n/2)]); % of windows with a value > 0; lowest; highest; number of windows.`;

const LEGENDS: Array<{ test: (name: string) => boolean } & Legend> = [
  {
    test: (n) => n.startsWith('walkforward-'),
    family: 'walk-forward',
    source: 'backtest/walkforward.ts, backtest/engine.ts',
    lines: [
      'The history is cut into overlapping windows of windowDays, a new one every stepDays; every strategy runs in every window. start: window start, unix seconds.',
      'v (perWindow): the strategy\'s final value against HODL 50/50 in the same window, in % ((final / HODL final - 1) x 100). Positive = beat HODL.',
      WINDOW_STATS('v, % vs HODL'),
      'apr, aprQ25, aprMed, aprQ75: the strategy\'s own APR in a window, % per year, compounded ((final / start)^(365 / days) - 1), and its quartiles across windows.',
      'Regime of a window: the change of the pair\'s relative price over the window (pchgPct, %): up above +10%, down below -10%, flat in between (regimeThreshold 0.1). byRegime: the same statistics per regime; regimeCounts: windows per regime.',
      'recent90: the statistics over windows that start in the last 90 days of the data. hodlByRegime: APR quartiles of HODL 50/50 per regime.',
      'summary and perWindow are keyed by strategy name (Polish, for example "Pasywny ±50%" = passive ±50% range).',
      'Criterion printed by the script: a strategy is sound with winPct >= 65 and worst > -3; the project gate (PLAN.md): it must win in at least 2 regimes.',
    ],
  },
  {
    test: (n) => n.startsWith('e8-timing'),
    family: 'LP timing by volatility (experiment 8)',
    source: 'backtest/lp-vol-timing.ts',
    lines: [
      'Recomputes nothing: takes the per-window v of walk-forward files (% vs HODL 50/50, see walk-forward) for the pools in ids, windows of WF_DAYS days, and groups the windows by the market state at window start.',
      WINDOW_STATS('v, % vs HODL'),
      'Buckets: RV7, RV30 realized volatility (annualized %, from daily prices); DVOL Deribit implied volatility; VRP = DVOL - RV30; SHOCK = RV7 / RV30 (above 1.3 = just after a storm, below 0.8 = calm). dvT1, dvT2: DVOL tercile boundaries.',
      'byStrat: strategy, then bucket ("WSZYSTKIE" = all windows), then the statistics plus perPool; posPools: pools with mean > 0. tagged: every window with its bucket values.',
      'Criterion in the script: a bucket where the aggregated mean > 0 and winPct >= 65, and at least 3 pools have mean > 0.',
    ],
  },
  {
    test: (n) => n.startsWith('e8-carry'),
    family: 'funding cash-and-carry (experiment 8)',
    source: 'backtest/funding-carry.ts',
    lines: [
      'Long spot plus short perp of the same size, per window of W days, a new one every step days.',
      'fundingPct: sum of funding rates over the window, %. carryPct = CAPITAL_SHARE x fundingPct + (1 - CAPITAL_SHARE) x MARGIN_YIELD x W/365 - COST_RT. edgePct = carryPct - BENCH_APR x W/365 (against USDC lending). params holds those inputs (BENCH_APR %/yr, COST_RT % round trip).',
      WINDOW_STATS('edgePct, % per window against USDC lending'),
      'all: every window; byYear: per calendar year; recent180: windows starting in the last 180 days.',
      'annFunding: annualized funding over the whole series, %/yr. negShare: share of funding periods below 0 (fraction 0 to 1). worstRunDays: longest run of negative funding, days. breakevenPct: funding per window needed to match USDC, %.',
    ],
  },
  {
    test: (n) => n.startsWith('e8-house'),
    family: 'being the house: vault vs basket (experiment 8)',
    source: 'backtest/vault-house-edge.ts',
    lines: [
      'Per window of W days: vaultPct = vault value change, %; benchPct = the benchmark basket change, % (bench: usdc, eth50, btc50, mix or mix3; USDC earns BENCH_APR); edgePct = vaultPct - benchPct.',
      WINDOW_STATS('edgePct, % per window against the basket'),
      'Regime: the asset price change over the window: up above +10%, down below -10%, flat in between. byYear, byRegime, recent180 (windows starting in the last 180 days): the same statistics.',
      'reg: regression vault% = alpha + beta x asset% over the windows; beta (or betaEth, betaBtc, betaSol) = real exposure; alphaPct = beta-adjusted edge per window, %; alphaAnnPct = alphaPct x 365 / W; winAdj = % of windows with a positive beta-adjusted edge.',
      'totVault, annVault: vault change over the whole period, % and %/yr. vaultDD, benchDD: maximum drawdown of the vault and of the basket, %. CUT_AFTER: points after this date dropped.',
      'Criterion in the script: winPct >= 65 against the basket, worst > -5 (90-day windows), positive edge in at least 2 regimes, vaultDD below benchDD.',
    ],
  },
  {
    test: (n) => n.startsWith('pegged-'),
    family: 'narrow LP on pegged pairs',
    source: 'backtest/pegged.ts, backtest/engine.ts',
    lines: [
      'One run over days of data (swapCount swaps); results has one row per strategy.',
      'startUsd, finalUsd: position value at start and end, USD. aprPct: compounded APR, % per year. vsHodlPct: final value against HODL 50/50, %.',
      'maxDrawdownPct: largest fall from a running peak of the position value, %. worst7dPct: worst fall of the value within any 7 days, %.',
      'feesUsd: fees earned, USD. gasUsd: gas paid, USD. swapCostUsd: cost of bringing cash to the range proportions when a position is opened, turnover x (pool fee + slippage), USD. rebalances: count.',
      'inRangePct: % of the pool\'s swap events, while a position was open, whose price path overlapped the position\'s range.',
      'File suffix maxL / endL: the fee-share model (engine.ts, FEE_SHARE_L): maxL = pool liquidity taken as the larger of before and after the swap, conservative; endL = liquidity after the swap, the optimistic upper bound (journal/CONTEXT.md, journal/RESEARCH-QUEUE.md).',
    ],
  },
  {
    test: (n) => n.startsWith('scan-universe'),
    family: 'pool universe scan',
    source: 'backtest/scan-universe.ts',
    lines: [
      'DefiLlama pools classified into buckets: stable-stable, eth-lst, btc-btc, major-volatile, exotic; APR is only comparable within a bucket.',
      'executableTop: top pools we could use (uniswap-v3 on Ethereum, Base, Arbitrum); globalTop: the whole market.',
      'Field-by-field meanings of the pool rows are not documented in the script beyond their DefiLlama names.',
    ],
  },
  {
    test: (n) => n.startsWith('e8-bench'),
    family: 'yield benchmark (experiment 8)',
    source: 'scripts/yield-benchmark.ts',
    lines: [
      'The "boring" yields every alternative-yield strategy is compared with, from yields.llama.fi, grouped (USDC lending on Aave or Morpho, ETH staking, Pendle PT and so on).',
      'benchAprUsdc: the recommended BENCH_APR, the median apyMean30d of the top USDC pools on Aave and Morpho, % per year.',
      'apy, apyBase, apyReward, apyMean30d, tvlUsd are DefiLlama fields; their exact definitions are not documented in this repository.',
    ],
  },
];

export function legendFor(name: string): Legend | null {
  const l = LEGENDS.find((x) => x.test(name));
  return l ? { family: l.family, source: l.source, lines: l.lines } : null;
}

export function legendText(name: string): string {
  const l = legendFor(name);
  if (!l) return '[legend: none for this file; field meanings are not documented]\n[data]';
  return `[legend: ${l.family}; definitions from ${l.source}]\n${l.lines.map((x) => `- ${x}`).join('\n')}\n[data]`;
}
