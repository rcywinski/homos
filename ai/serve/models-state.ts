/**
 * Models on demand (phase 4, steps 4.10a and 4.10b; design in ai/APP-PLAN.md section 10, with the retrieval-only
 * state the owner accepted on 17 Nov 2026).
 *
 * One state machine for the served models, shown to visitors:
 *   off         the owner switch is off (or the pause file is present) and nothing is resident
 *   idle        switch on, nothing loaded; a visitor can start a load
 *   loading     a load runs, in stages, each with its elapsed and typical time
 *   search      only the embedder (bge-m3) and the reranker are resident: enough for retrieval (guest-key mode, 4.6)
 *   ready       generator, embedder and reranker resident: questions are accepted
 *   unloading   models are being released, or a release is not confirmed yet
 *
 * Loads are explicit visitor actions with their own limits, single flight (a second request joins the running load),
 * run as jobs in the GPU queue so they never overlap a question, and never retried automatically. The order is fixed
 * by the step 3.5 finding: loading the generator evicts a resident bge-m3, so a full load is generator first, then
 * bge-m3, then the check; going from "search" to "ready" first releases bge-m3, then loads in the same order.
 *
 * Releases (4.10b): after the idle time, when the switch goes off, after a failed or aborted load and when a model was
 * lost. A release always targets both models and is confirmed by /api/ps being empty of them, because aborting a
 * request does not stop Ollama from finishing a load (a model can appear after the abort). Until the release is
 * confirmed the state stays "unloading": saying "off" or "idle" while a model holds VRAM would be false. An unconfirmed
 * release is retried at an interval, with the reason in the server log, and no load is accepted meanwhile.
 */

export type ModelState = 'off' | 'idle' | 'loading' | 'search' | 'ready' | 'unloading';
export type LoadTarget = 'search' | 'ready';
export type StageName = 'release-embedder' | 'reranker' | 'generator' | 'embedder' | 'check';

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
  /** Minutes without a question after which the models are released. */
  idleUnloadMinutes: number;
  /** Typical time of a full load, for the "Load" button. */
  typicalLoadMs: number;
  /** Typical time of a search load (guest-key mode's "Load search"). */
  typicalSearchMs: number;
  /** After a failed load: seconds until a new load can be started. */
  retryAfterSec?: number;
}

/** What only the owner sees (admin page, 4.10c): the release that is not confirmed, and why. */
export interface ReleaseStatus {
  pending: boolean;
  reason?: string;
  problem?: string;
  lastCheck?: string;
  nextCheckInSec?: number;
}

/** The model services behind the state machine: the box through Ollama, or the dry run. */
export interface ModelBackend {
  loadGenerator(signal: AbortSignal): Promise<void>;
  loadEmbedder(signal: AbortSignal): Promise<void>;
  releaseEmbedder(signal: AbortSignal): Promise<void>;
  /** Step 4.10e: present when the server starts the reranker itself; then releaseAll ends it too. */
  loadReranker?(signal: AbortSignal): Promise<void>;
  /** Null when the target set is resident as required, else the problem (for the log). */
  check(target: LoadTarget): Promise<string | null>;
  /**
   * Releases both models and waits a bounded time for /api/ps to drop them: null when confirmed, else the problem.
   * `watchMs`: after an aborted or failed load, keep watching at least this long, because Ollama may still finish
   * the load and list the model later; anything that appears is released again.
   */
  releaseAll(watchMs?: number): Promise<string | null>;
}

/** Typical stage times; "reranker" is needed only when the server starts the reranker itself (step 4.10e). */
export type TypicalMs = Record<Exclude<StageName, 'reranker'>, number> & { reranker?: number };

export class LoadFailed extends Error {
  /** True when the load was stopped on purpose (switch off), not failed by the box. */
  aborted = false;
  constructor(readonly stage: StageName, detail: string) {
    super(`${stage}: ${detail}`);
    this.name = 'LoadFailed';
  }
}

/** A load refused before it started; `code` names the visitor message. */
export class LoadRefused extends Error {
  constructor(readonly code: 'switch-off' | 'unloading' | 'cooldown', readonly retryAfterSec?: number) {
    super(code);
    this.name = 'LoadRefused';
  }
}

