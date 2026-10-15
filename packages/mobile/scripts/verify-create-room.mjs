import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { suppressDevOverlays } from './ui-test-utils.mjs';

const baseUrl = process.env.MOBILE_BASE_URL ?? 'http://localhost:8081';
const output = process.env.UI_SHOT_DIR ?? '/tmp/pidro-create';
const seats = ['Partner seat', 'Left opponent seat', 'Right opponent seat'];
const ids = ['seat_3', 'seat_2', 'seat_4'];
const group = (form, name) => form.getByRole('radiogroup', { name, exact: true });
const radio = (form, name, choice) =>
  group(form, name).getByRole('radio', { name: choice, exact: true });
const requirement = (form, name, choice) =>
  group(form, `${name}, games played`).getByRole('radio', { name: choice, exact: true });
const checked = async (control) => assert.equal(await control.getAttribute('aria-checked'), 'true');

// An open seat is its 44 pt row plus its 48 pt games-played line; any other seat is the row.
async function rowsAndTargets(form) {
  await form.page().waitForTimeout(300); // let a fold settle
  for (const [i, id] of ids.entries()) {
    const open = (await radio(form, seats[i], 'Open').getAttribute('aria-checked')) === 'true';
    const box = await form.getByTestId(`create-${id}`).boundingBox();
    const height = open ? 92 : 44;
    assert.ok(box && Math.abs(box.height - height) < 1, `${id} is ${height}px high`);
  }
  for (const control of await form.getByRole('radio').all()) {
    const box = await control.boundingBox();
    assert.ok(box && box.width >= 44 && box.height >= 44, 'radio target is at least 44px');
  }
  for (const control of await form.getByRole('button').all()) {
    const box = await control.boundingBox();
    assert.ok(box && box.width >= 44 && box.height >= 44, 'button target is at least 44px');
  }
}

async function defaults(form, preferred) {
  await checked(radio(form, 'Rules', preferred));
  for (const [i, seat] of seats.entries())
    await checked(radio(form, seat, i === 2 ? 'Bot' : 'Open'));
  assert.equal(await form.getByRole('textbox').count(), 0, 'no table-name input');
  assert.equal(
    await form.getByTestId('create-footer').textContent(),
    '2 open seats are listed for everyone.'
  );
}

