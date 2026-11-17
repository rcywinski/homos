/**
 * Step 4.8 run against the real chat server on the box (run ON the box, where the server listens on 127.0.0.1).
 *
 *   node --import tsx ai/serve/tools/lan-batch.mts examples  [--base http://127.0.0.1:8790] [--out file]
 *   node --import tsx ai/serve/tools/lan-batch.mts golden    [--base ...] [--out file]
 *   node --import tsx ai/serve/tools/lan-batch.mts disconnect [--base ...]
 *
 * Questions go one at a time through POST /api/ask with Server-Sent Events, so each stage is timed from the events:
 * queued, retrieving (the residency check and retrieval follow), generating (generation and verification follow),
 * result. The server must run with limits raised for the batch (SERVE_LIMIT_HOUR and SERVE_LIMIT_DAY at least 40),
 * because every question comes from the same address. No retries: a failed question is recorded as failed.
 *
 * "disconnect" asks one question, closes the connection 3 s after generation starts, then asks a second question
 * at once and times how soon its generation starts. If the first generation were still running on the GPU, the
 * second would wait for it. CC-Win checks the Ollama log for the cancelled request at the same time.
 */
import { readFileSync, writeFileSync } from 'fs';
import { EXAMPLES } from '../../../showcase/examples';

const args = process.argv.slice(2);
const mode = args[0];
const opt = (name: string, fallback: string) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const BASE = opt('--base', 'http://127.0.0.1:8790');

interface Timing {
  queuedMs: number | null;
  retrievalMs: number | null;
  generationMs: number | null;
  totalMs: number;
}

interface Row {
  id: string;
  question: string;
  status: number;
  outcome: string;
  coverage: string | null;
  text: string;
  /** The full citations and the searched chunk ids, so number marks can be recomputed offline (lesson of 4.8). */
  quotes: { status: string; reason?: string; file: string; chunkId: string; quote: string; lines: [number, number] | null }[];
  numbers: { text: string; status: string; transformation?: string; from?: string; context: string }[];
  sources: string[];
  timing: Timing;
  serverMs: number | null;
  error?: string;
}

async function askTimed(question: string, abortAfterGeneratingMs?: number): Promise<{ events: Record<string, number>; result: Record<string, unknown> | null; status: number; aborted: boolean }> {
  const t0 = Date.now();
  const events: Record<string, number> = {};
  const ctl = new AbortController();
  const res = await fetch(`${BASE}/api/ask`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
    body: JSON.stringify({ question }),
    signal: ctl.signal,
  });
  if (!(res.headers.get('content-type') ?? '').includes('text/event-stream')) {
    return { events, result: (await res.json()) as Record<string, unknown>, status: res.status, aborted: false };
  }
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: Record<string, unknown> | null = null;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let cut: number;
      while ((cut = buffer.indexOf('\n\n')) >= 0) {
        const block = buffer.slice(0, cut);
        buffer = buffer.slice(cut + 2);
        const name = block.match(/^event: (.+)$/m)?.[1] ?? '';
        const data = block.match(/^data: (.*)$/m)?.[1] ?? '{}';
        if (!(name in events)) events[name] = Date.now() - t0;
        if (name === 'generating' && abortAfterGeneratingMs !== undefined) {
          setTimeout(() => ctl.abort(), abortAfterGeneratingMs);
        }
        if (name === 'result' || name === 'error') result = JSON.parse(data) as Record<string, unknown>;
      }
    }
  } catch (e) {
    if (ctl.signal.aborted) return { events: { ...events, aborted: Date.now() - t0 }, result: null, status: res.status, aborted: true };
    throw e;
  }
  events.end = Date.now() - t0;
  return { events, result, status: res.status, aborted: false };
}

function toRow(id: string, question: string, r: Awaited<ReturnType<typeof askTimed>>): Row {
  const e = r.events;
  const out = (r.result ?? {}) as Record<string, unknown>;
  const text = String(out.text ?? out.message ?? '');
  const numbers = ((out.numbers ?? []) as { text: string; start: number; end: number; status: string; transformation?: string; from?: string }[]).map((n) => ({
    text: n.text,
    status: n.status,
    ...(n.transformation ? { transformation: n.transformation } : {}),
    ...(n.from ? { from: n.from } : {}),
    context: text.slice(Math.max(0, n.start - 40), n.end + 25).replace(/\s+/g, ' '),
  }));
  return {
    id,
    question,
    status: r.status,
    outcome: String(out.outcome ?? out.error ?? 'none'),
    coverage: (out.coverage as string | null) ?? null,
    text,
    quotes: ((out.citations ?? []) as { status: string; reason?: string; file: string; chunkId: string; quote: string; lines: [number, number] | null }[]).map((c) => ({
      status: c.status,
      ...(c.reason ? { reason: c.reason } : {}),
      file: c.file,
      chunkId: c.chunkId,
      quote: c.quote,
      lines: c.lines,
    })),
    numbers,
    sources: ((out.sources ?? []) as { chunkId: string }[]).map((x) => x.chunkId),
    timing: {
      queuedMs: e.queued ?? null,
      retrievalMs: e.retrieving !== undefined && e.generating !== undefined ? e.generating - e.retrieving : null,
      generationMs: e.generating !== undefined && e.end !== undefined ? e.end - e.generating : null,
      totalMs: e.end ?? e.aborted ?? 0,
    },
    serverMs: typeof out.ms === 'number' ? out.ms : null,
    ...(out.error ? { error: String(out.error) } : {}),
  };
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : NaN;
};

