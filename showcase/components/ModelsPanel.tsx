/**
 * The local model's state on the Ask view (phase 4, step 4.10a). Loading is a visible visitor action: the button
 * starts a load (or joins one already running), and the stages show their elapsed time next to the typical time
 * measured on the box, not a percentage. Once ready, the page says when the model will be released again.
 */
import type { ModelsView } from '../api';

const STAGE_LABEL: Record<string, string> = {
  'release-embedder': 'Freeing memory',
  reranker: 'Search reranker',
  generator: 'Language model',
  embedder: 'Search model',
  check: 'Checking both are ready',
};

const STATUS_LABEL: Record<string, string> = { pending: 'waiting', running: 'loading', done: 'done', failed: 'failed' };

const seconds = (ms: number) => Math.max(1, Math.round(ms / 1000));

export function ModelsPanel({ view, busy, onLoad, need = 'ready' }: { view: ModelsView; busy: boolean; onLoad: () => void; need?: 'ready' | 'search' }) {
  // Guest-key mode (4.6b) needs only the search model: the cloud model answers with the visitor's key.
  if (need === 'search' && (view.state === 'search' || view.state === 'ready'))
    return (
      <p className="models-note" data-testid="models-panel" data-state={view.state}>
        The search model is loaded. It is released after {view.idleUnloadMinutes} minutes without questions.
      </p>
    );
  if (need === 'search' && (view.state === 'idle' || view.state === 'off'))
    return (
      <div className="models-panel" data-testid="models-panel" data-state={view.state}>
        <p className="models-title">The search model is not loaded right now, to keep the owner&apos;s graphics card free.</p>
        <button type="button" className="primary" onClick={onLoad} disabled={busy || view.retryAfterSec !== undefined}>
          Load search
        </button>
        {view.retryAfterSec !== undefined && (
          <p className="state-note" role="status" data-testid="models-cooldown">
            The last load did not finish. A new attempt is possible in about {view.retryAfterSec} s.
          </p>
        )}
        <p className="fine-print">
          Loading the search models usually takes about {seconds(view.typicalSearchMs)} s; your key is not needed for it.
        </p>
      </div>
    );
  if (view.state === 'ready')
    return (
      <p className="models-note" data-testid="models-panel" data-state="ready">
        The local model is loaded. It is released after {view.idleUnloadMinutes} minutes without questions.
      </p>
    );
  if (view.state === 'loading')
    return (
      <div className="models-panel" data-testid="models-panel" data-state="loading">
        <p className="models-title" role="status">
          Loading the local model. Your question can be sent as soon as it is ready.
        </p>
        <ol className="stages">
          {(view.stages ?? []).map((s) => (
            <li key={s.name} className={`stage stage-${s.status}`} data-stage={s.name} data-status={s.status}>
              <span className="stage-name">{STAGE_LABEL[s.name] ?? s.name}</span>
              <span className="stage-status">{STATUS_LABEL[s.status]}</span>
              <span className="stage-time">
                {s.elapsedMs !== null ? `${seconds(s.elapsedMs)} s` : ''}
                {s.status !== 'done' ? ` (usually about ${seconds(s.typicalMs)} s)` : ''}
              </span>
            </li>
          ))}
        </ol>
      </div>
    );
  if (view.state === 'unloading')
    return (
      <p className="models-note" data-testid="models-panel" data-state="unloading" role="status">
        The local model is being released. You can load it again in a moment.
      </p>
    );
  // idle, or "search" (retrieval only, used by guest-key mode): the chat needs a full load.
  return (
    <div className="models-panel" data-testid="models-panel" data-state={view.state}>
      <p className="models-title">The local model is not loaded right now, to keep the owner&apos;s graphics card free.</p>
      <button type="button" className="primary" onClick={onLoad} disabled={busy || view.retryAfterSec !== undefined}>
        Load the local model
      </button>
      {view.retryAfterSec !== undefined && (
        <p className="state-note" role="status" data-testid="models-cooldown">
          The last load did not finish. A new attempt is possible in about {view.retryAfterSec} s.
        </p>
      )}
      <p className="fine-print">
        Loading usually takes about {seconds(view.typicalLoadMs)} s, a few seconds more just after the owner&apos;s
        computer restarts. The model is released again after {view.idleUnloadMinutes} minutes without questions.
      </p>
    </div>
  );
}
