import { test, expect } from '../fixtures';
import { ResetPasswordScreen } from '../screens/reset-password-screen';
import { api, login, register } from '../support/api';
import { untilAfter } from '../support/clock';
import { resetTokenFor } from '../support/mailbox';

// Runs against the backend started with PASSWORD_RESET_TTL_SECONDS=1.
test('an expired reset link is refused and the password stays @second-run', async ({
  page,
  player,
}) => {
  await register(player);
  const requested = Date.now();
  await api('/api/v1/auth/password-reset', { method: 'POST', body: { identifier: player.email } });
  const token = await resetTokenFor(player.email);
  await untilAfter(requested + 3_000);

  await page.goto(`/reset-password?token=${token}`);
  const reset = new ResetPasswordScreen(page);
  await reset.setNewPassword(player.newPassword);
  await expect(reset.alert).toBeVisible();
  await expect(reset.root).toBeVisible();

  expect((await login(player, player.email, player.newPassword)).status).toBe(401);
  expect((await login(player, player.email)).status).toBe(200);
});
