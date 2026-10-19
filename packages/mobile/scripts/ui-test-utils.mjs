const seatRowCases = ['setup', 'setup-open', 'opened', 'opened-more'].map(
  (fixture) => `ui-seat-rows-${fixture}`
);
const seatPickerCases = ['choices', 'friends', 'many', 'empty', 'sv'].map(
  (fixture) => `ui-seat-picker-${fixture}`
);

const lobbyCases = [
  'list',
  'badges',
  'locked',
  'empty',
  'rejoin',
  'open',
  'substitute',
  'watch',
  'search-empty',
].map((fixture) => `lobby-${fixture}`);

const passwordCases = [
  'password',
  'password-keypad',
  'password-typed',
  'password-wrong',
  'password-wait',
].map((fixture) => `lobby-${fixture}`);

export const UI_VIEWPORTS = [
  {
    name: 'iphone-insets-portrait',
    width: 402,
    height: 874,
    safeArea: 'iphone-17-portrait',
    cases: ['locale-en-trump', 'locale-sv-trump'],
  },
  {
    name: 'iphone-insets-landscape',
    width: 874,
    height: 402,
    safeArea: 'iphone-17-landscape',
    cases: ['locale-en-settings-system', 'locale-sv-settings-system', 'locale-sv-settings-sv'],
  },
  { name: 'portrait', width: 390, height: 844 },
  // The smallest phone testers hold upright (iPhone SE).
  {
    name: 'small-portrait',
    width: 375,
    height: 667,
    cases: [
      'classic-login',
      'classic-login-guest',
      'locale-sv-classic-login',
      'update-notice',
      'update-notice-friends-guest',
      'table-hand-made',
      'table-hand-set',
      'table-hand-they-set',
      'table-game-over',
      'table-game-over-loss',
      'table-game-over-spectator',
      'table-count-help',
      'locale-sv-table-count-help',
      ...seatRowCases,
      ...passwordCases,
      ...seatPickerCases,
    ],
  },
  {
    name: 'compact-portrait',
    width: 360,
    height: 640,
    cases: [
      'welcome',
      'welcome-guest',
      'update-notice',
      'table-bid-round',
      'table-bid-high',
      'table-count-help',
      'table-last-trick',
      'table-takes-the-rest',
      'locale-sv-table-count-help',
      'locale-sv-table-takes-the-rest',
    ],
  },
  { name: 'landscape', width: 844, height: 390 },
  {
    // The smallest landscape phone testers hold (Galaxy A5).
    name: 'small-landscape',
    width: 640,
    height: 360,
    cases: [
      'table-bidding',
      'table-playing',
      'table-completed-trick',
      'table-trick-pidro',
      'table-trick-pidro-theirs',
      'table-trick-points',
      'table-trick-points-theirs',
      'table-count-help',
      'table-bot-plays',
      'table-long-names',
      'table-long-names-inset',
    ],
  },
  {
    name: 'compact-landscape',
    width: 667,
    height: 375,
    tableOnly: true,
    entryCases: [
      'welcome',
      'welcome-guest',
      'home',
      'home-guest',
      'update-notice',
      'update-notice-home-guest',
    ],
  },
  {
    name: 'tablet-portrait',
    width: 768,
    height: 1024,
    cases: [
      ...seatPickerCases,
      'ui-components',
      'table-bidding',
      'table-count-help',
      'update-notice',
      'table-hand-made',
      'table-hand-set',
      'table-hand-they-set',
      'table-game-over',
      'table-game-over-loss',
    ],
  },
  {
    name: 'home-tablet-portrait',
    width: 820,
    height: 1180,
    lobbyViewport: { name: 'lobby-tablet-portrait', width: 834, height: 1194 },
    cases: [
      'welcome',
      'home',
      'home-guest',
      'update-notice',
      'login',
      'register',
      'register-name',
      'classic-forgot',
      'classic-link-sent',
      'classic-help',
      ...lobbyCases,
      ...passwordCases,
      'create-table',
      ...seatRowCases,
    ],
  },
  {
    name: 'tablet-landscape',
    width: 1024,
    height: 768,
    lobbyViewport: { name: 'lobby-tablet-landscape', width: 1194, height: 834 },
    cases: [
      ...seatPickerCases,
      'table-bidding',
      'table-count-help',
      'table-game-over',
      'table-game-over-loss',
      'welcome',
      'home',
      'home-guest',
      'update-notice',
      ...lobbyCases,
      'create-table',
    ],
  },
];

