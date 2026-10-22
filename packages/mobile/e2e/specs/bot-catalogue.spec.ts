import { test, expect } from '../fixtures';

test('catalogue metadata arriving after a snapshot updates rematch identity', async ({ page }) => {
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/v1/bots', async (route) => {
    await ready;
    await route.fulfill({
      json: {
        data: [
          {
            id: 'antti',
            name: 'Catalogue Antti',
            description: '',
            avatar_url: 'http://localhost:4000/images/bots/antti.svg',
          },
        ],
      },
    });
  });
  await page.goto('/table-dev?fixture=bot-crew&phase=game_over');
  const result = page.getByTestId('game-over-window');
  await expect(
    result.getByRole('button', { name: 'View Antti’s profile', exact: true })
  ).toBeVisible();
  release();
  await expect(
    result.getByRole('button', { name: 'View Catalogue Antti’s profile', exact: true })
  ).toBeVisible();
  await expect(
    result.getByRole('button', { name: 'View Antti’s profile', exact: true })
  ).toHaveCount(0);
});
