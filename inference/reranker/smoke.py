"""Smoke test for the reranker service. Run on the box or from the Mac:

    python smoke.py http://127.0.0.1:11435

Checks /health and that the relevant document scores close to 1 and the others close to 0: one English pair,
one Polish pair from the journal and the same journal passage with an English question.
Exit code 0 on success.
"""

import json
import sys
import urllib.request

base = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:11435").rstrip("/")


def call(path: str, body: dict | None = None) -> dict:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(base + path, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)


health = call("/health")
print("health:", health)

# Scores are probabilities (sigmoid of the cross-encoder logit), so a healthy model puts the relevant document
# close to 1 and unrelated ones close to 0. Checking the score, not only the order, catches a service that ranks
# correctly by accident while the pair reaches the model wrongly.
JOURNAL = (
    "BUG KRYTYCZNY silnika backtestu naprawiony: unitPrices zakładał parę ETH/stable (nie-ETH-owa noga = $1). "
    "Dla par kwotowanych w WETH (cbBTC/WETH, WTAO/WETH) wszystkie dotychczasowe wyniki absolutne (APR/fees$/maxDD) "
    "były w bezsensownych jednostkach. Naprawa: PoolSpec.quote:'USD'|'WETH' + usdPerEth(block)."
)  # journal/CONTEXT.md, entry of 2026-08-11
CASES = [
    ("What is the capital of France?",
     ["Paris is the capital of France.", "The bot runs on a Windows machine.", "Berlin is the capital of Germany."]),
    ("Jaki błąd w wycenie par kwotowanych w WETH naprawiono w silniku backtestu?",
     ["Raport poranny: świeżość danych universe.json 2.0h, pipeline bez porażek.", JOURNAL,
      "Paper trading: 3 rebalanse odpalone rano dały netto tylko +$69/+$93/+$87."]),
    ("What bug in the pricing of WETH-quoted pairs was fixed in the backtest engine?",  # English question, Polish text
     ["Raport poranny: świeżość danych universe.json 2.0h, pipeline bez porażek.", JOURNAL,
      "Paper trading: 3 rebalanse odpalone rano dały netto tylko +$69/+$93/+$87."]),
]
RELEVANT = {0: 0, 1: 1, 2: 1}  # case -> index of the relevant document
MIN_RELEVANT, MAX_OTHER = 0.9, 0.1

ok = True
for i, (query, documents) in enumerate(CASES):
    res = call("/rerank", {"query": query, "documents": documents})
    print("rerank:", json.dumps(res, ensure_ascii=False))
    scores, rel = res["scores"], RELEVANT[i]
    if len(scores) != len(documents) or len(res["truncated"]) != len(documents):
        print(f"FAIL case {i}: wrong response length")
        ok = False
    elif scores[rel] < MIN_RELEVANT or any(s > MAX_OTHER for j, s in enumerate(scores) if j != rel):
        print(f"FAIL case {i}: relevant document scored {scores[rel]:.4f} (want >= {MIN_RELEVANT}), others must be <= {MAX_OTHER}")
        ok = False

print("OK" if ok else "FAIL")
sys.exit(0 if ok else 1)
