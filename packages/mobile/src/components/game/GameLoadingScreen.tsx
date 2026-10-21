import { ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Background } from '@/components/ui/Background';
import { PidroText } from '@/components/ui/PidroText';
import { PidroColors, PidroSpacing } from '@/design/tokens';

export function GameLoadingScreen({ label }: { label: string }) {
  return (
    <Background>
      <SafeAreaView style={styles.content} testID="game-loading-screen">
        <ActivityIndicator size="large" color={PidroColors.goldLight} />
        <PidroText role="body" tone="soft" align="center">
          {label}
        </PidroText>
      </SafeAreaView>
    </Background>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: PidroSpacing.md,
    gap: PidroSpacing.md,
  },
});
