import { test, expect } from '../fixtures';
import { api, register } from '../support/api';
import { startSignedIn } from '../support/session';
import { AGE_ANSWERED, newPlayer } from '../support/player';

test('a bot and two open seats share a table link without a name form or seat binding', async ({
  page,
  player,
}) => {
  const session = await register(player);
  await startSignedIn(page, session);
  await page.goto('/lobby');
  await expect(page.getByTestId('lobby-screen')).toBeVisible({ timeout: 30_000 });

  await page.getByRole('button', { name: 'Start a table', exact: true }).first().click();
  await expect(page).toHaveURL(/\/new-table$/);
  const form = page.getByTestId('new-table-screen');
  await expect(form.getByRole('textbox')).toHaveCount(0);

  const picker = page.getByTestId('seat-picker-container');
  for (const seat of ['east', 'south', 'west']) {
    await form.getByTestId(`new-table-seat-${seat}`).click();
    await expect(picker.getByRole('radio', { name: /^Anyone,/ })).toBeChecked();
    for (const title of [
      'Bot',
      'Anyone',
      '100+ games played',
      '1000+ games played',
      'With password',
    ]) {
      await expect(
        picker.getByRole('radio', {
          name: new RegExp(`^${title.replace('+', '\\+')},`),
        })
      ).toBeVisible();
    }
    if (seat === 'east') {
      await picker.getByRole('radio', { name: /^Bot,/ }).click();
    } else {
      if (!(await picker.getByTestId('friend-picker').isVisible())) {
        await picker.getByRole('button', { name: /^A friend,/ }).click();
      }
      await expect(picker.getByText('No friends yet', { exact: true })).toBeVisible();
      await picker.getByRole('button', { name: 'Cancel', exact: true }).click();
    }
    await expect(picker).toBeHidden();
  }

  await form.getByRole('button', { name: 'Open the table', exact: true }).click();
  await page.waitForURL((url) => /^\/game\/[A-Z0-9]+$/.test(url.pathname));
  expect(new URL(page.url()).searchParams.has('invite')).toBe(false);
  await expect(page.getByTestId('waiting-table')).toBeVisible();
  await expect(page.getByTestId('invite-window')).toBeHidden();
  const firstMint = page.waitForResponse(
    (response) => response.url().endsWith('/invites') && response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: 'Share the table link', exact: true }).click();
  await expect(page.getByTestId('invite-window')).toBeVisible();
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Copy link', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Share', exact: true })).toBeVisible();
  const minted = await firstMint;
  expect(minted.ok()).toBe(true);
  expect(minted.request().postDataJSON().seat_hint ?? null).toBeNull();
  expect(minted.request().postDataJSON().position ?? null).toBeNull();
  const link = (await minted.json()).data.invite.code;
  expect(link).toBeTruthy();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByTestId('invite-window')).toBeHidden();

  // The server seated the bot and kept the partner and invite seats open.
  const code = new URL(page.url()).pathname.split('/').pop();
  const { payload } = await api(`/api/v1/rooms/${code}`, { token: session.token });
  const room = payload.data.room;
  const bots = Object.values(room.positions as Record<string, string | null>).filter((id) =>
    id?.startsWith('bot_')
  );
  expect(bots).toHaveLength(1);
  expect(room.available_positions).toHaveLength(2);
  const assigned = new Set<string>();
  for (let index = 0; index < 2; index++) {
    const recipient = await register(newPlayer());
    const redeemed = await api(`/api/v1/invites/${link}/redeem`, {
      method: 'POST',
      token: recipient.token,
      body: { platform: 'web' },
    });
    expect(redeemed.status).toBe(200);
    expect(['south', 'west']).toContain(redeemed.payload.data.position);
    assigned.add(redeemed.payload.data.position);
  }
  expect(assigned.size).toBe(2);
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
    await expect(page).toHaveURL(/\/new-table$/);
    const form = page.getByTestId('new-table-screen');
    const sheet = page.getByTestId('seat-picker-container');
    const friends = sheet.getByTestId('friend-picker');
    const openFriends = async (position: string) => {
      await page.getByTestId(`new-table-seat-${position}`).click();
      await expect(sheet).toBeVisible();
      if (!(await friends.isVisible())) {
        await sheet.getByRole('button', { name: /^A friend,/ }).click();
      }
      await expect(friends).toBeVisible();
    };
    let created = 0;
    page.on('request', (request) => {
      if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/v1/rooms')
        created++;
    });
    await openFriends('west');
    await sheet.getByRole('button', { name: 'Cancel', exact: true }).click();
    await form.getByTestId('new-table-seat-west').click();
    await expect(sheet.getByRole('radio', { name: /^Anyone,/ })).toBeChecked();
    await sheet.getByRole('button', { name: 'Cancel', exact: true }).click();
    await openFriends('west');
    await friends
      .getByRole('textbox', { name: 'Find a friend', exact: true })
      .fill(friendPlayer.name);
    await friends.getByRole('button', { name: `Invite ${friendPlayer.name}`, exact: true }).click();
    await expect(sheet).toBeHidden();
    await expect(form.getByTestId('new-table-seat-west')).toContainText(friendPlayer.name);
    await openFriends('south');
    await expect(
      friends.getByRole('button', { name: `Invite ${friendPlayer.name}`, exact: true })
    ).toBeDisabled();
    await sheet.getByRole('button', { name: 'Cancel', exact: true }).click();
    await openFriends('west');
    await expect(
      friends.getByRole('button', { name: friendPlayer.name, exact: true })
    ).toBeEnabled();
    await sheet.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect(created).toBe(0);
    await form.getByRole('button', { name: 'Open the table', exact: true }).click();
    await page.waitForURL(/\/game\/[A-Z0-9]+$/);
    const code = new URL(page.url()).pathname.split('/').pop()!;
    expect(
      (await api(`/api/v1/rooms/${code}`, { token: host.token })).payload.data.room.seats.west
        .held_for.user_id
    ).toBe(friend.user.id);
    await openFriends('south');
    await expect(
      friends.getByRole('button', { name: `Invite ${friendPlayer.name}`, exact: true })
    ).toBeDisabled();
    await sheet.getByRole('button', { name: 'Cancel', exact: true }).click();
    const inbox = receiver.getByTestId('seat-invitations');
    await expect(
      inbox.getByText(`${player.name} is holding a seat for you`, { exact: true })
    ).toBeVisible();
    await expect(receiver.getByTestId('friends-invitation-count')).toHaveText('1');
    await expect(
      receiver.getByRole('button', { name: 'Friends, 1 waiting for your answer', exact: true })
    ).toBeVisible();
    await receiver.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(receiver).toHaveURL(/\/settings$/);
    // The shell badge stays live even away from the invitation list.
    await page.getByTestId('new-table-seat-west').click();
    await sheet.getByRole('radio', { name: /^Anyone,/ }).click();
    await expect(page.getByTestId('new-table-seat-west')).toContainText('Open seat');
    await expect(receiver.getByTestId('friends-invitation-count')).toHaveCount(0);
    await openFriends('south');
    await friends.getByRole('button', { name: `Invite ${friendPlayer.name}`, exact: true }).click();
    await expect(sheet).toBeHidden();
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
            status: 422,
            json: { error, error_code: error, error_params: {} },
          });
        },
        { times: 1 }
      );
      await inbox.getByRole('button', { name: 'Sit down', exact: true }).click();
      await expect(inbox.getByText('That seat is gone', { exact: true })).toBeVisible();
      await expect(inbox.getByRole('button', { name: 'Sit down', exact: true })).toHaveCount(0);
      // The badge follows the refetched server list, not this mocked refusal.
      await expect(receiver.getByTestId('friends-invitation-count')).toHaveText('1');
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
    await openFriends('east');
    await expect(
      friends.getByRole('button', { name: `Invite ${friendPlayer.name}`, exact: true })
    ).toBeDisabled();
  } finally {
    await receiverContext.close();
  }
});

