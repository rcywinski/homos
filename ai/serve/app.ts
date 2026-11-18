/**
 * HTTP surface of the public chat (phase 4, steps 4.3 and 4.4). Two routes only:
 *   GET  /api/health  "up", "busy" or "model-offline", the queue length and the served engine; nothing else.
 *   POST /api/ask     { question } -> AskResponse as JSON, or as a Server-Sent Events stream when the request has
 *                     `Accept: text/event-stream`: status events (queued with position, retrieving, generating) and
 *                     then one `result` event with the whole verified answer. The answer text is never streamed token
 *                     by token, because it is verified only once complete.
 *   GET  /api/models       the state of the served models (step 4.10a): off, idle, loading with stages, search, ready.
 *   POST /api/models/load  starts a model load or joins the running one; with `Accept: text/event-stream` it streams
 *                     a `models` event on every stage change and ends with `result` (the state reached) or `error`.
 *                     Loads have their own limits; joining a running load is free. A visitor who leaves does not stop
 *                     the load: other visitors may be waiting for it.
 *   POST /api/guest/retrieve  guest-key mode (step 4.6a): { question } -> the Messages API request body, the
 *                     sources and a signed ticket; the browser calls Anthropic with the visitor's key.
 *   POST /api/guest/verify    { question, ticket, answer } -> the answer checked like a local one, as AskResponse.
 * Nothing that looks like an Anthropic key (sk-ant-) is accepted anywhere under /api: in the URL, a header or the
 * body it is refused with a fixed text before anything else runs, and the log keeps only the outcome.
 * Errors never carry a stack or an internal message.
 *
 * Order of checks for a question: shape and length, rate limit (counted), refusal without GPU work (advice), box
 * probe, queue. A question the queue refuses is given back to the visitor's limit.
 */
import express, { type NextFunction, type Request, type Response } from 'express';
import type { Chunk } from '../corpus/types';
import { ask, ModelUnavailable, present, refusedBeforeWork, sourceOf, type AskDeps, type AskResponse, type Stage } from './ask';
import path from 'path';
import type { AccessVerifier } from './access';
import type { OwnerSwitch } from './admin';
import { checkGuestAnswer, GUEST_ENGINE, guestRequestBody, looksLikeKey, maskChunk, type Tickets } from './guest';
import type { RequestLog } from './log';
import { LoadFailed, LoadRefused, Models, type ModelBackend, type ModelsView } from './models-state';
import { GpuQueue, JobCancelled, JobTimeout, QueueRefused } from './queue';
import { clientIp, RateLimiter } from './ratelimit';
import { securityHeaders } from './headers';
import { cleanQuestion, isPlainQuestion } from './scope';
import { BAD_QUESTION } from './texts';

export interface BoxProbe {
  /** True when the model services answer; implementations cache the result for a short time. */
  up(): Promise<boolean>;
}

export interface AppOptions {
  maxQuestionChars: number;
  queue: GpuQueue;
  limiter: RateLimiter;
  log: RequestLog;
  probe: BoxProbe;
  trustProxy: 'none' | 'cloudflare';
  /** True while the owner has paused the chat (pause file present), for example during evaluation runs on the GPU. */
  paused: () => boolean;
  /** Built showcase (`showcase/public`), served by the same process on the box; omitted in API-only tests. */
  staticDir?: string;
  /**
   * Sanitized wallet export, already checked at start by loadWalletForServing (step 4.7, M1) and held in memory;
   * served at /data/wallet.json. Undefined: 404, and the page hides the Wallet tab.
   */
  walletJson?: string;
  /**
   * The served models (step 4.10a). Omitted: the models count as always loaded while the chat is not paused, which is
   * how the real engine runs until 4.10b and how the older tests run.
   */
  models?: Models;
  /** Limits on model loads, apart from the question limits. Required with `models`. */
  loadLimiter?: RateLimiter;
  /** Guest-key mode (step 4.6a); omitted: its routes answer 404. */
  guest?: GuestOptions;
  /** The admin page (step 4.10c); omitted: /admin and /api/admin answer 404. */
  admin?: AdminOptions;
}

