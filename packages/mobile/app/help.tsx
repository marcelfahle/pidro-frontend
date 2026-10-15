import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { PidroText } from '@/components/ui/PidroText';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Surface } from '@/components/ui/Surface';
import { PidroColors, PidroRadii, PidroSpacing } from '@/design/tokens';
import { useTranslation } from '@/i18n';

const RULES = ['partners', 'bid', 'play', 'score'] as const;

export default function HelpScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  return (
    <ScreenShell scroll compact={!landscape} testID="help-screen" contentStyle={styles.shell}>
      <ScreenHeader
        title={t('help.title')}
        subtitle={t('help.subtitle')}
        onBack={() => router.back()}
      />
      <Surface variant="window" style={[styles.panel, landscape && styles.panelLandscape]} padded>
        {RULES.map((rule, index) => (
          <Surface
            key={rule}
            variant="subtle"
            style={[styles.rule, landscape && styles.ruleLandscape]}>
            <View style={styles.ruleNumber}>
              <PidroText role="label" tone="cyan" align="center">
                {index + 1}
              </PidroText>
            </View>
            <View style={styles.ruleCopy}>
              <PidroText role="label">{t(`help.${rule}`)}</PidroText>
              <PidroText role="body" tone="soft">
                {t(`help.${rule}Body`)}
              </PidroText>
            </View>
          </Surface>
        ))}
      </Surface>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: PidroSpacing.md,
  },
  panel: {
    gap: PidroSpacing.sm,
  },
  panelLandscape: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  rule: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.sm,
    padding: PidroSpacing.sm,
  },
  ruleLandscape: {
    width: '48.5%',
    minHeight: 90,
  },
  ruleNumber: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: PidroRadii.full,
    borderWidth: 1,
    borderColor: PidroColors.cyanBorder,
    backgroundColor: PidroColors.panel,
  },
  ruleCopy: {
    minWidth: 0,
    flex: 1,
    gap: PidroSpacing.xxs,
  },
});
