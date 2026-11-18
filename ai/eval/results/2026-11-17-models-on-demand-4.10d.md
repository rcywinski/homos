# Step 4.10d: models on demand, measured on the box (17 Nov 2026)

Run by CC-Win as `cywil` from `C:\HomosServe\homos` at `c926243`, owner's go, full run including the optional hour.
Server log times are UTC, measurement times local (UTC+1). Raw files stay on the box under `C:\HomosServe\`:
`measure-4.10d.txt` (SHA-256 `479B2F91...FAF7`), `lan-run-golden-4.10d.json` (`51281479...D54A`),
`lan-run-examples-4.10d.json` (`BD74C801...1A9B`), `server-4.10d.log`, `batch-golden-4.10d.log`.

## Load and release times (server log)

| Event | Time |
|---|---|
| Load to ready, first | generator 21.7 s, embedder 2.6 s, check 0.0 s |
| Load to ready, second | generator 15.6 s, embedder 2.6 s, check 0.1 s |
| Idle release, 15 min 1 s after the last question | 1.2 s, and 0.9 s the second time |
| Switch off 8 s into a load | load aborted at the generator stage; released in 30.0 s (the watch for a late model) |

Typical times shipped as defaults (`ai/serve/config.ts`): generator 21 s (median of the five generator loads of steps
4.8j to 4.10d: 15.6, 20.9, 21.0, 21.0, 21.7 s), embedder 2.6 s, check 0.2 s; the page says "about 24 s".

**A model that appears after an abort.** With Ollama 0.40.15 on Windows it did not happen: `ollama ps` polled every
5 s for 60 s after the switch went off never listed qwen3.8:27b, and no llama-server process was left. Ollama's own
log shows why: "client connection closed before llama-server finished loading, aborting load", then "Load failed ...
context canceled", 0.7 s after the server dropped the request. The 30 s watch is kept as a safeguard for other
Ollama versions; its cost is 30 s of "unloading" after a switch-off during a load.

## Memory at fixed points

VRAM from `nvidia-smi`; commit is the system's committed bytes (limit 79.93 GB); per-process commit is private bytes.
Per-process VRAM is not available: under WDDM `--query-compute-apps` shows `[N/A]` for every process.

| Point | VRAM used (MiB) | Commit (GB) | qwen llama-server commit / ws (GB) | bge-m3 llama-server commit (GB) |
|---|---|---|---|---|
| M0 before the server starts | 4 127 | 21.58 | | |
| M1 server running, nothing loaded | 4 130 | 21.96 | | |
| M2 after the load | 24 004 | 45.35 | 21.32 / 1.42 | 1.99 |
| M3 after 34 questions | 24 054 | 53.58 | 29.35 / 9.19 | 2.15 |
| M4 after the idle release | 4 130 | 21.91 | | |
| M5 after the switch-off release | 4 130 | 21.96 | | |
| M6 about 16 min, after a second idle release | 4 130 | 21.92 | | |
| M7 about 60 min, server idle | 4 130 | 21.85 | | |

Other processes, steady across all points: the reranker (python, 5.9 GB commit), Ollama itself 0.07 GB, the chat
server (node) 0.2 to 0.3 GB.

**Findings.**
- The two models take about 19 900 MiB of VRAM (24 004 minus 4 130). With them loaded the card has 520 to 570 MiB
  free, as in 4.8.
- The 8 GB commit rise seen in 4.8 is the generator's llama-server process: its commit grows from 21.32 to 29.35 GB
  over 34 questions (working set from 1.42 to 9.19 GB). It is released with the model: after every release the
  system commit is back at 21.9 GB, the level before any load, and it stays there for an hour with the server idle.
- 4 127 MiB are in use with no model loaded: the reranker and the desktop session. Under WDDM the split cannot be read
  per process. The desktop runs several GPU clients (Steam, Epic Games Launcher, GOG Galaxy, the NVIDIA overlay,
  Copilot, LG Hub); closing them is the cheapest way to more headroom, for the owner to decide.
- The serving quality of this run matches 4.8j2 and 4.8j3: 29 answered, 5 "not in the data" (na-02 to na-06), 1 of 91
  quotes not verified, median 10.8 s.

## Changed after this run

- A load stopped by the switch told the visitor who started it "could not be loaded" (`load-failed`); it now answers
  with the switch-off text and gives the load back to the visitor's limit (unit test added).
- Typical stage times set from the measurements above.
