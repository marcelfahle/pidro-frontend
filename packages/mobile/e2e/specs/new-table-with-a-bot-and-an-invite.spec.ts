import { test, expect } from '../fixtures';
import { api, register } from '../support/api';
import { startSignedIn } from '../support/session';
import { AGE_ANSWERED, newPlayer } from '../support/player';

test('two seats can share distinct bound links after opening the table, without a name form', async ({
  page,
  player,
}) => {
  const session = await register(player);
  await startSignedIn(page, session);
  await page.goto('/lobby');
  await expect(page.getByTestId('lobby-screen')).toBeVisible({ timeout: 30_000 });

  await page.getByRole('button', { name: 'Start a table', exact: true }).first().click();
  const form = page.getByTestId('create-room-window');
  await expect(form.getByRole('textbox')).toHaveCount(0);

  const choose = async (seat: string, choice: string) => {
    const radio = form
      .getByRole('radiogroup', { name: seat, exact: true })
      .getByRole('radio', { name: choice, exact: true });
    await radio.click();
    await expect(radio).toHaveAttribute('aria-checked', 'true');
  };
  await choose('Left opponent seat', 'Bot');
  await choose('Right opponent seat', 'Friend');
  const sheet = page.getByTestId('friend-seat-sheet');
  await expect(sheet.getByText('No friends yet', { exact: true })).toBeVisible();
  await sheet.getByRole('button', { name: 'Share a link instead', exact: true }).click();
  await expect(sheet).toBeHidden();
  await choose('Partner seat', 'Friend');
  await sheet.getByRole('button', { name: 'Share a link instead', exact: true }).click();

  const firstMint = page.waitForResponse(
    (response) => response.url().endsWith('/invites') && response.request().method() === 'POST'
  );
  await form.getByRole('button', { name: 'Open the table', exact: true }).click();
  await page.waitForURL(
    (url) =>
      /^\/game\/[A-Z0-9]+$/.test(url.pathname) && url.searchParams.get('invite') === 'south,west'
  );
  await expect(page.getByTestId('invite-window')).toBeVisible();
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Copy link', exact: true })).toBeVisible();
  const firstLink = (await (await firstMint).json()).data.invite.code;
  const secondMint = page.waitForResponse(
    (response) => response.url().endsWith('/invites') && response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  const secondLink = (await (await secondMint).json()).data.invite.code;
  expect(secondLink).not.toBe(firstLink);
  await expect(page.getByRole('button', { name: 'Copy link', exact: true })).toBeVisible();

  // The server seated the bot and kept the partner and invite seats open.
  const code = new URL(page.url()).pathname.split('/').pop();
  const { payload } = await api(`/api/v1/rooms/${code}`, { token: session.token });
  const room = payload.data.room;
  const bots = Object.values(room.positions as Record<string, string | null>).filter((id) =>
    id?.startsWith('bot_')
  );
  expect(bots).toHaveLength(1);
  expect(room.available_positions).toHaveLength(2);
  for (const [link, position] of [
    [firstLink, 'south'],
    [secondLink, 'west'],
  ]) {
    const recipient = await register(newPlayer());
    const redeemed = await api(`/api/v1/invites/${link}/redeem`, {
      method: 'POST',
      token: recipient.token,
      body: { platform: 'web' },
    });
    expect(redeemed.status).toBe(200);
    expect(redeemed.payload.data.position).toBe(position);
  }
});

test('picked friends become holds only on Open; invitations arrive live, recover on launch and join the exact seat @responsive', async ({
  page,
  player,
  browser,
}) => {
  const host = await register(player);
  const friendPlayer = newPlayer();
  const friend = await register(friendPlayer);
  for (const [caller, target] of [
    [host, friend],
    [friend, host],
  ]) {
    expect(
      (await api(`/api/v1/friends/${target.user.id}`, { method: 'PUT', token: caller.token }))
        .status
    ).toBe(200);
  }
  const receiverContext = await browser.newContext({
    viewport: page.viewportSize()!,
    baseURL: test.info().project.use.baseURL,
  });
  const receiver = await receiverContext.newPage();
  await receiver.addInitScript(
    (age) => localStorage.setItem('age-gate-storage', age),
    AGE_ANSWERED
  );
  await startSignedIn(receiver, friend);
  let joinedLobby = false;
  await receiver.routeWebSocket('**/socket/websocket*', (socket) => {
    const server = socket.connectToServer();
    server.onMessage((message) => {
      const frame = JSON.parse(String(message));
      if (frame[2] === 'lobby' && frame[3] === 'phx_reply' && frame[4]?.status === 'ok')
        joinedLobby = true;
      socket.send(message);
    });
  });
  try {
    await receiver.goto('/home');
    await expect.poll(() => joinedLobby).toBe(true);
    await startSignedIn(page, host);
    await page.goto('/lobby');
    await page.getByRole('button', { name: 'Start a table', exact: true }).first().click();
    const form = page.getByTestId('create-room-window');
    const friendChoice = form
      .getByRole('radiogroup', { name: 'Right opponent seat', exact: true })
      .getByRole('radio', { name: 'Friend', exact: true });
    let created = 0;
    page.on('request', (request) => {
      if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/v1/rooms')
        created++;
    });
    await friendChoice.click();
    const sheet = page.getByTestId('friend-seat-sheet');
    await sheet.getByRole('link', { name: 'Cancel', exact: true }).click();
    await expect(
      form
        .getByRole('radiogroup', { name: 'Right opponent seat', exact: true })
        .getByRole('radio', { name: 'Bot', exact: true })
    ).toHaveAttribute('aria-checked', 'true');
    await friendChoice.click();
    await sheet
      .getByRole('textbox', { name: 'Find a friend', exact: true })
      .fill(friendPlayer.name);
    await sheet.getByRole('radio', { name: new RegExp(`^${friendPlayer.name},`) }).click();
    await sheet.getByRole('button', { name: `Invite ${friendPlayer.name}`, exact: true }).click();
    await expect(
      form.getByTestId('create-seat_4').getByText('Invited', { exact: true })
    ).toBeVisible();
    expect(created).toBe(0);
    await form.getByRole('button', { name: 'Open the table', exact: true }).click();
    await page.waitForURL(/\/game\/[A-Z0-9]+$/);
    const code = new URL(page.url()).pathname.split('/').pop()!;
    expect(
      (await api(`/api/v1/rooms/${code}`, { token: host.token })).payload.data.room.seats.west
        .held_for.user_id
    ).toBe(friend.user.id);
    const inbox = receiver.getByTestId('seat-invitations');
    await expect(
      inbox.getByText(`${player.name} is holding a seat for you`, { exact: true })
    ).toBeVisible();
    await expect(receiver.getByTestId('friends-invitation-count')).toHaveText('1');
    await receiver.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(receiver).toHaveURL(/\/settings$/);
    // The shell badge stays live even away from the invitation list.
    expect(
      (await api(`/api/v1/rooms/${code}/seats/west/hold`, { method: 'DELETE', token: host.token }))
        .status
    ).toBe(200);
    await expect(receiver.getByTestId('friends-invitation-count')).toHaveCount(0);
    await page.getByRole('button', { name: 'Invite', exact: true }).click();
    await sheet.getByRole('radio', { name: new RegExp(`^${friendPlayer.name},`) }).click();
    await sheet.getByRole('button', { name: `Invite ${friendPlayer.name}`, exact: true }).click();
    await expect(receiver.getByTestId('friends-invitation-count')).toHaveText('1');
    await receiver.getByRole('button', { name: 'Home', exact: true }).click();
    await expect(receiver).toHaveURL(/\/home$/);
    await receiver.reload();
    await expect(inbox).toBeVisible();
    // Lost seats use the same error contract whether waiting or already playing.
    for (const error of ['SEAT_TAKEN', 'ROOM_FULL']) {
      await receiver.route(
        `**/api/v1/rooms/${code}/join`,
        async (route) => {
          expect(route.request().postDataJSON()).toEqual({ position: 'south' });
          await route.fulfill({
            status: 409,
            json: { error, error_code: error, error_params: {} },
          });
        },
        { times: 1 }
      );
      await inbox.getByRole('button', { name: 'Sit down', exact: true }).click();
      await expect(inbox.getByText('That seat is gone', { exact: true })).toBeVisible();
      await expect(inbox.getByRole('button', { name: 'Sit down', exact: true })).toHaveCount(0);
      await expect(receiver.getByTestId('friends-invitation-count')).toHaveCount(0);
      await expect(receiver).toHaveURL(/\/home$/);
      // The mocked refusal did not change the real hold; /me restores it on reload.
      await receiver.reload();
      await expect(inbox.getByRole('button', { name: 'Sit down', exact: true })).toBeVisible();
    }
    await receiver.goto('/lobby');
    await inbox.getByRole('button', { name: 'Sit down', exact: true }).click();
    await receiver.waitForURL(new RegExp(`/game/${code}$`));
    expect(
      (await api(`/api/v1/rooms/${code}`, { token: host.token })).payload.data.room.positions.south
    ).toBe(friend.user.id);
    expect(
      (await api('/api/v1/auth/me', { token: friend.token })).payload.data.seat_invitations
    ).toEqual([]);
  } finally {
    await receiverContext.close();
  }
});
