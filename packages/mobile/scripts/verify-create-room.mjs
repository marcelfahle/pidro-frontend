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
const output = process.env.UI_SHOT_DIR ?? '/tmp/pidro-create';
const fixtures = [
  'setup',
  'partner',
  'bots',
  'opened',
  'ready',
  'louisiana',
  'requirement',
  'password',
  'picker',
  'friends',
  'guest',
];
const browser = await chromium.launch({ headless: true });
await mkdir(output, { recursive: true });
try {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 375, height: 667 },
    { width: 844, height: 390 },
    { width: 768, height: 1024 },
  ]) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
    for (const fixture of fixtures) {
      await page.goto(`${baseUrl}/ui-dev?state=new-table&fixture=${fixture}`);
      const live = ['opened', 'ready', 'guest'].includes(fixture);
      const screen = page.getByTestId(live ? 'waiting-table' : 'new-table-screen');
      await screen.waitFor();
      await suppressDevOverlays(page);
      await page.evaluate(() => document.fonts.ready);
      const boxes = [];
      for (const position of ['north', 'south', 'east', 'west']) {
        const row = page.getByTestId(`new-table-seat-${position}`);
        const box = await row.boundingBox();
        assert.ok(box && box.width <= 436 + 1 && box.width > 100, `${position}: column width`);
        assert.ok(
          Math.abs(box.x + box.width / 2 - viewport.width / 2) <= 2,
          `${position}: centered`
        );
        boxes.push(box);
      }
      boxes.sort((a, b) => a.y - b.y);
      for (let i = 1; i < boxes.length; i++)
        assert.ok(
          boxes[i].y >= boxes[i - 1].y + boxes[i - 1].height - 1,
          'single team list, no overlap'
        );
      if (!['picker', 'friends'].includes(fixture)) {
        for (const position of ['north', 'south', 'east', 'west']) {
          const row = page.getByTestId(`new-table-seat-${position}`);
          if (viewport.width > viewport.height) await row.scrollIntoViewIfNeeded();
          assertInsideViewport(position, await row.boundingBox(), viewport);
        }
        await assertMinimumTouchTargets(page, `new-table-${fixture}`, viewport);
      }
      assert.equal(await page.getByTestId('create-room-window').count(), 0);
      assert.equal(
        await page
          .getByRole('button', { name: /^(Move to|Lock joins|Unlock joins|Manage )/ })
          .count(),
        0
      );
      if (fixture === 'setup') {
        for (const position of ['south', 'east', 'west'])
          assert.match(
            await page.getByTestId(`new-table-seat-${position}`).innerText(),
            /Anyone|Open/
          );
        const finnish = screen.getByRole('radio', { name: 'Finnish', exact: true });
        const louisiana = screen.getByRole('radio', { name: 'Louisiana', exact: true });
        assert.equal(await finnish.getAttribute('aria-checked'), 'true');
        await louisiana.click();
        assert.equal(await louisiana.getAttribute('aria-checked'), 'true');
        assert.equal(await finnish.getAttribute('aria-checked'), 'false');
      }
      const footer = {
        setup: 'Open the table',
        bots: 'Start the game',
        opened: 'Share the table link',
        ready: "I'm ready",
      }[fixture];
      if (footer) {
        const action = screen.getByRole('button', { name: footer, exact: true });
        if (viewport.width > viewport.height) await action.scrollIntoViewIfNeeded();
        assert.ok(await action.isVisible());
        const box = await action.boundingBox();
        assertInsideViewport('footer', box, viewport);
        assert.ok(box.width >= 44 && box.height >= 44, 'footer touch target');
      }
      if (live) await page.getByTestId('waiting-rule-set').waitFor();
      if (fixture === 'picker') {
        const picker = page.getByTestId('seat-picker-container');
        await picker.waitFor();
        assert.equal(await picker.getByRole('radio').count(), 5);
        for (const choice of [
          'Anyone',
          'Bot',
          '100+ games played',
          '1000+ games played',
          'With password',
        ])
          await picker
            .getByRole('radio', { name: new RegExp(`^${choice.replace(/[+]/g, '\\+')}, .+`) })
            .waitFor();
        if (viewport.width < viewport.height && viewport.width < 600)
          await picker.getByRole('button', { name: /^A friend, .+/ }).waitFor();
        else await picker.getByTestId('friend-picker').waitFor();
      }
      if (fixture === 'friends') await page.getByTestId('friend-picker').waitFor();
      if (fixture === 'guest') {
        await page.getByTestId('new-table-seat-east').click();
        assert.equal(
          await page.getByTestId('seat-picker-container').count(),
          0,
          'nonhost cannot edit seats'
        );
        assert.equal(
          await page.getByRole('button', { name: 'Remove from table', exact: true }).count(),
          0
        );
      }
      await page.screenshot({
        path: resolve(output, `new-table-${fixture}-${viewport.width}x${viewport.height}.png`),
      });
      console.log(`new-table-${fixture}: ${viewport.width}x${viewport.height}`);
    }

    // Keep real creation payload/error recovery coverage, independent of fixture callbacks.
    await page.addInitScript(() => {
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
            user: { id: 'viewer', username: 'Viewer', age_band: '18_plus' },
          },
          version: 0,
        })
      );
      localStorage.setItem(
        'settings-storage',
        JSON.stringify({ state: { preferredRuleSet: 'finnish' }, version: 0 })
      );
    });
    const requests = [];
    await page.route('**/api/v1/**', async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (path.endsWith('/lobby'))
        await route.fulfill({
          json: {
            data: { open_tables: [], my_rejoinable: [], substitute_needed: [], spectatable: [] },
          },
        });
      else if (path.endsWith('/rooms') && request.method() === 'POST') {
        requests.push(request.postDataJSON());
        await route.fulfill({ status: 503, json: { errors: [{ detail: 'Try again fixture' }] } });
      } else await route.fulfill({ status: 503, json: {} });
    });
    await page.goto(`${baseUrl}/lobby`);
    await page.getByRole('button', { name: 'Start a table', exact: true }).first().click();
    const form = page.getByTestId('new-table-screen');
    await form.waitFor();
    assert.equal(await form.getByRole('textbox').count(), 0, 'no table name');
    const submit = async () => {
      const response = page.waitForResponse(
        (res) => new URL(res.url()).pathname.endsWith('/rooms') && res.request().method() === 'POST'
      );
      await form.getByRole('button', { name: 'Open the table', exact: true }).click();
      await response;
      await form.getByRole('alert').waitFor();
    };
    await submit();
    assert.deepEqual(requests[0], {
      rule_set: 'finnish',
      seats: { seat_2: 'open', seat_3: 'open', seat_4: 'open' },
    });
    await page.getByTestId('new-table-seat-south').click();
    await page
      .getByTestId('seat-picker-container')
      .getByRole('radio', { name: /^100\+ games played, .+/ })
      .click();
    await page.getByTestId('seat-picker-container').waitFor({ state: 'detached' });
    await form.getByRole('radio', { name: 'Louisiana', exact: true }).click();
    await submit();
    assert.deepEqual(
      requests[1],
      {
        rule_set: 'louisiana',
        seats: { seat_2: 'open', seat_3: { type: 'open', min_games: 100 }, seat_4: 'open' },
      },
      'Partner maps to seat_3 and requirement survives retry'
    );
    await page.close();
  }
} finally {
  await browser.close();
}
