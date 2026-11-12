/**
 * Mechanical measures of one agent answer (step 2.4). Pure functions over a task and a run record; no model involved.
 *
 * Required sources (from the task set):
 *   - chunkGroups: for every group, at least one verified citation of a chunk in the group;
 *   - results: for every required result, a verified dataRef at every listed path (a job task's result is the job's
 *     run-<jobId>-<name>); with no paths listed, a successful read of the result;
 *   - job: a successful run_backtest call with exactly the required arguments.
 * Not required: legend citations (counted separately; only prompt B is told they exist).
 *
 * Unneeded job: a successful run_backtest in a task that does not need one (owner decision: a separate counter, not a
 * missing required source).
 *
 * Redundant calls, in order of the run:
 *   1. repeat: the same tool with the same arguments as an earlier call (not run again by the loop, still counted);
 *   2. reread: read_backtest_results of a name whose earlier full read (not an overview) had a path that is a prefix
 *      of this one, so the value was already in the conversation;
 *   3. no-new-chunks: search_journal whose returned chunks had all been returned earlier in the run;
 *   4. second read_decision_log or list_backtest_configs.
 * Rereads whose path is later used in a dataRef of the same answer are reported separately (the owner's hypothesis:
 * the model rereads a field to get a path to cite).
 */
import { RUN_PREFIX } from '../agent/jobs';
import { canonical } from '../agent/run';
import { resultData, type AgentVerification } from '../agent/verify';
import type { AgentAnswer } from '../agent/model';

export interface AgentTask {
  id: string;
  category: 'journal' | 'decision-log' | 'backtest' | 'journal+backtest' | 'job' | 'premise';
  jobs: boolean;
  answerable: 'yes' | 'partial' | 'no';
  question: string;
  reference: string;
  sources: {
    chunkGroups?: string[][];
    results?: Array<{ name: string; paths: string[][]; fromJob?: boolean }>;
    job?: Record<string, unknown>;
    noJob?: boolean;
  };
  expectedTools: string[];
  notes?: string;
}

/** What the measures need from one executed call. */
export interface CallRecord {
  name: string;
  args: unknown;
  isError: boolean;
  content: string;
  chunkIds?: string[];
  repeatOf?: number;
}

export type RedundantKind = 'repeat' | 'reread' | 'no-new-chunks' | 'second-read';

export interface Redundant {
  index: number;
  kind: RedundantKind;
  /** reread only: the path is later used in a dataRef of the answer. */
  usedInDataRef?: boolean;
}

const isPrefix = (p: string[], of: string[]) => p.length <= of.length && p.every((k, i) => k === of[i]);
const argsOf = (c: CallRecord) => (c.args ?? {}) as { name?: string; path?: string[] };

export function redundantCalls(calls: CallRecord[], out: AgentAnswer | null): Redundant[] {
  const r: Redundant[] = [];
  const seenChunks = new Set<string>();
  const fullReads: Array<{ name: string; path: string[] }> = [];
  const seenKeys = new Set<string>();
  let decisionLogReads = 0;
  let listReads = 0;
  calls.forEach((c, i) => {
    const key = `${c.name} ${canonical(c.args)}`;
    if (c.repeatOf !== undefined || seenKeys.has(key)) {
      r.push({ index: i, kind: 'repeat' });
      return;
    }
    seenKeys.add(key);
    if (c.isError) return;
    if (c.name === 'read_backtest_results') {
      const { name = '', path = [] } = argsOf(c);
      if (fullReads.some((f) => f.name === name && isPrefix(f.path, path))) {
        const used = !!out?.dataRefs.some((d) => d.name === name && isPrefix(path, d.path));
        r.push({ index: i, kind: 'reread', usedInDataRef: used });
      }
      if (resultData(c.content) !== null) fullReads.push({ name, path });
    } else if (c.name === 'search_journal') {
      const ids = c.chunkIds ?? [];
      if (ids.length > 0 && ids.every((x) => seenChunks.has(x))) r.push({ index: i, kind: 'no-new-chunks' });
      ids.forEach((x) => seenChunks.add(x));
    } else if (c.name === 'read_decision_log') {
      if (++decisionLogReads > 1) r.push({ index: i, kind: 'second-read' });
    } else if (c.name === 'list_backtest_configs') {
      if (++listReads > 1) r.push({ index: i, kind: 'second-read' });
    }
  });
  return r;
}

export interface RequiredCheck {
  ok: boolean;
  missing: string[];
}

export function requiredSources(task: AgentTask, calls: CallRecord[], v: AgentVerification | null): RequiredCheck {
  const missing: string[] = [];
  const okCites = new Set((v?.citations ?? []).filter((c) => c.status === 'ok').map((c) => c.chunkId));
  for (const g of task.sources.chunkGroups ?? []) if (!g.some((id) => okCites.has(id))) missing.push(`citation of one of ${g.join(', ')}`);
  const okRefs = (v?.dataRefs ?? []).filter((d) => d.status === 'ok');
  const nameMatches = (actual: string, r: { name: string; fromJob?: boolean }) => (r.fromJob ? RUN_PREFIX.test(actual) && actual.replace(RUN_PREFIX, '') === r.name : actual === r.name);
  for (const r of task.sources.results ?? []) {
    if (r.paths.length === 0) {
      if (!calls.some((c) => c.name === 'read_backtest_results' && !c.isError && nameMatches(argsOf(c).name ?? '', r))) missing.push(`a read of ${r.name}`);
      continue;
    }
    for (const p of r.paths) if (!okRefs.some((d) => nameMatches(d.name, r) && JSON.stringify(d.path) === JSON.stringify(p))) missing.push(`dataRef ${r.name} ${JSON.stringify(p)}`);
  }
  if (task.sources.job) {
    const want = canonical(task.sources.job);
    if (!calls.some((c) => c.name === 'run_backtest' && !c.isError && canonical(c.args) === want)) missing.push(`run_backtest ${want}`);
  }
  return { ok: missing.length === 0, missing };
}

export const unneededJob = (task: AgentTask, calls: CallRecord[]) => !task.sources.job && calls.some((c) => c.name === 'run_backtest' && !c.isError);

export const legendCitations = (v: AgentVerification | null) => (v?.citations ?? []).filter((c) => c.chunkId.startsWith('legend:'));
