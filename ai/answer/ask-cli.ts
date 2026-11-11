/**
 * npm run ask -- "Why did the live product stay wide?" [--k 10]
 * Retrieves with the variant chosen in 1.7, answers with Sonnet 5.5, verifies every citation and prints it as
 * file:lines. A question outside the golden set costs one extra Sonnet call for its Polish rendering. Text is wrapped at
 * word boundaries to the terminal width (100 columns when the output is not a terminal).
 */
import 'dotenv/config';
import { answerWithChecks, formatCitation } from './answer';
import { ClaudeGenerator } from './claude';
import { AnswerRetrieval } from './retrieval';
import { wrapText } from './wrap';

async function main() {
  const args = process.argv.slice(2);
  const kIdx = args.indexOf('--k');
  const k = kIdx >= 0 ? Number(args[kIdx + 1]) : 10;
  const question = args.filter((_, i) => kIdx < 0 || (i !== kIdx && i !== kIdx + 1)).join(' ').trim();
  if (!question) throw new Error('usage: npm run ask -- "<question>" [--k 10|5]');

  const retrieval = new AnswerRetrieval();
  const [chunks] = await retrieval.retrieve([question], k);
  const gen = new ClaudeGenerator('sonnet');
  const r = await answerWithChecks(gen, question, chunks);
  if (!r.output) throw new Error(`no answer: ${r.error}`);

  const width = process.stdout.columns || 100;
  console.log(`\n${wrapText(r.output.answer, width)}\n`);
  console.log(`coverage: ${r.output.coverage}`);
  console.log(`citations (${r.citations.filter((c) => c.status === 'ok').length}/${r.citations.length} verified):`);
  for (const c of r.citations) {
    const [where, quote] = formatCitation(c).split('\n    ');
    console.log(`${wrapText(where, width, '  ')}\n${wrapText(quote, width, '    ')}`);
  }
  const stats =
    `${k} chunks given; ${gen.name}; ${r.usage.input} in / ${r.usage.output} out tokens, $${r.costUsd.toFixed(4)}, ${(r.ms / 1000).toFixed(1)} s` +
    (retrieval.liveTranslations ? '; +1 query translation call' : '');
  console.log(`\n${wrapText(stats, width)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
