import { test, expect } from '../fixtures';
import { ClaimClassicScreen } from '../screens/claim-classic-screen';
import { ProfileScreen } from '../screens/profile-screen';
import { WelcomeWindow } from '../screens/welcome-window';
import { profile, whoAmI } from '../support/api';
import { sessionOf } from '../support/session';

test('a Classic player claims their account from the first launch @responsive', async ({
  page,
  player,
}) => {
  await page.goto('/');
  await new WelcomeWindow(page).classicPlaque.click({ timeout: 30_000 });
  const claim = new ClaimClassicScreen(page);
  await expect(claim.root).toBeVisible();

  await claim.verify(player.classicLogin, player.classicPassword);
  await expect(claim.found).toBeVisible();

  // Confirming without account details is caught before sending.
  await claim.button('Create account and claim').click();
  await expect(claim.text('Use at least 3 characters.')).toBeVisible();

  await claim.createAccountAndClaim({
    username: player.name,
    email: player.email,
    password: player.password,
  });
  await page.waitForURL(/\/profile/);
  await expect(new ProfileScreen(page).classicSection).toBeVisible();

  const session = await sessionOf(page);
  expect(session?.user).toMatchObject({ guest: false, email: player.email });
  const token = session?.accessToken as string;
  expect(await whoAmI(token)).toMatchObject({ guest: false, email: player.email });
  expect((await profile(token)).classic).toMatchObject({ name: player.classicLogin, level: 42 });
});
