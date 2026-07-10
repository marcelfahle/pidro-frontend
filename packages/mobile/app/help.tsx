import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { PidroText } from '@/components/ui/PidroText';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Surface } from '@/components/ui/Surface';
import { PidroColors, PidroRadii, PidroSpacing } from '@/design/tokens';

const RULES = [
  ['Partners', 'North and South play as a team against East and West.'],
  ['Bid', 'Win the bid to choose the trump suit for the hand.'],
  ['Play', 'Take turns playing cards and collect point cards with your partner.'],
  ['Score', 'The bidding team must make its bid or lose that many points.'],
];

export default function HelpScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  return (
    <ScreenShell scroll compact={!landscape} testID="help-screen" contentStyle={styles.shell}>
      <ScreenHeader
        title="How to play"
        subtitle="The essentials for joining a Pidro table."
        onBack={() => router.back()}
      />
      <Surface variant="window" style={[styles.panel, landscape && styles.panelLandscape]} padded>
        {RULES.map(([title, text], index) => (
          <Surface
            key={title}
            variant="subtle"
            style={[styles.rule, landscape && styles.ruleLandscape]}>
            <View style={styles.ruleNumber}>
              <PidroText role="label" tone="cyan" align="center">
                {index + 1}
              </PidroText>
            </View>
            <View style={styles.ruleCopy}>
              <PidroText role="label">{title}</PidroText>
              <PidroText role="body" tone="soft">
                {text}
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
