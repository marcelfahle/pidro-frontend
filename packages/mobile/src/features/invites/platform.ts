import type { InvitePlatform } from '@pidro/shared';
import { Platform } from 'react-native';

export function invitePlatform(): InvitePlatform {
  if (Platform.OS === 'ios' || Platform.OS === 'android') return Platform.OS;
  return 'web';
}
