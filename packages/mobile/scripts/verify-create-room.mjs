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
        'auth-storage',
        JSON.stringify({
          state: {
            accessToken: 'creation-test',
            refreshToken: null,
            user: { id: 'viewer', username },
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
    await page.getByText('No tables available', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Create table', exact: true }).click();
    const form = page.getByTestId('create-room-window');
    await form.waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => [...document.images].every((image) => image.complete));
    await suppressDevOverlays(page);
    const button = (name) => form.getByRole('button', { name, exact: true });
    const edit = (label, value = 'Open to public') => button(`Edit ${label}: ${value}`);
    const create = button('Create table');
    assert.equal(await form.getByRole('button', { name: /^Edit / }).count(), 3);
    assert.equal(await form.getByRole('textbox').count(), 0, 'creation needs no name input');
    await form.getByText('vs', { exact: true }).waitFor();
    await create.click();
    await form.getByRole('alert').waitFor();
    assert.deepEqual(requests[0], {
      name: `${username}'s table`,
      seats: { seat_2: 'open', seat_3: 'open', seat_4: 'open' },
    });
    await edit('Your partner').click();
    await button('Your partner bot').click();
    assert.equal(await edit('Your partner', 'Bot').getAttribute('aria-expanded'), 'false');
    assert.equal(await form.getByText(/Bot strength|Bot Difficulty/).count(), 0);
    await edit('Opponent 2').click();
    await button('Invite…').click();
    await form.getByText(/Invitations do not reserve seats/).waitFor();
    assert.equal(requests.length, 1, 'invitation action must not create a room');
    await button('Seat rules · Preview only').click();
    await button('1000 games preview').click();
    await form
      .getByLabel('Password · preview only', { exact: true })
      .fill('example-not-a-real-secret');
    await form.getByLabel('Password · preview only', { exact: true }).press('Enter');
    assert.equal(requests.length, 1, 'keyboard Done must not create a table');
    assert.equal(await create.count(), 0, 'preview replaces creation with a close action');
    const closeBox = await button('Close preview').boundingBox();
    assert.ok(closeBox.y >= 0 && closeBox.y + closeBox.height <= viewport.height);
    await assertMinimumTouchTargets(page, 'creation preview', viewport, { checkInputs: true });
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
    await page.screenshot({ path: resolve(output, `${viewport.name}-rules.png`) });
    await button('Close preview').click();
    await button('Seat rules · Preview only').click();
    assert.equal(
      await form.getByLabel('Password · preview only', { exact: true }).inputValue(),
      ''
    );
    assert.equal(await button('No limit games preview').getAttribute('aria-selected'), 'true');
    await button('Close rules preview').click();
    await edit('Opponent 2').click();
    await create.click();
    await page.waitForFunction(() =>
      document.querySelector('[role="alert"]')?.textContent?.includes('Try again')
    );
    assert.deepEqual(
      requests[1],
      {
        name: `${username}'s table`,
        seats: { seat_2: 'open', seat_3: 'ai', seat_4: 'open' },
      },
      'partner must map to south; previews must never be serialized'
    );
    await button('Cancel creation').click();
    await page.getByRole('button', { name: 'Create table', exact: true }).click();
    await edit('Your partner').waitFor();
    await page.screenshot({ path: resolve(output, `${viewport.name}.png`) });
    await edit('Your partner').click();
    await page.screenshot({ path: resolve(output, `${viewport.name}-expanded.png`) });
    console.log(
      `creation ok: ${viewport.name} — defaults, partner mapping, no bot strength, preview isolation, invite notice, reset, keyboard Done, 44px targets, containment`
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
    await inside(form.getByRole('button', { name: 'Create table', exact: true }));
    await page.screenshot({ path: resolve(output, `safe-${preset}-${height}.png`) });
    await form
      .getByRole('button', { name: 'Edit Your partner: Open to public', exact: true })
      .click();
    await form.getByRole('button', { name: 'Seat rules · Preview only', exact: true }).click();
    const password = form.getByLabel('Password · preview only', { exact: true });
    await password.fill('example');
    await password.scrollIntoViewIfNeeded();
    await inside(password);
    await inside(form.getByRole('button', { name: 'Close preview', exact: true }));
    await page.screenshot({ path: resolve(output, `safe-${preset}-${height}-preview.png`) });
    console.log(
      `safe-area layout ok: ${preset} ${width}x${height} — four edges, header/footer, scroll-to-input`
    );
    await page.close();
  }
} finally {
  await browser.close();
}
