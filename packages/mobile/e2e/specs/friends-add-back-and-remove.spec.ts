import { test, expect } from '../fixtures';
import { AuthSheet } from '../screens/auth-sheet';
import { api, guest, register } from '../support/api';
import { newPlayer } from '../support/player';
import { sessionOf, startSignedIn } from '../support/session';

test.use({ unavailableExpected: true });

test('Friends receives a live add, adds back, removes after confirmation, and searches @responsive', async ({
  page,
  player,
}) => {
  const account = await register(player);
  const otherPlayer = newPlayer();
  const other = await register(otherPlayer);
  let lobbyJoined = false;
  let changes = 0;
  let disconnected = false;
  let disconnect = async () => {};
  await page.routeWebSocket('**/socket/websocket*', (socket) => {
    if (disconnected) return socket.close();
    const server = socket.connectToServer();
    disconnect = async () => {
      await Promise.all([socket.close(), server.close()]);
    };
    server.onMessage((message) => {
      const frame = JSON.parse(String(message));
      if (frame[2] === 'lobby' && frame[3] === 'phx_reply' && frame[4]?.status === 'ok')
        lobbyJoined = true;
      if (frame[2] === 'lobby' && frame[3] === 'friends_changed') changes++;
      socket.send(message);
    });
  });
  await startSignedIn(page, account);
  await page.goto('/friends');
  await expect(page.getByText('Nobody here yet. Add the people you play with.')).toBeVisible();

  // Wait for the lobby join before sending the event from the other player.
  await expect.poll(() => lobbyJoined).toBe(true);
  const incoming = await api(`/api/v1/friends/${account.user.id}`, {
    method: 'PUT',
    token: other.token,
  });
  expect(incoming.status).toBe(200);
  await page.getByRole('button', { name: 'Add back', exact: true }).waitFor();
  // A failed event refetch must not discard the mutation's successful full list.
  await page.route('**/api/v1/friends', (route) =>
    route.fulfill({ status: 503, json: { error: 'UNAVAILABLE' } })
  );
  let releaseAdd: (() => void) | undefined;
  await page.route(`**/api/v1/friends/${other.user.id}`, async (route) => {
    const response = await route.fetch();
    await new Promise<void>((resolve) => {
      releaseAdd = resolve;
    });
    await route.fulfill({ response });
  });
  await page.getByRole('button', { name: 'Add back', exact: true }).click();
  await expect.poll(() => changes).toBe(2);
  await expect.poll(() => Boolean(releaseAdd)).toBe(true);
  releaseAdd!();
  await expect(page.getByRole('button', { name: 'Add back', exact: true })).toHaveCount(0);
  await expect(page.getByText('Could not update Friends. Please try again.')).toBeVisible();
  await page.unroute('**/api/v1/friends');
  await page.unroute(`**/api/v1/friends/${other.user.id}`);
  const lists = await api('/api/v1/friends', { token: account.token });
  expect(lists.payload.data.friends.map((friend: { user_id: string }) => friend.user_id)).toEqual([
    other.user.id,
  ]);

  await page.getByRole('button', { name: `View ${otherPlayer.name}'s profile` }).click();
  await page.getByRole('button', { name: 'Remove friend', exact: true }).click();
  await expect(page.getByText(`Remove ${otherPlayer.name} as a friend?`)).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(
    (await api('/api/v1/friends', { token: account.token })).payload.data.friends
  ).toHaveLength(1);
  await page.getByRole('button', { name: 'Remove friend', exact: true }).click();
  await api(`/api/v1/friends/${account.user.id}`, { method: 'DELETE', token: other.token });
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByText('Nobody here yet. Add the people you play with.')).toBeVisible();
  await api(`/api/v1/friends/${account.user.id}`, { method: 'PUT', token: other.token });
  await page.getByRole('button', { name: 'Add back', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Add back', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: `View ${otherPlayer.name}'s profile` }).click();
  await page.getByRole('button', { name: 'Remove friend', exact: true }).click();
  await page.getByRole('button', { name: 'Remove friend', exact: true }).click();
  await expect(page.getByText('Nobody here yet. Add the people you play with.')).toBeVisible();
  expect((await api('/api/v1/friends', { token: other.token })).payload.data.friends).toHaveLength(
    0
  );

  // A missed event must be recovered on rejoin without navigating away.
  disconnected = true;
  await disconnect();
  await api(`/api/v1/friends/${account.user.id}`, { method: 'PUT', token: other.token });
  disconnected = false;
  await page.getByRole('button', { name: 'Add back', exact: true }).waitFor();
  await api(`/api/v1/friends/${account.user.id}`, { method: 'DELETE', token: other.token });
  await expect(page.getByText('Nobody here yet. Add the people you play with.')).toBeVisible();

  await page.getByRole('button', { name: 'Add a friend', exact: true }).click();
  await expect(page.getByText('Recently played with', { exact: true })).toBeVisible();
  await expect(page.getByText('People you play with will appear here.')).toBeVisible();
  await page.clock.install();
  await page.getByRole('textbox', { name: 'Find a player', exact: true }).fill(' ');
  await page.clock.runFor(350);
  await expect(page.getByText('People you play with will appear here.')).toBeVisible();
  await page.getByRole('textbox', { name: 'Find a player', exact: true }).fill(otherPlayer.name);
  await page.getByRole('button', { name: `Add ${otherPlayer.name}`, exact: true }).click();
  await expect(page.getByText('Added', { exact: true })).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Find a player', exact: true })
    .fill(`${otherPlayer.name} `);
  await page.clock.runFor(350);
  await expect(page.getByText('Added', { exact: true })).toBeVisible();
  expect(
    (await api('/api/v1/friends', { token: other.token })).payload.data.added_you.map(
      (entry: { user_id: string }) => entry.user_id
    )
  ).toEqual([account.user.id]);
});

test('a guest opens Friends from Home, saves, and stays on Friends', async ({ page, player }) => {
  const started = await guest(player);
  await startSignedIn(page, started);
  await page.goto('/home');
  await page.getByRole('button', { name: 'Friends', exact: true }).click();
  const sheet = new AuthSheet(page);
  await expect(sheet.root).toBeVisible();
  await sheet.save(player.email, player.password, player.name);
  await expect(sheet.root).toBeHidden();
  await expect(page.getByTestId('friends-screen')).toBeVisible();
  await expect(page.getByText('Nobody here yet. Add the people you play with.')).toBeVisible();
  expect((await sessionOf(page))?.user).toMatchObject({ id: started.user.id, guest: false });
});
