import { access, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { partitionCases, verifyCoverage } from './ui-shards.mjs';
import {
  assertInsideViewport,
  assertMinimumTouchTargets,
  getStableBox,
  suppressDevOverlays,
  UI_VIEWPORTS,
  waitForImages,
  waitForScreenshotReady,
} from './ui-test-utils.mjs';

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(mobileRoot, '../../..');
const baseUrl = process.env.MOBILE_BASE_URL ?? 'http://localhost:8081';
const screenshotRoot = process.env.UI_SHOT_DIR ?? resolve(repoRoot, 'screenshots/agent-mobile-ui');
const nameList = (value) =>
  new Set(
    (value ?? '')
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)
  );
const requestedCases = nameList(process.env.UI_CASES);
const requestedViewports = nameList(process.env.UI_VIEWPORTS);
const authFixture = JSON.stringify({
  state: {
    accessToken: 'ui-grammar-token',
    refreshToken: null,
    user: { id: 'ui-grammar-user', username: 'Bengt', age_band: '18_plus' },
  },
  version: 0,
});
const guestAuthFixture = JSON.stringify({
  state: {
    accessToken: 'ui-grammar-guest-token',
    refreshToken: null,
    user: {
      id: 'ui-grammar-guest',
      username: 'guest_7KQ4M2XB',
      display_name: 'Lucky Moose',
      guest: true,
      age_band: '18_plus',
    },
  },
  version: 0,
});
const ageGateFixture = JSON.stringify({
  state: { ageBand: '18_plus', termsVersion: '1' },
  version: 0,
});

const allCases = [
  { name: 'home', path: '/home', testId: 'home-screen', authenticated: true },
  ...['empty', 'list', 'added-you', 'loading', 'error'].map((fixture) => ({
    name: `friends-${fixture}`,
    path: `/friends?fixture=${fixture}`,
    testId: 'friends-screen',
    authenticated: true,
  })),
  ...['profile', 'remove'].map((state) => ({
    name: `friends-${state}`,
    path: '/friends?fixture=list',
    testId: 'player-profile-modal',
    authenticated: true,
    open: "View Nora's profile",
  })),
  ...['recent', 'results'].map((fixture) => ({
    name: `friends-${fixture}`,
    path: `/friends-add?fixture=${fixture}`,
    testId: 'friends-add-screen',
    authenticated: true,
  })),
  {
    name: 'friends-guest',
    path: '/friends',
    testId: 'auth-sheet',
    authenticated: true,
    authFixture: guestAuthFixture,
  },
  {
    name: 'home-guest',
    path: '/home',
    testId: 'home-screen',
    authenticated: true,
    authFixture: guestAuthFixture,
  },
  {
    name: 'home-table-unknown',
    path: '/home?fixture=table-unknown',
    testId: 'home-screen',
    authenticated: true,
  },
  {
    name: 'game-away',
    path: '/game/AWAY01?fixture=away',
    testId: 'game-away-window',
    authenticated: true,
  },
  { name: 'profile', path: '/profile', testId: 'profile-screen', authenticated: true },
  {
    name: 'profile-guest',
    path: '/profile',
    testId: 'profile-screen',
    authenticated: true,
    authFixture: guestAuthFixture,
  },
  {
    name: 'profile-badges',
    path: '/profile',
    testId: 'badge-sheet',
    authenticated: true,
    open: 'Your badges',
  },
  { name: 'settings', path: '/settings', testId: 'settings-screen', authenticated: true },
  {
    name: 'update-notice',
    path: '/home?fixture=update-notice&safeArea=island',
    testId: 'update-notice',
    authenticated: true,
  },
  { name: 'league', path: '/league', testId: 'league-screen', authenticated: true },
  { name: 'device-settings', path: '/device-settings', testId: 'settings-screen' },
  ...[
    'list',
    'badges',
    'locked',
    'empty',
    'rejoin',
    'open',
    'substitute',
    'watch',
    'search-empty',
  ].map((fixture) => ({
    name: `lobby-${fixture}`,
    path: `/lobby?fixture=${fixture}`,
    testId: fixture === 'empty' ? 'lobby-empty' : 'lobby-screen',
    authenticated: true,
    lobbyFixture: fixture,
  })),
  ...['finnish', 'louisiana'].flatMap((ruleSet) => [
    {
      name: `create-table-${ruleSet}`,
      path: `/ui-dev?state=create&fixture=${ruleSet}`,
      testId: 'create-room-window',
      ruleSet,
      rulesSelector: 'create-rule-set',
    },
    {
      name: `settings-${ruleSet}`,
      path: `/ui-dev?state=settings&fixture=${ruleSet}`,
      testId: 'settings-screen',
      ruleSet,
      rulesSelector: 'settings-preferred-rules',
    },
    ...[false, true].map((authenticated) => ({
      name: `join-${ruleSet}-${authenticated ? 'confirm' : 'preview'}`,
      path: `/join/7KQ4M2XB?fixture=${ruleSet}`,
      testId: 'join-invite-window',
      authenticated,
      ruleSet,
      rulesBadge: 'invite-rule-set',
    })),
  ]),
  {
    name: 'join-louisiana-manual-confirm',
    path: '/join/7KQ4M2XB?source=typed&fixture=louisiana',
    testId: 'join-invite-window',
    authenticated: true,
    ruleSet: 'louisiana',
    rulesBadge: 'invite-rule-set',
  },
  {
    name: 'join-code-louisiana-confirm',
    path: '/join-code',
    testId: 'join-invite-window',
    authenticated: true,
    ruleSet: 'louisiana',
    rulesBadge: 'invite-rule-set',
    manualCode: true,
  },
  ...[
    'finnish',
    'louisiana',
    'louisiana-bidding',
    'louisiana-explainer',
    'louisiana-game-over',
    'louisiana-waiting',
    'louisiana-waiting-explainer',
  ].map((fixture) => ({
    name: `table-${fixture}`,
    path: `/table-dev?fixture=${fixture}`,
    testId: fixture.endsWith('explainer')
      ? 'rules-explainer'
      : fixture.includes('waiting')
        ? 'waiting-table'
        : fixture.endsWith('game-over')
          ? 'game-over-window'
          : 'seat-north',
    ruleSet: fixture.startsWith('louisiana') ? 'louisiana' : 'finnish',
    rulesBadge: fixture.includes('waiting')
      ? 'waiting-rule-set'
      : fixture.endsWith('game-over')
        ? 'game-over-rule-set'
        : 'table-rule-set',
    rulesExplainer: fixture.endsWith('explainer'),
  })),
  { name: 'age', path: '/age?fixture=unanswered', testId: 'age-screen' },
  { name: 'age-selected', path: '/age?fixture=selected', testId: 'age-screen' },
  { name: 'welcome', path: '/welcome', testId: 'welcome-window' },
  {
    name: 'welcome-guest',
    path: '/welcome',
    testId: 'welcome-window',
  },
  {
    name: 'welcome-invite',
    path: '/welcome',
    testId: 'welcome-window',
    pendingInvite: true,
  },
  { name: 'login', path: '/(auth)/login?fixture=providers', testId: 'auth-window' },
  { name: 'register', path: '/(auth)/register?fixture=providers', testId: 'auth-window' },
  {
    name: 'register-password',
    path: '/(auth)/register?fixture=password',
    testId: 'auth-window',
    authenticated: true,
    authFixture: guestAuthFixture,
  },
  {
    name: 'register-email-taken',
    path: '/(auth)/register?fixture=email-taken',
    testId: 'auth-window',
  },
  {
    name: 'register-name',
    path: '/(auth)/register?fixture=name-taken',
    testId: 'auth-window',
    authenticated: true,
    authFixture: guestAuthFixture,
  },
  {
    name: 'classic-method',
    path: '/(auth)/claim-classic?fixture=method',
    testId: 'claim-classic-screen',
  },
  {
    name: 'classic-preview',
    path: '/(auth)/claim-classic?fixture=preview',
    testId: 'claim-classic-screen',
    authenticated: true,
  },
  {
    name: 'classic-guest',
    path: '/(auth)/claim-classic?fixture=preview',
    testId: 'claim-classic-screen',
    authenticated: true,
    authFixture: guestAuthFixture,
  },
  {
    name: 'classic-fresh',
    path: '/(auth)/claim-classic?fixture=preview',
    testId: 'claim-classic-screen',
  },
  {
    name: 'classic-rename',
    path: '/(auth)/claim-classic?fixture=rename',
    testId: 'claim-classic-screen',
    authenticated: true,
  },
  {
    name: 'classic-conflict',
    path: '/(auth)/claim-classic?fixture=already-claimed',
    testId: 'claim-classic-screen',
    authenticated: true,
  },
  {
    name: 'classic-conflict-fresh',
    path: '/(auth)/claim-classic?fixture=already-claimed',
    testId: 'claim-classic-screen',
  },
  {
    name: 'classic-forgot',
    path: '/(auth)/classic-forgot',
    testId: 'classic-forgot-window',
  },
  {
    name: 'classic-link-sent',
    path: '/(auth)/classic-forgot?fixture=sent',
    testId: 'classic-link-sent',
  },
  { name: 'classic-help', path: '/(auth)/classic-help', testId: 'classic-help-window' },
  { name: 'auth-sheet', path: '/auth-flow-dev', testId: 'auth-flow-dev' },
  { name: 'forgot-password', path: '/(auth)/forgot-password', testId: 'auth-window' },
  {
    name: 'reset-password',
    path: '/(auth)/reset-password?token=fixture-token',
    testId: 'auth-window',
  },
  {
    name: 'reset-password-refused',
    path: '/(auth)/reset-password?token=fixture-token&fixture=refused',
    testId: 'auth-window',
  },
  { name: 'join-code', path: '/join-code', testId: 'join-code-window' },
  {
    name: 'join-invite',
    path: '/join/7KQ4M2XB?source=copy&fixture=open',
    testId: 'join-invite-window',
  },
  { name: 'ui-components', path: '/ui-dev?state=components', testId: 'ui-foundation-panel' },
  {
    name: 'ui-progression',
    path: '/ui-dev?state=progression',
    testId: 'ui-progression-panel',
  },
  { name: 'ui-avatars', path: '/ui-dev?state=avatars', testId: 'ui-avatars-panel' },
  ...['default', 'open', 'requirement', 'bots', 'friend'].map((fixture) => ({
    name: fixture === 'default' ? 'create-table' : `create-table-${fixture}`,
    path: `/ui-dev?state=create&fixture=${fixture}`,
    testId: 'create-room-window',
    createFixture: fixture,
  })),
  { name: 'table-waiting', path: '/table-dev?phase=waiting', testId: 'waiting-table' },
  {
    name: 'table-waiting-notice',
    path: '/table-dev?phase=ready-host&notice=true',
    testId: 'table-feedback',
    protectNorthSeat: true,
  },
  {
    name: 'table-ready',
    path: '/table-dev?phase=ready',
    testId: 'waiting-table',
    verifyReadiness: true,
  },
  {
    name: 'table-ready-host',
    path: '/table-dev?phase=ready-host',
    testId: 'waiting-table',
    verifyReadiness: true,
  },
  {
    name: 'table-host-controls',
    path: '/table-dev?phase=waiting-host',
    testId: 'waiting-table',
  },
  {
    name: 'table-invite',
    path: '/table-dev?phase=waiting-host&invite=true',
    testId: 'invite-window',
  },
  { name: 'table-playing', path: '/table-dev?phase=playing', testId: 'seat-north' },
  {
    name: 'table-notice',
    path: '/table-dev?phase=playing&feedback=notice',
    testId: 'table-feedback',
    protectNorthSeat: true,
  },
  {
    name: 'table-reconnecting-banner',
    path: '/table-dev?phase=playing&role=player&connection=lost',
    testId: 'connection-banner',
    protectNorthSeat: true,
  },
  ...['island-left', 'island-right'].map((safeArea) => ({
    name: `table-playing-${safeArea}`,
    path: `/table-dev?phase=playing&safeArea=${safeArea}`,
    testId: 'seat-north',
    sideInsets: safeArea === 'island-left' ? { left: 59, right: 0 } : { left: 0, right: 59 },
  })),
  {
    name: 'table-seats-reconnecting',
    path: '/table-dev?phase=playing&lifecycle=reconnecting',
    testId: 'seat-north',
  },
  {
    name: 'table-seats-bot',
    path: '/table-dev?phase=playing&lifecycle=bot_substitute',
    testId: 'seat-north',
  },
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
  // PID-219: a trick holding a five pops "Pidro!"; a hand ends with its result.
  {
    name: 'table-trick-pidro',
    path: '/table-dev?phase=playing&signals=pidro&autoplay=true',
    testId: 'trick-pop-pidro',
  },
  { name: 'table-hand-made', path: '/table-dev?phase=playing&hand=made', testId: 'hand-result' },
  { name: 'table-hand-set', path: '/table-dev?phase=playing&hand=set', testId: 'hand-result' },
  // PID-221: the ticker at its fullest, long names included, stays clear of the
  // plaque and the North seat; the hand log opens from it. Small phones leave
  // the ticker out (PID-229).
  {
    name: 'table-ticker',
    path: '/table-dev?phase=playing&ticker=full&names=long',
    testId: 'ticker-line-bid-4-south',
    protectNorthSeat: true,
    skipViewports: ['compact-landscape'],
  },
  {
    name: 'table-hand-log',
    path: '/table-dev?phase=playing',
    open: "Recent table actions. Opens this hand's log.",
    testId: 'hand-log-entry-trump-4',
    skipViewports: ['compact-landscape'],
  },
  {
    name: 'table-bidding',
    path: '/table-dev?phase=bidding',
    testId: 'bidding-window',
    protectNorthSeat: true,
    protectPlayerHand: true,
  },
  // PID-214: against three bots, every seat keeps its bid and the high bid is
  // named, on the small phones that leave the ticker out too. `high`: you hold
  // it, and your tight seat says so under its avatar.
  {
    name: 'table-bid-round',
    path: '/table-dev?phase=bidding&role=player&bids=round',
    testId: 'bidding-window',
    protectNorthSeat: true,
    protectPlayerHand: true,
    bidLines: { west: 'Passed', north: 'Bid 7', east: 'Bid 9 · high' },
    viewports: { 'compact-landscape': { width: 640, height: 360 } },
  },
  {
    name: 'table-bid-high',
    path: '/table-dev?phase=bidding&role=player&bids=high',
    testId: 'seat-south',
    bidLines: { north: 'Bid 7', east: 'Passed', south: 'Bid 9 · high' },
    viewports: { 'compact-landscape': { width: 640, height: 360 } },
  },
  {
    name: 'table-trump',
    path: '/table-dev?phase=declaring',
    testId: 'trump-window',
    protectNorthSeat: true,
  },
  {
    name: 'table-hand-selection',
    path: '/table-dev?phase=second_deal&role=player&dealer=south',
    testId: 'hand-selection-window',
    protectNorthSeat: true,
    verifyDealerSelection: true,
  },
  {
    name: 'table-dealer-waiting',
    path: '/table-dev?phase=second_deal&role=player&dealer=north',
    testId: 'dealer-second-deal-status',
    protectNorthSeat: true,
    verifyDealerPrivacy: true,
  },
  {
    name: 'table-automatic-dealer-rob',
    path: '/table-dev?phase=auto_rob&role=player&dealer=south',
    testId: 'automatic-dealer-rob',
    widths: [390],
    heights: [844],
  },
  { name: 'table-game-over', path: '/table-dev?phase=game_over', testId: 'game-over-window' },
  {
    name: 'table-game-over-guest',
    path: '/table-dev?phase=game_over&guest=true',
    testId: 'game-over-window',
  },
  {
    name: 'table-game-over-rematch-waiting',
    path: '/table-dev?phase=game_over&rematch=waiting',
    testId: 'rematch-status',
  },
  {
    name: 'table-game-over-rematch-asked',
    path: '/table-dev?phase=game_over&rematch=asked',
    testId: 'rematch-status',
  },
];

