import { lobbyApi } from '@/api/lobby';
import { clampRoomName } from '@pidro/shared';

export async function createSoloRoom(playerName: string) {
  const response = await lobbyApi.createRoom({
    name: clampRoomName(`${playerName}'s solo table`),
    seats: { seat_2: 'ai', seat_3: 'ai', seat_4: 'ai' },
  });
  if (!response?.code) throw new Error('No room code returned');
  return response;
}
