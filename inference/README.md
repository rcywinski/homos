# inference/: the local inference box

The former bot server (Windows, RTX 3090 24 GB, on 24/7, LAN `192.168.1.8`) serves models to the AI layer in `ai/`
over HTTP on the LAN. The Mac never runs models itself; it only calls the endpoints below through small interfaces
(`Embedder`, `Reranker`), so the box can be swapped for a cloud API or mocked in tests.

Roles (see `CLAUDE.md`, "Sessions and coordination"): CC-Mac writes this contract and the client code;
CC-Win installs and operates what runs on the box and fills in the "Operations" section. If the contract has to change,
CC-Win asks CC-Mac, who updates this file first.

## The box at a glance

The Windows machine that ran the bot (RTX 3090 24 GB, LAN `192.168.1.8`) was repurposed in Nov 2026 as the local
inference server for the AI layer. The bot services are no longer running. (This section was moved here from
`docs/INFRA.md` on 10 Nov 2026: documents about the AI layer stay out of the retrieval corpus, see `CLAUDE.md`.)

| Service | Port | Mac config | Started by |
|---|---|---|---|
| Ollama, embedding model `bge-m3` (`POST /api/embed`, 1024-dimension vectors) | 11434 | `INFERENCE_URL` | task `HOMOS inference (Ollama)` |
| Reranker `bge-reranker-v2-m3` (`POST /rerank`, step 1.6) | 11435 | `RERANK_URL` | task `HOMOS reranker` |

- Same network boundary as the old bot API: one Windows Firewall rule per port admits only the LAN and VPN subnets,
  with no port forwarding on the router. Neither service has authentication, so these rules are the only boundary.
- Both tasks run as `SYSTEM` at startup, so the services need no desktop login.

### Reboot test without login

The 9 Nov 2026 check (embed call answered while the box showed the login screen) does not prove a login-free start:
an RDP session reconnected 6 s before Ollama started, so a logged-in user was present. It is replaced by this test.

10 Nov 2026, box rebooted, nobody logged in. Calls from the Mac (CET):

| Time | Call | Result |
|---|---|---|
| 10:38:08 | `POST /api/embed` on 11434 | HTTP 200, 1024-dimension vector |
| 10:38:08 | `GET /health` on 11435 | no answer within 10 s (service still starting) |
| 10:38:42 | `GET /health` on 11435 | HTTP 200, `device cuda`, RTX 3090; next calls 5 to 24 ms |

Box side (CC-Win, from the box logs, box clock CET):

| Time | Event |
|---|---|
| 10:37:32 | boot |
| 10:37:46 | both tasks started, as `SYSTEM` |
| 10:37:51 | both service processes created |
| 10:37:52 | Ollama listening on 11434 |
| 10:38:25 | reranker listening on 11435 (34 s after process start on this cold boot; 10 to 11 s on a warm restart) |
| 10:41:04 | first logon (RDP from 192.168.1.147); no earlier session or reconnect |

So both services started and answered the Mac with nobody logged in. The reranker's own log has no timestamps; its
listening time comes from the box's connection records. The Mac's 10:38:08 timeout on 11435 fits: the model was still
loading.

## Contract: what the Mac expects (step 0.3)

| Item | Expected value |
|---|---|
| Server | Ollama, native Windows install, using the GPU |
| Address | `http://192.168.1.8:11434` (LAN) and the same port on the box's VPN address |
| Mac config | `INFERENCE_URL` in `.env`, base URL without a trailing slash |
| Embedding model | `bge-m3` (multilingual, Polish and English, 1024 dimensions; **2048 tokens per input in practice**, see below) |
| Endpoint | `POST /api/embed` |
| Availability | starts by itself after a reboot, without anyone logging in to the desktop |
| Exposure | LAN and VPN subnets only, never the public internet |

### Request and response

The Mac sends batches of texts (up to 32 per request) and expects one vector per input, in the same order.

```http
POST /api/embed
Content-Type: application/json

{ "model": "bge-m3", "input": ["Dlaczego zakres cbBTC zawężono 31 sierpnia?", "Why was the cbBTC range narrowed on 31 August?"] }
```