test('Play on a friend prefills Partner; requirements and a server password survive opening and rejoining', async ({
  page,
  player,
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
  await startSignedIn(page, host);
  await page.goto(`/new-table?partner=${friend.user.id}`);
  const partner = page.getByTestId('new-table-seat-south');
  await expect(partner).toContainText(friendPlayer.name);
  await expect(partner).toContainText('Invited when you open the table');
  const picker = page.getByTestId('seat-picker-container');
  await page.getByTestId('new-table-seat-east').click();
  await picker.getByRole('radio', { name: /^100\+ games played,/ }).click();
  await page.getByTestId('new-table-seat-west').click();
  await picker.getByRole('radio', { name: /^With password,/ }).click();
  await expect(page.getByTestId('new-table-seat-west')).toContainText('Password');
  const created = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/v1/rooms'
  );
  await page.getByRole('button', { name: 'Open the table', exact: true }).click();
  const response = await created;
  expect(response.request().postDataJSON().seats).toEqual({
    seat_2: { type: 'open', min_games: 100 },
    seat_3: { type: 'held', user_id: friend.user.id },
    seat_4: { type: 'open', min_games: 0, password: true },
  });
  const password = (await response.json()).data.room.seat_password;
  expect(password).toMatch(/^\d{4}$/);
  await expect(page.getByTestId('waiting-table')).toBeVisible();
  await expect(page.getByTestId('waiting-rule-set')).toHaveText('Listed in Tables · Finnish');
  await expect(page.getByTestId('new-table-seat-west')).toContainText(
    `Waiting… · password ${password}`
  );
  await page.reload();
  await expect(page.getByTestId('new-table-seat-west')).toContainText(
    `Waiting… · password ${password}`
  );
});
