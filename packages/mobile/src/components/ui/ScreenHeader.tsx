import type { ReactNode } from 'react';
import { Feather } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { PidroColors, PidroSpacing } from '@/design/tokens';
import { Button } from './Button';
import { PidroText } from './PidroText';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  trailing?: ReactNode;
}

export function ScreenHeader({ title, subtitle, onBack, trailing }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Button
          accessibilityLabel="Go back"
          variant="ghost"
          size="icon"
          onPress={onBack}
          style={styles.back}>
          <Feather name="arrow-left" size={23} color={PidroColors.text} />
        </Button>
      ) : null}
      <View style={styles.copy}>
        <PidroText role="title" numberOfLines={1}>
          {title}
        </PidroText>
        {subtitle ? (
          <PidroText role="metadata" tone="muted" numberOfLines={2}>
            {subtitle}
          </PidroText>
        ) : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.sm,
  },
  back: {
    backgroundColor: PidroColors.glass,
  },
  copy: {
    minWidth: 0,
    flex: 1,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.xs,
  },
});
