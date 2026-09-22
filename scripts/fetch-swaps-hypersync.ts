/**
 * fetch-swaps-hypersync.ts — swap backfill via HyperSync (Envio) instead of
 * eth_getLogs over public RPCs. Why: free RPCs choke on deep archive reads
 * (~150–190 bl/s ⇒ a year of Base = ~21h); HyperSync serves historical logs
 * from its own index — the same data in MINUTES.
 *
 *   npx tsx scripts/fetch-swaps-hypersync.ts base-weth-usdc-030-365d
 *
 * REQUIREMENTS (one-time):
 *   1. npm i @envio-dev/hypersync-client
 *   2. free token: https://envio.dev → API Tokens → into .env:
 *      HYPERSYNC_BEARER_TOKEN=...
 *
 * Output 100% compatible with scripts/fetch-swaps.ts: data/cache/<id>.ndjson
 * (lines {b,a0,a1,sp,L,t}), <id>.state.json {nextBlock} (resumable,
 * COMPATIBLE with fetch-swaps — either script can finish the job),
 * <id>.meta.json {cfg,startBlock,latest,anchors} (time anchors built from
 * the block timestamps that HyperSync returns together with the logs).
 *
 * CORRECTNESS TEST before trusting it (for Claude Code): fetch with this script
 * a pool we ALREADY have from RPC (e.g. base-weth-usdc-030, 90d) under a fresh id
 * and compare: the ndjson line count must match exactly, and the first/last
 * line must match by value (wc -l + head/tail + diff after sorting).
 *
 * NOTE — the client API was written from memory (no way to test in that session):
 * verify the query/response field names against the @envio-dev/hypersync-client docs
 * on the first run; the response shape is logged with --debug.
 */
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

const CACHE_DIR = path.join(__dirname, '..', 'data', 'cache');
fs.mkdirSync(CACHE_DIR, { recursive: true });

const SWAP_TOPIC = '0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67';
const BLOCK_TIME: Record<string, number> = { mainnet: 12, base: 2, arbitrum: 0.25, optimism: 2 };
const HYPERSYNC_URL: Record<string, string> = {
  mainnet: 'https://eth.hypersync.xyz',
  base: 'https://base.hypersync.xyz',
  arbitrum: 'https://arbitrum.hypersync.xyz',
  optimism: 'https://optimism.hypersync.xyz',
};

// --- identical pool configuration to fetch-swaps.ts (import, not a copy) ---
// fetch-swaps.ts must export POOLS and PoolCfg (one-line change:
// `const POOLS` → `export const POOLS`, `interface PoolCfg` → `export interface PoolCfg`).
import { POOLS, PoolCfg } from './fetch-swaps';

const hexToBigInt = (h: string) => BigInt(h);
const toSigned = (v: bigint, bits: bigint) => {
  const max = 1n << (bits - 1n);
  return v >= max ? v - (1n << bits) : v;
};
function decodeSwap(dataHex: string) {
  const d = dataHex.slice(2);
  const w = (i: number) => hexToBigInt('0x' + d.slice(i * 64, (i + 1) * 64));
  return {
    amount0: toSigned(w(0), 256n),
    amount1: toSigned(w(1), 256n),
    sqrtPriceX96: w(2),
    liquidity: w(3),
    tick: Number(toSigned(w(4) & 0xffffffn, 24n)),
  };
}

