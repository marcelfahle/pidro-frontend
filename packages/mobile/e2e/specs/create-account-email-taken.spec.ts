import { test, expect } from '../fixtures';
import { LoginScreen } from '../screens/login-screen';
import { RegisterScreen } from '../screens/register-screen';
import { register } from '../support/api';

test('creating an account with an email that has one points the player to sign in', async ({
  page,
  player,
}) => {
  await register(player);
  const create = new RegisterScreen(page);
  await page.goto('/register');
  await create.createAccount({ ...player, name: `Other${player.id}` });
  await expect(create.text('That email already has a Pidro account.')).toBeVisible();

  await create.signInInstead.click();
  const login = new LoginScreen(page);
  await expect(login.root).toBeVisible();
  await expect(
    login.text('That email already has a Pidro account. Sign in to carry on.')
  ).toBeVisible();
  await expect(login.identifier).toHaveValue(player.email);
});
