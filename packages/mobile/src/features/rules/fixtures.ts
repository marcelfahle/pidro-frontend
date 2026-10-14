import type { LobbyCategories, Room, RuleSet } from '@pidro/shared';

export function ruleSetFixture(value?: string): RuleSet | undefined {
  return __DEV__ && (value === 'finnish' || value === 'louisiana') ? value : undefined;
}

function room(code: string, ruleSet: RuleSet, status: Room['status']): Room {
  return {
    code,
    name: `${ruleSet === 'finnish' ? 'Finnish' : 'Louisiana'} ${code}`,
    status,
    config: { rule_set: ruleSet, name: null, bot_difficulty: 'basic', solo: false },
    player_count: status === 'waiting' ? 1 : 4,
    positions: { north: 'fixture-host', east: null, south: null, west: null },
    available_positions: ['east', 'south', 'west'],
  };
}

export function lobbyFixture(
  value?: string
): { lobby: LobbyCategories; filter: RuleSet | 'all'; query: string } | undefined {
  if (
    !__DEV__ ||
    !['mixed', 'louisiana', 'rules-empty', 'rules-search-empty'].includes(value ?? '')
  )
    return;
  const pair = (prefix: string, status: Room['status']) => [
    room(`${prefix}FI`, 'finnish', status),
    room(`${prefix}LA`, 'louisiana', status),
  ];
  const lobby: LobbyCategories = {
    my_rejoinable: pair('MY', 'playing'),
    open_tables: pair('OPEN', 'waiting'),
    substitute_needed: pair('SUB', 'playing'),
    spectatable: pair('WATCH', 'playing'),
  };
  if (value === 'rules-empty') {
    for (const category of Object.keys(lobby) as (keyof LobbyCategories)[]) {
      lobby[category] = lobby[category].filter((table) => table.config?.rule_set === 'finnish');
    }
  }
  return {
    lobby,
    filter: value === 'mixed' ? 'all' : 'louisiana',
    query: value === 'rules-search-empty' ? 'No such table' : '',
  };
}
