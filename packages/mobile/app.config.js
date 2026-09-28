// Default variant. Until the public launch every build that does not say
// otherwise is the side-by-side Beta (com.oneapps.pidro.beta). Flip this back
// to 'production' when the new game takes over Classic's identity
// (com.oneapps.pidro) in the stores.
const variant = process.env.APP_VARIANT ?? 'beta';

const variants = {
  development: {
    name: 'Pidro Dev',
    scheme: 'pidro-mobile-dev',
    bundleIdentifier: 'com.marcelfahle.pidro3.dev',
  },
  // Side-by-side TestFlight/Play build for the Classic cohort. Own App Store
  // Connect record (6816832730); App ID grouped under com.oneapps.pidro for
  // Sign in with Apple so identities match Classic. See PID-143.
  beta: {
    name: 'Pidro Beta',
    scheme: 'pidro-mobile-beta',
    bundleIdentifier: 'com.oneapps.pidro.beta',
  },
};

module.exports = ({ config }) => {
  const selectedVariant = variants[variant];
  const isProduction = variant === 'production';
  // Store-distributed builds (production and the Beta) verify invite links and
  // block the permissions the store review flags; dev builds keep both empty.
  const isStoreBuild = isProduction || variant === 'beta';
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
      // Keep the Sign in with Apple entitlement on the beta App ID so EAS's
      // capability sync never drops the capability (and its grouping).
      ...(variant === 'beta' ? { usesAppleSignIn: true } : {}),
    },
    android: {
      ...config.android,
      allowBackup: false,
      ...(selectedVariant ? { package: selectedVariant.bundleIdentifier } : {}),
      ...(isStoreBuild
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
