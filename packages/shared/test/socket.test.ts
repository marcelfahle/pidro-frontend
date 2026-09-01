import { describe, expect, it } from 'bun:test';
import { PhoenixSocket } from '../src/channels/socket';

describe('PhoenixSocket connection lifecycle', () => {
  it('reconnects after an in-flight disconnect finishes', () => {
    const client = new PhoenixSocket();
    const socket = client.init({
      config: { apiURL: 'https://example.test', wsURL: 'wss://example.test/socket' },
      getToken: () => 'token',
    });
    let finishDisconnect: (() => void) | undefined;
    let connectCalls = 0;
    let connected = true;

    socket.isConnected = () => connected;
    socket.disconnect = (callback?: () => void) => {
      finishDisconnect = () => {
        connected = false;
        callback?.();
      };
    };
    socket.connect = () => {
      connectCalls += 1;
      connected = true;
    };

    client.disconnect();
    client.connect();

    expect(connectCalls).toBe(0);
    expect(finishDisconnect).toBeDefined();

    finishDisconnect?.();

    expect(connectCalls).toBe(1);
  });

  it('does not reconnect after a later disconnect intent', () => {
    const client = new PhoenixSocket();
    const socket = client.init({
      config: { apiURL: 'https://example.test', wsURL: 'wss://example.test/socket' },
      getToken: () => 'token',
    });
    let finishDisconnect: (() => void) | undefined;
    let connectCalls = 0;
    let connected = true;

    socket.isConnected = () => connected;
    socket.disconnect = (callback?: () => void) => {
      finishDisconnect = () => {
        connected = false;
        callback?.();
      };
    };
    socket.connect = () => {
      connectCalls += 1;
      connected = true;
    };

    client.disconnect();
    client.connect();
    client.disconnect();
    finishDisconnect?.();

    expect(connectCalls).toBe(0);
  });
});
