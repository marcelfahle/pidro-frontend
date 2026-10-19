import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { API, api, register } from '../support/api';
import { AGE_ANSWERED, newPlayer } from '../support/player';
import { startSignedIn } from '../support/session';

// Observe the real lobby join; never inject a friends event or stub its refetch.
async function homeAfterLobbyJoin(page: Page, account: Awaited<ReturnType<typeof register>>) {
  let joined = false;
  await page.routeWebSocket('**/socket/websocket*', (socket) => {
    const server = socket.connectToServer();
    server.onMessage((message) => {
      const frame = JSON.parse(String(message));
      if (frame[2] === 'lobby' && frame[3] === 'phx_reply' && frame[4]?.status === 'ok')
        joined = true;
      socket.send(message);
    });
  });
  await startSignedIn(page, account);
  await Promise.all([
    page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/api/v1/friends' && response.ok()
    ),
    page.goto('/home'),
  ]);
  await expect(page.getByTestId('home-play-online')).toBeVisible();
  await expect(page).toHaveURL(/\/home$/);
  await expect.poll(() => joined).toBe(true);
}

test('PID-246: Home accepts a live friend request and the sender sees a four-second accepted notice', async ({
  page,
  player,
  browser,
}) => {
  const account = await register(player);
  const otherPlayer = newPlayer();
  const other = await register(otherPlayer);
  const otherContext = await browser.newContext({
    viewport: page.viewportSize()!,
    baseURL: test.info().project.use.baseURL,
  });
  try {
    const sender = await otherContext.newPage();
    await sender.addInitScript(
      ({ age, installId }) => {
        localStorage.setItem('age-gate-storage', age);
        localStorage.setItem('install-id:v1', installId);
      },
      { age: AGE_ANSWERED, installId: otherPlayer.installId }
    );
    // The manually created page does not inherit the fixture's error checks.
    const problems: string[] = [];
    sender.on('pageerror', (error) => problems.push(error.message));
    sender.on('response', (response) => {
      if (response.url().startsWith(API) && response.status() >= 500)
        problems.push(`${response.status()} ${response.url()}`);
    });
    await Promise.all([homeAfterLobbyJoin(page, account), homeAfterLobbyJoin(sender, other)]);
    const notice = page.getByTestId('friend-notice');
    const badge = page.getByTestId('friends-invitation-count');
    await expect(notice).toHaveCount(0);
    await expect(badge).toHaveCount(0);
    expect(
      (await api(`/api/v1/friends/${account.user.id}`, { method: 'PUT', token: other.token }))
        .status
    ).toBe(200);
    await expect(notice).toBeVisible({ timeout: 1_000 });
    await expect(notice).toContainText(`${otherPlayer.name} wants to be friends`);
    await expect(badge).toHaveText('1');

    // Freeze only B's timers before acceptance so the notice cannot expire while
    // A's mutation and the backend assertions are being checked.
    await sender.clock.install();
    await sender.clock.pauseAt(new Date(Date.now() + 1_000));
    await notice.getByRole('button', { name: 'Accept', exact: true }).click();
    await expect(notice).toHaveCount(0);
    await expect(badge).toHaveCount(0);
    await expect(page).toHaveURL(/\/home$/);
    const accepted = sender.getByTestId('friend-notice');
    await expect(accepted).toBeVisible();
    await expect(accepted).toContainText(`${player.name} accepted. You're friends now.`);
    const list = await api('/api/v1/friends', { token: other.token });
    expect(list.status).toBe(200);
    expect(list.payload.data.friends.map((friend: { user_id: string }) => friend.user_id)).toEqual([
      account.user.id,
    ]);
    await sender.clock.runFor(3_999);
    await expect(accepted).toBeVisible();
    await sender.clock.runFor(1);
    await expect(accepted).toHaveCount(0);
    expect(problems).toEqual([]);
  } finally {
    await otherContext.close();
  }
});

test('PID-246: Not now preserves the request badge; cancelling a live request removes its notice', async ({
  page,
  player,
}) => {
  const account = await register(player);
  const other = await register(newPlayer());
  await homeAfterLobbyJoin(page, account);
  const notice = page.getByTestId('friend-notice');
  const badge = page.getByTestId('friends-invitation-count');
  const requestPath = `/api/v1/friends/${account.user.id}`;
  expect((await api(requestPath, { method: 'PUT', token: other.token })).status).toBe(200);
  await expect(notice).toBeVisible({ timeout: 1_000 });
  await expect(badge).toHaveText('1');
  await notice.getByRole('button', { name: 'Not now', exact: true }).click();
  await expect(notice).toHaveCount(0);
  await expect(badge).toHaveText('1');
  const pending = await api('/api/v1/friends', { token: account.token });
  expect(pending.status).toBe(200);
  expect(pending.payload.data.added_you.map((entry: { user_id: string }) => entry.user_id)).toEqual(
    [other.user.id]
  );

  // A fresh request exercises cancellation while the notice is still visible,
  // rather than merely checking removal of an already-dismissed notice.
  expect((await api(requestPath, { method: 'DELETE', token: other.token })).status).toBe(200);
  await expect(badge).toHaveCount(0);
  const fresh = await register(newPlayer());
  await page.getByTestId('home-play-online').click();
  await expect(page).toHaveURL(/\/lobby$/);
  expect((await api(requestPath, { method: 'PUT', token: fresh.token })).status).toBe(200);
  await expect(notice).toHaveCount(0);
  await page.goBack();
  await expect(notice).toBeVisible({ timeout: 1_000 });
  await expect(badge).toHaveText('1');
  expect((await api(requestPath, { method: 'DELETE', token: fresh.token })).status).toBe(200);
  await expect(notice).toHaveCount(0);
  await expect(badge).toHaveCount(0);
  await expect(page).toHaveURL(/\/home$/);
});
