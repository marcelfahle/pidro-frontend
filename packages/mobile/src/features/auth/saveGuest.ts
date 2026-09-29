import { AxiosError } from 'axios';
import type { User } from '@pidro/shared';

type ApiError = {
  errors?: { code?: string; title?: string; detail: string }[];
  message?: string;
};

export type GuestSaveField = 'displayName' | 'email' | 'password';
export type GuestSaveFailure = {
  message: string;
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

function guestSaveFailure(error: unknown): GuestSaveFailure {
  if (!(error instanceof AxiosError)) {
    return { message: error instanceof Error ? error.message : 'Could not save your account.' };
  }
  const data = error.response?.data as ApiError | undefined;
  const fields: Partial<Record<GuestSaveField, string>> = {};
  let classicNameReserved = false;
  for (const item of data?.errors ?? []) {
    if (item.code === 'classic_name_reserved') {
      fields.displayName = 'That name is taken.';
      classicNameReserved = true;
    } else if (item.code === 'USERNAME_TAKEN' || item.code === 'username') {
      fields.displayName = item.detail;
    } else if (item.code === 'EMAIL_TAKEN' || item.code === 'email') {
      fields.email = item.detail;
    } else if (item.code === 'password') {
      fields.password = item.detail;
    }
  }
  return {
    message: data?.errors?.[0]?.detail || data?.message || 'Could not save your account.',
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
    return { ok: false, error: { message: 'This guest session is no longer available.' } };
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
      error: { message: 'Your session changed while the account was being saved.' },
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
        message: 'The connection was interrupted. Your save may have completed; try again.',
        uncertain: true,
      },
    };
  }
}
