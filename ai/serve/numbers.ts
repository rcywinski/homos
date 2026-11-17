/**
 * Number check for chat answers (phase 4; three states approved by the owner on 16 Nov 2026).
 *
 * Every number in the answer text gets one of three states:
 *   - "verified": the same number, as a whole number, is in one of the answer's verified quotes;
 *   - "in-source": not in a quote, but in the text of a chunk the answer cites with a verified quote, or obtained from
 *     a number in those quotes or chunks by one of three transformations checked by code:
 *       date-written-out  "27 August" or "August 27" for a source date written 27.08 (the day number),
 *       year-added        2026 next to such a date, or 27.08.2026 for a source 27.08 (the project ran in 2026),
 *       rounded           the source value rounded to the decimals the answer prints (at least two significant
 *                         digits, so a single digit is never matched by chance);
 *   - "not-verified": everything else, including sums, ratios and multipliers the model computed.
 * A transformation never makes a number "verified". Two guards against chance matches in long chunks: a number found
 * only in a cited chunk needs at least two significant digits (a lone "4" or "8" is in almost every chunk), and a
 * multiplier ("4x", "3×") is verified only when a quote has the same multiplier, and is never "in-source".
 *
 * Positions are character offsets in the answer string as sent to the visitor (after masking).
 */

/** Same as `plainMinus` in ai/agent/verify.ts; repeated because that module pulls in the Anthropic client. */
const plainMinus = (t: string) => t.replace(/−/g, '-');

export type NumberStatus = 'verified' | 'in-source' | 'not-verified';
export type Transformation = 'date-written-out' | 'year-added' | 'rounded';

/**
 * Proposals of step 4.8n, off until the owner decides (each measured on real answers and seeded errors first):
 *   singleDigitWithUnit  a number with fewer than two significant digits (5, 8, 0.6) found only in a cited chunk
 *                        counts as "in-source" when it appears there with the same unit or neighbouring word (±5%,
 *                        8GB and 8 GB, exit 0, +0.6%);
 *   roundOneSignificant  rounding to one significant digit is allowed when the number carries a unit (% or $) and a
 *                        source value with the same unit rounds to it (+0.6% from +0.62%);
 *   uncitedReason        a number found only in a searched chunk the answer did not cite stays "not-verified", with
 *                        the reason "found in a searched source the answer did not cite" (needs searchedChunks).
 */
export interface MarkOptions {
  searchedChunks?: string[];
  singleDigitWithUnit?: boolean;
  roundOneSignificant?: boolean;
  uncitedReason?: boolean;
  /** Proposal identifierParts: a number that is part of an identifier (`arbitrum-usdc-usdt-001`, `k2h24`) gets no mark. */
  identifierParts?: boolean;
}

export interface NumberMark {
  text: string;
  start: number;
  end: number;
  status: NumberStatus;
  /** For "in-source": found as is in a cited chunk, or obtained by a transformation. */
  transformation?: Transformation;
  /** The source value a transformation started from, for the review list (e.g. "27.08", "-51.53"). */
  from?: string;
  /** For "not-verified" (proposal uncitedReason): the number is in a searched source the answer did not cite. */
  reason?: 'uncited-source';
}

export const PROJECT_YEAR = 2026;

/** A number not glued to letters, digits or a decimal point on its left: 2169, 1.9, -32, 31.08, 0.30. */
const NUMBER = /(?<![\p{L}\d.,])[+-]?\d+(?:[.,]\d+)*/gu;

