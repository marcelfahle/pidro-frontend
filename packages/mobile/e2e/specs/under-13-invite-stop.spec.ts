import { test, expect } from '../fixtures';
import { AgeScreen } from '../screens/age-screen';
import { AgeStopScreen } from '../screens/age-stop-screen';
import { inviteToTable } from '../support/api';
import { newPlayer } from '../support/player';

test.use({ ageAnswered: false });

test('an invite link on a device that answered Under 13 still stops', async ({ page }) => {
  const { code } = await inviteToTable(newPlayer());
  await page.goto('/');
  const age = new AgeScreen(page);
  await expect(age.root).toBeVisible({ timeout: 30_000 });
  await age.choose('Under 13');
  await age.continueButton.click();
  await expect(new AgeStopScreen(page).root).toBeVisible();

  await page.goto(`/join/${code}`);
  await expect(new AgeStopScreen(page).root).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('join-invite-screen')).toHaveCount(0);
});
