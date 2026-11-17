/**
 * Tests for the chat backend core (phase 4, step 4.3). Offline: fake embedder, fake reranker, fake generator, the real
 * corpus. No call to the inference box or to any API.
 * Run: npx tsx ai/serve/serve.test.ts
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
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
import { createApp, type AppOptions } from './app';
import { MemoryLog } from './log';
import { GpuQueue } from './queue';
import { RateLimiter } from './ratelimit';
import { ask, type AskDeps, type AskResponse } from './ask';
import { ConfigError, DEFAULT_PRESET, loadServeConfig, PRESETS } from './config';
import { MASK } from './mask';
import { markNumbers } from './numbers';
import { buildLocalRetrieval, checkCorpus, checkIndex, IndexMismatch, metaView, type ChatRetrieval } from './retrieve';
import { corpusHash, type IndexFile } from '../embed/index-file';
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
    {
      const chunks = loadCorpus();
      check(`${p.id}: corpus on disk has the project corpus hash`, corpusHash(chunks) === p.corpusHash, corpusHash(chunks));
      check(`${p.id}: meta view has the index hash`, corpusHash(metaView(chunks).chunks) === p.indexCorpusHash);
      let threw = false;
      try {
        checkCorpus(chunks.slice(1), p);
      } catch (e) {
        threw = e instanceof IndexMismatch;
      }
      check(`${p.id}: a changed corpus is refused`, threw);
    }
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

  // --- Start-up index check ----------------------------------------------------------------------------------
  {
    const chunks = loadCorpus();
    const view = metaView(chunks).chunks;
    const good: IndexFile = { embedder: 'ollama-bge-m3', dims: 1, createdAt: '', wallTimeMs: 0, chunkCount: view.length, corpusHash: corpusHash(view), ids: view.map((c) => c.id), vectors: view.map(() => [0]) };
    const refuses = (idx: IndexFile, needle: string) => {
      try {
        checkIndex(idx, chunks, 'ollama-bge-m3', 'test-index.json');
        return false;
      } catch (e) {
        return e instanceof IndexMismatch && e.message.includes(needle);
      }
    };
    let accepted = true;
    try {
      checkIndex(good, chunks, 'ollama-bge-m3', 'test-index.json');
    } catch {
      accepted = false;
    }
    check('index built from this corpus is accepted', accepted);
    check('index from another corpus is refused', refuses({ ...good, corpusHash: '0000000000000000' }, 'another corpus'));
    check('index from another embedder is refused', refuses({ ...good, embedder: 'voyage-4' }, 'voyage-4'));
    check('index with a missing vector is refused', refuses({ ...good, ids: good.ids.slice(1), vectors: good.vectors.slice(1) }, 'vectors'));
    check('index with a foreign id is refused', refuses({ ...good, ids: ['journal/NOPE.md:1', ...good.ids.slice(1)] }, 'not in the corpus'));
    const crlf = loadCorpus().map((c) => c.text).join('').includes('\r');
    check('the corpus as loaded has no CR characters (Windows checkouts hash the same)', !crlf);
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

  // Three states (owner, 16 Nov 2026): verified, in the cited source, not verified.
  const st = (answer: string, quotes: string[], chunks: string[] = []) => markNumbers(answer, quotes, chunks).map((m) => `${m.text}:${m.status}${m.transformation ? '/' + m.transformation : ''}`).join(' ');
  check('in a cited chunk, not quoted', st('the 720-day run', ['inny cytat'], ['test na 720 dniach']) === '720:in-source', st('the 720-day run', ['inny cytat'], ['test na 720 dniach']));
  check('a single digit in a chunk is not enough', st('Phase 4 started', [], ['krok 4 i 8 GB']) === '4:not-verified');
  check('date written out, day first, with the project year', st('On 27 August 2026 it opened', ['27.08 otwarto pozycję']) === '27:in-source/date-written-out 2026:in-source/year-added');
  check('date written out, month first', st('on August 3, 2026', ['3.08: zmiana']) === '3:in-source/date-written-out 2026:in-source/year-added');
  check('abbreviated month and ordinal', st('on 21st Sep', [], ['raport z 21.09']) === '21:in-source/date-written-out');
  check('a date the source does not have stays not verified', st('On 27 August', ['28.08 otwarto']) === '27:not-verified');
  check('another year is not added', st('On 27 August 2025', ['27.08 otwarto']) === '27:in-source/date-written-out 2025:not-verified');
  check('dd.mm.2026 for a source dd.mm', st('opened 27.08.2026', ['27.08 otwarto']) === '27.08.2026:in-source/year-added');
  check('rounded to the printed decimals', st('lost 51.5%', ['spadek 51.53%']) === '51.5:in-source/rounded');
  check('rounding needs two significant digits', st('about 2 days', ['1.98 dnia']) === '2:not-verified');
  check('a value that does not round to the source stays not verified', st('lost 51.6%', ['spadek 51.53%']) === '51.6:not-verified');
  check('a multiplier is not verified by its digit', st('earned 4x more', ['$2169 vs $541, 4 pule']) === '4:not-verified');
  check('a multiplier is not in-source by a chunk', st('earned 12x more', [], ['12 pul']) === '12:not-verified');
  check('a quoted multiplier is verified', st('earned 4x more', ['zarobiło 4x więcej']) === '4:verified');
  check('a sum computed by the model stays not verified', st('total 132.37', ['-40.98 i -92.39']) === '132.37:not-verified');
  // Step 4.8n mechanical fixes.
  const one = (answer: string, quotes: string[], chunks: string[] = []) => markNumbers(answer, quotes, chunks).map((m) => `${m.text}:${m.status}`).join(' ');
  check('an ISO date is one token, verified when the quote has it', one('on 2026-09-09 it ran', ['2026-09-09 04:53 exit 0']) === '2026-09-09:verified');
  check('an ISO date in another notation in the quote is in-source', one('on 2026-08-29 it opened', ['29.08 otwarcie']) === '2026-08-29:in-source');
  check('a wrong ISO date is not verified even when its parts appear', one('on 2026-09-18 it ran', ['2026-09-09 at 18:00, 09 and 18']) === '2026-09-18:not-verified', one('on 2026-09-18 it ran', ['2026-09-09 at 18:00, 09 and 18']));
  check('a clock time is one token', one('at 08:45 the report', ['raport 08:45']) === '08:45:verified');
  check('a wrong clock time is not verified', one('at 09:45 the report', ['raport 08:45, 09 i 45']) === '09:45:not-verified');
  check('list numbering gets no mark', one('two tasks: (1) the observer and (2) the labels', []) === '');
  check('a fee tier written as a decimal matches the pool id', one('the 0.05% pool on Base', ['base-weth-usdc-005']) === '0.05:verified');
  check('a decimal without pool context is not a fee tier', one('it cost 0.05 ETH', ['base-weth-usdc-005']) === '0.05:not-verified');
  check('a written-out date is checked as a date, not as a bare day number', one('on 4 Aug 2026 it ran', ['ran 22.08, 4 pools']) === '4:not-verified 2026:not-verified');
  check('a written-out date found as dd.mm is in-source', one('on 22 Aug 2026 it ran', ['ran 22.08']) === '22:in-source 2026:in-source');
  check('a written-out date in a Polish quote is in-source', one('on 21 August', ['21 sierpnia raport']) === '21:in-source');
  // Owner decisions of 4.8n: under two significant digits with a unit, the uncited reason, identifiers as tokens.
  const full = (answer: string, quotes: string[], chunks: string[], searched: string[] = []) =>
    markNumbers(answer, quotes, chunks, { searchedChunks: searched }).map((m) => `${m.text}:${m.status}${m.reason ? '/' + m.reason : ''}`).join(' ');
  check('a single digit with the same unit in a cited chunk is in-source', full('narrowed to ±5% wide', [], ['zawężenie do ±5%']) === '5:in-source');
  check('a single digit with another unit stays not verified', full('heap of 6GB', [], ['heap 8 GB, 6 pul']) === '6:not-verified');
  check('0.6 with its unit is in-source', full('closed at +0.6%', [], ['zamknięte +0.6 %']) === '+0.6:in-source');
  check('a number only in an uncited searched chunk says so', full('balance $5,966.88', ['inny cytat'], ['inny chunk'], ['bilans $5966.88']) === '5,966.88:not-verified/uncited-source');
  check('a number nowhere has no reason', full('total $132.37', ['x'], ['y'], ['z']) === '132.37:not-verified');
  check('an identifier found in a quote is verified as one token', full('the arbitrum-usdc-usdt-001 pool', ['pula arbitrum-usdc-usdt-001'], []) === 'arbitrum-usdc-usdt-001:verified');
  check('an invented identifier is flagged', full('the arbitrum-usdc-usdt-007 pool', ['pula arbitrum-usdc-usdt-001'], ['arbitrum-usdc-usdt-001']) === 'arbitrum-usdc-usdt-007:not-verified');
  check('an identifier with letters after digits', full('config k2h24 won', [], ['konfiguracja k2h24']) === 'k2h24:in-source');
  check('an invented k-config is flagged', full('config k3h24 won', [], ['konfiguracja k2h24']) === 'k3h24:not-verified');
  check('a transformation never gives verified', markNumbers('On 27 August 2026', ['27.08'], []).every((m) => m.status !== 'verified'));

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
          ? { answer: 'I could not find it; the sources name 7 pools, not 9.', coverage: 'none', citations: [] }
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
  // Owner, 17 Nov 2026: the model's own explanation goes under the fixed heading, with its quotes and number marks.
  check('not-in-data carries the model explanation', none.explanation?.text === 'I could not find it; the sources name 7 pools, not 9.', JSON.stringify(none.explanation));
  check('the explanation has number marks, here not verified (no quote)', none.explanation?.numbers.length === 2 && none.explanation.numbers.every((n) => n.status === 'not-verified'), JSON.stringify(none.explanation?.numbers));
  check('the fixed heading itself has no marks or quotes', none.numbers.length === 0 && none.citations.length === 0);

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
  const opts = (): AppOptions => ({
    maxQuestionChars: 500,
    queue: new GpuQueue(5, 60_000),
    limiter: new RateLimiter({ perHour: 100, perDay: 100, globalPerDay: 1000 }),
    log: new MemoryLog(),
    probe: { up: async () => true },
    trustProxy: 'none',
    paused: () => false,
  });
  const app = createApp(deps(new ScriptedGenerator('good')), opts());
  const broken = createApp({ ...deps(good), retrieval: failing }, opts());
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
    check('box failure is model-unavailable: fixed message, no address', err.status === 503 && errText.includes('model-unavailable') && !errText.includes('192.168') && !errText.includes('unreachable'), errText);
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

  // What Node actually loaded for the server modules this test imports (express and its dependencies are CommonJS and
  // land in require.cache): no wallet, signing or contract-tooling package, transitive ones included.
  const { FORBIDDEN_PACKAGES } = createRequire(import.meta.url)('../../showcase/guard.js') as { FORBIDDEN_PACKAGES: string[] };
  const loaded = new Set(
    Object.keys(createRequire(import.meta.url).cache)
      .flatMap((f) => [...f.replace(/\\/g, '/').matchAll(/node_modules\/((?:@[^/]+\/)?[^/]+)/g)].map((m) => m[1])),
  );
  const walletPackages = [...loaded].filter((p) => FORBIDDEN_PACKAGES.includes(p) || FORBIDDEN_PACKAGES.includes(p.split('/')[0]));
  check('the server loads no wallet, signing or contract-tooling package', walletPackages.length === 0, walletPackages.join(', '));
  check('the loaded-module check saw express', loaded.has('express'), [...loaded].slice(0, 5).join(', '));

  console.log(`serve: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
