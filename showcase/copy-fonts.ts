/**
 * Copies the bundled fonts into showcase/public/fonts at build time, with their licences. The CSP allows same-origin
 * fonts only, so nothing is loaded from a font host. Every family is OFL-1.1 (checked in each package.json and
 * LICENSE on 16 Nov 2026). Latin and Latin Extended subsets: the journal quotes and reports are in Polish.
 * Run: npm run showcase:fonts (part of showcase:build)
 */
import { copyFileSync, mkdirSync, rmSync } from 'fs';
import path from 'path';

const FONTS: { pkg: string; files: string[]; licence: string }[] = [
  { pkg: '@fontsource-variable/inter', files: ['inter-latin-wght-normal.woff2', 'inter-latin-ext-wght-normal.woff2'], licence: 'LICENSE-Inter.txt' },
  { pkg: '@fontsource-variable/jetbrains-mono', files: ['jetbrains-mono-latin-wght-normal.woff2', 'jetbrains-mono-latin-ext-wght-normal.woff2'], licence: 'LICENSE-JetBrainsMono.txt' },
  {
    pkg: '@fontsource/ibm-plex-sans',
    files: ['400', '500', '600'].flatMap((w) => [`ibm-plex-sans-latin-${w}-normal.woff2`, `ibm-plex-sans-latin-ext-${w}-normal.woff2`]),
    licence: 'LICENSE-IBMPlexSans.txt',
  },
  {
    pkg: '@fontsource/ibm-plex-mono',
    files: ['400', '500'].flatMap((w) => [`ibm-plex-mono-latin-${w}-normal.woff2`, `ibm-plex-mono-latin-ext-${w}-normal.woff2`]),
    licence: 'LICENSE-IBMPlexMono.txt',
  },
  { pkg: '@fontsource-variable/source-sans-3', files: ['source-sans-3-latin-wght-normal.woff2', 'source-sans-3-latin-ext-wght-normal.woff2'], licence: 'LICENSE-SourceSans3.txt' },
  { pkg: '@fontsource-variable/source-code-pro', files: ['source-code-pro-latin-wght-normal.woff2', 'source-code-pro-latin-ext-wght-normal.woff2'], licence: 'LICENSE-SourceCodePro.txt' },
];

const to = path.join('showcase', 'public', 'fonts');
rmSync(to, { recursive: true, force: true });
mkdirSync(to, { recursive: true });
for (const f of FONTS) {
  const from = path.join('node_modules', ...f.pkg.split('/'));
  for (const file of f.files) copyFileSync(path.join(from, 'files', file), path.join(to, file));
  copyFileSync(path.join(from, 'LICENSE'), path.join(to, f.licence));
}
console.log(`fonts copied to ${to}`);
