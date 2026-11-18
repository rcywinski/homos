/** The introduction: what the project was, what the assistant does, why quotes are checked by code. */
export function About() {
  return (
    <div className="about" data-testid="about">
      <p>
        From August to September 2026 a small automated system provided liquidity on Uniswap v3, first on paper and then with real money, and
        kept a detailed journal of every decision. The assistant on this page answers questions about that project from its journal, decision
        log, documentation and daily reports, using a model that runs on the owner&apos;s own graphics card. Language models can invent quotes and
        figures, so code checks every quote against its source before you see it and marks every number by how well the sources back it.
      </p>
      <p className="how">
        Reading the marks: <span className="num num-verified">✓ verified in a quote</span>,{' '}
        <span className="num num-in-source">≈ found in the cited source</span>, <span className="num num-not-verified">? not verified</span>.
      </p>
    </div>
  );
}