/**
 * The stages a load runs, in order, from the current state to the target. With `withReranker` (step 4.10e: the server
 * starts the reranker itself) the reranker is the first stage of any load from idle, so it is resident before the
 * generator, the order every VRAM measurement used; from "search" it is already running.
 */
export function plan(from: 'idle' | 'search' | 'ready', target: LoadTarget, withReranker = false): StageName[] {
  const first: StageName[] = withReranker && from === 'idle' ? ['reranker'] : [];
  if (target === 'search') return from === 'idle' ? [...first, 'embedder', 'check'] : [];
  if (from === 'ready') return [];
  return from === 'search' ? ['release-embedder', 'generator', 'embedder', 'check'] : [...first, 'generator', 'embedder', 'check'];
}

const rank = (s: ModelState) => (s === 'ready' ? 2 : s === 'search' ? 1 : 0);

export interface ModelsOptions {
  backend: ModelBackend;
  typicalMs: TypicalMs;
  /** True when the owner switch is on and the pause file is absent. Read on every call. */
  switchOn: () => boolean;
  idleUnloadMinutes?: number;
  /** After a failed load, no new load for this long (owner, 17 Nov 2026: 2 minutes). */
  cooldownMs?: number;
  /** Interval between checks of an unconfirmed release. */
  releaseRetryMs?: number;
  /** After an aborted or failed load, how long the release watches /api/ps for a model that appears late. */
  lateLoadWatchMs?: number;
  /** True while a question runs or waits: the idle release waits for it. */
  busy?: () => boolean;
  now?: () => number;
  /** Starting state when the switch is on. */
  initial?: 'idle' | 'ready';
  /** Server log line; the visitor never sees these reasons. */
  log?: (message: string) => void;
}

type Resident = 'idle' | 'search' | 'ready';