const localizationCases = ['en', 'sv'].flatMap((locale) => [
  ...['system', 'en', 'sv'].map((language) => ({
    name: `locale-${locale}-settings-${language}`,
    path: `/ui-dev?state=settings&locale=${locale}&language=${language}&deviceLocale=${locale}-FI`,
    testId: 'settings-screen',
    locale,
    language,
  })),
  ...[
    ['waiting', 'waiting', 'waiting-table'],
    ['bidding', 'bidding', 'bidding-window'],
    ['trump', 'declaring', 'trump-window'],
    ['hand-selection', 'second_deal&role=player&dealer=south', 'hand-selection-window'],
    ['game-over', 'game_over', 'game-over-window'],
    ['dealer', 'dealer_selection', 'seat-north'],
    ['playing', 'playing', 'seat-north'],
  ].map(([name, phase, testId]) => ({
    name: `locale-${locale}-${name}`,
    path: `/table-dev?phase=${phase}&locale=${locale}&language=${locale}`,
    testId,
    locale,
    protectNorthSeat: ['bidding', 'trump', 'hand-selection'].includes(name),
  })),
]);
allCases.push(...localizationCases);

async function assertLocalization(page, testCase, viewport) {
  if (!testCase.locale) return;
  const clipped = await page.locator('[dir="auto"]').evaluateAll((nodes) =>
    nodes
      .filter((node) => node.getBoundingClientRect().width && node.getClientRects().length)
      // Public player names deliberately ellipsize; localized sentences may not.
      .filter((node) => !['Alexandria the Long-Named Player'].includes(node.textContent))
      .filter(
        (node) =>
          getComputedStyle(node).overflow === 'hidden' &&
          (node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1)
      )
      .map((node) => node.textContent)
  );
  assert.deepEqual(clipped, [], `${testCase.name}: clipped natural text in ${viewport.name}`);
  if (testCase.locale === 'sv') {
    const expected = testCase.language
      ? 'Språk'
      : testCase.name.endsWith('-trump')
        ? 'Välj trumf'
        : testCase.name.endsWith('-hand-selection')
          ? 'Välj din hand'
          : null;
    if (expected) await page.getByText(expected, { exact: true }).waitFor();
  }
  if (testCase.language) {
    const group = page.getByTestId('settings-language');
    const labels = [
      testCase.locale === 'sv' ? 'Enhetens språk' : 'System language',
      'English',
      'Svenska',
    ];
    const selected = ['system', 'en', 'sv'].indexOf(testCase.language);
    const groupBox = await group.boundingBox();
    for (const [index, label] of labels.entries()) {
      const radio = group.getByRole('radio', { name: label, exact: true });
      const box = await radio.boundingBox();
      assert.ok(box.height >= 48, `${label}: 48pt target`);
      assert.ok(
        box.x >= groupBox.x && box.x + box.width <= groupBox.x + groupBox.width,
        `${label}: radio must stay within the language Surface`
      );
      assert.equal(await radio.getAttribute('aria-checked'), String(index === selected));
    }
    if (testCase.language === 'system') {
      await group
        .getByText(
          `${testCase.locale === 'sv' ? 'Just nu' : 'Currently'}: ${testCase.locale === 'sv' ? 'Svenska' : 'English'}`,
          { exact: true }
        )
        .waitFor();
    }
    const before = await page.evaluate(() => localStorage.getItem('settings-storage'));
    await group.getByRole('radio', { name: 'Svenska', exact: true }).click();
    await group.getByText('Språk', { exact: true }).waitFor();
    await group.getByRole('radio', { name: 'English', exact: true }).click();
    await group.getByText('Language', { exact: true }).waitFor();
    await group.getByRole('radio', { name: 'English', exact: true }).press('ArrowRight');
    await group.getByText('Språk', { exact: true }).waitFor();
    assert.equal(
      await group.getByRole('radio', { name: 'Svenska', exact: true }).getAttribute('aria-checked'),
      'true'
    );
    assert.equal(await page.evaluate(() => localStorage.getItem('settings-storage')), before);
    // Normal screens must ignore even a complete fixture override query.
    await page.goto(`${baseUrl}/device-settings?locale=sv&language=sv&deviceLocale=sv-FI`);
    await page.getByTestId('settings-language').getByText('Language', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => localStorage.getItem('settings-storage')), before);
  }
}

