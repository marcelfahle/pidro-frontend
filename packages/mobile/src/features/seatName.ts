import { publicPlayerName, seatPlayerName, t, type Player } from '@pidro/shared';

type SeatPlayer = Pick<Player, 'username'> & Partial<Player>;

/**
 * What a seat is called. A bot with a persona goes by the server's name for
 * it (Marcel, Antti, Jocke); a bot from an older server is just "Bot". A
 * substitute bot has no persona: the seat keeps its player's own name.
 */
export function seatName(
  player: SeatPlayer | null | undefined,
  fallback: string,
  bot = !!player?.is_bot
): string {
  if (player?.bot_persona) return seatPlayerName(player, t('game.bot'));
  if (bot) return t('game.bot');
  return publicPlayerName(player?.username, fallback, player?.display_name);
}
