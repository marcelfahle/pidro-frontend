import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { PlatformConfig } from '../platform/types';

export type TokenGetter = () => string | null;
export type SessionClearer = () => void;

interface ApiClientDeps {
  config: PlatformConfig;
  getToken: TokenGetter;
  clearSession: SessionClearer;
}

export function createApiClient({ config, getToken, clearSession }: ApiClientDeps) {
  const instance = axios.create({
    baseURL: config.baseURL,
    timeout: config.timeout,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  instance.interceptors.request.use(
    (reqConfig: InternalAxiosRequestConfig) => {
      const token = getToken();
      if (token) {
        reqConfig.headers.Authorization = `Bearer ${token}`;
      }
      return reqConfig;
    },
    (error: AxiosError) => Promise.reject(error)
  );

  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      if (error.response?.status === 401) {
        clearSession();
      }
      return Promise.reject(error);
    }
  );

  return instance;
}

export type ApiClient = ReturnType<typeof createApiClient>;
