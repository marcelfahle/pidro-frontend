import { useCallback, useRef, useState } from 'react';
import { Keyboard, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { Redirect, useRouter, type Href } from 'expo-router';
import { LogoGlow } from '@/components/home/LogoGlow';
import { BevelButton } from '@/components/ui/BevelButton';
import { Input } from '@/components/ui/Input';
import { PidroLogo } from '@/components/ui/PidroLogo';
import { PidroText } from '@/components/ui/PidroText';
import { PressableFX } from '@/components/ui/PressableFX';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Surface } from '@/components/ui/Surface';
import { PidroLayout, PidroSpacing } from '@/design/tokens';
import { validateDisplayName } from '@/features/invites/joinFlow';
import { useAuth } from '@/hooks/useAuth';
import { authenticatedDestination } from '@/navigation/initialRoute';
import { usePendingInviteStore } from '@/stores/pendingInvite';

export default function WelcomeScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const compactLandscape = landscape && height < 500;
  const compactPortrait = !landscape && height < 700;
  const pendingInvite = usePendingInviteStore((state) => state.pendingInvite);
  const { isAuthenticated, continueAsGuest, isLoading, error, clearError } = useAuth();
  const [guestEntry, setGuestEntry] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const nameRef = useRef<TextInput>(null);

  const openGuestEntry = useCallback(() => {
    clearError();
    setGuestEntry(true);
    requestAnimationFrame(() => nameRef.current?.focus());
  }, [clearError]);

  const handleNameChange = useCallback(
    (value: string) => {
      setDisplayName(value);
      setNameError(null);
      clearError();
    },
    [clearError]
  );

  const submitGuest = useCallback(async () => {
    const validation = validateDisplayName(displayName);
    if (validation.error) {
      const messages = {
        required: 'Enter the name other players will see.',
        tooShort: 'Use at least 2 characters.',
        tooLong: 'Use 20 characters or fewer.',
        forbidden: 'That name contains unsupported characters.',
      };
      setNameError(messages[validation.error]);
      nameRef.current?.focus();
      return;
    }

    Keyboard.dismiss();
    await continueAsGuest(validation.value);
  }, [continueAsGuest, displayName]);

  if (isAuthenticated) {
    return <Redirect href={authenticatedDestination(pendingInvite) as Href} />;
  }

  return (
    <ScreenShell
      testID="welcome-screen"
      scroll
      contentStyle={landscape ? styles.landscape : styles.portrait}>
      <View
        style={[
          styles.logoStage,
          landscape && styles.logoStageLandscape,
          compactPortrait && styles.logoStageCompact,
        ]}
        pointerEvents="none">
        <LogoGlow size={landscape ? 340 : compactPortrait ? 280 : 400} />
        <PidroLogo size="hero" />
      </View>

      <Surface
        testID="welcome-window"
        variant="window"
        padded
        style={[styles.panel, compactLandscape && styles.panelCompact]}>
        {error ? (
          <Surface variant="subtle" style={styles.error} accessibilityRole="alert">
            <PidroText role="metadata" tone="danger" align="center">
              {error}
            </PidroText>
          </Surface>
        ) : null}

        {guestEntry ? (
          <View style={styles.guestForm}>
            <Input
              ref={nameRef}
              label="Your name"
              placeholder="What should players call you?"
              value={displayName}
              onChangeText={handleNameChange}
              error={nameError ?? undefined}
              editable={!isLoading}
              maxLength={80}
              autoCapitalize="words"
              autoCorrect={false}
              enterKeyHint="go"
              returnKeyType="go"
              onSubmitEditing={submitGuest}
            />
            <BevelButton
              label="Play"
              material="wood"
              size="sm"
              fullWidth
              loading={isLoading}
              onPress={submitGuest}
            />
            <PressableFX
              accessibilityRole="button"
              accessibilityLabel="Back"
              disabled={isLoading}
              onPress={() => setGuestEntry(false)}
              style={styles.back}>
              <PidroText role="metadata" tone="cyan">
                Back
              </PidroText>
            </PressableFX>
          </View>
        ) : (
          <View style={styles.actions}>
            <BevelButton
              label="Play"
              material="wood"
              size="sm"
              fullWidth
              onPress={openGuestEntry}
            />
            <BevelButton
              label="Create account"
              material="glass"
              size="sm"
              fullWidth
              onPress={() => router.push('/(auth)/register')}
            />
            <BevelButton
              label="Sign in"
              material="glass"
              size="sm"
              fullWidth
              onPress={() => router.push('/(auth)/login')}
            />
          </View>
        )}
      </Surface>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  portrait: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: PidroSpacing.md,
  },
  landscape: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: PidroSpacing.xl,
  },
  logoStage: {
    width: '100%',
    height: 210,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoStageLandscape: {
    width: '43%',
    maxWidth: 360,
    height: 300,
    flexShrink: 1,
  },
  logoStageCompact: {
    height: 130,
  },
  panel: {
    width: '100%',
    maxWidth: 340,
    gap: PidroSpacing.sm,
  },
  panelCompact: {
    padding: PidroSpacing.md,
    gap: PidroSpacing.sm,
  },
  error: {
    padding: PidroSpacing.sm,
  },
  actions: {
    gap: PidroSpacing.xs,
  },
  guestForm: {
    gap: PidroSpacing.xs,
  },
  back: {
    minWidth: PidroLayout.touchTarget,
    minHeight: PidroLayout.touchTarget,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: PidroSpacing.md,
  },
});