export class Models {
  private current: Resident | 'loading' | 'unloading';
  private load: { target: LoadTarget; stages: Stage[]; started: number[]; promise: Promise<ModelState>; abort: AbortController } | null = null;
  private release: { reason: string; problem?: string; lastCheck?: number; nextCheck?: number; promise: Promise<void> } | null = null;
  private readonly listeners = new Set<(v: ModelsView) => void>();
  private readonly now: () => number;
  private lastUse: number;
  private cooldownUntil = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly o: ModelsOptions) {
    this.current = o.initial ?? 'idle';
    this.now = o.now ?? Date.now;
    this.lastUse = this.now();
  }

  private log(m: string) {
    this.o.log?.(m);
  }

  private withReranker(): boolean {
    return typeof this.o.backend.loadReranker === 'function';
  }

  private typical(name: StageName): number {
    return name === 'reranker' ? (this.o.typicalMs.reranker ?? 0) : this.o.typicalMs[name];
  }

  private typicalOf(names: StageName[]): number {
    return names.reduce((sum, n) => sum + this.typical(n), 0);
  }

  state(): ModelState {
    if (this.current === 'loading' || this.current === 'unloading') return this.current;
    if (this.o.switchOn()) return this.current;
    // Switch off with models still resident: they are about to be released, so "unloading", never "off".
    return this.current === 'idle' ? 'off' : 'unloading';
  }

  view(): ModelsView {
    const t = this.now();
    const state = this.state();
    const base: ModelsView = {
      state,
      idleUnloadMinutes: this.o.idleUnloadMinutes ?? 15,
      typicalLoadMs: this.typicalOf(plan('idle', 'ready', this.withReranker())),
      typicalSearchMs: this.typicalOf(plan('idle', 'search', this.withReranker())),
      ...(state === 'idle' && this.cooldownUntil > t ? { retryAfterSec: Math.ceil((this.cooldownUntil - t) / 1000) } : {}),
    };
    if (!this.load || this.current !== 'loading') return base;
    const stages = this.load.stages.map((s, i) => (s.status === 'running' ? { ...s, elapsedMs: t - this.load!.started[i] } : { ...s }));
    return { ...base, target: this.load.target, stages };
  }

  releaseStatus(): ReleaseStatus {
    if (!this.release) return { pending: false };
    const t = this.now();
    return {
      pending: true,
      reason: this.release.reason,
      ...(this.release.problem ? { problem: this.release.problem } : {}),
      ...(this.release.lastCheck ? { lastCheck: new Date(this.release.lastCheck).toISOString() } : {}),
      ...(this.release.nextCheck ? { nextCheckInSec: Math.max(0, Math.ceil((this.release.nextCheck - t) / 1000)) } : {}),
    };
  }

  /** The owner switch as it is now (guest verify needs no model, only the switch on: step 4.6a). */
  switchIsOn(): boolean {
    return this.o.switchOn();
  }

  /** True when the resident set serves the need: questions need "ready", guest retrieval needs "search" or more. */
  serves(need: LoadTarget): boolean {
    const s = this.state();
    return s === 'ready' || (need === 'search' && s === 'search');
  }

  /** Milliseconds until the idle release, while models are resident; null otherwise (admin page, 4.10c). */
  idleRemainingMs(): number | null {
    if (this.current !== 'ready' && this.current !== 'search') return null;
    return Math.max(0, (this.o.idleUnloadMinutes ?? 15) * 60_000 - (this.now() - this.lastUse));
  }

  /** A question used the models: the idle release counts from here. */
  touch() {
    this.lastUse = this.now();
  }

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
   * passes the queue; tests pass a direct call). Resolves with the state reached; rejects with LoadRefused or
   * LoadFailed. A failed or aborted load is followed by a release of both models.
   */
  async start(target: LoadTarget, run: (work: (signal: AbortSignal) => Promise<ModelState>) => Promise<ModelState>): Promise<ModelState> {
    const s = this.state();
    if (s === 'off') throw new LoadRefused('switch-off');
    if (s === 'unloading') throw new LoadRefused('unloading');
    if (this.load && this.current === 'loading') {
      if (rank(this.load.target) >= rank(target)) return this.load.promise;
      // A full load asked for while a search load runs: wait for it, then go on from "search".
      await this.load.promise.catch(() => undefined);
      return this.start(target, run);
    }
    if (rank(s) >= rank(target)) return s;
    const t = this.now();
    if (this.cooldownUntil > t) throw new LoadRefused('cooldown', Math.ceil((this.cooldownUntil - t) / 1000));
    const from = this.current as 'idle' | 'search';
    const names = plan(from, target, this.withReranker());
    const stages: Stage[] = names.map((name) => ({ name, status: 'pending', elapsedMs: null, typicalMs: this.typical(name) }));
    const started: number[] = names.map(() => 0);
    const abort = new AbortController();
    this.current = 'loading';
    const promise = run((queueSignal) => this.runStages(target, stages, started, AbortSignal.any([queueSignal, abort.signal]))).catch(async (e: unknown) => {
      const failure = e instanceof LoadFailed ? e : new LoadFailed(stages.find((x) => x.status === 'running')?.name ?? 'check', e instanceof Error ? e.message : String(e));
      failure.aborted = abort.signal.aborted;
      // Nothing is retried. A switch-off abort is not a failure of the box, so it starts no cool-down.
      if (!abort.signal.aborted) this.cooldownUntil = this.now() + (this.o.cooldownMs ?? 120_000);
      this.log(`model load ${abort.signal.aborted ? 'aborted' : 'failed'}: ${failure.message}`);
      this.current = 'unloading';
      this.emit();
      // Release both models (a model may still appear after the abort). Visitors waiting on this load get the
      // failure at once; the state stays "unloading" until the release is confirmed.
      void this.releaseNow(abort.signal.aborted ? 'load aborted' : 'load failed', this.o.lateLoadWatchMs ?? 30_000);
      throw failure;
    });
    this.load = { target, stages, started, promise, abort };
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
        signal.throwIfAborted();
        if (s.name === 'release-embedder') await this.o.backend.releaseEmbedder(signal);
        else if (s.name === 'reranker') await this.o.backend.loadReranker!(signal);
        else if (s.name === 'generator') await this.o.backend.loadGenerator(signal);
        else if (s.name === 'embedder') await this.o.backend.loadEmbedder(signal);
        else {
          const problem = await this.o.backend.check(target);
          if (problem) throw new LoadFailed('check', problem);
        }
        signal.throwIfAborted();
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
    this.lastUse = this.now();
    // The stage times feed the typical times shown to visitors (measured in 4.10d).
    this.log(`models loaded to ${target}: ${stages.map((x) => `${x.name} ${((x.elapsedMs ?? 0) / 1000).toFixed(1)} s`).join(', ')}`);
    this.emit();
    return target;
  }

  /**
   * Releases both models: aborts a running load first and waits for it to settle. Resolves when the release is
   * confirmed; an unconfirmed release keeps "unloading" and is retried by the timer (see tick).
   */
  async unload(reason: string): Promise<void> {
    if (this.release) return this.release.promise;
    if (this.current === 'loading' && this.load) {
      this.load.abort.abort(new Error(reason));
      await this.load.promise.catch(() => undefined);
      // The failed load started the release; wait for its confirmation (narrowing does not see that).
      return this.releaseStatus().pending ? (this.release as { promise: Promise<void> } | null)?.promise : undefined;
    }
    if (this.current === 'idle') return;
    this.current = 'unloading';
    this.emit();
    await this.releaseNow(reason);
  }

  private releaseNow(reason: string, watchMs = 0): Promise<void> {
    let watch = watchMs;
    const began = this.now();
    const attempt = async () => {
      const r = this.release!;
      const problem = await this.o.backend.releaseAll(watch).catch((e: unknown) => (e instanceof Error ? e.message : String(e)));
      r.lastCheck = this.now();
      watch = 0;
      if (problem) {
        r.problem = problem;
        r.nextCheck = this.now() + (this.o.releaseRetryMs ?? 30_000);
        this.log(`release not confirmed (${reason}): ${problem}; checking again in ${Math.round((this.o.releaseRetryMs ?? 30_000) / 1000)} s`);
        this.emit();
        return false;
      }
      this.log(`models released (${reason}) in ${((this.now() - began) / 1000).toFixed(1)} s`);
      this.release = null;
      this.current = 'idle';
      this.emit();
      return true;
    };
    let resolveDone!: () => void;
    const promise = new Promise<void>((r) => (resolveDone = r));
    this.release = { reason, promise };
    void attempt().then((ok) => ok && resolveDone());
    this.retryRelease = async () => {
      if ((await attempt()) === true) resolveDone();
    };
    return promise;
  }

  private retryRelease: (() => Promise<void>) | null = null;

  /**
   * At start-up: models left loaded by a previous server process are released, so the state never says "off" or
   * "idle" while they hold VRAM ("unloading" until the release is confirmed).
   */
  releaseLeftovers(names: string[]): Promise<void> {
    if (!names.length || this.current !== 'idle') return Promise.resolve();
    this.log(`models found loaded at start-up (${names.join(', ')}): releasing them`);
    this.current = 'unloading';
    this.emit();
    return this.releaseNow('found loaded at start-up');
  }

  /**
   * The per-question residency check failed (Ollama restarted, a model evicted): release whatever is left, then the
   * visitor sees the load button again; nothing reloads by itself.
   */
  lost(reason: string): Promise<void> {
    if (this.current === 'loading' || this.current === 'unloading') return Promise.resolve();
    this.log(`models lost: ${reason}`);
    this.current = 'unloading';
    this.emit();
    return this.releaseNow(`lost: ${reason}`);
  }

  /**
   * One step of the background work, every second from start(): the switch turned off, the idle time passed, an
   * unconfirmed release due for another check. Exposed for tests, which drive it with their own clock.
   */
  async tick(): Promise<void> {
    const t = this.now();
    if (this.release) {
      if (this.release.nextCheck && t >= this.release.nextCheck && this.retryRelease) {
        this.release.nextCheck = undefined;
        await this.retryRelease();
      }
      return;
    }
    if (!this.o.switchOn() && (this.current === 'loading' || this.current === 'search' || this.current === 'ready')) {
      await this.unload('switch off');
      return;
    }
    const idleMs = (this.o.idleUnloadMinutes ?? 15) * 60_000;
    if ((this.current === 'search' || this.current === 'ready') && t - this.lastUse >= idleMs && !(this.o.busy?.() ?? false)) {
      await this.unload(`idle ${this.o.idleUnloadMinutes ?? 15} min`);
    }
  }

  /** Starts the background timer (the server); tests call tick() themselves. */
  startTimer(intervalMs = 1000) {
    if (this.timer) return;
    let running = false;
    this.timer = setInterval(() => {
      if (running) return;
      running = true;
      void this.tick().finally(() => (running = false));
    }, intervalMs);
    this.timer.unref?.();
  }

  stopTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
