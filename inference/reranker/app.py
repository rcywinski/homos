"""Reranker service for the HOMOS AI layer (step 1.6), contract in inference/README.md.

A cross-encoder (BAAI/bge-reranker-v2-m3) scores (query, document) pairs; the Mac sends the top 30 candidates
of hybrid search and reorders them by these scores.

Configuration (environment, read once at start):
  RERANK_MODEL       default BAAI/bge-reranker-v2-m3
  RERANK_DEVICE      cuda | cpu (default: cuda when available); cpu exists to measure the GPU's contribution
  RERANK_MAX_LENGTH  default 2048 tokens per pair; the backbone (bge-m3) takes 8192, our chunks stay under ~1500
  RERANK_BATCH_SIZE  default 16
  HF_HOME            where the model is cached (outside any user profile on the box)

Run: uvicorn app:app --host 0.0.0.0 --port 11435
"""

import os
import time

import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import CrossEncoder

MODEL_NAME = os.environ.get("RERANK_MODEL", "BAAI/bge-reranker-v2-m3")
DEVICE = os.environ.get("RERANK_DEVICE") or ("cuda" if torch.cuda.is_available() else "cpu")
MAX_LENGTH = int(os.environ.get("RERANK_MAX_LENGTH", "2048"))
BATCH_SIZE = int(os.environ.get("RERANK_BATCH_SIZE", "16"))
MAX_DOCUMENTS = 100

if DEVICE == "cuda" and not torch.cuda.is_available():
    raise RuntimeError("RERANK_DEVICE=cuda but CUDA is not available")

model = CrossEncoder(MODEL_NAME, device=DEVICE, max_length=MAX_LENGTH)
if DEVICE == "cuda":
    model.model.half()  # fp16 on the GPU: half the memory, faster, scores unchanged for ranking purposes

app = FastAPI(title="HOMOS reranker", version="1.0")


class RerankRequest(BaseModel):
    query: str
    documents: list[str]


class RerankResponse(BaseModel):
    model: str
    device: str
    maxLength: int
    scores: list[float]
    truncated: list[bool]
    elapsedMs: float


def pair_lengths(query: str, documents: list[str]) -> list[int]:
    """Token length of each (query, document) pair as the model sees it, special tokens included."""
    enc = model.tokenizer([query] * len(documents), documents, truncation=False, add_special_tokens=True)
    return [len(ids) for ids in enc["input_ids"]]


@app.get("/health")
def health() -> dict:
    return {
        "model": MODEL_NAME,
        "device": DEVICE,
        "cudaAvailable": torch.cuda.is_available(),
        "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
        "maxLength": MAX_LENGTH,
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
    t0 = time.perf_counter()
    truncated = [n > MAX_LENGTH for n in pair_lengths(req.query, req.documents)]
    with torch.inference_mode():
        # The model's default output; only the order matters. (The argument that switches the activation
        # was renamed between sentence-transformers versions, so it is deliberately not used.)
        scores = model.predict(
            [(req.query, d) for d in req.documents],
            batch_size=BATCH_SIZE,
            convert_to_numpy=True,
        )
    return RerankResponse(
        model=MODEL_NAME,
        device=DEVICE,
        maxLength=MAX_LENGTH,
        scores=[float(s) for s in scores],
        truncated=truncated,
        elapsedMs=round((time.perf_counter() - t0) * 1000, 1),
    )
