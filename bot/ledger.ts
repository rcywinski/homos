/**
 * bot/ledger.ts — KSIĘGA TRANSAKCJI on-chain (TASKS-LEDGER.md §2).
 *
 * Źródło prawdy: zdarzenia NonfungiblePositionManager dla tokenIdów
 * WATCH_ADDRESS (Transfer/IncreaseLiquidity/DecreaseLiquidity/Collect) —
 * księga łapie też transakcje zrobione POZA naszą apką (Rabby/Uniswap UI),
 * bo czyta łańcuch, nie intencje UI. Realizacja decyzji z 10.08:
 * "SQLite + CSV od pierwszej transakcji — podatki PL + audytowalność"
 * (na start ndjson+json jak paper/candidates; SQLite przy warstwie PLN).
 *
 * Pliki (wszystkie w .bot/, nietrackowane):
 *  - tx-ledger.ndjson    — append-only, 1 linia = 1 zdarzenie on-chain;
 *                          idempotencja: writer może zdublować przy crashu
 *                          między append a zapisem stanu — CZYTELNICY
 *                          deduplikują po txHash+logIndex (dedupeEntries).
 *  - ledger-state.json   — kursor nextBlock per sieć + cache metadanych
 *                          tokenIdów (token0/1, symbole, decimals).
 *  - closed-positions.json — podsumowania zamkniętych pozycji (odbudowywane
 *                          z księgi po każdej aktualizacji).
 *
 * Backfill: pierwsze uruchomienie startuje LEDGER_BACKFILL_DAYS (domyślnie
 * 400) dni wstecz. Duże luki (>HS_THRESHOLD bloków) idą przez HYPERSYNC
 * (jak swap-cache; wymaga HYPERSYNC_BEARER_TOKEN w env homos-bota) —
 * lekcja z 25.08: darmowe publiczne RPC tną eth_getLogs do kilku tys.
 * bloków i backfill po RPC stał w miejscu. RPC (własna rotacja z logiem
 * providera) obsługuje tylko bieżącą końcówkę między cyklami. Kursor
 * per sieć zapisywany po udanym przebiegu — wznawialne, a duplikaty po
 * crashu deduplikują czytelnicy.
 *
 * Wycena USD (v1, świadome uproszczenie): stable = 1:1, WETH × kurs z
 * żywych cen observera (ctx.ethUsd — cena z chwili INDEKSOWANIA, nie
 * zdarzenia; przy cyklu 5 min dryf pomijalny, przy backfillu miesięcznym
 * NIE — takie wpisy dostają usd:null zamiast kłamstwa). Inne tokeny
 * (cbBTC itd.): usd:null, kwoty tokenowe zawsze są. Wycena historyczna
 * po kursie ze zdarzenia + PLN/NBP = następna iteracja (TASKS-LEDGER §3).
 */
import * as fs from 'fs';
import * as path from 'path';
import { keccak256, toBytes } from 'viem';
import { NFT_MANAGER, WATCH_ADDRESS, STATE_DIR, RPC } from './config';

const DIR = path.join(__dirname, '..', STATE_DIR);
const LEDGER_PATH = path.join(DIR, 'tx-ledger.ndjson');
const STATE_PATH = path.join(DIR, 'ledger-state.json');
const CLOSED_PATH = path.join(DIR, 'closed-positions.json');

// 600d (nie 400): pyłki #953427/#953465 mintowane 519 dni przed 25.08 —
// okno ma objąć ich pełną historię (INCREASE z mintu), inaczej księga
// pokazuje "wpłacone 0" (diagnoza CC-Win 25.08). HyperSync i tak liczy to
// w sekundy, koszt szerszego okna pomijalny.
const BACKFILL_DAYS = Number(process.env.LEDGER_BACKFILL_DAYS || 600);
const CYCLE_BUDGET_MS = 60_000; // ledger nie może zjadać cyklu observera
const BLOCK_TIME: Record<string, number> = { mainnet: 12, base: 2, arbitrum: 0.25 };
const CHAIN_IDS: Record<string, number> = { mainnet: 1, base: 8453, arbitrum: 42161 };
// RPC tylko do BIEŻĄCEJ końcówki (małe zakresy) — darmowe publiczne RPC tną
// eth_getLogs do kilku tys. bloków (bug 25.08: backfill stał przy 20k).
// Backfill DUŻYCH zakresów idzie HyperSyncem (patrz niżej), jak swap-cache.
const MAX_CHUNK: Record<string, number> = { mainnet: 5_000, base: 5_000, arbitrum: 5_000 };
const MIN_CHUNK = 1_000;
const HS_THRESHOLD = 20_000; // luka > tylu bloków → HyperSync zamiast RPC
const HYPERSYNC_URL: Record<string, string> = {
  mainnet: 'https://eth.hypersync.xyz',
  base: 'https://base.hypersync.xyz',
  arbitrum: 'https://arbitrum.hypersync.xyz',
};
const ZERO = '0x0000000000000000000000000000000000000000';

