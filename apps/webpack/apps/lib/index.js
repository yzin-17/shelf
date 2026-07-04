import fooDefault, { foo } from './foo.js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const barDefault = require('./bar.js');
const { bar } = barDefault;

function func() {
  console.log(fooDefault, foo, bar, barDefault);
}

export default func;

export const a = 1;
const b = 2;
export { b };
export { fooDefault, foo, bar, barDefault };
