import { createAuthApi } from '@pidro/shared';
import { api } from './client';

export type {
  AuthProvider,
  ClassicFound,
  ClassicPreview,
  CreateGuestRequest,
  CreateGuestResponse,
  LoginResponse,
  ProviderLoginResponse,
  RegisterResponse,
  UpgradeGuestResponse,
  User,
} from '@pidro/shared';

const authApi = createAuthApi(api);

export const login = authApi.login;
export const register = authApi.register;
export const upgradeGuest = authApi.upgradeGuest;
export const createGuest = authApi.createGuest;
export const requestPasswordReset = authApi.requestPasswordReset;
export const resetPassword = authApi.resetPassword;
export const providerLogin = authApi.providerLogin;
