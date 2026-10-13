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
  const note = create.text(/If we know you, you’re signed in/);
  await expect(note).toBeVisible();
  await create.createAccount({ ...player, name: `Other${player.id}` });
  await expect(create.text('That email already has a Pidro account.')).toBeVisible();
  // The note would contradict the message, so it is hidden while the message shows.
  await expect(note).toBeHidden();

  await create.signInInstead.click();
  const login = new LoginScreen(page);
  await expect(login.root).toBeVisible();
  await expect(
    login.text('That email already has a Pidro account. Sign in to carry on.')
  ).toBeVisible();
  await expect(login.identifier).toHaveValue(player.email);
});
