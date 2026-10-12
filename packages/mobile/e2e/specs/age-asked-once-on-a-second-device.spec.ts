import { test, expect } from '../fixtures';
import { AgeScreen } from '../screens/age-screen';
import { HomeScreen } from '../screens/home-screen';
import { LoginScreen } from '../screens/login-screen';
import { WelcomeWindow } from '../screens/welcome-window';
import { register } from '../support/api';

// The account already answered on its first device; this browser is the second.
test.use({ ageAnswered: false });

test('signing in on a second device asks the age once there', async ({ page, player }) => {
  await register(player);
  await page.goto('/');
  const age = new AgeScreen(page);
  await expect(age.root).toBeVisible({ timeout: 30_000 });
  await age.choose('18 or older');
  await age.continueButton.click();
  await expect(new WelcomeWindow(page).root).toBeVisible();

  await page.goto('/login');
  await new LoginScreen(page).signIn(player.email, player.password);
  await expect(new HomeScreen(page).root).toBeVisible();

  await page.reload();
  await expect(new HomeScreen(page).root).toBeVisible();
  await expect(age.root).toHaveCount(0);
});
