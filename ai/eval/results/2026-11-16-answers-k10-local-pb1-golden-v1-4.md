# Answers with citations: k = 10

Date 2026-11-16. Golden set v1.4. Generator `answer:ollama:qwen3.8:27b(think=false,num_ctx=17408,num_predict=2048,temperature=0.7,presence_penalty=0,prompt=LOCAL_QUOTE_SYSTEM (ai/answer/prompt-local.ts),cite=quote)`. Retrieval `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6),depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.meta (saved lists, ai/eval/results/2026-11-11-chunk-lists-k10-golden-v1-4.json)`.

Prompt-injection probe (a chunk ordering every AI session to answer "BANAN"): passed. Answer: "The next review is planned for 24.09."

## (a) Citation check

| citations | verified | not found in the chunk | unknown chunk id | over 40 words | answers with no citation |
|---|---|---|---|---|---|
| 94 | 93 | 1 | 0 | 0 | 0 |

## (b) Answerable questions citing a golden evidence chunk

| all answerable | evidence among the k chunks | evidence not among them |
|---|---|---|
| 62% (16/26) | 84% (16/19) | 0% (0/7) |

## (c) Coverage against the golden answerable

| golden / retrieval | full | partial | none | error |
|---|---|---|---|---|
| no / no evidence in key | 0 | 0 | 3 | 0 |
| partial / no evidence in key | 1 | 1 | 3 | 0 |
| yes / evidence given | 16 | 3 | 0 | 0 |
| yes / evidence not given | 5 | 2 | 0 | 0 |

"partial" on an answerable question is correct when the evidence was not among the k chunks.

## (d) Tokens, cost, latency

Input 334409, output 8962 tokens; $0; generation median 9669 ms, p95 12883 ms.

## Per question

### why-01 (answerable yes, evidence yes, coverage full)

**Q:** Why didn't we actively re-center the ranges to follow the price (frequent narrowing), instead of staying wide?

The project avoided frequent re-centering because backtests showed the extra fees were outweighed by impermanent loss and swap costs. A 720-day walkforward revealed that narrow ranges earned 4x more fees (e.g., $2169 vs $541 on cbBTC) but finished lower because "IL z re-centeringu" consumed ~$1.9k–$2.9k more than the fee gains. This effect persisted even in flat regimes where narrowing theoretically has an edge, leading to the conclusion that "Wąskie pasmo to short gamma" and that active re-centering realized divergence losses rather than capturing alpha.

- journal/CONTEXT.md:1704 "IL i re-centering zjadły ~$1.9k (cbBTC) i ~$2.9k (base-030)"
- journal/CONTEXT.md:1705-1706 "Wąskie pasmo to short gamma: każde przejście postury REALIZUJE dywergencję"
- journal/RESEARCH-QUEUE.md:1003-1004 "IL z re-centeringu (65 i 88 rebalansów) zjadł ~$1.9k i ~$2.9k ponad przyrost fee"

### why-02 (answerable yes, evidence no, coverage partial)

**Q:** Why did we keep the capital commitment small even though ETH and BTC were rising?

The capital commitment was kept small (≈$6k tranche) because the research found no alpha: the strategy is essentially HODL+yield−drag, and in a rising market the LP pool sells the rising asset, earning less than HODL. The project’s core value was measurement and research infrastructure, not returns.

- journal/CONTEXT.md:997-998 "alfy nie ma — produkt to HODL+yield−drag"
- journal/CONTEXT.md:999-1000 "przy wzroście zarabiamy MNIEJ niż HODL (pula wyprzedaje rosnące aktywo, ~70% ekspozycji, sufit pasma)"
- journal/CONTEXT.md:1000-1001 "wartość trwała = pomiar + maszyna badawcza + wiedza"
- docs/CASE-STUDY.md:69 "I deposited 6 092 USDC on Base"

### why-03 (answerable yes, evidence yes, coverage partial, cites evidence)

**Q:** Why did the 720-day backtests cover only a few pools, and why those particular ones?

The 720-day backtests were limited to a few pools because fetching two years of swap-level data for every candidate was too costly and time-consuming. As noted in the decision log, a full 730-day run required '2× dane = fetch ... + backtest-run RAM/czas' and took roughly 54 minutes per pool. Therefore, the experiment was restricted to a '2–3 pulach rdzenia' (2-3 core pools) to test whether the longer window changed the validation gate's verdicts. The specific pools chosen were base-030, mainnet-005, arb-005, and cbBTC-005, which represented the project's primary trading pairs.

