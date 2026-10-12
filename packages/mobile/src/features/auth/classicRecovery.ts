import type { ClassicHelpRequest, ClassicSignInLink } from '@pidro/shared';
import { apiErrorInfo } from '../../utils/apiErrors';

export const SUPPORT_EMAIL = 'support@pidro.net';

export type SignInLinkResult =
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
 * Asks the server to email a sign-in link to the address on a Classic
 * account. A bare 404 is a server without the link service, not a missing
 * player, so only a coded answer may tell someone their account wasn't found.
 */
export async function requestClassicSignInLink(
  login: string,
  request: (login: string) => Promise<ClassicSignInLink>
): Promise<SignInLinkResult> {
  try {
    const link = await request(login);
    return { status: 'sent', emailHint: link.email_hint };
  } catch (error) {
    const { code } = apiErrorInfo(error);
    if (code === 'CLASSIC_ACCOUNT_NOT_FOUND') return { status: 'not_found' };
    if (code === 'CLASSIC_EMAIL_MISSING') return { status: 'no_email' };
    if (responseStatus(error) === 429) return { status: 'rate_limited' };
    return { status: 'unavailable' };
  }
}

export type ClassicHelpResult =
  | { status: 'sent' }
  | { status: 'mail' }
  | { status: 'rejected'; message: string }
  | { status: 'failed' };

export function classicHelpMailto({ name, email, details }: ClassicHelpRequest): string {
  const body = [`Name I played as: ${name}`, `Email to reach me: ${email}`, '', details ?? '']
    .join('\n')
    .trim();
  const subject = 'Help finding my Pidro Classic account';
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
      return {
        status: 'rejected',
        message:
          apiErrorInfo(error).detail ??
          (status === 429
            ? 'Too many messages. Wait a minute and try again.'
            : 'Check your details and try again.'),
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
