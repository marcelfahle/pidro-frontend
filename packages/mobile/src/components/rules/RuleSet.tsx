import type { RuleSet } from '@pidro/shared';
import { StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { BevelButton } from '@/components/ui/BevelButton';
import { PidroText } from '@/components/ui/PidroText';
import { Surface } from '@/components/ui/Surface';
import { PidroColors, PidroFlagColors, PidroRadii, PidroSpacing } from '@/design/tokens';
import { ruleSets } from '@/features/rules/ruleSets';
import { t, useTranslation } from '@/i18n';

export function ruleSetLabel(ruleSet: RuleSet) {
  return t(ruleSets[ruleSet].labelKey);
}

/**
 * The rule set's flag, drawn rather than an emoji: emoji flags render as two
 * letters on some Android phones and never match the bevel look.
 */
export function RuleSetFlag({ ruleSet, height = 12 }: { ruleSet: RuleSet; height?: number }) {
  return (
    <Svg width={height * 1.5} height={height} viewBox="0 0 18 12">
      <Rect
        width={18}
        height={12}
        rx={1.5}
        fill={ruleSet === 'finnish' ? PidroFlagColors.ostrobothnianField : PidroFlagColors.field}
      />
      {ruleSet === 'finnish' ? (
        <Path d="M5 0h3v12H5zM0 4.5h18v3H0z" fill={PidroFlagColors.ostrobothnianCross} />
      ) : (
        <>
          <Path
            d="M0 1.5Q0 0 1.5 0H16.5Q18 0 18 1.5v.2H0zM0 3.4h18v1.7H0zM0 6.8h18v1.7H0zM0 10.2h18v.3Q18 12 16.5 12H1.5Q0 12 0 10.5z"
            fill={PidroFlagColors.usStripe}
          />
          <Path d="M0 1.5Q0 0 1.5 0H8v6.8H0z" fill={PidroFlagColors.usCanton} />
        </>
      )}
    </Svg>
  );
}

export function RuleSetChip({
  ruleSet,
  testID,
  flagOnly = false,
  compact = false,
}: {
  ruleSet: RuleSet;
  testID?: string;
  flagOnly?: boolean;
  compact?: boolean;
}) {
  useTranslation();
  const color = ruleSet === 'finnish' ? PidroColors.cyanText : PidroColors.rulesLouisianaText;
  return (
    <Surface
      variant="subtle"
      style={[
        styles.chip,
        compact && styles.compactChip,
        compact && {
          borderColor:
            ruleSet === 'finnish'
              ? PidroColors.rulesFinnishBorder
              : PidroColors.rulesLouisianaBorder,
        },
      ]}
      testID={testID}
      accessibilityLabel={ruleSetLabel(ruleSet)}>
      {compact ? null : <RuleSetFlag ruleSet={ruleSet} />}
      {flagOnly ? null : (
        <PidroText role="metadata" style={compact && [styles.compactText, { color }]}>
          {ruleSetLabel(ruleSet)}
        </PidroText>
      )}
    </Surface>
  );
}

export function RuleSetSelector<T extends RuleSet | 'all'>({
  value,
  onChange,
  includeAll = false,
  disabled = false,
}: {
  value: T;
  onChange: (value: T) => void;
  includeAll?: boolean;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const options: (RuleSet | 'all')[] = includeAll
    ? ['all', ...(Object.keys(ruleSets) as RuleSet[])]
    : (Object.keys(ruleSets) as RuleSet[]);
  return (
    <View style={styles.choices}>
      {options.map((option) => (
        <BevelButton
          key={option}
          label={option === 'all' ? t('rules.all') : ruleSetLabel(option)}
          leadingIcon={option === 'all' ? undefined : <RuleSetFlag ruleSet={option} />}
          material={value === option ? 'wood' : 'glass'}
          size="sm"
          disabled={disabled}
          accessibilityState={{ selected: value === option }}
          aria-selected={value === option}
          onPress={() => onChange(option as T)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  compactChip: {
    height: 22,
    paddingVertical: 0,
    justifyContent: 'center',
    borderRadius: PidroRadii.full,
    backgroundColor: 'transparent',
  },
  compactText: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: PidroSpacing.xxs },
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.xxs,
    paddingHorizontal: PidroSpacing.xs,
    paddingVertical: PidroSpacing.xxs,
  },
});
