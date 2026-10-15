import { expect, test } from 'bun:test';
import { catalogs, createSettingsStore, normalizeRoom } from '@pidro/shared';
import {
  filterRuleSet,
  lobbyRuleSetFilter,
  quickGameRequest,
  ruleSets,
  shouldExplainLouisiana,
} from '../src/features/rules/ruleSets.ts';
const english = catalogs.en;

test('rules have one label each', () => {
  expect(Object.values(ruleSets).map(({ labelKey }) => english[labelKey])).toEqual([
    'Finnish',
    'Louisiana',
  ]);
});

test('the lobby follows preference until a filter is saved, including All and legacy rooms', () => {
  const oldRoom = { code: 'OLD', status: 'waiting' };
  const finnish = normalizeRoom({ code: 'FI', config: { rule_set: 'finnish' } });
  const louisiana = normalizeRoom({ code: 'LA', config: { rule_set: 'louisiana' } });
  const rooms = [louisiana, oldRoom, finnish];
  expect(normalizeRoom(oldRoom).config?.rule_set).toBe('finnish');
  expect(filterRuleSet(rooms, lobbyRuleSetFilter('finnish', null))).toEqual([oldRoom, finnish]);
  expect(filterRuleSet(rooms, lobbyRuleSetFilter('louisiana', null))).toEqual([louisiana]);
  expect(filterRuleSet(rooms, lobbyRuleSetFilter('louisiana', 'all'))).toEqual(rooms);
  expect(lobbyRuleSetFilter('louisiana', 'finnish')).toBe('finnish');
});

test('Quick game creates a solo table with exactly the preferred rules', () => {
  expect(quickGameRequest('finnish')).toEqual({
    rule_set: 'finnish',
    seats: { seat_2: 'ai', seat_3: 'ai', seat_4: 'ai' },
  });
  expect(quickGameRequest('louisiana')).toEqual({
    rule_set: 'louisiana',
    seats: { seat_2: 'ai', seat_3: 'ai', seat_4: 'ai' },
  });
});

test('device preferences and a dismissed Louisiana explanation survive rehydration', async () => {
  let value = null;
  const storage = {
    getItem: () => value,
    setItem: (_key, next) => {
      value = next;
    },
    removeItem: () => {
      value = null;
    },
  };
  const store = createSettingsStore({ storage });
  expect(store.getState().preferredRuleSet).toBe('finnish');
  expect(shouldExplainLouisiana('finnish', false, false)).toBe(false);
  expect(shouldExplainLouisiana('louisiana', false, true)).toBe(false);
  expect(shouldExplainLouisiana('louisiana', false, false)).toBe(true);
  store.getState().setPreferredRuleSet('louisiana');
  store.getState().setLobbyRuleSetFilter('all');
  store.getState().markLouisianaRulesSeen();
  const restored = createSettingsStore({ storage });
  await restored.persist.rehydrate();
  expect(restored.getState()).toMatchObject({
    preferredRuleSet: 'louisiana',
    lobbyRuleSetFilter: 'all',
    hasSeenLouisianaRules: true,
  });
  expect(
    shouldExplainLouisiana('louisiana', restored.getState().hasSeenLouisianaRules, false)
  ).toBe(false);
});
