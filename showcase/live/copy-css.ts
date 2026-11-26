/**
 * Copies the original cockpit stylesheet (src/styles.css) to showcase/public/live/cockpit.css at build time, so the
 * Live page has the original look without a second copy in the repo. It is served only on /live/, so its class rules
 * never meet the archive page's stylesheet.
 * Run: npm run showcase:live-css (part of showcase:build)
 */
import { copyFileSync, mkdirSync } from 'fs';
import path from 'path';

const to = path.join('showcase', 'public', 'live');
mkdirSync(to, { recursive: true });
copyFileSync(path.join('src', 'styles.css'), path.join(to, 'cockpit.css'));
console.log(`cockpit stylesheet copied to ${to}`);
