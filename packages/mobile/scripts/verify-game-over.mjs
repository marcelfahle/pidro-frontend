import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import {
  assertInsideViewport,
  assertMinimumTouchTargets,
  suppressDevOverlays,
} from './ui-test-utils.mjs';

const baseUrl = process.env.MOBILE_BASE_URL ?? 'http://localhost:8081';
const shots = process.env.UI_SHOT_DIR ?? '/tmp/pidro-game-over';
const sizes = [
  {
    name: 'phone-portrait',
    width: 390,
    height: 844,
    safeArea: 'island',
    left: 0,
    right: 0,
    top: 59,
    bottom: 34,
  },
  {
    name: 'phone-landscape-left',
    width: 844,
    height: 390,
    safeArea: 'island-left',
    left: 59,
    right: 0,
    top: 0,
    bottom: 21,
  },
  {
    name: 'phone-landscape-right',
    width: 844,
    height: 390,
    safeArea: 'island-right',
    left: 0,
    right: 59,
    top: 0,
    bottom: 21,
  },
  { name: 'small-phone', width: 320, height: 568, top: 0, left: 0, right: 0, bottom: 0 },
  { name: 'small-landscape', width: 667, height: 375, top: 0, left: 0, right: 0, bottom: 0 },
  { name: 'tablet-portrait', width: 834, height: 1194, top: 0, left: 0, right: 0, bottom: 0 },
  { name: 'tablet-landscape', width: 1194, height: 834, top: 0, left: 0, right: 0, bottom: 0 },
];
await mkdir(shots, { recursive: true });
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
let checks = 0;

async function open(page, params = {}, waitForTable = true) {
  await page.goto(`${baseUrl}/table-dev?${new URLSearchParams({ phase: 'game_over', ...params })}`);
  await page.getByTestId('game-over-window').waitFor();
  await suppressDevOverlays(page);
  await page.evaluate(() => document.fonts.ready);
  if (waitForTable) await page.getByTestId('seat-north').waitFor();
}

async function geometry(page, size) {
  for (const id of ['game-over-window', 'game-over-home', 'play-again']) {
    const target = page.getByTestId(id);
    if (!(await target.count())) continue;
    const box = await target.boundingBox();
    assert.ok(box, `${id} has geometry`);
    assertInsideViewport(id, box, size);
    assert.ok(
      box.x >= size.left && box.x + box.width <= size.width - size.right,
      `${id} clears side insets`
    );
    assert.ok(
      box.y >= size.top && box.y + box.height <= size.height - size.bottom,
      `${id} clears top/bottom insets`
    );
  }
  const panel = await page.getByTestId('game-over-window').boundingBox();
  for (const text of await page.getByTestId('game-over-window').locator('[dir="auto"]').all()) {
    const box = await text.boundingBox();
    assert.ok(
      box && box.y >= panel.y && box.y + box.height <= panel.y + panel.height,
      'Panel content is not clipped vertically'
    );
    assert.ok(
      box.x >= panel.x && box.x + box.width <= panel.x + panel.width,
      'Panel content is not clipped horizontally'
    );
  }
  const home = await page.getByTestId('game-over-home').boundingBox();
  assert.ok(panel.y + panel.height <= home.y, 'Panel never overlaps actions');
  assert.ok(home.x < size.width / 2, 'Home stays left');
  if (await page.getByTestId('play-again').count()) {
    const rematch = await page.getByTestId('play-again').boundingBox();
    assert.ok(rematch.x + rematch.width / 2 > size.width / 2, 'Rematch stays right');
    assert.ok(home.x + home.width < rematch.x, 'Actions never overlap');
  }
  await assertMinimumTouchTargets(page, 'game-over', size);
}

