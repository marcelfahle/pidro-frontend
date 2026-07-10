/**
 * The gold "D" dealer coin — DS asset (ported from packages/web DealerChip).
 * Web loads the public mirror (/cards/dealer-chip.png); native loads the bundled asset.
 */
import { Image, Platform, StyleSheet } from 'react-native';

const SRC =
  Platform.OS === 'web'
    ? { uri: '/cards/dealer-chip.png' }
    : require('~/assets/images/dealer-chip.png');

export function DealerChip({ size = 26 }: { size?: number }) {
  return <Image source={SRC} style={[styles.chip, { width: size, height: size }]} />;
}

const styles = StyleSheet.create({
  chip: {
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});
