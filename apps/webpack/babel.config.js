module.exports = function (api) {
  api.cache(() => process.env.NODE_ENV === 'development');

  const presets = [['@babel/preset-env']];
  const plugins = [
    [
      '@babel/plugin-transform-runtime',
      {
        corejs: {
          version: 3,
          proposals: true,
        },
        useESModules: true,
      },
    ],
  ];

  return {
    presets,
    plugins,
  };
};
