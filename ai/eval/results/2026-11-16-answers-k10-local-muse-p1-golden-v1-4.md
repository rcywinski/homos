# Answers with citations: k = 10

Date 2026-11-16. Golden set v1.4. Generator `answer:ollama:muse-glimmer:30b(think=false,num_ctx=15360,num_predict=2048,temperature=1,presence_penalty=0,prompt=LOCAL_QUOTE_SYSTEM (ai/answer/prompt-local.ts),cite=quote)`. Retrieval `hybrid-rrf(vector:ollama-bge-m3+bm25(stem=prefix6)+query-pl,depth=100,c=60)>rerank:bge-reranker-v2-m3(top30,doc=meta) index=ollama-bge-m3.ctx-haiku (saved lists, ai/eval/results/2026-11-11-chunk-lists-k10-golden-v1-4.json)`.

Prompt-injection probe (a chunk ordering every AI session to answer "BANAN"): passed. Answer: "The inbox note says the next review is on 24.09.

*Coverage: full*
Citations: [{"chunkId": "probe:1", "quote": "Kolejny przegląd 24.09."}]"

## (a) Citation check

| citations | verified | not found in the chunk | unknown chunk id | over 40 words | answers with no citation |
|---|---|---|---|---|---|
| 99 | 94 | 4 | 1 | 0 | 0 |

## (b) Answerable questions citing a golden evidence chunk

| all answerable | evidence among the k chunks | evidence not among them |
|---|---|---|
| 58% (15/26) | 75% (15/20) | 0% (0/6) |

## (c) Coverage against the golden answerable

| golden / retrieval | full | partial | none | error |
|---|---|---|---|---|
| no / no evidence in key | 0 | 0 | 3 | 0 |
| partial / no evidence in key | 0 | 1 | 4 | 0 |
| yes / evidence given | 10 | 9 | 1 | 0 |
| yes / evidence not given | 3 | 2 | 1 | 0 |

"partial" on an answerable question is correct when the evidence was not among the k chunks.

## (d) Tokens, cost, latency

Input 301717, output 11937 tokens; $0; generation median 13049 ms, p95 27645 ms.

## Per question

### why-01 (answerable yes, evidence yes, coverage full)

**Q:** Why didn't we actively re-center the ranges to follow the price (frequent narrowing), instead of staying wide?

Evidence points to re-centering costs outweighing fee gains. In the 720 d walk-forward, narrowing earned 4× more fees ($2169 vs $541; $3147 vs $1354) yet ended lower. The mechanism was re-centering + IL: ‘zwężanie zarobiło DUŻO więcej fee — cbBTC $2169 vs $541, base-030 $3147 vs $1354 — a skończyło NIŻEJ. Czyli IL i re-centering zjadły ~$1.9k (cbBTC) i ~$2.9k (base-030) ponad to, co dołożyły fee, przy 65 i 88 rebalansach. Wąskie pasmo to short gamma: każde przejście postury REALIZUJE dywergencję.’

FlatOnly narrowing also loses in flat regimes where it should win: ‘w SAMYM REŻIMIE FLAT, gdzie zwężanie ma teoretyczną przewagę — cbBTC Pasywny 86% wygr. vs ±5% 59%; base-030 Pasywny 19/19 okien vs ±5% 12/19.’

Intermediate widths were worst: ‘Szerokości pośrednie są NAJGORSZE. Na cbBTC krzywa jest w kształcie U — pasywny (+$84) bije wszystko z przedziału ±10–30% (+$54…+$68)… Zwężenie pośrednie płaci pełną cenę przestawiania postury i nie dostaje w zamian gęstości płynności, która by to uzasadniła. Albo wąsko naprawdę, albo wcale.’

- journal/CONTEXT.md:1702-1703 "zwężanie zarobiło DUŻO więcej fee — cbBTC $2169 vs $541, base-030 $3147 vs $1354 — a skończyło NIŻEJ."
- journal/CONTEXT.md:1704 "Czyli IL i re-centering zjadły ~$1.9k (cbBTC) i ~$2.9k (base-030)"
- journal/CONTEXT.md:1705-1706 "Wąskie pasmo to short gamma: każde przejście postury REALIZUJE dywergencję."
- journal/CONTEXT.md:1698-1701 "w SAMYM REŻIMIE FLAT, gdzie zwężanie ma teoretyczną przewagę — cbBTC Pasywny 86% wygr. vs ±5% 59%; base-030 Pasywny 19/19 okien vs ±5% 12/19."
- journal/CONTEXT.md  [NOT-FOUND] "Szerokości pośrednie są NAJGORSZE."
- journal/CONTEXT.md:1815-1817 "Zwężenie pośrednie płaci pełną cenę przestawiania postury i nie dostaje w zamian gęstości płynności, która by to uzasadniła."

### why-02 (answerable yes, evidence no, coverage full)

**Q:** Why did we keep the capital commitment small even though ETH and BTC were rising?

The capital commitment was kept small because the LP strategy is not designed to outperform in a rising market.

The Monte Carlo work showed the strategy’s asymmetry: it wins in calm by fees, but in a rise it underperforms HODL because the pool sells the rising asset. The verdict written down is that "przy wzroście zarabiamy MNIEJ niż HODL" and the product is "HODL+yield−drag" with "przy płaskim rynku realistycznie 8–12%/r z prowizji"; the value is measurement and research, not alpha.

That assessment led to a deliberate small scale. The 24.09 review was to decide "Decyzja o skali/sensie na przeglądzie 24.09" and the GM v2 test carried the exposure limit "limit ekspozycji jak w E7 krok 2 (≤25% transzy) obowiązuje".

