/**
 * npm run ai:restore-results
 * Restores the saved backtest result files (backtest/results/*.json, gitignored) from tag journal-final, where they
 * were last committed before the repository became a public case study. Nothing is committed: the files stay local and
 * the agent's read_backtest_results tool reads them there. Existing files with the same names are overwritten with the
 * tagged content; other files in the directory (such as report.html) are left alone.
 */
import { execFileSync } from 'child_process';
import { readdirSync } from 'fs';
import path from 'path';
import { RESULTS_DIR } from './tools';

const TAG = 'journal-final';

function main() {
  const root = process.cwd();
  const tar = execFileSync('git', ['archive', '--format=tar', TAG, RESULTS_DIR], { cwd: root, maxBuffer: 64 * 1024 * 1024 });
  execFileSync('tar', ['-x', '-f', '-', '-C', root], { input: tar });
  const n = readdirSync(path.join(root, RESULTS_DIR)).filter((f) => f.endsWith('.json')).length;
  console.log(`Restored ${RESULTS_DIR}/ from tag ${TAG}: ${n} JSON files (gitignored, not committed).`);
}

main();
