const path = require('path');
const webpack = require('webpack');
// .env must be loaded here, at build time: DefinePlugin inlines the values into
// the bundle, and dotenv cannot run in the browser.
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
        // [\\/] so the exclusion also matches Windows paths. If node_modules were
        // transpiled, preset-env would rewrite viem's `2n ** 7n` into
        // Math.pow(2n, 7n), which throws a TypeError at startup.
        exclude: /node_modules[\\/](?!framer-motion[\\/])/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              // ES2020 targets keep BigInt and `**` native (second line of defence
              // in case node_modules ever slips through the exclusion above).
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
