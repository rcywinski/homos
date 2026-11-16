/**
 * Loads the static showcase data written by `npm run showcase:data` (ai/serve/export.ts). Same origin only.
 */
import { useEffect, useState } from 'react';
import type { ComparisonData, ReportsData } from '../ai/serve/showcase-data';

export type Loaded<T> = { state: 'loading' } | { state: 'error'; message: string } | { state: 'ready'; data: T };

function useJson<T>(file: string): Loaded<T> {
  const [value, setValue] = useState<Loaded<T>>({ state: 'loading' });
  useEffect(() => {
    let live = true;
    fetch(`data/${file}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<T>;
      })
      .then((data) => live && setValue({ state: 'ready', data }))
      .catch((e: unknown) => live && setValue({ state: 'error', message: e instanceof Error ? e.message : String(e) }));
    return () => {
      live = false;
    };
  }, [file]);
  return value;
}

export const useComparison = () => useJson<ComparisonData>('comparison.json');
export const useReports = () => useJson<ReportsData>('reports.json');
