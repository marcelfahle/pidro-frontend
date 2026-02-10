import { createApiClient } from '@pidro/shared';
import { API_CONFIG } from '../platform/config';
import { authStore } from '../stores/auth';

export const api = createApiClient({
  config: API_CONFIG,
  getToken: () => authStore.getState().accessToken,
  clearSession: () => authStore.getState().clearSession(),
});
