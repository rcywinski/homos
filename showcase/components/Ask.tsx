/**
 * The chat panel (phase 4, step 4.5). One question at a time, single turn. While the server works it shows what is
 * happening (place in the queue, searching, writing); the answer appears whole, after verification, with its marks.
 * Every refusal and failure is a fixed text from the server, shown as it is.
 */
import { useEffect, useRef, useState } from 'react';
import type { AskResponse } from '../../ai/serve/ask';
import { EXAMPLES } from '../examples';
import { askQuestion, getModels, health, loadModels, type ChatError, type ChatStatus, type Health, type ModelsView } from '../api';
import { Citations, Legend, MarkedText, NumberSummary, where } from './Marks';
import { ModelsPanel } from './ModelsPanel';
import { KeyPanel } from './KeyPanel';
import { callModel, hasKey, type ModelCall } from '../guest-key';
import { guestRetrieve, guestVerify } from '../guest-api';

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

const SWITCH_OFF =
  'The assistant is offline right now: the owner has switched the local model off. The saved answers and the reports still work.';

const HEALTH_TEXT: Record<Exclude<Health['status'], 'up'>, string> = {
  busy: 'The local model is busy with other questions right now. You can still try; the saved answers are under "Compare".',
  paused: 'The chat is paused while the GPU is used for other work. The saved answers and the reports still work.',
  'model-offline': 'The local model is offline right now. The saved answers and the reports still work.',
  unreachable: 'The chat server cannot be reached right now. The saved answers and the reports still work.',
};

/** What the page says when the call to Anthropic does not give a checkable answer (step 4.6b). */
export function modelCallText(c: Exclude<ModelCall, { ok: true }>): ChatError {
  if (c.kind === 'api-error')
    return c.status === 401
      ? { error: 'guest-key-rejected', message: `Anthropic did not accept the key: ${c.message}. The key was forgotten; you can enter another one.` }
      : { error: 'guest-api-error', message: `Anthropic answered with an error (${c.status || 'no status'}): ${c.message}` };
  if (c.kind === 'unreadable')
    return {
      error: 'guest-unreadable',
      message:
        'The call to Anthropic failed without a readable answer. Likely causes: your organisation does not allow API calls from a browser (for example with zero data retention), the key is invalid or expired, or a browser extension blocked the call.',
    };
  if (c.kind === 'max_tokens')
    return { error: 'guest-max-tokens', message: 'The answer was cut off at the length limit, so it cannot be checked. Nothing is shown in its place.' };
  if (c.kind === 'refusal') return { error: 'guest-refusal', message: 'The model declined to answer this question. Nothing is shown in its place.' };
  return { error: 'guest-invalid', message: 'The model did not return a valid answer this time. Nothing is shown in its place.' };
}

const GUEST_STEPS = {
  retrieving: 'Searching the journal and the documentation on this site.',
  calling: 'Your browser is asking Claude with your key. This usually takes 10 to 30 seconds.',
  checking: 'Checking the quotes and numbers of the answer on this site.',
} as const;

