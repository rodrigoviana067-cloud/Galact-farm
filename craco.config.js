const webpack = require('webpack');
const path = require('path');

module.exports = {
    webpack: {
        alias: {
            'process/browser': path.resolve(__dirname, 'node_modules/process/browser.js')
        },
        configure: (webpackConfig) => {
            webpackConfig.resolve.fallback = {
                ...webpackConfig.resolve.fallback,
                "crypto": require.resolve("crypto-browserify"),
                "stream": require.resolve("stream-browserify"),
                "buffer": require.resolve("buffer"),
                "path": require.resolve("path-browserify"),
                "fs": false,
                "os": false,
                "http": require.resolve("stream-http"),
                "https": require.resolve("https-browserify"),
                "url": require.resolve("url"),
                "assert": require.resolve("assert"),
                "zlib": require.resolve("browserify-zlib"),
                "process": require.resolve("process/browser")
            };

            webpackConfig.module.rules.push({
                test: /\.m?js$/,
                resolve: {
                    fullySpecified: false
                }
            });

            webpackConfig.plugins.push(
                new webpack.ProvidePlugin({
                    process: 'process/browser.js',
                    Buffer: ['buffer', 'Buffer']
                })
            );

            webpackConfig.ignoreWarnings = [/Failed to parse source map/];

            return webpackConfig;
        }
    }
};
