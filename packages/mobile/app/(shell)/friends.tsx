import { StyleSheet } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import { BevelButton } from '@/components/ui/BevelButton';
import { PidroText } from '@/components/ui/PidroText';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Surface } from '@/components/ui/Surface';
import { PidroBevel, PidroFonts, PidroSpacing } from '@/design/tokens';
import { t } from '@/i18n';

export default function FriendsScreen() {
  const router = useRouter();

  return (
    <ScreenShell testID="friends-screen" compact contentStyle={styles.shell}>
      <Surface variant="window" style={styles.panel} padded>
        <Svg
          width={44}
          height={44}
          viewBox="0 0 24 24"
          fill="none"
          stroke={PidroBevel.textGold}
          strokeWidth={1.8}
          strokeLinecap="round">
          <Circle cx={9} cy={8} r={3.4} />
          <Path d="M2.5 20a6.5 6.5 0 0 1 13 0M17 5.5a3.4 3.4 0 0 1 0 5.8M21.5 20a6.5 6.5 0 0 0-4.5-6.2" />
        </Svg>
        <PidroText style={styles.title}>Friends</PidroText>
        <PidroText role="body" tone="soft" align="center" style={styles.copy}>
          Friend lists are coming. Until then, invite links take friends straight to your table —
          and a code gets you to theirs.
        </PidroText>
        <BevelButton
          label={t('invite.manual.entryAction')}
          material="glass"
          size="md"
          fullWidth
          onPress={() => router.push('/join-code' as Href)}
        />
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
