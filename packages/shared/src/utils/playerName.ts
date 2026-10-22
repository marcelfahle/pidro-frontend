import type { BotProfile } from '../types/lobby';
import { builtinBotName } from './bots';
import { useBotCatalogueStore } from '../stores/bots';

const GENERATED_GUEST_USERNAME = /^guest_[A-Z0-9]{8}$/i;

export function isGeneratedGuestUsername(username: unknown): username is string {
  return typeof username === 'string' && GENERATED_GUEST_USERNAME.test(username.trim());
}

/**
 * Public names are usernames, except generated guest handles use the public
 * name chosen at guest creation. A stable user ID is never a name fallback.
 */
export function publicPlayerName(
  username: unknown,
  fallback = 'Player',
  displayName?: unknown,
): string {
  if (isGeneratedGuestUsername(username) && typeof displayName === 'string' && displayName.trim()) {
    return displayName.trim();
  }
  return typeof username === 'string' && username.trim() ? username : fallback;
}

/**
 * A seat's public name. A bot with a persona goes by the server's display
 * name (Marcel, Antti, Jocke); everyone else by `publicPlayerName`.
 */
export function seatPlayerName(
  player: {
    username?: unknown;
    display_name?: unknown;
    bot_persona?: unknown;
    bot_profile?: BotProfile | null;
  },
  fallback = 'Player',
): string {
  if (player.bot_persona) {
    const name = typeof player.display_name === 'string' ? player.display_name.trim() : '';
    const cached = useBotCatalogueStore
      .getState()
      .profiles.find((bot) => bot.id === player.bot_persona);
    return (
      player.bot_profile?.name ||
      cached?.name ||
      name ||
      builtinBotName(player.bot_persona) ||
      fallback
    );
  }
  return publicPlayerName(player.username, fallback, player.display_name);
}
