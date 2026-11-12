# Agent manual questions (step 2.2)

2026-11-12. Agent: Sonnet 5.5, effort medium, the four read-only tools, at most 10 model turns, cap $0.50 per
question. Printed by `npm run agent`; the full runs, including every tool result, are in the local logs
(`ai/agent/logs/`, gitignored). Result files restored with `npm run ai:restore-results`.

Note on (b): it ran before a verifier fix. The model wrote the mean with a typographic minus (U+2212, "−0.71"), which
the check did not treat as a minus sign, so the reference was printed as NOT-IN-ANSWER. After the fix (a typographic
minus counts as a minus), the same run's log re-verifies all four numbers as ok. The trace below is the original
output.

## (a) Journal only, next to phase 1 (`npm run ask`, k=10)

| | phase 1 `npm run ask` | agent `npm run agent` |
|---|---|---|
| coverage | partial | full |
| citations verified | 4/4 | 5/6 (one paraphrase, caught) |
| model calls | 1 (plus 1 query translation) | 3 turns, 3 tool calls (2 searches, decision log) |
| cost | $0.0229 (the translation call is not in this figure) | $0.1069 (model $0.1016, inside tools $0.0053) |
| time | 5.6 s for the answer call, about 10 s wall | 22.9 s |

### Agent

```
step 1 (turn with tools): 2 tool call(s); 4 in + 0 cache read + 2696 cache write, 83 out; $0.0076; 5.1 s
   search_journal {"query":"why did the live product stay wide range"} -> 10 chunks, 18103 chars, 4725 ms, $0.0010 inside the tool
   read_decision_log {} -> ok, 7262 chars, 1 ms
step 2 (turn with tools): 1 tool call(s); 2 in + 2696 cache read + 13408 cache write, 121 out; $0.0353; 1.9 s
   search_journal {"query":"produkt bez zmian, nadal szeroki, zwężanie nie opłaca się"} -> 10 chunks, 31451 chars, 4302 ms, $0.0043 inside the tool
step 3 (turn with tools): answer; 2 in + 16104 cache read + 18574 cache write, 908 out; $0.0587; 6.8 s

The live product stayed wide because every test showed that narrowing, or changing the shape of the
wide range, did not beat plain wide ranges. The decision log's 27 Aug entry set the product as ±50%
on WETH/USDC and ±40% on WETH/cbBTC, narrowing only in a confirmed flat.

1. The 29 Aug 720-day gate rejected narrowing. Narrow ±5% earned about 4× the fees but finished
lower, because impermanent loss and re-centering (65 and 88 rebalances) cost more than the extra
fees. Passive wide also won inside flat regimes: 19/19 windows on base-030, against 12/19 for
narrow. The advice was to stay wide.

2. The one live narrowing on cbBTC was a signed experiment (n = 1, not a test of the strategy). It
earned about $8.6 in fees and ended −$32 versus HODL, after which the product stayed unchanged.

3. A better wide shape was not worth switching to. A price-symmetric −50/+50 range beat the current
one on average, but the switch was worth about +$10 over 3 weeks, roughly the swap and gas cost. The
last 90 days also said "not now", so on 3 Sep the product was left unchanged.

coverage: full; status: answered
citations (5/6 verified):
  journal/CONTEXT.md [NOT-FOUND]
    "Pasywny szeroki bije FlatOnly ±5% wszędzie"
  journal/CONTEXT.md:1702-1703
    "zwężanie zarobiło DUŻO więcej fee — cbBTC $2169 vs $541, base-030 $3147 vs $1354 — a skończyło
    NIŻEJ."
  journal/CONTEXT.md:1700-1701
    "base-030 Pasywny **19/19 okien** vs ±5% 12/19"
  docs/DECISION-LOG.md:28
    "Episode: 11 days in flat, ≈ $8.6 fees, −$32 vs HODL."
  journal/CONTEXT.md:788-789
    "DECYZJA: produkt BEZ ZMIAN do 24.09 (zysk z przestawienia ≈ +$10 za 3 tyg. ≈ koszt swapu+gazu;
    a recent90 mówi „nie teraz")."
  docs/DECISION-LOG.md:26
    "Sign the first narrowing proposal (cbBTC leg) as an operational experiment**, n = 1, explicitly
    *not* a test of the strategy"
backtest numbers (0/0 verified):
numbers in the answer with no quote or reference: 27, 50, 40, 29, 720, 65, 88, 50, +50

3 model turns, 3 tool calls; agent:claude-sonnet-5-5(effort=medium); tokens 8 in, 18800 cache read,
34678 cache write, 1112 out; cost $0.1069 (model $0.1016, inside tools $0.0053; cap $0.5); 22.9 s
```