try {
  const context = await browser.newContext({ reducedMotion: 'reduce', deviceScaleFactor: 2 });
  // Home is protected; use the same inert auth fixture as the UI grammar suite.
  await context.addInitScript(() => {
    localStorage.setItem(
      'auth-storage',
      JSON.stringify({
        state: {
          accessToken: 'ui-grammar-token',
          refreshToken: null,
          user: { id: 'ui-grammar-user', username: 'Player' },
        },
        version: 0,
      })
    );
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const size of sizes) {
    await page.setViewportSize({ width: size.width, height: size.height });
    const inset = size.safeArea ? { safeArea: size.safeArea } : {};
    await open(page, inset);
    await page.getByRole('heading', { name: 'You won!', exact: true }).waitFor();
    assert.equal(await page.getByTestId('result-score-first').textContent(), '64');
    assert.equal(await page.getByTestId('result-score-second').textContent(), '48');
    assert.equal(
      await page.getByTestId('victory-confetti').count(),
      0,
      'Reduced motion omits confetti'
    );
    assert.equal(await page.getByText(/XP/).count(), 0, 'Absent rewards leave no placeholder');
    for (const name of ['You', 'Nora'])
      await page.getByTestId('result-team-first').getByText(name, { exact: true }).waitFor();
    for (const name of ['Eli', 'Wynn'])
      await page.getByTestId('result-team-second').getByText(name, { exact: true }).waitFor();
    await geometry(page, size);
    await page.screenshot({ path: resolve(shots, `${size.name}.png`) });
    await page.getByRole('button', { name: 'Rematch', exact: true }).click();
    await page.getByText('1 of 4 want to play again', { exact: true }).waitFor();
    assert.equal(await page.getByTestId('play-again').isDisabled(), true);
    assert.equal(await page.getByTestId('play-again').getAttribute('aria-label'), 'Waiting…');
    await geometry(page, size);
    checks++;

    await open(page, {
      ...inset,
      result: 'loss',
      xp: 'level',
      rematch: 'asked',
      playerName: 'Alexandria the Long-Named Player',
    });
    await page.getByRole('heading', { name: 'Opponents win', exact: true }).waitFor();
    assert.equal(await page.getByTestId('result-score-first').textContent(), '-12');
    assert.equal(await page.getByTestId('result-score-second').textContent(), '64');
    assert.equal(
      await page
        .getByTestId('result-score-second')
        .evaluate((node) => getComputedStyle(node).color),
      'rgb(225, 173, 58)'
    );
    await page.getByText('+64 XP · Level 12!', { exact: true }).waitFor();
    assert.equal(await page.getByTestId('play-again').isEnabled(), true);
    await geometry(page, size);
    await page.screenshot({ path: resolve(shots, `${size.name}-loss-xp.png`) });
    checks++;
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, { result: 'east' });
  await page.getByRole('heading', { name: 'You won!', exact: true }).waitFor();
  assert.equal(await page.getByTestId('result-score-first').textContent(), '64');
  assert.equal(await page.getByTestId('result-score-second').textContent(), '-12');
  for (const name of ['You', 'Wynn'])
    await page.getByTestId('result-team-first').getByText(name, { exact: true }).waitFor();
  for (const name of ['Alex', 'Nora'])
    await page.getByTestId('result-team-second').getByText(name, { exact: true }).waitFor();
  checks++;

  await open(page, { result: 'spectator', xp: 'level', rematch: 'asked' });
  await page.getByRole('heading', { name: 'North / South win!', exact: true }).waitFor();
  assert.equal(await page.getByTestId('play-again').count(), 0);
  assert.equal(await page.getByTestId('rematch-status').count(), 0);
  assert.equal(await page.getByText(/XP/).count(), 0);
  await page.screenshot({ path: resolve(shots, 'spectator.png') });
  checks++;

  await open(page, { result: 'tie' });
  await page.getByRole('heading', { name: 'A tie!', exact: true }).waitFor();
  for (const id of ['result-score-first', 'result-score-second']) {
    assert.equal(await page.getByTestId(id).textContent(), '64');
    assert.equal(
      await page.getByTestId(id).evaluate((node) => getComputedStyle(node).color),
      'rgb(255, 255, 255)'
    );
  }
  await page.screenshot({ path: resolve(shots, 'tie.png') });
  checks++;

  for (const rematch of ['missing', 'pending']) {
    await open(page, { rematch });
    assert.equal(await page.getByTestId('play-again').isDisabled(), true);
    assert.equal(
      await page.getByTestId('play-again').getByRole('progressbar').count(),
      rematch === 'pending' ? 1 : 0
    );
    await page.screenshot({ path: resolve(shots, `${rematch}.png`) });
    checks++;
  }
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.waitForURL('**/home');
  assert.deepEqual(errors, []);
  await context.close();

  const motion = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    reducedMotion: 'no-preference',
  });
  const animatedPage = await motion.newPage();
  await open(animatedPage, {}, false);
  const confetti = animatedPage.getByTestId('victory-confetti');
  await confetti.waitFor();
  const piece = confetti.locator(':scope > div').first();
  const before = await piece.evaluate((node) => getComputedStyle(node).transform);
  await animatedPage.waitForTimeout(200);
  const after = await piece.evaluate((node) => getComputedStyle(node).transform);
  assert.notEqual(after, before, 'Confetti must actually move');
  assert.equal(await confetti.evaluate((node) => getComputedStyle(node).pointerEvents), 'none');
  await animatedPage.screenshot({ path: resolve(shots, 'confetti.png') });
  // A vote rerender must not restart the celebration.
  await animatedPage.getByRole('button', { name: 'Rematch', exact: true }).click();
  await confetti.waitFor({ state: 'detached', timeout: 4000 });
  await animatedPage.setViewportSize({ width: 844, height: 390 });
  assert.equal(await confetti.count(), 0, 'Rotation must not replay confetti');
  await open(animatedPage, { result: 'loss' });
  assert.equal(await confetti.count(), 0, 'Loss must not celebrate');
  await motion.close();
  checks++;
  console.log(
    `PASS: ${checks} game-over checks; seven viewport/inset combinations, voting, rewards, teams, Home, and motion.`
  );
} finally {
  await browser.close();
}