function selectCases() {
  if (requestedCases.size === 0) return allCases;

  const knownCases = new Set(allCases.map(({ name }) => name));
  const unknownCases = [...requestedCases].filter((name) => !knownCases.has(name));
  if (unknownCases.length) {
    throw new Error(
      `Unknown UI_CASES: ${unknownCases.join(', ')}. Choose from: ${[...knownCases].join(', ')}`
    );
  }

  return allCases.filter(({ name }) => requestedCases.has(name));
}

function selectViewports() {
  if (requestedViewports.size === 0) return UI_VIEWPORTS;

  const known = new Set(UI_VIEWPORTS.map(({ name }) => name));
  const unknown = [...requestedViewports].filter((name) => !known.has(name));
  if (unknown.length) {
    throw new Error(
      `Unknown UI_VIEWPORTS: ${unknown.join(', ')}. Choose from: ${[...known].join(', ')}`
    );
  }

  return UI_VIEWPORTS.filter(({ name }) => requestedViewports.has(name));
}

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

    await assertNorthClear(page, testCase, viewport, testCase.protectNorthSeat ? box : null);

    if (testCase.testId === 'trump-window') {
      await assertAbovePlayerHand(page, testCase.name, box, viewport);
      for (const choice of await target.getByRole('button').all()) {
        const choiceBox = await choice.boundingBox();
        assert.ok(choiceBox.height >= 48, 'Trump choice keeps a 48pt touch target');
        assert.ok(
          choiceBox.y >= box.y && choiceBox.y + choiceBox.height <= box.y + box.height,
          'All trump choices must fit within the window without clipping'
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

    if (testCase.sideInsets) {
      await assertSideStacksInsideCutouts(page, testCase, viewport);
    }
  } else if (testCase.text) {
    await page.getByText(testCase.text, { exact: true }).first().waitFor({ timeout: 15_000 });
  }

  if (testCase.name === 'table-waiting' || testCase.name === 'table-host-controls') {
    if (await page.getByRole('button', { name: /Bot.*View profile/ }).count()) {
      throw new Error(`${testCase.name} exposes a bot profile action in ${viewport.name}`);
    }
    await page.getByRole('button', { name: /, You, .*View profile$/ }).waitFor();
  }

  await assertMinimumTouchTargets(page, testCase.name, viewport, { checkInputs: true });
  await assertWoodButtonsHoldLabels(page, testCase.name, viewport);
}

// A wood button's keyline stays inside its rim and its label inside the face,
// so nothing is cut where the platform clips (PID-212).
async function assertWoodButtonsHoldLabels(page, name, viewport) {
  const spills = await page.evaluate(() => {
    const keylineColor = 'rgb(42, 21, 5)';
    const found = [];
    for (const rim of document.querySelectorAll('[role="button"], [role="radio"]')) {
      const keyline = rim.firstElementChild;
      if (!keyline || getComputedStyle(keyline).backgroundColor !== keylineColor) continue;
      const rimBox = rim.getBoundingClientRect();
      if (!rimBox.height) continue;
      const pad = parseFloat(getComputedStyle(rim).paddingBottom);
      const keyBox = keyline.getBoundingClientRect();
      const face = keyline.firstElementChild.getBoundingClientRect();
      const label = rim.getAttribute('aria-label');
      if (keyBox.bottom > rimBox.bottom - pad + 0.5) found.push(`${label}: keyline below rim`);
      for (const text of keyline.querySelectorAll('div[dir="auto"]')) {
        const box = text.getBoundingClientRect();
        if (box.top < face.top - 0.5 || box.bottom > face.bottom + 0.5) {
          found.push(`${label}: label outside face`);
        }
      }
    }
    return found;
  });
  assert.deepEqual(spills, [], `${name} wood buttons in ${viewport.name}`);
}

async function visibleBox(page, locator) {
  const first = locator.first();
  if (!(await first.count()) || !(await first.isVisible())) return null;
  return getStableBox(first, page);
}

// The header (score plaque and menu, or the waiting toolbar) and a protected
// window must never cover the north seat or its cards, nor the window the header.
async function assertNorthClear(page, testCase, viewport, windowBox) {
  const waiting = (await page.getByTestId('waiting-seat-north').count()) > 0;
  const north = waiting
    ? { 'north seat': page.getByTestId('waiting-seat-north') }
    : {
        'north seat': page.getByTestId('seat-north'),
        'north cards': page.getByTestId('seat-north-cards').locator(':scope > div'),
      };
  if (!waiting && windowBox)
    await north['north seat'].first().waitFor({ state: 'visible', timeout: 20_000 });
  const header = waiting
    ? { toolbar: page.getByTestId('waiting-toolbar') }
    : {
        'score plaque': page.getByRole('button', { name: /Recent scores\.|Senaste poäng\./ }),
        menu: page.getByRole('button', { name: /^(Table settings|Bordsinställningar)$/ }),
      };
  const covers = { ...header, ...(windowBox ? { window: windowBox } : {}) };
  for (const [coverName, cover] of Object.entries(covers)) {
    const coverBox = cover === windowBox ? windowBox : await visibleBox(page, cover);
    if (!coverBox) continue;
    const targets = cover === windowBox ? { ...north, ...header } : north;
    for (const [targetName, target] of Object.entries(targets)) {
      const targetBox = await visibleBox(page, target);
      if (targetBox && boxesOverlap(coverBox, targetBox)) {
        throw new Error(
          `${testCase.name}: ${coverName} overlaps the ${targetName} in ${viewport.name}: ${coverName}=${JSON.stringify(coverBox)} ${targetName}=${JSON.stringify(targetBox)}`
        );
      }
    }
  }
}

// The update notice takes the top of the shell (faked island insets: 59 top, 34 bottom).
// It must sit inside them, cover no other control (tab pill, Home's header), and Restart
// must go busy on the first tap and stay that way.
async function assertUpdateNotice(page, name, viewport) {
  if (name !== 'update-notice') return;
  const notice = page.getByTestId('update-notice');
  const box = await getStableBox(notice, page);
  assert.ok(box.y >= 59 - 1, `update notice under the top inset in ${viewport.name}`);
  assert.ok(box.y + box.height <= viewport.height - 34, `update notice above the bottom inset`);
  const restart = page.getByRole('button', { name: 'Restart', exact: true });
  const dismiss = page.getByRole('button', { name: 'Dismiss', exact: true });
  for (const [label, control] of [
    ['Restart', restart],
    ['Dismiss', dismiss],
  ]) {
    const target = await getStableBox(control, page);
    assert.ok(target.width >= 44 && target.height >= 44, `${label} is a 44pt target`);
  }
  for (const control of await page.getByRole('button').all()) {
    if (!(await control.isVisible())) continue;
    const inside = await control.evaluate(
      (element) => !!element.closest('[data-testid="update-notice"]')
    );
    if (inside) continue;
    const other = await control.boundingBox();
    if (other && boxesOverlap(box, other)) {
      const label = (await control.getAttribute('aria-label')) ?? (await control.textContent());
      throw new Error(`update notice covers "${label}" in ${viewport.name}`);
    }
  }
  await restart.click();
  await restart.locator('[role="progressbar"]').waitFor();
  assert.ok(await restart.isDisabled(), 'a busy Restart cannot be tapped again');
  await dismiss.click();
  await notice.waitFor({ state: 'detached' });
}

async function assertFocused(locator, message) {
  if (!(await locator.evaluate((input) => input === document.activeElement))) {
    throw new Error(message);
  }
}

const ruleLabels = { finnish: 'Finnish', louisiana: 'Louisiana' };
const ruleFacts = {
  finnish: [
    'Only trumps are played, including the same-color five.',
    'The highest trump wins the trick.',
    'A player with no trumps sits out for the rest of the hand.',
    'The minimum bid is 6.',
  ],
  louisiana: [
    'Non-trumps are played: follow the led suit or play a trump. When trump is led, follow trump if you can.',
    'The highest trump wins. With no trump, the highest card of the led suit wins.',
    'Nobody sits out. Every player plays all six tricks.',
    'The minimum bid is 7.',
  ],
};

async function assertRulesExplainer(page, ruleSet) {
  await page.getByTestId('rules-explainer').waitFor();
  assert.ok(
    (await page.getByTestId('rules-explainer-rule-set').innerText()).includes(ruleLabels[ruleSet])
  );
  for (const [index, fact] of ruleFacts[ruleSet].entries()) {
    assert.equal(await page.getByTestId(`rules-fact-${index}`).innerText(), fact);
  }
  assert.equal(
    await page.getByTestId('rules-feedback').innerText(),
    'Not the rules you play? Tell us'
  );
  assert.equal(await page.getByTestId('rules-done').innerText(), 'Got it');
}

async function assertRulePresentation(page, testCase) {
  const ruleSet = testCase.ruleSet ?? 'finnish';
  const badge =
    testCase.rulesBadge ??
    {
      'table-waiting': 'waiting-rule-set',
      'table-game-over': 'game-over-rule-set',
    }[testCase.name];
  if (badge && !testCase.rulesExplainer) {
    await page.getByTestId(badge).waitFor();
    assert.ok(
      (await page.getByTestId(badge).getAttribute('aria-label')).includes(ruleLabels[ruleSet])
    );
  }
  if (testCase.rulesSelector) {
    const selector = page.getByTestId(testCase.rulesSelector);
    await selector.waitFor();
    const creation = testCase.rulesSelector === 'create-rule-set';
    assert.equal(
      await selector
        .getByRole(creation ? 'radio' : 'button', { name: new RegExp(ruleLabels[ruleSet]) })
        .getAttribute(creation ? 'aria-checked' : 'aria-selected'),
      'true'
    );
  }
  if (badge === 'invite-rule-set') {
    if (testCase.authenticated)
      await page.getByText('Ready to join as Bengt.', { exact: true }).waitFor();
    else await page.getByLabel('Your display name', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Join table', exact: true }).waitFor();
  }
  if (testCase.rulesExplainer) await assertRulesExplainer(page, ruleSet);
  if (testCase.name === 'table-louisiana-bidding') {
    await page.getByTestId('bidding-window').waitFor();
    assert.equal(await page.getByRole('button', { name: 'Bid 6', exact: true }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Bid 7', exact: true }).isEnabled(), true);
    assert.equal(
      boxesOverlap(
        await page.getByTestId('bidding-window').boundingBox(),
        await page.getByTestId('table-rule-set').boundingBox()
      ),
      false
    );
  }
}

async function assertFriendsPresentation(page, name) {
  if (!name.startsWith('friends-')) return;
  const expected =
    {
      'friends-empty': ['Nobody here yet. Add the people you play with.'],
      'friends-list': ['Nora', 'Pekka', 'Liisa', 'Online', 'At a table', 'Offline'],
      'friends-added-you': ['Added you', 'Kalle', 'Add back'],
      'friends-loading': ['Loading…'],
      'friends-error': ['Could not update Friends. Please try again.', 'Retry'],
      'friends-recent': ['Recently played with', 'Nora', 'Kalle', 'Added'],
      'friends-results': ['Search results', 'Friend', 'Added you', 'Added'],
      'friends-profile': ['Player profile', 'Nora', 'Remove friend'],
      'friends-remove': ['Remove Nora as a friend?', 'Cancel'],
      'friends-guest': ['Save your player', 'Save account'],
    }[name] ?? [];
  for (const text of expected) await page.getByText(text, { exact: true }).first().waitFor();
  if (name === 'friends-added-you') {
    assert.ok(
      (await page.getByText('Added you', { exact: true }).boundingBox()).y <
        (await page.getByRole('button', { name: "View Nora's profile" }).boundingBox()).y
    );
  }
  if (name === 'friends-remove') {
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: "View Nora's profile" }).waitFor();
  }
  if (name === 'friends-guest') {
    for (const label of ['Public name', 'Email', 'Password']) {
      const box = await page.getByRole('textbox', { name: label, exact: true }).boundingBox();
      assert.ok(
        box && box.x >= 0 && box.x + box.width <= page.viewportSize().width,
        `${label} clipped`
      );
    }
  }
}

async function assertLobbyPresentation(page, testCase) {
  const fixture = testCase.lobbyFixture;
  if (!fixture) return;
  assert.equal(await page.getByTestId('lobby-rule-filter').count(), 0);
  if (fixture === 'empty') {
    await page.getByText('No one is at a table yet', { exact: true }).waitFor();
    return;
  }
  const search = page.getByRole('textbox', { name: 'Find a player', exact: true });
  await search.waitFor();
  if (fixture === 'search-empty') {
    assert.equal(await search.inputValue(), 'Nobody named this');
    await page.getByText('No matching tables', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Clear search', exact: true }).click();
    assert.equal(await search.inputValue(), '');
  }
  const row = (code) => page.getByTestId(`lobby-table-${code}`);
  if (['list', 'search-empty', 'rejoin'].includes(fixture)) {
    await row('MY').getByText('Your seat is waiting', { exact: true }).waitFor();
    assert.equal(await row('MY').getByRole('button', { name: 'Rejoin', exact: true }).count(), 1);
  }
  if (['list', 'search-empty', 'open', 'badges', 'locked'].includes(fixture)) {
    await row('OPEN1').getByText('Claas', { exact: true }).waitFor();
    assert.equal(await row('OPEN1').getByText('Open', { exact: true }).count(), 3);
    await row('OPEN1').getByText('3 seats open', { exact: true }).waitFor();
    await row('OPEN2').getByText('Yaya', { exact: true }).waitFor();
    assert.equal(await row('OPEN2').getByText('Bot', { exact: true }).count(), 1);
    assert.equal(await row('OPEN2').getByText('Open', { exact: true }).count(), 2);
    await row('OPEN2').getByText('2 seats open', { exact: true }).waitFor();
    assert.equal(await row('OPEN1').getByTestId('seat-requirement').count(), 3);
    assert.equal(await row('OPEN2').getByTestId('seat-requirement').count(), 0);
    assert.equal(await row('OPEN3').getByTestId('seat-requirement').innerText(), '1,000+');
  }
  if (fixture === 'locked') {
    await row('OPEN1')
      .getByRole('button', {
        name: 'south seat locked, 100 games played needed, you have 40',
        exact: true,
      })
      .click();
    await row('OPEN1').getByRole('alert').waitFor();
    assert.equal(
      await row('OPEN1').getByRole('alert').innerText(),
      '100 games played needed, you have 40'
    );
  }
  if (['list', 'search-empty', 'substitute'].includes(fixture)) {
    for (const name of ['Anna', 'Pekka', 'Liisa', 'Jussi left in hand 3'])
      await row('SUB').getByText(name, { exact: true }).waitFor();
    assert.equal(
      await row('SUB')
        .getByRole('button', { name: /^Sit in .* seat$/ })
        .count(),
      1
    );
  }
  if (['list', 'search-empty', 'watch'].includes(fixture)) {
    await row('WATCH1').getByText('Hand 4 · 34 to 21', { exact: true }).waitFor();
    await row('WATCH2').getByText('Playing', { exact: true }).waitFor();
    assert.equal(
      await row('WATCH1').getByRole('button', { name: 'Watch', exact: true }).count(),
      1
    );
  }
  for (const card of await page.getByTestId(/^lobby-table-/).all()) {
    assert.doesNotMatch(
      await card.innerText(),
      /Never show this table name|\b(?:MY|OPEN\d|SUB|WATCH\d)\b|Level \d/
    );
  }
  if (fixture !== 'list') return;
  await search.fill('  cLaAs  ');
  await row('OPEN1').waitFor();
  assert.equal(await page.getByTestId(/^lobby-table-/).count(), 1);
  for (const query of ['OPEN1', 'Never show this table name', 'Bot']) {
    await search.fill(query);
    await page.getByText('No matching tables', { exact: true }).waitFor();
    assert.equal(await page.getByTestId(/^lobby-table-/).count(), 0);
  }
  await search.fill('');
  await row('OPEN1').waitFor();
}

async function assertCreationPresentation(page, testCase) {
  const fixture = testCase.createFixture;
  if (!fixture) return;
  const form = page.getByTestId('create-room-window');
  assert.equal(await form.getByRole('textbox').count(), 0);
  const partner = form.getByTestId('create-seat_3');
  const radio = (name) => partner.getByRole('radio', { name, exact: true });
  const height = async () => Math.round((await partner.boundingBox()).height);
  // An open seat shows its games-played line under it: a 44 pt row plus a 48 pt line.
  const seatHeight = fixture === 'bots' || fixture === 'friend' ? 44 : 92;
  assert.equal(await height(), seatHeight);
  const selected = fixture === 'bots' ? 'Bot' : fixture === 'friend' ? 'Friend' : 'Open';
  assert.equal(await radio(selected).getAttribute('aria-checked'), 'true');
  if (fixture === 'open') {
    for (const key of ['seat_2', 'seat_3', 'seat_4']) {
      const seat = form.getByTestId(`create-${key}`);
      assert.deepEqual(await seat.getByRole('radio').allTextContents(), [
        'Open',
        'Bot',
        'Friend',
        'Anyone',
        '100+',
        '1,000+',
      ]);
      await seat.getByText('games played', { exact: true }).waitFor();
    }
  }
  if (fixture === 'requirement') {
    assert.equal(await form.getByTestId('seat-requirement').innerText(), '100+');
  }
  assert.equal(
    await form.getByTestId('create-footer').innerText(),
    fixture === 'bots'
      ? 'The game starts when your friends sit down.'
      : fixture === 'friend'
        ? 'One open seat is listed for everyone.'
        : fixture === 'open'
          ? '3 open seats are listed for everyone.'
          : '2 open seats are listed for everyone.'
  );
  if (fixture !== 'default') return;
  // One tap sets the requirement; the seat stays open and the badge lands on the chair.
  await radio('100+').click();
  assert.equal(await radio('100+').getAttribute('aria-checked'), 'true');
  assert.equal(await partner.getByTestId('seat-requirement').innerText(), '100+');
  // Leaving Open folds the line away; coming back folds it in at Anyone.
  await radio('Bot').click();
  await page.waitForTimeout(400);
  assert.equal(await radio('Anyone').count(), 0);
  assert.equal(await height(), 44);
  await radio('Open').click();
  await page.waitForTimeout(400);
  assert.equal(await radio('Anyone').getAttribute('aria-checked'), 'true');
  assert.equal(await height(), 92);
  await radio('Friend').click();
  await page.waitForTimeout(400);
  assert.equal(await radio('Anyone').count(), 0);
  assert.equal(await page.getByTestId('create-seat-sheet').count(), 0);
}

async function assertRuleInteractions(page, testCase, viewport, screenshotDir) {
  if (testCase.rulesSelector) {
    const other = testCase.ruleSet === 'finnish' ? 'louisiana' : 'finnish';
    const creation = testCase.rulesSelector === 'create-rule-set';
    const button = page
      .getByTestId(testCase.rulesSelector)
      .getByRole(creation ? 'radio' : 'button', { name: new RegExp(ruleLabels[other]) });
    await button.click();
    assert.equal(await button.getAttribute(creation ? 'aria-checked' : 'aria-selected'), 'true');
  }
  const waiting =
    testCase.name === 'table-waiting' ||
    testCase.name === 'table-louisiana-waiting' ||
    testCase.name === 'table-louisiana-waiting-explainer';
  const playing =
    testCase.name === 'table-finnish' ||
    testCase.name === 'table-louisiana' ||
    testCase.name === 'table-louisiana-explainer';
  if (!waiting && !playing) return;
  if (testCase.rulesExplainer) {
    await page.getByTestId('rules-done').click();
    await page.getByTestId(testCase.rulesBadge).waitFor();
    assert.ok(
      (await page.getByTestId(testCase.rulesBadge).innerText()).includes(
        ruleLabels[testCase.ruleSet]
      )
    );
  }
  if (waiting) await page.getByTestId('waiting-rules-menu').click();
  else {
    await page.getByRole('button', { name: 'Table settings', exact: true }).click();
    await page.getByTestId('table-rules-menu').waitFor();
    await page.screenshot({ path: resolve(screenshotDir, `${testCase.name}-settings.png`) });
    await page.getByTestId('table-rules-menu').click();
  }
  await assertRulesExplainer(page, testCase.ruleSet ?? 'finnish');
  await assertMinimumTouchTargets(page, `${testCase.name}-rules`, viewport);
  await page.screenshot({ path: resolve(screenshotDir, `${testCase.name}-rules-reopened.png`) });
  await page.getByTestId('rules-done').click();
  await page.getByTestId('rules-explainer').waitFor({ state: 'hidden' });
}

async function assertPasswordReveal(page, password, name, viewport) {
  const passwordValue = 'correct horse battery staple';
  await password.fill(passwordValue);
  await page.getByRole('button', { name: 'Show password' }).click();
  if ((await password.evaluate((input) => input.type)) !== 'text') {
    throw new Error(`${name} password was not revealed in ${viewport.name}`);
  }
  if ((await password.inputValue()) !== passwordValue) {
    throw new Error(`${name} password changed while being revealed in ${viewport.name}`);
  }
  await page.getByRole('button', { name: 'Hide password' }).click();
  if ((await password.evaluate((input) => input.type)) !== 'password') {
    throw new Error(`${name} password was not hidden again in ${viewport.name}`);
  }
  if ((await password.inputValue()) !== passwordValue) {
    throw new Error(`${name} password changed while being hidden in ${viewport.name}`);
  }
  return passwordValue;
}

// Enter twice on the last field must send exactly one request, with the
// payload the server expects, and land on Home.
async function assertSingleSubmit(page, submitField, endpoint, expectedPayload, name, viewport) {
  let requestCount = 0;
  let releaseResponse;
  const responseGate = new Promise((resolveGate) => {
    releaseResponse = resolveGate;
  });
  await page.route(`**${endpoint}`, async (route) => {
    requestCount += 1;
    await responseGate;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          token: 'ui-auth-submit-token',
          user: {
            id: 'ui-auth-submit-user',
            username: 'Player',
            email: name === 'register' ? 'player@example.com' : null,
            age_band: '18_plus',
            terms_version: '1',
          },
        },
      }),
    });
  });
  const requestPromise = page.waitForRequest(
    (request) => request.method() === 'POST' && request.url().endsWith(endpoint)
  );
  await submitField.evaluate((input) => {
    const enter = () =>
      new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        bubbles: true,
        cancelable: true,
      });
    input.dispatchEvent(enter());
    input.dispatchEvent(enter());
  });
  const request = await requestPromise;
  await page.waitForTimeout(100);
  releaseResponse();
  if (requestCount !== 1) {
    throw new Error(
      `${name} submitted ${requestCount} auth requests while loading in ${viewport.name}`
    );
  }
  const actualPayload = request.postDataJSON();
  if (JSON.stringify(actualPayload) !== JSON.stringify(expectedPayload)) {
    throw new Error(
      `${name} submitted an unexpected auth payload in ${viewport.name}: ${JSON.stringify(actualPayload)}`
    );
  }
  await page.waitForURL((url) => url.pathname.endsWith('/home'), { timeout: 10_000 });
}

