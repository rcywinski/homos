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

- How Ollama is installed and started, and how it survives a reboot:
- Firewall rule name and subnets (subnet values may stay as placeholders in this public repo):
- How to check that it runs on the box itself:
- Ollama version and `bge-m3` model digest:
