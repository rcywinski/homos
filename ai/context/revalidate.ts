/**
 * npm run ai:context:revalidate -- <contexts.jsonl>
 * Re-checks the stored rejected contexts against the current validator, without any API call. A rejected text that
 * now passes becomes the chunk's context and is marked "acceptedOnRevalidation" (the validator, not the model,
 * was wrong: dates in file names and in ISO timestamps were not recognised in the first runs of 10 Nov 2026).
 */
import { readFileSync, writeFileSync } from 'fs';
import { loadCorpus } from '../corpus/load';
import { groupByParent } from './parents';
import { validateContext } from './validate';

const file = process.argv[2];
const reqs = new Map(groupByParent(loadCorpus()).flatMap((g) => g.requests.map((r) => [r.chunk.id, r] as const)));
let accepted = 0;
let still = 0;
const out = readFileSync(file, 'utf8')
  .split('\n')
  .filter((l) => l.trim())
  .map((l) => {
    const d = JSON.parse(l) as { id: string; context: string; invalid?: string; rejected?: string };
    if (!d.invalid || !d.rejected) return l;
    const broken = validateContext(d.rejected, reqs.get(d.id)!);
    if (broken) {
      still++;
      return JSON.stringify({ ...d, invalid: broken });
    }
    accepted++;
    return JSON.stringify({ id: d.id, context: d.rejected, acceptedOnRevalidation: d.invalid });
  });
writeFileSync(file, out.join('\n') + '\n');
console.log(`${file}: ${accepted} accepted on revalidation, ${still} still invalid`);
