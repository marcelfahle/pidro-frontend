import { test, expect } from '../fixtures';
import { AuthSheet } from '../screens/auth-sheet';
import { ProfileScreen } from '../screens/profile-screen';
import { guest, whoAmI } from '../support/api';
import { sessionOf, startSignedIn } from '../support/session';

test('a guest saves their player from the profile', async ({ page, player }) => {
  const started = await guest(player);
  await startSignedIn(page, started);
  await page.goto('/profile');
  const profile = new ProfileScreen(page);
  await profile.saveYourProgress();
  const sheet = new AuthSheet(page);
  await expect(sheet.root).toBeVisible();
  await sheet.save(player.email, player.password, player.name);

  await expect(sheet.root).toBeHidden();
  await expect(profile.root.getByText(player.email)).toBeVisible();
  await expect(profile.button('Save your progress')).toHaveCount(0);
  const saved = await sessionOf(page);
  expect(saved?.user).toMatchObject({ id: started.user.id, guest: false });
  expect(await whoAmI(saved?.accessToken as string)).toMatchObject({
    id: started.user.id,
    guest: false,
    email: player.email,
  });
});
