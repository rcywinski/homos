/**
 * Tests for chunk size control and the CONTEXT.md loader.
 * Run: npx tsx ai/corpus/split.test.ts
 */
import { readFileSync } from 'fs';
import { boundaries, splitText, toChunks } from './split';
import { loadContext } from './loaders';
import { isoDate, tableCells } from './markdown';
import { estimateTokens, MAX_CHUNK_TOKENS } from './tokens';
import type { Unit } from './types';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) passed++;
  else {
    failed++;
    console.error(`FAIL: ${name}${detail ? ': ' + detail : ''}`);
  }
}
const squash = (s: string) => s.replace(/\s+/g, '');

// 1. Boundaries: after sentence ends and at list/table line starts, never inside a word.
{
  const t = 'Pierwsze zdanie. Drugie zdanie!\n- punkt listy\n| a | b |\nKoniec';
  const b = boundaries(t);
  check('boundary after sentence', b.includes(t.indexOf('Drugie')));
  check('boundary at list item', b.includes(t.indexOf('- punkt')));
  check('boundary at table row', b.includes(t.indexOf('| a')));
  check('no boundary inside a word', b.every((x) => /\s/.test(t[x - 1])));
}

// 2. splitText: parts within the cap, nothing lost, cuts at sentence ends when possible.
{
  const sentence = 'To jest zdanie testowe o zakresie cbBTC. ';
  const t = sentence.repeat(200);
  const parts = splitText(t, 1000);
  check('all parts within cap', parts.every(([s, e]) => e - s <= 1000));
  check('parts cover the text', squash(parts.map(([s, e]) => t.slice(s, e)).join('')) === squash(t));
  check('cuts at sentence ends', parts.slice(0, -1).every(([, e]) => t.slice(0, e).trimEnd().endsWith('.')));
}

// 3. A run with no boundary at all is hard-split at whitespace.
{
  const t = 'słowo '.repeat(1000);
  const parts = splitText(t, 500);
  check('hard split within cap', parts.every(([s, e]) => e - s <= 500));
  check('hard split keeps words whole', parts.every(([s]) => s === 0 || t[s - 1] === ' '));
}

// 4. toChunks: small unit stays whole; large unit gets titled parts with correct line numbers.
{
  const small: Unit = {
    file: 'x.md', lineStart: 10, lineEnd: 11, kind: 'journal-entry', title: 'T',
    text: '### T\nkrótko', bodyStart: 6, raw: true, date: '2026-08-10',
  };
  const one = toChunks(small);
  check('small unit is one chunk', one.length === 1 && one[0].id === 'x.md:10' && !one[0].part);

  const body = Array.from({ length: 300 }, (_, i) => `Linia ${i} ma jedno zdanie o pozycji #953465.`).join('\n');
  const big: Unit = {
    file: 'x.md', lineStart: 100, lineEnd: 400, kind: 'journal-entry', title: '2026-08-29 test',
    text: '### 2026-08-29 test\n' + body, bodyStart: '### 2026-08-29 test\n'.length, raw: true, date: '2026-08-29',
  };
  const parts = toChunks(big, 500);
  check('large unit is split', parts.length > 1);
  check('every part starts with the title', parts.every((c) => c.text.startsWith('2026-08-29 test\n\n')));
  check('every part within cap', parts.every((c) => estimateTokens(c.text) <= 500));
  check('parts inherit metadata', parts.every((c) => c.date === '2026-08-29' && c.kind === 'journal-entry'));
  check('part ids', parts.every((c, i) => c.id === `x.md:100#p${i + 1}` && c.part?.of === parts.length));
  check('first part starts on the first body line', parts[0].lineStart === 101);
  check('last part ends on the last line', parts[parts.length - 1].lineEnd === 400);
  check('line ranges are monotonic', parts.every((c, i) => i === 0 || c.lineStart >= parts[i - 1].lineEnd));
  const firstLine = parts[1].text.split('\n')[2];
  check('part line number points at its first line', body.split('\n')[parts[1].lineStart - 101] === firstLine);
}

// 5. Table helpers and dates.
{
  check('separator row ignored', tableCells('|---|---|') === null);
  check('row cells', JSON.stringify(tableCells('| 2026-08-10 | A | B |')) === '["2026-08-10","A","B"]');
  check('iso date kept', isoDate('### 2026-08-29 ~rano') === '2026-08-29');
  check('English date', isoDate('10 Aug') === '2026-08-10' && isoDate('3 Sep') === '2026-09-03');
}

// 6. The real journal: rules agreed with the owner.
{
  const content = readFileSync('journal/CONTEXT.md', 'utf8');
  const units = loadContext('journal/CONTEXT.md', content);
  const entries = units.filter((u) => u.kind === 'journal-entry');
  const decisions = units.filter((u) => u.kind === 'decision');
  check('105 journal entries', entries.length === 105, String(entries.length));
  check('22 decision rows', decisions.length === 22, String(decisions.length));
  check('decision prefix', decisions.every((u) => /^Decyzja z 2026-\d\d-\d\d: /.test(u.text)));
  const e829 = entries.find((u) => u.title.startsWith('2026-08-29 ~rano'));
  check('2026-08-29 entry found', !!e829);
  if (e829) {
    const parts = toChunks(e829);
    check('2026-08-29 entry is split', parts.length >= 8, String(parts.length));
    check('2026-08-29 parts within cap', parts.every((c) => estimateTokens(c.text) <= MAX_CHUNK_TOKENS));
    check('2026-08-29 parts titled', parts.every((c) => c.text.startsWith(e829.title)));
    const sizes = parts.map((c) => estimateTokens(c.text));
    check('2026-08-29 parts balanced', Math.min(...sizes) > MAX_CHUNK_TOKENS / 2, sizes.join(','));
    const covered = squash(parts.map((c) => c.text.slice(e829.title.length)).join(''));
    check('2026-08-29 nothing lost', covered === squash(e829.text.slice(e829.bodyStart)));
  }
  const tiny = entries.reduce((a, b) => (a.text.length < b.text.length ? a : b));
  check('tiny entry kept whole', toChunks(tiny).length === 1);
}

console.log(`${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
