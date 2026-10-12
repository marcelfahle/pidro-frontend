import { test, expect } from '../fixtures';
import { ClaimClassicScreen } from '../screens/claim-classic-screen';
import { claimClassic } from '../support/api';
import { sessionOf } from '../support/session';

test('a Classic account someone already claimed is said so at the preview, with a way to sign in to it', async ({
  page,
  player,
}) => {
  await claimClassic(player);
  const claim = new ClaimClassicScreen(page);
  await page.goto('/claim-classic');
  await claim.verify(player.classicLogin, player.classicPassword);
  await expect(claim.found).toBeVisible();
  await expect(
    claim.text('This Classic account is already linked to a Pidro account.')
  ).toBeVisible();
  await expect(claim.button('Sign in to that account')).toBeVisible();
  await expect(claim.field('Username')).toHaveCount(0);
  expect((await sessionOf(page))?.user ?? null).toBeNull();
});
