/**
 * The gold "D" dealer coin — DS asset (ported from packages/web DealerChip).
 * Web loads the public mirror (/cards/dealer-chip.png); native loads the bundled asset.
 * The shadow sits on a round wrapper: on the image itself iOS draws it around
 * the square bitmap, a faint box around the coin.
 */
import { Image, Platform, StyleSheet, View } from 'react-native';

const SRC =
  Platform.OS === 'web'
    ? { uri: '/cards/dealer-chip.png' }
    : require('~/assets/images/dealer-chip.png');

export function DealerChip({ size = 26 }: { size?: number }) {
  return (
    <View style={[styles.coin, { width: size, height: size, borderRadius: size / 2 }]}>
      <Image source={SRC} style={{ width: size, height: size }} />
    </View>
  );
}

const styles = StyleSheet.create({
  coin: {
    boxShadow: '0px 2px 4px rgba(0,0,0,0.45)',
  },
});
