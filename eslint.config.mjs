import neostandard from 'neostandard'

export default [
  {
    ignores: ['dist/**', 'coverage/**'],
  },
  // style is prettier's job (repo prettier config: no semi, single quotes)
  ...neostandard({ noStyle: true }),
  {
    // historical test files ported verbatim from the tape suite
    files: ['test/**'],
    rules: {
      'no-var': 'off',
      'no-empty': 'off',
    },
  },
]
