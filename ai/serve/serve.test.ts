/**
 * Tests for the chat backend core (phase 4, step 4.3). Offline: fake embedder, fake reranker, fake generator, the real
 * corpus. No call to the inference box or to any API.
 * Run: npx tsx ai/serve/serve.test.ts
 */
import { readFileSync, existsSync } from 'fs';
import type { AddressInfo } from 'net';
import path from 'path';
import { LocalGenerator } from '../answer/local';
import type { Generator, GeneratorResult, GeneratedAnswer } from '../answer/types';
import { loadCorpus } from '../corpus/load';
import type { Chunk } from '../corpus/types';
import { FakeEmbedder } from '../embed/fake';
import { LocalEmbedder } from '../embed/local';
import { FakeReranker } from '../rerank/fake';
import { LocalReranker } from '../rerank/local';
import { createApp } from './app';
import { ask, type AskDeps, type AskResponse } from './ask';
import { ConfigError, DEFAULT_PRESET, loadServeConfig, PRESETS } from './config';
import { MASK } from './mask';
import { markNumbers } from './numbers';
import { buildLocalRetrieval, metaView, type ChatRetrieval } from './retrieve';
import { checkScope, isPlainQuestion } from './scope';
import { FAILED, NOT_IN_DATA, OUT_OF_SCOPE_ADVICE } from './texts';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) passed++;
  else {
    failed++;
    console.error(`FAIL: ${name}${detail ? ': ' + detail : ''}`);
  }
}
const throwsConfig = (env: Record<string, string>, needle: string) => {
  try {
    loadServeConfig(env);
    return false;
  } catch (e) {
    return e instanceof ConfigError && e.message.includes(needle);
  }
};

const BOX = { INFERENCE_URL: 'http://box.invalid:11434', RERANK_URL: 'http://box.invalid:11435' };

