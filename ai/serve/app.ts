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
 * `/api/retrieve` (guest-key mode) waits for step 4.6. Errors never carry a stack or an internal message.
 *
 * Order of checks for a question: shape and length, rate limit (counted), refusal without GPU work (advice), box
 * probe, queue. A question the queue refuses is given back to the visitor's limit.
 */
import express, { type NextFunction, type Request, type Response } from 'express';
import { ask, ModelUnavailable, refusedBeforeWork, type AskDeps, type AskResponse, type Stage } from './ask';
import type { RequestLog } from './log';
import { LoadFailed, Models, type ModelBackend, type ModelsView } from './models-state';
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
}

const NO_BACKEND: ModelBackend = {
  loadGenerator: async () => undefined,
  loadEmbedder: async () => undefined,
  releaseEmbedder: async () => undefined,
  check: async () => null,
};

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
  'load-failed': 'The local model could not be loaded right now. Please try again later. The saved answers are still available.',
} as const;

type ErrorCode = keyof typeof MESSAGES | 'bad-request' | 'too-long' | 'too-large' | 'not-found';

/** The message for a question that arrives while the models cannot answer it. */
function notServing(view: ModelsView): 'not-loaded' | 'loading' | 'switch-off' {
  if (view.state === 'off') return 'switch-off';
  if (view.state === 'loading' || view.state === 'unloading') return 'loading';
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
  app.use(express.json({ limit: '2kb', strict: true, type: 'application/json' }));

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
    // Only the full load has a visitor control so far; "search" (retrieval only) opens with guest-key mode (4.6).
    if (raw !== undefined && raw !== 'ready') return reply.error(400, 'bad-request', BAD_QUESTION);
    const visitor = opts.limiter.visitor(clientIp(req.headers, req.socket.remoteAddress, opts.trustProxy));
    const t0 = Date.now();
    const log = (outcome: string, detail?: string) => opts.log.write({ visitor, outcome: `load-${outcome}`, ms: Date.now() - t0, ...(detail ? { detail } : {}) });

    if (opts.paused() || models.state() === 'off') {
      log('switch-off');
      return reply.error(503, 'switch-off', MESSAGES['switch-off']);
    }
    if (models.serves('ready')) return reply.result({ models: models.view() });
    const joining = models.joins('ready');
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
      const reached = await models.start('ready', (work) => opts.queue.run(`load:${visitor}`, work, {}));
      log(joining ? 'joined' : 'done', reached);
      reply.result({ models: models.view() });
    } catch (e) {
      if (e instanceof QueueRefused) {
        if (!joining) loadLimiter.refund(visitor);
        log(`refused-${e.reason}`);
        return reply.error(503, 'busy', MESSAGES.busy);
      }
      log('failed', e instanceof LoadFailed ? e.stage : e instanceof Error ? e.message : 'unknown');
      if (e instanceof Error && e.message === 'switch-off') return reply.error(503, 'switch-off', MESSAGES['switch-off']);
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
      const r = await opts.queue.run(visitor, (signal) => ask(deps, question, (s) => reply.event(s), signal), {
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
