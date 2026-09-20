import { StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { gradientBg } from '@/components/ui/Bevel';
import { PidroBevel } from '@/design/tokens';

/**
 * Identity HUD: the player's avatar carried in a gold rim. The rim is the same
 * gradient as a wood control's, so identity reads as part of the furniture
 * rather than a pasted-on photo. Ring thickness scales with the size so it
 * keeps its proportion at every call site.
 */
export interface LevelRingProps {
  uri?: string | null;
  size?: number;
  accessibilityLabel?: string;
}

export function LevelRing({ uri, size = 46, accessibilityLabel }: LevelRingProps) {
  const ring = Math.max(2, Math.round(size * 0.055 * 2) / 2);

  return (
    <View
      style={[
        styles.ring,
        gradientBg(PidroBevel.goldRimGradient),
        { width: size, height: size, borderRadius: size / 2, padding: ring },
      ]}>
      <Avatar
        uri={uri}
        style={[styles.avatar, { borderRadius: size / 2 - ring }]}
        resizeMode="cover"
        accessibilityLabel={accessibilityLabel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    boxShadow: '0px 2px 6px rgba(0,0,0,0.4)',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
});
