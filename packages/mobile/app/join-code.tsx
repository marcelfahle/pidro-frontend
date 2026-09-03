import { useState } from 'react';
import { useRouter, type Href } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PidroText } from '@/components/ui/PidroText';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Surface } from '@/components/ui/Surface';
import { PidroSpacing, PidroType } from '@/design/tokens';
import {
  formatManualInviteCode,
  manualInviteRoute,
  parseManualInviteCode,
} from '@/features/invites/manualCode';
import { t } from '@/i18n';
import { useAuthStore } from '@/stores/auth';

export default function JoinCodeScreen() {
  const router = useRouter();
  const authenticated = useAuthStore((state) => state.status === 'authenticated');
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const code = parseManualInviteCode(value);
  const error = touched && value.length > 0 && !code ? t('invite.manual.invalid') : undefined;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace((authenticated ? '/home' : '/(auth)/login') as Href);
  };

  const submit = () => {
    const route = manualInviteRoute(value);
    if (!route) {
      setTouched(true);
      return;
    }
    setSubmitting(true);
    router.push(route as Href);
  };

  return (
    <ScreenShell scroll compact testID="join-code-screen" contentStyle={styles.shell}>
      <ScreenHeader
        title={t('invite.manual.title')}
        subtitle={t('invite.manual.subtitle')}
        onBack={goBack}
      />
      <Surface
        testID="join-code-window"
        variant="window"
        padded
        style={[styles.panel, landscape && styles.panelLandscape]}>
        <View style={styles.copy}>
          <PidroText role="title" tone="gold">
            {t('invite.manual.heading')}
          </PidroText>
          <PidroText role="body" tone="soft">
            {t('invite.manual.help')}
          </PidroText>
        </View>
        <Input
          testID="invite-code-input"
          label={t('invite.manual.label')}
          placeholder={t('invite.manual.placeholder')}
          value={value}
          onChangeText={(next) => {
            setValue(formatManualInviteCode(next));
            if (parseManualInviteCode(next)) setTouched(false);
          }}
          onBlur={() => setTouched(true)}
          onSubmitEditing={submit}
          error={error}
          autoCapitalize="characters"
          autoCorrect={false}
          spellCheck={false}
          returnKeyType="go"
          textContentType="oneTimeCode"
          style={styles.input}
        />
        <Button
          label={t('invite.manual.continue')}
          onPress={submit}
          loading={submitting}
          disabled={!code}
          size="lg"
        />
      </Surface>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  shell: {
    justifyContent: 'center',
    gap: PidroSpacing.md,
  },
  panel: {
    width: '100%',
    gap: PidroSpacing.md,
  },
  panelLandscape: {
    paddingVertical: PidroSpacing.sm,
  },
  copy: {
    gap: PidroSpacing.xxs,
  },
  input: {
    ...PidroType.title,
    letterSpacing: 2,
    textAlign: 'center',
  },
});
