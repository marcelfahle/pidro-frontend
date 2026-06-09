import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { Socket } from 'phoenix';
import { chromium } from 'playwright';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const CODE_RALPH_DIR = path.resolve(SCRIPT_DIR, '../../../..');

const DEFAULT_WEB_URL = 'http://localhost:5173';
const DEFAULT_API_URL = 'http://127.0.0.1:4000';
const DEFAULT_WS_URL = 'ws://127.0.0.1:4000/socket';
const DEFAULT_OUT_DIR = path.join(CODE_RALPH_DIR, 'screenshots', 'game-galleries');
const DEFAULT_VIEWPORT = '1440x1000';

const SUITS = ['spades', 'hearts', 'clubs', 'diamonds'];
const POSITION = 'north';

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;

    const [rawKey, inlineValue] = arg.slice(2).split('=', 2);
    const key = rawKey.trim();
    if (!key) continue;

    if (
      key === 'headed' ||
      key === 'keep-open' ||
      key === 'full-page' ||
      key === 'capture-tricks' ||
      key === 'passive' ||
      key === 'help'
    ) {
      args[key] = inlineValue ?? true;
      continue;
    }

    args[key] = inlineValue ?? argv[index + 1];
    if (inlineValue === undefined) index += 1;
  }

  return args;
}

function usage() {
  return `
Capture a fast Pidro playthrough gallery.

Usage:
  bun scripts/capture-game-gallery.mjs [options]

Options:
  --web-url URL             Web app URL. Default: ${DEFAULT_WEB_URL}
  --api-url URL             Backend origin. Default: ${DEFAULT_API_URL}
  --ws-url URL              Backend websocket URL. Default: ${DEFAULT_WS_URL}
  --out DIR                 Gallery root. Default: ${DEFAULT_OUT_DIR}
  --viewport WIDTHxHEIGHT   Browser viewport. Default: ${DEFAULT_VIEWPORT}
  --capture-delay-ms MS     Delay before each screenshot. Default: 250
  --action-delay-ms MS      Delay before each player action. Default: 20
  --max-ms MS               Max run time. Default: 180000
  --headed                  Show the browser.
  --keep-open               Leave the browser open at the end.
  --full-page               Capture full-page screenshots.
  --capture-tricks          Also capture each trick-count change.
  --passive                 Observe only; do not push any game actions.
`;
}

function cleanBaseUrl(value) {
  return String(value || '').replace(/\/+$/, '');
}

function numberOption(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function parseViewport(value) {
  const match = String(value || DEFAULT_VIEWPORT).match(/^(\d+)x(\d+)$/i);
  if (!match) {
    throw new Error(`Invalid viewport "${value}". Use WIDTHxHEIGHT, for example 1440x1000.`);
  }

  return {
    width: Number(match[1]),
    height: Number(match[2]),
  };
}

function boolOption(value) {
  return value === true || value === 'true' || value === '';
}

function extractDataEnvelope(body) {
  return body?.data ?? body;
}

async function readJsonResponse(response, label) {
  const text = await response.text();
  let body = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    throw new Error(`${label} failed (${response.status}): ${JSON.stringify(body)}`);
  }

  return body;
}

async function postJson(url, body, token) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  return readJsonResponse(response, `POST ${url}`);
}

async function registerUser(apiUrl) {
  const stamp = Date.now().toString(36);
  const username = `gallery_${stamp}`;
  const email = `${username}@example.com`;
  const password = 'testpass123';
  const response = await postJson(`${apiUrl}/api/v1/auth/register`, {
    user: { username, email, password },
  });
  const data = extractDataEnvelope(response);

  if (!data?.token || !data?.user) {
    throw new Error(`Registration response did not include token/user: ${JSON.stringify(response)}`);
  }

  return {
    token: data.token,
    user: data.user,
    username,
    email,
  };
}

async function createBotRoom(apiUrl, token, username) {
  const response = await postJson(
    `${apiUrl}/api/v1/rooms`,
    {
      name: `${username}'s gallery table`,
      settings: { min_games: 1, time_limit: 0, private: false },
      seats: { seat_2: 'ai', seat_3: 'ai', seat_4: 'ai' },
      bot_difficulty: 'basic',
    },
    token,
  );

  const data = extractDataEnvelope(response);
  const room = data?.room ?? data;
  const code = data?.code ?? room?.code;

  if (!code) {
    throw new Error(`Create room response did not include a room code: ${JSON.stringify(response)}`);
  }

  return { code, room };
}

