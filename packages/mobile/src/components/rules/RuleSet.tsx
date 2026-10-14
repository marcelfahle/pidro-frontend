import type { RuleSet } from '@pidro/shared';
import { StyleSheet, View } from 'react-native';
import { BevelButton } from '@/components/ui/BevelButton';
import { PidroText } from '@/components/ui/PidroText';
import { Surface } from '@/components/ui/Surface';
import { PidroSpacing } from '@/design/tokens';
import { ruleSets } from '@/features/rules/ruleSets';
import { t } from '@/i18n';

export function ruleSetLabel(ruleSet: RuleSet) {
  const { flag, labelKey } = ruleSets[ruleSet];
  return `${flag} ${t(labelKey)}`;
}

export function RuleSetChip({
  ruleSet,
  testID,
  flagOnly = false,
}: {
  ruleSet: RuleSet;
  testID?: string;
  flagOnly?: boolean;
}) {
  return (
    <Surface
      variant="subtle"
      style={styles.chip}
      testID={testID}
      accessibilityLabel={ruleSetLabel(ruleSet)}>
      <PidroText role="metadata">
        {flagOnly ? ruleSets[ruleSet].flag : ruleSetLabel(ruleSet)}
      </PidroText>
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
  const options: (RuleSet | 'all')[] = includeAll
    ? ['all', ...(Object.keys(ruleSets) as RuleSet[])]
    : (Object.keys(ruleSets) as RuleSet[]);
  return (
    <View style={styles.choices}>
      {options.map((option) => (
        <BevelButton
          key={option}
          label={option === 'all' ? t('rules.all') : ruleSetLabel(option)}
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
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: PidroSpacing.xxs },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: PidroSpacing.xs,
    paddingVertical: PidroSpacing.xxs,
  },
});