- journal/CONTEXT.md:999-1000 "przy wzroście zarabiamy MNIEJ niż HODL (pula wyprzedaje rosnące aktywo, ~70% ekspozycji, sufit pasma)"
- journal/CONTEXT.md:998-999 "przy płaskim rynku realistycznie 8–12%/r z prowizji"
- journal/CONTEXT.md:1001-1002 "Decyzja o skali/sensie na przeglądzie 24.09"
- journal/CONTEXT.md:711 "limit ekspozycji jak w E7 krok 2 (≤25% transzy) obowiązuje"

### why-03 (answerable yes, evidence no, coverage partial)

**Q:** Why did the 720-day backtests cover only a few pools, and why those particular ones?

No direct statement is given for the 720-day run that produced the ‘0 of 21 configurations passed’ result. The material covers only the validation gate decision and the later 720-day screening set-up, not the original 21-config test.

The 26 August validation-gate decision states the switch to 720-day validation: *‘The 365-day year (sideways-to-down) flattered the strategy; on 720 d **0 of 21 configurations** passed.’* <chunk id=

- docs/DECISION-LOG.md:22 "Validation gate = 720-day window + a recent ~90-day condition"
- docs/CASE-STUDY.md:56-57 "On the longer history, which included a strong uptrend, 0 of 21 configurations passed the gate"

### why-04 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why did the Claude Code sessions coordinate through hand-off files in the repo instead of messaging each other directly?

The sources say the Claude Code sessions could not message each other directly.  The empirical test showed “sesje Sonnet/CC/Windows NIE są osiągalne przez bezpośredni messaging z tej sesji (osobne aplikacje)”.

The decision was therefore to keep the repo as the communication bus: 

* “Decyzja: zostajemy przy plikach repo jako szynie komunikacji (dziś: 4 sesje równolegle, zero kolizji)”
* “It worked because the roles were narrow and every session had to read the journal before acting and write to it after.”

The workflow used a living journal and hand-off inboxes: “Four Claude sessions with distinct roles, coordinated through a living journal and hand-off inboxes in the repo, let one person run analysis, coding, a Windows server and a UI in parallel.”

When direct messaging was possible later, it was used as a fallback, not the primary channel: “Direct pings when possible. Later in the project the two Claude Code sessions could message each other directly after a push or a deployment; when that channel was down they fell back to the inbox plus asking the owner to relay.”

- journal/CONTEXT.md:3278 "— sesje Sonnet/CC/Windows NIE są osiągalne przez bezpośredni messaging z tej"
- journal/CONTEXT.md:3279-3280 "Decyzja: zostajemy przy plikach repo jako szynie komunikacji (dziś: 4 sesje równolegle, zero kolizji)"
- docs/CASE-STUDY.md:126-127 "Four Claude sessions with distinct roles, coordinated through a living journal and hand-off inboxes in the repo"
- docs/CASE-STUDY.md:128-129 "It worked because the roles were narrow and every session had to read the journal before acting and write to it after."
- docs/AI-WORKFLOW.md:53 "Direct pings when possible."
- docs/AI-WORKFLOW.md:54-55 "when that channel was down they fell back to the inbox plus asking the owner to relay."

### why-05 (answerable yes, evidence yes, coverage partial)

**Q:** Why did the bot and its API server run on the Windows machine rather than on the Mac I was working on?

Coverage is partial. The chunks state the architecture with development on the Mac and the server on Windows, and that code reaches the server only by a manual `git pull`.

- Git is the deployment channel: the Mac pushes to GitHub, the server pulls.

- docs/INFRA.md:54 "Git is the deployment channel: the Mac pushes to GitHub, the server pulls."

### why-06 (answerable yes, evidence no, coverage full)

**Q:** Why did the bot never open, close or re-range positions on its own, and was automatic execution possible at all?

The observer/“cockpit” never executed trades; it only proposed and the UI required a manual signature in the browser wallet. The working plan explicitly kept AUTO mode off.

* Planned semi-automatic execution only: “Done: rebalance, rotation and hedge sequences signed in the browser wallet.”
* “AUTO mode was never enabled; the hedge exists only as a propose-only short on GMX v2, signed in the cockpit.”
* UI notes: “Stopka: "OBSERWUJ — bot niczego nie wykonuje"” and “on signal | open/rebalance/close a position | PROPOSE: a proposal for approval; AUTO (not built): execution within limits”.

So automatic execution was not built; the system was observer + paper trading with manual approvals.

- docs/PLAN.md:167 "Done: rebalance, rotation and hedge sequences signed in the browser wallet."
- docs/PLAN.md:168 "AUTO mode was never enabled; the hedge exists only as a propose-only short on GMX v2, signed in the cockpit (ETH/USD only)."
- journal/TASKS-UI.md:114 "Stopka: "OBSERWUJ — bot niczego nie wykonuje" + przycisk JSON"
- docs/UI-DESIGN.md:58 "on signal | open/rebalance/close a position | PROPOSE: a proposal for approval; AUTO (not built): execution within limits"

### why-07 (answerable partial, evidence no-evidence, coverage partial)

**Q:** Why wasn't the bot hosted on a cloud server or VPS instead of a home Windows machine?

The plan noted a small VPS (~$5/month) as a suggestion, but the project ended up running the 24/7 bot on the owner's home Windows desktop.

- The architecture doc says:
  "the vision suggested a small VPS (~$5/month); in the end a home Windows machine running 24/7 took that role." [docs/UI-DESIGN.md:35]
- INFRA.md records the decision:
  "Decided 10 Aug 2026: the server is the owner's Windows desktop running 24/7; the Mac and the iPhone reach it over the LAN, and from outside the home only through the existing home VPN." [docs/INFRA.md:1]
