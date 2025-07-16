import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default [
  {
    ignores: ['dist/', 'node_modules/', 'src/types/*.d.ts', 'vite.config.ts'],
  },
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'prettier': prettier,
    },
    rules: {
      // Disabilita regole JavaScript che confliggono con TypeScript
      'no-unused-vars': 'off',
      'no-undef': 'off',
      
      // Regole TypeScript
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_' 
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-inferrable-types': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      
      // Regole di stile generali
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': 'error',
      
      // Regole Prettier per formattazione
      'prettier/prettier': ['error', {
        'tabWidth': 2,
        'useTabs': false,
        'semi': true,
        'singleQuote': false,
        'quoteProps': 'as-needed',
        'trailingComma': 'none',
        'bracketSpacing': true,
        'bracketSameLine': false,
        'arrowParens': 'avoid',
        'printWidth': 100,
        'endOfLine': 'lf'
      }],
    },
  },
  prettierConfig,
  
];