function waitForPhoenixPush(push, label) {
  return new Promise((resolve, reject) => {
    push
      .receive('ok', (response) => resolve(response))
      .receive('error', (response) => reject(new Error(`${label} rejected: ${JSON.stringify(response)}`)))
      .receive('timeout', () => reject(new Error(`${label} timed out`)));
  });
}

function joinChannel(channel) {
  return waitForPhoenixPush(channel.join(), 'channel join');
}

function leaveChannel(channel) {
  return new Promise((resolve) => {
    channel
      .leave()
      .receive('ok', resolve)
      .receive('error', resolve)
      .receive('timeout', resolve);
  });
}

function pushAction(channel, event, payload) {
  return waitForPhoenixPush(channel.push(event, payload), event);
}

function extractState(payload) {
  const data = payload ?? {};
  const candidates = [
    data.state,
    data.game_state,
    data.data?.state,
    data.data?.game_state,
    data,
  ];

  return candidates.find((candidate) => candidate && typeof candidate === 'object' && candidate.phase);
}

function extractLegalActions(payload) {
  const actions =
    payload?.legal_actions ??
    payload?.data?.legal_actions ??
    payload?.actions ??
    payload?.data?.actions ??
    [];

  return Array.isArray(actions) ? actions : [];
}

function cardKey(card) {
  return `${card?.rank ?? '?'}${String(card?.suit ?? '?').slice(0, 1)}`;
}

function scoreKey(state) {
  const scores = state?.scores ?? {};
  return `${scores.north_south ?? 0}-${scores.east_west ?? 0}`;
}

function handNumber(state) {
  return state?.hand_number ?? state?.round_number ?? 1;
}

function trickCount(state) {
  return Array.isArray(state?.tricks) ? state.tricks.length : 0;
}

function currentTrickCount(state) {
  return Array.isArray(state?.current_trick) ? state.current_trick.length : 0;
}

function trumpSuit(state) {
  return state?.trump_suit ?? state?.trump ?? null;
}

function dealerPosition(state) {
  return state?.current_dealer ?? state?.dealer ?? null;
}

