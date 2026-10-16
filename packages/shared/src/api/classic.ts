import type { ApiClient } from './client';
import type { AgeTermsRequest, FacebookCredential, LoginResponse } from './auth';

export type ClassicClaimMethod = 'password' | 'apple' | 'facebook';

export interface ClassicClaimPreview {
  name: string | null;
  games_played: number;
  level: number;
  /** Null for Classic accounts created before Classic recorded a date. */
  member_since: string | null;
  name_allowed: boolean;
  /** Password claims only: the Classic login the new account gets; null where the player chooses. */
  new_account?: ClassicNewAccount | null;
}

export interface ClassicNewAccount {
  username: string | null;
  email: string | null;
}

/** Set when the Classic account is linked to a different player. */
export interface ClassicAlreadyClaimed {
  sign_in_method: ClassicClaimMethod | null;
}

export interface ClassicVerification {
  ticket: string;
  expires_at: string;
  classic: ClassicClaimPreview;
  /** Absent in older answers, which means not claimed. */
  already_claimed?: ClassicAlreadyClaimed | null;
}

export type ClassicVerifyRequest =
  | { method: 'password'; login: string; password: string; install_id?: string }
  | { method: 'apple'; identity_token: string; install_id?: string }
  | ({ method: 'facebook'; install_id?: string } & (
      | { access_token: string; authentication_token?: never; nonce?: never }
      | { authentication_token: string; nonce: string; access_token?: never }
    ));

export function facebookCredentialRequest(
  credential: FacebookCredential
): { access_token: string } | { authentication_token: string; nonce: string } {
  return credential.type === 'access_token'
    ? { access_token: credential.token }
    : { authentication_token: credential.token, nonce: credential.nonce };
}

export interface ClassicClaimAccount {
  username?: string;
  email?: string;
  password?: string;
  display_name?: string;
}

export interface ClassicClaimRequest extends AgeTermsRequest {
  ticket: string;
  install_id?: string;
  account?: ClassicClaimAccount;
}

export interface ClassicSignInLinkRequest {
  /** Classic username or email, as the player remembers it. */
  login: string;
  install_id?: string;
}

export interface ClassicSignInLink {
  /** The address the link went to, masked by the server (`be•••••@gmail.com`). */
  email_hint: string;
}

export interface ClassicHelpRequest {
  name: string;
  email: string;
  details?: string;
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

    /** Emails a sign-in link to the address on the Classic account. */
    requestSignInLink: async (request: ClassicSignInLinkRequest): Promise<ClassicSignInLink> => {
      const response = await api.post<{ data: ClassicSignInLink }>(
        '/api/v1/classic/sign-in-link',
        request,
        { preserveSessionOnUnauthorized: true }
      );
      return response.data.data;
    },

    /** Asks support to find a Classic account from what the player remembers. */
    requestHelp: async (request: ClassicHelpRequest): Promise<void> => {
      await api.post('/api/v1/classic/help', request, {
        preserveSessionOnUnauthorized: true,
      });
    },
  };
}

export type ClassicApi = ReturnType<typeof createClassicApi>;
