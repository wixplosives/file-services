module.exports = {
    // root of the monorepo, so that paths in output will be clickable
    context: __dirname,

    // works great. with the default 'eval', imports are not mapped.
    devtool: 'source-map',

    resolve: {
        extensions: ['.ts', '.tsx', '.mjs', '.js', '.json']
    },

    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: '@ts-tools/webpack-loader',
            },
        ]
    }
}
