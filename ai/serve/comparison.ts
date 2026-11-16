/**
 * Which measured configurations the showcase comparison shows (phase 4, step 4.1; owner decision of 16 Nov 2026).
 *
 * Labels and descriptions are written for an outside reader (owner, 16 Nov 2026); the exact settings come from the
 * result files and are shown only behind "Exact settings". Two default columns: Sonnet at k=10 and the configuration the live chat serves. Everything else that was measured
 * and judged on the same 34 golden questions goes into the collapsed "more" section. Changing the served configuration
 * (phase 3 may still find a better local model) means editing this list and `ai/serve/config.ts` together; the export
 * test checks that exactly one configuration is served.
 */

export interface RunSource {
  /** Run name as written in the judged file. */
  run: string;
  answersFile: string;
  judgedFile: string;
}

export interface ConfigSource {
  id: string;
  label: string;
  description: string;
  group: 'main' | 'more';
  served: boolean;
  engine: 'cloud' | 'local';
  runs: RunSource[];
}

const R = 'ai/eval/results/';
const JUDGED_SONNET = `${R}2026-11-10-judged-golden-v1-4.json`;
const JUDGED_LOCAL = `${R}2026-11-11-judged-local-golden-v1-4.json`;
const JUDGED_TUNING = `${R}2026-11-11-judged-tuning-golden-v1-4.json`;
const JUDGED_PHASE3 = `${R}2026-11-16-judged-phase3-golden-v1-4.json`;

const run = (name: string, answersFile: string, judgedFile: string): RunSource => ({ run: name, answersFile: R + answersFile, judgedFile });

export const COMPARISON: ConfigSource[] = [
  {
    id: 'sonnet-k10',
    label: 'Cloud model: Claude Sonnet 5.5',
    description: 'Answers through the Anthropic API. The question is also translated to Polish to search the journal better. Reads the 10 best-matching passages.',
    group: 'main',
    served: false,
    engine: 'cloud',
    runs: [run('k10', '2026-11-10-answers-k10-golden-v1-4.json', JUDGED_SONNET)],
  },
  {
    id: 'local-served',
    label: 'Local model: Qwen 3.8, 27B, on one GPU',
    description:
      'What the assistant on this page uses. Runs entirely on the owner\'s own graphics card, with instructions written for local models and no cloud step at all. Reads the 10 best-matching passages.',
    group: 'main',
    served: true,
    engine: 'local',
    runs: [
      run('local-pb1', '2026-11-16-answers-k10-local-pb1-golden-v1-4.json', JUDGED_PHASE3),
      run('local-pb2', '2026-11-16-answers-k10-local-pb2-golden-v1-4.json', JUDGED_PHASE3),
    ],
  },
  {
    id: 'sonnet-k5',
    label: 'Cloud model, fewer passages',
    description: 'Claude Sonnet 5.5 reading the 5 best-matching passages instead of 10.',
    group: 'more',
    served: false,
    engine: 'cloud',
    runs: [run('k5-run1', '2026-11-10-answers-k5-golden-v1-4.json', JUDGED_SONNET), run('k5-run2', '2026-11-10-answers-k5-run2-golden-v1-4.json', JUDGED_SONNET)],
  },
  {
    id: 'local-p-a',
    label: 'Local model, same passages as the cloud model',
    description: 'Qwen 3.8 with the instructions for local models, given exactly the passages the cloud model read.',
    group: 'more',
    served: false,
    engine: 'local',
    runs: [run('local-p1', '2026-11-11-answers-k10-local-p1-golden-v1-4.json', JUDGED_TUNING), run('local-p2', '2026-11-11-answers-k10-local-p2-golden-v1-4.json', JUDGED_TUNING)],
  },
  {
    id: 'local-a',
    label: 'Local model, cloud instructions',
    description: 'Qwen 3.8 with the instructions written for the cloud model, given the passages the cloud model read.',
    group: 'more',
    served: false,
    engine: 'local',
    runs: [run('local-a1', '2026-11-11-answers-k10-local-a1-golden-v1-4.json', JUDGED_LOCAL), run('local-a2', '2026-11-11-answers-k10-local-a2-golden-v1-4.json', JUDGED_LOCAL)],
  },
  {
    id: 'local-b',
    label: 'Local model, cloud instructions, local search',
    description: 'Qwen 3.8 with the instructions written for the cloud model, on the fully local search.',
    group: 'more',
    served: false,
    engine: 'local',
    runs: [run('local-b', '2026-11-11-answers-k10-local-b-golden-v1-4.json', JUDGED_LOCAL), run('local-b2', '2026-11-11-answers-k10-local-b2-golden-v1-4.json', JUDGED_LOCAL)],
  },
  {
    id: 'local-a-think',
    label: 'Local model, thinking mode on',
    description: 'Qwen 3.8 allowed to reason before answering. Slower, no better in this test.',
    group: 'more',
    served: false,
    engine: 'local',
    runs: [run('local-a-think', '2026-11-11-answers-k10-local-a-think-golden-v1-4.json', JUDGED_LOCAL)],
  },
  {
    id: 'gemma-a',
    label: 'Second local model: Gemma 4, 26B',
    description: 'Another open model of similar size, with the instructions written for the cloud model.',
    group: 'more',
    served: false,
    engine: 'local',
    runs: [run('local-gemma-a', '2026-11-11-answers-k10-local-gemma-a-golden-v1-4.json', JUDGED_LOCAL)],
  },
  {
    id: 'local-s',
    label: 'Local model, sampling settings changed',
    description: 'Qwen 3.8 with only its sampling settings changed. No measurable difference.',
    group: 'more',
    served: false,
    engine: 'local',
    runs: [run('local-s1', '2026-11-11-answers-k10-local-s1-golden-v1-4.json', JUDGED_TUNING), run('local-s2', '2026-11-11-answers-k10-local-s2-golden-v1-4.json', JUDGED_TUNING)],
  },
  {
    id: 'local-l',
    label: 'Local model citing line numbers',
    description: 'Qwen 3.8 points at line ranges and code cuts the quote out. No invented quotes, but quotes get long.',
    group: 'more',
    served: false,
    engine: 'local',
    runs: [run('local-l1', '2026-11-11-answers-k10-local-l1-golden-v1-4.json', JUDGED_TUNING), run('local-l2', '2026-11-11-answers-k10-local-l2-golden-v1-4.json', JUDGED_TUNING)],
  },
];
