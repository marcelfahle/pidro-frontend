import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { assertMinimumTouchTargets, suppressDevOverlays } from './ui-test-utils.mjs';

const baseUrl = process.env.MOBILE_BASE_URL ?? 'http://localhost:8081';
const output = process.env.UI_SHOT_DIR ?? '/tmp/pidro-lobby';
const player = (id, username, seat_index) => ({
  seat_index,
  status: 'occupied',
  player: { id, username },
});
const rooms = [
  {
    code: 'MEK',
    name: 'Mek’s table',
    status: 'waiting',
    available_positions: ['east', 'west'],
    seats: [player('mek', 'Mek', 0), player('mag', 'Magnolia', 2)],
  },
  {
    code: 'SUES',
    name: 'Sues’ table',
    status: 'waiting',
    available_positions: ['south', 'west'],
    seats: [player('sues', 'Sues', 0), player('izzy', 'Izzy', 1)],
  },
  {
    code: 'LONG',
    name: 'A long table name that must never wrap',
    status: 'waiting',
    available_positions: ['south', 'east', 'west'],
    seats: [player('herr', 'HerrmannLongName', 0)],
  },
];
const viewports = [
  { name: 'portrait', width: 390, height: 844 },
  { name: 'small-phone', width: 320, height: 568 },
  { name: 'landscape', width: 844, height: 390 },
  { name: 'compact-landscape', width: 667, height: 375 },
];

async function equalRows(page, selector) {
  const rows = await page.locator(selector).all();
  assert.equal(rows.length, 3);
  const boxes = await Promise.all(rows.map((row) => row.boundingBox()));
  assert.ok(
    boxes.every((box) => box && Math.abs(box.height - boxes[0].height) < 1),
    'row heights differ'
  );
  assert.ok(
    boxes.every((box) => box.x >= 0 && box.x + box.width <= page.viewportSize().width),
    'row exceeds viewport'
  );
}

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 2 });
    const page = await context.newPage();
    let state = 'populated';
    const joins = [];
    await page.addInitScript(() => {
      localStorage.setItem(
        'auth-storage',
        JSON.stringify({
          state: {
            accessToken: 'lobby-test-token',
            refreshToken: null,
            user: { id: 'viewer', username: 'Viewer' },
          },
          version: 0,
        })
      );
    });
    await page.route('**/api/v1/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/join')) {
        joins.push({ path, body: route.request().postDataJSON() });
        // Keep the lobby visible; a rejected join must not navigate away.
        await route.fulfill({
          status: 409,
          json: { error: { code: 'ROOM_FULL', detail: 'That seat was taken.' } },
        });
      } else if (path.endsWith('/lobby')) {
        await route.fulfill(
          state === 'error'
            ? { status: 503, json: {} }
            : {
                json: {
                  data: {
                    open_tables: state === 'empty' ? [] : rooms,
                    my_rejoinable: [],
                    substitute_needed: [],
                    spectatable: [],
                  },
                },
              }
        );
      } else {
        await route.fulfill({ status: 503, json: {} });
      }
    });
    page.on('dialog', (dialog) => dialog.dismiss());
    await page.goto(`${baseUrl}/lobby`);
    await page.getByTestId('lobby-table-MEK').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await suppressDevOverlays(page);
    await equalRows(page, '[data-testid^="lobby-table-"]');
    await assertMinimumTouchTargets(page, 'lobby', viewport, { checkInputs: true });
    const first = page.getByTestId('lobby-table-MEK');
    assert.equal(await first.getByRole('button', { name: /^Join/ }).count(), 2);
    const mek = await first.getByRole('button', { name: "View Mek's profile" }).boundingBox();
    const magnolia = await first
      .getByRole('button', { name: "View Magnolia's profile" })
      .boundingBox();
    const east = await first.getByRole('button', { name: /^Join east/ }).boundingBox();
    const west = await first.getByRole('button', { name: /^Join west/ }).boundingBox();
    assert.ok(
      mek.x < magnolia.x && magnolia.x < east.x && east.x < west.x,
      'teams must be N/S versus E/W'
    );
    assert.ok(
      [magnolia, east, west].every((box) => Math.abs(box.y - mek.y) < 1),
      'seats must share one row'
    );
    await page.screenshot({ path: resolve(output, `${viewport.name}.png`) });
    await first.getByRole('button', { name: /^Join west/ }).click();
    await page.waitForTimeout(200);
    assert.deepEqual(joins, [{ path: '/api/v1/rooms/MEK/join', body: { position: 'west' } }]);
    await page.getByRole('textbox', { name: 'Search tables' }).fill('sues');
    assert.equal(await page.locator('[data-testid^="lobby-table-"]').count(), 1);
    await page.getByRole('textbox', { name: 'Search tables' }).fill('no matching table');
    await page.getByText('No matching tables', { exact: true }).waitFor();
    await page.screenshot({ path: resolve(output, `${viewport.name}-no-results.png`) });
    await page.getByRole('button', { name: 'Clear search' }).click();
    await page.getByRole('button', { name: 'Create table', exact: true }).click();
    await page.getByTestId('create-room-window').waitFor();
    for (const next of ['empty', 'error']) {
      state = next;
      await page.reload();
      await page
        .getByText(next === 'empty' ? 'No tables yet' : 'Tables unavailable', { exact: true })
        .waitFor();
      await suppressDevOverlays(page);
      await assertMinimumTouchTargets(page, `lobby-${next}`, viewport);
      await page.screenshot({ path: resolve(output, `${viewport.name}-${next}.png`) });
    }
    await page.goto(`${baseUrl}/ui-dev?state=lobby-seats`);
    await page.getByTestId('lobby-table-SAMPLE0').waitFor();
    await equalRows(page, '[data-testid^="lobby-table-"]');
    await assertMinimumTouchTargets(page, 'lobby-badges', viewport);
    for (const value of ['100', '1000']) {
      const badge = page
        .getByTestId('seat-requirement')
        .filter({ hasText: new RegExp(`^${value}$`) });
      assert.equal(await badge.textContent(), value);
      assert.ok(
        await badge.evaluate((el) => el.scrollWidth <= el.clientWidth),
        `${value} is clipped`
      );
    }
    await page.screenshot({ path: resolve(output, `${viewport.name}-badges.png`) });
    await page
      .getByTestId('lobby-table-SAMPLE2')
      .getByRole('button', { name: /^Join west/ })
      .click();
    assert.equal(await page.getByTestId('lobby-gallery-joined').textContent(), 'SAMPLE2: west');
    console.log(
      `lobby ok: ${viewport.name} — equal rows, team order, touch targets, join payload, search, create, empty/error, 100/1000 badges`
    );
    await context.close();
  }
} finally {
  await browser.close();
}
