/**
 * Step 6.12: S and N on the frozen test set, applied as the rule committed before the first run on it
 * (ai/DECISIONS.md, "step 6.12 rule"). Offline, no API call. Every file is named on the command line, so this code
 * names no question set:
 *
 *   npx tsx ai/eval/compare-612.ts --questions <jsonl> --questions-meta <json> --retrieval <lists report .md>
 *     --s <answers r1> <answers r2> --n <answers r1> <answers r2> [--gs <guest S answers>] [--gn <guest N answers>]
 *     --out <report .md>
 *
 * The judged files sit next to the answers files (npm run ai:judge -- --answers <file> ...). The guard is the one of
 * 6.11 (same margins); the guest path figures are reported and gate nothing.
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import type { AnswerRecord } from '../answer/measures';
import { counts, RULE_611, type Counts } from './compare-611';
import { adHocSet, loadItemsFrom } from './judge';
import type { JudgedItem } from '../judge/items';

/** The 6.11 guard, unchanged: N against S on the means of two runs. */
export function guard612(s: [Counts, Counts], n: [Counts, Counts]): { pass: boolean; reasons: string[] } {
  const m = (c: [Counts, Counts], f: keyof Counts) => (c[0][f] + c[1][f]) / 2;
  const reasons: string[] = [];
  if (m(s, 'correct') - m(n, 'correct') > RULE_611.maxCorrectDrop) reasons.push(`correct ${m(n, 'correct')} against S ${m(s, 'correct')}`);
  if (m(n, 'incorrect') - m(s, 'incorrect') > RULE_611.maxIncorrectRise) reasons.push(`incorrect ${m(n, 'incorrect')} against S ${m(s, 'incorrect')}`);
  if (m(n, 'unsupported') - m(s, 'unsupported') > RULE_611.maxUnsupportedRise) reasons.push(`unsupported ${m(n, 'unsupported')} against S ${m(s, 'unsupported')}`);
  return { pass: reasons.length === 0, reasons };
}

function main() {
  const argv = process.argv;
  const arg = (n: string) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : undefined);
  const two = (n: string) => (argv.includes(n) ? [argv[argv.indexOf(n) + 1], argv[argv.indexOf(n) + 2]] : []);
  const questions = arg('--questions');
  const meta = arg('--questions-meta');
  const out = arg('--out');
  const retrieval = arg('--retrieval');
  const S = two('--s');
  const N = two('--n');
  const guest = [arg('--gs'), arg('--gn')].filter((x): x is string => !!x);
  if (!questions || !meta || !out || !retrieval || S.length !== 2 || N.length !== 2) throw new Error('usage: see the header of ai/eval/compare-612.ts');
  const files = [...S, ...N, ...guest];
  const missing = files.flatMap((f) => [f, adHocSet(f).judged]).filter((f) => !existsSync(f));
  if (missing.length) {
    console.error(`refused, nothing written: missing\n  ${missing.join('\n  ')}`);
    process.exit(1);
  }
  const items = new Map<string, JudgedItem[]>(files.map((f) => [f, loadItemsFrom(adHocSet(f), false, questions, meta)]));
  const incomplete = files.filter((f) => items.get(f)!.some((x) => !x.result?.verdict) || (JSON.parse(readFileSync(f, 'utf8')) as { perQuestion: AnswerRecord[] }).perQuestion.some((p) => p.error));
  const c = (f: string) => counts(items.get(f)!);
  const sc = S.map(c) as [Counts, Counts];
  const nc = N.map(c) as [Counts, Counts];
  const g = guard612(sc, nc);
  const tag = (f: string) => adHocSet(f).runs[0].run;
  const ms = (f: string) => (JSON.parse(readFileSync(f, 'utf8')) as { measures: { cost: { msMedian: number; costUsd: number } } }).measures.cost;
  const row = (label: string, f: string) => {
    const x = c(f);
    return `| ${label} | ${tag(f)} | ${x.correct} | ${x.partly} | ${x.incorrect} | ${x.unsupported} | ${x.missing} | ${(ms(f).msMedian / 1000).toFixed(1)} s | ${ms(f).costUsd.toFixed(4)} |`;
  };
  const letter = (f: string, id: string) => {
    const v = items.get(f)!.find((x) => x.id === id)?.result?.verdict;
    return v ? { correct: 'C', partially_correct: 'P', incorrect: 'I' }[v.correctness] : '-';
  };
  const ids = items.get(S[0])!.map((x) => x.id);
  const decided = incomplete.some((f) => S.includes(f) || N.includes(f))
    ? `**Nothing is decided**: a run is incomplete (${incomplete.map(tag).join(', ')}).`
    : g.pass
      ? '**N is confirmed** for the 6.13 proposal: it passes the guard on the frozen set. Deployment is the owner\'s separate decision.'
      : `**S stays**: N fails the guard (${g.reasons.join('; ')}); the 6.13 deployment proposal is withdrawn.`;
  const md = [
    '# Step 6.12: S and N on the frozen test set',
    '',
    'First run on the frozen set. Qwen with the served preset on the committed lists (runner path of 6.11), two runs',
    'each; the guest path (Sonnet, the server\'s guest request on masked chunks) one run each, reported only. Judged',
    'with the step 3.2 judge, `--no-retry`, concurrency 1. Produced by `npx tsx ai/eval/compare-612.ts`.',
    '',
    readFileSync(retrieval, 'utf8').replace(/^# .*\n/, '## Retrieval\n'),
    '## Qwen (decides)',
    '',
    '| configuration | run | correct | partly | incorrect | unsupported | no verdict | median per answer | cost |',
    '|---|---|---|---|---|---|---|---|---|',
    ...S.map((f) => row('S served', f)),
    ...N.map((f) => row('N 6.10 without the reranker, with B2', f)),
    '',
    `Guard (6.11 margins: correct not lower by more than ${RULE_611.maxCorrectDrop}, incorrect and unsupported not higher by more than ${RULE_611.maxIncorrectRise}; a clear regression only): N **${g.pass ? 'passes' : 'fails'}**${g.reasons.length ? ` (${g.reasons.join('; ')})` : ''}.`,
    '',
    decided,
    '',
    'No tuning follows from this set, whatever the result.',
    '',
    ...(guest.length
      ? ['## Guest path (Sonnet, reported, gates nothing)', '', '| configuration | run | correct | partly | incorrect | unsupported | no verdict | median per answer | cost |', '|---|---|---|---|---|---|---|---|---|', ...guest.map((f, i) => row(arg('--gs') && i === 0 ? 'S served, guest' : 'N, guest', f)), '']
      : []),
    '## Verdict per question (C correct, P partly, I incorrect)',
    '',
    `| id | ${files.map(tag).join(' | ')} |`,
    `|---|${files.map(() => '---').join('|')}|`,
    ...ids.map((id) => `| ${id} | ${files.map((f) => letter(f, id)).join(' | ')} |`),
    '',
  ].join('\n');
  writeFileSync(out, md);
  console.log(`wrote ${out}: ${decided.replace(/\*\*/g, '')}`);
}

if (require.main === module) main();
