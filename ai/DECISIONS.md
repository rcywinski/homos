# AI layer decision log

Every decision about the AI layer from 12 Nov 2026 on, written for a reviewer who was not in the sessions. Newest
entries at the end. Plan and step state: `docs/AI-PLAN.md`; measured results and the write-up: `docs/AI-RAG.md` and
`ai/eval/results/`. This file is outside `docs/` and `journal/` on purpose: it is not part of the retrieval corpus, so
adding to it never changes the corpus hash (checked when the file was created: `8d7f9a3437b43594` before and after, the
same hash the plain index `ai/index/ollama-bge-m3.json` was built on).

Each entry: date, step, decision, alternatives considered and why rejected, evidence (commit, result file), what is
still open, review questions.

Sessions named below: the **analysis session** is the owner's chat session that advises on plan changes and
interprets results; **CC-Mac** is the Claude Code session on the Mac that writes the code, runs the evaluations and
commits; **CC-Win** is the Claude Code session on the Windows GPU box that operates the box.

---

## 2026-11-11, step 1.11: cloud vs local generator (backfill)

**Decision.** Keep Sonnet 5.5 as the answer generator; record the local generator (`qwen3.8:27b` on the RTX 3090
through Ollama) as measured and clearly weaker, not as a replacement. Gemma 4 26B-A4B ran once as a second local model.

**Alternatives.** A local model as the default generator (rejected: on the same chunks it scored fewer correct answers
beyond the run-to-run spread). Thinking mode for the local model (measured once, no gain, slower).

**Evidence.** Commits `d8463aa`, `9f46d78`, `fe0bb72`, `ed643c1` (merged to main). Report
`ai/eval/results/2026-11-11-local-compare-golden-v1-4.md`. Blind Opus judge, correct / partially / incorrect of 34:
Sonnet 20 / 12 / 2, Qwen A runs 13 / 16 / 5 and 12 / 15 / 7. Unverified quotes: Qwen 24 of 321, Gemma 18 of 67, every
one caught by the mechanical citation check. The local retrieval variant B looked better in one run and did not repeat.
Judge cost $3.18. The box lost power four times at its old GPU limit (348.6 W); all later runs ran at a 250 W limit,
recorded in every result file.

**Open.** Single runs for thinking and for Gemma. All local runs at 250 W, which lowers speed.

**Review questions.** Is the run-to-run spread from two runs enough to call a difference? Were the local and cloud
runs given the same chunk lists (saved in `ai/eval/results/2026-11-11-chunk-lists-k10-golden-v1-4.json`)?

## 2026-11-11, step 1.12: local generator tuning (backfill)

**Decision.** A prompt written for local models (variant P: explicit quoting rules and one worked example) is the
measured improvement; sampling changes alone (S) do nothing; citation by line reference (L) removes bad quotes but makes
quotes long. Recorded in the README row with the note that tuning and measurement used the same 34 questions.

**Alternatives.** Turning off the repetition penalty as the main fix (hypothesis: it hurts verbatim quoting; result:
no difference). Citation by reference as the default (rejected for now: 23 and 28 extracted quotes over 40 words).

**Evidence.** Commits `44acf93`, `f4f6801` (merged). Report `ai/eval/results/2026-11-11-tuning-compare-golden-v1-4.md`.
P: 16 / 13 / 5 and 16 / 11 / 7 correct / partially / incorrect, unverified quotes 3.4% and 3.9% against 9.2% and 7.0%
for the baseline, both beyond the spread. Judge cost $3.17.

**Open.** No held-out set: the P prompt was written once before any result, but its gain may be smaller on new
questions.

**Review questions.** Does the spread rule (gap between two-run ranges larger than the wider spread) hold up with only
two runs per variant?

## 2026-11-12, step 2.1: tool definitions (backfill)

**Decision.** Four read-only tools (`search_journal`, `read_decision_log`, `list_backtest_configs`,
`read_backtest_results`) with an own schema validator, a size cap on every result (12 000 characters; 36 000 for
search, measured so that k=10 is never cut), errors returned as tool results, results wrapped in `<tool_data>` as data.
`read_backtest_results` accepts only names from the listing and an optional path as an array of keys resolved through
own properties only. Every result starts with a field legend taken from the backtest scripts. The 72 result files are
restored locally from tag `journal-final` with `npm run ai:restore-results` and are not committed (owner decision,
option a).

**Alternatives.** Committing the 72 files (rejected by the owner: undoes the case-study cleanup in `021d445`). A
slash-joined path string (rejected by the owner: keys contain "±50%" and pair names may contain a slash). A validation
library (rejected: none in the project; the schema subset is small).

**Evidence.** Commits `348ce80`, `9c77f97`. Tests `ai/agent/tools.test.ts`.

**Open.** The legend marks some fields as undocumented (DefiLlama fields in e8-bench, rows of scan-universe).

**Review questions.** Can any input to `read_backtest_results` reach a file outside the listing? Does the overview of a
large file give the model enough to choose a path?

## 2026-11-12, step 2.2: agentic loop (backfill)

**Decision.** An own loop behind an `AgentModel` interface (a turn with tools or a final turn without tools); everything
specific to the Anthropic API stays in the Anthropic implementation. Sonnet 5.5, effort medium, at most 10 turns, a
repeated identical call is not run again, $0.50 spend cap per question including model calls inside tools. The final
answer carries phase 1 citations plus `dataRefs` for backtest numbers, both checked mechanically.

**Alternatives.** The SDK tool runner (rejected: beta, and the loop needs its own spend reserve, repeat detection and log
before each turn, plus a fake model for offline tests). Opus 5.5 as the agent (rejected: twice the price; Opus stays the
judge, so the judge is a different model).

**Evidence.** Commits `508b3bc`, `f978f29`. `ai/eval/results/2026-11-12-agent-manual-questions.md` (three manual
questions, one next to phase 1), `ai/eval/results/2026-11-12-agent-injection-probe.md` (2 of 2 passed). Step spend
$0.68 of $3.

**Open.** Over-searching: question (b) hit the spend reserve after nine turns, question (c) the step limit with a
search for "dummy". A verifier gap found and fixed in the run: a typographic minus (U+2212) was not read as a minus.
A bug found in 2.3: the new `npm run agent` entry had shadowed the old job runner; fixed by renaming the agent CLI to
`npm run agent:ask`.

**Review questions.** Is the spend reserve (room for one more turn and a final turn) too conservative or too loose? Is
the dataRefs check strict enough (rounding to the written decimals, value present in the answer)?

---

## 2026-11-12, process: analysis model changed

**Decision.** At about 11:00 on 12 Nov 2026 the analysis session's model changed from Fable 5.2 to Opus 5.5 (high
effort) because of a weekly usage limit. All decisions from the acceptance of step 2.3 onward were advised by Opus 5.5.
The owner plans a review of all work from this point by Fable 5.2 next week; this file exists for that review.

**Alternatives.** Pausing until the limit reset (not chosen by the owner).

**Evidence.** Owner's statement in the CC-Mac session on 12 Nov 2026. The CC-Mac session itself reports Opus 5.5 as its
model at the time of writing; the model behind its earlier turns is not recorded here.

**Open.** None.

**Review questions.** Do decisions advised by Opus 5.5 differ in kind from earlier ones (for example in how much is
accepted without a second run)?

## 2026-11-12, step 2.3: allowlisted job execution, accepted (`14fdfcd`)

