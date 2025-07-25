import { ESLint } from 'eslint';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default {
  files: ['src/**/*.ts', 'apps/**/*.ts', 'libs/**/*.ts', 'test/**/*.ts'],
  ignores: ['eslint.config.mjs'],
  parser: "tsParser",
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: new URL('.', import.meta.url).pathname,
    sourceType: 'module', // or 'commonjs' depending on your codebase
  },
  plugins: {
    '@typescript-eslint': tsPlugin,
    prettier: prettierRecommended,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:prettier/recommended',
  ],
  env: {
    node: true,
    jest: true,
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-floating-promises': 'warn',
    '@typescript-eslint/no-unsafe-argument': 'warn',
    '@typescript-eslint/no-unsafe-call': 'warn',
    '@typescript-eslint/no-unsafe-assignment': 'warn',
  },
};
