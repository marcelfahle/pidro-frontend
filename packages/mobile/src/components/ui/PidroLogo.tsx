import { Image, StyleSheet, useWindowDimensions } from 'react-native';

interface PidroLogoProps {
  size?: 'regular' | 'hero';
}

const ARTWORK_ASPECT_RATIO = 1385 / 1929;
const VISIBLE_MARK_WIDTH_RATIO = 0.405;
const VISIBLE_MARK_VERTICAL_OFFSET_RATIO = 0.065;

/**
 * Sizes the visible Pidro mark rather than the artwork bitmap. The source image
 * includes long transparent glow rays that are expected to bleed outside its
 * parent stage.
 */
export function PidroLogo({ size = 'regular' }: PidroLogoProps) {
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const hero = size === 'hero';

  const visibleMarkWidth = landscape
    ? Math.min(hero ? 310 : 270, width * (hero ? 0.32 : 0.29))
    : Math.min(hero ? 310 : 280, width * (hero ? 0.8 : 0.72));
  const artworkWidth = visibleMarkWidth / VISIBLE_MARK_WIDTH_RATIO;
  const artworkHeight = artworkWidth * ARTWORK_ASPECT_RATIO;

  return (
    <Image
      source={require('../../../assets/images/logo-full.png')}
      style={[
        styles.image,
        {
          width: artworkWidth,
          height: artworkHeight,
          marginLeft: -artworkWidth / 2,
          marginTop: -artworkHeight / 2,
          transform: [{ translateY: artworkHeight * VISIBLE_MARK_VERTICAL_OFFSET_RATIO }],
        },
      ]}
      resizeMode="contain"
      accessibilityLabel="Pidro"
    />
  );
}

const styles = StyleSheet.create({
  image: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    flexShrink: 0,
  },
});
