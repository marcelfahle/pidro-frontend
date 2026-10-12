import { test, expect } from '../fixtures';
import { HomeScreen } from '../screens/home-screen';
import { LoginScreen } from '../screens/login-screen';
import { guest } from '../support/api';
import { answerNextTap, identity, shapes } from '../support/identity';
import { sessionOf, startSignedIn } from '../support/session';

for (const shape of shapes) {
  test(`${shape.name}: a guest who signs in with it is asked before switching players`, async ({
    page,
    player,
  }) => {
    const started = await guest(player);
    await startSignedIn(page, started);
    const sent: string[] = [];
    page.on('request', (request) => {
      if (/\/api\/v1\/auth\/(apple|facebook)$/.test(request.url())) sent.push(request.url());
    });

    await page.goto('/home');
    await new HomeScreen(page).signIn.click();
    const login = new LoginScreen(page);
    await answerNextTap(page, await shape.answer(identity(`new-${player.id}`)));
    await login.button(shape.button).click();
    await expect(login.switchPlayers).toBeVisible();

    await login.cancelSwitch();
    await expect(login.switchPlayers).toBeHidden();
    expect((await sessionOf(page))?.user).toMatchObject({ id: started.user.id, guest: true });
    expect(sent).toEqual([]);

    await login.button(shape.button).click();
    await login.switchAccount();
    await expect(new HomeScreen(page).root).toBeVisible();
    const session = await sessionOf(page);
    expect(session?.user?.id).not.toBe(started.user.id);
    expect(sent).toHaveLength(1);
  });
}
