import { test, expect } from '../fixtures';
import { HomeScreen } from '../screens/home-screen';
import { register } from '../support/api';
import { startSignedIn } from '../support/session';

test('a signed-in Home has five tabs and Play online opens the lobby', async ({ page, player }) => {
  await startSignedIn(page, await register(player));
  await page.goto('/home');
  const home = new HomeScreen(page);
  await expect(home.root).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Open your profile' })).toContainText(player.name);
  for (const tab of ['League', 'Profile', 'Home', 'Friends', 'Settings'])
    await expect(page.getByRole('button', { name: tab, exact: true }).last()).toBeVisible();

  await expect(home.playOnline).toContainText('Play online');
  await home.playOnline.click();
  await page.waitForURL(/\/lobby$/);
  await expect(page.getByTestId('lobby-screen')).toBeVisible();
});
