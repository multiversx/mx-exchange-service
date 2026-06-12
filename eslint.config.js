const tseslint = require('typescript-eslint');
const eslintConfigPrettier = require('eslint-config-prettier');
const globals = require('globals');

module.exports = tseslint.config(
    {
        ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
    },
    ...tseslint.configs.recommended,
    {
        languageOptions: {
            parserOptions: {
                project: 'tsconfig.json',
                sourceType: 'module',
            },
            globals: {
                ...globals.node,
                ...globals.jest,
            },
        },
        rules: {
            '@typescript-eslint/interface-name-prefix': 'off',
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-require-imports': 'off',
            '@typescript-eslint/no-unused-expressions': 'warn',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    args: 'after-used',
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    ignoreRestSiblings: true,
                },
            ],
            'prefer-const': ['error', { destructuring: 'all' }],
        },
    },
    eslintConfigPrettier,
);
