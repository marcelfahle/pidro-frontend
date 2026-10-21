import { test, expect } from '../fixtures';
import { WelcomeWindow } from '../screens/welcome-window';

test('the welcome screen offers a quick game, online play, Classic and sign in, and no menu', async ({
  page,
}) => {
  await page.goto('/');
  const welcome = new WelcomeWindow(page);
  await expect(welcome.root).toBeVisible({ timeout: 30_000 });
  await expect(welcome.quickGame).toContainText('Quick game');
  await expect(welcome.quickGame).toContainText('No sign-up');
  await expect(welcome.playOnline).toContainText('Play online');
  await expect(welcome.playOnline).toContainText('Needs a free account');
  await expect(welcome.classicPlaque).toBeVisible();
  await expect(welcome.root.getByRole('link', { name: 'Sign in' })).toBeVisible();

  // The tab pill belongs to signed-in players.
  for (const tab of ['League', 'Profile', 'Friends'])
    await expect(page.getByRole('button', { name: tab, exact: true })).toHaveCount(0);
});
