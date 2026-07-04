let _default = 'hello bar!';
let bar = 'bar';
const test = () => {
  bar = 'bar bar';
};
module.exports = {
  default: _default,
  bar,
  test,
};
