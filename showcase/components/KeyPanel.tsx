/**
 * The key field of guest-key mode (phase 4, step 4.6b). The field is read once, when the visitor presses "Use this
 * key", handed to showcase/guest-key.ts and cleared at once; React state holds only whether a key is set. No <form>
 * element, so a browser has no form to offer to save; the password managers' ignore attributes are set as well.
 */
import { useRef } from 'react';
import { forgetKey, setKey } from '../guest-key';

export function KeyPanel({ keySet, onChange }: { keySet: boolean; onChange: (set: boolean) => void }) {
  const field = useRef<HTMLInputElement | null>(null);

  const use = () => {
    const el = field.current;
    if (!el) return;
    const ok = setKey(el.value);
    el.value = '';
    onChange(ok);
  };

  return (
    <div className="key-panel" data-testid="key-panel">
      {keySet ? (
        <p className="key-state" role="status" data-testid="key-state">
          A key is set for this page view only.{' '}
          <button
            type="button"
            className="link-button"
            onClick={() => {
              forgetKey();
              onChange(false);
            }}
          >
            Forget my key
          </button>
        </p>
      ) : (
        <div className="key-row">
          <label htmlFor="guest-key" className="field-label">
            Your Anthropic API key
          </label>
          <input
            id="guest-key"
            ref={field}
            type="password"
            autoComplete="new-password"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            data-1p-ignore=""
            data-lpignore="true"
            data-form-type="other"
            onKeyDown={(e) => {
              if (e.key === 'Enter') use();
            }}
          />
          <button type="button" className="primary" onClick={use}>
            Use this key
          </button>
        </div>
      )}
      <ul className="key-notes" data-testid="key-notes">
        <li>
          Your key is used from your browser to call Anthropic directly. It is never sent to this site&apos;s server, never
          stored, and forgotten when you reload the page.
        </li>
        <li>
          Each question costs roughly 3 US cents on your account (Claude Sonnet 5.5 reading about 13,000 tokens of
          sources; measured on 34 test questions: 1.5 to 4.3 cents). One click is one call; nothing is retried.
        </li>
        <li>
          Use a key you create for this, with a low spend limit on its workspace and a short expiry, and delete it
          afterwards.
        </li>
        <li>
          To check it yourself: open your browser&apos;s developer tools, Network tab, and ask a question. The request
          carrying your key goes only to api.anthropic.com; the requests to this site carry the question and the answer,
          not the key.
        </li>
      </ul>
    </div>
  );
}
