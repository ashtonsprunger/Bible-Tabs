module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // 'react-native-reanimated/plugin', // Keep this at the end if you're using Reanimated
      // 'transform-inline-environment-variables',
    ],
  };
};
