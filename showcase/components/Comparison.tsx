/**
 * Saved answers to the 34 golden questions, side by side (phase 4, steps 4.2 and 4.5). Two default columns, Sonnet
 * k=10 and the configuration the chat serves; every other measured configuration in a collapsed section. No model is
 * called: everything comes from committed evaluation results.
 */
import { useState } from 'react';
import type { ComparisonData, ShowcaseAnswer, ShowcaseConfig, ShowcaseQuestion, ShowcaseRun } from '../../ai/serve/showcase-data';
import { useComparison } from '../data';
import { ANSWERABLE_LABEL, CATEGORY_LABEL, CORRECTNESS_LABEL, COVERAGE_LABEL, FAILED_TEXT, FAITHFULNESS_LABEL, PREMISE_LABEL } from '../labels';
import { Citations, Legend, MarkedText, NumberSummary } from './Marks';

export function Comparison() {
  const loaded = useComparison();
  if (loaded.state === 'loading') return <p className="state-note">Loading the saved answers.</p>;
  if (loaded.state === 'error') return <p className="state-note error">The saved answers could not be loaded ({loaded.message}).</p>;
  return <ComparisonView data={loaded.data} />;
}

/** First question shown: both models answer it correctly and its figures are backed, a clear case to start from. */
export const DEFAULT_QUESTION = 'dated-08';

function ComparisonView({ data }: { data: ComparisonData }) {
  const [qid, setQid] = useState(data.questions.some((q) => q.id === DEFAULT_QUESTION) ? DEFAULT_QUESTION : (data.questions[0]?.id ?? ''));
  const question = data.questions.find((q) => q.id === qid) ?? data.questions[0];
  const main = data.configs.filter((c) => c.group === 'main');
  const more = data.configs.filter((c) => c.group === 'more');
  return (
    <section className="comparison" aria-labelledby="compare-title">
      <h2 id="compare-title" className="section-title">
        Cloud model and local model, same {data.questions.length} questions
      </h2>
      <p className="lede">
        Each question has a reference answer written by hand. A separate judge model graded every answer without knowing which model wrote it.
        These are saved results from November 2026; nothing here calls a model.
      </p>
      <Verdicts configs={main} total={data.questions.length} />
      <details className="more">
        <summary>{more.length} more measured configurations</summary>
        <Verdicts configs={more} total={data.questions.length} />
      </details>

      <div className="question-picker">
        <label htmlFor="question" className="field-label">
          Question
        </label>
        <select id="question" value={question?.id} onChange={(e) => setQid(e.target.value)}>
          {data.questions.map((q, i) => (
            <option key={q.id} value={q.id}>
              {i + 1}. {q.question}
            </option>
          ))}
        </select>
      </div>
      {question && (
        <>
          <QuestionCard question={question} />
          <div className="columns">
            {main.map((c) => (
              <ConfigColumn key={c.id} config={c} qid={question.id} />
            ))}
          </div>
          <details className="more">
            <summary>Answers from the other configurations</summary>
            <div className="columns">
              {more.map((c) => (
                <ConfigColumn key={c.id} config={c} qid={question.id} />
              ))}
            </div>
          </details>
        </>
      )}
      <details className="how-to-read">
        <summary>How to read the marks</summary>
        <Legend />
      </details>
    </section>
  );
}

const runLabel = (c: ShowcaseConfig) => (c.single ? 'single run' : `${c.runs.length} runs`);

/** One bar per run: correct, partially correct and incorrect out of all questions, with the numbers written out. */
function Verdicts({ configs, total }: { configs: ShowcaseConfig[]; total: number }) {
  return (
    <div className="verdicts">
      {configs.map((c) => (
        <div key={c.id} className="verdict-group">
          <p className="verdict-config">
            <strong>{c.label}</strong> <span className="tag">{runLabel(c)}</span>
            {c.served && <span className="tag tag-served">used by the chat</span>}
          </p>
          {c.runs.map((r, i) => (
            <VerdictBar key={r.run} run={r} index={c.runs.length > 1 ? i + 1 : null} total={total} />
          ))}
        </div>
      ))}
    </div>
  );
}

