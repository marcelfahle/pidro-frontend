import { useEffect } from 'react';
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

export const useLobbyChannel = () => {
  // Get store functions directly from the store to avoid dependency issues
  // These are stable references that won't change between renders
  const setRooms = useLobbyStore((s) => s.setRooms);
  const setLobby = useLobbyStore((s) => s.setLobby);
  const addRoom = useLobbyStore((s) => s.addRoom);
  const updateRoom = useLobbyStore((s) => s.updateRoom);
  const upsertLobbyRoom = useLobbyStore((s) => s.upsertLobbyRoom);
  const removeRoom = useLobbyStore((s) => s.removeRoom);
  const setStats = useLobbyStore((s) => s.setStats);

  useEffect(() => {
    initRealtime();

    referenceCount++;
    console.log('[LobbyChannel] Hook mounted, refCount=', referenceCount);

    const connect = () => {
      if (globalChannel) return;

      const channel = phoenixSocket.channel('lobby');
      let presences = {};

      channel
        .join()
        .receive('ok', (response: any) => {
          console.log('[LobbyChannel] Joined successfully', response);
          // Batch updates to avoid navigation context issues
          unstable_batchedUpdates(() => {
            const rawLobby = response?.lobby ?? response?.data?.lobby;
            if (hasLobbyCategories(rawLobby)) {
              const lobby = normalizeLobbyCategories(rawLobby);
              const rooms = flattenLobbyCategories(lobby);
              console.log('[LobbyChannel] Initializing categorized lobby from join response');
              setLobby(lobby);
              setStats({ active_games: rooms.length });
              return;
            }

            const rooms = normalizeRooms(response?.rooms ?? response?.data?.rooms);
            console.log('[LobbyChannel] Initializing rooms from join response');
            setRooms(rooms);
            setStats({ active_games: rooms.length });
          });
        })
        .receive('error', (resp) => {
          console.error('[LobbyChannel] Unable to join', resp);
        });

      channel.on('lobby_update', (payload: any) => {
        console.log('[LobbyChannel] lobby_update received:', payload);
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
        console.log('[LobbyChannel] room_created received:', payload);
        const room = payload?.room || payload?.data?.room;
        if (room) {
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
        console.log('[LobbyChannel] room_updated received:', payload);
        const room = payload?.room || payload?.data?.room;
        if (room) {
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
        console.log('[LobbyChannel] room_closed received:', payload);
        const code =
          payload?.code || payload?.room?.code || payload?.data?.code || payload?.room_code;
        const id = payload?.id || payload?.room?.id || payload?.data?.id;

        if (code || id) {
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
      console.log('[LobbyChannel] Hook unmounting, refCount=', referenceCount);
      if (referenceCount === 0 && globalChannel) {
        console.log('[LobbyChannel] Leaving channel (no listeners)');
        globalChannel.leave();
        globalChannel = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
