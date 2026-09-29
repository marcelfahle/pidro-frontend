import type { ApiClient } from './client';

export type User = {
  id: string;
  email: string | null;
  username: string;
  display_name?: string | null;
  guest?: boolean;
  avatar_url?: string | null;
  bio?: string | null;
};

interface AuthResponseEnvelope {
  data: {
    token: string;
    user: User;
  };
}

export type AuthProvider = 'apple' | 'facebook';

export interface ClassicPreview {
  name: string;
  games_played: number;
  level: number;
  member_since: string;
  name_allowed?: boolean | null;
}

export interface ClassicFound {
  classic_found: true;
  classic: ClassicPreview;
  ticket: string;
  expires_at: string;
}

export type ProviderLoginResponse =
  | { status: 'signed_in'; session: LoginResponse }
  | { status: 'classic_found'; claim: ClassicFound }
  | { status: 'unknown_identity' };

type ProviderAuthEnvelope =
  | AuthResponseEnvelope
  | {
      data: ClassicFound;
    };

export type LoginResponse = AuthResponseEnvelope['data'];
export type RegisterResponse = AuthResponseEnvelope['data'];
export type UpgradeGuestResponse = AuthResponseEnvelope['data'];

export interface CreateGuestRequest {
  display_name: string;
  invite_code?: string;
  creation_token?: string;
  platform?: 'ios' | 'android' | 'web';
  install_id?: string;
}

interface GuestResponseEnvelope extends AuthResponseEnvelope {
  data: AuthResponseEnvelope['data'] & { state?: string };
}

export type CreateGuestResponse = GuestResponseEnvelope['data'];

interface PasswordResetRequestEnvelope {
  data: {
    message: string;
    reset_token?: string;
    reset_url?: string;
  };
}

export type PasswordResetRequestResponse = PasswordResetRequestEnvelope['data'];

export function createAuthApi(api: ApiClient) {
  const providerLogin = async (
    provider: AuthProvider,
    token: string,
    installId: string
  ): Promise<ProviderLoginResponse> => {
    const credentials = provider === 'apple' ? { identity_token: token } : { access_token: token };
    const response = await api.post<ProviderAuthEnvelope>(
      `/api/v1/auth/${provider}`,
      { ...credentials, install_id: installId },
      // An unrecognized provider identity is an expected sign-in result. Let
      // the caller handle it without the client's global 401 session clearer.
      {
        validateStatus: (status) => (status >= 200 && status < 300) || status === 401,
      }
    );

    if (response.status === 401) return { status: 'unknown_identity' };

    const data = response.data.data;
    if ('token' in data) {
      return { status: 'signed_in', session: data };
    }
    return { status: 'classic_found', claim: data };
  };

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
      password: string
    ): Promise<RegisterResponse> => {
      const response = await api.post<AuthResponseEnvelope>('/api/v1/auth/register', {
        user: { username, email, password },
      });
      return response.data.data;
    },

    upgradeGuest: async (
      username: string,
      email: string,
      password: string
    ): Promise<UpgradeGuestResponse> => {
      const response = await api.post<AuthResponseEnvelope>('/api/v1/auth/upgrade', {
        username,
        email,
        password,
      });
      return response.data.data;
    },

    createGuest: async (request: CreateGuestRequest): Promise<CreateGuestResponse> => {
      const response = await api.post<GuestResponseEnvelope>('/api/v1/auth/guest', request);
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

    providerLogin,
  };
}

export type AuthApi = ReturnType<typeof createAuthApi>;
