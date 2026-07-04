import fooDefault, { foo } from './foo.js';

import barDefault, { bar } from './bar.js';

function func() {
  console.log(fooDefault, foo, bar, barDefault);
}

export default func;

export const a = 1;
const b = 2;
export { b };
export { fooDefault, foo, bar, barDefault };
