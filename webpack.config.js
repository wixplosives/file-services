const webpack = require('webpack');

/** @type {import('webpack').Configuration} */
module.exports = {
  context: __dirname, // so paths in output will be clickable
  devtool: 'source-map', // works great (unlike default "eval", where imports are not mapped)
  module: {
    rules: [
      {
        test: /\.js$/,
        enforce: 'pre',
        loader: 'source-map-loader',
      },
    ],
  },
  plugins: [new webpack.ProvidePlugin({ process: 'process' })],
};
