/**
 * Models on demand (phase 4, step 4.10a; design in ai/APP-PLAN.md section 10, with the retrieval-only state the owner
 * accepted on 17 Nov 2026).
 *
 * One state machine for the served models, shown to visitors:
 *   off         the owner switch is off or the pause file is present; no visitor action touches the GPU
 *   idle        switch on, nothing loaded; a visitor can start a load
 *   loading     a load runs, in stages, each with its elapsed and typical time
 *   search      only the embedder (bge-m3) and the reranker are resident: enough for retrieval (guest-key mode, 4.6)
 *   ready       generator, embedder and reranker resident: questions are accepted
 *   unloading   models are being released (4.10b)
 *
 * Loads are explicit visitor actions with their own limits, single flight (a second request joins the running load),
 * run as jobs in the GPU queue so they never overlap a question, and never retried automatically. The order is fixed
 * by the step 3.5 finding: loading the generator evicts a resident bge-m3, so a full load is generator first, then
 * bge-m3, then the check; going from "search" to "ready" first releases bge-m3, then loads in the same order.
 */

export type ModelState = 'off' | 'idle' | 'loading' | 'search' | 'ready' | 'unloading';
export type LoadTarget = 'search' | 'ready';
export type StageName = 'release-embedder' | 'generator' | 'embedder' | 'check';

export interface Stage {
  name: StageName;
  status: 'pending' | 'running' | 'done' | 'failed';
  /** Milliseconds since the stage started (running) or how long it took (done, failed). */
  elapsedMs: number | null;
  /** Typical duration measured on the box (4.10d), shown instead of a percentage. */
  typicalMs: number;
}

/** What the page and /api/models see. Never carries a failure reason: that goes to the server log only. */
export interface ModelsView {
  state: ModelState;
  /** While loading: what the load will reach. */
  target?: LoadTarget;
  stages?: Stage[];
  /** Minutes without a question after which the models are released (4.10b). */
  idleUnloadMinutes: number;
  /** Typical time of a full load, for the "Load" button. */
  typicalLoadMs: number;
}

/** The model services behind the state machine: the real box (4.10b) or the dry run. */
export interface ModelBackend {
  loadGenerator(signal: AbortSignal): Promise<void>;
  loadEmbedder(signal: AbortSignal): Promise<void>;
  releaseEmbedder(signal: AbortSignal): Promise<void>;
  /** Null when the target set is resident as required, else the problem (for the log). */
  check(target: LoadTarget): Promise<string | null>;
}

export type TypicalMs = Record<StageName, number>;

export class LoadFailed extends Error {
  constructor(readonly stage: StageName, detail: string) {
    super(`${stage}: ${detail}`);
    this.name = 'LoadFailed';
  }
}

/** The stages a load runs, in order, from the current state to the target. */
export function plan(from: 'idle' | 'search' | 'ready', target: LoadTarget): StageName[] {
  if (target === 'search') return from === 'idle' ? ['embedder', 'check'] : [];
  if (from === 'ready') return [];
  return from === 'search' ? ['release-embedder', 'generator', 'embedder', 'check'] : ['generator', 'embedder', 'check'];
}

const rank = (s: ModelState) => (s === 'ready' ? 2 : s === 'search' ? 1 : 0);

export interface ModelsOptions {
  backend: ModelBackend;
  typicalMs: TypicalMs;
  /** True when the owner switch is on and the pause file is absent. Read on every call. */
  switchOn: () => boolean;
  idleUnloadMinutes?: number;
  now?: () => number;
  /** Starting state when the switch is on (the real engine before 4.10b starts already loaded). */
  initial?: 'idle' | 'ready';
  /** Server log line for a failed load; the visitor sees only that the load did not finish. */
  logFailure?: (message: string) => void;
}

export class Models {
  private current: 'idle' | 'search' | 'ready' | 'loading' | 'unloading';
  private load: { target: LoadTarget; stages: Stage[]; started: number[]; promise: Promise<ModelState> } | null = null;
  private readonly listeners = new Set<(v: ModelsView) => void>();
  private readonly now: () => number;

  constructor(private readonly o: ModelsOptions) {
    this.current = o.initial ?? 'idle';
    this.now = o.now ?? Date.now;
  }

  state(): ModelState {
    if (this.current === 'loading' || this.current === 'unloading') return this.current;
    return this.o.switchOn() ? this.current : 'off';
  }

