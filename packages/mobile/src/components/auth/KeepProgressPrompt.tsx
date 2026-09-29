/**
 * Post-game registration prompt for anonymous players (cold-start guests
 * and invite-link guests alike). The carrot is the progress they just
 * earned — converting it into an account is one tap. Shown after a game
 * ends, never mid-play, and always dismissible.
 */
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';
import { PidroBevel, PidroColors, PidroFonts, PidroSpacing } from '@/design/tokens';
import { BevelButton } from '@/components/ui/BevelButton';
import { PidroText } from '@/components/ui/PidroText';

export interface KeepProgressPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function KeepProgressPrompt({ isOpen, onClose, onSave }: KeepProgressPromptProps) {
  const reduceMotion = useReducedMotion();

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType={reduceMotion ? 'none' : 'fade'}
      onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.backdrop} edges={['top', 'left', 'right', 'bottom']}>
          <View style={styles.card} testID="keep-progress-prompt">
            <PidroText style={styles.title}>Keep your progress</PidroText>
            <PidroText role="body" tone="soft" align="center" style={styles.description}>
              Create a free account and your record follows you everywhere.
            </PidroText>

            <BevelButton
              label="Save account"
              material="wood"
              size="md"
              fullWidth
              onPress={onSave}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Maybe later"
              onPress={onClose}
              style={styles.later}>
              <PidroText role="label" tone="muted">
                Maybe later
              </PidroText>
            </Pressable>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PidroColors.backdrop,
    padding: PidroSpacing.md,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: PidroSpacing.sm,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(140, 215, 250, 0.28)',
    backgroundColor: PidroColors.panelStrong,
    padding: PidroSpacing.lg,
    boxShadow: '0px 10px 30px rgba(0,0,0,0.45)',
  },
  title: {
    fontFamily: PidroFonts.display,
    fontWeight: '400',
    fontSize: 24,
    lineHeight: 31,
    color: PidroBevel.textGold,
    textShadowColor: 'rgba(20, 8, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  description: {
    maxWidth: 280,
  },
  later: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
});
