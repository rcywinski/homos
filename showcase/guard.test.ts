/**
 * Tests for the showcase wallet guard (phase 4, step 4.2). Offline.
 * Run: npx tsx showcase/guard.test.ts
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { forbiddenPackage, FORBIDDEN_PACKAGES } = require('./guard.js') as { forbiddenPackage: (p: string) => string | null; FORBIDDEN_PACKAGES: string[] };

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) passed++;
  else {
    failed++;
    console.error(`FAIL: ${name}${detail ? ': ' + detail : ''}`);
  }
}

// The matcher, on resolved module paths as webpack reports them.
check('wagmi', forbiddenPackage('/x/node_modules/wagmi/dist/esm/index.js') === 'wagmi');
check('scoped @wagmi/core', forbiddenPackage('/x/node_modules/@wagmi/core/dist/index.js') === '@wagmi/core');
check('connectkit', forbiddenPackage('/x/node_modules/connectkit/build/index.es.js') === 'connectkit');
check('viem nested under another package', forbiddenPackage('/x/node_modules/foo/node_modules/viem/_esm/index.js') === 'viem');
check('ethers', forbiddenPackage('/x/node_modules/ethers/lib.esm/index.js') === 'ethers');
check('@walletconnect scope', forbiddenPackage('/x/node_modules/@walletconnect/sign-client/dist/index.js') === '@walletconnect/sign-client');
check('Windows path', forbiddenPackage('C:\\x\\node_modules\\@metamask\\sdk\\dist\\index.js') === '@metamask/sdk');
check('react is allowed', forbiddenPackage('/x/node_modules/react/index.js') === null);
check('react-dom is allowed', forbiddenPackage('/x/node_modules/react-dom/client.js') === null);
check('a name that only starts like a forbidden one is allowed', forbiddenPackage('/x/node_modules/viem-like-but-not/index.js') === null);
check('own source is allowed', forbiddenPackage('/x/showcase/App.tsx') === null);

// Source scan: no file in showcase/ imports a forbidden package, and nothing reaches into the cockpit UI in src/,
// which carries the wallet and signing hooks.
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    if (f === 'public' || f === 'node_modules') return [];
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx|js)$/.test(f) ? [p] : [];
  });
}
const IMPORT = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)/g;
const sources = files('showcase').filter((f) => !f.endsWith('guard.test.ts'));
for (const f of sources) {
  const text = readFileSync(f, 'utf8');
  for (const m of text.matchAll(IMPORT)) {
    const spec = m[1] ?? m[2] ?? m[3];
    const bare = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
    const scope = spec.startsWith('@') ? spec.split('/')[0] : '';
    check(`${f}: ${spec} is not a wallet package`, !FORBIDDEN_PACKAGES.includes(bare) && !FORBIDDEN_PACKAGES.includes(scope));
    check(`${f}: ${spec} does not import the cockpit UI`, !path.resolve(path.dirname(f), spec).startsWith(path.resolve('src')));
  }
}
check('the scan saw the showcase sources', sources.length >= 8, String(sources.length));

console.log(`guard: ${passed} passed, ${failed} failed (${sources.length} showcase files scanned)`);
if (failed > 0) process.exit(1);
