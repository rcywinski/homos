/**
 * Format check of a generated context (step 1.7). Returns the broken rule, or null when the context is valid:
 *   - it starts with the chunk's metadata date ("YYYY-MM-DD") or, when the chunk has none, with "Undated:";
 *   - no first-person text (a model leaking its reasoning: "I cannot date it");
 *   - no date that is absent from the chunk, its header (file path, date, title) and its parent unit (dates compared in every written form,
 *     via the same normalisation BM25 uses: "2026-09-11", "11.09", "11 Sep" are one date).
 */
import type { ContextRequest } from './types';
import { fold, isoDateToken, normaliseDates } from '../store/tokenize';

// Three known gaps of the BM25 date normaliser, patched here only (changing the tokenizer would change every earlier
// result): ISO timestamps (2026-08-17T05:30Z) lack a word boundary after the day, "31.08." is skipped because of the
// trailing dot, and "APR" (annual percentage rate) reads as April ("top-5 APR" -> 5 April).
const dates = (text: string) =>
  new Set(
    normaliseDates(
      fold(
        text
          .replace(/(20\d\d-\d\d-\d\d)T/g, '$1 T')
          .replace(/\b(\d{1,2}\.\d{2})\.(?!\d)/g, '$1 ')
          .replace(/\bAPR\b/g, 'rate'),
      ),
    ).match(/\bd20\d{6}\b/g) ?? [],
  );

export function validateContext(context: string, req: ContextRequest): string | null {
  const c = req.chunk;
  if (c.date ? !context.startsWith(c.date) : !context.startsWith('Undated:'))
    return c.date ? `must start with the metadata date ${c.date}` : 'must start with "Undated:"';
  // Quoted text (a section title such as "What I built") is the source speaking, not the model.
  const own = context.replace(/"[^"]*"|“[^”]*”/g, '');
  if (/(^|[^\w'])(I|I'm|I've|I'll|I'd)([^\w']|$)/.test(own) || /\b(my|me|mine)\b/i.test(own)) return 'first-person text';
  // The file path is part of the header the model sees, and some files are named by date (DECYZJE-2026-08-26.md).
  const allowed = dates([c.file.replace(/[-_/]/g, ' ').replace(/(20\d\d) (\d\d) (\d\d)/g, '$1-$2-$3'), c.text, c.title, req.parent?.text ?? ''].join('\n'));
  if (c.date) {
    const t = isoDateToken(c.date);
    if (t) allowed.add(t);
  }
  const extra = [...dates(context)].filter((d) => !allowed.has(d));
  if (extra.length) return `date not in the sources: ${extra.map((d) => `${d.slice(1, 5)}-${d.slice(5, 7)}-${d.slice(7)}`).join(', ')}`;
  return null;
}
