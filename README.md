# HOMOS: a Uniswap v3 concentrated-liquidity research stack

[![CI](https://github.com/rcywinski/homos/actions/workflows/ci.yml/badge.svg)](https://github.com/rcywinski/homos/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![License: MIT](https://img.shields.io/badge/license-MIT-green)

**Status: closed (September 2026). Published as an engineering case study.**

HOMOS is a TypeScript monorepo I built and ran, with my own capital, to answer one question:
*can a systematic, rules-based liquidity-provision strategy on Uniswap v3 beat simply holding the two tokens?*

The short answer, after ~6 weeks of backtesting and 25 days of live capital, was **no — not reliably**.
The product ("FlatWide": a wide passive range that narrows only in a confirmed flat regime)
returned **+0.6 % in 22 days** of live LP, which is roughly HODL 50/50 plus fees minus a little impermanent loss.
The tranche was closed at **+5.5 %** overall, but most of that came from three days of directional
exposure after the LP was unwound — not from the strategy. The full story, including the decisions
I would make differently, is in [`docs/CASE-STUDY.md`](docs/CASE-STUDY.md).

**Start here:** [`docs/CASE-STUDY.md`](docs/CASE-STUDY.md) for the story,
[`src/utils/v3math.ts`](src/utils/v3math.ts) for the core math,
[`backtest/validate.ts`](backtest/validate.ts) for the validation gate and
[`docs/DECISION-LOG.md`](docs/DECISION-LOG.md) for how decisions were made.

**Tech stack:** TypeScript (strict), Node 20, React 18, wagmi/viem, `@uniswap/v3-sdk` (reference only),
Envio HyperSync, DefiLlama, Express, webpack, ESLint, GitHub Actions; deployed as Windows services via NSSM.

What is worth reading here is the engineering and the process:

- **Exact v3 math on `bigint`** (`src/utils/v3math.ts`) — reproduces `@uniswap/v3-sdk` to the wei;
  2 925 reference tests (`npm run test:math`). Written after discovering that the legacy float
  implementation was masking 20–25 % slippage.
- **A backtesting engine with a hard validation gate** (`backtest/`) — walk-forward windows,
  regime splits, a 720-day + recent-90-day gate against a HODL 50/50 benchmark, 14 sanity tests
  (`npm run backtest:validate`). The gate is what stopped every "improvement" that only worked on
  the last bullish year.
- **A propose-only bot** (`bot/`) — a 24/7 observer that prices pools, tracks NFT positions,
  detects regimes and *proposes* actions to a cockpit UI. Nothing executes without a wallet
  signature from the owner. It never held a private key.
- **A data pipeline** (`scripts/`) — swap-level history via HyperSync (a year of a pool in ~13 min),
  DefiLlama APY/TVL history, a nightly pipeline with a morning report and Telegram digest.
- **Windows 24/7 deployment** (`deploy/`, `docs/INFRA.md`) — NSSM services, scheduled tasks,
  LAN/VPN-only API with a bearer token, backups.
- **A documented decision log** ([`docs/DECISION-LOG.md`](docs/DECISION-LOG.md)) — every
  parameter freeze, revision and exit rule, with the evidence it was based on and, where relevant,
  a note about the bias it was made under.
- **An AI-assisted workflow** ([`docs/AI-WORKFLOW.md`](docs/AI-WORKFLOW.md)) — the project was
  developed by one engineer coordinating four specialised Claude sessions through two files in the
  repo (a living journal and a set of hand-off inboxes). The commit history shows it.

## Architecture

```
                       ┌──────────────────────────────────────────────┐
                       │  src/utils/v3math.ts  (bigint, wei-exact)     │
                       │  shared by every layer below                  │
                       └───────┬───────────────┬───────────────┬───────┘
                               │               │               │
   scripts/ (data)             │  backtest/    │   bot/        │   src/ (cockpit UI)
   ─ fetch-swaps-hypersync     │  ─ engine     │   ─ observer  │   ─ MorningCockpit
   ─ fetch-llama-history       │  ─ strategies │   ─ selector  │   ─ position cards
   ─ pipeline (nightly)        │  ─ walkforward│   ─ paper     │   ─ proposal cards
   ─ morning-report + Telegram │  ─ validate   │   ─ ledger    │   ─ rebalance sequence
   ─ wide-score / wide-daily   │  ─ selection  │   ─ server    │     (sign in wallet)
                               ▼               ▼               ▼
                     data/ (caches, .gitignored)   .bot/ (state, proposals, ledger)
```

The bot runs on a Windows box (NSSM services `homos-bot` + `homos-server`), the UI is a static
React bundle served by the bot's API, and the owner approves proposals from a laptop or phone
over LAN/VPN. Details: [`docs/ALGORITHM.md`](docs/ALGORITHM.md), [`docs/INFRA.md`](docs/INFRA.md),
[`docs/UI-DESIGN.md`](docs/UI-DESIGN.md); the original plan is kept in [`docs/PLAN.md`](docs/PLAN.md).

## The strategy, in one paragraph

Two pools on Base (WETH/USDC 0.30 % and WETH/cbBTC 0.05 %). Default posture is a **wide passive
range** (±50 % / ±40 %) that behaves like HODL plus fees. A flat detector (|price − 7-day EMA| < 2 %
for 12 h) allows a **narrowing to ±5 %** to harvest more fees; a trend breaker widens back
or exits when the price leaves the band. Parameters were frozen after walk-forward calibration
([`docs/ALGORITHM.md`](docs/ALGORITHM.md)); the recalibration on 720 days of data later showed
that **0 of 21 configurations passed the gate**, which is why the live product stayed wide and
narrowed only once, as a measured experiment.

## Results

| | |
|---|---|
| Live capital | 6 092 USDC on Base, 27 Aug → 21 Sep 2026 (25 days) |
| LP phase (FlatWide, wide posture) | 27 Aug → 18 Sep: **+0.6 %**, of which ≈ $29 fees; vs HODL 50/50 of the same legs: −$4 … −$22 depending on the day |
| Narrowing experiment (cbBTC leg, ±5 %) | 31 Aug → 11 Sep: 11 days in flat, ≈ $8.6 fees, closed by the trend breaker at −$32 vs HODL |
| Spot exposure after unwinding LP | 18 → 21 Sep: ≈ +$300 (ETH +7.8 %, BTC +7 %) |
| Final | **+5.5 %** in EUR on the exchange; total round-trip costs ≈ $25 |
| Verdict on the product | Does not beat HODL 50/50 on 720-day walk-forward in any of five ways of measuring it. Wide passive LP ≈ HODL + fees; narrowing has negative expectancy at the episode lengths observed (median 7.7 days). |

## Running it

Works on a fresh clone (Node ≥ 20, no `.env` needed):

```bash
npm ci
npm test                 # typecheck + 2 925 v3 math reference tests + 14 backtest sanity tests
npm run lint             # ESLint (typescript-eslint + react-hooks)
npm start                # cockpit UI on http://localhost:3000 (connect a wallet to see positions)
```

Needs configuration or data that is not in the repo:

```bash
cp .env.example .env     # set BOT_WATCH_ADDRESS (any public address with v3 positions)
npm run bot              # observer daemon (propose-only), writes state to .bot/
npm run bot:server       # bot API + built UI on :8787
npm run fetch:swaps      # swap history → data/ (needed by the backtests below)
npm run backtest         # all strategies on the cached swap data
```

There are no hard-coded wallet addresses or RPC keys; public RPC fallbacks are used when none
are configured. The data caches under `data/` are regenerable — see the headers of `scripts/*.ts`.

## AI layer

Since November 2026 the repo has a retrieval layer (`ai/`) that answers English questions about the project from
the Polish journal and the English docs, with every claim backed by a verbatim quote that is checked against the
source and printed as `file:lines`. Hybrid search (local `bge-m3` vectors plus BM25 on a Polish rendering of the
question), a local cross-encoder reranker, short English context per chunk written by Claude Haiku 5.5, answers by
Claude Sonnet 5.5, quality judged by Claude Opus 5.5.

Measured on a golden set of 34 questions (26 with evidence in the sources, 8 with a false premise or no answer):

| | |
|---|---|
| Retrieval, recall@10 / recall@30 (the variant used for answering) | 77% (20/26) / 92% (24/26) |
| Citations verified against the source, 10 chunks per answer | 97 of 97 |
| Questions with no answer in the sources answered as such | 3 of 3 |
| Judge (Opus 5.5): correct / partially correct / incorrect | 20 / 12 / 2 of 34 |
| Judge against the owner's blind grades, correctness | 5 of 8 exact, 8 of 8 within one step |
| Cost and time per answer | about $0.03, median 4.1 s |

```bash
# needs ANTHROPIC_API_KEY, INFERENCE_URL and RERANK_URL in .env, and the inference box (inference/README.md)
npm run ask -- "Why did the live product stay wide?"
```

Design, every measured variant, what did not work and the open points: [`docs/AI-RAG.md`](docs/AI-RAG.md).

## Repository map

| Path | What it is |
|---|---|
| `src/utils/v3math.ts`, `test/v3math.test.ts` | exact Uniswap v3 math and its reference test suite |
| `backtest/` | engine, strategies, walk-forward, validation gate, pool selection |
| `bot/` | observer, pool selector, paper trading, transaction ledger, API server |
| `scripts/` | data fetching (HyperSync, DefiLlama), nightly pipeline, morning report |
| `src/` | React cockpit (positions, proposals, rebalance/rotate sequences, paper panel) |
| `deploy/` | Windows deployment scripts and setup guide |
| `journal/` | raw working notes in Polish: journal, inboxes, morning reports, task queues |
| `inference/` | contract and services for the local GPU inference box used by the AI layer |
| `docs/` | plan, algorithm, pairs analysis, DB schema, infra, UI design, emergency runbook, decision log, case study, AI workflow |

Code comments and UI are in English; a small number of string literals that act as data
contracts (strategy names used as keys, log lines parsed by the report script) are kept in their
original Polish and marked with a comment.

## The working journal

The raw working notes of the project are in [`journal/`](journal/README.md): the day-by-day journal
(`CONTEXT.md`, 360 KB), the AI hand-off inboxes, 37 daily morning reports, task and research queues
and decision notes. They are in Polish and kept unedited on purpose, because they show how the
project was actually run. Nothing in them is secret: the wallet is public on-chain and the amounts
are stated above. Since November 2026 an AI layer (`ai/`, see [`docs/AI-PLAN.md`](docs/AI-PLAN.md))
answers questions over these notes with citations to file and line.

## License

MIT — see [`LICENSE`](LICENSE).
