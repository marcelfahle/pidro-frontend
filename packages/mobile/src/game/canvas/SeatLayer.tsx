/**
 * RN seat furniture over the Skia canvas: each player is a `PlayerAvatar` with
 * their name and what they are doing (below it in portrait, beside it in
 * landscape), the dealer chip and turn light on the avatar, and opponent
 * card-backs in the right orientation (North = upright fan, East/West =
 * landscape stacks along the edge). Positioned at the pure computeLayout()
 * seat coords so it lines up with the canvas cards/fly origins.
 * pointerEvents="none" so it never blocks gestures. Skia-free (only the pure
 * layout module), safe to import anywhere.
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
import { PlayerAvatar, type PlayerAvatarProps } from '@/components/ui/PlayerAvatar';
import { PidroSpacing } from '@/design/tokens';
import { avatarParts } from '@/features/avatar';
import { getRankLabel, SUIT_SYMBOLS } from '@/utils/cards';
import { computeLayout, type Profile, type RelativePosition } from './layout';
import type { TableSeat } from './tableModel';
import { DEAL_PACKET_CARD_STAGGER_MS, DEAL_PACKET_TRAVEL_MS } from './animationTiming';

const REL: RelativePosition[] = ['north', 'east', 'south', 'west'];
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const BACK: ImageSourcePropType =
  Platform.OS === 'web' ? { uri: '/cards/cardback.png' } : require('~/assets/images/cardback.png');

/** Avatar sizes from the Table boards. */
const AVATAR_SIZE: Record<Profile, number> = {
  'phone-portrait': 56,
  'phone-landscape': 44,
  'tablet-portrait': 64,
  'tablet-landscape': 64,
};

/** The line under a seat's name. `now` is the player on turn. */
export type SeatLine = { text: string; tone?: 'now' | 'quiet' | 'danger' };
export type SeatTurn = { progress: number; urgent: boolean };

function lineFor(data: TableSeat, override?: SeatLine | null): SeatLine | null {
  switch (data.seatStatus) {
    case 'reconnecting':
      return { text: 'Reconnecting…', tone: 'danger' };
    case 'bot_substitute':
      return { text: 'Bot is playing' };
    case 'vacant':
      return null;
  }
  if (data.lastPlayedCard) {
    const c = data.lastPlayedCard.card;
    return { text: `Plays ${getRankLabel(c.rank)}${SUIT_SYMBOLS[c.suit]}` };
  }
  return override ?? null;
}

function avatarFor(
  data: TableSeat,
  dealer: boolean,
  line: SeatLine | null,
  turn: SeatTurn | undefined
): Omit<PlayerAvatarProps, 'size'> {
  const away: PlayerAvatarProps['away'] =
    data.seatStatus === 'reconnecting'
      ? 'reconnecting'
      : data.seatStatus === 'bot_substitute'
        ? 'bot'
        : null;
  const kind: PlayerAvatarProps['kind'] =
    data.seatStatus === 'permanent_bot' ? 'bot' : data.seatStatus === 'vacant' ? 'open' : 'player';
  const onTurn = data.isCurrentTurn && kind !== 'open';
  return {
    uri: data.avatar_url,
    level: data.level,
    pin: data.pin,
    dealer,
    turn: onTurn ? { progress: turn?.progress ?? 1, urgent: turn?.urgent ?? false } : null,
    away,
    kind,
    name: kind === 'open' ? null : data.username,
    status: line?.text ?? null,
    nameTone: data.isYou ? 'you' : data.isTeammate ? 'partner' : 'default',
    statusTone:
      line?.tone === 'now' && onTurn && turn?.urgent
        ? 'warning'
        : kind === 'bot'
          ? 'quiet'
          : (line?.tone ?? 'default'),
  };
}

type Props = {
  seats: Record<RelativePosition, TableSeat | null>;
  dealing?: boolean;
  dealerRel?: RelativePosition | null;
  topReserve?: number;
  bottomReserve?: number;
  statusByRel?: Partial<Record<RelativePosition, SeatLine | null>>;
  turnByRel?: Partial<Record<RelativePosition, SeatTurn>>;
};

