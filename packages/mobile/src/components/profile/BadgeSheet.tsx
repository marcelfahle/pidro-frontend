import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import type { PinChoice } from '@pidro/shared';
import type { ClassicProfile } from '@/api/profile';
import { BevelButton } from '@/components/ui/BevelButton';
import { Icon } from '@/components/ui/Icon';
import { PidroText } from '@/components/ui/PidroText';
import { Coin, PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { PressableFX } from '@/components/ui/PressableFX';
import { Surface } from '@/components/ui/Surface';
import {
  PidroBevel,
  PidroColors,
  PidroFonts,
  PidroLayout,
  PidroRadii,
  PidroSpacing,
} from '@/design/tokens';
import { classicPinLine } from '@/features/profile';
import { useTranslation } from '@/i18n';

/**
 * The sheet behind the profile avatar: the ring the player has and the pin
 * they wear. The choice stays on this device until the server keeps pins.
 */
export function BadgeSheet({
  isOpen,
  onClose,
  uri,
  level,
  classic,
  pin,
  onChoosePin,
}: {
  isOpen: boolean;
  onClose: () => void;
  uri?: string | null;
  level?: number | null;
  classic: ClassicProfile | null;
  pin: 'classic' | null;
  onChoosePin: (pin: PinChoice) => void;
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  // On a phone held sideways the avatar yields; the ring row still shows the photo.
  const short = useWindowDimensions().height < PidroLayout.compactHeight;
  return (
    <Modal
      visible={isOpen}
      transparent
      navigationBarTranslucent
      statusBarTranslucent
      animationType={reduceMotion ? 'none' : 'slide'}
      onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityLabel={t('profile.close_badges')}
            onPress={onClose}
          />
          <View style={styles.sheet} testID="badge-sheet">
            <View style={styles.grabber} />
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}>
              {!short ? (
                <PlayerAvatar
                  size={92}
                  uri={uri}
                  level={level}
                  pin={pin}
                  style={styles.avatar}
                  accessibilityLabel={t(pin ? 'profile.wearing_classic' : 'profile.wearing_none')}
                />
              ) : null}
              <PidroText style={styles.title} accessibilityRole="header">
                {t('profile.badges')}
              </PidroText>
              <Surface variant="subtle" style={styles.ring}>
                <PlayerAvatar size={40} uri={uri} />
                <View style={styles.copy}>
                  <PidroText role="label">{t('profile.glass_ring')}</PidroText>
                  <PidroText role="metadata" tone="soft">
                    {t('profile.supporter_ring')}
                  </PidroText>
                </View>
              </Surface>
              <View accessibilityRole="radiogroup" style={styles.choices}>
                <PidroText role="metadata" tone="cyan" style={styles.eyebrow}>
                  {t('profile.pin_to_wear')}
                </PidroText>
                {classic ? (
                  <PinRow
                    title="Pidro Classic"
                    line={classicPinLine(classic)}
                    checked={pin === 'classic'}
                    onPress={() => onChoosePin('classic')}
                    coin={
                      <Coin material="wood" size={40} rim={2.5} style={styles.inline}>
                        <Icon name="spade" size={17} color={PidroBevel.textGold} />
                      </Coin>
                    }
                  />
                ) : null}
                <PinRow
                  title={t('profile.founding_tester')}
                  line={t('profile.tester_help')}
                  locked
                  coin={
                    <Coin material="glass" size={40} rim={2.5} style={styles.inline}>
                      <Icon name="spade" size={17} color={PidroColors.text} />
                    </Coin>
                  }
                />
                <PinRow
                  title={t('profile.no_pin')}
                  line={t('profile.no_pin_help')}
                  checked={pin === null}
                  onPress={() => onChoosePin('none')}
                  coin={<View style={styles.noPin} />}
                />
              </View>
            </ScrollView>
            <BevelButton
              label={t('profile.done')}
              material="wood"
              size="md"
              fullWidth
              onPress={onClose}
            />
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

function PinRow({
  title,
  line,
  coin,
  checked = false,
  locked = false,
  onPress,
}: {
  title: string;
  line: string;
  coin: ReactNode;
  checked?: boolean;
  locked?: boolean;
  onPress?: () => void;
}) {
  return (
    <PressableFX
      accessibilityRole="radio"
      accessibilityLabel={`${title}. ${line}`}
      accessibilityState={{ checked, disabled: locked }}
      aria-checked={checked}
      aria-disabled={locked}
      disabled={locked}
      onPress={onPress}
      style={[styles.choice, checked && styles.chosen, locked && styles.locked]}>
      {coin}
      <View style={styles.copy}>
        <PidroText role="label">{title}</PidroText>
        <PidroText role="metadata" tone="soft">
          {line}
        </PidroText>
      </View>
      {locked ? (
        <Icon name="lock" size={18} />
      ) : (
        <View style={[styles.radio, checked && styles.radioOn]}>
          {checked ? <View style={styles.radioDot} /> : null}
        </View>
      )}
    </PressableFX>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, justifyContent: 'flex-end', backgroundColor: PidroColors.backdrop },
  sheet: {
    maxHeight: '100%',
    flexShrink: 1,
    alignItems: 'center',
    gap: PidroSpacing.sm,
    borderTopLeftRadius: PidroRadii.lg,
    borderTopRightRadius: PidroRadii.lg,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: PidroColors.cyanBorderStrong,
    backgroundColor: PidroColors.panelStrong,
    paddingHorizontal: PidroSpacing.lg,
    paddingTop: PidroSpacing.xs,
    paddingBottom: PidroSpacing.md,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: PidroColors.borderStrong,
  },
  scroll: { width: '100%', flexShrink: 1 },
  content: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 14,
    paddingTop: PidroSpacing.xs,
  },
  avatar: { marginBottom: PidroSpacing.xs },
  title: {
    fontFamily: PidroFonts.display,
    fontWeight: '400',
    fontSize: 26,
    lineHeight: 34,
    color: PidroBevel.textGold,
  },
  ring: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: PidroSpacing.sm,
    paddingHorizontal: 14,
  },
  copy: { minWidth: 0, flex: 1, gap: 2 },
  choices: { width: '100%', gap: 10 },
  eyebrow: { paddingLeft: PidroSpacing.xxs, letterSpacing: 1, textTransform: 'uppercase' },
  choice: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: PidroSpacing.sm,
    paddingHorizontal: 14,
    borderRadius: PidroRadii.lg,
    borderWidth: 1,
    borderColor: PidroColors.border,
    backgroundColor: PidroColors.panelSoft,
  },
  chosen: {
    borderWidth: 2,
    borderColor: PidroBevel.rim,
    backgroundColor: PidroColors.chosenBg,
    paddingVertical: 11,
    paddingHorizontal: 13,
  },
  locked: { opacity: 0.55 },
  inline: { position: 'relative' },
  noPin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: PidroColors.borderStrong,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: PidroColors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: PidroBevel.textGold },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: PidroBevel.textGold },
});
