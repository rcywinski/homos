/**
 * fetch-swaps.ts — pobiera historię eventów Swap z pul Uniswap v3 do lokalnego cache.
 *
 * Uruchamianie (na maszynie z dostępem do sieci):
 *   npx tsx scripts/fetch-swaps.ts            # wszystkie pule z listy POOLS
 *   npx tsx scripts/fetch-swaps.ts base-weth-usdc-030   # jedna pula po id
 *
 * Wznawianie: skrypt trzyma stan w data/cache/<id>.state.json — przerwany
 * po prostu odpal ponownie, dociągnie od ostatniego bloku.
 * Wyjście: data/cache/<id>.ndjson (1 linia = 1 swap, format kompaktowy).
 */
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Konfiguracja pul do pobrania (PAIRS.md §5 — start: rdzeń porównania)
// ---------------------------------------------------------------------------
export interface PoolCfg {
  id: string;
  chain: 'mainnet' | 'base' | 'arbitrum' | 'optimism';
  address: string;
  feeBps: number; // 500 = 0.05%
  /** czy WETH/ETH-podobny token jest token0 (orientacja ceny) */
  ethIsToken0: boolean;
  token0Decimals: number;
  token1Decimals: number;
  days: number; // ile dni wstecz
}

export const POOLS: PoolCfg[] = [
  // (wpis testowy base-weth-usdc-030-hstest USUNIĘTY 18.08 — test HyperSync
  // dawno zaliczony [compare-caches zgodny]; zostawiony w POOLS blokował
  // dzienny pipeline 90-dniowym backfillem przez RPC. Pliki -hstest w
  // data/cache do skasowania na obu maszynach.)
  {
    id: 'mainnet-usdc-weth-005',
    chain: 'mainnet',
    address: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640',
    feeBps: 500, ethIsToken0: false, token0Decimals: 6, token1Decimals: 18, days: 90,
  },
  {
    id: 'mainnet-usdc-weth-030',
    chain: 'mainnet',
    address: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
    feeBps: 3000, ethIsToken0: false, token0Decimals: 6, token1Decimals: 18, days: 90,
  },
  {
    id: 'base-weth-usdc-030-365d',
    chain: 'base',
    address: '0x6c561B446416E1A00E8E93E221854d6eA4171372',
    feeBps: 3000, ethIsToken0: true, token0Decimals: 18, token1Decimals: 6, days: 365,
  },
  {
    id: 'base-weth-usdc-005',
    chain: 'base',
    address: '0xd0b53D9277642d899DF5C87A3966A349A798F224',
    feeBps: 500, ethIsToken0: true, token0Decimals: 18, token1Decimals: 6, days: 90,
  },
  {
    id: 'base-cbbtc-weth-005',
    chain: 'base',
    address: '', // uzupełniane automatycznie przez lookup factory przy pierwszym uruchomieniu
    feeBps: 500, ethIsToken0: true, token0Decimals: 18, token1Decimals: 8, days: 90, // token0=WETH(d18), token1=cbBTC(d8) — zweryfikowane on-chain (fix odwróconej orientacji, sekcja F)
  },
  {
    // A3: rok danych drugiej najlepszej puli (skorelowana). Kopia base-cbbtc-weth-005, days: 365.
    id: 'base-cbbtc-weth-005-365d',
    chain: 'base',
    address: '0x7AeA2E8A3843516afa07293a10Ac8E49906dabD1', // cbBTC/WETH Base 0.05% (z lookupu RPC; HyperSync nie robi factory-lookup)
    feeBps: 500, ethIsToken0: true, token0Decimals: 18, token1Decimals: 8, days: 365, // token0=WETH(d18), token1=cbBTC(d8) — zweryfikowane on-chain (fix odwróconej orientacji, sekcja F)
  },
  {
    // A4: egzotyk v3 do werdyktu majors-vs-egzotyki. DORY-USDC (Arbitrum 1%) z rankingu
    // to uniswap-V4 (singleton PoolManager, inny Swap event, brak adresu przez v3 factory)
    // — NIE do pobrania tym v3-skryptem. Substytut: WTAO-WETH mainnet 1% (79% apyBase,
    // najwyższy v3 egzotyk w universe.json). Decimals i adres zweryfikowane on-chain.
    id: 'mainnet-wtao-weth-100',
    chain: 'mainnet',
    address: '0x433a00819c771b33fa7223a5b3499b24fbcd1bbc',
    feeBps: 10000, ethIsToken0: false, token0Decimals: 9, token1Decimals: 18, days: 90,
  },
  // --- Część 2 (ALGORITHM v1): powtórka walidacji 005-pul na 365d (orientacja jak w 90d) ---
  {
    id: 'base-weth-usdc-005-365d',
    chain: 'base',
    address: '0xd0b53D9277642d899DF5C87A3966A349A798F224',
    feeBps: 500, ethIsToken0: true, token0Decimals: 18, token1Decimals: 6, days: 365,
  },
  {
    id: 'mainnet-usdc-weth-005-365d',
    chain: 'mainnet',
    address: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640',
    feeBps: 500, ethIsToken0: false, token0Decimals: 6, token1Decimals: 18, days: 365,
  },
  // --- Sekcja F.A: sleeve par spiętych. Adresy przez factory + token0/token1 ZWERYFIKOWANE
  //     on-chain (token0()/token1(), lekcja cbBTC — orientacja NIE z nazwy pary). Fee 0.01% = 100. ---
  {
    id: 'mainnet-dai-usdt-001',
    chain: 'mainnet',
    address: '0x48da0965ab2d2cbf1c17c09cfb5cbe67ad5b1406',
    feeBps: 100, ethIsToken0: false, token0Decimals: 18, token1Decimals: 6, days: 365, // token0=DAI, token1=USDT
  },
  {
    id: 'arbitrum-usdc-usdt-001',
    chain: 'arbitrum',
    address: '0xbe3ad6a5669dc0b8b12febc03608860c31e2eef6',
    feeBps: 100, ethIsToken0: false, token0Decimals: 6, token1Decimals: 6, days: 365, // token0=USDC natywny, token1=USDT
  },
  {
    id: 'mainnet-usdc-usdt-001',
    chain: 'mainnet',
    address: '0x3416cf6c708da44db2624d63ea0aaef7113527c6',
    feeBps: 100, ethIsToken0: false, token0Decimals: 6, token1Decimals: 6, days: 365, // token0=USDC, token1=USDT (kontrola: duża pula)
  },
  {
    id: 'mainnet-wsteth-weth-001',
    chain: 'mainnet',
    address: '0x109830a1aaad605bbf02a9dfa7b0b92ec2fb7daa',
    feeBps: 100, ethIsToken0: false, token0Decimals: 18, token1Decimals: 18, days: 365, // token0=wstETH, token1=WETH
  },
  {
    id: 'mainnet-tbtc-wbtc-001',
    chain: 'mainnet',
    address: '0x73a38006d23517a1d383c88929b2014f8835b38b',
    feeBps: 100, ethIsToken0: false, token0Decimals: 18, token1Decimals: 8, days: 365, // token0=TBTC, token1=WBTC
  },
  {
    // Referencja USD-za-WBTC dla mainnet-tbtc-wbtc-001 (para bez WETH).
    id: 'mainnet-wbtc-usdc-030',
    chain: 'mainnet',
    address: '0x99ac8cA7087fA4A2A1FB6357269965A2014ABc35',
    feeBps: 3000, ethIsToken0: false, token0Decimals: 8, token1Decimals: 6, days: 365, // token0=WBTC, token1=USDC — zweryfikowane on-chain
  },
  // --- Nowe sieci: Arbitrum + Optimism (decyzja Rafała, 2026-08-11) ---
  {
    id: 'arbitrum-weth-usdc-005-365d',
    chain: 'arbitrum',
    address: '0xC6962004f452bE9203591991D15f6b388e09E8D0',
    feeBps: 500, ethIsToken0: true, token0Decimals: 18, token1Decimals: 6, days: 365, // token0=WETH, token1=USDC natywny (0xaf88…5831) — zweryfikowane on-chain
  },
  {
    id: 'optimism-weth-usdc-030-365d',
    chain: 'optimism',
    address: '0xc1738d90e2e26c35784a0d3e3d8a9f795074bca4',
    feeBps: 3000, ethIsToken0: false, token0Decimals: 6, token1Decimals: 18, days: 365, // token0=USDC natywny (0x0b2C…7Ff85), token1=WETH — zweryfikowane on-chain (getPool z factory)
  },
  {
    id: 'arbitrum-weth-usdc-030-365d',
    chain: 'arbitrum',
    address: '0xc473e2aee3441bf9240be85eb122abb059a3b57c',
    feeBps: 3000, ethIsToken0: true, token0Decimals: 18, token1Decimals: 6, days: 365, // token0=WETH, token1=USDC natywny — zweryfikowane on-chain (getPool z factory)
  },
  // --- Walidacja kandydata selektora (pierwsza propozycja OPEN z rankingu, 17.08) ---
  {
    id: 'mainnet-weth-usdt-001-365d',
    chain: 'mainnet',
    address: '0xc7bbec68d12a0d1830360f8ec58fa599ba1b0e9b',
    feeBps: 100, ethIsToken0: true, token0Decimals: 18, token1Decimals: 6, days: 365, // token0=WETH, token1=USDT — zweryfikowane on-chain (getPool z factory)
  },
];

