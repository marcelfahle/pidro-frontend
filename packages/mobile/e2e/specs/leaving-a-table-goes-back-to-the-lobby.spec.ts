import { test, expect } from '../fixtures';
import { register } from '../support/api';
import { startSignedIn } from '../support/session';

test('leaving a table goes back to the Lobby it came from; one back press is Home', async ({
  page,
  player,
}) => {
  await startSignedIn(page, await register(player));
  await page.goto('/home');
  await page.getByTestId('home-play-online').click();
  await expect(page).toHaveURL(/\/lobby$/);
  await page.getByRole('button', { name: 'Start a table', exact: true }).first().click();
  await expect(page).toHaveURL(/\/new-table$/);

  const picker = page.getByTestId('seat-picker-container');
  for (const seat of ['east', 'south', 'west']) {
    await page.getByTestId(`new-table-seat-${seat}`).click();
    await picker.getByRole('radio', { name: /^Bot,/ }).click();
    await expect(picker).toBeHidden();
  }
  await page.getByRole('button', { name: 'Start the game', exact: true }).click();
  await page.waitForURL(/\/game\/[A-Z0-9]+$/);
  await page.getByRole('button', { name: "I'm ready", exact: true }).click();

  // Leave from the playing table, as the beta tester did.
  await page.getByRole('button', { name: 'Table settings', exact: true }).click();
  await page.getByRole('button', { name: 'Leave table', exact: true }).click();
  await page.getByRole('button', { name: 'Leave table', exact: true }).last().click();
  await expect(page).toHaveURL(/\/lobby$/);
  await expect(page.getByTestId('lobby-screen')).toHaveCount(1);

  await page.goBack();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByTestId('home-screen')).toBeVisible();
});