```json
{ "model": "bge-m3", "embeddings": [[0.012, -0.034, "... 1024 numbers"], ["... 1024 numbers"]] }
```

The client checks: HTTP 200, `embeddings.length === input.length`, every vector has 1024 numbers.
Any other answer is an error and the batch is retried with a timeout.

**`LocalEmbedder` sends no `options` at all.** Ollama restarts the model runner whenever the request `options`
differ from the loaded ones, and `num_ctx` is the one that matters here. Setting it gains nothing anyway: see
"Input length" below, the server takes at most 2048 tokens per input with or without it. Measured from the
Mac on 9 Nov 2026 with the model warm in VRAM:

| Request | Time |
|---|---|
| same body repeated | 0.02 to 0.12 s |
| 2, 3 or 8 inputs, no `options` | 0.02 to 0.09 s (batch size alone does not reload) |
| first call with `"options": {"num_ctx": 4096}` | 9.5 s (reload) |
| same call again | 0.02 s |
| back to no `options` | 3.2 s (reload again) |

CC-Win measured the same effect on the box at 1.5 to 5 s per `num_ctx` change. Either way a client that varied
`num_ctx` per batch would pay a reload on almost every call. A top-level `keep_alive` is not an option and does not
cause a reload, so indexing runs may send it (see "Behaviour the client should expect").

### Input length: 2048 tokens, and `truncate: false`

The model metadata says `bert.context_length 8192`, but this Ollama build embeds at most **2048 tokens per input**.
Measured from the Mac on 9 Nov 2026 with `prompt_eval_count` from the response:

| Input | Tokens counted |
|---|---|
| 3000 characters of a morning report | 1441 |
| 6000 characters | 2048 (cut) |
| 12000 characters | 2048 (cut) |
| 12000 characters with `"options": {"num_ctx": 8192}` | 2048 (cut) |
| 12000 characters with `"truncate": false` | HTTP 413 `the input length exceeds the context length` |

By default the cut is silent: the vector then describes only the first ~2048 tokens of the text. So:

- the chunker (`ai/corpus/tokens.ts`) keeps every chunk under 2048 real tokens (checked over all chunks: max 1444);
- `LocalEmbedder` always sends `"truncate": false` at the top level of the body (it is not an `option`, so it
  does not reload the model), and treats HTTP 413 as a bug in chunking, never retries it.

### Network exposure

Ollama listens on `127.0.0.1` by default. To reach it from the Mac it must listen on the LAN:

- system environment variable `OLLAMA_HOST=0.0.0.0:11434`, then restart Ollama;
- a Windows Firewall rule for TCP 11434 limited to the LAN and VPN subnets, same pattern as the old bot API
  (`deploy/setup-windows.md`, section 7), for example:

```powershell
# Run as Administrator. Use the same subnets as the old "HOMOS API (LAN+VPN only)" rule.
New-NetFirewallRule -DisplayName "HOMOS inference (LAN+VPN only)" `
  -Direction Inbound -Protocol TCP -LocalPort 11434 `
  -RemoteAddress <lan-subnet>,<vpn-subnet> `
  -Action Allow
```

Important difference from the old bot API: Ollama has no authentication at all, there is no equivalent of `BOT_API_TOKEN`.
The firewall rule is the only boundary, so it must not be widened and the router must not forward port 11434.
The box serves only public models and holds no secrets, which is why this is acceptable on a home LAN.

### Check from the Mac (verification of step 0.3)

```bash
source .env
curl -s "$INFERENCE_URL/api/embed" \
  -d '{"model":"bge-m3","input":["Dlaczego zakres został zawężony?","Why was the range narrowed?"]}' \
  | python3 -c 'import json,sys; e=json.load(sys.stdin)["embeddings"]; print(len(e), [len(v) for v in e])'
