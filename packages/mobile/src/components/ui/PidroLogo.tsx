import { Image, StyleSheet, useWindowDimensions } from 'react-native';

interface PidroLogoProps {
  size?: 'regular' | 'hero';
}

// logo-v3: tightly cropped mark (1614×975), no baked glow bleed — the
// rotating shimmer behind it is LogoGlow's job. Rendered at natural
// aspect from a 1614px source, so up to ~530pt it stays razor sharp @3x.
const ASPECT = 975 / 1614;

export function PidroLogo({ size = 'regular' }: PidroLogoProps) {
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const hero = size === 'hero';

  const markWidth = landscape
    ? Math.min(hero ? 280 : 230, width * (hero ? 0.3 : 0.26))
    : Math.min(hero ? 330 : 240, width * (hero ? 0.82 : 0.62));

  return (
    <Image
      source={require('../../../assets/images/logo-v3.png')}
      style={[styles.image, { width: markWidth, height: markWidth * ASPECT }]}
      resizeMode="contain"
      accessibilityLabel="Pidro"
    />
  );
}

const styles = StyleSheet.create({
  image: {
    flexShrink: 0,
  },
});
