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

class NoWalletPlugin {
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
      });
    });
  }
}

module.exports = { ALLOWED_PACKAGES, FORBIDDEN_PACKAGES, forbiddenPackage, disallowedPackage, NoWalletPlugin };
