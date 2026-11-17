/**
 * Step 4.8n: number marks before and after the rule changes, on real answers and on seeded errors. Offline.
 *
 *   node --import tsx ai/serve/tools/number-rules.mts [--list]
 *
 * Real answers: the step 3.2 runs pb1 and pb2 (the served configuration, 68 answers). They keep the full citations
 * and the 10 searched chunk ids; the 4.8 batch file kept neither, so its marks cannot be recomputed (see the review).
 * Seeded errors: numbers in those answers that are backed now (verified or in the cited source), changed to a value
 * that no searched chunk contains (a wrong amount, date, percentage or count). A seed is caught when its mark is
 * "not-verified". A rule set that lowers false marks but catches fewer seeds is not acceptable (owner, 17 Nov 2026).
 */
import { readFileSync } from 'fs';
import type { AnswerRecord } from '../../answer/measures';
import { loadCorpus } from '../../corpus/load';
import { maskNetwork } from '../mask';
import { markNumbers, type MarkOptions, type NumberMark } from '../numbers';
import { markNumbers as markBefore } from './numbers-before-4.8n';

const FILES = ['ai/eval/results/2026-11-16-answers-k10-local-pb1-golden-v1-4.json', 'ai/eval/results/2026-11-16-answers-k10-local-pb2-golden-v1-4.json'];
const corpus = new Map(loadCorpus().map((c) => [c.id, c]));
const list = process.argv.includes('--list');

interface Case {
  id: string;
  answer: string;
  quotes: string[];
  cited: string[];
  searched: string[];
}

const cases: Case[] = [];
for (const file of FILES) {
  const run = file.includes('pb1') ? 'pb1' : 'pb2';
  const a = JSON.parse(readFileSync(file, 'utf8')) as { perQuestion: AnswerRecord[] };
  for (const q of a.perQuestion) {
    if (q.coverage === 'error' || q.coverage === 'none') continue;
    const ok = q.citations.filter((c) => c.status === 'ok');
    cases.push({
      id: `${run}:${q.id}`,
      answer: maskNetwork(q.answer),
      quotes: ok.map((c) => c.quote),
      cited: [...new Set(ok.map((c) => c.chunkId))].map((id) => corpus.get(id)?.text ?? ''),
      searched: (q.chunkIds ?? []).map((id) => corpus.get(id)?.text ?? ''),
    });
  }
}

type RuleSet = { name: string; mark: (c: Case, answer: string) => NumberMark[] };
const withOpts = (o: MarkOptions) => (c: Case, answer: string) => markNumbers(answer, c.quotes, c.cited, { searchedChunks: c.searched, ...o });
const RULES: RuleSet[] = [
  { name: 'before (4.5 rule)', mark: (c, answer) => markBefore(answer, c.quotes, c.cited) as NumberMark[] },
  { name: 'mechanical fixes', mark: withOpts({}) },
  { name: '+ single digit with unit', mark: withOpts({ singleDigitWithUnit: true }) },
  { name: '+ rounding to 1 sig. digit with unit', mark: withOpts({ roundOneSignificant: true }) },
  { name: '+ uncited-source reason', mark: withOpts({ uncitedReason: true }) },
  { name: '+ identifier parts unmarked', mark: withOpts({ identifierParts: true }) },
  { name: 'all four proposals', mark: withOpts({ singleDigitWithUnit: true, roundOneSignificant: true, uncitedReason: true, identifierParts: true }) },
];

// --- Seeds ---------------------------------------------------------------------------------------------------
type Kind = 'amount' | 'date' | 'percentage' | 'count';
interface Seed {
  caseId: string;
  kind: Kind;
  from: string;
  to: string;
  start: number;
  answer: string;
}

