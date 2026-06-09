import type { ApiClient } from './client';

export type User = {
  id: string;
  email: string;
  username: string;
};

interface AuthResponseEnvelope {
  data: {
    token: string;
    user: User;
  };
}

export type LoginResponse = AuthResponseEnvelope['data'];
export type RegisterResponse = AuthResponseEnvelope['data'];

interface PasswordResetRequestEnvelope {
  data: {
    message: string;
    reset_token?: string;
    reset_url?: string;
  };
}

export type PasswordResetRequestResponse = PasswordResetRequestEnvelope['data'];

export function createAuthApi(api: ApiClient) {
  return {
    login: async (username: string, password: string): Promise<LoginResponse> => {
      const response = await api.post<AuthResponseEnvelope>('/api/v1/auth/login', {
        username,
        password,
      });
      return response.data.data;
    },

    register: async (
      username: string,
      email: string,
      password: string,
    ): Promise<RegisterResponse> => {
      const response = await api.post<AuthResponseEnvelope>('/api/v1/auth/register', {
        user: { username, email, password },
      });
      return response.data.data;
    },

    requestPasswordReset: async (identifier: string): Promise<PasswordResetRequestResponse> => {
      const response = await api.post<PasswordResetRequestEnvelope>('/api/v1/auth/password-reset', {
        identifier,
      });
      return response.data.data;
    },

    resetPassword: async (token: string, password: string): Promise<LoginResponse> => {
      const response = await api.post<AuthResponseEnvelope>('/api/v1/auth/password-reset/confirm', {
        token,
        password,
      });
      return response.data.data;
    },
  };
}

export type AuthApi = ReturnType<typeof createAuthApi>;