export interface AdminOptions {
  verifier: AccessVerifier;
  switch: OwnerSwitch;
  /** Limits denied admin requests per visitor, so a flood of bad tokens cannot fill the log. */
  denyLimiter: RateLimiter;
  /** The page's HTML and CSS (showcase/admin) and its built script (showcase/admin-dist). */
  htmlFile: string;
  cssFile: string;
  jsFile: string;
  /**
   * Step 4.10e, read only: true when a Python process other than the site's own reranker holds the GPU (the
   * evaluation instance on 11435, started for a run); null when nvidia-smi cannot be read.
   */
  otherReranker?: () => Promise<boolean | null>;
}

export interface GuestOptions {
  tickets: Tickets;
  /** The corpus chunk for an id (unmasked; masked here as for retrieval). */
  chunkById: (id: string) => Chunk | undefined;
  /** Limits on verify calls, apart from retrieval, which counts as a question. */
  verifyLimiter: RateLimiter;
  root?: string;
}

/** Largest accepted body of /api/guest/verify: the measured answers are at most about 4 KB of JSON. */
export const GUEST_VERIFY_MAX_BYTES = 16 * 1024;

const NO_BACKEND: ModelBackend = {
  loadGenerator: async () => undefined,
  loadEmbedder: async () => undefined,
  releaseEmbedder: async () => undefined,
  check: async () => null,
  releaseAll: async () => null,
};

const BAD_LOAD = 'This request is not understood. The page loads the model with its own button.';

/** Fixed messages for every refusal; the UI shows them as they are. */
export const MESSAGES = {
  hour: 'You have asked the most questions allowed in an hour. Please try again later.',
  day: 'You have asked the most questions allowed today. Please come back tomorrow.',
  global: 'The chat has answered all the questions it can today. Please come back tomorrow. The saved comparison is still available.',
  busy: 'The local model is busy with other questions. Please try again in a few minutes. The saved comparison is still available.',
  'visitor-pending': 'Your previous question is still being answered.',
  offline: 'The local model is offline right now. The saved comparison and the archive are still available.',
  paused: 'The chat is paused while the GPU is used for other work. The saved comparison and the archive are still available.',
  'model-unavailable':
    'The local model could not answer right now: the GPU may be busy with other work, or the model may not fit in its memory at the moment. Please try again later. The saved comparison is still available.',
  timeout: 'The answer took too long and was stopped. Please try again later.',
  internal: 'Something went wrong on the server.',
  'not-loaded': 'The local model is not loaded. Press "Load the local model" first; loading takes about half a minute.',
  loading: 'The local model is still loading. Your question can be sent as soon as it is ready.',
  'switch-off': 'The assistant is offline right now: the owner has switched the local model off. The saved answers and the reports still work.',
  'load-hour': 'You have started the most model loads allowed in an hour. Please try again later.',
  'load-day': 'You have started the most model loads allowed today. Please come back tomorrow.',
  'load-global': 'The model has been loaded as many times as allowed today. Please come back tomorrow. The saved answers are still available.',
  'key-refused':
    'This request contained something that looks like an API key, so it was refused and not stored. Your key is only for Anthropic: the page sends it from your browser to api.anthropic.com, never to this site.',
  'search-not-loaded': 'The search model is not loaded. Press "Load search" first; it takes a few seconds.',
  ticket: 'This answer can no longer be checked: more than 10 minutes passed, or the server restarted. Please ask again.',
  'admin-denied': 'Not allowed.',
  'admin-master-off': 'The switch on the box is off; the page cannot turn the models on until it is on.',
  'load-failed': 'The local model could not be loaded right now. Please try again later. The saved answers are still available.',
  unloading: 'The local model is being released. You can load it again in a moment.',
  cooldown: 'The last attempt to load the local model failed. A new attempt is possible in a moment.',
} as const;

type ErrorCode = keyof typeof MESSAGES | 'bad-request' | 'too-long' | 'too-large' | 'not-found';

/** True when any header value carries something that looks like an Anthropic key. */
const keyInHeaders = (h: Request['headers']) => Object.values(h).some((v) => (Array.isArray(v) ? v.some(looksLikeKey) : typeof v === 'string' && looksLikeKey(v)));

