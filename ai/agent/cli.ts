/**
 * npm run agent:ask -- "Did the passive ±50% strategy win in at least two regimes?" [--cap 0.5] [--jobs [--yes-jobs]]
 * Runs the agent (Sonnet 5.5, effort medium) with the four read-only tools, prints every step as it happens (with the
 * model's reasoning summary), then the answer with every citation and every backtest number checked, and the totals.
 * The full run is logged as JSONL in ai/agent/logs/. Needs ANTHROPIC_API_KEY, INFERENCE_URL and RERANK_URL in .env
 * (search_journal uses the phase 1 retrieval on the inference box) and the restored result files
 * (npm run ai:restore-results).
 *
 * --jobs (step 2.3) adds run_backtest: one allowlisted job per question, which the owner confirms at the terminal
 * before it starts. --yes-jobs starts jobs without asking (unattended evaluation runs). Without a terminal and without
 * --yes-jobs, every job is declined. The job input data exists only on the owner's Mac (data/, gitignored).
 */
import 'dotenv/config';
import { createInterface } from 'readline';
import { formatCitation } from '../answer/answer';
import { wrapText } from '../answer/wrap';
import { JsonlLog } from './log';
import { AnthropicAgentModel } from './model';
import { DEFAULT_CAP_USD, runAgent, type AgentRunResult, type ToolCallRecord, type TurnRecord } from './run';
import type { JobPlan } from './jobs';
import { realDeps } from './tools';

const width = () => process.stdout.columns || 100;

export function describeCall(c: ToolCallRecord): string {
  const what = c.repeatOf
    ? `not run, repeats step ${c.repeatOf}`
    : c.isError
      ? `error: ${c.content}`
      : c.name === 'search_journal'
        ? `${c.chunks?.length ?? 0} chunks`
        : `ok`;
  const cost = c.costUsd ? `, $${c.costUsd.toFixed(4)} inside the tool` : '';
  return `   ${c.name} ${JSON.stringify(c.args)} -> ${what}, ${c.chars} chars, ${c.ms} ms${cost}`;
}

export function describeTurn(t: TurnRecord): string {
  const u = t.usage;
  const head = `step ${t.step} (${t.mode === 'final' ? 'final turn, no tools' : 'turn with tools'}): ${t.kind === 'tools' ? `${t.calls?.length} tool call(s)` : 'answer'}`;
  const line = `${head}; ${u.input} in + ${u.cacheRead} cache read + ${u.cacheWrite} cache write, ${u.output} out${t.reasoningTokens !== null ? ` (${t.reasoningTokens} reasoning)` : ''}; $${t.costUsd.toFixed(4)}; ${(t.ms / 1000).toFixed(1)} s`;
  const r = t.reasoning.replace(/\s+/g, ' ').trim();
  return r ? `${line}\n   reasoning: ${r.length > 400 ? `${r.slice(0, 400)} [...]` : r}` : line;
}

export function describeJob(plan: JobPlan & { jobId: string }): string {
  return [
    `job ${plan.jobId}: ${plan.job} ${JSON.stringify(plan.args)}`,
    `  command (no shell): node tsx ${[plan.script, ...plan.scriptArgs].map((x) => JSON.stringify(x)).join(' ')}`,
    `  extra environment: ${JSON.stringify(plan.env)}; output: ai/agent/runs/${plan.jobId}/${plan.output}; timeout ${plan.timeoutMs / 60_000} min`,
  ].join('\n');
}

/** Ask at the terminal; anything but y or yes declines. */
async function askOwner(plan: JobPlan & { jobId: string }): Promise<boolean> {
  console.log(describeJob(plan));
  if (!process.stdin.isTTY) {
    console.log('  no terminal and no --yes-jobs: declined');
    return false;
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise<string>((resolve) => rl.question('run this job? [y/N] ', resolve));
  rl.close();
  return /^(y|yes)$/i.test(answer.trim());
}

export function printResult(r: AgentRunResult, w = width()): void {
  console.log('');
  if (!r.output) {
    console.log(`no answer: ${r.status}${r.error ? `, ${r.error}` : ''}`);
  } else {
    console.log(`${wrapText(r.output.answer, w)}\n`);
    console.log(`coverage: ${r.output.coverage}; status: ${r.status}`);
    const v = r.verification!;
    console.log(`citations (${v.citations.filter((c) => c.status === 'ok').length}/${v.citations.length} verified):`);
    for (const c of v.citations) {
      const [where, quote] = formatCitation(c).split('\n    ');
      console.log(`${wrapText(where, w, '  ')}\n${wrapText(quote, w, '    ')}`);
    }
    console.log(`backtest numbers (${v.dataRefs.filter((d) => d.status === 'ok').length}/${v.dataRefs.length} verified):`);
    for (const d of v.dataRefs) {
      const tail = d.status === 'ok' ? `stored ${String(d.stored)}` : `${d.status.toUpperCase()}${d.detail ? `: ${d.detail}` : ''}`;
      console.log(wrapText(`  [${d.status === 'ok' ? 'ok' : 'FAIL'}] ${d.value} = ${d.name} ${JSON.stringify(d.path)}; ${tail}`, w, '  '));
    }
    if (v.unbackedNumbers.length) console.log(wrapText(`numbers in the answer with no quote or reference: ${v.unbackedNumbers.join(', ')}`, w));
  }
  const toolCalls = r.calls.length;
  console.log(
    `\n${wrapText(
      `${r.turns.length} model turns, ${toolCalls} tool calls; ${r.model}; tokens ${r.usage.input} in, ${r.usage.cacheRead} cache read, ${r.usage.cacheWrite} cache write, ${r.usage.output} out; ` +
        `cost $${r.costUsd.toFixed(4)} (model $${r.modelCostUsd.toFixed(4)}, inside tools $${r.toolCostUsd.toFixed(4)}; cap $${r.capUsd}); ${(r.ms / 1000).toFixed(1)} s`,
      w,
    )}`,
  );
}

async function main() {
  const args = process.argv.slice(2);
  const capIdx = args.indexOf('--cap');
  const capUsd = capIdx >= 0 ? Number(args[capIdx + 1]) : DEFAULT_CAP_USD;
  const jobs = args.includes('--jobs');
  const yesJobs = args.includes('--yes-jobs');
  const question = args
    .filter((a, i) => (capIdx < 0 || (i !== capIdx && i !== capIdx + 1)) && a !== '--jobs' && a !== '--yes-jobs')
    .join(' ')
    .trim();
  if (!question) throw new Error('usage: npm run agent:ask -- "<question>" [--cap 0.5] [--jobs [--yes-jobs]]');
  if (yesJobs && !jobs) throw new Error('--yes-jobs needs --jobs');
  if (!(capUsd > 0)) throw new Error('--cap must be a positive amount in USD');
  const log = new JsonlLog(question);
  const approve = yesJobs
    ? async (plan: JobPlan & { jobId: string }) => {
        console.log(`${describeJob(plan)}\n  approved by --yes-jobs`);
        return true;
      }
    : askOwner;
  const r = await runAgent(new AnthropicAgentModel('sonnet'), realDeps(process.cwd(), jobs ? { approve } : undefined), question, {
    capUsd,
    log,
    onTurn: (t) => console.log(describeTurn(t)),
    onCall: (c) => console.log(describeCall(c)),
  });
  printResult(r);
  console.log(`log: ${log.file}`);
}

if (require.main === module)
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
