/**
 * Display repair of mis-decoded text in the reports (phase 4, owner's request of 18 Nov 2026).
 *
 * On its first day (18 Aug 2026) the report generator wrote 11 log lines whose UTF-8 bytes had been read as
 * Windows-1250, so "mają" shows as "majÄ…" and a dash as "â€”". The source file in journal/ is corpus and stays as it
 * is (its hash ties every evaluation row); only the showcase's display copy is repaired, and the page says so.
 *
 * A line is repaired only when it round-trips cleanly: every character maps back to one Windows-1250 byte and the
 * bytes form valid UTF-8 that differs from the line. Correct Polish text never passes ("ą" is 0xB9 in Windows-1250,
 * not valid UTF-8 on its own), so clean lines and clean reports are left byte for byte as they are.
 */

/** Windows-1250 character -> byte, built from the platform's own decoder. */
const CP1250 = (() => {
  const dec = new TextDecoder('windows-1250');
  const map = new Map<string, number>();
  for (let b = 0x80; b <= 0xff; b++) {
    const ch = dec.decode(Uint8Array.of(b));
    if (ch !== '�' && !map.has(ch)) map.set(ch, b);
  }
  return map;
})();

const utf8 = new TextDecoder('utf-8', { fatal: true });

/** The line as it was before the mis-decoding, or null when it does not round-trip cleanly. */
export function redecodeLine(line: string): string | null {
  if (!/[^\x00-\x7f]/.test(line)) return null;
  const bytes: number[] = [];
  for (const ch of line) {
    const c = ch.codePointAt(0)!;
    if (c < 0x80) bytes.push(c);
    else {
      const b = CP1250.get(ch);
      if (b === undefined) return null;
      bytes.push(b);
    }
  }
  try {
    const out = utf8.decode(Uint8Array.from(bytes));
    return out !== line ? out : null;
  } catch {
    return null;
  }
}

/** Repairs the lines that round-trip; returns the text and how many lines changed. */
export function redecodeText(text: string): { text: string; repaired: number } {
  let repaired = 0;
  const lines = text.split('\n').map((l) => {
    const r = redecodeLine(l);
    if (r === null) return l;
    repaired++;
    return r;
  });
  return { text: lines.join('\n'), repaired };
}

export const REDECODED_NOTE = 'Some log lines of this report are re-decoded for display: the report generator stored them with the wrong text encoding on its first day. The source file keeps the original bytes.';
