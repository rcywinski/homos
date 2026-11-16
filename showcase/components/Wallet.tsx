/**
 * Wallet and paper trading (phase 4, step 4.1b). Read-only by construction: this bundle contains no wallet or signing
 * library (showcase/guard.js). Figures come from the bot's own ledger, sanitized by ai/serve/wallet-export.ts; the two
 * manual positions opened before the project are left out of every list and total (owner decision, 16 Nov 2026).
 */
import type { WalletData, WalletPaperPool, WalletPosition, WalletTx } from '../../ai/serve/showcase-data';
import { useWallet } from '../data';

const ADDRESS = __SHOWCASE_WALLET_ADDRESS__;

const EXPLORER: Record<string, { name: string; tx: string; address: string }> = {
  mainnet: { name: 'Etherscan', tx: 'https://etherscan.io/tx/', address: 'https://etherscan.io/address/' },
  base: { name: 'Basescan', tx: 'https://basescan.org/tx/', address: 'https://basescan.org/address/' },
  arbitrum: { name: 'Arbiscan', tx: 'https://arbiscan.io/tx/', address: 'https://arbiscan.io/address/' },
};
const CHAIN: Record<string, string> = { mainnet: 'Ethereum', base: 'Base', arbitrum: 'Arbitrum' };
const KIND: Record<string, string> = {
  MINT: 'Position opened',
  INCREASE: 'Deposit',
  DECREASE: 'Withdrawal',
  COLLECT: 'Collected',
};
const PAPER_EVENT: Record<string, string> = {
  OPEN: 'opened',
  REBALANCE: 'range moved',
  EXIT_TREND: 'left on a down trend',
  REENTRY: 'came back',
  CLOSE: 'closed',
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A missing ledger figure reads as words, not as a number. */
const usd = (x: number | null) =>
  x === null ? <span className="missing">not recorded</span> : `$${x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const signed = (x: number) =>
  `${x < 0 ? '-' : '+'}$${Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const shortDate = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
const amount = (x: number) => x.toLocaleString('en-US', { maximumFractionDigits: x < 1 ? 6 : 2 });

/** "base-weth-usdc-030" -> "WETH/USDC 0.30% on Base". */
function poolName(id: string): string {
  const [chain, a, b, fee] = id.split('-');
  const sym = (s: string) => (s === 'cbbtc' ? 'cbBTC' : s.toUpperCase());
  return `${sym(a)}/${sym(b)} ${(Number(fee) / 100).toFixed(2)}% on ${CHAIN[chain] ?? chain}`;
}

export function Wallet() {
  const loaded = useWallet();
  return (
    <section className="wallet" aria-labelledby="wallet-title">
      <h2 id="wallet-title" className="section-title">
        Wallet and paper trading
      </h2>
      <p className="lede">
        What the system did with real money, and what its paper trading did alongside, from the bot&apos;s own ledger.
        This page cannot connect a wallet or sign anything: the bot only proposed actions, and the owner signed them in
        the owner&apos;s own wallet.
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
      {loaded.state === 'loading' && <p className="state-note">Loading the ledger.</p>}
      {loaded.state === 'error' && (
        <p className="state-note" data-testid="wallet-missing">
          The ledger data is not part of this build. The daily reports hold the same figures for the live period.
        </p>
      )}
      {loaded.state === 'ready' && <WalletView data={loaded.data} />}
    </section>
  );
}

function WalletView({ data }: { data: WalletData }) {
  const below = data.paper.filter((p) => p.lastEquityUsd < p.lastHodlUsd).length;
  return (
    <>
      <p className="state-note" data-testid="wallet-excluded">
        {data.excluded.note}
      </p>
      <h3 className="sub-title">Real positions</h3>
      <p className="meta">
        {data.totals.positions} liquidity positions on Uniswap v3 from{' '}
        {shortDate(data.positions[0]?.openedAt ?? data.period.from)} to{' '}
        {shortDate(data.positions[data.positions.length - 1]?.closedAt ?? data.period.from)} 2026,{' '}
        {data.totals.transactions} transactions, gas {data.totals.gasEth} ETH in total. The three WETH/cbBTC positions
        are one deposit moved to a new range twice.
      </p>
      <div className="positions" data-testid="wallet-positions">
        {data.positions.map((p) => (
          <Position key={`${p.chain}:${p.tokenId}`} p={p} />
        ))}
      </div>

      <details className="more">
        <summary>All {data.transactions.length} transactions</summary>
        <Transactions txs={data.transactions} />
      </details>

      <h3 className="sub-title">Paper trading</h3>
      <p className="meta" data-testid="paper-summary">
        Virtual ${data.paper[0]?.capitalUsd.toLocaleString('en-US')} per pool from{' '}
        {shortDate(data.period.paperStartedAt)} 2026, on live prices. At the last sample, {below} of {data.paper.length}{' '}
        pools were worth less than simply holding the same tokens.
      </p>
      <div className="paper-table">
        <table>
          <thead>
            <tr>
              <th scope="col">Pool</th>
              <th scope="col">Value</th>
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
      <p className="fine-print">
        Values are the bot&apos;s own records at the last sample before each position closed (real) or on{' '}
        {shortDate(data.paper[0]?.lastSampleAt ?? '')} (paper). &quot;Holding instead&quot; is the value of the same
        deposit left in the wallet without providing liquidity.
      </p>
    </>
  );
}

function Position({ p }: { p: WalletPosition }) {
  const diff = p.lastValueUsd !== null && p.lastHodlUsd !== null ? p.lastValueUsd - p.lastHodlUsd : null;
  return (
    <article className="position">
      <h4>
        {p.pair} {p.feeTierPct !== null ? `${p.feeTierPct.toFixed(2)}%` : ''} on {CHAIN[p.chain] ?? p.chain}
      </h4>
      <p className="meta">
        Position #{p.tokenId}, {shortDate(p.openedAt)} to {shortDate(p.closedAt)}, {p.transactions} transactions
      </p>
      <dl className="figures">
        <div>
          <dt>Deposited</dt>
          <dd>{usd(p.depositedUsd)}</dd>
        </div>
        <div>
          <dt>Withdrawn</dt>
          <dd>{usd(p.withdrawnUsd)}</dd>
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
          <dt>Against holding</dt>
          <dd className={diff !== null && diff < 0 ? 'neg' : 'pos'}>{diff === null ? 'not recorded' : signed(diff)}</dd>
        </div>
        <div>
          <dt>Fees earned</dt>
          <dd>{usd(p.lastFeesUsd)}</dd>
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
            <th scope="col">Amounts</th>
            <th scope="col">Value</th>
            <th scope="col">Transaction</th>
          </tr>
        </thead>
        <tbody>
          {txs.map((t) => (
            <tr key={`${t.txHash}-${t.kind}`}>
              <td>{shortDate(t.ts)}</td>
              <td>
                #{t.tokenId} ({CHAIN[t.chain] ?? t.chain})
              </td>
              <td>{KIND[t.kind] ?? t.kind}</td>
              <td>{t.kind === 'MINT' ? '' : `${amount(t.amount0)} ${t.sym0}, ${amount(t.amount1)} ${t.sym1}`}</td>
              <td>{t.usd === null ? '' : usd(t.usd)}</td>
              <td>
                <a
                  className="path"
                  href={(EXPLORER[t.chain]?.tx ?? '') + t.txHash}
                  target="_blank"
                  rel="noopener noreferrer"
                >
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
  const diff = p.lastEquityUsd - p.lastHodlUsd;
  const events = p.events.map((e) => PAPER_EVENT[e.kind] ?? e.kind.toLowerCase());
  return (
    <tr>
      <th scope="row">{poolName(p.poolId)}</th>
      <td>{usd(p.lastEquityUsd)}</td>
      <td>{usd(p.lastHodlUsd)}</td>
      <td className={diff < 0 ? 'neg' : 'pos'}>{signed(diff)}</td>
      <td>{usd(p.feesUsd)}</td>
      <td>{usd(p.costsUsd)}</td>
      <td>
        {events.join(', ')}
      </td>
    </tr>
  );
}
