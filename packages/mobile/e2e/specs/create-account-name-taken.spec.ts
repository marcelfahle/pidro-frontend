import { test, expect } from '../fixtures';
import { HomeScreen } from '../screens/home-screen';
import { RegisterScreen } from '../screens/register-screen';
import { register } from '../support/api';
import { newPlayer } from '../support/player';

test('a player whose name is taken picks another and gets their account', async ({
  page,
  player,
}) => {
  const holder = newPlayer();
  await register(holder);
  const create = new RegisterScreen(page);
  await page.goto('/register');
  await create.createAccount({ ...player, name: holder.name });
  await expect(create.text('That name is taken.')).toBeVisible();

  await create.enterName(`Second${player.id}`);
  await expect(new HomeScreen(page).root).toBeVisible();
});
