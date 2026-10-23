import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

const cleanGlobals = (entries) => Object.fromEntries(
  Object.entries(entries).map(([key, value]) => [key.trim(), value])
)

// `globals.browser` covers DOM/BOM only — it omits ES built-ins like `Intl`,
// so the language globals have to be merged in or `no-undef` flags them.
const browserGlobals = { ...cleanGlobals(globals.es2021), ...cleanGlobals(globals.browser) }
const nodeGlobals = cleanGlobals(globals.node)

export default [
  { ignores: ['dist'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: browserGlobals,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // `_`-prefixed names are deliberate: a skipped tuple slot, an unused
      // argument, a key split off with ...rest.
      'no-unused-vars': ['error', {
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  {
    files: ['api/**/*.js', 'functions/**/*.js', 'vite.config.js', 'scripts/**/*.mjs', '**/*.test.js'],
    languageOptions: {
      globals: nodeGlobals,
    },
  },
  // Data tables that happen to hold JSX (badge icons): never hot-reloaded as
  // components, so the fast-refresh export rule has nothing to protect there.
  {
    files: ['src/constants/**/*.jsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
]
