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

  // The login Classic offers is shown, not asked for; only a new password is typed.
  const offered = await claim.newAccount();
  if (offered?.username) {
    await expect(claim.kept('Username', offered.username)).toBeVisible();
    await expect(claim.field('Username')).toHaveCount(0);
  }
  if (offered?.email) {
    await expect(claim.kept('Email', offered.email)).toBeVisible();
    await expect(claim.field('Email')).toHaveCount(0);
  }

  // Confirming without account details is caught before sending.
  await claim.button('Create account and claim').click();
  await expect(
    claim.text(offered?.username ? 'Use 8 characters or more.' : 'Use at least 3 characters.')
  ).toBeVisible();

  const { email } = await claim.createAccountAndClaim({
    username: player.name,
    email: player.email,
    password: player.password,
  });
  await page.waitForURL(/\/profile/);
  await expect(new ProfileScreen(page).classicChip).toBeVisible();

  const session = await sessionOf(page);
  expect(session?.user).toMatchObject({ guest: false, email });
  const token = session?.accessToken as string;
  expect(await whoAmI(token)).toMatchObject({ guest: false, email });
  expect((await profile(token)).classic).toMatchObject({ name: player.classicLogin, level: 42 });
});
