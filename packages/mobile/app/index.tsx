import { Redirect, type Href } from 'expo-router';
import { useAuthStore } from '@/stores/auth';
import { usePendingInviteStore } from '@/stores/pendingInvite';
import { ActivityIndicator, View, Text } from 'react-native';
import { initialRoute } from '@/navigation/initialRoute';

export default function Index() {
  const status = useAuthStore((s) => s.status);
  const hydrated = useAuthStore((s) => s.hydrated);
  const inviteHydrated = usePendingInviteStore((s) => s.hydrated);
  const pendingInvite = usePendingInviteStore((s) => s.pendingInvite);
  const route = initialRoute(hydrated, inviteHydrated, status, pendingInvite);

  if (!route) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="mb-4 text-4xl font-bold tracking-tighter text-slate-900">PIDRO</Text>
        <ActivityIndicator size="small" color="#0f172a" />
      </View>
    );
  }

  return <Redirect href={route as Href} />;
}
