/**
 * npm run ai:agent:missing
 * The pooled list of every "required source missing" case of step 2.4, from all five runs together, for the owner's
 * one-time review of the accepted chunks (owner decision: a chunk is added only if reading it shows it answers the
 * question; results are reported before and after the review). The list shows no run, variant or judge verdict: per
 * task, the requirement that was missed, and the verified citations and dataRefs the answer gave instead, with their
 * quotes. Cases are grouped by task and ordered by a fixed hash, so the order says nothing about the variant.
 * Writes ai/eval/review/required-missing-2.4.md and the key (which case came from which run)
 * ai/eval/review/required-missing-2.4-key.json.
 */
import { createHash } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';
import type { AgentVerification } from '../agent/verify';
import { EVAL_PREFIX, loadTasks, RESULTS, RUNS } from './agent-run';

interface Row {
  id: string;
  verification: AgentVerification | null;
  measures: { requiredOk: boolean; requiredMissing: string[] };
}

const h = (s: string) => createHash('sha256').update(s).digest('hex');

function main() {
  const tasks = loadTasks();
  const cases: Array<{ run: string; id: string; row: Row }> = [];
  for (const run of Object.keys(RUNS)) {
    const rows = (JSON.parse(readFileSync(`${RESULTS}/${EVAL_PREFIX}${run}.json`, 'utf8')) as { tasks: Row[] }).tasks;
    for (const row of rows) if (!row.measures.requiredOk) cases.push({ run, id: row.id, row });
  }
  cases.sort((a, b) => (a.id !== b.id ? (a.id < b.id ? -1 : 1) : h(`missing-v1|${a.run}|${a.id}`) < h(`missing-v1|${b.run}|${b.id}`) ? -1 : 1));
  const key = cases.map((c, i) => ({ label: `M${String(i + 1).padStart(2, '0')}`, run: c.run, id: c.id }));
  const out = [
    '# Required sources missing, step 2.4 (pooled, all variants)',
    '',
    `${cases.length} answers of 90 missed at least one required source. No run, variant or judge verdict is shown. For each case: the requirement missed and the verified evidence the answer gave instead. Decide per chunk whether reading it shows it answers the question; only such chunks are added to the accepted set, for all variants at once.`,
    '',
  ];
  let lastTask = '';
  cases.forEach((c, i) => {
    const t = tasks.find((x) => x.id === c.id)!;
    if (c.id !== lastTask) {
      out.push(`## ${t.id}: ${t.question}`, '', `Accepted now: ${(t.sources.chunkGroups ?? []).map((g) => g.map((x) => `\`${x}\``).join(' or ')).join('; ') || '(no chunk requirement)'}${(t.sources.results ?? []).length ? `; dataRefs: ${(t.sources.results ?? []).map((r) => `${r.name} ${r.paths.map((p) => JSON.stringify(p)).join(', ') || '(a read)'}`).join('; ')}` : ''}${t.sources.job ? `; job ${JSON.stringify(t.sources.job)}` : ''}`, '');
      lastTask = c.id;
    }
    const v = c.row.verification;
    out.push(`### ${key[i].label}`, '', `Missed: ${c.row.measures.requiredMissing.join('; ')}`, '');
    const cites = (v?.citations ?? []).filter((x) => x.status === 'ok');
    out.push(cites.length ? 'Verified citations given:' : 'Verified citations given: none', '');
    for (const x of cites) out.push(`- \`${x.chunkId}\` (${x.file}${x.lines ? `:${x.lines[0]}-${x.lines[1]}` : ''}): "${x.quote.replace(/\s*\n\s*/g, ' ')}"`);
    const refs = (v?.dataRefs ?? []).filter((x) => x.status === 'ok');
    if (refs.length) out.push('', 'Verified dataRefs given:', '', ...refs.map((d) => `- ${d.name} ${JSON.stringify(d.path)} = ${d.value}`));
    out.push('');
  });
  writeFileSync('ai/eval/review/required-missing-2.4.md', out.join('\n'));
  writeFileSync('ai/eval/review/required-missing-2.4-key.json', JSON.stringify({ rule: 'ai/eval/agent-missing.ts', key }, null, 2) + '\n');
  console.log(`Wrote ai/eval/review/required-missing-2.4.md (${cases.length} cases)`);
}

main();
