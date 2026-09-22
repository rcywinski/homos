/**
 * ClosedPositionsPanel.tsx — "Closed positions" + CSV export
 * (TASKS-LEDGER.md §3, HANDOFF Fable→Sonnet 25.08, requested by the owner
 * after closing #953427 through the app: the position vanished without a
 * trace — zero history, zero summary).
 *
 * Data: `bot.closedPositions`/`closedPositionsStatus` from useBotApi.ts
 * (GET /api/closed-positions, bot/ledger.ts — outside this session's edit
 * scope, shape read only). EVERY numeric field may be `null`
 * (missing metadata of a burned NFT or a leg not priced in USD) —
 * rendered as "—", NEVER 0 (0 is a real value, null means "we don't know").
 *
 * Skeleton like TopRankingPanel/BotTelemetry/ForecastPanel/ObservationAnalysis
 * (`telemetry-section` > `telemetry-header` > `telemetry-body`, own
 * collapse `useState`) — collapsed by default (TASKS-LEDGER.md §3), per the
 * convention unified on 21.08.
 *
 * Graceful degradation (straight from HANDOFF): 404 (server without today's
 * package deployed yet) → calm note, NOT an error; empty list → "no closed
 * positions"; network/token error → note, no red banner.
 *
 * HARD SCOPE: bot/** untouched (only reading the type via useBotApi.ts).
 */
import React, { FC, useState } from 'react';
import { UseBotApi, ClosedPosition, BotPoolLive } from '../hooks/useBotApi';
import { POSITION_MANAGER_ADDRESSES } from '../utils/liquidityManagement';
import { BOT_POOL_META } from '../config/botPools';

interface Props {
  bot: UseBotApi;
}

// BATCH 20 item 4: net valuation fallback for crypto-crypto pairs (e.g. cbBTC/WETH
// closed #5887690, "— (neither leg priced)" — bot/ledger.ts prices only legs
// with a dollar pair, the same limitation as usdValueOf in usePortfolio.ts).
// Same class of fix as Batch 15 (the tiles there counted via
// bot.state.positions[].valueUsd — here, because the position is CLOSED and no
// longer has a row in state.positions, we compute it ourselves from
// bot.state.pools[].ethUsd (the bot's reference rate, same semantics as the price
// orientation in bot/observer.ts: for a quote:'USD' pool ethUsd = USD per ETH,
// for quote:'WETH' (cbBTC/WETH) ethUsd = USD per the non-WETH base token). NOTE:
// this is the CURRENT rate (bot's last tick), NOT historical at close time —
// the ledger carries no timestamp matched to any stored price, so the label
// says "at today's rate" outright instead of pretending to be a precise realized PnL.
const STABLE_SYMBOLS = new Set(['USDC', 'USDT', 'DAI', 'USDBC', 'USDE', 'FRAX', 'LUSD']);
const isStableSym = (s: string) => STABLE_SYMBOLS.has(s.toUpperCase());
const isEthSym = (s: string) => s.toUpperCase().includes('ETH');

/** USD price of a symbol (today) via the bot's reference rate — null when no
 *  bot pool on this chain carries this token (outside the configuration). */
function usdPriceForSymbolToday(sym: string, chainId: number, botPools: BotPoolLive[]): number | null {
  if (isStableSym(sym)) return 1;
  for (const meta of BOT_POOL_META) {
    if (meta.chainId !== chainId) continue;
    if (meta.sym0 !== sym && meta.sym1 !== sym) continue;
    const other = meta.sym0 === sym ? meta.sym1 : meta.sym0;
    const live = botPools.find((pl) => pl.id === meta.id);
    if (!live || !(live.ethUsd > 0)) continue;
    if (isEthSym(sym)) {
      // sym is the ETH leg — this pool's ethUsd is the ETH price ONLY when the
      // other leg is a stablecoin (quote:'USD' pool); in a quote:'WETH' pool
      // (e.g. cbBTC/WETH) ethUsd is the price of the OTHER token, not ETH — skip.
      if (isStableSym(other)) return live.ethUsd;
      continue;
    }
    // sym is a non-ETH/non-stable base token (e.g. cbBTC) — needs a
    // quote:'WETH' pool (other leg is ETH), where ethUsd IS this token's price.
    if (isEthSym(other)) return live.ethUsd;
  }
  return null;
}

