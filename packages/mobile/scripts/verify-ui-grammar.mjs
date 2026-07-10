import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import {
  assertInsideViewport,
  assertMinimumTouchTargets,
  getStableBox,
  UI_VIEWPORTS,
} from './ui-test-utils.mjs';

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(mobileRoot, '../../..');
const baseUrl = process.env.MOBILE_BASE_URL ?? 'http://localhost:8081';
const screenshotRoot = resolve(repoRoot, 'screenshots/agent-mobile-ui');

const cases = [
  { name: 'login', path: '/(auth)/login', testId: 'auth-window' },
  { name: 'register', path: '/(auth)/register', testId: 'auth-window' },
  { name: 'ui-components', path: '/ui-dev?state=components', testId: 'ui-foundation-panel' },
  { name: 'create-table', path: '/ui-dev?state=create', testId: 'create-room-window' },
  { name: 'table-waiting', path: '/table-dev?phase=waiting', testId: 'waiting-table' },
  { name: 'table-playing', path: '/table-dev?phase=playing', testId: 'seat-north' },
  {
    name: 'table-bidding',
    path: '/table-dev?phase=bidding',
    testId: 'bidding-window',
    protectNorthSeat: true,
  },
  {
    name: 'table-trump',
    path: '/table-dev?phase=declaring',
    testId: 'trump-window',
    protectNorthSeat: true,
  },
  {
    name: 'table-hand-selection',
    path: '/table-dev?phase=second_deal',
    testId: 'hand-selection-window',
    protectNorthSeat: true,
  },
  { name: 'table-game-over', path: '/table-dev?phase=game_over', testId: 'game-over-window' },
];

function boxesOverlap(a, b) {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

async function assertTargetGeometry(page, testCase, viewport) {
  const target = testCase.testId ? page.getByTestId(testCase.testId).first() : null;
  if (target) {
    await target.waitFor({ state: 'visible', timeout: 20_000 });
    const box = await getStableBox(target, page);
    if (!box) throw new Error(`${testCase.name} target has no geometry`);
    assertInsideViewport(`${testCase.name} target`, box, viewport);

    if (testCase.protectNorthSeat) {
      const northSeat = page.getByTestId('seat-north').first();
      await northSeat.waitFor({ state: 'visible', timeout: 20_000 });
      const northBox = await getStableBox(northSeat, page);
      if (northBox && boxesOverlap(box, northBox)) {
        throw new Error(
          `${testCase.name} overlaps the north player plaque in ${viewport.name}: window=${JSON.stringify(box)} seat=${JSON.stringify(northBox)}`
        );
      }
    }
  } else if (testCase.text) {
    await page.getByText(testCase.text, { exact: true }).first().waitFor({ timeout: 15_000 });
  }

  await assertMinimumTouchTargets(page, testCase.name, viewport, { checkInputs: true });
}

async function main() {
  await mkdir(screenshotRoot, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  const results = [];

  try {
    for (const viewport of UI_VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
      });
      const screenshotDir = resolve(screenshotRoot, viewport.name);
      await mkdir(screenshotDir, { recursive: true });

      for (const testCase of cases) {
        const page = await context.newPage();
        const pageErrors = [];
        page.on('pageerror', (error) => pageErrors.push(String(error?.message ?? error)));

        try {
          const response = await page.goto(`${baseUrl}${testCase.path}`, {
            waitUntil: 'domcontentloaded',
            timeout: 30_000,
          });
          if (!response?.ok()) {
            throw new Error(`${testCase.path} returned ${response?.status() ?? 'no response'}`);
          }
          await assertTargetGeometry(page, testCase, viewport);
          await page.waitForTimeout(testCase.path.startsWith('/table-dev') ? 1_200 : 150);
          if (pageErrors.length) {
            throw new Error(`${testCase.name} page errors: ${pageErrors.join(' | ')}`);
          }
          await page.screenshot({
            path: resolve(screenshotDir, `${testCase.name}.png`),
            fullPage: false,
          });
          results.push(`${viewport.name}/${testCase.name}`);
        } finally {
          await page.close();
        }
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }

  console.log(`ui-grammar ok: ${results.length} captures and geometry checks`);
  results.forEach((result) => console.log(`  ${result}`));
}

main().catch((error) => {
  console.error(
    `UI grammar verification failed. Start Expo web first (MOBILE_BASE_URL=${baseUrl}).`
  );
  console.error(error);
  process.exit(1);
});
