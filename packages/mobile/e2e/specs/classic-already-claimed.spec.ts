import { test, expect } from '../fixtures';
import { ClaimClassicScreen } from '../screens/claim-classic-screen';
import { claimClassic } from '../support/api';
import { sessionOf } from '../support/session';

test('a Classic account someone already claimed is refused, with a way to sign in to it', async ({
  page,
  player,
}) => {
  await claimClassic(player);
  const claim = new ClaimClassicScreen(page);
  await page.goto('/claim-classic');
  await claim.verify(player.classicLogin, player.classicPassword);
  await expect(claim.found).toBeVisible();

  await claim.createAccountAndClaim({
    username: `Thief${player.id}`,
    email: `thief_${player.email}`,
    password: player.password,
  });
  await expect(claim.alert).toBeVisible();
  await expect(claim.alert).toContainText('belongs to another account');
  await expect(claim.button('Sign in to that account')).toBeVisible();
  expect((await sessionOf(page))?.user ?? null).toBeNull();
});
