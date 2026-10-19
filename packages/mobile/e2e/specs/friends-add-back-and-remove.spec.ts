import { test, expect } from '../fixtures';
import { AuthSheet } from '../screens/auth-sheet';
import { api, guest, register } from '../support/api';
import { AGE_ANSWERED, newPlayer } from '../support/player';
import { sessionOf, startSignedIn } from '../support/session';

test.use({ unavailableExpected: true });

test('Friends receives a live request, accepts, removes after confirmation, and searches @responsive', async ({
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
  const accept = page.getByRole('button', { name: `Accept ${otherPlayer.name}`, exact: true });
  await accept.waitFor();
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
  await accept.click();
  await expect.poll(() => changes).toBe(2);
  await expect.poll(() => Boolean(releaseAdd)).toBe(true);
  releaseAdd!();
  await expect(accept).toHaveCount(0);
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
  await accept.click();
  await expect(accept).toHaveCount(0);
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
  await accept.waitFor();
  await api(`/api/v1/friends/${account.user.id}`, { method: 'DELETE', token: other.token });
  await expect(page.getByText('Nobody here yet. Add the people you play with.')).toBeVisible();

  const add = page.getByRole('button', { name: 'Add a friend', exact: true });
  await expect(add).toHaveText('Add');
  await add.click();
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

test('ignoring hides a request immediately, Undo restores it, and only sender cancellation removes the edge @responsive', async ({
  page,
  player,
  browser,
}) => {
  const receiver = await register(player);
  const senderPlayer = newPlayer();
  const sender = await register(senderPlayer);
  expect(
    (await api(`/api/v1/friends/${receiver.user.id}`, { method: 'PUT', token: sender.token }))
      .status
  ).toBe(200);
  await startSignedIn(page, receiver);
  await page.goto('/friends');
  const accept = page.getByRole('button', { name: `Accept ${senderPlayer.name}`, exact: true });
  const ignore = page.getByRole('button', {
    name: `Ignore ${senderPlayer.name}'s request`,
    exact: true,
  });
  await expect(accept).toBeVisible();

  // Hold the real response: the row must disappear before the server replies.
  let releaseIgnore!: () => void;
  const released = new Promise<void>((resolve) => {
    releaseIgnore = resolve;
  });
  await page.route(
    `**/api/v1/friends/${sender.user.id}/ignore`,
    async (route) => {
      const response = await route.fetch();
      await released;
      await route.fulfill({ response });
    },
    { times: 1 }
  );
  const ignored = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/friends/${sender.user.id}/ignore`) &&
      response.request().method() === 'POST'
  );
  try {
    await ignore.click();
    await expect(accept).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: `View ${senderPlayer.name}'s profile`, exact: true })
    ).toHaveCount(0);
  } finally {
    releaseIgnore();
  }
  expect((await ignored).status()).toBe(200);
  expect((await api('/api/v1/friends', { token: receiver.token })).payload.data.added_you).toEqual(
    []
  );
  expect(
    (await api('/api/v1/friends', { token: sender.token })).payload.data.requested.map(
      (entry: { user_id: string }) => entry.user_id
    )
  ).toEqual([receiver.user.id]);

  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(accept).toBeVisible();
  await expect
    .poll(async () =>
      (await api('/api/v1/friends', { token: receiver.token })).payload.data.added_you.map(
        (entry: { user_id: string }) => entry.user_id
      )
    )
    .toEqual([sender.user.id]);
  await page.reload();
  await expect(accept).toBeVisible();
  await ignore.click();
  await expect(accept).toHaveCount(0);
  await expect
    .poll(
      async () => (await api('/api/v1/friends', { token: receiver.token })).payload.data.added_you
    )
    .toEqual([]);

  const context = await browser.newContext({
    viewport: page.viewportSize()!,
    baseURL: test.info().project.use.baseURL,
  });
  try {
    const sentPage = await context.newPage();
    await sentPage.addInitScript(
      (age) => localStorage.setItem('age-gate-storage', age),
      AGE_ANSWERED
    );
    await startSignedIn(sentPage, sender);
    await sentPage.goto('/friends');
    await expect(sentPage.getByText('Waiting for an answer', { exact: true })).toBeVisible();
    const cancel = sentPage.getByRole('button', {
      name: `Cancel your friend request to ${player.name}`,
      exact: true,
    });
    await expect(cancel).toBeVisible();
    expect(
      (await api('/api/v1/friends', { token: sender.token })).payload.data.requested.map(
        (entry: { user_id: string }) => entry.user_id
      )
    ).toEqual([receiver.user.id]);
    await cancel.click();
    await expect(cancel).toHaveCount(0);
    await expect
      .poll(
        async () => (await api('/api/v1/friends', { token: sender.token })).payload.data.requested
      )
      .toEqual([]);
    await sentPage.reload();
    await expect(
      sentPage.getByText('Nobody here yet. Add the people you play with.')
    ).toBeVisible();
  } finally {
    await context.close();
  }
});

test('Join seats the player at a real friend table and opens its game', async ({
  page,
  player,
  browser,
}) => {
  const account = await register(player);
  const hostPlayer = newPlayer();
  const host = await register(hostPlayer);
  for (const [caller, target] of [
    [account, host],
    [host, account],
  ]) {
    expect(
      (await api(`/api/v1/friends/${target.user.id}`, { method: 'PUT', token: caller.token }))
        .status
    ).toBe(200);
  }
  const created = await api('/api/v1/rooms', {
    method: 'POST',
    token: host.token,
    body: { seats: { seat_2: 'open', seat_3: 'open', seat_4: 'ai' } },
  });
  expect(created.status).toBe(201);
  const code = created.payload.data.code;
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  try {
    // Waiting tables need a connected host to advertise their live presence.
    const hostPage = await context.newPage();
    await hostPage.addInitScript(
      (age) => localStorage.setItem('age-gate-storage', age),
      AGE_ANSWERED
    );
    await startSignedIn(hostPage, host);
    await hostPage.goto(`/game/${code}`);
    await expect(hostPage.getByTestId('waiting-table').last()).toBeVisible({ timeout: 30_000 });
    await startSignedIn(page, account);
    await page.goto('/friends');
    const join = page.getByRole('button', { name: `Join ${hostPlayer.name}'s table`, exact: true });
    await join.waitFor();
    // A stale seat offer must explain the refusal and fetch a fresh list.
    await page.route(`**/api/v1/friends/${host.user.id}/join`, (route) =>
      route.fulfill({
        status: 409,
        json: { error_code: 'no_seat_for_you', error: 'NO_SEAT_FOR_YOU' },
      })
    );
    const refreshed = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/v1/friends' &&
        response.request().method() === 'GET'
    );
    await join.click();
    await expect(
      page.getByText('There is no seat available for you at this table.', { exact: true })
    ).toBeVisible();
    expect((await refreshed).status()).toBe(200);
    await page.unroute(`**/api/v1/friends/${host.user.id}/join`);
    await expect(join).toBeEnabled();
    const joined = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/v1/friends/${host.user.id}/join`) &&
        response.request().method() === 'POST'
    );
    await page
      .getByRole('button', { name: `Join ${hostPlayer.name}'s table`, exact: true })
      .click();
    const response = await joined;
    expect(response.status()).toBe(200);
    expect((await response.json()).data).toMatchObject({
      room: { code },
      assigned_position: 'south',
    });
    await page.waitForURL(`**/game/${code}`);
    await expect(page.getByTestId('waiting-table').last()).toBeVisible({ timeout: 30_000 });
    const room = await api(`/api/v1/rooms/${code}`, { token: account.token });
    expect(room.status).toBe(200);
    expect(room.payload.data.room.positions.south).toBe(account.user.id);
  } finally {
    await context.close();
  }
});

