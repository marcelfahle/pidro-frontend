import { test, expect } from '../fixtures';
import { JoinInviteScreen } from '../screens/join-invite-screen';
import { inviteToTable, register } from '../support/api';
import { newPlayer } from '../support/player';
import { startSignedIn } from '../support/session';

test('an invite joins when the table it asked to leave is already gone', async ({
  page,
  player,
}) => {
  const { code, room } = await inviteToTable(newPlayer());
  await startSignedIn(page, await register(player));

  // The first join is refused as if the player still sat at a table that is
  // gone by the time they confirm leaving it: the server answers "not in any room".
  let refused = false;
  await page.route(`**/api/v1/invites/${code}/redeem`, (route) => {
    if (refused) return route.continue();
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

  await page.goto(`/join/${code}`);
  await new JoinInviteScreen(page).joinTable();
  await page
    .getByRole('button', { name: 'Leave current table and join' })
    .click({ timeout: 30_000 });
  expect((await left).status()).toBe(404);
  await page.waitForURL(`**/game/${room}`);
});