# expected: 2 [1024, 1024]
```

## Reranker (step 1.6): contract

A second service on the same box: a cross-encoder that scores (question, chunk) pairs. The Mac sends the top 30
candidates of hybrid search and reorders them. Code: `inference/reranker/` (`app.py`, `requirements.txt`, `smoke.py`).
Written by CC-Mac, deployed and operated by CC-Win.

| Item | Expected value |
|---|---|
| Server | Python 3.11 or 3.12, FastAPI + uvicorn, `sentence-transformers` `CrossEncoder`, GPU via CUDA |
| Model | `BAAI/bge-reranker-v2-m3` (568M parameters, backbone bge-m3, 8192-token positions; ~1.2 GB VRAM in fp16) |
| Address | `http://192.168.1.8:11435` (LAN) and port 11435 on the VPN address; Mac config `RERANK_URL` in `.env` |
| Endpoints | `GET /health`, `POST /rerank` |
| Availability | starts by itself after a reboot, without a desktop login (same requirement as Ollama) |
| Exposure | TCP 11435 limited to the LAN and VPN subnets, same pattern as the Ollama rule; no authentication |

### Request and response

```http
POST /rerank
Content-Type: application/json

{ "query": "Why was the narrow range not used again?", "documents": ["...chunk text...", "..."],
  "maxLength": 2048, "device": "cuda" }
```

```json
{ "model": "BAAI/bge-reranker-v2-m3", "device": "cuda", "maxLength": 2048,
  "scores": [0.9926, 0.00002], "truncated": [false, false], "elapsedMs": 65.7 }
```

- `scores` are in the order of `documents`; higher is more relevant. They are probabilities in (0, 1): the sigmoid of the
  cross-encoder logit, which sentence-transformers applies by default (an earlier version of this example showed raw
  logits, which was wrong). A clearly relevant document scores close to 1 (`smoke.py` asserts >= 0.9). Retrieval uses only
  the order. In fp16 on the GPU, low scores of different documents can come out identical; the client counts such ties.
- `maxLength` (16 to 8192, default 2048) and `device` (`cuda` default, or `cpu`) are optional and per request; both are
  echoed in the response. The CPU copy of the model is loaded on the first `cpu` request (the client sends a warm-up
  call first), so CPU and 1024-token measurements need no restart and no change on the box. `cuda` on a box without
  CUDA, or `maxLength` out of range, is HTTP 400.
- At most 100 documents per request; empty query or no documents is HTTP 400 (the client does not retry 4xx).
- `truncated[i]` is true when the pair is longer than `maxLength` tokens and its tail was cut. With the default 2048
  no pair of the current corpus should be cut (chunks stay under ~1500 tokens); the client counts truncated pairs.

### Configuration (environment variables of the service)

| Variable | Default | Purpose |
|---|---|---|
| `RERANK_BATCH_SIZE` | `16` | pairs per forward pass |
| `HF_HOME` | (set it) | model cache outside any user profile, e.g. `C:\ollama\hf` (the service runs as SYSTEM, like Ollama) |

### Install (CC-Win)

1. Python 3.12 (or 3.11) for all users; a venv in `inference\reranker\.venv` of the repo clone.
2. PyTorch with CUDA from the PyTorch index for the installed driver (617.14), e.g.
   `pip install torch --index-url https://download.pytorch.org/whl/cu124` (pick the CUDA build the index offers for this
   driver), then `pip install -r inference\reranker\requirements.txt`.
3. Start command (working directory `inference\reranker`):
   `.venv\Scripts\python.exe -m uvicorn app:app --host 0.0.0.0 --port 11435`.
   Run it at startup as SYSTEM without a login: a scheduled task like Ollama's or an NSSM service, CC-Win's choice;
   log to `C:\ollama\logs\reranker.log`. The first start downloads the model (~2.2 GB) into `HF_HOME`.
4. Firewall rule `HOMOS reranker (LAN+VPN only)`: inbound TCP 11435, remote addresses `<lan-subnet>,<vpn-subnet>`.
5. Check on the box: `python smoke.py http://127.0.0.1:11435` prints the health line and `OK`.
6. Fill in "Reranker operations" below and push only `inference/README.md` (code changes go through CC-Mac).

### Check from the Mac

```bash
source .env
curl -s "$RERANK_URL/health"
inference/reranker/.venv/bin/python inference/reranker/smoke.py "$RERANK_URL"   # or any python3: smoke.py uses only the stdlib
```

### Verified before handing over (CC-Mac, 9 Nov 2026)

