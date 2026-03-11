import { Socket, Channel } from 'phoenix';
import type { PlatformConfig } from '../platform/types';

export type TokenGetter = () => string | null;

export interface PhoenixSocketOptions {
  config: PlatformConfig;
  getToken: TokenGetter;
}

export class PhoenixSocket {
  private socket: Socket | null = null;
  private tokenGetter: TokenGetter | null = null;

  private reconnectDelay(tries: number) {
    const schedule = [1000, 2000, 3000, 5000, 8000, 10_000];
    return schedule[Math.max(0, Math.min(tries - 1, schedule.length - 1))] ?? 10_000;
  }

  init({ config, getToken }: PhoenixSocketOptions) {
    if (this.socket) return this.socket;
    this.tokenGetter = getToken;

    this.socket = new Socket(config.wsURL, {
      params: () => {
        const token = this.tokenGetter?.();
        return token ? { token } : {};
      },
      heartbeatIntervalMs: 15_000,
      reconnectAfterMs: (tries: number) => this.reconnectDelay(tries),
    });

    return this.socket;
  }

  get(): Socket {
    if (!this.socket) {
      throw new Error('[Socket] Not initialized. Call init() first.');
    }
    return this.socket;
  }

  connect() {
    if (!this.socket) return;
    if (!this.socket.isConnected()) {
      this.socket.connect();
    }
  }

  disconnect() {
    this.socket?.disconnect();
  }

  channel(topic: string, params?: any): Channel {
    return this.get().channel(topic, params);
  }
}
