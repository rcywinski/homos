// @ts-check
/**
 * Build guard for the showcase front end (phase 4, owner decision of 16 Nov 2026): the public bundle must not contain
 * any wallet or signing library. The ESLint rule in eslint.config.js stops direct imports; this webpack plugin also
 * catches a library pulled in indirectly, by failing the build when any such module is resolved.
 */

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
];

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
        const pkg = forbiddenPackage(resource);
        if (pkg) {
          const from = data.contextInfo.issuer || 'an entry point';
          throw new Error(`showcase build: wallet or signing package "${pkg}" imported from ${from}`);
        }
      });
    });
  }
}

module.exports = { FORBIDDEN_PACKAGES, forbiddenPackage, NoWalletPlugin };
