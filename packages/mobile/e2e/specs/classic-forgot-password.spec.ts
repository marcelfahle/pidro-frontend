import { test, expect } from '../fixtures';
import { ClaimClassicScreen } from '../screens/claim-classic-screen';
import { ClassicForgotScreen } from '../screens/classic-forgot-screen';
import { ClassicHelpScreen } from '../screens/classic-help-screen';

// Neither route has a server yet (PID-177, PID-178), so this asserts what a player sees today.
test('a Classic player who forgot their password is told links cannot be sent @gap', async ({
  page,
  player,
}) => {
  await page.goto('/claim-classic');
  const claim = new ClaimClassicScreen(page);
  await claim.button('Classic username & password').click();
  await claim.field('Classic username or email').fill(player.classicLogin);
  await claim.text('Forgot your Classic password?').click();

  const forgot = new ClassicForgotScreen(page);
  await expect(forgot.root).toBeVisible();
  await expect(forgot.login).toHaveValue(player.classicLogin);
  await forgot.button('Email me a link').click();
  await expect(forgot.alert).toContainText(/We can.t send sign-in links right now/);

  await forgot.getHelp.click();
  const help = new ClassicHelpScreen(page);
  await expect(help.root).toBeVisible();
  await expect(help.name).toHaveValue(player.classicLogin);

  await help.email.fill(player.email);
  await help.button('Send to support').click();
  // With no support route the app opens a mail draft instead.
  await expect(help.text('Almost there')).toBeVisible();
});
