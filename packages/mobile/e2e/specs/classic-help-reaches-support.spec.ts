import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { supportMailAbout } from '../support/mailbox';
import { ClaimClassicScreen } from '../screens/claim-classic-screen';
import { ClassicForgotScreen } from '../screens/classic-forgot-screen';
import { ClassicHelpScreen } from '../screens/classic-help-screen';

async function openHelp(page: Page, login: string) {
  await page.goto('/claim-classic');
  const claim = new ClaimClassicScreen(page);
  await claim.button('Classic username & password').click();
  await claim.field('Classic username or email').fill(login);
  await claim.text('Forgot your Classic password?').click();
  const forgot = new ClassicForgotScreen(page);
  await forgot.getHelp.click();
  const help = new ClassicHelpScreen(page);
  await expect(help.root).toBeVisible();
  await expect(help.name).toHaveValue(login);
  return help;
}

test('a Classic player who cannot sign in asks for help and support receives it', async ({
  page,
  player,
}) => {
  const help = await openHelp(page, player.classicLogin);
  await help.email.fill(player.email);
  await help.button('Send to support').click();
  await expect(help.text('Message sent')).toBeVisible();

  const mail = await supportMailAbout(player.classicLogin);
  expect(JSON.stringify(mail.reply_to)).toContain(player.email);
  expect(mail.text_body).toContain(player.classicLogin);
});

test.describe('support unavailable', () => {
  test.use({ unavailableExpected: true });

  test('when support cannot be reached the player gets a mail draft instead', async ({
    page,
    player,
  }) => {
    await page.route('**/api/v1/classic/help', (route) => route.fulfill({ status: 503 }));
    const help = await openHelp(page, player.classicLogin);
    await help.email.fill(player.email);
    await help.button('Send to support').click();
    await expect(help.text('Almost there')).toBeVisible();
  });
});
