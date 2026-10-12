import { test, expect } from '../fixtures';
import { AuthSheet } from '../screens/auth-sheet';
import { ProfileScreen } from '../screens/profile-screen';
import { guest } from '../support/api';
import { startSignedIn } from '../support/session';

test('a guest who signs out is offered saving first', async ({ page, player }) => {
  await startSignedIn(page, await guest(player));
  await page.goto('/profile');
  const profile = new ProfileScreen(page);
  await profile.askToSignOut();
  await expect(profile.savePrompt).toBeVisible();

  await profile.saveAccount.click();
  await expect(new AuthSheet(page).root).toBeVisible();
});
