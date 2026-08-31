/**
 * ClosedPositionsPanel.tsx — "Zamknięte pozycje" + eksport CSV
 * (TASKS-LEDGER.md §3, HANDOFF Fable→Sonnet 25.08, zlecenie Rafała po
 * zamknięciu #953427 przez apkę: pozycja zniknęła bez śladu — zero
 * historii, zero podsumowania).
 *
 * Dane: `bot.closedPositions`/`closedPositionsStatus` z useBotApi.ts
 * (GET /api/closed-positions, bot/ledger.ts — poza zakresem edycji tej
 * sesji, tylko odczyt kształtu). KAŻDE pole liczbowe może być `null`
 * (brak metadanych spalonego NFT albo noga niewyceniana w USD) —
 * renderowane jako „—", NIGDY 0 (0 to realna wartość, null to "nie wiemy").
 *
 * Szkielet jak TopRankingPanel/BotTelemetry/ForecastPanel/ObservationAnalysis
 * (`telemetry-section` > `telemetry-header` > `telemetry-body`, własny
 * `useState` zwinięcia) — zwinięta domyślnie (TASKS-LEDGER.md §3), zgodnie
 * z konwencją ujednoliconą 21.08.
 *
 * Degradacja łagodna (wprost z HANDOFF): 404 (serwer jeszcze bez wdrożenia
 * dzisiejszej paczki) → spokojna notka, NIE error; pusta lista → "brak
 * zamkniętych pozycji"; błąd sieci/tokena → notka, bez czerwonego banera.
 *
 * ZAKRES TWARDY: bot/** nietknięty (tylko czytanie typu przez useBotApi.ts).
 */
import React, { FC, useState } from 'react';
import { UseBotApi, ClosedPosition, BotPoolLive } from '../hooks/useBotApi';
import { POSITION_MANAGER_ADDRESSES } from '../utils/liquidityManagement';
import { BOT_POOL_META } from '../config/botPools';

interface Props {
  bot: UseBotApi;
}

// PARTIA 20 pkt 4: fallback wyceny netto dla par krypto-krypto (np. cbBTC/WETH
// zamknięta #5887690, "— (brak wyceny obu nóg)" — bot/ledger.ts wycenia tylko
// nogi z parą dolarową, ten sam ograniczenie co usdValueOf w usePortfolio.ts).
// Tej samej klasy fix co Partia 15 (kwadraciki tam liczyły przez
// bot.state.positions[].valueUsd — tu, ponieważ pozycja jest ZAMKNIĘTA i już
// nie ma wiersza w state.positions, liczymy sami z bot.state.pools[].ethUsd
// (kurs referencyjny bota, ta sama semantyka co orientacja cen w
// bot/observer.ts: dla puli quote:'USD' ethUsd = USD za ETH, dla quote:'WETH'
// (cbBTC/WETH) ethUsd = USD za token bazowy nie-WETH). UWAGA: to jest kurs
// BIEŻĄCY (ostatni tick bota), NIE historyczny w momencie zamknięcia — ledger
// nie niesie timestampu dopasowanego do żadnej zapisanej ceny, więc dopisek
// mówi wprost "po kursie dziś", zamiast udawać precyzyjny realized PnL.
const STABLE_SYMBOLS = new Set(['USDC', 'USDT', 'DAI', 'USDBC', 'USDE', 'FRAX', 'LUSD']);
const isStableSym = (s: string) => STABLE_SYMBOLS.has(s.toUpperCase());
const isEthSym = (s: string) => s.toUpperCase().includes('ETH');

/** Cena USD symbolu (dziś) przez kurs referencyjny bota — null, gdy żadna
 *  pula bota na tym łańcuchu nie niesie tego tokenu (spoza konfiguracji). */
function usdPriceForSymbolToday(sym: string, chainId: number, botPools: BotPoolLive[]): number | null {
  if (isStableSym(sym)) return 1;
  for (const meta of BOT_POOL_META) {
    if (meta.chainId !== chainId) continue;
    if (meta.sym0 !== sym && meta.sym1 !== sym) continue;
    const other = meta.sym0 === sym ? meta.sym1 : meta.sym0;
    const live = botPools.find((pl) => pl.id === meta.id);
    if (!live || !(live.ethUsd > 0)) continue;
    if (isEthSym(sym)) {
      // sym to noga ETH-owa — ethUsd tej puli to cena ETH TYLKO gdy druga
      // noga jest stablecoinem (pula quote:'USD'); w puli quote:'WETH'
      // (np. cbBTC/WETH) ethUsd to cena DRUGIEGO tokenu, nie ETH — pomiń.
      if (isStableSym(other)) return live.ethUsd;
      continue;
    }
    // sym to token bazowy nie-ETH/nie-stable (np. cbBTC) — potrzebna pula
    // quote:'WETH' (druga noga ETH-owa), gdzie ethUsd JEST ceną tego tokenu.
    if (isEthSym(other)) return live.ethUsd;
  }
  return null;
}

