import { test, expect } from '../fixtures';
import { WelcomeWindow } from '../screens/welcome-window';
import { inviteToTable } from '../support/api';
import { newPlayer } from '../support/player';

test('an invite survives guest entry and ends at that table', async ({ page }) => {
  const { code, room } = await inviteToTable(newPlayer());
  await page.goto(`/join/${code}`);
  const welcome = new WelcomeWindow(page);
  await expect(welcome.root.getByText('saved you a seat')).toBeVisible({ timeout: 30_000 });
  await expect(welcome.root.getByText(`Table ${code}`)).toBeVisible();

  await welcome.quickGame.click();
  await page.waitForURL(`**/game/${room}`);
  await expect(page.getByTestId('waiting-table')).toBeVisible();
});
