/**
 * RN seat furniture over the Skia canvas: each player is a `PlayerAvatar` with
 * their name and what they are doing (below it in portrait, beside it in
 * landscape), the dealer chip beside the name, the turn light on the avatar, and opponent
 * card-backs in the right orientation (North = upright fan, East/West =
 * landscape stacks along the edge). Positioned at the pure computeLayout()
 * seat coords so it lines up with the canvas cards/fly origins.
 * Only player identities handle presses; card backs leave gestures to the canvas.
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
import { PlayerAvatar, type PlayerAvatarProps } from '@/components/ui/PlayerAvatar';
import { PressableFX } from '@/components/ui/PressableFX';
import { PidroLayout, PidroSpacing } from '@/design/tokens';
import { avatarLabel, avatarParts, textFits } from '@/features/avatar';
import { seatLine, type SeatLine } from '@/features/game/seatLine';
import { getCardImage } from '@/utils/cardImages';
import type { Card } from '@/types/game';
import {
  AVATAR_SIZE,
  computeLayout,
  LANDSCAPE_SOUTH_LEFT,
  landscapeNameReach,
  landscapeNorthLeft,
  landscapeNorthShift,
  northBackWidth,
  northChipBehind,
  northFanTop,
  seatNameGap,
  sideSeatTop,
  sideStacks,
  TIGHT_AVATAR,
  TIGHT_SOUTH_SLOT,
  type RelativePosition,
} from './layout';
import { TABLE_HEADER } from './TableChrome';
import type { TableSeat } from './tableModel';
import { DEAL_PACKET_CARD_STAGGER_MS, DEAL_PACKET_TRAVEL_MS } from './animationTiming';
import { t, useTranslation } from '@/i18n';

const REL: RelativePosition[] = ['north', 'east', 'south', 'west'];
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const BACK: ImageSourcePropType =
  Platform.OS === 'web' ? { uri: '/cards/cardback.png' } : require('~/assets/images/cardback.png');

export type SeatTurn = { progress: number; urgent: boolean };

function avatarFor(
  data: TableSeat,
  dealer: boolean,
  line: SeatLine | null,
  turn: SeatTurn | undefined
): Omit<PlayerAvatarProps, 'size'> {
  // Only a real bot has a persona, whatever status the room gave the seat first.
  const crew = data.seatStatus !== 'vacant' ? data.bot_persona : null;
  const away: PlayerAvatarProps['away'] =
    data.seatStatus === 'reconnecting'
      ? 'reconnecting'
      : data.seatStatus === 'bot_substitute' && !crew
        ? 'bot'
        : null;
  const kind: PlayerAvatarProps['kind'] =
    crew || data.seatStatus === 'permanent_bot'
      ? 'bot'
      : data.seatStatus === 'vacant'
        ? 'open'
        : 'player';
  const onTurn = data.isCurrentTurn && kind !== 'open';
  return {
    uri: data.avatar_url,
    level: data.level,
    pin: data.pin,
    dealer,
    turn: onTurn
      ? { progress: turn?.progress ?? 1, urgent: turn?.urgent ?? false, attention: data.isYou }
      : null,
    away,
    kind,
    persona: crew,
    name: kind === 'open' ? null : data.username,
    status: line?.text ?? null,
    pulse: line?.pulse ?? null,
    nameTone: data.isYou ? 'you' : data.isTeammate ? 'partner' : 'default',
    statusTone:
      line?.tone === 'now' && onTurn && turn?.urgent
        ? 'warning'
        : kind === 'bot' && line?.tone !== 'high'
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
  onProfile?: Partial<Record<RelativePosition, () => void>>;
  /** A hand's result is showing: avatar and name only (PID-236). */
  quiet?: boolean;
};