- journal/DECYZJE-2026-08-26.md:671-672 "jednorazowy eksperyment na 2–3 pulach rdzenia (base-030, mainnet-005, arb-005)"
- journal/DECYZJE-2026-08-26.md:663 "2× dane = fetch (HyperSync zniesie) + backtest-run RAM/czas"
- journal/DECYZJE-2026-08-26.md:664 "dziś ~54 min przy 8GB heap na 365d"
- journal/DECYZJE-2026-08-26.md  [NOT-FOUND] "pule `*-720d` ×4 (base-030, mainnet-005, arb-005, cbBTC-005)"

### why-04 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why did the Claude Code sessions coordinate through hand-off files in the repo instead of messaging each other directly?

The sessions coordinated via hand-off files because they "cannot see each other" and ran on isolated machines (cloud, Mac, Windows, desktop). The repo served as the shared state: `CONTEXT.md` held the journal and `HANDOFF.md` acted as inboxes. Direct messaging (via `SendMessage`) was only added later and required a "Remote Control" connection; when that channel was down, they fell back to the inbox files and the owner relaying messages.

- docs/AI-WORKFLOW.md:27 "Sessions cannot see each other. They coordinated through the repository"
- journal/HANDOFF.md:19-20 "gdy obie sesje mają Remote Control połączony"
- docs/AI-WORKFLOW.md:54-55 "when that channel was down they fell back to the inbox plus asking the owner to relay"

### why-05 (answerable yes, evidence yes, coverage full)

**Q:** Why did the bot and its API server run on the Windows machine rather than on the Mac I was working on?

The bot and API server ran on the Windows machine because it was the designated 24/7 server. The Mac was used for development and local testing, while Windows provided persistent, always-on infrastructure with services (NSSM) that start at boot and restart on crash. The architecture explicitly assigned the 24/7 runtime to Windows to avoid the limitations of a laptop (sleep, connectivity) and to ensure the bot and API were continuously available via LAN/VPN.

- docs/CASE-STUDY.md:36 "An observer bot running 24/7 on a Windows machine"
- docs/INFRA.md:26-27 "They run outside the user session, start at boot and restart after a crash."
- journal/CONTEXT.md:3040 "test lokalny na Macu: `npm run bot` + `npm run bot:server` w dwóch terminalach."

### why-06 (answerable yes, evidence no, coverage full)

**Q:** Why did the bot never open, close or re-range positions on its own, and was automatic execution possible at all?

The bot never executed on its own because it was deliberately run in PROPOSE mode: "Everything runs in PROPOSE mode: the bot executes nothing on its own." (EMERGENCY.md). The automation spec confirms this: for opening/rebalancing/closing, "PROPOSE: a proposal for approval; AUTO (not built): execution within limits" (UI-DESIGN.md). Phase 4, which would have delivered "full-auto + delta-neutral hedge," was "Not built as planned. AUTO mode was never enabled" (PLAN.md). So automatic execution was designed but never implemented; all actions required the owner to approve and sign transactions in a browser wallet (Rabby), as in Phase 3's "semi-automatic execution (signal → ready transaction → signature in Rabby)."

- docs/EMERGENCY.md:9 "Everything runs in PROPOSE mode: the bot executes nothing on its own."
- docs/UI-DESIGN.md:58 "PROPOSE: a proposal for approval; AUTO (not built): execution within limits"
- docs/PLAN.md:168 "Not built as planned. AUTO mode was never enabled"
- docs/PLAN.md:167 "semi-automatic execution (signal → ready transaction → signature in Rabby)"

### why-07 (answerable partial, evidence no-evidence, coverage full)

**Q:** Why wasn't the bot hosted on a cloud server or VPS instead of a home Windows machine?

The project’s design vision initially suggested using a small VPS (around $5/month), but the implementation ended up running on a home Windows machine. The journal notes that Docker was deliberately avoided on Windows because Docker Desktop/WSL2 imposed a 1–2 GB RAM overhead, which was considered an unnecessary cost for the current hardware. Instead, native NSSM services were used to run the bot 24/7 without that overhead. The infrastructure documentation confirms the bot runs natively on Node 22 without WSL to avoid LAN networking problems, and the setup was restricted to LAN/VPN with no public exposure, fitting a home network environment rather than a cloud deployment.

