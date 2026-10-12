import { test, expect } from '../fixtures';
import { AgeScreen } from '../screens/age-screen';
import { HomeScreen } from '../screens/home-screen';
import { registerWithoutAge, whoAmI } from '../support/api';
import { startSignedIn } from '../support/session';

test.use({ ageAnswered: false });

test('an account from before the age gate is asked once, and the answer is kept on the server', async ({
  page,
  player,
}) => {
  const old = await registerWithoutAge(player);
  expect(await whoAmI(old.token)).toMatchObject({ age_band: 'unknown' });
  await startSignedIn(page, old);

  await page.goto('/');
  const age = new AgeScreen(page);
  await expect(age.root).toBeVisible({ timeout: 30_000 });
  await age.choose('18 or older');
  await age.continueButton.click();
  await expect(new HomeScreen(page).root).toBeVisible();
  expect(await whoAmI(old.token)).toMatchObject({ age_band: '18_plus' });

  await page.reload();
  await expect(new HomeScreen(page).root).toBeVisible();
  await expect(age.root).toHaveCount(0);
});