test('Play opens New table with the friend already assigned as Partner and creates a held south seat', async ({
  page,
  player,
  browser,
}) => {
  const account = await register(player);
  const friendPlayer = newPlayer();
  const friend = await register(friendPlayer);
  for (const [caller, target] of [
    [account, friend],
    [friend, account],
  ]) {
    expect(
      (await api(`/api/v1/friends/${target.user.id}`, { method: 'PUT', token: caller.token }))
        .status
    ).toBe(200);
  }
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  try {
    const friendPage = await context.newPage();
    await friendPage.addInitScript(
      (age) => localStorage.setItem('age-gate-storage', age),
      AGE_ANSWERED
    );
    await startSignedIn(friendPage, friend);
    await friendPage.goto('/friends');
    await expect
      .poll(
        async () =>
          (await api('/api/v1/friends', { token: account.token })).payload.data.friends[0]?.presence
      )
      .toBe('online');
    await startSignedIn(page, account);
    await page.goto('/friends');
    await page
      .getByRole('button', { name: `Start a table with ${friendPlayer.name}`, exact: true })
      .click();
    await page.waitForURL('**/lobby');
    const form = page.getByTestId('create-room-window');
    await expect(form).toBeVisible();
    const partner = form.getByTestId('create-seat_3');
    await expect(partner.getByText(friendPlayer.name, { exact: true })).toBeVisible();
    await expect(partner.getByText('Invited', { exact: true })).toBeVisible();
    await expect(
      partner
        .getByRole('radiogroup', { name: 'Partner seat', exact: true })
        .getByRole('radio', { name: 'Friend', exact: true })
    ).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('friend-seat-sheet')).toBeHidden();
    const created = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/v1/rooms' &&
        response.request().method() === 'POST'
    );
    await form.getByRole('button', { name: 'Open the table', exact: true }).click();
    const response = await created;
    expect(response.request().postDataJSON().seats.seat_3).toEqual({
      type: 'held',
      user_id: friend.user.id,
    });
    expect(response.status()).toBe(201);
    await page.waitForURL(/\/game\/[A-Z0-9]+$/);
    const code = new URL(page.url()).pathname.split('/').pop();
    const room = await api(`/api/v1/rooms/${code}`, { token: account.token });
    expect(room.status).toBe(200);
    expect(room.payload.data.room.positions.south).toBeNull();
    expect(room.payload.data.room.seats.south.held_for.user_id).toBe(friend.user.id);
  } finally {
    await context.close();
  }
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
