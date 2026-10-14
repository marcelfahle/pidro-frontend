import { describe, expect, it } from 'bun:test';
import { defaultTableName, newTableRequest } from '../../src/features/lobby/newTable';

describe('new table request', () => {
  it('sends an invite seat as open and asks for the invite sheet', () => {
    expect(
      newTableRequest('Friday', 'Bengt', { seat_2: 'ai', seat_3: 'invite', seat_4: 'open' })
    ).toEqual({
      request: { name: 'Friday', seats: { seat_2: 'ai', seat_3: 'open', seat_4: 'open' } },
      invite: true,
    });
  });

  it('opens no invite sheet without an invite seat', () => {
    expect(
      newTableRequest('Friday', 'Bengt', { seat_2: 'open', seat_3: 'ai', seat_4: 'ai' }).invite
    ).toBe(false);
  });

  it('falls back to the default name when the field is blank', () => {
    const seats = { seat_2: 'open', seat_3: 'open', seat_4: 'open' };
    expect(newTableRequest('   ', 'Bengt', seats).request.name).toBe("Bengt's table");
    expect(newTableRequest('  Late game  ', 'Bengt', seats).request.name).toBe('Late game');
  });

  it('clamps a long player name the way creation always has', () => {
    expect(defaultTableName('A'.repeat(80))).toBe('A'.repeat(60));
    expect(defaultTableName(null)).toBe("Player's table");
  });
});
