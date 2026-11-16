/**
 * Which measured configurations the showcase comparison shows (phase 4, step 4.1; owner decision of 16 Nov 2026).
 *
 * Two default columns: Sonnet at k=10 and the configuration the live chat serves. Everything else that was measured
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
    label: 'Sonnet 5.5, k=10',
    description: 'Cloud generator on the phase 1 retrieval (question translated to Polish by Sonnet, hybrid search, rerank), 10 chunks.',
    group: 'main',
    served: false,
    engine: 'cloud',
    runs: [run('k10', '2026-11-10-answers-k10-golden-v1-4.json', JUDGED_SONNET)],
  },
  {
    id: 'local-served',
    label: 'qwen3.8:27b, local prompt, fully local',
    description:
      'The configuration the chat serves: local generator with the prompt written for local models (variant P) on the fully local retrieval (no cloud step), 10 chunks. Step 3.2.',
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
    label: 'Sonnet 5.5, k=5',
    description: 'Cloud generator on the phase 1 retrieval, 5 chunks.',
    group: 'more',
    served: false,
    engine: 'cloud',
    runs: [run('k5-run1', '2026-11-10-answers-k5-golden-v1-4.json', JUDGED_SONNET), run('k5-run2', '2026-11-10-answers-k5-run2-golden-v1-4.json', JUDGED_SONNET)],
  },
  {
    id: 'local-p-a',
    label: 'qwen3.8:27b, local prompt, phase 1 retrieval',
    description: 'Prompt written for local models (variant P) on the same chunk lists as Sonnet. Step 1.12.',
    group: 'more',
    served: false,
    engine: 'local',
    runs: [run('local-p1', '2026-11-11-answers-k10-local-p1-golden-v1-4.json', JUDGED_TUNING), run('local-p2', '2026-11-11-answers-k10-local-p2-golden-v1-4.json', JUDGED_TUNING)],
  },
  {
    id: 'local-a',
    label: 'qwen3.8:27b, base prompt, phase 1 retrieval',
    description: 'The Sonnet prompt on the same chunk lists as Sonnet. Step 1.11, variant A.',
    group: 'more',
    served: false,
    engine: 'local',
    runs: [run('local-a1', '2026-11-11-answers-k10-local-a1-golden-v1-4.json', JUDGED_LOCAL), run('local-a2', '2026-11-11-answers-k10-local-a2-golden-v1-4.json', JUDGED_LOCAL)],
  },
  {
    id: 'local-b',
    label: 'qwen3.8:27b, base prompt, fully local',
    description: 'The Sonnet prompt on the fully local retrieval. Step 1.11, variant B.',
    group: 'more',
    served: false,
    engine: 'local',
    runs: [run('local-b', '2026-11-11-answers-k10-local-b-golden-v1-4.json', JUDGED_LOCAL), run('local-b2', '2026-11-11-answers-k10-local-b2-golden-v1-4.json', JUDGED_LOCAL)],
  },
  {
    id: 'local-a-think',
    label: 'qwen3.8:27b, thinking on, phase 1 retrieval',
    description: 'Variant A with thinking mode. Step 1.11.',
    group: 'more',
    served: false,
    engine: 'local',
    runs: [run('local-a-think', '2026-11-11-answers-k10-local-a-think-golden-v1-4.json', JUDGED_LOCAL)],
  },
  {
    id: 'gemma-a',
    label: 'gemma4:26b, base prompt, phase 1 retrieval',
    description: 'Second local model, variant A. Step 1.11.',
    group: 'more',
    served: false,
    engine: 'local',
    runs: [run('local-gemma-a', '2026-11-11-answers-k10-local-gemma-a-golden-v1-4.json', JUDGED_LOCAL)],
  },
  {
    id: 'local-s',
    label: 'qwen3.8:27b, sampling change, phase 1 retrieval',
    description: 'Base prompt with changed sampling settings only (variant S). Step 1.12.',
    group: 'more',
    served: false,
    engine: 'local',
    runs: [run('local-s1', '2026-11-11-answers-k10-local-s1-golden-v1-4.json', JUDGED_TUNING), run('local-s2', '2026-11-11-answers-k10-local-s2-golden-v1-4.json', JUDGED_TUNING)],
  },
  {
    id: 'local-l',
    label: 'qwen3.8:27b, citation by line reference, phase 1 retrieval',
    description: 'The model cites line ranges and the quote is cut by code (variant L). Step 1.12.',
    group: 'more',
    served: false,
    engine: 'local',
    runs: [run('local-l1', '2026-11-11-answers-k10-local-l1-golden-v1-4.json', JUDGED_TUNING), run('local-l2', '2026-11-11-answers-k10-local-l2-golden-v1-4.json', JUDGED_TUNING)],
  },
];
