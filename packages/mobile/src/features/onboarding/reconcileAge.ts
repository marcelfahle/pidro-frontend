import type { SetAgeRequest, User } from '@pidro/shared';
import { apiErrorInfo } from '@/utils/apiErrors';

type AgeApi = {
  setAge: (request: SetAgeRequest) => Promise<User>;
  getMe: () => Promise<User>;
};

export type AgeReconciliationResult =
  | { status: 'saved'; user: User }
  | { status: 'not_eligible' }
  | { status: 'failed'; message: string };

export async function reconcileAge(
  request: SetAgeRequest,
  api: AgeApi
): Promise<AgeReconciliationResult> {
  try {
    return { status: 'saved', user: await api.setAge(request) };
  } catch (error) {
    const { code, detail } = apiErrorInfo(error);
    if (code === 'AGE_ALREADY_SET') {
      try {
        return { status: 'saved', user: await api.getMe() };
      } catch (refreshError) {
        return {
          status: 'failed',
          message:
            apiErrorInfo(refreshError).detail || 'We could not confirm your answer. Try again.',
        };
      }
    }
    if (code === 'AGE_NOT_ELIGIBLE') return { status: 'not_eligible' };
    return { status: 'failed', message: detail || 'We could not save your answer. Try again.' };
  }
}
