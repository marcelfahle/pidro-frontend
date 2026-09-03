import { createInvitesApi } from '@pidro/shared';
import { api } from './client';

export type {
  DeferredInviteFingerprint,
  DeferredInviteRequest,
  DeferredScreenClass,
  Invite,
  InvitePlatform,
  InvitePreview,
  InviteSeatHint,
  InviteState,
  MintInviteRequest,
  RedeemInviteRequest,
  RedeemInviteResponse,
} from '@pidro/shared';

export const invitesApi = createInvitesApi(api);