export function Ask() {
  /** "local": the owner's local model; "guest": the visitor's own Anthropic key (step 4.6b). */
  const [mode, setMode] = useState<'local' | 'guest'>('local');
  /** Whether a key is set; the key itself lives only in showcase/guest-key.ts. */
  const [keySet, setKeySet] = useState(hasKey());
  const [guestStep, setGuestStep] = useState<keyof typeof GUEST_STEPS | null>(null);
  const [question, setQuestion] = useState('');
  const [state, setState] = useState<Health | null>(null);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<ChatStatus | null>(null);
  const [answer, setAnswer] = useState<{ question: string; response: AskResponse } | null>(null);
  const [error, setError] = useState<ChatError | null>(null);
  const abort = useRef<AbortController | null>(null);
  /** The served models (step 4.10a); null until known, and on servers without the state machine. */
  const [models, setModels] = useState<ModelsView | null>(null);
  const [loadingOwn, setLoadingOwn] = useState(false);
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
    health().then((h) => {
      if (!live) return;
      setState(h);
      if (h.status !== 'unreachable' && h.models) setModels(h.models);
    });
    return () => {
      live = false;
      abort.current?.abort();
    };
  }, []);

  // Someone else's load, a release in progress or the wait after a failed load: follow it by polling until it ends;
  // our own load follows the event stream instead.
  const transient = models?.state === 'loading' || models?.state === 'unloading' || models?.retryAfterSec !== undefined;
  useEffect(() => {
    if (!transient || loadingOwn) return;
    const t = setInterval(() => {
      void getModels().then((v) => v && setModels(v));
    }, 1000);
    return () => clearInterval(t);
  }, [transient, loadingOwn]);

  const load = async () => {
    if (loadingOwn) return;
    setLoadingOwn(true);
    setError(null);
    const r = await loadModels(setModels, mode === 'guest' ? 'search' : 'ready');
    setLoadingOwn(false);
    if (r.ok) setModels(r.models);
    else {
      setError(r.error);
      const v = await getModels();
      if (v) setModels(v);
    }
  };

  const canAsk =
    mode === 'guest'
      ? keySet && (!models || models.state === 'search' || models.state === 'ready')
      : !models || models.state === 'ready';

  /**
   * One guest question: retrieval on our server, one call to Anthropic from this browser with the visitor's key, one
   * verification on our server. Nothing is retried: a second call would spend the visitor's money again.
   */
  const submitGuest = async (text: string) => {
    setGuestStep('retrieving');
    const r = await guestRetrieve(text);
    let outcome: { ok: true; value: AskResponse } | { ok: false; value: ChatError };
    if (r.kind === 'error') outcome = { ok: false, value: r.value };
    // Refused before any work (advice): the final text, and no call to Anthropic.
    else if (r.kind === 'answer') outcome = { ok: true, value: r.value };
    else {
      setGuestStep('calling');
      const call = await callModel(r.value.request);
      // A 401 makes the key module forget the key: show the field again.
      setKeySet(hasKey());
      if (!call.ok) outcome = { ok: false, value: modelCallText(call) };
      else {
        setGuestStep('checking');
        outcome = await guestVerify(text, r.value.ticket, call.answer);
      }
    }
    setGuestStep(null);
    return outcome;
  };

  const submit = async (q: string) => {
    const text = q.trim();
    if (!text || pending || !canAsk) return;
    if (mode === 'guest') {
      setQuestion(text);
      setPending(true);
      setError(null);
      bringIntoView();
      const o = await submitGuest(text);
      setPending(false);
      if (o.ok) setAnswer({ question: text, response: o.value });
      else {
        setError(o.value);
        if (['search-not-loaded', 'loading', 'unloading', 'switch-off', 'model-unavailable'].includes(o.value.error)) {
          const v = await getModels();
          if (v) setModels(v);
        }
      }
      bringIntoView();
      return;
    }
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
    } else {
      setError(r.error);
      // The models were released or lost meanwhile: show the load button again.
      if (['not-loaded', 'loading', 'unloading', 'switch-off', 'model-unavailable'].includes(r.error.error)) {
        const v = await getModels();
        if (v) setModels(v);
      }
    }
    bringIntoView();
  };

  const down =
    state && state.status !== 'up' ? HEALTH_TEXT[state.status] : models?.state === 'off' ? SWITCH_OFF : null;

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
        <div className="mode-switch" role="radiogroup" aria-label="Who answers">
          <label>
            <input type="radio" name="answer-mode" checked={mode === 'local'} onChange={() => setMode('local')} /> The owner&apos;s local model
          </label>
          <label>
            <input type="radio" name="answer-mode" checked={mode === 'guest'} onChange={() => setMode('guest')} /> Claude, with your own Anthropic key
          </label>
        </div>
        {mode === 'guest' && <KeyPanel keySet={keySet} onChange={setKeySet} />}
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
            <button type="submit" className="primary" disabled={pending || !question.trim() || !canAsk}>
              {pending ? 'Answering' : 'Ask'}
            </button>
            <span className="counter" aria-live="polite">
              {question.length} of {MAX} characters
            </span>
          </div>
          {models && models.state !== 'off' && (
            <ModelsPanel view={models} busy={loadingOwn} onLoad={() => void load()} need={mode === 'guest' ? 'search' : 'ready'} />
          )}
          {!answer && !pending && (
            <div className="examples">
              <span className="field-label">Or ask one of these</span>
              <ul>
                {EXAMPLES.map((ex) => (
                  <li key={ex}>
                    <button type="button" className="example" onClick={() => void submit(ex)} disabled={!canAsk}>
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
              {guestStep ? GUEST_STEPS[guestStep] : statusLine(status)}
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
        Answered by {r.engine.label}
        {r.engine.id === 'guest-key' ? '' : ` in ${(r.ms / 1000).toFixed(1)} s`}.
        {r.engine.id === 'guest-key' &&
          ' This combination (the cloud model reading the local search results) has not been measured yet; the quotes and numbers were checked on this site as for the local model.'}
      </p>
    </article>
  );
}