(async () => {
  const id = process.argv[2];
  const debug = process.argv.includes('--debug');
  // --dry-run: compute EVERYTHING (query HyperSync, decode, count swaps), but
  // do not touch ndjson/state/meta. For safe verification of a fix in production.
  const dryRun = process.argv.includes('--dry-run');
  const writeJson = (p: string, data: unknown) => {
    if (!dryRun) fs.writeFileSync(p, typeof data === 'string' ? data : JSON.stringify(data, null, 2));
  };
  // --cfg <path.json>: PoolCfg outside POOLS (auto-funnel candidates,
  // candidate-funnel.ts writes cfg to data/candidates/). Extra fields in the JSON
  // (e.g. quoteRefId) pass through to meta.json — read by backtest/load.ts.
  const cfgFlag = process.argv.indexOf('--cfg');
  const cfg: PoolCfg | undefined = cfgFlag > -1
    ? (JSON.parse(fs.readFileSync(path.resolve(process.argv[cfgFlag + 1]), 'utf8')) as PoolCfg)
    : POOLS.find((p: PoolCfg) => p.id === id);
  if (!cfg) {
    console.error(`Unknown pool "${id}". Available: ${POOLS.map((p: PoolCfg) => p.id).join(', ')} (or --cfg <file.json>)`);
    process.exit(1);
  }
  if (!cfg.address) {
    console.error(`${id}: no pool address in the configuration — run the regular fetch-swaps once first (it does the factory lookup) or enter the address manually.`);
    process.exit(1);
  }
  const url = HYPERSYNC_URL[cfg.chain];
  if (!url) {
    console.error(`${id}: chain ${cfg.chain} not supported by this script`);
    process.exit(1);
  }
  const token = process.env.HYPERSYNC_BEARER_TOKEN || process.env.ENVIO_API_TOKEN;
  if (!token) {
    console.error('Missing HYPERSYNC_BEARER_TOKEN (or ENVIO_API_TOKEN) in .env — free token: https://envio.dev/app → API Tokens (docs: docs.envio.dev/docs/HyperSync/api-tokens).');
    process.exit(1);
  }

  // dynamic import: readable message when the package is not installed
  let HypersyncClient: any;
  try {
    ({ HypersyncClient } = await import('@envio-dev/hypersync-client'));
  } catch {
    console.error('Missing package @envio-dev/hypersync-client — install: npm i @envio-dev/hypersync-client');
    process.exit(1);
  }
  // docs 2026: `new HypersyncClient({ url, apiToken })`; older package versions
  // had a factory `HypersyncClient.new(...)` — we support both.
  const clientCfg = { url, apiToken: token, bearerToken: token };
  const client = typeof HypersyncClient?.new === 'function'
    ? HypersyncClient.new(clientCfg)
    : new HypersyncClient(clientCfg);

  const statePath = path.join(CACHE_DIR, `${cfg.id}.state.json`);
  const outPath = path.join(CACHE_DIR, `${cfg.id}.ndjson`);
  const metaPath = path.join(CACHE_DIR, `${cfg.id}.meta.json`);

  // Block window: startBlock is FIXED (from meta, if it exists — we do not
  // move the window start, we do not break the anchors), but `latest` is REFRESHED
  // on EVERY run from the current chain height.
  // FIX 21.08 (bug from CC-Win): previously `latest` read from meta only once
  // froze the window end forever — once the cursor caught up with the frozen tip, the
  // range [from, toBlock) was empty till the end of time, the script exited 0
  // ("nextBlock not advancing") and no pool ever fetched new swaps.
  const metaPathEarly = path.join(CACHE_DIR, `${cfg.id}.meta.json`);
  const tip = Number(await client.getHeight());
  let latest: number;
  let startBlock: number;
  let anchorSpan: number; // window width over which the 11 anchors were laid out
  let savedAnchors: Array<{ block: number; ts: number }> = [];
  if (fs.existsSync(metaPathEarly)) {
    const m = JSON.parse(fs.readFileSync(metaPathEarly, 'utf8'));
    startBlock = m.startBlock;
    savedAnchors = m.anchors ?? [];
    latest = Math.max(Number(m.latest) || 0, tip);
    // anchorSpan frozen at the first fetch — otherwise the growing window
    // would shift the anchorMarks grid on every run and anchors from
    // different days would describe different points of the time axis.
    anchorSpan = Number(m.anchorSpan) || (Number(m.latest) || latest) - startBlock;
    console.log(`[${cfg.id}] meta exists — startBlock ${startBlock} from meta, latest refreshed: ${m.latest} → ${latest} (+${latest - (Number(m.latest) || latest)} bl)`);
  } else {
    latest = tip;
    startBlock = latest - Math.floor((cfg.days * 86400) / BLOCK_TIME[cfg.chain]);
    anchorSpan = latest - startBlock;
  }
  const blocksBack = latest - startBlock;
  if (dryRun) console.log(`[${cfg.id}] --dry-run: computing, but NOT writing ndjson/state/meta`);
  // immediate meta write (the new latest must not get lost on interruption)
  writeJson(metaPathEarly, { cfg, startBlock, latest, anchorSpan, anchors: savedAnchors });

  let from = startBlock;
  if (fs.existsSync(statePath)) {
    from = JSON.parse(fs.readFileSync(statePath, 'utf8')).nextBlock;
    console.log(`[${cfg.id}] resuming from block ${from} (state.json shared with fetch-swaps)`);
  }
  if (from >= latest + 1) {
    console.log(`[${cfg.id}] up to date: cursor ${from} ≥ tip ${latest} — nothing to fetch (0 new blocks since the last run).`);
    process.exit(0);
  }

  // in dry-run we write to /dev/null (on Windows: NUL) — the rest of the path unchanged
  const out = fs.createWriteStream(dryRun ? (process.platform === 'win32' ? '\\\\.\\NUL' : '/dev/null') : outPath, { flags: dryRun ? 'w' : 'a' });
  let total = 0;
  const t0 = Date.now();
  // time anchors every ~10% of the ORIGINAL range — from block timestamps attached to logs
  const anchorMarks = Array.from({ length: 11 }, (_, i) => startBlock + Math.floor((anchorSpan * i) / 10));
  const anchors: Array<{ block: number; ts: number }> = savedAnchors;
  // last block with a timestamp seen in this run — appended as a tail
  // anchor so that load.ts interpolates fresh data instead of
  // extrapolating indefinitely from the last old segment.
  let tailBlock = 0;
  let tailTs = 0;
  let stalled = false;

  let query: any = {
    fromBlock: from,
    toBlock: latest + 1, // per docs toBlock is EXCLUSIVE — verify
    logs: [{ address: [cfg.address], topics: [[SWAP_TOPIC]] }],
    fieldSelection: {
      // per docs (2026): field names PascalCase; the response has camelCase keys
      log: ['BlockNumber', 'Data'],
      block: ['Number', 'Timestamp'],
    },
  };

  while (true) {
    const res = await client.get(query);
    if (debug) {
      console.log('DEBUG response shape:', JSON.stringify({
        keys: Object.keys(res ?? {}), dataKeys: Object.keys(res?.data ?? {}),
        sampleLog: res?.data?.logs?.[0], sampleBlock: res?.data?.blocks?.[0],
      }).slice(0, 600));
    }
    const logs: any[] = res?.data?.logs ?? [];
    const blocks: any[] = res?.data?.blocks ?? [];
    const tsByBlock = new Map<number, number>();
    for (const b of blocks) {
      const num = Number(b.number ?? b.blockNumber);
      const ts = typeof b.timestamp === 'string' ? Number(hexToBigInt(b.timestamp)) : Number(b.timestamp);
      if (Number.isFinite(num) && Number.isFinite(ts)) tsByBlock.set(num, ts);
    }

    for (const log of logs) {
      const bn = Number(log.block_number ?? log.blockNumber);
      const s = decodeSwap(log.data);
      out.write(
        JSON.stringify({ b: bn, a0: s.amount0.toString(), a1: s.amount1.toString(), sp: s.sqrtPriceX96.toString(), L: s.liquidity.toString(), t: s.tick }) + '\n'
      );
      // nearest unfilled anchor ≤ bn
      while (anchors.length < 11 && anchorMarks[anchors.length] <= bn) {
        const ts = tsByBlock.get(bn);
        if (ts) anchors.push({ block: bn, ts });
        else break;
      }
      const tsNow = tsByBlock.get(bn);
      if (tsNow && bn > tailBlock) { tailBlock = bn; tailTs = tsNow; }
    }
    total += logs.length;

    const next = Number(res?.nextBlock ?? 0);
    if (!next || next <= query.fromBlock) {
      // A real anomaly: the range [fromBlock, toBlock) is non-empty (checked
      // before the loop and on every iteration), so HyperSync MUST advance the cursor.
      // This used to end with exit 0 = false green status in the pipeline.
      console.error(`\n[${cfg.id}] ANOMALY: nextBlock not advancing (${next}, fromBlock=${query.fromBlock}, toBlock=${latest + 1}) — aborted, state saved. Reporting FAILURE (exit 1).`);
      stalled = true;
      break;
    }
    query.fromBlock = next;
    if (!dryRun) fs.writeFileSync(statePath, JSON.stringify({ nextBlock: next }));
    const pct = (((next - startBlock) / blocksBack) * 100).toFixed(1);
    const rate = ((next - from) / ((Date.now() - t0) / 1000)).toFixed(0);
    process.stdout.write(`\r[${cfg.id}] ${pct}%  block ${next}/${latest}  swaps: ${total}  ~${rate} bl/s   `);
    if (next > latest) break;
  }

  // Tail anchor: when the grid of 11 is full, we append a time point for the
  // freshly fetched blocks (otherwise load.ts would extrapolate time for
  // every new day from the last old segment). The 1% anchorSpan threshold
  // limits the growth to ~100 extra anchors over the whole window.
  const lastAnchor = anchors[anchors.length - 1];
  const tailGap = Math.max(1, Math.floor(anchorSpan / 100));
  if (anchors.length >= 11 && tailTs && lastAnchor && tailBlock >= lastAnchor.block + tailGap) {
    anchors.push({ block: tailBlock, ts: tailTs });
  }
  writeJson(metaPath, { cfg, startBlock, latest, anchorSpan, anchors });

  // Close the stream BEFORE exit — process.exit cuts off unflushed buffers.
  await new Promise<void>((resolve) => out.end(resolve));
  console.log(`\n[${cfg.id}] ${stalled ? 'ABORTED' : 'DONE'}: ${total} swaps in ${((Date.now() - t0) / 60000).toFixed(1)} min → ${dryRun ? 'DRY-RUN (nothing written)' : outPath}`);
  process.exit(stalled ? 1 : 0);
})();
