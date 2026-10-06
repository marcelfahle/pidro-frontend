/**
 * The account-flow scaffold: sign in, create account, and Classic recovery.
 *
 * One screen grammar in three layouts. A phone in portrait stacks a header,
 * an intro and a window. A phone in landscape is height-starved, so the intro
 * moves into a side column and the window keeps its full height. A tablet
 * centres a wider column and scales the type up. Screens pass content; the
 * layout decides where it goes.
 */
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { BackButton } from '@/components/ui/BackButton';
import { BevelPressable } from '@/components/ui/Bevel';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PidroText } from '@/components/ui/PidroText';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Surface } from '@/components/ui/Surface';
import {
  PidroBevel,
  PidroColors,
  PidroFonts,
  PidroLayout,
  PidroRadii,
  PidroSpacing,
} from '@/design/tokens';

export type AuthFlowLayout = 'phone' | 'landscape' | 'tablet';

interface TypeSize {
  fontSize: number;
  lineHeight: number;
}

interface AuthFlowMetrics {
  back: number;
  headerTitle: TypeSize;
  heading: TypeSize;
  heroHeading: TypeSize;
  body: TypeSize;
  emphasis: TypeSize;
  note: TypeSize;
  /** Width of the content column (phone, tablet) or the side column (landscape). */
  column: number;
  gap: number;
  windowPaddingVertical: number;
  windowPaddingHorizontal: number;
  windowGap: number;
  cta: TypeSize & { height: number };
  secondaryHeight: number;
  link: 14 | 15 | 16;
  tile: { size: number; icon: number; radius: number };
}

const METRICS: Record<AuthFlowLayout, AuthFlowMetrics> = {
  phone: {
    back: 44,
    headerTitle: { fontSize: 22, lineHeight: 27 },
    heading: { fontSize: 32, lineHeight: 40 },
    heroHeading: { fontSize: 30, lineHeight: 38 },
    body: { fontSize: 15, lineHeight: 22 },
    emphasis: { fontSize: 18, lineHeight: 24 },
    note: { fontSize: 13, lineHeight: 18 },
    column: 358,
    gap: PidroSpacing.md,
    windowPaddingVertical: 20,
    windowPaddingHorizontal: 20,
    windowGap: 14,
    cta: { height: 60, fontSize: 25, lineHeight: 32 },
    secondaryHeight: 50,
    link: 15,
    tile: { size: 76, icon: 40, radius: 18 },
  },
  landscape: {
    back: 44,
    headerTitle: { fontSize: 14, lineHeight: 18 },
    heading: { fontSize: 28, lineHeight: 34 },
    heroHeading: { fontSize: 28, lineHeight: 34 },
    body: { fontSize: 14, lineHeight: 20 },
    emphasis: { fontSize: 18, lineHeight: 24 },
    note: { fontSize: 13, lineHeight: 18 },
    // Wide enough for the longest designed heading on one line.
    column: 300,
    gap: 28,
    windowPaddingVertical: 16,
    windowPaddingHorizontal: 20,
    windowGap: 12,
    cta: { height: 54, fontSize: 24, lineHeight: 31 },
    secondaryHeight: 48,
    link: 15,
    tile: { size: 56, icon: 30, radius: 14 },
  },
  tablet: {
    back: 48,
    headerTitle: { fontSize: 24, lineHeight: 30 },
    heading: { fontSize: 38, lineHeight: 46 },
    heroHeading: { fontSize: 38, lineHeight: 46 },
    body: { fontSize: 17, lineHeight: 25 },
    emphasis: { fontSize: 21, lineHeight: 28 },
    note: { fontSize: 14, lineHeight: 20 },
    // 380 inside the window's padding: fields and the capped CTA share an edge.
    column: 436,
    gap: 22,
    windowPaddingVertical: 28,
    windowPaddingHorizontal: 28,
    windowGap: PidroSpacing.md,
    cta: { height: 64, fontSize: 27, lineHeight: 35 },
    secondaryHeight: 54,
    link: 16,
    tile: { size: 92, icon: 48, radius: 22 },
  },
};

const TABLET_INPUT: TextStyle = { minHeight: 52, fontSize: 18, lineHeight: 24 };

