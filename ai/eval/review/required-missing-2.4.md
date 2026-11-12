# Required sources missing, step 2.4 (pooled, all variants)

5 answers of 90 missed at least one required source. No run, variant or judge verdict is shown. For each case: the requirement missed and the verified evidence the answer gave instead. Decide per chunk whether reading it shows it answers the question; only such chunks are added to the accepted set, for all variants at once.

## x-01: Revision v1.1 of 11 August reports the first full gate pass on base-005 with a 68% win rate and a worst window of -2.52%. Which saved result supports these numbers, and how did that strategy do in each market regime?

Accepted now: `docs/DECISION-LOG.md` or `docs/DECISION-LOG.md:15` or `journal/CONTEXT.md:89`; dataRefs: walkforward-base-weth-usdc-005-365d-45d-kanon ["summary","Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)","winPct"], ["summary","Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)","worst"]

### M01

Missed: dataRef walkforward-base-weth-usdc-005-365d-45d-kanon ["summary","Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)","winPct"]; dataRef walkforward-base-weth-usdc-005-365d-45d-kanon ["summary","Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)","worst"]

Verified citations given:

- `docs/DECISION-LOG.md:15` (docs/DECISION-LOG.md:15-15): "First full gate pass on base-005 (68 % win rate, worst window −2.52 %)."
- `docs/ALGORITHM.md:43` (docs/ALGORITHM.md:54-54): "base-005: +1.20 / 68% win rate / worst −2.52"

Verified dataRefs given:

- walkforward-base-weth-usdc-005-365d-45d ["summary","Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)","worst"] = -2.58
- walkforward-base-weth-usdc-005-365d-45d ["summary","Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)","mean"] = 1.16

### M02

Missed: citation of one of docs/DECISION-LOG.md, docs/DECISION-LOG.md:15, journal/CONTEXT.md:89

Verified citations given:

- `docs/ALGORITHM.md:43` (docs/ALGORITHM.md:54-55): "base-005: +1.20 / 68% win rate / worst −2.52 — **the first full pass of the gate win rate ≥65 ∧ worst >−3 in the project**"

Verified dataRefs given:

- walkforward-base-weth-usdc-005-365d-45d-kanon ["summary","Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)","winPct"] = 68.18
- walkforward-base-weth-usdc-005-365d-45d-kanon ["summary","Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)","worst"] = -2.52
- walkforward-base-weth-usdc-005-365d-45d-kanon ["summary","Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)","mean"] = 1.20
- walkforward-base-weth-usdc-005-365d-45d-kanon ["summary","Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)","byRegime","up","mean"] = 1.08
- walkforward-base-weth-usdc-005-365d-45d-kanon ["summary","Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)","byRegime","up","winPct"] = 50
- walkforward-base-weth-usdc-005-365d-45d-kanon ["summary","Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)","byRegime","up","worst"] = -2.52
- walkforward-base-weth-usdc-005-365d-45d-kanon ["summary","Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)","byRegime","down","mean"] = 0.66
- walkforward-base-weth-usdc-005-365d-45d-kanon ["summary","Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)","byRegime","down","winPct"] = 70
- walkforward-base-weth-usdc-005-365d-45d-kanon ["summary","Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)","byRegime","down","worst"] = -1.79
- walkforward-base-weth-usdc-005-365d-45d-kanon ["summary","Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)","byRegime","flat","mean"] = 1.94
- walkforward-base-weth-usdc-005-365d-45d-kanon ["summary","Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)","byRegime","flat","winPct"] = 75
- walkforward-base-weth-usdc-005-365d-45d-kanon ["summary","Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)","byRegime","flat","worst"] = -2.15

## x-02: On 26 August the validation gate moved to a 720-day window because no configuration passed on 720 days. In the saved 720-day walk-forward results for Base WETH/USDC 0.30%, Base cbBTC/WETH 0.05%, mainnet USDC/WETH 0.05% and Arbitrum WETH/USDC 0.05%, did passive ±50% meet the soundness criterion (win rate at least 65% and worst window above -3%) or the two-regime gate on any of them?

Accepted now: `docs/DECISION-LOG.md` or `docs/DECISION-LOG.md:22` or `journal/CONTEXT.md:96`; dataRefs: walkforward-base-weth-usdc-030-720d-30d ["summary","Pasywny ±50%","winPct"], ["summary","Pasywny ±50%","worst"]; walkforward-base-cbbtc-weth-005-720d-30d ["summary","Pasywny ±50%","winPct"], ["summary","Pasywny ±50%","worst"]; walkforward-mainnet-usdc-weth-005-720d-30d ["summary","Pasywny ±50%","winPct"], ["summary","Pasywny ±50%","worst"]; walkforward-arbitrum-weth-usdc-005-720d-30d ["summary","Pasywny ±50%","winPct"], ["summary","Pasywny ±50%","worst"]

