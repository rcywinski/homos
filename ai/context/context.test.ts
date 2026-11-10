/**
 * Tests for step 1.7 plumbing (offline: real corpus files, FakeContextualizer, no API calls).
 * Run: npx tsx ai/context/context.test.ts
 */
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { loadCorpus } from '../corpus/load';
import type { Chunk } from '../corpus/types';
import { indexView } from '../embed/index-view';
import { docText } from '../rerank/retriever';
import { runGroups } from './cli';
import { applyContexts } from './contexts-file';
import { FakeContextualizer } from './fake';
import { groupByParent, type Group } from './parents';
import type { ContextRequest, Contextualizer } from './types';
import { validateContext } from './validate';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) passed++;
  else {
    failed++;
    console.error(`FAIL: ${name}${detail ? ': ' + detail : ''}`);
  }
}

async function main() {
  const chunks = loadCorpus();
  const groups = groupByParent(chunks);
  const byId = new Map(groups.flatMap((g) => g.requests.map((r) => [r.chunk.id, r] as const)));

  // 1. Parent units.
  {
    check('every chunk in exactly one group', groups.reduce((n, g) => n + g.requests.length, 0) === chunks.length);
    const report = chunks.find((c) => c.file === 'journal/reports/morning-2026-09-03.md')!;
    const rp = byId.get(report.id)!.parent;
    check('report chunk gets the whole report', !!rp && rp.label === report.file && rp.text.split('\n').length > 50);
    const part = chunks.find((c) => c.file === 'journal/CONTEXT.md' && c.part)!;
    const pp = byId.get(part.id)!.parent;
    check('split entry chunk gets the whole entry', !!pp && pp.text.includes(part.text.split('\n').slice(-1)[0]) && pp.text.length > part.text.length);
    const single = chunks.find((c) => c.kind === 'decision')!;
    check('a decision row has no parent block', byId.get(single.id)!.parent === undefined);
  }

  // 2. Run order, concurrency, hard cap.
  {
    const mk = (k: string, n: number): Group => ({
      key: k,
      requests: Array.from({ length: n }, (_, i) => ({ chunk: { ...chunks[0], id: `${k}#${i}` } })),
    });
    const fake = new FakeContextualizer(0.01, 0.02);
    const got: string[] = [];
    const stats = await runGroups(fake, [mk('a', 3), mk('b', 4), mk('c', 2)], { maxUsd: 100, concurrency: 3, onResult: (id) => got.push(id) });
    check('all done', stats.done === 9 && got.length === 9);
    check('first request of the run goes alone, first', fake.calls[0] === 'a#0');
    for (const g of ['b', 'c']) {
      const firstIdx = fake.calls.indexOf(`${g}#0`);
      const others = fake.calls.map((c, i) => (c.startsWith(`${g}#`) && c !== `${g}#0` ? i : -1)).filter((i) => i >= 0);
      check(`group ${g}: first request before the rest`, others.every((i) => i > firstIdx));
    }
    check('concurrency respected', fake.maxActive <= 3, String(fake.maxActive));

    const capped = new FakeContextualizer(0.01, 0.02);
    const s2 = await runGroups(capped, [mk('a', 5), mk('b', 5)], { maxUsd: 0.05, concurrency: 2, onResult: () => {} });
    check('cap stops the run', s2.stoppedByCap && s2.done < 10);
    check('spent never above cap', s2.spentUsd <= 0.05, s2.spentUsd.toFixed(3));
  }

  // 3. Contexts file and index view.
  {
    const dir = mkdtempSync(path.join(tmpdir(), 'ctx-'));
    const two = chunks.slice(0, 2);
    const file = path.join(dir, 'contexts-test.jsonl');
    writeFileSync(file, two.map((c) => JSON.stringify({ id: c.id, context: `CTX ${c.id}` })).join('\n') + '\n');
    const withCtx = applyContexts(two, file);
    check('context attached', withCtx[1].context === `CTX ${two[1].id}`);
    let msg = '';
    try {
      applyContexts(chunks.slice(0, 3), file);
    } catch (e) {
      msg = String(e);
    }
    check('missing context rejected', msg.includes('no context for 1'), msg);
    const c: Chunk = { ...two[0], date: '2026-08-11', context: 'Ctx line.' };
    check('docText meta with context', docText(c, 'meta').split('\n')[1] === 'Ctx line.');
    const v = indexView(two, 'meta', file);
    check('index view suffix and text', v.suffix === '.ctx-test' && v.chunks[0].text.includes(`CTX ${two[0].id}`) && v.chunks[0].text.endsWith(two[0].text));
    check('plain view unchanged', indexView(two, undefined, undefined).chunks[0].text === two[0].text);
  }

  // 4. Validation and the single retry.
  {
    const dated: ContextRequest = { chunk: { ...chunks[0], date: '2026-09-11', text: 'Epizod 31.08→11.09 zamknięty.', title: 'Wpis' } };
    const undated: ContextRequest = { chunk: { ...chunks[0], date: undefined, text: 'Kolejka zadań.', title: 'Zadania' } };
    check('valid dated', validateContext('2026-09-11: Closing of the narrowing episode (31 Aug to 11 Sep).', dated) === null);
    check('wrong start', validateContext('Undated: something.', dated)?.startsWith('must start with the metadata date') === true);
    check('undated start', validateContext('Undated: task queue.', undated) === null && validateContext('2026-08-01: x', undated) !== null);
    check('first person', validateContext('2026-09-11: I cannot date it.', dated) === 'first-person text');
    check('date absent from sources', validateContext('2026-09-11: decided on 2026-08-01.', dated) === 'date not in the sources: 2026-08-01');
    const named: ContextRequest = { chunk: { ...chunks[0], file: 'journal/DECYZJE-2026-08-26.md', date: undefined, text: 'Punkt 11f.', title: '11f' } };
    check('date from the file name is allowed', validateContext('Undated: decision note of 2026-08-26 on point 11f.', named) === null);
    const stamped: ContextRequest = { chunk: { ...chunks[0], date: '2026-08-18', text: '2026-08-17T05:30:02.561Z selector: ranking', title: 'log' } };
    check('date inside an ISO timestamp is allowed', validateContext('2026-08-18: selector log from 17 August.', stamped) === null);
    check('APR is not April', validateContext('2026-09-11: top-5 APR ranking.', dated) === null);
    check('quoted first person is the source', validateContext('2026-09-11: section "What I built".', dated) === null);
    check('date with a trailing dot is allowed', validateContext('Undated: review of 31 Aug.', { chunk: { ...undated.chunk, text: 'Przegląd 31.08. zakończony.' } }) === null);
    check('date in another form is fine', validateContext('2026-09-11: episode from 2026-08-31.', dated) === null);

    let n = 0;
    const flaky: Contextualizer = {
      name: 'flaky',
      worstCaseUsd: () => 0.01,
      costUsd: () => 0.001,
      contextualize: async (req) => {
        n++;
        const bad = req.chunk.id === 'x#0' || (req.chunk.id === 'x#1' && !req.retryNote);
        return { id: req.chunk.id, context: bad ? 'I think so.' : `${req.chunk.date}: ok`, usage: { input: 1, cacheWrite: 0, cacheRead: 0, output: 1 } };
      },
    };
    const reqs = ['x#0', 'x#1', 'x#2'].map((id) => ({ chunk: { ...dated.chunk, id } }));
    const stored: Array<[string, string, string | undefined]> = [];
    const st = await runGroups(flaky, [{ key: 'x', requests: reqs }], {
      maxUsd: 1,
      concurrency: 2,
      validate: validateContext,
      onResult: (id, c, inv) => stored.push([id, c, inv]),
    });
    check('two retries, one still invalid', st.retries === 2 && st.invalid.length === 1 && st.invalid[0].id === 'x#0', JSON.stringify(st));
    check('five calls in total', n === 5, String(n));
    check('invalid stored empty with its rule', stored.some(([id, c, inv]) => id === 'x#0' && c === '' && !!inv?.startsWith('must start with the metadata date')));
    check('retried one stored valid', stored.some(([id, c]) => id === 'x#1' && c === '2026-09-11: ok'));
  }

  console.log(`${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
