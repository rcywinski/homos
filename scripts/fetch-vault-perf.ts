/**
 * fetch-vault-perf.ts — daily UNIT VALUE series for the "casino house"
 * class (E8.2): HLP (Hyperliquid) and GM pools (GMX v2). What counts is
 * realized performance, NOT fee APY — so we need the share price.
 *
 *   npx tsx scripts/fetch-vault-perf.ts hlp
 *   npx tsx scripts/fetch-vault-perf.ts gm arbitrum:0x70d95587d40A2caf56bd97485aB3Eec10Bee6336 GM-ETH-USD
 *   npx tsx scripts/fetch-vault-perf.ts gm arbitrum:0x47c031236e19d024b42f8AE6780E44A573170703 GM-BTC-USD
 *   (GM addresses = market token from https://gmx-docs / GMX app "Pools" → VERIFY
 *    before the first run: the token symbol in the explorer must be "GM" and the pair in the description)
 *
 * Output: data/vaults/<name>.json — { name, source, series: [{t: ms, v}] }
 *   HLP: v = accountValue / (accountValue − cumulative pnl)? — NO: HL does not give
 *   NAV/share directly. We take `portfolio[allTime].pnlHistory` and
 *   `accountValueHistory`: daily return r_d = ΔPnL_d / accountValue_{d−1}
 *   (approximation: deposits/withdrawals are not PnL, so ΔPnL is the pure vault
 *   result; dividing by the previous day's account value gives the return per
 *   unit of capital). v = product of (1+r_d) — index 1.0 at the start.
 *   GM: v = GM token price in USD (coins.llama, like wide-daily); the GM value
 *   already includes fees/borrow/trader PnL (they increase the backing).
 * The E8.2 benchmark is computed by e8-house.ts.
 */
import * as fs from 'fs';
import * as path from 'path';

const OUT_DIR = path.join(__dirname, '..', 'data', 'vaults');
fs.mkdirSync(OUT_DIR, { recursive: true });
const DAY = 86400;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const HLP_VAULT = '0xdfc24b077bc1425ad1dea75bcb6f8158e10df303';

async function hlp() {
  const res = await fetch('https://api.hyperliquid.xyz/info', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'vaultDetails', vaultAddress: HLP_VAULT }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) { console.error(`HTTP ${res.status} — ${await res.text()}`); process.exit(1); }
  const j: any = await res.json();
  // portfolio: [["day", {...}], ["week", {...}], ["month", {...}], ["allTime", {accountValueHistory: [[ms, "v"]...], pnlHistory: [[ms, "v"]...]}], ...]
  const port: any[] = j.portfolio ?? [];
  const allTime = port.find((p) => p[0] === 'allTime')?.[1];
  if (!allTime) { console.error('missing portfolio.allTime — response dump:'); console.error(JSON.stringify(j).slice(0, 1500)); process.exit(1); }
  const av: Array<[number, string]> = allTime.accountValueHistory ?? [];
  const pnl: Array<[number, string]> = allTime.pnlHistory ?? [];
  console.log(`HLP: accountValueHistory ${av.length} pts, pnlHistory ${pnl.length} pts (${av.length ? new Date(av[0][0]).toISOString().slice(0, 10) : '?'} → ${av.length ? new Date(av[av.length - 1][0]).toISOString().slice(0, 10) : '?'})`);
  // to UTC days: last sample of the day
  const byDayAv = new Map<number, number>(), byDayPnl = new Map<number, number>();
  for (const [t, v] of av) byDayAv.set(Math.floor(t / 1000 / DAY), Number(v));
  for (const [t, v] of pnl) byDayPnl.set(Math.floor(t / 1000 / DAY), Number(v));
  const days = [...byDayAv.keys()].filter((d) => byDayPnl.has(d)).sort((a, b) => a - b);
  const series: { t: number; v: number }[] = [];
  let idx = 1, prevD = -1;
  for (const d of days) {
    if (prevD >= 0) {
      const dPnl = byDayPnl.get(d)! - byDayPnl.get(prevD)!;
      const base = byDayAv.get(prevD)!;
      if (base > 0) idx *= 1 + dPnl / base;
    }
    series.push({ t: d * DAY * 1000, v: idx });
    prevD = d;
  }
  const out = path.join(OUT_DIR, 'HLP.json');
  fs.writeFileSync(out, JSON.stringify({ name: 'HLP', source: 'hyperliquid vaultDetails allTime (index from ΔPnL/accountValue)', note: 'approximation: daily return = ΔPnL / previous day account value; deposits/withdrawals outside PnL', series }));
  console.log(`HLP: ${series.length} days, index ${series[0]?.v.toFixed(3)} → ${series[series.length - 1]?.v.toFixed(3)} → ${out}`);
}

async function gm(key: string, name: string) {
  const SPAN = Number(process.env.SPAN_DAYS || 1100);
  const startAll = Math.floor(Date.now() / 1000 / DAY) * DAY + DAY / 2 - SPAN * DAY;
  const acc: { t: number; v: number }[] = [];
  for (let off = 0; off < SPAN; off += 500) {
    const span = Math.min(500, SPAN - off);
    const url = `https://coins.llama.fi/chart/${key}?start=${startAll + off * DAY}&span=${span}&period=1d`;
    const r = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    if (!r.ok) { console.error(`HTTP ${r.status} ${url}`); process.exit(1); }
    const j: any = await r.json();
    const v = j.coins?.[key] ?? j.coins?.[Object.keys(j.coins ?? {})[0]];
    if (!v) { console.error(`coins.llama does not know ${key} — check the GM token address (explorer: symbol "GM")`); process.exit(1); }
    for (const x of v.prices ?? []) acc.push({ t: x.timestamp * 1000, v: x.price });
    await sleep(300);
  }
  acc.sort((a, b) => a.t - b.t);
  const series = acc.filter((x, i) => x.v > 0 && (i === 0 || Math.floor(x.t / 1000 / DAY) !== Math.floor(acc[i - 1].t / 1000 / DAY)));
  const out = path.join(OUT_DIR, `${name}.json`);
  fs.writeFileSync(out, JSON.stringify({ name, source: `coins.llama ${key}`, series }));
  console.log(`${name}: ${series.length} days (${new Date(series[0]?.t).toISOString().slice(0, 10)} → ${new Date(series[series.length - 1]?.t).toISOString().slice(0, 10)}), price ${series[0]?.v.toFixed(3)} → ${series[series.length - 1]?.v.toFixed(3)} → ${out}`);
}

(async () => {
  const mode = process.argv[2];
  if (mode === 'hlp') await hlp();
  else if (mode === 'gm') { if (!process.argv[3] || !process.argv[4]) { console.error('gm <chain:addr> <name>'); process.exit(1); } await gm(process.argv[3].toLowerCase(), process.argv[4]); }
  else { console.error('usage: hlp | gm <chain:addr> <name>'); process.exit(1); }
})();
