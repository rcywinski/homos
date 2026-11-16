/**
 * npm run ai:agent:local-fit
 * Measurement for the step 3.5 plan (no model call): would the agent conversations of step 2.4 fit a local model's
 * context? Replays the logged conversations of Sonnet runs A1 and A2 (prompt A, same tasks) turn by turn and counts
 * the largest prompt of each task with the Qwen3.8 tokenizer, under four options:
 *   as-is       the tool results as Sonnet got them;
 *   small       search_journal keeps its first 5 chunks (k=5) and is capped at 18 000 characters, other results at 6 000;
 *   compact     history compaction: a tool result is replaced by a one-line stub once the model has taken one more turn
 *               after it (the stub names the tool, its arguments and the size), the newest results stay whole;
 *   small+compact both.
 * The replay keeps Sonnet's own trajectory, so it estimates sizes, not what a local model would call. Writes
 * ai/eval/results/2026-11-16-agent-local-fit.{json,md}.
 */
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { loadTokenCounter } from '../answer/local';
import { AGENT_SCHEMA, AGENT_SYSTEM } from '../agent/prompt';
import { toolDefinitions } from '../agent/tools';
import { loadTasks, RESULTS } from './agent-run';

const OUT = `${RESULTS}/2026-11-16-agent-local-fit`;
const LOGS = 'ai/agent/logs';
const OPTIONS = ['as-is', 'small', 'compact', 'small+compact'] as const;
type Option = (typeof OPTIONS)[number];
const NUM_CTX = [16384, 24576, 32768, 40960];
/** Kept free for the answer: Sonnet's longest final answer in A1 and A2 was under 2 000 tokens. */
const OUTPUT_RESERVE = 4096;

interface Call {
  name: string;
  args: unknown;
  content: string;
}
interface Turn {
  calls: Call[];
}

export function shrink(c: Call): string {
  if (c.name === 'search_journal') {
    const blocks = c.content.split(/(?=<chunk )/);
    const kept = blocks.slice(0, 6).join(''); // the header part plus the first 5 chunks
    return (kept.length > 18_000 ? kept.slice(0, 18_000) : kept) + (blocks.length > 6 ? '\n</tool_data>' : '');
  }
  return c.content.length > 6_000 ? c.content.slice(0, 6_000) + '\n[cut at 6000 characters]\n</tool_data>' : c.content;
}

export const stub = (c: Call, chars: number) => `<tool_data tool="${c.name}">[result of ${c.name} ${JSON.stringify(c.args)} shown earlier, ${chars} characters; ask again if needed]</tool_data>`;

/** The turns of one logged task: each model turn with its tool calls and their results. */
function readLog(file: string): { question: string; turns: Turn[] } {
  let question = '';
  const turns: Turn[] = [];
  for (const l of readFileSync(file, 'utf8').split('\n').filter(Boolean)) {
    const e = JSON.parse(l) as { event: string; question?: string; calls?: Array<{ name: string; args: unknown }>; name?: string; args?: unknown; content?: string };
    if (e.event === 'start') question = e.question!;
    if (e.event === 'model_turn') turns.push({ calls: [] });
    if (e.event === 'tool_call') turns[turns.length - 1].calls.push({ name: e.name!, args: e.args, content: e.content ?? '' });
  }
  return { question, turns };
}

function main() {
  const count = loadTokenCounter('ai/index/tokenizers/qwen3.8-27b');
  const base = count(AGENT_SYSTEM) + count(JSON.stringify(toolDefinitions(false))) + count(JSON.stringify(AGENT_SCHEMA));
  const tasks = loadTasks();
  const rows: Array<{ run: string; id: string; turns: number; maxPrompt: Record<Option, number> }> = [];
  for (const run of ['a1', 'a2']) {
    for (const t of tasks) {
      const f = readdirSync(LOGS).find((x) => x.endsWith(`-eval-${run}-${t.id}.jsonl`));
      if (!f) throw new Error(`no log for ${run} ${t.id}`);
      const { question, turns } = readLog(`${LOGS}/${f}`);
      const maxPrompt = {} as Record<Option, number>;
      for (const opt of OPTIONS) {
        let max = 0;
        // The prompt of turn i holds the results of turns 0..i-1; with compaction, all but those of turn i-1 are stubs.
        for (let i = 0; i < turns.length; i++) {
          let p = base + count(question);
          for (let j = 0; j < i; j++)
            for (const c of turns[j].calls) {
              const full = opt.startsWith('small') ? shrink(c) : c.content;
              const shown = opt.endsWith('compact') && j < i - 1 ? stub(c, full.length) : full;
              p += count(shown) + count(JSON.stringify({ name: c.name, args: c.args })) + 8;
            }
          max = Math.max(max, p);
        }
        maxPrompt[opt] = max;
      }
      rows.push({ run: run.toUpperCase(), id: t.id, turns: turns.length, maxPrompt });
    }
  }
  const sorted = (o: Option) => rows.map((r) => r.maxPrompt[o]).sort((a, b) => a - b);
  const summary = OPTIONS.map((o) => {
    const v = sorted(o);
    return { option: o, median: v[Math.floor(v.length / 2)], max: v[v.length - 1], fit: Object.fromEntries(NUM_CTX.map((n) => [n, v.filter((x) => x + OUTPUT_RESERVE <= n).length])) };
  });
  writeFileSync(`${OUT}.json`, JSON.stringify({ date: '2026-11-16', tokenizer: 'qwen3.8-27b', basePromptTokens: base, outputReserve: OUTPUT_RESERVE, summary, rows }, null, 2) + '\n');
  const out = ['# Would the 2.4 agent conversations fit a local context? (step 3.5 plan)', '', `Replay of the logged conversations of Sonnet runs A1 and A2 (36 tasks), counted with the Qwen3.8 tokenizer. System prompt, tool definitions and answer schema: ${base} tokens. A task fits when its largest prompt plus ${OUTPUT_RESERVE} tokens for the answer is within num_ctx. Sonnet's own trajectory is kept, so these are size estimates.`, ''];
  out.push(`| option | median largest prompt | max | ${NUM_CTX.map((n) => `fits ${n}`).join(' | ')} |`, `|---|---|---|${NUM_CTX.map(() => '---').join('|')}|`);
  for (const s of summary) out.push(`| ${s.option} | ${s.median} | ${s.max} | ${NUM_CTX.map((n) => `${s.fit[n]}/36`).join(' | ')} |`);
  out.push('', 'Options: small = search_journal k=5 and 18 000 characters, other results 6 000; compact = a result becomes a one-line stub once the model has taken one more turn after it; small+compact = both.', '');
  writeFileSync(`${OUT}.md`, out.join('\n') + '\n');
  console.log(out.join('\n'));
}

if (require.main === module) main();
