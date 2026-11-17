/**
 * The chat panel (phase 4, step 4.5). One question at a time, single turn. While the server works it shows what is
 * happening (place in the queue, searching, writing); the answer appears whole, after verification, with its marks.
 * Every refusal and failure is a fixed text from the server, shown as it is.
 */
import { useEffect, useRef, useState } from 'react';
import type { AskResponse } from '../../ai/serve/ask';
import { EXAMPLES } from '../examples';
import { askQuestion, health, type ChatError, type ChatStatus, type Health } from '../api';
import { Citations, Legend, MarkedText, NumberSummary, where } from './Marks';

const MAX = 500;

const COVERAGE: Record<'full' | 'partial', string> = {
  full: 'The sources answer the question.',
  partial: 'The sources answer part of the question.',
};

function statusLine(s: ChatStatus | null): string {
  if (!s) return 'Sending the question.';
  if (s.kind === 'queued')
    return s.position === 1
      ? 'Waiting: one question is ahead of yours.'
      : `Waiting: ${s.position} questions are ahead of yours.`;
  if (s.kind === 'retrieving') return 'Searching the journal and the documentation.';
  return 'The local model is writing the answer. This can take a minute.';
}

const HEALTH_TEXT: Record<Exclude<Health['status'], 'up'>, string> = {
  busy: 'The local model is busy with other questions right now. You can still try; the saved answers are under "Compare".',
  paused: 'The chat is paused while the GPU is used for other work. The saved answers and the reports still work.',
  'model-offline': 'The local model is offline right now. The saved answers and the reports still work.',
  unreachable: 'The chat server cannot be reached right now. The saved answers and the reports still work.',
};

