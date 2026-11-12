/**
 * Pure handlers for the four read-only agent tools (step 2.1). Every external dependency comes in through a small
 * interface (journal search, results store, text reader), so the handlers run in tests without the GPU box, the API or
 * the restored result files. A handler returns text; size caps, data wrapping and error handling are in tools.ts.
 */
import { lstatSync, readdirSync, readFileSync } from 'fs';
import path from 'path';
import { chunkBlock } from '../answer/prompt';
import type { Chunk } from '../corpus/types';
import { legendText } from './legend';

/**
 * Phase 1 retrieval as the agent sees it: top k source chunks for one query, plus the cost of any model call made
 * inside the search (the Polish query translation of the chosen variant), so the agent's spend includes it.
 */
export interface JournalSearch {
  search(query: string, k: number): Promise<{ chunks: Chunk[]; costUsd: number }>;
}

/** Backtest result files: names (file name without .json) and their text. */
export interface ResultsStore {
  list(): string[];
  read(name: string): string;
}

/** A recoverable tool error: its message goes back to the model as the tool result. */
export class ToolError extends Error {}

export const SEARCH_K = 10;
/** Letters, digits and hyphens: real names include `e8-carry-BTCUSDT-30d` and `pegged-mainnet-usdc-usdt-001-endL`. */
export const RESULT_NAME = /^[A-Za-z0-9-]+$/;

/**
 * Result files in one directory: regular files named like `walkforward-base-weth-usdc-005-365d-45d.json` only
 * (letters, digits, hyphens).
 * Symbolic links, subdirectories and any other name are not listed, and `read` accepts only a listed name, so a name
 * never reaches the file system unless it is exactly one of the listed files.
 */
export class DirResultsStore implements ResultsStore {
  constructor(readonly dir: string) {}

  list(): string[] {
    let entries: string[];
    try {
      entries = readdirSync(this.dir);
    } catch {
      throw new ToolError(`backtest results are not available (missing ${path.basename(this.dir)}/); restore them with npm run ai:restore-results`);
    }
    return entries
      .filter((f) => f.endsWith('.json') && RESULT_NAME.test(f.slice(0, -5)))
      .filter((f) => lstatSync(path.join(this.dir, f)).isFile())
      .map((f) => f.slice(0, -5))
      .sort();
  }

  read(name: string): string {
    if (!this.list().includes(name)) throw new ToolError(`unknown result name "${name}"; call list_backtest_configs for the valid names`);
    return readFileSync(path.join(this.dir, `${name}.json`), 'utf8');
  }
}

/** One block per chunk, best first, in the phase 1 format (id, file, lines, date, source text). */
const JOB_DIR = /^j\d{8}T\d{6}n\d+$/;

/**
 * Results written by run_backtest jobs (step 2.3): ai/agent/runs/<jobId>/<output>.json, listed as
 * run-<jobId>-<output>. Only directories named like a job id (made by the code) and regular result files count;
 * job.json (the plan) is not a result.
 */
export class RunsResultsStore implements ResultsStore {
  constructor(readonly dir: string) {}

  private entries(): Map<string, string> {
    const m = new Map<string, string>();
    let ids: string[] = [];
    try {
      ids = readdirSync(this.dir);
    } catch {
      return m;
    }
    for (const id of ids.filter((x) => JOB_DIR.test(x)).sort()) {
      const d = path.join(this.dir, id);
      if (!lstatSync(d).isDirectory()) continue;
      for (const f of readdirSync(d).sort()) {
        if (f === 'job.json' || !f.endsWith('.json') || !RESULT_NAME.test(f.slice(0, -5))) continue;
        if (!lstatSync(path.join(d, f)).isFile()) continue;
        m.set(`run-${id}-${f.slice(0, -5)}`, path.join(d, f));
      }
    }
    return m;
  }

  list(): string[] {
    return [...this.entries().keys()];
  }

  read(name: string): string {
    const file = this.entries().get(name);
    if (!file) throw new ToolError(`unknown result name "${name}"; call list_backtest_configs for the valid names`);
    return readFileSync(file, 'utf8');
  }
}

