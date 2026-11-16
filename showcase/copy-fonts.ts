/**
 * Copies the Recursive variable font (OFL-1.1, @fontsource-variable/recursive, weight and MONO axes) into
 * showcase/public/fonts at build time. The CSP allows same-origin fonts only, so nothing is loaded from a font host.
 * Run: npm run showcase:fonts (part of showcase:build)
 */
import { copyFileSync, mkdirSync } from 'fs';
import path from 'path';

const from = path.join('node_modules', '@fontsource-variable', 'recursive', 'files');
const to = path.join('showcase', 'public', 'fonts');
mkdirSync(to, { recursive: true });
for (const f of ['recursive-latin-mono-normal.woff2', 'recursive-latin-ext-mono-normal.woff2']) copyFileSync(path.join(from, f), path.join(to, f));
copyFileSync(path.join('node_modules', '@fontsource-variable', 'recursive', 'LICENSE'), path.join(to, 'LICENSE-Recursive.txt'));
console.log(`fonts copied to ${to}`);
