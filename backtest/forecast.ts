/**
 * forecast.ts — "prognoza zysku dla ludzi" (sekcja Prognoza w UI).
 *
 *   npx tsx backtest/forecast.ts
 *
 * Czyta walk-forwardy 45d (z kwantylami aprQ25/aprMed/aprQ75 — wymagają
 * runów walkforward.ts z 17.08+) dla puli portfela i strategii przypisanej
 * per pula w ALGORITHM.md v1.2, i zapisuje backtest/results/forecast.json.
 * UI mnoży przez kapitał użytkownika: tydzień = kapitał×apr/100/52 itd.
 *
 * UWAGA UCZCIWOŚCIOWA: kwantyle pochodzą z ROZKŁADU 45-dniowych okien
 * ostatniego roku (rok był głównie spadkowy!) — to scenariusze "słabo/
 * typowo/dobrze" NA PODSTAWIE PRZESZŁOŚCI, nie obietnica. Zestawienie
 * z faktycznymi wynikami robi sekcja obserwacji.
 */
import * as fs from 'fs';
import * as path from 'path';

const RES = path.join(__dirname, 'results');

/** pula → strategia z ALGORITHM v1.2 (§4/§6) + plik walk-forwardu */
const PORTFOLIO: Array<{ poolId: string; symbol: string; file: string; strategy: string; note?: string }> = [
  {
    poolId: 'base-weth-usdc-030', symbol: 'WETH/USDC 0.3% Base',
    file: 'walkforward-base-weth-usdc-030-365d-45d.json',
    strategy: 'Adapt k=3 + hedge(excess,HL7d,5%)',
    note: 'hedge-excess (v1.2); wykonanie shorta ręczne na GMX do czasu integracji',
  },
  {
    poolId: 'base-weth-usdc-005', symbol: 'WETH/USDC 0.05% Base',
    file: 'walkforward-base-weth-usdc-005-365d-45d.json',
    strategy: 'Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)',
  },
  {
    poolId: 'mainnet-usdc-weth-005', symbol: 'USDC/WETH 0.05% Ethereum',
    file: 'walkforward-mainnet-usdc-weth-005-365d-45d.json',
    strategy: 'Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)',
  },
  {
    poolId: 'arbitrum-weth-usdc-005', symbol: 'WETH/USDC 0.05% Arbitrum',
    file: 'walkforward-arbitrum-weth-usdc-005-365d-45d.json',
    strategy: 'Adapt k=3 h=24h + trend(exit,HL7d,5%,re>ema)',
  },
  {
    poolId: 'base-cbbtc-weth-005', symbol: 'WETH/cbBTC 0.05% Base',
    file: 'walkforward-base-cbbtc-weth-005-365d-45d.json',
    strategy: 'Adapt k=3 h=24h + trend(exit,HL7d,5%)',
    note: 'para bez nogi stable — wynik jedzie na cenie krypto (pełna beta); w portfelu tylko przy świadomej ekspozycji',
  },
];

const out: any[] = [];
for (const p of PORTFOLIO) {
  const fp = path.join(RES, p.file);
  if (!fs.existsSync(fp)) {
    console.warn(`brak ${p.file} — pomijam ${p.poolId}`);
    continue;
  }
  const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const s = d.summary?.[p.strategy];
  if (!s) {
    console.warn(`${p.file}: brak strategii "${p.strategy}" — pomijam`);
    continue;
  }
  if (s.aprMed === undefined) {
    console.warn(`${p.file}: brak kwantyli APR — przelicz walkforward nową wersją (17.08+)`);
    continue;
  }
  out.push({
    poolId: p.poolId, symbol: p.symbol, strategy: p.strategy, note: p.note ?? null,
    windowDays: d.windowDays, windows: d.windows,
    aprQ25: s.aprQ25, aprMed: s.aprMed, aprQ75: s.aprQ75,
    vsHodlMean: s.mean, winPct: s.winPct, worst: s.worst,
  });
  console.log(`${p.symbol}: APR słabo/typowo/dobrze = ${s.aprQ25.toFixed(1)} / ${s.aprMed.toFixed(1)} / ${s.aprQ75.toFixed(1)} %`);
}
fs.writeFileSync(path.join(RES, 'forecast.json'), JSON.stringify({ generatedAt: new Date().toISOString(), disclaimer: 'Scenariusze z rozkładu 45-dniowych okien ostatnich 365 dni (rok głównie spadkowy). To nie obietnica zysku.', pools: out }, null, 2));
console.log(`→ backtest/results/forecast.json (${out.length} pul)`);
