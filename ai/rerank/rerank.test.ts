/**
 * Tests for the reranker client and the rerank retriever (offline: fake fetch, FakeReranker).
 * Run: npx tsx ai/rerank/rerank.test.ts
 */
import type { Chunk } from '../corpus/types';
import type { Retriever, SearchHit } from '../store/types';
import { FakeReranker } from './fake';
import { LocalReranker } from './local';
import { RerankRetriever } from './retriever';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) passed++;
  else {
    failed++;
    console.error(`FAIL: ${name}${detail ? ': ' + detail : ''}`);
  }
}

function fakeFetch(respond: (body: { query: string; documents: string[] }, n: number) => Response) {
  const calls: Array<{ url: string; body: { query: string; documents: string[] } }> = [];
  const fn = (async (url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    calls.push({ url: String(url), body });
    return respond(body, calls.length);
  }) as typeof fetch;
  return { fn, calls };
}
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status });

async function main() {
  // 1. LocalReranker: request shape, reorder by score, truncation flags, device recorded.
  {
    const f = fakeFetch((b) =>
      json({ device: 'cuda', maxLength: 2048, scores: b.documents.map((d) => d.length), truncated: b.documents.map((d) => d.length > 5), elapsedMs: 12.5 }),
    );
    const r = new LocalReranker({ baseUrl: 'http://box:11435/', fetchFn: f.fn });
    const out = await r.rerank('q', [{ id: 'a', text: 'xx' }, { id: 'b', text: 'xxxxxxx' }, { id: 'c', text: 'xxxx' }]);
    check('url', f.calls[0].url === 'http://box:11435/rerank');
    check('documents in order', f.calls[0].body.documents.join(',') === 'xx,xxxxxxx,xxxx');
    check('sorted by score', out.map((o) => o.id).join('') === 'bca');
    check('truncated flag kept', out[0].truncated === true && out[2].truncated === false);
    check('device and server time recorded', r.lastDevice === 'cuda' && r.lastMaxLength === 2048 && r.serverMs[0] === 12.5);
    check('empty input, no call', (await r.rerank('q', [])).length === 0 && f.calls.length === 1);
  }

  // 2. Errors: wrong length rejected; 4xx not retried; 5xx retried.
  {
    const short = fakeFetch(() => json({ scores: [1], truncated: [false] }));
    let msg = '';
    try {
      await new LocalReranker({ baseUrl: 'x', fetchFn: short.fn }).rerank('q', [{ id: 'a', text: 'a' }, { id: 'b', text: 'b' }]);
    } catch (e) {
      msg = String(e);
    }
    check('length mismatch rejected', msg.includes('1 scores for 2'), msg);

    const bad = fakeFetch(() => json({ detail: 'empty query' }, 400));
    try {
      await new LocalReranker({ baseUrl: 'x', fetchFn: bad.fn, retries: 3 }).rerank('', [{ id: 'a', text: 'a' }]);
    } catch {
      /* expected */
    }
    check('4xx not retried', bad.calls.length === 1);

    const flaky = fakeFetch((b, n) => (n === 1 ? json({}, 503) : json({ scores: b.documents.map(() => 0), truncated: b.documents.map(() => false) })));
    const ok = await new LocalReranker({ baseUrl: 'x', fetchFn: flaky.fn, retries: 2 }).rerank('q', [{ id: 'a', text: 'a' }]);
    check('5xx retried', ok.length === 1 && flaky.calls.length === 2);
  }

  // 3. RerankRetriever: only reorders the first stage's candidates; k respected; truncation counted.
  {
    const chunk = (id: string, text: string): Chunk => ({ id, file: 'x', lineStart: 1, lineEnd: 1, kind: 'journal-entry', title: id, text });
    const chunks = new Map([chunk('a', 'raport pipeline'), chunk('b', 'zwężenie flat cbBTC'), chunk('c', 'flat cbBTC zwężenie decyzja'), chunk('d', 'flat')].map((c) => [c.id, c]));
    const first: Retriever = {
      name: 'stub',
      search: async (qs: string[], k: number): Promise<SearchHit[][]> => qs.map(() => ['a', 'b', 'c'].slice(0, k).map((id, i) => ({ id, score: 1 - i / 10 }))),
    };
    const rr = new RerankRetriever(first, new FakeReranker(), chunks, 3);
    const [hits] = await rr.search(['decyzja zwężenie cbBTC'], 2);
    check('reordered by reranker', hits.map((h) => h.id).join('') === 'cb', hits.map((h) => h.id).join(''));
    check('never adds chunks beyond the candidates', !hits.some((h) => h.id === 'd'));
    check('pairs counted', rr.totalPairs === 3 && rr.truncatedPairs === 0);
  }

  console.log(`${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
