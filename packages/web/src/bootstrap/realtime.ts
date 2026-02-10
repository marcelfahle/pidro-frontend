import { phoenixSocket } from '../channels/socket';
import { authStore } from '../stores/auth';

export function initRealtime() {
  try {
    phoenixSocket.initWeb(() => authStore.getState().accessToken);

    authStore.subscribe((state) => {
      if (state.accessToken) {
        phoenixSocket.connect();
      } else {
        phoenixSocket.disconnect();
      }
    });

    if (authStore.getState().accessToken) {
      phoenixSocket.connect();
    }
  } catch (e) {
    console.error('Failed to initialize realtime connection:', e);
  }
}
