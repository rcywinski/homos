/**
 * Fixed texts the chat shows instead of model output (phase 4, step 4.3). The model never writes these: when the
 * answer is "not in the data", out of scope or invalid, the visitor sees exactly one of these strings.
 */

export const SCOPE =
  'This chat answers questions about the HOMOS project from its journal, decision log, documentation and daily reports (August to September 2026): what was built, what was decided and why, and what happened on which day.';

export const NOT_IN_DATA = `The project data does not answer this question. ${SCOPE}`;

export const OUT_OF_SCOPE_ADVICE = `This chat does not give advice on what to buy, sell or hold, or how to trade. The strategy it describes did not reliably beat simply holding the tokens. ${SCOPE}`;

export const OUT_OF_SCOPE_OTHER = `This question is outside what the chat covers. ${SCOPE}`;

export const FAILED = 'The model did not return a valid answer this time. Nothing is shown in its place. You can ask again.';

export const BAD_QUESTION = 'Please ask a question in plain text.';
