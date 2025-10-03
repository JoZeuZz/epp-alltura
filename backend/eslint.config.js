const globals = require('globals');
const js = require('@eslint/js');

module.exports = [
  {
    rules: {
      'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    },
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 12,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
  },
];