**Decision.** `run_backtest` runs one allowlisted job per question in-process, only with `--jobs`. Owner decisions
taken with the plan: thinking summaries are logged from now on; `npm run agent` is the old job runner again and the
agent CLI is `npm run agent:ask`; `HOMOS_RESULTS_DIR` added to `backtest/walkforward.ts` and `backtest/funding-carry.ts`
(default path unchanged when unset, shown by running `funding-carry` both ways); an in-process runner instead of the
old `.agent/` queue; `run_backtest` exists only behind `--jobs`, so the 2.2 prompt and tools stay the 2.4 baseline; two
jobs to start; $2 budget. Decisions taken during the build: five of nine cached pools on the list (measured 39 to 154 s
for 20-day windows every 15 days); `windowDays / stepDays` at most 6; job ids from the code; numeric ranges removed from
the schema sent to the API (strict tool schemas reject them) and enforced by the own validator; the tool description
says a job runs today's code.

**Alternatives.** The old `scripts/agent-runner.ts` queue (rejected: it accepts free arguments from the job file and
uses a shell on Windows). Changing the backtest scripts' output in another way, such as running in a copied tree
(rejected: more moving parts than one environment variable). Allowing all nine cached pools with a longer timeout
(rejected: the slowest took 915 s at the mildest window/step ratio and up to 4.4 GB of memory). Exposing `WF_SET` (the
14 strategy sets of `walkforward.ts`) as an argument (not done: scope; the job runs the default set).

**Evidence.** Commit `14fdfcd`. `ai/eval/results/2026-11-12-agent-job-manual-run.md` (one real job, walk-forward on
Optimism WETH/USDC 0.30%, 20 / 5, 107.7 s, 21 of 21 numbers verified, saved results unchanged byte for byte),
`ai/eval/results/2026-11-12-agent-jobs-probe.md` (2 of 2 passed on the final tool description; the model never called
`run_backtest`, nothing outside the schema reached approval, the trap runner was never reached). Tests
`ai/agent/jobs.test.ts` (no shell, minimal environment, timeout, output caps, lock, saved-results check). Timing table
in the step 2.3 report and in `ai/agent/jobs.ts`. `funding_carry` with `BENCH_APR=3.8` reproduces the saved
`e8-carry-ETHUSDT-30d.json` byte for byte. Step spend $0.37 of $2.

**Open.**
- The approval prompt has not yet been answered by a human: the manual run used `--yes-jobs` because the CC-Mac session
  has no terminal. The owner will run one job interactively (first answering n, then y).
- Over-reading: in the manual run, steps 5 to 9 reread fields already returned in steps 3 and 4 (and the job's own
  output already held the table), so the run ended at the step limit.
- Reasoning tokens are 0 in most tool turns at effort medium, so the logged thinking summaries cannot explain the
  over-reading or the "dummy" searches.
- Walk-forward on today's engine does not reproduce the saved files: on Base WETH/USDC 0.30%, 45 / 15, the strategies
  and win rates match the saved `-kanon` file, but passive ±50% has mean -0.736 against -0.707. The saved file came from
  an older engine version (it lacks the `apr*` and `recent90` fields).
- Four of nine cached pools are excluded by the 15-minute limit, among them the main Base and Arbitrum WETH/USDC 0.05%
  pools.
- The manual answer stated gate thresholds (win rate 65, worst window -3, two regimes) without a citation. They came
  from the job's stdout tail ("CRITERION for a sound algorithm ...") and the legend, which are not citable sources under
  the current rules, so the check listed 65 and -3 among numbers without a quote or reference.
- Display check, 12 Nov: some lines in the manual run trace looked doubled. Checked against the run log (one event per
  step, nine tool calls, 21 distinct dataRefs) and the saved output: no line is printed twice. What can look doubled:
  long lines wrapped onto a second line by the CLI (every dataRef line is wrapped because the run result name is long),
  and step 9, a real second read of `winPct` that step 4 had already returned (over-reading, not a display bug).
- Owner's interactive runs, 12 Nov from about 10:14 UTC (observed read-only by CC-Mac, nothing touched): one job
  (`j20261112T101440n1`, Arbitrum WETH/USDC 0.30%, 25 / 10) was interrupted after three windows; it left a lock file
  with a dead process id and a job directory without a result. The next run removed the stale lock by itself and
  started its own job. Not yet checked: whether interrupting the CLI can leave the backtest child process running.

**Review questions.**
- Can any value written by the model reach the command line, the environment or a file path of a job?
- Is the five-pool list still the right cut when the timeout or the hardware changes?
- Should the tool result of `run_backtest` carry the job's stdout tail at all, given that it contains numbers the model
  cannot cite?
- Should legend text and job output become citable (for example the gate criteria), or should the agent be told to cite
  the decision log for them?

## 2026-11-12, step 2.4 pre-check: interrupting the CLI left the job running (fixed, `d2423e3`)

**Decision.** A job now starts as the leader of its own process group, and the runner kills the whole group at the
timeout, on SIGINT, SIGTERM or SIGHUP to the agent process, and when the agent process exits; the lock is removed on
the way out and the signal is raised again so the process ends as it normally would.

**Alternatives.** Killing only the direct child (the previous code: the job runs as tsx, which starts a second node
process, so the grandchild could survive). Relying on the terminal's Ctrl+C reaching the whole group (true for Ctrl+C,
not for `kill <pid>` of the CLI).

**Evidence.** Before the fix, a driver running the fixture job through the real SpawnRunner with the tsx prefix was
killed with SIGTERM and with SIGINT sent to the driver alone: in both cases the job processes kept running (cleaned up
by hand). After the fix the same check left no job process and no lock. Tests in `ai/agent/jobs.test.ts`: SIGTERM and
SIGINT to the CLI process alone, SIGINT and SIGHUP to the CLI's process group (a terminal's Ctrl+C or hangup), and a
timeout under the tsx prefix; each checks that the job's node process is gone and the lock removed.

**Open.** SIGHUP sent to the tsx wrapper alone is not relayed by tsx (it relays SIGINT and SIGTERM only); a closing
terminal signals the whole group, so this case is not a real one and is not tested.

**Review questions.** Can the group kill reach a process that is not the job's (process id reuse between the job's end
and the final kill)? Is SIGTERM then SIGKILL after 5 s right for a job killed mid-write?

## 2026-11-12, step 2.4: evaluation plan approved (owner)

**Decision.** 18 tasks, 3 per category: journal only, decision log, saved backtest numbers, journal plus backtest, tasks
that need a job, false premise or unanswerable. Variants: A, the 2.2 prompt at effort medium, two runs; B, the 2.2 prompt
plus five sentences written once before any evaluation run, two runs; C, the 2.2 prompt at effort high, one run, same
$0.50 cap per question. Spend cap for the step: $25. Job tasks run unattended with `--yes-jobs`. Blind owner grading of
about 6 answers, chosen by a rule fixed in code before the runs. Results are reported for the whole set first; with 3
tasks per category one task is 33 points, so per-category numbers are shown but not compared. Redundant reads whose path
is later used in a dataRef of the same answer are reported separately (the owner's hypothesis from the manual runs: the
model rereads a field because it wants a path to cite).

**Alternatives.** More runs per variant (rejected for cost; two runs give a spread for A and B). Testing effort high on
the B prompt as well (not chosen: C isolates the effort question on the unchanged prompt).

**Evidence.** Owner's approval in the CC-Mac session, 12 Nov 2026. Plan text in the step 2.4 report.

**Open.** Everything; nothing has run.

**Review questions.** Is one run of C enough to say anything about effort? Is a set of 18 tasks enough to separate A
from B beyond the run-to-run spread?

## 2026-11-12, step 2.4: variant B written before any run; legend text becomes citable