function VerdictBar({ run, index, total }: { run: ShowcaseRun; index: number | null; total: number }) {
  const s = run.summary;
  const pct = (n: number) => `${(100 * n) / total}%`;
  return (
    <div className="verdict-row">
      <span className="verdict-run">{index ? `Run ${index}` : 'Run'}</span>
      <div className="bar" role="img" aria-label={`${s.correct} correct, ${s.partiallyCorrect} partially correct, ${s.incorrect} incorrect, out of ${total}`}>
        <span className="seg seg-correct" style={{ width: pct(s.correct) }} />
        <span className="seg seg-partial" style={{ width: pct(s.partiallyCorrect) }} />
        <span className="seg seg-incorrect" style={{ width: pct(s.incorrect) }} />
      </div>
      <span className="verdict-numbers">
        {s.correct} correct, {s.partiallyCorrect} partly, {s.incorrect} wrong; {s.quotesNotVerified} of {s.quotes} quotes not verified
      </span>
    </div>
  );
}

function QuestionCard({ question }: { question: ShowcaseQuestion }) {
  return (
    <div className="question">
      <p className="question-text">{question.question}</p>
      <p className="meta">
        {CATEGORY_LABEL[question.category] ?? question.category}. {ANSWERABLE_LABEL[question.answerable]}
      </p>
      <details>
        <summary>Reference answer, written by hand</summary>
        <p>{question.reference}</p>
      </details>
    </div>
  );
}

function ConfigColumn({ config, qid }: { config: ShowcaseConfig; qid: string }) {
  const [runIndex, setRunIndex] = useState(0);
  const run: ShowcaseRun | undefined = config.runs[runIndex] ?? config.runs[0];
  const answer = run?.answers[qid];
  return (
    <article className={`column ${config.served ? 'column-served' : ''}`} data-config={config.id}>
      <header className="column-head">
        <h3>{config.label}</h3>
        <p className="meta">
          {config.engine === 'local' ? 'Local model' : 'Cloud model'}, {runLabel(config)}
          {config.served && <span className="tag tag-served">used by the chat</span>}
        </p>
        {config.runs.length > 1 && (
          <div className="run-switch" role="group" aria-label="Run">
            {config.runs.map((r, i) => (
              <button key={r.run} type="button" className="chip" aria-pressed={i === runIndex} onClick={() => setRunIndex(i)}>
                Run {i + 1}
              </button>
            ))}
          </div>
        )}
      </header>
      {answer ? <AnswerView answer={answer} /> : <p className="state-note error">No saved answer for this question.</p>}
      {run && (
        <details className="provenance">
          <summary>Exact settings</summary>
          <p>{config.description}</p>
          <p className="path">{run.generator}</p>
          <p className="path">{run.retrieval}</p>
          <p className="path">
            {run.judge}, {run.sourceFile}
          </p>
        </details>
      )}
    </article>
  );
}

function AnswerView({ answer }: { answer: ShowcaseAnswer }) {
  if (answer.outcome === 'failed') return <p className="state-note error">{FAILED_TEXT}</p>;
  const v = answer.verdict;
  return (
    <div className="answer">
      {v && (
        <p className="judge-line" title="The judge model's grade of the whole answer, against a reference written by hand">
          <span className="judge-label">Judge&apos;s grade of the whole answer:</span>{' '}
          <span className={`verdict verdict-${v.correctness}`}>{CORRECTNESS_LABEL[v.correctness]}</span>
          <span className="judge-detail">
            , {FAITHFULNESS_LABEL[v.faithfulness]}
            {PREMISE_LABEL[v.premise] ? `; ${PREMISE_LABEL[v.premise]}` : ''}.
          </span>
        </p>
      )}
      {answer.coverage && <p className={`coverage coverage-${answer.coverage}`}>{COVERAGE_LABEL[answer.coverage]}</p>}
      <NumberSummary numbers={answer.numbers} />
      <MarkedText text={answer.answer} numbers={answer.numbers} />
      <Citations citations={answer.citations} />
      {v && (
        <details className="judge">
          <summary>Why the judge decided this</summary>
          <p>{v.correctnessReason}</p>
          <p>{v.faithfulnessReason}</p>
          {v.premise !== 'n/a' && <p>{v.premiseReason}</p>}
        </details>
      )}
      <p className="meta">
        {(answer.ms / 1000).toFixed(1)} s{answer.costUsd > 0 ? `, $${answer.costUsd.toFixed(4)} API cost` : ', no API cost'}
      </p>
    </div>
  );
}
