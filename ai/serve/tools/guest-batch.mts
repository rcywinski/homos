/**
 * Step 4.6e: the measured guest-key run. The 34 golden questions through the public chat server, exactly the path a
 * visitor's browser takes: POST /api/guest/retrieve on our server, one call to the Anthropic Messages API with the
 * owner's key (here, not in a browser), POST /api/guest/verify on our server. No retry anywhere.
 *
 * Self-contained on purpose (Node built-ins only, no import from this repo), so CC-Mac can run it from the main
 * checkout, where the key is, without this worktree:
 *
 *   git show origin/app-chat:ai/serve/tools/guest-batch.mts > /tmp/guest-batch.mts
 *   GUEST_BASE=https://<public-host> node --env-file=.env --import tsx /tmp/guest-batch.mts --out <file.json>
 *
 * Needs on the box: the owner switch on, the search model loadable, and per-visitor limits raised for this run (34
 * retrievals and 34 verifications from one address), restored afterwards.
 *
 * Stops on the first transport or API error (our server not answering as expected, an Anthropic error status, a
 * network failure): the rows so far are written and the exit code is 1. A model answer that cannot be checked
 * (cut at max_tokens, a refusal, invalid JSON) is a measured result, recorded as "failed", and the run goes on.
 * The output never contains the hostname or the key. Its rows have the shape of ai/serve/tools/lan-batch.mts, plus
 * the token usage and cost of each Anthropic call, so ai/serve/tools/to-judge-input.mts converts it.
 */
import { readFileSync, writeFileSync } from 'fs';

const args = process.argv.slice(2);
const opt = (n: string, f?: string) => (args.includes(n) ? args[args.indexOf(n) + 1] : f);
const base = (process.env.GUEST_BASE ?? '').replace(/\/$/, '');
const key = process.env.ANTHROPIC_API_KEY ?? '';
const anthropicUrl = process.env.ANTHROPIC_URL ?? 'https://api.anthropic.com/v1/messages';
const out = opt('--out', `guest-run-golden-${new Date().toISOString().slice(0, 10)}.json`)!;
const limit = Number(opt('--limit', '0')) || Infinity;
if (!base.startsWith('http')) throw new Error('set GUEST_BASE to the public address, e.g. https://<public-host>');
if (!key.startsWith('sk-ant-')) throw new Error('ANTHROPIC_API_KEY is missing (run with --env-file=.env from the main checkout)');

/** Sonnet 5.5 prices per million tokens (ai/context/pricing.ts at the time of writing). */
const PRICE = { input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.1 };

interface Usage {
  input: number;
  output: number;
  cacheWrite: number;
  cacheRead: number;
}

interface Row {
  id: string;
  question: string;
  status: number;
  outcome: string;
  coverage: string | null;
  text: string;
  quotes: { status: string; reason?: string; file: string; chunkId: string; quote: string; lines: [number, number] | null }[];
  numbers: { text: string; status: string; transformation?: string; from?: string; reason?: string }[];
  sources: string[];
  explanation?: { text: string; quotes: Row['quotes']; numbers: Row['numbers'] };
  timing: { retrievalMs: number; modelMs: number | null; verifyMs: number | null; totalMs: number };
  serverMs: number | null;
  usage: Usage | null;
  costUsd: number;
  model?: { stopReason?: string; problem?: string };
}

class Stop extends Error {}

async function postOurs(path: string, body: unknown): Promise<{ status: number; data: Record<string, unknown> }> {
  let r: Response;
  try {
    r = await fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  } catch (e) {
    throw new Stop(`${path}: network error ${e instanceof Error ? e.message : String(e)}`);
  }
  let data: Record<string, unknown>;
  try {
    data = (await r.json()) as Record<string, unknown>;
  } catch {
    throw new Stop(`${path}: HTTP ${r.status}, not JSON`);
  }
  return { status: r.status, data };
}

const quotesOf = (raw: unknown) =>
  ((raw ?? []) as Row['quotes']).map((c) => ({ status: c.status, ...(c.reason ? { reason: c.reason } : {}), file: c.file, chunkId: c.chunkId, quote: c.quote, lines: c.lines }));
const numbersOf = (raw: unknown) =>
  ((raw ?? []) as Row['numbers']).map((n) => ({ text: n.text, status: n.status, ...(n.transformation ? { transformation: n.transformation } : {}), ...(n.from ? { from: n.from } : {}), ...(n.reason ? { reason: n.reason } : {}) }));

/** A row from a final AskResponse (verified answer, refusal, fixed text). */
function rowFrom(id: string, question: string, status: number, r: Record<string, unknown>, sources: string[], timing: Row['timing'], usage: Usage | null, costUsd: number): Row {
  const ex = r.explanation as { text: string; citations: unknown; numbers: unknown } | undefined;
  return {
    id,
    question,
    status,
    outcome: String(r.outcome),
    coverage: (r.coverage as string | null) ?? null,
    text: String(r.text ?? ''),
    quotes: quotesOf(r.citations),
    numbers: numbersOf(r.numbers),
    sources,
    ...(ex ? { explanation: { text: ex.text, quotes: quotesOf(ex.citations), numbers: numbersOf(ex.numbers) } } : {}),
    timing,
    serverMs: typeof r.ms === 'number' ? r.ms : null,
    usage,
    costUsd,
  };
}

