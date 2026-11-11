/**
 * Tests for the local generator (step 1.11), offline: a fake fetch stands in for Ollama, a word counter for the
 * tokenizer. Run: npx tsx ai/answer/local.test.ts
 */
import type { Chunk } from '../corpus/types';
import { LocalGenerator, parseAnswer, type LocalGenOptions } from './local';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) passed++;
  else {
    failed++;
    console.error(`FAIL: ${name}${detail ? ': ' + detail : ''}`);
  }
}

const words = (t: string) => t.split(/\s+/).filter(Boolean).length;
const chunk: Chunk = { id: 'journal/CONTEXT.md:10', file: 'journal/CONTEXT.md', lineStart: 10, lineEnd: 11, kind: 'journal-entry', title: 't', text: 'pozycja zamknięta 31.08' };
const good = JSON.stringify({ answer: 'Closed on 31.08.', coverage: 'full', citations: [{ chunkId: chunk.id, quote: 'pozycja zamknięta 31.08' }] });

/** Fake Ollama: replies in order; prompt_eval_count = words of system + user + overhead, unless overridden. */
function fakeOllama(replies: Array<{ content: string; done_reason?: string; thinking?: string; promptDelta?: number }>, overhead = 7) {
  const bodies: Array<Record<string, unknown>> = [];
  let i = 0;
  const fetchFn = (async (_url: string, init?: { body?: string }) => {
    const body = JSON.parse(init?.body ?? '{}') as { messages: Array<{ content: string }> };
    bodies.push(body as unknown as Record<string, unknown>);
    const r = replies[Math.min(i++, replies.length - 1)];
    const prompt = body.messages.reduce((s, m) => s + words(m.content), 0) + overhead + (r.promptDelta ?? 0);
    return {
      ok: true,
      json: async () => ({ message: { content: r.content, thinking: r.thinking }, done_reason: r.done_reason ?? 'stop', prompt_eval_count: prompt, eval_count: 50, eval_duration: 2e9 }),
    } as unknown as Response;
  }) as unknown as typeof fetch;
  return { fetchFn, bodies };
}

const opts = (fetchFn: typeof fetch, extra: Partial<LocalGenOptions> = {}): LocalGenOptions => ({
  baseUrl: 'http://box:11434',
  model: 'qwen3.8:27b',
  tokenizerDir: 'unused',
  think: false,
  numCtx: 16384,
  numPredict: 2048,
  sampling: { temperature: 0.7, top_p: 0.8, top_k: 20, min_p: 0, presence_penalty: 1.5, repeat_penalty: 1 },
  keepAlive: '2m',
  fetchFn,
  countTokens: words,
  ...extra,
});

