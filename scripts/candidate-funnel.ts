/**
 * candidate-funnel.ts — AUTO-LEJEK walidacji kandydatów selektora (TASKS-FUNNEL.md).
 *
 * Automatyzuje LEJEK (kwalifikacja → mapowanie on-chain → fetch 365d →
 * walkforward → werdykt bramki), NIE decyzję: PASS ląduje w briefie jako
 * rekomendacja, BOT_POOLS edytuje człowiek.
 *
 *   npx tsx scripts/candidate-funnel.ts             # steady-state: 1 kandydat (krok pipeline 05:30)
 *   npx tsx scripts/candidate-funnel.ts --all       # BACKFILL: cała kolejka sekwencyjnie (ręcznie, wieczorem)
 *   npx tsx scripts/candidate-funnel.ts --dry-run   # tylko kwalifikacja + snapshot kolejki, bez fetch/walkforward
 *
 * Kwalifikacja (guardrale z TASKS-FUNNEL.md §2):
 *  - top10 rankingu po MEDIANIE 7d apyBase (nie średniej — spike'oodporność)
 *    z persystencją ≥3 dni (streaki selektora), TVL ≥ $3M, majors, uniswap-v3
 *  - LUB otwarta propozycja OPEN spoza BOT_POOLS (llamaPool z proposals.json)
 *  - minus: pule z BOT_POOLS, pule z ważnym werdyktem (algoVersion bieżąca)
 *  - wiek ≥180 dni historii llama — młodsza → odroczenie (QUEUED z notą), nie FAIL
 * Werdykt: PASS = winPct ≥65 AND worst >−3 (profil wg pary: ETH/stable = v1.1
 * re>EMA; BTC-noga bez stable = profil cbBTC k=2 czysty exit). Zapis TRWAŁY
 * do .bot/candidate-verdicts.json z algoVersion — retest tylko po zmianie
 * algorytmu albo ręcznym usunięciu wpisu.
 *
 * Bezpieczeństwo mapowania: adresy tokenów z lokalnego słownika majors, adres
 * puli z factory.getPool (eth_call), a potem SANITY-CHECK token0()/token1()
 * puli vs słownik — niezgodność = UNMAPPED, nigdy ciche złe dane. Token spoza
 * słownika = UNMAPPED (nie zgadujemy adresów).
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { BOT_POOLS, RPC, STATE_DIR } from '../bot/config';
import { SEED_VERDICTS } from '../bot/candidates';

const ROOT = path.join(__dirname, '..');
const LLAMA = path.join(ROOT, 'data', 'llama');
const BOT = path.join(ROOT, STATE_DIR);
const CAND_DIR = path.join(ROOT, 'data', 'candidates'); // cfg-i (data/ nietrackowane)
const RESULTS = path.join(ROOT, 'backtest', 'results');
const VERDICTS_PATH = path.join(BOT, 'candidate-verdicts.json');
const QUEUE_PATH = path.join(BOT, 'candidate-queue.json');

const ALGO_VERSION = 'v1.2'; // podbić przy zmianie ALGORITHM.md → stare werdykty nieważne
const MIN_TVL = 3_000_000;
const MAJORS = /ETH|BTC|USDC|USDT|DAI|USDS/;
const CHAIN_MAP: Record<string, string> = { Ethereum: 'mainnet', Base: 'base', Arbitrum: 'arbitrum' };
const FEE_BPS: Record<string, number> = { '0.01%': 100, '0.05%': 500, '0.3%': 3000, '1%': 10000 };
const FEE_CODE: Record<number, string> = { 100: '001', 500: '005', 3000: '030', 10000: '100' };
const PERSIST_DAYS = 3;
const TOP_N = 10;
const MIN_HISTORY_D = 180;
const STEP_TIMEOUT_MIN = 60; // twardy timeout na fetch i na walkforward (każdy osobno)

// referencyjny cache USD-za-WETH (365d) per sieć — dla kandydatów kwotowanych w WETH
const WETH_USD_REF_365D: Record<string, string> = {
  mainnet: 'mainnet-usdc-weth-005-365d',
  base: 'base-weth-usdc-030-365d',
  arbitrum: 'arbitrum-weth-usdc-005-365d',
};

// Słownik majors per sieć: symbol → warianty adresu (kolejność = preferencja;
// USDC na Arbitrum ma natywny i bridged). Adres zły → getPool zwróci 0x0 albo
// token0/token1 się nie zgodzi → UNMAPPED (sanity-check niżej), nie złe dane.
type TokenDef = { addr: string; decimals: number };
const TOKENS: Record<string, Record<string, TokenDef[]>> = {
  mainnet: {
    WETH: [{ addr: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 }],
    USDC: [{ addr: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 }],
    USDT: [{ addr: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 }],
    DAI: [{ addr: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 }],
    WBTC: [{ addr: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 }],
    CBBTC: [{ addr: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf', decimals: 8 }],
    TBTC: [{ addr: '0x18084fbA666a33d37592fA2633fD49a74DD93a88', decimals: 18 }],
    WSTETH: [{ addr: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0', decimals: 18 }],
  },
  base: {
    WETH: [{ addr: '0x4200000000000000000000000000000000000006', decimals: 18 }],
    USDC: [{ addr: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 }],
    USDT: [{ addr: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', decimals: 6 }],
    DAI: [{ addr: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', decimals: 18 }],
    CBBTC: [{ addr: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf', decimals: 8 }],
  },
  arbitrum: {
    WETH: [{ addr: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 }],
    USDC: [
      { addr: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 }, // natywny
      { addr: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', decimals: 6 }, // USDC.e
    ],
    USDT: [{ addr: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 }],
    WBTC: [{ addr: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', decimals: 8 }],
    CBBTC: [{ addr: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf', decimals: 8 }],
  },
};
const FACTORY: Record<string, string> = {
  mainnet: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  base: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
  arbitrum: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
};
const STABLES = new Set(['USDC', 'USDT', 'DAI', 'USDS']);
const ETH_LIKE = new Set(['WETH']);
const ZERO_ADDR = /^0x0{40}$/i;

const log = (m: string) => console.log(`${new Date().toISOString()} funnel: ${m}`);

// --- mini eth_call z fallbackiem po liście RPC z bot/config ---
async function ethCall(chain: string, to: string, data: string): Promise<string> {
  const urls = RPC[chain] ?? [];
  let lastErr: unknown = new Error(`brak RPC dla ${chain}`);
  for (const url of urls) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to, data }, 'latest'] }),
        signal: AbortSignal.timeout(20_000),
      });
      const j: any = await r.json();
      if (j.error) throw new Error(`${j.error.code}: ${j.error.message}`);
      if (typeof j.result === 'string') return j.result;
      throw new Error('pusta odpowiedź');
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}
const addrArg = (a: string) => a.toLowerCase().slice(2).padStart(64, '0');
const parseAddr = (res: string) => ('0x' + res.slice(-40)).toLowerCase();

// --- typy/IO werdyktów (kształt zgodny z bot/candidates.ts CandidateVerdict) ---
type Verdict = {
  llamaPool: string; chain: string; symbol: string; feeTier: string;
  verdict: 'PASS' | 'FAIL' | 'QUEUED' | 'UNMAPPED';
  winPct?: number; worst?: number; testedAt?: string; note?: string;
  algoVersion?: string; candId?: string; poolAddress?: string; strategy?: string;
};
const readRuntimeVerdicts = (): Verdict[] => {
  try { return JSON.parse(fs.readFileSync(VERDICTS_PATH, 'utf8')); } catch { return []; }
};
function upsertVerdict(v: Verdict): void {
  const all = readRuntimeVerdicts().filter((x) => x.llamaPool !== v.llamaPool);
  all.push(v);
  fs.mkdirSync(BOT, { recursive: true });
  fs.writeFileSync(VERDICTS_PATH, JSON.stringify(all, null, 2));
  log(`werdykt zapisany: ${v.symbol} ${v.feeTier} @ ${v.chain} → ${v.verdict}${v.winPct !== undefined ? ` (${v.winPct}% wygr., worst ${v.worst})` : ''}`);
}

// --- kwalifikacja ---
interface QueueItem {
  llamaPool: string; chain: string; symbol: string; feeTier: string;
  tvlUsd: number; streak: number; reason: string;
}

function median7dApy(uuid: string): { med: number | null; historyDays: number } {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(LLAMA, 'history', `${uuid}.json`), 'utf8'));
    const all: Array<{ apyBase: number | null }> = j.series || [];
    const vals = all.slice(-7).map((r) => r.apyBase).filter((v): v is number => v !== null && v !== undefined);
    if (vals.length < 5) return { med: null, historyDays: all.length };
    const s = [...vals].sort((a, b) => a - b);
    return { med: s[Math.floor(s.length / 2)], historyDays: all.length };
  } catch {
    return { med: null, historyDays: 0 };
  }
}

function inBotPools(chainLlama: string, symbol: string, feeTier: string): boolean {
  const chain = CHAIN_MAP[chainLlama];
  if (!chain) return false;
  const feeBps = FEE_BPS[feeTier.trim()];
  const syms = new Set(symbol.split('-').map((s) => s.toUpperCase()));
  return BOT_POOLS.some(
    (b: any) => b.chain === chain && b.feeBps === feeBps && syms.has(String(b.sym0).toUpperCase()) && syms.has(String(b.sym1).toUpperCase())
  );
}

function buildQueue(): { queue: QueueItem[]; deferred: QueueItem[]; universeAgeH: number } {
  const uniPath = path.join(LLAMA, 'universe.json');
  const st = fs.statSync(uniPath); // brak pliku = twardy błąd (pipeline nie zbiegł)
  const universeAgeH = (Date.now() - st.mtimeMs) / 3_600_000;
  const universe: any[] = JSON.parse(fs.readFileSync(uniPath, 'utf8'));

  let streaks: Record<string, number> = {};
  try { streaks = JSON.parse(fs.readFileSync(path.join(BOT, 'selector-state.json'), 'utf8')).streaks ?? {}; } catch { /* brak stanu selektora = streak 0 */ }

  // ważne werdykty (seed żyje w bot/candidates.ts, ale lejek pisze tylko
  // runtime; do filtrowania potrzebujemy OBU)
  const byId = new Map<string, Verdict>();
  for (const v of SEED_VERDICTS as Verdict[]) byId.set(v.llamaPool, v);
  for (const v of readRuntimeVerdicts()) byId.set(v.llamaPool, v);
  const settled = (uuid: string): boolean => {
    const v = byId.get(uuid);
    if (!v || v.verdict === 'QUEUED') return false;
    return !v.algoVersion || v.algoVersion === ALGO_VERSION; // stara wersja algo = nieważny → retest
  };

  // otwarte propozycje OPEN spoza BOT_POOLS (druga furtka kwalifikacji)
  const openProposals = new Set<string>();
  try {
    const props: any[] = JSON.parse(fs.readFileSync(path.join(BOT, 'proposals.json'), 'utf8'));
    for (const p of props) if (p.kind === 'OPEN' && p.status === 'open' && !p.poolId && p.llamaPool) openProposals.add(p.llamaPool);
  } catch { /* brak proposals.json (Mac / świeży serwer) — furtka po prostu pusta */ }

  const ranked = universe
    .filter((p) => p.project === 'uniswap-v3' && CHAIN_MAP[p.chain] && p.tvlUsd >= MIN_TVL &&
      String(p.symbol).split('-').every((t: string) => MAJORS.test(t)))
    .map((p) => ({ ...p, ...median7dApy(p.pool) }))
    .filter((p) => p.med !== null)
    .sort((a, b) => b.med - a.med);

  const queue: QueueItem[] = [];
  const deferred: QueueItem[] = [];
  const seen = new Set<string>();
  const consider = (p: any, reason: string) => {
    if (seen.has(p.pool)) return;
    seen.add(p.pool);
    const feeTier = (p.poolMeta || '').trim();
    if (!FEE_BPS[feeTier]) return; // nieznany tier — poza zakresem v3
    if (inBotPools(p.chain, p.symbol, feeTier)) return; // już gra w bocie
    if (settled(p.pool)) return; // ważny werdykt istnieje
    const item: QueueItem = {
      llamaPool: p.pool, chain: p.chain, symbol: p.symbol, feeTier,
      tvlUsd: p.tvlUsd, streak: streaks[p.pool] || 0, reason,
    };
    if ((p.historyDays ?? 0) < MIN_HISTORY_D) {
      item.reason += ` · ODROCZONE: ${p.historyDays}d historii (<${MIN_HISTORY_D})`;
      deferred.push(item);
    } else queue.push(item);
  };

  // "TOP10 DOBRYCH" (Rafał 25.08): odrzucone werdyktem nie zajmują miejsc —
  // skanujemy ranking, aż zbierze się TOP_N pul bez FAIL/UNMAPPED (lejek
  // bada więc też pule, które wskoczyły w miejsce odrzuconych).
  const rejected = (uuid: string): boolean => {
    const v = byId.get(uuid);
    return !!v && (v.verdict === 'FAIL' || v.verdict === 'UNMAPPED') && (!v.algoVersion || v.algoVersion === ALGO_VERSION);
  };
  let good = 0;
  for (const p of ranked) {
    if (!rejected(p.pool)) {
      good++;
      if ((streaks[p.pool] || 0) >= PERSIST_DAYS) consider(p, `top${TOP_N} dobrych wg mediany 7d (streak ${streaks[p.pool]})`);
    }
    if (good >= TOP_N) break;
  }
  for (const p of ranked) if (openProposals.has(p.pool)) consider(p, 'propozycja OPEN spoza BOT_POOLS');

  // FIFO wg persystencji, potem TVL (TASKS-FUNNEL §2)
  queue.sort((a, b) => b.streak - a.streak || b.tvlUsd - a.tvlUsd);
  return { queue, deferred, universeAgeH };
}