### M03

Missed: citation of one of docs/DECISION-LOG.md, docs/DECISION-LOG.md:22, journal/CONTEXT.md:96

Verified citations given: none


Verified dataRefs given:

- walkforward-base-weth-usdc-030-720d-30d ["summary","Pasywny ±50%","winPct"] = 59.57
- walkforward-base-weth-usdc-030-720d-30d ["summary","Pasywny ±50%","worst"] = -11.70
- walkforward-base-weth-usdc-030-720d-30d ["summary","Pasywny ±50%","byRegime","up","winPct"] = 23.08
- walkforward-base-weth-usdc-030-720d-30d ["summary","Pasywny ±50%","byRegime","down","winPct"] = 40
- walkforward-base-weth-usdc-030-720d-30d ["summary","Pasywny ±50%","byRegime","flat","winPct"] = 100
- walkforward-base-cbbtc-weth-005-720d-30d ["summary","Pasywny ±50%","winPct"] = 63.83
- walkforward-base-cbbtc-weth-005-720d-30d ["summary","Pasywny ±50%","worst"] = -7.76
- walkforward-base-cbbtc-weth-005-720d-30d ["summary","Pasywny ±50%","byRegime","flat","winPct"] = 86.67
- walkforward-base-cbbtc-weth-005-720d-30d ["summary","Pasywny ±50%","byRegime","up","winPct"] = 0
- walkforward-base-cbbtc-weth-005-720d-30d ["summary","Pasywny ±50%","byRegime","down","winPct"] = 33.33
- walkforward-mainnet-usdc-weth-005-720d-30d ["summary","Pasywny ±50%","winPct"] = 60.42
- walkforward-mainnet-usdc-weth-005-720d-30d ["summary","Pasywny ±50%","worst"] = -11.81
- walkforward-mainnet-usdc-weth-005-720d-30d ["summary","Pasywny ±50%","byRegime","flat","winPct"] = 100
- walkforward-mainnet-usdc-weth-005-720d-30d ["summary","Pasywny ±50%","byRegime","up","winPct"] = 25
- walkforward-mainnet-usdc-weth-005-720d-30d ["summary","Pasywny ±50%","byRegime","down","winPct"] = 23.08
- walkforward-arbitrum-weth-usdc-005-720d-30d ["summary","Pasywny ±50%","winPct"] = 65.96
- walkforward-arbitrum-weth-usdc-005-720d-30d ["summary","Pasywny ±50%","worst"] = -12.00
- walkforward-arbitrum-weth-usdc-005-720d-30d ["summary","Pasywny ±50%","byRegime","flat","winPct"] = 100
- walkforward-arbitrum-weth-usdc-005-720d-30d ["summary","Pasywny ±50%","byRegime","up","winPct"] = 35.71
- walkforward-arbitrum-weth-usdc-005-720d-30d ["summary","Pasywny ±50%","byRegime","down","winPct"] = 50
- walkforward-arbitrum-weth-usdc-005-720d-30d ["summary","Pasywny ±50%","byRegime","down","med"] = 0.10
- walkforward-arbitrum-weth-usdc-005-720d-30d ["summary","Pasywny ±50%","byRegime","down","mean"] = -2.26

### M04

Missed: citation of one of docs/DECISION-LOG.md, docs/DECISION-LOG.md:22, journal/CONTEXT.md:96

Verified citations given:

- `legend:walkforward-base-weth-usdc-030-720d-30d` (ai/agent/legend.ts:34-34): "a strategy is sound with winPct >= 65 and worst > -3; the project gate (PLAN.md): it must win in at least 2 regimes."
- `journal/CONTEXT.md:2178#p3` (journal/CONTEXT.md:2264-2265): "ZERO wariantów przez pełną bramkę (zawsze pada "≥2 reżimy" — wygrane tylko FLAT)"

Verified dataRefs given:

