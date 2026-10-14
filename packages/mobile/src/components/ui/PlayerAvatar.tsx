import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { DealerChip } from '@/components/game/DealerChip';
import { Avatar } from '@/components/ui/Avatar';
import { gradientBg } from '@/components/ui/Bevel';
import { Icon } from '@/components/ui/Icon';
import { PidroText } from '@/components/ui/PidroText';
import { PidroBevel, PidroColors, PidroFonts } from '@/design/tokens';
import {
  avatarLabel,
  avatarParts,
  type AvatarAway,
  type AvatarKind,
  type AvatarPin,
} from '@/features/avatar';

/**
 * A player, drawn the same way everywhere: the photo in a ring, with up to
 * five signals around it. The ring says whether they pay (glass, gold, or
 * gold with a gem for lifetime), the pin where they come from, the chip their
 * all-time level. At the table the turn light runs down as their timer and
 * the dealer chip sits bottom left. Smaller sizes drop parts, never the ring
 * (`avatarParts`). Read-only: wrap it in a pressable to make it tappable.
 */
export type AvatarRing = 'glass' | 'gold' | 'lifetime';

export interface PlayerAvatarProps {
  size: number;
  uri?: string | null;
  ring?: AvatarRing;
  pin?: AvatarPin | null;
  level?: number | null;
  dealer?: boolean;
  /** `progress` is the time left, 1 to 0; the arc runs clockwise from twelve. */
  turn?: { progress: number; urgent?: boolean } | null;
  away?: AvatarAway | null;
  kind?: AvatarKind;
  name?: string | null;
  status?: string | null;
  label?: 'below' | 'right' | 'left';
  nameTone?: 'default' | 'you' | 'partner';
  statusTone?: 'default' | 'now' | 'quiet' | 'warning' | 'danger';
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const FACE_GRADIENT = `linear-gradient(180deg, ${PidroBevel.panelHi} 0%, ${PidroBevel.panelMid} 60%, ${PidroBevel.panelDeep} 100%)`;
const AWAY_OPACITY = 0.45;

export function PlayerAvatar({
  size,
  uri,
  ring = 'glass',
  pin = null,
  level = null,
  dealer = false,
  turn = null,
  away = null,
  kind = 'player',
  name,
  status,
  label = 'below',
  nameTone = 'default',
  statusTone = 'default',
  accessibilityLabel,
  style,
  testID,
}: PlayerAvatarProps) {
  const parts = avatarParts(size);
  const seated = kind !== 'open';
  const gold = ring !== 'glass' && kind === 'player';
  const chip = seated && level != null ? parts.level : null;
  const arc = turn && seated ? parts.turn : null;
  const spoken =
    accessibilityLabel ??
    (name || kind !== 'player'
      ? avatarLabel({ name, status, level, pin, dealer, turn, away, kind })
      : undefined);

  const avatar = (
    <View style={{ width: size, height: size }}>
      {turn && arc ? <TurnLight size={size} urgent={turn.urgent} /> : null}

      {seated ? (
        <View
          style={[
            styles.ring,
            gradientBg(gold ? PidroBevel.goldRimGradient : PidroBevel.avatarGlassRingGradient),
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              padding: parts.ring,
              opacity: away ? AWAY_OPACITY : 1,
            },
          ]}>
          <View
            style={[
              styles.face,
              gradientBg(kind === 'bot' ? PidroBevel.glassFaceGradient : FACE_GRADIENT),
              {
                borderRadius: size / 2,
                borderWidth: parts.keyline,
                borderColor: gold ? PidroBevel.keyline : PidroBevel.panelDeep,
              },
            ]}>
            {kind === 'bot' ? (
              <Icon name="bot" size={Math.round(size * 0.5)} color={PidroColors.text} />
            ) : (
              <Avatar uri={uri} style={styles.photo} resizeMode="cover" />
            )}
          </View>
        </View>
      ) : (
        <View style={[styles.open, { width: size, height: size, borderRadius: size / 2 }]}>
          <Icon name="plus" size={Math.round(size * 0.4)} color={PidroColors.cyanText} />
        </View>
      )}

      {turn && arc ? <TurnArc size={size} arc={arc} turn={turn} /> : null}

      {ring === 'lifetime' && gold && parts.gem ? (
        <View
          style={[
            styles.gem,
            gradientBg(PidroBevel.avatarGemGradient),
            {
              width: parts.gem,
              height: parts.gem,
              left: (size - parts.gem) / 2,
              top: -parts.gem / 2,
            },
          ]}
        />
      ) : null}

      {pin && seated && parts.pin ? (
        <Coin
          material={pin === 'classic' ? 'wood' : 'glass'}
          size={parts.pin.size}
          rim={parts.pin.rim}
          style={{ right: parts.pin.right, top: parts.pin.top }}>
          <Icon
            name="spade"
            size={parts.pin.glyph}
            color={pin === 'classic' ? PidroBevel.textGold : PidroColors.text}
          />
        </Coin>
      ) : null}

      {chip ? (
        <View pointerEvents="none" style={[styles.levelRow, { bottom: chip.bottom }]}>
          <View
            style={[
              styles.level,
              {
                minWidth: chip.minWidth,
                height: chip.height,
                paddingHorizontal: chip.padding,
                borderColor: gold ? PidroBevel.rim : PidroBevel.avatarGlassEdge,
                opacity: away ? AWAY_OPACITY : 1,
              },
            ]}>
            <PidroText
              style={[
                styles.levelText,
                {
                  fontSize: chip.fontSize,
                  lineHeight: chip.height - 3,
                  color: gold ? PidroBevel.textGold : PidroColors.text,
                },
              ]}
              numberOfLines={1}
              maxFontSizeMultiplier={1}>
              {level}
            </PidroText>
          </View>
        </View>
      ) : null}

      {dealer && seated && parts.dealer ? (
        <View
          style={[styles.badge, { left: parts.dealer.left, bottom: parts.dealer.bottom }]}
          pointerEvents="none">
          <DealerChip size={parts.dealer.size} />
        </View>
      ) : null}

      {away && seated && parts.dealer ? <AwayBadge away={away} size={parts.dealer.size} /> : null}
    </View>
  );

