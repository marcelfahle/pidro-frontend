import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import {
  assertInsideViewport,
  assertMinimumTouchTargets,
  getStableBox,
  suppressDevOverlays,
  UI_VIEWPORTS,
} from './ui-test-utils.mjs';

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(mobileRoot, '../../..');
const baseUrl = process.env.MOBILE_BASE_URL ?? 'http://localhost:8081';
const screenshotRoot = resolve(repoRoot, 'screenshots/agent-mobile-ui');

const cases = [
  { name: 'home', path: '/home', testId: 'home-screen' },
  { name: 'lobby', path: '/lobby', testId: 'lobby-screen' },
  { name: 'login', path: '/(auth)/login', testId: 'auth-window' },
  { name: 'register', path: '/(auth)/register', testId: 'auth-window' },
  { name: 'ui-components', path: '/ui-dev?state=components', testId: 'ui-foundation-panel' },
  { name: 'create-table', path: '/ui-dev?state=create', testId: 'create-room-window' },
  { name: 'table-waiting', path: '/table-dev?phase=waiting', testId: 'waiting-table' },
  { name: 'table-playing', path: '/table-dev?phase=playing', testId: 'seat-north' },
  {
    name: 'table-dealer-selection',
    path: '/table-dev?phase=dealer_selection',
    testId: 'seat-north',
    verifyDealerCutCards: true,
  },
  {
    name: 'table-completed-trick',
    path: '/table-dev?phase=playing&autoplay=true',
    testId: 'seat-north',
    verifyPlayedCardPersistence: true,
  },
  {
    name: 'table-bidding',
    path: '/table-dev?phase=bidding',
    testId: 'bidding-window',
    protectNorthSeat: true,
    protectPlayerHand: true,
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

    if (testCase.protectPlayerHand) {
      await assertAbovePlayerHand(page, testCase.name, box, viewport);
      await assertBidGridLayout(page, viewport);
    }

    if (testCase.name === 'table-playing') {
      await assertSeatPlacement(page, viewport);
    }
  } else if (testCase.text) {
    await page.getByText(testCase.text, { exact: true }).first().waitFor({ timeout: 15_000 });
  }

  await assertMinimumTouchTargets(page, testCase.name, viewport, { checkInputs: true });
}

async function assertBiddingRevealSequence(page, viewport) {
  const biddingWindow = page.getByTestId('bidding-window').first();

  // The bidding controls must not race ahead of the deal animation. A player
  // should see and be able to read the complete hand before being asked to act.
  await page.waitForTimeout(250);
  if (await biddingWindow.isVisible()) {
    throw new Error(`bidding controls appeared before the hand in ${viewport.name}`);
  }

  await page.getByTestId('rendered-hand-card-count-6').first().waitFor({ state: 'attached' });
  await page.waitForTimeout(350);
  if (await biddingWindow.isVisible()) {
    throw new Error(`bidding controls appeared while the hand was still dealing in ${viewport.name}`);
  }

  await biddingWindow.waitFor({ state: 'visible', timeout: 20_000 });
}

async function assertPlayedCardPersistence(page, viewport) {
  const fourCards = page.getByTestId('rendered-played-card-count-4').first();
  await fourCards.waitFor({ state: 'attached', timeout: 20_000 });

  // The fake server promotes the current trick into completed history after
  // 800ms. The same four sprites must still be present after that transition.
  await page.waitForTimeout(1_300);
  if ((await fourCards.count()) !== 1) {
    throw new Error(`completed trick disappeared from the table in ${viewport.name}`);
  }
}

async function assertDealerCutCards(page, viewport) {
  const fourCards = page.getByTestId('rendered-cut-card-count-4').first();
  await fourCards.waitFor({ state: 'attached', timeout: 20_000 });

  if ((await fourCards.count()) !== 1) {
    throw new Error(`dealer selection did not show all four cut cards in ${viewport.name}`);
  }
}

async function assertAbovePlayerHand(page, name, box, viewport) {
  const handBoundary = page.getByTestId('player-hand-top').first();
  await handBoundary.waitFor({ state: 'attached', timeout: 20_000 });
  const handBox = await getStableBox(handBoundary, page);
  if (!handBox) throw new Error(`${name} player-hand boundary has no geometry`);
  const handTop = handBox.y;

  if (box.y + box.height > handTop - 8) {
    throw new Error(
      `${name} obscures the player hand in ${viewport.name}: window=${JSON.stringify(box)} protectedHandTop=${handTop}`
    );
  }
}

