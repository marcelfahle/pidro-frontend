import { test, expect } from '../fixtures';
import { ForgotPasswordScreen } from '../screens/forgot-password-screen';
import { HomeScreen } from '../screens/home-screen';
import { LoginScreen } from '../screens/login-screen';
import { WebResetPage } from '../screens/web-reset-page';
import { login, register } from '../support/api';
import { resetLinkFor } from '../support/mailbox';

test('the emailed link sets a new password on the web page, and the app signs in with it', async ({
  page,
  player,
}) => {
  await register(player);
  await page.goto('/forgot-password');
  const forgot = new ForgotPasswordScreen(page);
  await forgot.identifier.fill(player.email);
  await forgot.requestLink();

  // The link goes to the old web client; follow it exactly as the email has it.
  await page.goto(await resetLinkFor(player.email));
  const web = new WebResetPage(page);
  await expect(web.newPassword).toBeVisible();
  await web.setNewPassword(player.newPassword);
  await expect(page).toHaveURL(/\/home$/);

  expect((await login(player, player.email)).status).toBe(401);
  await page.goto('/login');
  await new LoginScreen(page).signIn(player.email, player.newPassword);
  await expect(new HomeScreen(page).root).toBeVisible();
});
