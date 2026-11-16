/**
 * Scope check before any model call (phase 4, step 4.3). Deterministic and small on purpose: it catches requests for
 * trading or investment advice, in English and Polish, and refuses them with a fixed text. Everything else goes to
 * retrieval, and a question the corpus cannot answer comes back as coverage "none", which the chat also shows as a
 * fixed text. The served prompt is not changed for this, because it is the measured one (step 3.2).
 */

export type ScopeResult = { inScope: true } | { inScope: false; reason: 'advice' };

const ADVICE: RegExp[] = [
  // English: should I buy, is it a good time to sell, what should I invest in, price predictions.
  /\bshould\s+(?:i|we|you)\s+(?:buy|sell|hold|invest|short|long|trade|ape|provide\s+liquidity)\b/i,
  /\b(?:good|right|best)\s+(?:time|moment)\s+to\s+(?:buy|sell|invest|enter|exit)\b/i,
  /\bwhat\s+(?:should|would)\s+(?:i|you)\s+(?:buy|invest|trade)\b/i,
  /\b(?:invest|put)\s+(?:my|our)\s+(?:money|savings|funds|capital)\b/i,
  /\b(?:financial|investment|trading)\s+advice\b/i,
  /\b(?:price\s+(?:prediction|target|forecast)|will\s+\w+\s+(?:go\s+up|go\s+down|pump|dump|moon))\b/i,
  /\bwhich\s+(?:token|coin|pool|pair)\s+(?:should|to)\s+(?:i\s+)?(?:buy|pick|choose|invest)\b/i,
  // Polish: czy kupić, czy warto inwestować, w co zainwestować, prognoza ceny.
  /(?<!\p{L})czy\s+(?:warto\s+)?(?:kupi[ćc]|sprzeda[ćc]|inwestowa[ćc]|zainwestowa[ćc]|trzyma[ćc])(?!\p{L})/iu,
  /(?<!\p{L})w\s+co\s+(?:zainwestowa[ćc]|inwestowa[ćc])(?!\p{L})/iu,
  /(?<!\p{L})(?:co|kt[óo]ry\s+token|kt[óo]r[aą]\s+pul[ęe])\s+(?:kupi[ćc]|wybra[ćc])(?!\p{L})/iu,
  /(?<!\p{L})prognoz[aęy]\s+cen/iu,
  /(?<!\p{L})porad[aęy]\s+inwestycyjn/iu,
];

export function checkScope(question: string): ScopeResult {
  return ADVICE.some((r) => r.test(question)) ? { inScope: false, reason: 'advice' } : { inScope: true };
}

/** Plain text only: no control characters other than newline and tab, and some letters. */
export function isPlainQuestion(question: string): boolean {
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(question)) return false;
  return /\p{L}{2,}/u.test(question);
}
