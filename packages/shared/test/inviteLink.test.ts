import { describe, expect, it } from 'bun:test';
import { normalizeInviteCode, parseInviteLink } from '../src/utils/inviteLink';

describe('normalizeInviteCode', () => {
  it('normalizes accepted Crockford variants', () => {
    expect(normalizeInviteCode('7kq4-m2xb')).toBe('7KQ4M2XB');
    expect(normalizeInviteCode('ilo2-3456')).toBe('11023456');
  });

  it('rejects invalid lengths and excluded characters', () => {
    expect(normalizeInviteCode('7KQ4M2X')).toBeNull();
    expect(normalizeInviteCode('7KQ4M2XBU')).toBeNull();
    expect(normalizeInviteCode('7KQ4U2XB')).toBeNull();
  });
});

describe('parseInviteLink', () => {
  it('accepts canonical, legacy, relative, and app-scheme links', () => {
    expect(parseInviteLink('https://www.pidro.online/j/7kq4-m2xb?s=im')).toEqual({
      code: '7KQ4M2XB',
      source: 'im',
    });
    expect(parseInviteLink('https://pidro.online/j/7KQ4M2XB')).toEqual({
      code: '7KQ4M2XB',
    });
    expect(parseInviteLink('7kq4-m2xb')).toEqual({ code: '7KQ4M2XB' });
    expect(parseInviteLink('/j/7KQ4M2XB?source=copy')).toEqual({
      code: '7KQ4M2XB',
      source: 'copy',
    });

    for (const scheme of ['pidro-mobile', 'pidro-mobile-dev', 'pidro-mobile-preview']) {
      expect(parseInviteLink(`${scheme}://j/7KQ4M2XB?source=qr`)).toEqual({
        code: '7KQ4M2XB',
        source: 'qr',
      });
    }
  });

  it('drops unsupported attribution sources', () => {
    expect(parseInviteLink('/j/7KQ4M2XB?source=email')).toEqual({ code: '7KQ4M2XB' });
  });

  it('accepts the internal source alias and gives the public parameter precedence', () => {
    expect(parseInviteLink('/j/7KQ4M2XB?source=copy')).toEqual({
      code: '7KQ4M2XB',
      source: 'copy',
    });
    expect(parseInviteLink('/j/7KQ4M2XB?s=wa&source=copy')).toEqual({
      code: '7KQ4M2XB',
      source: 'wa',
    });
  });

  it('rejects unrelated or ambiguous targets', () => {
    const invalid = [
      'http://www.pidro.online/j/7KQ4M2XB',
      'https://evil.example/j/7KQ4M2XB',
      'https://www.pidro.online/j/7KQ4M2XB/extra',
      'https://www.pidro.online/j/%37KQ4M2XB',
      'pidro-mobile://user@j/7KQ4M2XB',
      'pidro-mobile://profile/7KQ4M2XB',
      '/game/7KQ4M2XB',
      'not a url',
    ];

    for (const value of invalid) expect(parseInviteLink(value)).toBeNull();
  });
});
