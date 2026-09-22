// bot/candidates.ts — validation verdicts for selector candidates (TASKS-FUNNEL.md)
//
// Architecture (deliberate, 24.08): SEED in code (tracked by git — history
// of manual validation verdicts), RUNTIME in .bot/candidate-verdicts.json
// (untracked — written by the nightly funnel on Windows). We do NOT keep this
// in a tracked file that is appended at runtime: exactly this class of problem
// (dirty tree on production) blocked the report auto-push for 3 days.
//
// A verdict is PERMANENT: once FAIL = we do not retest automatically.
// Retest only manually (remove the entry). PASS != auto-add to BOT_POOLS
// — the decision to play a pool always belongs to a human.

import fs from 'fs';
import path from 'path';

export type CandidateVerdict = {
  llamaPool: string; // DefiLlama uuid — matching key against the ranking
  chain: string;
  symbol: string;
  feeTier: string; // human label ('0.01%' etc.) — for UI, not for logic
  verdict: 'PASS' | 'FAIL' | 'QUEUED' | 'UNMAPPED';
  winPct?: number; // % of winning walkforward windows (gate: >=65)
  worst?: number; // worst window vsHODL (gate: >-3)
  testedAt?: string; // ISO date of validation
  note?: string;
  // auto-funnel fields (25.08, TASKS-FUNNEL.md):
  algoVersion?: string; // ALGORITHM.md version of the verdict — different from current = verdict invalid, funnel retests
  candId?: string; // id of the `cand-*` cache (data/cache) and of the walkforward result
  poolAddress?: string; // pool address from factory.getPool (verified token0/token1)
  strategy?: string; // name of the profile strategy the gate was computed on
};

// Verdicts of manual validations from before the funnel (sources: SELECTOR-LOG.md,
// CONTEXT 17/19/20.08). Seed, so the funnel does not recompute them
// and so the UI tells the truth from day one.
export const SEED_VERDICTS: CandidateVerdict[] = [
  {
    llamaPool: '3a2f2faf-6423-4569-ad93-821c54cbe702',
    chain: 'Ethereum', symbol: 'WETH-USDT', feeTier: '0.01%',
    verdict: 'FAIL', worst: -12, algoVersion: 'v1.2',
    testedAt: '2026-08-17',
    note: 'walkforward 365d/22 windows: all strategies negative vs HODL, worst −10…−12',
  },
  {
    llamaPool: '8b3ed515-5e6f-449a-9b64-25113cda7a29',
    chain: 'Ethereum', symbol: 'USDC-WETH', feeTier: '0.01%',
    verdict: 'FAIL', winPct: 55, worst: -18.0, algoVersion: 'v1.2',
    testedAt: '2026-08-19',
    note: 'walkforward 365d/22 windows (135a155): 55% wins vs threshold >=65, worst −18 vs threshold >−3; variants with circuit breaker 0% wins. Same pattern as WETH-USDT 0.01%',
  },
  {
    llamaPool: 'ae6e650d-2da1-43ee-b960-2adfdf4dc2b7',
    chain: 'Base', symbol: 'WETH-CBBTC', feeTier: '0.3%',
    verdict: 'QUEUED',
    note: 'OPEN proposal from 22.08 (pending); first auto-funnel candidate after rollout',
  },
  {
    llamaPool: 'fc9f488e-8183-416f-a61e-4e5c571d4395',
    chain: 'Ethereum', symbol: 'WETH-USDT', feeTier: '0.3%',
    verdict: 'QUEUED',
    note: 'OPEN proposal from 20.08 (no tick-level validation); in the funnel queue',
  },
];

// Runtime + seed, runtime wins for the same llamaPool (the funnel may
// close QUEUED → PASS/FAIL). The file is written exclusively by candidate-funnel.
export function readVerdicts(botDir: string): CandidateVerdict[] {
  const byId = new Map<string, CandidateVerdict>();
  for (const v of SEED_VERDICTS) byId.set(v.llamaPool, v);
  try {
    const p = path.join(botDir, 'candidate-verdicts.json');
    if (fs.existsSync(p)) {
      const runtime = JSON.parse(fs.readFileSync(p, 'utf8')) as CandidateVerdict[];
      for (const v of runtime) byId.set(v.llamaPool, v);
    }
  } catch { /* a corrupted runtime file must not take the endpoint down */ }
  return [...byId.values()];
}