export function SeatLayer({
  seats,
  dealing = false,
  dealerRel,
  topReserve = 0,
  bottomReserve = 0,
  statusByRel,
  turnByRel,
  onProfile,
  quiet = false,
}: Props) {
  useTranslation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { top, bottom, left, right } = insets;
  const L = useMemo(
    () => computeLayout(width, height, { top, bottom, left, right }, topReserve, bottomReserve),
    [width, height, top, bottom, left, right, topReserve, bottomReserve]
  );
  const portrait = L.profile.endsWith('portrait');
  // Tight phones: every name beside a smaller avatar, no level chips or pins,
  // and your avatar alone at the left of your hand (the ticker says your plays).
  const tight = portrait && L.tight;
  const size = tight ? TIGHT_AVATAR : AVATAR_SIZE[L.profile];
  const tablet = L.profile.startsWith('tablet');
  const parts = avatarParts(size);
  // Where a landscape line would run into the hand (yours) or the menu
  // (North's), the seat says its short line instead, as your tight seat does.
  const besideStatus = avatarParts(size, { beside: true }).status.fontSize;
  // Portrait names sit in a fixed column so a long one truncates instead of
  // pushing the seat off its axis. North and south have the table's width to
  // themselves; east and west get what North's column leaves them, their
  // names kept a step off the screen edge. Landscape caps the label's reach
  // and leaves the turn light room, as the boards do, plus room for the
  // dealer chip after the name.
  const gap = seatNameGap(L.profile);
  const centerColumn = tablet ? 200 : 156;
  const sideColumn = Math.min(
    tablet ? 150 : 112,
    (width - insets.left - insets.right - centerColumn) / 2 - PidroSpacing.xs
  );
  // The scoreboard divider is ~70pt from the safe-area edge. Reusing that
  // vertical axis gives the landscape table a deliberate left rail.
  const landscapeSouthLeft = insets.left + LANDSCAPE_SOUTH_LEFT;
  // Landscape South's name runs toward the hand and North's toward the menu:
  // each gets what those leave (`landscapeNameReach`).
  const northBacks = clamp(
    seats.north?.revealedCards.length || (seats.north?.cardCount ?? 0),
    0,
    9
  );
  const chipW = parts.dealer ? parts.dealer.size + gap : 0;
  // On the narrowest phones North's chip tucks behind its avatar, as South's
  // does, and its fan and seat move left (`landscapeNorthShift`).
  const northTucked = !portrait && northChipBehind(L, insets, northBacks, chipW);
  const northShift = portrait ? 0 : landscapeNorthShift(L, insets, northBacks);
  const chip = (rel: RelativePosition) =>
    dealerRel === rel && rel !== 'south' && !(rel === 'north' && northTucked) ? chipW : 0;
  const reach = (rel: RelativePosition) =>
    landscapeNameReach(L, rel, {
      insets,
      southCards: seats.south?.cardCount ?? 9,
      northBacks,
      chip: chip(rel),
    });
  // The dealer chip faces the table: right of West's name, left of everyone
  // else's. In landscape it takes the name's far end, except South's, which
  // sits behind the avatar, away from the hand (and North's, where tucked).
  const besideName = !portrait || tight;
  const dealerSide = (rel: RelativePosition): 'left' | 'right' =>
    rel === 'west' || (besideName && rel === 'north' && !northTucked) ? 'right' : 'left';
  // Tight North's avatar stays on the table's axis, its name running right;
  // East and West run toward each other, each up to the middle.
  const tightNorthLeft = width / 2 - size / 2;
  const seatWidth = (rel: RelativePosition) =>
    tight
      ? {
          maxWidth:
            rel === 'north'
              ? width - insets.right - PidroSpacing.sm - tightNorthLeft
              : (width - insets.left - insets.right) / 2 - PidroSpacing.xs * 2,
          gap: PidroSpacing.xs,
        }
      : portrait
        ? rel === 'north' || rel === 'south'
          ? { width: centerColumn }
          : { width: sideColumn, paddingHorizontal: PidroSpacing.xs }
        : {
            maxWidth: size + gap + reach(rel) + chip(rel),
            gap,
          };
  const tableTop = insets.top + topReserve;
  // Floating portrait scores no longer mask the fan behind a header band.
  const northBackTop = northFanTop(L, tableTop);
  const northSeatTop = portrait
    ? northBackTop + northBackWidth(L.cardW) * (110 / 78) + PidroSpacing.sm
    : tableTop + 8;
  const stacks = sideStacks(L);
  const sideBackW = stacks.backW;
  const stackedSeat = tight
    ? size
    : size +
      (parts.level ? parts.level.height + parts.level.bottom + 3 : 4) +
      parts.name.lineHeight +
      parts.status.lineHeight;
  // East and west sit above their side stacks, name and status included, so a
  // full stack never runs under them (`sideSeatTop`). Tight West shares its
  // column with the plaque's ticker, and side names run toward North's: both
  // side seats start below the ticker and North's row. Landscape drops the
  // stacks below the trick's center line (L.sides), opening a gap under the
  // seat; on the shortest phones the seats eat into that drop instead.
  const sideSeatPos = {
    top: sideSeatTop(L, {
      tableTop,
      seatHeight: portrait ? stackedSeat : size,
      headerBottom: insets.top + TABLE_HEADER + PidroSpacing.xs,
    }),
  };
  const sideStackCy = portrait
    ? Math.max(
        L.sides.cy,
        Math.min(sideSeatPos.top + stackedSeat + PidroSpacing.sm, stacks.lowestTop) +
          stacks.maxHeight / 2
      )
    : L.sides.cy;
  const sideInset = tight ? PidroSpacing.xs : portrait ? 0 : 12;

  return (
    <View style={[StyleSheet.absoluteFill, quiet && styles.quiet]} pointerEvents="box-none">
      {REL.map((rel) => {
        const data = seats[rel];
        if (!data) return null;
        const line = quiet ? null : seatLine(data, statusByRel?.[rel]);
        const seat = quiet
          ? { ...avatarFor(data, false, null, undefined), level: null, pin: null, turn: null }
          : avatarFor(data, dealerRel === rel, line, turnByRel?.[rel]);
        const identity = (
          <PlayerAvatar
            testID={`seat-${rel}`}
            size={size}
            label={besideName ? (rel === 'east' ? 'left' : 'right') : 'below'}
            dealerSide={dealerSide(rel)}
            nameRoom={
              !portrait
                ? reach(rel)
                : rel === 'north' || rel === 'south'
                  ? centerColumn
                  : sideColumn - PidroSpacing.xs * 2
            }
            style={[
              tight && rel === 'south' ? { width: size + PidroSpacing.xs * 2 } : seatWidth(rel),
              data.out && styles.out,
            ]}
            {...seat}
            {...(tight && { level: null, pin: null })}
            {...(tight &&
              rel === 'south' && {
                label: 'below' as const,
                dealerSide: 'left' as const,
                name: null,
                status: line?.short ?? null,
                accessibilityLabel: avatarLabel({ ...seat, level: null, pin: null }),
              })}
            {...(!portrait &&
              (rel === 'south' || rel === 'north') &&
              line &&
              !textFits(line.text, besideStatus, reach(rel)) && {
                status: line.short ?? null,
                accessibilityLabel: avatarLabel(seat),
              })}
          />
        );
        const avatar = onProfile?.[rel] ? (
          <PressableFX
            accessibilityRole="button"
            accessibilityLabel={`${t('friends.view_profile', {
              name: data.username ?? t('social.player'),
            })}, ${avatarLabel({ ...seat, ...(tight && { level: null, pin: null }) })}`}
            onPress={onProfile[rel]}
            style={{ minHeight: PidroLayout.touchTarget, minWidth: PidroLayout.touchTarget }}>
            {identity}
          </PressableFX>
        ) : (
          <View pointerEvents="none">{identity}</View>
        );

        if (rel === 'south' && tight) {
          // Your avatar alone at the left of your hand, its short line under
          // it (your bid, while the hand is bid); the label still speaks.
          return (
            <View
              key={rel}
              pointerEvents="box-none"
              style={{
                position: 'absolute',
                left: L.hand.cx - L.hand.maxWidth / 2 - TIGHT_SOUTH_SLOT - PidroSpacing.xs,
                top: L.hand.cy - size / 2,
              }}>
              {avatar}
            </View>
          );
        }
        if (rel === 'south') {
          const southBottom = insets.bottom + bottomReserve + 8;
          return (
            <View
              key={rel}
              pointerEvents="box-none"
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
          return (
            <View key={rel} style={StyleSheet.absoluteFill} pointerEvents="box-none">
              <View
                testID="seat-north-cards"
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: northBackTop,
                  left: 0,
                  right: 0,
                  alignItems: 'center',
                  transform: [{ translateX: -northShift }],
                }}>
                <BacksFan
                  testID={data.revealedCards.length > 0 ? 'seat-north-revealed' : undefined}
                  faces={data.revealedCards.map((card) => card.card)}
                  count={data.cardCountConcealed ? 3 : (data.cardCount ?? 0)}
                  cardW={L.cardW}
                  dealing={dealing}
                  originX={northShift}
                  originY={L.trick.cy - northBackTop}
                  concealed={data.cardCountConcealed}
                />
              </View>
              <View
                pointerEvents="box-none"
                style={
                  tight
                    ? { position: 'absolute', top: northSeatTop, left: tightNorthLeft }
                    : portrait
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
                          left: landscapeNorthLeft(L, insets, northBacks),
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
        // Cards laid face up stay whole on screen, to be read.
        const backsInset =
          data.revealedCards.length > 0
            ? sideEdge + PidroSpacing.xs
            : sideEdge > 0
              ? sideEdge
              : -edgeOffset;
        const seatPos =
          rel === 'east'
            ? { ...sideSeatPos, right: insets.right + sideInset }
            : { ...sideSeatPos, left: insets.left + sideInset };
        const backsEdge = rel === 'east' ? { right: backsInset } : { left: backsInset };
        return (
          <View key={rel} style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <View style={[{ position: 'absolute' }, seatPos]} pointerEvents="box-none">
              {avatar}
            </View>
            <View
              testID={`seat-${rel}-cards`}
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  top: 0,
                  height: sideStackCy * 2,
                  justifyContent: 'center' as const,
                  alignItems: 'center' as const,
                },
                backsEdge,
              ]}>
              <BacksStackV
                testID={data.revealedCards.length > 0 ? `seat-${rel}-revealed` : undefined}
                faces={data.revealedCards.map((card) => card.card)}
                count={data.cardCountConcealed ? 3 : (data.cardCount ?? 0)}
                cardW={L.cardW}
                dealing={dealing}
                originX={
                  rel === 'west'
                    ? L.felt.cx - backsInset
                    : L.felt.cx - (width - backsInset - sideBackW * (110 / 78))
                }
                originDy={L.felt.cy - sideStackCy}
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
  faces = [],
  cardW,
  dealing,
  originX = 0,
  originY,
  concealed = false,
  testID,
}: {
  count: number;
  /** Cards laid face up (out of trumps) instead of the backs. */
  faces?: Card[];
  testID?: string;
  cardW: number;
  dealing: boolean;
  /** How far the felt's center sits right of the fan's own. */
  originX?: number;
  originY: number;
  concealed?: boolean;
}) {
  const n = clamp(faces.length || count, 0, 9);
  if (n === 0) return null;
  const w = northBackWidth(cardW);
  const h = w * (110 / 78);
  const overlap = w * 0.52 * Math.min(1, 5 / Math.max(1, n - 1));
  const total = w + (n - 1) * overlap;
  return (
    <View
      testID={concealed ? 'dealer-card-count-concealed' : testID}
      style={{ width: total, height: h }}>
      {Array.from({ length: n }, (_, i) => (
        <FlyingBack
          key={i}
          source={faces[i] ? getCardImage(faces[i]) : BACK}
          index={i}
          dealing={dealing}
          x={i * overlap}
          y={0}
          originX={total / 2 - w / 2 + originX}
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
  faces = [],
  cardW,
  dealing,
  originX,
  originDy = 0,
  concealed = false,
  testID,
}: {
  count: number;
  /** Cards laid face up (out of trumps) instead of the backs. */
  faces?: Card[];
  testID?: string;
  cardW: number;
  dealing: boolean;
  originX: number;
  /** How far the felt's center sits below (+) or above (−) the stack's own. */
  originDy?: number;
  concealed?: boolean;
}) {
  const n = clamp(faces.length || count, 0, 9);
  if (n === 0) return null;
  const cw = clamp(cardW * 0.62, 30, 56); // portrait back
  const ch = cw * (110 / 78);
  // Backs lie sideways; cards laid face up stand upright, each showing its corner.
  const up = faces.length > 0;
  const visW = up ? cw : ch; // backs: after 90° rotation
  const visH = up ? ch : cw;
  const overlap = (up ? ch * 0.36 : cw * 0.48) * Math.min(1, 5 / Math.max(1, n - 1));
  return (
    <View
      testID={concealed ? 'dealer-card-count-concealed' : testID}
      style={{ width: visW, height: visH + (n - 1) * overlap }}>
      {Array.from({ length: n }, (_, i) => (
        <FlyingBack
          key={i}
          source={faces[i] ? getCardImage(faces[i]) : BACK}
          index={i}
          dealing={dealing}
          x={0}
          y={i * overlap}
          originX={originX - visW / 2}
          originY={((n - 1) * overlap) / 2 + originDy}
          w={cw}
          h={ch}
          sideways={!up}
        />
      ))}
    </View>
  );
}

function FlyingBack({
  source,
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
  source: ImageSourcePropType;
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
        source={source}
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
  out: { opacity: 0.6 },
  // Under the hand result's scrim the seats fade back further, as on the board.
  quiet: { opacity: 0.8 },
  back: {
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
});
