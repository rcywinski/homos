/**
 * Saved answers to the 34 golden questions, side by side (phase 4, step 4.2). Two default columns, Sonnet k=10 and
 * the configuration the chat serves; every other measured configuration in a collapsed "more" section. No model is
 * called: everything comes from committed evaluation results.
 */
import { useState } from 'react';
import type { ComparisonData, ShowcaseAnswer, ShowcaseConfig, ShowcaseQuestion, ShowcaseRun } from '../../ai/serve/showcase-data';
import { useComparison } from '../data';
import { ANSWERABLE_LABEL, CORRECTNESS_LABEL, COVERAGE_LABEL, FAILED_TEXT, FAITHFULNESS_LABEL, PREMISE_LABEL, REASON_LABEL } from '../labels';

export function Comparison() {
  const loaded = useComparison();
  if (loaded.state === 'loading') return <p className="status">Loading saved answers.</p>;
  if (loaded.state === 'error') return <p className="status error">The saved answers could not be loaded ({loaded.message}).</p>;
  return <ComparisonView data={loaded.data} />;
}

function ComparisonView({ data }: { data: ComparisonData }) {
  const [qid, setQid] = useState(data.questions[0]?.id ?? '');
  const question = data.questions.find((q) => q.id === qid) ?? data.questions[0];
  const main = data.configs.filter((c) => c.group === 'main');
  const more = data.configs.filter((c) => c.group === 'more');
  return (
    <section className="comparison">
      <p className="lead">
        The same {data.questions.length} test questions (golden set v{data.goldenVersion}) answered by a cloud model and by the local model the chat
        uses. Every quote was checked against its source by code; every answer was graded blind by a separate judge model against a reference
        answer written by hand.
      </p>
      <Summary configs={main} />
      <details className="more">
        <summary>More measured configurations ({more.length})</summary>
        <Summary configs={more} />
      </details>
      <div className="question-picker">
        <label htmlFor="question">Question</label>
        <select id="question" value={question?.id} onChange={(e) => setQid(e.target.value)}>
          {data.questions.map((q) => (
            <option key={q.id} value={q.id}>
              {q.id}: {q.question}
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
    </section>
  );
}

function runLabel(config: ShowcaseConfig): string {
  return config.single ? 'single run' : `${config.runs.length} runs`;
}

function Summary({ configs }: { configs: ShowcaseConfig[] }) {
  return (
    <table className="summary">
      <caption>Judge verdicts over all questions, per run</caption>
      <thead>
        <tr>
          <th scope="col">Configuration</th>
          <th scope="col">Run</th>
          <th scope="col">Correct</th>
          <th scope="col">Partially</th>
          <th scope="col">Incorrect</th>
          <th scope="col">Quotes not verified</th>
        </tr>
      </thead>
      <tbody>
        {configs.flatMap((c) =>
          c.runs.map((r, i) => (
            <tr key={r.run}>
              {i === 0 && (
                <th scope="row" rowSpan={c.runs.length}>
                  {c.label}
                  {c.served && <span className="badge served">served by the chat</span>}
                  <span className="badge">{runLabel(c)}</span>
                </th>
              )}
              <td className="mono">{r.run}</td>
              <td>{r.summary.correct}</td>
              <td>{r.summary.partiallyCorrect}</td>
              <td>{r.summary.incorrect}</td>
              <td>
                {r.summary.quotesNotVerified} of {r.summary.quotes}
              </td>
            </tr>
          )),
        )}
      </tbody>
    </table>
  );
}

function QuestionCard({ question }: { question: ShowcaseQuestion }) {
  return (
    <div className="question">
      <p className="meta">
        {question.id}, {question.category}, {ANSWERABLE_LABEL[question.answerable]} from the project data
      </p>
      <p className="question-text">{question.question}</p>
      <details>
        <summary>Reference answer (written by hand)</summary>
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
    <article className="column">
      <header>
        <h3>{config.label}</h3>
        <p className="meta">
          {config.engine === 'local' ? 'Local model' : 'Cloud model'}, {runLabel(config)}
          {config.served && <span className="badge served">served by the chat</span>}
        </p>
        <p className="description">{config.description}</p>
        {config.runs.length > 1 && (
          <div className="run-switch" role="group" aria-label="Run">
            {config.runs.map((r, i) => (
              <button key={r.run} type="button" className={i === runIndex ? 'tab active' : 'tab'} aria-pressed={i === runIndex} onClick={() => setRunIndex(i)}>
                Run {i + 1}
              </button>
            ))}
          </div>
        )}
      </header>
      {answer ? <AnswerView answer={answer} /> : <p className="status error">No saved answer for this question.</p>}
      {run && (
        <details className="provenance">
          <summary>Exact settings</summary>
          <p className="mono">{run.generator}</p>
          <p className="mono">{run.retrieval}</p>
          <p className="mono">
            {run.judge}, {run.sourceFile}
          </p>
        </details>
      )}
    </article>
  );
}

function AnswerView({ answer }: { answer: ShowcaseAnswer }) {
  if (answer.outcome === 'failed') return <p className="status error">{FAILED_TEXT}</p>;
  const v = answer.verdict;
  return (
    <div className="answer">
      {v && (
        <div className="verdict">
          <span className={`badge verdict-${v.correctness}`}>{CORRECTNESS_LABEL[v.correctness]}</span>
          <span className="badge">{FAITHFULNESS_LABEL[v.faithfulness]}</span>
          {PREMISE_LABEL[v.premise] && <span className="badge">{PREMISE_LABEL[v.premise]}</span>}
        </div>
      )}
      {answer.coverage && <p className={`coverage coverage-${answer.coverage}`}>{COVERAGE_LABEL[answer.coverage]}</p>}
      <p className="answer-text">{answer.answer}</p>
      {answer.citations.length > 0 && (
        <ol className="citations">
          {answer.citations.map((c, i) => (
            <li key={i} className={c.status === 'verified' ? 'cite verified' : 'cite not-verified'}>
              <span className="mark">{c.status === 'verified' ? 'Verified quote' : 'Not verified'}</span>
              <q lang="pl">{c.quote}</q>
              <span className="source mono">
                {c.file}
                {c.lines ? `:${c.lines[0]}${c.lines[1] !== c.lines[0] ? `-${c.lines[1]}` : ''}` : ''}
              </span>
              {c.reason && <span className="why">Not verified: {REASON_LABEL[c.reason]}.</span>}
              {c.tooLong && <span className="why">Longer than the 40-word quoting rule.</span>}
            </li>
          ))}
        </ol>
      )}
      {v && (
        <details className="judge">
          <summary>Why the judge decided this</summary>
          <p>{v.correctnessReason}</p>
          <p>{v.faithfulnessReason}</p>
          {v.premise !== 'n/a' && <p>{v.premiseReason}</p>}
        </details>
      )}
      <p className="meta">
        {(answer.ms / 1000).toFixed(1)} s{answer.costUsd > 0 ? `, $${answer.costUsd.toFixed(4)}` : ', no API cost'}
      </p>
    </div>
  );
}
