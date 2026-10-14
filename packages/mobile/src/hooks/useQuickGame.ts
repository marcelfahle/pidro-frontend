import { useState } from 'react';
import { useRouter } from 'expo-router';
import { lobbyApi } from '@/api/lobby';
import { createSoloRoom } from '@/features/game/solo';
import { gameRoute } from '@/navigation/gameRoute';
import { useLobbyStore } from '@/stores/lobby';
import { apiErrorInfo } from '@/utils/apiErrors';

export const TABLE_UNKNOWN_ERROR =
  'We could not check whether you are at another table. Please try again.';

/** You and three bots, started the same way from Home and from an empty Tables screen. */
export function useQuickGame(playerName: string, initialError: string | null = null) {
  const router = useRouter();
  const upsertLobbyRoom = useLobbyStore((state) => state.upsertLobbyRoom);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  const createSinglePlayerRoom = async () => {
    const response = await createSoloRoom(playerName);
    if (response.room) upsertLobbyRoom(response.room, 'my_rejoinable');
    router.replace(gameRoute(response.code, 'single-player'));
  };

  const start = async () => {
    setLoading(true);
    setError(null);

    try {
      await createSinglePlayerRoom();
    } catch (err: unknown) {
      const { code, detail } = apiErrorInfo(err);
      if (code === 'ALREADY_IN_ROOM') {
        const lobbyResponse = await lobbyApi.listLobby().catch(() => null);
        if (!lobbyResponse) {
          // Without the lobby we cannot tell a solo table from a live multiplayer one.
          setError(TABLE_UNKNOWN_ERROR);
        } else if (lobbyResponse.lobby.my_rejoinable.length) {
          setError('You already have a multiplayer table. Rejoin it or leave it first.');
          router.push('/lobby');
        } else {
          try {
            // No table left to leave is the state we wanted.
            await lobbyApi.leaveRoom('current').catch(() => undefined);
            await createSinglePlayerRoom();
          } catch (retryError) {
            const retryDetail = apiErrorInfo(retryError).detail;
            setError(
              retryDetail
                ? `We could not start a solo game: ${retryDetail}`
                : 'We could not clear your previous solo table. Please try again.'
            );
          }
        }
      } else {
        setError(
          detail
            ? `We could not start a solo game: ${detail}`
            : 'We could not start a solo game. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return { start, loading, error };
}
