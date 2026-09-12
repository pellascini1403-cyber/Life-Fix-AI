const globals = require('globals');
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
  {
    // Server-only code: Expo Router bundles `+api.ts` routes (and anything
    // they import, i.e. everything under backend/) into a Node server
    // target, never the client bundle — see backend/config.ts.
    files: ['backend/**/*.ts', 'app/**/+api.ts'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      // This rule exists so Expo's client-side EXPO_PUBLIC_* babel inlining
      // can statically find every reference; it doesn't apply to
      // server-only code reading its own (non-inlined) env vars at runtime.
      'expo/no-dynamic-env-var': 'off',
    },
  },
];
