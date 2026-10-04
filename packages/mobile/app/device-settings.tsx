import { useRouter } from 'expo-router';
import { SettingsScreen } from '@/components/settings/SettingsScreen';

export default function DeviceSettingsScreen() {
  const router = useRouter();
  return <SettingsScreen onBack={() => router.replace('/welcome')} />;
}
