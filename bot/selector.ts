/**
 * bot/selector.ts — WARSTWA SELEKCJI: poranne propozycje OTWÓRZ / ROTUJ.
 *
 * Polityka zwalidowana meta-backtestem (backtest/selection.ts, 231 pul, 4.4y):
 *   Top5 wg średniej 7d apyBase + persystencja 3 dni w strefie topu + TYLKO majors
 *   (74.8% fee-APR vs 43.0% naiwny pościg vs 32.9% stały rdzeń).
 * Rotacja wg reguły z RESEARCH-QUEUE C: przewaga kandydata musi pokryć koszt
 * przejścia (0.3% kapitału) w ≤10 dni; max 1 propozycja rotacji dziennie.
 *
 * Dane wejściowe: data/llama/universe.json + data/llama/history/<uuid>.json —
 * odświeżane codziennie przez pipeline (Harmonogram zadań Windows 07:30).
 * Selektor odpala się raz dziennie po RUN_AFTER_HOUR, tylko gdy dane <26h.
 *
 * TRYB: propozycje trafiają do proposals.json (kind: OPEN/ROTATE) — bot niczego
 * nie wykonuje; UI pokazuje karty [Zatwierdź]/[Modyfikuj]/[Odrzuć] (Partia 4),
 * a Zatwierdź zawsze kończy się podpisami w Rabby.
 */
import * as fs from 'fs';
import * as path from 'path';
import { BOT_POOLS, BotPool, STATE_DIR } from './config';

const ROOT = path.join(__dirname, '..');
const LLAMA = path.join(ROOT, 'data', 'llama');
const SELECTOR_STATE = path.join(ROOT, STATE_DIR, 'selector-state.json');

// --- parametry polityki (po zamrożeniu ALGORITHM.md: jedna prawda tu i w backteście) ---
const TOP_N = 5;
const RANK_WINDOW_D = 7;
const PERSIST_DAYS = 3;
const MIN_TVL = 3_000_000;
const MAJORS = /ETH|BTC|USDC|USDT|DAI|USDS/;
const SWITCH_COST_PCT = 0.3; // wyjście+wejście, % kapitału (2× 0.15 z selection.ts)
const MAX_PAYBACK_DAYS = 10; // przewaga musi pokryć koszt przejścia w ≤10 dni
const RUN_AFTER_HOUR = 8; // lokalna godzina, po pipeline 07:30
const MAX_DATA_AGE_H = 26; // nie proponuj ze stęchłych danych
const REPROPOSE_COOLDOWN_D = 7; // odrzucona propozycja nie wraca przez tydzień
const MAX_OPEN_PROPOSALS_PER_DAY = 2;

const FEE_META: Record<number, string> = { 100: '0.01%', 500: '0.05%', 3000: '0.3%', 10000: '1%' };
const CHAIN_MAP: Record<string, string> = { Ethereum: 'mainnet', Base: 'base' };

interface LlamaPoolMeta {
  pool: string; // uuid DefiLlama
  symbol: string; // np. "WETH-USDC"
  chain: string;
  project: string;
  poolMeta: string | null; // np. "0.3%"
  tvlUsd: number;
}
interface RankedPool extends LlamaPoolMeta {
  apy7d: number;
  streak: number;
  botPool: BotPool | null; // dopasowanie do naszej konfiguracji (adres znany)
}

interface SelectorState {
  lastRunDate: string | null; // YYYY-MM-DD
  lastRotateDate: string | null;
  streaks: Record<string, number>; // uuid → dni z rzędu w strefie topu (2N)
}

const loadSelState = (): SelectorState => {
  try {
    return JSON.parse(fs.readFileSync(SELECTOR_STATE, 'utf8'));
  } catch {
    return { lastRunDate: null, lastRotateDate: null, streaks: {} };
  }
};
const saveSelState = (s: SelectorState) => {
  fs.mkdirSync(path.dirname(SELECTOR_STATE), { recursive: true });
  fs.writeFileSync(SELECTOR_STATE, JSON.stringify(s, null, 2));
};

const isMajorsPair = (sym: string) => sym.split('-').every((t) => MAJORS.test(t));