async function one(id: string, question: string): Promise<Row> {
  const t0 = Date.now();
  const rr = await postOurs('/api/guest/retrieve', { question });
  const retrievalMs = Date.now() - t0;
  if ('outcome' in rr.data) return rowFrom(id, question, rr.status, rr.data, [], { retrievalMs, modelMs: null, verifyMs: null, totalMs: Date.now() - t0 }, null, 0);
  if (rr.status !== 200 || !('ticket' in rr.data)) throw new Stop(`retrieve ${id}: HTTP ${rr.status} ${String(rr.data.error ?? '')}`);
  const sources = ((rr.data.sources ?? []) as { chunkId: string }[]).map((s) => s.chunkId);

  const t1 = Date.now();
  let res: Response;
  try {
    res = await fetch(anthropicUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(rr.data.request),
    });
  } catch (e) {
    throw new Stop(`anthropic ${id}: network error ${e instanceof Error ? e.message : String(e)}`);
  }
  const msg = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  const modelMs = Date.now() - t1;
  if (!res.ok || !msg) throw new Stop(`anthropic ${id}: HTTP ${res.status} ${JSON.stringify((msg?.error as { type?: string })?.type ?? '')}`);
  const u = (msg.usage ?? {}) as Record<string, number>;
  const usage: Usage = { input: u.input_tokens ?? 0, output: u.output_tokens ?? 0, cacheWrite: u.cache_creation_input_tokens ?? 0, cacheRead: u.cache_read_input_tokens ?? 0 };
  const costUsd = (usage.input * PRICE.input + usage.output * PRICE.output + usage.cacheWrite * PRICE.cacheWrite + usage.cacheRead * PRICE.cacheRead) / 1e6;

  // As the browser does (showcase/guest-key.ts): an answer that cannot be checked is not posted to verify.
  const stop = String(msg.stop_reason ?? '');
  const text = ((msg.content ?? []) as { type?: string; text?: string }[]).find((b) => b.type === 'text' && typeof b.text === 'string')?.text;
  let answer: unknown;
  let problem: string | undefined;
  if (stop === 'max_tokens' || stop === 'refusal') problem = stop;
  else if (text === undefined) problem = 'no text block';
  else {
    try {
      answer = JSON.parse(text);
    } catch {
      problem = 'invalid JSON';
    }
  }
  const timingBase = { retrievalMs, modelMs };
  if (problem) {
    return { id, question, status: 200, outcome: 'failed', coverage: null, text: '', quotes: [], numbers: [], sources, timing: { ...timingBase, verifyMs: null, totalMs: Date.now() - t0 }, serverMs: null, usage, costUsd, model: { stopReason: stop, problem } };
  }
  const t2 = Date.now();
  const vr = await postOurs('/api/guest/verify', { question, ticket: rr.data.ticket, answer });
  if (vr.status !== 200 || !('outcome' in vr.data)) throw new Stop(`verify ${id}: HTTP ${vr.status} ${String(vr.data.error ?? '')}`);
  const row = rowFrom(id, question, vr.status, vr.data, sources, { ...timingBase, verifyMs: Date.now() - t2, totalMs: Date.now() - t0 }, usage, costUsd);
  return { ...row, model: { stopReason: stop } };
}

const golden = readFileSync('ai/eval/golden.jsonl', 'utf8')
  .split('\n')
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l) as { id: string; question: string })
  .slice(0, limit);

const rows: Row[] = [];
const when = new Date().toISOString();
let stopped: string | null = null;

// One "Load search" before the series (bge-m3 only, no generator). No retry: if it does not reach search, stop.
const load = await postOurs('/api/models/load', { target: 'search' });
const state = (load.data.models as { state?: string } | undefined)?.state;
if (state !== 'search' && state !== 'ready') {
  stopped = `load search: HTTP ${load.status} ${String(load.data.error ?? state ?? '')}`;
} else {
  for (const q of golden) {
    try {
      const r = await one(q.id, q.question);
      rows.push(r);
      console.log(`${q.id.padEnd(10)} ${r.outcome.padEnd(12)} ${(r.timing.totalMs / 1000).toFixed(1)} s, model ${((r.timing.modelMs ?? 0) / 1000).toFixed(1)} s, quotes ${r.quotes.filter((x) => x.status === 'verified').length}/${r.quotes.length}, $${r.costUsd.toFixed(4)}${r.model?.problem ? `, model: ${r.model.problem}` : ''}`);
    } catch (e) {
      stopped = e instanceof Error ? e.message : String(e);
      break;
    }
  }
}

const cost = rows.reduce((s, r) => s + r.costUsd, 0);
const summary = {
  base: '<public-host>',
  when,
  questions: golden.length,
  done: rows.length,
  stopped,
  outcomes: rows.reduce<Record<string, number>>((m, r) => ((m[r.outcome] = (m[r.outcome] ?? 0) + 1), m), {}),
  quotes: { total: rows.reduce((s, r) => s + r.quotes.length, 0), notVerified: rows.reduce((s, r) => s + r.quotes.filter((x) => x.status !== 'verified').length, 0) },
  costUsd: Math.round(cost * 1e4) / 1e4,
};
writeFileSync(out, JSON.stringify({ summary, rows }, null, 1) + '\n');
console.log(`summary: ${JSON.stringify(summary)}`);
console.log(`wrote ${out}`);
if (stopped) process.exit(1);