export function SeatLayer({
  seats,
  dealing = false,
  dealerRel,
  topReserve = 0,
  bottomReserve = 0,
  statusByRel,
  turnByRel,
}: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { top, bottom, left, right } = insets;
  const L = useMemo(
    () => computeLayout(width, height, { top, bottom, left, right }, topReserve, bottomReserve),
    [width, height, top, bottom, left, right, topReserve, bottomReserve]
  );
  const portrait = L.profile.endsWith('portrait');
  const size = AVATAR_SIZE[L.profile];
  const tablet = L.profile.startsWith('tablet');
  // Portrait names sit in a fixed column so a long one truncates instead of
  // pushing the seat off its axis; landscape caps the label's reach and leaves
  // the turn light room, as the boards do.
  const gap = tablet ? 14 : 10;
  const seatWidth = portrait
    ? { width: tablet ? 128 : 96 }
    : { maxWidth: size + gap + (tablet ? 140 : 78), gap };
  const tableTop = insets.top + topReserve;
  // Floating portrait scores no longer mask the fan behind a header band.
  const northBackTop = portrait ? tableTop + PidroSpacing.xs : tableTop - L.cardH * 0.36;
  const northSeatTop = portrait
    ? northBackTop + clamp(L.cardW * 0.66, 31, 58) * (110 / 78) + PidroSpacing.sm
    : tableTop + 8;
  const sideBackW = clamp(L.cardW * 0.62, 30, 56);
  const sideStackMaxHeight = sideBackW * (1 + 5 * 0.48);
  // East and west sit above their side stacks. In portrait they also stay
  // below North, so the three opponents read as a triangle.
  const sideStackTop = L.trick.cy - sideStackMaxHeight / 2;
  const parts = avatarParts(size);
  const stackedSeat =
    size +
    (parts.level ? parts.level.height + parts.level.bottom + 3 : 4) +
    parts.name.lineHeight +
    parts.status.lineHeight;
  const sideSeatPos = portrait
    ? {
        top: Math.max(
          northSeatTop + stackedSeat + PidroSpacing.sm,
          sideStackTop - PidroSpacing.sm - stackedSeat
        ),
      }
    : { bottom: height - sideStackTop + PidroSpacing.sm };
  const sideInset = portrait ? 0 : 12;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {REL.map((rel) => {
        const data = seats[rel];
        if (!data) return null;
        const avatar = (
          <PlayerAvatar
            testID={`seat-${rel}`}
            size={size}
            label={portrait ? 'below' : rel === 'east' ? 'left' : 'right'}
            style={seatWidth}
            {...avatarFor(
              data,
              dealerRel === rel,
              lineFor(data, statusByRel?.[rel]),
              turnByRel?.[rel]
            )}
          />
        );

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
                      top: L.hand.cy - size / 2,
                    }
              }>
              {avatar}
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
                        top: northSeatTop,
                        left: 0,
                        right: 0,
                        alignItems: 'center',
                      }
                    : {
                        position: 'absolute',
                        top: northSeatTop,
                        left: width / 2 + northFanWidth / 2 + PidroSpacing.md,
                      }
                }>
                {avatar}
              </View>
            </View>
          );
        }
        // East / west card-backs keep hugging the edges, their seats above them.
        // They bleed past a bare screen edge but never into an inset: in
        // landscape the Dynamic Island sits on one of these sides.
        const edgeOffset = Math.min(L.cardW * 0.28, 18);
        const sideEdge = rel === 'east' ? insets.right : insets.left;
        const backsInset = sideEdge > 0 ? sideEdge : -edgeOffset;
        const seatPos =
          rel === 'east'
            ? { ...sideSeatPos, right: insets.right + sideInset }
            : { ...sideSeatPos, left: insets.left + sideInset };
        const backsEdge = rel === 'east' ? { right: backsInset } : { left: backsInset };
        return (
          <View key={rel} style={StyleSheet.absoluteFill}>
            <View style={[{ position: 'absolute' }, seatPos]}>{avatar}</View>
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
                    ? L.felt.cx - backsInset
                    : L.felt.cx - (width - backsInset - sideBackW * (110 / 78))
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
  back: {
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
});
