import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LeagueProgress } from '@/components/home/LeagueProgress';
import { gradientBg } from '@/components/ui/Bevel';
import { RuleSetChip } from '@/components/rules/RuleSet';
import { BevelButton } from '@/components/ui/BevelButton';
import { Icon } from '@/components/ui/Icon';
import { PidroText } from '@/components/ui/PidroText';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { PressableFX } from '@/components/ui/PressableFX';
import { Surface } from '@/components/ui/Surface';
import {
  PidroBevel,
  PidroColors,
  PidroFonts,
  PidroGameOver,
  PidroRadii,
  PidroSpacing,
} from '@/design/tokens';
import { canViewPlayer } from '@/features/friends';
import {
  bestHand,
  bestHandLine,
  lastTrickReveal,
  nameList,
  pointCardsTaken,
  raceLine,
  streakChip,
  xpChip,
} from '@/features/game/gameOver';
import type { ProgressionSummary } from '@/channels/hooks/useGameChannel';
import { playBigTrickHaptic, playOurPidroHaptic } from '@/game/useGameHaptics';
import { formatNumber, t, useTranslation } from '@/i18n';
import type { RematchVote } from '@pidro/shared';
import type { GameViewModel, RelativePlayerView, ServerGameState, TeamKey } from '@/types/game';
import { isNorthSouthTeam, resolveWinningTeam } from '@/utils/positions';
import { isStillCapture } from '@/utils/stillCapture';
import { BestHandFan, LastTrickStage } from './GameOverCards';
import { RaceChart } from './RaceChart';
import { RematchRow, type RematchSeatView } from './RematchRow';
import { VictoryConfetti, VictoryRays } from './VictoryConfetti';

interface GameOverOverlayProps {
  viewModel: GameViewModel;
  serverState: ServerGameState;
  progressionSummary?:
    | (Pick<ProgressionSummary, 'xp_earned' | 'veteran_level' | 'leveled_up'> &
        Partial<Pick<ProgressionSummary, 'veteran_progress' | 'partner'>>)
    | null;
  onHome: () => void;
  onPlayAgain: () => void;
  rematch?: RematchVote | null;
  rematchPending?: boolean;
  playAgainLabel?: string;
  showGuestSave?: boolean;
  onSaveGuest?: () => void;
  onProfile?: (playerId: string) => void;
}

function displayName(player: RelativePlayerView): string {
  if (player.isYou) return t('game.you');
  if (player.username) return player.username;
  if (player.seatStatus === 'bot_substitute' || player.seatStatus === 'permanent_bot')
    return t('game.bot');
  return t(`table.position.${player.absolutePosition}`);
}

const teamOf = (player: RelativePlayerView): TeamKey =>
  isNorthSouthTeam(player.absolutePosition) ? 'north_south' : 'east_west';

const isBot = (player: RelativePlayerView) =>
  player.seatStatus === 'permanent_bot' || !!player.playerId?.startsWith('bot_');

/**
 * Phone sizes are the boards' (390 wide, 375×667 compact, 844×390 landscape);
 * a tablet takes the phone layout for its orientation at 1.25×, centred.
 * `tier` steps the reveal down as height runs out: decoration yields first.
 */
function useLayout() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const w = width - insets.left - insets.right - PidroSpacing.md * 2;
  const h = height - insets.top - insets.bottom - PidroSpacing.sm * 2;
  const tablet = Math.min(width, height) >= 600;
  const k = tablet ? 1.25 : 1;
  const landscape = width > height;
  const room = h / k;
  const tier: 0 | 1 | 2 = landscape ? (room >= 300 ? 1 : 2) : room >= 730 ? 0 : room >= 600 ? 1 : 2;
  return {
    insets,
    landscape,
    k,
    tier,
    frame: landscape
      ? { width: Math.min(w, 812 * k), height: tablet ? Math.min(h, 370 * k) : h }
      : { width: Math.min(w, 400 * k), height: tablet ? Math.min(h, 780 * k) : h },
    rays: {
      center: landscape
        ? { x: insets.left + w * 0.27, y: insets.top + h * 0.3 }
        : { x: width / 2, y: insets.top + h * 0.18 },
      size: Math.max(width, height) * 1.1,
    },
  };
}

