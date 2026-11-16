/**
 * A small Markdown renderer for the morning reports (phase 4, step 4.5). It covers what the reports use: headings,
 * paragraphs, bullet and numbered lists, pipe tables, fenced code blocks, bold and inline code. It builds React
 * elements only (no innerHTML), so report text can never become markup. Code blocks (pipeline logs, JSON dumps) are
 * collapsed by default.
 */
import type { ReactNode } from 'react';

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let at = 0;
  let i = 0;
  for (const m of text.matchAll(re)) {
    const start = m.index ?? 0;
    if (start > at) out.push(text.slice(at, start));
    const token = m[0];
    out.push(token.startsWith('`') ? <code key={`${key}-${i++}`}>{token.slice(1, -1)}</code> : <strong key={`${key}-${i++}`}>{token.slice(2, -2)}</strong>);
    at = start + token.length;
  }
  if (at < text.length) out.push(text.slice(at));
  return out;
}

const cells = (row: string) =>
  row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());

export function Markdown({ text, skipTitle = false }: { text: string; skipTitle?: boolean }) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let lastHeading = '';
  let i = 0;
  let k = 0;
  const key = () => `b${k++}`;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const fence = line.match(/^```(\w*)/);
    if (fence) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) body.push(lines[i++]);
      i++;
      const what = fence[1] === 'json' ? 'Data' : /log/i.test(lastHeading) ? 'Log' : 'Output';
      blocks.push(
        <details key={key()} className="md-code">
          <summary>
            {what}, {body.length} {body.length === 1 ? 'line' : 'lines'}
          </summary>
          <pre>{body.join('\n')}</pre>
        </details>,
      );
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      lastHeading = heading[2];
      i++;
      if (level === 1 && skipTitle) continue;
      const Tag = (`h${Math.min(6, level + 2)}` as 'h3' | 'h4' | 'h5' | 'h6');
      blocks.push(<Tag key={key()}>{inline(heading[2], key())}</Tag>);
      continue;
    }
    if (line.trim().startsWith('|') && lines[i + 1]?.match(/^\s*\|?\s*:?-{3,}/)) {
      const head = cells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(cells(lines[i++]));
      blocks.push(
        <div key={key()} className="md-table">
          <table>
            <thead>
              <tr>
                {head.map((h, j) => (
                  <th key={j} scope="col">
                    {inline(h, `h${j}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, j) => (
                    <td key={j}>{inline(c, `c${ri}-${j}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    const bullet = /^\s*[-*]\s+/;
    const numbered = /^\s*\d+\.\s+/;
    if (bullet.test(line) || numbered.test(line)) {
      const ordered = numbered.test(line);
      const items: string[] = [];
      while (i < lines.length && (ordered ? numbered : bullet).test(lines[i])) {
        let item = lines[i++].replace(ordered ? numbered : bullet, '');
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !bullet.test(lines[i]) && !numbered.test(lines[i])) item += ' ' + lines[i++].trim();
        items.push(item);
      }
      const List = ordered ? 'ol' : 'ul';
      blocks.push(
        <List key={key()}>
          {items.map((it, j) => (
            <li key={j}>{inline(it, `l${j}`)}</li>
          ))}
        </List>,
      );
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(```|#{1,4}\s|\s*[-*]\s|\s*\d+\.\s|\s*\|)/.test(lines[i])) para.push(lines[i++].trim());
    if (para.length === 0) para.push(lines[i++]);
    blocks.push(<p key={key()}>{inline(para.join(' '), key())}</p>);
  }
  return <div className="md">{blocks}</div>;
}
