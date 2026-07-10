import { phoenixSocket } from '../channels/socket';
import { authStore } from '../stores/auth';

let initialized = false;

export function initRealtime() {
  if (initialized) return;
  initialized = true;

  try {
    phoenixSocket.initMobile(() => authStore.getState().accessToken);

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
    initialized = false;
    console.error('Failed to initialize realtime connection:', e);
  }
}
