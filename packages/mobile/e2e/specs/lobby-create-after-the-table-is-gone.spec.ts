import { test, expect } from '../fixtures';
import { register } from '../support/api';
import { startSignedIn } from '../support/session';

test('a new table is created when the old one is already gone', async ({ page, player }) => {
  await startSignedIn(page, await register(player));
  await page.goto('/lobby');
  await expect(page.getByTestId('lobby-screen')).toBeVisible({ timeout: 30_000 });

  // The first create is refused as if the player still sat at a table that is
  // gone by the time the lobby leaves it: the server answers "not in any room".
  let refused = false;
  await page.route('**/api/v1/rooms', (route) => {
    if (route.request().method() !== 'POST' || refused) return route.continue();
    refused = true;
    return route.fulfill({
      status: 422,
      contentType: 'application/json',
      body: JSON.stringify({
        errors: [{ code: 'ALREADY_IN_ROOM', detail: 'Player is already in a room' }],
      }),
    });
  });
  const left = page.waitForResponse((response) => response.url().endsWith('/current/leave'));

  await page.getByRole('button', { name: 'Start a table', exact: true }).first().click();
  await expect(page).toHaveURL(/\/new-table$/);
  await page
    .getByTestId('new-table-screen')
    .getByRole('button', { name: 'Open the table' })
    .click();
  expect((await left).status()).toBe(404);
  await page.waitForURL(/\/game\/[A-Z0-9]+/);
});

test('creating a table never leaves an unknown or live multiplayer table', async ({
  page,
  player,
}) => {
  await startSignedIn(page, await register(player));
  await page.goto('/lobby');
  await page.getByRole('button', { name: 'Start a table', exact: true }).first().click();
  const form = page.getByTestId('create-room-window');
  await expect(form).toBeVisible();
  await page.route('**/api/v1/rooms', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({ status: 422, json: { error: 'ALREADY_IN_ROOM' } })
      : route.continue()
  );
  const leaves: string[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/leave')) leaves.push(request.url());
  });
  for (const answer of ['unavailable', 'incomplete', 'seated']) {
    await page.route('**/api/v1/lobby', (route) =>
      answer === 'unavailable'
        ? route.abort()
        : route.fulfill({
            status: 200,
            json: {
              data:
                answer === 'incomplete'
                  ? { open_tables: [] }
                  : {
                      my_rejoinable: [
                        { code: 'MINE01', name: 'My table', status: 'playing', seats: [] },
                      ],
                      open_tables: [],
                      substitute_needed: [],
                      spectatable: [],
                    },
            },
          })
    );
    await form.getByRole('button', { name: 'Open the table', exact: true }).click();
    await expect(
      form.getByText(
        answer === 'seated'
          ? 'You are already at a table. Rejoin it or leave before creating another table.'
          : 'We could not check whether you are at another table. Please try again.',
        { exact: true }
      )
    ).toBeVisible();
    expect(leaves).toEqual([]);
    await page.unroute('**/api/v1/lobby');
  }
  // The cached room is still seated; the fresh, real lobby now says it is gone.
  await page.unroute('**/api/v1/rooms');
  let refused = false;
  await page.route('**/api/v1/rooms', (route) => {
    if (route.request().method() !== 'POST' || refused) return route.continue();
    refused = true;
    return route.fulfill({ status: 422, json: { error: 'ALREADY_IN_ROOM' } });
  });
  await form.getByRole('button', { name: 'Open the table', exact: true }).click();
  await page.waitForURL(/\/game\/[A-Z0-9]+/);
  expect(leaves).toHaveLength(1);
});
