import type { ApiClient } from './client';

export const TERMS_VERSION = '1';

export type AgeBand = '13_17' | '18_plus' | 'unknown';
export type DeclaredAgeBand = Exclude<AgeBand, 'unknown'> | 'under_13';

export interface AgeTermsRequest {
  age_band?: DeclaredAgeBand;
  terms_version?: string;
}

export interface LoginRequest extends AgeTermsRequest {
  username: string;
  password: string;
}

export type User = {
  id: string;
  email: string | null;
  username: string;
  display_name?: string | null;
  guest?: boolean;
  avatar_url?: string | null;
  bio?: string | null;
  age_band?: AgeBand;
  terms_version?: string | null;
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
  display_name?: string;
  invite_code?: string;
  creation_token?: string;
  platform?: 'ios' | 'android' | 'web';
  install_id?: string;
  age_band?: DeclaredAgeBand;
  terms_version?: string;
}

export interface RegisterRequest extends AgeTermsRequest {
  user: {
    username: string;
    email: string;
    password: string;
  };
}

export interface UpgradeGuestRequest extends AgeTermsRequest {
  username: string;
  email: string;
  password: string;
}

export type ProviderAuthRequest = AgeTermsRequest &
  ({ identity_token: string; install_id: string } | { access_token: string; install_id: string });

export interface SetAgeRequest {
  age_band: DeclaredAgeBand;
  terms_version: string;
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

interface UserResponseEnvelope {
  data: {
    user: User;
  };
}

export type PasswordResetRequestResponse = PasswordResetRequestEnvelope['data'];

export function createAuthApi(api: ApiClient) {
  const providerLogin = async (
    provider: AuthProvider,
    token: string,
    installId: string,
    ageTerms: AgeTermsRequest = {}
  ): Promise<ProviderLoginResponse> => {
    const credentials = provider === 'apple' ? { identity_token: token } : { access_token: token };
    const response = await api.post<ProviderAuthEnvelope>(
      `/api/v1/auth/${provider}`,
      {
        ...credentials,
        install_id: installId,
        ...ageTerms,
      } satisfies ProviderAuthRequest,
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
    login: async (
      username: string,
      password: string,
      ageTerms: AgeTermsRequest = {}
    ): Promise<LoginResponse> => {
      const request: LoginRequest = { username, password, ...ageTerms };
      const response = await api.post<AuthResponseEnvelope>(
        '/api/v1/auth/login',
        request,
        { preserveSessionOnUnauthorized: true }
      );
      return response.data.data;
    },

    register: async (
      username: string,
      email: string,
      password: string,
      ageTerms: AgeTermsRequest = {}
    ): Promise<RegisterResponse> => {
      const request: RegisterRequest = {
        user: { username, email, password },
        ...ageTerms,
      };
      const response = await api.post<AuthResponseEnvelope>('/api/v1/auth/register', request);
      return response.data.data;
    },

    upgradeGuest: async (
      displayName: string,
      email: string,
      password: string,
      ageTerms: AgeTermsRequest = {}
    ): Promise<UpgradeGuestResponse> => {
      const request: UpgradeGuestRequest = {
        username: displayName,
        email,
        password,
        ...ageTerms,
      };
      const response = await api.post<AuthResponseEnvelope>('/api/v1/auth/upgrade', request, {
        preserveSessionOnUnauthorized: true,
      });
      return response.data.data;
    },

    createGuest: async (request: CreateGuestRequest): Promise<CreateGuestResponse> => {
      const response = await api.post<GuestResponseEnvelope>('/api/v1/auth/guest', request);
      return response.data.data;
    },

    getMe: async (): Promise<User> => {
      const response = await api.get<UserResponseEnvelope>('/api/v1/auth/me');
      return response.data.data.user;
    },

    setAge: async (request: SetAgeRequest): Promise<User> => {
      const response = await api.post<UserResponseEnvelope>('/api/v1/auth/age', request);
      return response.data.data.user;
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
