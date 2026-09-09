import type { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { PidroBevel, PidroFonts, PidroSpacing } from '@/design/tokens';
import { PidroLogo } from './PidroLogo';
import { PidroText } from './PidroText';
import { ScreenShell } from './ScreenShell';
import { Surface } from './Surface';

interface AuthScreenFrameProps {
  title: string;
  subtitle: string;
  error?: string | null;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthScreenFrame({
  title,
  subtitle,
  error,
  children,
  footer,
}: AuthScreenFrameProps) {
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  return (
    <ScreenShell
      scroll
      contentStyle={{
        justifyContent: 'center',
        flexDirection: landscape ? 'row' : 'column',
        alignItems: 'center',
        gap: landscape ? PidroSpacing.xl : PidroSpacing.md,
      }}>
      <View style={[styles.logoStage, landscape && styles.logoStageLandscape]}>
        <PidroLogo />
      </View>
      <Surface
        testID="auth-window"
        variant="window"
        style={[styles.panel, landscape && styles.panelLandscape]}
        padded>
        <View style={styles.heading}>
          <PidroText role="title" align="center" style={styles.title}>
            {title}
          </PidroText>
          <PidroText role="body" tone="soft" align="center">
            {subtitle}
          </PidroText>
        </View>
        {error ? (
          <Surface variant="subtle" style={styles.error} accessibilityRole="alert">
            <PidroText role="metadata" tone="danger" align="center">
              {error}
            </PidroText>
          </Surface>
        ) : null}
        <View style={styles.form}>{children}</View>
        <View style={styles.footer}>{footer}</View>
      </Surface>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  logoStage: {
    width: '100%',
    height: 184,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoStageLandscape: {
    width: '42%',
    maxWidth: 330,
    height: 246,
  },
  panel: {
    width: '100%',
    maxWidth: 480,
    gap: PidroSpacing.md,
  },
  panelLandscape: {
    padding: PidroSpacing.xs,
    gap: PidroSpacing.xs,
  },
  heading: {
    gap: PidroSpacing.xxs,
  },
  title: {
    fontFamily: PidroFonts.display,
    fontWeight: '400',
    fontSize: 25,
    lineHeight: 32,
    color: PidroBevel.textGold,
    textShadowColor: 'rgba(20, 8, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  error: {
    borderColor: 'rgba(255, 138, 145, 0.48)',
    padding: PidroSpacing.sm,
  },
  form: {
    gap: PidroSpacing.sm,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: PidroSpacing.xs,
  },
});
