import { createProfileApi } from '@pidro/shared';
import { api } from './client';

export const profileApi = createProfileApi(api);
