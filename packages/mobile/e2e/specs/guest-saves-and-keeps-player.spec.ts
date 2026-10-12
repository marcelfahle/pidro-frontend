import { test, expect } from '../fixtures';
import { HomeScreen } from '../screens/home-screen';
import { LoginScreen } from '../screens/login-screen';
import { AuthSheet } from '../screens/auth-sheet';
import { ProfileScreen } from '../screens/profile-screen';
import { WelcomeWindow } from '../screens/welcome-window';
import { whoAmI } from '../support/api';
import { sessionOf } from '../support/session';

test('a guest saves their player and keeps it', async ({ page, player }) => {
  await page.goto('/');
  await new WelcomeWindow(page).quickGame.click({ timeout: 30_000 });
  await page.waitForURL(/\/game\/[A-Z0-9]+/, { timeout: 30_000 });
  const guest = (await sessionOf(page))?.user;
  expect(guest?.guest).toBe(true);

  await page.goto('/home');
  await new HomeScreen(page).playOnline.click();
  const sheet = new AuthSheet(page);
  await expect(sheet.root).toBeVisible();
  await sheet.settle();

  await sheet.save(player.email, 'short');
  await expect(sheet.text('Use 8 characters or more.')).toBeVisible();
  await sheet.save(player.email, player.password);
  await page.waitForURL(/\/lobby$/);

  // The screen and the server agree: same player, no longer a guest.
  const saved = await sessionOf(page);
  expect(saved?.user?.id).toBe(guest?.id);
  expect(saved?.user?.guest).toBeFalsy();
  const server = await whoAmI(saved?.accessToken as string);
  expect(server).toMatchObject({ id: guest?.id, guest: false, email: player.email });

  await page.goto('/profile');
  await new ProfileScreen(page).signOut();
  await page.waitForURL(/\/welcome$/);
  await page.goto('/login');
  await new LoginScreen(page).signIn(player.email, player.password);
  await expect(new HomeScreen(page).root).toBeVisible();
  expect((await sessionOf(page))?.user?.id).toBe(guest?.id);
});
