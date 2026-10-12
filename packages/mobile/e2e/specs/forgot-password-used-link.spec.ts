import { test, expect } from '../fixtures';
import { ForgotPasswordScreen } from '../screens/forgot-password-screen';
import { ResetPasswordScreen } from '../screens/reset-password-screen';
import { WebResetPage } from '../screens/web-reset-page';
import { api, register } from '../support/api';
import { resetLinkFor } from '../support/mailbox';

// The web page only says the link is no good and offers "Back to Sign In"; the app's own
// screen offers "Send a new link" for a refused link as well as for one with no token (PID-181).
test('a used link is refused, and the app offers a new one', async ({ page, player }) => {
  await register(player);
  await api('/api/v1/auth/password-reset', { method: 'POST', body: { identifier: player.email } });
  const link = await resetLinkFor(player.email);

  await page.goto(link);
  const web = new WebResetPage(page);
  await web.setNewPassword(player.newPassword);
  await expect(page).toHaveURL(/\/home$/);

  // The web page signed this browser in; the link is opened again signed out.
  await page.evaluate(() => localStorage.clear());
  await page.goto(link);
  await web.setNewPassword('hallohallo3');
  await expect(web.error).toBeVisible();
  await expect(page.getByRole('button', { name: /new link/i })).toHaveCount(0);

  const token = new URL(link).searchParams.get('token');
  await page.goto(`/reset-password?token=${token}`);
  const reset = new ResetPasswordScreen(page);
  await reset.setNewPassword('hallohallo3');
  await expect(reset.alert).toBeVisible();
  await expect(reset.newPassword).toHaveCount(0);
  await reset.button('Send a new link').click();
  await expect(new ForgotPasswordScreen(page).root).toBeVisible();

  await page.goto('/reset-password');
  await reset.button('Send a new link').click();
  await expect(new ForgotPasswordScreen(page).root).toBeVisible();
});
