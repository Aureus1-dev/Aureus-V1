// @ts-check
const tseslint = require('typescript-eslint');
const globals = require('globals');

module.exports = tseslint.config(
  // Ignore compiled output, test coverage, and the standalone seed script
  // (lives outside src/, validated separately — see src/scripts/bootstrap-admin.ts + its spec)
  {
    ignores: ['dist/**', 'coverage/**', 'prisma/**'],
  },

  // TypeScript source files
  {
    files: ['src/**/*.ts'],
    extends: tseslint.configs.recommended,
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      // Style — warnings only (non-blocking)
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

      // Disabled: NestJS idioms are incompatible with these
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-empty-function': 'off',
    },
  },
);
