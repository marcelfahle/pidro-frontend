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

  init({ config, getToken }: PhoenixSocketOptions) {
    if (this.socket) return this.socket;
    this.tokenGetter = getToken;

    this.socket = new Socket(config.wsURL, {
      params: () => {
        const token = this.tokenGetter?.();
        return token ? { token } : {};
      },
      heartbeatIntervalMs: 30_000,
      reconnectAfterMs: (tries: number) => [1000, 2000, 5000, 10_000][tries - 1] ?? 10_000,
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
