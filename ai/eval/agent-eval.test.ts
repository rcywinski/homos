/**
 * Tests for the step 2.4 evaluation code, offline: redundant-call rules, required sources, unneeded jobs, the judge
 * input (blind to run and variant) and the blind sample rule. Run: npx tsx ai/eval/agent-eval.test.ts
 */
import { agentJudgeInput, blindKey, BLIND_RUNS, CATEGORY_ORDER } from './agent-judge';
import { redundantCalls, requiredSources, unneededJob, type AgentTask, type CallRecord } from './agent-measures';
import { loadTasks } from './agent-run';
import type { AgentAnswer } from '../agent/model';
import type { AgentVerification } from '../agent/verify';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) passed++;
  else {
    failed++;
    console.error(`FAIL: ${name}${detail ? ': ' + detail : ''}`);
  }
}

const full = (json: string) => `<tool_data tool="read_backtest_results">\n[legend: x]\n[data]\n${json}\n</tool_data>`;
const overview = `<tool_data tool="read_backtest_results">\n[legend: x]\n[data]\n[overview: the whole file is 9 characters]\n{}\n</tool_data>`;
const read = (name: string, path: string[] | undefined, content: string): CallRecord => ({ name: 'read_backtest_results', args: path ? { name, path } : { name }, isError: false, content });
const ans = (refs: Array<{ name: string; path: string[] }> = []): AgentAnswer => ({ answer: 'a', coverage: 'full', citations: [], dataRefs: refs.map((r) => ({ ...r, value: '1' })) });

// 1. Redundant calls.
{
  const calls: CallRecord[] = [
    { name: 'list_backtest_configs', args: {}, isError: false, content: '' },
    read('f', undefined, overview),
    read('f', ['summary'], full('{"p":{"mean":1}}')),
    read('f', ['summary', 'p', 'mean'], full('1')),
    read('f', ['summary', 'p'], full('{"mean":1}')),
    { name: 'search_journal', args: { query: 'a' }, isError: false, content: '', chunkIds: ['c1', 'c2'] },
    { name: 'search_journal', args: { query: 'b' }, isError: false, content: '', chunkIds: ['c2', 'c1'] },
    { name: 'search_journal', args: { query: 'c' }, isError: false, content: '', chunkIds: ['c2', 'c3'] },
    { name: 'list_backtest_configs', args: {}, isError: true, content: 'repeated call', repeatOf: 1 },
    { name: 'read_decision_log', args: {}, isError: false, content: '' },
    { name: 'read_decision_log', args: { x: 1 }, isError: true, content: 'invalid' },
  ];
  const r = redundantCalls(calls, ans([{ name: 'f', path: ['summary', 'p', 'mean'] }]));
  const at = (i: number) => r.find((x) => x.index === i);
  check('a read after an overview is not redundant', !at(1) && !at(2));
  check('a read of a path inside an earlier full read is a reread', at(3)?.kind === 'reread' && at(4)?.kind === 'reread');
  check('reread whose path is later used in a dataRef is flagged', at(3)?.usedInDataRef === true && at(4)?.usedInDataRef === true);
  check('a search with no new chunks is redundant, one with a new chunk is not', at(6)?.kind === 'no-new-chunks' && !at(7));
  check('a repeated call is redundant', at(8)?.kind === 'repeat');
  check('a failed call is not counted as a second read', !at(10));
  const r2 = redundantCalls([read('g', ['a'], full('{"b":1}')), read('g', ['a', 'b'], full('1'))], ans([{ name: 'g', path: ['c'] }]));
  check('a reread not used in a dataRef is not flagged', r2[0]?.kind === 'reread' && r2[0].usedInDataRef === false);
}