/** Canonical form for comparison: no sign, no thousands separators of the "1,234" kind. */
function canon(n: string): string {
  let s = plainMinus(n).replace(/^[+-]/, '');
  if (/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
  return s;
}

const tokens = (text: string) => [...plainMinus(text).matchAll(NUMBER)].map((m) => m[0]);

const MONTHS: [RegExp, number][] = [
  [/^jan/i, 1], [/^feb/i, 2], [/^mar/i, 3], [/^apr/i, 4], [/^may/i, 5], [/^jun/i, 6],
  [/^jul/i, 7], [/^aug/i, 8], [/^sep/i, 9], [/^oct/i, 10], [/^nov/i, 11], [/^dec/i, 12],
];
const MONTH = '(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\.?';
const ORD = '(?:st|nd|rd|th)?';
const DAY_FIRST = new RegExp(`(?<![\\p{L}\\d])(\\d{1,2})${ORD}\\s+${MONTH}(?:,?\\s+(\\d{4}))?(?![\\p{L}\\d])`, 'gu');
const MONTH_FIRST = new RegExp(`(?<![\\p{L}\\d])${MONTH}\\s+(\\d{1,2})${ORD}(?:,?\\s+(\\d{4}))?(?![\\p{L}\\d])`, 'gu');
const monthOf = (name: string) => MONTHS.find(([r]) => r.test(name))?.[1] ?? 0;

/** True when the source writes day.month as a number, e.g. 27.08, 3.09, 27.08.2026 (not 27.085). */
function sourceHasDate(source: string, day: number, month: number): string | null {
  const re = new RegExp(`(?<![\\d.,])0?${day}\\.0?${month}(?![\\d])(?:\\.(?:20)?\\d{2}(?!\\d))?`);
  const m = source.match(re);
  return m ? m[0] : null;
}

/** Significant digits of a canonical number: "0.30" -> 2, "08" -> 1, "2169" -> 4. */
const significant = (s: string) => s.replace(/[.,]/g, '').replace(/^0+/, '').length;

const decimals = (s: string) => (s.includes('.') ? s.split('.')[1].length : 0);

/** A source value that rounds to `x` at the decimals `x` prints, with more decimals in the source. */
function roundedFrom(x: string, sourceValues: string[]): string | null {
  const xs = x.replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/.test(xs)) return null;
  const d = decimals(xs);
  const xv = Number(xs);
  if (significant(xs) < 2) return null;
  for (const raw of sourceValues) {
    const ys = raw.replace(',', '.');
    if (!/^\d+(?:\.\d+)?$/.test(ys) || decimals(ys) <= d) continue;
    if (Number(Number(ys).toFixed(d)) === xv) return raw;
  }
  return null;
}

/** ISO dates (2026-08-29, optionally with a time) and clock times (04:53, 08:45:10.5Z) are one token each (4.8n). */
const ISO_DATE = /(?<![\d-])(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?Z?)?(?![\d])/g;
const CLOCK = /(?<![\d:.])(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?Z?(?![\d:])/g;
/** List numbering: "(1)" anywhere, "1." or "1)" at the start of a line. Never marked (4.8n). */
const LIST_NUMBER = /\((\d{1,2})\)|(?:^|\n)\s*(\d{1,2})[.)](?=\s)/g;
/** Pool fee tiers as written in pool ids (-005, -030) or Uniswap units (fee 500, 3000), with their percent forms. */
const FEE_ID = /-(001|005|030|100)(?![\d])/g;
const FEE_UNITS = /\bfee(?:Tier)?\W{0,3}(100|500|3000|10000)\b/gi;
const FEE_PERCENT: Record<string, string[]> = {
  '001': ['0.01'], '005': ['0.05'], '030': ['0.3', '0.30'], '100': ['1', '1.00'],
  '100u': ['0.01'], '500u': ['0.05'], '3000u': ['0.3', '0.30'], '10000u': ['1', '1.00'],
};

/** Fee-tier percent forms present in a text (from pool ids or fee units). */
function feeForms(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(FEE_ID)) for (const f of FEE_PERCENT[m[1]] ?? []) out.add(f);
  for (const m of text.matchAll(FEE_UNITS)) for (const f of FEE_PERCENT[`${m[1]}u`] ?? []) out.add(f);
  return out;
}

const pad = (n: string | number) => String(n).padStart(2, '0');

const PL_MONTHS = ['stycz', 'lut', 'mar', 'kwie', 'maj', 'czerw', 'lip', 'sierp', 'wrze', 'paźd', 'listop', 'grud'];
const PL_DATE = /(?<![\p{L}\d])(\d{1,2})\s+(stycz\p{L}*|lut\p{L}*|mar\p{L}*|kwie\p{L}*|maj\p{L}*|czerw\p{L}*|lip\p{L}*|sierp\p{L}*|wrze\p{L}*|paźd\p{L}*|listop\p{L}*|grud\p{L}*)/giu;

