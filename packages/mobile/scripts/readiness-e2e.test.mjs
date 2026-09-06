import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { chromium } from 'playwright';
import { confirmInitialTable } from './readiness-e2e.mjs';

test('browser readiness: old server, delayed four humans, premature start, and reset', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const pages = await Promise.all(Array.from({ length: 4 }, () => browser.newPage()));
    await pages[0].setContent('<div class="active">Playing</div>');
    assert.equal(await confirmInitialTable([pages[0]], '.active'), false);

    const clicks = [];
    for (const [index, page] of pages.entries()) {
      await page.exposeFunction('confirm', async () => {
        clicks.push({ index, at: Date.now() });
        if (clicks.length === 4) {
          await Promise.all(pages.map((p) => p.setContent('<div class="active">Playing</div>')));
        }
      });
      await page.setContent(`<p>Loading</p><script>
        setTimeout(() => {
          document.body.innerHTML = "<button>I'm ready</button>";
          document.querySelector('button').onclick = function () {
            this.disabled = true; this.textContent = "You're ready"; window.confirm();
          };
        }, ${index * 300});
      </script>`);
    }
    let waiting = false;
    assert.equal(
      await confirmInitialTable(pages, '.active', {
        onWaiting: async () => {
          waiting = true;
          assert.equal(clicks.length, 0);
        },
      }),
      true
    );
    assert.equal(waiting, true);
    assert.deepEqual(
      clicks.map(({ index }) => index),
      [0, 1, 2, 3]
    );
    assert.ok(clicks.slice(1).every((click, i) => click.at - clicks[i].at >= 1_400));

    await pages[0].setContent("<button>I'm ready</button>");
    await assert.rejects(
      confirmInitialTable([pages[0]], '.active', {
        onWaiting: () => pages[0].setContent('<div class="active">Premature start</div>'),
      }),
      /before every human/
    );

    for (const page of pages.slice(0, 2)) {
      await page.setContent(
        `<button onclick="this.disabled = true; setTimeout(() => this.disabled = false, 200)">I'm ready</button>`
      );
    }
    await assert.rejects(confirmInitialTable(pages.slice(0, 2), '.active'), /Readiness reset/);
  } finally {
    await browser.close();
  }
});

test('autoplay confirms only on joined channel, once, and preserves existing room seat', async () => {
  // Run the actual script with transport/API boundaries stubbed, without spawning a game.
  const source = (await readFile(new URL('./autoplay-full-game.mjs', import.meta.url), 'utf8'))
    .replace(/^import .*;$/gm, '')
    .replace(/main\(\)\.catch\([\s\S]*$/, 'globalThis.run = main;');
  const requests = [];
  const pushes = [];
  const events = {};
  let joinAck;
  const channel = {
    on: (event, callback) => {
      events[event] = callback;
    },
    join: () => ({
      receive(event, callback) {
        if (event === 'ok') joinAck = callback;
        return this;
      },
    }),
    push: (event, payload) => {
      const callbacks = {};
      pushes.push({ event, payload, callbacks });
      return {
        receive(event, callback) {
          callbacks[event] = callback;
          return this;
        },
      };
    },
  };
  const context = vm.createContext({
    console: { log() {}, error() {} },
    process: {
      env: {},
      argv: ['node', 'script', '--room', 'ROOM'],
      exit: (code) => {
        throw new Error(`exit ${code}`);
      },
    },
    fetch: async (url, options) => {
      requests.push({ url, method: options.method });
      return { ok: true, json: async () => ({ data: { token: 'test-token' } }) };
    },
    Socket: class {
      connect() {}
      channel() {
        return channel;
      }
    },
    WebSocket: class {},
    setTimeout: () => 1,
    clearTimeout() {},
  });
  vm.runInContext(source, context);
  await context.run();
  assert.equal(
    requests.some(({ method }) => method === 'DELETE'),
    false
  );
  const full = {
    room_id: 'id',
    ready_epoch: 4,
    snapshot_revision: 2,
    status: 'waiting',
    positions: { north: 'human', east: 'bot1', south: 'bot2', west: 'bot3' },
  };
  events.readiness_updated(full);
  assert.equal(pushes.length, 0, 'must wait for channel join acknowledgement');
  joinAck({ position: 'north', readiness: { ...full, snapshot_revision: 1 } });
  assert.equal(pushes.length, 1);
  assert.equal(pushes[0].event, 'ready');
  assert.equal(
    JSON.stringify(pushes[0].payload),
    JSON.stringify({ room_id: 'id', ready_epoch: 4 })
  );
  events.readiness_updated({ ...full, snapshot_revision: 3 });
  events.readiness_updated({ ...full, snapshot_revision: 1, ready_epoch: 3 });
  assert.equal(pushes.length, 1, 'new revisions and stale events must not reconfirm');
  assert.throws(
    () => events.readiness_updated({ ...full, snapshot_revision: 4, ready_epoch: 5 }),
    /exit 1/
  );
  assert.throws(() => pushes[0].callbacks.error({ reason: 'stale_epoch' }), /exit 1/);
  assert.equal(pushes.length, 1);

  pushes.length = 0;
  await context.run();
  joinAck({ position: 'north', state: { phase: 'bidding' } });
  assert.equal(pushes.length, 0, 'old backend needs no ready intent');

  await context.run();
  joinAck({
    position: 'north',
    readiness: {
      ...full,
      snapshot_revision: 1,
      positions: { ...full.positions, west: null },
    },
  });
  assert.equal(pushes.length, 0, 'incomplete table must not confirm');
  events.readiness_updated(full);
  assert.equal(pushes.length, 1, 'initial full roster event confirms once');
});
