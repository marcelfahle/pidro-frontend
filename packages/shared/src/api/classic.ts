import type { ApiClient } from './client';
import type { LoginResponse } from './auth';

export type ClassicClaimMethod = 'password' | 'apple' | 'facebook';

export interface ClassicClaimPreview {
  name: string | null;
  games_played: number;
  level: number;
  member_since: string;
  name_allowed: boolean;
}

export interface ClassicVerification {
  ticket: string;
  expires_at: string;
  classic: ClassicClaimPreview;
}

export type ClassicVerifyRequest =
  | { method: 'password'; login: string; password: string; install_id?: string }
  | { method: 'apple'; identity_token: string; install_id?: string }
  | { method: 'facebook'; access_token: string; install_id?: string };

export interface ClassicClaimAccount {
  username?: string;
  email?: string;
  password?: string;
  display_name?: string;
}

export interface ClassicClaimRequest {
  ticket: string;
  install_id?: string;
  account?: ClassicClaimAccount;
}

export function createClassicApi(api: ApiClient) {
  return {
    verify: async (request: ClassicVerifyRequest): Promise<ClassicVerification> => {
      const response = await api.post<{ data: ClassicVerification }>(
        '/api/v1/classic/verify',
        request,
        { preserveSessionOnUnauthorized: true }
      );
      return response.data.data;
    },

    claim: async (request: ClassicClaimRequest): Promise<LoginResponse> => {
      const response = await api.post<{ data: LoginResponse }>('/api/v1/classic/claim', request, {
        preserveSessionOnUnauthorized: true,
      });
      return response.data.data;
    },
  };
}

export type ClassicApi = ReturnType<typeof createClassicApi>;
