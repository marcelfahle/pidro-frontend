import { lobbyApi } from '@/api/lobby';
import { useSettingsStore } from '@/stores/settings';
import { quickGameRequest } from '@/features/rules/ruleSets';

export async function createSoloRoom() {
  const response = await lobbyApi.createRoom(
    quickGameRequest(useSettingsStore.getState().preferredRuleSet)
  );
  if (!response?.code) throw new Error('No room code returned');
  return response;
}