const numbersIn = (t: string) => new Set([...t.matchAll(/\d+(?:[.,]\d+)*/g)].map((m) => m[0].replace(/,(?=\d{3}\b)/g, '')));
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function kindOf(answer: string, m: NumberMark): Kind | null {
  const after = answer.slice(m.end, m.end + 14);
  const before = answer.slice(Math.max(0, m.start - 2), m.start);
  if (/^\s?%/.test(after)) return 'percentage';
  if (/\$\s?[+-]?$/.test(before) || /^\s?(USD|USDC|k\b)/.test(after) || /^\d{1,3}(,\d{3})+/.test(m.text)) return 'amount';
  if (m.transformation === 'date-written-out' || /^\d{4}-\d{2}-\d{2}/.test(m.text) || /^\d{1,2}\.\d{2}$/.test(m.text) || new RegExp(`^\\s(${MONTHS.join('|')}|Aug|Sep)`).test(after)) return 'date';
  if (/^\d{1,3}$/.test(m.text) && !/[-\p{L}]$/u.test(answer.slice(Math.max(0, m.start - 1), m.start)) && /^\s(positions?|rebalances?|days?|pools?|configurations?|times|transactions?|windows|tests|hours|weeks|runs|tasks|legs|stages|rounds|questions|of\s\d)/.test(after)) return 'count';
  return null;
}

function mutate(kind: Kind, text: string): string | null {
  if (kind === 'percentage') {
    const d = text.includes('.') ? text.split('.')[1].length : 0;
    return (Math.abs(Number(text.replace(/[^\d.]/g, ''))) + 1.7 + (d === 0 ? 0.3 : 0)).toFixed(d);
  }
  if (kind === 'amount') {
    const raw = text.replace(/,/g, '');
    const d = raw.includes('.') ? raw.split('.')[1].length : 0;
    const v = (Number(raw.replace(/^[+-]/, '')) * 1.37).toFixed(d);
    return text.includes(',') ? Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : v;
  }
  if (kind === 'date') {
    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})(.*)$/);
    if (iso) return `${iso[1]}-${iso[2]}-${String(((Number(iso[3]) + 8) % 27) + 1).padStart(2, '0')}${iso[4]}`;
    if (/^\d{1,2}$/.test(text)) return String(((Number(text) + 8) % 27) + 1);
    const dm = text.match(/^(\d{1,2})\.(\d{2})$/);
    if (dm) return `${String(((Number(dm[1]) + 8) % 27) + 1).padStart(2, '0')}.${dm[2]}`;
    return null;
  }
  return String(Number(text) + 3);
}

const seeds: Seed[] = [];
const perKind: Record<Kind, number> = { amount: 0, date: 0, percentage: 0, count: 0 };
for (const c of cases) {
  const backed = RULES[1].mark(c, c.answer).filter((m) => m.status !== 'not-verified');
  const seenKinds = new Set<Kind>();
  for (const m of backed) {
    const kind = kindOf(c.answer, m);
    if (!kind || seenKinds.has(kind) || perKind[kind] >= 8) continue;
    const to = mutate(kind, m.text.replace(/^[+-]/, ''));
    if (!to || to === m.text) continue;
    // "Truly unsupported" is checked per kind against all 10 searched chunks: the same amount or percentage value; the
    // same day in August or September in any notation; the same count with the same noun.
    const all = [...c.quotes, ...c.cited, ...c.searched].join('\n');
    if (kind === 'amount' || kind === 'percentage') {
      if (numbersIn(all).has(to.replace(/,/g, ''))) continue;
    } else if (kind === 'date') {
      const day = Number(to.match(/^\d{4}-\d{2}-(\d{2})/)?.[1] ?? to.match(/^(\d{1,2})/)?.[1]);
      const re = new RegExp(`(?<![\\d.])0?${day}\\.0?(8|9)(?![\\d])|(?<![\\d])2026-0(8|9)-${String(day).padStart(2, '0')}|(?<![\\d])${day}\\s+(Aug|Sep|sierp|wrze)`, 'i');
      if (re.test(all)) continue;
    } else {
      const noun = c.answer.slice(m.end).match(/^\s(\p{L}+)/u)?.[1] ?? '';
      if (new RegExp(`(?<![\\d.,])${to}\\s+${noun}`, 'i').test(all)) continue;
    }
    const sign = m.text.match(/^[+-]/)?.[0] ?? '';
    const answer = c.answer.slice(0, m.start) + sign + to + c.answer.slice(m.end);
    seeds.push({ caseId: c.id, kind, from: m.text, to: sign + to, start: m.start, answer });
    perKind[kind]++;
    seenKinds.add(kind);
  }
}

