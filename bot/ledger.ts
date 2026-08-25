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
 * 400) dni wstecz i idzie segmentami z budżetem czasu na cykl — kursor
 * zapisywany po każdym segmencie, więc kolejne cykle DOCIĄGAJĄ resztę
 * (wzorzec wznawialności jak fetch-swaps). eth_getLogs z filtrem topics
 * (tokenId indeksowany) = odpowiedzi malutkie nawet na wielkich zakresach.
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
import { NFT_MANAGER, WATCH_ADDRESS, STATE_DIR } from './config';

const DIR = path.join(__dirname, '..', STATE_DIR);
const LEDGER_PATH = path.join(DIR, 'tx-ledger.ndjson');
const STATE_PATH = path.join(DIR, 'ledger-state.json');
const CLOSED_PATH = path.join(DIR, 'closed-positions.json');

const BACKFILL_DAYS = Number(process.env.LEDGER_BACKFILL_DAYS || 400);
const CYCLE_BUDGET_MS = 60_000; // ledger nie może zjadać cyklu observera
const BLOCK_TIME: Record<string, number> = { mainnet: 12, base: 2, arbitrum: 0.25 };
const CHAIN_IDS: Record<string, number> = { mainnet: 1, base: 8453, arbitrum: 42161 };
const MAX_CHUNK: Record<string, number> = { mainnet: 400_000, base: 1_000_000, arbitrum: 2_000_000 };
const MIN_CHUNK = 20_000;
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
interface LedgerState { chains: Record<string, { nextBlock: number }>; tokens: Record<string, TokenMeta | null> }

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

/** eth_getLogs z adaptacyjnym dzieleniem zakresu (publiczne RPC różnie limitują). */
async function getLogsChunked(client: any, chain: string, address: string, topics: (string | string[] | null)[], from: number, to: number): Promise<any[]> {
  const out: any[] = [];
  let cursor = from;
  let chunk = Math.min(MAX_CHUNK[chain] ?? 500_000, to - from + 1);
  while (cursor <= to) {
    const end = Math.min(cursor + chunk - 1, to);
    try {
      const logs = await client.request({
        method: 'eth_getLogs',
        params: [{ address, topics, fromBlock: '0x' + cursor.toString(16), toBlock: '0x' + end.toString(16) }],
      });
      out.push(...(logs ?? []));
      cursor = end + 1;
    } catch (e) {
      if (chunk <= MIN_CHUNK) throw e; // nie zgadujemy dalej — cykl ponowi
      chunk = Math.max(MIN_CHUNK, Math.floor(chunk / 2));
    }
  }
  return out;
}

