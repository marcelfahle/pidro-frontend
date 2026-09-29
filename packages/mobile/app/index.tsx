import { Redirect, type Href } from 'expo-router';
import { useAuthStore } from '@/stores/auth';
import { usePendingInviteStore } from '@/stores/pendingInvite';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { initialRoute } from '@/navigation/initialRoute';
import { useDeferredInviteBootstrap } from '@/features/invites/useDeferredInviteBootstrap';
import { PidroLogo } from '@/components/ui/PidroLogo';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { PidroColors, PidroSpacing } from '@/design/tokens';

export default function Index() {
  const status = useAuthStore((s) => s.status);
  const hydrated = useAuthStore((s) => s.hydrated);
  const inviteHydrated = usePendingInviteStore((s) => s.hydrated);
  const pendingInvite = usePendingInviteStore((s) => s.pendingInvite);
  const deferredBootstrapComplete = useDeferredInviteBootstrap();
  const route = deferredBootstrapComplete
    ? initialRoute(hydrated, inviteHydrated, status, pendingInvite)
    : null;

  if (!route) {
    return (
      <ScreenShell contentStyle={styles.loading}>
        <View style={styles.logo}>
          <PidroLogo size="hero" />
        </View>
        <ActivityIndicator size="small" color={PidroColors.cyanText} />
      </ScreenShell>
    );
  }

  return <Redirect href={route as Href} />;
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: PidroSpacing.md,
  },
  logo: {
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
