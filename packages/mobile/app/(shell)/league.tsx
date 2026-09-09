import { StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { PidroText } from '@/components/ui/PidroText';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Surface } from '@/components/ui/Surface';
import { PidroBevel, PidroFonts, PidroSpacing } from '@/design/tokens';

export default function LeagueScreen() {
  return (
    <ScreenShell testID="league-screen" compact contentStyle={styles.shell}>
      <Surface variant="window" style={styles.panel} padded>
        <Svg width={44} height={44} viewBox="0 0 24 24" fill={PidroBevel.textGold}>
          <Path d="M12 2l2.4 5.7 6.1.5-4.6 4 1.4 6L12 15l-5.3 3.2 1.4-6-4.6-4 6.1-.5z" />
        </Svg>
        <PidroText style={styles.title}>The league is coming</PidroText>
        <PidroText role="body" tone="soft" align="center" style={styles.copy}>
          Seasons, ratings and promotion between leagues land here. Your games already count — the
          record follows you in.
        </PidroText>
      </Surface>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  shell: {
    justifyContent: 'center',
    paddingBottom: 96,
  },
  panel: {
    alignItems: 'center',
    gap: PidroSpacing.sm,
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
  copy: {
    maxWidth: 300,
  },
});
