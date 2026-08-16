// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * AKILA — Lint.
 *
 * AKT-19 §6 : « Ne pas encoder les règles dans la config eslint uniquement —
 * il faut des tests lisibles par un humain. »
 * Les règles d'architecture vivent dans tools/architecture-tests/rules.ts.
 * Ce qui suit est une SECONDE ligne de défense, pas la première.
 */
export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.next/**',
      'coverage/**',
      // Les fixtures violent les règles par construction — c'est leur raison d'être.
      '**/__fixtures__/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Qualité — pas de « any » silencieux. TypeScript strict est la première
      // ligne ; celle-ci attrape le « any » écrit à la main.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // CLAUDE.md §7 — une erreur doit être classée TRANSIENT, PERMANENT ou
      // UNKNOWN. Un catch vide n'en classe aucune : l'erreur reviendra ailleurs,
      // sans son contexte. REVIEW.md, contrôle qualité 11.
      'no-empty': ['error', { allowEmptyCatch: false }],
      eqeqeq: ['error', 'always'],
      'no-console': 'off',
    },
  },
  {
    // Les scripts CI tournent sous Node : ses globales existent réellement à l'exécution.
    files: ['tools/ci/**/*.mjs'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
      },
    },
  },
  {
    // Le domaine n'a le droit d'importer ni infrastructure ni interfaces.
    // Doublon volontaire de ARC-001/ARC-002 : l'IDE le signale avant la CI.
    files: ['apps/api/src/*/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/infrastructure/**'],
              message: "ARC-001 — le Domain ne connaît pas l'Infrastructure. Déclarez un Port.",
            },
            {
              group: ['**/interfaces/**'],
              message: 'ARC-002 — le Domain ne connaît ni Controller ni DTO HTTP.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/admin-web/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/apps/api/**'],
              message: "ARC-003 — l'UI passe par l'API HTTP, jamais par le code serveur.",
            },
          ],
        },
      ],
    },
  },
);
