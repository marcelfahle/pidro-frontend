import type { ApiClient } from './client';
import type { Position, PositionPreference, Room } from '../types/lobby';
import type { InviteSource } from '../utils/inviteLink';
import { normalizeRoom } from '../utils/rooms';

export type InvitePlatform = 'ios' | 'android' | 'web';
export type InviteState =
  | 'open'
  | 'full'
  | 'locked'
  | 'started'
  | 'closed'
  | 'expired'
  | 'revoked'
  | 'moved';
export type InviteSeatHint = PositionPreference | 'partner';

export interface InvitePreview {
  code: string;
  state: InviteState;
  host: string | null;
  seats_taken: number;
  seats_total: number;
  seat_hint: InviteSeatHint | null;
  label: string | null;
  expires_at: string;
  next_code?: string;
}

export interface Invite {
  code: string;
  state: InviteState;
  url: string;
  share_text: string;
  seat_hint: InviteSeatHint | null;
  label: string | null;
  expires_at: string;
}

export interface MintInviteRequest {
  seat_hint: InviteSeatHint | null;
  label: string | null;
  platform?: InvitePlatform;
}

export interface RedeemInviteRequest {
  platform?: InvitePlatform;
  source?: InviteSource;
  position?: Position;
}

export interface RedeemInviteResponse {
  room: Room;
  position: Position;
  hint_honored: boolean;
}

interface InviteEnvelope<T> {
  data: { invite: T };
}

interface RedeemEnvelope {
  data: RedeemInviteResponse;
}

export function createInvitesApi(api: ApiClient) {
  return {
    preview: async (code: string): Promise<InvitePreview> => {
      const response = await api.get<InviteEnvelope<InvitePreview>>(`/api/v1/invites/${code}`);
      return response.data.data.invite;
    },

    mint: async (roomCode: string, request: MintInviteRequest): Promise<Invite> => {
      const response = await api.post<InviteEnvelope<Invite>>(
        `/api/v1/rooms/${roomCode}/invites`,
        request,
      );
      return response.data.data.invite;
    },

    regenerate: async (code: string): Promise<Invite> => {
      const response = await api.post<InviteEnvelope<Invite>>(
        `/api/v1/invites/${code}/regenerate`,
      );
      return response.data.data.invite;
    },

    revoke: async (code: string): Promise<void> => {
      await api.delete(`/api/v1/invites/${code}`);
    },

    redeem: async (
      code: string,
      request: RedeemInviteRequest,
    ): Promise<RedeemInviteResponse> => {
      const response = await api.post<RedeemEnvelope>(`/api/v1/invites/${code}/redeem`, request);
      return { ...response.data.data, room: normalizeRoom(response.data.data.room) };
    },
  };
}

export type InvitesApi = ReturnType<typeof createInvitesApi>;
