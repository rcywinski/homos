/* global process, console */
// Test stand-in for the reranker service (step 4.10e): `node fake-reranker.mjs app:app --port <port> [mode]`.
// mode: cuda (default), cpu (answers on the CPU), crash (exits at once with an out-of-memory line), slow (answers
// after 1.5 s), child (also starts a grandchild that holds the process tree).
import { spawn } from 'child_process';
import http from 'http';

const port = Number(process.argv[process.argv.indexOf('--port') + 1]);
const mode = process.argv[process.argv.indexOf('--port') + 2] ?? 'cuda';
if (mode === 'crash') {
  console.error('torch.OutOfMemoryError: CUDA out of memory. Tried to allocate 1.10 GiB');
  process.exit(1);
}
if (mode === 'child') spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
const serve = () =>
  http
    .createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ model: 'BAAI/bge-reranker-v2-m3', device: mode === 'cpu' ? 'cpu' : 'cuda', cudaAvailable: mode !== 'cpu' }));
    })
    .listen(port, '127.0.0.1');
if (mode === 'slow') setTimeout(serve, 1500);
else serve();
