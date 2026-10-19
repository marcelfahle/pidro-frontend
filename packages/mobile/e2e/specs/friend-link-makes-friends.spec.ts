import { test, expect } from '../fixtures';
import { HomeScreen } from '../screens/home-screen';
import { RegisterScreen } from '../screens/register-screen';
import { WelcomeWindow } from '../screens/welcome-window';
import { api, register } from '../support/api';
import { newPlayer } from '../support/player';

test("PID-247: signing up through someone's link makes the two of them friends", async ({
  page,
  player,
}) => {
  const bertilPlayer = newPlayer();
  const bertil = (await register(bertilPlayer)) as Awaited<ReturnType<typeof register>> & {
    user: { share_slug: string };
  };
  expect(bertil.user.share_slug).toBeTruthy();

  // As the deferred answer leaves it on first open: Bertil's link, held until an account.
  await page.addInitScript(
    (pendingFriendLink) =>
      localStorage.setItem(
        'pending-friend-link-storage',
        JSON.stringify({ state: { pendingFriendLink }, version: 0 })
      ),
    { slug: bertil.user.share_slug, displayName: bertilPlayer.name, receivedAt: Date.now() }
  );
  await page.goto('/');
  await new WelcomeWindow(page).playOnline.click({ timeout: 30_000 });
  const registered = page.waitForResponse(
    (response) => new URL(response.url()).pathname === '/api/v1/auth/register'
  );
  await new RegisterScreen(page).createAccount(player);
  const response = await registered;
  expect(response.status()).toBe(201);
  expect(response.request().postDataJSON()).toMatchObject({
    friend_slug: bertil.user.share_slug,
  });
  const { data } = await response.json();
  expect(data.linked_friend).toMatchObject({ user_id: bertil.user.id });

  await expect(new HomeScreen(page).root).toBeVisible();
  await expect(page.getByTestId('friend-notice')).toContainText(
    `You and ${bertilPlayer.name} are friends now.`
  );

  const friendsOf = async (token: string) =>
    (await api('/api/v1/friends', { token })).payload.data.friends.map(
      (friend: { user_id: string }) => friend.user_id
    );
  expect(await friendsOf(data.token)).toEqual([bertil.user.id]);
  expect(await friendsOf(bertil.token)).toEqual([data.user.id]);

  // The link has done its work: it is not sent again.
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('pending-friend-link-storage') ?? 'null')?.state
            ?.pendingFriendLink ?? null
      )
    )
    .toBeNull();
});