// Kolejność ma znaczenie: najpierw endpointy z dostępem do pełnej historii.
// Własny RPC (np. darmowy klucz Alchemy/Infura) można podać przez env:
//   RPC_MAINNET=https://eth-mainnet.g.alchemy.com/v2/KLUCZ npm run agent
const RPC: Record<string, string[]> = {
  mainnet: [
    ...(process.env.RPC_MAINNET ? [process.env.RPC_MAINNET] : []),
    'https://eth.drpc.org',
    'https://eth.llamarpc.com',
    'https://1rpc.io/eth',
    'https://eth-mainnet.public.blastapi.io',
    'https://ethereum-rpc.publicnode.com',
  ],
  base: [
    ...(process.env.RPC_BASE ? [process.env.RPC_BASE] : []),
    'https://base.drpc.org',
    'https://base.llamarpc.com',
    'https://1rpc.io/base',
    'https://base-mainnet.public.blastapi.io',
    'https://base-rpc.publicnode.com',
  ],
  arbitrum: [
    ...(process.env.RPC_ARBITRUM ? [process.env.RPC_ARBITRUM] : []),
    'https://arbitrum.drpc.org',
    'https://arbitrum.llamarpc.com',
    'https://1rpc.io/arb',
    'https://arbitrum-one.public.blastapi.io',
    'https://arbitrum-one-rpc.publicnode.com',
  ],
  optimism: [
    ...(process.env.RPC_OPTIMISM ? [process.env.RPC_OPTIMISM] : []),
    'https://optimism.drpc.org',
    'https://1rpc.io/op',
    'https://optimism-mainnet.public.blastapi.io',
    'https://optimism-rpc.publicnode.com',
    'https://mainnet.optimism.io',
  ],
};
// Arbitrum ~0.25s/blok (dla interpolacji block→ts i okna dni-wstecz).
const BLOCK_TIME: Record<string, number> = { mainnet: 12, base: 2, arbitrum: 0.25, optimism: 2 };
const FACTORY: Record<string, string> = {
  mainnet: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  base: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
  arbitrum: '0x1F98431c8aD98523631AE4a59f267346ea31F984', // ten sam v3 factory co mainnet
  optimism: '0x1F98431c8aD98523631AE4a59f267346ea31F984', // ten sam v3 factory co mainnet
};
// cbBTC/WETH Base — tokeny do lookupu adresu puli
const BASE_CBBTC = '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf';
const BASE_WETH = '0x4200000000000000000000000000000000000006';

