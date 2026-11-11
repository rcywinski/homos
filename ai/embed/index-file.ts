/**
 * Index file: ai/index/<embedder-name>.json, plain JSON (~12 MB for 957 x 1024, parses in ~50 ms).
 * Switch to a JSON manifest + Float32 binary only if several indexes or a much larger corpus make it matter.
 */
import { createHash } from 'crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import type { Chunk } from '../corpus/types';

export interface IndexFile {
  embedder: string;
  dims: number;
  createdAt: string;
  wallTimeMs: number;
  chunkCount: number;
  /** Hash of chunk ids and texts: a changed chunker makes the index stale. */
  corpusHash: string;
  ids: string[];
  vectors: number[][];
}

export const INDEX_DIR = 'ai/index';

export function corpusHash(chunks: Chunk[]): string {
  const h = createHash('sha256');
  for (const c of chunks) h.update(c.id).update('\0').update(c.text).update('\0');
  return h.digest('hex').slice(0, 16);
}

export function indexPath(embedderName: string, root = process.cwd()): string {
  return path.join(root, INDEX_DIR, `${embedderName}.json`);
}

export function writeIndex(file: string, index: IndexFile): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(index));
}

/** Load an index and refuse it if it does not match the current chunks. */
export function readIndex(file: string, chunks?: Chunk[]): IndexFile {
  const index = JSON.parse(readFileSync(file, 'utf8')) as IndexFile;
  if (index.ids.length !== index.vectors.length) throw new Error(`${file}: ids and vectors differ in length`);
  if (chunks && index.corpusHash !== corpusHash(chunks))
    throw new Error(`${file} is stale: the corpus or chunker changed since it was built (run npm run ai:index)`);
  return index;
}
