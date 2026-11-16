/**
 * The built showcase without the chat API, for the end-to-end path "static views with the chat server down".
 * Run: node --import tsx showcase/e2e/static-only.ts <port>
 */
import express from 'express';
import path from 'path';

const port = Number(process.argv[2] ?? 8803);
const app = express();
app.disable('x-powered-by');
app.use('/api', (_req, res) => {
  res.status(502).send('chat server down');
});
app.use(express.static(path.join('showcase', 'public')));
app.listen(port, '127.0.0.1', () => console.log(`[static-only] ready on http://127.0.0.1:${port}`));
