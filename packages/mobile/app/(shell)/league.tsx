import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import type { ProfileIdentity } from '@/api/profile';
import { gradientBg } from '@/components/ui/Bevel';
import { Icon } from '@/components/ui/Icon';
import { PidroText } from '@/components/ui/PidroText';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Surface } from '@/components/ui/Surface';
import { usePillClearance } from '@/components/shell/TabPill';
import { PidroBevel, PidroColors, PidroFonts, PidroRadii, PidroSpacing } from '@/design/tokens';
import { monthName } from '@/features/profile';
import { useProfileIdentity } from '@/hooks/useProfileIdentity';

// The ladder, bottom to top. Pidro, the card worth five, is the top league.
const LEAGUES = [
  { name: 'Jack', rank: 'J', suit: '♣', red: false },
  { name: 'Queen', rank: 'Q', suit: '♦', red: true },
  { name: 'King', rank: 'K', suit: '♥', red: true },
  { name: 'Ace', rank: 'A', suit: '♠', red: false },
] as const;

export default function LeagueScreen() {
  const pillClearance = usePillClearance();
  const refreshIdentity = useProfileIdentity();
  const [xp, setXp] = useState<ProfileIdentity['xp']>(undefined);

  useFocusEffect(
    useCallback(() => {
      void refreshIdentity()
        .then((identity) => identity?.xp && setXp(identity.xp))
        .catch(() => {});
    }, [refreshIdentity])
  );

  return (
    <ScreenShell
      testID="league-screen"
      compact
      scroll
      contentStyle={[
        styles.shell,
        {
          paddingBottom: PidroSpacing.md + pillClearance.bottom,
          paddingRight: PidroSpacing.md + pillClearance.right,
        },
      ]}>
      <Surface variant="window" style={styles.panel} padded>
        <View style={styles.cards} accessibilityRole="list" accessibilityLabel="Leagues">
          {LEAGUES.map((league) => (
            <View
              key={league.name}
              accessible
              accessibilityLabel={`${league.name} league`}
              style={[styles.card, styles.paper]}>
              <PidroText style={[styles.rank, league.red && styles.red]}>{league.rank}</PidroText>
              <PidroText style={[styles.suit, league.red && styles.red]}>{league.suit}</PidroText>
            </View>
          ))}
          <View
            accessible
            accessibilityLabel="Pidro league, the top"
            style={[styles.card, styles.pidro, gradientBg(PidroBevel.goldRimGradient)]}>
            <Icon name="spade" size={18} color={PidroBevel.woodDeep} />
          </View>
        </View>
        <PidroText style={styles.title}>The league is coming</PidroText>
        <PidroText role="body" tone="soft" align="center" style={styles.copy}>
          Every game counts toward where you start.
        </PidroText>
        {xp ? (
          <View style={styles.periods}>
            <View style={styles.figure}>
              <PidroText role="metadata" tone="cyan" align="center" style={styles.eyebrow}>
                This week
              </PidroText>
              <PidroText role="title" align="center" style={styles.number}>
                {xp.this_week.toLocaleString()} XP
              </PidroText>
            </View>
            <View style={[styles.figure, styles.month]}>
              <PidroText role="metadata" tone="cyan" align="center" style={styles.eyebrow}>
                {monthName()}
              </PidroText>
              <PidroText role="title" align="center" style={styles.number}>
                {xp.this_month.toLocaleString()} XP
              </PidroText>
            </View>
          </View>
        ) : null}
      </Surface>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  shell: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  panel: {
    alignItems: 'center',
    gap: PidroSpacing.sm,
  },
  cards: {
    flexDirection: 'row',
    gap: PidroSpacing.xs,
    paddingVertical: PidroSpacing.xxs,
  },
  card: {
    width: 32,
    height: 44,
    borderRadius: PidroRadii.tight,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 2px 6px rgba(0,0,0,0.4)',
  },
  paper: {
    backgroundColor: PidroColors.leagueCardFace,
    borderColor: PidroColors.leagueCardEdge,
  },
  pidro: {
    borderColor: PidroBevel.rimDeep,
  },
  rank: {
    fontFamily: PidroFonts.display,
    fontWeight: '400',
    fontSize: 16,
    lineHeight: 18,
    color: PidroColors.leagueCardInk,
  },
  suit: {
    fontSize: 13,
    lineHeight: 15,
    color: PidroColors.leagueCardInk,
  },
  red: {
    color: PidroColors.leagueCardRed,
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
  periods: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: PidroSpacing.sm,
    paddingTop: PidroSpacing.sm,
    borderTopWidth: 1,
    borderTopColor: PidroColors.border,
  },
  figure: { flex: 1, gap: 2 },
  month: {
    borderLeftWidth: 1,
    borderLeftColor: PidroColors.border,
  },
  eyebrow: { letterSpacing: 1, textTransform: 'uppercase' },
  number: { fontWeight: '900', fontVariant: ['tabular-nums'] },
});