const browser = await chromium.launch({ headless: true });
await mkdir(output, { recursive: true });
try {
  for (const viewport of [
    { name: 'portrait', width: 390, height: 844 },
    { name: 'small', width: 320, height: 568 },
    { name: 'landscape', width: 844, height: 390 },
    { name: 'compact-landscape', width: 667, height: 375 },
    { name: 'tablet-portrait', width: 820, height: 1180 },
    { name: 'tablet-landscape', width: 1180, height: 820 },
  ]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 2 });
    const page = await context.newPage();
    const requests = [];
    const preferred = viewport.name.includes('tablet') ? 'louisiana' : 'finnish';
    await page.addInitScript((preferredRuleSet) => {
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
            user: {
              id: 'viewer',
              username: 'Alexandria the Long-Named Player',
              age_band: '18_plus',
            },
          },
          version: 0,
        })
      );
      localStorage.setItem(
        'settings-storage',
        JSON.stringify({ state: { preferredRuleSet }, version: 0 })
      );
    }, preferred);
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
        // Retain the form to exercise error recovery and reset without a fake game.
        await route.fulfill({ status: 503, json: { errors: [{ detail: 'Try again fixture' }] } });
      } else await route.fulfill({ status: 503, json: {} });
    });
    await page.goto(`${baseUrl}/lobby`);
    const start = page.getByRole('button', { name: 'Start a table', exact: true }).first();
    await start.click();
    const form = page.getByTestId('create-room-window');
    await form.waitFor();
    await page.evaluate(() => document.fonts.ready);
    await suppressDevOverlays(page);
    await defaults(form, preferred === 'finnish' ? 'Finnish' : 'Louisiana');
    await rowsAndTargets(form);
    const open = form.getByRole('button', { name: 'Open the table', exact: true });
    await open.click();
    await form.getByRole('alert').waitFor();
    assert.deepEqual(requests, [
      { rule_set: preferred, seats: { seat_2: 'open', seat_3: 'open', seat_4: 'ai' } },
    ]);

    // An open seat shows its games-played choice in place; no second tap, no sheet.
    assert.deepEqual(
      await group(form, 'Partner seat, games played').getByRole('radio').allTextContents(),
      ['Anyone', '100+', '1,000+']
    );
    await checked(requirement(form, 'Partner seat', 'Anyone'));
    assert.equal(await page.getByTestId('create-seat-sheet').count(), 0);
    await requirement(form, 'Partner seat', '1,000+').click();
    await checked(radio(form, 'Partner seat', 'Open'));
    await checked(requirement(form, 'Partner seat', '1,000+'));
    await requirement(form, 'Partner seat', '100+').click();
    await rowsAndTargets(form);
    await radio(form, 'Left opponent seat', 'Friend').click();
    await checked(radio(form, 'Left opponent seat', 'Friend'));
    assert.equal(
      await form.getByTestId('create-footer').textContent(),
      'One open seat is listed for everyone.'
    );
    const otherRule = preferred === 'finnish' ? 'Louisiana' : 'Finnish';
    await radio(form, 'Rules', otherRule).click();
    await open.click();
    await page.waitForFunction(() => document.querySelector('[role="alert"]') !== null);
    for (let tries = 0; requests.length < 2 && tries < 50; tries += 1)
      await page.waitForTimeout(100);
    assert.deepEqual(
      requests[1],
      {
        rule_set: otherRule.toLowerCase(),
        seats: { seat_2: 'open', seat_3: { type: 'open', min_games: 100 }, seat_4: 'ai' },
      },
      'open seats send their requirement; no name is sent and Friend stays open'
    );
    await radio(form, 'Partner seat', 'Bot').click();
    assert.equal(
      await form.getByTestId('create-footer').textContent(),
      'The game starts when your friends sit down.'
    );
    await rowsAndTargets(form);
    await page.screenshot({ path: resolve(output, `${viewport.name}.png`) });
    await form.getByRole('button', { name: 'Cancel creation', exact: true }).click();
    await start.click();
    await defaults(form, preferred === 'finnish' ? 'Finnish' : 'Louisiana');
    await checked(requirement(form, 'Partner seat', 'Anyone'));
    console.log(
      `creation ok: ${viewport.name} — folding requirements, row heights, 44px targets, seat requirements, no name, preferred rules, footer, reset`
    );
    await context.close();
  }

  // Synthetic browser insets only; native modal measurement needs device coverage.
  for (const { preset, width, height, top, bottom, left, right } of [
    { preset: 'island', width: 390, height: 844, top: 59, bottom: 34, left: 0, right: 0 },
    { preset: 'island-left', width: 844, height: 390, top: 0, bottom: 21, left: 59, right: 0 },
    { preset: 'island-right', width: 844, height: 390, top: 0, bottom: 21, left: 0, right: 59 },
    { preset: 'legacy', width: 320, height: 568, top: 20, bottom: 0, left: 0, right: 0 },
    { preset: 'android-buttons', width: 360, height: 640, top: 24, bottom: 48, left: 0, right: 0 },
    { preset: 'android-right', width: 640, height: 360, top: 24, bottom: 0, left: 0, right: 48 },
    { preset: 'android-gesture', width: 360, height: 640, top: 24, bottom: 24, left: 0, right: 0 },
    { preset: 'island', width: 390, height: 430, top: 59, bottom: 34, left: 0, right: 0 },
    { preset: 'island', width: 820, height: 1180, top: 59, bottom: 34, left: 0, right: 0 },
    { preset: 'island-left', width: 1180, height: 820, top: 0, bottom: 21, left: 59, right: 0 },
  ]) {
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
          box.x >= left - 1 &&
          box.y >= top - 1 &&
          box.x + box.width <= width - right + 1 &&
          box.y + box.height <= height - bottom + 1,
        `${preset} ${width}x${height}: escaped safe rectangle: ${JSON.stringify(box)}`
      );
    };
    await inside(form);
    const controls = [
      form.getByRole('button', { name: 'Cancel creation', exact: true }),
      ...(await form.getByRole('radio').all()),
      form.getByRole('button', { name: 'Open the table', exact: true }),
      form.getByTestId('create-footer'),
    ];
    for (const control of controls) {
      await control.scrollIntoViewIfNeeded();
      await inside(control);
    }
    await rowsAndTargets(form);
    for (const control of await group(form, 'Partner seat, games played')
      .getByRole('radio')
      .all()) {
      await control.scrollIntoViewIfNeeded();
      await inside(control);
    }
    const escaping = await form.evaluate((root) =>
      [...root.querySelectorAll('*')]
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          const bounds = root.getBoundingClientRect();
          return rect.width > 0 && (rect.left < bounds.left - 1 || rect.right > bounds.right + 1);
        })
        .map((el) => el.textContent?.slice(0, 50))
    );
    assert.deepEqual(escaping, [], 'scroll content has no horizontal overflow');
    await form.getByTestId('create-footer').scrollIntoViewIfNeeded();
    await inside(form.getByTestId('create-footer'));
    await page.screenshot({ path: resolve(output, `safe-${preset}-${width}-${height}.png`) });
    console.log(
      `safe-area layout ok: ${preset} ${width}x${height} — scroll containment, four edges, header/footer, inline requirements`
    );
    await page.close();
  }
} finally {
  await browser.close();
}
