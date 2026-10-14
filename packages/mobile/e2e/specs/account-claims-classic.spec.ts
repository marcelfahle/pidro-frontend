import { test, expect } from '../fixtures';
import { ClaimClassicScreen } from '../screens/claim-classic-screen';
import { ProfileScreen } from '../screens/profile-screen';
import { profile, register, whoAmI } from '../support/api';
import { sessionOf, startSignedIn } from '../support/session';

test('a saved account claims its Classic account and keeps its player', async ({
  page,
  player,
}) => {
  const account = await register(player);
  await startSignedIn(page, account);
  await page.goto('/profile');
  await new ProfileScreen(page).button('Claim Pidro Classic').click();

  const claim = new ClaimClassicScreen(page);
  await claim.verify(player.classicLogin, player.classicPassword);
  await expect(claim.found).toBeVisible();
  // Signed in already, so no new account is asked for.
  await expect(claim.text('Create your Pidro account')).toBeHidden();
  await claim.button('Claim this Classic account').click();

  await page.waitForURL(/\/profile/);
  await expect(new ProfileScreen(page).classicChip).toBeVisible();
  const session = await sessionOf(page);
  expect(session?.user).toMatchObject({ id: account.user.id, guest: false, email: player.email });
  const token = session?.accessToken as string;
  expect(await whoAmI(token)).toMatchObject({ id: account.user.id, guest: false });
  expect((await profile(token)).classic).toMatchObject({ name: player.classicLogin });
});
