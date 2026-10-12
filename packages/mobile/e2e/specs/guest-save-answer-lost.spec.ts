import { test, expect } from '../fixtures';
import { AuthSheet } from '../screens/auth-sheet';
import { ProfileScreen } from '../screens/profile-screen';
import { guest, whoAmI } from '../support/api';
import { sessionOf, startSignedIn } from '../support/session';

test('when the server saved but the answer was lost, the guest is recovered as the same player', async ({
  page,
  player,
}) => {
  const started = await guest(player);
  await startSignedIn(page, started);
  // The request reaches the server; the answer never reaches the app.
  let attempts = 0;
  await page.route('**/api/v1/auth/upgrade', async (route) => {
    attempts += 1;
    await route.fetch();
    await route.abort('connectionreset');
  });

  await page.goto('/profile');
  await new ProfileScreen(page).saveYourProgress();
  const sheet = new AuthSheet(page);
  await expect(sheet.root).toBeVisible();
  await sheet.settle();
  await sheet.save(player.email, player.password, player.name);

  await expect(sheet.root).toBeHidden();
  expect(attempts).toBe(1);
  const session = await sessionOf(page);
  expect(session?.user).toMatchObject({ id: started.user.id, guest: false, email: player.email });
  expect(await whoAmI(session?.accessToken as string)).toMatchObject({
    id: started.user.id,
    guest: false,
  });
});
