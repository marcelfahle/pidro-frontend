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
  const isProduction = variant === 'production';
  if (!isProduction && !selectedVariant) {
    throw new Error(`Unsupported APP_VARIANT: ${JSON.stringify(variant)}`);
  }

  return {
    ...config,
    name: selectedVariant?.name ?? config.name,
    scheme: selectedVariant?.scheme ?? config.scheme,
    ios: {
      ...config.ios,
      bundleIdentifier: selectedVariant?.bundleIdentifier ?? config.ios.bundleIdentifier,
      associatedDomains: ['applinks:www.pidro.online', 'applinks:pidro.online'],
    },
    android: {
      ...config.android,
      allowBackup: false,
      ...(selectedVariant ? { package: selectedVariant.bundleIdentifier } : {}),
      ...(isProduction
        ? {
            blockedPermissions: [
              'android.permission.READ_EXTERNAL_STORAGE',
              'android.permission.SYSTEM_ALERT_WINDOW',
              'android.permission.WRITE_EXTERNAL_STORAGE',
            ],
            intentFilters: [
              {
                action: 'VIEW',
                autoVerify: true,
                data: [
                  {
                    scheme: 'https',
                    host: 'www.pidro.online',
                    pathPrefix: '/j/',
                  },
                ],
                category: ['BROWSABLE', 'DEFAULT'],
              },
              {
                action: 'VIEW',
                autoVerify: true,
                data: [
                  {
                    scheme: 'https',
                    host: 'pidro.online',
                    pathPrefix: '/j/',
                  },
                ],
                category: ['BROWSABLE', 'DEFAULT'],
              },
            ],
          }
        : { blockedPermissions: [], intentFilters: [] }),
    },
  };
};
