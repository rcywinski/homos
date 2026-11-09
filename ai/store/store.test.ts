/**
 * Tests for the tokeniser, BM25 and RRF (offline).
 * Run: npx tsx ai/store/store.test.ts
 */
import type { Chunk } from '../corpus/types';
import { Bm25Index } from './bm25';
import { rrf } from './hybrid';
import { fold, normaliseDates, tokenize } from './tokenize';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) passed++;
  else {
    failed++;
    console.error(`FAIL: ${name}${detail ? ': ' + detail : ''}`);
  }
}
const has = (tokens: string[], t: string) => tokens.includes(t);
const none = { stem: 'none' as const };

async function main() {
  // 1. Folding and dates.
  check('fold diacritics', fold('Zwężenie ŁÓDŹ') === 'zwezenie lodz');
  for (const [text, want] of [
    ['2026-09-15', 'd20260915'],
    ['15.09', 'd20260915'],
    ['15.09.2026', 'd20260915'],
    ['15 Sep', 'd20260915'],
    ['on 15 September', 'd20260915'],
    ['September 15, 2026', 'd20260915'],
    ['15 września', 'd20260915'],
    ['31 sierpnia', 'd20260831'],
  ] as const)
    check(`date "${text}"`, has(tokenize(text, none), want), tokenize(text, none).join(' '));
  check('price is not a date', !normaliseDates(fold('$12.08 i 0.05% i 1.15/d')).includes('d2026'), normaliseDates(fold('$12.08 i 0.05% i 1.15/d')));
  check('decimal in a number is not a date', !normaliseDates('2.40 3.10x').includes('d2026'));

  // 2. Identifiers, stopwords, stemming.
  const id = tokenize('Pozycja #5978579 i FLAT_NARROW na cbBTC', none);
  check('# stripped', has(id, '5978579'));
  check('compound kept and split', has(id, 'flat_narrow') && has(id, 'flat') && has(id, 'narrow'));
  check('stopwords dropped', !has(id, 'i') && !has(id, 'na'));
  check('nie kept by default', has(tokenize('zwężanie NADAL NIE', none), 'nie'));
  check('nie dropped on request', !has(tokenize('zwężanie NADAL NIE', { stem: 'none', dropNie: true }), 'nie'));
  const st = tokenize('narrowing narrowed pozycja pozycji 5978579 flat_narrow', { stem: 'prefix6' });
  check('prefix6 merges English forms', tokenize('narrowing narrowed', { stem: 'prefix6' }).join(' ') === 'narrow narrow', st.join(' '));
  check('prefix6 merges Polish forms', st.filter((t) => t === 'pozycj').length === 2);
  check('identifiers never truncated', has(st, '5978579') && has(st, 'flat_narrow'));

  // 3. BM25: rare exact token wins; metadata date token makes a dateless report section findable by date.
  const mk = (id: string, text: string, date?: string): Chunk => ({
    id, file: 'x', lineStart: 1, lineEnd: 1, kind: 'report-section', title: 't', text, ...(date ? { date } : {}),
  });
  const chunks = [
    mk('a', 'POZYCJE REALNE #5886957 SZEROKI w zakresie', '2026-09-14'),
    mk('b', 'POZYCJE REALNE #5978579 SZEROKI w zakresie', '2026-09-15'),
    mk('c', 'POZYCJE REALNE #5886957 SZEROKI w zakresie', '2026-09-16'),
    mk('d', 'raport poranny pipeline backtest'),
  ];
  const bm = new Bm25Index(chunks, { stem: 'none' });
  check('identifier query', bm.searchOne('Is position #5978579 wide?', 3)[0]?.id === 'b');
  check('date from metadata', bm.searchOne('positions on 16 September', 3)[0]?.id === 'c');
  check('no metadata date when disabled', new Bm25Index(chunks, { stem: 'none', dateMetadata: false }).searchOne('16 September', 3).length === 0);
  check('only scored chunks returned', bm.searchOne('5978579', 10).length === 1);

  // 4. RRF: a chunk ranked well by both lists beats one ranked first by only one.
  const fused = rrf([
    [{ id: 'x', score: 1 }, { id: 'y', score: 0.9 }],
    [{ id: 'y', score: 9 }, { id: 'z', score: 8 }],
  ]);
  check('rrf favours agreement', fused[0].id === 'y', JSON.stringify(fused));
  check('rrf score', Math.abs(fused[0].score - (1 / 62 + 1 / 61)) < 1e-12);

  console.log(`${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
