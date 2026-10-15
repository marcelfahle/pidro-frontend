import { test, expect } from '../fixtures';
import { HomeScreen } from '../screens/home-screen';
import { ProfileScreen } from '../screens/profile-screen';
import { RegisterScreen } from '../screens/register-screen';
import { WelcomeWindow } from '../screens/welcome-window';
import { register as registerViaApi } from '../support/api';
import { tableCode } from '../support/game';
import { AGE_ANSWERED, newPlayer } from '../support/player';
import { sessionOf, startSignedIn } from '../support/session';

test('a new player creates an account, stays signed in, and signs out @responsive', async ({
  page,
  player,
}) => {
  const register = new RegisterScreen(page);
  await page.goto('/');
  await new WelcomeWindow(page).playOnline.click({ timeout: 30_000 });
  await expect(register.root).toBeVisible();

  // Bad input is caught before anything is sent.
  let sent = 0;
  page.on('request', (request) => {
    if (request.url().includes('/api/v1/auth/register')) sent += 1;
  });
  await register.enterEmail('not-an-email');
  await expect(register.text('Check that email address.')).toBeVisible();
  await register.enterEmail(player.email);
  await register.enterPassword('short');
  await expect(register.text('Use 8 characters or more.')).toBeVisible();

  await register.enterPassword(player.password);
  await register.enterName('  ');
  await expect(register.text('Enter the name other players will see.')).toBeVisible();
  expect(sent).toBe(0);
  await register.enterName(player.name);
  await expect(new HomeScreen(page).root).toBeVisible();
  await page.waitForURL(/\/home$/);

  await page.reload();
  await expect(new HomeScreen(page).root).toBeVisible();
  const session = await sessionOf(page);
  expect(session?.accessToken).toBeTruthy();
  expect(session?.user?.guest).toBeFalsy();

  await page.goto('/profile');
  const profile = new ProfileScreen(page);
  await expect(profile.root).toBeVisible();
  await profile.signOut();
  await page.waitForURL(/\/welcome$/);
});

test('a new account opens a Finnish table that another player can find with two open chairs @responsive', async ({
  page,
  player,
  browser,
}) => {
  await page.goto('/register');
  await new RegisterScreen(page).createAccount(player);
  await expect(new HomeScreen(page).root).toBeVisible();
  await page.goto('/lobby');
  await page.getByRole('button', { name: 'Start a table', exact: true }).first().click();
  const form = page.getByTestId('create-room-window');
  for (const [name, choice] of [
    ['Rules', 'Finnish'],
    ['Partner seat', 'Open'],
    ['Left opponent seat', 'Open'],
    ['Right opponent seat', 'Bot'],
  ]) {
    await expect(
      form
        .getByRole('radiogroup', { name, exact: true })
        .getByRole('radio', { name: choice, exact: true })
    ).toHaveAttribute('aria-checked', 'true');
  }
  const created = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/v1/rooms' && response.request().method() === 'POST'
  );
  await form.getByRole('button', { name: 'Open the table', exact: true }).click();
  const response = await created;
  expect(response.status()).toBe(201);
  expect(response.request().postDataJSON()).toEqual({
    rule_set: 'finnish',
    seats: { seat_2: 'open', seat_3: 'open', seat_4: 'ai' },
  });
  await page.waitForURL(/\/game\/[A-Z0-9]+$/);
  const code = tableCode(page);
  await expect(page.getByTestId('waiting-table').last()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('waiting-rule-set').last()).toContainText('Finnish');

  // A separate context has neither the host's auth nor its cached lobby data.
  // Keep the host connected so the server lists this waiting table.
  const context = await browser.newContext({ baseURL: new URL(page.url()).origin });
  try {
    const visitor = await context.newPage();
    await visitor.addInitScript(
      (age) => localStorage.setItem('age-gate-storage', age),
      AGE_ANSWERED
    );
    await startSignedIn(visitor, await registerViaApi(newPlayer()));
    await visitor.goto('/lobby');
    const table = visitor.getByTestId(`lobby-table-${code}`);
    await expect(table).toBeVisible({ timeout: 30_000 });
    await expect(table.getByTestId(`room-rules-${code}`)).toContainText('Finnish');
    await expect(table.getByText(player.name, { exact: true })).toBeVisible();
    const chairs = table.getByRole('button', { name: /^Join .* seat$/ });
    await expect(chairs).toHaveCount(2);
    await expect(chairs.nth(0)).toBeEnabled();
    await expect(chairs.nth(1)).toBeEnabled();
  } finally {
    await context.close();
  }
});