// topichy liczone w runtime (nie z pamięci — zero ryzyka literówki w hashu)
const T = {
  transfer: keccak256(toBytes('Transfer(address,address,uint256)')),
  increase: keccak256(toBytes('IncreaseLiquidity(uint256,uint128,uint256,uint256)')),
  decrease: keccak256(toBytes('DecreaseLiquidity(uint256,uint128,uint256,uint256)')),
  collect: keccak256(toBytes('Collect(uint256,address,uint256,uint256)')),
};

export type LedgerKind = 'MINT' | 'INCREASE' | 'DECREASE' | 'COLLECT' | 'BURN' | 'TRANSFER_IN' | 'TRANSFER_OUT';
export interface LedgerEntry {
  ts: string; // ISO z timestampu bloku
  chain: string;
  chainId: number;
  block: number;
  txHash: string;
  logIndex: number;
  tokenId: string;
  kind: LedgerKind;
  amount0: string; // raw (wei-skala tokenu); '0' dla Transfer/MINT/BURN
  amount1: string;
  a0h: number | null; // human (raw / 10^decimals); null gdy brak metadanych
  a1h: number | null;
  sym0: string;
  sym1: string;
  usd: number | null; // patrz nagłówek — null zamiast zgadywania
}
interface TokenMeta { token0: string; token1: string; fee: number; sym0: string; sym1: string; d0: number; d1: number }
interface LedgerState {
  chains: Record<string, { nextBlock: number }>;
  tokens: Record<string, TokenMeta | null>;
  /** bieżąca płynność per chain:tokenId (raw string; '0' też dla spalonych) —
   *  potrzebna do domykania pozycji, których NFT NIE jest palone: nasza apka
   *  "zamyka" przez decrease+collect i NFT zostaje w portfelu (CC-Win 25.08),
   *  więc BURN/TRANSFER_OUT nigdy nie nadejdzie. */
  liq?: Record<string, string>;
}

const loadState = (): LedgerState => {
  try { return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')); } catch { return { chains: {}, tokens: {} }; }
};
const saveState = (s: LedgerState) => {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(s, null, 2));
};

const padTopic = (addrOrId: string | bigint): string =>
  '0x' + (typeof addrOrId === 'bigint' ? addrOrId.toString(16) : addrOrId.toLowerCase().replace(/^0x/, '')).padStart(64, '0');
const topicToAddr = (t: string): string => '0x' + t.slice(-40).toLowerCase();
const word = (data: string, i: number): bigint => BigInt('0x' + (data.replace(/^0x/, '').slice(i * 64, (i + 1) * 64) || '0'));

/** znormalizowany log — wspólny kształt dla ścieżki RPC i HyperSync */
interface NormLog { blockNumber: number; logIndex: number; txHash: string; data: string; topics: string[] }

/** eth_getLogs własnym fetchem z ROTACJĄ po liście RPC + logiem, KTÓRY
 *  provider padł (uwaga CC-Win 25.08: viem fallback zjadał tę informację).
 *  Adaptacyjne dzielenie zakresu; do MAŁYCH zakresów (końcówka) — backfill
 *  dużych idzie HyperSyncem. */
