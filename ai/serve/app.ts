/**
 * HTTP surface of the public chat (phase 4, step 4.3). Two routes only:
 *   GET  /api/health  status and the served engine, nothing else;
 *   POST /api/ask     { question } -> AskResponse.
 * `/api/retrieve` (guest-key mode) waits for step 4.6, so retrieval is not exposed on its own before it is needed.
 * Queue, status streaming and rate limits come in step 4.4. Errors never carry a stack or an internal message.
 */
import express, { type NextFunction, type Request, type Response } from 'express';
import { ask, type AskDeps } from './ask';
import { isPlainQuestion } from './scope';
import { BAD_QUESTION } from './texts';

export interface AppOptions {
  maxQuestionChars: number;
}

export function createApp(deps: AskDeps, opts: AppOptions) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '2kb', strict: true, type: 'application/json' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'up', engine: deps.engine });
  });

  app.post('/api/ask', async (req: Request, res: Response, next: NextFunction) => {
    const body: unknown = req.body;
    const raw = body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>).question : undefined;
    if (typeof raw !== 'string') return res.status(400).json({ error: 'bad-request', message: BAD_QUESTION });
    const question = raw.trim();
    if (question.length === 0 || !isPlainQuestion(question)) return res.status(400).json({ error: 'bad-request', message: BAD_QUESTION });
    if (question.length > opts.maxQuestionChars) {
      return res.status(400).json({ error: 'too-long', message: `Please keep the question under ${opts.maxQuestionChars} characters.` });
    }
    try {
      res.json(await ask(deps, question));
    } catch (e) {
      next(e);
    }
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'not-found' });
  });

  // Body parser errors (too large, invalid JSON) and anything thrown above: a fixed message, no details.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status = typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number' && err.status < 500 ? err.status : 500;
    if (status === 500) console.error(`[serve] ${new Date().toISOString()} internal error: ${err instanceof Error ? err.name : 'unknown'}`);
    res.status(status).json({ error: status === 413 ? 'too-large' : status === 500 ? 'internal' : 'bad-request', message: status === 500 ? 'Something went wrong on the server.' : BAD_QUESTION });
  });

  return app;
}
