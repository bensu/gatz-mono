// @ts-check
/**
* @type {import('@stryker-mutator/api/core').PartialStrykerOptions}
*/
module.exports = {
  // Your config here
  disableTypeChecks: 'src/**/*.{ts,tsx,js,jsx}',
  babel: {
    optionsFile: 'babel.config.js'
  },
  jest: {
    configFile: 'jest.config.js',
    config: {
        testMatch: ['**/src/gifted/Bubble.test.tsx']
      }
  },
  reporters: ['clear-text', 'progress'],
  clearTextReporter: {
    allowColor: false
  },
  mutate: [
    "src/gifted/Bubble.tsx"
  ],

};