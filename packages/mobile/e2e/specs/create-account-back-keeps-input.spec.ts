import { test, expect } from '../fixtures';
import { RegisterScreen } from '../screens/register-screen';

test('going back through the create-account steps keeps what was typed', async ({
  page,
  player,
}) => {
  const create = new RegisterScreen(page);
  await page.goto('/register');
  await create.enterEmail(player.email);
  await create.enterPassword(player.password);
  await create.field('Public name').fill(player.name);

  await create.goBack();
  await expect(create.field('Password')).toHaveValue(player.password);
  await create.goBack();
  await expect(create.field('Email')).toHaveValue(player.email);

  await create.button('Continue').click();
  await create.button('Create account').click();
  await expect(create.field('Public name')).toHaveValue(player.name);
});
