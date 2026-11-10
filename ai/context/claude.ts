/**
 * ClaudeContextualizer: one Messages API call per chunk.
 *
 * Prompt layout, chosen for prompt caching (a cache hit needs an identical prefix):
 *   system  = instructions + project brief (docs/CASE-STUDY.md + docs/DECISION-LOG.md)   <- cached, shared by every call
 *   user    = parent unit (whole journal entry or whole morning report), when present     <- cached, shared by its chunks
 *             + the chunk with its metadata header                                         <- not cached
 * The caller must let the first request for a prefix finish before sending the others in parallel (cli.ts).
 * No server-side model fallback: the run must use one model only, a refusal is recorded as an error instead.
 */
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { estimateTokens } from '../corpus/tokens';
import { docText } from '../rerank/retriever';
import { MODELS, usd, type ModelKey } from './pricing';
import type { ContextRequest, ContextResult, Contextualizer, TokenUsage } from './types';

const MAX_TOKENS = 2000; // the answer is ~60 words; the rest is room for adaptive thinking at low effort

export const INSTRUCTIONS = `You write a short retrieval context for one chunk of the HOMOS project archive: the working journal (in Polish) and the English documentation of a Uniswap v3 liquidity-provision research project that ran from August to September 2026. The context is put in front of the chunk in a search index, so that English questions can find Polish text.

Its job: the date, the topic, and the episode or decision the chunk belongs to, in English.

Rules:
- Write in English, one or two sentences, at most 60 words.
- Start with the date from the chunk's metadata header, written as YYYY-MM-DD followed by a colon. If the header has no date, start with "Undated:".
- Do not write any date that does not appear in the chunk, its header or its parent unit.
- Do not list identifiers that are already in the chunk text. Name at most the three main ones (position id, pool, configuration name) when they help say what the chunk is about.
- Use only what the chunk, its parent unit and the project brief below say. Do not add interpretation.
- Write about the chunk in the third person. Output only the context text, with no preamble, no reasoning and no quotation marks.`;

export function projectBrief(root = process.cwd()): string {
  const read = (f: string) => readFileSync(`${root}/${f}`, 'utf8');
  return `<project_brief>\n<file name="docs/CASE-STUDY.md">\n${read('docs/CASE-STUDY.md')}\n</file>\n<file name="docs/DECISION-LOG.md">\n${read('docs/DECISION-LOG.md')}\n</file>\n</project_brief>`;
}

export class ClaudeContextualizer implements Contextualizer {
  readonly name: string;
  private readonly client: Anthropic;
  private readonly model: (typeof MODELS)[ModelKey];
  private readonly system: string;

  constructor(
    key: ModelKey,
    brief: string,
    client?: Anthropic,
  ) {
    this.model = MODELS[key];
    this.name = `context:${this.model.id}`;
    this.system = `${INSTRUCTIONS}\n\n${brief}`;
    this.client = client ?? new Anthropic({ maxRetries: 4 });
  }

  private userBlocks(req: ContextRequest): Anthropic.TextBlockParam[] {
    const blocks: Anthropic.TextBlockParam[] = [];
    if (req.parent)
      blocks.push({
        type: 'text',
        text: `<parent_unit source="${req.parent.label}">\n${req.parent.text}\n</parent_unit>`,
        cache_control: { type: 'ephemeral' },
      });
    const retry = req.retryNote ? `\n\nYour previous context broke a rule (${req.retryNote}). Write it again, following every rule.` : '';
    blocks.push({ type: 'text', text: `<chunk>\n${docText(req.chunk, 'meta')}\n</chunk>\n\nWrite the context for this chunk.${retry}` });
    return blocks;
  }

  worstCaseUsd(req: ContextRequest): number {
    // Everything billed as a cache write (the most expensive input rate) plus the full output budget.
    // estimateTokens was tuned for bge-m3; Claude's tokenizer counts our text at ~1.4x it (measured on the
    // 20-chunk sample), so the margin is 2x.
    const promptTokens = 2 * estimateTokens(this.system + this.userBlocks(req).map((b) => b.text).join('\n'));
    const max = (this.model.price as { maxPromptTokens?: number }).maxPromptTokens;
    if (max && promptTokens > max) throw new Error(`${req.chunk.id}: prompt may exceed ${max} tokens (higher price tier)`);
    return usd({ input: 0, cacheWrite: promptTokens, cacheRead: 0, output: MAX_TOKENS }, this.model.price);
  }

  costUsd(u: TokenUsage): number {
    return usd(u, this.model.price);
  }

  async contextualize(req: ContextRequest): Promise<ContextResult> {
    const res = await this.client.messages.create({
      model: this.model.id,
      max_tokens: MAX_TOKENS,
      output_config: { effort: 'low' },
      system: [{ type: 'text', text: this.system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: this.userBlocks(req) }],
    });
    const usage: TokenUsage = {
      input: res.usage.input_tokens,
      cacheWrite: res.usage.cache_creation_input_tokens ?? 0,
      cacheRead: res.usage.cache_read_input_tokens ?? 0,
      output: res.usage.output_tokens,
    };
    const text = res.content
      .flatMap((b) => (b.type === 'text' ? [b.text] : []))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (res.stop_reason === 'refusal') return { id: req.chunk.id, context: '', usage, error: 'refusal' };
    if (res.stop_reason === 'max_tokens') return { id: req.chunk.id, context: '', usage, error: 'max_tokens' };
    if (!text) return { id: req.chunk.id, context: '', usage, error: 'empty' };
    return { id: req.chunk.id, context: text, usage };
  }
}
