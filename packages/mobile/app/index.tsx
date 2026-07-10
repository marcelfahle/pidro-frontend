import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/auth';
import { ActivityIndicator, View, Text } from 'react-native';

export default function Index() {
  const status = useAuthStore((s) => s.status);
  const hydrated = useAuthStore((s) => s.hydrated);

  if (!hydrated) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
        }}>
        <Text
          style={{
            marginBottom: 16,
            fontSize: 36,
            fontWeight: 'bold',
            letterSpacing: -1,
            color: '#0f172a',
          }}>
          PIDRO
        </Text>
        <ActivityIndicator size="small" color="#0f172a" />
      </View>
    );
  }

  if (status === 'authenticated') {
    return <Redirect href="/home" />;
  }

  return <Redirect href="/(auth)/login" />;
}