async function rpcGetLogs(chain: string, address: string, topics: (string | string[] | null)[], from: number, to: number, log: (m: string) => void): Promise<NormLog[]> {
  const urls = RPC[chain] ?? [];
  const out: NormLog[] = [];
  let cursor = from;
  let chunk = Math.min(MAX_CHUNK[chain] ?? 5_000, to - from + 1);
  while (cursor <= to) {
    const end = Math.min(cursor + chunk - 1, to);
    let ok = false;
    let lastErr = '';
    for (const url of urls) {
      try {
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getLogs', params: [{ address, topics, fromBlock: '0x' + cursor.toString(16), toBlock: '0x' + end.toString(16) }] }),
          signal: AbortSignal.timeout(20_000),
        });
        const j: any = await r.json();
        if (j.error) throw new Error(`${j.error.code}: ${String(j.error.message).slice(0, 80)}`);
        for (const lg of j.result ?? []) out.push({ blockNumber: Number(lg.blockNumber), logIndex: Number(lg.logIndex), txHash: lg.transactionHash, data: lg.data, topics: lg.topics });
        ok = true;
        break;
      } catch (e) {
        lastErr = `${new URL(url).host}: ${String(e).slice(0, 100)}`;
      }
    }
    if (ok) { cursor = end + 1; continue; }
    if (chunk <= MIN_CHUNK) throw new Error(`getLogs ${chain} [${cursor}-${end}] padł na WSZYSTKICH RPC, ostatni: ${lastErr}`);
    chunk = Math.max(MIN_CHUNK, Math.floor(chunk / 2));
    log(`ledger ${chain}: zwężam zakres getLogs do ${chunk} bl (ostatni błąd: ${lastErr})`);
  }
  return out;
}

/** BACKFILL przez HyperSync (jak swap-cache): historyczne logi z filtrem
 *  topiców w sekundy zamiast tysięcy zapytań RPC. Dwie fazy: (A) transfery
 *  z/do WATCH → odkrycie tokenIdów, (B) zdarzenia płynności znanych
 *  tokenIdów. Zwraca logi + timestampy bloków (HyperSync daje je od ręki).
 *  Brak tokenu/pakietu → null (wołający spada na RPC albo czeka). */
async function hypersyncLogs(chain: string, from: number, to: number, tokenTopics: () => string[], onTransferLog: (lg: NormLog) => Promise<void>, log: (m: string) => void): Promise<{ logs: NormLog[]; tsByBlock: Map<number, number> } | null> {
  const token = process.env.HYPERSYNC_BEARER_TOKEN || process.env.ENVIO_API_TOKEN;
  if (!token || !HYPERSYNC_URL[chain]) return null;
  let HypersyncClient: any;
  try { ({ HypersyncClient } = await import('@envio-dev/hypersync-client')); } catch { return null; }
  const clientCfg = { url: HYPERSYNC_URL[chain], apiToken: token, bearerToken: token };
  const hs = typeof HypersyncClient?.new === 'function' ? HypersyncClient.new(clientCfg) : new HypersyncClient(clientCfg);
  const manager = NFT_MANAGER[CHAIN_IDS[chain]];
  const watchTopic = padTopic(WATCH_ADDRESS);
  const fieldSelection = {
    log: ['BlockNumber', 'LogIndex', 'TransactionHash', 'Data', 'Topic0', 'Topic1', 'Topic2', 'Topic3'],
    block: ['Number', 'Timestamp'],
  };
  const tsByBlock = new Map<number, number>();
  const norm = (lg: any): NormLog => ({
    blockNumber: Number(lg.blockNumber ?? lg.block_number),
    logIndex: Number(lg.logIndex ?? lg.log_index ?? 0),
    txHash: lg.transactionHash ?? lg.transaction_hash,
    data: lg.data ?? '0x',
    topics: (lg.topics ?? [lg.topic0, lg.topic1, lg.topic2, lg.topic3]).filter((t: unknown) => !!t),
  });
  const runQuery = async (selections: any[], sink: (lg: NormLog) => Promise<void> | void) => {
    let query: any = { fromBlock: from, toBlock: to + 1, logs: selections, fieldSelection };
    while (true) {
      const res = await hs.get(query);
      for (const b of res?.data?.blocks ?? []) {
        const num = Number(b.number ?? b.blockNumber);
        const ts = typeof b.timestamp === 'string' ? Number(BigInt(b.timestamp)) : Number(b.timestamp);
        if (Number.isFinite(num) && Number.isFinite(ts)) tsByBlock.set(num, ts);
      }
      for (const lg of res?.data?.logs ?? []) await sink(norm(lg));
      const next = Number(res?.nextBlock ?? 0);
      if (!next || next <= query.fromBlock) throw new Error(`HyperSync ${chain}: nextBlock nie postępuje (${next})`);
      query.fromBlock = next;
      if (next > to) break;
    }
  };
  const all: NormLog[] = [];
  // Faza A: transfery (odkrycie tokenIdów przez sink wołającego)
  await runQuery(
    [
      { address: [manager], topics: [[T.transfer], [], [watchTopic]] },
      { address: [manager], topics: [[T.transfer], [watchTopic]] },
    ],
    async (lg) => { all.push(lg); await onTransferLog(lg); }
  );
  // Faza B: zdarzenia płynności znanych tokenIdów (komplet PO fazie A —
  // zdarzenia nie mogą poprzedzać mintu, więc pełny zakres jest bezpieczny)
  const ids = tokenTopics();
  if (ids.length) await runQuery([{ address: [manager], topics: [[T.increase, T.decrease, T.collect], ids] }], (lg) => { all.push(lg); });
  log(`ledger ${chain}: HyperSync backfill ${from}-${to}: ${all.length} logów`);
  return { logs: all, tsByBlock };
}