/** średnia apyBase z okna `days` wpisów kończącego się `offsetDays` dni wstecz
 *  (offsetDays=0 → najnowsze; >0 → historyczne, do zasiewania streaków) */
function trailingApy(uuid: string, days: number, offsetDays = 0): number | null {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(LLAMA, 'history', `${uuid}.json`), 'utf8'));
    const all: Array<{ apyBase: number | null }> = j.series || [];
    const sliced = offsetDays > 0 ? all.slice(0, Math.max(0, all.length - offsetDays)) : all;
    const series = sliced.slice(-days);
    const vals = series.map((r) => r.apyBase).filter((v): v is number => v !== null && v !== undefined);
    return vals.length >= days * 0.7 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  } catch {
    return null;
  }
}

/** dopasuj pulę DefiLlama do wpisu w BOT_POOLS (chain + symbole + fee tier) */
function matchBotPool(m: LlamaPoolMeta): BotPool | null {
  const chain = CHAIN_MAP[m.chain];
  if (!chain) return null;
  const syms = new Set(m.symbol.split('-').map((s) => s.toUpperCase()));
  return (
    BOT_POOLS.find(
      (b) =>
        b.chain === chain &&
        FEE_META[b.feeBps] === (m.poolMeta || '').trim() &&
        syms.has(b.sym0.toUpperCase()) &&
        syms.has(b.sym1.toUpperCase())
    ) ?? null
  );
}

/** ranking dnia: filtr (v3, chain, TVL, majors) → apy7d → strefa topu → persystencja.
 *  offsetDays>0 = przebieg historyczny (tylko aktualizacja streaków — zimny start). */
function buildRanking(state: SelectorState, offsetDays = 0): RankedPool[] {
  const universe: LlamaPoolMeta[] = JSON.parse(fs.readFileSync(path.join(LLAMA, 'universe.json'), 'utf8'));
  const candidates = universe
    .filter(
      (p) =>
        p.project === 'uniswap-v3' && // v4 świadomie poza zakresem (inny stack)
        CHAIN_MAP[p.chain] &&
        p.tvlUsd >= MIN_TVL &&
        isMajorsPair(p.symbol)
    )
    .map((p) => ({ ...p, apy7d: trailingApy(p.pool, RANK_WINDOW_D, offsetDays) }))
    .filter((p): p is LlamaPoolMeta & { apy7d: number } => p.apy7d !== null)
    .sort((a, b) => b.apy7d - a.apy7d);

  // strefa topu = 2N (jak w selection.ts) — do liczenia persystencji
  const topZone = new Set(candidates.slice(0, TOP_N * 2).map((p) => p.pool));
  for (const uuid of topZone) state.streaks[uuid] = (state.streaks[uuid] || 0) + 1;
  for (const uuid of Object.keys(state.streaks)) if (!topZone.has(uuid)) state.streaks[uuid] = 0;

  return candidates.map((p) => ({
    ...p,
    streak: state.streaks[p.pool] || 0,
    botPool: matchBotPool(p),
  }));
}

// --- typy kontekstu przekazywanego z observer.ts (bez importu, żeby uniknąć cyklu) ---
export interface SelectorProposal {
  id: string;
  createdAt: string;
  kind: 'OPEN' | 'ROTATE';
  action: string; // czytelny opis dla UI/Telegrama
  tokenId: string; // '' dla OPEN; przy ROTATE: pozycja do zamknięcia
  poolId: string; // BOT_POOLS id albo '' gdy pula spoza konfiguracji
  llamaPool?: string; // uuid DefiLlama
  symbol?: string;
  chain?: string;
  apy7d?: number; // kandydat
  heldApy7d?: number; // przy ROTATE: obecna pula
  breakEvenDays?: number; // przy ROTATE: dni do pokrycia kosztu przejścia
  suggestedRange?: { tickLower: number; tickUpper: number; usdLo: number; usdHi: number };
  note?: string;
  costUsd?: number;
  paybackDays?: number | null;
  status: 'open' | 'dismissed';
}

