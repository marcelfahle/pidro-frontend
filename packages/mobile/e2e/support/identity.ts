// What a journey needs from the identity stand-in: a token for an identity, and the answer the
// client takes in place of the native sheet. Three shapes of sign-in: Apple's identity token,
// Facebook's Limited Login token (bound to a nonce) and a classic Facebook access token.
import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import { IDENTITY_STAND_IN } from './identity-stand-in';

/** What the client's seam (e2eProviders.ts) hands back instead of the native sheet. */
type Answer =
  | { status: 'success'; provider: 'apple'; token: string }
  | {
      status: 'success';
      provider: 'facebook';
      credential:
        | { type: 'authentication_token'; token: string; nonce: string }
        | { type: 'access_token'; token: string };
    }
  | { status: 'cancelled'; provider: 'apple' | 'facebook' }
  | { status: 'failure'; provider: 'apple' | 'facebook'; message: string };

export type Who = { id: string; email: string };

/**
 * An identity by name. The name says what Classic knows about it (classic-stand-in.ts): `classic-…`
 * is a Classic player's email and Facebook id alike, `down-…` makes the lookup fail.
 */
export const identity = (name: string): Who => ({ id: name, email: `${name}@example.com` });

async function sign(provider: 'apple' | 'facebook', claims: object) {
  const response = await fetch(`${IDENTITY_STAND_IN}/sign`, {
    method: 'POST',
    body: JSON.stringify({ provider, claims }),
  });
  return ((await response.json()) as { token: string }).token;
}

/** `answer` is what the provider gives for this identity; `rejected` is a token it will not stand behind. */
export type Shape = {
  name: string;
  brand: 'Apple' | 'Facebook';
  button: string;
  provider: 'apple' | 'facebook';
  answer: (who: Who) => Promise<Answer>;
  rejected: (who: Who) => Promise<Answer>;
};

const lapsed = () => ({ exp: Math.floor(Date.now() / 1000) - 60 });

const appleAnswer = async (who: Who, claims?: object): Promise<Answer> => ({
  status: 'success',
  provider: 'apple',
  token: await sign('apple', { sub: who.id, email: who.email, email_verified: true, ...claims }),
});

export const apple: Shape = {
  name: 'Apple',
  brand: 'Apple',
  button: 'Continue with Apple',
  provider: 'apple',
  answer: (who) => appleAnswer(who),
  rejected: (who) => appleAnswer(who, lapsed()),
};

const limitedAnswer = async (who: Who, claims?: object): Promise<Answer> => {
  const nonce = randomUUID().replaceAll('-', '');
  const token = await sign('facebook', { sub: who.id, email: who.email, nonce, ...claims });
  return {
    status: 'success',
    provider: 'facebook',
    credential: { type: 'authentication_token', token, nonce },
  };
};

export const facebookLimited: Shape = {
  name: 'Facebook Limited Login',
  brand: 'Facebook',
  button: 'Continue with Facebook',
  provider: 'facebook',
  answer: (who) => limitedAnswer(who),
  rejected: (who) => limitedAnswer(who, lapsed()),
};

const accessTokenAnswer = async (who: Who, invalid = false): Promise<Answer> => ({
  status: 'success',
  provider: 'facebook',
  credential: {
    type: 'access_token',
    token: `fb.${Buffer.from(JSON.stringify({ ...who, invalid })).toString('base64url')}`,
  },
});

export const facebookAccessToken: Shape = {
  name: 'Facebook access token',
  brand: 'Facebook',
  button: 'Continue with Facebook',
  provider: 'facebook',
  answer: (who) => accessTokenAnswer(who),
  rejected: (who) => accessTokenAnswer(who, true),
};

export const shapes = [apple, facebookLimited, facebookAccessToken];

/** The next tap on Apple or Facebook gets this answer. */
export function answerNextTap(page: Page, answer: Answer) {
  return page.evaluate((next) => {
    (globalThis as { __pidroE2E?: unknown }).__pidroE2E = next;
  }, answer);
}

export const cancelled = (shape: Shape): Answer => ({
  status: 'cancelled',
  provider: shape.provider,
});
