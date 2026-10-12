import { test, expect } from '../fixtures';
import { AgeScreen } from '../screens/age-screen';
import { AgeStopScreen } from '../screens/age-stop-screen';

test.use({ ageAnswered: false });

test('a player under 13 is stopped, and stays stopped after a reload', async ({ page }) => {
  await page.goto('/');
  const age = new AgeScreen(page);
  await expect(age.root).toBeVisible({ timeout: 30_000 });
  await age.choose('Under 13');
  await age.continueButton.click();
  await expect(new AgeStopScreen(page).root).toBeVisible();

  await page.reload();
  await expect(new AgeStopScreen(page).root).toBeVisible();
});
