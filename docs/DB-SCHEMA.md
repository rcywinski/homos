# DB-SCHEMA.md — HOMOS database design (SQLite)

> Design: Fable 2026-08-18 (owner's decision: "a good structure for future
> extensions"). Implements the 2026-08-10 decision "SQLite + CSV from the first
> transaction". Implementation: separate session (the schema is frozen first).

## 1. Design principles (more important than the specific tables)

1. **SQLite, file `data/homos.db`, WAL mode** (safe concurrent reads with a
   single writer; backup.ps1 picks the file up automatically).
2. **Numbered migrations from day 1**: `db/migrations/NNN_nazwa.sql` +
   table `schema_migrations(version, applied_at)` + runner
   `scripts/db-migrate.ts`. EVERY future schema change = a new migration
   file, never editing old ones — this is the extensibility mechanism.
3. **ndjson remains the bot's write path** (append-only, crash-safe). Data
   enters the database by IMPORT (a pipeline / morning-report step). The bot
   does not write to SQLite directly → zero new failure modes in the observer.
   The importer is idempotent (INSERT OR IGNORE on natural keys).
4. **Precision: on-chain amounts as TEXT (raw bigint, wei/token units)**,
   never REAL — the lesson of Phase 0 (float loses >2^53). REAL only for
   derived metrics (APR, %, USD after valuation). This applies above all to
   future REAL transactions.
5. **Time: INTEGER unix ms UTC** (column `ts`) — fast ranges and indexes;
   ISO strings only in human-facing views.
6. **Flexible payloads: column `payload` TEXT/JSON** (SQLite JSON1) wherever
   the shape will evolve (proposals, events) — new fields do not require a
   migration; we extract into columns only what we FILTER by.
7. **Dictionaries as tables, not enums in code**: `pool`, `venue` — adding a
   pool/exchange = INSERT, not a schema change. `protocol` in pool (v3/v4)
   from the start, even though v4 is postponed.
8. **Nothing is deleted**: statuses + `superseded_by`/`closed_at` instead of
   DELETE — auditability (a tax requirement with real capital).

## 2. Schema — DDL v1 (draft to be frozen at implementation)

```sql
-- ===== DICTIONARIES =====
CREATE TABLE pool (
  id            TEXT PRIMARY KEY,        -- botPoolId, e.g. 'base-weth-usdc-030'
  protocol      TEXT NOT NULL DEFAULT 'uniswap-v3',
  chain         TEXT NOT NULL,           -- 'mainnet'|'base'|'arbitrum'|...
  chain_id      INTEGER NOT NULL,
  address       TEXT NOT NULL,
  fee_bps       INTEGER NOT NULL,
  token0_symbol TEXT NOT NULL, token0_address TEXT, token0_decimals INTEGER NOT NULL,
  token1_symbol TEXT NOT NULL, token1_address TEXT, token1_decimals INTEGER NOT NULL,
  eth_is_token0 INTEGER NOT NULL,        -- bool
  quote         TEXT NOT NULL DEFAULT 'USD',  -- 'USD'|'WETH'
  usd_ref_pool  TEXT REFERENCES pool(id),
  active        INTEGER NOT NULL DEFAULT 1,
  meta          TEXT                      -- JSON: advisorK, trendAction etc.
);

CREATE TABLE venue (                      -- perp exchanges/DEXes for the hedge and beyond
  id TEXT PRIMARY KEY,                    -- 'gmx-v2-arbitrum', 'hyperliquid'
  kind TEXT NOT NULL,                     -- 'perp'|'dex'|'cex'
  meta TEXT
);

-- ===== TELEMETRY (import from .bot/history.ndjson) =====
CREATE TABLE pool_snapshot (
  ts INTEGER NOT NULL, pool_id TEXT NOT NULL REFERENCES pool(id),
  price_usd REAL, vol_daily REAL, fee_yield_daily REAL,
  range_lo REAL, range_hi REAL, ema_gap_pct REAL, trend_down INTEGER,
  PRIMARY KEY (pool_id, ts)
) WITHOUT ROWID;
CREATE INDEX ix_snapshot_ts ON pool_snapshot(ts);

-- ===== BOT PROPOSALS + ACCURACY JOURNAL (import from proposals.json/SELECTOR-LOG) =====
CREATE TABLE proposal (
  id TEXT PRIMARY KEY,                    -- id from the bot (natural)
  created_at INTEGER NOT NULL,
  kind TEXT NOT NULL,                     -- REBALANCE|OPEN|ROTATE|EXIT_TREND|HEDGE
  pool_id TEXT REFERENCES pool(id),       -- NULL when outside the configuration
  token_id TEXT,
  status TEXT NOT NULL,                   -- open|dismissed|expired
  payload TEXT NOT NULL,                  -- JSON: full shape of the proposal
  -- accuracy journal (filled in later, manually/by script):
  verdict TEXT,                           -- accepted|rejected_validation|expired|wrong(bug)
  verdict_note TEXT, verdict_at INTEGER
);
CREATE INDEX ix_proposal_kind_ts ON proposal(kind, created_at);

CREATE TABLE selector_ranking (           -- own ranking history (independent of DefiLlama)
  day TEXT NOT NULL,                      -- 'YYYY-MM-DD'
  rank INTEGER NOT NULL,
  llama_uuid TEXT NOT NULL, symbol TEXT, chain TEXT,
  apy7d REAL, streak INTEGER, matched_pool_id TEXT REFERENCES pool(id),
  PRIMARY KEY (day, rank)
) WITHOUT ROWID;

-- ===== PAPER TRADING (import from paper-history/events.ndjson) =====
CREATE TABLE paper_sample (
  ts INTEGER NOT NULL, pool_id TEXT NOT NULL REFERENCES pool(id),
  status TEXT NOT NULL, equity_usd REAL NOT NULL, hodl_usd REAL NOT NULL,
  fees_usd REAL, costs_usd REAL, in_range INTEGER, trend_down INTEGER,
  rebalances INTEGER,
  PRIMARY KEY (pool_id, ts)
) WITHOUT ROWID;

CREATE TABLE paper_event (
  ts INTEGER NOT NULL, pool_id TEXT NOT NULL REFERENCES pool(id),
  kind TEXT NOT NULL,                     -- OPEN|REBALANCE|EXIT_TREND|REENTRY|HEDGE_OPEN|HEDGE_CLOSE
  payload TEXT NOT NULL,                  -- JSON: ticks/amounts/costs
  PRIMARY KEY (pool_id, ts, kind)
) WITHOUT ROWID;

-- ===== REAL CAPITAL (empty until F2/F3 — but the schema NOW, because it is
-- the foundation for taxes; raw amounts as TEXT!) =====
CREATE TABLE position (                   -- LP position register (NFT)
  token_id TEXT NOT NULL, chain_id INTEGER NOT NULL,
  pool_id TEXT REFERENCES pool(id),
  tick_lower INTEGER, tick_upper INTEGER,
  opened_at INTEGER, closed_at INTEGER,
  PRIMARY KEY (token_id, chain_id)
);

CREATE TABLE tx (                         -- EVERY on-chain/venue transaction
  id INTEGER PRIMARY KEY,
  ts INTEGER NOT NULL,
  chain TEXT, tx_hash TEXT UNIQUE,        -- NULL for CEX/off-chain venue
  venue_id TEXT REFERENCES venue(id),
  kind TEXT NOT NULL,                     -- mint|increase|decrease|collect|swap|approve|bridge|hedge_open|hedge_close|transfer
  pool_id TEXT REFERENCES pool(id), token_id TEXT,
  token_in TEXT,  amount_in_raw TEXT,     -- raw bigint as TEXT
  token_out TEXT, amount_out_raw TEXT,
  fee_usd REAL, gas_usd REAL,
  value_usd REAL,                         -- valuation at the time of the tx
  pln_rate REAL,                          -- NBP D-1 rate (Polish taxes) — filled in by script
  note TEXT, payload TEXT
);
CREATE INDEX ix_tx_ts ON tx(ts); CREATE INDEX ix_tx_pool ON tx(pool_id, ts);

-- ===== BACKTEST RESULTS (index of results/ files — metadata, not numbers) =====
CREATE TABLE backtest_run (
  id INTEGER PRIMARY KEY, ts INTEGER NOT NULL,
  kind TEXT NOT NULL,                     -- walkforward|sweep|run|pegged
  pool_id TEXT, params TEXT,              -- JSON: window/step/WF_SET
  file TEXT NOT NULL,                     -- JSON path in backtest/results/
  git_commit TEXT                         -- engine version (audit: what was computed with what)
);

-- ===== VIEWS (examples — added as the UI needs them) =====
CREATE VIEW v_paper_daily AS
  SELECT pool_id, date(ts/1000,'unixepoch') AS day,
         max(equity_usd) FILTER (WHERE ts=(SELECT max(ts) FROM paper_sample s2
           WHERE s2.pool_id=paper_sample.pool_id
           AND date(s2.ts/1000,'unixepoch')=date(paper_sample.ts/1000,'unixepoch'))) AS equity_eod,
         max(fees_usd) AS fees_cum, max(rebalances) AS rebalances
  FROM paper_sample GROUP BY pool_id, day;

CREATE VIEW v_selector_accuracy AS
  SELECT date(created_at/1000,'unixepoch') AS day, kind, pool_id,
         json_extract(payload,'$.apy7d') AS apy7d, status, verdict
  FROM proposal WHERE kind IN ('OPEN','ROTATE');
```

## 3. What is deliberately OUTSIDE the database

- **Raw tick-level swaps** (`data/cache/*.ndjson`, millions of rows per pool) —
  stay in files: the backtest reads them sequentially, the database adds
  nothing here and would bloat by orders of magnitude. The database holds only
  `backtest_run` (results index).
- **Secrets** — never in the database (they stay in .env).
- **CONTEXT/HANDOFF/journals** — stay in md (that is the session coordination
  layer, not application data; private working journal, not published).

## 4. Rollout path (separate session)

1. `db/migrations/001_init.sql` (the DDL above once frozen) + `scripts/db-migrate.ts`
   + `scripts/db-import.ts` (idempotent ndjson→SQLite import, resume from the
   last ts per table).
2. A `db-import` step at the end of the 07:30 pipeline + seeding the `pool`
   table from bot/config.ts.
3. Morning-report and /api can gradually move to database queries
   (ndjson still written — switching reads carries no risk).
4. At F2/F3 (real capital): write to `tx` from the FIRST transaction + NBP rate
   script (pln_rate) + CSV export for the tax return.
