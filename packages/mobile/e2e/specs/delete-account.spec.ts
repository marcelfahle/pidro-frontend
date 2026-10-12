import { test, expect } from '../fixtures';
import { LoginScreen } from '../screens/login-screen';
import { ProfileScreen } from '../screens/profile-screen';
import { login, register } from '../support/api';
import { startSignedIn } from '../support/session';

test('delete account: confirm, signed out, old sign-in refused', async ({ page, player }) => {
  await startSignedIn(page, await register(player));
  await page.goto('/profile');
  await new ProfileScreen(page).deleteAccount();
  await page.waitForURL(/\/welcome$/);

  expect((await login(player, player.email)).status).toBe(401);
  await page.goto('/login');
  await new LoginScreen(page).signIn(player.email, player.password);
  await expect(page).toHaveURL(/\/login$/);
});
