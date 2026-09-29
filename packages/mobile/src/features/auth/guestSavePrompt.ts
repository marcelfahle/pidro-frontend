import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'guest-save-prompt:v1';

export type PromptStorage = Pick<typeof AsyncStorage, 'getItem' | 'setItem'>;

export function localDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export async function claimDailyGuestSavePrompt(
  guestId: string,
  now = new Date(),
  storage: PromptStorage = AsyncStorage
): Promise<boolean> {
  const key = `${KEY_PREFIX}:${guestId}`;
  const today = localDateKey(now);
  if ((await storage.getItem(key)) === today) return false;
  await storage.setItem(key, today);
  return true;
}