type Beat =
  'stage' | 'fan' | 'plaque' | 'headline' | 'score' | 'best' | 'chart' | 'chips' | 'footer';
const BEATS: Beat[] = [
  'stage',
  'fan',
  'plaque',
  'headline',
  'score',
  'best',
  'chart',
  'chips',
  'footer',
];
// Win-Beats: the card rises, the headline lands, the score slams, the line
// draws, the chips rise. A loss only lets each block come up in turn.
const WIN: Partial<Record<Beat, [number, number]>> = {
  stage: [150, 700],
  fan: [600, 500],
  plaque: [900, 380],
  headline: [950, 380],
  score: [1050, 520],
  chart: [1500, 600],
  chips: [2200, 380],
  footer: [300, 300],
};
const QUIET: Partial<Record<Beat, [number, number]>> = {
  headline: [0, 380],
  score: [0, 380],
  best: [400, 380],
  chart: [900, 380],
  chips: [1600, 380],
  footer: [300, 300],
};

/** One timeline for the reveal. A tap anywhere jumps to the end. */
function useBeats(win: boolean) {
  const calm = useReducedMotion() || isStillCapture();
  const [values] = useState(
    () =>
      Object.fromEntries(BEATS.map((beat) => [beat, new Animated.Value(calm ? 1 : 0)])) as Record<
        Beat,
        Animated.Value
      >
  );
  const animation = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (calm) {
      if (win) playOurPidroHaptic();
      return;
    }
    const plan = win ? WIN : QUIET;
    const run = Animated.parallel(
      BEATS.map((beat) => {
        const [delay, duration] = plan[beat] ?? [0, 0];
        return Animated.timing(values[beat], {
          toValue: 1,
          delay,
          duration,
          easing: beat === 'stage' ? Easing.out(Easing.back(1.4)) : Easing.out(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        });
      })
    );
    animation.current = run;
    run.start();
    // The score lands: success, then one heavy.
    const timers = win
      ? [setTimeout(playOurPidroHaptic, 1050), setTimeout(playBigTrickHaptic, 1200)]
      : [];
    return () => {
      run.stop();
      timers.forEach(clearTimeout);
    };
  }, [calm, values, win]);

  const skip = useCallback(() => {
    if (!animation.current) return;
    animation.current.stop();
    animation.current = null;
    BEATS.forEach((beat) => values[beat].setValue(1));
  }, [values]);

  return { values, skip, calm };
}

const rise = (value: Animated.Value) => ({
  opacity: value,
  transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
});

