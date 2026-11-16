/** Display text for the closed sets in the data. Every enum value has exactly one label here. */
import type { Correctness, Faithfulness, Premise, ShowcaseAnswer, ShowcaseCitation } from '../ai/serve/showcase-data';

export const CORRECTNESS_LABEL: Record<Correctness, string> = {
  correct: 'Correct',
  partially_correct: 'Partially correct',
  incorrect: 'Incorrect',
};

export const FAITHFULNESS_LABEL: Record<Faithfulness, string> = {
  supported: 'its claims are backed by its quotes',
  partly_supported: 'some of its claims go beyond its quotes',
  unsupported: 'its claims are not backed by its quotes',
};

export const PREMISE_LABEL: Record<Premise, string> = {
  handled: 'it caught the false premise in the question',
  not_handled: 'it missed the false premise in the question',
  'n/a': '',
};

export const COVERAGE_LABEL: Record<NonNullable<ShowcaseAnswer['coverage']>, string> = {
  full: 'The sources answer the question',
  partial: 'The sources answer part of the question',
  none: 'Not in the data',
};

export const ANSWERABLE_LABEL = {
  yes: 'The project data answers it.',
  partial: 'The project data answers part of it.',
  no: 'The project data does not answer it: a trap question, the right answer says so.',
} as const;

export const CATEGORY_LABEL: Record<string, string> = {
  why: 'A why question',
  'dated-fact': 'A date or a fact',
  identifier: 'A name or an identifier',
  'no-answer': 'A question with no answer in the data',
};

export const REASON_LABEL: Record<NonNullable<ShowcaseCitation['reason']>, string> = {
  'not-in-chunk': 'the quote is not in the cited source',
  'unknown-chunk': 'the cited source was not among those given to the model',
};

export const FAILED_TEXT = 'The model did not return a valid answer for this question. Nothing is shown in its place.';
