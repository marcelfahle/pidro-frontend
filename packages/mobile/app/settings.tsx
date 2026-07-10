import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { PidroText } from '@/components/ui/PidroText';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Surface } from '@/components/ui/Surface';
import { PidroColors, PidroLayout, PidroSpacing } from '@/design/tokens';

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <ScreenShell scroll compact testID="settings-screen" contentStyle={styles.shell}>
      <ScreenHeader
        title="Settings"
        subtitle="Adjust how the game feels on this device."
        onBack={() => router.back()}
      />
      <Surface variant="window" style={styles.panel} padded>
        <SettingRow title="Sound" subtitle="Play game sound effects." initialValue />
        <SettingRow title="Haptics" subtitle="Use touch feedback for game actions." initialValue />
        <SettingRow
          title="Fast animations"
          subtitle="Use shorter transitions around the table."
          initialValue={false}
        />
      </Surface>
    </ScreenShell>
  );
}

function SettingRow({
  title,
  subtitle,
  initialValue,
}: {
  title: string;
  subtitle: string;
  initialValue: boolean;
}) {
  const [enabled, setEnabled] = useState(initialValue);

  return (
    <Surface variant="subtle" style={styles.row}>
      <View style={styles.rowCopy}>
        <PidroText role="label">{title}</PidroText>
        <PidroText role="metadata" tone="muted">
          {subtitle}
        </PidroText>
      </View>
      <Switch
        accessibilityLabel={title}
        value={enabled}
        onValueChange={setEnabled}
        trackColor={{ false: PidroColors.switchTrackOff, true: PidroColors.cyan }}
        thumbColor={enabled ? PidroColors.ink : PidroColors.text}
        style={styles.switch}
      />
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
  switch: {
    minWidth: PidroLayout.touchTarget,
    minHeight: PidroLayout.touchTarget,
  },
});