// Targeted seeds for proposal 1: a wrong single digit or 0.x value WITH its unit, the case that proposal relaxes.
const TARGETED: { caseId: string; from: string; to: string; kind: Kind }[] = [
  { caseId: 'pb1:id-01', from: '±5%', to: '±7%', kind: 'percentage' },
  { caseId: 'pb1:dated-06', from: '8GB', to: '6GB', kind: 'count' },
  { caseId: 'pb2:dated-10', from: '≤7 days', to: '≤4 days', kind: 'count' },
  { caseId: 'pb2:dated-08', from: '+0.6%', to: '+0.9%', kind: 'percentage' },
];
for (const t of TARGETED) {
  const c = cases.find((x) => x.id === t.caseId);
  const at = c?.answer.indexOf(t.from) ?? -1;
  if (!c || at < 0) {
    console.log(`targeted seed not applicable: ${t.caseId} "${t.from}"`);
    continue;
  }
  const all = [...c.quotes, ...c.cited, ...c.searched].join('\n');
  const digit = t.to.match(/\d+(?:\.\d+)?/)![0];
  const unit = t.to.replace(/^[^\d]*\d+(?:\.\d+)?/, '').trim().slice(0, 2);
  if (new RegExp(`(?<![\\d.])${digit.replace('.', '\\.')}\\s?${unit.replace(/[%$]/g, (x) => '\\' + x)}`, 'i').test(all)) {
    console.log(`targeted seed skipped, the source has it: ${t.caseId} "${t.to}"`);
    continue;
  }
  const numAt = at + t.from.search(/\d/);
  seeds.push({ caseId: c.id, kind: t.kind, from: t.from, to: t.to, start: numAt, answer: c.answer.slice(0, at) + t.to + c.answer.slice(at + t.from.length) });
}

// --- Report ----------------------------------------------------------------------------------------------------
const byId = new Map(cases.map((c) => [c.id, c]));
console.log(`real answers: ${cases.length} (pb1 and pb2, served configuration); seeds: ${seeds.length} (${Object.entries(perKind).map(([k, n]) => `${k} ${n}`).join(', ')}, plus ${seeds.length - Object.values(perKind).reduce((a, b) => a + b, 0)} targeted at proposal 1)\n`);
console.log('rule set                               numbers  verified  in-source  not-verified (of which uncited)  seeds caught');
for (const r of RULES) {
  let total = 0;
  const st = { verified: 0, 'in-source': 0, 'not-verified': 0 };
  let uncited = 0;
  for (const c of cases) {
    for (const m of r.mark(c, c.answer)) {
      total++;
      st[m.status]++;
      if (m.reason === 'uncited-source') uncited++;
    }
  }
  const missed: string[] = [];
  let caught = 0;
  for (const s of seeds) {
    const mark = r.mark(byId.get(s.caseId)!, s.answer).find((m) => s.start >= m.start && s.start < m.end);
    if (mark?.status === 'not-verified') caught++;
    else missed.push(`${s.caseId} ${s.kind} ${s.from}->${s.to} (${mark?.status ?? 'no mark'})`);
  }
  console.log(`${r.name.padEnd(38)} ${String(total).padStart(7)} ${String(st.verified).padStart(9)} ${String(st['in-source']).padStart(10)} ${String(st['not-verified']).padStart(13)} (${uncited})${' '.repeat(16)}${caught}/${seeds.length}`);
  if (missed.length) console.log(`   missed: ${missed.join('; ')}`);
}

if (list) {
  console.log('\nseeds:');
  for (const s of seeds) console.log(`  ${s.caseId.padEnd(14)} ${s.kind.padEnd(10)} ${s.from} -> ${s.to}   …${s.answer.slice(Math.max(0, s.start - 40), s.start + 30).replace(/\s+/g, ' ')}…`);
  for (const name of ['before (4.5 rule)', 'mechanical fixes', 'all four proposals']) {
    const r = RULES.find((x) => x.name === name)!;
    console.log(`\nnot-verified marks under "${name}":`);
    for (const c of cases) for (const m of r.mark(c, c.answer)) if (m.status === 'not-verified') console.log(`  ${c.id.padEnd(14)} [${m.text}]${m.reason ? ' (' + m.reason + ')' : ''}  …${c.answer.slice(Math.max(0, m.start - 35), m.end + 20).replace(/\s+/g, ' ')}…`);
  }
}
