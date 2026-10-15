import { t, type SetAgeRequest, type User, type TranslationKey } from '@pidro/shared';
import { apiErrorInfo } from '@/utils/apiErrors';

type AgeApi = {
  setAge: (request: SetAgeRequest) => Promise<User>;
  getMe: () => Promise<User>;
};

export type AgeReconciliationResult =
  | { status: 'saved'; user: User }
  | { status: 'not_eligible' }
  | { status: 'failed'; message: string; messageKey: TranslationKey };

export async function reconcileAge(
  request: SetAgeRequest,
  api: AgeApi
): Promise<AgeReconciliationResult> {
  try {
    return { status: 'saved', user: await api.setAge(request) };
  } catch (error) {
    const { code } = apiErrorInfo(error);
    if (code === 'AGE_ALREADY_SET') {
      try {
        return { status: 'saved', user: await api.getMe() };
      } catch {
        return {
          status: 'failed',
          message: t('auth.age_confirm_failed'),
          messageKey: 'auth.age_confirm_failed',
        };
      }
    }
    if (code === 'AGE_NOT_ELIGIBLE') return { status: 'not_eligible' };
    return {
      status: 'failed',
      message: t('auth.age_save_failed'),
      messageKey: 'auth.age_save_failed',
    };
  }
}