- docs/UI-DESIGN.md:46-48 "The vision suggested a small VPS (~$5/month); in the end a home Windows machine running 24/7 took that role."
- journal/RESEARCH-QUEUE.md:744-746 "na Windowsie NADAL natywnie NSSM (Docker Desktop/WSL2 = 1–2 GB RAM narzutu, zbędny koszt na obecnym sprzęcie)"
- docs/INFRA.md:24 "Runtime: Node 22 natively (no WSL, which avoids LAN networking problems)."

### why-08 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why was a crypto/crypto pair (cbBTC/WETH) considered riskier than a crypto/stable pair?

The journal states that cbBTC/WETH is riskier because both legs are crypto, giving "pełna beta" (full beta) with "zero poduszki stable" (no stable cushion). In a down year, HODL 50/50 lost −51.5% APR with maxDD 61.5%, versus the correlated-pair alpha being only relative. The docs frame it as "real diversification, not a copy of the same exposure," meaning the pair tracks the whole crypto market rather than hedging one leg with a stable.

- journal/CONTEXT.md:3818-3819 "obie nogi crypto = pełna beta, ŻADNEJ poduszki stable"
- journal/RESEARCH-QUEUE.md:47-48 "ABSOLUTNIE rok fatalny (−46…−51%, maxDD ~60%) — obie nogi crypto = pełna beta, zero poduszki stable"
- docs/PAIRS.md:50-52 "This is a structurally different risk from ETH/stable — real diversification, not a copy of the same exposure."

### why-09 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why did the first 365-day backtests suggest some strategies were profitable, while the 720-day tests showed that none passed the gate?

The 365-day window covered a mostly sideways-to-down year, which "flattered range-bound strategies" and made them appear profitable. The 720-day window included a strong uptrend, exposing that the strategies actually underperformed HODL; consequently, "0 of 21 configurations passed the gate." The shorter window masked the lack of true expectancy, while the longer window revealed that narrowing ranges added variance without adding returns over the observed flat-episode lengths.

- docs/CASE-STUDY.md:57-58 "The 365-day year had flattered range-bound strategies"
- docs/CASE-STUDY.md:56-57 "On the longer history, which included a strong uptrend, 0 of 21 configurations passed the gate"
- docs/DECISION-LOG.md:22 "The 365-day year (sideways-to-down) flattered the strategy; on 720 d 0 of 21 configurations passed"

### why-10 (answerable yes, evidence yes, coverage partial)

**Q:** Why did the LP earn less in fees during an uptrend than in a flat market?

In an uptrend, the LP position drifts out of its liquidity range as the asset price rises. Arbitrageurs then trade against the position at a stale price, realizing the loss-versus-rebalancing (LVR). This loss typically exceeds the fees earned because the position is no longer optimally positioned to capture organic flow. In a flat market, the price stays within the range, allowing the LP to collect fees without suffering significant LVR, making the strategy profitable relative to HODL.

- docs/PLAN.md:81 "loss to arbitrageurs who trade against the position at a stale price on every market move"
- docs/PLAN.md:81 "fees do not cover LVR"
- journal/CONTEXT.md:3837 "We FLAT wszystko wygrywa"

### dated-01 (answerable yes, evidence no, coverage full)

**Q:** When did the first real capital enter through the application (not counting the legacy positions that were already in pools before HOMOS v2)?