async function assertAuthFormInteractions(page, name, viewport) {
  if (name === 'login') {
    const identifier = page.getByLabel('Email or username', { exact: true });
    const password = page.getByLabel('Password', { exact: true });
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByText('Enter your email or username.', { exact: true }).waitFor();
    await page.getByText('Enter your password.', { exact: true }).waitFor();
    await assertFocused(identifier, `login validation did not focus the email in ${viewport.name}`);

    await identifier.fill('Player');
    if ((await page.getByText('Enter your email or username.', { exact: true }).count()) !== 0) {
      throw new Error(`login email error did not clear after editing in ${viewport.name}`);
    }
    await identifier.press('Enter');
    await assertFocused(password, `login Next key did not focus password in ${viewport.name}`);

    const passwordValue = await assertPasswordReveal(page, password, name, viewport);
    await assertSingleSubmit(
      page,
      password,
      '/api/v1/auth/login',
      { username: 'Player', password: passwordValue, age_band: '18_plus', terms_version: '1' },
      name,
      viewport
    );
    return;
  }

  if (name !== 'register') return;

  // Step 1: the email decides between signing in and starting an account.
  const email = page.getByLabel('Email', { exact: true });
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByText('Enter your email address.', { exact: true }).waitFor();
  await assertFocused(email, `register validation did not focus the email in ${viewport.name}`);
  await email.fill('player');
  if ((await page.getByText('Enter your email address.', { exact: true }).count()) !== 0) {
    throw new Error(`register email error did not clear after editing in ${viewport.name}`);
  }
  await email.press('Enter');
  await page.getByText('Check that email address.', { exact: true }).waitFor();

  await email.fill('player@example.com');
  await email.press('Enter');

  // Step 2: the password. Nothing is looked up; the server is only asked
  // when the account is made.
  await page
    .getByText('This starts a free Pidro account for player@example.com.', { exact: true })
    .waitFor();
  const password = page.getByLabel('Password', { exact: true });
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByText('Use 8 characters or more.', { exact: true }).waitFor();
  const passwordValue = await assertPasswordReveal(page, password, name, viewport);
  if ((await page.getByLabel('Confirm password').count()) !== 0) {
    throw new Error(`register still asks users to re-enter their password in ${viewport.name}`);
  }
  await password.press('Enter');

  // Step 3: the public name, then one request creates the account.
  const publicName = page.getByLabel('Public name', { exact: true });
  await publicName.waitFor();
  await page.getByRole('button', { name: 'CONTINUE', exact: true }).click();
  await page.getByText('Enter the name other players will see.', { exact: true }).waitFor();
  await publicName.fill('Player');
  await assertSingleSubmit(
    page,
    publicName,
    '/api/v1/auth/register',
    {
      user: { username: 'Player', email: 'player@example.com', password: passwordValue },
      age_band: '18_plus',
      terms_version: '1',
    },
    name,
    viewport
  );
}

