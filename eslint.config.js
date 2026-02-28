import globals from 'globals';

/**
 * S4 Ledger — ESLint Flat Config
 * Enforces code quality across prod-app and demo-app source files.
 * Uses flat config (eslint.config.js) for ESLint 9+.
 */
export default [
  {
    // Global ignores
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/*.min.js',
      '**/s4-assets/**',
      '**/__pycache__/**',
    ],
  },
  {
    // JavaScript source files
    files: ['prod-app/src/js/**/*.js', 'demo-app/src/js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        // Chart.js global
        Chart: 'readonly',
        // Bootstrap global
        bootstrap: 'readonly',
        // CDN libraries
        XLSX: 'readonly',
        pdfjsLib: 'readonly',
        mammoth: 'readonly',
        QRCode: 'readonly',
        // Supabase
        supabase: 'readonly',
      },
    },
    rules: {
      // Error prevention
      'no-undef': 'warn',
      'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_' }],
      'no-redeclare': 'warn',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-unreachable': 'warn',
      'no-constant-condition': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-extra-semi': 'error',
      'no-func-assign': 'error',
      'no-inner-declarations': 'warn',

      // Best practices
      'eqeqeq': ['warn', 'smart'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'warn',
      'no-with': 'error',
      'no-throw-literal': 'warn',
      'prefer-const': 'off', // many vars use var intentionally

      // Style (relaxed — large existing codebase)
      'no-trailing-spaces': 'off',
      'semi': 'off',
      'quotes': 'off',
      'indent': 'off',
      'comma-dangle': 'off',
    },
  },
  {
    // Test files — more relaxed
    files: ['tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
        test: 'readonly',
      },
    },
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off',
    },
  },
];