The service was run once on the Mac's CPU (Intel, torch 2.2.2, transformers 4.49, sentence-transformers 3.4.1)
to check the API shape and `smoke.py`; see the step 1.6 commit. Latency on the Mac is not a measurement of the box.

## Local generator (step 1.11)

**Model:** `qwen3.8:27b` (Ollama digest `aaee06c39dcf`, 27.3B parameters, Q4_K_M, 16.52 GB on disk), approved by the
owner on 11 Nov 2026 and pulled by CC-Win the same day (download only; free disk on C: afterwards 419.6 GB).

Why this model: the newest dense model that fits next to the embedder and the reranker on the 24 GB card, a 256K
context window (we need about 16K for 10 chunks), Apache 2.0 licence, thinking mode that can be switched off per
request. Structured output is enforced by Ollama's `format` parameter with the answer JSON schema. Polish is not
named on the model card; the step measures it (quotes must be copied verbatim from Polish sources).

Rejected: Gemma 4 31B (19 to 20 GB of weights, too little room for the context); Mistral Small 3.2 24B (fits easily,
but over a year old). Gemma 4 26B-A4B (MoE, about 4B active parameters, Apache 2.0 since its release on 2 Apr 2026,
35+ languages per its card) stays a possible extra run, decided by the owner after the Qwen results.

**VRAM budget.** Reranker alone: 3582 MiB of 24576 MiB in use (11 Nov). bge-m3 adds about 0.7 to 1 GB while loaded
(5-minute keep_alive). The Mac unloads bge-m3 (`keep_alive: 0`) before loading the generator, loads the generator with
an explicit `num_ctx`, checks `/api/ps` that it is 100% on the GPU, and unloads it after the runs. Nothing on the box
changes; the model is loaded and unloaded per request from the Mac.

## Later

- **Local generator comparison** moved to step 1.11, see "Local generator (step 1.11)" above. Further models, if any, go into the same Ollama.

## Reranker operations (filled in by CC-Win in step 1.6)

### Layout on the box

