/** FakeJudge for tests: returns verdicts from a function, records every prompt it was given. */
import { judgeUserPrompt } from './prompt';
import type { Judge, JudgeInput, JudgeResult, Verdict } from './types';

export class FakeJudge implements Judge {
  readonly name = 'judge:fake';
  readonly prompts: string[] = [];
  constructor(private readonly verdictFor: (x: JudgeInput) => Verdict) {}
  async judge(input: JudgeInput): Promise<JudgeResult> {
    this.prompts.push(judgeUserPrompt(input));
    return { verdict: this.verdictFor(input), usage: { input: 10, cacheWrite: 0, cacheRead: 0, output: 5 }, costUsd: 0.001, ms: 2 };
  }
}