function safeFilePart(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sameColor(suitA, suitB) {
  if (!suitA || !suitB) return false;
  const red = new Set(['hearts', 'diamonds']);
  return red.has(suitA) === red.has(suitB);
}

function rankValue(rank) {
  const numeric = Number(rank);
  if (!Number.isFinite(numeric)) return 0;
  return numeric;
}

function cardKeepScore(card, trump) {
  const rank = rankValue(card.rank);
  const suit = card.suit;
  const isTrump = suit === trump;
  const isWrongFive = rank === 5 && trump && suit !== trump && sameColor(suit, trump);

  if (isTrump && rank === 5) return 1000;
  if (isWrongFive) return 980;
  if (isTrump && rank === 2) return 960;
  if (isTrump && rank === 11) return 940;
  if (isTrump && rank === 10) return 920;
  if (isTrump && rank === 14) return 900;
  if (isTrump) return 500 + rank;
  return rank;
}

function getHumanHand(state) {
  const hand = state?.players?.[POSITION]?.hand;
  return Array.isArray(hand) ? hand : [];
}

function chooseCardsToKeep(state, legalAction) {
  if (Array.isArray(legalAction?.cards) && legalAction.cards.length > 0) {
    return legalAction.cards.slice(0, 6);
  }

  const hand = getHumanHand(state);
  if (hand.length <= 6) return hand;

  const trump = trumpSuit(state);
  return [...hand]
    .sort((a, b) => cardKeepScore(b, trump) - cardKeepScore(a, trump))
    .slice(0, 6);
}

function chooseTrumpSuit(state, actions) {
  const declaredSuits = actions.map((action) => action.suit).filter(Boolean);
  if (declaredSuits.length === 0) return null;

  const hand = getHumanHand(state);
  const counts = new Map(SUITS.map((suit) => [suit, 0]));
  for (const card of hand) {
    counts.set(card.suit, (counts.get(card.suit) ?? 0) + 1);
  }

  return [...declaredSuits].sort((a, b) => {
    const countDiff = (counts.get(b) ?? 0) - (counts.get(a) ?? 0);
    if (countDiff !== 0) return countDiff;
    return SUITS.indexOf(a) - SUITS.indexOf(b);
  })[0];
}

function chooseAction(state, legalActions) {
  const byType = (type) => legalActions.filter((action) => action?.type === type);

  const selectDealer = byType('select_dealer')[0];
  if (selectDealer && state?.phase === 'dealer_selection' && !state?.dealer_selection_cuts) {
    return { event: 'select_dealer', payload: {}, label: 'select dealer' };
  }

  const bidActions = byType('bid')
    .filter((action) => Number.isFinite(Number(action.amount)))
    .sort((a, b) => Number(a.amount) - Number(b.amount));
  if (bidActions.length > 0) {
    return {
      event: 'bid',
      payload: { amount: Number(bidActions[0].amount) },
      label: `bid ${bidActions[0].amount}`,
    };
  }

  const declareActions = byType('declare_trump');
  if (declareActions.length > 0) {
    const suit = chooseTrumpSuit(state, declareActions);
    if (suit) return { event: 'declare_trump', payload: { suit }, label: `declare ${suit}` };
  }

  const selectHand = byType('select_hand')[0];
  if (selectHand) {
    const cards = chooseCardsToKeep(state, selectHand);
    if (cards.length > 0) {
      return {
        event: 'select_hand',
        payload: { cards: cards.map((card) => ({ rank: card.rank, suit: card.suit })) },
        label: `keep ${cards.map(cardKey).join(' ')}`,
      };
    }
  }

  const playCard = byType('play_card')[0];
  if (playCard?.card) {
    return {
      event: 'play_card',
      payload: { card: playCard.card },
      label: `play ${cardKey(playCard.card)}`,
    };
  }

  const pass = byType('pass')[0];
  if (pass) return { event: 'pass', payload: {}, label: 'pass' };

  return null;
}

function currentActor(state) {
  return state?.current_player ?? state?.current_turn ?? null;
}

function shouldDriveAction(state, action) {
  if (!action) return false;
  if (action.event === 'select_dealer') return true;
  return currentActor(state) === POSITION;
}

function actionKey(state, action) {
  return [
    handNumber(state),
    state?.phase ?? '',
    scoreKey(state),
    currentActor(state) ?? '',
    trickCount(state),
    currentTrickCount(state),
    action.event,
    JSON.stringify(action.payload),
  ].join('|');
}

function stateCaption(state) {
  const bid = state?.highest_bid?.amount ?? state?.current_bid ?? '';
  const current = state?.current_player ?? state?.current_turn ?? '';
  return [
    `hand ${handNumber(state)}`,
    `phase ${state?.phase ?? 'unknown'}`,
    `score ${scoreKey(state)}`,
    trumpSuit(state) ? `trump ${trumpSuit(state)}` : null,
    dealerPosition(state) ? `dealer ${dealerPosition(state)}` : null,
    current ? `turn ${current}` : null,
    bid !== '' ? `bid ${bid}` : null,
  ]
    .filter(Boolean)
    .join(' | ');
}

function summarizeState(state) {
  return {
    hand: handNumber(state),
    phase: state?.phase ?? null,
    score: scoreKey(state),
    scores: state?.scores ?? null,
    trump: trumpSuit(state),
    dealer: dealerPosition(state),
    current_player: state?.current_player ?? state?.current_turn ?? null,
    highest_bid: state?.highest_bid ?? null,
    bid_winner: state?.bid_winner ?? null,
    trick_count: trickCount(state),
    current_trick_count: currentTrickCount(state),
  };
}

function renderIndex({ roomCode, room, session, startedAt, completedAt, entries, metadataFile }) {
  const cards = entries
    .map(
      (entry) => `
        <article class="shot">
          <a href="./${escapeHtml(entry.file)}"><img src="./${escapeHtml(entry.file)}" alt="${escapeHtml(
            entry.label,
          )}" loading="lazy" /></a>
          <div class="caption">
            <strong>${escapeHtml(entry.label)}</strong>
            <span>${escapeHtml(entry.caption)}</span>
          </div>
        </article>`,
    )
    .join('\n');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Pidro game gallery ${escapeHtml(roomCode)}</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #101723;
        color: #e8eef8;
      }
      body {
        margin: 0;
        padding: 28px;
      }
      header {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 18px;
        margin-bottom: 22px;
      }
      h1 {
        margin: 0 0 6px;
        font-size: 24px;
      }
      p {
        margin: 0;
        color: #aebbd0;
        font-size: 13px;
      }
      a {
        color: inherit;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
        gap: 16px;
      }
      .shot {
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        background: #182231;
      }
      img {
        display: block;
        width: 100%;
        aspect-ratio: 1.44;
        object-fit: cover;
        background: #080d14;
      }
      .caption {
        display: grid;
        gap: 5px;
        padding: 11px 12px 12px;
        font-size: 12px;
      }
      .caption span {
        color: #aebbd0;
      }
      code {
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.08);
        padding: 2px 5px;
      }
    </style>
  </head>
  <body>
    <header>
      <div>
        <h1>Pidro game gallery <code>${escapeHtml(roomCode)}</code></h1>
        <p>${escapeHtml(entries.length)} screenshots | started ${escapeHtml(
          startedAt,
        )} | finished ${escapeHtml(completedAt ?? 'not completed')}</p>
      </div>
      <p>user ${escapeHtml(session.username)} | room ${escapeHtml(room?.id ?? roomCode)} | <a href="./${escapeHtml(
        metadataFile,
      )}">metadata</a></p>
    </header>
    <main class="grid">${cards}</main>
  </body>
