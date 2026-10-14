import type { ClassicProfile, PinChoice, ProfileIdentity } from '@pidro/shared';

/**
 * The numbers the profile shows, read from `GET /api/v1/profile`. The server
 * does the counting; these only decide how its answer reads.
 */

/** How far into the current level, 0 to 1, and the line beside the XP. */
export function levelProgress(veteran: ProfileIdentity['veteran']): {
  fraction: number;
  caption: string | null;
} {
  const progress = veteran?.progress;
  if (!veteran || progress == null) return { fraction: 0, caption: null };
  if (progress === 'max') return { fraction: 1, caption: 'Top level' };
  const [into, span] = progress;
  return {
    fraction: span > 0 ? Math.min(1, Math.max(0, into / span)) : 0,
    caption: `${Math.max(0, span - into).toLocaleString()} XP to Level ${veteran.level + 1}`,
  };
}

export function winRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

/** The month the server's `this_month` counts, named in the player's language. */
export function monthName(now: Date = new Date()): string {
  return new Intl.DateTimeFormat(undefined, { month: 'long', timeZone: 'UTC' }).format(now);
}

/** The line under the Classic pin: "Level 61 in Classic · 1,862 games as Bengt64". */
export function classicPinLine(classic: ClassicProfile): string {
  const games =
    classic.games_played != null ? `${classic.games_played.toLocaleString()} games` : null;
  const played = classic.name
    ? games
      ? `${games} as ${classic.name}`
      : `Played as ${classic.name}`
    : games;
  const parts = [classic.level != null ? `Level ${classic.level} in Classic` : null, played];
  return parts.filter(Boolean).join(' · ') || 'Your Classic career';
}

/** A Classic player wears the Classic pin until they choose No pin. */
export function wornPin(choice: PinChoice | undefined, classic: boolean): 'classic' | null {
  return classic && choice !== 'none' ? 'classic' : null;
}
