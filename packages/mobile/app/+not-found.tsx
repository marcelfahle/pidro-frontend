import { useCallback } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { PidroText } from '@/components/ui/PidroText';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Surface } from '@/components/ui/Surface';
import { PidroSpacing } from '@/design/tokens';

export default function NotFoundScreen() {
  const router = useRouter();
  const goHome = useCallback(() => router.replace('/home'), [router]);

  return (
    <>
      <Stack.Screen options={{ title: 'Page not found' }} />
      <ScreenShell compact contentStyle={styles.shell}>
        <Surface variant="window" style={styles.panel} padded>
          <View style={styles.copy}>
            <PidroText role="title" align="center">
              This screen does not exist
            </PidroText>
            <PidroText role="body" tone="soft" align="center">
              Return home and choose another table.
            </PidroText>
          </View>
          <Button label="Go home" onPress={goHome} />
        </Surface>
      </ScreenShell>
    </>
  );
}

const styles = StyleSheet.create({
  shell: {
    justifyContent: 'center',
  },
  panel: {
    gap: PidroSpacing.md,
  },
  copy: {
    gap: PidroSpacing.xs,
  },
});