async function assertWelcomeGuestInteractions(page, name, viewport) {
  if (name !== 'welcome-guest') return;

  const requestBodies = [];
  await page.route('**/api/v1/auth/guest', async (route) => {
    requestBodies.push(route.request().postDataJSON());
    if (requestBodies.length > 1) {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            token: 'ui-guest-token',
            user: {
              id: 'ui-guest-user',
              username: 'guest_7KQ4M2XB',
              display_name: 'Amber Fox',
              email: null,
              guest: true,
              age_band: '18_plus',
              terms_version: '1',
            },
          },
        }),
      });
      return;
    }
    await route.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({
        error_code: 'rate_limited',
        error_params: { retry_after: 30 },
        errors: [{ detail: 'Too many attempts. Try again soon.' }],
      }),
    });
  });
  const roomBodies = [];
  await page.route('**/api/v1/rooms', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    roomBodies.push(route.request().postDataJSON());
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ data: { code: 'SOLO1' } }),
    });
  });

  const submit = page.getByRole('button', {
    name: 'Quick game. You and three bots. No sign-up.',
    exact: true,
  });
  await submit.click();
  await page.getByText('Too many requests. Try again in 30 seconds.', { exact: true }).waitFor();
  assert.equal(
    await page.getByText('Too many attempts. Try again soon.', { exact: true }).count(),
    0
  );
  assert.equal('display_name' in requestBodies[0], false);
  assert.match(requestBodies[0].creation_token, /^[0-9a-f-]{36}$/i);
  assert.equal('invite_code' in requestBodies[0], false);
  assert.equal(requestBodies[0].age_band, '18_plus');
  assert.equal(requestBodies[0].terms_version, '1');

  await submit.click();
  await page.waitForURL((url) => url.pathname.endsWith('/game/SOLO1'), { timeout: 10_000 });
  assert.equal(requestBodies[1].creation_token, requestBodies[0].creation_token);
  assert.equal('display_name' in requestBodies[1], false);
  assert.equal(roomBodies.length, 1);
  assert.deepEqual(roomBodies[0].seats, { seat_2: 'ai', seat_3: 'ai', seat_4: 'ai' });
}

