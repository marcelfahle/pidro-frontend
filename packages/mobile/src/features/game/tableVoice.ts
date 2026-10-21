import type { TranslationKey } from '@pidro/shared';

/** Shared by everyone watching this room and hand; never uses local time or randomness. */
export function tableLine<T>(room: string, hand: number, lines: readonly T[], voice = ''): T {
  let hash = 2166136261;
  for (const char of `${room}:${hand}:${voice}`) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  }
  return lines[(hash >>> 0) % lines.length];
}

// The familiar headline gets three slots; each alternative gets one.
export const handHeadlines = {
  'we-made': [
    'game.we_made_it',
    'game.we_made_it',
    'game.we_made_it',
    'game.we_got_it',
    'game.thats_ours',
  ],
  'they-made': [
    'game.they_made_it',
    'game.they_made_it',
    'game.they_made_it',
    'game.they_got_it',
    'game.thats_theirs',
  ],
  made: [
    'game.team_made_it',
    'game.team_made_it',
    'game.team_made_it',
    'game.team_got_it',
    'game.team_bid_home',
  ],
  'we-missed': [
    'game.we_missed_by',
    'game.we_missed_by',
    'game.we_missed_by',
    'game.we_short_by',
    'game.we_needed_more',
  ],
  'they-missed': [
    'game.they_missed_by',
    'game.they_missed_by',
    'game.they_missed_by',
    'game.they_short_by',
    'game.they_needed_more',
  ],
  missed: [
    'game.team_missed_by',
    'game.team_missed_by',
    'game.team_missed_by',
    'game.team_short_by',
    'game.team_needed_more',
  ],
} as const satisfies Record<string, readonly TranslationKey[]>;
