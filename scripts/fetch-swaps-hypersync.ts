/**
 * fetch-swaps-hypersync.ts — backfill swapów przez HyperSync (Envio) zamiast
 * eth_getLogs po publicznych RPC. Po co: darmowe RPC dławią głębokie archiwum
 * (~150–190 bl/s ⇒ rok Base = ~21h); HyperSync serwuje historyczne logi
 * z własnego indeksu — te same dane w MINUTY.
 *
 *   npx tsx scripts/fetch-swaps-hypersync.ts base-weth-usdc-030-365d
 *
 * WYMAGANIA (jednorazowo):
 *   1. npm i @envio-dev/hypersync-client
 *   2. darmowy token: https://envio.dev → API Tokens → do .env:
 *      HYPERSYNC_BEARER_TOKEN=...
 *
 * Wyjście w 100% zgodne z scripts/fetch-swaps.ts: data/cache/<id>.ndjson
 * (linie {b,a0,a1,sp,L,t}), <id>.state.json {nextBlock} (wznawialne,
 * KOMPATYBILNE z fetch-swaps — można dokończyć jednym albo drugim skryptem),
 * <id>.meta.json {cfg,startBlock,latest,anchors} (anchory czasowe budowane
 * z timestampów bloków, które HyperSync zwraca razem z logami).
 *
 * TEST POPRAWNOŚCI przed zaufaniem (dla Claude Code): pobrać tym skryptem
 * pulę, którą JUŻ mamy z RPC (np. base-weth-usdc-030, 90d) pod świeżym id
 * i porównać: liczba linii ndjson musi się zgadzać co do sztuki, a pierwsza/
 * ostatnia linia co do wartości (wc -l + head/tail + diff po sortowaniu).
 *
 * UWAGA — API klienta pisane z pamięci (bez możliwości testu w tej sesji):
 * nazwy pól query/odpowiedzi zweryfikować z docs @envio-dev/hypersync-client
 * przy pierwszym uruchomieniu; kształt odpowiedzi logowany przy --debug.
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

// --- identyczna konfiguracja pul co fetch-swaps.ts (import, nie kopia) ---
// fetch-swaps.ts musi eksportować POOLS i PoolCfg (jednolinijkowa zmiana:
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
  const cfg: PoolCfg | undefined = POOLS.find((p: PoolCfg) => p.id === id);
  if (!cfg) {
    console.error(`Nieznana pula "${id}". Dostępne: ${POOLS.map((p: PoolCfg) => p.id).join(', ')}`);
    process.exit(1);
  }
  if (!cfg.address) {
    console.error(`${id}: brak adresu puli w konfiguracji — uruchom najpierw raz zwykły fetch-swaps (zrobi lookup przez factory) albo wpisz adres ręcznie.`);
    process.exit(1);
  }
  const url = HYPERSYNC_URL[cfg.chain];
  if (!url) {
    console.error(`${id}: chain ${cfg.chain} nieobsługiwany przez ten skrypt`);
    process.exit(1);
  }
  const token = process.env.HYPERSYNC_BEARER_TOKEN || process.env.ENVIO_API_TOKEN;
  if (!token) {
    console.error('Brak HYPERSYNC_BEARER_TOKEN (albo ENVIO_API_TOKEN) w .env — darmowy token: https://envio.dev/app → API Tokens (docs: docs.envio.dev/docs/HyperSync/api-tokens).');
    process.exit(1);
  }

  // import dynamiczny: czytelny komunikat, gdy pakiet nie jest zainstalowany
  let HypersyncClient: any;
  try {
    ({ HypersyncClient } = await import('@envio-dev/hypersync-client'));
  } catch {
    console.error('Brak pakietu @envio-dev/hypersync-client — zainstaluj: npm i @envio-dev/hypersync-client');
    process.exit(1);
  }
  // docs 2026: `new HypersyncClient({ url, apiToken })`; starsze wersje pakietu
  // miały fabrykę `HypersyncClient.new(...)` — obsługujemy obie.
  const clientCfg = { url, apiToken: token, bearerToken: token };
  const client = typeof HypersyncClient?.new === 'function'
    ? HypersyncClient.new(clientCfg)
    : new HypersyncClient(clientCfg);

  const statePath = path.join(CACHE_DIR, `${cfg.id}.state.json`);
  const outPath = path.join(CACHE_DIR, `${cfg.id}.ndjson`);
  const metaPath = path.join(CACHE_DIR, `${cfg.id}.meta.json`);

  // Okno blokowe: jeśli meta.json JUŻ istnieje (np. przejmujemy fetch zaczęty
  // przez fetch-swaps.ts — przypadek A2), REUŻYWAMY jego startBlock/latest,
  // żeby nie przesuwać okna i nie psuć anchorów/interpolacji czasu.
  // Świeży fetch: wysokość łańcucha z HyperSync (bez RPC) i natychmiastowy
  // zapis meta (fetch-swaps też pisze meta na starcie — przerwanie nie gubi cfg).
  const metaPathEarly = path.join(CACHE_DIR, `${cfg.id}.meta.json`);
  let latest: number;
  let startBlock: number;
  let blocksBack: number;
  if (fs.existsSync(metaPathEarly)) {
    const m = JSON.parse(fs.readFileSync(metaPathEarly, 'utf8'));
    latest = m.latest; startBlock = m.startBlock; blocksBack = latest - startBlock;
    console.log(`[${cfg.id}] meta istnieje — okno z meta: ${startBlock}→${latest}`);
  } else {
    latest = Number(await client.getHeight());
    blocksBack = Math.floor((cfg.days * 86400) / BLOCK_TIME[cfg.chain]);
    startBlock = latest - blocksBack;
    fs.writeFileSync(metaPathEarly, JSON.stringify({ cfg, startBlock, latest, anchors: [] }, null, 2));
  }

  let from = startBlock;
  if (fs.existsSync(statePath)) {
    from = JSON.parse(fs.readFileSync(statePath, 'utf8')).nextBlock;
    console.log(`[${cfg.id}] wznowienie od bloku ${from} (state.json wspólny z fetch-swaps)`);
  }

  const out = fs.createWriteStream(outPath, { flags: 'a' });
  let total = 0;
  const t0 = Date.now();
  // anchory czasowe co ~10% zakresu — z timestampów bloków przy logach
  const anchorMarks = Array.from({ length: 11 }, (_, i) => startBlock + Math.floor((blocksBack * i) / 10));
  const anchors: Array<{ block: number; ts: number }> = fs.existsSync(metaPath)
    ? JSON.parse(fs.readFileSync(metaPath, 'utf8')).anchors ?? []
    : [];

  let query: any = {
    fromBlock: from,
    toBlock: latest + 1, // wg docs toBlock jest EXCLUSIVE — zweryfikować
    logs: [{ address: [cfg.address], topics: [[SWAP_TOPIC]] }],
    fieldSelection: {
      // wg docs (2026): nazwy pól PascalCase; odpowiedź ma klucze camelCase
      log: ['BlockNumber', 'Data'],
      block: ['Number', 'Timestamp'],
    },
  };

  while (true) {
    const res = await client.get(query);
    if (debug) {
      console.log('DEBUG kształt odpowiedzi:', JSON.stringify({
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
      // najbliższy nieobsadzony anchor ≤ bn
      while (anchors.length < 11 && anchorMarks[anchors.length] <= bn) {
        const ts = tsByBlock.get(bn);
        if (ts) anchors.push({ block: bn, ts });
        else break;
      }
    }
    total += logs.length;

    const next = Number(res?.nextBlock ?? 0);
    if (!next || next <= query.fromBlock) {
      console.error(`\n[${cfg.id}] nextBlock nie postępuje (${next}) — przerwane; stan zapisany, wznowisz.`);
      break;
    }
    query.fromBlock = next;
    fs.writeFileSync(statePath, JSON.stringify({ nextBlock: next }));
    const pct = (((next - startBlock) / blocksBack) * 100).toFixed(1);
    const rate = ((next - from) / ((Date.now() - t0) / 1000)).toFixed(0);
    process.stdout.write(`\r[${cfg.id}] ${pct}%  blok ${next}/${latest}  swapy: ${total}  ~${rate} bl/s   `);
    if (next > latest) break;
  }

  fs.writeFileSync(metaPath, JSON.stringify({ cfg, startBlock, latest, anchors }, null, 2));
  console.log(`\n[${cfg.id}] GOTOWE: ${total} swapów w ${((Date.now() - t0) / 60000).toFixed(1)} min → ${outPath}`);
})();
