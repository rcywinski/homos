"""Smoke test for the reranker service. Run on the box or from the Mac:

    python smoke.py http://127.0.0.1:11435

Checks /health and that, for an English question, the relevant Polish passage outranks an unrelated one.
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

question = "Why was the narrow range on cbBTC/WETH not used again after September?"
documents = [
    "Raport poranny: świeżość danych universe.json 2.0h, pipeline bez porażek.",
    "DECYZJA: NIE podpisujemy karty FLAT_NARROW. Asymetria: najlepszy scenariusz ~+$1, "
    "wypadnięcie z ±5% −$25…45 (epizod 31.08→11.09: −$32 vs HODL).",
    "Paper trading: 3 rebalanse odpalone rano dały netto tylko +$69/+$93/+$87.",
]
res = call("/rerank", {"query": question, "documents": documents})
print("rerank:", json.dumps(res, ensure_ascii=False))

ok = (
    len(res["scores"]) == len(documents)
    and len(res["truncated"]) == len(documents)
    and max(range(len(documents)), key=lambda i: res["scores"][i]) == 1
)
print("OK" if ok else "FAIL: the relevant passage (index 1) is not ranked first")
sys.exit(0 if ok else 1)