export function GameOverOverlay({
  viewModel,
  serverState,
  progressionSummary,
  onHome,
  onPlayAgain,
  rematch,
  rematchPending = false,
  playAgainLabel,
  showGuestSave = false,
  onSaveGuest,
  onProfile,
}: GameOverOverlayProps) {
  useTranslation();
  const { insets, landscape, k, tier, frame, rays } = useLayout();
  const z = (n: number) => Math.round(n * k);
  const you = viewModel.players.find((player) => player.isYou);
  const spectator = !you;
  const rawScores = serverState.scores ?? { north_south: 0, east_west: 0 };
  const winningTeam = resolveWinningTeam(serverState.winner, rawScores);
  const tied = winningTeam == null;
  // The viewer's side reads first; a spectator follows the winners.
  const ours: TeamKey = you ? teamOf(you) : (winningTeam ?? 'north_south');
  const theirs: TeamKey = ours === 'north_south' ? 'east_west' : 'north_south';
  const viewerWon = !spectator && winningTeam === ours;
  const history = serverState.hand_history ?? [];
  const lastHand = serverState.last_hand ?? null;
  const reveal = viewerWon && tier < 2 ? lastTrickReveal(lastHand) : null;
  const best = !spectator && !viewerWon ? bestHand(history, ours) : null;
  const race = history.length ? raceLine(history, ours) : null;
  const streak = spectator ? null : streakChip(progressionSummary?.partner);
  const xp = spectator ? null : xpChip(progressionSummary);
  const partner = viewModel.players.find(
    (player) => !player.isYou && you && teamOf(player) === ours
  );
  const namesOf = (team: TeamKey) =>
    nameList(viewModel.players.filter((player) => teamOf(player) === team).map(displayName));
  const hands = history.length || lastHand?.hand_number || 0;
  const { values: beat, skip, calm } = useBeats(viewerWon);

  const headline = tied
    ? t('game.tie')
    : viewerWon
      ? partner
        ? t('game.you_and_partner_win', { partner: displayName(partner) })
        : t('game.won')
      : t('game.names_win', { names: namesOf(winningTeam) });
  const eyebrow =
    viewerWon && lastHand
      ? t('game.over_last_trick', { number: lastHand.hand_number })
      : hands
        ? t('game.over_hands', { count: hands })
        : null;
  const firstLabel = spectator ? t(ours === 'north_south' ? 'game.ns' : 'game.ew') : t('game.us');
  const secondLabel = spectator
    ? t(theirs === 'north_south' ? 'game.ns' : 'game.ew')
    : t('game.them');

  const others: RematchSeatView[] = viewModel.players
    .filter((player) => !player.isYou)
    .map((player) => {
      const seat = rematch?.seats?.find((s) => s.position === player.absolutePosition);
      const bot = seat?.bot ?? isBot(player);
      return {
        name: displayName(player),
        bot,
        agreed: seat ? seat.agreed : bot,
        avatarUrl: player.avatar_url,
        playerId: canViewPlayer(player) ? player.playerId : null,
      };
    });
  const youAgreed = !!rematch?.youAgreed;

  // Sizes for this tier, at the tablet's 1.25×.
  const heroWidth = z(landscape ? (tier === 1 ? 76 : 62) : tier === 0 ? 112 : 88);
  const big = z(landscape ? (tier === 1 ? 64 : 52) : tier === 0 ? 104 : tier === 1 ? 78 : 60);
  const small = z(landscape ? 30 : tier === 0 ? 46 : tier === 1 ? 38 : 32);
  const quietScore = z(landscape ? 40 : tier === 0 ? 52 : tier === 1 ? 44 : 38);
  const headlineSize = z(
    viewerWon ? (landscape || tier > 0 ? 30 : 36) : landscape || tier > 0 ? 24 : 28
  );
  const chartHeight = z(
    landscape ? (tier === 1 ? 64 : 48) : tier === 0 ? 78 : tier === 1 ? 60 : 48
  );
  const gap = z(tier === 0 ? PidroSpacing.md : tier === 1 ? PidroSpacing.sm : PidroSpacing.xs);

  const eyebrowText = (text: string, color: string) => (
    <PidroText
      role="metadata"
      align="center"
      style={[styles.eyebrow, { color, fontSize: z(13), lineHeight: z(17) }]}>
      {text}
    </PidroText>
  );

  const heading = (
    <Animated.View style={[styles.heading, rise(beat.headline)]}>
      <View style={styles.eyebrowRow}>
        {eyebrow
          ? eyebrowText(eyebrow, viewerWon ? PidroColors.textOnWood : PidroColors.cyanText)
          : null}
        <RuleSetChip
          ruleSet={serverState.variant ?? 'finnish'}
          testID="game-over-rule-set"
          compact
        />
      </View>
    </Animated.View>
  );

  const stage = reveal ? (
    <View style={styles.stage}>
      <LastTrickStage
        winner={reveal.winner}
        others={reveal.others}
        trump={lastHand?.trump}
        width={heroWidth}
        rise={beat.stage}
        fan={beat.fan}
        sweep={!calm}
      />
    </View>
  ) : null;

  const plaque =
    viewerWon && lastHand ? (
      <Animated.View style={[styles.plaque, rise(beat.plaque), reveal && { marginTop: -z(14) }]}>
        <Icon name="star" size={z(14)} color={PidroBevel.textGold} />
        <PidroText role="label" style={[styles.plaqueText, { fontSize: z(13), lineHeight: z(17) }]}>
          {t('game.last_hand_plaque', {
            bid: lastHand.bid,
            captured: lastHand.captured[lastHand.bidding_team],
          })}
        </PidroText>
      </Animated.View>
    ) : null;

  const title = (
    <Animated.View style={rise(beat.headline)}>
      <PidroText
        accessibilityRole="header"
        align="center"
        numberOfLines={2}
        style={[
          styles.headline,
          viewerWon ? styles.headlineWin : null,
          { fontSize: headlineSize, lineHeight: Math.round(headlineSize * 1.18) },
        ]}>
        {headline}
      </PidroText>
    </Animated.View>
  );

  const scoreLabel = (text: string, color: string) => (
    <PidroText
      role="metadata"
      numberOfLines={1}
      style={[styles.eyebrow, { color, fontSize: z(12), lineHeight: z(16) }]}>
      {text}
    </PidroText>
  );

  const score = (
    <Animated.View
      accessible
      accessibilityLabel={`${firstLabel} ${rawScores[ours]}, ${secondLabel} ${rawScores[theirs]}`}
      style={[
        styles.scores,
        { gap: z(viewerWon ? 18 : 22) },
        viewerWon
          ? {
              opacity: beat.score.interpolate({
                inputRange: [0, 0.3, 1],
                outputRange: [0, 1, 1],
              }),
              transform: [
                {
                  scale: beat.score.interpolate({
                    inputRange: [0, 0.55, 0.75, 1],
                    outputRange: [2.4, 0.92, 1.04, 1],
                  }),
                },
              ],
            }
          : rise(beat.score),
      ]}>
      <View style={styles.team}>
        {scoreLabel(firstLabel, PidroGameOver.oursLabel)}
        <PidroText
          testID="result-score-first"
          style={[
            styles.number,
            viewerWon
              ? [styles.bigGold, { fontSize: big, lineHeight: Math.round(big * 1.05) }]
              : { fontSize: quietScore, lineHeight: Math.round(quietScore * 1.12) },
          ]}>
          {formatNumber(rawScores[ours])}
        </PidroText>
      </View>
      <View style={[styles.team, styles.fixed, viewerWon && { paddingBottom: z(10) }]}>
        {scoreLabel(
          secondLabel,
          viewerWon || spectator ? PidroColors.cyanText : PidroGameOver.theirs
        )}
        <PidroText
          testID="result-score-second"
          style={[
            styles.number,
            viewerWon
              ? [styles.theirsAfterWin, { fontSize: small, lineHeight: Math.round(small * 1.1) }]
              : [
                  !spectator && !tied && styles.theirsWon,
                  { fontSize: quietScore, lineHeight: Math.round(quietScore * 1.12) },
                ],
          ]}>
          {formatNumber(rawScores[theirs])}
        </PidroText>
      </View>
    </Animated.View>
  );

  const bestHandCard = best ? (
    <Animated.View style={rise(beat.best)}>
      <Surface
        testID="best-hand"
        variant="window"
        style={[styles.best, { padding: z(tier === 0 ? 16 : 12), gap: z(tier === 0 ? 12 : 8) }]}>
        <View style={styles.between}>
          {eyebrowText(t('game.best_hand'), PidroBevel.textGold)}
          <PidroText role="metadata" tone="soft" style={{ fontSize: z(13), lineHeight: z(17) }}>
            {t('game.hand_number', { number: best.hand_number })}
          </PidroText>
        </View>
        <View style={[styles.bestBody, { gap: z(14) }]}>
          {tier < 2 && pointCardsTaken(best, ours).length ? (
            <BestHandFan
              cards={pointCardsTaken(best, ours)}
              width={z(landscape ? 40 : tier === 1 ? 48 : 58)}
            />
          ) : null}
          <View style={styles.bestText}>
            <PidroText
              style={[
                styles.bestTitle,
                { fontSize: z(tier === 0 ? 26 : 22), lineHeight: z(tier === 0 ? 31 : 27) },
              ]}>
              {t('game.won_of', {
                captured: best.captured[ours],
                total: serverState.config?.max_bid ?? 14,
              })}
            </PidroText>
            <PidroText role="body" style={{ fontSize: z(14), lineHeight: z(20) }}>
              {bestHandLine(
                best,
                ours,
                displayName(
                  viewModel.players.find((player) => player.absolutePosition === best.bidder) ??
                    you!
                )
              )}
            </PidroText>
          </View>
        </View>
      </Surface>
    </Animated.View>
  ) : null;

  const chart = race ? (
    <Animated.View style={rise(beat.chart)}>
      <View
        testID="how-it-went"
        accessible
        accessibilityLabel={`${t('game.how_it_went')}. ${t('game.how_it_went_label', {
          us: rawScores[ours],
          them: rawScores[theirs],
        })}`}
        style={[
          styles.chart,
          { paddingHorizontal: z(12), paddingVertical: z(tier === 2 ? 6 : 10) },
        ]}>
        <View style={styles.between}>
          {eyebrowText(t('game.how_it_went'), PidroColors.cyanText)}
          <PidroText role="metadata" tone="soft" style={{ fontSize: z(13), lineHeight: z(17) }}>
            {t('game.over_hands_short', { count: history.length })}
          </PidroText>
        </View>
        <RaceChart
          us={race.us}
          them={race.them}
          turn={race.turn}
          target={serverState.config?.winning_score ?? 62}
          height={chartHeight}
          scale={k}
        />
      </View>
    </Animated.View>
  ) : null;

  const chipStyle = [styles.chip, { height: z(34), paddingHorizontal: z(12), gap: z(6) }];
  const chipText = { fontSize: z(13), lineHeight: z(18) };
  const chips =
    showGuestSave && onSaveGuest ? (
      <Animated.View style={rise(beat.chips)}>
        <PressableFX accessibilityRole="button" onPress={onSaveGuest}>
          <Surface variant="plaque" style={styles.guestSave}>
            <PidroText role="label" tone="gold" align="center">
              {t('game.real_players')}
            </PidroText>
            <PidroText role="metadata" tone="cyan" align="center">
              {t('game.save_progress')}
            </PidroText>
          </Surface>
        </PressableFX>
      </Animated.View>
    ) : streak || xp ? (
      <Animated.View style={[styles.chips, rise(beat.chips)]}>
        {streak ? (
          <View testID="streak-chip" style={chipStyle}>
            <PlayerAvatar
              size={z(22)}
              uri={partner?.avatar_url}
              kind={partner?.bot_persona ? 'bot' : 'player'}
              persona={partner?.bot_persona}
              ring="gold"
            />
            <PidroText role="label" numberOfLines={1} style={[chipText, styles.shrink]}>
              {t('game.in_a_row_with', { count: streak.count, name: streak.name })}
            </PidroText>
          </View>
        ) : null}
        {xp ? (
          <View testID="xp-chip" style={chipStyle}>
            <PidroText role="label" numberOfLines={1} style={chipText}>
              <PidroText style={[styles.xp, chipText]}>+{formatNumber(xp.xp)}</PidroText> XP
              {progressionSummary?.leveled_up
                ? t('game.level', { level: progressionSummary.veteran_level })
                : ''}
            </PidroText>
            {xp.progress != null && !progressionSummary?.leveled_up ? (
              <LeagueProgress
                progress={xp.progress}
                label={`${Math.round(xp.progress * 100)}%`}
                width={z(46)}
                height={z(8)}
                showLabel={false}
              />
            ) : null}
          </View>
        ) : null}
      </Animated.View>
    ) : null;

  const footer = (
    <Animated.View style={[styles.footer, { gap: z(10) }, { opacity: beat.footer }]}>
      {!spectator ? (
        <RematchRow others={others} youAgreed={youAgreed} onProfile={onProfile} scale={k} />
      ) : null}
      <View style={[styles.actions, { gap: z(10) }]}>
        {!spectator ? (
          <BevelButton
            testID="play-again"
            label={youAgreed ? t('game.waiting') : (playAgainLabel ?? t('game.rematch'))}
            leadingIcon={<Icon name="rematch" size={z(22)} color={PidroBevel.textGold} />}
            size="lg"
            weight="hero"
            disabled={!rematch || youAgreed}
            loading={rematchPending}
            onPress={onPlayAgain}
            style={styles.rematch}
          />
        ) : null}
        <BevelButton
          testID="game-over-home"
          accessibilityLabel={t('game.home')}
          material="glass"
          size="icon"
          onPress={onHome}>
          <Icon name="home" size={z(24)} />
        </BevelButton>
      </View>
    </Animated.View>
  );

  const revealBlock = (
    <View style={[styles.reveal, { gap: z(tier === 2 ? 2 : 4) }]}>
      {heading}
      {stage}
      {plaque}
      {title}
      {score}
    </View>
  );

  return (
    <View
      testID="game-over-overlay"
      style={[styles.overlay, gradientBg(PidroGameOver.backdropGradient)]}
      accessibilityViewIsModal
      onTouchStart={skip}>
      {viewerWon ? <VictoryRays center={rays.center} size={rays.size} /> : null}
      <View
        style={[
          styles.safe,
          {
            paddingTop: insets.top + PidroSpacing.sm,
            paddingBottom: insets.bottom + PidroSpacing.sm,
            paddingLeft: insets.left + PidroSpacing.md,
            paddingRight: insets.right + PidroSpacing.md,
          },
        ]}>
        <View
          testID="game-over-window"
          style={[
            frame,
            landscape ? [styles.columns, { gap: z(PidroSpacing.lg) }] : [styles.column, { gap }],
          ]}>
          {landscape ? (
            <>
              <View style={[styles.side, { gap }]}>
                {revealBlock}
                {bestHandCard}
              </View>
              <View style={[styles.side, styles.sideRight, { gap }]}>
                <View style={{ gap }}>
                  {chart}
                  {chips}
                </View>
                {footer}
              </View>
            </>
          ) : (
            <>
              <View style={[styles.main, { gap }]}>
                {revealBlock}
                {bestHandCard}
                {chart}
                {chips}
              </View>
              {footer}
            </>
          )}
        </View>
      </View>
      {viewerWon ? <VictoryConfetti /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    backgroundColor: PidroGameOver.backdrop,
  },
  safe: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  column: { justifyContent: 'space-between' },
  columns: { flexDirection: 'row' },
  main: { flex: 1, justifyContent: 'center' },
  side: { flex: 1, minWidth: 0, justifyContent: 'center' },
  sideRight: { flex: 1.1, justifyContent: 'space-between' },
  reveal: { alignItems: 'center' },
  heading: { alignItems: 'center' },
  eyebrowRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: PidroSpacing.xs,
  },
  eyebrow: { fontWeight: '900', letterSpacing: 1.6, textTransform: 'uppercase' },
  stage: { alignItems: 'center' },
  plaque: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: PidroRadii.full,
    backgroundColor: PidroBevel.panelDeep,
    borderWidth: 1.5,
    borderColor: PidroBevel.rim,
    boxShadow: PidroColors.plaqueShadow,
  },
  plaqueText: { fontWeight: '900', color: PidroBevel.textGold },
  headline: { fontFamily: PidroFonts.display, fontWeight: '400', color: PidroColors.text },
  headlineWin: { color: PidroBevel.textGold, ...PidroBevel.labelShadow },
  scores: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    maxWidth: '100%',
  },
  team: { alignItems: 'center', flexShrink: 1, minWidth: 0 },
  fixed: { flexShrink: 0 },
  number: {
    fontFamily: PidroFonts.display,
    fontWeight: '400',
    color: PidroColors.text,
    fontVariant: ['tabular-nums'],
  },
  bigGold: { color: PidroBevel.textGold, ...PidroGameOver.scoreGlow },
  theirsAfterWin: { color: PidroColors.textSoft },
  theirsWon: { color: PidroGameOver.theirsScore },
  best: { borderColor: PidroGameOver.bestEdge },
  between: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: PidroSpacing.xs,
  },
  bestBody: { flexDirection: 'row', alignItems: 'center' },
  bestText: { flex: 1, minWidth: 0, gap: 4 },
  bestTitle: { fontFamily: PidroFonts.display, fontWeight: '400', color: PidroBevel.textGold },
  chart: {
    borderRadius: PidroRadii.lg,
    borderWidth: 1,
    borderColor: PidroColors.border,
    backgroundColor: PidroGameOver.chartFace,
    gap: 4,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: PidroSpacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
    borderRadius: PidroRadii.full,
    borderWidth: 1,
    borderColor: PidroGameOver.chipEdge,
    backgroundColor: PidroGameOver.chipFace,
  },
  shrink: { flexShrink: 1 },
  xp: { color: PidroBevel.textGold, fontWeight: '900' },
  guestSave: { padding: PidroSpacing.sm, gap: PidroSpacing.xxs },
  footer: {},
  actions: { flexDirection: 'row', alignItems: 'center' },
  rematch: { flex: 1, alignSelf: 'stretch' },
});