const ERC20_ABI = [
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
] as const;
const ENUM_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'tokenOfOwnerByIndex', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'index', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
] as const;
const POSITIONS_ABI = [{
  name: 'positions', type: 'function', stateMutability: 'view',
  inputs: [{ name: 'tokenId', type: 'uint256' }],
  outputs: [
    { type: 'uint96' }, { type: 'address' }, { type: 'address' }, { type: 'address' },
    { type: 'uint24' }, { type: 'int24' }, { type: 'int24' }, { type: 'uint128' },
    { type: 'uint256' }, { type: 'uint256' }, { type: 'uint128' }, { type: 'uint128' },
  ],
}] as const;

/** metadane pozycji; token spalony → positions() rewertuje na latest, więc
 *  próbujemy jeszcze na bloku ostatniego zdarzenia (wymaga noda z archiwum —
 *  publiczne drpc/publicnode zwykle dają radę; ostatecznie meta=null i wpisy
 *  zostają w raw, uczciwie bez human/usd). */
async function fetchTokenMeta(client: any, chain: string, tokenId: bigint, atBlock: number | null, log: (m: string) => void): Promise<TokenMeta | null> {
  const manager = NFT_MANAGER[CHAIN_IDS[chain]];
  for (const blockNumber of [undefined, atBlock != null ? BigInt(atBlock) : undefined]) {
    try {
      const p = (await client.readContract({ address: manager, abi: POSITIONS_ABI, functionName: 'positions', args: [tokenId], ...(blockNumber ? { blockNumber } : {}) })) as any[];
      const [token0, token1, fee] = [String(p[2]), String(p[3]), Number(p[4])];
      const meta: TokenMeta = { token0: token0.toLowerCase(), token1: token1.toLowerCase(), fee, sym0: '?', sym1: '?', d0: 18, d1: 18 };
      for (const [i, t] of [token0, token1].entries()) {
        try {
          const sym = (await client.readContract({ address: t as `0x${string}`, abi: ERC20_ABI, functionName: 'symbol' })) as string;
          const dec = (await client.readContract({ address: t as `0x${string}`, abi: ERC20_ABI, functionName: 'decimals' })) as number;
          if (i === 0) { meta.sym0 = sym; meta.d0 = Number(dec); } else { meta.sym1 = sym; meta.d1 = Number(dec); }
        } catch { /* symbol/decimals opcjonalne — raw zawsze zostaje */ }
      }
      return meta;
    } catch { /* spróbuj następnego wariantu bloku */ }
  }
  log(`ledger: metadane tokenId ${tokenId} (${chain}) nieosiągalne (spalony + brak archiwum?) — wpisy w raw`);
  return null;
}

const STABLE = new Set(['USDC', 'USDT', 'DAI', 'USDS', 'USDBC']);
function legUsd(sym: string, human: number | null, ethUsd: number | null): number | null {
  if (human === null) return null;
  if (STABLE.has(sym.toUpperCase())) return human;
  if (sym.toUpperCase() === 'WETH' && ethUsd !== null) return human * ethUsd;
  return null;
}

export interface LedgerCtx { log: (m: string) => void; ethUsd: () => number | null }

/** jeden przebieg aktualizacji (wołany z cyklu observera; wznawialny).
 *  Duża luka (backfill) → HyperSync; mała końcówka → RPC z rotacją. */
