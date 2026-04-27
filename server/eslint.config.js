/**
 * Server ESLint flat config (ESLint v9+).
 *
 * The audit flagged that local lint behavior didn't match CI because the
 * server had no ESLint config at all. This file gives us a baseline that
 * is intentionally narrow:
 *   - Catches runtime-relevant bugs (unused vars, undeclared globals,
 *     control-character regexes, empty blocks).
 *   - Does NOT enforce style. Stylistic disagreements should not gate
 *     merges; that's what code review and prettier-on-paste are for.
 *
 * Test files get vitest globals (describe/it/expect/vi) so we don't
 * have to import them at the top of every spec.
 */
const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
    {
        ignores: [
            'node_modules/**',
            'coverage/**',
            'logs/**',
            'uploads/**',
            'dist/**',
        ],
    },
    js.configs.recommended,
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {
                ...globals.node,
            },
        },
        rules: {
            'no-unused-vars': ['warn', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrorsIgnorePattern: '^_',
                destructuredArrayIgnorePattern: '^_',
            }],
            'no-empty': ['warn', { allowEmptyCatch: true }],
            'no-control-regex': 'warn',
            'no-prototype-builtins': 'warn',
            'no-useless-escape': 'warn',
            'no-case-declarations': 'warn',
            // Errors only for things that are *almost certainly* bugs.
            'no-undef': 'error',
            'no-cond-assign': ['error', 'except-parens'],
            'no-constant-condition': ['error', { checkLoops: false }],
        },
    },
    {
        files: [
            '**/*.test.js',
            'tests/**/*.js',
            'tests/setup.js',
        ],
        languageOptions: {
            globals: {
                ...globals.node,
                describe: 'readonly',
                it: 'readonly',
                test: 'readonly',
                expect: 'readonly',
                beforeAll: 'readonly',
                beforeEach: 'readonly',
                afterAll: 'readonly',
                afterEach: 'readonly',
                vi: 'readonly',
            },
        },
        rules: {
            'no-unused-vars': 'off',
        },
    },
];