</html>
`;
}

async function writeGalleryFiles(outputDir, gallery) {
  const metadataFile = 'metadata.json';
  const completedAt = gallery.completedAt ?? new Date().toISOString();
  const metadata = {
    roomCode: gallery.roomCode,
    room: gallery.room,
    session: gallery.session,
    startedAt: gallery.startedAt,
    completedAt,
    finalState: gallery.finalState ? summarizeState(gallery.finalState) : null,
    actions: gallery.actions,
    actionErrors: gallery.actionErrors,
    consoleErrors: gallery.consoleErrors,
    pageErrors: gallery.pageErrors,
    screenshots: gallery.entries,
  };

  await writeFile(path.join(outputDir, metadataFile), `${JSON.stringify(metadata, null, 2)}\n`);
  await writeFile(
    path.join(outputDir, 'index.html'),
    renderIndex({ ...gallery, completedAt, metadataFile }),
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(usage());
    return;
  }

  const webUrl = cleanBaseUrl(args['web-url'] ?? process.env.WEB_URL ?? DEFAULT_WEB_URL);
  const apiUrl = cleanBaseUrl(args['api-url'] ?? process.env.API_URL ?? DEFAULT_API_URL);
  const wsUrl = args['ws-url'] ?? process.env.WS_URL ?? DEFAULT_WS_URL;
  const outRoot = path.resolve(args.out ?? process.env.GALLERY_OUT ?? DEFAULT_OUT_DIR);
  const viewport = parseViewport(args.viewport ?? process.env.GALLERY_VIEWPORT ?? DEFAULT_VIEWPORT);
  const maxMs = numberOption(args['max-ms'] ?? process.env.GALLERY_MAX_MS, 180_000);
  const captureDelayMs = numberOption(args['capture-delay-ms'] ?? process.env.GALLERY_CAPTURE_DELAY_MS, 250);
  const actionDelayMs = numberOption(args['action-delay-ms'] ?? process.env.GALLERY_ACTION_DELAY_MS, 20);
  const headed = boolOption(args.headed);
  const keepOpen = boolOption(args['keep-open']);
  const fullPage = boolOption(args['full-page']);
  const captureTricks = boolOption(args['capture-tricks']);
  const passive = boolOption(args.passive);

  const session = await registerUser(apiUrl);
  const { code: roomCode, room } = await createBotRoom(apiUrl, session.token, session.username);
  const outputDir = path.join(outRoot, roomCode);
  await mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: !headed });
  const context = await browser.newContext({ viewport });
  const consoleErrors = [];
  const pageErrors = [];

  await context.addInitScript(({ token, user }) => {
    localStorage.setItem(
      'auth-storage',
      JSON.stringify({
        state: { accessToken: token, refreshToken: null, user },
        version: 0,
      }),
    );
  }, session);

  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto(`${webUrl}/game/${roomCode}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(500);

  const socket = new Socket(wsUrl, { params: { token: session.token } });
  socket.connect();
  const channel = socket.channel(`game:${roomCode}`);

  const entries = [];
  const seenCaptures = new Set();
  const actions = [];
  const actionErrors = [];
  const actedActionKeys = new Set();
  const startedAt = new Date().toISOString();
  let shotIndex = 0;
  let lastHand = null;
  let lastPhase = null;
  let lastScore = null;
  let lastTrickCount = null;
  let processing = Promise.resolve();
  let finished = false;
  let completedAt = null;
  let finalState = null;
  let resolveCompletion;
  let rejectCompletion;

  const completion = new Promise((resolve, reject) => {
    resolveCompletion = resolve;
    rejectCompletion = reject;
  });

  async function capture(label, state, reason) {
    const safeLabel = safeFilePart(label);
    const file = `${String(shotIndex).padStart(3, '0')}-${safeLabel}.png`;
    const filePath = path.join(outputDir, file);

    await page.waitForTimeout(captureDelayMs);
    await page.screenshot({ path: filePath, fullPage });

    const entry = {
      index: shotIndex,
      file,
      label,
      reason,
      capturedAt: new Date().toISOString(),
      caption: stateCaption(state),
      state: summarizeState(state),
    };
    entries.push(entry);
    shotIndex += 1;

    console.log(`[gallery] ${file} ${entry.caption}`);
  }

  async function captureOnce(key, label, state, reason) {
    if (seenCaptures.has(key)) return;
    seenCaptures.add(key);
    await capture(label, state, reason);
  }

  async function maybeAct(state, legalActions) {
    if (finished || passive) return;
    const action = chooseAction(state, legalActions);
    if (!action) return;
    if (!shouldDriveAction(state, action)) return;

    const key = actionKey(state, action);
    if (actedActionKeys.has(key)) return;
    actedActionKeys.add(key);

    await page.waitForTimeout(actionDelayMs);

    try {
      await pushAction(channel, action.event, action.payload);
      actions.push({
        at: new Date().toISOString(),
        event: action.event,
        label: action.label,
        state: summarizeState(state),
      });
    } catch (error) {
      const entry = {
        at: new Date().toISOString(),
        event: action.event,
        label: action.label,
        message: error instanceof Error ? error.message : String(error),
        state: summarizeState(state),
      };
      actionErrors.push(entry);
      console.warn(`[gallery] action failed: ${entry.event} ${entry.message}`);
    }
  }

  async function processStatePayload(payload, source) {
    const state = extractState(payload);
    if (!state) return;

    const legalActions = extractLegalActions(payload);
    const currentHand = handNumber(state);
    const currentPhase = state.phase;
    const currentScore = scoreKey(state);
    const currentTricks = trickCount(state);

    finalState = state;

    if (lastHand !== null && currentHand !== lastHand) {
      await captureOnce(
        `hand-complete:${lastHand}:${currentScore}`,
        `hand-${lastHand}-complete-score-${currentScore}`,
        state,
        'hand number changed',
      );
    }

    if (lastScore !== null && currentScore !== lastScore) {
      await captureOnce(
        `score:${currentHand}:${currentScore}`,
        `hand-${currentHand}-score-${currentScore}`,
        state,
        'score changed',
      );
    }

    await captureOnce(
      `phase:${currentHand}:${currentPhase}`,
      `hand-${currentHand}-${currentPhase}`,
      state,
      `phase ${currentPhase} from ${source}`,
    );

    if (currentPhase === 'dealer_selection' && state.dealer_selection_cuts) {
      await captureOnce(
        `dealer-cut:${currentHand}`,
        `hand-${currentHand}-dealer-cut`,
        state,
        'dealer cuts revealed',
      );
    }

    if (captureTricks && currentPhase === 'playing' && currentTricks !== lastTrickCount) {
      await captureOnce(
        `tricks:${currentHand}:${currentTricks}:${currentTrickCount(state)}`,
        `hand-${currentHand}-tricks-${currentTricks}`,
        state,
        'trick count changed',
      );
    }

    if (currentPhase === 'complete' || currentPhase === 'game_over') {
      await captureOnce('game-over', `game-over-score-${currentScore}`, state, 'game completed');
      finished = true;
      completedAt = new Date().toISOString();
      resolveCompletion();
      return;
    }

    lastHand = currentHand;
    lastPhase = currentPhase;
    lastScore = currentScore;
    lastTrickCount = currentTricks;

    await maybeAct(state, legalActions);
  }

  channel.on('game_state', (payload) => {
    processing = processing
      .then(() => processStatePayload(payload, 'push'))
      .catch((error) => {
        rejectCompletion(error);
      });
  });

  const joinResponse = await joinChannel(channel);
  processing = processing.then(() => processStatePayload(joinResponse, 'join'));

  let timeoutId = null;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Timed out after ${maxMs}ms`)), maxMs);
  });

  try {
    await Promise.race([completion, timeout]);
    await processing;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    await writeGalleryFiles(outputDir, {
      roomCode,
      room,
      session,
      startedAt,
      completedAt,
      finalState,
      actions,
      actionErrors,
      consoleErrors,
      pageErrors,
      entries,
    });

    await leaveChannel(channel).catch(() => {});
    socket.disconnect();

    if (!keepOpen) {
      await browser.close();
    }

    console.log(
      JSON.stringify(
        {
          roomCode,
          gallery: path.join(outputDir, 'index.html'),
          metadata: path.join(outputDir, 'metadata.json'),
          screenshots: entries.length,
          actions: actions.length,
          actionErrors: actionErrors.length,
          consoleErrors: consoleErrors.length,
          pageErrors: pageErrors.length,
          completed: Boolean(completedAt),
        },
        null,
        2,
      ),
    );
  }

  if (!completedAt) {
    throw new Error(`Game did not complete. Gallery written to ${path.join(outputDir, 'index.html')}`);
  }

  if (lastPhase === null) {
    throw new Error('No game states were captured from the channel.');
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