async function main() {
  // 1. Schema validation of the structured output.
  check('valid answer parses', parseAnswer(good)?.coverage === 'full');
  check('not JSON is invalid', parseAnswer('Closed on 31.08.') === null);
  check('extra key is invalid', parseAnswer(JSON.stringify({ ...JSON.parse(good), note: 'x' })) === null);
  check('bad coverage is invalid', parseAnswer(JSON.stringify({ ...JSON.parse(good), coverage: 'most' })) === null);
  check('citation without quote is invalid', parseAnswer(JSON.stringify({ answer: 'a', coverage: 'none', citations: [{ chunkId: 'x' }] })) === null);

  // 2. Request: same schema as format, explicit context, thinking flag, keep_alive, sampling.
  {
    const f = fakeOllama([{ content: good }]);
    const gen = new LocalGenerator(opts(f.fetchFn));
    const r = await gen.generate('When was it closed?', [chunk]);
    const b = f.bodies[0] as { format: { required: string[] }; think: boolean; keep_alive: string; stream: boolean; options: Record<string, number> };
    check('format is the answer schema', b.format.required.join() === 'answer,coverage,citations');
    check('think false, stream false, keep_alive 2m', b.think === false && b.stream === false && b.keep_alive === '2m');
    check('num_ctx, num_predict and sampling sent', b.options.num_ctx === 16384 && b.options.num_predict === 2048 && b.options.temperature === 0.7 && b.options.presence_penalty === 1.5);
    check('valid answer returned, no retry', r.output?.coverage === 'full' && r.local?.invalidOutputs === 0 && r.local?.retried === false);
    check('template overhead calibrated on the first call', gen.templateOverhead === 7);
    check('tokens per second from eval_count / eval_duration', r.local?.tokensPerSecond === 25);
  }

  // 3. Prompt token checks: before the call (fit) and after it (server count).
  {
    const f = fakeOllama([{ content: good }]);
    const gen = new LocalGenerator(opts(f.fetchFn, { numCtx: 2060, numPredict: 2048 }));
    let msg = '';
    await gen.generate('When was it closed?', [chunk]).catch((e: Error) => (msg = e.message));
    check('prompt plus num_predict over num_ctx fails before the call', /does not fit/.test(msg) && f.bodies.length === 0, msg);
  }
  {
    const f = fakeOllama([{ content: good }, { content: good, promptDelta: -40 }]);
    const gen = new LocalGenerator(opts(f.fetchFn));
    await gen.generate('When was it closed?', [chunk]);
    let msg = '';
    await gen.generate('When was it closed, exactly?', [chunk]).catch((e: Error) => (msg = e.message));
    check('server count below the expected one fails loudly (truncation or caching)', /prompt token mismatch/.test(msg), msg);
  }
  {
    const f = fakeOllama([{ content: good }], 500);
    let msg = '';
    await new LocalGenerator(opts(f.fetchFn)).generate('q', [chunk]).catch((e: Error) => (msg = e.message));
    check('implausible template overhead on the first call fails', /not a chat template/.test(msg), msg);
  }

  // 4. Invalid structured output: one retry, counted; a cut-off output is invalid too.
  {
    const f = fakeOllama([{ content: 'not json' }, { content: good }]);
    const r = await new LocalGenerator(opts(f.fetchFn)).generate('q', [chunk]);
    check('invalid then valid: answer kept, 1 invalid, retried', r.output !== null && r.local?.invalidOutputs === 1 && r.local?.retried === true && f.bodies.length === 2);
  }
  {
    const f = fakeOllama([{ content: good.slice(0, 20), done_reason: 'length' }, { content: 'still not json' }, { content: good }]);
    const r = await new LocalGenerator(opts(f.fetchFn)).generate('q', [chunk]);
    check('two invalid: no answer, error, at most one retry', r.output === null && r.local?.invalidOutputs === 2 && f.bodies.length === 2 && r.error === 'invalid structured output', JSON.stringify(r.error));
  }

  // 4b. A network failure (no response) is repeated at most twice, counted apart from invalid outputs, and only while
  // the model is still loaded; an unreachable box or a model gone after a restart stops the run instead of reloading.
  {
    const ps = (models: string[]) => ({ ok: true, json: async () => ({ models: models.map((name) => ({ name, size: 1, size_vram: 1 })) }) }) as unknown as Response;
    const box = (failChats: number, loaded: string[] | null) => {
      const f = fakeOllama([{ content: good }]);
      let fails = failChats;
      return (async (url: string, init?: RequestInit) => {
        if (url.endsWith('/api/ps')) {
          if (!loaded) throw new TypeError('fetch failed');
          return ps(loaded);
        }
        if (fails-- > 0) throw new TypeError('fetch failed');
        return f.fetchFn(url, init);
      }) as unknown as typeof fetch;
    };
    let msg0 = '';
    await new LocalGenerator(opts(box(1, ['qwen3.8:27b']))).generate('q', [chunk]).catch((e: Error) => (msg0 = e.message));
    check('default (owner rule, step 1.11): the first network failure stops the run', msg0 === 'fetch failed', msg0);
    const r = await new LocalGenerator(opts(box(1, ['qwen3.8:27b']), { maxNetworkRetries: 2 })).generate('q', [chunk]);
    check('network failure with the model still loaded: repeated and counted', r.output !== null && r.local?.networkRetries === 1 && r.local?.invalidOutputs === 0);
    let msg = '';
    await new LocalGenerator(opts(box(9, ['qwen3.8:27b']), { maxNetworkRetries: 2 })).generate('q', [chunk]).catch((e: Error) => (msg = e.message));
    check('third network failure throws', msg === 'fetch failed', msg);
    msg = '';
    await new LocalGenerator(opts(box(1, []), { maxNetworkRetries: 2 })).generate('q', [chunk]).catch((e: Error) => (msg = e.message));
    check('model gone after a failure: stop, do not reload', /no longer loaded/.test(msg), msg);
    msg = '';
    await new LocalGenerator(opts(box(1, null), { maxNetworkRetries: 2 })).generate('q', [chunk]).catch((e: Error) => (msg = e.message));
    check('box unreachable after a failure: stop', /unreachable/.test(msg), msg);
  }

  // 5. Thinking: counted and kept for the result file, never part of the answer.
  {
    const f = fakeOllama([{ content: good, thinking: 'The user asks about the date. The chunk says 31.08.' }]);
    const r = await new LocalGenerator(opts(f.fetchFn, { think: true })).generate('q', [chunk]);
    check('thinking tokens counted and text kept apart', r.local?.thinkingTokens === 10 && r.local?.thinking?.startsWith('The user') === true && !r.output?.answer.includes('The user'));
    check('think true sent', (f.bodies[0] as { think: boolean }).think === true);
  }

  console.log(`${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
