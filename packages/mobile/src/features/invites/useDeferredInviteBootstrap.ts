import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { invitesApi } from '@/api/invites';
import { useAuthStore } from '@/stores/auth';
import { holdFriendLink, usePendingFriendLinkStore } from '@/stores/pendingFriendLink';
import { usePendingInviteStore } from '@/stores/pendingInvite';
import { resolveDeferredInstall } from './deferredInstall';
import { getInstallId } from './installId';
import {
  readDeferredFingerprint,
  readInstallationTime,
  readPlayInstallReferrer,
} from './nativeDeferredSignals';

export function useDeferredInviteBootstrap(): boolean {
  const authHydrated = useAuthStore((state) => state.hydrated);
  const pendingHydrated = usePendingInviteStore((state) => state.hydrated);
  const friendLinkHydrated = usePendingFriendLinkStore((state) => state.hydrated);
  const pendingInvite = usePendingInviteStore((state) => state.pendingInvite);
  const setPendingInvite = usePendingInviteStore((state) => state.setPendingInvite);
  const started = useRef(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    if (!authHydrated || !pendingHydrated || !friendLinkHydrated || started.current) return;
    started.current = true;
    let active = true;

    void resolveDeferredInstall({
      pendingInvite,
      platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'other',
      storage: AsyncStorage,
      now: Date.now,
      getInstallationTime: readInstallationTime,
      getPlayReferrer: readPlayInstallReferrer,
      getFingerprint: readDeferredFingerprint,
      getInstallId,
      resolve: (request, signal) => invitesApi.resolveDeferred(request, signal),
    }).then((match) => {
      if (!active) return;
      if (match?.code) setPendingInvite(match.code, 'deferred');
      if (match?.friend) holdFriendLink(match.friend.slug, match.friend.display_name);
      setComplete(true);
    });

    return () => {
      active = false;
    };
  }, [authHydrated, friendLinkHydrated, pendingHydrated, pendingInvite, setPendingInvite]);

  return complete;
}
