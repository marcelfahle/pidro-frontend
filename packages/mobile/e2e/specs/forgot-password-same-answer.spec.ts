import { test, expect } from '../fixtures';
import { ForgotPasswordScreen } from '../screens/forgot-password-screen';
import { api, register } from '../support/api';

test('the same confirmation shows for a known and an unknown address', async ({ page, player }) => {
  await register(player);
  const forgot = new ForgotPasswordScreen(page);

  // The backend answers a known and an unknown address alike (it is started with
  // PASSWORD_RESET_DEBUG_TOKENS=false, which would add a reset_token for a known one).
  const ask = (identifier: string) =>
    api('/api/v1/auth/password-reset', { method: 'POST', body: { identifier } });
  const known = await ask(player.email);
  expect(await ask(`nobody_${player.id}@example.com`)).toEqual(known);

  await page.goto('/forgot-password');
  await forgot.identifier.fill(player.email);
  await forgot.requestLink();
  const screenForKnown = await forgot.innerText();

  await page.goto('/forgot-password');
  await forgot.identifier.fill(`nobody_${player.id}@example.com`);
  await forgot.requestLink();
  expect(await forgot.innerText()).toBe(screenForKnown);
  await expect(forgot.text('If that matches a Pidro account')).toBeVisible();
});
