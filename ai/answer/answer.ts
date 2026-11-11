/**
 * One question end to end, given its retrieved chunks: generate, then verify every citation against the chunks the
 * model was given. Shared by `npm run ask` and the k=5 / k=10 evaluation.
 */
import type { Chunk } from '../corpus/types';
import type { Generator, GeneratorResult } from './types';
import { verifyCitation, type VerifiedCitation } from './verify';

export interface CheckedAnswer extends GeneratorResult {
  citations: VerifiedCitation[];
}

export async function answerWithChecks(gen: Generator, question: string, chunks: Chunk[], root = process.cwd()): Promise<CheckedAnswer> {
  const r = await gen.generate(question, chunks);
  const given = new Map(chunks.map((c) => [c.id, c]));
  return { ...r, citations: (r.output?.citations ?? []).map((c) => verifyCitation(c, given, root)) };
}

export function formatCitation(c: VerifiedCitation): string {
  const where = c.lines ? `${c.file}:${c.lines[0]}${c.lines[1] !== c.lines[0] ? `-${c.lines[1]}` : ''}` : (c.file ?? c.chunkId);
  const flags = [c.status !== 'ok' ? c.status.toUpperCase() : '', c.tooLong ? `TOO LONG (${c.words} words)` : ''].filter(Boolean).join(', ');
  return `${where}${flags ? `  [${flags}]` : ''}\n    "${c.quote}"`;
}