  const hasLabel = !!(name || status);
  const below = label === 'below';
  const levelClearance = chip ? chip.height + chip.bottom + 3 : 4;

  return (
    <View
      testID={testID}
      accessible={!!spoken}
      accessibilityRole={spoken ? 'image' : undefined}
      accessibilityLabel={spoken}
      style={[below ? styles.column : label === 'right' ? styles.row : styles.rowReverse, style]}>
      {avatar}
      {hasLabel ? (
        <View
          style={[
            styles.copy,
            below
              ? { marginTop: levelClearance, alignItems: 'center' }
              : { alignItems: label === 'right' ? 'flex-start' : 'flex-end' },
          ]}>
          <PidroText
            numberOfLines={1}
            style={[
              styles.name,
              parts.name,
              { color: kind === 'open' ? PidroColors.cyanText : NAME_TONES[nameTone] },
              away ? styles.awayName : null,
            ]}>
            {name || (kind === 'open' ? 'Open seat' : '')}
          </PidroText>
          <PidroText
            numberOfLines={1}
            style={[styles.status, parts.status, { color: STATUS_TONES[statusTone] }]}>
            {status || ' '}
          </PidroText>
        </View>
      ) : null}
    </View>
  );
}

const NAME_TONES = {
  default: PidroColors.text,
  you: PidroColors.cyanText,
  partner: PidroColors.success,
} as const;

const STATUS_TONES = {
  default: PidroColors.cyanText,
  now: PidroColors.text,
  quiet: PidroColors.textSoft,
  warning: PidroColors.warning,
  danger: PidroColors.danger,
} as const;

function TurnLight({ size, urgent }: { size: number; urgent?: boolean }) {
  const halo = size * 1.5;
  const glow = urgent ? PidroColors.turnUrgentGlow : PidroColors.turnLightGlow;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.halo,
        gradientBg(`radial-gradient(circle, ${glow} 0%, transparent 70%)`),
        { width: halo, height: halo, left: (size - halo) / 2, top: (size - halo) / 2 },
      ]}
    />
  );
}

