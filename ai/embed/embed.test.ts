/**
 * Tests for the embedders (offline: LocalEmbedder runs against a fake fetch).
 * Run: npx tsx ai/embed/embed.test.ts
 */
import { FakeEmbedder } from './fake';
import { LocalEmbedder } from './local';
import { InputTooLongError } from './types';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) passed++;
  else {
    failed++;
    console.error(`FAIL: ${name}${detail ? ': ' + detail : ''}`);
  }
}
const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);
const unit = (dims: number) => {
  const v = new Array<number>(dims).fill(0);
  v[0] = 1;
  return v;
};

type Call = { url: string; body: Record<string, unknown> };

function fakeFetch(respond: (body: Record<string, unknown>, n: number) => Response) {
  const calls: Call[] = [];
  const fn = (async (url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    calls.push({ url: String(url), body });
    return respond(body, calls.length);
  }) as typeof fetch;
  return { fn, calls };
}
const ok = (vecs: number[][]) => new Response(JSON.stringify({ embeddings: vecs }), { status: 200 });

async function main() {
  // 1. FakeEmbedder: deterministic, normalised, similar texts closer than unrelated ones.
  {
    const e = new FakeEmbedder(64);
    const [a, b, c] = await e.embed(['zakres cbBTC zawężony', 'zakres cbBTC zawężony dzisiaj', 'raport poranny pipeline'], 'document');
    const [a2] = await e.embed(['zakres cbBTC zawężony'], 'query');
    check('fake is deterministic', JSON.stringify(a) === JSON.stringify(a2));
    check('fake is normalised', Math.abs(Math.sqrt(dot(a, a)) - 1) < 1e-9);
    check('fake: shared words are closer', dot(a, b) > dot(a, c));
  }

  // 2. LocalEmbedder request shape: batches of 32, truncate:false, no options, keep_alive only when set.
  {
    const f = fakeFetch((body) => ok((body.input as string[]).map(() => unit(1024))));
    const e = new LocalEmbedder({ baseUrl: 'http://box:11434/', fetchFn: f.fn, keepAlive: '30m' });
    const vecs = await e.embed(Array.from({ length: 70 }, (_, i) => `t${i}`), 'document');
    check('70 texts -> 3 requests', f.calls.length === 3, String(f.calls.length));
    check('batch sizes 32/32/6', f.calls.map((c) => (c.body.input as string[]).length).join('/') === '32/32/6');
    check('one vector per text', vecs.length === 70);
    check('url', f.calls[0].url === 'http://box:11434/api/embed');
    check('truncate false', f.calls.every((c) => c.body.truncate === false));
    check('no options', f.calls.every((c) => !('options' in c.body)));
    check('keep_alive sent when set', f.calls.every((c) => c.body.keep_alive === '30m'));
    check('model bge-m3', f.calls[0].body.model === 'bge-m3' && e.name === 'ollama-bge-m3');

    const g = fakeFetch((body) => ok((body.input as string[]).map(() => unit(1024))));
    await new LocalEmbedder({ baseUrl: 'http://box:11434', fetchFn: g.fn }).embed(['q'], 'query');
    check('no keep_alive by default', !('keep_alive' in g.calls[0].body));
  }

  // 3. Validation and errors.
  {
    const wrongDims = fakeFetch(() => ok([unit(512)]));
    let msg = '';
    try {
      await new LocalEmbedder({ baseUrl: 'x', fetchFn: wrongDims.fn, retries: 1 }).embed(['a'], 'document');
    } catch (e) {
      msg = String(e);
    }
    check('wrong dimension rejected', msg.includes('1024'), msg);

    const tooLong = fakeFetch(() => new Response('the input length exceeds the context length', { status: 413 }));
    let err: unknown;
    try {
      await new LocalEmbedder({ baseUrl: 'x', fetchFn: tooLong.fn, retries: 3 }).embed(['a'], 'document');
    } catch (e) {
      err = e;
    }
    check('413 -> InputTooLongError', err instanceof InputTooLongError);
    check('413 is not retried', tooLong.calls.length === 1, String(tooLong.calls.length));

    const flaky = fakeFetch((body, n) => (n === 1 ? new Response('busy', { status: 503 }) : ok((body.input as string[]).map(() => unit(1024)))));
    const v = await new LocalEmbedder({ baseUrl: 'x', fetchFn: flaky.fn, retries: 2 }).embed(['a'], 'document');
    check('5xx retried then succeeds', v.length === 1 && flaky.calls.length === 2);
  }

  console.log(`${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