// --- mapowanie llama → on-chain PoolCfg ---
type CandCfg = {
  id: string; chain: string; address: string; feeBps: number; ethIsToken0: boolean;
  token0Decimals: number; token1Decimals: number; days: number;
  quoteRefId?: string; // dla par kwotowanych w WETH — czyta load.ts
};

async function mapCandidate(item: QueueItem): Promise<{ cfg: CandCfg } | { unmapped: string }> {
  const chain = CHAIN_MAP[item.chain];
  const feeBps = FEE_BPS[item.feeTier];
  const symsRaw = item.symbol.split('-').map((s) => s.toUpperCase());
  if (symsRaw.length !== 2) return { unmapped: `symbol "${item.symbol}" nie jest parą` };
  const hasStable = symsRaw.some((s) => STABLES.has(s));
  const hasEthLeg = symsRaw.some((s) => ETH_LIKE.has(s));
  if (!hasStable && !hasEthLeg) return { unmapped: 'brak nogi stable i WETH (egzotyka/BTC-BTC — poza lejkiem, jak tbtc-wbtc)' };

  const defs = symsRaw.map((s) => TOKENS[chain]?.[s]);
  if (defs.some((d) => !d)) return { unmapped: `token spoza słownika majors: ${symsRaw.filter((s) => !TOKENS[chain]?.[s]).join(',')} @ ${chain}` };

  // warianty adresów (np. USDC natywny vs bridged) — pierwszy istniejący pool wygrywa
  for (const dA of defs[0]!) for (const dB of defs[1]!) {
    const [lo, hi] = [dA, dB].sort((x, y) => (x.addr.toLowerCase() < y.addr.toLowerCase() ? -1 : 1));
    const data = '0x1698ee82' + addrArg(lo.addr) + addrArg(hi.addr) + feeBps.toString(16).padStart(64, '0');
    let poolAddr: string;
    try { poolAddr = parseAddr(await ethCall(chain, FACTORY[chain], data)); } catch (e) { return { unmapped: `RPC getPool padł: ${String(e).slice(0, 100)}` }; }
    if (ZERO_ADDR.test(poolAddr)) continue;
    // SANITY: token0/token1 puli muszą się zgadzać ze słownikiem
    let t0: string, t1: string;
    try {
      t0 = parseAddr(await ethCall(chain, poolAddr, '0x0dfe1681'));
      t1 = parseAddr(await ethCall(chain, poolAddr, '0xd21220a7'));
    } catch (e) { return { unmapped: `RPC token0/token1 padł: ${String(e).slice(0, 100)}` }; }
    if (t0 !== lo.addr.toLowerCase() || t1 !== hi.addr.toLowerCase()) {
      return { unmapped: `sanity-check tokenów puli ${poolAddr} nie przeszedł (token0/1 ≠ słownik)` };
    }
    const symOf = (d: TokenDef) => symsRaw[defs[0]!.includes(d) ? 0 : 1];
    const sym0 = symOf(lo), sym1 = symOf(hi);
    const wethIsToken0 = ETH_LIKE.has(sym0);
    // ethIsToken0: dla par z WETH — pozycja WETH (konwencja repo); dla
    // BTC/stable bez WETH — pozycja assetu (silnik: "asset jest token0")
    const ethIsToken0 = hasEthLeg ? wethIsToken0 : !STABLES.has(sym0);
    const cfg: CandCfg = {
      id: `cand-${chain}-${sym0.toLowerCase()}-${sym1.toLowerCase()}-${FEE_CODE[feeBps]}`,
      chain, address: poolAddr, feeBps, ethIsToken0,
      token0Decimals: lo.decimals, token1Decimals: hi.decimals, days: 365,
    };
    if (hasEthLeg && !hasStable) cfg.quoteRefId = WETH_USD_REF_365D[chain]; // para kwotowana w WETH
    return { cfg };
  }
  return { unmapped: `factory.getPool zwrócił 0x0 dla wszystkich wariantów adresów (${item.symbol} ${item.feeTier} @ ${chain})` };
}