// Slug (`chain` w ClosedPosition/LedgerEntry, jak w bot/ledger.ts) → chainId
// + etykieta + domena eksploratora dla linku NFT (/nft/{contract}/{tokenId} —
// wzorzec wspólny dla całej rodziny Etherscan). Duplikacja świadoma, jak
// GAS_USD w useCockpitActions.ts — bot/** poza zakresem edycji tej sesji.
const CHAIN_META: Record<string, { chainId: number; label: string; explorerNftBase: string }> = {
  mainnet: { chainId: 1, label: 'Ethereum', explorerNftBase: 'https://etherscan.io/nft' },
  base: { chainId: 8453, label: 'Base', explorerNftBase: 'https://basescan.org/nft' },
  arbitrum: { chainId: 42161, label: 'Arbitrum', explorerNftBase: 'https://arbiscan.io/nft' },
};

const fmtUsd = (v: number) => '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtUsdOrDash = (v: number | null): string => (v === null ? '—' : fmtUsd(v));
const fmtTok = (v: number | null, sym: string): string => (v === null ? '—' : `${v.toFixed(6)} ${sym}`);
const fmtDate = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' }) : '—';

const ClosedPositionCard: FC<{ p: ClosedPosition; botPools: BotPoolLive[] }> = ({ p, botPools }) => {
  const meta = CHAIN_META[p.chain];
  const manager = meta ? (POSITION_MANAGER_ADDRESSES[meta.chainId] as string | undefined) : undefined;
  const nftUrl = meta && manager ? `${meta.explorerNftBase}/${manager}/${p.tokenId}` : null;
  // Netto = zebrane (COLLECT, principal+fees) − wpłacone (INCREASE), TYLKO gdy
  // obie strony wyceniane w USD (stable/WETH) — bez kosztu gazu (osobna
  // kolumna w CSV/ledger, nie liczona tu). Etykietowane wprost jako
  // przybliżenie, żeby nie sugerować precyzyjnego realized PnL.
  const netUsd = p.inUsd !== null && p.outUsd !== null ? p.outUsd - p.inUsd : null;

  // PARTIA 20 pkt 4: fallback, gdy ledger nie wycenił żadnej nogi w USD (para
  // krypto-krypto, np. cbBTC/WETH) — kurs referencyjny bota, TYLKO gdy mamy
  // wszystkie cztery ilości tokenów (in0/in1/out0/out1) i pula jest w
  // konfiguracji bota na tym łańcuchu. `null` = zostaje "— (brak wyceny obu nóg)".
  const netUsdBotToday = (() => {
    if (netUsd !== null || !meta) return null;
    const { in0, in1, out0, out1 } = p;
    if (in0 === null || in1 === null || out0 === null || out1 === null) return null;
    const px0 = usdPriceForSymbolToday(p.sym0, meta.chainId, botPools);
    const px1 = usdPriceForSymbolToday(p.sym1, meta.chainId, botPools);
    if (px0 === null || px1 === null) return null;
    return out0 * px0 + out1 * px1 - (in0 * px0 + in1 * px1);
  })();

  return (
    <div className="cockpit-position-card closed-position-card">
      <div className="cockpit-position-card-header closed-position-header">
        <span>
          {p.sym0}/{p.sym1} · {meta?.label ?? p.chain} · #{p.tokenId}
        </span>
        {nftUrl && (
          <a href={nftUrl} target="_blank" rel="noopener noreferrer" className="muted">
            eksplorator ↗
          </a>
        )}
      </div>
      <div className="muted closed-position-period">
        {fmtDate(p.openedAt)} → {fmtDate(p.closedAt)}
      </div>
      <div className="closed-position-grid">
        <div>
          <span className="muted">wpłacone: </span>
          {fmtTok(p.in0, p.sym0)} / {fmtTok(p.in1, p.sym1)}
        </div>
        <div>
          <span className="muted">wypłacone: </span>
          {fmtTok(p.out0, p.sym0)} / {fmtTok(p.out1, p.sym1)}
        </div>
        <div>
          <span className="muted">fees: </span>
          {fmtTok(p.fees0, p.sym0)} / {fmtTok(p.fees1, p.sym1)}
        </div>
        <div>
          <span className="muted">USD: </span>
          wpłacone {fmtUsdOrDash(p.inUsd)} · wypłacone {fmtUsdOrDash(p.outUsd)} · fees {fmtUsdOrDash(p.feesUsdApprox)}
        </div>
      </div>
      <div className="closed-position-footer muted">
        {netUsd !== null ? (
          <span className={netUsd >= 0 ? 'closed-position-net-pos' : 'closed-position-net-neg'}>
            netto (bez gazu): {netUsd >= 0 ? '+' : ''}
            {fmtUsd(netUsd)}
          </span>
        ) : netUsdBotToday !== null ? (
          <span
            className={netUsdBotToday >= 0 ? 'closed-position-net-pos' : 'closed-position-net-neg'}
            title="Ledger nie wycenia obu nóg w USD (para krypto-krypto, brak stablecoina/WETH z parą dolarową) — liczba pochodzi z kursu referencyjnego bota (bot.state.pools[].ethUsd, ten sam mechanizm co usdRefPoolId w bot/config.ts). To kurs BIEŻĄCY (dzisiejszy tick bota), NIE historyczny z chwili zamknięcia — ledger nie niesie timestampu dopasowanego do zapisanej ceny."
          >
            netto (bez gazu, wycena bota, po kursie dziś): {netUsdBotToday >= 0 ? '+' : ''}
            {fmtUsd(netUsdBotToday)}
          </span>
        ) : (
          <span>netto: — (brak wyceny obu nóg)</span>
        )}
        {' · '}
        {p.txCount} tx
      </div>
    </div>
  );
};

