import { describe, expect, it } from 'bun:test';
import {
  classifyInviteState,
  resolveJoinFailure,
  validateDisplayName,
} from '../../src/features/invites/joinFlow.ts';

describe('display name validation', () => {
  it('normalizes NFKC and trims before accepting a name', () => {
    expect(validateDisplayName('  Ａnna ﬁn  ')).toEqual({ value: 'Anna fin' });
  });

  it('counts graphemes and enforces the server bounds', () => {
    expect(validateDisplayName('A')).toMatchObject({ error: 'tooShort' });
    expect(validateDisplayName('a'.repeat(21))).toMatchObject({ error: 'tooLong' });
    expect(validateDisplayName('🇫🇮'.repeat(20))).toEqual({ value: '🇫🇮'.repeat(20) });
  });

  it('rejects control and format characters', () => {
    expect(validateDisplayName('An\u200Dna')).toMatchObject({ error: 'forbidden' });
    expect(validateDisplayName('An\nna')).toMatchObject({ error: 'forbidden' });
  });
});

describe('invite state classification', () => {
  it('distinguishes joinable, recoverable, moved, and terminal states', () => {
    expect(classifyInviteState('open')).toBe('joinable');
    expect(classifyInviteState('full')).toBe('recoverable');
    expect(classifyInviteState('locked')).toBe('recoverable');
    expect(classifyInviteState('moved')).toBe('moved');
    for (const state of ['started', 'closed', 'expired', 'revoked']) {
      expect(classifyInviteState(state)).toBe('terminal');
    }
  });
});

describe('join failure outcomes', () => {
  it('recognizes moved, already-seated, and cleared-session outcomes', () => {
    expect(
      resolveJoinFailure(
        {
          response: {
            status: 410,
            data: { errors: [{ code: 'INVITE_MOVED', next_code: 'n4rt-8vw2' }] },
          },
        },
        false
      )
    ).toEqual({ kind: 'moved', nextCode: 'N4RT8VW2' });
    expect(
      resolveJoinFailure(
        { response: { status: 409, data: { errors: [{ code: 'ALREADY_IN_ROOM' }] } } },
        false
      )
    ).toMatchObject({ kind: 'confirmLeave' });
    expect(
      resolveJoinFailure(
        { response: { status: 409, data: { errors: [{ code: 'ALREADY_IN_ROOM' }] } } },
        true
      )
    ).toMatchObject({ kind: 'failed' });
    expect(resolveJoinFailure({ response: { status: 401, data: {} } }, false)).toEqual({
      kind: 'sessionCleared',
    });
  });

  it('keeps authoritative error detail for recoverable failures', () => {
    expect(
      resolveJoinFailure(
        {
          response: { status: 409, data: { errors: [{ code: 'INVITE_FULL', detail: 'No seat' }] } },
        },
        false
      )
    ).toEqual({ kind: 'failed', detail: 'No seat' });
    expect(
      resolveJoinFailure(
        {
          response: { status: 409, data: { errors: [{ code: 'TABLE_FULL', detail: 'No seat' }] } },
        },
        false
      )
    ).toEqual({ kind: 'stateChanged', state: 'full', detail: 'No seat' });
    expect(
      resolveJoinFailure(
        { response: { status: 410, data: { errors: [{ code: 'INVITE_EXPIRED' }] } } },
        false
      )
    ).toEqual({ kind: 'stateChanged', state: 'expired' });
    expect(resolveJoinFailure(new Error('offline'), false)).toEqual({ kind: 'failed' });
  });
});