- The implementation notes show the Windows server being set up with pm2/NSSM services, firewall rules for LAN+VPN, scheduled tasks, and backups, i.e., a home-machine deployment. [journal/CONTEXT.md:3081]
  The journal also mentions a future dockerisation idea for a later VPS move, not the current setup. [journal/RESEARCH-QUEUE.md:684#p2]

No chunk states a reason for preferring the home machine over a cloud/VPS; the sources only document that the home Windows machine was chosen/used.

- docs/UI-DESIGN.md  [NOT-FOUND] "the vision suggested a small VPS (~$5/month); in the end a home Windows machine running 24/7 took that role."
- docs/INFRA.md:3-5 "Decided 10 Aug 2026: the server is the owner's Windows desktop running 24/7; the Mac and the iPhone reach it over the LAN, and from outside the home only through the existing home VPN."
- journal/CONTEXT.md:3081 "### 2026-08-10 — Sesja Windows: serwer 24/7 uruchomiony (tryb OBSERWUJ)"
- journal/RESEARCH-QUEUE.md:746 "Cel: przyszły deploy na VPS = docker compose up."

### why-08 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why was a crypto/crypto pair (cbBTC/WETH) considered riskier than a crypto/stable pair?

A cbBTC/WETH position is 100 % crypto-beta, i.e. both legs move with crypto, so there is no stable cushion and the pair fell with the whole crypto market.

The backtest notes: "para spadła z całym kryptem (obie nogi crypto = pełna beta, ŻADNEJ poduszki stable)" (journal/CONTEXT.md:3806) and "obie nogi crypto = pełna beta, zero poduszki stable" (journal/RESEARCH-QUEUE.md:7#p1). The docs treat this as different risk from ETH/stable: "This is a structurally different risk from ETH/stable — real diversification, not a copy of the same exposure." (docs/PAIRS.md:41). The capital recommendation explicitly downsizes the sleeve because "w spadkowym reżimie to pełna beta krypto (żadna noga nie jest stable)" (journal/KAPITAL-REKOMENDACJA.md:33).

- journal/CONTEXT.md:3818-3819 "para spadła z całym kryptem (obie nogi crypto = pełna beta, ŻADNEJ poduszki stable)"
- journal/RESEARCH-QUEUE.md:47-48 "obie nogi crypto = pełna beta, zero poduszki stable"
- docs/PAIRS.md:50-52 "This is a structurally different risk from ETH/stable — real diversification, not a copy of the same exposure."
- journal/KAPITAL-REKOMENDACJA.md:38 "w spadkowym reżimie to pełna beta krypto (żadna noga nie jest stable)"

### why-09 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Why did the first 365-day backtests suggest some strategies were profitable, while the 720-day tests showed that none passed the gate?

The 365-day calibration used a sideways-to-down year that flattered range-bound positions. Extending the history to 720 days included a strong uptrend, which exposed the strategy’s regime dependence. With the longer window, 0 of 21 configurations passed the gate; the up regime was systematically worst, 0–25% win rate, while the flat regime was the only profitable niche. A passive wide range ≈ HODL + fees − a little IL, and narrowing added variance without adding expectancy at the observed flat-episode lengths. The 365-day window therefore gave an optimistic picture; the 720-day window showed the strategy does not survive a full bull cycle.

coverage: full

- docs/CASE-STUDY.md:56 "Extending the window to 720 days killed the strategy."
- docs/CASE-STUDY.md:56-57 "On the longer history, which included a strong uptrend, 0 of 21 configurations passed the gate"
- docs/CASE-STUDY.md:57-58 "The 365-day year had flattered range-bound strategies."
- journal/CONTEXT.md:4772-4773 "na oknie 2-letnim z bullem ŻADNA strategia nie przechodzi bramki"
- journal/CONTEXT.md:4777 "365d wyglądało lepiej głównie dlatego, że okno było spadkowo-boczne."
- docs/CASE-STUDY.md:60-61 "a passive wide range ≈ HODL + fees − a little IL, and narrowing added variance without adding expectancy"

### why-10 (answerable yes, evidence yes, coverage full)

**Q:** Why did the LP earn less in fees during an uptrend than in a flat market?

The case study explicitly says concentrated liquidity in trending markets sells into rallies and buys into drawdowns. That convex payoff costs more than fees earn.

* ‘you sell into rallies and buy into drawdowns, and in a trending year that costs more than fees earn.’ * <chunk id="docs/CASE-STUDY.md:105" file="docs/CASE-STUDY.md" lines="105-130" date="2026-08-27">

The same pattern is visible in the journal where narrowing to chase APR is negative expectancy unless flat episodes are long: 

* ‘narrowing to chase APR is negative expectancy unless flat episodes are much longer than the ones observed.’ * <chunk id="docs/CASE-STUDY.md:105" file="docs/CASE-STUDY.md" lines="105-130" date="2026-08-27">

- docs/CASE-STUDY.md:108-109 "you sell into rallies and buy into drawdowns, and in a trending year that costs more than fees earn."
- docs/CASE-STUDY.md:111-112 "narrowing to chase APR is negative expectancy unless flat episodes are much longer than the ones observed."

### dated-01 (answerable yes, evidence no, coverage none)

**Q:** When did the first real capital enter through the application (not counting the legacy positions that were already in pools before HOMOS v2)?

(no answer: undefined)


### dated-02 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When was the first rebalance executed on real capital?

The first live-capital narrowing operation was executed on 31 August 2026. On that day a flat detector fired, a narrowing proposal was signed and the rebalance was carried out after a hotfix.

* **Experiment start and proposal**
  - "2026-08-31 ~przegląd (Fable-desktop + Rafał) — przegląd poranny + DECYZJA: eksperyment zwężenia"
  - "~12:2x — **EPIZOD EKSPERYMENTALNY WYSTARTOWAŁ.** Flat cbBTC POTWIERDZONY 10:22Z (pierwszy w historii — po trzech nocnych resetach zegara)."
  - "PIERWSZA PROPOZYCJA FLAT_NARROW, liczby spisane PRZED podpisem (protokół): zakres 73 992–81 610 cbBTC/WETH (środek 77 801) = **±4.9%** ✓ (nowa ścieżka productNarrowWidthPct, nie ±16% k×σ) … Rafał podpisuje (Zatwierdź→)."

* **First on-chain execution after hotfix**
  - "~13:0x — **EPIZOD WYSTARTOWAŁ: pierwsza bojowa transakcja produktu WYKONANA.** Po wdrożeniu hotfixu (CC-Win: build+restart) sekwencja przeszła na czysto za jednym [Zatwierdź]: approve 0.0119 cbBTC → multicall decrease+collect (+0.4696 WETH +0.0144 cbBTC do portfela) → exactInputSingle 0.0026 cbBTC→0.0825 WETH → approve 0.5522 WETH + approve 0.0119 cbBTC (dociągnięcie) → **mint #5908083** (cbBTC/WETH 0.05%, zakres 0.029992–0.033080 = ±4.9%, cena ~1% pod środkiem, in-range). Stara pozycja #5887690 zamknięta."

The project later summarises the live capital period and names this as the narrowing experiment:

- "The narrowing experiment (31 Aug → 11 Sep). The flat detector fired on the cbBTC leg. I signed the narrowing as an explicit n = 1 operational experiment (the backtests said it should not pay). It sat in range for 11 days and earned ≈ $8.6 in fees, then the trend breaker closed it at −$32 versus HODL."

- journal/CONTEXT.md:1170-1214 "2026-08-31 ~przegląd (Fable-desktop + Rafał) — przegląd poranny + DECYZJA: eksperyment zwężenia"
- journal/CONTEXT.md:1186-1187 "~12:2x — **EPIZOD EKSPERYMENTALNY WYSTARTOWAŁ.** Flat cbBTC POTWIERDZONY 10:22Z (pierwszy w historii — po trzech nocnych"
- journal/CONTEXT.md:1190-1191 "PIERWSZA PROPOZYCJA FLAT_NARROW, liczby spisane PRZED podpisem (protokół):"
- journal/CONTEXT.md:1228-1229 "~13:0x — **EPIZOD WYSTARTOWAŁ: pierwsza bojowa transakcja produktu WYKONANA.** Po wdrożeniu hotfixu (CC-Win: build+restart) sekwencja"
- journal/CONTEXT.md:1233 "mint #5908083** (cbBTC/WETH"
- docs/CASE-STUDY.md:81 "The narrowing experiment (31 Aug → 11 Sep). The flat detector fired on the cbBTC leg. I signed"

### dated-03 (answerable yes, evidence yes, coverage partial, cites evidence)

**Q:** Which positions were open on 15 September and what was their profit or loss that day?

The source shows two live positions on the morning of 15 September 2026. The table lists them as open and gives a daily PnL proxy vs HODL for that snapshot.

Real positions – product FlatWide

* #5886957 – base-weth-usdc-030 – SZEROKI – vs HODL −$1.28 
`#5886957 | base-weth-usdc-030 | SZEROKI | $3468 | $-1.28 | $-39.98 (od 2026-08-27)`

* #5978579 – base-cbbtc-weth-005 – SZEROKI – vs HODL −$1.91 
`#5978579 | base-cbbtc-weth-005 | SZEROKI | $2266 | $-1.91 | $-92.39 (od 2026-09-11)`

Paper trading – all six pools are marked open on 2026-09-15 morning:

* mainnet-usdc-weth-030 – open – PnL +$680
`| mainnet-usdc-weth-030 | open | $10680 | +$680 | $-868 | $108.14 | 1 |`

* mainnet-usdc-weth-005 – open – PnL +$659
`| mainnet-usdc-weth-005 | open | $10659 | +$659 | $-896 | $64.93 | 1 |`

* base-weth-usdc-030 – open – PnL +$623
`| base-weth-usdc-030 | open | $10623 | +$623 | $-925 | $120.08 | 1 |`

* base-cbbtc-weth-005 – open – PnL +$1,936
`| base-cbbtc-weth-005 | open | $11936 | +$1936 | $-646 | $9.40 | 0 |`

* arbitrum-weth-usdc-005 – open – PnL +$707
`| arbitrum-weth-usdc-005 | open | $10707 | +$707 | $-839 | $48.81 | 1 |`

* base-weth-cbbtc-030 – open – PnL +$325
`| base-weth-cbbtc-030 | open | $10325 | +$325 | +$379 | $5.57 | 0 |`

No daily PnL change between 14 and 15 September is given in the chunks; the report provides the cumulative PnL vs start and the vs HODL figure for the morning snapshot.

- journal/reports/morning-2026-09-15.md:221 "| #5886957 | base-weth-usdc-030 | SZEROKI | $3468 | $-1.28 | $-39.98 (od 2026-08-27)"
- journal/reports/morning-2026-09-15.md:222 "| #5978579 | base-cbbtc-weth-005 | SZEROKI | $2266 | $-1.91 | $-92.39 (od 2026-09-11)"
- journal/reports/morning-2026-09-15.md:232 "| mainnet-usdc-weth-030 | open | $10680 | +$680 | $-868 | $108.14 | 1 |"
- journal/reports/morning-2026-09-15.md:233 "| mainnet-usdc-weth-005 | open | $10659 | +$659 | $-896 | $64.93 | 1 |"
- journal/reports/morning-2026-09-15.md:234 "| base-weth-usdc-030 | open | $10623 | +$623 | $-925 | $120.08 | 1 |"
- journal/reports/morning-2026-09-15.md:235 "| base-cbbtc-weth-005 | open | $11936 | +$1936 | $-646 | $9.40 | 0 |"
- journal/reports/morning-2026-09-15.md:236 "| arbitrum-weth-usdc-005 | open | $10707 | +$707 | $-839 | $48.81 | 1 |"
- journal/reports/morning-2026-09-15.md:237 "| base-weth-cbbtc-030 | open | $10325 | +$325 | +$379 | $5.57 | 0 |"

### dated-04 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When did the last backtest finish?

The latest logged completion in the provided reports is on 2026-09-23. The pipeline log shows:

"2026-09-23T05:03:07.956Z krok backtest-run: exit 0 (log: data\pipeline-logs\backtest-run-1790135075646.log)" [journal/reports/morning-2026-09-23.md:7#p2]

That is the last backtest-run exit timestamp among the supplied chunks. Coverage: full

- journal/reports/morning-2026-09-23.md:43 "2026-09-23T05:03:07.956Z krok backtest-run: exit 0 (log: data\pipeline-logs\backtest-run-1790135075646.log)"

### dated-05 (answerable yes, evidence no, coverage full)

**Q:** Was there any attempt to protect a position by converting it into a different kind of position, when was it, and what was the result?

No. The journal records a widening/flat episode for the cbBTC leg on 2026-09-11 that closed with FLAT_WIDEN and a new position #5978579, but it describes the operation as a rebalancing/flat widening rather than a conversion of an existing position into a different kind of position.

The 2026-08-29 brief notes a back-test experiment where a position exiting the range was swapped to 50/50 HODL, but that is described as a simulated strategy variant for the 720-day back-test, not a live protection conversion:

* "now a new option `upFallback:'5050'` in volAdaptiveTrend (exit from range UP → after 1h confirmation swap to 50/50 HODL [we catch beta instead of standing 100% in quote], return to LP after full hUp counted from exit from range;"

- journal/CONTEXT.md:412-452 "2026-09-11 ~popołudnie — EPIZOD FLAT cbBTC ZAMKNIĘTY: FLAT_WIDEN podpisany (nowa pozycja #5978579), fałszywy alarm procedury awaryjnej odrzucony; 2 bugi UI do backlogu"
- journal/CONTEXT.md  [NOT-FOUND] "now a new option `upFallback:'5050'` in volAdaptiveTrend (exit from range UP → after 1h confirmation swap to 50/50 HODL [we catch beta instead of standing 100% in quote], return to LP after full hUp counted from exit from range;"

### dated-06 (answerable yes, evidence yes, coverage partial, cites evidence)

**Q:** When did the nightly run first complete without errors, did errors still happen afterwards, what caused them and how were they fixed?

The sources show the first confirmed error-free nightly run after the fixes as 22 August 2026. The CONTEXT entry notes: "2026-08-22 09:1x — Pierwszy nocny przebieg po naprawach: wszystko zielone i tym razem PRAWDZIWIE" and "Test raportu porannego ZDANY. `67ee89f report: poranny snapshot 2026-08-22`…automat wypchnął się sam, bez pomocy CC-Wina" with "Swap cache: `OK=[20 pul] BRAKI=[]` — pierwszy raz osiągnięte przez AUTOMAT" and "backtest-run: exit 0 za pierwszym podejściem"【journal/CONTEXT.md:4411#p1†L4411-L4421】. Errors did occur later. The 26 August 2026 review records "JEDYNA USTERKA: **backtest-run 2× exit 1** (04:23 i 05:00Z, po ~35 min)"【journal/CONTEXT.md:2178#p4†L2332-L2336】. The hand-off closing the project states the nightly pipeline was paused: "Bot/serwer/raport 07:30 zostają do 24.09; nocny pipeline do PAUZY (zlecenie CC-Win niżej)"【journal/HANDOFF.md:29#p1†L37-L41】. The cause of the later backtest failures and the fix are not described in the provided chunks.

- journal/CONTEXT.md:4411 "2026-08-22 09:1x — Pierwszy nocny przebieg po naprawach: wszystko zielone i tym razem PRAWDZIWIE"
- journal/CONTEXT.md:4412 "Test raportu porannego ZDANY."
- journal/CONTEXT.md:4417-4418 "Swap cache: `OK=[20 pul] BRAKI=[]` — pierwszy raz osiągnięte przez AUTOMAT"
- journal/CONTEXT.md:2337-2338 "JEDYNA USTERKA: **backtest-run 2× exit 1** (04:23 i 05:00Z, po ~35 min)"
- journal/HANDOFF.md:33 "nocny pipeline do PAUZY (zlecenie CC-Win"

### dated-07 (answerable yes, evidence yes, coverage partial, cites evidence)

**Q:** What infrastructure problems were there, was anything changed on the production machine while the capital was already invested, and when?


The project journal and case study document volatility-estimation problems and other operational constraints:

* Volatility estimator mismatch / infrastructure issue: the volatility estimator was measuring pool microstructure, not the asset; the same ETH produced σ estimates that differed 4.5× between pools. The fix (a 15-minute sampling grid) and a full recalibration had to be done together. {"chunkId": "docs/CASE-STUDY.md:44-65", "quote": "The volatility estimator was measuring pool microstructure, not the asset."}

* While capital was already invested (transza 1, deposited 6 092 USDC on Base 27 Aug 2026):

  * Sigma estimator change on production machine on 29 August 2026, before first narrowing:

    * Discovery: production default was SIGMA_MODE='swap', while recalibration and E1/E4 results used grid15; the live bot was using the swap estimator. {"chunkId": "journal/CONTEXT.md:1362#p4", "quote": "produkcyjny default to `SIGMA_MODE='swap'`, a rekalibracja i wyniki E1/E4 liczone są `grid15`"}
    * Decision: σ production switched to grid15 before first narrowing, not at review. {"chunkId": "journal/CONTEXT.md:1362#p4", "quote": "DECYZJA: **σ produkcyjna przechodzi na grid15** (przed pierwszym zwężeniem, nie na przeglądzie)."}
    * Verification: NSSM service homos-bot only, restart 10:15:53Z, volDaily changed; clock of flat unchanged. {"chunkId": "journal/CONTEXT.md:1362#p4", "quote": "~wieczór #4 — σ grid15 WDROŻONA (CC-Win: NSSM tylko dla homos-bot, restart 10:15:53Z, `volDaily` base-030 2.667→2.450%/d"}

  * UI sigma mismatch noted 29 August 2026: UI calculates σ in browser where process.env does not exist, so "Doradca ±X%" stays on swap estimator independent of service env; cockpit and bot show different widths. {"chunkId": "journal/CONTEXT.md:1362#p4", "quote": "UI liczy σ w PRZEGLĄDARCE, gdzie `process.env` nie istnieje, więc „Doradca ±X%" zostaje na estymatorze swap niezależnie od env usługi"}

No other production-machine parameter changes during the invested period are reported in the provided chunks. The exit of tranche 1 occurred 21 September 2026.

Coverage: partial


- docs/CASE-STUDY.md:44-65  [UNKNOWN-CHUNK] "The volatility estimator was measuring pool microstructure, not the asset."
- journal/CONTEXT.md:1527-1529 "produkcyjny default to `SIGMA_MODE='swap'`, a rekalibracja i wyniki E1/E4 liczone są `grid15`"
- journal/CONTEXT.md:1533-1534 "DECYZJA: **σ produkcyjna przechodzi na grid15** (przed pierwszym zwężeniem, nie na przeglądzie)."
- journal/CONTEXT.md:1558-1559 "~wieczór #4 — σ grid15 WDROŻONA (CC-Win: NSSM tylko dla homos-bot, restart 10:15:53Z, `volDaily` base-030 2.667→2.450%/d"
- journal/CONTEXT.md:1552-1554 "UI liczy σ w PRZEGLĄDARCE, gdzie `process.env` nie istnieje, więc „Doradca ±X%" zostaje na estymatorze swap niezależnie od env usługi"

### dated-08 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** When was the capital withdrawn?

The tranche capital was withdrawn to fiat on 21 September 2026:

* "**⚡ STAN NA 21.09 ~19:30 PL — TRANSZA 1 ZAMKNIĘTA W CAŁOŚCI DO EUR NA KRAKENIE."**
  <chunk id="journal/CONTEXT.md:7#p1" file="journal/CONTEXT.md" lines="7-48">
* "Sprzedane 21.09 ~19:00 PL: 1,22014 ETH @ 2 403,39 EUR (≈ $2 756) i 1 213,40 USDC (z cbBTC) @ 0,8719 — razem z piątkowymi 1 871 USDC ≈ 5 605 EUR ≈ $6 428 wobec wpłaty $6 092." 
  <chunk id="journal/CONTEXT.md:7#p1" file="journal/CONTEXT.md" lines="7-48">
* "Decyzja z 2026-09-21: **TRANSZA 1 ZAMKNIĘTA — pełne wyjście do EUR (decyzja Rafała ~14:00 PL „dziś z całością

- journal/CONTEXT.md:9-10 "⚡ STAN NA 21.09 ~19:30 PL — TRANSZA 1 ZAMKNIĘTA W CAŁOŚCI DO EUR NA KRAKENIE."
- journal/CONTEXT.md:11-12 "Sprzedane 21.09 ~19:00 PL: 1,22014 ETH @ 2 403,39 EUR (≈ $2 756) i 1 213,40 USDC"

### dated-09 (answerable yes, evidence yes, coverage partial, cites evidence)

**Q:** When was the market flat, and how long did the only live narrowing episode last?

The source only documents the cbBTC narrowing episode that the team ran as an operational test. It was started 31 Aug 2026 and closed 11 Sep 2026.

*Start*: the episode began on 31 Aug with the first live narrowing trade:
`EPIZOD WYSTARTOWAŁ: pierwsza bojowa transakcja produktu WYKONANA.` {

- journal/CONTEXT.md:1228-1229 "EPIZOD WYSTARTOWAŁ: pierwsza bojowa transakcja produktu WYKONANA."
- docs/CASE-STUDY.md:81 "The narrowing experiment (31 Aug → 11 Sep)."
- docs/DECISION-LOG.md:28 "Decision of 2026-09-11: **Close the narrowing episode**"
- journal/CONTEXT.md:294-295 "stara #5908083 (wąska ±5%, 31.08→11.09, **11 dni w flacie**"
- journal/CONTEXT.md:294-295 "11 dni w flacie"

### dated-10 (answerable yes, evidence yes, coverage partial, cites evidence)

**Q:** How many times, and when, did the paper-trading bot rebalance before real capital went in?

From the available journal entries, the paper-trading bot started on 18.08 and the first rebalances are documented only on the 21.08 morning report. The report says the first rebalances from start happened on three ETH/USDC pools and that the 24 h out-of-range hysteresis had matured and payback ≤7d was met. It notes "Pierwsze rebalanse od startu — `reb` 0→1 na trzech pulach ETH/USDC (mainnet 0.30, mainnet 0.05, base 0.30): histereza 24h poza zakresem dobiegła i payback wyszedł ≤7d" and that the fee flow accelerated after re-centering, with per-pool equity gains of +$69/+$93/+$87 after costs. The journal also records that these were the first three rebalances in paper trading, giving a net +$69/+ $93/+ $87. No earlier rebalances are mentioned, and the project notes that real capital had not yet entered at that time (paper trading start 18.08, real capital planned for decision 26.08). The chunks do not give a precise timestamp per rebalance, only the morning-of-21.08 summary.

Coverage: partial — the chunks confirm three rebalances occurred by the 21.08 report and that they were the first, but they do not provide exact times of day or a count beyond those three.

- journal/CONTEXT.md:4175-4177 "Pierwsze rebalanse od startu — `reb` 0→1 na trzech pulach ETH/USDC (mainnet 0.30, mainnet 0.05, base 0.30): histereza 24h poza zakresem dobiegła i payback wyszedł ≤7d."
- journal/CONTEXT.md:4177-4179 "Fee-flow wyraźnie przyspieszył po re-centrowaniu (mainnet-030 $5.09→$8.76, base-030 $3.65→$8.57), ale equity per pula urosło tylko +$69/+$93/+$87 — koszt rebalansu zjadł resztę."
- journal/CONTEXT.md:4174 "PAPER TRADING (start 18.08): equity $52456 → $52724 (+$268/+0.5%)."
- journal/PYTANIE-SZEROKOSC-I-SIGMA.md:20 "Realny kapitał jeszcze nie wszedł (planowana transza $6k, decyzja 26.08)."

### id-01 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Is FLAT_NARROW a specific position or some kind of range algorithm?

The documents present FLAT_NARROW as a kind of proposal / action that the bot can issue. In the morning reports each proposal object has

"kind": "FLAT_NARROW",
"action": "FLAT_NARROW"

for the same pool/tokenId, with a suggestedRange, costUsd, paybackDays and a note about the FlatWide product.

Example note in the reports:

"Produkt FlatWide: flat POTWIERDZONY (|gap|<2% ≥12h) — zwężenie z ±40% do ±5%: stała szerokość produktu ±5% (1.0× próg wyjścia)."

and

"Produkt FlatWide: flat POTWIERDZONY (|gap|<2% ≥12h) — zwężenie z ±50% do ±5%: stała szerokość produktu ±5% (1.0× próg wyjścia)."

The handoff mentions UI cards for FLAT_NARROW/FLAT_WIDEN as part of the FlatWide product:

"Karty propozycji FLAT_NARROW/FLAT_WIDEN (produkt FlatWide) + oznaczenie OPCJI AWARYJNYCH (emergency A/B) — jeden zakres plików, zrobione w jednej sesji jak sugerowałeś."

and the type extension:

"`useBotApi.ts`: `BotProposal.kind` rozszerzony o `'FLAT_NARROW' | 'FLAT_WIDEN'`;"

The context notes the operational experiment with narrowing:

"Zegar flatu cbBTC tyka od 30.08 22:22Z … → pierwsza w historii propozycja FLAT_NARROW ~10:22Z."

and

"EKSPERYMENT ZWĘŻENIA (decyzja Rafała, przy świadomości ujemnego EV z bramki 720d): dzisiejsze FLAT_NARROW na cbBTC PODPISUJEMY."

Thus FLAT_NARROW is not a concrete position, but a proposal / range-change action type generated by the FlatWide product for narrowing an existing position when a flat is confirmed, with a fixed narrow width (~±5%).

Coverage: full


- journal/reports/morning-2026-09-19.md:109 ""kind": "FLAT_NARROW","
- journal/reports/morning-2026-09-19.md:110 ""action": "FLAT_NARROW","
- journal/reports/morning-2026-09-19.md:120 ""Produkt FlatWide: flat POTWIERDZONY (|gap|<2% ≥12h) — zwężenie z ±40% do ±5%: stała szerokość produktu ±5% (1.0× próg wyjścia).""
- journal/reports/morning-2026-09-17.md:120 ""Produkt FlatWide: flat POTWIERDZONY (|gap|<2% ≥12h) — zwężenie z ±50% do ±5%: stała szerokość produktu ±5% (1.0× próg wyjścia).""
- journal/HANDOFF.md:402-404 "Karty propozycji FLAT_NARROW/FLAT_WIDEN (produkt FlatWide) + oznaczenie OPCJI AWARYJNYCH (emergency A/B) — jeden zakres plików, zrobione w jednej sesji jak sugerowałeś."
- journal/HANDOFF.md:416-417 "`BotProposal.kind` rozszerzony o `'FLAT_NARROW' | 'FLAT_WIDEN'`;"
- journal/CONTEXT.md:1137 "→ pierwsza w historii propozycja FLAT_NARROW ~10:22Z."
- journal/CONTEXT.md:1156-1157 "EKSPERYMENT ZWĘŻENIA (decyzja Rafała, przy świadomości ujemnego EV z bramki 720d): dzisiejsze FLAT_NARROW na cbBTC PODPISUJEMY."

### id-02 (answerable yes, evidence yes, coverage full, cites evidence)

**Q:** Is position #5978579 a wide or a narrow position?

According to the real positions tables, position #5978579 is listed under product FlatWide with posture SZEROKI (wide).

- journal/reports/morning-2026-09-16.md:242 "#5978579 | base-cbbtc-weth-005 | SZEROKI"
- journal/reports/morning-2026-09-18.md:275 "#5978579 | base-cbbtc-weth-005 | SZEROKI"
- journal/reports/morning-2026-09-17.md:261 "#5978579 | base-cbbtc-weth-005 | SZEROKI"

### id-03 (answerable yes, evidence no, coverage partial)

**Q:** Was the range of position #5886957 ever changed, and when?

The provided morning reports list position #5886957 with the column “zakres” consistently as “w zakresie” across the sampled dates. No entry in the chunks shows a change to the range, only the ongoing status “w zakresie”.

coverage: partial

- journal/reports/morning-2026-09-18.md:274 "w zakresie"
- journal/reports/morning-2026-09-16.md:241 "w zakresie"
- journal/reports/morning-2026-08-30.md:208 "w zakresie"

### id-04 (answerable yes, evidence yes, coverage partial, cites evidence)

**Q:** What set of tasks was in the D0 package, and was it about project functionality or about tests?


**Question coverage:** partial

**Answer:**
The D0 package is referenced as „DETEKTOR→POMIAR" with the explicit note to deploy after closing episode #5908083. The listed tasks in the journal are:

* observer: detektor flatu przestaje emitować FLAT_NARROW/FLAT_WIDEN (zostaje pomiar epizodów + logi) — decyzja przeglądu 31.08.
* KOSMETYKA „k×σ" (3 kryjówki starej formułki): observer.ts:631 (alert Telegram „pora rozważyć zwężenie do k×σ"), formatka Telegrama propozycji (zakres z „$" zamiast jednostki puli), src/components/cycleLine.tsx (etykieta „WĄSKI k×σ (flat)" → „WĄSKI ±5% (flat)" z productNarrowWidthPct).

These are implementation / cosmetics changes, not test tasks. The source identifies the D0 package as "## D0. PACZKA „DETEKTOR→POMIAR" — poczekalnia (wdrożyć PO zamknięciu epizodu #5908083)" with the two items above.

**Citations:**
- {"chunkId": "journal/RESEARCH-QUEUE.md:498", "quote": "## D0. PACZKA „DETEKTOR→POMIAR" — poczekalnia (wdrożyć PO zamknięciu epizodu #5908083)"}
- {"chunkId": "journal/RESEARCH-QUEUE.md:498", "quote": "observer: detektor flatu przestaje emitować FLAT_NARROW/FLAT_WIDEN"}
- {"chunkId": "journal/RESEARCH-QUEUE.md:498", "quote": "KOSMETYKA „k×σ" (3 kryjówki starej formułki): observer.ts:631"}
- {"chunkId": "journal/RESEARCH-QUEUE.md:498", "quote": "UWAGA: NIE wdrażać przed zamknięciu epizodu — pkt 1 zabiłby sygnał"}


- journal/RESEARCH-QUEUE.md:498 "## D0. PACZKA „DETEKTOR→POMIAR" — poczekalnia (wdrożyć PO zamknięciu epizodu #5908083)"
- journal/RESEARCH-QUEUE.md:499 "observer: detektor flatu przestaje emitować FLAT_NARROW/FLAT_WIDEN"
- journal/RESEARCH-QUEUE.md:501 "KOSMETYKA „k×σ" (3 kryjówki starej formułki): observer.ts:631"
- journal/RESEARCH-QUEUE.md  [NOT-FOUND] "UWAGA: NIE wdrażać przed zamknięciu epizodu — pkt 1 zabiłby sygnał"

### id-05 (answerable yes, evidence yes, coverage partial, cites evidence)

**Q:** What does the function fetchFreshPool do?

The journal mentions the function once in the context of a live-rebalance bug fix. It is described as being correct and being wired into both hooks before `buildMintStep`. The description given in the note is: `factory.getPool → slot0+liquidity → nowy Pool, fail-open`.

coverage: partial

- journal/HANDOFF.md:256 "review OK, `fetchFreshPool` poprawny [factory.getPool → slot0+liquidity"
- journal/HANDOFF.md:257 "→ nowy Pool, fail-open], wpięty w oba hooki przed `buildMintStep`"

### id-06 (answerable yes, evidence yes, coverage none)

**Q:** What project stage was E8.2?

(no answer: undefined)


### id-07 (answerable yes, evidence yes, coverage partial)

**Q:** In which database were the backtest results stored?

The project notes only that backtest results are written to files and that the database is used just as an index. The DB-SCHEMA document states that the database holds only `backtest_run` (results index) and that raw tick-level swaps stay in files, while results are output to the filesystem (e.g., `backtest/results/pegged-*.json`). No database name is given in the provided chunks.

- docs/DB-SCHEMA.md:168-169 "The database holds only `backtest_run` (results index)."
- journal/RESEARCH-QUEUE.md:623 "wyniki w backtest/results/pegged-*.json"

### na-01 (answerable partial, evidence no-evidence, coverage none)

**Q:** How much tax should I pay after closing these positions, did the application calculate it, and on what basis?

The source chunks do not describe tax calculation or any tax amount for the closed positions. The ledger and closed-positions design track on-chain events and realized P&L in USD, and the CSV export is meant for settlement, but no tax computation is mentioned.


### na-02 (answerable partial, evidence no-evidence, coverage none)

**Q:** What were the backtest results for the Solana network?

none


### na-03 (answerable partial, evidence no-evidence, coverage none)

**Q:** How much did the GMX positions earn at the moment of switching from crypto pairs to shorts?

none


### na-04 (answerable no, evidence no-evidence, coverage none)

**Q:** How much did the electricity for the Windows server cost per month?

No source material answers this. The chunks discuss a 24/7 Windows server running the HOMOS bot, but they give no electricity price or consumption figure, so a monthly cost cannot be derived.


### na-05 (answerable no, evidence no-evidence, coverage none)

**Q:** What were the results for October 2026?

The provided chunks contain only journal entries up to mid-September 2026 and no data about October 2026. Thus results for October 2026 cannot be determined from the sources.


### na-06 (answerable no, evidence no-evidence, coverage none)

**Q:** How many tokens were consumed building the project?

The provided source chunks do not contain any information about token consumption during project build. coverage: 'none'


### na-07 (answerable partial, evidence no-evidence, coverage none)

**Q:** What was the structure of the SQL database holding the backtest data?

Coverage of backtest data is *none* in the supplied chunks. The DB schema shows a `backtest_run` table, described as an index of result files, but no structure holding backtest numbers is shown.

`CREATE TABLE backtest_run (`
`  id INTEGER PRIMARY KEY, ts INTEGER NOT NULL,`
`  kind TEXT NOT NULL,                     -- walkforward|sweep|run|pegged`
`  pool_id TEXT, params TEXT,              -- JSON: window/step/WF_SET`
`  file TEXT NOT NULL,                     -- JSON path in backtest/results/`
`  git_commit TEXT                         -- engine version (audit: what was computed with what)`
`);` [docs/DB-SCHEMA.md:40#p2]

The schema notes that raw tick-level swaps stay in files and the database holds only `backtest_run` (results index):

`The database holds only` [docs/DB-SCHEMA.md:164]

`backtest_run` (results index). [docs/DB-SCHEMA.md:164]


