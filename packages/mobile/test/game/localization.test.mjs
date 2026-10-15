import { afterEach, expect, it } from 'bun:test';
import { setLocale } from '@pidro/shared';
import { buildHandLog, handLogEntries, presentHandLogEntry } from '../../src/game/handLog.ts';
import { enqueueTableNotice, tableNoticeText } from '../../src/game/tableNotices.ts';
import { initialTickerState, stepTicker } from '../../src/game/actionTickerSchedule.ts';
import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { normalizeRoom } from '@pidro/shared';
import { useGameStore, useGameViewModel } from '../../src/stores/game.ts';

afterEach(() => setLocale('en'));

it('localizes absent identities at the game boundary but never real Player or Bot usernames', async () => {
  const dom = new JSDOM('<div id="root"></div>');
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    IS_REACT_ACT_ENVIRONMENT: globalThis.IS_REACT_ACT_ENVIRONMENT,
  };
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const container = dom.window.document.getElementById('root');
  const root = createRoot(container);
  const store = useGameStore.getState();
  store.reset();
  store.initFromRoom({
    room: normalizeRoom({
      code: 'NAMES',
      seats: {
        north: { user_id: 'missing' },
        east: { user_id: 'named', username: 'Player' },
        south: { occupant_type: 'bot' },
        west: { user_id: 'bot_named', username: 'Bot' },
      },
    }),
    youPlayerId: 'viewer',
  });
  store.setServerState({ phase: 'playing', players: {} });
  function Consumer() {
    return createElement(
      'span',
      null,
      useGameViewModel()
        .players.map((p) => p.username)
        .join('|')
    );
  }
  try {
    setLocale('en');
    await act(async () => root.render(createElement(Consumer)));
    expect(container.textContent).toBe('Player|Player|Bot|Bot');
    await act(async () => setLocale('sv'));
    expect(container.textContent).toBe('Spelare|Player|Bot|Bot');
    expect(useGameStore.getState().playerMeta.north.username).toBe('');
    expect(useGameStore.getState().playerMeta.south.username).toBe('');
  } finally {
    await act(async () => root.unmount());
    store.reset();
    dom.window.close();
    Object.assign(globalThis, previous);
  }
});

it('rewords retained gameplay events without replaying them or mistaking a username for the viewer', () => {
  setLocale('en');
  const input = {
    handNumber: 2,
    bids: [{ position: 'south', amount: 7 }],
    trump: 'spades',
    tricks: [],
    lastHand: null,
    currentTrick: [{ player: 'east', card: { rank: 3, suit: 'clubs' } }],
    players: [
      { absolutePosition: 'south', username: 'Mia', isYou: true },
      { absolutePosition: 'east', username: 'You', isYou: false },
    ],
  };
  const en = handLogEntries(buildHandLog(input));
  expect(en.at(-1).text).toBe('You plays 3♣');
  const started = stepTicker(initialTickerState(), [], 100);
  const showing = stepTicker(
    started,
    en.map((entry) => entry.id),
    200
  );
  const queue = enqueueTableNotice(
    [],
    { key: 'table.joining', params: { name: 'You' }, variant: 'warning' },
    'ROOM'
  );
  const firstNotice = queue[0];
  const englishNotice = tableNoticeText(firstNotice);

  setLocale('sv');
  const sv = handLogEntries(buildHandLog(input));
  expect(sv.map((entry) => entry.id)).toEqual(en.map((entry) => entry.id));
  expect(presentHandLogEntry(en[0]).text).toBe('Du bjöd 7');
  expect(presentHandLogEntry(en.at(-1)).text).toBe('You spelar 3♣');
  expect(
    stepTicker(
      showing,
      sv.map((entry) => entry.id),
      250
    )
  ).toBe(showing);
  expect(showing.lines.every((line) => line.shownAt === 200)).toBe(true);
  expect(tableNoticeText(firstNotice)).not.toBe(englishNotice);
  expect(tableNoticeText(firstNotice)).toContain('You');
  expect(
    enqueueTableNotice(
      queue,
      { key: 'table.joining', params: { name: 'You' }, variant: 'warning' },
      'ROOM'
    )[0]
  ).toBe(firstNotice);
  expect(queue).toHaveLength(1);
});

it('keeps original failures for live safe fallback without exposing server English', () => {
  const error = { reason: 'Private unexpected server explanation' };
  const notice = enqueueTableNotice([], { error, variant: 'error' }, 'ROOM')[0];
  setLocale('en');
  const en = tableNoticeText(notice);
  setLocale('sv');
  expect(tableNoticeText(notice)).not.toBe(en);
  expect(tableNoticeText(notice)).not.toContain('Private');
  expect(notice.error).toBe(error);
});
