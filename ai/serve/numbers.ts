/**
 * Number check for chat answers (phase 4, step 4.3). Every number in the answer text is "verified" only when the same
 * number appears in one of the answer's verified quotes; otherwise it is "not-verified" and the UI marks it. Same rule
 * as `unbackedNumbers` in the agent (step 2.2), but matched as whole numbers, so "1" is not verified by "2169".
 *
 * Positions are character offsets in the answer string as sent to the visitor (after masking), so the UI can mark
 * the exact span.
 */
/**
 * Same as `plainMinus` in ai/agent/verify.ts (a typographic minus, U+2212, read as a minus). Repeated here because that
 * module pulls in the agent tools and, through them, the Anthropic client, which the public path must not import.
 */
const plainMinus = (t: string) => t.replace(/\u2212/g, '-');

export interface NumberMark {
  text: string;
  start: number;
  end: number;
  status: 'verified' | 'not-verified';
}

/** A number not glued to letters, digits or a decimal point on its left: 2169, 1.9, -32, 31.08, 0.30. */
const NUMBER = /(?<![\p{L}\d.,])[+-]?\d+(?:[.,]\d+)*/gu;

/** Canonical form for comparison: no sign, no thousands separators of the "1,234" kind, plain minus. */
function canon(n: string): string {
  let s = plainMinus(n).replace(/^[+-]/, '');
  if (/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
  return s;
}

function numbersIn(text: string): Set<string> {
  return new Set([...plainMinus(text).matchAll(NUMBER)].map((m) => canon(m[0])));
}

export function markNumbers(answer: string, verifiedQuotes: string[]): NumberMark[] {
  const known = numbersIn(verifiedQuotes.join('\n'));
  const marks: NumberMark[] = [];
  for (const m of plainMinus(answer).matchAll(NUMBER)) {
    const start = m.index ?? 0;
    // Report the span in the original string (plainMinus keeps lengths: one code unit for one).
    const text = answer.slice(start, start + m[0].length);
    marks.push({ text, start, end: start + m[0].length, status: known.has(canon(m[0])) ? 'verified' : 'not-verified' });
  }
  return marks;
}
