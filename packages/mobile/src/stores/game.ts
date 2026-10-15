import { useMemo } from 'react';
import {
  t,
  useLocale,
  useGameStore,
  useGameViewModel as useSharedGameViewModel,
} from '@pidro/shared';

export { useGameStore };

/** Localize only synthetic identities, never actual usernames (including "You"). */
export function useGameViewModel() {
  const model = useSharedGameViewModel();
  const meta = useGameStore((state) => state.playerMeta);
  const locale = useLocale();
  return useMemo(
    () =>
      model && {
        ...model,
        players: model.players.map((player) => {
          if (meta[player.absolutePosition].username?.trim()) return player;
          return {
            ...player,
            username: player.isYou
              ? t('game.you')
              : player.seatStatus === 'bot_substitute' || player.seatStatus === 'permanent_bot'
                ? t('game.bot')
                : t('game.player'),
          };
        }),
      },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t has stable identity; locale invalidates its output
    [model, meta, t, locale]
  );
}
