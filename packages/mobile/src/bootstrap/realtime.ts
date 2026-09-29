import { phoenixSocket } from '../channels/socket';
import { authStore } from '../stores/auth';

let initialized = false;

export function initRealtime() {
  if (initialized) return;
  initialized = true;

  try {
    phoenixSocket.initMobile(() => authStore.getState().accessToken);

    authStore.subscribe((state, previous) => {
      if (!state.accessToken) {
        phoenixSocket.disconnect();
      } else if (previous.user?.id && previous.user.id !== state.user?.id) {
        phoenixSocket.disconnect();
        phoenixSocket.connect();
      } else {
        // Same-player guest upgrades intentionally keep the live connection.
        // connect() still refreshes the credential used by auto-reconnect.
        phoenixSocket.connect();
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
