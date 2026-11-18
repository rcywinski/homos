/**
 * Tests for the display repair of mis-decoded report lines (owner's request of 18 Nov 2026). Offline.
 * Run: npx tsx ai/serve/encoding.test.ts
 */
import { readFileSync } from 'fs';
import { redecodeLine } from './encoding';
import { buildReports } from './export';
import { maskNetwork } from './mask';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) passed++;
  else {
    failed++;
    console.error(`FAIL: ${name}${detail ? ': ' + detail : ''}`);
  }
}

check('a mis-decoded line is repaired', redecodeLine('nie zbiegĹ‚? pomijam dziĹ›') === 'nie zbiegł? pomijam dziś');
check('a mis-decoded dash is repaired', redecodeLine('zimny start â€” streaki') === 'zimny start — streaki');
check('correct Polish is left alone', redecodeLine('mają, stęchłych, Świeżość danych') === null);
check('ASCII is left alone', redecodeLine('selector: ok 2026-08-18') === null);
check('a character outside Windows-1250 leaves the line alone', redecodeLine('ok ✓ â€”') === null);

const data = buildReports();
const day = data.reports.find((r) => r.date === '2026-08-18')!;
check('18 Aug: repaired, with the note', !!day.note && day.text.includes('mają') && !/Ä…|Ĺ‚|â€/.test(day.text), day.text.slice(0, 200));
check('18 Aug: the source file still has the original bytes', /Ä…|Ĺ‚|â€/.test(readFileSync('journal/reports/morning-2026-08-18.md', 'utf8')));
for (const r of data.reports.filter((x) => x.date !== '2026-08-18')) {
  const source = maskNetwork(readFileSync(r.file, 'utf8').replace(/\r\n/g, '\n'));
  check(`${r.date}: byte for byte as before, no note`, r.text === source && r.note === undefined);
}
console.log(`encoding: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
