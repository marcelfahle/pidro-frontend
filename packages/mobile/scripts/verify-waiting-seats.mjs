// RN Web regression coverage. Insets and enlarged text approximate native devices;
// this does not replace VoiceOver/TalkBack or on-device Dynamic Type validation.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { assertMinimumTouchTargets, suppressDevOverlays } from './ui-test-utils.mjs';

const baseUrl = process.env.MOBILE_BASE_URL ?? 'http://localhost:8081';
const shots = process.env.UI_SHOT_DIR ?? '/tmp/pidro-waiting-seats';
const viewports = [
  { name: 'small-iphone', width: 320, height: 568 },
  { name: 'iphone-island', width: 393, height: 852, safeArea: 'island' },
  { name: 'android', width: 360, height: 800, safeArea: 'android' },
  { name: 'landscape', width: 667, height: 375 },
  { name: 'ipad', width: 768, height: 1024 },
  { name: 'ipad-landscape', width: 1024, height: 768 },
];
const positions = ['north', 'east', 'south', 'west'];
const overlaps = (a, b) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const browser = await chromium.launch({ headless: true });
await mkdir(shots, { recursive: true });
let checks = 0;
try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    for (const phase of ['waiting', 'waiting-host', 'ready', 'ready-host']) {
      await page.goto(`${baseUrl}/table-dev?phase=${phase}&safeArea=${viewport.safeArea ?? ''}`);
      await page.getByTestId('waiting-seat-west').waitFor();
      await suppressDevOverlays(page);
      await page.evaluate(() => document.fonts.ready);
      for (const scale of [1, 1.5]) {
        if (scale > 1) {
          const scaled = await page.evaluate(() => {
            const texts = [...document.querySelectorAll('[class*="css-text-"]')];
            const sizes = texts.map((el) => [
              el,
              getComputedStyle(el).fontSize,
              getComputedStyle(el).lineHeight,
            ]);
            for (const [el, font, line] of sizes) {
              el.style.fontSize = `${parseFloat(font) * 1.5}px`;
              if (line !== 'normal') el.style.lineHeight = `${parseFloat(line) * 1.5}px`;
            }
            return texts.length;
          });
          assert(scaled > 0, `${viewport.name}/${phase}: text-scale selector matched no elements`);
        }
        const boxes = [];
        for (const position of positions) {
          const seat = page.getByTestId(`waiting-seat-${position}`);
          const box = await seat.boundingBox();
          assert(box.width > 100, `${viewport.name}/${position} collapsed`);
          assert(
            box.x >= 0 && box.x + box.width <= viewport.width + 1,
            'Seat overflows horizontally'
          );
          boxes.push(box);
          if (position !== 'south') {
            const fits = await page
              .getByTestId(`waiting-name-${position}`)
              .evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
            assert(fits, `${viewport.name}/${phase}/${scale}/${position} ordinary name truncated`);
          }
          await seat.evaluate((el) => el.scrollIntoView({ block: 'center' }));
          const visible = await seat.boundingBox();
          const scroll = await page.getByTestId('waiting-seats-scroll').boundingBox();
          assert(
            visible.y >= scroll.y - 1 && visible.y + visible.height <= viewport.height + 1,
            `${viewport.name}/${phase}/${scale}/${position} not reachable: ${JSON.stringify({ visible, scroll })}`
          );
        }
        // Measure in one scroll position so document coordinates are comparable.
        boxes.length = 0;
        for (const position of positions)
          boxes.push(await page.getByTestId(`waiting-seat-${position}`).boundingBox());
        boxes.push(await page.getByTestId('readiness-panel').boundingBox());
        for (let i = 0; i < boxes.length; i++) {
          for (let j = i + 1; j < boxes.length; j++)
            assert(!overlaps(boxes[i], boxes[j]), 'Seat/panel overlap');
        }
        await assertMinimumTouchTargets(page, phase, viewport);
        assert(
          await page
            .getByTestId('waiting-room-code')
            .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
          `${viewport.name}/${scale}: room code is truncated`
        );
        assert.equal(await page.getByRole('button', { name: /^Manage / }).count(), 0);
        assert.equal(
          await page
            .getByTestId('readiness-panel')
            .getByRole('button', { name: /Invite|Lock/ })
            .count(),
          0
        );
        assert.equal(
          await page.getByTestId('waiting-team-0').getByTestId('waiting-seat-south').count(),
          1
        );
        assert.equal(
          await page.getByTestId('waiting-team-0').getByTestId('waiting-seat-north').count(),
          1
        );
        assert.equal(await page.getByTestId('waiting-ready-north').count(), 1);
        assert.equal(
          await page.getByRole('button', { name: 'Table', exact: true }).count(),
          phase.endsWith('host') ? 1 : 0
        );
        assert.equal(await page.getByRole('button', { name: /Bot.*View profile/ }).count(), 0);
        await page.getByTestId('waiting-seats-scroll').evaluate((el) => {
          el.scrollTop = 0;
        });
        if (phase === 'ready-host' || phase === 'waiting-host')
          await page.screenshot({ path: `${shots}/${viewport.name}-${phase}-${scale}.png` });
        checks++;
      }
      if (phase.endsWith('host')) {
        await page.getByRole('button', { name: 'Table', exact: true }).click();
        assert.equal(
          await page.getByRole('button', { name: /^Manage / }).count(),
          phase.startsWith('ready') ? 2 : 1
        );
        await assertMinimumTouchTargets(page, 'table-menu', viewport);
        await page.getByRole('button', { name: 'Lock joins', exact: true }).click();
        await page.getByRole('button', { name: 'Unlock joins', exact: true }).waitFor();
        if (viewport.name === 'android' && phase === 'ready-host') {
          await page.waitForTimeout(400);
          await page.screenshot({ path: `${shots}/table-menu.png` });
        }
        await page.getByRole('button', { name: 'Close', exact: true }).click();
      }
    }
    await page.goto(`${baseUrl}/table-dev?phase=ready-host&role=spectator`);
    await page.getByRole('button', { name: 'Back to lobby', exact: true }).waitFor();
    await page.getByText('Watching', { exact: true }).waitFor();
    await page.getByText('North / South', { exact: true }).waitFor();
    await page.getByText('East / West', { exact: true }).waitFor();
    assert.equal(
      await page.getByRole('button', { name: /I'm ready|Table|Invite|^Manage / }).count(),
      0
    );
    assert.equal(await page.getByText('You', { exact: true }).count(), 0);
    if (viewport.name === 'android') await page.screenshot({ path: `${shots}/spectator.png` });
    await page.close();
  }

  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${baseUrl}/table-dev?phase=ready-host`);
  const avatar = async (position) =>
    page.getByTestId(`waiting-seat-${position}`).locator('img').getAttribute('src');
  const westAvatar = await avatar('west');
  const eastAvatar = await avatar('east');
  assert.notEqual(westAvatar, eastAvatar);
  await page.getByRole('button', { name: "I'm ready", exact: true }).click();
  await page.getByRole('button', { name: "You're ready", exact: true }).waitFor();
  assert.equal(await avatar('west'), westAvatar, 'Readiness changed avatar');
  assert.equal(await page.getByTestId('waiting-ready-south').count(), 1);
  await page.getByRole('button', { name: 'Table', exact: true }).click();
  await page.getByRole('button', { name: 'Manage mfand1', exact: true }).click();
  await page.getByRole('button', { name: 'Remove from table', exact: true }).click();
  await page.getByTestId('waiting-seat-east').getByText('Open seat', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Manage mfios1', exact: true }).click();
  await page.getByRole('button', { name: /Move to Opponents.*East/i }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByTestId('waiting-seat-east').getByText('mfios1', { exact: true }).waitFor();
  assert.equal(await avatar('east'), westAvatar, 'Moved player lost avatar');
  await page.getByTestId('waiting-seat-west').getByText('Open seat', { exact: true }).waitFor();

  await page.goto(`${baseUrl}/table-dev?phase=ready&viewer=east`);
  await page
    .getByTestId('waiting-seat-east')
    .getByRole('button', { name: /mfand1, You, Pending/ })
    .waitFor();
  await page
    .getByTestId('waiting-seat-west')
    .getByRole('button', { name: /mfios1, Partner, Ready/ })
    .waitFor();
  assert.equal(await avatar('east'), eastAvatar, 'Viewer rotation changed identity');

  await page.route('**/api/v1/**', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          user_id: 'p-west',
          username: 'Alexandria the Long-Named Player',
          display_name: null,
          avatar_url: null,
          bio: null,
        },
      }),
    })
  );
  await page.goto(`${baseUrl}/table-dev?phase=ready-host&names=long`);
  const name = page.getByTestId('waiting-name-west');
  assert(
    await name.evaluate((el) => el.scrollWidth > el.clientWidth),
    'Long-name fixture does not exercise truncation'
  );
  await page
    .getByTestId('waiting-seat-west')
    .getByRole('button', { name: /Alexandria the Long-Named Player.*View profile/ })
    .click();
  await page.getByText('Player profile', { exact: true }).waitFor();
  await page.getByText('Alexandria the Long-Named Player', { exact: true }).last().waitFor();
  await page.waitForTimeout(400); // Let the native modal's fade finish before capturing.
  await page.screenshot({ path: `${shots}/full-name-profile.png` });
  await page.close();
  console.log(
    `waiting-seats ok: ${checks} layout/text-scale cases; readiness, removal, move, viewer rotation and full-name profile checked`
  );
} finally {
  await browser.close();
}
