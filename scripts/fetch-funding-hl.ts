/**
 * fetch-funding-hl.ts — historia funding rate z Hyperliquid (publiczne API,
 * bez klucza). E8.1 (cash-and-carry): drugie venue obok Binance
 * (scripts/fetch-funding.ts), bo to tam realnie otworzylibyśmy shorta.
 *
 *   npx tsx scripts/fetch-funding-hl.ts ETH 800
 *   npx tsx scripts/fetch-funding-hl.ts BTC 800
 *
 * Wyjście: data/funding/HL-<coin>.json — [{t: ms, r: rate}] rosnąco po t.
 * UWAGA: na Hyperliquid funding jest CO GODZINĘ (rate = ułamek za 1h),
 * Binance co 8h. e8-carry.ts normalizuje po czasie (sumuje r w oknie),
 * więc obie serie są porównywalne bez przeliczania.
 * Konwencja jak w Binance: r > 0 → longi płacą shortom.
 */
import * as fs from 'fs';
import * as path from 'path';

const OUT_DIR = path.join(__dirname, '..', 'data', 'funding');
fs.mkdirSync(OUT_DIR, { recursive: true });

(async () => {
  const coin = (process.argv[2] || 'ETH').toUpperCase();
  const days = Number(process.argv[3] || 800);
  const end = Date.now();
  let start = end - days * 86400 * 1000;
  const all: Array<{ t: number; r: number }> = [];
  let guard = 0;
  while (start < end && guard++ < 5000) {
    const res = await fetch('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'fundingHistory', coin, startTime: start, endTime: end }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      console.error(`HTTP ${res.status} — ${await res.text()}`);
      process.exit(1);
    }
    // odpowiedź: [{coin, fundingRate: "0.0000125", premium, time: ms}] — max ~500 rekordów/request
    const batch = (await res.json()) as Array<{ time: number; fundingRate: string }>;
    if (!batch.length) break;
    for (const b of batch) all.push({ t: b.time, r: Number(b.fundingRate) });
    const last = batch[batch.length - 1].time;
    if (last + 1 <= start) break; // brak postępu — nie kręcić się w kółko
    start = last + 1;
    process.stdout.write(`\rHL ${coin}: ${all.length} okresów 1h (do ${new Date(start).toISOString().slice(0, 10)})  `);
    await new Promise((r) => setTimeout(r, 250));
  }
  all.sort((a, b) => a.t - b.t);
  // dedup po t (paginacja może zwrócić skraj dwa razy)
  const dedup = all.filter((x, i) => i === 0 || x.t !== all[i - 1].t);
  const out = path.join(OUT_DIR, `HL-${coin}.json`);
  fs.writeFileSync(out, JSON.stringify(dedup));
  const mean = dedup.reduce((s, x) => s + x.r, 0) / dedup.length;
  const neg = dedup.filter((x) => x.r < 0).length;
  const spanDays = (dedup[dedup.length - 1].t - dedup[0].t) / 86400000;
  console.log(`\nHL ${coin}: ${dedup.length} okresów 1h (${spanDays.toFixed(0)} dni) → ${out}`);
  console.log(`średni funding ${(mean * 100).toFixed(5)}%/1h (${(mean * 24 * 365 * 100).toFixed(1)}%/rok), ujemnych: ${((neg / dedup.length) * 100).toFixed(0)}%`);
})();
