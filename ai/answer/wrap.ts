/**
 * Word wrap for terminal output of `npm run ask`: lines break at spaces, never inside a word, and each line is at most
 * `width` characters including the indent. A single word longer than the line stays whole on its own line.
 * Existing line breaks in the text are kept.
 */
export function wrapText(text: string, width: number, indent = ''): string {
  const room = Math.max(1, width - indent.length);
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      if (!line) line = word;
      else if (line.length + 1 + word.length <= room) line += ' ' + word;
      else {
        out.push(indent + line);
        line = word;
      }
    }
    out.push(indent + line);
  }
  return out.join('\n');
}
