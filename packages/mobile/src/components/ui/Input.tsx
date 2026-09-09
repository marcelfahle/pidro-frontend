import { Feather } from '@expo/vector-icons';
import { forwardRef, useCallback, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { cn } from '@/utils/cn';
import { PidroColors, PidroLayout, PidroSpacing, PidroType } from '@/design/tokens';
import { gradientBg } from './Bevel';
import { PidroText } from './PidroText';
import { PressableFX } from './PressableFX';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerClassName?: string;
  revealPassword?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      className,
      containerClassName,
      label,
      error,
      revealPassword = false,
      secureTextEntry,
      style,
      accessibilityLabel,
      onBlur,
      onFocus,
      ...props
    },
    ref
  ) => {
    const [focused, setFocused] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const canRevealPassword = revealPassword && secureTextEntry;
    const handleFocus = useCallback<NonNullable<TextInputProps['onFocus']>>(
      (event) => {
        setFocused(true);
        onFocus?.(event);
      },
      [onFocus]
    );
    const handleBlur = useCallback<NonNullable<TextInputProps['onBlur']>>(
      (event) => {
        setFocused(false);
        onBlur?.(event);
      },
      [onBlur]
    );
    const togglePasswordVisibility = useCallback(() => {
      setPasswordVisible((visible) => !visible);
    }, []);

    return (
      <View className={cn('w-full space-y-2', containerClassName)}>
        {label && (
          <PidroText role="label" tone="soft" style={styles.label}>
            {label}
          </PidroText>
        )}
        <View
          className="flex-row items-stretch overflow-hidden"
          style={[
            styles.inputFrame,
            gradientBg('linear-gradient(180deg, #0A2340 0%, #10365D 100%)'),
            focused && styles.inputFocused,
            error && styles.inputError,
          ]}>
          <TextInput
            ref={ref}
            className={cn('min-w-0 flex-1', className)}
            style={[styles.input, style]}
            placeholderTextColor="rgba(148, 211, 255, 0.7)"
            selectionColor={PidroColors.cyan}
            accessibilityLabel={accessibilityLabel ?? label}
            disableFullscreenUI
            secureTextEntry={secureTextEntry && !passwordVisible}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />
          {canRevealPassword ? (
            <PressableFX
              accessibilityRole="button"
              accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
              accessibilityValue={{
                text: passwordVisible ? 'Password visible' : 'Password hidden',
              }}
              onPress={togglePasswordVisibility}
              className="items-center justify-center"
              style={styles.passwordToggle}>
              <Feather
                name={passwordVisible ? 'eye-off' : 'eye'}
                size={20}
                color={PidroColors.textSoft}
              />
            </PressableFX>
          ) : null}
        </View>
        {error && (
          <PidroText role="metadata" tone="danger" style={styles.error} accessibilityRole="alert">
            {error}
          </PidroText>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  // Proximity: a label must sit visibly closer to its own field (6px)
  // than to whatever is above it (the form's 16px block gap).
  label: {
    marginBottom: 6,
  },
  // A carved-in well: dark-to-light vertical gradient, inner top shadow,
  // and a bottom hairline glint — the inverse of the bevel buttons that
  // sit proud of the surface.
  inputFrame: {
    minHeight: PidroLayout.touchTarget + 6,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(140, 215, 250, 0.28)',
    boxShadow: 'inset 0px 2px 3px rgba(0,0,0,0.35), 0px 1px 0px rgba(255,255,255,0.06)',
  },
  inputFocused: {
    borderColor: PidroColors.cyanBorderStrong,
    boxShadow:
      '0px 0px 0px 3px rgba(70,220,255,0.22), inset 0px 2px 3px rgba(0,0,0,0.35), 0px 1px 0px rgba(255,255,255,0.06)',
  },
  input: {
    minHeight: PidroLayout.touchTarget + 4,
    flex: 1,
    color: PidroColors.text,
    ...PidroType.body,
    paddingHorizontal: PidroSpacing.sm,
    paddingVertical: PidroSpacing.sm,
  },
  inputError: {
    borderColor: PidroColors.dangerBorder,
    boxShadow:
      '0px 0px 0px 3px rgba(255,120,128,0.18), inset 0px 2px 3px rgba(0,0,0,0.35), 0px 1px 0px rgba(255,255,255,0.06)',
  },
  error: {
    marginTop: PidroSpacing.xs,
  },
  passwordToggle: {
    width: PidroLayout.touchTarget + 4,
    minHeight: PidroLayout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
