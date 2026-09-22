const path = require('path');
const webpack = require('webpack');
// Without this, .env is NOT read at build time — DefinePlugin baked in an
// empty WALLET_CONNECT_PROJECT_ID despite the entry in the file (found 19.08:
// no WalletConnect/Rabby on iOS). dotenv.config() in src/ is a no-op
// in the browser; the only proper place is the build.
require('dotenv').config();

module.exports = {
  entry: './src/index.tsx',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'public')
  },
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.(ts|tsx|js|jsx|mjs)$/,
        // [\\/] instead of /: on Windows paths have backslashes — the old regex
        // excluded NOTHING, babel transpiled all of node_modules and preset-env
        // (no targets = oldest browsers) rewrote `2n ** 7n` (viem)
        // to Math.pow(2n,7n) → TypeError at startup → white page
        // (incident 18-19.08: every build from Windows was broken, from the Mac OK).
        exclude: /node_modules[\\/](?!framer-motion[\\/])/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              // targets es2020: BigInt/`**` stay native even if
              // exclude let node_modules through again (second line of defense)
              ['@babel/preset-env', { targets: { chrome: '80', safari: '14', firefox: '78' } }],
              '@babel/preset-react',
              '@babel/preset-typescript'
            ]
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx', '.mjs'],
    fallback: {
      "crypto": require.resolve("crypto-browserify"),
      "stream": require.resolve("stream-browserify"),
      "path": require.resolve("path-browserify"),
      "os": require.resolve("os-browserify/browser"),
      "buffer": require.resolve("buffer/"),
      "vm": require.resolve("vm-browserify"),
      "process": false
    },
    alias: {
      'process/browser': require.resolve('process/browser.js'),
      // Optional react-native dependency of @metamask/sdk — not needed in browser
      '@react-native-async-storage/async-storage': false
    }
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser.js',
      Buffer: ['buffer', 'Buffer']
    }),
    new webpack.DefinePlugin({
      'process.env.WALLET_CONNECT_PROJECT_ID': JSON.stringify(process.env.WALLET_CONNECT_PROJECT_ID || ''),
      'process.env.RPC_URL': JSON.stringify(process.env.RPC_URL || ''),
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
    })
  ],
  devServer: {
    static: {
      directory: path.resolve(__dirname, 'public'),
    },
    port: 3000,
    open: true
  }
};
