const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*'],
  },
  {
    files: ['jest.setup.js', 'jest.config.js', 'babel.config.js'],
    languageOptions: {
      globals: { jest: 'readonly', module: 'readonly', require: 'readonly' },
    },
  },
];