async function batch(items: { id: string; question: string }[], out: string) {
  const health = await fetch(`${BASE}/api/health`).then((r) => r.json()).catch((e) => ({ error: String(e) }));
  console.log(`health: ${JSON.stringify(health)}`);
  const rows: Row[] = [];
  for (const it of items) {
    const r = await askTimed(it.question).catch((e: unknown) => ({ events: {}, result: { error: String(e) }, status: 0, aborted: false }));
    const row = toRow(it.id, it.question, r);
    rows.push(row);
    const nv = row.numbers.filter((n) => n.status === 'not-verified').length;
    console.log(
      `${it.id.padEnd(10)} ${row.outcome.padEnd(12)} total ${(row.timing.totalMs / 1000).toFixed(1)}s (retrieval ${((row.timing.retrievalMs ?? 0) / 1000).toFixed(1)}s, generation ${((row.timing.generationMs ?? 0) / 1000).toFixed(1)}s), quotes ${row.quotes.filter((q) => q.status === 'verified').length}/${row.quotes.length} verified, numbers not verified ${nv}`,
    );
  }
  const answered = rows.filter((r) => r.outcome === 'answered');
  const summary = {
    base: BASE,
    when: new Date().toISOString(),
    questions: rows.length,
    outcomes: rows.reduce<Record<string, number>>((m, r) => ((m[r.outcome] = (m[r.outcome] ?? 0) + 1), m), {}),
    medianSeconds: {
      retrieval: median(rows.map((r) => r.timing.retrievalMs ?? NaN).filter(Number.isFinite)) / 1000,
      generationAndVerification: median(rows.map((r) => r.timing.generationMs ?? NaN).filter(Number.isFinite)) / 1000,
      total: median(rows.map((r) => r.timing.totalMs)) / 1000,
    },
    quotes: { total: answered.reduce((s, r) => s + r.quotes.length, 0), notVerified: answered.reduce((s, r) => s + r.quotes.filter((q) => q.status !== 'verified').length, 0) },
    numbers: ['verified', 'in-source', 'not-verified'].reduce<Record<string, number>>((m, st) => ((m[st] = answered.reduce((s, r) => s + r.numbers.filter((n) => n.status === st).length, 0)), m), {}),
  };
  writeFileSync(out, JSON.stringify({ summary, rows }, null, 1) + '\n');
  console.log(`summary: ${JSON.stringify(summary)}`);
  console.log(`wrote ${out}`);
}

async function disconnect() {
  console.log('disconnect test: question A, closed 3 s after generation starts; then question B at once');
  const a = await askTimed('Why did the project stay with wide ranges instead of re-centering them?', 3000);
  const closedAt = Date.now();
  console.log(`A: events ${JSON.stringify(a.events)}, aborted ${a.aborted}`);
  const b = await askTimed('When was the capital withdrawn?');
  const r = (b.result ?? {}) as Record<string, unknown>;
  console.log(`B: outcome ${String(r.outcome ?? r.error)}, events ${JSON.stringify(b.events)}`);
  console.log(`B started generating ${b.events.generating ?? 'never'} ms after it was sent (sent ${Date.now() - closedAt - (b.events.end ?? 0)} ms after A was closed).`);
  console.log('Compare with the generation start of an ordinary question in the golden batch; a long wait here means A kept running.');
}

const today = new Date().toISOString().slice(0, 10);
if (mode === 'examples') await batch(EXAMPLES.map((q, i) => ({ id: `example-${i + 1}`, question: q })), opt('--out', `lan-run-examples-${today}.json`));
else if (mode === 'golden') {
  const golden = readFileSync('ai/eval/golden.jsonl', 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as { id: string; question: string });
  await batch(golden, opt('--out', `lan-run-golden-${today}.json`));
} else if (mode === 'disconnect') await disconnect();
else {
  console.error('usage: lan-batch.mts examples|golden|disconnect [--base URL] [--out file]');
  process.exit(2);
}