export function useAuthFlow() {
  const { width, height } = useWindowDimensions();
  const layout: AuthFlowLayout =
    Math.min(width, height) >= 700
      ? 'tablet'
      : width > height && height < PidroLayout.compactHeight
        ? 'landscape'
        : 'phone';
  return {
    layout,
    metrics: METRICS[layout],
    /** Pass to `Input`'s `style`: tablets get a taller well and larger text. */
    inputStyle: layout === 'tablet' ? TABLET_INPUT : undefined,
  };
}

/** What a player calls the device in their hand. */
export function deviceNoun(layout: AuthFlowLayout): string {
  if (Platform.OS === 'web') return 'device';
  if (layout !== 'tablet') return 'phone';
  return Platform.OS === 'ios' ? 'iPad' : 'tablet';
}

export interface AuthFlowScreenProps {
  testID?: string;
  /** The flow's name: the header title, or the eyebrow above a landscape heading. */
  headerTitle?: string;
  onBack: () => void;
  title?: string;
  body?: string;
  /** A quiet reassurance: under the content, or in the side column in landscape. */
  note?: string;
  /** Secondary ways out: under the content, or in the side column in landscape. */
  aside?: ReactNode;
  /** The screen draws its own intro in portrait; landscape still uses title and body. */
  inlineIntro?: boolean;
  /** Phone portrait only: let the column fill the screen so content can centre. */
  fill?: boolean;
  children: ReactNode;
}

export function AuthFlowScreen({
  testID,
  headerTitle,
  onBack,
  title,
  body,
  note,
  aside,
  inlineIntro = false,
  fill = false,
  children,
}: AuthFlowScreenProps) {
  const { layout, metrics } = useAuthFlow();

  const noteLine = note ? (
    <PidroText
      role="metadata"
      tone="soft"
      align={layout === 'landscape' ? 'left' : 'center'}
      style={[metrics.note, layout !== 'landscape' && styles.noteStacked]}>
      {note}
    </PidroText>
  ) : null;

  if (layout === 'landscape') {
    const heading = title ?? headerTitle;
    return (
      <ScreenShell scroll testID={testID} contentStyle={styles.landscapeShell}>
        <View style={[styles.side, { width: metrics.column }]}>
          <BackButton onPress={onBack} size={metrics.back} />
          <View style={styles.sideCopy}>
            {title && headerTitle ? (
              <PidroText role="label" tone="soft">
                {headerTitle}
              </PidroText>
            ) : null}
            {heading ? <AuthFlowHeading>{heading}</AuthFlowHeading> : null}
            {body ? (
              <PidroText role="body" tone="soft" style={metrics.body}>
                {body}
              </PidroText>
            ) : null}
            {noteLine}
            {aside ? <View style={styles.sideAside}>{aside}</View> : null}
          </View>
        </View>
        <View style={styles.main}>{children}</View>
      </ScreenShell>
    );
  }

  const tablet = layout === 'tablet';
  return (
    <ScreenShell
      scroll
      testID={testID}
      contentStyle={[styles.shell, { gap: metrics.gap }, tablet && styles.shellTablet]}>
      <View style={[styles.header, !tablet && { maxWidth: metrics.column }]}>
        <BackButton onPress={onBack} size={metrics.back} />
        {headerTitle ? (
          <PidroText
            role="title"
            align="center"
            accessibilityRole="header"
            numberOfLines={1}
            style={[styles.headerTitle, metrics.headerTitle]}>
            {headerTitle}
          </PidroText>
        ) : null}
        <View style={{ width: metrics.back }} />
      </View>
      {tablet ? <View style={styles.liftAbove} /> : null}
      <View
        style={[
          styles.column,
          { maxWidth: metrics.column, gap: metrics.gap },
          fill && !tablet && styles.columnFill,
        ]}>
        {!inlineIntro && (title || body) ? (
          <View style={styles.intro}>
            {title ? <AuthFlowHeading align="center">{title}</AuthFlowHeading> : null}
            {body ? (
              <PidroText role="body" tone="soft" align="center" style={metrics.body}>
                {body}
              </PidroText>
            ) : null}
          </View>
        ) : null}
        {children}
        {aside}
        {noteLine}
      </View>
      {tablet ? <View style={styles.liftBelow} /> : null}
    </ScreenShell>
  );
}

