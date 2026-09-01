import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { PidroSpacing } from '@/design/tokens';
import { PidroText } from './PidroText';
import { Surface } from './Surface';

interface DecisionWindowProps {
  title?: string;
  description?: string;
  context?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  scrollable?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function DecisionWindow({
  title,
  description,
  context,
  children,
  footer,
  scrollable = false,
  compact = false,
  style,
  testID,
}: DecisionWindowProps) {
  const content = scrollable ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, compact && styles.contentCompact]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, compact && styles.contentCompact]}>{children}</View>
  );

  return (
    <Surface testID={testID} variant="window" style={[styles.window, style]}>
      {(title || description || context) && (
        <View style={[styles.header, compact && styles.headerCompact]}>
          {title ? <PidroText role="title">{title}</PidroText> : null}
          {description ? (
            <PidroText role="body" tone="soft" style={styles.description}>
              {description}
            </PidroText>
          ) : null}
          {context}
        </View>
      )}
      {content}
      {footer ? (
        <View style={[styles.footer, compact && styles.footerCompact]}>{footer}</View>
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  window: {
    width: '100%',
    maxWidth: 720,
    maxHeight: '100%',
  },
  header: {
    gap: PidroSpacing.xs,
    paddingHorizontal: PidroSpacing.md,
    paddingTop: PidroSpacing.md,
    paddingBottom: PidroSpacing.sm,
  },
  headerCompact: {
    paddingHorizontal: PidroSpacing.sm,
    paddingTop: PidroSpacing.sm,
    paddingBottom: PidroSpacing.xs,
  },
  description: {
    maxWidth: 620,
  },
  scroll: {
    flexShrink: 1,
  },
  content: {
    gap: PidroSpacing.sm,
    paddingHorizontal: PidroSpacing.md,
    paddingBottom: PidroSpacing.md,
  },
  contentCompact: {
    paddingHorizontal: PidroSpacing.sm,
    paddingBottom: PidroSpacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: PidroSpacing.sm,
    padding: PidroSpacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(213, 239, 252, 0.22)',
  },
  footerCompact: {
    paddingHorizontal: PidroSpacing.sm,
    paddingVertical: PidroSpacing.xs,
  },
});
