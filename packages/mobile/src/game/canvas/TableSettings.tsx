import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BevelButton } from '@/components/ui/BevelButton';
import { Icon } from '@/components/ui/Icon';
import { PidroText } from '@/components/ui/PidroText';
import { PidroSwitch } from '@/components/ui/PidroSwitch';
import { PidroColors, PidroSpacing } from '@/design/tokens';
import { useSettingsStore } from '@/stores/settings';
import { headerTop } from './TableChrome';
import { TableUtilityWindow } from './TableUtilityWindow';
import { useTranslation } from '@/i18n';

export function TableSettings({
  onLeave,
  isSpectator = false,
  isGameOver = false,
  onRules,
}: {
  onLeave: () => void;
  isSpectator?: boolean;
  isGameOver?: boolean;
  onRules?: () => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [panel, setPanel] = useState<'settings' | 'leave' | null>(null);
  const hapticEnabled = useSettingsStore((state) => state.hapticEnabled);
  const toggleHaptic = useSettingsStore((state) => state.toggleHaptic);
  const countHelp = useSettingsStore((state) => state.countHelp);
  const toggleCountHelp = useSettingsStore((state) => state.toggleCountHelp);
  const pace = useSettingsStore((state) => state.pace);
  const setPace = useSettingsStore((state) => state.setPace);
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
          { top: headerTop(insets.top), right: insets.right + PidroSpacing.sm },
        ]}>
        <BevelButton
          material="glass"
          size="icon"
          accessibilityLabel={t('game.settings')}
          onPress={() => setPanel('settings')}>
          <Icon name="settings" size={22} />
        </BevelButton>
      </View>
      <TableUtilityWindow
        title={t(panel === 'leave' ? 'game.leave_question' : 'game.settings')}
        open={panel !== null}
        onClose={close}>
        {panel === 'leave' ? (
          <>
            <PidroText tone="soft">{t('game.leave_description')}</PidroText>
            <BevelButton material="glass" label={t('game.stay')} fullWidth onPress={close} />
            <BevelButton
              material="glass"
              tone="danger"
              label={t('game.leave')}
              fullWidth
              onPress={leave}
            />
          </>
        ) : (
          <>
            {onRules && (
              <BevelButton
                material="glass"
                label={t('rules.menu')}
                testID="table-rules-menu"
                onPress={() => {
                  close();
                  onRules();
                }}
              />
            )}
            <View style={styles.row}>
              <View style={styles.copy}>
                <PidroText role="label">{t('game.sound')}</PidroText>
                <PidroText role="metadata" tone="muted">
                  {t('game.soon')}
                </PidroText>
              </View>
              <PidroSwitch
                accessibilityLabel={t('game.sound')}
                value={false}
                disabled
                onValueChange={() => {}}
              />
            </View>
            <View style={styles.row}>
              <View style={styles.copy}>
                <PidroText role="label">{t('game.haptics')}</PidroText>
                <PidroText role="metadata" tone="muted">
                  {t('game.haptics_description')}
                </PidroText>
              </View>
              <PidroSwitch
                accessibilityLabel={t('game.haptics')}
                value={hapticEnabled}
                onValueChange={toggleHaptic}
              />
            </View>
            <View style={styles.row}>
              <View style={styles.copy}>
                <PidroText role="label">{t('settings.countHelp')}</PidroText>
                <PidroText role="metadata" tone="muted">
                  {t('settings.countHelpHint')}
                </PidroText>
              </View>
              <PidroSwitch
                accessibilityLabel={t('settings.countHelp')}
                value={countHelp}
                onValueChange={toggleCountHelp}
              />
            </View>
            <View style={styles.row}>
              <View style={styles.copy}>
                <PidroText role="label">{t('settings.slowPace')}</PidroText>
                <PidroText role="metadata" tone="muted">
                  {t('settings.slowPaceHint')}
                </PidroText>
              </View>
              <PidroSwitch
                accessibilityLabel={t('settings.slowPace')}
                value={pace === 'slow'}
                onValueChange={() => setPace(pace === 'slow' ? 'normal' : 'slow')}
              />
            </View>
            <View style={styles.exit}>
              <BevelButton
                material="glass"
                tone={isSpectator ? 'default' : 'danger'}
                size="sm"
                fullWidth
                accessibilityLabel={t(isSpectator ? 'game.lobby' : 'game.leave')}
                label={t(isSpectator ? 'game.lobby' : 'game.leave')}
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