async function assertHomeGuestInteractions(page, name) {
  if (name !== 'home-guest') return;
  if ((await page.getByText('League', { exact: true }).count()) !== 0) {
    throw new Error('guest Home must not render the account tab pill');
  }

  await page
    .getByRole('button', {
      name: 'Play online. Real players. Needs a free account.',
      exact: true,
    })
    .click();
  const joinCode = page.getByRole('link', { name: 'Have a table code?', exact: true });
  await joinCode.waitFor();
  await joinCode.click();
  await page.waitForURL((url) => url.pathname.endsWith('/join-code'));
}

// The profile's cards wait for its request, so the account row never moves under a finger:
// it is not there before the answer. In Settings, Sign out and Delete account stay put.
async function assertAccountButtonsStayPut(page, name, answerProfile) {
  if (name === 'profile' || name === 'profile-guest') {
    const row = page.getByRole('button', { name: 'Account and sign-in', exact: true });
    await page.getByRole('button', { name: 'Your badges', exact: true }).waitFor();
    await page.waitForTimeout(150);
    assert.equal(await row.count(), 0, `${name}: the account row showed before the profile`);
    answerProfile();
    await row.waitFor();
    return;
  }
  if (name !== 'settings') return answerProfile();
  const buttons = ['Sign out', 'Delete account'].map((label) =>
    page.getByRole('button', { name: label, exact: true })
  );
  await buttons[1].waitFor();
  const boxes = () => Promise.all(buttons.map((button) => button.boundingBox()));
  const before = await boxes();
  answerProfile();
  await page.waitForTimeout(300);
  assert.deepEqual(await boxes(), before, `${name}: the profile answer moved the account buttons`);
}

async function assertDeleteAccountConfirmation(page, name, screenshotDir) {
  if (name !== 'profile' && name !== 'profile-guest') return;
  const classic = name === 'profile';
  // Delete account lives in Settings, one row away from the profile.
  await page.getByRole('button', { name: 'Account and sign-in', exact: true }).click();
  await page.waitForURL((url) => url.pathname.endsWith('/settings'));
  await page.getByRole('button', { name: 'Delete account', exact: true }).click();
  await page.getByText('Delete your account?', { exact: true }).waitFor();
  const classicSentence = page.getByText(/Your Classic account stays in Classic/);
  if (classic) await classicSentence.waitFor();
  else assert.equal(await classicSentence.count(), 0, 'the Classic sentence shows without Classic');
  await page.getByRole('button', { name: 'Cancel', exact: true }).waitFor();
  await page.waitForTimeout(400);
  await page.screenshot({ path: resolve(screenshotDir, `${name}-delete-confirm.png`) });
  if (!classic) return;
  // A refused deletion keeps the player signed in, says why and gives the action back.
  let deletes = 0;
  let refuse;
  await page.route('**/api/v1/auth/me', async (route) => {
    if (route.request().method() !== 'DELETE') return route.fallback();
    deletes += 1;
    await new Promise((release) => (refuse = release));
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ errors: [{ detail: 'Deleting accounts is paused.' }] }),
    });
  });
  // Both taps land before the app re-renders, as a fast double tap can on a phone.
  await page
    .getByRole('button', { name: 'Delete account', exact: true })
    .last()
    .evaluate((button) => {
      button.click();
      button.click();
    });
  await page.waitForTimeout(400);
  assert.equal(deletes, 1, 'a double tap on Delete account sent more than one request');
  refuse();
  await page.getByText('Could not delete your account. Try again.', { exact: true }).waitFor();
  assert.equal(await page.getByText('Deleting accounts is paused.', { exact: true }).count(), 0);
  assert.ok(new URL(page.url()).pathname.endsWith('/settings'), 'a failed deletion left Settings');
  const action = page.getByRole('button', { name: 'Delete account', exact: true });
  assert.equal(await action.count(), 1, 'the confirmation stayed open after a failed deletion');
  assert.ok(await action.isEnabled(), 'Delete account stayed busy after a failed deletion');
  // Leaving while the deletion runs says so, not that a photo or bio is saving.
  await action.click();
  await page.getByRole('button', { name: 'Delete account', exact: true }).last().click();
  await page.getByRole('button', { name: 'League', exact: true }).click();
  await page.getByText('Your account is being deleted.', { exact: true }).waitFor();
  assert.equal(await page.getByText(/photo or bio/).count(), 0, 'deleting waits on a photo or bio');
  await page.getByRole('button', { name: 'OK', exact: true }).click();
  refuse();
  await page.getByText('Could not delete your account. Try again.', { exact: true }).waitFor();
  assert.equal(await page.getByText('Deleting accounts is paused.', { exact: true }).count(), 0);
}

async function assertAuthSheetKeepsTyping(page, name) {
  if (name !== 'auth-sheet') return;
  await page.getByRole('button', { name: 'Friends', exact: true }).click();
  // Hold the slide-in, type, then let it end: onShow fired there and wiped the form.
  const sheet = page.getByTestId('auth-sheet');
  const held = await sheet.evaluate((node) => {
    const slideIn = document.getAnimations().filter((a) => a.effect?.target?.contains(node));
    slideIn.forEach((a) => a.pause());
    return slideIn.length;
  });
  assert.ok(held > 0, 'auth sheet had slid in before it could be held');
  const email = page.getByLabel('Email', { exact: true });
  await email.fill('early@example.com');
  await sheet.evaluate(async (node) => {
    const slideIn = document.getAnimations().filter((a) => a.effect?.target?.contains(node));
    slideIn.forEach((a) => a.play());
    await Promise.all(slideIn.map((a) => a.finished));
    await new Promise((settled) => requestAnimationFrame(() => requestAnimationFrame(settled)));
  });
  assert.equal(await email.inputValue(), 'early@example.com', 'auth sheet wiped the typed email');
}

