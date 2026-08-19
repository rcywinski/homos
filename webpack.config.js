const path = require('path');
const webpack = require('webpack');

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
        // [\\/] zamiast /: na Windows ścieżki mają backslashe — stary regex
        // nie wykluczał NIC, babel transpilował całe node_modules i preset-env
        // (bez targets = najstarsze przeglądarki) przepisywał `2n ** 7n` (viem)
        // na Math.pow(2n,7n) → TypeError przy starcie → biała strona
        // (incydent 18-19.08: każdy build z Windows był zepsuty, z Maca OK).
        exclude: /node_modules[\\/](?!framer-motion[\\/])/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              // targets es2020: BigInt/`**` zostają natywne nawet gdyby
              // exclude znów przepuścił node_modules (druga linia obrony)
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
