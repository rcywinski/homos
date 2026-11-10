/**
 * Tokeniser for BM25, shared by chunks and queries (Polish journal, English docs and questions).
 *
 *  - lowercase and fold diacritics (zwężenie -> zwezenie, ł -> l): questions typed without Polish letters still match;
 *  - dates in any form (2026-09-15, 15.09, 15.09.2026, 15 Sep, 15 September, September 15, 15 września) become one
 *    canonical token d20260915 (year 2026 when missing: the project ran only in 2026);
 *  - identifiers stay whole and are never stemmed: #5978579 -> 5978579, FLAT_NARROW -> flat_narrow + flat + narrow;
 *  - a short Polish + English stopword list; "nie" is kept by default (in this journal it carries decisions);
 *  - optional stemming by truncation to 6 characters (English narrowing/narrowed -> narrow; Polish only partly:
 *    pozycja/pozycji/pozycje -> pozycj, but zwężenie/zwężania stay apart). Measured, not assumed.
 */

export type Stem = 'none' | 'prefix6';

export interface TokenizeOptions {
  stem: Stem;
  dropNie?: boolean;
  /** Step 1.7 date fix (measured as its own row): see dateFixPre. Off by default so earlier rows reproduce. */
  dateFix?: boolean;
}

/**
 * Three gaps of normaliseDates found while validating generated contexts (step 1.7), patched on the raw text:
 * ISO timestamps (2026-08-17T05:30Z) lack a word boundary after the day; "31.08." is skipped because of the
 * trailing dot; "APR" (annual percentage rate) reads as April ("top-5 APR" -> 5 April). Uppercase APR becomes
 * "APR_", which still tokenizes to "apr" but no longer matches the month pattern.
 */
export function dateFixPre(text: string): string {
  return text
    .replace(/(20\d\d-\d\d-\d\d)T/g, '$1 T')
    .replace(/\b(\d{1,2}\.\d{2})\.(?!\d)/g, '$1 ')
    .replace(/\bAPR\b/g, 'APR_');
}

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, stycznia: 1, styczen: 1,
  feb: 2, february: 2, lutego: 2, luty: 2,
  mar: 3, march: 3, marca: 3, marzec: 3,
  apr: 4, april: 4, kwietnia: 4, kwiecien: 4,
  may: 5, maja: 5, maj: 5,
  jun: 6, june: 6, czerwca: 6, czerwiec: 6,
  jul: 7, july: 7, lipca: 7, lipiec: 7,
  aug: 8, august: 8, sierpnia: 8, sierpien: 8,
  sep: 9, sept: 9, september: 9, wrzesnia: 9, wrzesien: 9,
  oct: 10, october: 10, pazdziernika: 10, pazdziernik: 10,
  nov: 11, november: 11, listopada: 11, listopad: 11,
  dec: 12, december: 12, grudnia: 12, grudzien: 12,
};
const MONTH_RE = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|');

const STOP = new Set(
  (
    'a an and are as at be been but by can could did do does for from had has have how i if in into is it its ' +
    'of on or our so that the their them then there these this those to was we were what when where which who why ' +
    'will with would you your ' +
    'a aby ale bo by czy dla do i ich jak jako jest juz lub na nad o od oraz po pod przez przy sa sie ta tak ' +
    'te tego tej to tu w we z za ze'
  ).split(' '),
);

export function fold(text: string): string {
  return text
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

export function dateToken(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `d${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
}

/** ISO date (from chunk metadata) to its canonical token. */
export function isoDateToken(iso: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? dateToken(Number(m[1]), Number(m[2]), Number(m[3])) : null;
}

/** Replace every recognised date in folded text with its canonical token. */
export function normaliseDates(folded: string): string {
  const rep = (y: number, m: number, d: number, whole: string) => {
    const t = dateToken(y, m, d);
    return t ? ` ${t} ` : whole;
  };
  return (
    folded
      .replace(/\b(20\d\d)-(\d{2})-(\d{2})\b/g, (w, y, m, d) => rep(+y, +m, +d, w))
      .replace(/\b(\d{1,2})\.(\d{2})\.(20\d\d)\b/g, (w, d, m, y) => rep(+y, +m, +d, w))
      // dd.mm without a year: only when not part of a number, a price or a percentage (0.05%, $12.08, 1.15/d).
      .replace(/(^|[^\d.$])(\d{1,2})\.(0[1-9]|1[0-2])(?![\d.%/x])/g, (w, pre, d, m) => {
        const t = dateToken(2026, +m, +d);
        return t ? `${pre} ${t} ` : w;
      })
      .replace(new RegExp(`\\b(\\d{1,2})\\s+(${MONTH_RE})\\.?(?:\\s+(20\\d\\d))?\\b`, 'g'), (w, d, mon, y) =>
        rep(y ? +y : 2026, MONTHS[mon], +d, w),
      )
      .replace(new RegExp(`\\b(${MONTH_RE})\\.?\\s+(\\d{1,2})(?:,?\\s+(20\\d\\d))?\\b`, 'g'), (w, mon, d, y) =>
        rep(y ? +y : 2026, MONTHS[mon], +d, w),
      )
  );
}

export function tokenize(text: string, opts: TokenizeOptions): string[] {
  const out: string[] = [];
  for (const raw of normaliseDates(fold(opts.dateFix ? dateFixPre(text) : text)).match(/[a-z0-9_#]+/g) ?? []) {
    const t = raw.replace(/^#+/, '').replace(/^_+|_+$/g, '');
    if (!t || STOP.has(t) || (opts.dropNie && t === 'nie')) continue;
    if (/^d20\d{6}$/.test(t)) {
      out.push(t);
      continue;
    }
    const isIdentifier = /\d|_/.test(t);
    if (isIdentifier) {
      out.push(t);
      if (t.includes('_')) for (const part of t.split('_')) if (part.length > 1 && !STOP.has(part)) out.push(part);
      continue;
    }
    if (t.length < 2) continue;
    out.push(opts.stem === 'prefix6' && t.length > 6 ? t.slice(0, 6) : t);
  }
  return out;
}
