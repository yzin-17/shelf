import { helloExternals } from '@vite-test/rollup-lib-externals';

export const main = () => {
  helloExternals();
  console.log('hello from rollup main');
};
