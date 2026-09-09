/**
 * Dev preview of the guest-first auth flow (no backend, no session):
 * the AuthSheet that gates social surfaces, and the post-game
 * KeepProgressPrompt. A platform toggle previews the Apple-first (iOS)
 * and Google-first (Android) orderings on any device.
 *
 * Reachable at /auth-flow-dev — deliberately outside the auth guard.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthSheet, type AuthSheetReason } from '@/components/auth/AuthSheet';
import { KeepProgressPrompt } from '@/components/auth/KeepProgressPrompt';
import type { AuthProviderPlatform } from '@/components/auth/AuthProviderButtons';
import { BevelButton } from '@/components/ui/BevelButton';
import { PidroText } from '@/components/ui/PidroText';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Surface } from '@/components/ui/Surface';
import { PidroBevel, PidroFonts, PidroSpacing } from '@/design/tokens';

export default function AuthFlowDevScreen() {
  const router = useRouter();
  const [sheetReason, setSheetReason] = useState<AuthSheetReason | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [platform, setPlatform] = useState<AuthProviderPlatform>('ios');
  const [lastAction, setLastAction] = useState<string | null>(null);

  const closeAll = () => {
    setSheetReason(null);
    setPromptOpen(false);
  };
  const record = (action: string) => () => {
    setLastAction(action);
    closeAll();
  };

  return (
    <ScreenShell testID="auth-flow-dev" scroll compact>
      <PidroText style={styles.heading}>Auth flow preview</PidroText>
      <PidroText role="body" tone="soft">
        Guest-first: solo always works with no account. The sheet appears only at the door to
        anything social; the prompt appears after an anonymous player finishes a game.
      </PidroText>

      <Surface variant="subtle" style={styles.section}>
        <PidroText role="label">Preview platform</PidroText>
        <View style={styles.row}>
          <BevelButton
            label="iOS · Apple first"
            material={platform === 'ios' ? 'wood' : 'glass'}
            size="sm"
            onPress={() => setPlatform('ios')}
          />
          <BevelButton
            label="Android · Google first"
            material={platform === 'android' ? 'wood' : 'glass'}
            size="sm"
            onPress={() => setPlatform('android')}
          />
        </View>
      </Surface>

      <Surface variant="subtle" style={styles.section}>
        <PidroText role="label">Gates (open the sheet)</PidroText>
        <View style={styles.row}>
          <BevelButton
            label="Multiplayer"
            material="glass"
            size="sm"
            onPress={() => setSheetReason('multiplayer')}
          />
          <BevelButton
            label="Friends"
            material="glass"
            size="sm"
            onPress={() => setSheetReason('friends')}
          />
          <BevelButton
            label="Invite link"
            material="glass"
            size="sm"
            onPress={() => setSheetReason('invite')}
          />
        </View>
      </Surface>

      <Surface variant="subtle" style={styles.section}>
        <PidroText role="label">Post-game (anonymous player)</PidroText>
        <View style={styles.row}>
          <BevelButton
            label="Game over → keep progress"
            material="glass"
            size="sm"
            onPress={() => setPromptOpen(true)}
          />
        </View>
      </Surface>

      {lastAction ? (
        <PidroText role="metadata" tone="cyan" align="center">
          Last action: {lastAction}
        </PidroText>
      ) : null}

      <AuthSheet
        isOpen={sheetReason != null}
        reason={sheetReason ?? 'multiplayer'}
        forcePlatform={platform}
        onClose={record('dismissed sheet')}
        onApple={record('Continue with Apple')}
        onGoogle={record('Continue with Google')}
        onFacebook={record('Continue with Facebook')}
        onEmail={() => {
          closeAll();
          router.push('/(auth)/login');
        }}
      />
      <KeepProgressPrompt
        isOpen={promptOpen}
        wins={3}
        rating={1487}
        forcePlatform={platform}
        onClose={record('maybe later')}
        onApple={record('Continue with Apple (post-game)')}
        onGoogle={record('Continue with Google (post-game)')}
        onFacebook={record('Continue with Facebook (post-game)')}
        onEmail={() => {
          closeAll();
          router.push('/(auth)/register');
        }}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontFamily: PidroFonts.display,
    fontWeight: '400',
    fontSize: 26,
    lineHeight: 34,
    color: PidroBevel.textGold,
    textShadowColor: 'rgba(20, 8, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  section: {
    gap: PidroSpacing.xs,
    padding: PidroSpacing.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PidroSpacing.xs,
  },
});
