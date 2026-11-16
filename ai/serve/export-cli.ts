/**
 * Writes the showcase data (step 4.1) to `showcase/public/data/` and prints one line per configuration.
 * Run: npm run showcase:data
 */
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { buildComparison, buildReports, OUT_DIR } from './export';
import { auditWallet, buildWallet, RAW_DIR, WALLET_FILE } from './wallet-export';

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
// The wallet export needs the raw files from step 4.1b, which exist only on the owner's Mac (gitignored).
if (existsSync(RAW_DIR)) {
  const wallet = buildWallet();
  const problems = auditWallet(JSON.stringify(wallet), process.env.SHOWCASE_WALLET_ADDRESS ?? '');
  if (problems.length > 0) throw new Error(`wallet export refused: ${problems.join('; ')}`);
  mkdirSync(path.dirname(WALLET_FILE), { recursive: true });
  const body = JSON.stringify(wallet);
  writeFileSync(WALLET_FILE, body);
  console.log(`wrote ${WALLET_FILE} (${(Buffer.byteLength(body) / 1024).toFixed(0)} KB, gitignored, not part of the page build): ${wallet.totals.positions} positions, ${wallet.totals.transactions} transactions, ${wallet.totals.paperPools} paper pools`);
} else console.log(`no ${RAW_DIR}: ${WALLET_FILE} not written; the Wallet tab stays hidden unless the server is given a wallet file`);
console.log(`golden v${comparison.goldenVersion}, ${comparison.questions.length} questions, ${reports.reports.length} reports`);
console.log('group served config          runs        correct / partially / incorrect, quotes not verified');
for (const c of comparison.configs) {
  const runs = c.runs
    .map((r) => `${r.run} ${r.summary.correct}/${r.summary.partiallyCorrect}/${r.summary.incorrect}, ${r.summary.quotesNotVerified}/${r.summary.quotes}`)
    .join('; ');
  console.log(`${c.group.padEnd(5)} ${(c.served ? 'yes' : '').padEnd(6)} ${c.id.padEnd(16)} ${(c.single ? 'single run' : `${c.runs.length} runs`).padEnd(11)} ${runs}`);
}
