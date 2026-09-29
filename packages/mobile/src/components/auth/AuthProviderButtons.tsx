import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import Svg, { Path } from 'react-native-svg';
import { PidroColors, PidroSpacing } from '@/design/tokens';
import { BevelButton } from '@/components/ui/BevelButton';
import { PidroText } from '@/components/ui/PidroText';
import { PressableFX } from '@/components/ui/PressableFX';
import type { SocialProviderAvailability } from '@/features/auth/socialCredentials';
import { getSocialProviderAvailability } from '@/features/auth/socialProviders';

export interface AuthProviderButtonsProps {
  onApple: () => void;
  onFacebook: () => void;
  onEmail?: () => void;
  showEmail?: boolean;
  showEmailDivider?: boolean;
  /** Deterministic native-capability override for development fixtures. */
  availability?: SocialProviderAvailability;
}

function FacebookLogo() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="#ffffff">
      <Path d="M13.5 21v-7.5h2.52l.38-3h-2.9V8.6c0-.87.24-1.46 1.49-1.46h1.59V4.44c-.28-.04-1.22-.12-2.32-.12-2.3 0-3.87 1.4-3.87 3.98v2.2H7.9v3h2.49V21z" />
    </Svg>
  );
}

export function AuthProviderButtons({
  onApple,
  onFacebook,
  onEmail,
  showEmail = true,
  showEmailDivider = false,
  availability: availabilityOverride,
}: AuthProviderButtonsProps) {
  const [detectedAvailability, setDetectedAvailability] = useState<SocialProviderAvailability>({
    apple: false,
    facebook: false,
  });
  const availability = availabilityOverride ?? detectedAvailability;

  useEffect(() => {
    if (availabilityOverride) return;
    let mounted = true;
    void getSocialProviderAvailability().then((detected) => {
      if (mounted) setDetectedAvailability(detected);
    });
    return () => {
      mounted = false;
    };
  }, [availabilityOverride]);

  if (!availability.apple && !availability.facebook && !(showEmail && onEmail)) return null;

  return (
    <View style={styles.stack}>
      {availability.apple ? (
        <AppleAuthentication.AppleAuthenticationButton
          testID="apple-sign-in"
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={13}
          style={styles.appleButton}
          onPress={onApple}
        />
      ) : null}
      {availability.facebook ? (
        <PressableFX
          accessibilityRole="button"
          accessibilityLabel="Continue with Facebook"
          onPress={onFacebook}
          style={styles.facebookButton}
          pressedStyle={styles.facebookPressed}>
          <FacebookLogo />
          <PidroText style={styles.facebookLabel}>Continue with Facebook</PidroText>
        </PressableFX>
      ) : null}
      {showEmailDivider && (availability.apple || availability.facebook) ? (
        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <PidroText role="metadata" tone="muted">
            or with email
          </PidroText>
          <View style={styles.divider} />
        </View>
      ) : null}
      {showEmail && onEmail ? (
        <BevelButton
          label="Continue with email"
          material="glass"
          size="md"
          fullWidth
          onPress={onEmail}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    alignSelf: 'stretch',
    gap: PidroSpacing.sm,
  },
  appleButton: {
    width: '100%',
    height: 50,
  },
  facebookButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderRadius: 13,
    backgroundColor: '#1877F2',
  },
  facebookPressed: {
    backgroundColor: '#1462c9',
  },
  facebookLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.sm,
  },
  divider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: PidroColors.border,
  },
});