// keccak256("Swap(address,address,int256,int256,uint160,uint128,int24)")
const SWAP_TOPIC = '0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67';

const CACHE_DIR = path.join(__dirname, '..', 'data', 'cache');

// ---------------------------------------------------------------------------
// Mini klient RPC z fallbackiem i backoffem
// ---------------------------------------------------------------------------
let rpcIdx = 0;
async function rpc(chain: string, method: string, params: unknown[], attempt = 0): Promise<any> {
  const urls = RPC[chain];
  const url = urls[rpcIdx % urls.length];
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: AbortSignal.timeout(30_000),
    });
    const j: any = await r.json();
    if (j.error) throw new Error(`${j.error.code}: ${j.error.message} [${url}]`);
    return j.result;
  } catch (e: any) {
    const maxAttempts = urls.length * 2 + 4;
    if (attempt >= maxAttempts) throw e;
    rpcIdx++; // następny provider
    if (attempt === 0 || String(e?.message).includes('-32602') || String(e?.message).includes('429')) {
      console.warn(`\n[rpc] ${url} odrzucił ${method} (${String(e?.message).slice(0, 90)}) — przełączam providera`);
    }
    const delay = Math.min(400 * 1.6 ** attempt, 6000);
    await new Promise((res) => setTimeout(res, delay));
    return rpc(chain, method, params, attempt + 1);
  }
}

const hexToBigInt = (h: string) => BigInt(h);
const toSigned = (v: bigint, bits: bigint) => (v >= 1n << (bits - 1n) ? v - (1n << bits) : v);

function decodeSwap(dataHex: string) {
  const d = dataHex.slice(2);
  const w = (i: number) => hexToBigInt('0x' + d.slice(i * 64, (i + 1) * 64));
  return {
    amount0: toSigned(w(0), 256n),
    amount1: toSigned(w(1), 256n),
    sqrtPriceX96: w(2),
    liquidity: w(3),
    tick: Number(toSigned(w(4) & 0xffffffn, 24n)),
  };
}

