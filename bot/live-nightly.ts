/**
 * bot/live-nightly.ts — the Live demo's nightly data steps (phase 5, step 5.5; ai/APP-PLAN.md section 12): the light
 * part of the research pipeline, so both rankings stay current without the heavy steps.
 *
 *   1. scripts/fetch-llama-history.ts  DefiLlama universe and APY/TVL history (selector and wide-daily input)
 *   2. scripts/wide-score.ts           the WIDE ranking (wide-ranking.json)
 *   3. scripts/wide-daily.ts           the daily model of both rankings' pools (wide-daily.json)
 *
 * The full run (wide-collect, hours of swap fetching) and the candidate validations are NOT run: their columns show
 * the research period's fixed results, dated on the page.
 *
 * Each step is a child process with this process's environment, which bot/live.ts has already checked (no key, no
 * wallet, no env file) and pointed at the state folder (BOT_STATE_DIR, BOT_LLAMA_DIR, BOT_DATA_DIR). A step that fails
 * does not stop the next one; the outcome of each run is written to <state>/nightly-state.json.
 */
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export const NIGHTLY_STEPS = ['fetch-llama-history', 'wide-score', 'wide-daily'] as const;
export type NightlyStep = (typeof NIGHTLY_STEPS)[number];
/** Local hour after which the day's run may start (the research pipeline ran at 05:30, the selector after 06:00). */
export const NIGHTLY_AFTER_HOUR = 5;
const STEP_TIMEOUT_MS = 40 * 60_000;

export interface NightlyState {
  lastOkDay?: string;
  last?: { day: string; startedAt: string; finishedAt: string; steps: { step: NightlyStep; ok: boolean; ms: number }[] };
}

const localDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function readNightly(stateDir: string): NightlyState {
  try {
    return JSON.parse(fs.readFileSync(path.join(stateDir, 'nightly-state.json'), 'utf8')) as NightlyState;
  } catch {
    return {};
  }
}

/** True when today's run is due: after the hour, and no complete run today. */
export function nightlyDue(state: NightlyState, now = new Date()): boolean {
  return now.getHours() >= NIGHTLY_AFTER_HOUR && state.lastOkDay !== localDay(now);
}

function runStep(step: NightlyStep, repoRoot: string, log: (m: string) => void): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['--import', 'tsx', path.join('scripts', `${step}.ts`)], { cwd: repoRoot, env: process.env, stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    child.stderr.on('data', (d: Buffer) => (err = (err + d.toString()).slice(-400)));
    const timer = setTimeout(() => child.kill('SIGTERM'), STEP_TIMEOUT_MS);
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) log(`nightly ${step}: exit ${code}${err ? `, ${err.replace(/\s+/g, ' ').slice(-200)}` : ''}`);
      resolve(code === 0);
    });
  });
}

/** Runs the given steps in order; records the run. A complete run (every step ok) sets lastOkDay. */
export async function runNightly(stateDir: string, repoRoot: string, log: (m: string) => void, steps: readonly NightlyStep[] = NIGHTLY_STEPS): Promise<boolean> {
  const startedAt = new Date();
  const results: { step: NightlyStep; ok: boolean; ms: number }[] = [];
  for (const step of steps) {
    const t = Date.now();
    const ok = await runStep(step, repoRoot, log);
    results.push({ step, ok, ms: Date.now() - t });
    log(`nightly ${step}: ${ok ? 'ok' : 'FAILED'} in ${Math.round((Date.now() - t) / 1000)} s`);
  }
  const allOk = steps.length === NIGHTLY_STEPS.length && results.every((r) => r.ok);
  const prev = readNightly(stateDir);
  const next: NightlyState = {
    lastOkDay: allOk ? localDay(startedAt) : prev.lastOkDay,
    last: { day: localDay(startedAt), startedAt: startedAt.toISOString(), finishedAt: new Date().toISOString(), steps: results },
  };
  fs.writeFileSync(path.join(stateDir, 'nightly-state.json'), JSON.stringify(next, null, 2));
  return allOk;
}
