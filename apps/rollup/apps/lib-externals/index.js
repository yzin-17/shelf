import { hello } from '@vite-test/rollup-lib';

export const helloExternals = () => {
  hello();
  console.log('hello from rollup-lib-externals');
};
