import { Alert, Image, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { PidroText } from '@/components/ui/PidroText';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Surface } from '@/components/ui/Surface';
import { PidroColors, PidroRadii, PidroSpacing } from '@/design/tokens';
import { useAuthStore } from '@/stores/auth';

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const router = useRouter();

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          clearSession();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <ScreenShell scroll compact testID="profile-screen" contentStyle={styles.shell}>
      <ScreenHeader title="Profile" subtitle="Your Pidro account" onBack={() => router.back()} />
      <Surface variant="window" style={styles.panel} padded>
        <View style={styles.identity}>
          <Image
            source={require('../assets/images/avatar1.png')}
            style={styles.avatar}
            resizeMode="cover"
            accessibilityLabel="Profile picture"
          />
          <View style={styles.identityCopy}>
            <PidroText role="display" numberOfLines={2}>
              {user?.username ?? 'Player'}
            </PidroText>
            {user?.email ? (
              <PidroText role="body" tone="soft" numberOfLines={2}>
                {user.email}
              </PidroText>
            ) : (
              <PidroText role="body" tone="muted">
                No email address is available.
              </PidroText>
            )}
          </View>
        </View>
        <View style={styles.accountActions}>
          <PidroText role="label">Account</PidroText>
          <PidroText role="body" tone="soft">
            Signing out removes this account from the device. Your games remain on the server.
          </PidroText>
          <Button label="Sign out" variant="destructive" onPress={handleSignOut} />
        </View>
      </Surface>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: PidroSpacing.md,
  },
  panel: {
    gap: PidroSpacing.lg,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.md,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: PidroRadii.surface,
    borderWidth: 1.5,
    borderColor: PidroColors.cyanBorderStrong,
  },
  identityCopy: {
    minWidth: 0,
    flex: 1,
    gap: PidroSpacing.xxs,
  },
  accountActions: {
    gap: PidroSpacing.sm,
    paddingTop: PidroSpacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: PidroColors.border,
  },
});