async function assertBidGridLayout(page, viewport) {
  const bidButtons = await page.getByRole('button', { name: /^Bid \d+$/ }).all();
  if (bidButtons.length !== 9) {
    throw new Error(
      `bidding grid has ${bidButtons.length} values instead of 9 in ${viewport.name}`
    );
  }

  const boxes = [];
  for (const button of bidButtons) {
    const box = await getStableBox(button, page);
    if (!box) throw new Error(`bidding grid has a value without geometry in ${viewport.name}`);
    boxes.push(box);
  }

  const uniqueCoordinates = (values) => {
    const unique = [];
    for (const value of values.sort((a, b) => a - b)) {
      if (!unique.some((candidate) => Math.abs(candidate - value) <= 2)) unique.push(value);
    }
    return unique;
  };
  const columns = uniqueCoordinates(boxes.map((box) => box.x));
  const rows = uniqueCoordinates(boxes.map((box) => box.y));
  if (columns.length !== 3 || rows.length !== 3) {
    throw new Error(
      `bidding values are not a 3x3 grid in ${viewport.name}: columns=${columns.length} rows=${rows.length}`
    );
  }

  const passBox = await getStableBox(page.getByRole('button', { name: 'Pass' }), page);
  const gridBottom = Math.max(...boxes.map((box) => box.y + box.height));
  if (!passBox || passBox.y < gridBottom + 4) {
    throw new Error(
      `Pass is not below the bidding grid in ${viewport.name}: pass=${JSON.stringify(passBox)} gridBottom=${gridBottom}`
    );
  }
}

async function assertSeatPlacement(page, viewport) {
  const entries = await Promise.all(
    ['north', 'east', 'south', 'west'].map(async (position) => {
      const locator = page.getByTestId(`seat-${position}`).first();
      await locator.waitFor({ state: 'visible', timeout: 20_000 });
      const box = await getStableBox(locator, page);
      if (!box) throw new Error(`seat-${position} has no landscape geometry`);
      return [position, box];
    })
  );
  const seats = Object.fromEntries(entries);
  const centerX = (box) => box.x + box.width / 2;
  const horizontalCenter = viewport.width / 2;
  const portrait = viewport.height >= viewport.width;

  const centeredPositions = portrait ? ['north', 'south'] : [];
  for (const position of centeredPositions) {
    if (Math.abs(centerX(seats[position]) - horizontalCenter) > 2) {
      throw new Error(
        `seat-${position} is not horizontally centered: ${JSON.stringify(seats[position])}`
      );
    }
  }

  if (!portrait && seats.south.x + seats.south.width >= horizontalCenter - 8) {
    throw new Error(
      `seat-south is not parked left of the landscape hand: ${JSON.stringify(seats.south)}`
    );
  }

  if (!portrait && seats.north.x <= horizontalCenter + 8) {
    throw new Error(
      `seat-north is not parked right of the landscape hand: ${JSON.stringify(seats.north)}`
    );
  }

  if (portrait) {
    const utilityDock = page.getByTestId('table-utility-dock').first();
    await utilityDock.waitFor({ state: 'visible', timeout: 20_000 });
    const dockBox = await getStableBox(utilityDock, page);
    if (!dockBox) throw new Error('portrait utility dock has no geometry');
    assertInsideViewport('portrait utility dock', dockBox, viewport);
    if (Math.abs(dockBox.y + dockBox.height - viewport.height) > 2) {
      throw new Error(`portrait utility dock is not bottom-anchored: ${JSON.stringify(dockBox)}`);
    }
    if (seats.south.y + seats.south.height > dockBox.y - 4) {
      throw new Error(
        `seat-south overlaps the portrait utility dock: south=${JSON.stringify(seats.south)} dock=${JSON.stringify(dockBox)}`
      );
    }
  }

  const maxSeatWidth = portrait ? 112 : 126;
  for (const position of ['north', 'east', 'south', 'west']) {
    if (seats[position].width > maxSeatWidth) {
      throw new Error(
        `seat-${position} exceeds the compact ${viewport.name} width: ${JSON.stringify(seats[position])}`
      );
    }
  }

  if (Math.abs(seats.east.y - seats.west.y) > 2 || seats.east.y <= seats.north.y + 12) {
    throw new Error(
      `opponent seats do not form the intended landscape triangle: north=${JSON.stringify(seats.north)} east=${JSON.stringify(seats.east)} west=${JSON.stringify(seats.west)}`
    );
  }

  if (seats.south.y <= seats.east.y + seats.east.height) {
    throw new Error(
      `seat-south is not below the opponent row: south=${JSON.stringify(seats.south)}`
    );
  }
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
        if (viewport.tableOnly && !testCase.path.startsWith('/table-dev')) continue;
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
          await suppressDevOverlays(page);
          if (testCase.name === 'table-bidding') {
            await assertBiddingRevealSequence(page, viewport);
          }
          if (testCase.verifyPlayedCardPersistence) {
            await assertPlayedCardPersistence(page, viewport);
          }
          if (testCase.verifyDealerCutCards) {
            await assertDealerCutCards(page, viewport);
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
