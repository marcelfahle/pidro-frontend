import { AppState, AppStateStatus } from 'react-native';
import { PhoenixSocket } from '@pidro/shared';
import { API_CONFIG } from '@/constants/config';
import { gameDiagnostics } from '@/diagnostics/buffer';

class MobilePhoenixSocket extends PhoenixSocket {
  private appState: AppStateStatus = AppState.currentState;
  private appStateSub?: { remove: () => void };
  private getToken: () => string | null = () => null;

  initMobile(getToken: () => string | null) {
    this.getToken = getToken;
    const socket = this.init({
      config: API_CONFIG,
      getToken,
    });

    this.setupAppStateListener();
    return socket;
  }

  private setupAppStateListener() {
    this.appStateSub = AppState.addEventListener('change', (nextState) => {
      if (this.appState === nextState) return;
      this.appState = nextState;
      gameDiagnostics.record({
        type: 'lifecycle',
        code:
          nextState === 'active'
            ? 'foreground'
            : nextState === 'background'
              ? 'background'
              : 'paused',
        action: 'none',
      });

      if (nextState === 'active' && this.getToken()) {
        this.connect();
      } else if (nextState === 'background') {
        this.disconnect();
      }
    });
  }
}

export const phoenixSocket = new MobilePhoenixSocket();
