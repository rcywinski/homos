/**
 * Tests for the showcase data export (phase 4, step 4.1). Offline: reads committed result files, no models.
 * Run: npx tsx ai/serve/export.test.ts
 */
import { COMPARISON } from './comparison';
import { buildComparison, buildReports } from './export';
import { hasPrivateAddress } from './mask';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) passed++;
  else {
    failed++;
    console.error(`FAIL: ${name}${detail ? ': ' + detail : ''}`);
  }
}

const data = buildComparison();

// Manifest rules (owner decisions of 16 Nov 2026).
const served = data.configs.filter((c) => c.served);
check('exactly one served configuration', served.length === 1, served.map((c) => c.id).join(', '));
check('the served configuration is a main column', served[0]?.group === 'main');
check('the served configuration is local', served[0]?.engine === 'local');
const main = data.configs.filter((c) => c.group === 'main');
check('two main columns', main.length === 2, main.map((c) => c.id).join(', '));
check('Sonnet k=10 is a main column', main.some((c) => c.id === 'sonnet-k10'));
check('config ids are unique', new Set(data.configs.map((c) => c.id)).size === data.configs.length);
const runNames = data.configs.flatMap((c) => c.runs.map((r) => r.run));
check('run names are unique', new Set(runNames).size === runNames.length);
for (const c of data.configs) check(`${c.id}: single flag matches run count`, c.single === (c.runs.length === 1));
check('Sonnet k=10 is labelled single', data.configs.find((c) => c.id === 'sonnet-k10')?.single === true);
check('served configuration has two runs', served[0]?.runs.length === 2);

// Every run answers every golden question, and every answered question was judged.
check('34 golden questions', data.questions.length === 34, String(data.questions.length));
for (const c of data.configs) {
  for (const r of c.runs) {
    const ids = Object.keys(r.answers);
    check(`${r.run}: an answer for every question`, ids.length === data.questions.length);
    const unjudged = ids.filter((id) => r.answers[id].verdict === null);
    check(`${r.run}: every question judged`, unjudged.length === 0, unjudged.join(', '));
    const s = r.summary;
    check(`${r.run}: verdict counts add up to 34`, s.correct + s.partiallyCorrect + s.incorrect === 34, JSON.stringify(s));
  }
}

// Verification status is carried over, never upgraded: "verified" only where the verifier said ok.
let notVerified = 0;
let verified = 0;
for (const c of data.configs) {
  for (const r of c.runs) {
    for (const a of Object.values(r.answers)) {
      for (const q of a.citations) {
        if (q.status === 'verified') {
          verified++;
          if (q.reason !== undefined) check(`${r.run}: verified quote has no failure reason`, false, q.chunkId);
        } else {
          notVerified++;
          if (q.reason !== 'not-in-chunk' && q.reason !== 'unknown-chunk') check(`${r.run}: not-verified quote has a reason`, false, q.chunkId);
        }
      }
      if (a.outcome === 'failed') check(`${r.run}: failed answer has no text or quotes`, a.answer === '' && a.citations.length === 0);
    }
  }
}
check('some quotes are verified', verified > 0);
check('not-verified quotes are kept, not dropped', notVerified > 0, String(notVerified));

// Known figure from the decision log (step 1.11): Sonnet k=10 judged 20 / 12 / 2.
const k10 = data.configs.find((c) => c.id === 'sonnet-k10')?.runs[0].summary;
check('Sonnet k=10 matches the recorded 20 / 12 / 2', k10?.correct === 20 && k10.partiallyCorrect === 12 && k10.incorrect === 2, JSON.stringify(k10));

// Nothing a visitor sees holds a private address.
check('comparison output has no private address', !hasPrivateAddress(JSON.stringify(data)));
const reports = buildReports();
check('37 morning reports', reports.reports.length === 37, String(reports.reports.length));
check('reports sorted by date', reports.reports.every((r, i, a) => i === 0 || a[i - 1].date < r.date));
check('reports output has no private address', !hasPrivateAddress(JSON.stringify(reports)));

// Provenance: every manifest file is listed with a hash.
const listed = new Set(data.sources.map((s) => s.file));
for (const c of COMPARISON) for (const r of c.runs) check(`source listed: ${r.answersFile}`, listed.has(r.answersFile) && listed.has(r.judgedFile));

console.log(`export: ${passed} passed, ${failed} failed (${verified} verified quotes, ${notVerified} not verified)`);
if (failed > 0) process.exit(1);
