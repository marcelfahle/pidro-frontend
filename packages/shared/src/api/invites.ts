import type { ApiClient } from './client';
import type { Position, PositionPreference, Room, RoomConfig } from '../types/lobby';
import type { InviteArrivalSource } from '../utils/inviteLink';
import { normalizeFriendSlug, normalizeInviteCode } from '../utils/inviteLink';
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
  config?: RoomConfig;
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
  seat_hint?: InviteSeatHint | null;
  label?: string | null;
  position?: Position;
  platform?: InvitePlatform;
}

export interface RedeemInviteRequest {
  platform?: InvitePlatform;
  source?: InviteArrivalSource;
  position?: Position;
}

export type DeferredScreenClass = 'compact' | 'medium' | 'large';

export interface DeferredInviteFingerprint {
  os_major: string;
  screen_class: DeferredScreenClass;
  locale: string;
  timezone: string;
}

export interface DeferredInviteRequest extends Partial<DeferredInviteFingerprint> {
  platform: Exclude<InvitePlatform, 'web'>;
  install_id: string;
  referrer?: string;
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

/** The player whose own link was opened before the install. */
export interface DeferredFriend {
  slug: string;
  display_name: string;
  avatar_url: string | null;
}

export interface DeferredMatch {
  code: string | null;
  friend: DeferredFriend | null;
}

interface DeferredInviteEnvelope {
  data: { invite: { code: string } | null; friend?: Partial<DeferredFriend> | null };
}

function deferredFriend(value: Partial<DeferredFriend> | null | undefined): DeferredFriend | null {
  const slug = normalizeFriendSlug(typeof value?.slug === 'string' ? value.slug : '');
  if (!slug || typeof value?.display_name !== 'string') return null;
  return {
    slug,
    display_name: value.display_name,
    avatar_url: typeof value.avatar_url === 'string' ? value.avatar_url : null,
  };
}

export function createInvitesApi(api: ApiClient) {
  return {
    preview: async (code: string): Promise<InvitePreview> => {
      const response = await api.get<InviteEnvelope<InvitePreview>>(`/api/v1/invites/${code}`);
      return response.data.data.invite;
    },

    resolveDeferred: async (
      request: DeferredInviteRequest,
      signal?: AbortSignal,
    ): Promise<DeferredMatch> => {
      const response = await api.post<DeferredInviteEnvelope>('/api/v1/invites/deferred', request, {
        signal,
      });
      return {
        code: normalizeInviteCode(response.data.data.invite?.code ?? ''),
        friend: deferredFriend(response.data.data.friend),
      };
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