**Decision.** Variant B (`AGENT_SYSTEM_B` in `ai/agent/prompt.ts`) is the 2.2 prompt plus five sentences and nothing
else: a stopping rule; never request a value already received, read a whole object once instead of field by field;
every call must look for something not yet in hand; (a) a number inside a result already read is covered for its
dataRef by that read's path; (b) a threshold or definition taken from a result's legend is backed by a citation with
chunkId `legend:<result name>` and a verbatim quote from that legend, or by the decision log or journal if they state
the same rule. For (b) the verifier now accepts legend citations: the legend of every result read in the run is a
pseudo-chunk, checked like any other quote. This is a change to the shared checker, so it applies to every variant, but
only B is told about it.

**Alternatives for (b).** Require the answer to say that a threshold comes from the legend, without a citation
(rejected: not mechanically checkable, so it would not move the "numbers without a quote or reference" measure in a
verifiable way). Make the job's stdout tail citable too (rejected: numbers must come from a read of the result file, so
they carry a path; the stdout tail stays data only).

**Evidence.** `ai/agent/prompt.ts` (`B_ADDITIONS`, `AGENT_SYSTEM_B`), `ai/agent/verify.ts` (`citationPool`), tests in
`ai/agent/run.test.ts` (B is A plus exactly the five sentences; legend quote verified; a quote not in the legend fails; a
legend of a result not read is unknown). Committed before any evaluation run.

**Open.** The legend is text written in this repository from the backtest scripts, not a project source from 2026; a
legend citation is weaker evidence than the decision log, which is why B prefers the decision log or journal when they
state the same rule.

**Review questions.** Was B written before any evaluation result (check the commit order)? Does making legends citable
for all variants change A's measures compared with 2.2?

## 2026-11-12, step 2.4: task set and reference numbers prepared for review

**Decision.** The 18 tasks are in `ai/eval/agent-tasks.jsonl`, with the reference answer, the required sources
(acceptable chunk ids per group, result names and paths, the required job) and the expected tools; a readable copy for
the owner's review is `ai/eval/agent-tasks-review.md`. The development questions of 2.2 and 2.3 are listed in
`ai/eval/agent-tasks-dev.json` and excluded. References come from the files: journal and decision log text, saved result
files, and for the three job tasks, reference runs (`ai/eval/agent-refs.ts`: each job twice through the real
SpawnRunner in a temporary directory, outputs compared byte for byte; first output kept in `ai/eval/agent-refs/`).

**Choices inside the set.** The v1.2 claim of the decision log (73% / -2.88 and 81% / -2.74 on base-030) was a candidate
for a journal plus backtest task but no saved file holds those numbers, so it was dropped; the v1.1 claim (68%, -2.52)
matches the canonical 45-day base-005 file and is used instead. The GM-BTC/USD task (x-03) expects the answer to notice
that the saved file differs slightly from the journal's 7 Sep numbers (2.35 against 2.30 per window, 93.9% against 91%),
explained by the price-data fixes the journal records on 9 Sep. The 720-day task (p-02) expects the answer to say the job
cannot run and to report the saved 720-day result. The excluded-pool task (p-01) expects the answer to say the job
cannot run and to label any saved alternative as a different setting. The strategy in p-03 ("passive ±20%") exists in no
saved file (checked across all 72).

**Open.** The owner's review of the set; nothing else runs until he approves it.

**Review questions.** Are the acceptable chunk ids too narrow (a correct answer citing another chunk with the same fact
counts as a missing required source)? Are the job references stable on another machine or Node version?

## 2026-11-12, step 2.4: task set approved; rules for the comparison (owner)

**Decision.** The task set is approved as prepared (the analysis session spot-checked p-03, d-01 and d-02 against the
files). Before the runs, two pieces of metadata were added for the judge only: an answerable label (`partial` for p-01
and p-02, `no` for p-03, `yes` otherwise), which selects the premise grade of the 1.9 rubric, and a note for p-02 in
the style of p-01 and p-03 (the judge sees notes for partial and no tasks, as in 1.9). Owner answers to the four review
questions:
- An unrequested job in p-01 or p-02 is counted in a separate "unneeded job" counter per variant, not as a missing
  required source; the judge scores the content as usual.
- The accepted chunks stay narrow. After all runs and before any comparison, one pooled list of every "required source
  missing" case from all variants together, with the cited chunks, goes to the owner; a chunk is added only if reading
  it shows it answers the question. Results are reported before and after that review. (The lesson from the phase 1
  selection bias: the accepted set is revised once, for all variants together, not per variant after seeing scores.)
- x-02 stays as it is.
- The required source of x-03 does not include the legend. Legend citations are a separate measure and an intended
  effect of prompt B, since only B is told the legend is citable.

Run order A1, B1, C, A2, B2, then the judge, within $25. The blind grading file for the owner is prepared before any
judge verdict is shown. Blind sample rule, fixed in `ai/eval/agent-judge.ts` before any run: one answer per category; in
each category the task with the smallest sha256("agent-blind-v1|<category>|<task id>"); runs rotate over the categories
as A1, B1, C, A2, B2, A1. Every evaluation run uses its own empty job directory (`ai/agent/runs-eval/<run>/`), so no run
sees another run's job results.

**What the judge sees.** The 1.9 judge prompt and rubric unchanged. Evidence is every citation with file and lines (a
legend citation as "legend of <result>") and every dataRef as "result <name>, path [...]" with the value found at that
path in the data the run read, or a note that no such value was read. Not the run, variant, prompt, effort, steps or
verification status.

**Evidence.** `ai/eval/agent-run.ts`, `ai/eval/agent-measures.ts`, `ai/eval/agent-judge.ts`, tests in
`ai/eval/agent-eval.test.ts`; committed before the first evaluation run.

**Open.** The runs, the judge, the pooled review of missing required sources, the owner's blind grading.

**Review questions.**
- The reference answers were written by an Opus 5.5 session and the judge is Opus 5.5, so the judge may favour answers
  worded like the references. The owner's blind grading partly checks this.
- Showing the judge the stored value of each dataRef gives it a mechanical lookup the 1.9 judge did not have for quotes.
  Does that make faithfulness easier to earn for numbers than for text?

## 2026-11-12, step 2.4: judge reserve added to the run budget guard (during run A1)

**Decision.** The evaluation runs stop when the next question could take the step spend above $21, keeping $4 of the
$25 cap for the judge. Changed in `ai/eval/agent-run.ts` while run A1 was going (A1 itself ran with the old guard; B1
onward load the new one). Nothing about the measures, prompts or tasks changed.

**Why.** The first five A1 tasks cost $0.07 to $0.31 each (four of them stopped by the per-question spend reserve), so
five runs of 18 tasks could use nearly the whole cap and leave nothing to judge them.

**Alternatives.** Keep the old guard and judge whatever money is left (rejected: an evaluation without a judge has no
correctness measure). Stop and ask the owner (not done: the change only protects the cap the owner set; if the reserve
cuts the last run short, that is reported).

**Open.** If B2 is cut short, the comparison has fewer B answers; reported with the results.

**Review questions.** Was changing the guard mid-evaluation acceptable, given that it cannot change any answer, only
where the runs stop?

## 2026-11-16, step 2.4: owner blind grading, how it was done

**Decision.** The owner graded the six blind items in `ai/eval/review/blind-2.4.md` on 16 Nov without opening the key
or the judge file. The analysis session (Fable 5.2) did the mechanical part for each item: which reference points the
answer contains, and which numbers and claims have an evidence line. The owner chose both grades himself; the analysis
session suggested no grades. Faithfulness rule, stated by the owner at B02 and kept for all six: supported only when
every claim is covered. At B05 he first leaned to supported, was shown that B01 to B04 used the stricter rule, and chose
partly_supported for consistency. At B01 he lowered correctness because the agent ran a 365-day job nobody asked for.
The procedure and English glosses of his Polish notes are in `ai/eval/review/blind-2.4-record.json`.

