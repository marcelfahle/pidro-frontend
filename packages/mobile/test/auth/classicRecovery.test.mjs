import { describe, expect, it } from 'bun:test';
import {
  classicHelpMailto,
  requestClassicSignInLink,
  sendClassicHelp,
} from '../../src/features/auth/classicRecovery';
import { emailStanding, isEmailAddress } from '../../src/features/auth/accountEmail';

const apiError = (status, code) => ({
  response: { status, data: code ? { errors: [{ code, detail: `${code} detail` }] } : {} },
});
const help = { name: 'Bengt', email: 'bengt@example.com', details: 'Played since 2014 & won' };

describe('Classic sign-in link', () => {
  it('returns the masked address the link went to', async () => {
    const result = await requestClassicSignInLink('Bengt', async (login) => {
      expect(login).toBe('Bengt');
      return { email_hint: 'be•••••@gmail.com' };
    });
    expect(result).toEqual({ status: 'sent', emailHint: 'be•••••@gmail.com' });
  });

  it('only reports a missing account when the server says so', async () => {
    const fail = (error) =>
      requestClassicSignInLink('Bengt', async () => {
        throw error;
      });
    expect(await fail(apiError(404, 'CLASSIC_ACCOUNT_NOT_FOUND'))).toEqual({ status: 'not_found' });
    expect(await fail(apiError(422, 'CLASSIC_EMAIL_MISSING'))).toEqual({ status: 'no_email' });
    expect(await fail(apiError(429))).toEqual({ status: 'rate_limited' });
    // A server without the link service answers a bare 404.
    expect(await fail(apiError(404))).toEqual({ status: 'unavailable' });
    expect(await fail(apiError(503, 'PROVIDER_UNAVAILABLE'))).toEqual({ status: 'unavailable' });
    expect(await fail(new Error('Network Error'))).toEqual({ status: 'unavailable' });
  });
});

describe('Classic help request', () => {
  it('is sent to support when the server takes it', async () => {
    const opened = [];
    const result = await sendClassicHelp(help, {
      send: async () => undefined,
      openMail: async (url) => opened.push(url),
    });
    expect(result).toEqual({ status: 'sent' });
    expect(opened).toEqual([]);
  });

  it('opens the same message in the mail app when the server cannot take it', async () => {
    for (const error of [apiError(404), apiError(503), new Error('Network Error')]) {
      const opened = [];
      const result = await sendClassicHelp(help, {
        send: async () => {
          throw error;
        },
        openMail: async (url) => opened.push(url),
      });
      expect(result).toEqual({ status: 'mail' });
      expect(opened).toEqual([classicHelpMailto(help)]);
    }
  });

  it('keeps the player on the form when the server rejects the message', async () => {
    const opened = [];
    const deps = (error) => ({
      send: async () => {
        throw error;
      },
      openMail: async (url) => opened.push(url),
    });
    expect(await sendClassicHelp(help, deps(apiError(422, 'email')))).toEqual({
      status: 'rejected',
      message: 'email detail',
    });
    expect(await sendClassicHelp(help, deps(apiError(429)))).toEqual({
      status: 'rejected',
      message: 'Too many messages. Wait a minute and try again.',
    });
    expect(opened).toEqual([]);
  });

  it('fails only when neither the server nor a mail app is available', async () => {
    const result = await sendClassicHelp(help, {
      send: async () => {
        throw apiError(404);
      },
      openMail: async () => {
        throw new Error('No mail app');
      },
    });
    expect(result).toEqual({ status: 'failed' });
  });

  it('writes a readable message to support', () => {
    const url = new URL(classicHelpMailto(help));
    expect(url.pathname).toBe('support@pidro.net');
    expect(url.searchParams.get('subject')).toBe('Help finding my Pidro Classic account');
    expect(url.searchParams.get('body')).toBe(
      'Name I played as: Bengt\nEmail to reach me: bengt@example.com\n\nPlayed since 2014 & won'
    );
  });
});

describe('account email', () => {
  it('accepts addresses and rejects usernames', () => {
    expect(isEmailAddress(' bengt@example.com ')).toBe(true);
    expect(isEmailAddress('Bengt')).toBe(false);
    expect(isEmailAddress('bengt@example')).toBe(false);
    expect(isEmailAddress('be ngt@example.com')).toBe(false);
  });

  it('treats an address as unchecked when the lookup cannot answer', async () => {
    expect(await emailStanding('a@b.co', async () => 'known')).toBe('known');
    expect(await emailStanding('a@b.co', async () => 'unknown')).toBe('unknown');
    expect(
      await emailStanding('a@b.co', async () => {
        throw apiError(404);
      })
    ).toBe('unchecked');
  });
});