/** The message for a question that arrives while the models cannot answer it. */
function notServing(view: ModelsView): 'not-loaded' | 'loading' | 'unloading' | 'switch-off' {
  if (view.state === 'off') return 'switch-off';
  if (view.state === 'unloading') return 'unloading';
  if (view.state === 'loading') return 'loading';
  return 'not-loaded';
}

class Reply {
  private sse = false;
  constructor(private readonly res: Response) {}

  startStream() {
    this.sse = true;
    this.res.status(200).set({ 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store', 'x-accel-buffering': 'no' });
    this.res.flushHeaders();
  }

  event(name: 'queued' | 'models' | Stage, data: Record<string, unknown> | ModelsView = {}) {
    if (this.sse && !this.res.writableEnded) this.res.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  result(r: AskResponse | { models: ModelsView }) {
    if (this.sse) this.end('result', r);
    else this.res.json(r);
  }

  error(status: number, code: ErrorCode, message: string, retryAfterSec?: number) {
    const body = { error: code, message, ...(retryAfterSec !== undefined ? { retryAfterSec } : {}) };
    if (this.sse) return this.end('error', body);
    if (retryAfterSec !== undefined) this.res.set('retry-after', String(retryAfterSec));
    this.res.status(status).json(body);
  }

  private end(name: string, data: unknown) {
    if (!this.res.writableEnded) this.res.end(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
  }
}

export function createApp(deps: AskDeps, opts: AppOptions) {
  const app = express();
  const models = opts.models ?? new Models({ backend: NO_BACKEND, typicalMs: { 'release-embedder': 0, generator: 0, embedder: 0, check: 0 }, switchOn: () => !opts.paused(), initial: 'ready' });
  const loadLimiter = opts.loadLimiter ?? new RateLimiter({ perHour: 2, perDay: 6, globalPerDay: 30 });

  // Today's outcomes for the admin page: counted from the request log as it is written, per UTC day, in memory.
  const today = { day: '', counts: {} as Record<string, number> };
  const baseLog = opts.log;
  opts = {
    ...opts,
    log: {
      write(e) {
        const d = new Date().toISOString().slice(0, 10);
        if (d !== today.day) {
          today.day = d;
          today.counts = {};
        }
        today.counts[e.outcome] = (today.counts[e.outcome] ?? 0) + 1;
        baseLog.write(e);
      },
    },
  };
  app.disable('x-powered-by');
  app.use(securityHeaders);

  // M3: say once in the server log when the mode and the traffic disagree (a tunnel in front of a server in local mode
  // would count every visitor as one; a tunnel-mode server reached without the tunnel has no CF-Connecting-IP).
  let warned = false;
  const warnOnModeMismatch = (hasTunnelHeader: boolean) => {
    if (warned) return;
    if (opts.trustProxy === 'none' && hasTunnelHeader) {
      warned = true;
      console.warn('[serve] requests carry CF-Connecting-IP but SERVE_MODE is local: every visitor shares one limit. Set SERVE_MODE=tunnel.');
    } else if (opts.trustProxy === 'cloudflare' && !hasTunnelHeader) {
      warned = true;
      console.warn('[serve] SERVE_MODE is tunnel but a request came without CF-Connecting-IP: it was counted by its socket address.');
    }
  };
  // Step 4.6a: an Anthropic key never reaches a handler or the log. URL and headers are checked before the body is
  // parsed, the body right after; the response does not echo what was sent.
  const refuseKey = (req: Request, res: Response) => {
    const visitor = opts.limiter.visitor(clientIp(req.headers, req.socket.remoteAddress, opts.trustProxy));
    opts.log.write({ visitor, outcome: 'refused-key', ms: 0 });
    res.status(400).json({ error: 'key-refused', message: MESSAGES['key-refused'] });
  };
  app.use('/api', (req, res, next) => (looksLikeKey(req.originalUrl) || keyInHeaders(req.headers) ? refuseKey(req, res) : next()));
  const smallJson = express.json({ limit: '2kb', strict: true, type: 'application/json' });
  const verifyJson = express.json({ limit: GUEST_VERIFY_MAX_BYTES, strict: true, type: 'application/json' });
  app.use((req, res, next) => (req.path === '/api/guest/verify' ? verifyJson(req, res, next) : smallJson(req, res, next)));
  app.use('/api', (req, res, next) => (req.body !== undefined && looksLikeKey(JSON.stringify(req.body)) ? refuseKey(req, res) : next()));

  app.get('/api/health', async (_req, res) => {
    const q = opts.queue.state();
    const up = await opts.probe.up().catch(() => false);
    const status = opts.paused() ? 'paused' : !up ? 'model-offline' : q.running && q.waiting >= q.maxWaiting ? 'busy' : 'up';
    res.set('cache-control', 'no-store').json({ status, queue: { waiting: q.waiting, max: q.maxWaiting }, engine: deps.engine, models: models.view() });
  });

  app.get('/api/models', (_req, res) => {
    res.set('cache-control', 'no-store').json(models.view());
  });

  app.post('/api/models/load', async (req: Request, res: Response) => {
    const reply = new Reply(res);
    const body: unknown = req.body;
    const raw = body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>).target : undefined;
    // "ready" for the chat; "search" (bge-m3 and the reranker only) for guest-key mode (4.6a). Same limits for both.
    if (raw !== undefined && raw !== 'ready' && raw !== 'search') return reply.error(400, 'bad-request', BAD_LOAD);
    const target = raw === 'search' ? 'search' : 'ready';
    const visitor = opts.limiter.visitor(clientIp(req.headers, req.socket.remoteAddress, opts.trustProxy));
    const t0 = Date.now();
    const log = (outcome: string, detail?: string) => opts.log.write({ visitor, outcome: `load-${outcome}`, ms: Date.now() - t0, ...(detail ? { detail } : {}) });

    if (opts.paused() || models.state() === 'off') {
      log('switch-off');
      return reply.error(503, 'switch-off', MESSAGES['switch-off']);
    }
    if (models.state() === 'unloading') {
      log('unloading');
      return reply.error(503, 'unloading', MESSAGES.unloading);
    }
    const cooldown = models.view().retryAfterSec;
    if (cooldown !== undefined) {
      log('cooldown');
      return reply.error(503, 'cooldown', MESSAGES.cooldown, cooldown);
    }
    if (models.serves(target)) return reply.result({ models: models.view() });
    const joining = models.joins(target);
    if (!joining) {
      const limit = loadLimiter.take(visitor);
      if (!limit.ok) {
        log(`limited-${limit.reason}`);
        const code = `load-${limit.reason}` as const;
        return reply.error(429, code, MESSAGES[code], limit.retryAfterSec);
      }
    }
    if (String(req.headers.accept ?? '').includes('text/event-stream')) reply.startStream();
    const off = models.subscribe((v) => reply.event('models', v));
    try {
      const reached = await models.start(target, (work) => opts.queue.run(`load:${visitor}`, work, {}));
      log(joining ? 'joined' : 'done', reached);
      reply.result({ models: models.view() });
    } catch (e) {
      if (e instanceof QueueRefused) {
        if (!joining) loadLimiter.refund(visitor);
        log(`refused-${e.reason}`);
        return reply.error(503, 'busy', MESSAGES.busy);
      }
      if (e instanceof LoadRefused) {
        if (!joining) loadLimiter.refund(visitor);
        log(e.code);
        return reply.error(503, e.code, MESSAGES[e.code], e.retryAfterSec);
      }
      // Step 4.10d: a load stopped by the owner switch is not a failure of the box; say what happened, give it back.
      if (e instanceof LoadFailed && e.aborted) {
        if (!joining) loadLimiter.refund(visitor);
        log('aborted', e.stage);
        return reply.error(503, 'switch-off', MESSAGES['switch-off']);
      }
      // Owner, 17 Nov 2026: a failed load counts against the visitor, not against the site's daily total.
      if (!joining) loadLimiter.refundGlobal();
      log('failed', e instanceof LoadFailed ? e.stage : e instanceof Error ? e.message : 'unknown');
      reply.error(503, 'load-failed', MESSAGES['load-failed']);
    } finally {
      off();
    }
  });

  app.post('/api/ask', async (req: Request, res: Response) => {
    const reply = new Reply(res);
    const body: unknown = req.body;
    const raw = body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>).question : undefined;
    const question = typeof raw === 'string' ? cleanQuestion(raw) : '';
    warnOnModeMismatch(req.headers['cf-connecting-ip'] !== undefined);
    if (!question || !isPlainQuestion(question)) return reply.error(400, 'bad-request', BAD_QUESTION);
    if (question.length > opts.maxQuestionChars) return reply.error(400, 'too-long', `Please keep the question under ${opts.maxQuestionChars} characters.`);

    const visitor = opts.limiter.visitor(clientIp(req.headers, req.socket.remoteAddress, opts.trustProxy));
    const t0 = Date.now();
    const log = (outcome: string, detail?: string) => opts.log.write({ visitor, outcome, ms: Date.now() - t0, question, ...(detail ? { detail } : {}) });

    const limit = opts.limiter.take(visitor);
    if (!limit.ok) {
      log(`limited-${limit.reason}`);
      return reply.error(429, limit.reason, MESSAGES[limit.reason], limit.retryAfterSec);
    }

    if (refusedBeforeWork(question)) {
      const r = await ask(deps, question);
      log(r.outcome);
      return reply.result(r);
    }

    if (opts.paused()) {
      opts.limiter.refund(visitor);
      log('paused');
      return reply.error(503, 'paused', MESSAGES.paused);
    }

    if (!models.serves('ready')) {
      opts.limiter.refund(visitor);
      const code = notServing(models.view());
      log(code);
      return reply.error(503, code, MESSAGES[code]);
    }

    if (!(await opts.probe.up().catch(() => false))) {
      opts.limiter.refund(visitor);
      log('offline');
      return reply.error(503, 'offline', MESSAGES.offline);
    }

    if (String(req.headers.accept ?? '').includes('text/event-stream')) reply.startStream();
    const left = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) left.abort();
    });

    try {
      const r = await opts.queue.run(visitor, (signal) => (models.touch(), ask(deps, question, (s) => reply.event(s), signal).finally(() => models.touch())), {
        onPosition: (position, waiting) => reply.event('queued', { position, waiting }),
        signal: left.signal,
      });
      log(r.outcome);
      reply.result(r);
    } catch (e) {
      if (e instanceof QueueRefused) {
        opts.limiter.refund(visitor);
        log(`refused-${e.reason}`);
        return reply.error(e.reason === 'busy' ? 503 : 429, e.reason, MESSAGES[e.reason]);
      }
      if (e instanceof JobCancelled || (e instanceof Error && e.name === 'AbortError')) {
        opts.limiter.refund(visitor);
        return log('cancelled');
      }
      if (e instanceof ModelUnavailable) {
        log('model-unavailable', e.stage);
        return reply.error(503, 'model-unavailable', MESSAGES['model-unavailable']);
      }
      if (e instanceof JobTimeout) {
        log('timeout');
        return reply.error(504, 'timeout', MESSAGES.timeout);
      }
      log('internal', e instanceof Error ? e.name : 'unknown');
      console.error(`[serve] ${new Date().toISOString()} internal error: ${e instanceof Error ? e.name : 'unknown'}`);
      reply.error(500, 'internal', MESSAGES.internal);
    }
  });

  const guest = opts.guest;
  if (guest) {
    const questionOf = (body: unknown) => {
      const raw = body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>).question : undefined;
      return typeof raw === 'string' ? cleanQuestion(raw) : '';
    };

    app.post('/api/guest/retrieve', async (req: Request, res: Response) => {
      const reply = new Reply(res);
      const question = questionOf(req.body);
      if (!question || !isPlainQuestion(question)) return reply.error(400, 'bad-request', BAD_QUESTION);
      if (question.length > opts.maxQuestionChars) return reply.error(400, 'too-long', `Please keep the question under ${opts.maxQuestionChars} characters.`);
      const visitor = opts.limiter.visitor(clientIp(req.headers, req.socket.remoteAddress, opts.trustProxy));
      const t0 = Date.now();
      const log = (outcome: string, detail?: string) => opts.log.write({ visitor, outcome, ms: Date.now() - t0, question, engine: GUEST_ENGINE.id, ...(detail ? { detail } : {}) });
      // A guest question counts against the same limits as a local one.
      const limit = opts.limiter.take(visitor);
      if (!limit.ok) {
        log(`limited-${limit.reason}`);
        return reply.error(429, limit.reason, MESSAGES[limit.reason], limit.retryAfterSec);
      }
      if (refusedBeforeWork(question)) {
        const r = await ask({ ...deps, engine: GUEST_ENGINE }, question);
        log(r.outcome);
        return reply.result(r);
      }
      if (opts.paused() || !models.switchIsOn()) {
        opts.limiter.refund(visitor);
        log('switch-off');
        return reply.error(503, 'switch-off', MESSAGES['switch-off']);
      }
      if (!models.serves('search')) {
        opts.limiter.refund(visitor);
        const code = models.state() === 'idle' ? 'search-not-loaded' : notServing(models.view());
        log(code);
        return reply.error(503, code, MESSAGES[code]);
      }
      try {
        const chunks = await opts.queue.run(visitor, async (signal) => {
          models.touch();
          if (deps.beforeSearch) await deps.beforeSearch();
          const found = await deps.retrieval.retrieve(question, deps.k);
          signal.throwIfAborted();
          return found;
        });
        const masked = chunks.map(maskChunk);
        log('guest-retrieved');
        res.set('cache-control', 'no-store').json({
          request: guestRequestBody(question, masked),
          sources: masked.map(sourceOf),
          ticket: guest.tickets.issue(question, masked.map((c) => c.id)),
          engine: GUEST_ENGINE,
        });
      } catch (e) {
        if (e instanceof QueueRefused) {
          opts.limiter.refund(visitor);
          log(`refused-${e.reason}`);
          return reply.error(e.reason === 'busy' ? 503 : 429, e.reason, MESSAGES[e.reason]);
        }
        log('model-unavailable', e instanceof Error ? e.name : 'unknown');
        reply.error(503, 'model-unavailable', MESSAGES['model-unavailable']);
      }
    });

    // Verify needs no model: it works in every model state while the ticket is valid; only the owner switch stops it.
    app.post('/api/guest/verify', (req: Request, res: Response) => {
      const reply = new Reply(res);
      const body = req.body as Record<string, unknown> | undefined;
      const question = questionOf(body);
      if (!question || !isPlainQuestion(question) || question.length > opts.maxQuestionChars) return reply.error(400, 'bad-request', BAD_QUESTION);
      const visitor = opts.limiter.visitor(clientIp(req.headers, req.socket.remoteAddress, opts.trustProxy));
      const t0 = Date.now();
      const log = (outcome: string, detail?: string) => opts.log.write({ visitor, outcome, ms: Date.now() - t0, question, engine: GUEST_ENGINE.id, ...(detail ? { detail } : {}) });
      if (opts.paused() || !models.switchIsOn()) {
        log('switch-off');
        return reply.error(503, 'switch-off', MESSAGES['switch-off']);
      }
      const limit = guest.verifyLimiter.take(visitor);
      if (!limit.ok) {
        log(`limited-verify-${limit.reason}`);
        return reply.error(429, limit.reason, MESSAGES[limit.reason], limit.retryAfterSec);
      }
      const t = guest.tickets.check(body?.ticket, question);
      const chunks = t.ok ? t.ids.map((id) => guest.chunkById(id)) : [];
      if (!t.ok || chunks.some((c) => !c)) {
        log('ticket', t.ok ? 'unknown-chunk' : t.problem);
        return reply.error(400, 'ticket', MESSAGES.ticket);
      }
      const masked = (chunks as Chunk[]).map(maskChunk);
      const r = present(GUEST_ENGINE, checkGuestAnswer(body?.answer, masked, guest.root), masked, masked.map(sourceOf), t0);
      log(r.outcome);
      reply.result(r);
    });
  }

  const admin = opts.admin;
  if (admin) {
    // Every /admin and /api/admin request: a valid Access JWT first. Denials are limited per visitor and logged with
    // the reason only; the response is a fixed text.
    const gate = async (req: Request, res: Response, next: NextFunction) => {
      const r = await admin.verifier.verify(req.headers['cf-access-jwt-assertion']);
      if (r.ok) return next();
      const visitor = opts.limiter.visitor(clientIp(req.headers, req.socket.remoteAddress, opts.trustProxy));
      if (!admin.denyLimiter.take(visitor).ok) return res.status(429).type('text/plain').send('Too many requests.');
      opts.log.write({ visitor, outcome: 'admin-denied', ms: 0, detail: r.reason });
      res.status(403).type('text/plain').send(MESSAGES['admin-denied']);
    };
    app.use(['/admin', '/api/admin'], (req, res, next) => void gate(req, res, next));
    app.get('/admin', (_req, res) => res.set({ 'cache-control': 'no-store', 'x-robots-tag': 'noindex' }).sendFile(path.resolve(admin.htmlFile)));
    app.get('/admin/admin.js', (_req, res) => res.set('cache-control', 'no-store').sendFile(path.resolve(admin.jsFile)));
    app.get('/admin/admin.css', (_req, res) => res.set('cache-control', 'no-store').sendFile(path.resolve(admin.cssFile)));
    app.get('/api/admin/state', async (_req, res) => {
      const idle = models.idleRemainingMs();
      const otherReranker = admin.otherReranker ? await admin.otherReranker().catch(() => null) : null;
      const q = opts.queue.state();
      res.set('cache-control', 'no-store').json({
        switch: { effective: models.switchIsOn(), master: admin.switch.master(), page: admin.switch.page() },
        models: models.view(),
        release: models.releaseStatus(),
        idleReleaseInMinutes: idle === null ? null : Math.ceil(idle / 60_000),
        queue: { running: q.running, waiting: q.waiting },
        today: { day: today.day || new Date().toISOString().slice(0, 10), outcomes: today.counts },
        otherReranker,
      });
    });
    // The one action: on or off. JSON only (a cross-site form cannot send it without a preflight), same origin only.
    app.post('/api/admin/switch', (req: Request, res: Response) => {
      const host = req.headers.host ?? '';
      const origin = req.headers.origin ?? '';
      const site = req.headers['sec-fetch-site'];
      const sameOrigin = origin === `https://${host}` || (/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host) && origin === `http://${host}`);
      if (!req.is('application/json') || !sameOrigin || (site !== undefined && site !== 'same-origin')) {
        return res.status(403).type('text/plain').send(MESSAGES['admin-denied']);
      }
      const body = req.body as Record<string, unknown> | undefined;
      if (typeof body?.on !== 'boolean') return res.status(400).json({ error: 'bad-request', message: 'Send { "on": true } or { "on": false }.' });
      const r = admin.switch.set(body.on ? 'on' : 'off');
      if (!r.ok) return res.status(409).json({ error: 'master-off', message: MESSAGES['admin-master-off'] });
      opts.log.write({ visitor: 'owner', outcome: 'admin-switch', ms: 0, detail: `${r.from}->${body.on ? 'on' : 'off'}` });
      // Off releases the models through the same path as the switch file (4.10b), without waiting for the timer.
      if (!body.on) void models.unload('admin page off');
      res.set('cache-control', 'no-store').json({ ok: true, switch: { effective: models.switchIsOn(), master: admin.switch.master(), page: admin.switch.page() } });
    });
  }

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'not-found' });
  });

  // The wallet data lives outside the built page. A missing file is a plain 404, and the page then hides the tab.
  app.get('/data/wallet.json', (_req, res) => {
    if (opts.walletJson === undefined) return res.status(404).json({ error: 'not-found' });
    res.set('cache-control', 'no-store').type('application/json').send(opts.walletJson);
  });

  if (opts.staticDir) {
    // The page carries its own CSP meta tag; data files must not be cached long, the bundle can be.
    app.use(express.static(opts.staticDir, { index: 'index.html', dotfiles: 'deny', fallthrough: true, maxAge: 0 }));
  }

  // L3: anything else is a plain 404, not the framework's default page (which names the framework and echoes the path).
  app.use((_req, res) => {
    res.status(404).type('text/plain').send('Not found');
  });

  // Body parser errors (too large, invalid JSON): a fixed message, no details.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status = typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number' && err.status < 500 ? err.status : 500;
    if (status === 500) console.error(`[serve] ${new Date().toISOString()} internal error: ${err instanceof Error ? err.name : 'unknown'}`);
    res.status(status).json({ error: status === 413 ? 'too-large' : status === 500 ? 'internal' : 'bad-request', message: status === 500 ? MESSAGES.internal : BAD_QUESTION });
  });

  return app;
}
