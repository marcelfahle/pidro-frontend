import { test, expect } from '../fixtures';
import { ForgotPasswordScreen } from '../screens/forgot-password-screen';
import { register } from '../support/api';

// The dev server adds reset_token to its answer for a known address, so only the screen is
// compared here. Once the backend can switch that off (PID-183) this should compare the answers.
test('the same confirmation shows for a known and an unknown address @gap', async ({
  page,
  player,
}) => {
  await register(player);
  const forgot = new ForgotPasswordScreen(page);

  await page.goto('/forgot-password');
  await forgot.identifier.fill(player.email);
  await forgot.requestLink();
  const known = await forgot.innerText();

  await page.goto('/forgot-password');
  await forgot.identifier.fill(`nobody_${player.id}@example.com`);
  await forgot.requestLink();
  expect(await forgot.innerText()).toBe(known);
  await expect(forgot.text('If that matches a Pidro account')).toBeVisible();
});
