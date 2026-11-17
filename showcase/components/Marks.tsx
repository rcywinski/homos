/**
 * Verification marks, shared by the chat and the saved comparison. Three states for numbers and two for quotes; each
 * state differs in shape and in words, not only in colour (owner rule, 16 Nov 2026):
 *   verified             solid underline and a check mark
 *   in the cited source  dotted underline and an approximately-equal sign
 *   not verified         wavy underline and a question mark
 */
import type { ShowcaseCitation, ShowcaseNumber } from '../../ai/serve/showcase-data';

const NUMBER_TEXT: Record<ShowcaseNumber['status'], string> = {
  verified: 'Verified: this number is in a checked quote',
  'in-source': 'In the cited source: this number is in a source the answer cites, but not in its quote',
  'not-verified': 'Not verified: this number is not in any quote or cited source',
};
const GLYPH: Record<ShowcaseNumber['status'], string> = { verified: '✓', 'in-source': '≈', 'not-verified': '?' };
const TRANSFORMATION_TEXT: Record<NonNullable<ShowcaseNumber['transformation']>, string> = {
  'date-written-out': 'the source writes this date as',
  'year-added': 'the source gives the date without the year:',
  rounded: 'rounded from',
};

function numberTitle(n: ShowcaseNumber): string {
  const base = NUMBER_TEXT[n.status];
  return n.transformation && n.from ? `${base} (${TRANSFORMATION_TEXT[n.transformation]} ${n.from})` : base;
}

/** The answer text with every number wrapped in its mark. */
export function MarkedText({ text, numbers }: { text: string; numbers: ShowcaseNumber[] }) {
  const parts: (string | JSX.Element)[] = [];
  let at = 0;
  numbers
    .slice()
    .sort((a, b) => a.start - b.start)
    .forEach((n, i) => {
      if (n.start < at) return;
      parts.push(text.slice(at, n.start));
      parts.push(
        <span key={i} className={`num num-${n.status}`} title={numberTitle(n)} data-state={n.status}>
          {text.slice(n.start, n.end)}
          <span className="num-glyph" aria-hidden="true">
            {GLYPH[n.status]}
          </span>
          <span className="sr-only"> ({numberTitle(n)})</span>
        </span>,
      );
      at = n.end;
    });
  parts.push(text.slice(at));
  return <p className="answer-text">{parts}</p>;
}

/** Counts of each state, shown above an answer so a reader sees the balance before reading. */
export function NumberSummary({ numbers }: { numbers: ShowcaseNumber[] }) {
  if (numbers.length === 0) return null;
  const parts = (['verified', 'in-source', 'not-verified'] as const)
    .map((state) => ({ state, n: numbers.filter((x) => x.status === state).length }))
    .filter((p) => p.n > 0);
  const words: Record<ShowcaseNumber['status'], string> = {
    verified: 'verified',
    'in-source': 'in the cited source',
    'not-verified': 'not verified',
  };
  return (
    <p className="number-summary" data-testid="number-summary">
      Numbers in this answer:{' '}
      {parts.map((p, i) => (
        <span key={p.state}>
          {i > 0 && ', '}
          <span className={`num num-${p.state}`}>
            {p.n} {words[p.state]}
            <span className="num-glyph" aria-hidden="true">
              {GLYPH[p.state]}
            </span>
          </span>
        </span>
      ))}
      .
    </p>
  );
}

const REASON: Record<NonNullable<ShowcaseCitation['reason']>, string> = {
  'not-in-chunk': 'the quote is not in the cited source',
  'unknown-chunk': 'the cited source was not among those given to the model',
};

const QUOTE_OK =
  'Code check: these exact words exist in the cited source. It says nothing about whether the answer is right.';
const QUOTE_BAD = 'Code check failed: these words are not in the cited source.';
/** The journal and the reports are in Polish; the documentation is in English. */
const polish = (file: string) => file.startsWith('journal/');

export function where(c: { file: string; lines: [number, number] | null }) {
  return c.lines ? `${c.file}:${c.lines[0]}${c.lines[1] !== c.lines[0] ? `-${c.lines[1]}` : ''}` : c.file;
}

export function Citations({ citations }: { citations: ShowcaseCitation[] }) {
  if (citations.length === 0) return null;
  return (
    <ol className="quotes">
      {citations.map((c, i) => (
        <li key={i} className={`quote quote-${c.status}`} data-state={c.status}>
          <span className="quote-state" title={c.status === 'verified' ? QUOTE_OK : QUOTE_BAD}>
            {c.status === 'verified' ? 'Verified quote ✓' : 'Not verified ?'}
          </span>
          <q lang={polish(c.file) ? 'pl' : 'en'}>{c.quote}</q>
          <span className="quote-source">
            {polish(c.file) ? 'Original, in Polish. ' : ''}
            <span className="path">{where(c)}</span>
          </span>
          {c.reason && <span className="quote-note">Not verified because {REASON[c.reason]}.</span>}
          {c.tooLong && <span className="quote-note">Longer than the 40-word quoting rule.</span>}
        </li>
      ))}
    </ol>
  );
}

/** How to read the marks; shown once at the top of the chat and of the comparison. */
export function Legend() {
  return (
    <dl className="legend" aria-label="How to read the marks">
      <div>
        <dt>
          <span className="num num-verified">
            2169
            <span className="num-glyph" aria-hidden="true">
              ✓
            </span>
          </span>
        </dt>
        <dd>Verified: in a quote that code found word for word in the source.</dd>
      </div>
      <div>
        <dt>
          <span className="num num-in-source">
            720
            <span className="num-glyph" aria-hidden="true">
              ≈
            </span>
          </span>
        </dt>
        <dd>
          In the cited source: not in the quote, but in the source it cites, or a date or rounding of a number there.
        </dd>
      </div>
      <div>
        <dt>
          <span className="num num-not-verified">
            4x
            <span className="num-glyph" aria-hidden="true">
              ?
            </span>
          </span>
        </dt>
        <dd>Not verified: no source backs it. Sums, ratios and multiples the model worked out stay here.</dd>
      </div>
      <div className="legend-wide">
        <dt>What a number mark does not say</dt>
        <dd>
          A mark only says where the number appears: in a checked quote, in a source the answer cites, or nowhere the
          answer points to. It does not say the number answers the question. A date that is in the source but belongs to
          a different event still gets a check mark.
        </dd>
      </div>
      <div className="legend-wide">
        <dt>Verified quote ✓</dt>
        <dd>
          A mechanical check: the quoted words exist in the source. It does not say the answer is right; a verified
          quote can still be used to support a wrong claim.
        </dd>
      </div>
      <div className="legend-wide">
        <dt>The judge&apos;s grade</dt>
        <dd>
          Only on the saved answers: a separate model compared the whole answer with a reference written by hand.
          &quot;Some of its claims go beyond its quotes&quot; can sit next to verified quotes, because the quotes are
          real but the answer says more than they do.
        </dd>
      </div>
    </dl>
  );
}
