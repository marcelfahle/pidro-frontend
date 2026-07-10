/**
 * Drives a full bot game to completion over the real game channel.
 *
 * Logs in, creates (or reuses) a 3-bot room, joins game:CODE, and whenever
 * legal actions arrive it plays a simple strategy (bid the minimum once in a
 * while, otherwise pass; play the first legal card) until phase=game_over.
 * Prints every phase/score transition and the progression_summary payload —
 * this verifies the backend loop AND gives us a real game-over room to
 * inspect in the UI.
 *
 * Usage: node scripts/autoplay-full-game.mjs [--user skiatest1] [--room CODE]
 */
import { Socket } from 'phoenix';
import WebSocket from 'ws';

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:4001';
const wsBaseUrl = process.env.WS_BASE_URL ?? 'ws://127.0.0.1:4001/socket';

const args = process.argv.slice(2);
function argValue(flag, fallback) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : fallback;
}
const username = argValue('--user', 'skiatest1');
const password = argValue('--password', 'hallohallo');
const fixedRoom = argValue('--room', null);
const maxMinutes = Number(argValue('--max-minutes', '20'));

function log(...parts) {
  console.log(new Date().toISOString().slice(11, 19), ...parts);
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

async function main() {
  const login = await api('/api/v1/auth/login', 'POST', null, {
    username,
    password,
  });
  if (!login.ok) throw new Error(`login failed: ${login.status}`);
  const token = login.payload?.data?.token ?? login.payload?.token;
  log(`logged in as ${username}`);

  let roomCode = fixedRoom;
  if (roomCode) {
    // Take a seat if we don't have one yet (fresh joiner into a waiting room).
    await api('/api/v1/rooms/current/leave', 'DELETE', token).catch(() => {});
    const joined = await api(`/api/v1/rooms/${roomCode}/join`, 'POST', token, {});
    log(
      joined.ok
        ? `took a seat in ${roomCode}`
        : `seat join skipped (${JSON.stringify(joined.payload)?.slice(0, 120) ?? joined.status})`,
    );
  }
  if (!roomCode) {
    await api('/api/v1/rooms/current/leave', 'DELETE', token).catch(() => {});
    const created = await api('/api/v1/rooms', 'POST', token, {
      name: `Autoplay ${Date.now().toString().slice(-6)}`,
      settings: { min_games: 1, time_limit: 0, private: false },
      seats: { seat_2: 'ai', seat_3: 'ai', seat_4: 'ai' },
      bot_difficulty: 'basic',
    });
    if (!created.ok)
      throw new Error(`create room failed: ${JSON.stringify(created.payload)}`);
    roomCode = created.payload?.data?.code ?? created.payload?.code;
  }
  log(`room ${roomCode}`);

  const socket = new Socket(wsBaseUrl, {
    transport: WebSocket,
    params: { token },
  });
  socket.connect();

  const channel = socket.channel(`game:${roomCode}`);
  let lastPhase = null;
  let lastScores = '';
  let acting = false;
  let finished = false;

  function chooseAction(actions, state) {
    const first = (type) => actions.find((a) => a.type === type);
    // Occasionally take the bid on the first hand so both outcomes exercise;
    // otherwise pass when possible, else minimum bid.
    const bidActions = actions
      .filter((a) => a.type === 'bid')
      .sort((a, b) => a.amount - b.amount);
    if (first('select_dealer')) return ['select_dealer', {}];
    if (first('declare_trump')) {
      // pick the suit we hold most of
      const hand = state?.hands?.[state?.your_position] ?? state?.your_hand ?? [];
      const counts = {};
      for (const c of hand) counts[c.suit] = (counts[c.suit] ?? 0) + 1;
      const best =
        Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'hearts';
      return ['declare_trump', { suit: best }];
    }
    if (first('select_hand')) {
      const act = first('select_hand');
      return ['select_hand', { cards: act.cards }];
    }
    if (first('play_card')) {
      const act = first('play_card');
      return ['play_card', { card: { rank: act.card.rank, suit: act.card.suit } }];
    }
    if (first('pass')) return ['pass', {}];
    if (bidActions.length) return ['bid', { amount: bidActions[0].amount }];
    return null;
  }

  function handleState(payload) {
    const state = payload?.state ?? payload?.game_state ?? payload;
    if (!state || typeof state !== 'object' || !('phase' in state)) return;
    const actions = payload?.legal_actions ?? [];

    const scores = JSON.stringify(state.scores ?? null);
    if (state.phase !== lastPhase || scores !== lastScores) {
      log(
        `phase=${state.phase} hand=${state.hand_number ?? '?'} scores=${scores} legal=${actions.length}`,
      );
      lastPhase = state.phase;
      lastScores = scores;
    }

    if (state.phase === 'game_over' || state.phase === 'complete') {
      log('GAME OVER', scores);
      finished = true;
      setTimeout(() => process.exit(0), 8000); // wait for progression_summary
      return;
    }

    if (!actions.length || acting) return;
    const choice = chooseAction(actions, state);
    if (!choice) return;
    acting = true;
    setTimeout(() => {
      channel
        .push(choice[0], choice[1])
        .receive('ok', () => {
          acting = false;
        })
        .receive('error', (err) => {
          log(`action ${choice[0]} rejected: ${JSON.stringify(err)}`);
          acting = false;
        })
        .receive('timeout', () => {
          acting = false;
        });
      log(`-> ${choice[0]} ${JSON.stringify(choice[1]).slice(0, 60)}`);
    }, 400);
  }

  channel.on('game_state', handleState);
  channel.on('progression_summary', (payload) => {
    log('PROGRESSION_SUMMARY', JSON.stringify(payload));
    if (finished) process.exit(0);
  });

  channel
    .join()
    .receive('ok', (resp) => {
      log(`joined game:${roomCode} as ${resp?.position ?? '?'}`);
      handleState(resp);
    })
    .receive('error', (err) => {
      console.error('join failed', err);
      process.exit(1);
    });

  setTimeout(() => {
    console.error(`timed out after ${maxMinutes} minutes; phase=${lastPhase}`);
    process.exit(2);
  }, maxMinutes * 60_000);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
