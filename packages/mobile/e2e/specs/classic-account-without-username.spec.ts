import { test, expect } from '../fixtures';
import { ClaimClassicScreen } from '../screens/claim-classic-screen';
import { ProfileScreen } from '../screens/profile-screen';
import { WelcomeWindow } from '../screens/welcome-window';
import { profile } from '../support/api';
import { sessionOf } from '../support/session';

test('a Classic account with no username claims by its email and shows the first name', async ({
  page,
  player,
}) => {
  await page.goto('/');
  await new WelcomeWindow(page).classicPlaque.click({ timeout: 30_000 });
  const claim = new ClaimClassicScreen(page);
  await claim.verify(`nameless-${player.id}@classic.example`, player.classicPassword);
  await expect(claim.found).toBeVisible();
  await expect(claim.text('Gertrude')).toBeVisible();

  await claim.createAccountAndClaim({
    username: player.name,
    email: player.email,
    password: player.password,
  });
  await page.waitForURL(/\/profile/);
  const screen = new ProfileScreen(page);
  await expect(await screen.openBadges()).toContainText(/as Gertrude/);
  const token = (await sessionOf(page))?.accessToken as string;
  expect((await profile(token)).classic).toMatchObject({ name: 'Gertrude' });
});
