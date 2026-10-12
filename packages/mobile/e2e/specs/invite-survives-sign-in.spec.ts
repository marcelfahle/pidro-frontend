import { test, expect } from '../fixtures';
import { LoginScreen } from '../screens/login-screen';
import { WelcomeWindow } from '../screens/welcome-window';
import { inviteToTable, register } from '../support/api';
import { newPlayer } from '../support/player';

test('an invite survives sign in and ends at that table', async ({ page, player }) => {
  await register(player);
  const { code, room } = await inviteToTable(newPlayer());
  await page.goto(`/join/${code}`);
  const welcome = new WelcomeWindow(page);
  await expect(welcome.root.getByText('saved you a seat')).toBeVisible({ timeout: 30_000 });

  await welcome.root.getByRole('link', { name: 'Sign in' }).click();
  await new LoginScreen(page).signIn(player.email, player.password);
  await page.waitForURL(`**/game/${room}`);
  await expect(page.getByTestId('waiting-table')).toBeVisible();
});