/** Every date in a text, normalised to "dd.mm": ISO, dd.mm[.yyyy], and written out in English or Polish. */
function datesIn(text: string): Set<string> {
  const out = new Set<string>();
  for (const re of [DAY_FIRST, MONTH_FIRST]) {
    for (const m of text.matchAll(re)) {
      const dayFirst = re === DAY_FIRST;
      const d = Number(dayFirst ? m[1] : m[2]);
      const mo = monthOf(dayFirst ? m[2] : m[1]);
      if (d >= 1 && d <= 31 && mo) out.add(`${pad(d)}.${pad(mo)}`);
    }
  }
  for (const m of text.matchAll(PL_DATE)) {
    const mo = PL_MONTHS.findIndex((p) => m[2].toLowerCase().startsWith(p)) + 1;
    if (mo) out.add(`${pad(Number(m[1]))}.${pad(mo)}`);
  }
  for (const m of text.matchAll(ISO_DATE)) out.add(`${pad(Number(m[3]))}.${pad(Number(m[2]))}`);
  for (const m of text.matchAll(/(?<![\d.,])(\d{1,2})\.(\d{1,2})(?![\d])(?:\.(?:20)?\d{2}(?!\d))?/g)) {
    const d = Number(m[1]);
    const mo = Number(m[2]);
    if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12) out.add(`${pad(d)}.${pad(mo)}`);
  }
  return out;
}

/** Every clock time in a text, normalised to "h:mm" (seconds and zone dropped). */
function clocksIn(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(CLOCK)) if (Number(m[1]) < 24 && Number(m[2]) < 60) out.add(`${Number(m[1])}:${m[2]}`);
  for (const m of text.matchAll(ISO_DATE)) if (m[4]) out.add(`${Number(m[4])}:${m[5]}`);
  return out;
}

const UNIT_SYNONYMS: Record<string, string> = { days: 'd', day: 'd', dni: 'd', dzień: 'd', dzien: 'd', hours: 'h', hour: 'h', godz: 'h', gb: 'gb', gib: 'gb', percent: '%' };
/** The unit or word right after a number, or right before it ("exit 0"), lower-cased and folded to one spelling. */
function neighbours(text: string, start: number, end: number): string[] {
  const after = text.slice(end, end + 12).match(/^\s?([%x×]|[\p{L}]+)/u)?.[1]?.toLowerCase();
  const before = text.slice(Math.max(0, start - 14), start).match(/([\p{L}]+)\s?$/u)?.[1]?.toLowerCase();
  return [after, before].filter((w): w is string => !!w).map((w) => UNIT_SYNONYMS[w] ?? w);
}

/** True when `value` appears in `source` with one of the same neighbours. */
function digitWithUnit(value: string, words: string[], source: string): boolean {
  if (words.length === 0) return false;
  for (const m of source.matchAll(new RegExp(`(?<![\\d.,])[+-]?${value.replace('.', '\\.')}(?![\\d]|[.,]\\d)`, 'g'))) {
    const at = (m.index ?? 0) + m[0].length - value.length;
    const there = neighbours(source, at, at + value.length);
    if (there.some((w) => words.includes(w))) return true;
  }
  return false;
}

/** The unit of a number: "%" or "$" right next to it, else null. */
function unitOf(text: string, start: number, end: number): '%' | '$' | null {
  if (/^\s?%/.test(text.slice(end, end + 2))) return '%';
  if (/\$\s?[+-]?$/.test(text.slice(Math.max(0, start - 3), start))) return '$';
  return null;
}

/** Proposal roundOneSignificant: a source number with the same unit that rounds to x at x's printed decimals. */
function roundedWithUnit(x: string, unit: '%' | '$', source: string): string | null {
  const xs = x.replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/.test(xs) || significant(xs) !== 1) return null;
  const d = decimals(xs);
  const re = unit === '%' ? /(?<![\d.])[+-]?(\d+(?:[.,]\d+)?)\s?%/g : /\$\s?[+-]?(\d+(?:[.,]\d+)?)/g;
  for (const m of source.matchAll(re)) {
    const ys = m[1].replace(',', '.');
    if (decimals(ys) <= d) continue;
    if (Number(Number(ys).toFixed(d)) === Number(xs)) return m[0].trim();
  }
  return null;
}

