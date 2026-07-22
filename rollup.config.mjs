import terser from '@rollup/plugin-terser'

const umd = {
  name: 'HTMLParseStringify',
  format: 'umd',
  exports: 'named',
}

export default {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/cjs/html-parse-stringify.js',
      format: 'cjs',
      exports: 'named',
    },
    { file: 'dist/esm/html-parse-stringify.js', format: 'es' },
    { ...umd, file: 'dist/umd/html-parse-stringify.js' },
    {
      ...umd,
      file: 'dist/umd/html-parse-stringify.min.js',
      plugins: [terser()],
    },
  ],
}
