/**
 * The one auth surface in the app: a bottom sheet that appears at the
 * moment of social contact (multiplayer, friends, invites) — never at app
 * open. Solo play must never show it. Guests arriving via invite links
 * skip it too and get the post-game KeepProgressPrompt instead.
 */
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { PidroBevel, PidroColors, PidroFonts, PidroSpacing } from '@/design/tokens';
import { PidroText } from '@/components/ui/PidroText';
import { AuthProviderButtons, type AuthProviderPlatform } from './AuthProviderButtons';

export type AuthSheetReason = 'multiplayer' | 'friends' | 'invite';

const COPY: Record<AuthSheetReason, { title: string; description: string }> = {
  multiplayer: {
    title: 'Play with others',
    description: 'Sign in so friends and rivals can find you at the table.',
  },
  friends: {
    title: 'Find your friends',
    description: 'Sign in to add friends and invite them to your table.',
  },
  invite: {
    title: 'Take your seat',
    description: 'Sign in to join this table.',
  },
};

export interface AuthSheetProps {
  isOpen: boolean;
  reason?: AuthSheetReason;
  onClose: () => void;
  onApple: () => void;
  onGoogle: () => void;
  onFacebook: () => void;
  onEmail: () => void;
  forcePlatform?: AuthProviderPlatform;
}

export function AuthSheet({
  isOpen,
  reason = 'multiplayer',
  onClose,
  onApple,
  onGoogle,
  onFacebook,
  onEmail,
  forcePlatform,
}: AuthSheetProps) {
  const reduceMotion = useReducedMotion();
  const copy = COPY[reason];

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType={reduceMotion ? 'none' : 'slide'}
      onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityLabel="Dismiss sign in"
          onPress={onClose}
        />
        <View style={styles.sheet} testID="auth-sheet">
          <View style={styles.grabber} />
          <PidroText style={styles.title}>{copy.title}</PidroText>
          <PidroText role="body" tone="soft" align="center" style={styles.description}>
            {copy.description}
          </PidroText>

          <AuthProviderButtons
            onApple={onApple}
            onGoogle={onGoogle}
            onFacebook={onFacebook}
            onEmail={onEmail}
            forcePlatform={forcePlatform}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Not now"
            onPress={onClose}
            style={styles.notNow}>
            <PidroText role="label" tone="muted">
              Not now
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
    justifyContent: 'flex-end',
    backgroundColor: PidroColors.backdrop,
  },
  sheet: {
    alignItems: 'center',
    gap: PidroSpacing.sm,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: 'rgba(140, 215, 250, 0.28)',
    backgroundColor: PidroColors.panelStrong,
    paddingHorizontal: PidroSpacing.lg,
    paddingTop: PidroSpacing.sm,
    paddingBottom: PidroSpacing.xl,
    boxShadow: '0px -8px 24px rgba(0,0,0,0.4)',
  },
  grabber: {
    width: 40,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: 'rgba(184, 225, 246, 0.35)',
    marginBottom: PidroSpacing.xxs,
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
    maxWidth: 300,
    marginBottom: PidroSpacing.xs,
  },
  notNow: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
});
