import { createApiClient } from '@pidro/shared';
import { authStore } from '@/stores/auth';
import { API_CONFIG } from '@/constants/config';

export const api = createApiClient({
  config: API_CONFIG,
  getToken: () => authStore.getState().accessToken,
  clearSession: () => authStore.getState().clearSession(),
});