const ClosedPositionsPanel: FC<Props> = ({ bot }) => {
  const [expanded, setExpanded] = useState(false);
  const [csvBusy, setCsvBusy] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const { closedPositions, closedPositionsStatus } = bot;

  // Bearer token w nagłówku — endpoint jest chroniony jak reszta /api/*
  // (patrz zasada CORS/token w bot/server.ts), więc goły <a href> bez
  // nagłówka skończyłby się 401 (ta sama lekcja co "surowy JSON" w
  // BotTelemetry.tsx). fetch+Blob+link tymczasowy zamiast tego.
  const downloadCsv = async () => {
    setCsvBusy(true);
    setCsvError(null);
    try {
      const headers: Record<string, string> = {};
      if (bot.apiToken) headers.Authorization = `Bearer ${bot.apiToken}`;
      const res = await fetch(`${bot.apiBase.replace(/\/$/, '')}/api/ledger.csv`, { headers });
      if (!res.ok) {
        setCsvError(res.status === 401 ? 'Zły token dostępu' : `Pobieranie nieudane: HTTP ${res.status}`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'homos-ledger.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setCsvError(`Pobieranie nieudane: ${e instanceof Error ? e.message.slice(0, 160) : String(e)}`);
    } finally {
      setCsvBusy(false);
    }
  };

  return (
    <div className="telemetry-section">
      <div className="telemetry-header" onClick={() => setExpanded((e) => !e)}>
        <span className="morning-section-title telemetry-title">Zamknięte pozycje</span>
        <span className="morning-toggle">{expanded ? '▼' : '▶'}</span>
      </div>

      {expanded && (
        <div className="telemetry-body">
          {closedPositionsStatus === 'not-started' ? (
            <div className="morning-note muted">Sekcja pojawi się po wdrożeniu księgi transakcji na serwerze (backfill w toku).</div>
          ) : closedPositionsStatus === 'error' ? (
            <div className="morning-note muted">Zamknięte pozycje niedostępne (błąd sieci lub serwera).</div>
          ) : closedPositionsStatus === 'loading' || !closedPositions ? (
            <div className="morning-note muted">wczytywanie…</div>
          ) : closedPositions.length === 0 ? (
            <div className="morning-note muted">brak zamkniętych pozycji.</div>
          ) : (
            <div className="closed-positions-list">
              {closedPositions
                .slice()
                .sort((a, b) => (b.closedAt ?? '').localeCompare(a.closedAt ?? ''))
                .map((p) => (
                  <ClosedPositionCard key={`${p.chain}-${p.tokenId}`} p={p} botPools={bot.state?.pools ?? []} />
                ))}
            </div>
          )}

          <div className="closed-positions-csv-row">
            <button className="action-button" onClick={downloadCsv} disabled={csvBusy}>
              {csvBusy ? 'Pobieranie…' : '⬇ Pobierz CSV (pełna księga)'}
            </button>
            {csvError && <span className="message error closed-positions-csv-error">{csvError}</span>}
          </div>
          <div className="muted closed-positions-csv-note">
            CSV: 1 wiersz = 1 zdarzenie on-chain (wszystkie sieci, wszystkie pozycje) — kolumna PLN/NBP to osobna
            iteracja, na razie tylko USD gdzie wyceniane.
          </div>
        </div>
      )}
    </div>
  );
};

export default ClosedPositionsPanel;