// --- spawn z twardym timeoutem (Windows: taskkill /T — shell:true robi wrapper cmd) ---
function runStep(name: string, script: string, args: string[], extraEnv: Record<string, string> = {}): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn('npx', ['tsx', script, ...args], {
      cwd: ROOT, env: { ...process.env, ...extraEnv }, shell: process.platform === 'win32', stdio: 'inherit',
    });
    const killer = setTimeout(() => {
      log(`✗ ${name}: TIMEOUT ${STEP_TIMEOUT_MIN} min — ubijam (stan fetchu jest wznawialny)`);
      if (process.platform === 'win32' && child.pid) spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { shell: true });
      else child.kill('SIGKILL');
    }, STEP_TIMEOUT_MIN * 60_000);
    child.on('close', (code) => { clearTimeout(killer); resolve(code ?? 1); });
  });
}

// --- bramka ---
function evaluateGate(candId: string, symsUpper: string[]): { verdict: 'PASS' | 'FAIL'; winPct: number; worst: number; strategy: string; windows: number } | { error: string } {
  const p = path.join(RESULTS, `walkforward-${candId}-30d.json`);
  let j: any;
  try { j = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return { error: `brak wyniku ${path.relative(ROOT, p)}` }; }
  const hasStable = symsUpper.some((s) => STABLES.has(s));
  // profil: ETH/stable → v1.1 (k=3, re>EMA); BTC-noga bez stable → cbBTC (k=2 czysty exit)
  const want = hasStable ? /k=3 .*trend\(exit,.*re>ema\)/ : /k=2 .*trend\(exit,(?!.*re>ema)/;
  const name = Object.keys(j.summary ?? {}).find((k) => want.test(k));
  if (!name) return { error: `w summary brak strategii profilu (${hasStable ? 'v1.1 re>ema' : 'cbBTC k=2'}); klucze: ${Object.keys(j.summary ?? {}).join(' | ')}` };
  const s = j.summary[name];
  const pass = s.winPct >= 65 && s.worst > -3;
  return { verdict: pass ? 'PASS' : 'FAIL', winPct: Math.round(s.winPct * 10) / 10, worst: Math.round(s.worst * 100) / 100, strategy: name, windows: j.windows };
}

// --- main ---
(async () => {
  const all = process.argv.includes('--all');
  const dryRun = process.argv.includes('--dry-run');
  const { queue, deferred, universeAgeH } = buildQueue();
  log(`universe.json ${universeAgeH.toFixed(1)}h · kolejka: ${queue.length} · odroczone: ${deferred.length}`);
  if (universeAgeH > 26) log(`UWAGA: universe.json >26h — kwalifikacja na stęchłych danych (dry-run/diagnostyka OK, produkcyjnie pipeline powinien być świeży)`);
  for (const q of queue) log(`  → ${q.symbol} ${q.feeTier} @ ${q.chain} (streak ${q.streak}, TVL $${(q.tvlUsd / 1e6).toFixed(1)}M) — ${q.reason}`);
  for (const d of deferred) log(`  ⏸ ${d.symbol} ${d.feeTier} @ ${d.chain} — ${d.reason}`);

  // snapshot kolejki dla raportu/UI (pisany ZAWSZE, też przy pustej kolejce)
  fs.mkdirSync(BOT, { recursive: true });
  fs.writeFileSync(QUEUE_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), universeAgeH: Math.round(universeAgeH * 10) / 10, queue, deferred }, null, 2));

  // odroczone: utrwal notę w werdyktach (widoczność w UI), bez zajmowania slotu
  for (const d of deferred) {
    upsertVerdict({ llamaPool: d.llamaPool, chain: d.chain, symbol: d.symbol, feeTier: d.feeTier, verdict: 'QUEUED', note: d.reason });
  }

  if (dryRun) { log('--dry-run: koniec (bez fetch/walkforward)'); process.exit(0); }
  if (!queue.length) { log('kolejka pusta — nic do walidacji'); process.exit(0); }

  const todo = all ? queue : queue.slice(0, 1); // steady-state: max 1/noc
  let hardFail = false;
  for (const item of todo) {
    log(`=== kandydat: ${item.symbol} ${item.feeTier} @ ${item.chain} ===`);
    const mapped = await mapCandidate(item);
    if ('unmapped' in mapped) {
      upsertVerdict({ llamaPool: item.llamaPool, chain: item.chain, symbol: item.symbol, feeTier: item.feeTier, verdict: 'UNMAPPED', testedAt: new Date().toISOString().slice(0, 10), note: mapped.unmapped, algoVersion: ALGO_VERSION });
      continue;
    }
    const { cfg } = mapped;
    log(`zmapowano: ${cfg.id} → ${cfg.address}${cfg.quoteRefId ? ` (quote WETH, ref ${cfg.quoteRefId})` : ''}`);
    fs.mkdirSync(CAND_DIR, { recursive: true });
    const cfgPath = path.join(CAND_DIR, `${cfg.id}.cfg.json`);
    fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));

    // fetch 365d (wznawialny; 2 podejścia w ramach wspólnego budżetu czasu)
    let code = await runStep(`fetch-${cfg.id}`, 'scripts/fetch-swaps-hypersync.ts', ['--cfg', path.relative(ROOT, cfgPath)]);
    if (code !== 0) code = await runStep(`fetch-${cfg.id} (retry)`, 'scripts/fetch-swaps-hypersync.ts', ['--cfg', path.relative(ROOT, cfgPath)]);
    if (code !== 0) { log(`✗ fetch ${cfg.id} nieudany (exit ${code}) — kandydat zostaje w kolejce na jutro`); hardFail = true; continue; }

    // walkforward 22 okna 30/15, zamrożony v1.2, heap 8GB, zestaw 'funnel'
    code = await runStep(`walkforward-${cfg.id}`, 'backtest/walkforward.ts', [cfg.id, '30', '15'], {
      WF_SET: 'funnel',
      NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --max-old-space-size=8192`.trim(),
    });
    if (code !== 0) { log(`✗ walkforward ${cfg.id} nieudany (exit ${code}) — kandydat zostaje w kolejce`); hardFail = true; continue; }

    const gate = evaluateGate(cfg.id, item.symbol.split('-').map((s) => s.toUpperCase()));
    if ('error' in gate) { log(`✗ bramka: ${gate.error}`); hardFail = true; continue; }
    upsertVerdict({
      llamaPool: item.llamaPool, chain: item.chain, symbol: item.symbol, feeTier: item.feeTier,
      verdict: gate.verdict, winPct: gate.winPct, worst: gate.worst,
      testedAt: new Date().toISOString().slice(0, 10),
      note: `auto-lejek: ${gate.windows} okien 30/15, strategia "${gate.strategy}"`,
      algoVersion: ALGO_VERSION, candId: cfg.id, poolAddress: cfg.address, strategy: gate.strategy,
    });
  }
  process.exit(hardFail ? 1 : 0);
})();
