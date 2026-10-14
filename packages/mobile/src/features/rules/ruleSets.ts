import type { CreateRoomRequest, Room, RuleSet } from '@pidro/shared';

export const ruleSets: Record<RuleSet, { labelKey: string; flag: string }> = {
  finnish: { labelKey: 'rules.finnish', flag: '🇫🇮' },
  louisiana: { labelKey: 'rules.louisiana', flag: '🇺🇸' },
};

export function lobbyRuleSetFilter(preferred: RuleSet, saved: RuleSet | 'all' | null) {
  return saved ?? preferred;
}

export function filterRuleSet(rooms: Room[], filter: RuleSet | 'all'): Room[] {
  return rooms.filter(
    (room) => filter === 'all' || (room.config?.rule_set ?? 'finnish') === filter
  );
}

export function shouldExplainLouisiana(ruleSet: RuleSet, seen: boolean, spectator: boolean) {
  return ruleSet === 'louisiana' && !seen && !spectator;
}

export function quickGameRequest(preferred: RuleSet): CreateRoomRequest {
  return { rule_set: preferred, seats: { seat_2: 'ai', seat_3: 'ai', seat_4: 'ai' } };
}