| Path | What |
|---|---|
| `C:\Program Files\Python311\` | Python 3.11.9 for all users (python.org installer, signature checked), base of the venv |
| `C:\Projects\homos\inference\reranker\.venv\` | the service venv (gitignored) |
| `C:\ollama\hf\` | `HF_HOME`: Hugging Face cache with `BAAI/bge-reranker-v2-m3` (2.14 GB) |
| `C:\ollama\start-reranker.ps1` | launcher used by the startup task (content below) |
| `C:\ollama\logs\reranker.log` | uvicorn log, appended on every start |

Why Python 3.11 and not 3.12: the box already had a per-user Python 3.12.10 under the owner's profile. A venv only
points at its base interpreter, so a SYSTEM service built on it would depend on a user profile. 3.12.10 is the last
3.12 release with an installer, and running the same version's installer for all users only repairs the per-user
install, so 3.11 (allowed by the contract) was installed for all users instead.

### Install, as done on 10 Nov 2026 (as Administrator)

```powershell
# Python 3.11.9 for all users, no PATH change, no launcher
python-3.11.9-amd64.exe /quiet InstallAllUsers=1 PrependPath=0 Include_launcher=0 Include_test=0 Shortcuts=0 TargetDir="C:\Program Files\Python311"
cd C:\Projects\homos\inference\reranker
& 'C:\Program Files\Python311\python.exe' -m venv .venv
.venv\Scripts\python.exe -m pip install --upgrade pip
.venv\Scripts\python.exe -m pip install torch --index-url https://download.pytorch.org/whl/cu130   # newest CUDA build on the index; driver 617.14 supports CUDA 13.4
.venv\Scripts\python.exe -m pip install -r requirements.txt
# Model cache outside any user profile, downloaded once before the first start
[Environment]::SetEnvironmentVariable('HF_HOME', 'C:\ollama\hf', 'Machine')
$env:HF_HOME = 'C:\ollama\hf'
.venv\Scripts\python.exe -c "from huggingface_hub import snapshot_download; snapshot_download('BAAI/bge-reranker-v2-m3')"
```

### Start and reboot survival

Same pattern as Ollama: scheduled task `HOMOS reranker`, trigger "At startup", runs as `SYSTEM` (no desktop login
needed), no execution time limit, restarts every minute on failure (up to 999 times). Action:
`powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File C:\ollama\start-reranker.ps1`.
The service is ready about 11 s after the task starts (model load to the GPU).

`C:\ollama\start-reranker.ps1`:

```powershell
# Launcher for the "HOMOS reranker" scheduled task, runs as SYSTEM at boot.
# Reads HF_HOME from the machine environment on every start, because Task Scheduler
# keeps the environment it had at boot and would miss later changes.
$env:HF_HOME = [Environment]::GetEnvironmentVariable('HF_HOME', 'Machine')
# The model is already in HF_HOME: load it from the cache, never wait on the Hugging Face hub at boot.
$env:HF_HUB_OFFLINE = '1'
$env:HF_HUB_DISABLE_SYMLINKS_WARNING = '1'
New-Item -ItemType Directory -Force C:\ollama\logs | Out-Null
Set-Location C:\Projects\homos\inference\reranker
# Redirect in cmd, not PowerShell: PowerShell 5.1 wraps native stderr in error records.
cmd.exe /c '.venv\Scripts\python.exe -m uvicorn app:app --host 0.0.0.0 --port 11435 >> C:\ollama\logs\reranker.log 2>&1'
```

`RERANK_BATCH_SIZE` is not set, so the default (16) applies. Device and max length are per-request parameters
(see the contract), so the launcher never changes for a measurement.

The service reads `app.py` only at start. **After a `git pull` that changes `inference/reranker/`, restart the task**
(as Administrator); if `requirements.txt` changed, run the `pip install -r` line first:

```powershell
Stop-ScheduledTask -TaskName 'HOMOS reranker'
Get-CimInstance Win32_Process -Filter "Name='python.exe'" | Where-Object CommandLine -match 'uvicorn app:app' | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Start-ScheduledTask -TaskName 'HOMOS reranker'
```

(The venv's `python.exe` is a small launcher that starts the real `C:\Program Files\Python311\python.exe` as a
child process, so two `python.exe` processes per service are normal; stopping the task alone may leave the child.)

### Firewall

Rule `HOMOS reranker (LAN+VPN only)`: inbound, TCP 11435, allow, remote addresses `<lan-subnet>,<vpn-subnet>`
(the same two subnets as the Ollama rule). No program-based rule for `python.exe`; decline any Windows "allow access"
prompt for it, it would add a rule without the subnet limit.

### Versions (10 Nov 2026)

Python 3.11.9, torch `2.14.1+cu130` (CUDA 13.0 build), transformers 5.22.2, sentence-transformers 6.2.0,
fastapi 0.162.2, uvicorn 0.54.0, pydantic 2.14.3. Model snapshot `953dc6f6f85a1b2dbfca4c34a2796e7dde08d41e`.
Note: transformers and sentence-transformers are major versions newer than the Mac test (4.49 / 3.4.1); `app.py`
runs unchanged on them, see the smoke output below.

### Check on the box

```powershell
Get-ScheduledTask -TaskName 'HOMOS reranker'                              # State: Running
Get-NetTCPConnection -LocalPort 11435 -State Listen                       # LocalAddress 0.0.0.0
Invoke-RestMethod http://127.0.0.1:11435/health                           # device cuda, gpu RTX 3090
Get-NetFirewallRule -DisplayName 'HOMOS reranker (LAN+VPN only)'          # exists, Enabled True
cd C:\Projects\homos\inference\reranker; $env:PYTHONIOENCODING='utf-8'; .venv\Scripts\python.exe smoke.py http://127.0.0.1:11435
Get-Content C:\ollama\logs\reranker.log -Tail 20
```

### `smoke.py` output on the box (10 Nov 2026)

```
health: {'model': 'BAAI/bge-reranker-v2-m3', 'device': 'cuda', 'cudaAvailable': True, 'gpu': 'NVIDIA GeForce RTX 3090', 'maxLength': 2048, 'torch': '2.14.1+cu130'}
rerank: {"model": "BAAI/bge-reranker-v2-m3", "device": "cuda", "maxLength": 2048, "scores": [1.7778551409719512e-05, 7.254361844388768e-05, 1.9073577277595177e-05], "truncated": [false, false, false], "elapsedMs": 241.3}
OK
```

Same result through the LAN address (`smoke.py http://192.168.1.8:11435` prints `OK`).