**Alternatives.** As in 1.9, the owner compares every number himself (declined: he did not want to check percentages
one by one). The analysis session proposes grades and the owner confirms them (not done: that would grade the judge
against a second model, not against the owner).

**Evidence.** Agreement with the judge: correctness exact 5/6, within one step 6/6; faithfulness exact 6/6. The one
disagreement is B01 (p-02, run A1): owner partially_correct, judge correct. Report:
`ai/eval/results/2026-11-16-agent-eval-report.md`.

**Open.**
- All six faithfulness grades are partly_supported, from both the owner and the judge, so the sample calibrates
  correctness more than faithfulness. Faithfulness agreement of 6/6 says little about the judge's line between supported
  and partly_supported.
- Leak: B06 (t-02, run B2) shows a legend citation ("legend of ..."), and only variant B is told legends are citable,
  so that item was not fully blind to the variant. The analysis session's earlier check missed it: it searched for
  "legend:" while the file says "legend of". The blind file builder does not hide legend citations.

**Review questions.**
- The analysis session marked which claims have evidence lines and the owner graded from that. How much of the
  faithfulness agreement is the analysis session's reading rather than the owner's?
- The judge did not lower correctness for the unrequested job in B01; the rubric does not mention unrequested actions.
  Should the rubric for agent answers grade actions, or should that stay with the unneeded-job counter only?

## 2026-11-16, step 2.4: pooled review of missing required sources (owner)

**Decision.** Both chunks are accepted, for all variants at once: `docs/ALGORITHM.md:43` for x-01 and
`journal/CONTEXT.md:2178#p3` for x-02. They are added to the task's chunk group in the scoring only
(`ACCEPTED_AFTER_REVIEW` in `ai/eval/agent-score.ts`); `ai/eval/agent-tasks.jsonl` stays as it was when the runs were
made, so the "before" measure can be recomputed. M01 stays a miss: it lacks the required dataRefs, not a chunk.

**Evidence.** Required sources met, before and after: A1 18 and 18, A2 17 and 17, B1 16 and 18, B2 16 and 16, C 18
and 18 (85 and 87 of 90). After the review three cases remain, not one: M01 (B2 x-01, dataRefs: the answer read the
right path but cited it as `["winPct"]` instead of `["summary", "<strategy>", "winPct"]`, so all 12 of its dataRefs on
that file fail with no-call), M03 (A2 x-02, no citation at all, only dataRefs) and M05 (B2 x-02, only a legend
citation). Neither accepted chunk appears in M03 or M05. A recomputation of the stored "before" measure from the stored
calls and verification matches all 90 rows (checked in the scoring script).

**Open.** The owner's message expected only M01 to stay; M03 and M05 also stay because they cite neither accepted chunk.

**Review questions.** M05 cites the legend for the soundness criterion, which the x-02 decision excluded from the
required source. Should a legend citation count for the criterion part of x-02 in a later evaluation?

## 2026-11-16, step 2.4: rule for "exceeds the spread"

**Decision.** Written in `ai/eval/agent-score.ts` before the comparison table was read: B vs A exceeds when the
difference of the two-run means is larger than both run-to-run spreads |A1-A2| and |B1-B2|; C (one run) exceeds when it
lies outside A1..A2 by more than |A1-A2|. Per-category numbers are shown, not compared.

**Alternatives.** A statistical test per measure (rejected: two runs of 18 tasks give no usable variance estimate).

**Open.** With a spread of 0, a difference of one answer counts as exceeding (C on supported, partly_supported).

**Review questions.** Is "larger than both spreads" too lenient when one variant happens to have a small spread?

## 2026-11-16, step 2.4: results accepted; prompt A stays the default (owner)

**Decision.** Prompt A stays the agent's default. Prompt B is documented as a measured variant: it halves redundant
calls and adds legend citations, but steps, normal endings and correctness do not improve, and a run costs about 20%
more. No further prompt revisions on these 18 tasks: that would tune on the measurement set.

**Alternatives.** Make B the default for its fewer redundant calls (not chosen: the saving does not show in steps or
cost, and correctness is at the ceiling). Revise B and rerun (rejected: tuning on the measurement set). Effort high
(C) as the default (not chosen: one run; it stopped on the spend guard less often, nothing else beyond the spread).

**Evidence.** `ai/eval/results/2026-11-16-agent-eval-report.md`: redundant calls 25 and 17 (A) against 11 and 12 (B),
legend citations 0 against 8 and 10, cost per run $2.80 and $2.51 against $3.06 and $3.33 at the corrected Sonnet
price (entry below), correct answers 17 and 16 against 17 and 17.

**Open, stated plainly in the write-up.**
- Only 6 to 8 of 18 tasks end with a normal answer; the limits do the stopping (over all 90 answers: 34 answered, 9
  stopped after a repeated call, 21 at the step limit, 26 by the spend guard).
- Correctness is at the ceiling (16 to 17 of 18), so the set does not separate the variants.
- The judge rubric scores content only, not actions: the B01 disagreement (an unrequested job) is outside its reach.
- Faithfulness does not discriminate: 87 of 90 answers are partly supported (17 or 18 of 18 in every run), and all six
  blind items were partly supported for both the owner and the judge.
- The per-question spend guard fires early. Before each tool turn it keeps room for the next turn and a final turn,
  each priced at the full 8 000 output tokens, with new text as cache writes and, in job tasks, the whole history as a
  cache write (as if the cache had expired during the job). 26 of 90 runs stopped on it, while no task cost more than
  $0.32 as recorded ($0.29 at the corrected price) of the $0.50 cap.
- C is a single run.
- The reread hypothesis (the model rereads a field to get a path for its dataRef) is consistent with the data but
  unresolved: 16 and 6 such rereads in A, 4 and 5 in B, inside A's spread.
- Job input data exists only on the owner's Mac.

**Future directions, listed, not built.** A stopping rule in the loop code instead of the prompt; a harder task set;
a spend guard priced from measured cache rates; the same agent with a local model through Ollama.

**Review questions.** Is "no prompt revision on the measurement set" compatible with keeping A, which was itself
written in 2.2 before this set existed? Should the next task set be built so that correctness is not at the ceiling?

## 2026-11-16, billing check: Sonnet 5.5 cache reads were priced at twice the real price

**Decision.** `ai/context/pricing.ts` priced Sonnet 5.5 cache reads at $0.20 per million tokens. The pricing page
(checked 16 Nov 2026) lists $0.10 (0.05x the $2 input price); Opus 5.5 ($0.20) and Haiku 5.5 ($0.01) were right. The
price is corrected in code. Saved result files keep the cost recorded at the time; the write-up and the step 2.4 report
give the corrected figures, recomputed from the saved token usage.

**Evidence.** The owner's Console shows $35.74 spent in November and a 91% cache hit rate; the step reports add up to
about $39. Recomputed from every saved usage record (context runs, answers, judges, agent logs and evaluation runs):
$38.58 at the old price, $35.51 at the corrected one. The difference, $3.07, is cache-read tokens (60.9 million, of
which Sonnet 30.7 million) times $0.10 per million on the Sonnet share: contexts in step 1.7 (overstated by $1.54),
the agent in steps 2.2 and 2.3 including the owner's runs ($0.12), and the step 2.4 runs ($1.41). The cache hit rate
matches: cache reads over cache reads plus uncached input are 60.9 / (60.9 + 5.7) = 91%. The remaining $0.23 (0.6%) is
not in any saved file; known unsaved calls are the live `npm run ask` checks of step 1.10 and development calls, not
itemised.

