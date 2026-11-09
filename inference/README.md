# inference/: the local inference box

The former bot server (Windows, RTX 3090 24 GB, on 24/7, LAN `192.168.1.8`) serves models to the AI layer in `ai/`
over HTTP on the LAN. The Mac never runs models itself; it only calls the endpoints below through small interfaces
(`Embedder`, later `Reranker`), so the box can be swapped for a cloud API or mocked in tests.

Roles (see `CLAUDE.md`, "Sessions and coordination"): CC-Mac writes this contract and the client code;
CC-Win installs and operates what runs on the box and fills in the "Operations" section. If the contract has to change,
CC-Win asks CC-Mac, who updates this file first.

## Contract: what the Mac expects (step 0.3)

| Item | Expected value |
|---|---|
| Server | Ollama, native Windows install, using the GPU |
| Address | `http://192.168.1.8:11434` (LAN) and the same port on the box's VPN address |
| Mac config | `INFERENCE_URL` in `.env`, base URL without a trailing slash |
| Embedding model | `bge-m3` (multilingual, Polish and English, 1024 dimensions, 8192 token context) |
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
differ from the loaded ones, and `num_ctx` is the one that matters here. Leaving it out gives `bge-m3` its maximum
context of 8192 tokens, which is what the chunker relies on, so there is nothing to gain by setting it. Measured from the
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

## Later (not part of 0.3)

- **Reranker, step 1.6.** A small Python service in this directory, run as a Windows service on its own port.
  CC-Mac will add its contract here before CC-Win installs it.
- **Local generator comparison, phase 3.** Extra models pulled into the same Ollama.

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
