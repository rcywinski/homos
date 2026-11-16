/**
 * One chat question end to end (phase 4, step 4.3): scope check, retrieval, generation, verification, masking.
 *
 * The response is built by code from closed sets. The model contributes the answer text, the coverage enum and the
 * quotes; code decides the outcome, verifies every quote against the chunk it cites and every number against the
 * verified quotes, and masks private network addresses last. When the model's output is invalid, or the sources do not
 * answer, or the question asks for trading advice, the visitor gets a fixed text instead of model output.
 */
import { answerWithChecks } from '../answer/answer';
import type { Chunk } from '../corpus/types';
import type { Generator } from '../answer/types';
import type { ShowcaseCitation } from './showcase-data';
import { maskNetwork } from './mask';
import { markNumbers, type NumberMark } from './numbers';
import type { ChatRetrieval } from './retrieve';
import { checkScope } from './scope';
import { FAILED, NOT_IN_DATA, OUT_OF_SCOPE_ADVICE } from './texts';

export const OUTCOMES = ['answered', 'not-in-data', 'out-of-scope', 'failed'] as const;
export type Outcome = (typeof OUTCOMES)[number];

export interface AskResponse {
  outcome: Outcome;
  /** The served preset: shown next to every answer. */
  engine: { id: string; label: string };
  /** Set only when outcome is "answered". */
  coverage: 'full' | 'partial' | null;
  /** Model text when answered (masked); otherwise one of the fixed texts in ./texts.ts. */
  text: string;
  citations: ShowcaseCitation[];
  numbers: NumberMark[];
  /** Chunks given to the model, so the visitor can see what was searched. Empty when retrieval did not run. */
  sources: { chunkId: string; file: string; lines: [number, number]; title: string }[];
  ms: number;
}

export interface AskDeps {
  retrieval: ChatRetrieval;
  generator: Generator;
  engine: { id: string; label: string };
  k: number;
  root?: string;
  /** Run inside the GPU queue before any model call, for example the residency check of ai/serve/residency.ts. */
  beforeWork?: () => Promise<void>;
}

const fixed = (deps: AskDeps, outcome: Outcome, text: string, t0: number, sources: AskResponse['sources'] = []): AskResponse => ({
  outcome,
  engine: deps.engine,
  coverage: null,
  text,
  citations: [],
  numbers: [],
  sources,
  ms: Date.now() - t0,
});

const sourceOf = (c: Chunk) => ({ chunkId: c.id, file: c.file, lines: [c.lineStart, c.lineEnd] as [number, number], title: maskNetwork(c.title) });

export type Stage = 'retrieving' | 'generating';

/**
 * The model services failed while answering (box unreachable, the GPU busy with other work, the model not fitting in
 * memory, a prompt over the context): the visitor gets a fixed "model unavailable" message, not a generic error.
 */
export class ModelUnavailable extends Error {
  constructor(readonly stage: Stage, cause: unknown) {
    super(`${stage}: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = 'ModelUnavailable';
  }
}

async function during<T>(stage: Stage, f: () => Promise<T>): Promise<T> {
  try {
    return await f();
  } catch (e) {
    throw new ModelUnavailable(stage, e);
  }
}

/** True when the question is refused before any GPU work: the app answers it without queueing. */
export function refusedBeforeWork(question: string): boolean {
  return !checkScope(question).inScope;
}

export async function ask(deps: AskDeps, question: string, onStage?: (s: Stage) => void): Promise<AskResponse> {
  const t0 = Date.now();
  if (refusedBeforeWork(question)) return fixed(deps, 'out-of-scope', OUT_OF_SCOPE_ADVICE, t0);

  onStage?.('retrieving');
  if (deps.beforeWork) await during('retrieving', deps.beforeWork);
  const chunks = await during('retrieving', () => deps.retrieval.retrieve(question, deps.k));
  const sources = chunks.map(sourceOf);
  onStage?.('generating');
  const r = await during('generating', () => answerWithChecks(deps.generator, question, chunks, deps.root));
  const out = r.output;
  if (!out || r.error) return fixed(deps, 'failed', FAILED, t0, sources);
  if (out.coverage === 'none') return fixed(deps, 'not-in-data', NOT_IN_DATA, t0, sources);

  const citations: ShowcaseCitation[] = r.citations.map((c) => ({
    chunkId: c.chunkId,
    file: c.file ?? c.chunkId.split(':')[0],
    lines: c.lines ?? null,
    quote: maskNetwork(c.quote),
    status: c.status === 'ok' ? 'verified' : 'not-verified',
    ...(c.status === 'ok' ? {} : { reason: c.status === 'unknown-chunk' ? ('unknown-chunk' as const) : ('not-in-chunk' as const) }),
    tooLong: c.tooLong,
  }));
  const text = maskNetwork(out.answer);
  const verifiedQuotes = r.citations.filter((c) => c.status === 'ok').map((c) => c.quote);
  const given = new Map(chunks.map((c) => [c.id, c]));
  const citedChunks = [...new Set(r.citations.filter((c) => c.status === 'ok').map((c) => c.chunkId))].map((id) => given.get(id)?.text ?? '');
  return {
    outcome: 'answered',
    engine: deps.engine,
    coverage: out.coverage,
    text,
    citations,
    numbers: markNumbers(text, verifiedQuotes, citedChunks),
    sources,
    ms: Date.now() - t0,
  };
}
