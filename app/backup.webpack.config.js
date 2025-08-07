const path = require('path');
const webpack = require('webpack');
const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  // Customize the config before returning it.
  const newConfig = {
    ...config,
    cache: false,
    entry: path.resolve(__dirname, 'node_modules/expo-router/entry.js'),
    resolve: {
      ...config.resolve,
      modules: [
        ...(config.resolve.modules || []), 
        'node_modules',
        'src',
      ],
    },
    plugins: [
      new webpack.DefinePlugin({
        'process': JSON.stringify({
          env: {
            NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'development'),
            // Add other environment variables or properties as needed
          },
          platform: 'darwin',
          // Mock other properties of the process object as needed
        }),
      }),
    ],
  };
  console.log(newConfig);
  return newConfig;
};
