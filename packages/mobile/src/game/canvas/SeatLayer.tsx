/**
 * RN seat furniture over the Skia canvas — matches the original Pidro table:
 * glass-pill nameplates (small avatar + name + status), a dealer chip on the
 * dealer's plate, a gold turn-ring, and opponent card-backs in the right
 * orientation (North = upright fan, East/West = landscape stacks along the edge).
 * Positioned at the pure computeLayout() seat coords so it lines up with the
 * canvas cards/fly origins. pointerEvents="none" so it never blocks gestures.
 * Skia-free (only the pure layout module), safe to import anywhere.
 */
import { useEffect, useMemo, useRef } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import {
  Image,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DealerChip } from '@/components/game/DealerChip';
import { PidroText } from '@/components/ui/PidroText';
import { PidroColors, PidroRadii, PidroSpacing } from '@/design/tokens';
import { getRankLabel, SUIT_SYMBOLS } from '@/utils/cards';
import { computeLayout, type RelativePosition } from './layout';
import type { TableSeat } from './tableModel';
import { T } from './tokens';
import { Avatar } from '@/components/ui/Avatar';
import { DEAL_PACKET_CARD_STAGGER_MS, DEAL_PACKET_TRAVEL_MS } from './animationTiming';

const REL: RelativePosition[] = ['north', 'east', 'south', 'west'];
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const webOr = (web: string, native: ImageSourcePropType): ImageSourcePropType =>
  Platform.OS === 'web' ? { uri: web } : native;

const AVATARS: ImageSourcePropType[] = [
  webOr('/cards/avatar1.png', require('~/assets/images/avatar1.png')),
  webOr('/cards/avatar2.png', require('~/assets/images/avatar2.png')),
];
const BACK = webOr('/cards/cardback.png', require('~/assets/images/cardback.png'));
const avatarFor = (name: string | null) =>
  AVATARS[(name ? name.charCodeAt(0) : 0) % AVATARS.length];

function statusFor(data: TableSeat, override?: string): string | null {
  switch (data.seatStatus) {
    case 'reconnecting':
      return 'Reconnecting';
    case 'bot_substitute':
      return 'Rejoin to play';
    case 'permanent_bot':
      return 'Bot playing';
    case 'vacant':
      return 'Open for player';
  }
  if (data.lastPlayedCard) {
    const c = data.lastPlayedCard.card;
    return `Plays ${getRankLabel(c.rank)}${SUIT_SYMBOLS[c.suit]}`;
  }
  return override ?? null;
}

type Props = {
  seats: Record<RelativePosition, TableSeat | null>;
  dealing?: boolean;
  dealerRel?: RelativePosition | null;
  topReserve?: number;
  bottomReserve?: number;
  statusByRel?: Partial<Record<RelativePosition, string>>;
  timerProgressByRel?: Partial<Record<RelativePosition, number>>;
};