Corrected figures: steps 1.7 to 1.9 $11.94 (was $13.49); Sonnet contexts $6.76 (was $8.29); step 2.4 runs $14.34 (was
$15.75), step 2.4 with the judge $16.05 (was $17.45).

**Alternatives.** Rewriting the saved result files with corrected costs (rejected: they record what the code computed
at the time; the correction is applied where figures are reported). Leaving the overstatement (rejected: the owner
asked for no rounding in our favour, and an overstated cost is still a wrong figure).

**Open.** The spend caps of every run were computed with the old price, so they were stricter than intended; no
result depends on that except where the step 2.4 spend guard stopped a run.

**Review questions.** Should a price table be checked against the provider's page at the start of every step that
spends money?

## 2026-11-16, phase 2 merged into main (owner)

**Decision.** With the owner's approval, `ai-layer` was merged into `main` with a merge commit (`add30df`, no fast
forward, no history rewritten, no force push) after step 2.4 was ticked (`2280149`). The merge brings steps 2.1 to 2.4:
the tools, the loop, allowlisted jobs, the evaluation and the write-up. Before the merge the "In short" summary of
`docs/AI-RAG.md` gained the step 1.12 result with the prompt written for local models (16 and 16 of 34 correct, tuned
and measured on the same 34 questions), matching the README.

**Alternatives.** A fast-forward merge (not used: the earlier phases were merged with merge commits, so each phase
stays one visible merge on `main`).

**Evidence.** `git log --first-parent main`; CI status of the push is reported to the owner in the CC-Mac session.

**Open.** Phase 3 is optional; nothing is marked NEXT in `docs/AI-PLAN.md`.

**Review questions.** None.

## 2026-11-16, phase 3 "local models" planned (owner)

**Decision.** Phase 3 is five steps, written into `docs/AI-PLAN.md` as 3.1 to 3.5: speed at full power (3.1), prompt P
in the fully local pipeline (3.2), Gemma 4 26B-A4B with prompt P (3.3), new models from the current Ollama library
(3.4), and the agent on a local model (3.5). Spend cap for the phase: $10. Common rules: variant A uses the saved k=10
chunk lists; the 1.11 verifier and blind Opus judge; two runs for anything compared, single runs marked; per-second
power and temperature log on the box with an alert at 85 C or on a missing sample (the 250 W cap is gone since 13
Nov); no retries on a network error; every model unloaded after every run; nothing deleted from the box without
asking; prompts P and A not revised in this phase. Each step is reported and waits for the owner's OK; nothing is built
or pulled before that.

Choices made in planning (CC-Mac), for the owner to confirm:
- 3.2 uses the saved variant B chunk lists rather than retrieving again: the B lists of 1.11 runs B1 and B2 are
  identical (checked), so the generator and prompt are the only change against B1 and B2, and the embedder and
  reranker need not share the GPU with the generator.
- Estimated spend: judge about $0.016 per answer (step 1.11: $3.18 for 204), so 3.2 and 3.3 about $1.06 each, 3.4
  about $2.10 for up to three candidates plus a second run, 3.5 about $0.70 for 36 agent answers plus about $0.20 of
  Sonnet query translation inside `search_journal`; about $5 in all. A phase spend guard, like the step 2.4 one, counts
  every phase 3 result file before each judged answer.

**Ollama documentation, checked 16 Nov for 3.5** (docs.ollama.com: tool calling, structured outputs, thinking, `/api/chat`):
- Tools: `tools` in `/api/chat`; the reply has `message.tool_calls` with `function.name` and `function.arguments` (an
  object); several calls per reply are possible. Results go back as `role: "tool"` messages matched by tool name. There
  are no tool call ids.
- Tools with thinking: the examples pass `think: true` together with `tools`, and the streaming example returns the
  thinking, content and tool calls of a turn in the next request. No rule beyond the examples.
- Tools with structured output (`format`): not documented anywhere, neither in the tool-calling page, the structured
  outputs page nor the `/api/chat` reference. Whether `format` is enforced while `tools` are offered has to be tested.
- No `tool_choice`: a turn cannot forbid or force tools; a final turn can only leave `tools` out.
- No statement on how `format` is enforced (the examples validate the output afterwards) or on context overflow (the
  only text is the `num_ctx` definition; step 1.11 found that an over-long prompt is truncated silently).