- walkforward-base-weth-usdc-030-720d-30d ["summary","Pasywny ±50%","winPct"] = 59.57
- walkforward-base-weth-usdc-030-720d-30d ["summary","Pasywny ±50%","worst"] = -11.70
- walkforward-base-cbbtc-weth-005-720d-30d ["summary","Pasywny ±50%","winPct"] = 63.83
- walkforward-base-cbbtc-weth-005-720d-30d ["summary","Pasywny ±50%","worst"] = -7.76
- walkforward-mainnet-usdc-weth-005-720d-30d ["summary","Pasywny ±50%","winPct"] = 60.42
- walkforward-mainnet-usdc-weth-005-720d-30d ["summary","Pasywny ±50%","worst"] = -11.81
- walkforward-arbitrum-weth-usdc-005-720d-30d ["summary","Pasywny ±50%","winPct"] = 65.96
- walkforward-arbitrum-weth-usdc-005-720d-30d ["summary","Pasywny ±50%","worst"] = -12.00
- walkforward-base-weth-usdc-030-720d-30d ["summary","Pasywny ±50%","byRegime","flat","winPct"] = 100
- walkforward-base-cbbtc-weth-005-720d-30d ["summary","Pasywny ±50%","byRegime","flat","winPct"] = 86.7
- walkforward-base-cbbtc-weth-005-720d-30d ["summary","Pasywny ±50%","byRegime","up","winPct"] = 0
- walkforward-arbitrum-weth-usdc-005-720d-30d ["summary","Pasywny ±50%","byRegime","down","winPct"] = 50

### M05

Missed: citation of one of docs/DECISION-LOG.md, docs/DECISION-LOG.md:22, journal/CONTEXT.md:96

Verified citations given:

- `legend:walkforward-base-weth-usdc-030-720d-30d` (ai/agent/legend.ts:34-34): "a strategy is sound with winPct >= 65 and worst > -3; the project gate (PLAN.md): it must win in at least 2 regimes."

Verified dataRefs given:

- walkforward-base-weth-usdc-030-720d-30d ["summary","Pasywny ±50%","winPct"] = 59.57
- walkforward-base-weth-usdc-030-720d-30d ["summary","Pasywny ±50%","worst"] = -11.70
- walkforward-base-weth-usdc-030-720d-30d ["summary","Pasywny ±50%","byRegime","up","winPct"] = 23.08
- walkforward-base-weth-usdc-030-720d-30d ["summary","Pasywny ±50%","byRegime","down","winPct"] = 40
- walkforward-base-weth-usdc-030-720d-30d ["summary","Pasywny ±50%","byRegime","flat","winPct"] = 100
- walkforward-base-cbbtc-weth-005-720d-30d ["summary","Pasywny ±50%","winPct"] = 63.83
- walkforward-base-cbbtc-weth-005-720d-30d ["summary","Pasywny ±50%","worst"] = -7.76
- walkforward-base-cbbtc-weth-005-720d-30d ["summary","Pasywny ±50%","byRegime","up","winPct"] = 0
- walkforward-base-cbbtc-weth-005-720d-30d ["summary","Pasywny ±50%","byRegime","down","winPct"] = 33.33
- walkforward-base-cbbtc-weth-005-720d-30d ["summary","Pasywny ±50%","byRegime","flat","winPct"] = 86.67
- walkforward-mainnet-usdc-weth-005-720d-30d ["summary","Pasywny ±50%","winPct"] = 60.42
- walkforward-mainnet-usdc-weth-005-720d-30d ["summary","Pasywny ±50%","worst"] = -11.81
- walkforward-mainnet-usdc-weth-005-720d-30d ["summary","Pasywny ±50%","byRegime","up","winPct"] = 25
- walkforward-mainnet-usdc-weth-005-720d-30d ["summary","Pasywny ±50%","byRegime","down","winPct"] = 23.08
- walkforward-mainnet-usdc-weth-005-720d-30d ["summary","Pasywny ±50%","byRegime","flat","winPct"] = 100
- walkforward-arbitrum-weth-usdc-005-720d-30d ["summary","Pasywny ±50%","winPct"] = 65.96
- walkforward-arbitrum-weth-usdc-005-720d-30d ["summary","Pasywny ±50%","worst"] = -12.00
- walkforward-arbitrum-weth-usdc-005-720d-30d ["summary","Pasywny ±50%","byRegime","up","winPct"] = 35.71
- walkforward-arbitrum-weth-usdc-005-720d-30d ["summary","Pasywny ±50%","byRegime","down","winPct"] = 50
- walkforward-arbitrum-weth-usdc-005-720d-30d ["summary","Pasywny ±50%","byRegime","flat","winPct"] = 100
