import { TextInput, View, TextInputProps, StyleSheet } from 'react-native';
import { cn } from '@/utils/cn';
import { forwardRef } from 'react';
import { PidroColors, PidroLayout, PidroRadii, PidroSpacing, PidroType } from '@/design/tokens';
import { PidroText } from './PidroText';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ className, containerClassName, label, error, style, accessibilityLabel, ...props }, ref) => {
    return (
      <View className={cn('w-full space-y-2', containerClassName)}>
        {label && (
          <PidroText role="label" tone="soft" style={styles.label}>
            {label}
          </PidroText>
        )}
        <TextInput
          ref={ref}
          className={cn('w-full', className)}
          style={[styles.input, error && styles.inputError, style]}
          placeholderTextColor="rgba(148, 211, 255, 0.7)"
          accessibilityLabel={accessibilityLabel ?? label}
          {...props}
        />
        {error && (
          <PidroText role="metadata" tone="danger" style={styles.error}>
            {error}
          </PidroText>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  label: {
    marginBottom: PidroSpacing.xs,
  },
  input: {
    minHeight: PidroLayout.touchTarget + 6,
    borderRadius: PidroRadii.surface,
    borderWidth: 1,
    borderColor: PidroColors.borderStrong,
    backgroundColor: PidroColors.panelStrong,
    color: PidroColors.text,
    ...PidroType.body,
    paddingHorizontal: PidroSpacing.sm,
    paddingVertical: PidroSpacing.sm,
  },
  inputError: {
    borderColor: PidroColors.dangerBorder,
  },
  error: {
    marginTop: PidroSpacing.xs,
  },
});
