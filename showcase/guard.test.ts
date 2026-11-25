/**
 * Tests for the showcase wallet guard (phase 4, step 4.2). Offline.
 * Run: npx tsx showcase/guard.test.ts
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { forbiddenPackage, disallowedPackage, unlistedOwnSource, LIVE_OWN_SOURCES, ALLOWED_PACKAGES, FORBIDDEN_PACKAGES } = require('./guard.js') as {
  unlistedOwnSource: (resource: string, root: string, allowed: string[]) => string | null;
  LIVE_OWN_SOURCES: string[];
  forbiddenPackage: (p: string) => string | null;
  disallowedPackage: (p: string) => string | null;
  ALLOWED_PACKAGES: string[];
  FORBIDDEN_PACKAGES: string[];
};

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

// Step 4.6c: the allow-list. Only react, react-dom and scheduler; any other package fails the build.
check('allow-list is exactly react, react-dom, scheduler', ALLOWED_PACKAGES.join() === 'react,react-dom,scheduler');
check('react on the allow-list', disallowedPackage('/x/node_modules/react/jsx-runtime.js') === null);
check('scheduler on the allow-list', disallowedPackage('/x/node_modules/scheduler/index.js') === null);
check('own code passes', disallowedPackage('/x/showcase/guest-key.ts') === null && disallowedPackage('/x/ai/serve/numbers.ts') === null);
check('an unknown harmless-looking package fails', disallowedPackage('/x/node_modules/left-pad/index.js') === 'left-pad');
check('a scoped package fails', disallowedPackage('/x/node_modules/@anthropic-ai/sdk/index.js') === '@anthropic-ai/sdk');
check('a package nested under react fails', disallowedPackage('/x/node_modules/react/node_modules/loose-envify/index.js') === 'loose-envify');
check('Windows path', disallowedPackage('C:\\x\\node_modules\\lodash\\index.js') === 'lodash');

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
/**
 * The src/ modules the Live page may import (phase 5, step 5.3): the paper panel and what it pulls in. Each holds only
 * React and types; utils/formatters (which imports viem) is swapped by the Live build for showcase/live/formatters.ts.
 */
const LIVE_SRC_MODULES = ['components/ExpandableSection', 'components/PaperTradingPanel'];
const LIVE_SRC_TYPES = ['hooks/useBotApi'];
/** What those modules may import in turn (checked below), so a later change in src/ cannot widen the Live bundle. */
const LIVE_SRC_REACH: Record<string, string[]> = {
  'components/ExpandableSection.tsx': ['react'],
  'components/PaperTradingPanel.tsx': ['react', '../hooks/useBotApi', '../config/botPools', './PositionCharts', '../utils/formatters'],
  'components/PositionCharts.tsx': ['react', '../config/botPools'],
  'config/botPools.ts': ['viem'],
};
for (const [file, allowed] of Object.entries(LIVE_SRC_REACH)) {
  const text = readFileSync(path.join('src', file), 'utf8');
  const specs = [...text.matchAll(/^import\s[^;]*?from\s*['"]([^'"]+)['"]/gm)].map((m) => m[1]);
  check(`src/${file} imports only ${allowed.join(', ')}`, specs.every((x) => allowed.includes(x)), specs.join(', '));
}
// botPools.ts takes only the Address type from viem, which the TypeScript preset erases; the bundle check above
// (allow-list on the built Live bundle) is what proves no viem code ships.
check('src/config/botPools.ts uses viem for a type only', /import \{ Address \} from 'viem'/.test(readFileSync('src/config/botPools.ts', 'utf8')) && !/viem'\)?\.|from 'viem';[\s\S]*\b(createPublicClient|formatUnits|parseUnits)\b/.test(readFileSync('src/config/botPools.ts', 'utf8')));
check('the Live build swaps utils/formatters', /NormalModuleReplacementPlugin\(\/\[\\\\\/\]utils\[\\\\\/\]formatters\$\/, path\.resolve\(__dirname, 'showcase\/live\/formatters\.ts'\)\)/.test(readFileSync('webpack.showcase.config.js', 'utf8')));

const sources = files('showcase').filter((f) => !f.endsWith('guard.test.ts'));
for (const f of sources) {
  const text = readFileSync(f, 'utf8');
  for (const m of text.matchAll(IMPORT)) {
    const spec = m[1] ?? m[2] ?? m[3];
    const bare = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
    const scope = spec.startsWith('@') ? spec.split('/')[0] : '';
    check(`${f}: ${spec} is not a wallet package`, !FORBIDDEN_PACKAGES.includes(bare) && !FORBIDDEN_PACKAGES.includes(scope));
    const target = path.resolve(path.dirname(f), spec);
    if (target.startsWith(path.resolve('src')) && f.startsWith(path.join('showcase', 'live') + path.sep)) {
      // Phase 5: the Live page reuses the original read-only paper panel; only the listed modules, and the cockpit's
      // data hook for its types only (an `import type` is erased from the bundle).
      const rel = path.relative(path.resolve('src'), target).replace(/\\/g, '/');
      const typeOnly = new RegExp(`import\\s+type\\s[^'"]*from\\s*['"]${spec.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}['"]`).test(text);
      check(`${f}: ${spec} is on the Live list`, LIVE_SRC_MODULES.includes(rel) || (LIVE_SRC_TYPES.includes(rel) && typeOnly), rel);
      continue;
    }
    check(`${f}: ${spec} does not import the cockpit UI`, !target.startsWith(path.resolve('src')));
  }
}
check('the scan saw the showcase sources', sources.length >= 8, String(sources.length));

// Phase 5: the Live bundle's own modules are a fixed list, enforced by the build (NoWalletPlugin with ownSources).
const root = path.resolve('.');
check('a listed own module passes', unlistedOwnSource(path.join(root, 'src/components/PaperTradingPanel.tsx'), root, LIVE_OWN_SOURCES) === null);
check('the cockpit data hook is refused', unlistedOwnSource(path.join(root, 'src/hooks/useBotApi.ts'), root, LIVE_OWN_SOURCES) === 'src/hooks/useBotApi.ts');
check('the viem formatter is refused', unlistedOwnSource(path.join(root, 'src/utils/formatters.ts'), root, LIVE_OWN_SOURCES) === 'src/utils/formatters.ts');
check('packages are left to the package check', unlistedOwnSource(path.join(root, 'node_modules/react/index.js'), root, LIVE_OWN_SOURCES) === null);
check('a query string is ignored', unlistedOwnSource(path.join(root, 'showcase/live/index.tsx') + '?x', root, LIVE_OWN_SOURCES) === null);
check('the Live build uses the own-source list', /new NoWalletPlugin\(\{ ownSources: LIVE_OWN_SOURCES, root: __dirname \}\)/.test(readFileSync('webpack.showcase.config.js', 'utf8')));
// When the Live bundle is built (CI builds before the tests), its source map lists exactly those modules.
const mapFile = path.join('showcase', 'public', 'live', 'live.js.map');
if (existsSync(mapFile)) {
  const own = (JSON.parse(readFileSync(mapFile, 'utf8')) as { sources: string[] }).sources
    .filter((x) => !x.includes('node_modules') && !x.startsWith('webpack/') && !x.includes('/webpack/'))
    .map((x) => x.replace(/^webpack:\/\/[^/]*\/\.\//, ''))
    .sort();
  check('the built Live bundle holds exactly the listed own modules', own.join() === [...LIVE_OWN_SOURCES].sort().join(), own.join(', '));
}

console.log(`guard: ${passed} passed, ${failed} failed (${sources.length} showcase files scanned)`);
if (failed > 0) process.exit(1);
