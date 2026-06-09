import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { Socket } from 'phoenix';
import { chromium } from 'playwright';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const CODE_RALPH_DIR = path.resolve(SCRIPT_DIR, '../../../..');

const DEFAULT_WEB_URL = 'http://127.0.0.1:5173';
const DEFAULT_WS_URL = 'ws://127.0.0.1:4000/socket';
const DEFAULT_OUT_DIR = path.join(CODE_RALPH_DIR, 'screenshots', 'multiplayer-flow');
const DEFAULT_VIEWPORT = '1440x1000';
const SUITS = ['spades', 'hearts', 'clubs', 'diamonds'];
const POSITIONS = ['north', 'east', 'south', 'west'];
const TERMINAL_PHASES = new Set(['complete', 'game_over']);

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;

    const [rawKey, inlineValue] = arg.slice(2).split('=', 2);
    const key = rawKey.trim();
    if (!key) continue;

    if (key === 'headed' || key === 'keep-open' || key === 'full-page' || key === 'help') {
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
Capture a four-human multiplayer Pidro flow.

Usage:
  bun scripts/capture-multiplayer-flow.mjs [options]

Options:
  --web-url URL             Web app URL. Default: ${DEFAULT_WEB_URL}
  --ws-url URL              Backend websocket URL. Default: ${DEFAULT_WS_URL}
  --out DIR                 Output root. Default: ${DEFAULT_OUT_DIR}
  --viewport WIDTHxHEIGHT   Browser viewport. Default: ${DEFAULT_VIEWPORT}
  --max-ms MS               Max run time. Default: 300000
  --stall-ms MS             Stop early if no action can be driven. Default: 15000
  --capture-delay-ms MS     Delay before each screenshot. Default: 250
  --action-delay-ms MS      Delay before each game action. Default: 20
  --idle-position POSITION  Do not drive actions for one seat: north/east/south/west.
  --stop-after-auto-plays N Stop after observing N timeout auto-plays. Default: 0
  --stop-after-force-disconnects N
                            Stop after observing N timeout force-disconnects. Default: 0
  --headed                  Show browser windows.
  --keep-open               Leave browsers open at the end.
  --full-page               Capture full-page screenshots.
`;
}

function cleanBaseUrl(value) {
  return String(value || '').replace(/\/+$/, '');
}

function boolOption(value) {
  return value === true || value === 'true' || value === '';
}

function numberOption(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function positionOption(value) {
  if (value == null || value === '') return null;
  const normalized = String(value).trim().toLowerCase();
  if (!POSITIONS.includes(normalized)) {
    throw new Error(`Invalid position "${value}". Expected one of: ${POSITIONS.join(', ')}.`);
  }
  return normalized;
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

function currentActor(state) {
  return state?.current_player ?? state?.current_turn ?? null;
}

function stateCaption(state) {
  const bid = state?.highest_bid?.amount ?? state?.current_bid ?? '';
  const current = currentActor(state);
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
    current_player: currentActor(state),
    highest_bid: state?.highest_bid ?? null,
    bid_winner: state?.bid_winner ?? null,
    trick_count: trickCount(state),
    current_trick_count: currentTrickCount(state),
  };
}

function totalAutoPlays(clients) {
  return clients.reduce((total, client) => total + client.autoPlays.length, 0);
}

function totalForceDisconnects(clients) {
  return clients.reduce((total, client) => total + client.forcedDisconnects.length, 0);
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
  const isOffFive = rank === 5 && trump && suit !== trump && sameColor(suit, trump);

  if (isTrump && rank === 5) return 1000;
  if (isOffFive) return 980;
  if (isTrump && rank === 2) return 960;
  if (isTrump && rank === 11) return 940;
  if (isTrump && rank === 10) return 920;
  if (isTrump && rank === 14) return 900;
  if (isTrump) return 500 + rank;
  return rank;
}

function getPlayerHand(state, position) {
  const hand = state?.players?.[position]?.hand;
  return Array.isArray(hand) ? hand : [];
}

function chooseCardsToKeep(state, legalAction, position) {
  if (Array.isArray(legalAction?.cards) && legalAction.cards.length > 0) {
    return legalAction.cards.slice(0, 6);
  }

  const hand = getPlayerHand(state, position);
  if (hand.length <= 6) return hand;

  const trump = trumpSuit(state);
  return [...hand]
    .sort((a, b) => cardKeepScore(b, trump) - cardKeepScore(a, trump))
    .slice(0, 6);
}

function chooseTrumpSuit(state, actions, position) {
  const declaredSuits = actions.map((action) => action.suit).filter(Boolean);
  if (declaredSuits.length === 0) return null;

  const hand = getPlayerHand(state, position);
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

function chooseAction(state, legalActions, position) {
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
    const suit = chooseTrumpSuit(state, declareActions, position);
    if (suit) return { event: 'declare_trump', payload: { suit }, label: `declare ${suit}` };
  }

  const selectHand = byType('select_hand')[0];
  if (selectHand) {
    const cards = chooseCardsToKeep(state, selectHand, position);
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

function shouldDriveAction(state, action, position) {
  if (!action) return false;
  if (action.event === 'select_dealer') return true;
  return currentActor(state) === position;
}

function actionKey(state, action, position) {
  return [
    position,
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
  // `select_dealer` is fire-and-forget in the real web client: the backend
  // channel auto-advances dealer selection server-side and never replies "ok"
  // to this push, so awaiting an ack would hang. Match the client behavior.
  if (event === 'select_dealer') {
    channel.push(event, payload).receive('error', () => {});
    return Promise.resolve({ ok: true, fireAndForget: true });
  }
  return waitForPhoenixPush(channel.push(event, payload), event);
}

async function readSessionFromPage(page) {
  const raw = await page.evaluate(() => localStorage.getItem('auth-storage'));
  if (!raw) throw new Error('auth-storage was not set after registration');

  const parsed = JSON.parse(raw);
  const state = parsed?.state ?? {};
  if (!state.accessToken || !state.user) {
    throw new Error(`auth-storage did not include token/user: ${raw}`);
  }

  return {
    token: state.accessToken,
    user: state.user,
  };
}

async function registerViaUi(participant, webUrl) {
  const { page, username, email, password } = participant;

  await page.goto(`${webUrl}/register`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel(/confirm password/i).fill(password);
  await page.getByRole('button', { name: 'Create Account' }).click();
  await page.waitForURL('**/home', { timeout: 20_000 });

  const session = await readSessionFromPage(page);
  participant.token = session.token;
  participant.user = session.user;
}

async function goToLobby(page, webUrl) {
  if (!page.url().endsWith('/home')) {
    await page.goto(`${webUrl}/home`, { waitUntil: 'domcontentloaded' });
  }
  await page.getByRole('button', { name: 'Multiplayer' }).click();
  await page.waitForURL('**/lobby', { timeout: 20_000 });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
}

async function createRoomViaUi(host, roomName) {
  const { page } = host;

  await goToLobby(page, cleanBaseUrl(new URL(page.url()).origin));
  await page.getByRole('button', { name: 'Create Game' }).click();
  await page.waitForSelector('[role="dialog"]', { timeout: 10_000 });
  await page.getByLabel('Game Name').fill(roomName);
  await page.getByRole('button', { name: 'Create Game' }).last().click();
  await page.waitForURL('**/game/**', { timeout: 20_000 });

  const match = page.url().match(/\/game\/([^/?#]+)/);
  if (!match) throw new Error(`Could not extract room code from ${page.url()}`);
  return match[1].toUpperCase();
}

async function joinRoomViaUi(participant, roomCode) {
  const { page } = participant;

  await goToLobby(page, cleanBaseUrl(new URL(page.url()).origin));
  await page.getByLabel('Search rooms').fill(roomCode);
  await page.getByText(`Room ${roomCode}`).waitFor({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Join' }).first().click();
  await page.waitForURL(`**/game/${roomCode}`, { timeout: 20_000 });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
}

async function connectDriverClient(participant, roomCode, wsUrl, onState) {
  const socket = new Socket(wsUrl, { params: { token: participant.token } });
  socket.connect();

  const channel = socket.channel(`game:${roomCode}`);
  const client = {
    ...participant,
    socket,
    channel,
    position: null,
    state: null,
    legalActions: [],
    gameOver: null,
    events: [],
    forcedDisconnects: [],
    autoPlays: [],
    timersStarted: 0,
    timersCancelled: 0,
  };

  function updateFromPayload(payload, source) {
    const state = extractState(payload);
    if (state) {
      client.state = state;
      client.legalActions = extractLegalActions(payload);
      onState(client, state, source);
    }
  }

  channel.on('game_state', (payload) => updateFromPayload(payload, 'game_state'));
  channel.on('game_over', (payload) => {
    client.gameOver = payload;
    client.events.push({ type: 'game_over', payload });
  });
  channel.on('turn_timer_started', (payload) => {
    client.timersStarted += 1;
    client.events.push({ type: 'turn_timer_started', payload });
  });
  channel.on('turn_timer_cancelled', (payload) => {
    client.timersCancelled += 1;
    client.events.push({ type: 'turn_timer_cancelled', payload });
  });
  channel.on('turn_auto_played', (payload) => {
    client.autoPlays.push(payload);
    client.events.push({ type: 'turn_auto_played', payload });
  });
  channel.on('force_disconnect', (payload) => {
    client.forcedDisconnects.push(payload);
    client.events.push({ type: 'force_disconnect', payload });
  });

  const joinResponse = await joinChannel(channel);
  client.position = joinResponse?.position ?? null;
  updateFromPayload(joinResponse, 'join');

  return client;
}

async function renderIndex(outputDir, gallery) {
  const cards = gallery.entries
    .map(
      (entry) => `
        <article class="shot">
          <a href="./${escapeHtml(entry.file)}"><img src="./${escapeHtml(entry.file)}" alt="${escapeHtml(
            entry.label,
          )}" loading="lazy" /></a>
          <div class="caption">
            <strong>${escapeHtml(entry.label)}</strong>
            <span>${escapeHtml(entry.caption ?? '')}</span>
          </div>
        </article>`,
    )
    .join('\n');

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Pidro multiplayer flow ${escapeHtml(gallery.roomCode)}</title>
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
        <h1>Pidro multiplayer flow <code>${escapeHtml(gallery.roomCode)}</code></h1>
        <p>${escapeHtml(gallery.entries.length)} screenshots | started ${escapeHtml(
          gallery.startedAt,
        )} | finished ${escapeHtml(gallery.completedAt ?? 'not completed')}</p>
      </div>
      <p><a href="./metadata.json">metadata</a></p>
    </header>
    <main class="grid">${cards}</main>
  </body>
</html>
`;

  await writeFile(path.join(outputDir, 'index.html'), html);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(usage());
    return;
  }

  const webUrl = cleanBaseUrl(args['web-url'] ?? process.env.WEB_URL ?? DEFAULT_WEB_URL);
  const wsUrl = args['ws-url'] ?? process.env.WS_URL ?? DEFAULT_WS_URL;
  const outRoot = path.resolve(args.out ?? process.env.MULTIPLAYER_FLOW_OUT ?? DEFAULT_OUT_DIR);
  const viewport = parseViewport(args.viewport ?? process.env.MULTIPLAYER_FLOW_VIEWPORT ?? DEFAULT_VIEWPORT);
  const maxMs = numberOption(args['max-ms'] ?? process.env.MULTIPLAYER_FLOW_MAX_MS, 300_000);
  const stallMs = numberOption(
    args['stall-ms'] ?? process.env.MULTIPLAYER_FLOW_STALL_MS,
    15_000,
  );
  const captureDelayMs = numberOption(
    args['capture-delay-ms'] ?? process.env.MULTIPLAYER_FLOW_CAPTURE_DELAY_MS,
    250,
  );
  const actionDelayMs = numberOption(
    args['action-delay-ms'] ?? process.env.MULTIPLAYER_FLOW_ACTION_DELAY_MS,
    20,
  );
  const idlePosition = positionOption(
    args['idle-position'] ?? process.env.MULTIPLAYER_FLOW_IDLE_POSITION,
  );
  const stopAfterAutoPlays = numberOption(
    args['stop-after-auto-plays'] ?? process.env.MULTIPLAYER_FLOW_STOP_AFTER_AUTO_PLAYS,
    0,
  );
  const stopAfterForceDisconnects = numberOption(
    args['stop-after-force-disconnects'] ??
      process.env.MULTIPLAYER_FLOW_STOP_AFTER_FORCE_DISCONNECTS,
    0,
  );
  const headed = boolOption(args.headed);
  const keepOpen = boolOption(args['keep-open']);
  const fullPage = boolOption(args['full-page']);

  const runId = Date.now().toString(36);
  const browser = await chromium.launch({ headless: !headed });
  const participants = [];
  let clients = [];
  const consoleErrors = [];
  const pageErrors = [];
  const entries = [];
  const actions = [];
  const actionErrors = [];
  const seenCaptures = new Set();
  const actedActionKeys = new Set();
  const startedAt = new Date().toISOString();
  let outputDir = path.join(outRoot, `pending-${runId}`);
  let roomCode = null;
  let finalState = null;
  let completedAt = null;
  let shotIndex = 0;
  let lastHand = null;
  let lastPhase = null;
  let lastScore = null;
  let captureChain = Promise.resolve();
  let stalled = null;
  let timeoutVerified = null;

  async function capture(label, page, state = null, reason = 'manual') {
    const task = async () => {
      await mkdir(outputDir, { recursive: true });
      const index = shotIndex;
      shotIndex += 1;
      const safeLabel = safeFilePart(label);
      const file = `${String(index).padStart(3, '0')}-${safeLabel}.png`;
      const filePath = path.join(outputDir, file);

      await page.waitForTimeout(captureDelayMs);
      await page.screenshot({ path: filePath, fullPage });

      const entry = {
        index,
        file,
        label,
        reason,
        capturedAt: new Date().toISOString(),
        caption: state ? stateCaption(state) : '',
        state: state ? summarizeState(state) : null,
      };
      entries.push(entry);

      console.log(`[multiplayer] ${file}${entry.caption ? ` ${entry.caption}` : ''}`);
    };

    captureChain = captureChain.then(task, task);
    await captureChain;
  }

  async function captureOnce(key, label, page, state, reason) {
    if (seenCaptures.has(key)) return;
    seenCaptures.add(key);
    await capture(label, page, state, reason);
  }

  function handleState(client, state, source) {
    finalState = state;
    client.lastStateAt = new Date().toISOString();
    client.lastStateSource = source;
    const currentHand = handNumber(state);
    const currentPhase = state.phase;
    const currentScore = scoreKey(state);

    if (!client.isHostPage) return;

    Promise.resolve()
      .then(async () => {
        if (lastHand !== null && currentHand !== lastHand) {
          await captureOnce(
            `hand-complete:${lastHand}:${currentScore}`,
            `host-hand-${lastHand}-complete-score-${currentScore}`,
            client.page,
            state,
            'hand number changed',
          );
        }

        if (lastScore !== null && currentScore !== lastScore) {
          await captureOnce(
            `score:${currentHand}:${currentScore}`,
            `host-hand-${currentHand}-score-${currentScore}`,
            client.page,
            state,
            'score changed',
          );
        }

        if (currentPhase !== lastPhase || currentHand !== lastHand) {
          await captureOnce(
            `phase:${currentHand}:${currentPhase}`,
            `host-hand-${currentHand}-${currentPhase}`,
            client.page,
            state,
            `phase ${currentPhase} from ${source}`,
          );
        }

        lastHand = currentHand;
        lastPhase = currentPhase;
        lastScore = currentScore;
      })
      .catch((error) => {
        actionErrors.push({
          at: new Date().toISOString(),
          event: 'capture',
          label: 'state capture',
          message: error instanceof Error ? error.message : String(error),
          state: summarizeState(state),
        });
      });
  }

  function clientDiagnostics(clients) {
    return clients.map((client) => ({
      username: client.username,
      position: client.position,
      lastStateAt: client.lastStateAt ?? null,
      lastStateSource: client.lastStateSource ?? null,
      state: client.state ? summarizeState(client.state) : null,
      legalActionCount: client.legalActions.length,
      legalActionTypes: client.legalActions.map((action) => action?.type ?? 'unknown'),
      legalActions: client.legalActions,
    }));
  }

  try {
    for (let index = 0; index < 4; index += 1) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const username = `mp_${runId}_${index + 1}`;
      const participant = {
        index,
        context,
        page,
        username,
        email: `${username}@example.com`,
        password: 'testpass123',
        token: null,
        user: null,
        isHostPage: index === 0,
      };

      page.on('console', (message) => {
        if (message.type() === 'error') {
          consoleErrors.push({
            user: username,
            text: message.text(),
          });
        }
      });
      page.on('pageerror', (error) => {
        pageErrors.push({
          user: username,
          message: error.message,
        });
      });

      participants.push(participant);
    }

    for (const participant of participants) {
      await registerViaUi(participant, webUrl);
      await capture(`registered-${participant.username}`, participant.page);
    }

    roomCode = await createRoomViaUi(participants[0], `Multiplayer QA ${runId}`);
    const pendingOutputDir = outputDir;
    outputDir = path.join(outRoot, roomCode);
    await mkdir(outRoot, { recursive: true });
    await rename(pendingOutputDir, outputDir).catch(async () => {
      await mkdir(outputDir, { recursive: true });
    });
    await capture('host-waiting-room', participants[0].page);

    for (const participant of participants.slice(1)) {
      await joinRoomViaUi(participant, roomCode);
      await capture(`joined-${participant.username}`, participant.page);
    }

    await Promise.all(
      participants.map((participant) =>
        participant.page.waitForURL(`**/game/${roomCode}`, { timeout: 20_000 }),
      ),
    );

    clients = await Promise.all(
      participants.map((participant) =>
        connectDriverClient(participant, roomCode, wsUrl, handleState),
      ),
    );

    await Promise.all(
      clients.map((client) =>
        client.page
          .locator('.pidro-game-frame, text=Game Over')
          .first()
          .waitFor({ timeout: 30_000 })
          .catch(() => {}),
      ),
    );

    await capture('all-players-started-host-view', participants[0].page, finalState);
    await Promise.all(
      participants.map((participant) =>
        capture(`started-${participant.username}`, participant.page, finalState),
      ),
    );

    const deadline = Date.now() + maxMs;
    let lastActionAt = Date.now();

    while (Date.now() < deadline) {
      const observedAutoPlays = totalAutoPlays(clients);
      const observedForceDisconnects = totalForceDisconnects(clients);

      if (stopAfterForceDisconnects > 0 && observedForceDisconnects >= stopAfterForceDisconnects) {
        completedAt = new Date().toISOString();
        timeoutVerified = {
          at: completedAt,
          reason: `Observed ${observedForceDisconnects} force-disconnect event(s)`,
          idlePosition,
          autoPlays: observedAutoPlays,
          forceDisconnects: observedForceDisconnects,
        };
        await captureOnce(
          `timeout-force-disconnect:${observedForceDisconnects}`,
          `host-timeout-force-disconnect-${observedForceDisconnects}`,
          participants[0].page,
          finalState,
          'timeout force-disconnect observed',
        );
        break;
      }

      if (stopAfterAutoPlays > 0 && observedAutoPlays >= stopAfterAutoPlays) {
        completedAt = new Date().toISOString();
        timeoutVerified = {
          at: completedAt,
          reason: `Observed ${observedAutoPlays} timeout auto-play event(s)`,
          idlePosition,
          autoPlays: observedAutoPlays,
          forceDisconnects: observedForceDisconnects,
        };
        await captureOnce(
          `timeout-auto-play:${observedAutoPlays}`,
          `host-timeout-auto-play-${observedAutoPlays}`,
          participants[0].page,
          finalState,
          'timeout auto-play observed',
        );
        break;
      }

      if (finalState && TERMINAL_PHASES.has(finalState.phase)) {
        completedAt = new Date().toISOString();
        await captureOnce(
          'game-over',
          `host-game-over-score-${scoreKey(finalState)}`,
          participants[0].page,
          finalState,
          'game completed',
        );
        break;
      }

      let acted = false;

      for (const client of clients) {
        if (!client.state || !client.position) continue;
        if (idlePosition && client.position === idlePosition) continue;

        const action = chooseAction(client.state, client.legalActions, client.position);
        if (!shouldDriveAction(client.state, action, client.position)) continue;

        const key = actionKey(client.state, action, client.position);
        if (actedActionKeys.has(key)) continue;
        actedActionKeys.add(key);

        await delay(actionDelayMs);

        try {
          await pushAction(client.channel, action.event, action.payload);
          actions.push({
            at: new Date().toISOString(),
            user: client.username,
            position: client.position,
            event: action.event,
            label: action.label,
            state: summarizeState(client.state),
          });
          acted = true;
          lastActionAt = Date.now();
        } catch (error) {
          actionErrors.push({
            at: new Date().toISOString(),
            user: client.username,
            position: client.position,
            event: action.event,
            label: action.label,
            message: error instanceof Error ? error.message : String(error),
            state: summarizeState(client.state),
          });
        }
      }

      if (!acted) {
        if (stallMs > 0 && Date.now() - lastActionAt > stallMs) {
          stalled = {
            at: new Date().toISOString(),
            reason: `No drivable legal action for ${stallMs}ms`,
            finalState: finalState ? summarizeState(finalState) : null,
            clients: clientDiagnostics(clients),
          };
          await capture('stalled-host-view', participants[0].page, finalState, 'stalled');
          break;
        }
        await delay(100);
      }
    }

    if (!completedAt && finalState && TERMINAL_PHASES.has(finalState.phase)) {
      completedAt = new Date().toISOString();
    }

    await captureChain;

    const metadata = {
      roomCode,
      startedAt,
      completedAt,
      completed: Boolean(completedAt),
      idlePosition,
      timeoutVerified,
      stalled,
      finalState: finalState ? summarizeState(finalState) : null,
      participants: clients.map((client) => ({
        username: client.username,
        email: client.email,
        userId: client.user?.id ?? null,
        position: client.position,
        timersStarted: client.timersStarted,
        timersCancelled: client.timersCancelled,
        autoPlays: client.autoPlays.length,
        forcedDisconnects: client.forcedDisconnects,
      })),
      actions,
      actionErrors,
      consoleErrors,
      pageErrors,
      screenshots: entries,
    };

    await writeFile(path.join(outputDir, 'metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`);
    await renderIndex(outputDir, { roomCode, startedAt, completedAt, entries });

    console.log(
      JSON.stringify(
        {
          roomCode,
          gallery: path.join(outputDir, 'index.html'),
          metadata: path.join(outputDir, 'metadata.json'),
          completed: Boolean(completedAt),
          stalled: Boolean(stalled),
          finalState: metadata.finalState,
          screenshots: entries.length,
          actions: actions.length,
          actionErrors: actionErrors.length,
          consoleErrors: consoleErrors.length,
          pageErrors: pageErrors.length,
          autoPlays: metadata.participants.reduce((total, p) => total + p.autoPlays, 0),
          forceDisconnects: metadata.participants.reduce(
            (total, p) => total + p.forcedDisconnects.length,
            0,
          ),
          timeoutVerified: metadata.timeoutVerified,
        },
        null,
        2,
      ),
    );

    if (!completedAt) {
      if (stalled) {
        throw new Error(stalled.reason);
      }
      throw new Error(`Timed out after ${maxMs}ms`);
    }
  } finally {
    for (const client of clients) {
      if (client.channel) {
        await leaveChannel(client.channel).catch(() => {});
      }
      if (client.socket) {
        client.socket.disconnect();
      }
    }

    if (!keepOpen) {
      await browser.close();
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
