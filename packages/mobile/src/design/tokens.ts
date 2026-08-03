export const PidroColors = {
  feltTop: '#176ea7',
  feltMid: '#0d5087',
  feltBottom: '#07264c',
  screenScrim: 'rgba(2, 21, 42, 0.3)',
  panel: 'rgba(7, 45, 82, 0.82)',
  panelStrong: 'rgba(5, 36, 69, 0.96)',
  panelSoft: 'rgba(18, 74, 119, 0.58)',
  glass: 'rgba(20, 65, 115, 0.62)',
  glassHover: 'rgba(25, 80, 140, 0.76)',
  switchTrackOff: '#416d85',
  backdrop: 'rgba(1, 13, 27, 0.72)',
  cyan: '#46dcff',
  cyanText: '#8beaff',
  cyanSoft: 'rgba(70, 220, 255, 0.42)',
  cyanBorder: 'rgba(91, 221, 255, 0.42)',
  cyanBorderStrong: 'rgba(91, 221, 255, 0.68)',
  gold: '#e1ad3a',
  goldLight: '#f1d078',
  goldDark: '#a86b17',
  goldSoft: 'rgba(225, 173, 58, 0.18)',
  actionPrimary: '#6f3d16',
  actionPrimaryPressed: '#82501f',
  actionPrimaryBorder: '#c38725',
  woodTop: '#8a6030',
  woodMid: '#5a3515',
  woodBottom: '#1e0e04',
  text: '#ffffff',
  textSoft: 'rgba(239, 249, 255, 0.78)',
  textMuted: 'rgba(218, 237, 247, 0.58)',
  ink: '#08243d',
  border: 'rgba(184, 225, 246, 0.22)',
  borderStrong: 'rgba(213, 239, 252, 0.38)',
  danger: '#ff9b9b',
  dangerText: '#ffe3e3',
  dangerBg: 'rgba(112, 24, 32, 0.58)',
  dangerBorder: 'rgba(255, 138, 145, 0.58)',
  success: '#92e6b2',
  successBg: 'rgba(21, 101, 63, 0.68)',
  warning: '#ffd98a',
  warningBg: 'rgba(107, 73, 11, 0.72)',
} as const;

export const PidroRadii = {
  tight: 6,
  surface: 8,
  panel: 10,
  lg: 12,
  xl: 16,
  full: 999,
} as const;

export const PidroFonts = {
  ui: 'Nunito',
} as const;

export const PidroType = {
  display: {
    fontFamily: PidroFonts.ui,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900' as const,
    letterSpacing: -0.5,
  },
  title: {
    fontFamily: PidroFonts.ui,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '800' as const,
    letterSpacing: -0.25,
  },
  label: {
    fontFamily: PidroFonts.ui,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800' as const,
    letterSpacing: 0.1,
  },
  body: {
    fontFamily: PidroFonts.ui,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '500' as const,
    letterSpacing: 0,
  },
  metadata: {
    fontFamily: PidroFonts.ui,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
  },
  labelSpacing: 0.1,
} as const;

export const PidroSpacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;

export const PidroLayout = {
  touchTarget: 44,
  contentMaxWidth: 520,
  wideContentMaxWidth: 880,
  compactHeight: 500,
  landscapeMinWidth: 640,
} as const;
