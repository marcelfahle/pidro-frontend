import { test, expect } from '../fixtures';
import { HomeScreen } from '../screens/home-screen';
import { guest } from '../support/api';
import { playOutGame } from '../support/game';
import { startSignedIn } from '../support/session';

test.setTimeout(120_000);

test('a guest Home shows a two-word name, no menu, and a game count that rises after a game', async ({
  page,
  player,
}) => {
  const started = await guest(player);
  await startSignedIn(page, started);
  await page.goto('/home');
  const home = new HomeScreen(page);
  const identity = page.getByRole('button', { name: 'Open your profile' });
  await expect(identity).toContainText(/^\s*\S+ \S+\s*Guest · 0 games/);
  for (const tab of ['League', 'Stats'])
    await expect(page.getByRole('button', { name: tab, exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Friends', exact: true })).toBeVisible();

  await page.getByTestId('home-quick-game').click();
  await page.waitForURL(/\/game\/[A-Z0-9]+/);
  await playOutGame(page, started.token);
  await page.getByTestId('game-over-home').click();
  await expect(home.root).toBeVisible();
  await expect(identity).toContainText('Guest · 1 game');
});
