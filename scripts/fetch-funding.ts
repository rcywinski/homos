/**
 * fetch-funding.ts — historia funding rate z Binance USDⓈ-M futures (publiczne,
 * bez klucza). Fundament F4 (hedge): koszt/przychód shorta ETH-perp.
 *
 *   npx tsx scripts/fetch-funding.ts ETHUSDT 400
 *   npx tsx scripts/fetch-funding.ts BTCUSDT 400
 *
 * Wyjście: data/funding/<symbol>.json — [{t: ms, r: rate}] rosnąco po t
 * (funding co 8h; rate to ułamek za okres 8h, np. 0.0001 = 1 bp/8h).
 * Konwencja perpów: r > 0 → longi płacą shortom (short DOSTAJE funding).
 */
import * as fs from 'fs';
import * as path from 'path';

const OUT_DIR = path.join(__dirname, '..', 'data', 'funding');
fs.mkdirSync(OUT_DIR, { recursive: true });

(async () => {
  const symbol = process.argv[2] || 'ETHUSDT';
  const days = Number(process.argv[3] || 400);
  const end = Date.now();
  let start = end - days * 86400 * 1000;
  const all: Array<{ t: number; r: number }> = [];
  while (start < end) {
    const url = `https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}&startTime=${start}&limit=1000`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`HTTP ${res.status} — ${await res.text()}`);
      process.exit(1);
    }
    const batch = (await res.json()) as Array<{ fundingTime: number; fundingRate: string }>;
    if (!batch.length) break;
    for (const b of batch) all.push({ t: b.fundingTime, r: Number(b.fundingRate) });
    start = batch[batch.length - 1].fundingTime + 1;
    process.stdout.write(`\r${symbol}: ${all.length} okresów (do ${new Date(start).toISOString().slice(0, 10)})  `);
    await new Promise((r) => setTimeout(r, 300)); // grzecznie wobec rate-limitów
  }
  all.sort((a, b) => a.t - b.t);
  const out = path.join(OUT_DIR, `${symbol}.json`);
  fs.writeFileSync(out, JSON.stringify(all));
  const mean = all.reduce((s, x) => s + x.r, 0) / all.length;
  const neg = all.filter((x) => x.r < 0).length;
  console.log(`\n${symbol}: ${all.length} okresów 8h → ${out}`);
  console.log(`średni funding ${(mean * 100).toFixed(4)}%/8h (${(mean * 3 * 365 * 100).toFixed(1)}%/rok), ujemnych: ${((neg / all.length) * 100).toFixed(0)}%`);
})();