### Behaviour the client should expect

- **Scores are probabilities in (0, 1), not raw logits** as in the contract example. sentence-transformers applies a
  sigmoid by default for a single-label cross-encoder. The order is the same either way (sigmoid is monotonic), so
  ranking is unaffected; any threshold must be on the 0 to 1 scale. Checked on the box: raw logits for the smoke
  passages are -10.94, -9.53, -10.87 in fp32 and -10.94, -9.53, -10.87 in fp16, so fp16 does not change the order.
- Latency with 30 real journal chunks (2000 characters each, none truncated), through the LAN address on the box:
  first call 630 ms, then about 310 ms per request (server `elapsedMs`). The model stays loaded, there is no idle
  unload as in Ollama.
- GPU memory in use with both services loaded: about 3.6 GB of 24 GB.

## Operations (filled in by CC-Win in step 0.3)

### Layout on the box

| Path | What |
|---|---|
| `C:\ollama\app\` | Ollama binaries (`winget install Ollama.Ollama --location C:\ollama\app`), outside any user profile |
| `C:\ollama\models\` | the only model store, shared by the server and the CLI |
| `C:\ollama\start-ollama.ps1` | launcher used by the startup task (content below) |
| `C:\ollama\logs\serve.log` | server log, appended on every start |

### Environment (system-wide, Machine scope)

| Variable | Value | Why |
|---|---|---|
| `OLLAMA_HOST` | `0.0.0.0:11434` | listen on all interfaces instead of `127.0.0.1`, so the Mac can reach it |
| `OLLAMA_MODELS` | `C:\ollama\models` | the server runs as SYSTEM; without this it would look for models under the SYSTEM profile, not under the user profile where a user-run server stores them |

Note that `ollama pull` is only a client: the running server downloads the model into its own `OLLAMA_MODELS`.
The shared path matters when a server is ever started by hand as the user (for example the tray app): it then sees
the same models instead of an empty store.

### Start and reboot survival

Ollama has no Windows service mode, so it runs as a scheduled task:

- Task `HOMOS inference (Ollama)`: trigger "At startup", runs as `SYSTEM` (no desktop login needed),
  no execution time limit, restarts every minute on failure (up to 999 times).
- Action: `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File C:\ollama\start-ollama.ps1`.
- The tray app autostart (`Ollama.lnk` in the user's Startup folder) was removed, so only one server owns port 11434.

### Tray app disabled, updates on purpose

The installer also ships a tray app (`ollama app.exe`). Even without a Startup shortcut it came back at the first
desktop login after the reboot (9 Nov 2026, started by Explorer, source not found) and then tried every second to start
its own server on 11434, failing with "address in use" against the SYSTEM task. It also runs an hourly self-updater,
which could replace binaries under the running server. It is therefore disabled by renaming it:
`C:\ollama\app\ollama app.exe` -> `C:\ollama\app\ollama app.exe.disabled`.

Updating Ollama is a deliberate step (as Administrator):

```powershell
Stop-ScheduledTask -TaskName 'HOMOS inference (Ollama)'
Get-Process ollama -ErrorAction SilentlyContinue | Stop-Process -Force
winget upgrade --id Ollama.Ollama -e --location C:\ollama\app
# The installer restores the tray app and its Startup shortcut: disable both again.
Get-Process 'ollama app' -ErrorAction SilentlyContinue | Stop-Process -Force
Remove-Item "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\Ollama.lnk" -ErrorAction SilentlyContinue
Get-Process ollama -ErrorAction SilentlyContinue | Stop-Process -Force   # the server the tray app may have started as the user
Remove-Item 'C:\ollama\app\ollama app.exe.disabled' -ErrorAction SilentlyContinue   # the old copy, or the rename fails
Rename-Item 'C:\ollama\app\ollama app.exe' 'ollama app.exe.disabled'
Start-ScheduledTask -TaskName 'HOMOS inference (Ollama)'
```

Then run the checks below and update the version line in "Versions".

`C:\ollama\start-ollama.ps1`:

```powershell
# Launcher for the "HOMOS inference (Ollama)" scheduled task, runs as SYSTEM at boot.
# Reads OLLAMA_* from the machine environment on every start, because Task Scheduler
# keeps the environment it had at boot and would miss later changes.
foreach ($name in 'OLLAMA_HOST', 'OLLAMA_MODELS') {
    Set-Item -Path "env:$name" -Value ([Environment]::GetEnvironmentVariable($name, 'Machine'))
}
New-Item -ItemType Directory -Force C:\ollama\logs | Out-Null
# Redirect in cmd, not PowerShell: PowerShell 5.1 wraps native stderr in error records.
cmd.exe /c '"C:\ollama\app\ollama.exe" serve >> C:\ollama\logs\serve.log 2>&1'
```

Restart by hand (as Administrator):

```powershell
Stop-ScheduledTask  -TaskName 'HOMOS inference (Ollama)'
Get-Process ollama -ErrorAction SilentlyContinue | Stop-Process -Force
Start-ScheduledTask -TaskName 'HOMOS inference (Ollama)'
```

### Firewall

Rule `HOMOS inference (LAN+VPN only)`: inbound, TCP 11434, allow, remote addresses `<lan-subnet>,<vpn-subnet>`
(the same two subnets as the old `HOMOS API (LAN+VPN only)` rule). The default inbound policy blocks everything else.
There is no program-based rule for `ollama.exe`; if Windows ever shows an "allow access" prompt for it, decline,
otherwise it adds a rule without the subnet limit.

### Check on the box

```powershell
Get-ScheduledTask -TaskName 'HOMOS inference (Ollama)'                    # State: Running
Get-NetTCPConnection -LocalPort 11434 -State Listen                       # LocalAddress :: (all interfaces)
Invoke-RestMethod http://127.0.0.1:11434/api/version                      # version
& C:\ollama\app\ollama.exe ps                                             # loaded models, PROCESSOR 100% GPU
Get-NetFirewallRule -DisplayName 'HOMOS inference (LAN+VPN only)'         # exists, Enabled True
Get-Content C:\ollama\logs\serve.log -Tail 20                             # look for "inference compute ... RTX 3090"
```

The CLI reads `OLLAMA_HOST`; `0.0.0.0` is a listen address, so in an interactive session set
`$env:OLLAMA_HOST = '127.0.0.1:11434'` first if `ollama list` cannot connect.

### Versions (9 Nov 2026)

- Ollama `0.40.15`, CUDA backend, RTX 3090 (24 GB), NVIDIA driver 617.14.
- `bge-m3:latest`, digest `7907646426070047a77226ac3e684fbbe8410524f7b4a74d02837e43f2146bab`, F16, 567M parameters, 1.2 GB on disk,
  about 0.7 GB VRAM when loaded.

### Behaviour the client should expect

- Ollama unloads an idle model after 5 minutes (default keep-alive). The first request after that loads it again:
  measured about 24 s for the very first call after install and about 7 s for a reload later. A warm batch of 32 short texts
  takes about 0.2 s. The client timeout should cover a cold start (30 s is safe).
- The client can override the unload timer per request with `keep_alive` in the body, for example
  `{ "model": "bge-m3", "input": [...], "keep_alive": "30m" }`. Note for CC-Mac: pass it during indexing runs so the model
  is not unloaded mid-run between batches; normal queries can leave it out and use the 5 minute default.
- First calls after a reboot (9 Nov 2026, Mac test): GPU discovery takes about 12 s after the server starts listening,
  so a request in that window waits; the Mac saw 13 s for the cold call (5.1 s of it on the server, mostly the model load).
  The next call took 5.2 s with no model load and about 50 ms of compute; this was a one-off right after boot and is not
  reproducible (the same call now takes 80 to 220 ms).
- Local smoke test on 9 Nov 2026: the Polish and English sentences from the Mac check returned `2 [1024, 1024]`,
  cosine similarity between the two vectors 0.894.
