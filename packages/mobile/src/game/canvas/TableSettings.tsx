import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BevelButton } from '@/components/ui/BevelButton';
import { Icon } from '@/components/ui/Icon';
import { PidroText } from '@/components/ui/PidroText';
import { PidroSwitch } from '@/components/ui/PidroSwitch';
import { PidroColors, PidroSpacing } from '@/design/tokens';
import { useSettingsStore } from '@/stores/settings';
import { TableUtilityWindow } from './TableUtilityWindow';

export function TableSettings({
  onLeave,
  isSpectator = false,
  isGameOver = false,
}: {
  onLeave: () => void;
  isSpectator?: boolean;
  isGameOver?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [panel, setPanel] = useState<'settings' | 'leave' | null>(null);
  const hapticEnabled = useSettingsStore((state) => state.hapticEnabled);
  const toggleHaptic = useSettingsStore((state) => state.toggleHaptic);
  const close = () => setPanel(null);
  const leave = () => {
    close();
    onLeave();
  };
  return (
    <>
      <View
        style={[
          styles.trigger,
          { top: insets.top + PidroSpacing.xs, right: insets.right + PidroSpacing.sm },
        ]}>
        <BevelButton
          material="glass"
          size="icon"
          accessibilityLabel="Table settings"
          onPress={() => setPanel('settings')}>
          <Icon name="settings" size={22} />
        </BevelButton>
      </View>
      <TableUtilityWindow
        title={panel === 'leave' ? 'Leave table?' : 'Table settings'}
        open={panel !== null}
        onClose={close}>
        {panel === 'leave' ? (
          <>
            <PidroText tone="soft">You’ll leave your seat at this table.</PidroText>
            <BevelButton material="glass" label="Stay at table" fullWidth onPress={close} />
            <BevelButton
              material="glass"
              tone="danger"
              label="Leave table"
              fullWidth
              onPress={leave}
            />
          </>
        ) : (
          <>
            <View style={styles.row}>
              <View style={styles.copy}>
                <PidroText role="label">Sound</PidroText>
                <PidroText role="metadata" tone="muted">
                  Coming soon
                </PidroText>
              </View>
              <PidroSwitch
                accessibilityLabel="Sound"
                value={false}
                disabled
                onValueChange={() => {}}
              />
            </View>
            <View style={styles.row}>
              <View style={styles.copy}>
                <PidroText role="label">Haptics</PidroText>
                <PidroText role="metadata" tone="muted">
                  Subtle game feedback
                </PidroText>
              </View>
              <PidroSwitch
                accessibilityLabel="Haptics"
                value={hapticEnabled}
                onValueChange={toggleHaptic}
              />
            </View>
            <View style={styles.exit}>
              <BevelButton
                material="glass"
                tone={isSpectator ? 'default' : 'danger'}
                size="sm"
                fullWidth
                accessibilityLabel={isSpectator ? 'Back to lobby' : 'Leave table'}
                label={isSpectator ? 'Back to lobby' : 'Leave table'}
                onPress={isSpectator || isGameOver ? leave : () => setPanel('leave')}
              />
            </View>
          </>
        )}
      </TableUtilityWindow>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { position: 'absolute', zIndex: 44, elevation: 44 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.sm,
    paddingVertical: PidroSpacing.xs,
  },
  copy: { flex: 1, gap: PidroSpacing.xxs },
  exit: { borderTopWidth: 1, borderTopColor: PidroColors.border, paddingTop: PidroSpacing.sm },
});