async function assertWelcomeSettingsInteractions(page, name) {
  if (name !== 'welcome') return;
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.waitForURL((url) => url.pathname.endsWith('/device-settings'));
  await page.getByTestId('settings-screen').waitFor();
  await page.getByRole('button', { name: 'Go back', exact: true }).click();
  await page.waitForURL((url) => url.pathname.endsWith('/welcome'));
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
    throw new Error(
      `bidding controls appeared while the hand was still dealing in ${viewport.name}`
    );
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

async function assertDealerSecondDeal(page, testCase, viewport) {
  if (testCase.verifyDealerSelection) {
    await page.getByText('Swipe to review all 12 cards', { exact: false }).waitFor();
    await page.getByTestId('rendered-hand-card-count-0').waitFor({ state: 'attached' });
    const keepButton = page.getByRole('button', { name: 'Keep selected cards' });
    if ((await keepButton.count()) !== 1 || !(await keepButton.isDisabled())) {
      throw new Error(`dealer hand selector is incomplete in ${viewport.name}`);
    }

    for (const label of [
      '8 of clubs, worth 0 points',
      'Ace of spades, worth 1 point',
      '3 of hearts, worth 0 points',
      'Jack of diamonds, worth 0 points',
      '10 of hearts, worth 0 points',
      '2 of spades, worth 1 point',
    ]) {
      const card = page.getByRole('button', { name: label, exact: true });
      await card.scrollIntoViewIfNeeded();
      await card.click();
    }
    await page.getByText('6 of 6 selected', { exact: false }).waitFor();
    if (await keepButton.isDisabled()) {
      throw new Error(`dealer cannot confirm six selected cards in ${viewport.name}`);
    }
  }

  if (testCase.verifyDealerPrivacy) {
    await page.getByTestId('dealer-card-count-concealed').waitFor({ state: 'attached' });
    const symbolicCards = page.locator('[data-testid="dealer-pack-symbol"] img');
    if ((await symbolicCards.count()) !== 3) {
      throw new Error(`dealer pack must stay a fixed three-card symbol in ${viewport.name}`);
    }
  }
}

// Each seat says its bid, aloud and on screen. Your tight seat has no name,
// so it shows the short form under its avatar, inside the seat's column,
// which ends where your cards begin.
async function assertBidLines(page, testCase, viewport) {
  if (!testCase.bidLines) return;
  for (const [seat, line] of Object.entries(testCase.bidLines)) {
    const avatar = page.getByTestId(`seat-${seat}`);
    const spoken = line.replace(/^./, (c) => c.toLowerCase());
    await page.waitForFunction(
      ([id, text]) =>
        document
          .querySelector(`[data-testid="${id}"]`)
          ?.getAttribute('aria-label')
          ?.endsWith(`, ${text}`),
      [`seat-${seat}`, spoken],
      { timeout: 10_000 }
    );
    const shown = [];
    for (const text of await avatar.getByText(/^(Bid|High|Passed)/).all()) {
      if (await text.isVisible()) shown.push(text);
    }
    if (shown.length !== 1) {
      throw new Error(`${testCase.name}: seat ${seat} shows no bid line in ${viewport.name}`);
    }
    const box = await getStableBox(shown[0], page);
    assertInsideViewport(`${testCase.name} ${seat} bid line`, box, viewport);
    const words = await shown[0].textContent();
    if (words === line) continue;
    const short = line.replace(/^Bid (\d+) · high$/, 'High $1');
    if (seat !== 'south' || words !== short) {
      throw new Error(`${testCase.name}: seat ${seat} shows "${words}" for "${line}"`);
    }
    const column = await getStableBox(avatar, page);
    if (box.x < column.x - 1 || box.x + box.width > column.x + column.width + 1) {
      throw new Error(`${testCase.name}: your bid line leaves its seat in ${viewport.name}`);
    }
  }
}

async function assertAbovePlayerHand(page, name, box, viewport) {
  const handBoundary = page.getByTestId('player-hand-top').first();
  await handBoundary.waitFor({ state: 'attached', timeout: 20_000 });
  const handBox = await getStableBox(handBoundary, page);
  if (!handBox) throw new Error(`${name} player-hand boundary has no geometry`);
  const handTop = handBox.y;
  const minimumClearance = viewport.height >= viewport.width ? 28 : 8;

  if (box.y + box.height > handTop - minimumClearance) {
    throw new Error(
      `${name} is too close to the player hand in ${viewport.name}: window=${JSON.stringify(box)} protectedHandTop=${handTop} minimumClearance=${minimumClearance}`
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

  if (viewport.height >= viewport.width) {
    const centerButton = await getStableBox(page.getByRole('button', { name: 'Bid 10' }), page);
    const trickCenter = await getStableBox(page.getByTestId('table-trick-center').first(), page);
    if (!centerButton || !trickCenter) {
      throw new Error(`bidding center has no geometry in ${viewport.name}`);
    }
    const centerOffset = Math.abs(
      centerButton.y + centerButton.height / 2 - (trickCenter.y + trickCenter.height / 2)
    );
    if (centerOffset > 2) {
      throw new Error(
        `Bid 10 is not centered on the trick marker in ${viewport.name}: offset=${centerOffset}`
      );
    }
  }
}

// A side stack may bleed off a bare screen edge, never into a cutout.
async function assertSideStacksInsideCutouts(page, testCase, viewport) {
  const { left, right } = testCase.sideInsets;
  for (const [position, inset] of [
    ['west', left],
    ['east', right],
  ]) {
    if (!inset) continue;
    const stack = page.getByTestId(`seat-${position}-cards`).locator(':scope > div').first();
    await stack.waitFor({ state: 'visible', timeout: 20_000 });
    const box = await getStableBox(stack, page);
    const outside =
      position === 'west' ? inset - box.x : box.x + box.width - (viewport.width - inset);
    if (outside > 0.5) {
      throw new Error(
        `${testCase.name}: the ${position} card stack reaches ${outside.toFixed(1)}pt into the cutout in ${viewport.name}: ${JSON.stringify(box)}`
      );
    }
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

  if (!portrait) {
    const hand = await getStableBox(page.getByTestId('player-hand-top').first(), page);
    if (seats.south.x + seats.south.width > hand.x) {
      throw new Error(
        `seat-south runs into the landscape hand: south=${JSON.stringify(seats.south)} handLeft=${hand.x}`
      );
    }
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

  // Portrait: North and South own a centered name column; East and West share
  // the rest. Landscape labels sit beside the avatar and stay compact.
  const maxSeatWidth = (position) =>
    !portrait ? 132 : position === 'north' || position === 'south' ? 156 : 112;
  for (const position of ['north', 'east', 'south', 'west']) {
    if (seats[position].width > maxSeatWidth(position)) {
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

async function assertSwitchInteractions(page, name, screenshotDir) {
  if (name !== 'ui-components' && name !== 'settings' && name !== 'device-settings') return;
  const gallery = name === 'ui-components';
  const first = page.getByRole('switch', {
    name: gallery ? 'Enabled example' : 'Sound',
    exact: true,
  });
  const second = page.getByRole('switch', {
    name: gallery ? 'Off example' : 'Haptics',
    exact: true,
  });
  const checked = (control) => control.getAttribute('aria-checked');
  assert.equal(await checked(first), 'true');
  assert.equal(await checked(second), gallery ? 'false' : 'true');
  await first.click();
  assert.equal(await checked(first), 'false');
  assert.equal(await checked(second), gallery ? 'false' : 'true', 'Settings must be independent');
  await first.press('Space');
  assert.equal(await checked(first), 'true', 'Space must toggle exactly once');
  await first.press('Enter');
  assert.equal(await checked(first), 'false', 'Enter must toggle exactly once');
  if (gallery) {
    for (const [label, value] of [
      ['Disabled on', 'true'],
      ['Disabled off', 'false'],
    ]) {
      const control = page.getByRole('switch', { name: label, exact: true });
      assert.equal(await control.isDisabled(), true);
      await control.dispatchEvent('click');
      assert.equal(await checked(control), value, 'Disabled switch must retain its state');
    }
    await first.press('Tab');
    assert.equal(await second.evaluate((el) => el === document.activeElement), true);
    await page
      .getByTestId('ui-switch-panel')
      .screenshot({ path: resolve(screenshotDir, 'ui-switches.png') });
  } else {
    await page.reload();
    await first.waitFor();
    assert.equal(await checked(first), 'false', 'Sound preference must survive reload');
    assert.equal(await checked(second), 'true', 'Haptics must remain unchanged');
  }
}

async function main() {
  const cases = selectCases();
  const matrix = selectViewports().flatMap((viewport) =>
    cases
      .filter((testCase) => {
        if (
          viewport.cases &&
          !viewport.cases.includes(testCase.name) &&
          !(testCase.locale && ['compact-portrait', 'tablet-portrait'].includes(viewport.name))
        )
          return false;
        if (testCase.skipViewports?.includes(viewport.name)) return false;
        return (
          !viewport.tableOnly ||
          testCase.locale ||
          testCase.path.startsWith('/table-dev') ||
          testCase.ruleSet ||
          testCase.lobbyFixture ||
          testCase.name === 'join-invite' ||
          viewport.entryCases?.includes(testCase.name)
        );
      })
      .map((testCase) => ({ id: `${viewport.name}/${testCase.name}` }))
  );
  if (process.argv[2] === '--verify-coverage') {
    const reports = process.argv[3];
    const completed = (
      await Promise.all(
        (await readdir(reports))
          .filter((name) => name.endsWith('.json'))
          .map(async (name) => JSON.parse(await readFile(resolve(reports, name), 'utf8')))
      )
    ).flat();
    verifyCoverage(
      matrix.map(({ id }) => id),
      completed
    );
    for (const { id } of completed) await access(resolve(screenshotRoot, `${id}.png`));
    console.log(
      `visual coverage: all ${completed.length} cases completed exactly once, with captures`
    );
    console.log('Slowest visual cases:');
    for (const { id, ms } of [...completed].sort((a, b) => b.ms - a.ms).slice(0, 15)) {
      console.log(`  ${(ms / 1000).toFixed(2)}s ${id}`);
    }
    return;
  }
  const costs = JSON.parse(
    await readFile(new URL('./ui-case-costs.json', import.meta.url), 'utf8')
  );
  const selected = partitionCases(matrix, process.env.UI_PARTITION, costs);
  if (process.argv[2] === '--list') {
    console.log(JSON.stringify(selected.map(({ id }) => id)));
    return;
  }
  if (!selected.length) throw new Error('No visual cases selected');
  const selectedIds = new Set(selected.map(({ id }) => id));
  await mkdir(screenshotRoot, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  const timings = [];

  try {
    for (const viewport of selectViewports()) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
      });
      // Endless motion (your breathing turn light) holds its resting frame, so a
      // baseline never catches it mid-breath. See src/utils/stillCapture.ts.
      await context.addInitScript(() => {
        globalThis.__pidroStill = true;
      });
      const screenshotDir = resolve(screenshotRoot, viewport.name);
      await mkdir(screenshotDir, { recursive: true });

      for (const testCase of cases) {
        if (!selectedIds.has(`${viewport.name}/${testCase.name}`)) continue;
        const started = performance.now();
        const page = await context.newPage();
        // Reuse CI's existing tablet shards without resizing any other screen.
        const caseViewport = testCase.lobbyFixture
          ? (viewport.lobbyViewport ?? viewport)
          : testCase.viewports?.[viewport.name]
            ? { ...viewport, ...testCase.viewports[viewport.name] }
            : viewport;
        await page.setViewportSize({ width: caseViewport.width, height: caseViewport.height });
        await page.addInitScript(
          ({ ageGate, authenticated, fixture, pendingInvite }) => {
            globalThis.localStorage.setItem('age-gate-storage', ageGate);
            if (!globalThis.sessionStorage.getItem('ui-settings-initialized')) {
              globalThis.localStorage.removeItem('settings-storage');
              globalThis.sessionStorage.setItem('ui-settings-initialized', 'true');
            }
            if (authenticated) globalThis.localStorage.setItem('auth-storage', fixture);
            else globalThis.localStorage.removeItem('auth-storage');
            if (pendingInvite) {
              globalThis.localStorage.setItem(
                'pending-invite-storage',
                JSON.stringify({
                  state: {
                    pendingInvite: { code: '7KQ4M2XB', source: 'copy', receivedAt: 1 },
                  },
                  version: 0,
                })
              );
            } else {
              globalThis.localStorage.removeItem('pending-invite-storage');
            }
          },
          {
            ageGate: ageGateFixture,
            authenticated: testCase.authenticated === true,
            fixture: testCase.authFixture ?? authFixture,
            pendingInvite: testCase.pendingInvite === true,
          }
        );
        if (testCase.pendingInvite) {
          await page.route('**/api/v1/invites/7KQ4M2XB', async (route) => {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                data: {
                  invite: {
                    code: '7KQ4M2XB',
                    state: 'open',
                    host: 'Anna',
                    seats_taken: 2,
                    seats_total: 4,
                    seat_hint: 'partner',
                    label: null,
                    expires_at: '2099-01-01T00:00:00Z',
                  },
                },
              }),
            });
          });
        }
        if (testCase.manualCode) {
          await page.route('**/api/v1/invites/7KQ4M2XB', (route) =>
            route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                data: {
                  invite: {
                    code: '7KQ4M2XB',
                    state: 'open',
                    host: 'Marcel',
                    seats_taken: 2,
                    seats_total: 4,
                    seat_hint: 'partner',
                    label: 'Friday game',
                    expires_at: '2099-09-03T15:30:00Z',
                    config: {
                      name: null,
                      solo: false,
                      bot_difficulty: 'basic',
                      rule_set: 'louisiana',
                    },
                  },
                },
              }),
            })
          );
        }
        if (testCase.name === 'game-away') {
          // The away screen needs no server; keep the room and channel requests offline.
          await page.route('**/api/v1/**', (route) => route.abort());
        }
        let answerProfile = () => {};
        const profileAnswered = ['profile', 'profile-guest', 'settings'].includes(testCase.name)
          ? new Promise((answer) => (answerProfile = answer))
          : null;
        if (
          [
            'home',
            'home-guest',
            'home-table-unknown',
            'update-notice',
            'profile',
            'profile-guest',
            'profile-badges',
            'settings',
            'league',
          ].includes(testCase.name)
        ) {
          await page.route('**/api/v1/profile', async (route) => {
            await profileAnswered;
            const guest = testCase.name.endsWith('-guest');
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                data: {
                  user_id: guest ? 'ui-grammar-guest' : 'ui-grammar-user',
                  username: guest ? 'guest_7KQ4M2XB' : 'Bengt',
                  display_name: guest ? 'Lucky Moose' : 'Bengt',
                  avatar_url: null,
                  bio: null,
                  games_played: guest ? 1 : 28,
                  veteran: guest
                    ? { level: 2, xp: 410, title: 'Newcomer', progress: [90, 400] }
                    : { level: 7, xp: 2140, title: 'Regular', progress: [340, 720] },
                  xp: guest
                    ? { this_week: 410, this_month: 410 }
                    : { this_week: 1240, this_month: 2140 },
                  record: guest
                    ? { games: 1, wins: 1, losses: 0, win_rate: 1 }
                    : { games: 1890, wins: 1011, losses: 879, win_rate: 1011 / 1890 },
                  classic: guest
                    ? null
                    : { name: 'Bengt64', games_played: 1862, wins: 998, losses: 864, level: 14 },
                },
              }),
            });
          });
          await page.route('**/api/v1/lobby', async (route) => {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                data: {
                  my_rejoinable: [],
                  open_tables: [
                    { code: 'OPEN01', name: 'North table', status: 'waiting', seats: [] },
                    { code: 'OPEN02', name: 'South table', status: 'waiting', seats: [] },
                    { code: 'OPEN03', name: 'West table', status: 'waiting', seats: [] },
                  ],
                  substitute_needed: [],
                  spectatable: [],
                },
              }),
            });
          });
        }
        const pageErrors = [];
        page.on('pageerror', (error) => pageErrors.push(String(error?.message ?? error)));

        try {
          const url = new URL(`${baseUrl}${testCase.path}`);
          if (viewport.safeArea) url.searchParams.set('safeArea', viewport.safeArea);
          const response = await page.goto(url.href, {
            waitUntil: 'domcontentloaded',
            timeout: 30_000,
          });
          if (!response?.ok()) {
            throw new Error(`${testCase.path} returned ${response?.status() ?? 'no response'}`);
          }
          await suppressDevOverlays(page);
          if (testCase.manualCode) {
            await page.getByTestId('invite-code-input').fill('7kq4-m2xb');
            await page.getByRole('button', { name: 'Continue', exact: true }).click();
            await page.waitForURL(
              (url) =>
                url.pathname === '/join/7KQ4M2XB' && url.searchParams.get('source') === 'typed'
            );
          }
          if (testCase.name === 'table-bidding') {
            await assertBiddingRevealSequence(page, viewport);
          }
          if (testCase.verifyPlayedCardPersistence) {
            await assertPlayedCardPersistence(page, viewport);
          }
          if (testCase.verifyDealerCutCards) {
            await assertDealerCutCards(page, viewport);
          }
          if (testCase.verifyDealerSelection || testCase.verifyDealerPrivacy) {
            await assertDealerSecondDeal(page, testCase, viewport);
          }
          if (testCase.open) {
            await page.getByRole('button', { name: testCase.open, exact: true }).click();
            if (testCase.name === 'friends-remove')
              await page.getByRole('button', { name: 'Remove friend', exact: true }).click();
            await waitForScreenshotReady(page);
          }
          if (testCase.name === 'friends-guest') {
            await page.getByTestId('auth-sheet').waitFor();
            await waitForScreenshotReady(page);
          }
          await assertAccountButtonsStayPut(page, testCase.name, answerProfile);
          await assertTargetGeometry(page, testCase, caseViewport);
          await assertBidLines(page, testCase, caseViewport);
          if (testCase.locale && testCase.path.includes('game_over')) {
            await page
              .getByTestId('victory-confetti')
              .waitFor({ state: 'detached', timeout: 7000 });
          }
          await assertRulePresentation(page, testCase);
          if (testCase.name === 'home') {
            await page.getByText('Bengt', { exact: true }).waitFor();
            await page.getByText('28 games · Level 7', { exact: true }).waitFor();
            await page.getByText('3 tables open', { exact: true }).waitFor();
          } else if (testCase.name === 'home-table-unknown') {
            await page
              .getByText('We could not check whether you are at another table.', { exact: false })
              .waitFor();
          } else if (testCase.name === 'game-away') {
            await page.getByRole('button', { name: "I'm back" }).waitFor();
            await page.getByRole('button', { name: 'Back to lobby' }).waitFor();
          } else if (testCase.name === 'home-guest') {
            await page.getByText('Lucky Moose', { exact: true }).waitFor();
            await page.getByText('Guest · 1 game', { exact: true }).waitFor();
          }
          if (viewport.name === 'landscape' && testCase.name.startsWith('home')) {
            const expectedHeight = testCase.name === 'home-guest' ? 150 : 170;
            for (const tile of ['home-quick-game', 'home-play-online']) {
              const box = await getStableBox(page.getByTestId(tile), page);
              assert.equal(Math.round(box?.height ?? 0), expectedHeight, `${tile} height`);
            }
          }
          if (
            testCase.name.startsWith('table-game-over') ||
            testCase.name === 'table-louisiana-game-over'
          ) {
            await page
              .getByTestId('victory-confetti')
              .waitFor({ state: 'detached', timeout: 7000 });
          }
          // Canvas sprites are driven by Reanimated, outside the browser's CSS
          // animation API. Keep their settling window; DOM-only fixtures can
          // proceed as soon as their actual assets and modal animations finish.
          const tablePhase = new URL(testCase.path, baseUrl).searchParams.get('phase') ?? '';
          if (testCase.path.startsWith('/table-dev') && !/^(waiting|ready)/.test(tablePhase)) {
            await page.waitForTimeout(1_200);
          }
          await waitForScreenshotReady(page);
          if (pageErrors.length) {
            throw new Error(`${testCase.name} page errors: ${pageErrors.join(' | ')}`);
          }
          if (testCase.lobbyFixture === 'locked') await assertLobbyPresentation(page, testCase);
          await page.screenshot({
            path: resolve(screenshotDir, `${testCase.name}.png`),
            fullPage: false,
          });
          await assertLocalization(page, testCase, caseViewport);
          if (testCase.lobbyFixture !== 'locked') await assertLobbyPresentation(page, testCase);
          await assertFriendsPresentation(page, testCase.name);
          await assertCreationPresentation(page, testCase);
          await assertAuthFormInteractions(page, testCase.name, viewport);
          await assertWelcomeGuestInteractions(page, testCase.name, viewport);
          await assertWelcomeSettingsInteractions(page, testCase.name);
          await assertHomeGuestInteractions(page, testCase.name);
          await assertUpdateNotice(page, testCase.name, caseViewport);
          await assertDeleteAccountConfirmation(page, testCase.name, screenshotDir);
          await assertAuthSheetKeepsTyping(page, testCase.name);
          await assertSwitchInteractions(page, testCase.name, screenshotDir);
          await assertRuleInteractions(page, testCase, viewport, screenshotDir);
          if (testCase.verifyReadiness) {
            const panel = await getStableBox(page.getByTestId('readiness-panel'), page);
            for (const position of ['north', 'east', 'south', 'west']) {
              const seat = await getStableBox(page.getByTestId(`waiting-seat-${position}`), page);
              if (!panel || !seat || boxesOverlap(panel, seat)) {
                throw new Error(`Readiness panel overlaps ${position} in ${viewport.name}`);
              }
            }
            await page.getByRole('button', { name: "I'm ready", exact: true }).click();
            const confirmed = page.getByRole('button', { name: "You're ready", exact: true });
            await confirmed.waitFor();
            if (!(await confirmed.isDisabled()))
              throw new Error('Confirmed readiness action must be disabled');
            await page.getByText('3 of 4 ready', { exact: true }).waitFor();
          }
          if (pageErrors.length) {
            throw new Error(`${testCase.name} interaction errors: ${pageErrors.join(' | ')}`);
          }
          const timing = {
            id: `${viewport.name}/${testCase.name}`,
            ms: Math.round(performance.now() - started),
          };
          timings.push(timing);
          console.log(`ui-case ${(timing.ms / 1000).toFixed(2)}s ${timing.id}`);
        } finally {
          await page.close();
        }
      }
      await context.close();
    }
  } finally {
    await browser.close();
    if (process.env.UI_REPORT_PATH) {
      await mkdir(dirname(process.env.UI_REPORT_PATH), { recursive: true });
      await writeFile(process.env.UI_REPORT_PATH, JSON.stringify(timings, null, 2) + '\n');
    }
  }

  console.log(`ui-grammar ok: ${timings.length} captures and geometry checks`);
  timings.forEach(({ id }) => console.log(`  ${id}`));
}

main().catch((error) => {
  console.error(
    `UI grammar verification failed. Start Expo web first (MOBILE_BASE_URL=${baseUrl}).`
  );
  console.error(error);
  process.exit(1);
});
