import { useState, useCallback } from 'react';
import { AxiosError } from 'axios';
import { useAuthStore } from '@/stores/auth';
import * as authApi from '@/api/auth';

type ApiError = {
  errors?: { detail: string }[];
  message?: string;
};

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

  const signIn = useCallback(
    async (username: string, password: string) => {
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
          console.error('[Auth] API Error Status:', e.response?.status);
          console.error('[Auth] API Error Data:', JSON.stringify(e.response?.data, null, 2));
          console.error('[Auth] API Error Config:', JSON.stringify(e.config, null, 2));
        } else {
          console.error('[Auth] Non-Axios Error:', e);
        }
        const message = extractErrorMessage(e, 'Failed to sign in');
        setError(message);
        console.error('[Auth] Sign in failed:', message);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [setSession]
  );

  const signUp = useCallback(
    async (username: string, email: string, password: string) => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await authApi.register(username, email, password);
        setSession({
          accessToken: response.token,
          user: response.user,
        });
        return true;
      } catch (e: any) {
        console.error('[Auth] Sign up error details:', {
          status: e?.response?.status,
          baseURL: e?.config?.baseURL,
          url: e?.config?.url,
          data: e?.response?.data,
        });
        const message = extractErrorMessage(e, 'Failed to create account');
        setError(message);
        console.error('[Auth] Sign up failed:', message);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [setSession]
  );

  const signOut = useCallback(() => {
    clearSession();
  }, [clearSession]);

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
  };
}
