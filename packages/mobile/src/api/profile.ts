import { createProfileApi } from '@pidro/shared';
import { api } from './client';

export type { ClassicProfile, ProfileIdentity } from '@pidro/shared';

export const profileApi = createProfileApi(api);
