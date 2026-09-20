import { StyleSheet, View } from 'react-native';
import { gradientBg } from '@/components/ui/Bevel';
import { Icon } from '@/components/ui/Icon';
import { PidroText } from '@/components/ui/PidroText';
import { PidroBevel, PidroFonts, PidroRadii } from '@/design/tokens';

/**
 * A number the player earned, mounted like a small brass plaque: gold rim,
 * carved-in navy face, Bree Serif figure. It is a *read-only* object — never
 * give it press physics, or it reads as a button.
 */
export interface RatingPlaqueProps {
  rating: number;
  accessibilityLabel?: string;
}

export function RatingPlaque({ rating, accessibilityLabel }: RatingPlaqueProps) {
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel ?? `Rating ${rating}`}
      style={[styles.rim, gradientBg(PidroBevel.goldRimGradient)]}>
      <View
        style={[
          styles.face,
          gradientBg(
            `linear-gradient(180deg, ${PidroBevel.panelHi}, ${PidroBevel.panelMid} 60%, ${PidroBevel.panelDeep})`
          ),
        ]}>
        <Icon name="star" size={14} color={PidroBevel.textGold} />
        <PidroText style={styles.value}>{rating}</PidroText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rim: {
    borderRadius: PidroRadii.lg,
    padding: 1.5,
    boxShadow: '0px 2px 6px rgba(0,0,0,0.4)',
  },
  face: {
    borderRadius: PidroRadii.lg - 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 13,
    boxShadow: 'inset 0px 1px 3px rgba(0,0,0,0.35)',
  },
  value: {
    fontFamily: PidroFonts.display,
    fontWeight: '400',
    fontSize: 16,
    lineHeight: 21,
    color: PidroBevel.textGold,
    textShadowColor: 'rgba(0, 0, 0, 0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    // Optical lift — Bree Serif reads low against its own drop shadow.
    transform: [{ translateY: -0.5 }],
  },
});
