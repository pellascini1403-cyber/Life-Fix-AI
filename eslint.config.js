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
    // target, never the client bundle — see backend/config.ts. Route
    // filenames are `<name>+api.ts` (e.g. `analyze+api.ts`), not literally
    // `+api.ts`, hence the `*+api.ts` glob rather than `+api.ts`.
    files: ['backend/**/*.ts', 'app/**/*+api.ts'],
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
  {
    // Client code: lint-level backstop for the "no AI provider key in the
    // mobile bundle" rule already documented in backend/config.ts and
    // src/services/ai/types.ts. Real providers are only ever called from
    // backend/aiProvider/**, reached over HTTP via RemoteAIService/ApiClient
    // — nothing under app/** (other than +api.ts routes) or src/** should
    // ever import backend/** or an AI provider SDK directly.
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    ignores: ['app/**/*+api.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/backend/**', '**/backend'],
              message:
                'Client code must never import from backend/** — it is server-only and can only be reached via RemoteAIService/ApiClient over HTTP.',
            },
            {
              group: ['@anthropic-ai/sdk', '@anthropic-ai/sdk/*'],
              message:
                'Client code must never import an AI provider SDK directly — the mobile app must never hold AI provider keys (see backend/aiProvider/AnthropicVisionProvider.ts).',
            },
          ],
        },
      ],
    },
  },
];
