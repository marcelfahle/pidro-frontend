import { createAuthApi } from '@pidro/shared';
import { api } from './client';

export type {
  CreateGuestRequest,
  CreateGuestResponse,
  LoginResponse,
  RegisterResponse,
  User,
} from '@pidro/shared';

const authApi = createAuthApi(api);

export const login = authApi.login;
export const register = authApi.register;
export const createGuest = authApi.createGuest;
