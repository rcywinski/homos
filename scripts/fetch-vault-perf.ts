/**
 * fetch-vault-perf.ts — dzienne serie WARTOŚCI JEDNOSTKI dla klasy „dom
 * kasyna" (E8.2): HLP (Hyperliquid) i GM pools (GMX v2). Liczy się
 * realized performance, NIE fee APY — więc potrzebujemy ceny udziału.
 *
 *   npx tsx scripts/fetch-vault-perf.ts hlp
 *   npx tsx scripts/fetch-vault-perf.ts gm arbitrum:0x70d95587d40A2caf56bd97485aB3Eec10Bee6336 GM-ETH-USD
 *   npx tsx scripts/fetch-vault-perf.ts gm arbitrum:0x47c031236e19d024b42f8AE6780E44A573170703 GM-BTC-USD
 *   (adresy GM = market token z https://gmx-docs / app GMX „Pools" → ZWERYFIKOWAĆ
 *    przed pierwszym runem: symbol tokenu w explorerze ma być „GM" i para w opisie)
 *
 * Wyjście: data/vaults/<name>.json — { name, source, series: [{t: ms, v}] }
 *   HLP: v = accountValue / (accountValue − pnl skumulowany)? — NIE: HL nie daje
 *   NAV/udział wprost. Bierzemy `portfolio[allTime].pnlHistory` i
 *   `accountValueHistory`: dzienny zwrot r_d = ΔPnL_d / accountValue_{d−1}
 *   (przybliżenie: wpłaty/wypłaty nie są PnL, więc ΔPnL to czysty wynik
 *   vaultu; dzielenie przez wartość konta z poprzedniego dnia daje zwrot
 *   na jednostkę kapitału). v = iloczyn (1+r_d) — indeks 1.0 na starcie.
 *   GM: v = cena tokenu GM w USD (coins.llama, jak wide-daily); wartość GM
 *   zawiera już fee/borrow/PnL traderów (zwiększają backing).
 * Benchmark do E8.2 liczy e8-house.ts.
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
  if (!allTime) { console.error('brak portfolio.allTime — zrzut odpowiedzi:'); console.error(JSON.stringify(j).slice(0, 1500)); process.exit(1); }
  const av: Array<[number, string]> = allTime.accountValueHistory ?? [];
  const pnl: Array<[number, string]> = allTime.pnlHistory ?? [];
  console.log(`HLP: accountValueHistory ${av.length} pkt, pnlHistory ${pnl.length} pkt (${av.length ? new Date(av[0][0]).toISOString().slice(0, 10) : '?'} → ${av.length ? new Date(av[av.length - 1][0]).toISOString().slice(0, 10) : '?'})`);
  // do dni UTC: ostatnia próbka dnia
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
  fs.writeFileSync(out, JSON.stringify({ name: 'HLP', source: 'hyperliquid vaultDetails allTime (index from ΔPnL/accountValue)', note: 'przybliżenie: zwrot dzienny = ΔPnL / wartość konta dnia poprzedniego; wpłaty/wypłaty poza PnL', series }));
  console.log(`HLP: ${series.length} dni, indeks ${series[0]?.v.toFixed(3)} → ${series[series.length - 1]?.v.toFixed(3)} → ${out}`);
}

async function gm(key: string, name: string) {
  const SPAN = Number(process.env.SPAN_DAYS || 1100);
  const startAll = Math.floor(Date.now() / 1000) - SPAN * DAY;
  const acc: { t: number; v: number }[] = [];
  for (let off = 0; off < SPAN; off += 500) {
    const span = Math.min(500, SPAN - off);
    const url = `https://coins.llama.fi/chart/${key}?start=${startAll + off * DAY}&span=${span}&period=1d`;
    const r = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    if (!r.ok) { console.error(`HTTP ${r.status} ${url}`); process.exit(1); }
    const j: any = await r.json();
    const v = j.coins?.[key] ?? j.coins?.[Object.keys(j.coins ?? {})[0]];
    if (!v) { console.error(`coins.llama nie zna ${key} — sprawdź adres GM tokenu (explorer: symbol „GM")`); process.exit(1); }
    for (const x of v.prices ?? []) acc.push({ t: x.timestamp * 1000, v: x.price });
    await sleep(300);
  }
  acc.sort((a, b) => a.t - b.t);
  const series = acc.filter((x, i) => x.v > 0 && (i === 0 || Math.floor(x.t / 1000 / DAY) !== Math.floor(acc[i - 1].t / 1000 / DAY)));
  const out = path.join(OUT_DIR, `${name}.json`);
  fs.writeFileSync(out, JSON.stringify({ name, source: `coins.llama ${key}`, series }));
  console.log(`${name}: ${series.length} dni (${new Date(series[0]?.t).toISOString().slice(0, 10)} → ${new Date(series[series.length - 1]?.t).toISOString().slice(0, 10)}), cena ${series[0]?.v.toFixed(3)} → ${series[series.length - 1]?.v.toFixed(3)} → ${out}`);
}

(async () => {
  const mode = process.argv[2];
  if (mode === 'hlp') await hlp();
  else if (mode === 'gm') { if (!process.argv[3] || !process.argv[4]) { console.error('gm <chain:addr> <name>'); process.exit(1); } await gm(process.argv[3].toLowerCase(), process.argv[4]); }
  else { console.error('użycie: hlp | gm <chain:addr> <name>'); process.exit(1); }
})();
