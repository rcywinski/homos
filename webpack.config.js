const path = require('path');

module.exports = {
  entry: './public/app.js', // Entry point of your application
  output: {
    filename: 'bundle.js', // Output bundle file name
    path: path.resolve(__dirname, 'public') // Output directory
  },
  mode: 'development', // Set mode to development or production
  devServer: {
    static: {
      directory: path.resolve(__dirname, 'public'), // Serve from public directory
    },
    port: 3000, // Port number
    open: true // Open browser automatically
  }
};
