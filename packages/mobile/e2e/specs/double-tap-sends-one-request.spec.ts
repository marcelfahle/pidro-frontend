import { test, expect } from '../fixtures';
import { ForgotPasswordScreen } from '../screens/forgot-password-screen';
import { HomeScreen } from '../screens/home-screen';
import { LoginScreen } from '../screens/login-screen';
import { RegisterScreen } from '../screens/register-screen';
import { register } from '../support/api';

test('a double tap on a form sends one request', async ({ page, player }) => {
  await register(player);
  const sent: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (request.method() === 'POST' && url.pathname.startsWith('/api/v1/auth/'))
      sent.push(url.pathname);
  });

  await page.goto('/forgot-password');
  const forgot = new ForgotPasswordScreen(page);
  await forgot.identifier.fill(player.email);
  await forgot.button('Email me a link').dblclick();
  await expect(forgot.text('Check your email')).toBeVisible();
  expect(sent).toEqual(['/api/v1/auth/password-reset']);

  sent.length = 0;
  await page.goto('/register');
  const create = new RegisterScreen(page);
  await create.enterEmail(`new_${player.email}`);
  await create.enterPassword(player.password);
  await create.field('Public name').fill(`New${player.id}`);
  await create.button('CONTINUE').dblclick();
  await expect(new HomeScreen(page).root).toBeVisible();
  expect(sent).toEqual(['/api/v1/auth/register']);

  sent.length = 0;
  await page.evaluate(() => localStorage.removeItem('auth-storage'));
  await page.goto('/login');
  const signIn = new LoginScreen(page);
  await signIn.identifier.fill(player.email);
  await signIn.field('Password').fill(player.password);
  await signIn.button('Sign in').dblclick();
  await expect(new HomeScreen(page).root).toBeVisible();
  expect(sent).toEqual(['/api/v1/auth/login']);
});
