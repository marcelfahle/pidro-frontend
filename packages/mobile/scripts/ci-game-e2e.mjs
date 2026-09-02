/**
 * End-to-end gameplay gate for CI: real backend, real client code, full games.
 *
 * Stage 1 — solo gate: registers a throwaway account and runs
 * autoplay-full-game.mjs (3-bot room, protocol client) to game_over. This
 * exercises room creation, the game channel, legal_actions and progression
 * against the live server with zero UI variables.
 *
 * Stage 2 — multiplayer video: a second account creates a 2-human room
 * (seat_3 open, seats 2/4 bots), logs in through the real UI in Chromium,
 * and sits at the table while the autoplayer takes the open seat. The
 * server's turn timers auto-play the UI seat (the backend must run with
 * short LIFECYCLE_TURN_TIMER_*_MS values), so a complete game plays out in
 * the actual client — recorded on video with milestone screenshots.
 *
 * Requires a running backend (API_BASE_URL/WS_BASE_URL) and Expo web
 * (MOBILE_BASE_URL). Artifacts land in E2E_ARTIFACT_DIR.
 *
 * Local run (backend on :4100 with CI pacing, Expo web on :8081):
 *   API_BASE_URL=http://127.0.0.1:4100 WS_BASE_URL=ws://127.0.0.1:4100/socket \
 *     bun scripts/ci-game-e2e.mjs
 */
import { spawn } from 'node:child_process';
import { appendFileSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(mobileRoot, '../../..');

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:4000';
const wsBaseUrl = process.env.WS_BASE_URL ?? 'ws://127.0.0.1:4000/socket';
const mobileBaseUrl = process.env.MOBILE_BASE_URL ?? 'http://localhost:8081';
const artifactDir = process.env.E2E_ARTIFACT_DIR ?? resolve(repoRoot, 'screenshots/agent-game-e2e');
const globalTimeoutMs = Number(process.env.E2E_TIMEOUT_MINUTES ?? '12') * 60_000;

const suffix = Date.now().toString(36).slice(-6);
const soloUser = `ci_${suffix}a`;
const viewUser = `ci_${suffix}b`;
const password = 'ci-hallohallo';

function log(...parts) {
  console.log(new Date().toISOString().slice(11, 19), '[e2e]', ...parts);
}

async function api(path, method, token, body) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, payload };
}

async function registerOrLogin(username) {
  const registered = await api('/api/v1/auth/register', 'POST', null, {
    user: { username, password },
  });
  if (registered.ok) {
    return registered.payload?.data?.token ?? registered.payload?.token;
  }
  const login = await api('/api/v1/auth/login', 'POST', null, { username, password });
  if (!login.ok) {
    throw new Error(`register failed (${registered.status}) and login failed (${login.status})`);
  }
  return login.payload?.data?.token ?? login.payload?.token;
}

function runAutoplayer(args, label) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(
      process.execPath,
      [resolve(mobileRoot, 'scripts/autoplay-full-game.mjs'), ...args],
      {
        cwd: mobileRoot,
        env: { ...process.env, API_BASE_URL: apiBaseUrl, WS_BASE_URL: wsBaseUrl },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );
    children.push(child);
    const lines = [];
    const forward = (chunk) => {
      for (const line of chunk.toString().split('\n')) {
        if (!line.trim()) continue;
        lines.push(line);
        console.log(`[${label}]`, line);
      }
    };
    child.stdout.on('data', forward);
    child.stderr.on('data', forward);
    child.on('close', (code) => {
      if (code === 0) resolvePromise(lines);
      else rejectPromise(new Error(`${label} exited with code ${code}`));
    });
    child.on('error', rejectPromise);
  });
}

const children = [];
function killChildren() {
  for (const child of children) {
    try {
      child.kill('SIGKILL');
    } catch {
      // already gone
    }
  }
}

async function captureMilestones(page, seen) {
  const milestones = [
    ['waiting-table', 'waiting'],
    ['bidding-window', 'bidding'],
    ['trump-window', 'trump'],
    ['seat-north', 'playing'],
    ['game-over-window', 'game-over'],
  ];
  for (const [testId, name] of milestones) {
    if (seen.has(name)) continue;
    try {
      if (await page.getByTestId(testId).first().isVisible({ timeout: 100 })) {
        seen.add(name);
        await page.screenshot({ path: resolve(artifactDir, `${name}.png`) });
        log(`milestone: ${name}`);
      }
    } catch {
      // milestone not on screen (or page busy) — keep polling
    }
  }
}

async function stageOneSoloGame() {
  log(`stage 1: solo full game as ${soloUser}`);
  await registerOrLogin(soloUser);
  await runAutoplayer(['--user', soloUser, '--password', password, '--max-minutes', '8'], 'solo');
  log('stage 1 passed: solo game reached game_over with progression summary');
}