export interface SelectorCtx {
  log: (msg: string) => void;
  telegram: (text: string) => Promise<void>;
  getProposals: () => Array<{ id: string; status: string; createdAt: string }>;
  addProposal: (p: SelectorProposal) => void; // observer dopisuje do proposals.json + state
  getPositions: () => Array<{ tokenId: string; poolId: string; valueUsd: number }>;
  getSuggestion: (poolId: string) => { tickLower: number; tickUpper: number; usdLo: number; usdHi: number } | null;
}

const today = () => new Date().toISOString().slice(0, 10);

/** czy propozycja o tym kluczu jest otwarta albo odrzucona w oknie cooldownu */
function blocked(ctx: SelectorCtx, id: string): boolean {
  const cutoff = Date.now() - REPROPOSE_COOLDOWN_D * 24 * 3600 * 1000;
  return ctx.getProposals().some(
    (p) => p.id === id && (p.status === 'open' || new Date(p.createdAt).getTime() > cutoff)
  );
}

/** Odpal raz dziennie po RUN_AFTER_HOUR, o ile dane pipeline'u świeże. */
export function runSelectorIfDue(ctx: SelectorCtx): void {
  const state = loadSelState();
  if (state.lastRunDate === today()) return;
  if (new Date().getHours() < RUN_AFTER_HOUR) return;

  const uniPath = path.join(LLAMA, 'universe.json');
  const st = fs.statSync(uniPath, { throwIfNoEntry: false });
  if (!st) {
    ctx.log('selector: brak data/llama/universe.json — pipeline nie zbiegł? pomijam dziś');
    state.lastRunDate = today(); // nie młóć co godzinę do skutku
    saveSelState(state);
    return;
  }
  const ageH = (Date.now() - st.mtimeMs) / 3_600_000;
  if (ageH > MAX_DATA_AGE_H) {
    ctx.log(`selector: dane DefiLlamy mają ${ageH.toFixed(1)}h (>${MAX_DATA_AGE_H}h) — nie proponuję ze stęchłych danych`);
    state.lastRunDate = today();
    saveSelState(state);
    return;
  }

  let ranking: RankedPool[];
  try {
    // ZIMNY START: bez zapisanego stanu persystencja 3d blokowałaby propozycje
    // przez pierwsze 3 dni — zasiewamy streaki przebiegami historycznymi
    // (ranking sprzed 3, 2, 1 dni z tych samych plików historii DefiLlamy).
    const coldStart = !state.lastRunDate && Object.keys(state.streaks).length === 0;
    if (coldStart) {
      for (let k = PERSIST_DAYS; k >= 1; k--) buildRanking(state, k);
      ctx.log(`selector: zimny start — streaki zasiane z historii (${PERSIST_DAYS} dni wstecz)`);
    }
    ranking = buildRanking(state);
  } catch (e) {
    ctx.log(`selector: błąd rankingu: ${String(e).slice(0, 160)}`);
    return;
  }

  const eligible = ranking.filter((p) => p.streak >= PERSIST_DAYS).slice(0, TOP_N);
  const positions = ctx.getPositions();
  const heldPoolIds = new Set(positions.map((p) => p.poolId));
  const heldLlama = new Map<string, RankedPool>(); // poolId → wpis rankingu obecnej puli
  for (const r of ranking) if (r.botPool && heldPoolIds.has(r.botPool.id)) heldLlama.set(r.botPool.id, r);

  ctx.log(
    `selector: ranking dnia — eligible top${TOP_N} (persyst.≥${PERSIST_DAYS}d): ` +
      (eligible.map((p) => `${p.symbol}@${p.chain} ${p.apy7d.toFixed(1)}%`).join(', ') || 'BRAK (nikt nie utrzymał streaka)')
  );

  // --- OTWÓRZ: eligible pule, w których nie mamy pozycji ---
  let opens = 0;
  for (const cand of eligible) {
    if (opens >= MAX_OPEN_PROPOSALS_PER_DAY) break;
    if (cand.botPool && heldPoolIds.has(cand.botPool.id)) continue; // już tam jesteśmy
    const id = `open-${cand.pool}`;
    if (blocked(ctx, id)) continue;

    const range = cand.botPool ? ctx.getSuggestion(cand.botPool.id) : null;
    const prop: SelectorProposal = {
      id,
      createdAt: new Date().toISOString(),
      kind: 'OPEN',
      action: `OTWÓRZ ${cand.symbol} ${cand.poolMeta ?? ''} @ ${cand.chain} (7d śr. ${cand.apy7d.toFixed(1)}% APR, w topie ${cand.streak}d)`,
      tokenId: '',
      poolId: cand.botPool?.id ?? '',
      llamaPool: cand.pool,
      symbol: cand.symbol,
      chain: cand.chain,
      apy7d: cand.apy7d,
      suggestedRange: range ?? undefined,
      note: cand.botPool
        ? range
          ? undefined
          : 'pula w konfiguracji bota, ale doradca nie ma jeszcze statystyk — zakres ustaw ręcznie (Modyfikuj)'
        : 'pula SPOZA konfiguracji bota — przed otwarciem dopisz ją do bot/config.ts BOT_POOLS (zadanie dla Claude Code)',
      status: 'open',
    };
    ctx.addProposal(prop);
    opens++;
    const msg = `🤖 HOMOS selektor: ${prop.action}${prop.note ? ` — ${prop.note}` : ''} [OBSERWUJ — nic nie wykonano]`;
    ctx.log(msg);
    void ctx.telegram(msg);
  }

  // --- ROTUJ: nasza pozycja wypada z rankingu, kandydat pokrywa koszt w ≤10 dni ---
  if (state.lastRotateDate !== today()) {
    const bestCand = eligible.find((c) => !(c.botPool && heldPoolIds.has(c.botPool.id)));
    if (bestCand) {
      // najsłabsza z naszych pozycji wg apy7d jej puli (bez danych = nie ruszamy)
      const heldRanked = positions
        .map((pos) => ({ pos, r: heldLlama.get(pos.poolId) }))
        .filter((x): x is { pos: (typeof positions)[0]; r: RankedPool } => !!x.r)
        .sort((a, b) => a.r.apy7d - b.r.apy7d);
      const weakest = heldRanked[0];
      if (weakest) {
        const edge = bestCand.apy7d - weakest.r.apy7d; // p.p. rocznie
        const breakEvenDays = edge > 0 ? (SWITCH_COST_PCT / (edge / 365)) : Infinity;
        if (breakEvenDays <= MAX_PAYBACK_DAYS) {
          const id = `rotate-${weakest.pos.tokenId}-${bestCand.pool}`;
          if (!blocked(ctx, id)) {
            const range = bestCand.botPool ? ctx.getSuggestion(bestCand.botPool.id) : null;
            const prop: SelectorProposal = {
              id,
              createdAt: new Date().toISOString(),
              kind: 'ROTATE',
              action: `ROTUJ #${weakest.pos.tokenId} (${weakest.pos.poolId}, 7d ${weakest.r.apy7d.toFixed(1)}%) → ${bestCand.symbol} ${bestCand.poolMeta ?? ''} @ ${bestCand.chain} (7d ${bestCand.apy7d.toFixed(1)}%; koszt przejścia zwraca się w ~${breakEvenDays.toFixed(1)}d)`,
              tokenId: weakest.pos.tokenId,
              poolId: bestCand.botPool?.id ?? '',
              llamaPool: bestCand.pool,
              symbol: bestCand.symbol,
              chain: bestCand.chain,
              apy7d: bestCand.apy7d,
              heldApy7d: weakest.r.apy7d,
              breakEvenDays,
              suggestedRange: range ?? undefined,
              note: bestCand.botPool ? undefined : 'pula docelowa SPOZA konfiguracji bota — dopisz do BOT_POOLS przed wykonaniem',
              status: 'open',
            };
            ctx.addProposal(prop);
            state.lastRotateDate = today();
            const msg = `🤖 HOMOS selektor: ${prop.action} [OBSERWUJ — nic nie wykonano]`;
            ctx.log(msg);
            void ctx.telegram(msg);
          }
        } else {
          ctx.log(
            `selector: rotacja nieopłacalna — najlepszy kandydat ${bestCand.symbol} edge ${edge.toFixed(1)} p.p. → zwrot kosztu w ${breakEvenDays === Infinity ? '∞' : breakEvenDays.toFixed(0)}d (limit ${MAX_PAYBACK_DAYS}d)`
          );
        }
      }
    }
  }

  state.lastRunDate = today();
  saveSelState(state);
}
