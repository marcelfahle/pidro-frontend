import type { InviteState } from '@pidro/shared';
import { normalizeInviteCode } from '@pidro/shared';

export type DisplayNameError = 'required' | 'tooShort' | 'tooLong' | 'forbidden';

export function validateDisplayName(input: string): { value: string; error?: DisplayNameError } {
  const value = input.normalize('NFKC').trim();
  if (!value) return { value, error: 'required' };
  if (/\p{Cc}|\p{Cf}/u.test(value)) return { value, error: 'forbidden' };

  type GraphemeSegmenter = { segment: (value: string) => Iterable<unknown> };
  type SegmenterConstructor = new (
    locale?: string,
    options?: { granularity: 'grapheme' }
  ) => GraphemeSegmenter;
  const Segmenter = (Intl as unknown as { Segmenter?: SegmenterConstructor }).Segmenter;
  const length = Segmenter
    ? Array.from(new Segmenter(undefined, { granularity: 'grapheme' }).segment(value)).length
    : Array.from(value).length;

  if (length < 2) return { value, error: 'tooShort' };
  if (length > 20) return { value, error: 'tooLong' };
  return { value };
}

export type InviteAvailability = 'joinable' | 'recoverable' | 'moved' | 'terminal';

export function classifyInviteState(state: InviteState): InviteAvailability {
  if (state === 'open') return 'joinable';
  if (state === 'full' || state === 'locked') return 'recoverable';
  if (state === 'moved') return 'moved';
  return 'terminal';
}

type ErrorPayload = {
  response?: {
    status?: number;
    data?: {
      errors?: { code?: string; detail?: string; next_code?: string }[];
    };
  };
};

export type JoinFailure =
  | { kind: 'moved'; nextCode: string }
  | { kind: 'confirmLeave'; detail?: string }
  | { kind: 'sessionCleared' }
  | {
      kind: 'stateChanged';
      state: Exclude<InviteState, 'open' | 'moved'>;
      detail?: string;
    }
  | { kind: 'failed'; detail?: string };

const inviteStateByErrorCode: Record<string, Exclude<InviteState, 'open' | 'moved'> | undefined> = {
  TABLE_FULL: 'full',
  TABLE_LOCKED: 'locked',
  TABLE_STARTED: 'started',
  TABLE_CLOSED: 'closed',
  INVITE_EXPIRED: 'expired',
  INVITE_REVOKED: 'revoked',
};

export function resolveJoinFailure(error: unknown, alreadyRetried: boolean): JoinFailure {
  const response = (error as ErrorPayload | null)?.response;
  const first = response?.data?.errors?.[0];
  const nextCode = first?.next_code ? normalizeInviteCode(first.next_code) : null;

  if (first?.code === 'INVITE_MOVED' && nextCode) return { kind: 'moved', nextCode };
  const state = first?.code ? inviteStateByErrorCode[first.code] : undefined;
  if (state) {
    return {
      kind: 'stateChanged',
      state,
      ...(first?.detail ? { detail: first.detail } : {}),
    };
  }
  if (first?.code === 'ALREADY_IN_ROOM' && !alreadyRetried) {
    return { kind: 'confirmLeave', ...(first.detail ? { detail: first.detail } : {}) };
  }
  if (response?.status === 401) return { kind: 'sessionCleared' };
  return { kind: 'failed', ...(first?.detail ? { detail: first.detail } : {}) };
}
