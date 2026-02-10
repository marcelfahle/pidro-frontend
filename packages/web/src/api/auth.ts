import { createAuthApi } from '@pidro/shared';
import { api } from './client';

export type { LoginResponse, RegisterResponse } from '@pidro/shared';

const authApi = createAuthApi(api);

export const login = authApi.login;
export const register = authApi.register;
