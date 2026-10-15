import type { RuleSet } from '@pidro/shared';

export function ruleSetFixture(value?: string): RuleSet | undefined {
  return __DEV__ && (value === 'finnish' || value === 'louisiana') ? value : undefined;
}
