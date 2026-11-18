/**
 * Wallet and paper trading (phase 4, step 4.1b). Read-only by construction: this bundle contains no wallet or signing
 * library (showcase/guard.js). Figures come from the bot's own ledger, sanitized by ai/serve/wallet-export.ts; the two
 * manual positions opened before the project are left out of every list and total (owner decision, 16 Nov 2026).
 * Every figure shown is recorded by the bot or computed from recorded values; nothing is estimated here.
 */
import type { WalletData, WalletPaperPool, WalletPosition, WalletTokens, WalletTx } from '../../ai/serve/showcase-data';

const ADDRESS = __SHOWCASE_WALLET_ADDRESS__;

const EXPLORER: Record<string, { name: string; tx: string; address: string }> = {
  mainnet: { name: 'Etherscan', tx: 'https://etherscan.io/tx/', address: 'https://etherscan.io/address/' },
  base: { name: 'Basescan', tx: 'https://basescan.org/tx/', address: 'https://basescan.org/address/' },
  arbitrum: { name: 'Arbiscan', tx: 'https://arbiscan.io/tx/', address: 'https://arbiscan.io/address/' },
};
const CHAIN: Record<string, string> = { mainnet: 'Ethereum', base: 'Base', arbitrum: 'Arbitrum' };
const ACTION: Record<WalletTx['action'], string> = {
  opened: 'Opened with a deposit',
  withdrawn: 'Withdrawn, fees included',
  deposit: 'Deposit',
  collected: 'Fees collected',
  other: 'Other',
};
const PAPER_EVENT: Record<string, string> = {
  OPEN: 'opened',
  REBALANCE: 'range moved',
  EXIT_TREND: 'left on a down trend',
  REENTRY: 'came back',
  CLOSE: 'closed',
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const money = (x: number) => `$${x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
/** A missing ledger figure reads as words, not as a number. */
const usd = (x: number | null) => (x === null ? <span className="missing">not recorded</span> : money(x));
const signed = (x: number | null) =>
  x === null ? <span className="missing">not recorded</span> : <span className={x < 0 ? 'neg' : 'pos'}>{`${x < 0 ? '-' : '+'}${money(Math.abs(x))}`}</span>;
const shortDate = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
const amount = (x: number) => x.toLocaleString('en-US', { maximumFractionDigits: x < 1 ? 6 : 2 });
const tokens = (t: WalletTokens) => `${amount(t.a0)} ${t.sym0}, ${amount(t.a1)} ${t.sym1}`;

/** "base-weth-usdc-030" -> "WETH/USDC 0.30% on Base". */
function poolName(id: string): string {
  const [chain, a, b, fee] = id.split('-');
  const sym = (s: string) => (s === 'cbbtc' ? 'cbBTC' : s.toUpperCase());
  return `${sym(a)}/${sym(b)} ${(Number(fee) / 100).toFixed(2)}% on ${CHAIN[chain] ?? chain}`;
}

/** "left on a down trend, came back" three times in a row reads as one phrase with a count. */
export function summarizeEvents(kinds: string[]): string {
  const words = kinds.map((k) => PAPER_EVENT[k] ?? k.toLowerCase());
  const out: string[] = [];
  for (let i = 0; i < words.length; ) {
    if (words[i] === 'left on a down trend' && words[i + 1] === 'came back') {
      let n = 0;
      while (words[i] === 'left on a down trend' && words[i + 1] === 'came back') {
        n++;
        i += 2;
      }
      out.push(n === 1 ? 'left on a down trend and came back' : `left on a down trend and came back, ${n} times`);
      continue;
    }
    let n = 1;
    while (words[i + n] === words[i]) n++;
    out.push(n === 1 ? words[i] : `${words[i]}, ${n} times`);
    i += n;
  }
  return out.join('; ');
}

export function Wallet({ data }: { data: WalletData }) {
  return (
    <section className="wallet" aria-labelledby="wallet-title">
      <h2 id="wallet-title" className="section-title">
        Wallet and paper trading
      </h2>
      <p className="lede">
        What the system did with real money, and what its paper trading did alongside, from the bot&apos;s own ledger. This page cannot connect a
        wallet or sign anything: the bot only proposed actions, and the owner signed them in the owner&apos;s own wallet.
      </p>
      {ADDRESS && (
        <p className="wallet-address">
          Wallet <span className="path">{ADDRESS}</span>, on-chain history on{' '}
          {Object.values(EXPLORER).map((e, i) => (
            <span key={e.name}>
              {i > 0 && ', '}
              <a href={e.address + ADDRESS} target="_blank" rel="noopener noreferrer">
                {e.name}
              </a>
            </span>
          ))}
          .
        </p>
      )}
      {data.fixture && (
        <p className="state-note error" data-testid="wallet-fixture">
          Test data: {data.fixture}
        </p>
      )}
      <WalletView data={data} />
    </section>
  );
}

function WalletView({ data }: { data: WalletData }) {
  const below = data.paper.filter((p) => p.lastEquityUsd < p.lastHodlUsd).length;
  const noUsd = data.positions.filter((p) => p.depositedUsd === null).map((p) => p.pair);
  const t = data.totals;
  return (
    <>
      <p className="state-note" data-testid="wallet-excluded">
        {data.excluded.note}
      </p>
      <h3 className="sub-title">Real positions</h3>
      <p className="meta">
        {t.positions} liquidity positions on Uniswap v3 from {shortDate(data.positions[0]?.openedAt ?? data.period.from)} to{' '}
        {shortDate(data.positions[data.positions.length - 1]?.closedAt ?? data.period.from)} 2026, {data.transactions.length} transactions, gas{' '}
        {t.gasEth} ETH in total. The three WETH/cbBTC positions are one deposit moved to a new range twice.
      </p>
      <div className="positions" data-testid="wallet-positions">
        {data.positions.map((p) => (
          <Position key={`${p.chain}:${p.tokenId}`} p={p} />
        ))}
      </div>
      <table className="totals" data-testid="wallet-totals">
        <caption>All {t.positions} real positions together</caption>
        <tbody>
          <tr>
            <th scope="row">Fees earned</th>
            <td>{usd(t.feesUsd)}</td>
          </tr>
          <tr>
            <th scope="row">Against holding, before fees</th>
            <td>{signed(t.againstHoldingBeforeFeesUsd)}</td>
          </tr>
          <tr>
            <th scope="row">Against holding, with fees</th>
            <td>{signed(t.againstHoldingWithFeesUsd)}</td>
          </tr>
        </tbody>
      </table>
      <p className="fine-print" data-testid="wallet-definitions">
        &quot;Against holding&quot; compares the position&apos;s last recorded value before it closed with the same tokens it started with, simply
        kept in the wallet and valued at the same moment. &quot;Before fees&quot; leaves out the fees the position had earned, because the bot
        recorded them apart from the value; &quot;with fees&quot; adds them. Gas is not included.
        {noUsd.length > 0 && ` The bot did not record dollar values for the ${[...new Set(noUsd)].join(' and ')} deposits, so those cards show token amounts.`}
      </p>

      <details className="more">
        <summary>All {data.transactions.length} transactions</summary>
        <Transactions txs={data.transactions} />
      </details>

      <h3 className="sub-title">Paper trading</h3>
      <p className="meta" data-testid="paper-summary">
        Virtual ${data.paper[0]?.capitalUsd.toLocaleString('en-US')} per pool from {shortDate(data.period.paperStartedAt)} 2026, on live prices. At the
        last sample, {below} of {data.paper.length} pools were worth less than simply holding the same tokens.
      </p>
      <div className="paper-table">
        <table>
          <thead>
            <tr>
              <th scope="col">Pool</th>
              <th scope="col">Value, with fees</th>
              <th scope="col">Holding instead</th>
              <th scope="col">Difference</th>
              <th scope="col">Fees</th>
              <th scope="col">Costs</th>
              <th scope="col">What happened</th>
            </tr>
          </thead>
          <tbody>
            {data.paper.map((p) => (
              <PaperRow key={p.poolId} p={p} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="fine-print" data-testid="paper-definitions">
        Paper values are the last sample on {shortDate(data.paper[0]?.lastSampleAt ?? '')}. Here &quot;holding instead&quot; is half of the
        $10,000 in each token, fixed when the paper position first opened on {shortDate(data.period.paperStartedAt)}, valued at the same moment.
        That is why a pool can look much worse on paper than the real position in the same pool: the paper run covers a longer period from{' '}
        {shortDate(data.period.paperStartedAt)}, starts from a 50/50 split rather than the deposit, and moved its range when the price left it,
        while each real position is compared with its own tokens over its own, shorter life.
      </p>
    </>
  );
}

function Position({ p }: { p: WalletPosition }) {
  const dollars = p.depositedUsd !== null;
  return (
    <article className="position">
      <h4>
        {p.pair} {p.feeTierPct !== null ? `${p.feeTierPct.toFixed(2)}%` : ''} on {CHAIN[p.chain] ?? p.chain}
      </h4>
      <p className="meta">
        Position #{p.tokenId}, {shortDate(p.openedAt)} to {shortDate(p.closedAt)}, {p.transactions} transactions
      </p>
      <dl className="figures">
        <div className="wide">
          <dt>Deposited</dt>
          <dd>{dollars ? usd(p.depositedUsd) : p.depositedTokens ? tokens(p.depositedTokens) : usd(null)}</dd>
        </div>
        <div className="wide">
          <dt>Withdrawn, fees included</dt>
          <dd>{p.withdrawnUsd !== null ? usd(p.withdrawnUsd) : p.withdrawnTokens ? tokens(p.withdrawnTokens) : usd(null)}</dd>
        </div>
        <div>
          <dt>Last value</dt>
          <dd>{usd(p.lastValueUsd)}</dd>
        </div>
        <div>
          <dt>Holding instead</dt>
          <dd>{usd(p.lastHodlUsd)}</dd>
        </div>
        <div>
          <dt>Fees earned</dt>
          <dd>{usd(p.lastFeesUsd)}</dd>
        </div>
        <div>
          <dt>Against holding, before fees</dt>
          <dd>{signed(p.againstHoldingBeforeFeesUsd)}</dd>
        </div>
        <div>
          <dt>Against holding, with fees</dt>
          <dd>{signed(p.againstHoldingWithFeesUsd)}</dd>
        </div>
      </dl>
    </article>
  );
}

function Transactions({ txs }: { txs: WalletTx[] }) {
  return (
    <div className="paper-table">
      <table>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Position</th>
            <th scope="col">What</th>
            <th scope="col">Tokens</th>
            <th scope="col">Value</th>
            <th scope="col">Transaction</th>
          </tr>
        </thead>
        <tbody>
          {txs.map((t) => (
            <tr key={t.txHash}>
              <td>{shortDate(t.ts)}</td>
              <td>
                #{t.tokenId} ({CHAIN[t.chain] ?? t.chain})
              </td>
              <td>{ACTION[t.action]}</td>
              <td>
                {amount(t.amount0)} {t.sym0}, {amount(t.amount1)} {t.sym1}
                {t.fees0 !== null && t.fees1 !== null && (
                  <span className="tx-fees">
                    {' '}
                    (of which fees {amount(t.fees0)} {t.sym0}, {amount(t.fees1)} {t.sym1})
                  </span>
                )}
              </td>
              <td>{t.usd === null ? '' : usd(t.usd)}</td>
              <td>
                <a className="path" href={(EXPLORER[t.chain]?.tx ?? '') + t.txHash} target="_blank" rel="noopener noreferrer">
                  {t.txHash.slice(0, 10)}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaperRow({ p }: { p: WalletPaperPool }) {
  return (
    <tr>
      <th scope="row">{poolName(p.poolId)}</th>
      <td>{usd(p.lastEquityUsd)}</td>
      <td>{usd(p.lastHodlUsd)}</td>
      <td>{signed(p.lastEquityUsd - p.lastHodlUsd)}</td>
      <td>{usd(p.feesUsd)}</td>
      <td>{usd(p.costsUsd)}</td>
      <td>{summarizeEvents(p.events.map((e) => e.kind))}</td>
    </tr>
  );
}