### Phase 1

```
The sources give two partial reasons. First, a walkforward idle-width test on 30 Aug concluded that
the full-period maximum for wider bands was an artefact, so the product's ±40/±50 widths stayed.
Win-rate was identical across widths, and the average edge was just smooth monotonicity (wider =
closer to HODL), with no interior maximum. Second, the daily reports show positions staying in the
SZEROKI (wide) posture because the flat detector's entry condition (EMA gap < 2.0%, confirmed for
12h) was often not met. The chunks do not explicitly explain why the product stayed wide overall, so
this is an inference from the evidence.

coverage: partial
citations (4/4 verified):
  journal/CONTEXT.md:1332-1334
    "WALKFORWARD IDLE-WIDTH ODEBRANY (CC-Win, obie pule 720d, ekspresowo) — WERDYKT: maksimum z
    fullperiodu to ARTEFAKT, produktowe ±40/±50 ZOSTAJĄ."
  journal/CONTEXT.md:1335-1337
    "win-rate IDENTYCZNE na wszystkich szerokościach (cbBTC 63%, base-030 57–60%— to samo okno
    wygrywa/przegrywa niezależnie od pasma)"
  journal/reports/morning-2026-09-13.md:280
    "— poza progiem (potrzeba < 2.0%)"
  journal/reports/morning-2026-09-13.md:285
    "Progi detektora flatu z żywego state: wejście gap < 2.0%, potwierdzenie 12h."

10 chunks given; answer:claude-sonnet-5-5(effort=medium); 8468 in / 592 out tokens, $0.0229, 5.6 s;
+1 query translation call
```

## (b) A backtest file

