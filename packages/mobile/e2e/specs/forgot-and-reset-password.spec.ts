import { test, expect } from '../fixtures';
import { ForgotPasswordScreen } from '../screens/forgot-password-screen';
import { HomeScreen } from '../screens/home-screen';
import { LoginScreen } from '../screens/login-screen';
import { ProfileScreen } from '../screens/profile-screen';
import { ResetPasswordScreen } from '../screens/reset-password-screen';
import { login, register } from '../support/api';
import { resetTokenFor } from '../support/mailbox';

test('a player who forgot their password gets an email and chooses a new one', async ({
  page,
  player,
}) => {
  await register(player);
  const signIn = new LoginScreen(page);
  await page.goto('/login');
  await signIn.identifier.fill(player.email);
  await signIn.forgotPassword.click();

  const forgot = new ForgotPasswordScreen(page);
  await expect(forgot.root).toBeVisible();
  await expect(forgot.identifier).toHaveValue(player.email);
  await forgot.requestLink();

  // In dev the emailed link goes to the old web client; the app's own screen takes the same token.
  const token = await resetTokenFor(player.email);
  await page.goto(`/reset-password?token=${token}`);
  const reset = new ResetPasswordScreen(page);
  await expect(reset.root).toBeVisible();
  await reset.setNewPassword(player.newPassword);
  await expect(new HomeScreen(page).root).toBeVisible();

  expect((await login(player, player.email)).status).toBe(401);
  expect((await login(player, player.email, player.newPassword)).status).toBe(200);

  // The same link a second time is refused, readably.
  await page.goto('/profile');
  await new ProfileScreen(page).signOut();
  await page.waitForURL(/\/welcome$/);
  await page.goto(`/reset-password?token=${token}`);
  await reset.setNewPassword('hallohallo3');
  await expect(reset.alert).toBeVisible();
  await expect(reset.root).toBeVisible();

  // And a link with no token says so.
  await page.goto('/reset-password');
  await expect(reset.text('This reset link is missing or no longer valid.')).toBeVisible();
});
