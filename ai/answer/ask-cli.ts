/**
 * npm run ask -- "Why did the live product stay wide?" [--k 5]
 * Retrieves with the variant chosen in 1.7, answers with Sonnet 5.5, verifies every citation and prints it as
 * file:lines. A question outside the golden set costs one extra Sonnet call for its Polish rendering.
 */
import 'dotenv/config';
import { answerWithChecks, formatCitation } from './answer';
import { ClaudeGenerator } from './claude';
import { AnswerRetrieval } from './retrieval';

async function main() {
  const args = process.argv.slice(2);
  const kIdx = args.indexOf('--k');
  const k = kIdx >= 0 ? Number(args[kIdx + 1]) : 5;
  const question = args.filter((_, i) => kIdx < 0 || (i !== kIdx && i !== kIdx + 1)).join(' ').trim();
  if (!question) throw new Error('usage: npm run ask -- "<question>" [--k 5|10]');

  const retrieval = new AnswerRetrieval();
  const [chunks] = await retrieval.retrieve([question], k);
  const gen = new ClaudeGenerator('sonnet');
  const r = await answerWithChecks(gen, question, chunks);
  if (!r.output) throw new Error(`no answer: ${r.error}`);

  console.log(`\n${r.output.answer}\n`);
  console.log(`coverage: ${r.output.coverage}`);
  console.log(`citations (${r.citations.filter((c) => c.status === 'ok').length}/${r.citations.length} verified):`);
  for (const c of r.citations) console.log(`  ${formatCitation(c)}`);
  console.log(
    `\n${k} chunks given; ${gen.name}; ${r.usage.input} in / ${r.usage.output} out tokens, $${r.costUsd.toFixed(4)}, ${(r.ms / 1000).toFixed(1)} s` +
      (retrieval.liveTranslations ? '; +1 query translation call' : ''),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
