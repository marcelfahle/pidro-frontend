import { ImageBackground, StyleSheet } from 'react-native';
import { ReactNode } from 'react';

interface BackgroundProps {
  children: ReactNode;
}

/**
 * Full-screen background image for the Pidro app
 * - Covers entire viewport
 * - In portrait mode, full height with cropped sides (1920x1080 landscape image)
 * - Dark atmospheric background for card game
 */
export function Background({ children }: BackgroundProps) {
  return (
    <ImageBackground
      source={require('../../../assets/images/bg.png')}
      style={styles.background}
      resizeMode="cover" // Full height, crop sides in portrait
      imageStyle={styles.image}>
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  image: {
    // Ensure image covers entire screen
    width: '100%',
    height: '100%',
  },
});
