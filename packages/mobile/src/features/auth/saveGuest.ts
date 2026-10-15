import { AxiosError } from 'axios';
import {
  localizedError,
  localizedFieldErrors,
  t,
  type TranslationKey,
  type User,
} from '@pidro/shared';

type ApiError = {
  error_code?: string;
  code?: string;
  errors?: { code?: string; error_code?: string; title?: string; detail: string }[];
  message?: string;
};

export type GuestSaveField = 'displayName' | 'email' | 'password';
export type GuestSaveFailure = {
  message: string;
  messageKey?: TranslationKey;
  originalError?: unknown;
  emailTaken?: boolean;
  fields?: Partial<Record<GuestSaveField, string>>;
  classicNameReserved?: boolean;
  uncertain?: boolean;
};
export type GuestSaveResult = { ok: true } | { ok: false; error: GuestSaveFailure };
export type GuestSaveResponse = { token: string; user: User };

type GuestSaveSession = {
  accessToken: string | null;
  user: { id: string; guest?: boolean } | null;
};

/** Resolve again on render so an existing failure follows a language change. */
export function guestSaveMessage(failure: GuestSaveFailure): string {
  if (failure.messageKey) return t(failure.messageKey);
  return localizedError(failure.originalError, 'auth.save_failed');
}

/** Keep the failure and field identity in UI state, not its translated snapshot. */
export function guestSaveFieldMessage(
  failure: GuestSaveFailure,
  field: GuestSaveField
): string | undefined {
  return guestSaveFailure(failure.originalError).fields?.[field];
}

export function guestSaveFailure(error: unknown): GuestSaveFailure {
  if (!(error instanceof AxiosError)) {
    return { message: localizedError(error, 'auth.save_failed'), originalError: error };
  }
  const data = error.response?.data as ApiError | undefined;
  const fields: Partial<Record<GuestSaveField, string>> = {};
  for (const [field, message] of Object.entries(localizedFieldErrors(error))) {
    if (field === 'username' || field === 'display_name') fields.displayName = message;
    else if (field === 'email' || field === 'password') fields[field] = message;
  }
  let classicNameReserved = false;
  let emailTaken = false;
  const items = [
    { code: data?.code, error_code: data?.error_code },
    ...(Array.isArray(data?.errors) ? data.errors : []),
  ];
  for (const item of items) {
    const code = item.error_code ?? item.code;
    if (code === 'classic_name_reserved' || code === 'CLASSIC_NAME_RESERVED') {
      fields.displayName = t('auth.name_taken');
      classicNameReserved = true;
    } else if (code === 'USERNAME_TAKEN' || code === 'username_taken' || code === 'username') {
      fields.displayName = t('auth.name_taken');
    } else if (code === 'EMAIL_TAKEN' || code === 'email_taken' || code === 'email') {
      emailTaken = code === 'EMAIL_TAKEN' || code === 'email_taken';
      fields.email = t(emailTaken ? 'auth.email_taken' : 'auth.check_email');
    } else if (code === 'password') {
      fields.password = t('auth.password_min', { count: 8 });
    }
  }
  return {
    message: localizedError(error, 'auth.save_failed'),
    originalError: error,
    ...(emailTaken ? { emailTaken: true } : {}),
    ...(Object.keys(fields).length ? { fields } : {}),
    ...(classicNameReserved ? { classicNameReserved: true } : {}),
  };
}

export async function runGuestSave({
  original,
  displayName,
  email,
  password,
  upgrade,
  login,
  getSession,
  install,
  setSessionPreservation,
}: {
  original: GuestSaveSession;
  displayName: string;
  email: string;
  password: string;
  upgrade: (displayName: string, email: string, password: string) => Promise<GuestSaveResponse>;
  login: (identifier: string, password: string) => Promise<GuestSaveResponse>;
  getSession: () => GuestSaveSession;
  install: (response: GuestSaveResponse) => void;
  setSessionPreservation: (preserve: boolean) => void;
}): Promise<GuestSaveResult> {
  if (!original.user?.guest || !original.accessToken) {
    return {
      ok: false,
      error: { message: t('auth.guest_missing'), messageKey: 'auth.guest_missing' },
    };
  }
  const originalUser = original.user;
  const installIfOriginal = (response: GuestSaveResponse) => {
    const current = getSession();
    if (
      current.user?.id !== originalUser.id ||
      current.accessToken !== original.accessToken ||
      response.user.id !== originalUser.id ||
      response.user.guest
    ) {
      return false;
    }
    install(response);
    return true;
  };

  setSessionPreservation(true);
  try {
    const response = await upgrade(displayName, email, password);
    if (installIfOriginal(response)) {
      setSessionPreservation(false);
      return { ok: true };
    }
    setSessionPreservation(false);
    return {
      ok: false,
      error: { message: t('auth.session_changed'), messageKey: 'auth.session_changed' },
    };
  } catch (upgradeError) {
    const recoverable =
      upgradeError instanceof AxiosError &&
      (!upgradeError.response || upgradeError.response.status === 401);
    if (!recoverable) {
      setSessionPreservation(false);
      return { ok: false, error: guestSaveFailure(upgradeError) };
    }
    try {
      const recovered = await login(email, password);
      if (installIfOriginal(recovered)) {
        setSessionPreservation(false);
        return { ok: true };
      }
    } catch {
      // Both requests were inconclusive; preserve the locally stored guest.
    }
    return {
      ok: false,
      error: {
        message: t('auth.save_uncertain'),
        messageKey: 'auth.save_uncertain',
        uncertain: true,
      },
    };
  }
}
