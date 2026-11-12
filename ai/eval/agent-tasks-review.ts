/**
 * npm run ai:agent:tasks-review
 * Renders the step 2.4 task set (ai/eval/agent-tasks.jsonl) as a readable page for the owner's review:
 * ai/eval/agent-tasks-review.md. Per task: category, question, whether jobs are enabled, reference answer, required
 * sources and expected tools.
 */
import { readFileSync, writeFileSync } from 'fs';

interface Task {
  id: string;
  category: string;
  jobs: boolean;
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

const CATEGORY: Record<string, string> = {
  journal: 'Journal only',
  'decision-log': 'Decision log',
  backtest: 'Saved backtest numbers',
  'journal+backtest': 'Journal plus backtest',
  job: 'Needs a job',
  premise: 'False premise or unanswerable',
};

function sources(t: Task): string[] {
  const out: string[] = [];
  for (const g of t.sources.chunkGroups ?? []) out.push(`cite one of: ${g.map((c) => `\`${c}\``).join(', ')}`);
  for (const r of t.sources.results ?? []) {
    const where = r.fromJob ? `the job's result (\`run-<jobId>-${r.name}\`)` : `\`${r.name}\``;
    out.push(r.paths.length ? `dataRefs into ${where} at ${r.paths.map((p) => `\`${JSON.stringify(p)}\``).join(', ')}` : `a read of ${where}`);
  }
  if (t.sources.job) out.push(`a run_backtest call with \`${JSON.stringify(t.sources.job)}\``);
  if (t.sources.noJob) out.push('no job may run (any run_backtest call must be rejected)');
  return out;
}

const tasks = readFileSync('ai/eval/agent-tasks.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as Task);
const md = [
  '# Agent evaluation task set (step 2.4), for review',
  '',
  `${tasks.length} tasks, 3 per category. Reference answers and required sources come from the files: journal and decision log text, saved result files, and for the job tasks the reference runs in \`ai/eval/agent-refs/\`. "Required sources" is checked mechanically after each run; the reference answer is what the blind judge compares against. Tasks marked "jobs on" run with \`--jobs --yes-jobs\`; the others run exactly as in 2.2. Development questions from 2.2 and 2.3 are excluded (\`ai/eval/agent-tasks-dev.json\`).`,
  '',
  '| id | category | jobs | question |',
  '|---|---|---|---|',
  ...tasks.map((t) => `| ${t.id} | ${CATEGORY[t.category]} | ${t.jobs ? 'on' : 'off'} | ${t.question.replace(/\|/g, '\\|')} |`),
  '',
  ...tasks.flatMap((t) => [
    `## ${t.id}: ${CATEGORY[t.category]}`,
    '',
    `**Question.** ${t.question}`,
    '',
    `**Jobs.** ${t.jobs ? 'on (`--jobs --yes-jobs`)' : 'off'}`,
    '',
    `**Reference answer.** ${t.reference}`,
    '',
    '**Required sources.**',
    '',
    ...sources(t).map((s) => `- ${s}`),
    '',
    `**Expected tools.** ${t.expectedTools.join(', ')}`,
    '',
    ...(t.notes ? [`**Note.** ${t.notes}`, ''] : []),
  ]),
];
writeFileSync('ai/eval/agent-tasks-review.md', md.join('\n'));
console.log(`Wrote ai/eval/agent-tasks-review.md (${tasks.length} tasks)`);
