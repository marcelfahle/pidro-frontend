import { normalizeRoom, normalizeRooms, useLobbyStore } from '@pidro/shared';
import type { Channel } from 'phoenix';
import { Presence } from 'phoenix';
import { useEffect } from 'react';
import { phoenixSocket } from './socket';

let globalChannel: Channel | null = null;
let referenceCount = 0;

export const useLobbyChannel = () => {
  const setRooms = useLobbyStore((s) => s.setRooms);
  const addRoom = useLobbyStore((s) => s.addRoom);
  const updateRoom = useLobbyStore((s) => s.updateRoom);
  const removeRoom = useLobbyStore((s) => s.removeRoom);
  const setStats = useLobbyStore((s) => s.setStats);
  const setLoading = useLobbyStore((s) => s.setLoading);

  useEffect(() => {
    referenceCount++;

    const connect = () => {
      if (globalChannel) return;

      setLoading(true);

      const channel = phoenixSocket.channel('lobby');
      let presences = {};

      channel
        .join()
        .receive('ok', (response: Record<string, unknown>) => {
          const rawRooms = (response?.rooms ??
            (response?.data as Record<string, unknown>)?.rooms) as unknown;
          const rooms = normalizeRooms(rawRooms);
          setRooms(rooms);
          setStats({ active_games: rooms.length });
          setLoading(false);
        })
        .receive('error', (resp) => {
          console.error('[LobbyChannel] Unable to join', resp);
          setLoading(false);
        });

      channel.on('lobby_update', (payload: Record<string, unknown>) => {
        const rawRooms = (payload?.rooms ??
          (payload?.data as Record<string, unknown>)?.rooms) as unknown;
        const rooms = normalizeRooms(rawRooms);
        setRooms(rooms);
        setStats({ active_games: rooms.length });
      });

      channel.on('room_created', (payload: Record<string, unknown>) => {
        const room = payload?.room || (payload?.data as Record<string, unknown>)?.room;
        if (room) {
          addRoom(normalizeRoom(room));
        }
      });

      channel.on('room_updated', (payload: Record<string, unknown>) => {
        const room = payload?.room || (payload?.data as Record<string, unknown>)?.room;
        if (room) {
          updateRoom(normalizeRoom(room));
        }
      });

      channel.on('room_closed', (payload: Record<string, unknown>) => {
        const code =
          (payload?.code as string) ||
          (payload?.room as Record<string, unknown>)?.code ||
          (payload?.data as Record<string, unknown>)?.code ||
          (payload?.room_code as string);
        const id =
          (payload?.id as string) ||
          (payload?.room as Record<string, unknown>)?.id ||
          (payload?.data as Record<string, unknown>)?.id;

        if (code || id) {
          removeRoom((code || id) as string);
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

      // Clean up reference when channel is closed (e.g. socket disconnect on sign-out).
      // This allows a fresh channel to be created on the next sign-in.
      channel.onClose(() => {
        if (globalChannel === channel) {
          globalChannel = null;
        }
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
  }, [setRooms, addRoom, updateRoom, removeRoom, setStats, setLoading]);
};