export async function updateLedger(clients: Record<string, any>, ctx: LedgerCtx): Promise<void> {
  const t0 = Date.now();
  const state = loadState();
  const watchTopic = padTopic(WATCH_ADDRESS);

  for (const chain of Object.keys(CHAIN_IDS)) {
    if (Date.now() - t0 > CYCLE_BUDGET_MS) break; // reszta w kolejnym cyklu
    const client = clients[chain];
    if (!client) continue;
    const manager = NFT_MANAGER[CHAIN_IDS[chain]];
    let latest: number;
    try { latest = Number(await client.getBlockNumber()); } catch (e) { ctx.log(`ledger ${chain}: getBlockNumber padł: ${String(e).slice(0, 80)}`); continue; }
    const st = state.chains[chain] ?? { nextBlock: Math.max(1, latest - Math.floor((BACKFILL_DAYS * 86400) / BLOCK_TIME[chain])) };
    state.chains[chain] = st;
    if (st.nextBlock > latest) continue;

    // odkrywanie tokenIdów z transferów (wspólne dla obu ścieżek)
    const discover = async (lg: NormLog) => {
      const tokenId = BigInt(lg.topics[3]).toString();
      const key = `${chain}:${tokenId}`;
      if (!(key in state.tokens)) state.tokens[key] = await fetchTokenMeta(client, chain, BigInt(tokenId), lg.blockNumber, ctx.log);
    };
    // SEED z żywej enumeracji portfela (diagnoza CC-Win 25.08): stare pozycje
    // (mint sprzed okna backfillu, zero transferów) NIGDY nie wpadną przez
    // Fazę A — bierzemy je wprost z balanceOf/tokenOfOwnerByIndex. Łapie też
    // przyszłe pozycje importowane/kupione dowolną drogą.
    try {
      const n = Number(await client.readContract({ address: manager, abi: ENUM_ABI, functionName: 'balanceOf', args: [WATCH_ADDRESS] }));
      for (let i = 0; i < n; i++) {
        const tid = (await client.readContract({ address: manager, abi: ENUM_ABI, functionName: 'tokenOfOwnerByIndex', args: [WATCH_ADDRESS, BigInt(i)] })) as bigint;
        const key = `${chain}:${tid.toString()}`;
        if (!(key in state.tokens)) {
          state.tokens[key] = await fetchTokenMeta(client, chain, tid, null, ctx.log);
          ctx.log(`ledger ${chain}: seed tokenId ${tid} z enumeracji portfela`);
        }
      }
    } catch (e) {
      ctx.log(`ledger ${chain}: enumeracja portfela padła (${String(e).slice(0, 80)}) — seed w kolejnym cyklu`);
    }
    const idTopics = () => Object.keys(state.tokens).filter((k) => k.startsWith(chain + ':')).map((k) => padTopic(BigInt(k.split(':')[1])));

    try {
      let logs: NormLog[];
      let tsByBlock: Map<number, number>;
      const gap = latest - st.nextBlock;
      if (gap > HS_THRESHOLD) {
        const hs = await hypersyncLogs(chain, st.nextBlock, latest, idTopics, discover, ctx.log);
        if (!hs) {
          ctx.log(`ledger ${chain}: luka ${gap} bl > ${HS_THRESHOLD}, a HyperSync niedostępny (token/pakiet) — backfill czeka; sprawdź HYPERSYNC_BEARER_TOKEN w env homos-bota`);
          continue;
        }
        ({ logs, tsByBlock } = hs);
      } else {
        const [tin, tout] = await Promise.all([
          rpcGetLogs(chain, manager, [T.transfer, null, watchTopic], st.nextBlock, latest, ctx.log),
          rpcGetLogs(chain, manager, [T.transfer, watchTopic, null], st.nextBlock, latest, ctx.log),
        ]);
        for (const lg of [...tin, ...tout]) await discover(lg);
        const ids = idTopics();
        const evs = ids.length ? await rpcGetLogs(chain, manager, [[T.increase, T.decrease, T.collect], ids], st.nextBlock, latest, ctx.log) : [];
        logs = [...tin, ...tout, ...evs];
        tsByBlock = new Map();
      }

      logs.sort((a, b) => a.blockNumber - b.blockNumber || a.logIndex - b.logIndex);
      const blockTs = async (bn: number): Promise<number> => {
        if (!tsByBlock.has(bn)) {
          const b = await client.getBlock({ blockNumber: BigInt(bn) });
          tsByBlock.set(bn, Number(b.timestamp));
        }
        return tsByBlock.get(bn)!;
      };
      const ethUsd = ctx.ethUsd();
      const entries: LedgerEntry[] = [];
      for (const lg of logs) {
        const topic0 = lg.topics[0];
        const tokenId = BigInt(topic0 === T.transfer ? lg.topics[3] : lg.topics[1]).toString();
        const meta = state.tokens[`${chain}:${tokenId}`] ?? null;
        let kind: LedgerKind;
        let amount0 = 0n;
        let amount1 = 0n;
        if (topic0 === T.transfer) {
          const from = topicToAddr(lg.topics[1]);
          const to = topicToAddr(lg.topics[2]);
          kind = from === ZERO ? 'MINT' : to === ZERO ? 'BURN' : to === WATCH_ADDRESS.toLowerCase() ? 'TRANSFER_IN' : 'TRANSFER_OUT';
        } else if (topic0 === T.increase) { kind = 'INCREASE'; amount0 = word(lg.data, 1); amount1 = word(lg.data, 2); }
        else if (topic0 === T.decrease) { kind = 'DECREASE'; amount0 = word(lg.data, 1); amount1 = word(lg.data, 2); }
        else { kind = 'COLLECT'; amount0 = word(lg.data, 1); amount1 = word(lg.data, 2); }
        const a0h = meta ? Number(amount0) / 10 ** meta.d0 : null;
        const a1h = meta ? Number(amount1) / 10 ** meta.d1 : null;
        const u0 = meta ? legUsd(meta.sym0, a0h, ethUsd) : null;
        const u1 = meta ? legUsd(meta.sym1, a1h, ethUsd) : null;
        entries.push({
          ts: new Date((await blockTs(lg.blockNumber)) * 1000).toISOString(),
          chain, chainId: CHAIN_IDS[chain], block: lg.blockNumber,
          txHash: lg.txHash, logIndex: lg.logIndex, tokenId, kind,
          amount0: amount0.toString(), amount1: amount1.toString(), a0h, a1h,
          sym0: meta?.sym0 ?? '?', sym1: meta?.sym1 ?? '?',
          usd: kind === 'INCREASE' || kind === 'DECREASE' || kind === 'COLLECT'
            ? (u0 !== null && u1 !== null ? +(u0 + u1).toFixed(2) : null)
            : null,
        });
      }
      if (entries.length) {
        fs.mkdirSync(DIR, { recursive: true });
        fs.appendFileSync(LEDGER_PATH, entries.map((e) => JSON.stringify(e)).join('\n') + '\n');
      }
      st.nextBlock = latest + 1;
      // snapshot płynności znanych tokenIdów — pozycje "zamknięte" bez
      // palenia NFT (decrease+collect) domykamy po liquidity==0
      state.liq ??= {};
      for (const key of Object.keys(state.tokens).filter((k) => k.startsWith(chain + ':'))) {
        try {
          const p = (await client.readContract({ address: manager, abi: POSITIONS_ABI, functionName: 'positions', args: [BigInt(key.split(':')[1])] })) as any[];
          state.liq[key] = String(p[7]);
        } catch { state.liq[key] = '0'; } // revert = NFT spalony
      }
      saveState(state);
      if (entries.length) ctx.log(`ledger ${chain}: +${entries.length} zdarzeń (kursor ${st.nextBlock})`);
    } catch (e) {
      ctx.log(`ledger ${chain}: przebieg padł (${String(e).slice(0, 140)}) — ponowię w kolejnym cyklu`);
    }
  }
  rebuildClosedPositions(ctx.log, state);
}

