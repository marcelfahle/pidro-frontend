import { test, expect } from '../fixtures';
import { WelcomeWindow } from '../screens/welcome-window';
import { inviteToTable, revokeInvite } from '../support/api';
import { newPlayer } from '../support/player';

test('a dead invite shows Play, not Join', async ({ page }) => {
  const { code, token } = await inviteToTable(newPlayer());
  await revokeInvite(token, code);

  await page.goto(`/join/${code}`);
  const welcome = new WelcomeWindow(page);
  await expect(welcome.quickGame).toBeVisible({ timeout: 30_000 });
  await expect(welcome.quickGame).toContainText('Quick game');
  await expect(welcome.root.getByText('saved you a seat')).toHaveCount(0);
  await expect(page.getByText('Join table')).toHaveCount(0);
});
