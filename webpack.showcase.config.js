// Showcase front end (phase 4): a separate bundle from the cockpit UI in src/. React only, no wallet or signing
// library (enforced by NoWalletPlugin and by the ESLint rule for showcase/**). No eval-based source maps, so the
// Content Security Policy in showcase/public/index.html can forbid eval.
const path = require('path');
const webpack = require('webpack');
const { NoWalletPlugin } = require('./showcase/guard.js');
require('dotenv').config();

const address = process.env.SHOWCASE_WALLET_ADDRESS || '';
if (address && !/^0x[0-9a-fA-F]{40}$/.test(address)) throw new Error('SHOWCASE_WALLET_ADDRESS must be a 0x address or empty');

const publicPage = (_env, argv) => ({
  entry: './showcase/index.tsx',
  output: {
    filename: 'app.js',
    path: path.resolve(__dirname, 'showcase/public'),
  },
  mode: argv.mode || 'development',
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            babelrc: false,
            configFile: false,
            presets: [
              ['@babel/preset-env', { targets: { chrome: '90', safari: '15', firefox: '90' } }],
              ['@babel/preset-react', { runtime: 'automatic' }],
              '@babel/preset-typescript',
            ],
          },
        },
      },
    ],
  },
  resolve: { extensions: ['.tsx', '.ts', '.js'] },
  plugins: [
    new NoWalletPlugin(),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(argv.mode === 'production' ? 'production' : 'development'),
      __SHOWCASE_WALLET_ADDRESS__: JSON.stringify(address),
    }),
  ],
  devServer: {
    static: { directory: path.resolve(__dirname, 'showcase/public') },
    port: 3100,
    host: '127.0.0.1',
    open: false,
  },
  performance: { hints: false },
});

// The admin page (step 4.10c): a separate bundle written outside showcase/public, so the public static server never
// has it; the chat server sends it only after the Access check. Same guard, same allow-list.
const adminPage = (env, argv) => {
  const base = publicPage(env, argv);
  return { ...base, name: 'admin', entry: './showcase/admin/admin.tsx', output: { filename: 'admin.js', path: path.resolve(__dirname, 'showcase/admin-dist') }, devServer: undefined };
};

module.exports = (env, argv) => [publicPage(env, argv), adminPage(env, argv)];