export function Ask() {
  const [question, setQuestion] = useState('');
  const [state, setState] = useState<Health | null>(null);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<ChatStatus | null>(null);
  const [answer, setAnswer] = useState<{ question: string; response: AskResponse } | null>(null);
  const [error, setError] = useState<ChatError | null>(null);
  const abort = useRef<AbortController | null>(null);
  /** The live region that shows progress, then the answer or the error; it takes focus after every submit. */
  const result = useRef<HTMLDivElement | null>(null);
  const bringIntoView = () =>
    requestAnimationFrame(() => {
      result.current?.scrollIntoView({
        block: 'start',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });
      result.current?.focus({ preventScroll: true });
    });

  useEffect(() => {
    let live = true;
    health().then((h) => live && setState(h));
    return () => {
      live = false;
      abort.current?.abort();
    };
  }, []);

  const submit = async (q: string) => {
    const text = q.trim();
    if (!text || pending) return;
    setQuestion(text);
    setPending(true);
    setStatus(null);
    setError(null);
    bringIntoView();
    abort.current = new AbortController();
    const r = await askQuestion(text, setStatus, abort.current.signal);
    setPending(false);
    if (r.ok) {
      setAnswer({ question: text, response: r.answer });
      setError(null);
    } else setError(r.error);
    bringIntoView();
  };

  const down = state && state.status !== 'up' ? HEALTH_TEXT[state.status] : null;

  return (
    <section className="ask" aria-labelledby="ask-title">
      <div className="ask-main">
        <h2 id="ask-title" className="section-title">
          Ask the project archive
        </h2>
        {down && (
          <p className="state-note" role="status" data-testid="chat-health">
            {down}
          </p>
        )}
        <form
          className="ask-form"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(question);
          }}
        >
          <label htmlFor="question-input" className="field-label">
            Your question
          </label>
          <textarea
            id="question-input"
            value={question}
            maxLength={MAX}
            rows={3}
            placeholder="For example: why was narrowing the ranges rejected?"
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit(question);
            }}
          />
          <div className="ask-row">
            <button type="submit" className="primary" disabled={pending || !question.trim()}>
              {pending ? 'Answering' : 'Ask'}
            </button>
            <span className="counter" aria-live="polite">
              {question.length} of {MAX} characters
            </span>
          </div>
          {!answer && !pending && (
            <div className="examples">
              <span className="field-label">Or ask one of these</span>
              <ul>
                {EXAMPLES.map((ex) => (
                  <li key={ex}>
                    <button type="button" className="example" onClick={() => void submit(ex)}>
                      {ex}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </form>

        <div
          className="result"
          ref={result}
          tabIndex={-1}
          aria-live="polite"
          aria-busy={pending}
          data-testid="chat-result"
          aria-label="Answer"
        >
          {pending && (
            <p className="progress" role="status" data-testid="chat-progress">
              {statusLine(status)}
            </p>
          )}
          {error && !pending && (
            <p className="state-note error" role="alert" data-testid="chat-error" data-error={error.error}>
              {error.message}
              {error.retryAfterSec !== undefined &&
                ` You can ask again in about ${Math.max(1, Math.round(error.retryAfterSec / 60))} min.`}
            </p>
          )}
          {answer && !pending && <AnswerBlock question={answer.question} r={answer.response} />}
        </div>
      </div>

      <aside className="ask-aside" aria-label="How answers are checked">
        <h3 className="aside-title">How answers are checked</h3>
        <p>
          A local model on the owner&apos;s own graphics card reads the passages that best match your question and
          answers from them. Code then checks that every quote exists word for word in its source, and marks every
          number by where it appears in the sources. A mark shows where a number comes from, not that it answers the
          question.
        </p>
        <Legend />
        <p className="fine-print">
          Questions are logged for 30 days, without your IP address, so the owner can see what people ask. One question
          at a time; there is a small hourly and daily limit.
        </p>
      </aside>
    </section>
  );
}

/**
 * The model's own explanation under the fixed "not in the data" heading (owner, 17 Nov 2026). It can correct a false
 * premise, so it is shown, but it is labelled: no verified quote means "not backed by a quote"; with verified quotes,
 * only the quoted parts are backed. Numbers carry the same marks as in an answer.
 */
function Explanation({ e }: { e: NonNullable<AskResponse['explanation']> }) {
  const backed = e.citations.some((c) => c.status === 'verified');
  return (
    <div className="explanation" data-testid="chat-explanation" data-backed={backed ? 'partly' : 'no'}>
      <p className="explanation-label">
        {backed
          ? "The model's own explanation. Only the parts the quotes below cover are backed; the rest is not."
          : "The model's own explanation. It is not backed by a quote."}
      </p>
      <NumberSummary numbers={e.numbers} />
      <MarkedText text={e.text} numbers={e.numbers} />
      {e.citations.length > 0 && (
        <>
          <h3 className="sub-title">Quotes</h3>
          <Citations citations={e.citations} />
        </>
      )}
    </div>
  );
}

function AnswerBlock({ question, r }: { question: string; r: AskResponse }) {
  return (
    <article className={`answer answer-${r.outcome}`} data-testid="chat-answer" data-outcome={r.outcome}>
      <p className="asked">
        <span className="field-label">You asked</span> {question}
      </p>
      {r.outcome === 'answered' ? (
        <>
          {r.coverage && <p className={`coverage coverage-${r.coverage}`}>{COVERAGE[r.coverage]}</p>}
          <NumberSummary numbers={r.numbers} />
          <MarkedText text={r.text} numbers={r.numbers} />
          <h3 className="sub-title">Quotes</h3>
          <Citations citations={r.citations} />
        </>
      ) : (
        <>
          <p className="fixed-text" data-testid="chat-fixed-text">
            {r.text}
          </p>
          {r.explanation && <Explanation e={r.explanation} />}
        </>
      )}
      {r.sources.length > 0 && (
        <details className="sources">
          <summary>Sources searched ({r.sources.length})</summary>
          <ol>
            {r.sources.map((s) => (
              <li key={s.chunkId}>
                <span className="path">{where(s)}</span> {s.title}
              </li>
            ))}
          </ol>
        </details>
      )}
      <p className="engine">
        Answered by {r.engine.label} in {(r.ms / 1000).toFixed(1)} s.
      </p>
    </article>
  );
}
