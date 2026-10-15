import {
  type ClassicProfile,
  type PinChoice,
  type ProfileIdentity,
  t,
  formatNumber,
  formatDate,
  getLocale,
  type TranslationKey,
} from '@pidro/shared';

// Stable server title vocabulary, not player-authored text. Unknown future titles
// retain their English presentation in EN, but cannot leak English into SV.
const TITLE_KEYS: Record<string, TranslationKey> = {
  Rookie: 'profile.rookie',
  Apprentice: 'profile.apprentice',
  Journeyman: 'profile.journeyman',
  Veteran: 'profile.veteran',
  Expert: 'profile.expert',
  Master: 'profile.master',
  Grandmaster: 'profile.grandmaster',
  Legend: 'profile.legend',
  Mainstay: 'profile.mainstay',
};

export function veteranTitle(title: string | null | undefined): string | null {
  if (!title) return null;
  const key = Object.prototype.hasOwnProperty.call(TITLE_KEYS, title)
    ? TITLE_KEYS[title]
    : undefined;
  return key ? t(key) : getLocale() === 'en' ? title : null;
}

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
  if (progress === 'max') return { fraction: 1, caption: t('social.top_level') };
  const [into, span] = progress;
  return {
    fraction: span > 0 ? Math.min(1, Math.max(0, into / span)) : 0,
    caption: t('social.xp_next', {
      xp: formatNumber(Math.max(0, span - into)),
      level: formatNumber(veteran.level + 1),
    }),
  };
}

export function winRate(rate: number): string {
  return formatNumber(rate, { style: 'percent', maximumFractionDigits: 0 });
}

/** The month the server's `this_month` counts, named in the player's language. */
export function monthName(now: Date = new Date()): string {
  return formatDate(now, { month: 'long', timeZone: 'UTC' });
}

/** The line under the Classic pin: "Level 61 in Classic · 1,862 games as Bengt64". */
export function classicPinLine(classic: ClassicProfile): string {
  const games =
    classic.games_played != null
      ? t('social.games', {
          count: classic.games_played,
          number: formatNumber(classic.games_played),
        })
      : null;
  const played = classic.name
    ? games
      ? t('social.classic_games_name', { games, name: classic.name })
      : t('social.played_as', { name: classic.name })
    : games;
  const parts = [
    classic.level != null
      ? t('social.classic_level', { level: formatNumber(classic.level) })
      : null,
    played,
  ];
  return parts.filter(Boolean).join(' · ') || t('social.classic_career');
}

/** A Classic player wears the Classic pin until they choose No pin. */
export function wornPin(choice: PinChoice | undefined, classic: boolean): 'classic' | null {
  return classic && choice !== 'none' ? 'classic' : null;
}