  view(): ModelsView {
    const t = this.now();
    const base = {
      state: this.state(),
      idleUnloadMinutes: this.o.idleUnloadMinutes ?? 15,
      typicalLoadMs: this.o.typicalMs.generator + this.o.typicalMs.embedder + this.o.typicalMs.check,
    };
    if (!this.load || this.current !== 'loading') return base;
    const stages = this.load.stages.map((s, i) => (s.status === 'running' ? { ...s, elapsedMs: t - this.load!.started[i] } : { ...s }));
    return { ...base, target: this.load.target, stages };
  }

  /** True when the resident set serves the need: questions need "ready", guest retrieval needs "search" or more. */
  serves(need: LoadTarget): boolean {
    const s = this.state();
    return s === 'ready' || (need === 'search' && s === 'search');
  }

  /** Called on every change of the view (stage start, stage end, state change). Returns an unsubscribe function. */
  subscribe(f: (v: ModelsView) => void): () => void {
    this.listeners.add(f);
    return () => this.listeners.delete(f);
  }

  private emit() {
    const v = this.view();
    for (const f of this.listeners) f(v);
  }

  /** True when a request for this target would join a running load rather than start one (it is not counted). */
  joins(target: LoadTarget): boolean {
    return this.current === 'loading' && !!this.load && rank(this.load.target) >= rank(target);
  }

  /**
   * Starts a load to the target, or joins the running one. `run` is how the load enters the GPU queue (the server
   * passes the queue; tests pass a direct call). Resolves with the state reached; rejects with LoadFailed.
   */
  async start(target: LoadTarget, run: (work: (signal: AbortSignal) => Promise<ModelState>) => Promise<ModelState>): Promise<ModelState> {
    const s = this.state();
    if (s === 'off') throw new Error('switch-off');
    if (s === 'unloading') throw new Error('unloading');
    if (this.load && this.current === 'loading') {
      if (rank(this.load.target) >= rank(target)) return this.load.promise;
      // A full load asked for while a search load runs: wait for it, then go on from "search".
      await this.load.promise.catch(() => undefined);
      return this.start(target, run);
    }
    if (rank(s) >= rank(target)) return s;
    const from = this.current as 'idle' | 'search';
    const names = plan(from, target);
    const stages: Stage[] = names.map((name) => ({ name, status: 'pending', elapsedMs: null, typicalMs: this.o.typicalMs[name] }));
    const started: number[] = names.map(() => 0);
    this.current = 'loading';
    const promise = run((signal) => this.runStages(target, stages, started, signal)).catch((e: unknown) => {
      // Nothing is retried. What was loaded stays as the backend left it; 4.10b adds the release of a partial load.
      this.current = from === 'search' && !stages.some((x) => x.name === 'release-embedder' && x.status === 'done') ? 'search' : 'idle';
      this.o.logFailure?.(e instanceof Error ? e.message : String(e));
      this.emit();
      throw e instanceof LoadFailed ? e : new LoadFailed(stages.find((x) => x.status === 'running')?.name ?? 'check', e instanceof Error ? e.message : String(e));
    });
    this.load = { target, stages, started, promise };
    this.emit();
    return promise;
  }

  private async runStages(target: LoadTarget, stages: Stage[], started: number[], signal: AbortSignal): Promise<ModelState> {
    for (let i = 0; i < stages.length; i++) {
      const s = stages[i];
      s.status = 'running';
      started[i] = this.now();
      this.emit();
      try {
        if (s.name === 'release-embedder') await this.o.backend.releaseEmbedder(signal);
        else if (s.name === 'generator') await this.o.backend.loadGenerator(signal);
        else if (s.name === 'embedder') await this.o.backend.loadEmbedder(signal);
        else {
          const problem = await this.o.backend.check(target);
          if (problem) throw new LoadFailed('check', problem);
        }
      } catch (e) {
        s.status = 'failed';
        s.elapsedMs = this.now() - started[i];
        throw e instanceof LoadFailed ? e : new LoadFailed(s.name, e instanceof Error ? e.message : String(e));
      }
      s.status = 'done';
      s.elapsedMs = this.now() - started[i];
      this.emit();
    }
    this.current = target;
    this.emit();
    return target;
  }

  /**
   * The per-question residency check failed (Ollama restarted, a model evicted): the state drops to "idle" and the
   * visitor sees the load button again; nothing reloads by itself.
   */
  lost(reason: string) {
    if (this.current === 'loading' || this.current === 'unloading') return;
    this.current = 'idle';
    this.o.logFailure?.(`models lost: ${reason}`);
    this.emit();
  }
}
