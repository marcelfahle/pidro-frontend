const variant = process.env.APP_VARIANT ?? 'production';

const variants = {
  development: {
    name: 'Pidro 3 Dev',
    scheme: 'pidro-mobile-dev',
    bundleIdentifier: 'com.marcelfahle.pidro3.dev',
  },
  preview: {
    name: 'Pidro 3 Preview',
    scheme: 'pidro-mobile-preview',
    bundleIdentifier: 'com.marcelfahle.pidro3.preview',
  },
};

module.exports = ({ config }) => {
  const selectedVariant = variants[variant];

  return {
    ...config,
    name: selectedVariant?.name ?? config.name,
    scheme: selectedVariant?.scheme ?? config.scheme,
    ios: {
      ...config.ios,
      bundleIdentifier: selectedVariant?.bundleIdentifier ?? config.ios.bundleIdentifier,
    },
    android: {
      ...config.android,
      ...(selectedVariant ? { package: selectedVariant.bundleIdentifier } : {}),
    },
  };
};
