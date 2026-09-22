import { PostHogProvider, usePostHog } from '@posthog/react';
import { type ReactNode, useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/auth';

const apiKey = import.meta.env.VITE_POSTHOG_KEY;
const options = {
  api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com',
  defaults: '2026-08-30' as const,
  person_profiles: 'identified_only' as const,
  autocapture: false,
  disable_session_recording: true,
};

type AnalyticsProperties = Record<string, boolean | number | string | null>;
type CaptureAnalytics = (event: string, properties?: AnalyticsProperties) => void;

const noCapture: CaptureAnalytics = () => {};
let captureWithPostHog = noCapture;

export function captureAnalytics(event: string, properties?: AnalyticsProperties) {
  captureWithPostHog(event, properties);
}

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  if (!apiKey) return <>{children}</>;

  return (
    <PostHogProvider apiKey={apiKey} options={options}>
      {children}
    </PostHogProvider>
  );
}

function EnabledAnalyticsIdentity() {
  const posthog = usePostHog();
  const user = useAuthStore((state) => state.user);
  const previousUserId = useRef<string | null>(null);

  useEffect(() => {
    posthog.register({
      app_platform: 'web',
      app_environment: import.meta.env.VITE_APP_ENV || import.meta.env.MODE,
    });
    const capture: CaptureAnalytics = (event, properties) => posthog.capture(event, properties);
    captureWithPostHog = capture;

    return () => {
      if (captureWithPostHog === capture) captureWithPostHog = noCapture;
    };
  }, [posthog]);

  useEffect(() => {
    if (user) {
      posthog.identify(user.id, {
        username: user.username,
        account_type: user.guest ? 'guest' : 'registered',
      });
    } else if (previousUserId.current) {
      posthog.reset();
    }

    previousUserId.current = user?.id ?? null;
  }, [posthog, user]);

  return null;
}

export function AnalyticsIdentity() {
  return apiKey ? <EnabledAnalyticsIdentity /> : null;
}
