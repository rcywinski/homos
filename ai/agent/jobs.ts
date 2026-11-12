/**
 * Allowlisted backtest jobs for run_backtest (step 2.3). A fixed set of job names, each with a schema of allowed
 * arguments (enums and numeric ranges). The command line is built here from validated values only: enum members and
 * numbers turned into text by String(); no text written by the model reaches an argument or the environment. Job ids
 * come from the code (time plus a counter), never from the model.
 *
 * Input data for every job is in data/ (gitignored, on the owner's Mac only): swap caches for the 365-day pools and
 * the funding series. 720-day jobs are out of scope: their caches are gone and refetching them needs RPC keys and hours.
 */
import { ToolError } from './handlers';
import { validateArgs, type ObjectSchema } from './validate';

/**
 * Pools with a local 365-day swap cache, measured on 12 Nov 2026 (walk-forward, 20-day windows every 15 days, default
 * strategy set): optimism 030 39 s, arbitrum 030 53 s, base cbBTC/WETH 005 73 s, base 030 88 s, mainnet USDC/WETH 005
 * 154 s. Left out as too slow for the 15-minute timeout once the window/step ratio grows: mainnet WETH/USDT 001 303 s,
 * mainnet USDC/WETH 001 442 s, arbitrum 005 690 s, base WETH/USDC 005 915 s (peak memory up to 4.4 GB).
 */
export const WALKFORWARD_POOLS = [
  'optimism-weth-usdc-030-365d',
  'arbitrum-weth-usdc-030-365d',
  'base-cbbtc-weth-005-365d',
  'base-weth-usdc-030-365d',
  'mainnet-usdc-weth-005-365d',
] as const;

export const MAX_WINDOW_STEP_RATIO = 6;

export const FUNDING_SERIES = ['ETHUSDT', 'BTCUSDT', 'HL-ETH', 'HL-BTC'] as const;

export const JOB_NAMES = ['walkforward', 'funding_carry'] as const;
export type JobName = (typeof JOB_NAMES)[number];

export const JOB_SCHEMA: ObjectSchema = {
  type: 'object',
  properties: {
    job: { type: 'string', description: 'Which allowlisted job to run.', maxLength: 20, enum: [...JOB_NAMES] },
    pool: { type: 'string', description: 'walkforward only: the pool, from the list.', maxLength: 60, enum: [...WALKFORWARD_POOLS] },
    series: { type: 'string', description: 'funding_carry only: the funding series, from the list.', maxLength: 20, enum: [...FUNDING_SERIES] },
    windowDays: { type: 'integer', description: 'Window length in days. walkforward: 15 to 90; funding_carry: 7 to 180.', minimum: 7, maximum: 180 },
    stepDays: { type: 'integer', description: 'Days between window starts. walkforward: 5 to 30; funding_carry: 1 to 60.', minimum: 1, maximum: 60 },
    benchApr: { type: 'number', description: 'funding_carry only, optional: the USDC benchmark yield in % per year (default 4.5).', minimum: 0, maximum: 15 },
  },
  required: ['job', 'windowDays', 'stepDays'],
  additionalProperties: false,
};

interface JobDef {
  script: string;
  timeoutMs: number;
  fields: { required: string[]; optional: string[] };
  ranges: Record<string, [number, number]>;
  /** Extra rule over several arguments, returning an error message or null. */
  check?(a: Record<string, unknown>): string | null;
  build(a: Record<string, unknown>): { args: string[]; env: Record<string, string>; output: string };
}

export const JOBS: Record<JobName, JobDef> = {
  walkforward: {
    script: 'backtest/walkforward.ts',
    timeoutMs: 15 * 60_000,
    fields: { required: ['pool'], optional: [] },
    ranges: { windowDays: [15, 90], stepDays: [5, 30] },
    // Run time grows with windowDays / stepDays (measured at 20 / 15); at most 6 keeps the slowest allowed pool at about
    // 4.5 x 154 s, under the timeout.
    check: (a) => ((a.windowDays as number) / (a.stepDays as number) > MAX_WINDOW_STEP_RATIO ? `windowDays / stepDays must be at most ${MAX_WINDOW_STEP_RATIO} (run time grows with it)` : null),
    build: (a) => ({ args: [String(a.pool), String(a.windowDays), String(a.stepDays)], env: {}, output: `walkforward-${a.pool}-${a.windowDays}d.json` }),
  },
  funding_carry: {
    script: 'backtest/funding-carry.ts',
    timeoutMs: 2 * 60_000,
    fields: { required: ['series'], optional: ['benchApr'] },
    ranges: { windowDays: [7, 180], stepDays: [1, 60] },
    build: (a) => ({
      args: [`data/funding/${a.series}.json`, String(a.windowDays), String(a.stepDays)],
      env: a.benchApr === undefined ? ({} as Record<string, string>) : { BENCH_APR: String(a.benchApr) },
      output: `funding-carry-${a.series}-${a.windowDays}d.json`,
    }),
  },
};

export interface JobPlan {
  job: JobName;
  /** The validated arguments, exactly as accepted. */
  args: Record<string, unknown>;
  script: string;
  /** Arguments after the script path. */
  scriptArgs: string[];
  /** Extra environment variables (besides PATH, HOME and HOMOS_RESULTS_DIR). */
  env: Record<string, string>;
  /** File the script writes into the job's output directory. */
  output: string;
  timeoutMs: number;
}

/** Validate run_backtest arguments against the schema and the job's own fields and ranges; build the plan. */
export function planJob(raw: unknown): JobPlan {
  const v = validateArgs(JOB_SCHEMA, raw);
  if (!v.ok) throw new ToolError(`invalid arguments for run_backtest: ${v.error}`);
  const a = v.value;
  const job = a.job as JobName;
  const def = JOBS[job];
  const allowed = new Set(['job', 'windowDays', 'stepDays', ...def.fields.required, ...def.fields.optional]);
  for (const k of Object.keys(a)) if (!allowed.has(k)) throw new ToolError(`argument "${k}" does not apply to job ${job}`);
  for (const k of def.fields.required) if (a[k] === undefined) throw new ToolError(`job ${job} needs argument "${k}"`);
  for (const [k, [lo, hi]] of Object.entries(def.ranges)) {
    const n = a[k] as number;
    if (n < lo || n > hi) throw new ToolError(`for job ${job}, "${k}" must be between ${lo} and ${hi}`);
  }
  const extra = def.check?.(a);
  if (extra) throw new ToolError(`for job ${job}, ${extra}`);
  const b = def.build(a);
  return { job, args: a, script: def.script, scriptArgs: b.args, env: b.env, output: b.output, timeoutMs: def.timeoutMs };
}

let counter = 0;
/** Job id from the code: time to the second plus a counter, letters and digits only (for example j20261112T101503n1). */
export function newJobId(now = new Date()): string {
  counter++;
  return `j${now.toISOString().replace(/[-:]/g, '').slice(0, 15)}n${counter}`;
}

/** Name under which a job's result appears in list_backtest_configs. */
export const runResultName = (jobId: string, output: string) => `run-${jobId}-${output.replace(/\.json$/, '')}`;
export const RUN_PREFIX = /^run-j\d{8}T\d{6}n\d+-/;
