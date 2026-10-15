import { test, expect } from '../fixtures';
import { JoinInviteScreen } from '../screens/join-invite-screen';
import { WelcomeWindow } from '../screens/welcome-window';
import { inviteToTable } from '../support/api';
import { newPlayer } from '../support/player';

test('an invite survives guest entry and ends at that table', async ({ page }) => {
  const host = newPlayer();
  const { code, room } = await inviteToTable(host);
  await page.goto(`/join/${code}`);
  const welcome = new WelcomeWindow(page);
  await expect(welcome.root.getByText(`${host.name} saved you a seat`)).toBeVisible({
    timeout: 30_000,
  });
  await expect(welcome.root.getByText(`Table ${code}`)).toHaveCount(0);

  await welcome.quickGame.click();
  await new JoinInviteScreen(page).joinTable();
  await page.waitForURL(`**/game/${room}`);
  await expect(page.getByTestId('waiting-table')).toBeVisible();
});
