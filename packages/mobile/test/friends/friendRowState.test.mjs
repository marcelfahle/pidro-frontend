import { afterEach, describe, expect, test } from 'bun:test';
import { setLocale } from '@pidro/shared';
import { friendRowState } from '../../src/features/friends/index.ts';

afterEach(() => setLocale('en'));

const now = new Date(2026, 9, 19, 9, 30);
const nora = { user_id: 'nora', display_name: 'Nora', avatar_url: null };
const row = (entry, relation) => {
  const { dot, line, tone, variant, busy } = friendRowState({ ...nora, ...entry }, relation, now);
  return { variant, dot, line, tone, busy };
};

describe('A friend row from a friends-list entry', () => {
  test('online and offline', () => {
    expect(row({ presence: 'online' })).toEqual({
      variant: 'friend',
      dot: 'online',
      line: 'Free to play',
      tone: 'green',
      busy: false,
    });
    expect(row({ presence: 'offline' })).toMatchObject({
      dot: null,
      line: 'Not online',
      tone: 'quiet',
    });
    expect(
      row({ presence: 'offline', last_played_at: new Date(2026, 9, 18, 22).toISOString() })
    ).toMatchObject({ line: 'Played yesterday' });
  });

  test('at a table, in both presence forms', () => {
    const seat = { dot: 'table', tone: 'gold', busy: false };
    // Today's server: no company, no seat facts.
    expect(row({ presence: 'at_table' })).toMatchObject({ ...seat, line: 'At a table' });
    // With bots: either form, and they can come to you.
    const withBots = { dot: 'online', line: 'Playing with bots · can join now', tone: 'green' };
    expect(row({ presence: 'with_bots' })).toMatchObject(withBots);
    expect(row({ presence: 'at_table', table_company: 'bots' })).toMatchObject(withBots);
    // With people and no seat for you: either form, and the picker greys it.
    const withOthers = { dot: 'table', line: 'In a game with others', tone: 'quiet', busy: true };
    expect(row({ presence: 'with_others' })).toMatchObject(withOthers);
    expect(row({ presence: 'at_table', table_company: 'people' })).toMatchObject(withOthers);
    expect(row({ presence: 'with_others', hand: 4 })).toMatchObject({
      ...seat,
      busy: true,
      line: 'At a table · hand 4',
    });
  });

  test('a seat for you at their table', () => {
    for (const join_as of ['partner', 'opponent']) {
      expect(row({ presence: 'at_table', table_company: 'people', join_as })).toMatchObject({
        dot: 'table',
        line: 'At a table',
        tone: 'gold',
        busy: false,
      });
    }
    expect(row({ presence: 'with_others', join_as: 'partner', seats_open: 1 }).line).toBe(
      'At a table · 1 seat open'
    );
    expect(row({ presence: 'at_table', join_as: null, seats_open: 2 }).line).toBe('At a table');
  });

  test('requests both ways, and a friend made just now', () => {
    expect(row({ presence: 'online' }, 'added_you')).toEqual({
      variant: 'request',
      dot: null,
      line: 'Wants to be friends',
      tone: 'gold',
      busy: false,
    });
    expect(row({ asked_at: new Date(2026, 9, 19, 8).toISOString() }, 'added_you')).toMatchObject({
      line: 'Asked today',
      tone: 'quiet',
    });
    expect(
      row({ presence: 'online', requested_at: new Date(2026, 9, 17).toISOString() }, 'added')
    ).toEqual({
      variant: 'sent',
      dot: null,
      line: 'Request sent 2 days ago',
      tone: 'quiet',
      busy: false,
    });
    expect(row({ requested_at: 'garbage' }, 'added').line).toBe('Request sent');
    expect(row({ presence: 'online' }, 'new_friend')).toMatchObject({
      variant: 'fresh',
      dot: 'online',
      line: 'Friends now',
      tone: 'green',
    });
  });

  test('every optional fact missing still reads plainly', () => {
    expect(row({}, 'friend')).toEqual({
      variant: 'friend',
      dot: null,
      line: 'Not online',
      tone: 'quiet',
      busy: false,
    });
    expect(row({}, 'added_you').line).toBe('Wants to be friends');
    expect(row({}, 'added').line).toBe('Request sent');
    expect(row({}, 'new_friend').line).toBe('Friends now');
  });

  test('in Swedish', () => {
    setLocale('sv');
    expect(row({ presence: 'online' }).line).toBe('Ledig att spela');
    expect(row({ presence: 'with_others', join_as: 'partner', seats_open: 2 }).line).toBe(
      'Vid ett bord · 2 lediga platser'
    );
    expect(row({ requested_at: new Date(2026, 9, 12).toISOString() }, 'added').line).toBe(
      'Förfrågan skickad förra veckan'
    );
  });
});
