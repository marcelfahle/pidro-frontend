import { createFriendsApi } from '@pidro/shared';
import { api } from './client';

export const friendsApi = createFriendsApi(api);
