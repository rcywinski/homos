/**
 * Writes the showcase data (step 4.1) to `showcase/public/data/` and prints one line per configuration.
 * Run: npm run showcase:data
 */
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { buildComparison, buildReports, OUT_DIR } from './export';

const comparison = buildComparison();
const reports = buildReports();
mkdirSync(OUT_DIR, { recursive: true });
const write = (name: string, data: unknown) => {
  const file = path.join(OUT_DIR, name);
  const body = JSON.stringify(data);
  writeFileSync(file, body);
  return `${file} (${(Buffer.byteLength(body) / 1024).toFixed(0)} KB)`;
};
console.log(`wrote ${write('comparison.json', comparison)}`);
console.log(`wrote ${write('reports.json', reports)}`);
console.log(`golden v${comparison.goldenVersion}, ${comparison.questions.length} questions, ${reports.reports.length} reports`);
console.log('group served config          runs        correct / partially / incorrect, quotes not verified');
for (const c of comparison.configs) {
  const runs = c.runs
    .map((r) => `${r.run} ${r.summary.correct}/${r.summary.partiallyCorrect}/${r.summary.incorrect}, ${r.summary.quotesNotVerified}/${r.summary.quotes}`)
    .join('; ');
  console.log(`${c.group.padEnd(5)} ${(c.served ? 'yes' : '').padEnd(6)} ${c.id.padEnd(16)} ${(c.single ? 'single run' : `${c.runs.length} runs`).padEnd(11)} ${runs}`);
}
