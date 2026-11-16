/** Display text for the closed sets in the data. Every enum value has exactly one label here. */
import type { Correctness, Faithfulness, Premise, ShowcaseAnswer, ShowcaseCitation } from '../ai/serve/showcase-data';

export const CORRECTNESS_LABEL: Record<Correctness, string> = {
  correct: 'Correct',
  partially_correct: 'Partially correct',
  incorrect: 'Incorrect',
};

export const FAITHFULNESS_LABEL: Record<Faithfulness, string> = {
  supported: 'Supported by its quotes',
  partly_supported: 'Partly supported by its quotes',
  unsupported: 'Not supported by its quotes',
};

export const PREMISE_LABEL: Record<Premise, string> = {
  handled: 'False premise handled',
  not_handled: 'False premise not handled',
  'n/a': '',
};

export const COVERAGE_LABEL: Record<NonNullable<ShowcaseAnswer['coverage']>, string> = {
  full: 'The sources answer the question',
  partial: 'The sources answer part of the question',
  none: 'Not in the data',
};

export const ANSWERABLE_LABEL = { yes: 'answerable', partial: 'partly answerable', no: 'not answerable' } as const;

export const REASON_LABEL: Record<NonNullable<ShowcaseCitation['reason']>, string> = {
  'not-in-chunk': 'the quote is not in the cited source',
  'unknown-chunk': 'the cited source was not among those given to the model',
};

export const FAILED_TEXT = 'The model did not return a valid answer for this question. Nothing is shown in its place.';