async function fetchPool(cfg: PoolCfg) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  // lookup adresu puli, jeśli brak w konfiguracji
  if (!cfg.address) {
    const [a, b] = [BASE_CBBTC.toLowerCase(), BASE_WETH.toLowerCase()].sort();
    const data =
      '0x1698ee82' + // getPool(address,address,uint24)
      a.slice(2).padStart(64, '0') +
      b.slice(2).padStart(64, '0') +
      cfg.feeBps.toString(16).padStart(64, '0');
    const res = await rpc(cfg.chain, 'eth_call', [{ to: FACTORY[cfg.chain], data }, 'latest']);
    cfg.address = '0x' + res.slice(26);
    console.log(`[${cfg.id}] pool address resolved: ${cfg.address}`);
  }

  const statePath = path.join(CACHE_DIR, `${cfg.id}.state.json`);
  const outPath = path.join(CACHE_DIR, `${cfg.id}.ndjson`);
  const metaPath = path.join(CACHE_DIR, `${cfg.id}.meta.json`);

  const latestHex = await rpc(cfg.chain, 'eth_blockNumber', []);
  const latest = Number(hexToBigInt(latestHex));
  const blocksBack = Math.floor((cfg.days * 86400) / BLOCK_TIME[cfg.chain]);
  const startBlock = latest - blocksBack;

  let from = startBlock;
  if (fs.existsSync(statePath)) {
    from = JSON.parse(fs.readFileSync(statePath, 'utf8')).nextBlock;
    console.log(`[${cfg.id}] resuming from block ${from}`);
  }

  // anchory czasowe: timestamp co ~10% zakresu (do interpolacji w backteście)
  if (!fs.existsSync(metaPath)) {
    const anchors: Array<{ block: number; ts: number }> = [];
    for (let i = 0; i <= 10; i++) {
      const b = startBlock + Math.floor((blocksBack * i) / 10);
      const blk = await rpc(cfg.chain, 'eth_getBlockByNumber', ['0x' + b.toString(16), false]);
      anchors.push({ block: b, ts: Number(hexToBigInt(blk.timestamp)) });
    }
    fs.writeFileSync(metaPath, JSON.stringify({ cfg, startBlock, latest, anchors }, null, 2));
  }

  const out = fs.createWriteStream(outPath, { flags: 'a' });
  let step = cfg.chain === 'base' ? 5000 : 2000;
  let total = 0;
  const t0 = Date.now();

  while (from <= latest) {
    const to = Math.min(from + step - 1, latest);
    let logs: any[];
    try {
      logs = await rpc(cfg.chain, 'eth_getLogs', [
        {
          address: cfg.address,
          topics: [SWAP_TOPIC],
          fromBlock: '0x' + from.toString(16),
          toBlock: '0x' + to.toString(16),
        },
      ]);
    } catch (e: any) {
      if (step > 200) {
        step = Math.floor(step / 2); // za duże okno — zmniejsz
        continue;
      }
      throw e;
    }

    for (const log of logs) {
      const s = decodeSwap(log.data);
      // kompaktowy zapis: b=block, a0/a1=amounts, sp=sqrtPriceX96, L=liquidity, t=tick
      out.write(
        JSON.stringify({
          b: Number(hexToBigInt(log.blockNumber)),
          a0: s.amount0.toString(),
          a1: s.amount1.toString(),
          sp: s.sqrtPriceX96.toString(),
          L: s.liquidity.toString(),
          t: s.tick,
        }) + '\n'
      );
    }
    total += logs.length;
    from = to + 1;
    fs.writeFileSync(statePath, JSON.stringify({ nextBlock: from }));

    if (logs.length > 8000) step = Math.max(200, Math.floor(step / 2));
    else if (logs.length < 1000 && step < 10000) step = Math.floor(step * 1.5);

    const pct = (((from - startBlock) / blocksBack) * 100).toFixed(1);
    process.stdout.write(
      `\r[${cfg.id}] ${pct}%  swaps: ${total}  block ${from}/${latest}  (${((Date.now() - t0) / 1000).toFixed(0)}s)   `
    );
  }
  out.end();
  console.log(`\n[${cfg.id}] DONE — ${total} nowych swapów -> ${outPath}`);
}

// Guard: uruchamiaj fetch tylko gdy ten plik jest punktem wejścia —
// fetch-swaps-hypersync.ts importuje stąd POOLS/PoolCfg i bez guarda
// sam import odpalałby równolegle fetch RPC wszystkich pul.
if (require.main === module) {
  (async () => {
    const only = process.argv[2];
    for (const cfg of POOLS) {
      if (only && cfg.id !== only) continue;
      try {
        await fetchPool(cfg);
      } catch (e) {
        console.error(`\n[${cfg.id}] FAILED:`, e);
      }
    }
  })();
}
