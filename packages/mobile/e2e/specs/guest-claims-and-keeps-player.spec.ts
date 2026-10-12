import { test, expect } from '../fixtures';
import { ClaimClassicScreen } from '../screens/claim-classic-screen';
import { HomeScreen } from '../screens/home-screen';
import { ProfileScreen } from '../screens/profile-screen';
import { guest, profile, whoAmI } from '../support/api';
import { sessionOf, startSignedIn } from '../support/session';

// A guest who claims by password stays a guest until PID-176 asks for an email and password.
test('a guest claims their Classic account and keeps their player @gap', async ({
  page,
  player,
}) => {
  const started = await guest(player);
  await startSignedIn(page, started);
  await page.goto('/home');
  await new HomeScreen(page).classicPlaque.click();

  const claim = new ClaimClassicScreen(page);
  await claim.verify(player.classicLogin, player.classicPassword);
  await expect(claim.found).toBeVisible();
  await expect(claim.text('Create your Pidro account')).toBeHidden();

  await claim.button('Claim this Classic account').click();
  await page.waitForURL(/\/profile/);
  await expect(new ProfileScreen(page).classicSection).toBeVisible();
  const session = await sessionOf(page);
  expect(session?.user?.id).toBe(started.user.id);
  const token = session?.accessToken as string;
  expect(await whoAmI(token)).toMatchObject({ id: started.user.id, guest: true });
  expect((await profile(token)).classic).toMatchObject({ name: player.classicLogin });

  // One Classic account per player: a second one is refused.
  await page.goto('/claim-classic');
  await claim.verify(`${player.classicLogin}b`, player.classicPassword);
  await expect(claim.found).toBeVisible();
  await claim.button('Claim this Classic account').click();
  await expect(claim.alert).toBeVisible();
  await expect(claim.alert).toContainText('already has a different Classic profile');
});
