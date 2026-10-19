import { useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { CreateRoomRequest } from '@pidro/shared';
import { lobbyApi } from '@/api/lobby';
import { captureAnalytics } from '@/analytics/PostHogAnalytics';
import { AuthSheet } from '@/components/auth/AuthSheet';
import { NewTableScreen } from '@/components/lobby/NewTableScreen';
import { useTranslation, type TranslationKey } from '@/i18n';
import { useLobbyStore } from '@/stores/lobby';
import { apiErrorInfo, localizedError } from '@/utils/apiErrors';

export default function NewTableRoute() {
  const { partner } = useLocalSearchParams<{ partner?: string }>();
  const router = useRouter();
  useTranslation();
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [failure, setFailure] = useState<{ error?: unknown; key: TranslationKey }>();
  const [accountOpen, setAccountOpen] = useState(false);
  const pending = useRef<CreateRoomRequest | null>(null);
  const create = async (data: CreateRoomRequest, mayRequestAccount = true) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setFailure(undefined);
    try {
      let response;
      try {
        response = await lobbyApi.createRoom(data);
      } catch (error) {
        if (apiErrorInfo(error).code !== 'ALREADY_IN_ROOM') throw error;
        const current = await lobbyApi.listLobby().catch(() => null);
        if (!current) {
          setFailure({ key: 'social.quick_unknown' });
          return;
        }
        useLobbyStore.getState().setLobby(current.lobby);
        if (current.lobby.my_rejoinable.length) {
          setFailure({ key: 'social.already_table' });
          return;
        }
        await lobbyApi.leaveRoom('current').catch(() => undefined);
        response = await lobbyApi.createRoom(data);
      }
      if (!response?.code) throw new Error('No room code returned');
      captureAnalytics('room_created', {
        creation_source: 'lobby',
        has_bots: Object.values(data.seats ?? {}).some((seat) => seat === 'ai'),
      });
      useLobbyStore.getState().upsertLobbyRoom(response.room, 'my_rejoinable');
      router.replace(`/game/${response.code}`);
    } catch (error) {
      if (apiErrorInfo(error).code === 'ACCOUNT_REQUIRED' && mayRequestAccount) {
        pending.current = data;
        setAccountOpen(true);
      } else
        setFailure({
          error,
          key:
            apiErrorInfo(error).code === 'ACCOUNT_REQUIRED'
              ? 'social.account_error'
              : 'social.create_error',
        });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  return (
    <>
      <NewTableScreen
        partner={partner}
        onSubmit={(request) => void create(request)}
        onLeave={() => (router.canGoBack() ? router.back() : router.replace('/lobby'))}
        busy={busy}
        error={failure ? localizedError(failure.error, failure.key) : undefined}
      />
      <AuthSheet
        isOpen={accountOpen}
        reason="multiplayer"
        onClose={() => {
          pending.current = null;
          setAccountOpen(false);
        }}
        onSaved={() => {
          const request = pending.current;
          pending.current = null;
          setAccountOpen(false);
          if (request) void create(request, false);
        }}
        onClaimClassic={() => {
          pending.current = null;
          setAccountOpen(false);
          router.push('/(auth)/claim-classic');
        }}
      />
    </>
  );
}
