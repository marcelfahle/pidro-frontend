import { View, type ViewProps, StyleSheet } from 'react-native';
import { PidroColors, PidroRadii, PidroSpacing } from '@/design/tokens';

export type SurfaceVariant = 'panel' | 'card' | 'plaque' | 'window' | 'subtle';

export interface SurfaceProps extends ViewProps {
  variant?: SurfaceVariant;
  padded?: boolean;
}

export function Surface({ variant = 'panel', padded = false, style, ...props }: SurfaceProps) {
  return <View style={[styles.base, styles[variant], padded && styles.padded, style]} {...props} />;
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    borderWidth: 1,
  },
  panel: {
    borderRadius: PidroRadii.panel,
    borderColor: PidroColors.border,
    backgroundColor: PidroColors.panel,
  },
  card: {
    borderRadius: PidroRadii.panel,
    borderColor: PidroColors.borderStrong,
    backgroundColor: PidroColors.panelStrong,
  },
  plaque: {
    borderRadius: PidroRadii.tight,
    borderColor: PidroColors.borderStrong,
    backgroundColor: PidroColors.panelStrong,
  },
  window: {
    borderRadius: PidroRadii.lg,
    borderColor: PidroColors.cyanBorderStrong,
    backgroundColor: PidroColors.panelStrong,
  },
  subtle: {
    borderRadius: PidroRadii.surface,
    borderColor: PidroColors.border,
    backgroundColor: PidroColors.glass,
  },
  padded: {
    padding: PidroSpacing.md,
  },
});
