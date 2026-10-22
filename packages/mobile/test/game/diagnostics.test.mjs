import { describe, expect, it } from 'bun:test';
import { DiagnosticBuffer, gameDiagnostics } from '../../src/diagnostics/buffer.ts';
import { blockedPlay, cardTap, pushAttempt } from '../../src/diagnostics/actions.ts';
describe('private game diagnostics', () => {
  it('retains only 100 allowlisted events, rebases offsets and expires events after 24h', () => {
    let now = 100;
    const buffer = new DiagnosticBuffer(() => now);
    buffer.identify('owner', 'ABCD');
    buffer.observe({ game_instance_id: 'opaque_instance', state_revision: 17 });
    for (let n = 0; n < 130; n++) {
      now += 7;
      buffer.record({ type: 'tap', code: 'pending', action: 'play_card' });
    }
    const snapshot = buffer.snapshot();
    expect(snapshot.events).toHaveLength(100);
    expect(snapshot.events[0].offset_ms).toBe(0);
    expect(snapshot.events[99].offset_ms).toBe(693);
    now += 86400000;
    expect(buffer.snapshot().events).toHaveLength(1);
    now++;
    expect(buffer.snapshot()).toBeNull();
  });
  it('copies allowed fields only, never raw errors, cards, coordinates or credentials', () => {
    const buffer = new DiagnosticBuffer();
    buffer.identify('owner', 'ABCD');
    buffer.observe({ game_instance_id: 'instance', state_revision: 8 });
    const contaminated = {
      type: 'push',
      code: 'failed',
      action: 'play_card',
      action_id: 'attempt-1',
      state_revision: 12,
      password: 'secret',
      jwt: 'secret',
      email: 'private@example.com',
      card: { rank: 14, suit: 'spades' },
      x: 33,
      state: { hand: ['secret'] },
    };
    buffer.record(contaminated);
    contaminated.state_revision = 200;
    expect(buffer.snapshot().events.at(-1)).toEqual({
      type: 'push',
      code: 'failed',
      action: 'play_card',
      action_id: 'attempt-1',
      state_revision: 12,
      offset_ms: expect.any(Number),
    });
    buffer.record(
      JSON.parse(
        '{"type":"push","code":"secret error","action":"secret","action_id":"bad token","state_revision":-1}'
      )
    );
    expect(buffer.snapshot().events.at(-1)).toEqual({
      type: 'push',
      code: 'failed',
      action: 'none',
      offset_ms: expect.any(Number),
    });
    expect(JSON.stringify(buffer.snapshot())).not.toContain('secret');
    expect(JSON.stringify(buffer.snapshot()).length).toBeLessThan(32768);
  });
  it('keeps a frozen incident distinct from rematches, room reuse and identity changes', () => {
    const buffer = new DiagnosticBuffer();
    buffer.identify('first', 'ABCD');
    buffer.observe({ game_instance_id: 'game-A', state_revision: 19 });
    buffer.rendered({ game_instance_id: 'game-A', state_revision: 18 });
    buffer.record({ type: 'tap', code: 'pending', action: 'play_card' });
    const incident = buffer.snapshot();
    expect(incident.events.at(-1)?.state_revision).toBe(18);
    const oldReply = buffer.attempt('play_card', 'old-attempt');
    buffer.identify('first', 'ABCD');
    expect(buffer.snapshot().events).toEqual(incident.events);
    buffer.observe({ game_instance_id: 'game-B', state_revision: 0 });
    oldReply('timeout', 'unavailable');
    buffer.rendered({ game_instance_id: 'game-A', state_revision: 20 });
    expect(buffer.snapshot().events).toHaveLength(1);
    expect(incident.game_instance_id).toBe('game-A');
    expect(incident.events.at(-1)?.state_revision).toBe(18);
    buffer.identify('second', 'ABCD');
    expect(buffer.snapshot()).toBeNull();
    buffer.observe({ game_instance_id: 'game-B', state_revision: 1 });
    expect(buffer.snapshot().owner).toBe('second');
    buffer.identify('second', 'EFGH');
    expect(buffer.snapshot()).toBeNull();
    buffer.observe({});
    expect(buffer.snapshot()).toBeNull();
    buffer.identify(null, null);
    expect(buffer.snapshot()).toBeNull();
  });
  it('distinguishes a local guard from rejected and timed-out plays with per-attempt IDs', () => {
    gameDiagnostics.identify('test', 'TEST');
    gameDiagnostics.observe({ game_instance_id: 'test-instance', state_revision: 5 });
    cardTap(() => blockedPlay('pending'));
    cardTap(() => {
      const attempt = pushAttempt('play_card');
      attempt.record('push', 'pending');
      attempt.record('push', 'must_follow_suit');
    });
    cardTap(() => {
      const attempt = pushAttempt('play_card');
      attempt.record('push', 'pending');
      attempt.record('timeout', 'unavailable');
    });
    const events = gameDiagnostics.snapshot().events.slice(1);
    expect(events.map(({ type, code }) => `${type}:${code}`)).toEqual([
      'tap:pending',
      'blocked:pending',
      'tap:pending',
      'push:pending',
      'push:must_follow_suit',
      'tap:pending',
      'push:pending',
      'timeout:unavailable',
    ]);
    const taps = events.filter((event) => event.type === 'tap');
    expect(new Set(taps.map((event) => event.action_id)).size).toBe(3);
    expect(events[0].action_id).toBe(events[1].action_id);
    expect(events[2].action_id).toBe(events[4].action_id);
    expect(events[5].action_id).toBe(events[7].action_id);
    for (const tap of taps) expect(tap.action_id).toMatch(/^[a-f0-9-]{36}$/);
    gameDiagnostics.identify(null, null);
  });
});