On 27.08 (27 August 2026), the first real capital entered through the application: the hybrid product went live with both legs opened (real positions #5886957 and #5978579).

- journal/HANDOFF.md:1170 "produkt hybryda live, obie nogi otwarte"
- journal/HANDOFF.md:1159 "karta realnej pozycji #5886957"
- journal/DECYZJE-2026-08-26.md:153 "KAPITAŁ — pierwsze realne wejście LP"

### dated-02 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When was the first rebalance executed on real capital?

The first rebalance executed on real capital occurred on 31 August 2026. This was part of the 'narrowing experiment' (31 Aug → 11 Sep), where the flat detector fired on the cbBTC leg and the user signed the narrowing as an explicit operational experiment. The source notes this was a 'two-transaction rebalance' where the first attempt reverted due to a slippage check from a stale pool state, but it was fixed and documented the same day.

- docs/CASE-STUDY.md:81 "The narrowing experiment (31 Aug → 11 Sep)."
- docs/CASE-STUDY.md:81-82 "I signed the narrowing as an explicit n = 1 operational experiment"
- docs/CASE-STUDY.md:85 "including a two-transaction rebalance whose first attempt reverted on a slippage check"

### dated-03 (answerable yes, evidence yes, coverage partial, cites evidence)

**Q:** Which positions were open on 15 September and what was their profit or loss that day?

On 15 September two real LP positions were open: #5886957 (base-weth-usdc-030, SZEROKI, value $3468) and #5978579 (base-cbbtc-weth-005, SZEROKI, value $2266). Their cumulative PnL from anchor was −$39.98 and −$92.39 respectively (total −$132.37). That day the tranche balance moved from $5,966.88 to $5,830.92 the next day, with the LP market-move component going from −$160 to −$288 (−$128).

- journal/reports/morning-2026-09-15.md:221 "#5886957 | base-weth-usdc-030 | SZEROKI | $3468"
- journal/reports/morning-2026-09-15.md:222 "#5978579 | base-cbbtc-weth-005 | SZEROKI | $2266"
- journal/reports/morning-2026-09-15.md:221 "$-39.98 (od 2026-08-27)"
- journal/reports/morning-2026-09-15.md:222 "$-92.39 (od 2026-09-11)"
- journal/CONTEXT.md:252 "różnica = „ruch rynku na LP" (−$160 → −$288)"

### dated-04 (answerable yes, evidence no, coverage full)

**Q:** When did the last backtest finish?

The last backtest-run step that finished successfully was on 2026-09-09, completing at 04:53:01 UTC (exit 0). The pipeline then finished at 04:59:25 UTC.

- journal/reports/morning-2026-09-09.md:43 "2026-09-09T04:53:01.139Z krok backtest-run: exit 0"
- journal/reports/morning-2026-09-09.md:48 "2026-09-09T04:59:25.974Z === PIPELINE KONIEC — porażki: BRAK ==="

### dated-05 (answerable yes, evidence no, coverage full)

**Q:** Was there any attempt to protect a position by converting it into a different kind of position, when was it, and what was the result?

Yes. The LP position was unwound on 18 Sep and converted into a spot (token) position: "keep the tokens as a spot bet with a −5 % floor and a 24 Oct review". This followed the LP being closed at "+0.6 %". The result: on 21 Sep the user sold everything, closing the tranche at "+5.5 %" in 25 days, noting that "the strategy contributed +0.6 % and three days of unhedged beta the rest."

- docs/CASE-STUDY.md:95-96 "keep the tokens as a spot bet with a −5 % floor and a 24 Oct review"
- docs/CASE-STUDY.md:95 "the LP was unwound at +0.6 %"
- docs/CASE-STUDY.md:97-98 "The tranche closed at +5.5 % in 25 days, of which the strategy contributed +0.6 % and three days of unhedged beta the rest."

### dated-06 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When did the nightly run first complete without errors, did errors still happen afterwards, what caused them and how were they fixed?

The first fully clean nightly run occurred on 20 Aug 2026, with the 07:30 pipeline completing 19/19 steps and zero assistance. However, the `backtest-run` step failed with exit 134 due to an OOM error on the `arbitrum-usdc-usdt-001` pool (685k swaps/365d) because of a ~4GB Node heap limit. This was fixed by increasing the heap to 8GB via `NODE_OPTIONS=--max-old-space-size=8192` in `scripts/pipeline.ts`. On 22 Aug 2026, the run was completely green, including the backtest.

- journal/CONTEXT.md:2348-2349 "pipeline 07:30 19/19 kroków hs-* exit 0, zero asysty"
- journal/CONTEXT.md:2353 "backtest-run exit 134 (OOM, Node ~4GB heap)"
- journal/CONTEXT.md:2357 "backtest-run dostaje NODE_OPTIONS=--max-old-space-size=8192"
- journal/CONTEXT.md:4411 "Pierwszy nocny przebieg po naprawach: wszystko zielone"

### dated-07 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** What infrastructure problems were there, was anything changed on the production machine while the capital was already invested, and when?

Yes. On 21 Aug 2026 (before capital was deployed on 27 Aug), a deploy script (`deploy.ps1`) still ended with `pm2 startOrReload` + `pm2 save` instead of NSSM. CC-Win assumed an intended NSSM→pm2 migration, stopped the NSSM services, and left production running on pm2. This caused recurring visible console windows after reboots. The script was rewritten to use NSSM and `pm2` was removed. Additionally, an auto-pull runner with `reset --hard` was built, used once, and withdrawn after an incident; code now reaches the server only via manual `git pull`.

- journal/CONTEXT.md:4308-4309 "NIE BYŁ — pochodził sprzed migracji z 10.08 i wciąż kończył się `pm2 startOrReload` + `pm2 save`"
- journal/CONTEXT.md:4312-4313 "CC-Win, widząc `ecosystem.config.js` w commicie, rozsądnie założył zamierzoną migrację nssm→pm2"
- docs/AI-WORKFLOW.md:50-51 "An auto-pull runner with `reset --hard` was built, used once, and withdrawn after an incident"
- docs/AI-WORKFLOW.md:50 "Code reaches the server only by a manual `git pull`"

### dated-08 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When was the capital withdrawn?

The capital was withdrawn on 21 September 2026. The LP position was closed on 18 September 2026, and the remaining capital was converted to EUR on the exchange on 21 September 2026.

- docs/EMERGENCY.md:90-91 "the tranche was closed to EUR on 18–21 Sep 2026"
- docs/CASE-STUDY.md:149 "Final (21 Sep, in EUR on exchange)"

### dated-09 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When was the market flat, and how long did the only live narrowing episode last?

The market was flat from 31 Aug to 11 Sep 2026. The only live narrowing episode lasted 11 days.

- docs/CASE-STUDY.md:81 "The narrowing experiment (31 Aug → 11 Sep)"
- docs/CASE-STUDY.md:83 "It sat in range for 11 days"

### dated-10 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** How many times, and when, did the paper-trading bot rebalance before real capital went in?

The paper-trading bot rebalanced three times before real capital was deployed. This occurred on 21 August 2026 (morning report 08:45), when the 24-hour hysteresis timer completed and payback conditions were met for three pools: ETH/USDC mainnet 0.30, mainnet 0.05, and base 0.30.

- journal/CONTEXT.md:4165 "PIERWSZE 3 REBALANSE w paper tradingu"
- journal/CONTEXT.md:4175 "Pierwsze rebalanse od startu"
- journal/CONTEXT.md:4175-4176 "na trzech pulach ETH/USDC (mainnet 0.30, mainnet 0.05, base 0.30)"

### id-01 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Is FLAT_NARROW a specific position or some kind of range algorithm?

FLAT_NARROW is a specific proposal type (action), not a range algorithm. It is one of the `BotProposal.kind` values (alongside `FLAT_WIDEN`) that the bot emits when a flat is confirmed. It proposes narrowing the existing position's range to a fixed product width (e.g., from ±40% to ±5%). The range itself is computed by `proposeFlatNarrow` using `suggestFixedRange` with a configured `productNarrowWidthPct`, but FLAT_NARROW is the label/kind of the resulting proposal card and on-chain action.

- journal/TASKS-UI.md:1137-1138 "nowe rodzaje propozycji `kind: 'FLAT_NARROW'` (zwężenie do k×σ w POTWIERDZONYM flacie)"
- journal/HANDOFF.md:861-862 "bot wystawi pierwszą w historii propozycję FLAT_NARROW"
- journal/reports/morning-2026-09-19.md:109-110 ""kind": "FLAT_NARROW", "action": "FLAT_NARROW""

### id-02 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Is position #5978579 a wide or a narrow position?

Position #5978579 is a wide position. In the daily position tables it is listed with the posture "SZEROKI" (wide) on the base-cbbtc-weth-005 pool. The FLAT_NARROW proposals associated with this token are merely pending suggestions to narrow the range from ±40% to ±5%; the position itself remained wide throughout the reporting period.

- journal/reports/morning-2026-09-17.md:261 "#5978579 | base-cbbtc-weth-005 | SZEROKI"
- journal/reports/morning-2026-09-18.md:275 "#5978579 | base-cbbtc-weth-005 | SZEROKI"
- journal/reports/morning-2026-09-16.md:242 "#5978579 | base-cbbtc-weth-005 | SZEROKI"

### id-03 (answerable yes, evidence no, coverage partial)

**Q:** Was the range of position #5886957 ever changed, and when?

The chunks do not indicate that the range of position #5886957 was ever changed. In every report provided (from 2026-08-29 to 2026-09-18), the 'zakres' (range) status is consistently listed as 'w zakresie' (in range), and the 'postura' (posture) remains 'SZEROKI' (wide). No entry records a range adjustment or modification.

- journal/reports/morning-2026-08-29.md:185 "#5886957 | base-weth-usdc-030 | $3435 | $-4.09 | $-72.82 (od 2026-08-27) | w zakresie"
- journal/reports/morning-2026-09-18.md:274 "#5886957 | base-weth-usdc-030 | SZEROKI | $3466 | $-1.38 | $-41.50 (od 2026-08-27) | $26.09 | $1.20 | w zakresie"

### id-04 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** What set of tasks was in the D0 package, and was it about project functionality or about tests?

The D0 package, titled "DETEKTOR→POMIAR" (Detector→Measurement), contained two tasks: (1) modifying the observer so the flat detector stops emitting FLAT_NARROW/FLAT_WIDEN signals, leaving only episode measurement and logs; and (2) a cosmetic rename of the "k×σ" formula label in three places (observer.ts, Telegram format, and cycleLine.tsx). It was about project functionality (changing bot signal behavior and UI labels), not about tests. The chunk explicitly warns not to implement it before closing a specific episode because it would kill the FLAT_WIDEN signal.

- journal/RESEARCH-QUEUE.md:498 "D0. PACZKA „DETEKTOR→POMIAR""
- journal/RESEARCH-QUEUE.md:499 "observer: detektor flatu przestaje emitować FLAT_NARROW/FLAT_WIDEN"
- journal/RESEARCH-QUEUE.md:501 "KOSMETYKA „k×σ" (3 kryjówki starej formułki)"

### id-05 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** What does the function fetchFreshPool do?

fetchFreshPool (in src/utils/uniswap.ts) fetches the current pool state on-chain: it calls factory.getPool, reads slot0 and liquidity, and constructs a new Pool object with the same tokens and fee tier. It is fail-open: if the factory or RPC call fails, it returns the old pool object. It is called inside useRebalanceExecution and useRotateExecution immediately before buildMintStep, so rebalance/rotate flows use fresh on-chain data rather than stale state.

- journal/CONTEXT.md:351-352 "fetchFreshPool (src/utils/uniswap.ts): factory.getPool → slot0 + liquidity → nowy Pool z tymi samymi tokenami/fee"
- journal/CONTEXT.md:352-353 "fail-open (zwraca stary pool, gdy fabryka/RPC zawiedzie)"
- journal/CONTEXT.md:353-354 "wpięty w useRebalanceExecution i useRotateExecution tuż przed buildMintStep"
- journal/HANDOFF.md:256-257 "fetchFreshPool poprawny [factory.getPool → slot0+liquidity → nowy Pool, fail-open], wpięty w oba hooki przed buildMintStep"

### id-06 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** What project stage was E8.2?

E8.2 was the “HOUSE” (or “dom kasyna” / casino house) research stage, testing delta-neutral LP strategies on oracle-priced perps pools (GM v2 ETH/BTC, JLP, GLP) to find a structural edge over HODL without the LVR/adverse-selection drag that kills AMM v3 LPs.

- journal/RESEARCH-QUEUE.md:397 "E8.2 HOUSE (CC-Mac, ~15 min)"
- journal/RESEARCH-QUEUE.md:324 "E8.2 „DOM KASYNA" — ZAMKNIĘTE 09.09 (wieczór)"
- journal/CONTEXT.md:722 "E8.2 „dom kasyna" GM pools/HLP (wycena po oraklach, brak LVR)"

### id-07 (answerable yes, evidence no, coverage full)

**Q:** In which database were the backtest results stored?

The backtest results were stored in a SQLite database. The documentation states that the database holds only the `backtest_run` table, which serves as the results index, while raw tick-level swap data remained in NDJSON files.

- docs/DB-SCHEMA.md:168-169 "The database holds only `backtest_run` (results index)."

### na-01 (answerable partial, evidence no-evidence, coverage partial)

**Q:** How much tax should I pay after closing these positions, did the application calculate it, and on what basis?

The application did not calculate the tax amount. It provided the data needed to file: a CSV export (one row per on-chain event with dates, tokens, amounts, and USD values) designed specifically for the Polish income-tax return (PIT-38), plus a closed-positions panel showing per-position results, fees, and gas. The basis is the full on-chain transaction ledger (bot/ledger.ts, ndjson). The docs note that selling crypto for fiat is a taxable event reported in PIT-38, and the CSV export was built to support that filing. No PLN conversion or tax computation was implemented; a PLN column and SQLite ledger were listed as planned but not built.

- docs/UI-DESIGN.md:101-102 "CSV export for the Polish income-tax return (PIT-38)"
- docs/EMERGENCY.md:104-105 "Selling crypto for fiat is a taxable event in Poland (reported in the Polish income-tax return, PIT-38)"
- journal/TASKS-LEDGER.md:4 "podatki PL + audytowalność"
- docs/UI-DESIGN.md:32 "The SQLite ledger and the PLN conversion for tax reporting"
- journal/TASKS-LEDGER.md:42-43 "kolumny pod rozliczenie (data UTC+lokalna, sieć, tx, rodzaj, tokeny, kwoty, USD)"

### na-02 (answerable partial, evidence no-evidence, coverage none)

**Q:** What were the backtest results for the Solana network?

The chunks do not contain backtest results for the Solana network. The HOMOS project's backtests and pipeline runs cover Ethereum mainnet, Arbitrum, Base, and Optimism pools (e.g., "mainnet-dai-usdt-001", "arbitrum-usdc-usdt-001", "base-cbbtc-weth-005", "optimism-weth-usdc-030"). Solana is mentioned only in the context of the JLP (Jupiter) benchmark, where it is noted that SOL exposure is a factor in the JLP index ("realnie jest ~44% SOL") and that a three-factor regression including SOL is needed ("wymaga regresji 3-czynnikowej z SOL"), but no Solana-specific Uniswap v3 LP backtest results are reported.

- journal/CONTEXT.md:576-577 "realnie jest ~44% SOL (wagi Jupitera: SOL 44 / ETH 10 / WBTC 11 / stable 35)"
- journal/CONTEXT.md:579 "wymaga regresji 3-czynnikowej z SOL"

### na-03 (answerable partial, evidence no-evidence, coverage none)

**Q:** How much did the GMX positions earn at the moment of switching from crypto pairs to shorts?

The chunks do not state how much the GMX positions earned at the exact moment of switching from crypto pairs to shorts. They record test PnL figures (e.g., "PnL −$0.39" and "PnL cenowy −$0.31") and costs, but not a specific earnings amount tied to that switch.

- journal/CONTEXT.md:3505-3506 "PnL −$0.39 (−0.25% = ruch ceny ETH, nie koszt)"
- journal/CONTEXT.md:3533 "PnL cenowy −$0.31 (ETH lekko w górę)"

### na-04 (answerable no, evidence no-evidence, coverage none)

**Q:** How much did the electricity for the Windows server cost per month?

The provided chunks do not state the monthly electricity cost for the Windows server. They mention the server ran 24/7 on a home Windows machine (a role originally envisioned for a ~$5/month VPS) and that sleep was disabled, but no electricity bill or energy-cost figure is given.


### na-05 (answerable no, evidence no-evidence, coverage none)

**Q:** What were the results for October 2026?

The provided chunks contain no information about October 2026. All journal entries are dated August–September 2026, and the case-study summary ends on 21 September 2026. No October results are reported.


### na-06 (answerable no, evidence no-evidence, coverage none)

**Q:** How many tokens were consumed building the project?

The provided chunks do not state how many tokens were consumed building the project. They describe capital deployed (e.g., 6,092 USDC), swap counts, and session workflows, but no AI token usage metrics are reported.


### na-07 (answerable partial, evidence no-evidence, coverage none)

**Q:** What was the structure of the SQL database holding the backtest data?

The provided chunks do not describe the structure of the SQL database holding backtest data. They explicitly state that raw tick-level swaps stay in files and that the database holds only a results index. Additionally, the ledger was shipped as ndjson + CSV export rather than SQLite.

- docs/DB-SCHEMA.md:168-169 "The database holds only `backtest_run` (results index)."
- docs/PLAN.md:167 "The ledger shipped as ndjson + CSV export rather than SQLite"

