/**
 * Mock wallet panel. Read-only by construction: this bundle contains no wallet or signing library (see
 * showcase/guard.js), so there is nothing here that could connect a wallet or sign a transaction.
 */
const ADDRESS = __SHOWCASE_WALLET_ADDRESS__;

const EXPLORERS = [
  { name: 'Etherscan', url: 'https://etherscan.io/address/' },
  { name: 'Basescan', url: 'https://basescan.org/address/' },
  { name: 'Arbiscan', url: 'https://arbiscan.io/address/' },
];

export function Wallet() {
  return (
    <section className="wallet">
      <h2>Project wallet (read-only)</h2>
      <p className="lead">
        This page cannot connect a wallet and cannot sign anything. During the project the bot only proposed actions; the owner signed them in
        the owner's own wallet.
      </p>
      {ADDRESS ? (
        <dl className="wallet-facts">
          <dt>Address</dt>
          <dd className="mono">{ADDRESS}</dd>
          <dt>On-chain history</dt>
          <dd>
            {EXPLORERS.map((e, i) => (
              <span key={e.name}>
                {i > 0 && ', '}
                <a href={e.url + ADDRESS} target="_blank" rel="noopener noreferrer">
                  {e.name}
                </a>
              </span>
            ))}
          </dd>
        </dl>
      ) : (
        <p className="status">No address configured for this build (SHOWCASE_WALLET_ADDRESS).</p>
      )}
      <p className="status">
        Positions, amounts and the paper-trading ledger appear here once the ledger files are recovered from the old bot server (step 4.1b).
        Until then the morning reports hold the figures of the live period.
      </p>
    </section>
  );
}
