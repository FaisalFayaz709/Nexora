import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
    },
  },
  {
    files: ['frontend/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['@nexora/database', '@nexora/database/*', '../backend/*', '../../backend/*', '../database/*', '../../database/*'], message: 'Frontend may import only browser-safe shared packages.' },
        ],
      }],
    },
  },
  {
    files: ['backend/src/**/*.routes.ts', 'backend/src/**/*.controller.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['@prisma/client', '@nexora/database', '@nexora/database/*'], message: 'Routes/controllers must never access Prisma/database directly.' },
        ],
      }],
    },
  },
  {
    files: ['shared/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['@prisma/client', 'argon2', 'bcrypt', 'jsonwebtoken', 'minio', 'node:crypto', 'node:fs', 'node:path'], message: 'Shared root package must remain browser-safe.' },
        ],
      }],
    },
  },
);
