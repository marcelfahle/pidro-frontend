import { useState, useCallback, useRef } from 'react';
import { AxiosError } from 'axios';
import { useAuthStore } from '@/stores/auth';
import * as authApi from '@/api/auth';

type ApiError = {
  errors?: { detail: string }[];
  message?: string;
};

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
    signUp,
    signOut,
    clearError,
  };
}