async function stageTwoMultiplayerVideo() {
  log(`stage 2: multiplayer game with UI client as ${viewUser}`);
  const viewToken = await registerOrLogin(viewUser);
  await api('/api/v1/rooms/current/leave', 'DELETE', viewToken).catch(() => {});
  const created = await api('/api/v1/rooms', 'POST', viewToken, {
    name: `CI e2e ${suffix}`,
    settings: { min_games: 1, time_limit: 0, private: false },
    seats: { seat_2: 'ai', seat_4: 'ai' },
    bot_difficulty: 'basic',
  });
  if (!created.ok) {
    throw new Error(`create multiplayer room failed: ${JSON.stringify(created.payload)}`);
  }
  const roomCode = created.payload?.data?.code ?? created.payload?.code;
  log(`room ${roomCode} created (seat_3 open for the autoplayer)`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 1,
    recordVideo: { dir: artifactDir, size: { width: 844, height: 390 } },
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error?.message ?? error)));

  try {
    await page.goto(`${mobileBaseUrl}/(auth)/login`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'domcontentloaded' });

    // A fill that lands before React hydrates is silently lost (seen in CI:
    // username empty, password kept). Re-fill until the submit button —
    // which enables only when both fields hold values — actually enables.
    const userField = page.getByPlaceholder('Enter your username');
    const passField = page.getByPlaceholder('Enter your password');
    const signIn = page.getByRole('button', { name: 'Sign in' });
    await userField.waitFor({ timeout: 30_000 });
    let formReady = false;
    for (let attempt = 0; attempt < 6 && !formReady; attempt += 1) {
      await userField.fill(viewUser);
      await passField.fill(password);
      await page.waitForTimeout(500);
      formReady = await signIn.isEnabled();
    }
    if (!formReady) throw new Error('Sign in never enabled — login form did not accept input');
    await signIn.click();
    await page.waitForURL(/\/home$/, { timeout: 20_000 });
    log('UI login ok');

    await page.goto(`${mobileBaseUrl}/game/${roomCode}`, { waitUntil: 'domcontentloaded' });
    const seen = new Set();
    await captureMilestones(page, seen);

    const autoplayDone = runAutoplayer(
      ['--room', roomCode, '--user', soloUser, '--password', password, '--max-minutes', '10'],
      'multi'
    );

    // The UI seat never acts: the backend's turn timers play it. Poll for
    // milestone screenshots until the game-over overlay appears in the UI.
    const deadline = Date.now() + globalTimeoutMs;
    let uiGameOver = false;
    while (Date.now() < deadline) {
      await captureMilestones(page, seen);
      if (seen.has('game-over')) {
        uiGameOver = true;
        break;
      }
      await page.waitForTimeout(1_500);
    }
    await autoplayDone;
    if (!uiGameOver) {
      throw new Error('autoplayer finished but the UI never showed game-over-window');
    }
    log(`stage 2 passed: UI reached game over (milestones: ${[...seen].join(', ')})`);
    if (pageErrors.length) {
      log(`note: ${pageErrors.length} page error(s) during the game (non-fatal):`);
      for (const err of pageErrors.slice(0, 5)) log(`  ${err}`);
    }
    return { roomCode, milestones: [...seen], pageErrors: pageErrors.length };
  } catch (error) {
    await page.screenshot({ path: resolve(artifactDir, 'failure.png') }).catch(() => {});
    throw error;
  } finally {
    await context.close(); // flushes the video file
    await browser.close();
    // Chromium can leave more than one video segment; keep the largest as
    // the game recording and drop the rest.
    const segments = readdirSync(artifactDir)
      .filter((file) => file.endsWith('.webm') && file !== 'game.webm')
      .sort(
        (a, b) => statSync(resolve(artifactDir, b)).size - statSync(resolve(artifactDir, a)).size
      );
    segments.forEach((file, index) => {
      if (index === 0) renameSync(resolve(artifactDir, file), resolve(artifactDir, 'game.webm'));
      else rmSync(resolve(artifactDir, file));
    });
  }
}

function writeStepSummary(result, elapsedSeconds) {
  if (!process.env.GITHUB_STEP_SUMMARY) return;
  const lines = [
    '## Game e2e',
    '',
    `Full solo game (protocol) and full multiplayer game (real UI, room \`${result.roomCode}\`) both reached game over in ${elapsedSeconds}s.`,
    '',
    `- UI milestones captured: ${result.milestones.join(', ')}`,
    `- Page errors during the UI game: ${result.pageErrors}`,
    '- Video + screenshots: see the `game-e2e-artifacts` artifact on this run.',
    '',
  ];
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n'));
}

async function main() {
  const startedAt = Date.now();
  mkdirSync(artifactDir, { recursive: true });
  const watchdog = setTimeout(() => {
    console.error(`e2e watchdog: exceeded ${globalTimeoutMs / 60000} minutes, aborting`);
    killChildren();
    process.exit(1);
  }, globalTimeoutMs);

  await stageOneSoloGame();
  const result = await stageTwoMultiplayerVideo();

  clearTimeout(watchdog);
  const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000);
  writeStepSummary(result, elapsedSeconds);
  log(`e2e passed in ${elapsedSeconds}s`);
  process.exit(0);
}

main().catch((error) => {
  console.error('game e2e failed:', error);
  killChildren();
  process.exit(1);
});
