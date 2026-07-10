import { StyleProp, ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { Button } from './Button';

interface PrimaryButtonProps {
  children: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({
  children,
  onPress,
  disabled = false,
  className,
  style,
}: PrimaryButtonProps) {
  return (
    <Button onPress={onPress} disabled={disabled} className={className} size="lg" style={style}>
      {children}
    </Button>
  );
}
