import { describe, expect, it, mock } from 'bun:test';

let onAppStateChange;

mock.module('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: (_event, listener) => {
      onAppStateChange = listener;
      return { remove: () => {} };
    },
  },
  Platform: { OS: 'ios' },
}));

const { phoenixSocket } = await import('../../src/channels/socket.ts');

describe('mobile socket AppState lifecycle', () => {
  it('disconnects in background and reconnects an authenticated foreground session', () => {
    let token = 'token';
    let connectCalls = 0;
    let disconnectCalls = 0;

    phoenixSocket.initMobile(() => token);
    phoenixSocket.connect = () => {
      connectCalls += 1;
    };
    phoenixSocket.disconnect = () => {
      disconnectCalls += 1;
    };

    onAppStateChange('background');
    onAppStateChange('background');
    onAppStateChange('active');

    expect(disconnectCalls).toBe(1);
    expect(connectCalls).toBe(1);

    token = null;
    onAppStateChange('background');
    onAppStateChange('active');

    expect(disconnectCalls).toBe(2);
    expect(connectCalls).toBe(1);
  });
});
