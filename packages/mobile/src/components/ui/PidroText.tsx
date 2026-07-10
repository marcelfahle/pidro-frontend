import { Text, type TextProps, type TextStyle, StyleSheet } from 'react-native';
import { PidroColors, PidroType } from '@/design/tokens';

export type PidroTextRole = 'display' | 'title' | 'label' | 'body' | 'metadata';
export type PidroTextTone = 'default' | 'soft' | 'muted' | 'gold' | 'cyan' | 'danger';

export interface PidroTextProps extends Omit<TextProps, 'role'> {
  role?: PidroTextRole;
  tone?: PidroTextTone;
  align?: TextStyle['textAlign'];
}

export function PidroText({
  role = 'body',
  tone = 'default',
  align,
  style,
  maxFontSizeMultiplier,
  ...props
}: PidroTextProps) {
  return (
    <Text
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? (role === 'body' ? 1.8 : 1.5)}
      style={[styles.base, styles[role], styles[tone], align ? { textAlign: align } : null, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    color: PidroColors.text,
  },
  display: PidroType.display,
  title: PidroType.title,
  label: PidroType.label,
  body: PidroType.body,
  metadata: PidroType.metadata,
  default: {
    color: PidroColors.text,
  },
  soft: {
    color: PidroColors.textSoft,
  },
  muted: {
    color: PidroColors.textMuted,
  },
  gold: {
    color: PidroColors.gold,
  },
  cyan: {
    color: PidroColors.cyanText,
  },
  danger: {
    color: PidroColors.dangerText,
  },
});
