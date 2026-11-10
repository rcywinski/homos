/**
 * What the index (vectors and BM25) sees for each chunk. plain = the chunk text (steps 1.3 to 1.6);
 * meta = metadata header + text (control row meta-index); meta + contexts = header + generated context + text.
 * The reranker builds its documents with the same docText, so index and reranker see the same document.
 */
import { applyContexts } from '../context/contexts-file';
import type { Chunk } from '../corpus/types';
import { docText } from '../rerank/retriever';

/** Chunks as the index sees them (text replaced by the indexed text) and the index file suffix. */
export function indexView(chunks: Chunk[], doc: string | undefined, contexts: string | undefined, fileDates = false): { chunks: Chunk[]; suffix: string } {
  if (!doc || doc === 'plain') {
    if (contexts) throw new Error('--contexts needs --doc meta');
    return { chunks, suffix: '' };
  }
  if (doc !== 'meta') throw new Error('--doc must be plain or meta');
  const withCtx = contexts ? applyContexts(chunks, contexts) : chunks;
  const tag = contexts ? `.ctx-${contexts.replace(/^.*contexts-/, '').replace(/\.jsonl$/, '')}` : '.meta';
  // File dates change the metadata header, hence the indexed text: a separate index file.
  return { chunks: withCtx.map((c) => ({ ...c, text: docText(c, 'meta') })), suffix: tag + (fileDates ? '.fd' : '') };
}

