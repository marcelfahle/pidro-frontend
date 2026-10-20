import { afterEach, describe, expect, test } from 'bun:test';
import { setLocale } from '@pidro/shared';
import { friendRowState } from '../../src/features/friends/index.ts';

afterEach(() => setLocale('en'));

const now = new Date(2026, 9, 19, 9, 30);
const nora = { user_id: 'nora', display_name: 'Nora', avatar_url: null };
const row = (entry, relation) => {
  const { dot, line, tone, variant } = friendRowState({ ...nora, ...entry }, relation, now);
  return { variant, dot, line, tone };
};

describe('A friend row from a friends-list entry', () => {
  test('online and offline', () => {
    expect(row({ presence: 'online' })).toEqual({
      variant: 'friend',
      dot: 'online',
      line: 'Free to play',
      tone: 'green',
    });
    expect(row({ presence: 'offline' })).toMatchObject({
      dot: null,
      line: 'Not online',
      tone: 'quiet',
    });
    expect(
      row({ presence: 'offline', played_together_at: new Date(2026, 9, 18, 22).toISOString() })
    ).toMatchObject({ line: 'Played yesterday' });
  });

  test('not online says when you last finished a game together, on your own calendar days', () => {
    const played = (date) => row({ presence: 'offline', played_together_at: date }).line;
    // 23:30 yesterday is yesterday, 00:10 today is today, however few hours ago.
    expect(played(new Date(2026, 9, 18, 23, 30).toISOString())).toBe('Played yesterday');
    expect(played(new Date(2026, 9, 19, 0, 10).toISOString())).toBe('Played today');
    expect(played(new Date(2026, 9, 11).toISOString())).toBe('Played last week');
    expect(played('2026-09-12T12:00:00Z')).toBe('Played in September');
    expect(played(null)).toBe('Not online');
    expect(played('garbage')).toBe('Not online');
    expect(row({ presence: 'offline', played_together_at: null }).tone).toBe('quiet');
  });

  test('at a table, with the seat count and hand the server sends', () => {
    const table = { presence: 'at_table', table_company: 'people' };
    const forYou = { ...table, join_as: 'partner', table_hand: 3 };
    expect(row({ ...forYou, table_open_seats: 1 })).toEqual({
      variant: 'friend',
      dot: 'table',
      line: 'At a table · 1 seat open',
      tone: 'gold',
    });
    expect(row({ ...forYou, join_as: 'opponent', table_open_seats: 2 }).line).toBe(
      'At a table · 2 seats open'
    );
    // A seat for you but no count to show: the plain line, never the hand.
    expect(row({ ...forYou, table_open_seats: 0 }).line).toBe('At a table');
    expect(row({ ...table, join_as: 'partner' }).line).toBe('At a table');
    // No seat for you: the hand, once dealt.
    expect(row({ ...table, join_as: null, table_open_seats: 2, table_hand: 4 })).toEqual({
      variant: 'friend',
      dot: 'table',
      line: 'At a table · hand 4',
      tone: 'gold',
    });
    expect(row({ presence: 'at_table', table_hand: 1 }).line).toBe('At a table · hand 1');
    expect(row({ presence: 'at_table', join_as: null, table_hand: null }).line).toBe('At a table');
    expect(row({ ...table, join_as: null, table_hand: null }).line).toBe('In a game with others');
    // With bots the line stays, whatever the table facts say.
    for (const join_as of ['partner', null])
      expect(
        row({
          presence: 'at_table',
          table_company: 'bots',
          join_as,
          table_open_seats: 3,
          table_hand: 5,
        })
      ).toMatchObject({ dot: 'online', line: 'Playing with bots · can join now', tone: 'green' });
  });

  test('at a table, by who else is there', () => {
    // No company, no seat facts.
    expect(row({ presence: 'at_table' })).toMatchObject({
      dot: 'table',
      tone: 'gold',
      line: 'At a table',
    });
    // With bots they can come to you.
    expect(row({ presence: 'at_table', table_company: 'bots' })).toMatchObject({
      dot: 'online',
      line: 'Playing with bots · can join now',
      tone: 'green',
    });
    expect(row({ presence: 'at_table', table_company: 'people' })).toMatchObject({
      dot: 'table',
      line: 'In a game with others',
      tone: 'quiet',
    });
  });

  test('a seat for you at their table', () => {
    for (const join_as of ['partner', 'opponent']) {
      expect(row({ presence: 'at_table', table_company: 'people', join_as })).toMatchObject({
        dot: 'table',
        line: 'At a table',
        tone: 'gold',
      });
    }
    expect(
      row({
        presence: 'at_table',
        table_company: 'people',
        join_as: 'partner',
        table_open_seats: 1,
      }).line
    ).toBe('At a table · 1 seat open');
    expect(row({ presence: 'at_table', join_as: null, table_open_seats: 2 }).line).toBe(
      'At a table'
    );
  });

  test('requests both ways, and a friend made just now', () => {
    expect(row({ presence: 'online' }, 'added_you')).toEqual({
      variant: 'request',
      dot: null,
      line: 'Wants to be friends',
      tone: 'gold',
    });
    expect(
      row({ requested_at: new Date(2026, 9, 19, 8).toISOString() }, 'added_you')
    ).toMatchObject({
      line: 'Asked today',
      tone: 'quiet',
    });
    expect(row({ requested_at: new Date(2026, 9, 16, 20).toISOString() }, 'added_you').line).toBe(
      'Asked 3 days ago'
    );
    expect(row({ requested_at: 'garbage' }, 'added_you')).toMatchObject({
      line: 'Wants to be friends',
      tone: 'gold',
    });
    expect(
      row({ presence: 'online', requested_at: new Date(2026, 9, 17).toISOString() }, 'added')
    ).toEqual({
      variant: 'sent',
      dot: null,
      line: 'Request sent 2 days ago',
      tone: 'quiet',
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
    });
    expect(row({}, 'added_you').line).toBe('Wants to be friends');
    expect(row({}, 'added').line).toBe('Request sent');
    expect(row({}, 'new_friend').line).toBe('Friends now');
  });

  test('in Swedish', () => {
    setLocale('sv');
    expect(row({ presence: 'online' }).line).toBe('Ledig att spela');
    expect(row({ presence: 'at_table', join_as: 'partner', table_open_seats: 2 }).line).toBe(
      'Vid ett bord · 2 lediga platser'
    );
    expect(row({ requested_at: new Date(2026, 9, 12).toISOString() }, 'added').line).toBe(
      'Förfrågan skickad förra veckan'
    );
    expect(row({ presence: 'at_table', join_as: 'partner', table_open_seats: 1 }).line).toBe(
      'Vid ett bord · 1 ledig plats'
    );
    expect(row({ presence: 'at_table', join_as: null, table_hand: 4 }).line).toBe(
      'Vid ett bord · giv 4'
    );
    expect(
      row({ presence: 'offline', played_together_at: new Date(2026, 9, 18).toISOString() }).line
    ).toBe('Spelade igår');
    expect(row({ requested_at: new Date(2026, 9, 19).toISOString() }, 'added_you').line).toBe(
      'Frågade idag'
    );
  });
});
