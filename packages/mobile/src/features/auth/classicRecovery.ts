import {
  errorPayload,
  t,
  type ClassicHelpRequest,
  type ClassicSignInCode,
  type ClassicVerification,
  type TranslationKey,
} from '@pidro/shared';
import { apiErrorInfo } from '../../utils/apiErrors';

export const SUPPORT_EMAIL = 'support@pidro.net';

export type SignInCodeResult =
  | { status: 'sent'; emailHint: string }
  | { status: 'not_found' }
  | { status: 'no_email' }
  | { status: 'rate_limited' }
  | { status: 'unavailable' };

function responseStatus(error: unknown): number | undefined {
  return typeof error === 'object' && error !== null && 'response' in error
    ? (error as { response?: { status?: number } }).response?.status
    : undefined;
}

/**
 * Asks the server to email a sign-in code to the address on a Classic
 * account. A bare 404 is a server without the code service, not a missing
 * player, so only a coded answer may tell someone their account wasn't found.
 */
export async function requestClassicSignInCode(
  login: string,
  request: (login: string) => Promise<ClassicSignInCode>
): Promise<SignInCodeResult> {
  try {
    const result = await request(login);
    return { status: 'sent', emailHint: result.email_hint };
  } catch (error) {
    const nested = errorPayload(error).error;
    const code =
      typeof nested === 'object' && nested !== null && 'code' in nested
        ? nested.code
        : apiErrorInfo(error).code;
    if (code === 'CLASSIC_ACCOUNT_NOT_FOUND') return { status: 'not_found' };
    if (code === 'CLASSIC_EMAIL_MISSING') return { status: 'no_email' };
    if (responseStatus(error) === 429) return { status: 'rate_limited' };
    return { status: 'unavailable' };
  }
}

export function isSignInCode(value: string): boolean {
  return value.length === 6 && /^[0-9]+$/.test(value);
}

export type VerifySignInCodeResult =
  | { status: 'verified'; verification: ClassicVerification }
  | { status: 'invalid' }
  | { status: 'rate_limited' }
  | { status: 'unavailable' };

export async function verifyClassicSignInCode(
  login: string,
  code: string,
  request: (login: string, code: string) => Promise<ClassicVerification>
): Promise<VerifySignInCodeResult> {
  try {
    return { status: 'verified', verification: await request(login, code) };
  } catch (error) {
    if (responseStatus(error) === 401) return { status: 'invalid' };
    if (responseStatus(error) === 429) return { status: 'rate_limited' };
    return { status: 'unavailable' };
  }
}

export type ClassicHelpResult =
  | { status: 'sent' }
  | { status: 'mail' }
  | { status: 'rejected'; message: string; messageKey: TranslationKey; field?: 'email' }
  | { status: 'failed' };

export function classicHelpMailto({ name, email, details }: ClassicHelpRequest): string {
  const body = [t('auth.mail_name', { name }), t('auth.mail_email', { email }), '', details ?? '']
    .join('\n')
    .trim();
  const subject = t('auth.mail_subject');
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Sends a help request to support. When the server can't take it (no help
 * service yet, offline, or down) the same message opens in the player's mail
 * app, so asking for help never ends in a dead end.
 */
export async function sendClassicHelp(
  request: ClassicHelpRequest,
  deps: {
    send: (request: ClassicHelpRequest) => Promise<void>;
    openMail: (url: string) => Promise<unknown>;
  }
): Promise<ClassicHelpResult> {
  try {
    await deps.send(request);
    return { status: 'sent' };
  } catch (error) {
    const status = responseStatus(error);
    if (status === 422 || status === 429) {
      const { code } = apiErrorInfo(error);
      return {
        status: 'rejected',
        messageKey: status === 429 ? 'auth.messages_limited' : 'auth.check_details',
        message: status === 429 ? t('auth.messages_limited') : t('auth.check_details'),
        // An address the server cannot mail is the email field's error.
        ...(code === 'email' ? { field: 'email' as const } : {}),
      };
    }
  }
  try {
    await deps.openMail(classicHelpMailto(request));
    return { status: 'mail' };
  } catch {
    return { status: 'failed' };
  }
}
