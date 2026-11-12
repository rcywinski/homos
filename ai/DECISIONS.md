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