// Slug (`chain` in ClosedPosition/LedgerEntry, as in bot/ledger.ts) → chainId
// + label + explorer domain for the NFT link (/nft/{contract}/{tokenId} —
// pattern shared by the whole Etherscan family). Deliberate duplication, like
// GAS_USD in useCockpitActions.ts — bot/** is outside this session's edit scope.
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
  // Net = collected (COLLECT, principal+fees) − deposited (INCREASE), ONLY when
  // both sides are priced in USD (stable/WETH) — without gas cost (separate
  // column in CSV/ledger, not counted here). Labeled explicitly as an
  // approximation, so as not to suggest a precise realized PnL.
  const netUsd = p.inUsd !== null && p.outUsd !== null ? p.outUsd - p.inUsd : null;

  // BATCH 20 item 4: fallback when the ledger priced no leg in USD (crypto-crypto
  // pair, e.g. cbBTC/WETH) — the bot's reference rate, ONLY when we have all
  // four token amounts (in0/in1/out0/out1) and the pool is in the bot's
  // configuration on this chain. `null` = stays "— (neither leg priced)".
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
            explorer ↗
          </a>
        )}
      </div>
      <div className="muted closed-position-period">
        {fmtDate(p.openedAt)} → {fmtDate(p.closedAt)}
      </div>
      <div className="closed-position-grid">
        <div>
          <span className="muted">deposited: </span>
          {fmtTok(p.in0, p.sym0)} / {fmtTok(p.in1, p.sym1)}
        </div>
        <div>
          <span className="muted">withdrawn: </span>
          {fmtTok(p.out0, p.sym0)} / {fmtTok(p.out1, p.sym1)}
        </div>
        <div>
          <span className="muted">fees: </span>
          {fmtTok(p.fees0, p.sym0)} / {fmtTok(p.fees1, p.sym1)}
        </div>
        <div>
          <span className="muted">USD: </span>
          deposited {fmtUsdOrDash(p.inUsd)} · withdrawn {fmtUsdOrDash(p.outUsd)} · fees {fmtUsdOrDash(p.feesUsdApprox)}
        </div>
      </div>
      <div className="closed-position-footer muted">
        {netUsd !== null ? (
          <span className={netUsd >= 0 ? 'closed-position-net-pos' : 'closed-position-net-neg'}>
            net (excl. gas): {netUsd >= 0 ? '+' : ''}
            {fmtUsd(netUsd)}
          </span>
        ) : netUsdBotToday !== null ? (
          <span
            className={netUsdBotToday >= 0 ? 'closed-position-net-pos' : 'closed-position-net-neg'}
            title="The ledger does not price both legs in USD (crypto-crypto pair, no stablecoin/WETH with a dollar pair) — this number comes from the bot's reference rate (bot.state.pools[].ethUsd, the same mechanism as usdRefPoolId in bot/config.ts). It is the CURRENT rate (today's bot tick), NOT the historical one at close time — the ledger carries no timestamp matched to a stored price."
          >
            net (excl. gas, bot valuation, at today's rate): {netUsdBotToday >= 0 ? '+' : ''}
            {fmtUsd(netUsdBotToday)}
          </span>
        ) : (
          <span>net: — (neither leg priced)</span>
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

  // Bearer token in the header — the endpoint is protected like the rest of
  // /api/* (see the CORS/token rule in bot/server.ts), so a bare <a href> without
  // the header would end in a 401 (same lesson as "raw JSON" in
  // BotTelemetry.tsx). fetch+Blob+temporary link instead.
  const downloadCsv = async () => {
    setCsvBusy(true);
    setCsvError(null);
    try {
      const headers: Record<string, string> = {};
      if (bot.apiToken) headers.Authorization = `Bearer ${bot.apiToken}`;
      const res = await fetch(`${bot.apiBase.replace(/\/$/, '')}/api/ledger.csv`, { headers });
      if (!res.ok) {
        setCsvError(res.status === 401 ? 'Invalid access token' : `Download failed: HTTP ${res.status}`);
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
      setCsvError(`Download failed: ${e instanceof Error ? e.message.slice(0, 160) : String(e)}`);
    } finally {
      setCsvBusy(false);
    }
  };

  return (
    <div className="telemetry-section">
      <div className="telemetry-header" onClick={() => setExpanded((e) => !e)}>
        <span className="morning-section-title telemetry-title">Closed positions</span>
        <span className="morning-toggle">{expanded ? '▼' : '▶'}</span>
      </div>

      {expanded && (
        <div className="telemetry-body">
          {closedPositionsStatus === 'not-started' ? (
            <div className="morning-note muted">This section will appear once the transaction ledger is deployed on the server (backfill in progress).</div>
          ) : closedPositionsStatus === 'error' ? (
            <div className="morning-note muted">Closed positions unavailable (network or server error).</div>
          ) : closedPositionsStatus === 'loading' || !closedPositions ? (
            <div className="morning-note muted">loading…</div>
          ) : closedPositions.length === 0 ? (
            <div className="morning-note muted">no closed positions.</div>
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
              {csvBusy ? 'Downloading…' : '⬇ Download CSV (full ledger)'}
            </button>
            {csvError && <span className="message error closed-positions-csv-error">{csvError}</span>}
          </div>
          <div className="muted closed-positions-csv-note">
            CSV: 1 row = 1 on-chain event (all chains, all positions) — the PLN/NBP column is a separate
            iteration, for now USD only where priced.
          </div>
        </div>
      )}
    </div>
  );
};

export default ClosedPositionsPanel;
