import { useCallback, useRef, useState } from 'react';
import { Keyboard, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { Redirect, useRouter, type Href } from 'expo-router';
import { LogoGlow } from '@/components/home/LogoGlow';
import { BevelButton } from '@/components/ui/BevelButton';
import { Input } from '@/components/ui/Input';
import { PidroLogo } from '@/components/ui/PidroLogo';
import { PidroText } from '@/components/ui/PidroText';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Surface } from '@/components/ui/Surface';
import { PidroBevel, PidroFonts, PidroSpacing } from '@/design/tokens';
import { validateDisplayName } from '@/features/invites/joinFlow';
import { useAuth } from '@/hooks/useAuth';
import { authenticatedDestination } from '@/navigation/initialRoute';
import { usePendingInviteStore } from '@/stores/pendingInvite';

export default function WelcomeScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const compactLandscape = landscape && height < 500;
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
    const success = await continueAsGuest(validation.value);
    if (success) router.replace(authenticatedDestination(pendingInvite) as Href);
  }, [continueAsGuest, displayName, pendingInvite, router]);

  if (isAuthenticated) {
    return <Redirect href={authenticatedDestination(pendingInvite) as Href} />;
  }

  return (
    <ScreenShell
      testID="welcome-screen"
      scroll
      contentStyle={landscape ? styles.landscape : styles.portrait}>
      <View style={[styles.logoStage, landscape && styles.logoStageLandscape]} pointerEvents="none">
        <LogoGlow size={landscape ? 340 : 400} />
        <PidroLogo size="hero" />
      </View>

      <Surface
        testID="welcome-window"
        variant="window"
        padded
        style={[styles.panel, compactLandscape && styles.panelCompact]}>
        <View style={styles.heading}>
          <PidroText align="center" style={styles.title}>
            Your seat is waiting
          </PidroText>
          {compactLandscape ? null : (
            <PidroText role="body" tone="soft" align="center">
              Jump straight into a game, or make an account to play everywhere.
            </PidroText>
          )}
        </View>

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
              label="Public name"
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
            <PidroText role="metadata" tone="soft" align="center">
              No email or password needed. This guest stays on this device.
            </PidroText>
            <BevelButton
              label="Start playing"
              material="wood"
              size="hero"
              fullWidth
              loading={isLoading}
              onPress={submitGuest}
            />
            <BevelButton
              label="Back"
              material="glass"
              size="sm"
              fullWidth
              disabled={isLoading}
              onPress={() => setGuestEntry(false)}
            />
          </View>
        ) : (
          <View style={styles.actions}>
            <BevelButton
              label="Play as guest"
              material="wood"
              size="hero"
              fullWidth
              onPress={openGuestEntry}
            />
            <View style={styles.accountActions}>
              <BevelButton
                label="Create account"
                material="glass"
                size="md"
                fullWidth
                onPress={() => router.push('/(auth)/register')}
              />
              <BevelButton
                label="Sign in"
                material="glass"
                size="md"
                fullWidth
                onPress={() => router.push('/(auth)/login')}
              />
            </View>
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
  panel: {
    width: '100%',
    maxWidth: 440,
    gap: PidroSpacing.md,
  },
  panelCompact: {
    padding: PidroSpacing.md,
    gap: PidroSpacing.sm,
  },
  heading: {
    gap: PidroSpacing.xxs,
  },
  title: {
    fontFamily: PidroFonts.display,
    fontWeight: '400',
    fontSize: 28,
    lineHeight: 36,
    color: PidroBevel.textGold,
    ...PidroBevel.labelShadow,
  },
  error: {
    padding: PidroSpacing.sm,
  },
  actions: {
    gap: PidroSpacing.md,
  },
  accountActions: {
    gap: PidroSpacing.sm,
  },
  guestForm: {
    gap: PidroSpacing.sm,
  },
});
