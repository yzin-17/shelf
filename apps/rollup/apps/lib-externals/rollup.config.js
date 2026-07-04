import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: './index.js',
  output: {
    file: './dist/index.js',
    format: 'umd',
    name: 'npma',
  },
  plugins: [nodeResolve()],
  external: ['npmtest'],
};
