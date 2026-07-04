import commonjs from '@rollup/plugin-commonjs';

export default {
  input: './index.js',
  output: [
    {
      file: './dist/lib.cjs.js',
      format: 'cjs',
      exports: 'named',
    },
    {
      file: './dist/lib.es.js',
      format: 'es',
    },
    {
      file: './dist/lib.umd.js',
      format: 'umd',
      name: 'lib',
      exports: 'named',
    },
  ],
  plugins: [
    commonjs({
      // transformMixedEsModules: true,
    }),
  ],
};
