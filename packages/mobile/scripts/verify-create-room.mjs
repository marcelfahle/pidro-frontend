import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { assertMinimumTouchTargets, suppressDevOverlays } from './ui-test-utils.mjs';

const baseUrl = process.env.MOBILE_BASE_URL ?? 'http://localhost:8081';
const output = process.env.UI_SHOT_DIR ?? '/tmp/pidro-create';
const username = 'Alexandria the Long-Named Player';
const browser = await chromium.launch({ headless: true });
await mkdir(output, { recursive: true });
try {
  for (const viewport of [
    { name: 'portrait', width: 390, height: 844 },
    { name: 'small', width: 320, height: 568 },
    { name: 'landscape', width: 844, height: 390 },
    { name: 'compact-landscape', width: 667, height: 375 },
  ]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 2 });
    const page = await context.newPage();
    const requests = [];
    await page.addInitScript((username) => {
      localStorage.setItem(
        'age-gate-storage',
        JSON.stringify({ state: { ageBand: '18_plus', termsVersion: '1' }, version: 0 })
      );
      localStorage.setItem(
        'auth-storage',
        JSON.stringify({
          state: {
            accessToken: 'creation-test',
            refreshToken: null,
            user: { id: 'viewer', username, age_band: '18_plus' },
          },
          version: 0,
        })
      );
    }, username);
    await page.route('**/api/v1/**', async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (path.endsWith('/lobby')) {
        await route.fulfill({
          json: {
            data: { open_tables: [], my_rejoinable: [], substitute_needed: [], spectatable: [] },
          },
        });
      } else if (path.endsWith('/rooms') && request.method() === 'POST') {
        requests.push(request.postDataJSON());
        // Keep the form open to verify failure recovery, not navigation to an unrelated game.
        await route.fulfill({ status: 503, json: { errors: [{ detail: 'Try again fixture' }] } });
      } else await route.fulfill({ status: 503, json: {} });
    });
    await page.goto(`${baseUrl}/lobby`);
    await page.getByText('No one is at a table yet', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Create table', exact: true }).click();
    const form = page.getByTestId('create-room-window');
    await form.waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => [...document.images].every((image) => image.complete));
    await suppressDevOverlays(page);
    const button = (name) => form.getByRole('button', { name, exact: true });
    const seat = (label, value = 'open') => button(`${label}: ${value}. Change`);
    const sheet = page.getByTestId('create-seat-sheet');
    const choose = async (label, choice) => {
      await seat(label).click();
      await sheet.waitFor();
      assert.equal(await sheet.getByRole('radio').count(), 3);
      assert.equal(
        await sheet
          .getByRole('radio', { name: 'Open seat', exact: true })
          .getAttribute('aria-checked'),
        'true'
      );
      await sheet.getByRole('radio', { name: choice, exact: true }).click();
      assert.equal(
        await sheet.getByRole('radio', { name: choice, exact: true }).getAttribute('aria-checked'),
        'true'
      );
      const done = sheet.getByRole('button', { name: 'Done', exact: true });
      const doneBox = await done.boundingBox();
      assert.ok(doneBox.y >= 0 && doneBox.y + doneBox.height <= viewport.height, 'Done is in view');
      await assertMinimumTouchTargets(page, 'seat sheet', viewport);
      await page.screenshot({ path: resolve(output, `${viewport.name}-seat.png`) });
      await done.click();
      await sheet.waitFor({ state: 'detached' });
    };
    const open = button('Open the table');
    assert.equal(await form.getByRole('button', { name: /: open\. Change$/ }).count(), 3);
    const name = form.getByRole('textbox', { name: 'Table name' });
    assert.equal(await name.inputValue(), `${username}'s table`);
    assert.equal(await form.getByText(/Seat rules|Preview only|Bot strength/).count(), 0);
    const openBox = await open.boundingBox();
    assert.ok(
      openBox.y >= 0 && openBox.y + openBox.height <= viewport.height,
      'Open the table stays on screen'
    );
    await open.click();
    await form.getByRole('alert').waitFor();
    assert.deepEqual(requests[0], {
      name: `${username}'s table`,
      seats: { seat_2: 'open', seat_3: 'open', seat_4: 'open' },
    });
    await choose('Partner seat', 'Bot');
    await choose('Right opponent seat', 'Invite a friend');
    await seat('Partner seat', 'bot').waitFor();
    await seat('Right opponent seat', 'invite').waitFor();
    await name.fill('Friday night');
    await name.press('Enter');
    assert.equal(requests.length, 1, 'keyboard Done must not create a table');
    await assertMinimumTouchTargets(page, 'creation', viewport, { checkInputs: true });
    // No horizontally escaping descendants, including offscreen scroll content.
    const escaping = await form.evaluate((root) =>
      [...root.querySelectorAll('*')]
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && (rect.left < -1 || rect.right > innerWidth + 1);
        })
        .map((el) => el.textContent?.slice(0, 50))
    );
    assert.deepEqual(escaping, []);
    await page.screenshot({ path: resolve(output, `${viewport.name}.png`) });
    await open.click();
    for (let tries = 0; requests.length < 2 && tries < 50; tries += 1) {
      await page.waitForTimeout(100);
    }
    assert.deepEqual(
      requests[1],
      { name: 'Friday night', seats: { seat_2: 'open', seat_3: 'ai', seat_4: 'open' } },
      'partner is seat 3; an invite seat is sent as an open seat'
    );
    await button('Cancel creation').click();
    await page.getByRole('button', { name: 'Create table', exact: true }).click();
    await seat('Partner seat').waitFor();
    assert.equal(await name.inputValue(), `${username}'s table`);
    console.log(
      `creation ok: ${viewport.name} — defaults, name field, seat sheet, partner mapping, invite as open, reset, keyboard Done, 44px targets, containment`
    );
    await context.close();
  }
  // These are synthetic layout cases. Native provider placement is separately guarded
  // by create-modal-safe-area.test.mjs; a browser cannot test native modal measurement.
  const safeCases = [
    { preset: 'island', width: 390, height: 844, top: 59, bottom: 34, left: 0, right: 0 },
    { preset: 'island-left', width: 844, height: 390, top: 0, bottom: 21, left: 59, right: 0 },
    { preset: 'island-right', width: 844, height: 390, top: 0, bottom: 21, left: 0, right: 59 },
    { preset: 'legacy', width: 320, height: 568, top: 20, bottom: 0, left: 0, right: 0 },
    { preset: 'android-buttons', width: 360, height: 640, top: 24, bottom: 48, left: 0, right: 0 },
    { preset: 'android-right', width: 640, height: 360, top: 24, bottom: 0, left: 0, right: 48 },
    { preset: 'android-gesture', width: 360, height: 640, top: 24, bottom: 24, left: 0, right: 0 },
    { preset: 'island', width: 390, height: 430, top: 59, bottom: 34, left: 0, right: 0 },
  ];
  for (const { preset, width, height, top, bottom, left, right } of safeCases) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
    await page.goto(`${baseUrl}/ui-dev?state=create-safe-area&safeArea=${preset}`);
    const form = page.getByTestId('create-room-window');
    await form.waitFor();
    await page.evaluate(() => document.fonts.ready);
    await suppressDevOverlays(page);
    const inside = async (locator) => {
      const box = await locator.boundingBox();
      assert.ok(
        box &&
          box.x >= left &&
          box.y >= top &&
          box.x + box.width <= width - right + 1 &&
          box.y + box.height <= height - bottom + 1,
        `${preset} ${width}x${height}: control escaped safe rectangle: ${JSON.stringify(box)}`
      );
    };
    await inside(form);
    await inside(form.getByRole('button', { name: 'Cancel creation', exact: true }));
    await inside(form.getByRole('button', { name: 'Open the table', exact: true }));
    const name = form.getByRole('textbox', { name: 'Table name' });
    await name.scrollIntoViewIfNeeded();
    await inside(name);
    await page.screenshot({ path: resolve(output, `safe-${preset}-${height}.png`) });
    await form.getByRole('button', { name: 'Partner seat: open. Change', exact: true }).click();
    const sheet = page.getByTestId('create-seat-sheet');
    await inside(sheet.getByRole('radio', { name: 'Open seat', exact: true }));
    await inside(sheet.getByRole('button', { name: 'Done', exact: true }));
    await page.screenshot({ path: resolve(output, `safe-${preset}-${height}-seat.png`) });
    console.log(
      `safe-area layout ok: ${preset} ${width}x${height} — four edges, header/footer, name field, seat sheet`
    );
    await page.close();
  }
} finally {
  await browser.close();
}
