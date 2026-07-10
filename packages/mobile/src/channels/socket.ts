import { AppState, AppStateStatus } from 'react-native';
import { PhoenixSocket } from '@pidro/shared';
import { API_CONFIG } from '@/constants/config';

class MobilePhoenixSocket extends PhoenixSocket {
  private appState: AppStateStatus = AppState.currentState;
  private appStateSub?: { remove: () => void };

  initMobile(getToken: () => string | null) {
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

      if (nextState === 'active') {
        this.connect();
      } else if (nextState === 'background') {
        this.disconnect();
      }
    });
  }
}

export const phoenixSocket = new MobilePhoenixSocket();