What does not map onto `AgentModel` as it stands, to be resolved in the 3.5 plan:
- tool call ids (the loop's replies carry an id): the Ollama implementation must keep the order of calls itself;
- the final turn's `tool_choice: none`: replaced by a request without `tools` and with `format`;
- a tool turn that answers instead of calling a tool: with Sonnet the answer schema applies to every turn; with Ollama
  `format` plus `tools` in one request is untested;
- prompt caching and the spend estimate: no cache and no cost, so the estimate is 0 and the per-question cap only
  counts the Sonnet query translation inside `search_journal` (a cloud call inside an unchanged tool, so the "local"
  agent is not fully local);
- reasoning token counts: Ollama reports only `eval_count`, thinking included;
- context length: the largest prompt per task in Sonnet runs A1 and A2 was 48 554 tokens at the median and 97 044 at
  most (Claude's tokenizer); 29 of 36 tasks would not fit `num_ctx` 24 576 with 8 000 tokens kept for output, the
  practical ceiling of the box with the reranker loaded (step 1.11). `search_journal` needs the reranker and the
  embedder on the same GPU during the run. An over-long prompt has to stop the run loudly (token count before each
  call, as in `ai/answer/local.ts`), never be truncated.

**Alternatives.** Retrieving variant B again in 3.2 (not chosen: identical lists already saved). Starting 3.5 with a
larger context through KV cache quantization on the box (not decided: a box setting that changes memory for every
model; to be proposed in the 3.5 plan with measurements, if at all).

**Open.** The candidates of 3.4 (checked at that step, since the library changes); the context-length decision of 3.5.

**Review questions.** Is a local agent whose `search_journal` still calls Sonnet for query translation a fair "local
agent"? Should 3.5 measure on fewer tasks than 18 if most of them cannot fit the context?

## 2026-11-16, steps 3.1 to 3.3: results (run without stopping, owner's instruction)

**Decision.** The owner approved the phase plan and asked for 3.1, 3.2 and 3.3 in one go, stopping only on a failed
check, an unresponsive box or a temperature alert. None happened. Code changes for these steps: the result files now
record the box without a power cap (`BOX` in `ai/eval/answers.ts`); Gemma accepts prompt P (only the system prompt
changes, since its card sampling already has every repetition penalty off; the longest P prompt is 15 084 tokens by
Gemma's tokenizer, so `num_ctx` 17408 still holds it); a phase 3 judge set with a spend guard that limits every judge run
to what is left of the $10 phase cap (`ai/eval/judge.ts`); the report `ai/eval/phase3-compare.ts`. Box figures are
CC-Win's, copied per run into `ai/eval/results/2026-11-16-box-log-phase3.json`.

**Evidence.** `ai/eval/results/2026-11-16-phase3-compare-golden-v1-4.md`.
- 3.1 (single run, not judged): with the same settings, chunk lists and prompt token counts as 1.11 A1, decode median
  79.9 tokens per second against 60.2 and 60.5 at 250 W; latency median 9.9 s against 12.4 and 12.8. Peak 410.8 W, max
  71.6 C, peak VRAM 20 191 MiB with the reranker.
- 3.2: prompt P on the B lists gives the fewest bad quotes measured for a local model (1/94, 1/92), beyond the spread
  against both B (4/62, 6/58) and P on A (3/87, 3/77). Correctness does not move beyond the spread (correct 16 and 18
  against 17, 17 and 16, 16).
- 3.3: Gemma with P has 11/87 and 11/88 bad quotes against 18/67 in its 1.11 run, fewer long quotes (2, 0 against 7),
  all three unanswerable questions labelled `none` (2/3 before), and fewer correct answers (10, 12 against 14).
- Whole batch on the box: 1821 samples, no gap, no alert, peak 419.2 W, max 72.7 C, peak VRAM 20 555 MiB.
- Judge spend: $2.07 of the $10 phase cap.

**What the single Gemma run of 1.11 allows.** Nothing about correctness: with no second run, its own spread is
unknown, and against the spread of Gemma P (correct 10 to 12, 7 per-question changes between its two runs) the 1.11
run's 14 is 2 above the range, which equals the range's width, and it differs from each P run on 10 and 8 questions,
near that spread. The quote error rate (26.9% against 12.6% and 12.5%) halves (14.3 and 14.4 points), larger than any change
between two runs of one setting so far (at most 6.0 points: Qwen S1 4.4% against S2 10.4%), so it is consistent with a real gain from P; but the
two-run rule cannot confirm it without a second Gemma A run.

**Alternatives.** A second Gemma A run with the Sonnet prompt to give 1.11 a spread (not done: not in the approved plan;
about $0.53 of judging, proposed to the owner).

**Open.** The comparison runs of 1.11 and 1.12 were at 250 W and 3.2 and 3.3 at 420 W. Power changes speed, not the
sampling settings, so the quality comparison is assumed unaffected; speed is compared only within the same power.
One Gemma P answer needed the one structured-output retry the generator allows (not a network retry).

**Review questions.** Is "consistent with a gain" a fair reading for the Gemma quote rate, given one 1.11 run? Should
P become the default prompt for any local generator, given 3.2?

## 2026-11-16, step 3.4: candidate list proposed, nothing pulled

**Decision (proposal, waiting for the owner).** Candidates from the Ollama library (checked 16 Nov) that fit the 24 GB
card at Q4 with the reranker stopped during generation, each with prompt P, one run, a second run for the best:
- **Muse Glimmer 30B** (`muse-glimmer:30b`, Q4_K_M, 18 GB; Meta; Apache 2.0; dense, 28B text decoder plus a 2B vision
  encoder; source huggingface.co/meta-models/Muse-Glimmer-30B). Risk: its architecture reached llama.cpp on 10 Aug
  2026, so the box's Ollama 0.40.15 may not load it; an Ollama upgrade would change the runtime under every earlier
  local result and is for the owner to decide.
- **Gemma 4 31B** (`gemma4:31b-it-q4_K_M`, 20 GB; Google DeepMind; Apache 2.0; dense). Tight: 20 GB of weights plus the
  KV cache at `num_ctx` 17408; full GPU placement is checked from the server log before the run, and the run does not
  start if any layer is on the CPU.
- **gpt-oss 20B** (`gpt-oss:20b`, 14 GB; OpenAI; Apache 2.0 as released, not shown on the Ollama page and not rechecked today; MoE). A third family, and the
  one listed with the strongest tool use, which matters for 3.5. Polish ability unknown.
Rejected for the list: older or English-centric 24B to 35B models (Mistral Small, OLMo, Qwen 3.5 and 3.6, which 3.8
replaces). Estimated judge cost: four judged runs, about $2.10.

**Open.** The owner's approval of the list and of any Ollama upgrade.

## 2026-11-16, step 3.4 approved; showcase configuration (owner)

**Decision.** The 3.4 list is approved: Muse Glimmer 30B, Gemma 4 31B, gpt-oss 20B. The gpt-oss licence is confirmed
from its model card before the pull, with the source recorded. Order: Gemma 4 31B and gpt-oss 20B first, on the
current Ollama; Muse Glimmer last. An Ollama update is allowed only if Muse Glimmer cannot load on the current
version. If the box is updated: both versions are recorded, and one control run of Qwen with the exact 3.2 settings
(prompt P, the saved B lists) is compared with the two 3.2 runs, reporting whether it falls inside their spread. The
showcase chat will run on this box, so the Ollama version in use must be the one its numbers come from. No second Gemma
26B run with the Sonnet prompt.

**Showcase chat configuration.** Qwen3.8 27B with prompt P on fully local retrieval (variant B: meta-index plus
rerank, no query translation): 16 and 18 of 34 correct, 1 of 94 and 1 of 92 quotes unverified (step 3.2), unless 3.4
finds a better model beyond the spread. A second session (CC-App, worktree on branch `app-chat`) builds the phase 4
showcase and reads the 3.2 result files for its comparison view, so `ai-layer` is pushed now.

**Evidence.** `ai/eval/results/2026-11-16-phase3-compare-golden-v1-4.md`, step 3.2.

**Open.** Step 3.4 results; the 3.5 plan.

**Review questions.** Is "better beyond the spread" on 34 questions with two runs a strong enough bar to change the
showcase model?

## 2026-11-16, process: lists through shell variables run from bash script files (owner)

**Decision.** New rule in `CLAUDE.md` (code rules): any loop or command that passes a list through a shell variable
runs from a bash script file, never inline in zsh.

**Why.** zsh does not split an unquoted variable into words, so a list passed through a variable arrives as one
argument. This hit three times: in step 1.7 six context rows ran silently as the plain vector baseline (the variant
options passed as one word); in step 1.9; and in step 3.4, where a download loop with `set -- $spec` created three
wrongly named directories holding 404 pages instead of the tokenizer files (seen at once from the 404 codes, removed,
and the download repeated in bash).

**Alternatives.** Quoting tricks or zsh options such as `${=var}` or `setopt sh_word_split` (rejected: easy to forget
in a one-off command, and the failure is silent); arrays (rejected for the same reason inline).

**Open.** None.

**Review questions.** None.

## 2026-11-16, step 3.4: results; the showcase stays Qwen with prompt P

**Decision.** Three candidates ran with prompt P on the variant A lists, the reranker stopped, on Ollama 0.40.15 (no
update: Muse Glimmer requires 0.32.8). The best of the three, Muse Glimmer 30B, got its second run. It is below Qwen
with P beyond the spread, so the showcase configuration stays Qwen3.8 27B with prompt P on fully local retrieval.

**Evidence.** `ai/eval/results/2026-11-16-phase3-compare-golden-v1-4.md`, section 3.4.

| | Qwen P1, P2 on A (1.12) | Gemma 4 31B | gpt-oss 20B | Muse Glimmer 30B, runs 1 and 2 |
|---|---|---|---|---|
| correct / partially / incorrect | 16/13/5, 16/11/7 | 7/18/9 | 6/14/14 | 10/17/7, 10/17/7 |
| quotes verified | 84/87, 74/77 | 56/66 | 33/75 | 94/99, 74/80 |
| premise handled | 7/8, 7/8 | 5/8 | 4/8 | 5/8, 7/8 |
| latency median (s) | 13.0, 12.8 (250 W) | 11.5 | 3.8 | 13.0, 12.1 |

- Muse against Qwen P on A: correct 10 and 10 against 16 and 16, a gap of 6 against a spread of 0, beyond the spread;
  quote error rate within the spread. Muse is dense and slower (44 tokens per second) and held the card at the 420 W
  limit for the whole run (busy average 407.8 W, the highest of the phase, max 70.3 C).
- Gemma 4 31B writes very short answers (median 139 tokens) and needs 23 559 MiB at `num_ctx` 17408: it does not fit
  on the card together with the reranker.
- gpt-oss 20B rewrites quotes (replaced characters, translations, joined pieces): 42 of 75 not verified.
- Single runs (Gemma 31B, gpt-oss) carry no comparison claim; their gaps to Qwen are large but unconfirmed.

**Model-specific runtime fixes, all in the result files and tested (`ai/answer/local.test.ts`).**
- gpt-oss: its harmony chat template adds 75 tokens (system block of 61 with identity, knowledge cutoff, current date
  and reasoning level, plus the wrappers), above the 64-token bound of the template check. The bound is 96 for
  gpt-oss only; after calibration the count must still match within 2. A first attempt stopped at the first call.
- Muse Glimmer: Ollama 0.40.15 leaves its end-of-turn token `<|eot|>` at the end of every response (35 of 35 calls), so
  the JSON did not parse and the first attempt failed the injection probe with no parsed answer; the token is now
  removed before parsing and counted. Ollama's GGUF tokenizer also counts a few tokens more than the Hugging Face
  tokenizer on some text (+3 and +1 on two chunks of one prompt, at most +4 per prompt in the runs); up to 16 more is
  allowed for Muse, while any shortfall (a truncation) still fails at 2. Diagnosed with direct calls, then rerun.

**Alternatives.** Updating Ollama to fix the Muse token leak (not done: the owner allowed an update only if Muse could
not load, and it loaded). Treating the first Muse attempt as a failed injection probe (rejected after diagnosis: the
model did not obey the order; its answer did not parse).

**Open.** Judge spend for 3.4 $1.96; phase total $4.03 of $10.

**Review questions.** Are client-side fixes for a runtime's token leak acceptable in a measurement, given they are
recorded and tested? Is one run enough to drop Gemma 4 31B and gpt-oss, given gaps of 9 and 10 correct answers?

## 2026-11-16, step 3.4 accepted (owner)

**Decision.** The showcase chat keeps Qwen3.8 27B with prompt P on fully local retrieval; no candidate came near it.

**Limitation, to be stated wherever 3.4 is reported.** Prompt P was written from Qwen's failure types (step 1.12), so
the other models ran with a prompt not tuned for them. The comparison says which model works best in this setup, not
which model is best in general.

**Review questions.** Would a prompt written from each model's own failure types change the order? (Not measured; a
separate, later variant if ever.)

## 2026-11-16, step 3.5 plan approved; how a repeat of a compacted result is handled (owner and CC-Mac)

**Decision (owner).** Both variants, QA-cl first (two runs), then QA-c (two runs). Thinking off. Compaction on demand,
with the number of compacted results reported per task.

**Variants, as named in the result files** (`ai/eval/agent-run.ts`, `LOCAL_AGENT_RUNS`):
- QA-cl: qwen3.8:27b through Ollama, prompt A unchanged, `num_ctx` 24576, `num_predict` 4096, thinking off, sampling
  from the card without thinking (temperature 0.7, top_p 0.8, top_k 20) with every repetition penalty off as in prompt
  P (paths and quotes repeat), compaction on demand with restore; `search_journal` on fully local retrieval (variant B:
  meta-index plus rerank, no query translation), so nothing leaves the box.
- QA-c: the same with `search_journal` as for Sonnet (generated contexts plus Sonnet query translation, the only cloud
  call).
Separate result files (`2026-11-16-agent-eval-local-<run>.json`) and judge file, so the step 2.4 files, guard and report
are untouched.

**Repeat after compaction (the owner's question).** The loop refuses an identical call with "its result is above",
which is false once that result was compacted. Chosen handling, part of both named variants and inside the Ollama
conversation only (`ai/agent/model-ollama.ts`): when the reply to a call is the loop's repeat refusal and the original
result was compacted, the conversation sends the full original result instead, marked "shown again: this result had
been removed from the conversation to save space", compacting older results to make room. If even then it does not
fit, the refusal is replaced by an honest note: the result cannot be shown again within the context limit, it was read
and may still be cited, answer from what you have. The stub of a compacted result says the same: it may be cited, and
calling the tool again with the same arguments shows it again. Counted per task, apart from each other: results
compacted, restored, restores refused, plain repeats (a repeat of a result never compacted), so a stuck model is not
mistaken for a weak one. The loop still counts every repeat toward its third-repeat stop; that is unchanged.

**Other mechanics decided in the build.**
- Context checks: before every call the prompt is counted with Qwen's tokenizer plus a template and tool-definition
  overhead calibrated on a cold call (both tool sets, the larger kept) and a 5% margin; when even the compacted history
  does not fit `num_ctx - num_predict`, the task ends as a final turn with no answer and the error "context-limit"
  (recorded, loop unchanged). After a call, a server count above the estimate stops the run; a lower one is expected
  with llama.cpp's prompt cache, so the 1.11 equality check cannot be used here.
- Ollama has no tool call ids and no `tool_choice`: ids are made in the conversation; the final turn is a request
  without tools and with the answer schema as `format`. Whether `format` can go with `tools` in one request is decided
  by a check before the runs (`npm run ai:agent:probe -- --format-check`); without it, a tool turn that answers in text
  is followed at once by a final request, counted.
- Before the runs, the step 2.2 and 2.3 injection probes run on the local agent (`--local`), writing separate files.
- New measures next to the 2.4 ones: tool calls the validator rejected, final answers that did not parse, tasks
  stopped on the context limit, tool turns answered in text, compaction counts per task, largest server prompt.

**Evidence.** Tests `ai/agent/model-ollama.test.ts` (19, offline: request shape, ids, final turn, text instead of a
tool call, compaction, restore, honest note, context limit, server-count check, one run through the real loop).
Context-fit measurement `ai/eval/results/2026-11-16-agent-local-fit.md`.

**Open.** VRAM with Qwen at `num_ctx` 24576, the reranker (3 758 MiB) and bge-m3 together is measured at the first
load; if it does not fit, the fallback is `num_ctx` 16384 with smaller tool results, recorded as a further named
variant. The runs wait for the owner's go: CC-Win uses the box first for two showcase tasks.

**Review questions.** Does restoring a compacted result on a repeat change what "repeat" means in the redundant-call
measure? (Counted both ways: as a repeat by the 2.4 measure and as a restore here.)

## 2026-11-16, step 3.5 paused before the probes: Ollama keeps only one of Qwen and bge-m3

**What happened.** With the owner's go, the one-second log running and the box reserved:
- Format check (`ai/eval/results/2026-11-16-agent-format-check-local.json`): with the answer schema as `format` in the
  same request as the tools, Qwen called no tool in 3 of 3 requests and answered at once in JSON, inventing content
  ("There are 12 saved backtest result files"); without `format` it called the right tool in 3 of 3. Decision: no
  `format` in tool turns (the default of the built code).
- VRAM at the first load: bge-m3 loaded (0.64 GiB), then Qwen at `num_ctx` 24576. Ollama 0.40.15 evicted bge-m3
  ("llama-server model predicted to exceed available memory, evicting": predicted 20.7 GiB, available 22.1 GiB with
  the reranker holding 3 870 MiB). Qwen 66/66 layers on the GPU, 23 301 MiB in use, peak 23 315 MiB.
- The fallback checked before any probe: at `num_ctx` 16384 Ollama evicted bge-m3 as well (predicted 19.0 GiB,
  available 22.1 GiB), so a smaller context does not keep both resident.
- A second embed request with Qwen loaded made Ollama swap again; the bge-m3 runner crashed at its first compute
  ("CUDA error: shared object initialization failed", exit 0xc0000409) after three evictions and loads in 30 s.
  The box, the driver, the reranker and the Ollama server were fine; no power, temperature or Kernel-Power event. No
  model was reloaded afterwards (owner's rule).

**Consequence.** The agent's `search_journal` needs a bge-m3 embedding for every search while Qwen generates. With
Ollama evicting one for the other, each search would swap two models (seconds each, and once already a runner crash).
The same applies to the planned showcase chat on this box, which embeds every question with bge-m3 before Qwen
answers; step 3.2 never exercised that, because it used saved chunk lists.

**Open, for the owner.** How to embed queries without a second model on the GPU in Ollama (options in the CC-Mac
report of 16 Nov). Nothing runs until then.

**Addendum (CC-Win's reading of serve.log, same day).** The second embed did not evict Qwen: Ollama loaded bge-m3
next to Qwen at 16384 ("fits alongside existing models", 1.1 GiB needed, 6.6 GiB of VRAM free), and the bge-m3 runner
crashed at its first compute; the embed got HTTP 500 after 6.86 s. So the order matters: loading Qwen evicts a resident
bge-m3, but bge-m3 may load next to a resident Qwen, and VRAM was not the limit then. CC-Win's diagnosis, an inference
since the log does not say "out of memory": Windows host commit memory. Ollama disables mmap on Windows with CUDA, so
the Qwen runner commits about its whole model in host memory too; commit headroom ("free_swap") fell from 19 to 26 GiB
before the load to 649 MiB with Qwen resident; the commit limit is 40.3 GB (32 GB RAM plus an auto-managed 8.6 GB
pagefile). Possible fix: a larger fixed pagefile (32 to 48 GB), a box change that needs the owner's word and may need a
reboot. Side note: the embed requests send `num_ctx` 32768, which Ollama caps to bge-m3's 8192 with a warning.

## 2026-11-16, step 3.5 results: the agent on Qwen, QA-cl and QA-c, two runs each

**What ran.** After the 48 GB pagefile and the load order fix (Qwen first, then bge-m3), the chain ran without a
stop: local injection probes, local job probes, then QA-cl1, QA-cl2, QA-c1, QA-c2 (qwen3.8:27b, `num_ctx` 24576,
prompt A, thinking off, compaction on demand with restore on a repeated call). No fallback to 16384 was needed.
Report: `ai/eval/results/2026-11-16-agent-local-report.{json,md}`; judged answers:
`ai/eval/results/2026-11-16-agent-local-judged.json`.

**Decision.** None to take yet; the results are reported to the owner. Facts:
- Probes: 4 of 4 pass (unknown tool, ignore-question, order-to-run-a-job, out-of-schema arguments).
- Correct out of 18: QA-cl 11 and 14, QA-c 14 and 15, Sonnet A 17 and 16. Both local variants are below Sonnet by
  more than both spreads (correct, incorrect, required sources). QA-c against QA-cl is within the spreads on every
  measure: the retrieval setup does not separate them in two runs.
- x-03 is wrong in all four local runs (presents the result file's numbers as the journal's own); p-01 is wrong in
  three and partly right in one (claims to have run the 0.05% job, which cannot run, with 0.30% pool figures).
  Corrected on 16 Nov: the first version said p-01 was wrong in every run. Premise handling: QA-cl 1/3 in both runs, QA-c 3/3 and 2/3.
- Runtime: no task hit the context limit, no final answer failed to parse, 3 invalid tool calls in 72 tasks, 2 to 5
  tool turns per run answered in text. Largest server prompt 19 502 tokens of 24 576. Compaction in 13 to 15 of 18
  tasks per run (74 to 87 results); every repeat after compaction was restored, none refused.
- Grounding is weaker than Sonnet: citations verified 31/37 to 40/44 (Sonnet all), dataRefs 76/120 to 99/116
  (Sonnet 123/125, 123/127); 1 to 2 unsupported answers per run (Sonnet 0).
- Efficiency: step limit in 7 to 11 tasks per run (Sonnet 5 and 1); redundant calls 37 to 72 (Sonnet 25 and 17);
  median time without jobs 70 to 87 s (Sonnet 26 to 33 s).
- Cost: QA-cl $0, QA-c $0.08 and $0.09 (Sonnet query translation), Sonnet A $2.80 and $2.51. Local judge $1.32;
  phase 3 total $5.53 of $10.
- Box (CC-Win, 1 s log): no alert, no gap, no eviction or CUDA error; max 72.8 C, 420 W limit, VRAM at most
  23 964 MiB; Qwen 66/66 and bge-m3 25/25 on the GPU in every window. GPU board energy 134 to 142 Wh per run, about
  7.4 to 7.9 Wh per task including idle between tasks. CPU package power was not logged.

**Evidence.** The report above; `run35.log` windows sent to CC-Win; CC-Win's figures from
`C:\ollama\logs\phase3-3.5b-2026-11-16.csv`.

**Open points.** Whether 3.5 is accepted; whether CPU package power is logged from the next run on.

**Review questions.** The local agent hits the step limit far more often than Sonnet; is that the model looping, or
compaction hiding results so the model searches again? (Restores: 11 to 15 per run; plain repeats 3 to 17.)

## 2026-11-16, step 3.5 accepted; step-limit follow-up from the saved logs

**Decision (owner).** Step 3.5 accepted and ticked. The box is released for CC-App and CC-Win. CPU package power is
logged in future runs, only through what Windows already exposes (the "Energy Meter" counters), nothing installed.

**Follow-up, the review question of the 3.5 entry.** Is the step limit the model looping, or compaction hiding results?
Answered from the saved logs only, no model call (`ai/eval/agent-step-limit.ts`, report
`ai/eval/results/2026-11-16-agent-step-limit.md`). Each tool call of a step-limit task is one of: (a) a repeat or
near-repeat of a result compacted in the prompt the model saw, (b) of a result still visible, (c) a new call; the task
takes the class with the most calls.
- Local, 33 step-limit tasks: 23 (c), 8 (b), 2 (a). Calls 86 (a), 139 (b), 209 (c); 55 tool turns held only (a)
  calls, 57 only (b).
- Sonnet A1 and A2, 6 step-limit tasks: 3 (b), 3 (c), no compaction.
- Examples: QA-c2 b-01 (class a), turns 5 to 9 each reread one path of a result file whose full read had been
  compacted; QA-cl2 t-02 (class b), 15 rereads of paths in result files still visible. t-02 is class (b) in both
  Sonnet runs and all four local runs.
- Reading: mostly the model keeps making new calls; compaction costs turns but decides 2 of 33 tasks.

**How the compaction state was recovered.** The log has no per-turn compaction record, so each local task is replayed
through OllamaConversation with a fake server (same tokenizer, the run's overhead 324 and margin). The raw tool_calls
shape Ollama returned was not logged. With the bare shape (name and arguments) two tasks differ from the recorded
compaction count (7 against 8, 6 against 8); with Ollama's documented shape (a random-looking id plus an index) all 42
replays match exactly. Between the two shapes one call changes class (QA-c2 b-01, turn 5) and no task does.

**Alternatives.** Rerunning with a per-turn compaction log: rejected, the owner asked for saved logs only.

**Open points.** Logging the raw tool_calls and the compacted set per turn in future local runs would make this exact
without the replay.

**Review questions.** Is "the class with the most calls" the right task label? Per-task counts are in the report for
another rule.

## 2026-11-16, phase 3 merged into main (owner); notes for later

**Decision.** With the owner's approval, `ai-layer` was merged into `main` with a merge commit (no fast forward, no
history rewritten, no force push) after step 3.5 was ticked, once the CI steps passed. The merge brings steps 3.1 to
3.5. Recorded as a possible future step, not planned: an agent prompt for Qwen with an explicit stopping rule
(`docs/AI-PLAN.md`, "Later, optional").

**Note for whoever merges `app-chat`.** That branch changes `ai/answer/` (an optional `signal` parameter in
`Generator.generate` and `answerWithChecks`) and appends to `ai/DECISIONS.md`: check both against `main` at the merge.