/** Bree Serif gold: the one display line a screen leads with. */
export function AuthFlowHeading({
  children,
  align,
  hero = false,
  style,
}: {
  children: string;
  align?: TextStyle['textAlign'];
  hero?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  const { metrics } = useAuthFlow();
  return (
    <PidroText
      accessibilityRole="header"
      align={align}
      maxFontSizeMultiplier={1.3}
      style={[styles.heading, hero ? metrics.heroHeading : metrics.heading, style]}>
      {children}
    </PidroText>
  );
}

/** The navy window a form sits in, padded for the current layout. */
export function AuthFlowWindow({
  children,
  style,
  ...rest
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
}) {
  const { metrics } = useAuthFlow();
  return (
    <Surface
      variant="window"
      style={[
        styles.window,
        {
          paddingVertical: metrics.windowPaddingVertical,
          paddingHorizontal: metrics.windowPaddingHorizontal,
          gap: metrics.windowGap,
        },
        style,
      ]}
      {...rest}>
      {children}
    </Surface>
  );
}

export interface AuthFlowButtonProps {
  label: string;
  onPress: () => void;
  /** `wood` moves the flow forward; `glass` is the second choice. */
  material?: 'wood' | 'glass';
  /** The one loud CTA that finishes a flow. Wood only. */
  hero?: boolean;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function AuthFlowButton({
  label,
  onPress,
  material = 'wood',
  hero = false,
  loading = false,
  disabled = false,
  testID,
  style,
}: AuthFlowButtonProps) {
  const { metrics } = useAuthFlow();
  const wood = material === 'wood';
  const loud = wood && hero;
  return (
    <BevelPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      material={material}
      weight={loud ? 'hero' : 'lite'}
      radius={loud ? 18 : wood ? 14 : 13}
      disabled={disabled || loading}
      onPress={onPress}
      testID={testID}
      style={[
        styles.button,
        {
          height: loud
            ? metrics.cta.height + 10
            : wood
              ? metrics.cta.height
              : metrics.secondaryHeight,
        },
        style,
      ]}
      contentStyle={[styles.buttonFace, loud && styles.buttonFaceHero]}>
      {loading ? (
        <ActivityIndicator color={wood ? PidroBevel.textGold : PidroColors.text} />
      ) : (
        <PidroText
          numberOfLines={1}
          maxFontSizeMultiplier={1.2}
          style={
            wood
              ? [
                  styles.woodLabel,
                  {
                    fontSize: metrics.cta.fontSize + (loud ? 3 : 0),
                    lineHeight: metrics.cta.lineHeight + (loud ? 4 : 0),
                  },
                  loud && styles.woodLabelHero,
                ]
              : [styles.glassLabel, metrics.link === 16 && styles.glassLabelTablet]
          }>
          {label}
        </PidroText>
      )}
    </BevelPressable>
  );
}

/** A message inside a window: something went wrong, or something to know. */
export function AuthFlowNotice({
  tone = 'danger',
  children,
  action,
}: {
  tone?: 'danger' | 'info';
  children: string;
  action?: ReactNode;
}) {
  const danger = tone === 'danger';
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.notice, danger ? styles.noticeDanger : styles.noticeInfo]}>
      <View style={styles.noticeRow}>
        <View style={styles.noticeIcon}>
          <Icon
            name="alert"
            size={18}
            color={danger ? PidroColors.danger : PidroColors.cyan}
            strokeWidth={2.2}
          />
        </View>
        <PidroText style={[styles.noticeText, !danger && styles.noticeTextInfo]}>
          {children}
        </PidroText>
      </View>
      {action}
    </View>
  );
}