export function markNumbers(answer: string, verifiedQuotes: string[], citedChunks: string[] = [], opts: MarkOptions = {}): NumberMark[] {
  const quoteText = plainMinus(verifiedQuotes.join('\n'));
  const chunkText = plainMinus(citedChunks.join('\n'));
  const inQuotes = new Set(tokens(quoteText).map(canon));
  const inChunks = new Set(tokens(chunkText).map(canon));
  const sourceValues = [...new Set([...tokens(quoteText), ...tokens(chunkText)].map(canon))];
  const source = `${quoteText}\n${chunkText}`;
  const plain = plainMinus(answer);
  const searchedText = plainMinus((opts.searchedChunks ?? []).join('\n'));
  const inSearched = new Set(tokens(searchedText).map(canon));

  // 4.8n mechanical fixes: whole ISO dates and clock times first, then list numbers to skip, then fee tiers.
  const marks: NumberMark[] = [];
  const covered: [number, number][] = [];
  const cover = (a: number, b: number) => covered.push([a, b]);
  const isCovered = (a: number) => covered.some(([s0, e0]) => a >= s0 && a < e0);
  const placeDate = (start: number, end: number, key: string, kind: 'date' | 'clock') => {
    const text = answer.slice(start, end);
    const inQ = kind === 'date' ? datesIn(quoteText) : clocksIn(quoteText);
    const inC = kind === 'date' ? datesIn(chunkText) : clocksIn(chunkText);
    const exactInQuote = quoteText.includes(text.replace(/Z$/, ''));
    let mark: NumberMark;
    if (exactInQuote) mark = { text, start, end, status: 'verified' };
    else if (inQ.has(key) || inC.has(key)) mark = { text, start, end, status: 'in-source', transformation: 'date-written-out', from: key };
    else if (opts.uncitedReason && (kind === 'date' ? datesIn(searchedText) : clocksIn(searchedText)).has(key)) mark = { text, start, end, status: 'not-verified', reason: 'uncited-source' };
    else mark = { text, start, end, status: 'not-verified' };
    marks.push(mark);
    cover(start, end);
  };
  for (const m of plain.matchAll(ISO_DATE)) placeDate(m.index ?? 0, (m.index ?? 0) + m[0].length, `${pad(Number(m[3]))}.${pad(Number(m[2]))}`, 'date');
  for (const m of plain.matchAll(CLOCK)) {
    const at = m.index ?? 0;
    if (isCovered(at) || Number(m[1]) > 23 || Number(m[2]) > 59) continue;
    placeDate(at, at + m[0].length, `${Number(m[1])}:${m[2]}`, 'clock');
  }
  for (const m of plain.matchAll(LIST_NUMBER)) {
    const digits = m[1] ?? m[2];
    const at = (m.index ?? 0) + m[0].indexOf(digits, m[0].startsWith('(') ? 1 : 0);
    cover(at, at + digits.length);
  }
  const feeInQuotes = feeForms(quoteText);
  const feeInChunks = feeForms(chunkText);

  // Dates written out in the answer ("27 August 2026", "Aug 3"): the day is checked as a date, never as a bare number,
  // so "3 Aug" is not backed by some unrelated "3" in a quote (4.8n). The year is backed by a found date (year-added).
  const byDate = new Map<number, Omit<NumberMark, 'text' | 'start' | 'end'>>();
  {
    const quoteDates = datesIn(quoteText);
    const chunkDates = datesIn(chunkText);
    const searchedDates = datesIn(plainMinus((opts.searchedChunks ?? []).join('\n')));
    for (const re of [DAY_FIRST, MONTH_FIRST]) {
      for (const m of plain.matchAll(re)) {
        const dayFirst = re === DAY_FIRST;
        const dayStr = dayFirst ? m[1] : m[2];
        const month = monthOf(dayFirst ? m[2] : m[1]);
        const year = m[3];
        const key = `${pad(Number(dayStr))}.${pad(month)}`;
        const base = m.index ?? 0;
        const dayAt = base + m[0].indexOf(dayStr, dayFirst ? 0 : (m[1] ?? '').length);
        const written = m[0].replace(/,?\s+\d{4}$/, '');
        let state: Omit<NumberMark, 'text' | 'start' | 'end'>;
        if (quoteText.includes(written)) state = { status: 'verified' };
        else if (quoteDates.has(key) || chunkDates.has(key)) state = { status: 'in-source', transformation: 'date-written-out', from: sourceHasDate(source, Number(dayStr), month) ?? key };
        else state = { status: 'not-verified', ...(opts.uncitedReason && searchedDates.has(key) ? { reason: 'uncited-source' as const } : {}) };
        byDate.set(dayAt, state);
        if (year && Number(year) === PROJECT_YEAR && state.status !== 'not-verified') byDate.set(base + m[0].lastIndexOf(year), { status: 'in-source', transformation: 'year-added', from: key });
      }
    }
  }

  for (const m of plain.matchAll(NUMBER)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    if (isCovered(start)) continue;
    const text = answer.slice(start, end);
    const c = canon(m[0]);
    // A fee tier written as a decimal (0.05, 0.30) next to "%" or pool words, while the source writes the pool id
    // (-005, -030) or Uniswap fee units (500, 3000): the same value in another notation.
    const feeContext = /(%|pool|fee|tier|mainnet|base|arbitrum|usdc|weth|cbbtc)/i.test(plain.slice(Math.max(0, start - 30), end + 12));
    if (feeContext && (feeInQuotes.has(c) || feeInChunks.has(c)) && /^(0\.0?[1-5]0?|1(\.00)?)$/.test(c)) {
      marks.push({ text, start, end, status: feeInQuotes.has(c) ? 'verified' : 'in-source' });
      continue;
    }
    if (/^\s?[x×](?![\p{L}\d])/u.test(plain.slice(end, end + 2))) {
      const exact = new RegExp(`(?<![\\d.,])${c.replace('.', '\\.')}\\s?[x×](?![\\p{L}\\d])`, 'u').test(quoteText);
      marks.push({ text, start, end, status: exact ? 'verified' : 'not-verified' });
      continue;
    }
    const date = byDate.get(start);
    if (date && !(date.transformation === 'year-added' && inQuotes.has(c))) {
      marks.push({ text, start, end, ...date });
      continue;
    }
    if (inQuotes.has(c)) {
      marks.push({ text, start, end, status: 'verified' });
      continue;
    }
    if (inChunks.has(c) && significant(c) >= 2) {
      marks.push({ text, start, end, status: 'in-source' });
      continue;
    }
    if (opts.identifierParts && /[\p{L}][-_]$/u.test(plain.slice(Math.max(0, start - 2), start))) continue;
    if (opts.singleDigitWithUnit && significant(c) < 2 && digitWithUnit(c, neighbours(plain, start, end), chunkText + '\n' + quoteText)) {
      marks.push({ text, start, end, status: 'in-source' });
      continue;
    }
    const withYear = c.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (withYear && Number(withYear[3]) === PROJECT_YEAR) {
      const from = sourceHasDate(source, Number(withYear[1]), Number(withYear[2]));
      if (from) {
        marks.push({ text, start, end, status: 'in-source', transformation: 'year-added', from });
        continue;
      }
    }
    const rounded = roundedFrom(c, sourceValues);
    if (rounded) {
      marks.push({ text, start, end, status: 'in-source', transformation: 'rounded', from: rounded });
      continue;
    }
    if (opts.roundOneSignificant) {
      const unit = unitOf(plain, start, end);
      const from = unit ? roundedWithUnit(c, unit, source) : null;
      if (from) {
        marks.push({ text, start, end, status: 'in-source', transformation: 'rounded', from });
        continue;
      }
    }
    const uncited = opts.uncitedReason && inSearched.has(c) && significant(c) >= 2;
    marks.push({ text, start, end, status: 'not-verified', ...(uncited ? { reason: 'uncited-source' as const } : {}) });
  }
  return marks.sort((a, b) => a.start - b.start);
}

/** The previous two-state rule (step 4.3), kept for the before/after count. */
export function markNumbersStrict(answer: string, verifiedQuotes: string[]): NumberMark[] {
  return markNumbers(answer, verifiedQuotes, []).map((m) => (m.status === 'verified' ? m : { text: m.text, start: m.start, end: m.end, status: 'not-verified' as const }));
}
