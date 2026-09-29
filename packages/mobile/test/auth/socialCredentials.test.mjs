import { describe, expect, it } from 'bun:test';

const { requestSocialCredential } = await import('../../src/features/auth/socialCredentials.ts');

const dependencies = (overrides = {}) => ({
  platform: 'ios',
  appleSignIn: async () => 'apple-token',
  facebookSignIn: async () => ({ cancelled: false, accessToken: 'facebook-token' }),
  ...overrides,
});

describe('social credential helper', () => {
  it('returns real provider tokens without transforming them', async () => {
    expect(await requestSocialCredential('apple', dependencies())).toEqual({
      status: 'success',
      provider: 'apple',
      token: 'apple-token',
    });
    expect(await requestSocialCredential('facebook', dependencies())).toEqual({
      status: 'success',
      provider: 'facebook',
      token: 'facebook-token',
    });
  });

  it('keeps Apple and Facebook cancellation silent and typed', async () => {
    expect(
      await requestSocialCredential(
        'apple',
        dependencies({
          appleSignIn: async () => {
            throw { code: 'ERR_REQUEST_CANCELED' };
          },
        })
      )
    ).toEqual({ status: 'cancelled', provider: 'apple' });
    expect(
      await requestSocialCredential(
        'facebook',
        dependencies({
          facebookSignIn: async () => ({ cancelled: true, accessToken: null }),
        })
      )
    ).toEqual({ status: 'cancelled', provider: 'facebook' });
  });

  it('reports provider failures and refuses missing tokens', async () => {
    expect(
      await requestSocialCredential(
        'facebook',
        dependencies({
          facebookSignIn: async () => ({ cancelled: false, accessToken: null }),
        })
      )
    ).toMatchObject({ status: 'failure', provider: 'facebook' });
    expect(
      await requestSocialCredential(
        'apple',
        dependencies({
          appleSignIn: async () => {
            throw new Error('provider unavailable');
          },
        })
      )
    ).toMatchObject({ status: 'failure', provider: 'apple' });
  });
});
