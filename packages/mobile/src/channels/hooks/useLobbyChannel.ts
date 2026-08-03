import { useEffect, useRef } from 'react';
import { Channel, Presence } from 'phoenix';
import { batchedUpdates as unstable_batchedUpdates } from '@/utils/batchedUpdates';
import { phoenixSocket } from '../socket';
import { initRealtime } from '@/bootstrap/realtime';
import { useLobbyStore } from '@/stores/lobby';
import {
  flattenLobbyCategories,
  hasLobbyCategories,
  normalizeLobbyCategories,
  normalizeRoom,
  normalizeRooms,
} from '@/utils/rooms';

// Singleton channel reference to prevent multiple connections
let globalChannel: Channel | null = null;
let referenceCount = 0;

export const useLobbyChannel = (onRealtimeUpdate?: () => void) => {
  // Get store functions directly from the store to avoid dependency issues
  // These are stable references that won't change between renders
  const setRooms = useLobbyStore((s) => s.setRooms);
  const setLobby = useLobbyStore((s) => s.setLobby);
  const addRoom = useLobbyStore((s) => s.addRoom);
  const updateRoom = useLobbyStore((s) => s.updateRoom);
  const upsertLobbyRoom = useLobbyStore((s) => s.upsertLobbyRoom);
  const removeRoom = useLobbyStore((s) => s.removeRoom);
  const setStats = useLobbyStore((s) => s.setStats);
  const onRealtimeUpdateRef = useRef(onRealtimeUpdate);

  useEffect(() => {
    onRealtimeUpdateRef.current = onRealtimeUpdate;
  }, [onRealtimeUpdate]);

  useEffect(() => {
    initRealtime();

    referenceCount++;

    const connect = () => {
      if (globalChannel) return;

      const channel = phoenixSocket.channel('lobby');
      let presences = {};

      channel
        .join()
        .receive('ok', (response: any) => {
          onRealtimeUpdateRef.current?.();
          // Batch updates to avoid navigation context issues
          unstable_batchedUpdates(() => {
            const rawLobby = response?.lobby ?? response?.data?.lobby;
            if (hasLobbyCategories(rawLobby)) {
              const lobby = normalizeLobbyCategories(rawLobby);
              const rooms = flattenLobbyCategories(lobby);
              setLobby(lobby);
              setStats({ active_games: rooms.length });
              return;
            }

            const rooms = normalizeRooms(response?.rooms ?? response?.data?.rooms);
            setRooms(rooms);
            setStats({ active_games: rooms.length });
          });
        })
        .receive('error', (resp) => {
          console.error('[LobbyChannel] Unable to join', resp);
        });

      channel.on('lobby_update', (payload: any) => {
        onRealtimeUpdateRef.current?.();
        unstable_batchedUpdates(() => {
          const rawLobby = payload?.lobby ?? payload?.data?.lobby;
          if (hasLobbyCategories(rawLobby)) {
            const lobby = normalizeLobbyCategories(rawLobby);
            const rooms = flattenLobbyCategories(lobby);
            setLobby(lobby);
            setStats({ active_games: rooms.length });
            return;
          }

          const rooms = normalizeRooms(payload?.rooms ?? payload?.data?.rooms);
          setRooms(rooms);
          setStats({ active_games: rooms.length });
        });
      });

      channel.on('room_created', (payload: any) => {
        const room = payload?.room || payload?.data?.room;
        if (room) {
          onRealtimeUpdateRef.current?.();
          unstable_batchedUpdates(() => {
            if (payload?.category) {
              upsertLobbyRoom(normalizeRoom(room), payload.category);
            } else {
              addRoom(normalizeRoom(room));
            }
          });
        } else {
          console.warn('[LobbyChannel] Invalid room_created payload:', payload);
        }
      });

      channel.on('room_updated', (payload: any) => {
        const room = payload?.room || payload?.data?.room;
        if (room) {
          onRealtimeUpdateRef.current?.();
          unstable_batchedUpdates(() => {
            if (payload?.category) {
              upsertLobbyRoom(normalizeRoom(room), payload.category);
            } else {
              updateRoom(normalizeRoom(room));
            }
          });
        } else {
          console.warn('[LobbyChannel] Invalid room_updated payload:', payload);
        }
      });

      channel.on('room_closed', (payload: any) => {
        const code =
          payload?.code || payload?.room?.code || payload?.data?.code || payload?.room_code;
        const id = payload?.id || payload?.room?.id || payload?.data?.id;

        if (code || id) {
          onRealtimeUpdateRef.current?.();
          removeRoom(code || id);
        }
      });

      channel.on('presence_state', (state) => {
        presences = Presence.syncState(presences, state);
        const onlineCount = Object.keys(presences).length;
        setStats({ online_players: onlineCount });
      });

      channel.on('presence_diff', (diff) => {
        presences = Presence.syncDiff(presences, diff);
        const onlineCount = Object.keys(presences).length;
        setStats({ online_players: onlineCount });
      });

      globalChannel = channel;
    };

    connect();

    return () => {
      referenceCount--;
      if (referenceCount === 0 && globalChannel) {
        globalChannel.leave();
        globalChannel = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