/** The cyan-edged icon plaque that leads a confirmation. */
export function AuthFlowIconTile({ icon, quiet = false }: { icon: IconName; quiet?: boolean }) {
  const { metrics } = useAuthFlow();
  const { size, radius, icon: iconSize } = metrics.tile;
  return (
    <View
      style={[
        styles.tile,
        quiet && styles.tileQuiet,
        { width: size, height: size, borderRadius: radius },
      ]}>
      <Icon name={icon} size={iconSize} color={PidroColors.cyan} strokeWidth={1.6} />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignItems: 'center',
  },
  shellTablet: {
    // The back button belongs to the screen edge, not to a centred frame.
    maxWidth: '100%',
    gap: 0,
    paddingHorizontal: PidroSpacing.xxl,
    paddingTop: PidroSpacing.xl,
    paddingBottom: PidroSpacing.xxl,
  },
  header: {
    width: '100%',
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.sm,
  },
  headerTitle: {
    minWidth: 0,
    flex: 1,
  },
  column: {
    width: '100%',
    alignItems: 'stretch',
  },
  columnFill: {
    flexGrow: 1,
  },
  // Centred, then lifted: a form reads as placed when it sits a little above
  // the middle of a tall screen. Spacers rather than padding, so the lift
  // gives way first when a short tablet runs out of room.
  liftAbove: {
    flexGrow: 2,
    minHeight: 22,
  },
  liftBelow: {
    flexGrow: 3,
  },
  intro: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    gap: 6,
    paddingTop: PidroSpacing.xs,
    paddingBottom: PidroSpacing.xxs,
  },
  noteStacked: {
    alignSelf: 'center',
    maxWidth: 330,
  },
  landscapeShell: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: 28,
  },
  side: {
    flexShrink: 0,
    gap: PidroSpacing.xs,
  },
  // The bottom padding matches the back button above, so the copy centres
  // against the whole column rather than the space left under the button.
  sideCopy: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: 6,
    paddingBottom: 44 + PidroSpacing.xs,
  },
  sideAside: {
    alignItems: 'flex-start',
    marginTop: PidroSpacing.xxs,
    marginLeft: -12,
  },
  main: {
    minWidth: 0,
    flex: 1,
    maxWidth: 420,
    justifyContent: 'center',
    gap: PidroSpacing.xxs,
  },
  heading: {
    fontFamily: PidroFonts.display,
    fontWeight: '400',
    color: PidroBevel.textGold,
    ...PidroBevel.labelShadow,
  },
  window: {
    width: '100%',
    boxShadow: '0px 10px 30px rgba(1, 13, 27, 0.45)',
  },
  button: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 380,
  },
  buttonFace: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: PidroSpacing.md,
  },
  // The hero's 6px lip sits under the label; lift the label off it.
  buttonFaceHero: {
    paddingBottom: 5,
  },
  woodLabel: {
    fontFamily: PidroFonts.display,
    fontWeight: '400',
    color: PidroBevel.textGold,
    letterSpacing: 0.3,
    ...PidroBevel.labelShadow,
    transform: [{ translateY: -1 }],
  },
  woodLabelHero: {
    letterSpacing: 1,
  },
  glassLabel: {
    fontFamily: PidroFonts.ui,
    fontWeight: '800',
    fontSize: 16,
    lineHeight: 21,
    color: PidroColors.text,
    ...PidroBevel.glassLabelShadow,
    transform: [{ translateY: -0.5 }],
  },
  glassLabelTablet: {
    fontSize: 17,
    lineHeight: 23,
  },
  notice: {
    gap: PidroSpacing.xxs,
    borderWidth: 1,
    borderRadius: PidroRadii.surface,
    paddingVertical: 10,
    paddingHorizontal: PidroSpacing.sm,
  },
  noticeDanger: {
    borderColor: PidroColors.dangerBorder,
    backgroundColor: PidroColors.dangerBg,
  },
  noticeInfo: {
    borderColor: PidroColors.cyanBorder,
    backgroundColor: PidroColors.panelSoft,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  noticeIcon: {
    marginTop: 1,
  },
  noticeText: {
    minWidth: 0,
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
    color: PidroColors.dangerText,
  },
  noticeTextInfo: {
    color: PidroColors.text,
  },
  tile: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: PidroColors.cyanBorderStrong,
    backgroundColor: PidroColors.panel,
  },
  tileQuiet: {
    borderWidth: 0,
    backgroundColor: 'rgba(70, 220, 255, 0.14)',
  },
});
