/** Corpus line text for the generated review files of step 6.2 (roles and batches): a reviewer reads text, not line numbers. */
import { readFileSync } from 'fs';

const fileCache = new Map<string, string[]>();

export function lineText(file: string, n: number): string {
  if (!fileCache.has(file)) fileCache.set(file, readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n'));
  const l = fileCache.get(file)![n - 1];
  if (l === undefined) throw new Error(`${file}:${n} does not exist`);
  return l;
}

/** File name without the journal/, journal/reports/ or docs/ prefix. */
export const short = (file: string) => file.replace(/^journal\/(reports\/)?/, '').replace(/^docs\//, '');

/** A table cell: trimmed, pipes escaped, at most 110 characters. */
export const cell = (t: string) => t.trim().replace(/\|/g, '\\|').slice(0, 110);

/** First and last line of a span, the last as "(one line)" when the span is one line. */
export function ends(file: string, lines: [number, number]): [string, string] {
  return [lineText(file, lines[0]), lines[1] > lines[0] ? lineText(file, lines[1]) : '(one line)'];
}
