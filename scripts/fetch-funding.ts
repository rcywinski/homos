/**
 * fetch-funding.ts — funding rate history from Binance USDⓈ-M futures (public,
 * no key). Foundation F4 (hedge): cost/income of an ETH-perp short.
 *
 *   npx tsx scripts/fetch-funding.ts ETHUSDT 400
 *   npx tsx scripts/fetch-funding.ts BTCUSDT 400
 *
 * Output: data/funding/<symbol>.json — [{t: ms, r: rate}] ascending by t
 * (funding every 8h; rate is the fraction per 8h period, e.g. 0.0001 = 1 bp/8h).
 * Perp convention: r > 0 → longs pay shorts (the short RECEIVES funding).
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
    process.stdout.write(`\r${symbol}: ${all.length} periods (up to ${new Date(start).toISOString().slice(0, 10)})  `);
    await new Promise((r) => setTimeout(r, 300)); // polite towards rate limits
  }
  all.sort((a, b) => a.t - b.t);
  const out = path.join(OUT_DIR, `${symbol}.json`);
  fs.writeFileSync(out, JSON.stringify(all));
  const mean = all.reduce((s, x) => s + x.r, 0) / all.length;
  const neg = all.filter((x) => x.r < 0).length;
  console.log(`\n${symbol}: ${all.length} 8h periods → ${out}`);
  console.log(`mean funding ${(mean * 100).toFixed(4)}%/8h (${(mean * 3 * 365 * 100).toFixed(1)}%/yr), negative: ${((neg / all.length) * 100).toFixed(0)}%`);
})();