```
step 1 (turn with tools): 1 tool call(s); 4 in + 2613 cache read + 117 cache write, 31 out; $0.0011; 1.5 s
   list_backtest_configs {} -> ok, 2940 chars, 3 ms
step 2 (turn with tools): 1 tool call(s); 2 in + 2730 cache read + 1840 cache write, 58 out; $0.0057; 1.3 s
   read_backtest_results {"name":"e8-timing-30d"} -> ok, 3491 chars, 18 ms
step 3 (turn with tools): 1 tool call(s); 2 in + 4570 cache read + 2052 cache write, 105 out; $0.0071; 1.8 s
   read_backtest_results {"name":"e8-timing-30d","path":["byStrat","Pasywny ±50%","WSZYSTKIE"]} -> ok, 2207 chars, 6 ms
step 4 (turn with tools): 1 tool call(s); 2 in + 6622 cache read + 1148 cache write, 52 out; $0.0047; 1.4 s
   search_journal {"query":"e8-timing"} -> 10 chunks, 29869 chars, 5411 ms, $0.0044 inside the tool
step 5 (turn with tools): 1 tool call(s); 2 in + 7770 cache read + 17695 cache write, 84 out; $0.0466; 1.9 s
   search_journal {"query":"E8.3 timing Pasywny ±50% WSZYSTKIE średnia %wygr 189 okien"} -> 10 chunks, 29254 chars, 2386 ms, $0.0013 inside the tool
step 6 (turn with tools): 1 tool call(s); 2 in + 25465 cache read + 17460 cache write, 83 out; $0.0496; 1.8 s
   search_journal {"query":"Pasywny ±50% WSZYSTKIE 189 okien -0.71 62% timing DVOL"} -> 10 chunks, 30409 chars, 4180 ms, $0.0040 inside the tool
step 7 (turn with tools): 1 tool call(s); 2 in + 42925 cache read + 18104 cache write, 29 out; $0.0541; 1.5 s
   read_decision_log {} -> ok, 7262 chars, 1 ms
step 8 (turn with tools): 1 tool call(s); 2 in + 61029 cache read + 2998 cache write, 120 out; $0.0209; 2.0 s
   search_journal {"query":"E8.3 189 okien 30d 4 pule 720d"} -> 10 chunks, 29831 chars, 2811 ms, $0.0010 inside the tool
step 9 (final turn, no tools): answer; 4 in + 64027 cache read + 17503 cache write, 501 out; $0.0616; 5.1 s

In the volatility timing experiment (e8-timing-30d), the passive ±50% strategy over all windows
("WSZYSTKIE") had a mean of −0.71 percentage points versus HODL 50/50 per window. Its win rate was
62.4%, and it covered 189 windows. The 189 comes from 4 pools with 30-day windows, split 47, 47, 48
and 47. The journal also gives 189 windows of 30 days. The mean was negative in all four pools, so
no pool had a positive mean. The median was +0.53.

coverage: full; status: spend-cap
citations (1/1 verified):
  journal/CONTEXT.md:621
    "ODBIÓR E8.3 (CC-Win, 68e51eb, 4 pule 720d, 189 okien 30d)"
backtest numbers (3/4 verified):
  [FAIL] -0.71 = e8-timing-30d ["byStrat","Pasywny ±50%","WSZYSTKIE","mean"]; NOT-IN-ANSWER
  [ok] 62.4 = e8-timing-30d ["byStrat","Pasywny ±50%","WSZYSTKIE","winPct"]; stored
  62.43386243386243
  [ok] 189 = e8-timing-30d ["byStrat","Pasywny ±50%","WSZYSTKIE","windows"]; stored 189
  [ok] 0.53 = e8-timing-30d ["byStrat","Pasywny ±50%","WSZYSTKIE","med"]; stored 0.5271251764482621
numbers in the answer with no quote or reference: 50, 0.71, 50, 50, 47, 47, 48, 47

9 model turns, 8 tool calls; agent:claude-sonnet-5-5(effort=medium); tokens 22 in, 217751 cache
read, 78917 cache write, 1063 out; cost $0.2622 (model $0.2515, inside tools $0.0106; cap $0.5);
33.2 s
```

## (c) Journal and a backtest file

