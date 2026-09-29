import { useState, useCallback, useRef } from 'react';
import { AxiosError } from 'axios';
import { useAuthStore } from '@/stores/auth';
import * as authApi from '@/api/auth';
import {
  clearGuestCreationToken,
  getGuestCreationToken,
  getInstallId,
} from '@/features/invites/installId';
import { invitePlatform } from '@/features/invites/platform';
import {
  requestSocialCredential,
  type SocialCredentialResult,
} from '@/features/auth/socialCredentials';
import type { AuthProvider, ProviderLoginResponse } from '@/api/auth';
import { runGuestSave, type GuestSaveResult } from '@/features/auth/saveGuest';

export type { GuestSaveField, GuestSaveFailure, GuestSaveResult } from '@/features/auth/saveGuest';

type ApiError = {
  errors?: { code?: string; title?: string; detail: string }[];
  message?: string;
};

export type SocialSignInOutcome =
  ProviderLoginResponse | Extract<SocialCredentialResult, { status: 'cancelled' | 'failure' }>;

function getSafeAxiosErrorDetails(error: AxiosError) {
  const { baseURL, method, url } = error.config ?? {};

  return {
    message: error.message,
    code: error.code,
    status: error.response?.status,
    method: method?.toUpperCase(),
    url: `${baseURL ?? ''}${url ?? ''}` || undefined,
  };
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiError | undefined;
    return data?.errors?.[0]?.detail || data?.message || fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

export function useAuth() {
  const { status, user, setSession, clearSession, hydrated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestInFlight = useRef(false);

  const signIn = useCallback(
    async (username: string, password: string) => {
      if (requestInFlight.current) return false;
      requestInFlight.current = true;

      try {
        setIsLoading(true);
        setError(null);
        const response = await authApi.login(username, password);
        setSession({
          accessToken: response.token,
          user: response.user,
        });
        return true;
      } catch (e) {
        if (e instanceof AxiosError) {
          console.warn('[Auth] Sign in request failed:', getSafeAxiosErrorDetails(e));
        } else {
          console.warn('[Auth] Sign in failed with a non-API error');
        }
        const message = extractErrorMessage(e, 'Failed to sign in');
        setError(message);
        return false;
      } finally {
        requestInFlight.current = false;
        setIsLoading(false);
      }
    },
    [setSession]
  );

  const signInWithProvider = useCallback(
    async (provider: AuthProvider): Promise<SocialSignInOutcome> => {
      if (requestInFlight.current) {
        return { status: 'cancelled', provider };
      }
      requestInFlight.current = true;

      try {
        setIsLoading(true);
        setError(null);
        const credential = await requestSocialCredential(provider);
        if (credential.status === 'cancelled') return credential;
        if (credential.status === 'failure') {
          setError(credential.message);
          return credential;
        }

        const installId = await getInstallId();
        const outcome = await authApi.providerLogin(provider, credential.token, installId);
        if (outcome.status === 'signed_in') {
          setSession({
            accessToken: outcome.session.token,
            user: outcome.session.user,
          });
        }
        return outcome;
      } catch (e) {
        if (e instanceof AxiosError) {
          console.warn('[Auth] Provider sign in request failed:', getSafeAxiosErrorDetails(e));
        } else {
          console.warn('[Auth] Provider sign in failed before reaching the API');
        }
        const failure = {
          status: 'failure' as const,
          provider,
          message: 'Sign in could not be completed. Try again.',
        };
        setError(failure.message);
        return failure;
      } finally {
        requestInFlight.current = false;
        setIsLoading(false);
      }
    },
    [setSession]
  );

  const signUp = useCallback(
    async (username: string, email: string, password: string) => {
      if (requestInFlight.current) return false;
      requestInFlight.current = true;

      try {
        setIsLoading(true);
        setError(null);
        const response = await authApi.register(username, email, password);
        setSession({
          accessToken: response.token,
          user: response.user,
        });
        return true;
      } catch (e: unknown) {
        if (e instanceof AxiosError) {
          console.warn('[Auth] Sign up request failed:', getSafeAxiosErrorDetails(e));
        } else {
          console.warn('[Auth] Sign up failed with a non-API error');
        }
        const message = extractErrorMessage(e, 'Failed to create account');
        setError(message);
        return false;
      } finally {
        requestInFlight.current = false;
        setIsLoading(false);
      }
    },
    [setSession]
  );

  const saveGuest = useCallback(
    async (displayName: string, email: string, password: string): Promise<GuestSaveResult> => {
      if (requestInFlight.current) {
        return { ok: false, error: { message: 'Account saving is already in progress.' } };
      }
      const original = useAuthStore.getState();
      requestInFlight.current = true;
      setIsLoading(true);
      setError(null);

      try {
        const result = await runGuestSave({
          original,
          displayName,
          email,
          password,
          upgrade: authApi.upgradeGuest,
          login: authApi.login,
          getSession: useAuthStore.getState,
          install: (response) => setSession({ accessToken: response.token, user: response.user }),
          setSessionPreservation: (preserve) =>
            useAuthStore.getState().setPreserveSessionOnUnauthorized(preserve),
        });
        if (!result.ok) setError(result.error.message);
        return result;
      } finally {
        requestInFlight.current = false;
        setIsLoading(false);
      }
    },
    [setSession]
  );

  const continueAsGuest = useCallback(
    async (displayName: string) => {
      if (requestInFlight.current) return false;
      requestInFlight.current = true;

      try {
        setIsLoading(true);
        setError(null);
        const [creationToken, installId] = await Promise.all([
          getGuestCreationToken(),
          getInstallId().catch(() => undefined),
        ]);
        const response = await authApi.createGuest({
          display_name: displayName,
          creation_token: creationToken,
          platform: invitePlatform(),
          ...(installId ? { install_id: installId } : {}),
        });
        setSession({ accessToken: response.token, user: response.user });
        await clearGuestCreationToken().catch(() => undefined);
        return true;
      } catch (e) {
        if (e instanceof AxiosError) {
          console.warn('[Auth] Guest creation request failed:', getSafeAxiosErrorDetails(e));
        } else {
          console.warn('[Auth] Guest creation failed with a non-API error');
        }
        setError(extractErrorMessage(e, 'Your guest session could not be created. Try again.'));
        return false;
      } finally {
        requestInFlight.current = false;
        setIsLoading(false);
      }
    },
    [setSession]
  );

  const requestPasswordReset = useCallback(async (identifier: string) => {
    if (requestInFlight.current) return false;
    requestInFlight.current = true;
    try {
      setIsLoading(true);
      setError(null);
      await authApi.requestPasswordReset(identifier);
      return true;
    } catch (e) {
      setError(extractErrorMessage(e, 'Could not request a password reset. Try again.'));
      return false;
    } finally {
      requestInFlight.current = false;
      setIsLoading(false);
    }
  }, []);

  const resetPassword = useCallback(
    async (token: string, password: string) => {
      if (requestInFlight.current) return false;
      requestInFlight.current = true;
      try {
        setIsLoading(true);
        setError(null);
        const response = await authApi.resetPassword(token, password);
        setSession({ accessToken: response.token, user: response.user });
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Could not reset your password. Try again.'));
        return false;
      } finally {
        requestInFlight.current = false;
        setIsLoading(false);
      }
    },
    [setSession]
  );

  const signOut = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user,
    status,
    isLoading,
    error,
    isAuthenticated: status === 'authenticated',
    isHydrated: hydrated,
    signIn,
    signInWithProvider,
    signUp,
    saveGuest,
    continueAsGuest,
    requestPasswordReset,
    resetPassword,
    signOut,
    clearError,
  };
}
