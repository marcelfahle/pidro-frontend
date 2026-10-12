import { test, expect } from '../fixtures';
import { AgeScreen } from '../screens/age-screen';
import { WelcomeWindow } from '../screens/welcome-window';

test.use({ ageAnswered: false });

test('a first launch asks the age, welcomes an adult, and does not ask again', async ({ page }) => {
  const age = new AgeScreen(page);
  await page.goto('/');
  await expect(age.root).toBeVisible({ timeout: 30_000 });

  await expect(age.chosen).toHaveCount(0);
  await expect(age.continueButton).toBeDisabled();

  await age.choose('18 or older');
  await age.continueButton.click();
  await expect(new WelcomeWindow(page).root).toBeVisible();

  await page.reload();
  await expect(new WelcomeWindow(page).root).toBeVisible();
});
