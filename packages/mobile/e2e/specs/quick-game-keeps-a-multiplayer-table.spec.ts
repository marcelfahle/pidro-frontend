import { test, expect } from '../fixtures';
import { HomeScreen } from '../screens/home-screen';
import { register } from '../support/api';
import { startSignedIn } from '../support/session';

test('Quick game at a multiplayer table sends the player to the lobby', async ({
  page,
  player,
}) => {
  await startSignedIn(page, await register(player));
  await page.goto('/home');
  const home = new HomeScreen(page);
  await expect(home.root).toBeVisible({ timeout: 30_000 });

  // The player sits at a game in progress: the new table is refused and the
  // lobby lists that game as theirs to rejoin.
  await page.route('**/api/v1/rooms', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify({
            errors: [{ code: 'ALREADY_IN_ROOM', detail: 'Player is already in a room' }],
          }),
        })
      : route.continue()
  );
  await page.route('**/api/v1/lobby', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          my_rejoinable: [{ code: 'MINE01', name: 'My table', status: 'playing', seats: [] }],
          open_tables: [],
          substitute_needed: [],
          spectatable: [],
        },
      }),
    })
  );
  const leaves: string[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/leave')) leaves.push(request.url());
  });

  await page.getByTestId('home-quick-game').click();
  await page.waitForURL(/\/lobby$/);
  await expect(
    home.root.getByText('You already have a multiplayer table. Rejoin it or leave it first.')
  ).toBeAttached();
  expect(leaves).toEqual([]);
});
