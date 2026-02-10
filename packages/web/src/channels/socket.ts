import { PhoenixSocket } from '@pidro/shared';
import { API_CONFIG } from '../platform/config';

class WebPhoenixSocket extends PhoenixSocket {
  private boundHandler: (() => void) | null = null;

  initWeb(getToken: () => string | null) {
    const socket = this.init({
      config: API_CONFIG,
      getToken,
    });

    this.setupVisibilityListener();
    return socket;
  }

  private setupVisibilityListener() {
    this.boundHandler = () => {
      if (document.visibilityState === 'visible') {
        this.connect();
      }
    };
    document.addEventListener('visibilitychange', this.boundHandler);
  }

  cleanup() {
    if (this.boundHandler) {
      document.removeEventListener('visibilitychange', this.boundHandler);
      this.boundHandler = null;
    }
    this.disconnect();
  }
}

export const phoenixSocket = new WebPhoenixSocket();