export function assertInsideViewport(name, box, viewport) {
  const tolerance = 1;
  if (
    box.x < -tolerance ||
    box.y < -tolerance ||
    box.x + box.width > viewport.width + tolerance ||
    box.y + box.height > viewport.height + tolerance
  ) {
    throw new Error(
      `${name} is outside ${viewport.name}: ${JSON.stringify(box)} vs ${viewport.width}x${viewport.height}`
    );
  }
}

// Expo's dev-mode error toast (e.g. a failed lobby fetch when no backend is
// running, as in CI) renders real <button> elements that the touch-target and
// geometry assertions would otherwise flag — Playwright role queries pierce
// its shadow root. It is tooling, not app UI: hide its #error-toast host
// (display:none on the host hides the whole shadow tree, including toasts
// that arrive later).
export async function suppressDevOverlays(page) {
  await page.addStyleTag({
    content: '#error-toast { display: none !important; }',
  });
}

// React Native Web paints an Image's source while it is still loading, so a
// full-screen background (bg.png) fills top-down as its bytes arrive. Wait
// until every image has loaded and decoded before a capture.
export async function waitForImages(page) {
  await page.waitForFunction(() => [...document.images].every((img) => img.complete));
  await page.evaluate(() =>
    Promise.all([...document.images].map((img) => img.decode().catch(() => {})))
  );
}

// RN Web modals use finite CSS animations, including delayed ones. Wait for
// their actual end without stopping the application's ambient animation loops.
// Skia/Reanimated canvas motion has a separate settling window in its caller.
export async function waitForScreenshotReady(page) {
  await page.evaluate(() => document.fonts.ready);
  await waitForImages(page);
  await page.waitForFunction(
    () =>
      document
        .getAnimations()
        .every(
          (animation) =>
            animation.effect?.getComputedTiming().iterations === Infinity ||
            (!animation.pending && animation.playState !== 'running')
        ),
    undefined,
    { timeout: 5000 }
  );
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  );
}

export async function getStableBox(locator, page) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const box = await locator.boundingBox();
    if (box) return box;
    await page.waitForTimeout(150);
  }
  return null;
}

export async function assertMinimumTouchTargets(
  page,
  screenName,
  viewport,
  { checkInputs = false } = {}
) {
  for (const role of ['button', 'link', 'switch', 'radio']) {
    const controls = await page.getByRole(role).all();
    for (let index = 0; index < controls.length; index += 1) {
      if (!(await controls[index].isVisible())) continue;
      const box = await controls[index].boundingBox();
      if (!box || (box.width >= 44 && box.height >= 44)) continue;
      const label =
        (await controls[index].getAttribute('aria-label')) ??
        (await controls[index].textContent())?.trim();
      throw new Error(
        `${screenName} has a sub-44pt ${role} in ${viewport.name}: ${label || index} ${JSON.stringify(box)}`
      );
    }
  }

  if (!checkInputs) return;

  const inputs = await page.locator('input:not([type="checkbox"])').all();
  for (let index = 0; index < inputs.length; index += 1) {
    if (!(await inputs[index].isVisible())) continue;
    const box = await inputs[index].boundingBox();
    if (box && box.height < 44) {
      throw new Error(
        `${screenName} has a sub-44pt input in ${viewport.name}: ${JSON.stringify(box)}`
      );
    }
  }
}
