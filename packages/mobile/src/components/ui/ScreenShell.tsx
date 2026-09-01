import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PidroColors, PidroLayout, PidroSpacing } from '@/design/tokens';
import { Background } from './Background';

interface ScreenShellProps {
  children: ReactNode;
  scroll?: boolean;
  compact?: boolean;
  contentStyle?: ViewStyle;
  testID?: string;
}

export function ScreenShell({
  children,
  scroll = false,
  compact = false,
  contentStyle,
  testID,
}: ScreenShellProps) {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const horizontalPadding = isLandscape ? PidroSpacing.lg : PidroSpacing.md;
  const maxWidth = compact ? PidroLayout.contentMaxWidth : PidroLayout.wideContentMaxWidth;
  const sharedStyle = [
    styles.content,
    { paddingHorizontal: horizontalPadding, maxWidth },
    contentStyle,
  ];

  return (
    <Background>
      <View style={styles.scrim}>
        <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
          {scroll ? (
            <ScrollView
              testID={testID}
              contentContainerStyle={sharedStyle}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          ) : (
            <View testID={testID} style={sharedStyle}>
              {children}
            </View>
          )}
        </SafeAreaView>
      </View>
    </Background>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: PidroColors.screenScrim,
  },
  safe: {
    flex: 1,
  },
  content: {
    width: '100%',
    flexGrow: 1,
    alignSelf: 'center',
    paddingVertical: PidroSpacing.md,
  },
});
