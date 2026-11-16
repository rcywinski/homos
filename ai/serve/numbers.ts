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

export interface NumberMark {
  text: string;
  start: number;
  end: number;
  status: NumberStatus;
  /** For "in-source": found as is in a cited chunk, or obtained by a transformation. */
  transformation?: Transformation;
  /** The source value a transformation started from, for the review list (e.g. "27.08", "-51.53"). */
  from?: string;
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

export function markNumbers(answer: string, verifiedQuotes: string[], citedChunks: string[] = []): NumberMark[] {
  const quoteText = plainMinus(verifiedQuotes.join('\n'));
  const chunkText = plainMinus(citedChunks.join('\n'));
  const inQuotes = new Set(tokens(quoteText).map(canon));
  const inChunks = new Set(tokens(chunkText).map(canon));
  const sourceValues = [...new Set([...tokens(quoteText), ...tokens(chunkText)].map(canon))];
  const source = `${quoteText}\n${chunkText}`;
  const plain = plainMinus(answer);

  // Dates written out in the answer whose day.month the sources write as a number: day and year positions.
  const byDate = new Map<number, { transformation: Transformation; from: string }>();
  for (const re of [DAY_FIRST, MONTH_FIRST]) {
    for (const m of plain.matchAll(re)) {
      const dayFirst = re === DAY_FIRST;
      const dayStr = dayFirst ? m[1] : m[2];
      const month = monthOf(dayFirst ? m[2] : m[1]);
      const year = m[3];
      const from = sourceHasDate(source, Number(dayStr), month);
      if (!from) continue;
      const base = m.index ?? 0;
      const dayAt = base + m[0].indexOf(dayStr, dayFirst ? 0 : (m[1] ?? '').length);
      byDate.set(dayAt, { transformation: 'date-written-out', from });
      if (year && Number(year) === PROJECT_YEAR) byDate.set(base + m[0].lastIndexOf(year), { transformation: 'year-added', from });
    }
  }

  const marks: NumberMark[] = [];
  for (const m of plain.matchAll(NUMBER)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    const text = answer.slice(start, end);
    const c = canon(m[0]);
    if (/^\s?[x×](?![\p{L}\d])/u.test(plain.slice(end, end + 2))) {
      const exact = new RegExp(`(?<![\\d.,])${c.replace('.', '\\.')}\\s?[x×](?![\\p{L}\\d])`, 'u').test(quoteText);
      marks.push({ text, start, end, status: exact ? 'verified' : 'not-verified' });
      continue;
    }
    if (inQuotes.has(c)) {
      marks.push({ text, start, end, status: 'verified' });
      continue;
    }
    const date = byDate.get(start);
    if (date) {
      marks.push({ text, start, end, status: 'in-source', ...date });
      continue;
    }
    if (inChunks.has(c) && significant(c) >= 2) {
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
    marks.push({ text, start, end, status: 'not-verified' });
  }
  return marks;
}

/** The previous two-state rule (step 4.3), kept for the before/after count. */
export function markNumbersStrict(answer: string, verifiedQuotes: string[]): NumberMark[] {
  return markNumbers(answer, verifiedQuotes, []).map((m) => (m.status === 'verified' ? m : { text: m.text, start: m.start, end: m.end, status: 'not-verified' as const }));
}
