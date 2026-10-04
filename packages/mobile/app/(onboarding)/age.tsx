import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { TERMS_VERSION, type DeclaredAgeBand } from '@pidro/shared';
import { getMe, setAge } from '@/api/auth';
import { BevelButton } from '@/components/ui/BevelButton';
import { Icon } from '@/components/ui/Icon';
import { PidroLogo } from '@/components/ui/PidroLogo';
import { PidroText } from '@/components/ui/PidroText';
import { PressableFX } from '@/components/ui/PressableFX';
import { ScreenShell } from '@/components/ui/ScreenShell';
import {
  PidroBevel,
  PidroColors,
  PidroFonts,
  PidroLayout,
  PidroSpacing,
  PidroSwitchTokens,
} from '@/design/tokens';
import { reconcileAge } from '@/features/onboarding/reconcileAge';
import { entryDestination, needsAgeGate } from '@/navigation/initialRoute';
import { useAgeGateStore } from '@/stores/ageGate';
import { useAuthStore } from '@/stores/auth';
import { usePendingInviteStore } from '@/stores/pendingInvite';

const TERMS_URL = 'https://www.pidro.online/terms-of-use';
const PRIVACY_URL = 'https://www.pidro.online/privacy-policy';

const OPTIONS: { value: DeclaredAgeBand; label: string }[] = [
  { value: 'under_13', label: 'Under 13' },
  { value: '13_17', label: '13 to 17' },
  { value: '18_plus', label: '18 or older' },
];

type Fixture = 'selected' | 'under13';

function HelpLink({
  label,
  onPress,
  punctuation = '',
}: {
  label: string;
  onPress: () => void;
  punctuation?: string;
}) {
  return (
    <PressableFX
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.helpLink}>
      <PidroText role="metadata" tone="cyan" style={styles.helpLinkText}>
        {label}
        {punctuation}
      </PidroText>
    </PressableFX>
  );
}

