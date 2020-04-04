const { join } = require('path');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = {
    // root of the monorepo, so that paths in output will be clickable
    context: __dirname,

    // works great. with the default 'eval', imports are not mapped.
    devtool: 'source-map',

    resolve: {
        extensions: ['.ts', '.tsx', '.mjs', '.js', '.json'],
        plugins: [new TsconfigPathsPlugin({ configFile: join(__dirname, 'tsconfig.json') })],
    },

    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: '@ts-tools/webpack-loader',
            },
        ],
    },
};
