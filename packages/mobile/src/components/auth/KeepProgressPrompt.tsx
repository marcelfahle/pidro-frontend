/**
 * Post-game registration prompt for anonymous players (cold-start guests
 * and invite-link guests alike). The carrot is the progress they just
 * earned — converting it into an account is one tap. Shown after a game
 * ends, never mid-play, and always dismissible.
 */
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { PidroBevel, PidroColors, PidroFonts, PidroSpacing } from '@/design/tokens';
import { PidroText } from '@/components/ui/PidroText';
import { AuthProviderButtons, type AuthProviderPlatform } from './AuthProviderButtons';

export interface KeepProgressPromptProps {
  isOpen: boolean;
  wins: number;
  rating?: number;
  onClose: () => void;
  onApple: () => void;
  onGoogle: () => void;
  onFacebook: () => void;
  onEmail: () => void;
  forcePlatform?: AuthProviderPlatform;
}

export function KeepProgressPrompt({
  isOpen,
  wins,
  rating,
  onClose,
  onApple,
  onGoogle,
  onFacebook,
  onEmail,
  forcePlatform,
}: KeepProgressPromptProps) {
  const reduceMotion = useReducedMotion();

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType={reduceMotion ? 'none' : 'fade'}
      onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card} testID="keep-progress-prompt">
          <PidroText style={styles.title}>Keep your progress</PidroText>
          <PidroText role="body" tone="soft" align="center" style={styles.description}>
            Create a free account and your record follows you everywhere.
          </PidroText>

          <View style={styles.carrots}>
            <View style={styles.carrot}>
              <PidroText style={styles.carrotValue}>{wins}</PidroText>
              <PidroText role="metadata" tone="muted">
                {wins === 1 ? 'win' : 'wins'}
              </PidroText>
            </View>
            {rating != null ? (
              <View style={styles.carrot}>
                <PidroText style={styles.carrotValue}>{rating}</PidroText>
                <PidroText role="metadata" tone="muted">
                  rating
                </PidroText>
              </View>
            ) : null}
          </View>

          <AuthProviderButtons
            onApple={onApple}
            onGoogle={onGoogle}
            onFacebook={onFacebook}
            onEmail={onEmail}
            forcePlatform={forcePlatform}
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
      </View>
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
  carrots: {
    flexDirection: 'row',
    gap: PidroSpacing.sm,
    marginVertical: PidroSpacing.xxs,
  },
  carrot: {
    minWidth: 96,
    alignItems: 'center',
    gap: 2,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(225, 173, 58, 0.4)',
    backgroundColor: 'rgba(225, 173, 58, 0.1)',
    paddingVertical: PidroSpacing.xs,
    paddingHorizontal: PidroSpacing.sm,
  },
  carrotValue: {
    fontFamily: PidroFonts.display,
    fontWeight: '400',
    fontSize: 26,
    lineHeight: 32,
    color: PidroBevel.textGold,
    textShadowColor: 'rgba(20, 8, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  later: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
});
