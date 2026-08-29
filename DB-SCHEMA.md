# DB-SCHEMA.md — projekt bazy danych HOMOS (SQLite)

> Projekt: Fable 2026-08-18 (decyzja Rafała: "dobra struktura pod przyszłe
> rozszerzenia"). Realizacja decyzji z 2026-08-10 "SQLite + CSV od pierwszej
> transakcji". Implementacja: osobna sesja (schemat najpierw zamrażamy).

## 1. Zasady projektowe (ważniejsze niż konkretne tabele)

1. **SQLite, plik `data/homos.db`, tryb WAL** (bezpieczne równoległe odczyty
   przy jednym pisarzu; backup.ps1 łapie plik automatycznie).
2. **Migracje numerowane od dnia 1**: `db/migrations/NNN_nazwa.sql` +
   tabela `schema_migrations(version, applied_at)` + runner
   `scripts/db-migrate.ts`. KAŻDA przyszła zmiana schematu = nowy plik
   migracji, nigdy edycja starych — to jest mechanizm rozszerzalności.
3. **ndjson zostaje ścieżką zapisu bota** (append-only, crash-safe). Do bazy
   dane wchodzą IMPORTEM (krok pipeline'u / morning-report). Bot nie pisze
   do SQLite bezpośrednio → zero nowych trybów awarii w observerze.
   Importer idempotentny (INSERT OR IGNORE po kluczach naturalnych).
4. **Precyzja: kwoty on-chain jako TEXT (raw bigint, wei/jednostki tokena)**,
   nigdy REAL — lekcja Fazy 0 (float gubi >2^53). REAL tylko dla metryk
   pochodnych (APR, %, USD po wycenie). Dotyczy zwłaszcza przyszłych
   REALNYCH transakcji.
5. **Czas: INTEGER unix ms UTC** (kolumna `ts`) — szybkie zakresy i indeksy;
   ISO-string tylko w widokach dla ludzi.
6. **Elastyczne ładunki: kolumna `payload` TEXT/JSON** (SQLite JSON1) tam,
   gdzie kształt będzie ewoluował (propozycje, zdarzenia) — nowe pola nie
   wymagają migracji; do kolumn wyciągamy tylko to, po czym FILTRUJEMY.
7. **Słowniki jako tabele, nie enumy w kodzie**: `pool`, `venue` — dodanie
   puli/giełdy = INSERT, nie zmiana schematu. `protocol` w pool (v3/v4)
   od razu, mimo że v4 odłożone.
8. **Nic nie kasujemy**: statusy + `superseded_by`/`closed_at` zamiast
   DELETE — audytowalność (wymóg podatkowy przy realnym kapitale).

## 2. Schemat — DDL v1 (draft do zamrożenia przy implementacji)

```sql
-- ===== SŁOWNIKI =====
CREATE TABLE pool (
  id            TEXT PRIMARY KEY,        -- botPoolId, np. 'base-weth-usdc-030'
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
  meta          TEXT                      -- JSON: advisorK, trendAction itd.
);

CREATE TABLE venue (                      -- giełdy perp/DEX-y pod hedge i dalej
  id TEXT PRIMARY KEY,                    -- 'gmx-v2-arbitrum', 'hyperliquid'
  kind TEXT NOT NULL,                     -- 'perp'|'dex'|'cex'
  meta TEXT
);

-- ===== TELEMETRIA (import z .bot/history.ndjson) =====
CREATE TABLE pool_snapshot (
  ts INTEGER NOT NULL, pool_id TEXT NOT NULL REFERENCES pool(id),
  price_usd REAL, vol_daily REAL, fee_yield_daily REAL,
  range_lo REAL, range_hi REAL, ema_gap_pct REAL, trend_down INTEGER,
  PRIMARY KEY (pool_id, ts)
) WITHOUT ROWID;
CREATE INDEX ix_snapshot_ts ON pool_snapshot(ts);

-- ===== PROPOZYCJE BOTA + DZIENNIK TRAFNOŚCI (import z proposals.json/SELECTOR-LOG) =====
CREATE TABLE proposal (
  id TEXT PRIMARY KEY,                    -- id z bota (naturalny)
  created_at INTEGER NOT NULL,
  kind TEXT NOT NULL,                     -- REBALANCE|OPEN|ROTATE|EXIT_TREND|HEDGE
  pool_id TEXT REFERENCES pool(id),       -- NULL gdy spoza konfiguracji
  token_id TEXT,
  status TEXT NOT NULL,                   -- open|dismissed|expired
  payload TEXT NOT NULL,                  -- JSON: pełny kształt propozycji
  -- dziennik trafności (uzupełniany później, ręcznie/skryptem):
  verdict TEXT,                           -- accepted|rejected_validation|expired|wrong(bug)
  verdict_note TEXT, verdict_at INTEGER
);
CREATE INDEX ix_proposal_kind_ts ON proposal(kind, created_at);

CREATE TABLE selector_ranking (           -- własna historia rankingu (niezależna od DefiLlamy)
  day TEXT NOT NULL,                      -- 'YYYY-MM-DD'
  rank INTEGER NOT NULL,
  llama_uuid TEXT NOT NULL, symbol TEXT, chain TEXT,
  apy7d REAL, streak INTEGER, matched_pool_id TEXT REFERENCES pool(id),
  PRIMARY KEY (day, rank)
) WITHOUT ROWID;

-- ===== PAPER TRADING (import z paper-history/events.ndjson) =====
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
  payload TEXT NOT NULL,                  -- JSON: ticki/kwoty/koszty
  PRIMARY KEY (pool_id, ts, kind)
) WITHOUT ROWID;

-- ===== REALNY KAPITAŁ (puste do F2/F3 — ale schemat OD RAZU, bo to
-- fundament podatków; kwoty raw jako TEXT!) =====
CREATE TABLE position (                   -- rejestr pozycji LP (NFT)
  token_id TEXT NOT NULL, chain_id INTEGER NOT NULL,
  pool_id TEXT REFERENCES pool(id),
  tick_lower INTEGER, tick_upper INTEGER,
  opened_at INTEGER, closed_at INTEGER,
  PRIMARY KEY (token_id, chain_id)
);

CREATE TABLE tx (                         -- KAŻDA transakcja on-chain/venue
  id INTEGER PRIMARY KEY,
  ts INTEGER NOT NULL,
  chain TEXT, tx_hash TEXT UNIQUE,        -- NULL dla CEX/venue off-chain
  venue_id TEXT REFERENCES venue(id),
  kind TEXT NOT NULL,                     -- mint|increase|decrease|collect|swap|approve|bridge|hedge_open|hedge_close|transfer
  pool_id TEXT REFERENCES pool(id), token_id TEXT,
  token_in TEXT,  amount_in_raw TEXT,     -- raw bigint jako TEXT
  token_out TEXT, amount_out_raw TEXT,
  fee_usd REAL, gas_usd REAL,
  value_usd REAL,                         -- wycena w chwili tx
  pln_rate REAL,                          -- kurs NBP D-1 (podatki PL) — uzupełniany skryptem
  note TEXT, payload TEXT
);
CREATE INDEX ix_tx_ts ON tx(ts); CREATE INDEX ix_tx_pool ON tx(pool_id, ts);

-- ===== WYNIKI BACKTESTÓW (indeks plików results/ — metadane, nie liczby) =====
CREATE TABLE backtest_run (
  id INTEGER PRIMARY KEY, ts INTEGER NOT NULL,
  kind TEXT NOT NULL,                     -- walkforward|sweep|run|pegged
  pool_id TEXT, params TEXT,              -- JSON: okno/krok/WF_SET
  file TEXT NOT NULL,                     -- ścieżka JSON w backtest/results/
  git_commit TEXT                         -- wersja silnika (audyt: co policzono czym)
);

-- ===== WIDOKI (przykłady — dokładamy wg potrzeb UI) =====
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

## 3. Co świadomie POZA bazą

- **Surowe swapy tick-level** (`data/cache/*.ndjson`, miliony wierszy/pula) —
  zostają w plikach: backtest czyta je sekwencyjnie, baza nic tu nie daje,
  a puchłaby o rzędy wielkości. W bazie tylko `backtest_run` (indeks wyników).
- **Sekrety** — nigdy w bazie (zostają w .env).
- **CONTEXT/HANDOFF/dzienniki** — zostają w md (to warstwa koordynacji
  sesji, nie dane aplikacji).

## 4. Ścieżka wdrożenia (osobna sesja)

1. `db/migrations/001_init.sql` (DDL wyżej po zamrożeniu) + `scripts/db-migrate.ts`
   + `scripts/db-import.ts` (idempotentny import ndjson→SQLite, resume po
   ostatnim ts per tabela).
2. Krok `db-import` na końcu pipeline'u 07:30 + seed tabeli `pool` z bot/config.ts.
3. Morning-report i /api mogą stopniowo przechodzić na zapytania do bazy
   (ndjson dalej pisany — przełączanie odczytów bez ryzyka).
4. Przy F2/F3 (realny kapitał): zapis `tx` od PIERWSZEJ transakcji + skrypt
   kursów NBP (pln_rate) + eksport CSV do rozliczenia.
