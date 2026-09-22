/**
 * fetch-dvol.ts — daily history of the DVOL implied volatility index
 * from Deribit (public API, no key). E8.3 (LP timing by volatility).
 *
 *   npx tsx scripts/fetch-dvol.ts ETH 1200
 *   npx tsx scripts/fetch-dvol.ts BTC 1200
 *
 * Output: data/dvol/<ccy>.json — [{t: ms (start of UTC day), o,h,l,c}]
 * ascending by t; c = day's closing DVOL in %/yr (e.g. 65 = 65% ann. vol).
 * API: public/get_volatility_index_data, resolution 1D, limit ~1000 pts
 * per request → paginate backwards by end_timestamp.
 */
import * as fs from 'fs';
import * as path from 'path';

const OUT_DIR = path.join(__dirname, '..', 'data', 'dvol');
fs.mkdirSync(OUT_DIR, { recursive: true });
const DAY = 86400_000;

(async () => {
  const ccy = (process.argv[2] || 'ETH').toUpperCase();
  const days = Number(process.argv[3] || 1200);
  const startAll = Date.now() - days * DAY;
  let end = Date.now();
  const all = new Map<number, { t: number; o: number; h: number; l: number; c: number }>();
  let guard = 0;
  while (end > startAll && guard++ < 50) {
    const start = Math.max(startAll, end - 900 * DAY);
    const url = `https://www.deribit.com/api/v2/public/get_volatility_index_data?currency=${ccy}&start_timestamp=${start}&end_timestamp=${end}&resolution=1D`;
    const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) { console.error(`HTTP ${res.status} — ${await res.text()}`); process.exit(1); }
    const j = (await res.json()) as { result?: { data: number[][]; continuation?: number | null }; error?: any };
    if (j.error) { console.error(JSON.stringify(j.error)); process.exit(1); }
    const data = j.result?.data ?? []; // [[ts, open, high, low, close], …]
    if (!data.length) break;
    for (const [t, o, h, l, c] of data) all.set(t, { t, o, h, l, c });
    const oldest = Math.min(...data.map((d) => d[0]));
    if (oldest <= start) { end = start - 1; } else { end = oldest - 1; }
    process.stdout.write(`\rDVOL ${ccy}: ${all.size} days (since ${new Date(oldest).toISOString().slice(0, 10)})  `);
    await new Promise((r) => setTimeout(r, 300));
  }
  const rows = [...all.values()].sort((a, b) => a.t - b.t);
  const out = path.join(OUT_DIR, `${ccy}.json`);
  fs.writeFileSync(out, JSON.stringify(rows));
  const cs = rows.map((r) => r.c).sort((a, b) => a - b);
  console.log(`\nDVOL ${ccy}: ${rows.length} days → ${out}`);
  if (rows.length) console.log(`range ${new Date(rows[0].t).toISOString().slice(0, 10)} → ${new Date(rows[rows.length - 1].t).toISOString().slice(0, 10)} · median ${cs[cs.length >> 1].toFixed(1)} · p10 ${cs[Math.floor(cs.length * 0.1)].toFixed(1)} · p90 ${cs[Math.floor(cs.length * 0.9)].toFixed(1)}`);
})();
