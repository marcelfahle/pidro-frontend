import { test, expect } from '../fixtures';
import { api, register } from '../support/api';
import { startSignedIn } from '../support/session';

test('a new table with a bot, an open seat and an invite opens with the invite sheet up', async ({
  page,
  player,
}) => {
  const session = await register(player);
  await startSignedIn(page, session);
  await page.goto('/lobby');
  await expect(page.getByTestId('lobby-screen')).toBeVisible({ timeout: 30_000 });

  await page.getByRole('button', { name: 'Start a table', exact: true }).first().click();
  const form = page.getByTestId('create-room-window');
  await expect(form.getByRole('textbox')).toHaveCount(0);

  const choose = async (seat: string, choice: string) => {
    const radio = form
      .getByRole('radiogroup', { name: seat, exact: true })
      .getByRole('radio', { name: choice, exact: true });
    await radio.click();
    await expect(radio).toHaveAttribute('aria-checked', 'true');
  };
  await choose('Left opponent seat', 'Bot');
  await choose('Right opponent seat', 'Friend');
  await expect(page.getByTestId('create-seat-sheet')).toHaveCount(0);

  await form.getByRole('button', { name: 'Open the table', exact: true }).click();
  await page.waitForURL(/\/game\/[A-Z0-9]+\?invite=true$/);
  await expect(page.getByTestId('invite-window')).toBeVisible();

  // The server seated the bot and kept the partner and invite seats open.
  const code = new URL(page.url()).pathname.split('/').pop();
  const { payload } = await api(`/api/v1/rooms/${code}`, { token: session.token });
  const room = payload.data.room;
  const bots = Object.values(room.positions as Record<string, string | null>).filter((id) =>
    id?.startsWith('bot_')
  );
  expect(bots).toHaveLength(1);
  expect(room.available_positions).toHaveLength(2);
});