export function SeatLayer({
  seats,
  dealing = false,
  dealerRel,
  topReserve = 0,
  bottomReserve = 0,
  statusByRel,
  timerProgressByRel,
}: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { top, bottom, left, right } = insets;
  const L = useMemo(
    () => computeLayout(width, height, { top, bottom, left, right }, topReserve, bottomReserve),
    [width, height, top, bottom, left, right, topReserve, bottomReserve]
  );
  const portrait = L.profile.endsWith('portrait');
  const tableTop = insets.top + topReserve;
  // Floating portrait scores no longer mask the fan behind a header band.
  const northBackTop = portrait ? tableTop + PidroSpacing.xs : tableTop - L.cardH * 0.36;
  const northPlateTop = portrait
    ? northBackTop + clamp(L.cardW * 0.66, 31, 58) * (110 / 78) + PidroSpacing.xs
    : tableTop + 28;
  const sideBackW = clamp(L.cardW * 0.62, 30, 56);
  const sideStackMaxHeight = sideBackW * (1 + 5 * 0.48);
  // Both orientations form an opponent triangle: north centered below its fan,
  // with east/west symmetrically above their side stacks.
  const sidePlateTop = portrait
    ? Math.max(northPlateTop + 62, L.trick.cy - sideStackMaxHeight / 2 - 62)
    : tableTop + 66;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {REL.map((rel) => {
        const data = seats[rel];
        if (!data) return null;
        const isDealer = dealerRel === rel;
        const status = statusFor(data, statusByRel?.[rel]);
        const timerProgress = timerProgressByRel?.[rel] ?? null;

        if (rel === 'south') {
          const southBottom = insets.bottom + bottomReserve + 8;
          // The scoreboard divider is ~70pt from the safe-area edge. Reusing
          // that vertical axis gives the landscape table a deliberate left rail.
          const landscapeSouthLeft = insets.left + 70;
          return (
            <View
              key={rel}
              style={
                portrait
                  ? {
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: southBottom,
                      alignItems: 'center',
                    }
                  : {
                      position: 'absolute',
                      left: landscapeSouthLeft,
                      top: L.hand.cy - 20,
                    }
              }>
              <Nameplate
                testID="seat-south"
                data={data}
                isDealer={isDealer}
                status={status}
                timerProgress={timerProgress}
                narrow={portrait}
                compact={!portrait}
              />
            </View>
          );
        }
        if (rel === 'north') {
          const northBackW = clamp(L.cardW * 0.66, 31, 58);
          const northBackCount = clamp(data.cardCount ?? 0, 0, 9);
          const northFanWidth =
            northBackCount > 0
              ? northBackW * (1 + (Math.min(6, northBackCount) - 1) * 0.52)
              : northBackW;
          return (
            <View key={rel} style={StyleSheet.absoluteFill}>
              <View
                testID="seat-north-cards"
                style={{
                  position: 'absolute',
                  top: northBackTop,
                  left: 0,
                  right: 0,
                  alignItems: 'center',
                }}>
                <BacksFan
                  count={data.cardCountConcealed ? 3 : (data.cardCount ?? 0)}
                  cardW={L.cardW}
                  dealing={dealing}
                  originY={L.trick.cy - northBackTop}
                  concealed={data.cardCountConcealed}
                />
              </View>
              <View
                style={
                  portrait
                    ? {
                        position: 'absolute',
                        top: northPlateTop,
                        left: 0,
                        right: 0,
                        alignItems: 'center',
                      }
                    : {
                        position: 'absolute',
                        top: tableTop + 8,
                        left: width / 2 + northFanWidth / 2 + PidroSpacing.sm,
                      }
                }>
                <Nameplate
                  testID="seat-north"
                  data={data}
                  isDealer={isDealer}
                  status={status}
                  timerProgress={timerProgress}
                  narrow={portrait}
                  compact={!portrait}
                />
              </View>
            </View>
          );
        }
        // East / west card-backs keep hugging the edges. In landscape their
        // nameplates sit above the stacks at matching heights.
        const edgeOffset = Math.min(L.cardW * 0.28, 18);
        const platePos = portrait
          ? rel === 'east'
            ? { top: sidePlateTop, right: insets.right + 8 }
            : { top: sidePlateTop, left: insets.left + 8 }
          : rel === 'east'
            ? { top: sidePlateTop, right: insets.right + 10 }
            : { top: sidePlateTop, left: insets.left + 12 };
        const backsEdge =
          rel === 'east'
            ? { right: insets.right - edgeOffset }
            : { left: insets.left - edgeOffset };
        return (
          <View key={rel} style={StyleSheet.absoluteFill}>
            <View style={[{ position: 'absolute' }, platePos]}>
              <Nameplate
                testID={`seat-${rel}`}
                data={data}
                isDealer={isDealer}
                status={status}
                timerProgress={timerProgress}
                narrow={portrait}
                compact={!portrait}
              />
            </View>
            <View
              style={[
                {
                  position: 'absolute',
                  top: 0,
                  height: L.trick.cy * 2,
                  justifyContent: 'center' as const,
                  alignItems: 'center' as const,
                },
                backsEdge,
              ]}>
              <BacksStackV
                count={data.cardCountConcealed ? 3 : (data.cardCount ?? 0)}
                cardW={L.cardW}
                dealing={dealing}
                originX={
                  rel === 'west'
                    ? L.felt.cx - insets.left + edgeOffset
                    : L.felt.cx - (width - insets.right + edgeOffset - sideBackW * (110 / 78))
                }
                concealed={data.cardCountConcealed}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function Nameplate({
  testID,
  data,
  isDealer,
  status,
  timerProgress,
  narrow = false,
  compact = false,
}: {
  testID: string;
  data: TableSeat;
  isDealer: boolean;
  status: string | null;
  timerProgress: number | null;
  narrow?: boolean;
  compact?: boolean;
}) {
  const ring = data.isCurrentTurn ? T.gold : 'rgba(255,255,255,0.20)';
  const safeProgress = timerProgress == null ? null : clamp(timerProgress, 0, 1);
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={`${data.username || 'Open seat'}, ${data.absolutePosition}${status ? `, ${status}` : ''}`}
      style={[
        styles.pill,
        narrow && styles.pillNarrow,
        narrow && data.seatStatus !== 'normal' && styles.pillCompact,
        compact && styles.pillCompact,
        data.isCurrentTurn && styles.pillTurn,
      ]}>
      <View className="items-center justify-center" style={[styles.avatar, { borderColor: ring }]}>
        {data.seatStatus === 'bot_substitute' || data.seatStatus === 'permanent_bot' ? (
          <PidroText role="metadata">🤖</PidroText>
        ) : data.seatStatus === 'vacant' ? (
          <PidroText role="metadata">＋</PidroText>
        ) : (
          <Avatar
            uri={data.avatar_url}
            fallbackSource={avatarFor(data.username)}
            style={styles.avatarImg}
            resizeMode="cover"
          />
        )}
      </View>
      <View style={styles.text}>
        <PidroText
          role="metadata"
          maxFontSizeMultiplier={1.2}
          style={[
            styles.name,
            data.isYou && styles.nameYou,
            data.isTeammate && styles.nameMate,
            data.isCurrentTurn && styles.nameTurn,
          ]}
          numberOfLines={1}>
          {data.username || 'Waiting'}
        </PidroText>
        {status ? (
          <PidroText
            role="metadata"
            maxFontSizeMultiplier={1.15}
            style={[styles.status, data.isCurrentTurn && styles.statusTurn]}
            numberOfLines={2}>
            {status}
          </PidroText>
        ) : null}
        {safeProgress != null ? (
          <View style={styles.timerTrack}>
            <View style={[styles.timerFill, { width: `${safeProgress * 100}%` }]} />
          </View>
        ) : data.isCurrentTurn ? (
          <View style={styles.turnRail} />
        ) : null}
      </View>
      {isDealer && (
        <View style={styles.dealer}>
          <DealerChip size={20} />
        </View>
      )}
    </View>
  );
}

function BacksFan({
  count,
  cardW,
  dealing,
  originY,
  concealed = false,
}: {
  count: number;
  cardW: number;
  dealing: boolean;
  originY: number;
  concealed?: boolean;
}) {
  const n = clamp(count, 0, 9);
  if (n === 0) return null;
  const w = clamp(cardW * 0.66, 31, 58);
  const h = w * (110 / 78);
  const overlap = w * 0.52 * Math.min(1, 5 / Math.max(1, n - 1));
  const total = w + (n - 1) * overlap;
  return (
    <View
      testID={concealed ? 'dealer-card-count-concealed' : undefined}
      style={{ width: total, height: h }}>
      {Array.from({ length: n }, (_, i) => (
        <FlyingBack
          key={i}
          index={i}
          dealing={dealing}
          x={i * overlap}
          y={0}
          originX={total / 2 - w / 2}
          originY={originY - h / 2}
          w={w}
          h={h}
        />
      ))}
    </View>
  );
}

function BacksStackV({
  count,
  cardW,
  dealing,
  originX,
  concealed = false,
}: {
  count: number;
  cardW: number;
  dealing: boolean;
  originX: number;
  concealed?: boolean;
}) {
  const n = clamp(count, 0, 9);
  if (n === 0) return null;
  const cw = clamp(cardW * 0.62, 30, 56); // portrait back
  const ch = cw * (110 / 78);
  const visW = ch; // after 90° rotation
  const visH = cw;
  const overlap = cw * 0.48 * Math.min(1, 5 / Math.max(1, n - 1));
  return (
    <View
      testID={concealed ? 'dealer-card-count-concealed' : undefined}
      style={{ width: visW, height: visH + (n - 1) * overlap }}>
      {Array.from({ length: n }, (_, i) => (
        <FlyingBack
          key={i}
          index={i}
          dealing={dealing}
          x={0}
          y={i * overlap}
          originX={originX - visW / 2}
          originY={((n - 1) * overlap) / 2}
          w={cw}
          h={ch}
          sideways
        />
      ))}
    </View>
  );
}

function FlyingBack({
  index,
  dealing,
  x,
  y,
  originX,
  originY,
  w,
  h,
  sideways = false,
}: {
  index: number;
  dealing: boolean;
  x: number;
  y: number;
  originX: number;
  originY: number;
  w: number;
  h: number;
  sideways?: boolean;
}) {
  const first = useRef(true);
  const tx = useSharedValue(dealing ? originX : x);
  const ty = useSharedValue(dealing ? originY : y);
  const opacity = useSharedValue(dealing ? 0 : 1);
  const scale = useSharedValue(dealing ? 0.85 : 1);
  useEffect(() => {
    const delay = first.current && dealing ? (index % 3) * DEAL_PACKET_CARD_STAGGER_MS : 0;
    const config = { duration: DEAL_PACKET_TRAVEL_MS, easing: Easing.out(Easing.back(1.15)) };
    tx.value = withDelay(delay, withTiming(x, config));
    ty.value = withDelay(delay, withTiming(y, config));
    opacity.value = withDelay(delay, withTiming(1, { duration: 70 }));
    scale.value = withDelay(delay, withTiming(1, config));
    first.current = false;
  }, [x, y, dealing, index, tx, ty, opacity, scale]);
  const motion = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: sideways ? h : w,
          height: sideways ? w : h,
          alignItems: 'center',
          justifyContent: 'center',
        },
        motion,
      ]}>
      <Image
        source={BACK}
        style={[
          styles.back,
          { width: w, height: h },
          sideways && { transform: [{ rotate: '90deg' }] },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    width: 138,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.xs,
    paddingVertical: 5,
    paddingHorizontal: PidroSpacing.xs,
    borderRadius: PidroRadii.surface,
    backgroundColor: PidroColors.panel,
    borderWidth: 1,
    borderColor: PidroColors.border,
  },
  pillNarrow: {
    width: 110,
    minHeight: 40,
  },
  pillCompact: {
    width: 124,
    minHeight: 40,
  },
  pillTurn: {
    backgroundColor: PidroColors.glassHover,
    borderColor: T.gold,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: PidroRadii.tight,
    overflow: 'hidden',
    borderWidth: 2,
    backgroundColor: PidroColors.panelStrong,
  },
  avatarImg: { width: '100%', height: '100%' },
  text: { flex: 1, minWidth: 0 },
  name: { color: PidroColors.text, fontSize: 11, lineHeight: 14, fontWeight: '700' },
  nameYou: { color: PidroColors.cyanText },
  nameMate: { color: PidroColors.success },
  nameTurn: { color: T.goldLight },
  status: { color: T.cyanText, fontSize: 9, lineHeight: 12, fontWeight: '600', marginTop: 1 },
  statusTurn: { color: T.gold },
  timerTrack: {
    marginTop: 4,
    height: 3,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: PidroColors.border,
  },
  timerFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: T.gold,
  },
  turnRail: {
    marginTop: 4,
    height: 3,
    width: '100%',
    borderRadius: 999,
    backgroundColor: T.gold,
  },
  dealer: { position: 'absolute', top: -8, left: -8 },
  back: {
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
});
