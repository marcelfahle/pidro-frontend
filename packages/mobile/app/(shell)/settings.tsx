import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { PidroText } from '@/components/ui/PidroText';
import { PidroSwitch } from '@/components/ui/PidroSwitch';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Surface } from '@/components/ui/Surface';
import { AppUpdateSection } from '@/components/settings/AppUpdateSection';
import { usePillClearance } from '@/components/shell/TabPill';
import { PidroSpacing } from '@/design/tokens';
import { useSettingsStore } from '@/stores/settings';

export default function SettingsScreen() {
  const router = useRouter();
  const pillClearance = usePillClearance();
  const soundEnabled = useSettingsStore((state) => state.soundEnabled);
  const hapticEnabled = useSettingsStore((state) => state.hapticEnabled);
  const toggleSound = useSettingsStore((state) => state.toggleSound);
  const toggleHaptic = useSettingsStore((state) => state.toggleHaptic);

  return (
    <ScreenShell
      scroll
      compact
      testID="settings-screen"
      contentStyle={{
        ...styles.shell,
        paddingBottom: pillClearance.bottom + PidroSpacing.md,
        paddingRight: pillClearance.right + PidroSpacing.md,
      }}>
      <ScreenHeader
        title="Settings"
        subtitle="Adjust how the game feels on this device."
        onBack={() => router.back()}
      />
      <Surface variant="window" style={styles.panel} padded>
        <SettingRow
          title="Sound"
          subtitle="Play game sound effects."
          value={soundEnabled}
          onValueChange={toggleSound}
        />
        <SettingRow
          title="Haptics"
          subtitle="Use touch feedback for game actions."
          value={hapticEnabled}
          onValueChange={toggleHaptic}
        />
      </Surface>
      <AppUpdateSection />
    </ScreenShell>
  );
}

function SettingRow({
  title,
  subtitle,
  value,
  onValueChange,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: () => void;
}) {
  return (
    <Surface variant="subtle" style={styles.row}>
      <View style={styles.rowCopy}>
        <PidroText role="label">{title}</PidroText>
        <PidroText role="metadata" tone="muted">
          {subtitle}
        </PidroText>
      </View>
      <PidroSwitch accessibilityLabel={title} value={value} onValueChange={onValueChange} />
    </Surface>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: PidroSpacing.md,
  },
  panel: {
    gap: PidroSpacing.sm,
  },
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.md,
    padding: PidroSpacing.sm,
  },
  rowCopy: {
    minWidth: 0,
    flex: 1,
    gap: PidroSpacing.xxs,
  },
});