```
step 1 (turn with tools): 2 tool call(s); 4 in + 2613 cache read + 127 cache write, 94 out; $0.0018; 2.7 s
   list_backtest_configs {} -> ok, 2940 chars, 3 ms
   search_journal {"query":"gate at least two regimes walk-forward passive ±50%"} -> 10 chunks, 21924 chars, 2341 ms, $0.0012 inside the tool
step 2 (turn with tools): 1 tool call(s); 2 in + 2740 cache read + 14788 cache write, 71 out; $0.0382; 1.3 s
   read_backtest_results {"name":"walkforward-base-weth-usdc-005-365d-45d"} -> ok, 10116 chars, 3 ms
step 3 (turn with tools): 1 tool call(s); 2 in + 17528 cache read + 5017 cache write, 153 out; $0.0176; 1.6 s
   read_backtest_results {"name":"walkforward-base-weth-usdc-005-365d-45d-kanon","path":["summary","Pasywny ±50%"]} -> ok, 2179 chars, 4 ms
step 4 (turn with tools): 1 tool call(s); 2 in + 22545 cache read + 1098 cache write, 107 out; $0.0083; 1.3 s
   read_backtest_results {"name":"walkforward-base-weth-usdc-005-365d-45d","path":["summary","Pasywny ±50%"]} -> error: path item 1 "Pasywny ±50%" is not a key at ["summary"]; keys there: Adaptacyjna k=3 h=24h payback≤7d, Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema), Adapt k=3 + hedge(full,HL7d,5%), Adapt k=3 + hedge(excess,HL7d,5%), Adapt k=3 + hedge(excess,HL7d,5%,re>ema), 256 chars, 1 ms
step 5 (turn with tools): 1 tool call(s); 2 in + 23643 cache read + 283 cache write, 48 out; $0.0059; 1.2 s
   read_decision_log {} -> ok, 7262 chars, 1 ms
step 6 (turn with tools): 1 tool call(s); 2 in + 23926 cache read + 3017 cache write, 77 out; $0.0131; 1.3 s
   search_journal {"query":"bramka ≥2 reżimy pasywny ±50% base-005 45d up flat down"} -> 10 chunks, 27610 chars, 3832 ms, $0.0034 inside the tool
step 7 (turn with tools): 1 tool call(s); 2 in + 26943 cache read + 16364 cache write, 283 out; $0.0491; 2.8 s
   read_backtest_results {"name":"walkforward-base-weth-usdc-005-365d-45d-kanon","path":["id"]} -> ok, 1496 chars, 3 ms
step 8 (turn with tools): 1 tool call(s); 2 in + 43307 cache read + 875 cache write, 64 out; $0.0115; 1.3 s
   search_journal {"query":"Defined before the strategies so it cannot be tuned"} -> 10 chunks, 18796 chars, 3822 ms, $0.0013 inside the tool
step 9 (turn with tools): 1 tool call(s); 2 in + 44182 cache read + 9487 cache write, 50 out; $0.0331; 1.4 s
   search_journal {"query":"dummy"} -> 10 chunks, 29570 chars, 2429 ms, $0.0007 inside the tool
step 10 (final turn, no tools): answer; 4 in + 53669 cache read + 17033 cache write, 919 out; $0.0625; 7.0 s

Yes. In the canonical 45-day walk-forward (22 windows, 45-day windows every 15 days) on Base
WETH/USDC 0.05%, passive ±50% beat HODL 50/50 in 100% of up windows (4) and 100% of flat windows
(8). It won only 40% of down windows (10). That is two regimes, so it meets the project's "≥2
regimes" gate. Overall it won 72.73% of windows, but its worst window was -10.69. That fails the
separate soundness criterion (win rate ≥65 and worst > -3). The gate was therefore met only through
the up and flat regimes. The non-canonical 45-day file has no passive ±50% row, so I used the
canonical rerun.

Why the gate exists: it was set on 10 Aug as the condition for backtesting before any deployment.
The stated rationale is that it was "Defined before the strategies so it cannot be tuned to them."
The journal's 11 Aug regime analysis, on a different pool (base-030), also found the gate passed on
up and flat. It later noted that the 720-day window flattered passive less.

coverage: full; status: step-limit
citations (3/3 verified):
  docs/DECISION-LOG.md:11
    "Gate: a strategy must beat HODL 50/50 in ≥ 2 market regimes."
  docs/DECISION-LOG.md:11
    "Defined before the strategies so it cannot be tuned to them."
  journal/RESEARCH-QUEUE.md:130-131
    "Bramka PLAN.md (≥2 reżimy):
    adapt k3h24 i pasywny±50 PRZECHODZĄ (up+flat)."
backtest numbers (5/5 verified):
  [ok] 100 = walkforward-base-weth-usdc-005-365d-45d-kanon ["summary","Pasywny
  ±50%","byRegime","up","winPct"]; stored 100
  [ok] 100 = walkforward-base-weth-usdc-005-365d-45d-kanon ["summary","Pasywny
  ±50%","byRegime","flat","winPct"]; stored 100
  [ok] 40 = walkforward-base-weth-usdc-005-365d-45d-kanon ["summary","Pasywny
  ±50%","byRegime","down","winPct"]; stored 40
  [ok] 72.73 = walkforward-base-weth-usdc-005-365d-45d-kanon ["summary","Pasywny ±50%","winPct"];
  stored 72.72727272727273
  [ok] -10.69 = walkforward-base-weth-usdc-005-365d-45d-kanon ["summary","Pasywny ±50%","worst"];
  stored -10.690182485684563
numbers in the answer with no quote or reference: 45, 22, 45, 15, 0.05, 8, 10, 65, 45, 10, 11, 030,
720

10 model turns, 10 tool calls; agent:claude-sonnet-5-5(effort=medium); tokens 24 in, 261096 cache
read, 68089 cache write, 1866 out; cost $0.2477 (model $0.2411, inside tools $0.0066; cap $0.5);
34.5 s
```