/** czytelnicy deduplikują (patrz nagłówek) */
export function readLedger(): LedgerEntry[] {
  let raw: string;
  try { raw = fs.readFileSync(LEDGER_PATH, 'utf8'); } catch { return []; }
  const seen = new Set<string>();
  const out: LedgerEntry[] = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line) as LedgerEntry;
      const k = `${e.chainId}:${e.txHash}:${e.logIndex}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(e);
    } catch { /* urwana linia po crashu — pomiń */ }
  }
  return out.sort((a, b) => (a.ts < b.ts ? -1 : 1));
}

export interface ClosedPosition {
  chain: string; tokenId: string; sym0: string; sym1: string;
  openedAt: string | null; closedAt: string | null;
  in0: number | null; in1: number | null; // wpłacone (MINT/INCREASE)
  out0: number | null; out1: number | null; // wypłacone łącznie (COLLECT)
  fees0: number | null; fees1: number | null; // COLLECT − DECREASE (≥0)
  inUsd: number | null; outUsd: number | null; feesUsdApprox: number | null;
  txCount: number;
  /** czy księga ma PEŁNĄ historię pozycji (MINT w oknie backfillu);
   *  false = wpłaty sprzed okna → in* celowo null, patrz note */
  complete: boolean;
  note?: string;
}

function rebuildClosedPositions(log: (m: string) => void, state?: LedgerState): void {
  try {
    const entries = readLedger();
    const byToken = new Map<string, LedgerEntry[]>();
    for (const e of entries) {
      const k = `${e.chain}:${e.tokenId}`;
      (byToken.get(k) ?? byToken.set(k, []).get(k)!).push(e);
    }
    const closed: ClosedPosition[] = [];
    for (const [key, evs] of byToken) {
      const end = evs.find((e) => e.kind === 'BURN' || e.kind === 'TRANSFER_OUT');
      // domknięcie bez palenia NFT: liquidity==0 na łańcuchu + był DECREASE
      // (nasza apka zamyka przez decrease+collect, NFT zostaje — CC-Win 25.08)
      const emptied = !end && state?.liq?.[key] === '0' && evs.some((e) => e.kind === 'DECREASE');
      if (!end && !emptied) continue; // pozycja żywa — nie do tego pliku
      const sum = (kinds: LedgerKind[], leg: 0 | 1): number | null => {
        let s = 0;
        for (const e of evs.filter((x) => kinds.includes(x.kind))) {
          const v = leg === 0 ? e.a0h : e.a1h;
          if (v === null) return null; // brak metadanych → uczciwe null, nie 0
          s += v;
        }
        return s;
      };
      const sumUsd = (kinds: LedgerKind[]): number | null => {
        let s = 0;
        for (const e of evs.filter((x) => kinds.includes(x.kind))) {
          if (e.usd === null) return null;
          s += e.usd;
        }
        return +s.toFixed(2);
      };
      const complete = evs.some((e) => e.kind === 'MINT');
      // bez MINT-u w oknie wpłaty są niekompletne → null (nie "0", które
      // kłamałoby, że cały out to zysk)
      const in0 = complete ? sum(['INCREASE'], 0) : null;
      const in1 = complete ? sum(['INCREASE'], 1) : null;
      const out0 = sum(['COLLECT'], 0), out1 = sum(['COLLECT'], 1);
      const dec0 = sum(['DECREASE'], 0), dec1 = sum(['DECREASE'], 1);
      const first = evs[0];
      const lastFlow = [...evs].reverse().find((e) => e.kind === 'COLLECT' || e.kind === 'DECREASE');
      closed.push({
        chain: first.chain, tokenId: first.tokenId, sym0: first.sym0, sym1: first.sym1,
        openedAt: complete ? evs.find((e) => e.kind === 'MINT')!.ts : null,
        closedAt: end?.ts ?? lastFlow?.ts ?? null,
        complete,
        note: complete ? undefined : `historia od ${first.ts.slice(0, 10)} (mint sprzed okna backfillu)`,
        in0, in1, out0, out1,
        fees0: out0 !== null && dec0 !== null ? +Math.max(0, out0 - dec0).toFixed(8) : null,
        fees1: out1 !== null && dec1 !== null ? +Math.max(0, out1 - dec1).toFixed(8) : null,
        inUsd: complete ? sumUsd(['INCREASE']) : null, outUsd: sumUsd(['COLLECT']),
        // fees USD: tylko gdy obie nogi wyceniane (stable/WETH) — inaczej null
        feesUsdApprox: null,
        txCount: new Set(evs.map((e) => e.txHash)).size,
      });
    }
    for (const c of closed) {
      const s0 = STABLE.has(c.sym0.toUpperCase()) ? c.fees0 : null;
      const s1 = STABLE.has(c.sym1.toUpperCase()) ? c.fees1 : null;
      // v1: przybliżenie tylko dla pary stable/stable albo nogi stable — WETH
      // wymaga kursu z chwili zdarzenia (iteracja 2); nie zgadujemy.
      if (s0 !== null && s1 !== null) c.feesUsdApprox = +(s0 + s1).toFixed(2);
    }
    fs.writeFileSync(CLOSED_PATH, JSON.stringify(closed, null, 2));
  } catch (e) {
    log(`ledger: rebuild closed-positions padł: ${String(e).slice(0, 120)}`);
  }
}
