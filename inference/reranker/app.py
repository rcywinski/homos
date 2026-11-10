"""Reranker service for the HOMOS AI layer (step 1.6), contract in inference/README.md.

A cross-encoder (BAAI/bge-reranker-v2-m3) scores (query, document) pairs; the Mac sends the top 30 candidates
of hybrid search and reorders them by these scores.

Per request (body of POST /rerank, both optional, both echoed in the response):
  maxLength  tokens per pair, default 2048; the backbone (bge-m3) takes 8192, our chunks stay under ~1500
  device     "cuda" (default when available) or "cpu"; the CPU copy of the model is loaded on its first use,
             it exists to measure the GPU's contribution without restarting the service

Configuration (environment, read once at start):
  RERANK_MODEL       default BAAI/bge-reranker-v2-m3
  RERANK_BATCH_SIZE  default 16
  HF_HOME            where the model is cached (outside any user profile on the box)

Run: uvicorn app:app --host 0.0.0.0 --port 11435
"""

import os
import threading
import time

import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import CrossEncoder

MODEL_NAME = os.environ.get("RERANK_MODEL", "BAAI/bge-reranker-v2-m3")
BATCH_SIZE = int(os.environ.get("RERANK_BATCH_SIZE", "16"))
DEFAULT_DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
DEFAULT_MAX_LENGTH = 2048
MODEL_MAX_LENGTH = 8192  # bge-m3 backbone positions
MAX_DOCUMENTS = 100


def load(device: str) -> CrossEncoder:
    m = CrossEncoder(MODEL_NAME, device=device, max_length=DEFAULT_MAX_LENGTH)
    if device == "cuda":
        m.model.half()  # fp16 on the GPU: half the memory, faster; order unchanged (checked against fp32)
    m.model.eval()
    return m


models: dict[str, CrossEncoder] = {DEFAULT_DEVICE: load(DEFAULT_DEVICE)}
load_lock = threading.Lock()  # the CPU copy is loaded lazily; two first requests must not load it twice
run_locks = {"cuda": threading.Lock(), "cpu": threading.Lock()}  # one forward pass per device at a time

app = FastAPI(title="HOMOS reranker", version="1.1")


def get_model(device: str) -> CrossEncoder:
    if device not in models:
        with load_lock:
            if device not in models:
                models[device] = load(device)
    return models[device]


class RerankRequest(BaseModel):
    query: str
    documents: list[str]
    maxLength: int | None = None
    device: str | None = None


class RerankResponse(BaseModel):
    model: str
    device: str
    maxLength: int
    scores: list[float]
    truncated: list[bool]
    elapsedMs: float


def score(m: CrossEncoder, query: str, documents: list[str], max_length: int) -> tuple[list[float], list[bool]]:
    """Tokenise the pairs ourselves (so max_length is per request, with no shared state to mutate) and return
    the sigmoid of the logit, the same scale CrossEncoder.predict gives a single-label model by default."""
    lengths = [len(ids) for ids in m.tokenizer([query] * len(documents), documents, truncation=False)["input_ids"]]
    out: list[float] = []
    device = next(m.model.parameters()).device
    with torch.inference_mode():
        for i in range(0, len(documents), BATCH_SIZE):
            batch = documents[i : i + BATCH_SIZE]
            enc = m.tokenizer(
                [query] * len(batch), batch, truncation=True, max_length=max_length, padding=True, return_tensors="pt"
            ).to(device)
            logits = m.model(**enc).logits.view(-1).float()
            out.extend(torch.sigmoid(logits).tolist())
    return out, [n > max_length for n in lengths]


@app.get("/health")
def health() -> dict:
    return {
        "model": MODEL_NAME,
        "device": DEFAULT_DEVICE,
        "loadedDevices": sorted(models),
        "cudaAvailable": torch.cuda.is_available(),
        "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
        "maxLength": DEFAULT_MAX_LENGTH,
        "torch": torch.__version__,
    }


@app.post("/rerank", response_model=RerankResponse)
def rerank(req: RerankRequest) -> RerankResponse:
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="empty query")
    if not req.documents:
        raise HTTPException(status_code=400, detail="no documents")
    if len(req.documents) > MAX_DOCUMENTS:
        raise HTTPException(status_code=400, detail=f"at most {MAX_DOCUMENTS} documents per request")
    device = req.device or DEFAULT_DEVICE
    if device not in ("cuda", "cpu"):
        raise HTTPException(status_code=400, detail="device must be cuda or cpu")
    if device == "cuda" and not torch.cuda.is_available():
        raise HTTPException(status_code=400, detail="device cuda requested but CUDA is not available")
    max_length = req.maxLength or DEFAULT_MAX_LENGTH
    if not 16 <= max_length <= MODEL_MAX_LENGTH:
        raise HTTPException(status_code=400, detail=f"maxLength must be between 16 and {MODEL_MAX_LENGTH}")
    m = get_model(device)  # a first CPU request includes the model load; the client should send a warm-up call
    with run_locks[device]:
        t0 = time.perf_counter()
        scores, truncated = score(m, req.query, req.documents, max_length)
        elapsed = (time.perf_counter() - t0) * 1000
    return RerankResponse(
        model=MODEL_NAME,
        device=device,
        maxLength=max_length,
        scores=scores,
        truncated=truncated,
        elapsedMs=round(elapsed, 1),
    )