async function main() {
  // --- Configuration -------------------------------------------------------------------------------------------
  check('refuses to start with ANTHROPIC_API_KEY set', throwsConfig({ ...BOX, ANTHROPIC_API_KEY: 'sk-ant-test' }, 'ANTHROPIC_API_KEY'));
  check('an empty ANTHROPIC_API_KEY is not a key', !throwsConfig({ ...BOX, ANTHROPIC_API_KEY: '' }, 'ANTHROPIC_API_KEY'));
  const cfg = loadServeConfig({ ...BOX });
  check('default preset', cfg.preset.id === DEFAULT_PRESET);
  check('binds to loopback by default', cfg.host === '127.0.0.1');
  check('refuses a non-loopback host', throwsConfig({ ...BOX, SERVE_HOST: '0.0.0.0' }, 'loopback'));
  check('refuses an unknown preset', throwsConfig({ ...BOX, SERVE_PRESET: 'gpt-x' }, 'SERVE_PRESET'));
  check('needs the box URLs', throwsConfig({}, 'INFERENCE_URL'));
  check('rejects a bad number', throwsConfig({ ...BOX, SERVE_MAX_QUESTION_CHARS: '5' }, 'SERVE_MAX_QUESTION_CHARS'));
  check('question limit default 500', cfg.maxQuestionChars === 500);

  // --- Every preset reproduces its measured run exactly ---------------------------------------------------------
  for (const p of Object.values(PRESETS)) {
    check(`${p.id}: measured run file exists`, existsSync(p.measuredRun));
    const run = JSON.parse(readFileSync(p.measuredRun, 'utf8')) as { generator: string; retrieval: string; generatorSettings: unknown; k: number };
    const gen = new LocalGenerator({ ...p.generator, baseUrl: 'http://box.invalid:11434', countTokens: (s) => s.length });
    check(`${p.id}: generator name equals the measured run`, gen.name === run.generator, `${gen.name}\n  vs ${run.generator}`);
    const sorted = (x: unknown): unknown =>
      Array.isArray(x) ? x.map(sorted) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, sorted(v)])) : x;
    const mine = JSON.stringify(sorted(gen.settings()));
    const theirs = JSON.stringify(sorted(run.generatorSettings));
    check(`${p.id}: every generator setting equals the measured run`, mine === theirs, `\n  served   ${mine}\n  measured ${theirs}`);
    check(`${p.id}: k equals the measured run`, p.k === run.k);
    const chunks = loadCorpus();
    const view = metaView(chunks).chunks;
    const shape = buildLocalRetrieval({
      chunks,
      embedder: new LocalEmbedder({ baseUrl: 'http://box.invalid:11434' }),
      reranker: new LocalReranker({ baseUrl: 'http://box.invalid:11435' }),
      index: { ids: view.map((c) => c.id), vectors: view.map(() => []) },
    });
    check(`${p.id}: retrieval equals the measured run`, run.retrieval.startsWith(shape.name + ' ') || run.retrieval === shape.name, `${shape.name}\n  vs ${run.retrieval}`);
  }

  // --- Scope ---------------------------------------------------------------------------------------------------
  const advice = [
    'Should I buy ETH now?',
    'Is it a good time to sell my WETH?',
    'What should I invest in after reading this?',
    'Which pool should I choose for my savings?',
    'Can you give me trading advice?',
    'Will ETH go up next week?',
    'Czy warto kupić ETH teraz?',
    'W co zainwestować 10 tys. zł?',
    'Jaka jest prognoza ceny ETH?',
  ];
  for (const q of advice) check(`advice refused: ${q}`, !checkScope(q).inScope);
  const project = [
    "Why didn't we actively re-center the ranges?",
    'Did the strategy beat holding?',
    'When was the first live position opened?',
    'Should we have used narrower ranges, according to the backtests?',
    'Why did the bot propose to sell the hedge on 3 Sep?',
    'Dlaczego zamknięto projekt?',
  ];
  for (const q of project) check(`project question allowed: ${q}`, checkScope(q).inScope);
  check('plain question', isPlainQuestion('What happened on 27.08?'));
  check('no letters is not a question', !isPlainQuestion('12345 ???'));
  check('control characters rejected', !isPlainQuestion('hello\u0000world'));

  // --- Numbers -------------------------------------------------------------------------------------------------
  const marks = markNumbers('Fees were $2169 vs $541; the loss was ~$1.9k on 31.08, and 7 positions.', ['zarobiło DUŻO więcej fee: cbBTC $2169 vs $541', 'zjadły ~$1.9k (cbBTC)']);
  const status = Object.fromEntries(marks.map((m) => [m.text, m.status]));
  check('number in a verified quote is verified', status['2169'] === 'verified' && status['541'] === 'verified' && status['1.9'] === 'verified', JSON.stringify(status));
  check('number not in any quote is not verified', status['31.08'] === 'not-verified' && status['7'] === 'not-verified', JSON.stringify(status));
  check('a digit inside a bigger number does not verify', markNumbers('1 position', ['$2169'])[0].status === 'not-verified');
  check('number spans point at the text', marks.every((m) => 'Fees were $2169 vs $541; the loss was ~$1.9k on 31.08, and 7 positions.'.slice(m.start, m.end) === m.text));
  check('typographic minus counts as a minus', markNumbers('ended −32 vs HODL', ['-32 vs HODL'])[0]?.status === 'verified');
  check('typographic minus span keeps the original character', markNumbers('ended −32', [])[0]?.text === '−32');
  check('thousands separator', markNumbers('about 1,234 swaps', ['1234 swapów'])[0]?.status === 'verified');

  // --- ask(): fakes over the real corpus ------------------------------------------------------------------------
  const chunks = loadCorpus();
  const view = metaView(chunks).chunks;
  const embedder = new FakeEmbedder(64);
  const index = { ids: view.map((c) => c.id), vectors: await embedder.embed(view.map((c) => c.text), 'document') };
  let retrievals = 0;
  const base = buildLocalRetrieval({ chunks, embedder, reranker: new FakeReranker(), index });
  const retrieval: ChatRetrieval = {
    name: base.name,
    retrieve: (q, k) => {
      retrievals++;
      return base.retrieve(q, k);
    },
  };

  /** Quotes the first 8 words of the first chunk it gets, adds one made-up quote and a private address. */
  class ScriptedGenerator implements Generator {
    readonly name = 'answer:scripted';
    calls = 0;
    constructor(private readonly mode: 'good' | 'none' | 'invalid') {}
    async generate(_q: string, given: Chunk[]): Promise<GeneratorResult> {
      this.calls++;
      const usage = { input: 0, cacheWrite: 0, cacheRead: 0, output: 0 };
      if (this.mode === 'invalid') return { output: null, usage, costUsd: 0, ms: 1, error: 'invalid structured output' };
      const words = given[0].text.split(/\s+/).filter(Boolean).slice(0, 8).join(' ');
      const out: GeneratedAnswer =
        this.mode === 'none'
          ? { answer: 'I could not find it.', coverage: 'none', citations: [] }
          : {
              answer: `The box at 192.168.1.8:8787 says "${words}" and invented 4242.`,
              coverage: 'partial',
              citations: [
                { chunkId: given[0].id, quote: words },
                { chunkId: given[1].id, quote: 'this sentence is not in the source 4242' },
                { chunkId: 'journal/NOPE.md:1', quote: 'unknown chunk' },
              ],
            };
      return { output: out, usage, costUsd: 0, ms: 1 };
    }
  }
  const deps = (generator: Generator): AskDeps => ({ retrieval, generator, engine: { id: 'test', label: 'test engine' }, k: 10 });

  const good = new ScriptedGenerator('good');
  const r = await ask(deps(good), 'Why did the project stay with wide ranges?');
  check('answered', r.outcome === 'answered', r.outcome);
  check('coverage carried over', r.coverage === 'partial');
  check('ten sources listed', r.sources.length === 10, String(r.sources.length));
  check('first quote verified', r.citations[0]?.status === 'verified', JSON.stringify(r.citations[0]));
  check('made-up quote kept and marked', r.citations[1]?.status === 'not-verified' && r.citations[1]?.reason === 'not-in-chunk');
  check('unknown chunk kept and marked', r.citations[2]?.status === 'not-verified' && r.citations[2]?.reason === 'unknown-chunk');
  check('no quote is dropped', r.citations.length === 3);
  check('private address masked in the answer', r.text.includes(MASK) && !r.text.includes('192.168'), r.text);
  check('number from a made-up quote is not verified', r.numbers.find((n) => n.text === '4242')?.status === 'not-verified', JSON.stringify(r.numbers));
  check('no number from the masked address', !r.numbers.some((n) => n.text === '8787' || n.text === '192.168'));
  check('engine shown', r.engine.label === 'test engine');

  const none = await ask(deps(new ScriptedGenerator('none')), 'What was the weather in Warsaw on 3 Sep?');
  check('coverage none gives the fixed text', none.outcome === 'not-in-data' && none.text === NOT_IN_DATA && none.citations.length === 0);
  check('not-in-data still lists what was searched', none.sources.length === 10);

  const bad = await ask(deps(new ScriptedGenerator('invalid')), 'What happened on 27.08?');
  check('invalid output gives the plain failure text', bad.outcome === 'failed' && bad.text === FAILED && bad.citations.length === 0 && bad.numbers.length === 0);

  const before = retrievals;
  const adv = new ScriptedGenerator('good');
  const refused = await ask(deps(adv), 'Should I buy ETH now?');
  check('advice gets the fixed refusal', refused.outcome === 'out-of-scope' && refused.text === OUT_OF_SCOPE_ADVICE);
  check('the refusal says the strategy did not beat holding', OUT_OF_SCOPE_ADVICE.includes('did not reliably beat'));
  check('no retrieval and no model call for refused advice', retrievals === before && adv.calls === 0);

  // --- HTTP ----------------------------------------------------------------------------------------------------
  const failing: ChatRetrieval = { name: 'x', retrieve: async () => { throw new Error('box unreachable at http://192.168.1.8:11434'); } };
  const app = createApp(deps(new ScriptedGenerator('good')), { maxQuestionChars: 500 });
  const broken = createApp({ ...deps(good), retrieval: failing }, { maxQuestionChars: 500 });
  const listen = (a: ReturnType<typeof createApp>) =>
    new Promise<{ url: string; close: () => void }>((resolve) => {
      const s = a.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${(s.address() as AddressInfo).port}`, close: () => s.close() }));
    });
  const srv = await listen(app);
  const srvBroken = await listen(broken);
  const post = (url: string, body: string, type = 'application/json') => fetch(`${url}/api/ask`, { method: 'POST', headers: { 'content-type': type }, body });
  const origError = console.error;
  console.error = () => {};
  try {
    const h = await fetch(`${srv.url}/api/health`);
    const hj = (await h.json()) as { status: string; engine: { id: string } };
    check('health up', h.status === 200 && hj.status === 'up' && hj.engine.id === 'test');
    check('no x-powered-by header', h.headers.get('x-powered-by') === null);
    const ok = await post(srv.url, JSON.stringify({ question: 'Why wide ranges?' }));
    const okj = (await ok.json()) as AskResponse;
    check('ask over HTTP', ok.status === 200 && okj.outcome === 'answered');
    check('400 on a missing question', (await post(srv.url, JSON.stringify({ q: 'x' }))).status === 400);
    check('400 on a non-string question', (await post(srv.url, JSON.stringify({ question: ['a'] }))).status === 400);
    check('400 on an empty question', (await post(srv.url, JSON.stringify({ question: '   ' }))).status === 400);
    const long = await post(srv.url, JSON.stringify({ question: 'why '.repeat(130) }));
    check('400 on a question over the limit', long.status === 400 && ((await long.json()) as { error: string }).error === 'too-long');
    check('413 on a body over 2 KB', (await post(srv.url, JSON.stringify({ question: 'a'.repeat(3000) }))).status === 413);
    const badJson = await post(srv.url, '{"question": ');
    const badText = await badJson.text();
    check('400 on invalid JSON, without details', badJson.status === 400 && !badText.includes('SyntaxError') && !badText.includes('at '), badText);
    check('400 on a non-JSON body', (await post(srv.url, 'question=hi', 'application/x-www-form-urlencoded')).status === 400);
    check('404 on an unknown API route', (await fetch(`${srv.url}/api/retrieve`, { method: 'POST' })).status === 404);
    const err = await post(srvBroken.url, JSON.stringify({ question: 'Why wide ranges?' }));
    const errText = await err.text();
    check('500 is generic: no internal message, no address', err.status === 500 && !errText.includes('192.168') && !errText.includes('unreachable'), errText);
  } finally {
    console.error = origError;
    srv.close();
    srvBroken.close();
  }

  // --- No Anthropic client and no .env on the public path -------------------------------------------------------
  const seen = new Set<string>();
  const external = new Set<string>();
  const walk = (file: string) => {
    if (seen.has(file)) return;
    seen.add(file);
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/^\s*import\s+(?!type\b)(?:[^'"]*?from\s*)?['"]([^'"]+)['"]/gm)) {
      const spec = m[1];
      if (!spec.startsWith('.')) {
        external.add(spec);
        continue;
      }
      const base = path.resolve(path.dirname(file), spec);
      const next = [`${base}.ts`, path.join(base, 'index.ts')].find(existsSync);
      if (next) walk(next);
    }
  };
  walk(path.resolve('ai/serve/server-cli.ts'));
  check('the server imports no Anthropic client', ![...external].some((e) => e.startsWith('@anthropic-ai')), [...external].join(', '));
  check('the server does not load .env', ![...external].some((e) => e.startsWith('dotenv')), [...external].join(', '));
  check('the import walk saw the pipeline', seen.size > 15, String(seen.size));

  console.log(`serve: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
