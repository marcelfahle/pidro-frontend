import { lobbyApi } from '@/api/lobby';
import { clampRoomName } from '@pidro/shared';
import { useSettingsStore } from '@/stores/settings';
import { quickGameRequest } from '@/features/rules/ruleSets';

export async function createSoloRoom(playerName: string) {
  const response = await lobbyApi.createRoom({
    ...quickGameRequest(useSettingsStore.getState().preferredRuleSet),
    name: clampRoomName(`${playerName}'s solo table`),
  });
  if (!response?.code) throw new Error('No room code returned');
  return response;
}
