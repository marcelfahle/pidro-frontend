import { describe, expect, it } from 'bun:test';
import { reconcileAge } from '../../src/features/onboarding/reconcileAge.ts';

const request = { age_band: '18_plus', terms_version: '1' };
const answeredUser = {
  id: 'user-1',
  username: 'player',
  email: null,
  age_band: '18_plus',
  terms_version: '1',
};

function apiError(code, detail = code) {
  return { response: { data: { errors: [{ code, detail }] } } };
}

describe('stored age reconciliation', () => {
  it('continues with the updated user after saving the stored answer', async () => {
    const result = await reconcileAge(request, {
      setAge: async (received) => {
        expect(received).toEqual(request);
        return answeredUser;
      },
      getMe: async () => {
        throw new Error('not called');
      },
    });

    expect(result).toEqual({ status: 'saved', user: answeredUser });
  });

  it('treats an already-set answer as success after refetching the user', async () => {
    const result = await reconcileAge(request, {
      setAge: async () => {
        throw apiError('AGE_ALREADY_SET');
      },
      getMe: async () => answeredUser,
    });

    expect(result).toEqual({ status: 'saved', user: answeredUser });
  });

  it('distinguishes ineligible and retryable failures', async () => {
    await expect(
      reconcileAge(request, {
        setAge: async () => {
          throw apiError('AGE_NOT_ELIGIBLE');
        },
        getMe: async () => answeredUser,
      })
    ).resolves.toEqual({ status: 'not_eligible' });

    await expect(
      reconcileAge(request, {
        setAge: async () => {
          throw apiError('SERVICE_UNAVAILABLE', 'Try again later.');
        },
        getMe: async () => answeredUser,
      })
    ).resolves.toEqual({ status: 'failed', message: 'Try again later.' });
  });
});