export default function AgeScreen() {
  const router = useRouter();
  const { fixture: fixtureParam } = useLocalSearchParams<{ fixture?: string }>();
  const fixture = (__DEV__ ? fixtureParam : undefined) as Fixture | undefined;
  const { height } = useWindowDimensions();
  const compact = height < PidroLayout.compactHeight;
  const storedBand = useAgeGateStore((state) => state.ageBand);
  const storedTermsVersion = useAgeGateStore((state) => state.termsVersion);
  const setAnswer = useAgeGateStore((state) => state.setAnswer);
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const setSession = useAuthStore((state) => state.setSession);
  const pendingInvite = usePendingInviteStore((state) => state.pendingInvite);
  const [selection, setSelection] = useState<DeclaredAgeBand | null>(
    fixture === 'selected'
      ? '18_plus'
      : storedBand === '13_17' || storedBand === '18_plus'
        ? storedBand
        : null
  );
  const [stopped, setStopped] = useState(
    fixture === 'under13' || (!fixture && storedBand === 'under_13')
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoSubmitStarted = useRef(false);

  const finish = useCallback(
    (resolvedUser = user, resolvedBand = storedBand) => {
      router.replace(
        entryDestination(
          resolvedUser ? 'authenticated' : 'unauthenticated',
          pendingInvite,
          resolvedBand,
          resolvedUser
        ) as Href
      );
    },
    [pendingInvite, router, storedBand, user]
  );

  const submitEligibleAnswer = useCallback(
    async (ageBand: '13_17' | '18_plus', termsVersion: string) => {
      setSubmitting(true);
      const result = await reconcileAge(
        { age_band: ageBand, terms_version: termsVersion },
        { setAge, getMe }
      );
      if (result.status === 'saved') {
        if (accessToken) setSession({ accessToken, user: result.user });
        finish(result.user, ageBand);
      } else if (result.status === 'not_eligible') {
        setAnswer('under_13', termsVersion);
        setStopped(true);
      } else {
        setError(result.message);
      }
      setSubmitting(false);
    },
    [accessToken, finish, setAnswer, setSession]
  );

  useEffect(() => {
    if (
      fixture ||
      autoSubmitStarted.current ||
      (storedBand !== '13_17' && storedBand !== '18_plus') ||
      !storedTermsVersion ||
      !user ||
      (user.age_band !== 'unknown' && user.age_band != null)
    )
      return;
    autoSubmitStarted.current = true;
    void submitEligibleAnswer(storedBand, storedTermsVersion);
  }, [fixture, storedBand, storedTermsVersion, submitEligibleAnswer, user]);

  const continueWithSelection = useCallback(async () => {
    if (!selection || submitting) return;
    setError(null);
    setAnswer(selection, TERMS_VERSION);
    if (selection === 'under_13') {
      setStopped(true);
      return;
    }
    if (!user || (user.age_band !== 'unknown' && user.age_band != null)) {
      finish(user, selection);
      return;
    }
    await submitEligibleAnswer(selection, TERMS_VERSION);
  }, [finish, selection, setAnswer, submitEligibleAnswer, submitting, user]);

  if (!fixture && storedBand !== 'under_13' && !needsAgeGate(storedBand, user)) {
    return (
      <Redirect
        href={
          entryDestination(
            user ? 'authenticated' : 'unauthenticated',
            pendingInvite,
            storedBand,
            user
          ) as Href
        }
      />
    );
  }

  if (stopped) {
    return (
      <ScreenShell scroll testID="age-stop-screen" contentStyle={styles.screen}>
        {!compact ? (
          <View style={styles.logoStage} pointerEvents="none">
            <PidroLogo size="compact" />
          </View>
        ) : null}
        <View style={[styles.stopCopy, compact && styles.stopCopyCompact]}>
          <PidroText role="display" tone="gold" align="center" style={styles.stopTitle}>
            Pidro is for players aged 13 and older
          </PidroText>
          <PidroText role="body" align="center">
            Thanks for stopping by.
          </PidroText>
        </View>
        <View accessibilityLabel="Help" style={styles.stopLinks}>
          <HelpLink
            label="Privacy Policy"
            onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}
          />
          <View style={styles.dot} />
          <HelpLink
            label="Contact support"
            onPress={() => Linking.openURL('mailto:support@pidro.net')}
          />
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell scroll testID="age-screen" contentStyle={styles.screen}>
      {!compact ? (
        <View style={styles.logoStage} pointerEvents="none">
          <PidroLogo size="compact" />
        </View>
      ) : null}

      <View style={styles.intro}>
        <PidroText role="display" tone="gold" align="center" style={styles.title}>
          How old are you?
        </PidroText>
        <PidroText role="body" align="center">
          Choose your age range. We don&apos;t ask for your birthday.
        </PidroText>
      </View>

      <View accessibilityRole="radiogroup" accessibilityLabel="Age range" style={styles.options}>
        {OPTIONS.map((option) => {
          const checked = selection === option.value;
          return (
            <BevelButton
              key={option.value}
              label={option.label}
              material="glass"
              size="lg"
              accessibilityRole="radio"
              accessibilityState={{ checked }}
              aria-checked={checked}
              leadingIcon={
                checked ? <Icon name="check" size={20} color={PidroColors.cyanText} /> : undefined
              }
              onPress={() => setSelection(option.value)}
              style={[styles.option, checked && styles.optionSelected]}
            />
          );
        })}
      </View>

      {error ? (
        <PidroText accessibilityRole="alert" role="metadata" tone="danger" align="center">
          {error}
        </PidroText>
      ) : null}

      <BevelButton
        accessibilityLabel="Continue"
        material="wood"
        size="lg"
        weight="hero"
        fullWidth
        disabled={!selection}
        loading={submitting}
        onPress={continueWithSelection}
        style={styles.continueButton}>
        <PidroText style={styles.continueLabel}>Continue</PidroText>
      </BevelButton>

      <View style={styles.termsLine}>
        <PidroText role="metadata" tone="soft" style={styles.termsText}>
          By continuing you agree to our{' '}
        </PidroText>
        <HelpLink label="Terms" onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)} />
        <PidroText role="metadata" tone="soft" style={styles.termsText}>
          {' '}
          and{' '}
        </PidroText>
        <HelpLink
          label="Privacy Policy"
          punctuation="."
          onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}
        />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    gap: PidroSpacing.sm,
    maxWidth: 390,
  },
  logoStage: {
    width: '100%',
    minHeight: 150,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intro: {
    width: '100%',
    maxWidth: 340,
    flexShrink: 0,
    alignItems: 'center',
    gap: PidroSpacing.xs,
    marginBottom: PidroSpacing.xs,
  },
  title: {
    fontFamily: PidroFonts.display,
    fontWeight: '400',
  },
  options: {
    width: '100%',
    maxWidth: 340,
    gap: PidroSpacing.sm,
  },
  option: {
    width: '100%',
    height: 56,
  },
  optionSelected: {
    boxShadow: `${PidroSwitchTokens.focusShadow}, ${PidroBevel.glassDropShadow}`,
  },
  continueButton: {
    width: '100%',
    maxWidth: 340,
    height: 68,
    marginTop: PidroSpacing.xs,
  },
  continueLabel: {
    fontFamily: PidroFonts.display,
    fontSize: 27,
    lineHeight: 35,
    fontWeight: '400',
    color: PidroBevel.textGold,
    ...PidroBevel.labelShadow,
    transform: [{ translateY: -1 }],
  },
  termsLine: {
    width: '100%',
    maxWidth: 340,
    minHeight: PidroLayout.touchTarget,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsText: {
    fontSize: 13,
    lineHeight: 20,
  },
  helpLink: {
    minHeight: PidroLayout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpLinkText: {
    fontSize: 13,
    lineHeight: 20,
  },
  stopCopy: {
    width: '100%',
    maxWidth: 340,
    flexShrink: 0,
    alignItems: 'center',
    gap: PidroSpacing.sm,
    marginBottom: 138,
  },
  stopCopyCompact: {
    flexGrow: 1,
    justifyContent: 'center',
    marginBottom: PidroSpacing.lg,
  },
  stopTitle: {
    fontFamily: PidroFonts.display,
    fontSize: 28,
    lineHeight: 35,
    fontWeight: '400',
  },
  stopLinks: {
    minHeight: PidroLayout.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: PidroSpacing.xs,
  },
  dot: {
    width: PidroSpacing.xxs,
    height: PidroSpacing.xxs,
    borderRadius: PidroSpacing.xxs,
    backgroundColor: PidroColors.textMuted,
  },
});
