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
  // --dry-run: policz WSZYSTKO (odpytaj HyperSync, zdekoduj, zlicz swapy), ale
  // nie tknij ndjson/state/meta. Do bezpiecznej weryfikacji fixu na produkcji.
  const dryRun = process.argv.includes('--dry-run');
  const writeJson = (p: string, data: unknown) => {
    if (!dryRun) fs.writeFileSync(p, typeof data === 'string' ? data : JSON.stringify(data, null, 2));
  };
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

  // Okno blokowe: startBlock jest STAŁY (z meta, jeśli istnieje — nie
  // przesuwamy początku okna, nie psujemy anchorów), ale `latest` ODŚWIEŻAMY
  // przy KAŻDYM uruchomieniu z aktualnej wysokości łańcucha.
  // FIX 21.08 (bug od CC-Win): wcześniej `latest` czytany z meta tylko raz
  // zamrażał koniec okna na zawsze — gdy kursor dogonił zamrożony tip, zakres
  // [from, toBlock) był pusty do końca świata, skrypt kończył się exit 0
  // ("nextBlock nie postępuje") i żadna pula nigdy nie pobierała nowych swapów.
  const metaPathEarly = path.join(CACHE_DIR, `${cfg.id}.meta.json`);
  const tip = Number(await client.getHeight());
  let latest: number;
  let startBlock: number;
  let anchorSpan: number; // szerokość okna, na której rozstawiono 11 anchorów
  let savedAnchors: Array<{ block: number; ts: number }> = [];
  if (fs.existsSync(metaPathEarly)) {
    const m = JSON.parse(fs.readFileSync(metaPathEarly, 'utf8'));
    startBlock = m.startBlock;
    savedAnchors = m.anchors ?? [];
    latest = Math.max(Number(m.latest) || 0, tip);
    // anchorSpan zamrożony przy pierwszym fetchu — inaczej rosnące okno
    // przesuwałoby siatkę anchorMarks przy każdym uruchomieniu i anchory
    // z różnych dni opisywałyby różne punkty osi czasu.
    anchorSpan = Number(m.anchorSpan) || (Number(m.latest) || latest) - startBlock;
    console.log(`[${cfg.id}] meta istnieje — startBlock ${startBlock} z meta, latest odświeżony: ${m.latest} → ${latest} (+${latest - (Number(m.latest) || latest)} bl)`);
  } else {
    latest = tip;
    startBlock = latest - Math.floor((cfg.days * 86400) / BLOCK_TIME[cfg.chain]);
    anchorSpan = latest - startBlock;
  }
  const blocksBack = latest - startBlock;
  if (dryRun) console.log(`[${cfg.id}] --dry-run: liczę, ale NIE zapisuję ndjson/state/meta`);
  // natychmiastowy zapis meta (nowe latest nie może się zgubić przy przerwaniu)
  writeJson(metaPathEarly, { cfg, startBlock, latest, anchorSpan, anchors: savedAnchors });

  let from = startBlock;
  if (fs.existsSync(statePath)) {
    from = JSON.parse(fs.readFileSync(statePath, 'utf8')).nextBlock;
    console.log(`[${cfg.id}] wznowienie od bloku ${from} (state.json wspólny z fetch-swaps)`);
  }
  if (from >= latest + 1) {
    console.log(`[${cfg.id}] na bieżąco: kursor ${from} ≥ tip ${latest} — nic do pobrania (0 nowych bloków od ostatniego przebiegu).`);
    process.exit(0);
  }

  // w dry-run piszemy do /dev/null (na Windows: NUL) — reszta ścieżki bez zmian
  const out = fs.createWriteStream(dryRun ? (process.platform === 'win32' ? '\\\\.\\NUL' : '/dev/null') : outPath, { flags: dryRun ? 'w' : 'a' });
  let total = 0;
  const t0 = Date.now();
  // anchory czasowe co ~10% PIERWOTNEGO zakresu — z timestampów bloków przy logach
  const anchorMarks = Array.from({ length: 11 }, (_, i) => startBlock + Math.floor((anchorSpan * i) / 10));
  const anchors: Array<{ block: number; ts: number }> = savedAnchors;
  // ostatni blok z timestampem widziany w tym przebiegu — dopisywany jako
  // anchor ogonowy, żeby load.ts interpolował świeże dane zamiast
  // ekstrapolować w nieskończoność z ostatniego starego segmentu.
  let tailBlock = 0;
  let tailTs = 0;
  let stalled = false;

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
      const tsNow = tsByBlock.get(bn);
      if (tsNow && bn > tailBlock) { tailBlock = bn; tailTs = tsNow; }
    }
    total += logs.length;

    const next = Number(res?.nextBlock ?? 0);
    if (!next || next <= query.fromBlock) {
      // Prawdziwa anomalia: zakres [fromBlock, toBlock) jest niepusty (sprawdzone
      // przed pętlą i przy każdej iteracji), więc HyperSync MUSI przesunąć kursor.
      // Kiedyś kończyło się to exit 0 = fałszywy zielony status w pipeline.
      console.error(`\n[${cfg.id}] ANOMALIA: nextBlock nie postępuje (${next}, fromBlock=${query.fromBlock}, toBlock=${latest + 1}) — przerwane, stan zapisany. Zgłaszam PORAŻKĘ (exit 1).`);
      stalled = true;
      break;
    }
    query.fromBlock = next;
    if (!dryRun) fs.writeFileSync(statePath, JSON.stringify({ nextBlock: next }));
    const pct = (((next - startBlock) / blocksBack) * 100).toFixed(1);
    const rate = ((next - from) / ((Date.now() - t0) / 1000)).toFixed(0);
    process.stdout.write(`\r[${cfg.id}] ${pct}%  blok ${next}/${latest}  swapy: ${total}  ~${rate} bl/s   `);
    if (next > latest) break;
  }

  // Anchor ogonowy: gdy siatka 11 jest pełna, dopisujemy punkt czasowy dla
  // świeżo dociągniętych bloków (inaczej load.ts ekstrapolowałby czas dla
  // każdego nowego dnia z ostatniego starego segmentu). Próg 1% anchorSpan
  // ogranicza przyrost do ~100 dodatkowych anchorów na całe okno.
  const lastAnchor = anchors[anchors.length - 1];
  const tailGap = Math.max(1, Math.floor(anchorSpan / 100));
  if (anchors.length >= 11 && tailTs && lastAnchor && tailBlock >= lastAnchor.block + tailGap) {
    anchors.push({ block: tailBlock, ts: tailTs });
  }
  writeJson(metaPath, { cfg, startBlock, latest, anchorSpan, anchors });

  // Domknięcie strumienia PRZED exit — process.exit ucina niezflushowane bufory.
  await new Promise<void>((resolve) => out.end(resolve));
  console.log(`\n[${cfg.id}] ${stalled ? 'PRZERWANE' : 'GOTOWE'}: ${total} swapów w ${((Date.now() - t0) / 60000).toFixed(1)} min → ${dryRun ? 'DRY-RUN (nic nie zapisano)' : outPath}`);
  process.exit(stalled ? 1 : 0);
})();
