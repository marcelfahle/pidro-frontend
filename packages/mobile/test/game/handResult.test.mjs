import { describe, expect, it } from 'bun:test';
import { handResultView } from '../../src/features/game/handResult.ts';

const card = (rank, suit) => ({ rank, suit });
const scored = (rank, suit, points, position, team) => ({
  card: card(rank, suit),
  points,
  position,
  team,
});

// East bid 9 in hearts. E/W took A, J, both fives and the 2 (13); N/S the 10 (1).
const eastMade = {
  hand_number: 6,
  bidding_team: 'east_west',
  bidder: 'east',
  bid: 9,
  trump: 'hearts',
  captured: { north_south: 1, east_west: 13 },
  made: true,
  delta: { north_south: 1, east_west: 13 },
  scores: { north_south: 22, east_west: 47 },
  point_cards: [
    scored(14, 'hearts', 1, 'west', 'east_west'),
    scored(10, 'hearts', 1, 'north', 'north_south'),
    scored(11, 'hearts', 1, 'east', 'east_west'),
    scored(5, 'hearts', 5, 'east', 'east_west'),
    scored(5, 'diamonds', 5, 'west', 'east_west'),
    scored(2, 'hearts', 1, 'west', 'east_west'),
  ],
};

// West bid 12 in clubs and won 7; North took the 5 of clubs for N/S.
const westMissed = {
  hand_number: 9,
  bidding_team: 'east_west',
  bidder: 'west',
  bid: 12,
  trump: 'clubs',
  captured: { north_south: 7, east_west: 7 },
  made: false,
  delta: { north_south: 7, east_west: -12 },
  scores: { north_south: 48, east_west: 29 },
  point_cards: [
    scored(5, 'clubs', 5, 'north', 'north_south'),
    scored(5, 'spades', 5, 'east', 'east_west'),
    scored(14, 'clubs', 1, 'west', 'east_west'),
    scored(11, 'clubs', 1, 'south', 'north_south'),
    scored(10, 'clubs', 1, 'east', 'east_west'),
    scored(2, 'clubs', 1, 'south', 'north_south'),
  ],
};

describe('the end-of-hand panel', () => {
  it('stamps our made bid in gold, our cards in the first tray, in play order', () => {
    const view = handResultView(eastMade, 'west');
    expect(view.outcome).toBe('we-made');
    expect(view.loud).toBe(true);
    expect(view.headline).toEqual({ key: 'game.we_made_it' });
    expect(view).toMatchObject({ bidder: 'east', bid: 9, trump: 'hearts', won: 13, pidro: null });
    expect(view.trays[0]).toEqual({
      team: 'east_west',
      side: 'ours',
      points: 13,
      cards: [
        { card: card(14, 'hearts'), points: 1 },
        { card: card(11, 'hearts'), points: 1 },
        { card: card(5, 'hearts'), points: 5 },
        { card: card(5, 'diamonds'), points: 5 },
        { card: card(2, 'hearts'), points: 1 },
      ],
    });
    expect(view.trays[1]).toEqual({
      team: 'north_south',
      side: 'theirs',
      points: 1,
      cards: [{ card: card(10, 'hearts'), points: 1 }],
    });
    expect(view.closeMs).toBe(6000);
  });

  it('says quietly by how much we missed, and stays as long', () => {
    const view = handResultView(westMissed, 'east');
    expect(view.outcome).toBe('we-missed');
    expect(view.loud).toBe(false);
    expect(view.headline).toEqual({ key: 'game.we_missed_by', n: 5 });
    // Their five is not ours to point at.
    expect(view.pidro).toBeNull();
    expect(view.closeMs).toBe(6000);
  });

  it('keeps their made bid quiet, and says it was theirs', () => {
    const view = handResultView(eastMade, 'south');
    expect(view.outcome).toBe('they-made');
    expect(view.loud).toBe(false);
    expect(view.headline).toEqual({ key: 'game.they_made_it' });
    expect(view.trays.map((tray) => [tray.team, tray.side, tray.points])).toEqual([
      ['north_south', 'ours', 1],
      ['east_west', 'theirs', 13],
    ]);
    expect(view.closeMs).toBe(6000);
  });

  it('names who took their Pidro when they missed', () => {
    const view = handResultView(westMissed, 'south');
    expect(view.outcome).toBe('they-missed');
    expect(view.loud).toBe(false);
    expect(view.headline).toEqual({ key: 'game.they_missed_by', n: 5 });
    expect(view.pidro).toBe('north');
    expect(view.trays[0].cards.map((c) => c.points)).toEqual([5, 1, 1]);
    expect(view.closeMs).toBe(6000);
  });

  it('takes no side for a spectator: N/S first, nobody loud, no Pidro line', () => {
    const made = handResultView(eastMade, null);
    expect(made.outcome).toBe('made');
    expect(made.loud).toBe(false);
    expect(made.headline).toEqual({ key: 'game.team_made_it' });
    expect(made.trays.map((tray) => [tray.team, tray.side])).toEqual([
      ['north_south', 'neutral'],
      ['east_west', 'neutral'],
    ]);
    const missed = handResultView(westMissed, null);
    expect(missed.outcome).toBe('missed');
    expect(missed.pidro).toBeNull();
    expect(missed.headline).toEqual({ key: 'game.team_missed_by', n: 5 });
    expect(missed.closeMs).toBe(6000);
  });

  it('shows empty trays for a server that sends no point cards', () => {
    const { point_cards: _, ...older } = eastMade;
    const view = handResultView(older, 'north');
    expect(view.trays.map((tray) => [tray.points, tray.cards])).toEqual([
      [1, []],
      [13, []],
    ]);
  });
});
