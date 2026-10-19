import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';
import { DismissButton } from '@/components/ui/DismissButton';
import { PidroText } from '@/components/ui/PidroText';
import { TextLink } from '@/components/ui/TextLink';
import { PidroBevel, PidroColors, PidroFonts, PidroRadii } from '@/design/tokens';
import { useTranslation } from '@/i18n';
import { ChoiceList, type ChoiceListProps } from './ChoiceList';
import { FriendPicker, type FriendPickerProps } from './FriendPicker';

export interface SeatPickerContainerProps {
  title: string;
  subtitle: string;
  choices: Omit<ChoiceListProps, 'compact' | 'onNavigate' | 'label'>;
  friends: Omit<FriendPickerProps, 'compact' | 'columns'>;
  onClose: () => void;
  initialPage?: 'choices' | 'friends';
  /** The server's refusal of the last choice, in plain words. */
  error?: string;
}

/** Local presentation only. Selection is an intent; the caller owns its result. */
export function SeatPickerContainer({
  title,
  subtitle,
  choices,
  friends,
  onClose,
  initialPage = 'choices',
  error,
}: SeatPickerContainerProps) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const tablet = Math.min(width, height) >= 600;
  const landscape = width > height;
  const split = tablet || landscape;
  const reduceMotion = useReducedMotion();
  const [page, setPage] = useState(initialPage);
  const friendPage = !split && page === 'friends';
  const closeLabel = t('common.cancel');
  return (
    <Modal
      transparent
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape-left', 'landscape-right']}
      animationType={reduceMotion ? 'none' : 'fade'}>
      <SafeAreaProvider>
        <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.safe}>
          <Pressable
            accessibilityLabel={closeLabel}
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />
          <KeyboardAvoidingView
            pointerEvents="box-none"
            style={[styles.keyboard, tablet && styles.center]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View
              testID="seat-picker-container"
              accessibilityViewIsModal
              style={[
                styles.sheet,
                split && styles.screen,
                tablet && styles.panel,
                friendPage && styles.expanded,
              ]}>
              {!split && <View style={styles.grabber} />}
              {friendPage ? (
                <>
                  <TextLink
                    label={`‹ ${title}`}
                    onPress={() => setPage('choices')}
                    style={styles.back}
                  />
                  <PidroText role="title" tone="gold" style={styles.title}>
                    {t('picker.invite')}
                  </PidroText>
                </>
              ) : (
                <View style={[styles.header, landscape && !tablet && styles.inlineHeader]}>
                  {landscape && !tablet && (
                    <DismissButton accessibilityLabel={closeLabel} onPress={onClose} />
                  )}
                  <View style={[styles.heading, landscape && !tablet && styles.inlineHeading]}>
                    <PidroText role="title" tone="gold" style={styles.title}>
                      {title}
                    </PidroText>
                    <PidroText role="metadata" tone="soft">
                      {subtitle}
                    </PidroText>
                  </View>
                  {(!landscape || tablet) && (
                    <DismissButton accessibilityLabel={closeLabel} onPress={onClose} />
                  )}
                </View>
              )}
              {error ? (
                <PidroText role="metadata" tone="danger" accessibilityRole="alert">
                  {error}
                </PidroText>
              ) : null}
              <View style={[styles.body, friendPage && styles.expanded, split && styles.split]}>
                {!friendPage && (
                  <ScrollView
                    style={split ? styles.choicesColumn : styles.choicesScroll}
                    contentContainerStyle={styles.choicesContent}
                    keyboardShouldPersistTaps="handled">
                    {tablet && (
                      <PidroText role="metadata" tone="soft">
                        {t('picker.fill_or_open')}
                      </PidroText>
                    )}
                    <ChoiceList
                      {...choices}
                      label={title}
                      compact={split}
                      onNavigate={() => setPage('friends')}
                      onSelect={(id) => {
                        choices.onSelect(id);
                        onClose();
                      }}
                    />
                  </ScrollView>
                )}
                {(split || friendPage) && (
                  <View style={styles.friendsColumn}>
                    {split && (
                      <PidroText role="metadata" tone="soft">
                        {t('picker.or_invite')}
                      </PidroText>
                    )}
                    <FriendPicker
                      {...friends}
                      compact={split}
                      columns={landscape ? 2 : 1}
                      onInvite={(friend) => {
                        friends.onInvite(friend);
                        onClose();
                      }}
                    />
                  </View>
                )}
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PidroColors.backdrop },
  keyboard: { flex: 1, justifyContent: 'flex-end' },
  center: { justifyContent: 'center', padding: 24 },
  sheet: {
    maxHeight: '100%',
    flexShrink: 1,
    padding: 16,
    gap: 12,
    backgroundColor: PidroBevel.panelMid,
    borderWidth: 1,
    borderColor: PidroColors.borderStrong,
    borderTopLeftRadius: PidroRadii.xl,
    borderTopRightRadius: PidroRadii.xl,
  },
  screen: { flex: 1, borderRadius: 0 },
  panel: {
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: 'auto',
    height: 660,
    width: '100%',
    maxWidth: 780,
    alignSelf: 'center',
    borderRadius: PidroRadii.xl,
    padding: 24,
  },
  expanded: { flex: 1 },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: PidroRadii.full,
    backgroundColor: PidroColors.borderStrong,
    alignSelf: 'center',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inlineHeader: { gap: 12 },
  heading: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontFamily: PidroFonts.display, fontSize: 24, lineHeight: 32 },
  inlineHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { alignSelf: 'flex-start', paddingHorizontal: 0 },
  body: { flexShrink: 1, minHeight: 0 },
  split: { flex: 1, flexDirection: 'row', gap: 20 },
  choicesScroll: { flexShrink: 1 },
  choicesColumn: { width: 300, flexGrow: 0, flexShrink: 0 },
  choicesContent: { gap: 8 },
  friendsColumn: { flex: 1, minWidth: 0, minHeight: 0, gap: 8 },
});
