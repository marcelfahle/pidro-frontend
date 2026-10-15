import { test, expect } from '../fixtures';
import { LoginScreen } from '../screens/login-screen';
import { HomeScreen } from '../screens/home-screen';
import { answerNextTap, cancelled, identity, shapes } from '../support/identity';
import { sessionOf } from '../support/session';

for (const shape of shapes) {
  test.describe(shape.name, () => {
    test('cancelling the sheet is silent', async ({ page, player }) => {
      const sent: string[] = [];
      page.on('request', (request) => {
        if (/\/api\/v1\/auth\/(apple|facebook)$/.test(request.url())) sent.push(request.url());
      });
      const login = new LoginScreen(page);
      await page.goto('/login');
      await answerNextTap(page, cancelled(shape));
      await login.button(shape.button).click();
      await expect(login.alert).toHaveCount(0);
      expect(sent).toEqual([]);

      // Nothing is stuck: the next tap works.
      await answerNextTap(page, await shape.answer(identity(`new-${player.id}`)));
      await login.button(shape.button).click();
      await expect(new HomeScreen(page).root).toBeVisible();
      expect(sent).toHaveLength(1);
    });

    test('an identity the provider does not stand behind gets the quiet notice', async ({
      page,
      player,
    }) => {
      const login = new LoginScreen(page);
      await page.goto('/login');
      await answerNextTap(page, await shape.rejected(identity(`new-${player.id}`)));
      await login.button(shape.button).click();
      await expect(login.alert).toContainText(`couldn’t sign in with that ${shape.brand} account`);
      await expect(login.root).toBeVisible();
      expect((await sessionOf(page))?.user ?? null).toBeNull();
    });

    test.describe('when the lookup fails', () => {
      test.use({ unavailableExpected: true });

      test('an outage is readable and keeps the screen', async ({ page, player }) => {
        const login = new LoginScreen(page);
        await page.goto('/login');
        await answerNextTap(page, await shape.answer(identity(`down-${player.id}`)));
        await login.button(shape.button).click();
        await expect(login.alert).toContainText(
          'This sign-in provider is temporarily unavailable.'
        );
        await expect(login.button(shape.button)).toBeEnabled();
        expect((await sessionOf(page))?.user ?? null).toBeNull();
      });
    });
  });
}