// 2. Required sources and unneeded jobs.
{
  const task: AgentTask = { id: 't', category: 'job', jobs: true, answerable: 'yes', question: 'q', reference: 'r', expectedTools: [], sources: { chunkGroups: [['a:1', 'docs/DECISION-LOG.md']], results: [{ name: 'walkforward-x-40d', paths: [['summary', 'mean']], fromJob: true }], job: { job: 'walkforward', pool: 'p', windowDays: 40, stepDays: 10 } } };
  const v = (cites: string[], refs: Array<{ name: string; path: string[]; status: string }>): AgentVerification => ({ citations: cites.map((c) => ({ chunkId: c, quote: 'q', status: 'ok', words: 1, tooLong: false })), dataRefs: refs.map((r) => ({ ...r, value: '1' })) as AgentVerification['dataRefs'], unbackedNumbers: [] });
  const job: CallRecord = { name: 'run_backtest', args: { stepDays: 10, job: 'walkforward', windowDays: 40, pool: 'p' }, isError: false, content: '' };
  const ok = requiredSources(task, [job], v(['docs/DECISION-LOG.md'], [{ name: 'run-j20261112T101503n1-walkforward-x-40d', path: ['summary', 'mean'], status: 'ok' }]));
  check('all required sources present (job args in any key order)', ok.ok, JSON.stringify(ok.missing));
  const bad = requiredSources(task, [{ ...job, isError: true }], v(['b:1'], [{ name: 'walkforward-x-40d', path: ['summary', 'mean'], status: 'ok' }]));
  check('missing citation, saved file instead of the job result, failed job: three missing', bad.missing.length === 3, JSON.stringify(bad.missing));
  const unverified = requiredSources(task, [job], v(['a:1'], [{ name: 'run-j20261112T101503n1-walkforward-x-40d', path: ['summary', 'mean'], status: 'mismatch' }]));
  check('an unverified dataRef does not count', !unverified.ok && unverified.missing.length === 1);
  const premise: AgentTask = { ...task, sources: { noJob: true, results: [{ name: 'f', paths: [] }] } };
  check('a read of a file with no paths listed counts', requiredSources(premise, [read('f', undefined, overview)], null).ok);
  check('a job in a task without one is an unneeded job', unneededJob(premise, [job]) && !unneededJob(premise, [{ ...job, isError: true }]) && !unneededJob(task, [job]));
}

// 3. The judge input is blind to the run and shows dataRefs as evidence.
{
  const tasks = loadTasks();
  const task = tasks.find((t) => t.id === 'p-02')!;
  const rec = {
    id: 'p-02',
    output: { answer: 'It cannot run.', coverage: 'partial' as const, citations: [], dataRefs: [] },
    verification: {
      citations: [{ chunkId: 'legend:x', quote: 'q', status: 'ok' as const, words: 1, tooLong: false }],
      dataRefs: [
        { name: 'walkforward-base-cbbtc-weth-005-720d-30d', path: ['summary', 'Pasywny ±50%', 'mean'], value: '-0.30', status: 'ok' as const, stored: -0.3002 },
        { name: 'y', path: ['z'], value: '1', status: 'no-call' as const },
      ],
      unbackedNumbers: [],
    },
  };
  const input = agentJudgeInput(task, rec);
  const s = JSON.stringify(input);
  check('judge input has the task notes for a partial task', input.answerable === 'partial' && !!input.keyNotes);
  check('dataRef shown with the stored value, a missing one says so', input.quotes[1].quote === 'value in the result read: -0.3002' && input.quotes[2].quote === 'no such value in the results this answer read');
  check('legend citation shown as legend of the result', input.quotes[0].where === 'legend of x');
  check('nothing about run, variant, prompt, effort or status', !/A1|B1|"C"|prompt|effort|status|steps/.test(s));
}

// 4. Blind sample rule.
{
  const tasks = loadTasks();
  const k1 = blindKey(tasks);
  const k2 = blindKey(tasks);
  check('six items, one per category, deterministic', k1.length === 6 && JSON.stringify(k1) === JSON.stringify(k2) && new Set(k1.map((k) => tasks.find((t) => t.id === k.id)!.category)).size === 6);
  check('runs follow the rotation by category', CATEGORY_ORDER.every((c, i) => k1.find((k) => tasks.find((t) => t.id === k.id)!.category === c)!.run === BLIND_RUNS[i]));
  check('labels B01..B06', k1.map((k) => k.label).join() === 'B01,B02,B03,B04,B05,B06');
}

console.log(`${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
