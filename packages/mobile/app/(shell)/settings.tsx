import { useRouter } from 'expo-router';
import { SettingsScreen } from '@/components/settings/SettingsScreen';
import { usePillClearance } from '@/components/shell/TabPill';

export default function AccountSettingsScreen() {
  const router = useRouter();
  const pillClearance = usePillClearance();
  return (
    <SettingsScreen
      onBack={() => router.replace('/home')}
      bottomClearance={pillClearance.bottom}
      rightClearance={pillClearance.right}
    />
  );
}
