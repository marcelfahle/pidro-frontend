import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGlobalSearchParams } from 'expo-router';
import { FixtureInsets } from '@/components/dev/FixtureInsets';
import { ChairLock, OpenChair } from '@/components/lobby/OpenChair';
import { BevelPressable } from '@/components/ui/Bevel';
import { BevelButton } from '@/components/ui/BevelButton';
import { Icon } from '@/components/ui/Icon';
import { PidroText } from '@/components/ui/PidroText';
import { PidroBevel, PidroColors, PidroFonts, PidroLayout, PidroRadii } from '@/design/tokens';
import {
  answerEntry,
  deleteDigit,
  emptyEntry,
  enterDigit,
  type PasswordEntry,
} from '@/features/lobby/passwordSeat';
import { playWrongHaptic } from '@/game/useGameHaptics';
import { useTranslation, formatNumber } from '@/i18n';

type Answer = 'wrong' | { wait: number } | void;
type Words = { host: string; table: string; seat: string };

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'];
const SHAKE_MS = 400;

/**
 * Sitting in a password seat: four boxes and a number pad, the fourth digit sends it.
 * A bottom sheet on a phone, one wide panel in phone landscape, a centred panel on iPad.
 * The digits live only in this panel's state and go when it closes.
 */
export function PasswordKeypadSheet({
  words,
  initial = emptyEntry,
  onSubmit,
  onClose,
}: {
  words: Words;
  initial?: PasswordEntry;
  onSubmit: (password: string) => Promise<Answer>;
  onClose: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  // Dev fixtures: `?safeArea=` fakes the insets a browser does not have.
  const { safeArea } = useGlobalSearchParams<{ safeArea?: string }>();
  const layout =
    Math.min(width, height) >= 700
      ? 'tablet'
      : width > height && height < PidroLayout.compactHeight
        ? 'landscape'
        : 'sheet';
  return (
    <Modal
      transparent
      visible
      supportedOrientations={['portrait', 'landscape']}
      animationType={reduceMotion ? 'none' : layout === 'sheet' ? 'slide' : 'fade'}
      onRequestClose={onClose}>
      <SafeAreaProvider>
        <FixtureInsets preset={__DEV__ ? safeArea : undefined}>
          <Panel
            layout={layout}
            words={words}
            initial={initial}
            onSubmit={onSubmit}
            onClose={onClose}
          />
        </FixtureInsets>
      </SafeAreaProvider>
    </Modal>
  );
}

function Panel({
  layout,
  words,
  initial,
  onSubmit,
  onClose,
}: {
  layout: 'sheet' | 'landscape' | 'tablet';
  words: Words;
  initial: PasswordEntry;
  onSubmit: (password: string) => Promise<Answer>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const [entry, setEntry] = useState(initial);
  const [waitSeconds, setWaitSeconds] = useState(60);
  const shake = useSharedValue(0);
  const shaking = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      clearTimeout(timer.current);
    };
  }, []);

  // The keys come back by themselves when the server's wait is over.
  useEffect(() => {
    if (entry.status !== 'wait') return;
    const wait = setTimeout(() => setEntry(emptyEntry), waitSeconds * 1000);
    return () => clearTimeout(wait);
  }, [entry.status, waitSeconds]);

  const landscape = layout === 'landscape';
  const panelWidth = Math.min(726, width - insets.left - insets.right - 24);
  const keypadWidth = Math.min(330, Math.floor((panelWidth - 48) * 0.48));
  // The boxes shrink only when a small phone in landscape leaves them less than 64pt.
  const box = landscape
    ? Math.min(64, Math.floor((panelWidth - 48 - 32 - keypadWidth - 42) / 4))
    : 64;
  const blocked = entry.status === 'sending' || entry.status === 'wait';
  const send = async (digits: string) => {
    const answer = await onSubmit(digits);
    if (!live.current) return;
    if (answer === 'wrong') {
      playWrongHaptic();
      if (!reduceMotion) {
        const step = { duration: SHAKE_MS / 7 };
        shake.set(withSequence(...[-6, 6, -6, 6, -6, 6, 0].map((x) => withTiming(x, step))));
      }
      timer.current = setTimeout(() => setEntry(answerEntry('wrong')), reduceMotion ? 0 : SHAKE_MS);
    } else if (answer) {
      setWaitSeconds(answer.wait);
      setEntry(answerEntry('wait'));
    } else {
      // Seated, or Tables took over and closes the panel.
      setEntry(emptyEntry);
    }
  };
  const press = (key: string) => {
    const next = key === 'delete' ? deleteDigit(entry) : enterDigit(entry, key);
    if (next === entry) return;
    setEntry(next);
    if (next.status === 'sending') void send(next.digits);
  };

  const header = (
    <View style={styles.header}>
      <PidroText accessibilityRole="header" maxFontSizeMultiplier={1.3} style={styles.title}>
        {t('social.password_title')}
      </PidroText>
      <BevelButton
        material="glass"
        size="icon"
        accessibilityLabel={t('profile.close')}
        onPress={onClose}>
        <Icon name="close" size={20} strokeWidth={2.4} />
      </BevelButton>
    </View>
  );
  const seat = (
    <View style={styles.seat}>
      <View>
        <OpenChair size={40} />
        <ChairLock />
      </View>
      <View style={styles.seatWords}>
        <PidroText numberOfLines={1} style={styles.table}>
          {words.table}
        </PidroText>
        <PidroText numberOfLines={1} style={styles.seatLine}>
          {words.seat}
        </PidroText>
      </View>
    </View>
  );
  const boxes = (
    <Animated.View
      accessible
      accessibilityLabel={t('social.password_typed', {
        number: formatNumber(entry.digits.length),
      })}
      style={[styles.boxes, !landscape && styles.centred, shaking]}>
      {[0, 1, 2, 3].map((index) => {
        const digit = entry.digits[index];
        const next = index === entry.digits.length && !blocked;
        return (
          <View
            key={index}
            style={[
              styles.box,
              { width: box },
              digit && styles.filled,
              next && styles.next,
              entry.status === 'wrong' && styles.wrong,
              entry.status === 'wait' && styles.off,
            ]}>
            {digit ? (
              <PidroText maxFontSizeMultiplier={1} style={styles.digit}>
                {digit}
              </PidroText>
            ) : next ? (
              <View style={styles.caret} />
            ) : null}
          </View>
        );
      })}
    </Animated.View>
  );
  const notice = entry.status === 'wrong' || entry.status === 'wait';
  const line = (
    <PidroText
      accessibilityLiveRegion="polite"
      accessibilityRole={notice ? 'alert' : undefined}
      style={[styles.line, !landscape && styles.centredText, notice && styles.notice]}>
      {entry.status === 'wrong'
        ? t('social.password_wrong', { name: words.host })
        : entry.status === 'wait'
          ? t('social.password_wait')
          : t('social.password_help', { name: words.host })}
    </PidroText>
  );
  const keypad = (
    <View style={[styles.keypad, landscape && { width: keypadWidth }]}>
      {KEYS.map((key, index) =>
        key ? (
          <BevelPressable
            key={key}
            material="glass"
            accessibilityRole="button"
            accessibilityLabel={key === 'delete' ? t('social.password_delete') : key}
            disabled={blocked}
            onPress={() => press(key)}
            style={[styles.key, blocked && styles.keyOff]}
            contentStyle={styles.keyFace}>
            {key === 'delete' ? (
              <Icon name="backspace" size={28} />
            ) : (
              <PidroText maxFontSizeMultiplier={1} style={styles.keyDigit}>
                {key}
              </PidroText>
            )}
          </BevelPressable>
        ) : (
          <View key={index} style={styles.key} />
        )
      )}
    </View>
  );

  return (
    <View
      style={[
        styles.backdrop,
        layout !== 'sheet' && [
          styles.centre,
          {
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 12,
            paddingLeft: insets.left + 12,
            paddingRight: insets.right + 12,
          },
        ],
      ]}>
      <Pressable
        accessibilityLabel={t('profile.close')}
        style={StyleSheet.absoluteFill}
        onPress={onClose}
      />
      {landscape ? (
        <View
          testID="password-keypad"
          accessibilityViewIsModal
          style={[styles.panel, styles.wide, { width: panelWidth }]}>
          <View style={styles.column}>
            {header}
            {seat}
            <View style={styles.grow} />
            {boxes}
            {line}
          </View>
          {keypad}
        </View>
      ) : (
        <View
          testID="password-keypad"
          accessibilityViewIsModal
          style={[
            styles.panel,
            layout === 'sheet'
              ? [styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]
              : styles.tablet,
          ]}>
          {layout === 'sheet' ? <View style={styles.grabber} /> : null}
          <View style={styles.stack}>
            <View style={styles.intro}>
              {header}
              {seat}
            </View>
            {boxes}
            {line}
            {keypad}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: PidroColors.backdrop },
  centre: { justifyContent: 'center', alignItems: 'center' },
  panel: {
    borderWidth: 1,
    borderColor: PidroColors.cyanBorder,
    backgroundColor: PidroColors.panelStrong,
    boxShadow: '0px 10px 30px rgba(1, 13, 27, 0.5)',
  },
  sheet: {
    width: '100%',
    paddingTop: 10,
    paddingHorizontal: 20,
    gap: 18,
    borderBottomWidth: 0,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  tablet: { width: 440, padding: 28, borderRadius: 22 },
  wide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 22,
  },
  column: { flex: 1, minWidth: 0, alignSelf: 'stretch', gap: 16 },
  grow: { flexGrow: 1 },
  grabber: {
    width: 40,
    height: 5,
    alignSelf: 'center',
    borderRadius: PidroRadii.full,
    backgroundColor: PidroColors.borderStrong,
  },
  stack: { gap: 18 },
  intro: { gap: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: {
    flex: 1,
    minWidth: 0,
    fontFamily: PidroFonts.display,
    fontWeight: '400',
    fontSize: 26,
    lineHeight: 31,
    color: PidroBevel.textGold,
    ...PidroBevel.labelShadow,
  },
  seat: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  seatWords: { flex: 1, minWidth: 0, gap: 1 },
  table: { fontFamily: PidroFonts.ui, fontWeight: '800', fontSize: 17, lineHeight: 22 },
  seatLine: {
    fontFamily: PidroFonts.ui,
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 18,
    color: PidroColors.textSoft,
  },
  boxes: { flexDirection: 'row', gap: 14 },
  centred: { justifyContent: 'center' },
  box: {
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: PidroColors.digitBoxBorder,
    backgroundColor: PidroColors.digitBox,
  },
  filled: { borderColor: PidroColors.digitBoxFilled },
  next: { borderColor: PidroBevel.rim, boxShadow: PidroColors.digitBoxNextRing },
  wrong: { borderColor: PidroColors.digitBoxWrong },
  off: { opacity: 0.45 },
  digit: { fontFamily: PidroFonts.display, fontWeight: '400', fontSize: 38, lineHeight: 46 },
  caret: { width: 3, height: 36, borderRadius: 2, backgroundColor: PidroBevel.textGold },
  line: {
    minHeight: 22,
    fontFamily: PidroFonts.ui,
    fontWeight: '800',
    fontSize: 16,
    lineHeight: 22,
    color: PidroColors.textSoft,
  },
  centredText: { textAlign: 'center' },
  notice: { color: PidroColors.keypadNotice },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, columnGap: 10 },
  key: { width: '30%', flexGrow: 1, height: 64, borderRadius: 14 },
  keyOff: { opacity: 0.4 },
  keyFace: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  keyDigit: { fontFamily: PidroFonts.ui, fontWeight: '900', fontSize: 30, lineHeight: 38 },
});
