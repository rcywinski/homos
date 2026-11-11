/**
 * Prompts for local generators (step 1.12). The Sonnet prompt in ./prompt.ts is not changed.
 *
 * P (quote rules): ANSWER_SYSTEM with the citation rule replaced by explicit quoting rules and one worked example on an
 * invented chunk that is not in the corpus. Written once, on 11 Nov 2026, from the failure types recorded in step 1.11
 * (pieces joined with an ellipsis, sentences merged from two places, typos and lost diacritics inside quotes, quotes
 * over 40 words, quoting a chunk that was not given). Not revised after seeing results.
 *
 * L (citation by reference): every chunk is shown with numbered units; the model returns a chunk id plus the first and
 * last unit of one contiguous span, and the code extracts the quote (ai/answer/units.ts). The model never copies text.
 */
import type { Chunk } from '../corpus/types';
import { ANSWER_SYSTEM, MAX_QUOTE_WORDS } from './prompt';
import { chunkUnits } from './units';

const SONNET_CITE_RULE = `- Cite the passages the answer rests on. chunkId exactly as given. quote copied verbatim from that chunk's text, in its original language, at most ${MAX_QUOTE_WORDS} words: one continuous passage, never several pieces joined with an ellipsis.`;

if (!ANSWER_SYSTEM.includes(SONNET_CITE_RULE)) throw new Error('ANSWER_SYSTEM changed: update prompt-local.ts');

const QUOTE_RULES = `- Cite the passages the answer rests on. chunkId exactly as given, and only ids of chunks shown in this message.
- Every quote must be found character for character in the chunk it cites. A program checks this, and a quote that is not found counts as an error. Rules:
  1. Copy one contiguous span of one chunk, exactly as written: same words, same order, same numbers and symbols.
  2. Never use an ellipsis ("..." or "…") inside a quote, and never shorten the middle of a span.
  3. Never join text from two places, not even from the same chunk. To support a claim with two passages, write two citations.
  4. Keep Polish letters exactly as in the source (ą ć ę ł ń ó ś ź ż). Do not translate, correct or reformat the quote.
  5. At most ${MAX_QUOTE_WORDS} words. If the passage is longer, quote a shorter contiguous part of it that still carries the claim.

Example, on an invented chunk (it is not part of the sources):
<chunk id="example:1" file="journal/EXAMPLE.md" lines="1-2" date="2026-03-12">
12.03 przegląd puli testowej: opłaty 14,20 USD za tydzień, zakres przesunięty o 3%.
Wniosek: zostawiamy szeroki zakres; następny przegląd 19.03.
</chunk>
Good citations: {"chunkId": "example:1", "quote": "opłaty 14,20 USD za tydzień"} and, for a second claim, {"chunkId": "example:1", "quote": "Wniosek: zostawiamy szeroki zakres"}.
Wrong: "opłaty 14,20 USD ... następny przegląd 19.03" (ellipsis, two places joined); "oplaty 14,20 USD za tydzien" (diacritics lost); "fees of 14.20 USD per week" (translated).`;

/** Variant P: the Sonnet system prompt with the citation rule replaced by the quoting rules and the example. */
export const LOCAL_QUOTE_SYSTEM = ANSWER_SYSTEM.replace(SONNET_CITE_RULE, QUOTE_RULES);

const REF_RULES = `- Cite the passages the answer rests on, by reference, not by copying text. Every chunk is shown with numbered units, each starting with its number in square brackets, like [3]. A citation is the chunkId exactly as given (only ids of chunks shown in this message) plus firstUnit and lastUnit: the numbers of the first and last unit of one contiguous span inside that chunk (firstUnit = lastUnit for a single unit). A program takes the text of those units as the quote.
- Keep each span short: at most ${MAX_QUOTE_WORDS} words in total, usually one or two units. To support a claim with two separate passages, write two citations.`;

/** Variant L: the Sonnet system prompt with the citation rule replaced by citation by reference. */
export const LOCAL_REF_SYSTEM = ANSWER_SYSTEM.replace(SONNET_CITE_RULE, REF_RULES);

const attr = (s: string) => s.replace(/"/g, '&quot;');

export function refChunkBlock(c: Chunk): string {
  const date = c.date ? ` date="${c.date}"` : '';
  const units = chunkUnits(c).map((u, i) => `[${i + 1}] ${u.text.replace(/<\/chunk/gi, '<\\/chunk')}`);
  return `<chunk id="${attr(c.id)}" file="${attr(c.file)}" lines="${c.lineStart}-${c.lineEnd}"${date}>\n${units.join('\n')}\n</chunk>`;
}

export function refUserPrompt(question: string, chunks: Chunk[]): string {
  return `<question>\n${question}\n</question>\n\n<chunks>\n${chunks.map(refChunkBlock).join('\n\n')}\n</chunks>`;
}

export const REF_SCHEMA = {
  type: 'object',
  properties: {
    answer: { type: 'string' },
    coverage: { type: 'string', enum: ['full', 'partial', 'none'] },
    citations: {
      type: 'array',
      items: {
        type: 'object',
        properties: { chunkId: { type: 'string' }, firstUnit: { type: 'integer' }, lastUnit: { type: 'integer' } },
        required: ['chunkId', 'firstUnit', 'lastUnit'],
        additionalProperties: false,
      },
    },
  },
  required: ['answer', 'coverage', 'citations'],
  additionalProperties: false,
} as const;
