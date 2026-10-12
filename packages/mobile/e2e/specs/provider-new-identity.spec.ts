import { test, expect } from '../fixtures';
import { HomeScreen } from '../screens/home-screen';
import { LoginScreen } from '../screens/login-screen';
import { ProfileScreen } from '../screens/profile-screen';
import { whoAmI } from '../support/api';
import { answerNextTap, identity, shapes } from '../support/identity';
import { sessionOf } from '../support/session';

for (const shape of shapes) {
  test(`${shape.name}: a new identity creates an account, and signing in again finds the same player`, async ({
    page,
    player,
  }) => {
    const who = identity(`new-${player.id}`);
    const login = new LoginScreen(page);
    await page.goto('/login');
    await answerNextTap(page, await shape.answer(who));
    await login.button(shape.button).click();
    await expect(new HomeScreen(page).root).toBeVisible();

    const first = await sessionOf(page);
    expect(first?.user?.id).toBeTruthy();
    expect((await whoAmI(first?.accessToken as string)).id).toBe(first?.user?.id);

    await page.goto('/profile');
    await new ProfileScreen(page).signOut();
    await page.waitForURL(/\/welcome$/);

    await page.goto('/login');
    await answerNextTap(page, await shape.answer(who));
    await login.button(shape.button).click();
    await expect(new HomeScreen(page).root).toBeVisible();
    expect((await sessionOf(page))?.user?.id).toBe(first?.user?.id);
  });
}