/** Saved results first, then job results. */
export class CompositeResultsStore implements ResultsStore {
  constructor(private readonly stores: ResultsStore[]) {}
  list(): string[] {
    return this.stores.flatMap((s) => s.list());
  }
  read(name: string): string {
    const s = this.stores.find((x) => x.list().includes(name));
    if (!s) throw new ToolError(`unknown result name "${name}"; call list_backtest_configs for the valid names`);
    return s.read(name);
  }
}

export async function searchJournal(search: JournalSearch, query: string): Promise<{ blocks: string[]; chunks: Chunk[]; costUsd: number }> {
  const q = query.trim();
  if (!q) throw new ToolError('query is empty');
  const { chunks, costUsd } = await search.search(q, SEARCH_K);
  return { blocks: chunks.map(chunkBlock), chunks, costUsd };
}

export function readDecisionLog(readText: () => string): string {
  return readText();
}

export function listBacktestConfigs(store: ResultsStore): string {
  const names = store.list();
  return JSON.stringify({ count: names.length, names }, null, 1);
}

/** Resolve an array of keys through own properties only: no prototype keys, array indexes as decimal strings. */
export function resolvePath(root: unknown, keys: string[]): unknown {
  let cur = root;
  keys.forEach((k, i) => {
    const at = keys.slice(0, i).map((x) => JSON.stringify(x)).join(', ');
    if (Array.isArray(cur)) {
      if (!/^(0|[1-9]\d*)$/.test(k) || Number(k) >= cur.length) throw new ToolError(`path item ${i} "${k}" is not an index of the array at [${at}] (length ${cur.length})`);
      cur = cur[Number(k)];
    } else if (typeof cur === 'object' && cur !== null) {
      if (!Object.prototype.hasOwnProperty.call(cur, k)) throw new ToolError(`path item ${i} "${k}" is not a key at [${at}]; keys there: ${Object.keys(cur).slice(0, 30).join(', ')}`);
      cur = (cur as Record<string, unknown>)[k];
    } else {
      throw new ToolError(`path item ${i} "${k}" goes below a plain value at [${at}]`);
    }
  });
  return cur;
}

/**
 * Overview of a JSON value down to `depth` levels: deeper objects and arrays become short markers that say what is
 * there, so the model can ask for a part with a longer path.
 */
export function overview(v: unknown, depth: number): unknown {
  if (typeof v === 'string') return v.length > 200 ? `${v.slice(0, 200)} <string cut, ${v.length} characters>` : v;
  if (Array.isArray(v)) {
    if (depth === 0) return `<array of ${v.length} items>`;
    const head = v.slice(0, 3).map((x) => overview(x, depth - 1));
    return v.length > 3 ? [...head, `<${v.length - 3} more items>`] : head;
  }
  if (typeof v === 'object' && v !== null) {
    const keys = Object.keys(v);
    if (depth === 0) return `<object with ${keys.length} keys: ${keys.slice(0, 15).join(', ')}${keys.length > 15 ? ', ...' : ''}>`;
    return Object.fromEntries(keys.map((k) => [k, overview((v as Record<string, unknown>)[k], depth - 1)]));
  }
  return v;
}

export const OVERVIEW_DEPTH = 2;

/**
 * The value at `keys` in one result file, after the legend of the file's family (legend.ts): the data in full when
 * legend plus data fit in `cap` characters, otherwise an overview with a marker saying so (a cut in the middle of
 * JSON would be unreadable).
 */
export function readBacktestResults(store: ResultsStore, name: string, keys: string[], cap: number): string {
  if (!RESULT_NAME.test(name)) throw new ToolError(`invalid result name "${name}"; call list_backtest_configs for the valid names`);
  const text = store.read(name);
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ToolError(`result file "${name}" is not valid JSON`);
  }
  const legend = legendText(name);
  const room = cap - legend.length - 1;
  const value = resolvePath(data, keys);
  const full = JSON.stringify(value, null, 1);
  if (full.length <= room) return `${legend}\n${full}`;
  const where = keys.length ? `the value at path ${JSON.stringify(keys)}` : `the whole file`;
  return `${legend}\n[overview: ${where} is ${full.length} characters, over the ${room} left for data within the ${cap} limit; deeper values are shown as markers; pass a longer path to read a part]\n${JSON.stringify(overview(value, OVERVIEW_DEPTH), null, 1)}`;
}