function TurnArc({
  size,
  arc,
  turn,
}: {
  size: number;
  arc: { radius: number; stroke: number };
  turn: { progress: number; urgent?: boolean };
}) {
  const { radius, stroke } = arc;
  const box = Math.ceil((radius + stroke) * 2);
  const center = box / 2;
  const length = 2 * Math.PI * radius;
  const left = Math.min(1, Math.max(0, turn.progress));
  return (
    <View
      pointerEvents="none"
      style={[
        styles.arc,
        { width: box, height: box, left: (size - box) / 2, top: (size - box) / 2 },
      ]}>
      <Svg width={box} height={box}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={turn.urgent ? PidroColors.turnUrgentTrack : PidroColors.turnLightTrack}
          strokeWidth={stroke}
        />
        {left > 0 ? (
          <Circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={turn.urgent ? PidroColors.turnUrgent : PidroColors.turnLight}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${left * length} ${length}`}
            transform={`rotate(-90 ${center} ${center})`}
          />
        ) : null}
      </Svg>
    </View>
  );
}

/** A struck coin: the pin, and the glass bot badge. */
function Coin({
  material,
  size,
  rim,
  style,
  children,
}: {
  material: 'wood' | 'glass';
  size: number;
  rim: number;
  style: ViewStyle;
  children: ReactNode;
}) {
  const wood = material === 'wood';
  return (
    <View
      pointerEvents="none"
      style={[
        styles.coin,
        gradientBg(wood ? PidroBevel.goldRimGradient : PidroBevel.avatarGlassRingGradient),
        { width: size, height: size, borderRadius: size / 2, padding: rim },
        style,
      ]}>
      <View
        style={[
          styles.coinFace,
          gradientBg(wood ? PidroBevel.woodFaceGradient : PidroBevel.glassFaceGradient),
          wood ? styles.coinKeyline : null,
        ]}>
        {children}
      </View>
    </View>
  );
}

function AwayBadge({ away, size }: { away: AvatarAway; size: number }) {
  const place = { right: -4, bottom: -2 };
  if (away === 'bot') {
    return (
      <Coin material="glass" size={size + 2} rim={1.5} style={place}>
        <Icon name="bot" size={Math.round(size * 0.58)} color={PidroColors.text} />
      </Coin>
    );
  }
  return (
    <View
      pointerEvents="none"
      style={[
        styles.offline,
        gradientBg(`linear-gradient(${PidroColors.dangerBg}, ${PidroColors.dangerBg})`),
        { width: size, height: size, borderRadius: size / 2 },
        place,
      ]}>
      <Icon
        name="offline"
        size={Math.round(size * 0.55)}
        color={PidroColors.danger}
        strokeWidth={2.6}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  ring: {
    boxShadow: '0px 4px 10px rgba(0,0,0,0.45)',
  },
  face: {
    flex: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  open: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: PidroColors.cyanBorderStrong,
    backgroundColor: PidroColors.panel,
  },
  halo: {
    position: 'absolute',
    borderRadius: 999,
  },
  arc: {
    position: 'absolute',
  },
  gem: {
    position: 'absolute',
    borderRadius: 2,
    borderWidth: 1.5,
    borderColor: PidroBevel.rim,
    transform: [{ rotate: '45deg' }],
    boxShadow: `0px 0px 0px 1.5px ${PidroBevel.panelDeep}, 0px 0px 10px ${PidroBevel.avatarGemGlow}`,
  },
  coin: {
    position: 'absolute',
    boxShadow: `0px 0px 0px 2px ${PidroBevel.panelDeep}, 0px 3px 6px rgba(0,0,0,0.5)`,
  },
  coinFace: {
    flex: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinKeyline: {
    borderWidth: 1,
    borderColor: PidroBevel.keyline,
  },
  levelRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  level: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1.5,
    backgroundColor: PidroBevel.panelDeep,
  },
  levelText: {
    fontFamily: PidroFonts.ui,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  badge: {
    position: 'absolute',
  },
  offline: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: PidroColors.dangerBorder,
    backgroundColor: PidroBevel.panelDeep,
    boxShadow: '0px 2px 4px rgba(0,0,0,0.5)',
  },
  copy: {
    flexShrink: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: PidroFonts.ui,
    fontWeight: '800',
    ...PidroBevel.feltLabelShadow,
  },
  awayName: {
    opacity: 0.7,
  },
  status: {
    fontFamily: PidroFonts.ui,
    fontWeight: '700',
    ...PidroBevel.feltLabelShadow,
  },
});
