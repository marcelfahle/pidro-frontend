import { chromium } from 'playwright';

const baseURL = 'http://127.0.0.1:5173';
const timestamp = Date.now();
const username = `webqa_${timestamp.toString(36)}`;
const email = `${username}@example.com`;
const password = 'testpass123';

async function clickIfVisible(locator) {
  if (await locator.count()) {
    const first = locator.first();
    if (await first.isVisible()) {
      await first.click();
      return true;
    }
  }
  return false;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1365, height: 1024 } });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto(`${baseURL}/register`, { waitUntil: 'networkidle' });
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm Password').fill(password);
  await page.getByRole('button', { name: 'Create Account' }).click();

  await page.waitForURL('**/home', { timeout: 20000 });
  await page.screenshot({ path: '/tmp/pidro-home-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Multiplayer' }).click();
  await page.waitForURL('**/lobby', { timeout: 20000 });
  await page.screenshot({ path: '/tmp/pidro-lobby-desktop.png', fullPage: true });

  await page.getByRole('button', { name: 'Create Game' }).click();
  await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
  await page.screenshot({ path: '/tmp/pidro-create-game-desktop.png', fullPage: true });

  for (let i = 0; i < 3; i += 1) {
    await page.locator('#create-game-form button', { hasText: 'Open' }).first().click();
  }

  const createButtons = page.getByRole('button', { name: 'Create Game' });
  await createButtons.last().click();

  await page.waitForURL('**/game/**', { timeout: 20000 });
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: '/tmp/pidro-waiting-desktop.png', fullPage: true });

  await clickIfVisible(page.getByRole('button', { name: 'Ready' }));

  let interactionCount = 0;
  let playedCard = false;
  let reachedInteractiveState = false;

  for (let step = 0; step < 80; step += 1) {
    if (await page.getByText('Your turn to bid').isVisible().catch(() => false)) {
      const bidButtons = page.locator('button').filter({ hasNotText: 'Pass' });
      const bidCount = await bidButtons.count();
      if (bidCount > 0) {
        await bidButtons.nth(0).click();
        interactionCount += 1;
        reachedInteractiveState = true;
      }
    }

    if (await page.getByText('Choose Trump Suit').isVisible().catch(() => false)) {
      await page.locator('button').filter({ hasText: 'Spades' }).first().click();
      interactionCount += 1;
      reachedInteractiveState = true;
    }

    if (await page.getByRole('button', { name: 'Confirm Selection' }).isVisible().catch(() => false)) {
      const cardButtons = page.locator('[aria-label^="Play "]');
      const count = await cardButtons.count();
      const clicks = Math.min(6, count);
      for (let i = 0; i < clicks; i += 1) {
        await cardButtons.nth(i).click();
      }
      await page.getByRole('button', { name: 'Confirm Selection' }).click();
      interactionCount += 1;
      reachedInteractiveState = true;
    }

    const playableCards = page.locator('[aria-label^="Play "]');
    const playableCount = await playableCards.count();
    if (playableCount > 0) {
      const firstCard = playableCards.first();
      if (await firstCard.isVisible()) {
        await firstCard.click();
        interactionCount += 1;
        playedCard = true;
        reachedInteractiveState = true;
      }
    }

    if (await page.getByText('Game Over').isVisible().catch(() => false)) {
      break;
    }

    await page.waitForTimeout(1000);
  }

  await page.screenshot({ path: '/tmp/pidro-game-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 430, height: 932 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: '/tmp/pidro-game-portrait.png', fullPage: true });

  console.log(
    JSON.stringify(
      {
        username,
        email,
        finalUrl: page.url(),
        interactionCount,
        reachedInteractiveState,
        playedCard,
        consoleErrors,
        pageErrors,
        screenshots: [
          '/tmp/pidro-home-desktop.png',
          '/tmp/pidro-lobby-desktop.png',
          '/tmp/pidro-create-game-desktop.png',
          '/tmp/pidro-waiting-desktop.png',
          '/tmp/pidro-game-desktop.png',
          '/tmp/pidro-game-portrait.png',
        ],
      },
      null,
      2,
    ),
  );

  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
