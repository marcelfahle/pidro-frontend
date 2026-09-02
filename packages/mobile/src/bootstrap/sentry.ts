import { Platform } from 'react-native';

/**
 * Crash reporting. Inert until EXPO_PUBLIC_SENTRY_DSN is set, so nothing
 * changes for builds and CI until a Sentry project exists.
 *
 * To activate: create a React Native project at sentry.io, put its DSN in
 * .env / eas.json env as EXPO_PUBLIC_SENTRY_DSN. For readable native stack
 * traces later, also add the "@sentry/react-native/expo" config plugin with
 * the org/project and a SENTRY_AUTH_TOKEN on EAS — that step changes native
 * builds, so do it deliberately, not as a drive-by.
 */
export function initSentry() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn || Platform.OS === 'web') return;

  // Lazy require so the native SDK never executes on web or without a DSN.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Sentry = require('@sentry/react-native') as typeof import('@sentry/react-native');
  Sentry.init({
    dsn,
    enableAutoSessionTracking: true,
    tracesSampleRate: 0.2,
  });
}
