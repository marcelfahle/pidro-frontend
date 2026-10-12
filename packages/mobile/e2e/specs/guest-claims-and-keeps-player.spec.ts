import { test, expect } from '../fixtures';
import { ClaimClassicScreen } from '../screens/claim-classic-screen';
import { AuthSheet } from '../screens/auth-sheet';
import { HomeScreen } from '../screens/home-screen';
import { ProfileScreen } from '../screens/profile-screen';
import { guest, profile, whoAmI } from '../support/api';
import { sessionOf, startSignedIn } from '../support/session';

test('a guest claims their Classic account with an email and password and keeps their player', async ({
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
  await expect(claim.field('Username')).toBeHidden();

  await claim.button('Claim this Classic account').click();
  await expect(claim.text('Enter an email address.')).toBeVisible();
  await claim.field('Email').fill(player.email);
  await claim.field('New Pidro password').fill('short');
  await claim.button('Claim this Classic account').click();
  await expect(claim.text('Use 8 characters or more.')).toBeVisible();

  await claim.field('New Pidro password').fill(player.password);
  await claim.button('Claim this Classic account').click();
  await page.waitForURL(/\/profile/);
  await expect(new ProfileScreen(page).classicSection).toBeVisible();
  const session = await sessionOf(page);
  expect(session?.user?.id).toBe(started.user.id);
  expect(session?.user?.guest).toBeFalsy();
  await expect(new AuthSheet(page).root).toBeHidden();
  const token = session?.accessToken as string;
  expect(await whoAmI(token)).toMatchObject({
    id: started.user.id,
    guest: false,
    email: player.email,
  });
  expect((await profile(token)).classic).toMatchObject({ name: player.classicLogin });

  // One Classic account per player: a second one is refused.
  // The guest session is seeded on every load; seed the claimed one after it.
  await startSignedIn(page, { token, user: session?.user as object });
  await page.goto('/claim-classic');
  await claim.verify(`${player.classicLogin}b`, player.classicPassword);
  await expect(claim.found).toBeVisible();
  await claim.button('Claim this Classic account').click();
  await expect(claim.alert).toBeVisible();
  await expect(claim.alert).toContainText('already has a different Classic profile');
});