const ERC20_ABI = [
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
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

/** jeden przebieg aktualizacji (wołany z cyklu observera; wznawialny). */
export async function updateLedger(clients: Record<string, any>, ctx: LedgerCtx): Promise<void> {
  const t0 = Date.now();
  const state = loadState();
  const manager = (chain: string) => NFT_MANAGER[CHAIN_IDS[chain]];
  const watchTopic = padTopic(WATCH_ADDRESS);
  const newEntries: LedgerEntry[] = [];

  for (const chain of Object.keys(CHAIN_IDS)) {
    if (Date.now() - t0 > CYCLE_BUDGET_MS) break; // reszta w kolejnym cyklu
    const client = clients[chain];
    if (!client) continue;
    let latest: number;
    try { latest = Number(await client.getBlockNumber()); } catch (e) { ctx.log(`ledger ${chain}: getBlockNumber padł: ${String(e).slice(0, 80)}`); continue; }
    const st = state.chains[chain] ?? { nextBlock: Math.max(1, latest - Math.floor((BACKFILL_DAYS * 86400) / BLOCK_TIME[chain])) };
    state.chains[chain] = st;

    while (st.nextBlock <= latest && Date.now() - t0 < CYCLE_BUDGET_MS) {
      const segTo = Math.min(st.nextBlock + (MAX_CHUNK[chain] ?? 500_000) - 1, latest);
      try {
        // 1) transfery z/do WATCH — odkrywanie tokenIdów + wpisy MINT/BURN/TRANSFER
        const [tin, tout] = await Promise.all([
          getLogsChunked(client, chain, manager(chain), [T.transfer, null, watchTopic], st.nextBlock, segTo),
          getLogsChunked(client, chain, manager(chain), [T.transfer, watchTopic, null], st.nextBlock, segTo),
        ]);
        for (const lg of [...tin, ...tout]) {
          const tokenId = BigInt(lg.topics[3]).toString();
          const key = `${chain}:${tokenId}`;
          if (!(key in state.tokens)) state.tokens[key] = await fetchTokenMeta(client, chain, BigInt(tokenId), Number(lg.blockNumber), ctx.log);
        }
        // 2) zdarzenia płynności znanych tokenIdów tej sieci (topics OR)
        const ids = Object.keys(state.tokens).filter((k) => k.startsWith(chain + ':')).map((k) => k.split(':')[1]);
        const evLogs = ids.length
          ? await getLogsChunked(client, chain, manager(chain), [[T.increase, T.decrease, T.collect], ids.map((id) => padTopic(BigInt(id)))], st.nextBlock, segTo)
          : [];

        // 3) dekodowanie + timestampy bloków (cache per segment)
        const all = [...tin, ...tout, ...evLogs].sort((a, b) => Number(a.blockNumber) - Number(b.blockNumber) || Number(a.logIndex) - Number(b.logIndex));
        const tsCache = new Map<number, number>();
        const blockTs = async (bn: number): Promise<number> => {
          if (!tsCache.has(bn)) {
            const b = await client.getBlock({ blockNumber: BigInt(bn) });
            tsCache.set(bn, Number(b.timestamp));
          }
          return tsCache.get(bn)!;
        };
        const ethUsd = ctx.ethUsd();
        for (const lg of all) {
          const bn = Number(lg.blockNumber);
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
          newEntries.push({
            ts: new Date((await blockTs(bn)) * 1000).toISOString(),
            chain, chainId: CHAIN_IDS[chain], block: bn,
            txHash: lg.transactionHash, logIndex: Number(lg.logIndex), tokenId, kind,
            amount0: amount0.toString(), amount1: amount1.toString(), a0h, a1h,
            sym0: meta?.sym0 ?? '?', sym1: meta?.sym1 ?? '?',
            usd: kind === 'INCREASE' || kind === 'DECREASE' || kind === 'COLLECT'
              ? (u0 !== null && u1 !== null ? +(u0 + u1).toFixed(2) : null)
              : null,
          });
        }
        // 4) append + kursor (stan po segmencie — wznawialność)
        if (newEntries.length) {
          fs.mkdirSync(DIR, { recursive: true });
          fs.appendFileSync(LEDGER_PATH, newEntries.splice(0).map((e) => JSON.stringify(e)).join('\n') + '\n');
        }
        st.nextBlock = segTo + 1;
        saveState(state);
      } catch (e) {
        ctx.log(`ledger ${chain}: segment ${st.nextBlock}-${segTo} padł (${String(e).slice(0, 100)}) — ponowię w kolejnym cyklu`);
        break; // kursor nie ruszony — bez dziur
      }
    }
  }
  rebuildClosedPositions(ctx.log);
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
}

function rebuildClosedPositions(log: (m: string) => void): void {
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
      if (!end) continue; // pozycja żywa — nie do tego pliku
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
      const in0 = sum(['INCREASE'], 0), in1 = sum(['INCREASE'], 1);
      const out0 = sum(['COLLECT'], 0), out1 = sum(['COLLECT'], 1);
      const dec0 = sum(['DECREASE'], 0), dec1 = sum(['DECREASE'], 1);
      const first = evs[0];
      closed.push({
        chain: first.chain, tokenId: first.tokenId, sym0: first.sym0, sym1: first.sym1,
        openedAt: evs.find((e) => e.kind === 'MINT' || e.kind === 'TRANSFER_IN')?.ts ?? first.ts,
        closedAt: end.ts,
        in0, in1, out0, out1,
        fees0: out0 !== null && dec0 !== null ? +Math.max(0, out0 - dec0).toFixed(8) : null,
        fees1: out1 !== null && dec1 !== null ? +Math.max(0, out1 - dec1).toFixed(8) : null,
        inUsd: sumUsd(['INCREASE']), outUsd: sumUsd(['COLLECT']),
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
