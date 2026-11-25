// @ts-check
/**
 * Build guard for the showcase front end. Since step 4.6c it is an allow-list: the public bundle may contain only
 * react, react-dom and scheduler from node_modules, plus our own code, because the page now holds a visitor's API key
 * and any other package could read it. The forbidden list of 16 Nov 2026 (wallet and signing libraries) is kept to
 * name the reason in the error; the ESLint rule in eslint.config.js stops direct imports of those as well.
 */

/** The only packages the showcase bundle may contain (checked against the build on 18 Nov 2026: exactly these). */
const ALLOWED_PACKAGES = ['react', 'react-dom', 'scheduler'];

/** Packages that connect a wallet, hold keys or build and sign transactions. Matched on the node_modules path. */
const FORBIDDEN_PACKAGES = [
  'wagmi',
  '@wagmi',
  'connectkit',
  'viem',
  'ethers',
  'web3',
  '@walletconnect',
  '@metamask',
  '@coinbase',
  '@rainbow-me',
  '@reown',
  '@web3modal',
  '@safe-global',
  '@ledgerhq',
  '@trezor',
  '@uniswap',
  '@envio-dev',
  // Pulled in by the old cockpit's wallet stack (wagmi via the Coinbase wallet SDK, @uniswap/v3-sdk via hardhat):
  // key hashing and contract tooling, never needed by the showcase or the chat server.
  'keccak',
  'hardhat',
];

/**
 * Returns the outermost node_modules package of a resolved module path, or null for our own code.
 * @param {string} resource absolute path of a resolved module
 * @returns {string[]}
 */
function packagesOf(resource) {
  const m = resource.replace(/\\/g, '/').match(/\/node_modules\/((?:@[^/]+\/)?[^/]+)/g) || [];
  return m.map((seg) => seg.replace('/node_modules/', ''));
}

/**
 * Returns the first package of a resolved module path that is not on the allow-list, or null.
 * @param {string} resource absolute path of a resolved module
 * @returns {string | null}
 */
function disallowedPackage(resource) {
  return packagesOf(resource).find((name) => !ALLOWED_PACKAGES.includes(name)) ?? null;
}

/**
 * Returns the forbidden package a resolved module path belongs to, or null.
 * @param {string} resource absolute path of a resolved module
 * @returns {string | null}
 */
function forbiddenPackage(resource) {
  const m = resource.replace(/\\/g, '/').match(/\/node_modules\/((?:@[^/]+\/)?[^/]+)/g);
  if (!m) return null;
  for (const seg of m) {
    const name = seg.replace('/node_modules/', '');
    const scope = name.startsWith('@') ? name.split('/')[0] : null;
    if (FORBIDDEN_PACKAGES.includes(name) || (scope && FORBIDDEN_PACKAGES.includes(scope))) return name;
  }
  return null;
}

/**
 * Our own source files the Live bundle may contain (phase 5, step 5.3; repo-relative, forward slashes). The package
 * allow-list does not cover our own code: if a value import of src/hooks/useBotApi (token, browser storage) were added
 * to the paper panel, the packages would still pass. This list fails that build.
 */
const LIVE_OWN_SOURCES = [
  'showcase/live/index.tsx',
  'showcase/live/LivePage.tsx',
  'showcase/live/useLiveBot.ts',
  'showcase/live/formatters.ts',
  'src/components/ExpandableSection.tsx',
  'src/components/PaperTradingPanel.tsx',
  'src/components/PositionCharts.tsx',
  'src/config/botPools.ts',
  'src/components/BotTelemetry.tsx',
  'src/components/CycleLine.tsx',
  'src/components/ObservationAnalysis.tsx',
];

/**
 * Returns the repo-relative path of our own module that is not on `allowed`, or null (packages are checked apart).
 * @param {string} resource absolute path of a resolved module
 * @param {string} root the repo root
 * @param {string[]} allowed repo-relative paths
 * @returns {string | null}
 */
function unlistedOwnSource(resource, root, allowed) {
  const file = resource.split('?')[0];
  if (!file || /[\\/]node_modules[\\/]/.test(file)) return null;
  const rel = require('path').relative(root, file).replace(/\\/g, '/');
  return allowed.includes(rel) ? null : rel;
}

class NoWalletPlugin {
  /** @param {{ ownSources?: string[], root?: string }} [options] with `ownSources`, our own modules must be on that list */
  constructor(options = {}) {
    this.ownSources = options.ownSources;
    this.root = options.root || process.cwd();
  }

  /** @param {import('webpack').Compiler} compiler */
  apply(compiler) {
    compiler.hooks.normalModuleFactory.tap('NoWalletPlugin', (factory) => {
      factory.hooks.afterResolve.tap('NoWalletPlugin', (data) => {
        const resource = data.createData.resource || '';
        const from = data.contextInfo.issuer || 'an entry point';
        const pkg = forbiddenPackage(resource);
        if (pkg) throw new Error(`showcase build: wallet or signing package "${pkg}" imported from ${from}`);
        const other = disallowedPackage(resource);
        if (other) throw new Error(`showcase build: package "${other}" is not on the allow-list (${ALLOWED_PACKAGES.join(', ')}), imported from ${from}`);
        const own = this.ownSources ? unlistedOwnSource(resource, this.root, this.ownSources) : null;
        if (own) throw new Error(`showcase build: our own module "${own}" is not on the Live list, imported from ${from}`);
      });
    });
  }
}

module.exports = { ALLOWED_PACKAGES, FORBIDDEN_PACKAGES, LIVE_OWN_SOURCES, forbiddenPackage, disallowedPackage, unlistedOwnSource, NoWalletPlugin };
