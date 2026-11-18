# Step 4.10e: the reranker on demand, measured on the box (18 Nov 2026)

Deployed by CC-Win at `e3f6e80` on the owner's go: a venv with CUDA torch at `C:\HomosServe\reranker-venv` (Python
3.11.9, torch 2.14.1+cu130, the same package versions as the evaluation venv), `SERVE_RERANKER=child`, the SYSTEM
task "HOMOS reranker" stopped and left without a trigger (on demand only, for evaluations).

## VRAM (nvidia-smi, of 24 576 MiB)

| Point | Used | Notes |
|---|---|---|
| M0, before: SYSTEM reranker running, nothing loaded | 4 177 MiB | the reranker held about 2.96 GB with its CUDA context |
| M1, after: nothing of the project running | 1 218 MiB | the desktop only; no python, no llama-server on the compute list |
| M2, full load (reranker, generator, bge-m3) | 23 972 MiB | spare 604 MiB (total minus used), 355 MiB by memory.free; both models 100% on the GPU |
| M3, after the release (switch off) | 1 218 MiB | equal to M1 |

So nothing of the project holds VRAM while idle or after a boot, which was the owner's requirement.

**Spare VRAM, two bases** (CC-Win, 18 Nov 2026). nvidia-smi's memory.free leaves out 250 MiB the driver reserves on
this card: total 24 576 = reserved 250 + used + free. On one basis: full load used 24 004 MiB in 4.10d and 23 972 MiB
here, so the spare is 572 then and 604 now as total minus used, or about 322 then and 355 now as memory.free. Nothing
grew. The 4.10d report and the "520 to 570 MiB" quoted since (step 4.8 review, the glossary) are total minus used;
this report gives both. Per-process VRAM cannot be read under WDDM, only totals.

If a load ever fails for lack of memory (another program on the owner's desktop holding VRAM), the visitor sees the
fixed text "The local model could not be loaded right now. Please try again later." and the load button after the
2-minute pause; the server log has the reason (torch's out-of-memory line from reranker.log, or the check finding a
model not fully on the GPU), and what was loaded is released.

## Times

| Stage | Time |
|---|---|
| Reranker, cold (first start after the change) | 16.0 s |
| Reranker, warm | 11.2 s |
| Generator (qwen3.8:27b) | 22.1 s |
| bge-m3 | 2.9 to 3.0 s |
| Full load, cold | 41.0 s |
| Search load (guest-key mode), warm | 14.3 s |
| Release (switch off) | 1.0 s |
| One rerank of 30 chunks on the GPU, median of 5 | 0.585 s |
| The same on the CPU, median | 41.4 s (first call 38.9 s, loading the CPU copy) |

Option (c), the reranker on the CPU, would add about 40 s to every question: rejected.

## The process set and the release

- The pid file held two pids: the venv launcher `Scripts\python.exe` (parent: the server's node) and the interpreter
  `Python311\python.exe` (parent: the launcher). nvidia-smi listed the interpreter, which is in the set: the review
  point of 18 Nov was right, and the tracked set covers it.
- Switch off: both pids gone, the pid file removed, port 11436 closed, nothing on the compute list, 1 218 MiB.
- A hard kill of the server with the search state loaded: the reranker died with node (no leftover to end); the
  restarted server released the bge-m3 it found; the reranker was gone 0.6 s and bge-m3 6.7 s after the kill.

## Consequences

- Evaluations from the Mac need `Start-ScheduledTask "HOMOS reranker"` on the owner's word and a stop afterwards; the
  Mac pre-flight (ai-layer 21c7f07) says so when it is off.
- The admin page shows "another reranker is running" while that task runs.
- Typical times on the page, set from these measurements as warm times (the usual case: the files are in the
  operating system's cache after the first load): reranker 11.5 s, generator 22 s, bge-m3 2.9 s, check 0.2 s, so
  "about 37 s" for a full load and "about 15 s" for a search load; the first load after the box restarts is cold,
  about 5 s longer (41.0 s measured), and the page says so.
