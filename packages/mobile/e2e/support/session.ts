import type { Page } from '@playwright/test';

/** The signed-in player as the client stored it. */
export async function sessionOf(page: Page) {
  return page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('auth-storage') ?? 'null');
    return (stored?.state ?? null) as {
      accessToken: string | null;
      user: { id: string; guest: boolean; email: string | null; username: string } | null;
    } | null;
  });
}

/** Starts the browser already signed in as a player the API created. */
export async function startSignedIn(page: Page, session: { token: string; user: object }) {
  await page.addInitScript(
    (state) => {
      localStorage.setItem('auth-storage', JSON.stringify({ state, version: 0 }));
    },
    { accessToken: session.token, user: session.user }
  );
}
